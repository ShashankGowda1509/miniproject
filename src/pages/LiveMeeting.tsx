import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import TranscriptPanel, { TranscriptItem } from '@/components/TranscriptPanel';
import VoiceWave from '@/components/VoiceWave';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, AlertCircle, CheckCircle, Copy, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { toast } from '@/hooks/use-toast';

interface MeetingParticipant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  stream?: MediaStream;
}

interface GrammarFeedback {
  original: string;
  corrected: string;
  explanation: string;
}

export default function LiveMeeting() {
  const [roomId, setRoomId] = useState('');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [grammarFeedback, setGrammarFeedback] = useState<GrammarFeedback[]>([]);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const remoteRecognitionRef = useRef<any>(null);
  const remoteAudioContextRef = useRef<AudioContext | null>(null);
  const autoJoinInitiatedRef = useRef(false);
  const pendingIncomingCallRef = useRef<MediaConnection | null>(null);

  const speechRecognition = useSpeechRecognition({
    onResult: handleSpeechResult,
    continuous: true,
    interimResults: true,
  });

  function analyzeGrammar(text: string): GrammarFeedback | null {
    const corrections: [RegExp, string, string][] = [
      [/\bi\b(?!\s+am|\s+have|\s+will|\s+would|\s+could|\s+should)/g, 'I', 'Capitalize "I" when referring to yourself'],
      [/\bdont\b/gi, "don't", 'Use apostrophe in contractions'],
      [/\bcant\b/gi, "can't", 'Use apostrophe in contractions'],
      [/\bwanna\b/gi, 'want to', 'Use formal language in interviews'],
      [/\bgonna\b/gi, 'going to', 'Use formal language in interviews'],
      [/\bkinda\b/gi, 'kind of', 'Use formal language in interviews'],
    ];

    for (const [pattern, replacement, explanation] of corrections) {
      if (pattern.test(text)) {
        return {
          original: text,
          corrected: text.replace(pattern, replacement),
          explanation,
        };
      }
    }
    return null;
  }

  function handleSpeechResult(text: string) {
    const newItem: TranscriptItem = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text: `You: ${text}`,
      timestamp: new Date(),
    };
    
    const feedback = analyzeGrammar(text);
    if (feedback) {
      newItem.grammarCorrection = feedback.corrected;
      setGrammarFeedback(prev => [...prev.slice(-4), feedback]);
    }
    
    setTranscript(prev => [...prev, newItem]);
  }

  // Initialize PeerJS
  useEffect(() => {
    console.log('🔧 Initializing PeerJS...');
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id) => {
      console.log('✅ Peer Ready! My ID:', id);
      setMyPeerId(id);
      setIsPeerReady(true);
    });

    peer.on('call', (incomingCall) => {
      console.log('📞 Incoming call from:', incomingCall.peer);
      
      // Store pending call if we don't have local stream yet
      if (!localStream) {
        console.log('⏳ No local stream yet, storing pending call...');
        pendingIncomingCallRef.current = incomingCall;
        
        // Auto-join to get camera access
        if (!isInMeeting && !autoJoinInitiatedRef.current) {
          console.log('🚀 Auto-starting meeting to answer call...');
          autoJoinInitiatedRef.current = true;
          setTimeout(() => startMeeting(), 100);
        }
        return;
      }
      
      console.log('✅ Answering call with local stream...');
      incomingCall.answer(localStream);
      
      incomingCall.on('stream', (stream) => {
        console.log('✅ Received remote stream from incoming call');
        setRemoteStream(stream);
        setRemotePeerId(incomingCall.peer);
        setIsConnected(true);
        setIsConnecting(false);
        startRemoteTranscription(stream);
        
        toast({
          title: 'Connected!',
          description: `Connected to friend`,
        });
      });
      
      incomingCall.on('close', () => {
        console.log('❌ Incoming call ended');
        handleCallEnd();
      });
      
      incomingCall.on('error', (err) => {
        console.error('❌ Incoming call error:', err);
      });
      
      callRef.current = incomingCall;
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      setIsConnecting(false);
      
      if (err.type === 'peer-unavailable') {
        toast({
          title: 'Peer Unavailable',
          description: 'The person you are trying to connect to is not online.',
          variant: 'destructive'
        });
      }
    });

    peerRef.current = peer;

    return () => {
      console.log('🧹 Cleaning up peer...');
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    };
  }, []);

  // Effect to attach local stream to video
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Effect to attach remote stream to video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('🎥 Attaching remote stream to video element');
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.error('Error playing remote video:', e));
    }
  }, [remoteStream]);

  // Effect to answer pending incoming call once local stream is ready
  useEffect(() => {
    if (localStream && pendingIncomingCallRef.current && !isConnected) {
      console.log('✅ Local stream ready! Answering pending call...');
      const incomingCall = pendingIncomingCallRef.current;
      pendingIncomingCallRef.current = null;
      
      incomingCall.answer(localStream);
      
      incomingCall.on('stream', (stream) => {
        console.log('✅ Received remote stream from pending call');
        setRemoteStream(stream);
        setRemotePeerId(incomingCall.peer);
        setIsConnected(true);
        setIsConnecting(false);
        startRemoteTranscription(stream);
        
        toast({
          title: 'Connected!',
          description: 'You are now connected to your friend',
        });
      });
      
      incomingCall.on('close', () => {
        console.log('❌ Call ended');
        handleCallEnd();
      });
      
      incomingCall.on('error', (err) => {
        console.error('❌ Call error:', err);
      });
      
      callRef.current = incomingCall;
    }
  }, [localStream, isConnected]);
  
  // Effect to initiate outgoing call when conditions are met
  useEffect(() => {
    if (localStream && roomId && roomId.trim() && !isConnected && !isConnecting && isPeerReady && !pendingIncomingCallRef.current) {
      console.log('📞 Initiating outgoing call to:', roomId);
      callPeer(roomId);
    }
  }, [localStream, roomId, isConnected, isConnecting, isPeerReady]);

  function startRemoteTranscription(stream: MediaStream) {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('⚠️ Speech recognition not supported');
        toast({
          title: 'Transcription Limited',
          description: 'Your browser does not support speech recognition for remote audio.',
        });
        return;
      }

      // Note: Web Speech API has limitations with remote streams
      // This approach tries to route audio through AudioContext
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create a gain node to ensure audio is processed
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      
      // Create destination to capture the audio
      const destination = audioContext.createMediaStreamDestination();
      gainNode.connect(destination);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let isActive = true;

      recognition.onstart = () => {
        console.log('✅ Remote transcription started');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim()) {
          console.log('📝 Friend said:', finalTranscript.trim());
          const newItem: TranscriptItem = {
            id: `remote-${Date.now()}`,
            speaker: 'ai',
            text: `Friend: ${finalTranscript.trim()}`,
            timestamp: new Date(),
          };
          setTranscript(prev => [...prev, newItem]);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Remote recognition error:', event.error);
        if (event.error === 'no-speech') {
          console.log('No speech detected from friend');
        } else if (event.error === 'audio-capture') {
          console.error('Cannot capture remote audio for transcription');
        }
      };

      recognition.onend = () => {
        console.log('Remote recognition ended');
        if (isActive && isConnected) {
          console.log('Restarting remote recognition...');
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart:', e);
            }
          }, 100);
        }
      };

      // Try to start recognition - this may not work reliably with remote streams
      try {
        recognition.start();
        remoteRecognitionRef.current = recognition;
        remoteAudioContextRef.current = audioContext;
        
        // Add cleanup flag
        (remoteRecognitionRef.current as any).isActive = isActive;
      } catch (e) {
        console.error('Failed to start remote recognition:', e);
        toast({
          title: 'Transcription Note',
          description: 'Remote audio transcription may not be fully supported. You will see your own speech in the transcript.',
        });
      }
    } catch (error) {
      console.error('Error setting up remote transcription:', error);
    }
  }

  function handleCallEnd() {
    console.log('📴 Handling call end');
    
    // Mark recognition as inactive before stopping
    if (remoteRecognitionRef.current) {
      try {
        (remoteRecognitionRef.current as any).isActive = false;
        remoteRecognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping remote recognition:', e);
      }
      remoteRecognitionRef.current = null;
    }
    
    if (remoteAudioContextRef.current) {
      try {
        remoteAudioContextRef.current.close();
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      remoteAudioContextRef.current = null;
    }
    
    setRemoteStream(null);
    setRemotePeerId('');
    setIsConnected(false);
    
    toast({
      title: 'Call Ended',
      description: 'The other person has left the meeting',
    });
  }

  async function joinMeeting() {
    if (!isPeerReady) {
      toast({
        title: 'Please Wait',
        description: 'Still initializing peer connection...',
        variant: 'destructive'
      });
      return;
    }

    // Validate roomId if user is trying to join (not create)
    if (roomId && !roomId.trim()) {
      toast({
        title: 'Invalid Room ID',
        description: 'Please enter a valid Room ID or leave empty to create a new meeting.',
        variant: 'destructive'
      });
      return;
    }

    setIsConnecting(true);

    try {
      console.log('🎥 Requesting camera and microphone access...');
      
      // Request camera and microphone with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Media stream obtained:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Verify tracks are enabled
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        console.log('Video track enabled:', videoTrack.enabled);
        console.log('Video track settings:', videoTrack.getSettings());
      } else {
        console.error('❌ No video track found!');
      }
      
      if (audioTrack) {
        console.log('Audio track enabled:', audioTrack.enabled);
      }
      
      setLocalStream(stream);
      setIsInMeeting(true);
      setIsConnecting(false);
      speechRecognition.startListening();
      
      const welcomeItem: TranscriptItem = {
        id: 'system-welcome',
        speaker: 'ai',
        text: 'Meeting started. Live transcription is active. Share your room link to invite others.',
        timestamp: new Date(),
      };
      setTranscript([welcomeItem]);

      toast({
        title: 'Joined Meeting',
        description: 'You can now share the room link with others.',
      });

    } catch (err) {
      console.error('❌ Camera/mic access denied:', err);
      setIsConnecting(false);
      setIsInMeeting(false); // Reset to show join screen
      autoJoinInitiatedRef.current = false; // Allow retry
      toast({
        title: 'Access Denied',
        description: 'Please allow camera and microphone access to join the meeting. Refresh and try again.',
        variant: 'destructive'
      });
    }
  }

  function callPeer(targetPeerId: string) {
    if (!peerRef.current || !localStream) {
      console.error('❌ Cannot call: Peer or stream not ready');
      return;
    }

    if (targetPeerId === myPeerId) {
      console.error('❌ Cannot call yourself');
      return;
    }

    console.log('📞 Calling:', targetPeerId);
    setIsConnecting(true);
    
    const call = peerRef.current.call(targetPeerId, localStream);
    
    const timeout = setTimeout(() => {
      setIsConnecting(false);
      toast({
        title: 'Connection Timeout',
        description: 'Could not connect. Make sure your friend is online.',
        variant: 'destructive'
      });
    }, 15000);
    
    call.on('stream', (stream) => {
      clearTimeout(timeout);
      console.log('✅ Connected!');
      setRemoteStream(stream);
      setRemotePeerId(targetPeerId);
      setIsConnected(true);
      setIsConnecting(false);
      startRemoteTranscription(stream);
      
      toast({
        title: 'Connected!',
        description: 'You are now connected',
      });
    });
    
    call.on('close', () => {
      clearTimeout(timeout);
      handleCallEnd();
    });
    
    call.on('error', (err) => {
      clearTimeout(timeout);
      console.error('Call error:', err);
      setIsConnecting(false);
      toast({
        title: 'Connection Failed',
        description: 'Could not connect to peer',
        variant: 'destructive'
      });
    });
    
    callRef.current = call;
  }

  function leaveMeeting() {
    console.log('👋 Leaving meeting...');
    
    // Stop speech recognition
    speechRecognition.stopListening();
    
    // Stop remote transcription
    if (remoteRecognitionRef.current) {
      try {
        (remoteRecognitionRef.current as any).isActive = false;
        remoteRecognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping remote recognition:', e);
      }
      remoteRecognitionRef.current = null;
    }
    
    if (remoteAudioContextRef.current) {
      try {
        remoteAudioContextRef.current.close();
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      remoteAudioContextRef.current = null;
    }
    
    // Close call
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Reset state
    setRemoteStream(null);
    setRemotePeerId('');
    setIsInMeeting(false);
    setIsConnected(false);
    setIsConnecting(false);
    setRoomId('');
    setTranscript([]);
  }

  function toggleVideo() {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        console.log('Video toggled:', videoTrack.enabled);
      }
    }
  }

  function toggleAudio() {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        console.log('Audio toggled:', audioTrack.enabled);
        
        if (audioTrack.enabled) {
          speechRecognition.startListening();
        } else {
          speechRecognition.stopListening();
        }
      }
    }
  }

  function isLocalhost() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.hostname === '';
  }

  function copyRoomLink() {
    const isLocal = isLocalhost();
    
    if (isLocal) {
      // For localhost, only copy the peer ID
      navigator.clipboard.writeText(myPeerId);
      toast({
        title: 'Peer ID Copied!',
        description: '⚠️ Running on localhost. Share this Peer ID only. Your friend must run the app locally too.',
      });
    } else {
      // For deployed apps, copy the full link
      const link = `${window.location.origin}${window.location.pathname}?room=${myPeerId}`;
      navigator.clipboard.writeText(link);
      toast({
        title: 'Link Copied!',
        description: 'Share this link with others to join your meeting.',
      });
    }
  }

  function shareRoomLink() {
    const isLocal = isLocalhost();
    
    if (isLocal) {
      // For localhost, just copy peer ID
      navigator.clipboard.writeText(myPeerId);
      toast({
        title: 'Peer ID Copied!',
        description: '⚠️ Localhost detected. Only the Peer ID was copied. Both users must run the app locally.',
      });
      return;
    }
    
    const link = `${window.location.origin}${window.location.pathname}?room=${myPeerId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join My Meeting',
        text: 'Join my interview practice session!',
        url: link,
      }).catch(err => {
        if (err.name !== 'AbortError') {
          copyRoomLink();
        }
      });
    } else {
      copyRoomLink();
    }
  }

  // Auto-fill room ID from URL and auto-join when ready
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    
    if (room && !autoJoinInitiatedRef.current) {
      console.log('📋 Room ID from URL:', room);
      setRoomId(room);
      
      toast({
        title: 'Room Detected',
        description: 'Connecting you to the meeting...',
      });
      
      // Wait for peer to be ready, then auto-join
      const checkAndJoin = setInterval(() => {
        if (isPeerReady && !isInMeeting && !localStream && !autoJoinInitiatedRef.current) {
          console.log('🚀 Auto-joining meeting - conditions met');
          autoJoinInitiatedRef.current = true;
          clearInterval(checkAndJoin);
          
          // Small delay to ensure state is stable
          setTimeout(() => {
            console.log('▶️ Starting meeting now...');
            startMeeting();
          }, 200);
        }
      }, 100);
      
      // Cleanup after 15 seconds
      setTimeout(() => {
        clearInterval(checkAndJoin);
        if (!isInMeeting && autoJoinInitiatedRef.current === false) {
          console.log('⏱️ Auto-join timeout - please join manually');
          toast({
            title: 'Please Join Manually',
            description: 'Auto-join timed out. Click "Join Meeting" button.',
            variant: 'destructive'
          });
        }
      }, 15000);
    }
  }, [isPeerReady, isInMeeting, localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechRecognition.stopListening();
      
      if (remoteRecognitionRef.current) {
        try {
          remoteRecognitionRef.current.stop();
        } catch (e) {}
      }
      
      if (remoteAudioContextRef.current) {
        try {
          remoteAudioContextRef.current.close();
        } catch (e) {}
      }
      
      if (callRef.current) {
        callRef.current.close();
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  if (!isInMeeting) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" />
              Live Meeting Mode
            </CardTitle>
            <CardDescription>
              Join a meeting with live transcription and AI-assisted feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Room ID (optional - leave empty to create new room)
              </label>
              <Input
                placeholder="Enter peer ID to join existing meeting"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.trim())}
              />
              {myPeerId && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Your Peer ID:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                      {myPeerId}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(myPeerId);
                      toast({ title: 'Copied!', description: 'Peer ID copied to clipboard' });
                    }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {isLocalhost() && (
                    <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        ⚠️ <strong>Running on localhost.</strong> Your friends must also run this app locally on their computer. Links won't work - only share the Peer ID above.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {!isPeerReady && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  ⏳ Initializing peer connection...
                </p>
              )}
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Features in this mode:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Real peer-to-peer video calling (WebRTC)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Live speech-to-text transcription
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Real-time grammar correction
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Shareable room links (no server needed)
                </li>
              </ul>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-500 mb-2">How to use:</p>
                  <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                    <li><strong>To create a new meeting:</strong> Leave Room ID empty and click "Create Meeting"</li>
                    <li><strong>To join an existing meeting:</strong> Enter the Peer ID shared by your friend in the "Room ID" field, then click "Join Meeting"</li>
                    <li><strong>To invite others:</strong> After creating, copy and share your "Peer ID" (shown above) with them</li>
                    <li><strong>Important:</strong> The person creating the meeting must start first, then share their Peer ID</li>
                    <li><strong>Device permissions:</strong> Always allow camera and microphone when prompted</li>
                    <li><strong>Troubleshooting:</strong> If connection fails:
                      <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                        <li>Verify the Peer ID is correct (no extra spaces)</li>
                        <li>Ensure both users are online and in meetings</li>
                        <li>Try refreshing and reconnecting</li>
                        <li>Check that your camera/mic permissions are enabled</li>
                      </ul>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
            
            {isLocalhost() && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">⚠️ Localhost Mode Detected</p>
                    <div className="text-muted-foreground space-y-2">
                      <p><strong>Current Limitation:</strong> You're running on localhost, which means:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Friends cannot access your localhost URL</li>
                        <li>Sharing links will NOT work</li>
                        <li>Both you and your friend must run the app on your own computers</li>
                      </ul>
                      <p className="mt-2"><strong>To connect with friends:</strong></p>
                      <ol className="list-decimal list-inside ml-2 space-y-1">
                        <li>Both of you run <code className="bg-muted px-1 rounded">npm run dev</code> locally</li>
                        <li>Both open <code className="bg-muted px-1 rounded">localhost:5173</code> in your browsers</li>
                        <li>One person creates a meeting and shares their Peer ID</li>
                        <li>The other person enters that Peer ID and joins</li>
                      </ol>
                      <p className="mt-2"><strong>For easier sharing (recommended):</strong></p>
                      <p className="ml-2">Deploy this app to Vercel, Netlify, or Render so both users can access the same URL.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              className="w-full btn-gradient" 
              size="lg" 
              onClick={joinMeeting}
              disabled={!isPeerReady || isConnecting}
            >
              <Video className="mr-2 h-5 w-5" />
              {isConnecting ? 'Connecting...' : roomId ? 'Join Meeting' : 'Create Meeting'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {/* User Video */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                !isVideoOn && "hidden"
              )}
              onLoadedMetadata={() => console.log('✅ Video metadata loaded')}
              onPlay={() => console.log('✅ Video playing event')}
              onError={(e) => console.error('❌ Video element error:', e)}
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">You</span>
                </div>
              </div>
            )}
            {isVideoOn && !localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="space-y-2 text-center">
                  <div className="animate-pulse">
                    <Video className="h-12 w-12 text-white/50 mx-auto" />
                  </div>
                  <p className="text-white text-sm">Loading camera...</p>
                </div>
              </div>
            )}
            {isVideoOn && localStream && videoRef.current && !videoRef.current.srcObject && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <p className="text-white text-sm">Connecting camera...</p>
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">You</span>
              {speechRecognition.isListening && (
                <VoiceWave isActive className="scale-75" />
              )}
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              {!isAudioOn && (
                <div className="bg-red-500 text-white p-2 rounded-full">
                  <MicOff className="h-4 w-4" />
                </div>
              )}
              {!isVideoOn && (
                <div className="bg-red-500 text-white p-2 rounded-full">
                  <VideoOff className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>

          {/* Remote Video (Friend) */}
          {remoteStream ? (
            <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4">
                <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
                  Friend
                </span>
              </div>
            </div>
          ) : (
            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center space-y-3 p-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {isConnecting ? 'Connecting...' : 'Waiting for friend to join...'}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={copyRoomLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={shareRoomLink}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Room Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {isLocalhost() ? 'Your Peer ID (share this with friends)' : 'Your Room ID'}
                </p>
                <p className="text-sm font-mono truncate">{myPeerId}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyRoomLink}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={shareRoomLink}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
            {isLocalhost() && (
              <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ <strong>Localhost Mode:</strong> You can only connect with friends who are also running this app on their own computer. Share the Peer ID above, not a link.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcription Info when connected */}
        {isConnected && (
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Transcription Active</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your speech is being transcribed. Note: Friend's audio transcription depends on browser support and may not always be available.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grammar Feedback Banner */}
        {grammarFeedback.length > 0 && (
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Grammar Suggestion</p>
                  <p className="text-sm text-muted-foreground">
                    {grammarFeedback[grammarFeedback.length - 1].explanation}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="line-through text-muted-foreground">
                      {grammarFeedback[grammarFeedback.length - 1].original}
                    </span>
                    {' → '}
                    <span className="text-success font-medium">
                      {grammarFeedback[grammarFeedback.length - 1].corrected}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meeting Controls */}
        <div className="bg-card rounded-xl p-4 flex items-center justify-center gap-4">
          <Button
            variant={isAudioOn ? "secondary" : "destructive"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleAudio}
          >
            {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant={isVideoOn ? "secondary" : "destructive"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={leaveMeeting}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          
          <div className="border-l pl-4 ml-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{isConnected ? '2' : '1'} participant{isConnected ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Sidebar */}
      <div className="lg:w-80 xl:w-96 flex flex-col gap-4">
        <TranscriptPanel items={transcript} className="flex-1 max-h-[calc(100vh-16rem)]" />
        
        {/* Live Speech Display */}
        {speechRecognition.transcript && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-1">Speaking now...</p>
              <p className="text-sm">{speechRecognition.transcript}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}