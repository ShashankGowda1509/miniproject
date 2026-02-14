/**
 * LiveKit Audio Capture and Transcription Hook
 * Captures audio from LiveKit room and sends to transcription service
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RemoteParticipant, LocalParticipant, Track } from 'livekit-client';
import { io, Socket } from 'socket.io-client';

export interface Transcript {
  sessionId: string;
  speaker: string;
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface UseTranscriptionProps {
  room: Room | undefined;
  enabled: boolean;
}

interface UseTranscriptionReturn {
  transcripts: Transcript[];
  isTranscribing: boolean;
  error: string | null;
  startTranscription: () => void;
  stopTranscription: () => void;
}

export function useTranscription({
  room,
  enabled
}: UseTranscriptionProps): UseTranscriptionReturn {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorsRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const audioBuffersRef = useRef<Map<string, Int16Array[]>>(new Map());
  const lastSendTimeRef = useRef<Map<string, number>>(new Map());
  const isInitializedRef = useRef(false);

  const TRANSCRIPTION_SERVER_URL = import.meta.env.VITE_TRANSCRIPTION_SERVER_URL || 'http://localhost:6824';
  const BUFFER_DURATION_MS = 2500; // Buffer 2.5 seconds of audio before sending
  const SAMPLE_RATE = 16000;

  // Initialize Socket.IO connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    const socket = io(TRANSCRIPTION_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✅ Connected to transcription server');
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from transcription server');
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to transcription server');
    });

    socket.on('new-transcript', (transcript: Transcript) => {
      console.log('📝 New transcript:', transcript);
      setTranscripts((prev) => [...prev, transcript]);
    });

    socket.on('transcript-history', (data: { transcripts: Transcript[] }) => {
      console.log('📚 Transcript history:', data.transcripts.length);
      setTranscripts(data.transcripts);
    });

    socket.on('transcription-error', (data: { message: string }) => {
      console.error('❌ Transcription error:', data.message);
      setError(data.message);
    });

    socketRef.current = socket;
    return socket;
  }, [TRANSCRIPTION_SERVER_URL]);

  // Initialize Audio Context
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
    }
    return audioContextRef.current;
  }, []);

  // Process audio track and send to server
  const processAudioTrack = useCallback(
    (participant: LocalParticipant | RemoteParticipant, track: MediaStreamTrack) => {
      const participantId = participant.identity;
      
      // Skip if already processing this participant
      if (audioProcessorsRef.current.has(participantId)) {
        return;
      }

      console.log(`🎤 Processing audio for ${participant.identity}`);

      try {
        const audioContext = initializeAudioContext();
        const stream = new MediaStream([track]);
        const source = audioContext.createMediaStreamSource(stream);

        // Initialize buffer for this participant
        audioBuffersRef.current.set(participantId, []);
        lastSendTimeRef.current.set(participantId, Date.now());

        // Create script processor for audio chunks
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          if (!sessionIdRef.current || !socketRef.current?.connected) {
            return;
          }

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate audio energy (RMS - Root Mean Square)
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          
          // Voice Activity Detection: Only process if audio level is above threshold
          const SILENCE_THRESHOLD = 0.03; // Increased to be less sensitive to background noise
          if (rms < SILENCE_THRESHOLD) {
            // Check if we have buffered audio to send
            const buffer = audioBuffersRef.current.get(participantId);
            const lastSendTime = lastSendTimeRef.current.get(participantId) || 0;
            
            if (buffer && buffer.length > 0 && (Date.now() - lastSendTime) > 800) {
              // Only send if we have at least 1.5 seconds of audio
              const totalSamples = buffer.reduce((sum, arr) => sum + arr.length, 0);
              const durationMs = (totalSamples / SAMPLE_RATE) * 1000;
              
              if (durationMs >= 1500) {
                // Send accumulated buffer after silence
                const combinedLength = buffer.reduce((sum, arr) => sum + arr.length, 0);
                const combined = new Int16Array(combinedLength);
                let offset = 0;
                for (const arr of buffer) {
                  combined.set(arr, offset);
                  offset += arr.length;
                }
                
                socketRef.current?.emit('audio-data', {
                  sessionId: sessionIdRef.current,
                  audioData: combined.buffer
                });
              }
              
              // Clear buffer
              audioBuffersRef.current.set(participantId, []);
              lastSendTimeRef.current.set(participantId, Date.now());
            }
            return;
          }
          
          // Convert float32 to int16
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Add to buffer
          const buffer = audioBuffersRef.current.get(participantId) || [];
          buffer.push(int16Array);
          audioBuffersRef.current.set(participantId, buffer);
          
          // Calculate total buffered duration
          const totalSamples = buffer.reduce((sum, arr) => sum + arr.length, 0);
          const durationMs = (totalSamples / SAMPLE_RATE) * 1000;
          
          // Send if buffer is full (2 seconds)
          if (durationMs >= BUFFER_DURATION_MS) {
            const combinedLength = buffer.reduce((sum, arr) => sum + arr.length, 0);
            const combined = new Int16Array(combinedLength);
            let offset = 0;
            for (const arr of buffer) {
              combined.set(arr, offset);
              offset += arr.length;
            }
            
            socketRef.current?.emit('audio-data', {
              sessionId: sessionIdRef.current,
              audioData: combined.buffer
            });
            
            // Clear buffer
            audioBuffersRef.current.set(participantId, []);
            lastSendTimeRef.current.set(participantId, Date.now());
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        audioProcessorsRef.current.set(participantId, source);

        console.log(`✅ Audio processing started for ${participant.identity}`);
      } catch (err) {
        console.error('Error processing audio track:', err);
        setError('Failed to process audio track');
      }
    },
    [initializeAudioContext]
  );

  // Start transcription
  const startTranscription = useCallback(() => {
    if (!room || isTranscribing) {
      return;
    }

    console.log('🚀 Starting transcription...');

    try {
      const socket = initializeSocket();
      const localParticipant = room.localParticipant;

      // Wait for session to be ready before processing audio
      const startAudioProcessing = () => {
        console.log('✅ Session ready, starting audio capture...');
        
        // Process local audio - wait for track to be published
        const checkLocalAudio = () => {
          const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
          if (audioTrack?.track) {
            const mediaStreamTrack = audioTrack.track.mediaStreamTrack;
            if (mediaStreamTrack && mediaStreamTrack.readyState === 'live') {
              console.log('🎤 Processing local audio track');
              processAudioTrack(localParticipant, mediaStreamTrack);
            } else {
              console.log('⏳ Waiting for local audio track to be ready...');
              setTimeout(checkLocalAudio, 200);
            }
          } else {
            console.log('⏳ Waiting for local audio track to be published...');
            setTimeout(checkLocalAudio, 200);
          }
        };
        
        // Start checking for local audio
        checkLocalAudio();
      };

      // Listen for session ready event - only start audio after this
      socket.once('transcription-ready', (data: { sessionId: string }) => {
        console.log('📡 Transcription session ready:', data.sessionId);
        sessionIdRef.current = data.sessionId;
        isInitializedRef.current = true;
        setIsTranscribing(true);
        startAudioProcessing();
      });

      // Initialize transcription session
      console.log('📤 Requesting transcription session...');
      socket.emit('init-transcription', {
        roomName: room.name,
        participantName: localParticipant.identity
      });

      // Request transcript history
      socket.emit('get-transcripts', {
        roomName: room.name
      });

      // Listen for new participants
      room.on('participantConnected', (participant: RemoteParticipant) => {
        console.log(`👤 Participant connected: ${participant.identity}`);
      });

      // Listen for track subscriptions
      room.on('trackSubscribed', (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          console.log(`🔊 Subscribed to audio track from ${participant.identity}`);
          const mediaStreamTrack = track.mediaStreamTrack;
          if (mediaStreamTrack) {
            processAudioTrack(participant, mediaStreamTrack);
          }
        }
      });

      // Listen for track unsubscriptions
      room.on('trackUnsubscribed', (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          console.log(`🔇 Unsubscribed from audio track of ${participant.identity}`);
          
          // Clean up audio processor
          const source = audioProcessorsRef.current.get(participant.identity);
          if (source) {
            source.disconnect();
            audioProcessorsRef.current.delete(participant.identity);
          }
        }
      });

      isInitializedRef.current = true;

    } catch (err) {
      console.error('Error starting transcription:', err);
      setError('Failed to start transcription');
    }
  }, [room, isTranscribing, initializeSocket, processAudioTrack]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    console.log('🛑 Stopping transcription...');

    if (sessionIdRef.current && socketRef.current) {
      socketRef.current.emit('stop-transcription', {
        sessionId: sessionIdRef.current
      });
    }

    // Disconnect all audio processors
    audioProcessorsRef.current.forEach((source) => {
      source.disconnect();
    });
    audioProcessorsRef.current.clear();

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    sessionIdRef.current = null;
    isInitializedRef.current = false;
    setIsTranscribing(false);
  }, []);

  // Auto-start when enabled
  useEffect(() => {
    if (enabled && room && !isInitializedRef.current) {
      startTranscription();
    }

    return () => {
      if (isInitializedRef.current) {
        stopTranscription();
      }
    };
  }, [enabled, room]);

  return {
    transcripts,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription
  };
}
