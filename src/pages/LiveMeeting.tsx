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
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [pendingCall, setPendingCall] = useState<MediaConnection | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

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
      text,
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
    console.log('Initializing PeerJS...');
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peer.on('open', (id) => {
      console.log('✅ Peer connection established. My peer ID:', id);
      setMyPeerId(id);
      setIsPeerReady(true);
      setIsConnecting(false);
    });

    peer.on('call', (call) => {
      console.log('📞 Receiving call from:', call.peer);
      
      // If we have local stream, answer immediately
      if (localStream) {
        console.log('Answering call with local stream...');
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
          console.log('✅ Received remote stream from:', call.peer);
          console.log('Remote stream tracks - Video:', remoteStream.getVideoTracks().length, 'Audio:', remoteStream.getAudioTracks().length);
          addRemoteParticipant(call.peer, remoteStream);
          
          toast({
            title: 'User Joined',
            description: `User ${call.peer.substring(0, 8)} has joined the meeting`,
          });
        });

        call.on('close', () => {
          console.log('❌ Call closed with:', call.peer);
          removeRemoteParticipant(call.peer);
          toast({
            title: 'User Left',
            description: `User ${call.peer.substring(0, 8)} has left the meeting`,
          });
        });

        call.on('error', (err) => {
          console.error('Call error:', err);
          toast({
            title: 'Connection Error',
            description: 'Connection error with peer. Please check if peer is online.',
            variant: 'destructive'
          });
        });

        connectionsRef.current.set(call.peer, call);
      } else {
        // Store the call to answer when stream is ready
        console.log('⏳ No local stream yet, storing incoming call...');
        setPendingCall(call);
        
        toast({
          title: 'Incoming Call',
          description: 'Click "Join Meeting" to answer the call',
        });
      }
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      const errorMessage = err.type === 'peer-unavailable' 
        ? 'The peer you are trying to connect to is not available. Make sure they are online.' 
        : err.type === 'network'
        ? 'Network error. Check your internet connection.'
        : 'Failed to establish peer connection. Please try again.';
      
      toast({
        title: 'Connection Error',
        description: errorMessage,
        variant: 'destructive'
      });
      setIsConnecting(false);
    });

    peer.on('disconnected', () => {
      console.log('⚠️ Peer disconnected, attempting to reconnect...');
      setTimeout(() => {
        if (peer.disconnected && !peer.destroyed) {
          peer.reconnect();
        }
      }, 2000);
    });

    peerRef.current = peer;

    return () => {
      console.log('Destroying peer connection...');
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    };
  }, []);

  // Effect to attach local stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      console.log('Attaching local stream to video element...');
      videoRef.current.srcObject = localStream;
      videoRef.current.muted = true;
      
      const playVideo = async () => {
        try {
          await videoRef.current?.play();
          console.log('✅ Local video playing successfully');
        } catch (err) {
          console.error('Error playing local video:', err);
          // Retry after a short delay
          setTimeout(() => {
            videoRef.current?.play().catch(e => console.error('Video play retry failed:', e));
          }, 500);
        }
      };
      
      playVideo();
    }
  }, [localStream]);

  // Effect to answer pending calls when localStream becomes available
  useEffect(() => {
    if (localStream && pendingCall) {
      console.log('✅ Local stream ready, answering pending call from:', pendingCall.peer);
      
      pendingCall.answer(localStream);
      
      pendingCall.on('stream', (remoteStream) => {
        console.log('✅ Received remote stream from pending call:', pendingCall.peer);
        addRemoteParticipant(pendingCall.peer, remoteStream);
        
        toast({
          title: 'Connected',
          description: `Connected to ${pendingCall.peer.substring(0, 8)}`,
        });
      });

      pendingCall.on('close', () => {
        console.log('Call closed with:', pendingCall.peer);
        removeRemoteParticipant(pendingCall.peer);
      });

      pendingCall.on('error', (err) => {
        console.error('Pending call error:', err);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect with peer',
          variant: 'destructive'
        });
      });

      connectionsRef.current.set(pendingCall.peer, pendingCall);
      setPendingCall(null);
    }
  }, [localStream, pendingCall]);

  // Separate effect to handle call initiation when localStream is ready
  useEffect(() => {
    // Only attempt to connect if there's a roomId and it's different from our own
    if (localStream && roomId && roomId.trim() && roomId !== myPeerId && isInMeeting && isPeerReady) {
      console.log('🔄 Conditions met for calling peer:', { 
        hasLocalStream: !!localStream, 
        roomId, 
        myPeerId,
        isInMeeting,
        isPeerReady,
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length
      });
      const timer = setTimeout(() => {
        console.log('📞 Initiating call to peer:', roomId);
        callPeer(roomId);
      }, 1500); // Increased delay to ensure both peers are fully ready
      return () => clearTimeout(timer);
    } else if (isInMeeting && roomId && roomId.trim() && localStream && isPeerReady) {
      // Check why we're not connecting
      if (roomId === myPeerId) {
        console.log('⚠️ Not connecting: Cannot call yourself');
        toast({
          title: 'Invalid Room ID',
          description: 'You cannot use your own Peer ID as the Room ID.',
          variant: 'destructive'
        });
      }
    } else if (isInMeeting && roomId && roomId.trim() && !localStream) {
      console.log('⏳ Waiting for local stream before connecting to peer...');
    }
  }, [localStream, roomId, myPeerId, isInMeeting, isPeerReady]);

  function addRemoteParticipant(peerId: string, stream: MediaStream) {
    setParticipants(prev => {
      const exists = prev.find(p => p.id === peerId);
      if (exists) return prev;
      
      return [...prev, {
        id: peerId,
        name: `User ${peerId.substring(0, 6)}`,
        isSpeaking: false,
        isVideoOn: stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled,
        isAudioOn: stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled,
        stream
      }];
    });
  }

  function removeRemoteParticipant(peerId: string) {
    setParticipants(prev => prev.filter(p => p.id !== peerId));
    remoteVideoRefs.current.delete(peerId);
    
    const connection = connectionsRef.current.get(peerId);
    if (connection) {
      connection.close();
      connectionsRef.current.delete(peerId);
    }
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
      toast({
        title: 'Access Denied',
        description: 'Please allow camera and microphone access to join the meeting. Check your browser permissions.',
        variant: 'destructive'
      });
    }
  }

  function callPeer(remotePeerId: string) {
    if (!peerRef.current || !localStream) {
      console.error('❌ Peer or local stream not ready');
      toast({
        title: 'Not Ready',
        description: 'Peer connection or local stream not ready. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    if (remotePeerId === myPeerId) {
      console.error('❌ Cannot call yourself');
      toast({
        title: 'Invalid Room ID',
        description: 'You cannot call yourself. Please enter a different Room ID.',
        variant: 'destructive'
      });
      return;
    }

    // Check if already connected
    if (connectionsRef.current.has(remotePeerId)) {
      console.log('⚠️ Already connected to:', remotePeerId);
      return;
    }

    console.log('📞 Calling peer:', remotePeerId);
    console.log('📤 Sending stream with tracks:', {
      video: localStream.getVideoTracks().length,
      audio: localStream.getAudioTracks().length
    });
    
    setIsConnecting(true);
    
    try {
      const call = peerRef.current.call(remotePeerId, localStream);
      
      if (!call) {
        console.error('❌ Failed to create call object');
        setIsConnecting(false);
        return;
      }

      // Add timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (isConnecting) {
          console.error('❌ Connection timeout');
          setIsConnecting(false);
          toast({
            title: 'Connection Timeout',
            description: 'Could not connect to peer. They may not be online.',
            variant: 'destructive'
          });
          call.close();
        }
      }, 15000); // 15 second timeout
      
      call.on('stream', (remoteStream) => {
        clearTimeout(connectionTimeout);
        console.log('✅ Received stream from:', remotePeerId);
        console.log('📥 Remote stream tracks:', {
          video: remoteStream.getVideoTracks().length,
          audio: remoteStream.getAudioTracks().length
        });
        addRemoteParticipant(remotePeerId, remoteStream);
        setIsConnecting(false);
        
        toast({
          title: 'Connected!',
          description: 'Successfully connected to peer. You can now talk.',
        });
      });

      call.on('close', () => {
        clearTimeout(connectionTimeout);
        console.log('❌ Call closed with:', remotePeerId);
        removeRemoteParticipant(remotePeerId);
      });

      call.on('error', (err) => {
        clearTimeout(connectionTimeout);
        console.error('❌ Call error:', err);
        setIsConnecting(false);
        
        toast({
          title: 'Call Failed',
          description: 'Could not connect. Make sure your friend has joined the meeting.',
          variant: 'destructive'
        });
      });

      connectionsRef.current.set(remotePeerId, call);
    } catch (err) {
      console.error('❌ Error initiating call:', err);
      setIsConnecting(false);
      toast({
        title: 'Connection Error',
        description: 'Failed to initiate call. Please try again.',
        variant: 'destructive'
      });
    }
  }

  function leaveMeeting() {
    console.log('Leaving meeting...');
    setIsInMeeting(false);
    speechRecognition.stopListening();
    
    // Close all peer connections
    connectionsRef.current.forEach(conn => conn.close());
    connectionsRef.current.clear();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      setLocalStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setParticipants([]);
    setRoomId('');
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

  // Auto-fill room ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && !isInMeeting && !roomId) {
      console.log('Room ID from URL:', room);
      setRoomId(room);
      
      // Show toast to guide user to join
      toast({
        title: 'Room ID Detected',
        description: 'Click "Join Meeting" to connect with your friend.',
      });
    }
  }, [isInMeeting, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechRecognition.stopListening();
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

          {/* Remote Participants */}
          {participants.map((participant) => (
            <div 
              key={participant.id} 
              className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video"
            >
              <video
                ref={(el) => {
                  if (el && participant.stream) {
                    // Only set if different to avoid unnecessary updates
                    if (el.srcObject !== participant.stream) {
                      el.srcObject = participant.stream;
                      el.muted = false;
                      console.log('Setting stream for participant:', participant.id);
                      
                      // Play video with proper error handling
                      const playPromise = el.play();
                      if (playPromise !== undefined) {
                        playPromise
                          .then(() => console.log('Remote video playing:', participant.id))
                          .catch(e => {
                            console.error('Error playing remote video:', e);
                            // Retry
                            setTimeout(() => {
                              if (el && el.srcObject === participant.stream) {
                                el.play().catch(err => console.error('Retry failed:', err));
                              }
                            }, 500);
                          });
                      }
                    }
                    remoteVideoRefs.current.set(participant.id, el);
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {participant.name}
                </span>
                {!participant.isAudioOn && (
                  <MicOff className="h-4 w-4 text-red-500" />
                )}
                {!participant.isVideoOn && (
                  <VideoOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}

          {/* Placeholder if no remote participants */}
          {participants.length === 0 && (
            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center space-y-3 p-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {isConnecting ? 'Connecting to peer...' : 'Waiting for others to join...'}
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
              <span>{participants.length + 1} participant{participants.length !== 0 ? 's' : ''}</span>
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