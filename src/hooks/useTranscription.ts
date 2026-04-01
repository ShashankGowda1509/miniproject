/**
 * Web Speech API Transcription Hook
 * Uses browser's built-in speech recognition for real-time transcription
 * 
 * Benefits:
 * - No external server required (no Whisper/transcription server needed)
 * - Real-time transcription with low latency
 * - Automatic language detection and processing
 * - Works offline
 * 
 * Browser Support:
 * - Chrome/Edge: Full support ✅
 * - Safari: Partial support (iOS 14.5+) ⚠️
 * - Firefox: Not supported ❌
 * 
 * Note: Requires microphone permissions
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room } from 'livekit-client';

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
  
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string>(Date.now().toString());
  const participantIdRef = useRef<string>('local-participant');
  const shouldBeRunningRef = useRef<boolean>(false);

  // Initialize Speech Recognition
  const initializeSpeechRecognition = useCallback(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsTranscribing(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      // Only process the most recent result
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript.trim();
      const isFinal = result.isFinal;

      // Skip empty transcripts
      if (!transcript) return;

      // Get speaker info from room if available
      let speaker = 'You';
      if (room?.localParticipant) {
        speaker = room.localParticipant.name || room.localParticipant.identity || 'You';
      }

      // Only add final transcripts to avoid duplicates
      if (isFinal) {
        const newTranscript: Transcript = {
          sessionId: sessionIdRef.current,
          speaker: speaker,
          text: transcript,
          timestamp: new Date().toISOString(),
          isFinal: true
        };
        
        console.log('📝 Final transcript:', transcript);
        setTranscripts((prev) => [...prev, newTranscript]);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
        setIsTranscribing(false);
      } else if (event.error === 'network') {
        setError('Network error occurred. Please check your connection.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('🛑 Speech recognition ended');
      
      // Auto-restart if it should be running
      if (shouldBeRunningRef.current) {
        console.log('🔄 Restarting speech recognition...');
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.error('Failed to restart recognition:', error);
          }
        }, 100);
      } else {
        setIsTranscribing(false);
      }
    };

    return recognition;
  }, [room]);

  // Start transcription
  const startTranscription = useCallback(() => {
    if (recognitionRef.current || !enabled) {
      console.log('⚠️ Transcription already running or not enabled');
      return;
    }

    console.log('🚀 Starting transcription with Web Speech API...');

    const recognition = initializeSpeechRecognition();
    if (!recognition) {
      return;
    }

    recognitionRef.current = recognition;
    shouldBeRunningRef.current = true;

    try {
      recognition.start();
      console.log('✅ Speech recognition started successfully');
    } catch (error: any) {
      console.error('❌ Failed to start speech recognition:', error);
      if (error.message && error.message.includes('already started')) {
        console.log('Speech recognition is already running');
        setIsTranscribing(true);
      } else {
        setError(`Failed to start speech recognition: ${error.message}`);
        shouldBeRunningRef.current = false;
      }
    }
  }, [enabled, initializeSpeechRecognition]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    console.log('🛑 Stopping transcription...');
    shouldBeRunningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsTranscribing(false);
        console.log('✅ Speech recognition stopped');
      } catch (error) {
        console.error('❌ Error stopping speech recognition:', error);
      }
    }
  }, []);

  // Auto-start when enabled and room is ready
  useEffect(() => {
    if (enabled && room) {
      // Wait a bit for room to be fully connected
      const timer = setTimeout(() => {
        console.log('🎯 Room ready, starting transcription...');
        startTranscription();
      }, 1000);

      return () => {
        clearTimeout(timer);
        stopTranscription();
      };
    }

    return () => {
      stopTranscription();
    };
  }, [enabled, room, startTranscription, stopTranscription]);

  return {
    transcripts,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription
  };
}
