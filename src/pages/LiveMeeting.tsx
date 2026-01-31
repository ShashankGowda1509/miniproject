import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import TranscriptPanel, { TranscriptItem } from '@/components/TranscriptPanel';
import VoiceWave from '@/components/VoiceWave';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, AlertCircle, CheckCircle, Copy, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Peer, { MediaConnection } from 'peerjs';
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
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setMyPeerId(id);
      setIsConnecting(false);
    });

    peer.on('call', (call) => {
      console.log('Receiving call from:', call.peer);
      if (localStream) {
        call.answer(localStream);
        
        call.on('stream', (remoteStream) => {
          console.log('Received remote stream from:', call.peer);
          addRemoteParticipant(call.peer, remoteStream);
          
          toast({
            title: 'User Joined',
            description: `User ${call.peer.substring(0, 8)} has joined the meeting`,
          });
        });

        call.on('close', () => {
          removeRemoteParticipant(call.peer);
          toast({
            title: 'User Left',
            description: `User ${call.peer.substring(0, 8)} has left the meeting`,
          });
        });

        call.on('error', (err) => {
          console.error('Call error:', err);
        });

        connectionsRef.current.set(call.peer, call);
      }
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      toast({
        title: 'Connection Error',
        description: 'Failed to establish peer connection. Please try again.',
        variant: 'destructive'
      });
      setIsConnecting(false);
    });

    peer.on('disconnected', () => {
      console.log('Peer disconnected, attempting to reconnect...');
      peer.reconnect();
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, [localStream]);

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
    if (!myPeerId) {
      toast({
        title: 'Please Wait',
        description: 'Still initializing peer connection...',
        variant: 'destructive'
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

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

      // If roomId is provided and different from myPeerId, call that peer
      if (roomId && roomId !== myPeerId) {
        setTimeout(() => callPeer(roomId), 1000);
      }

    } catch (err) {
      console.error('Camera/mic access denied:', err);
      setIsConnecting(false);
      toast({
        title: 'Access Denied',
        description: 'Please allow camera and microphone access to join the meeting.',
        variant: 'destructive'
      });
    }
  }

  function callPeer(remotePeerId: string) {
    if (!peerRef.current || !localStream) {
      console.error('Peer or local stream not ready');
      return;
    }

    console.log('Calling peer:', remotePeerId);
    setIsConnecting(true);
    
    const call = peerRef.current.call(remotePeerId, localStream);
    
    call.on('stream', (remoteStream) => {
      console.log('Received stream from:', remotePeerId);
      addRemoteParticipant(remotePeerId, remoteStream);
      setIsConnecting(false);
      
      toast({
        title: 'Connected',
        description: 'Successfully connected to peer',
      });
    });

    call.on('close', () => {
      removeRemoteParticipant(remotePeerId);
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
      setIsConnecting(false);
      toast({
        title: 'Call Failed',
        description: 'Could not connect to peer. Make sure the Room ID is correct.',
        variant: 'destructive'
      });
    });

    connectionsRef.current.set(remotePeerId, call);
  }

  function leaveMeeting() {
    setIsInMeeting(false);
    speechRecognition.stopListening();
    
    // Close all peer connections
    connectionsRef.current.forEach(conn => conn.close());
    connectionsRef.current.clear();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
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
      }
    }
  }

  function toggleAudio() {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        
        if (audioTrack.enabled) {
          speechRecognition.startListening();
        } else {
          speechRecognition.stopListening();
        }
      }
    }
  }

  function copyRoomLink() {
    const link = `${window.location.origin}${window.location.pathname}?room=${myPeerId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link Copied!',
      description: 'Share this link with others to join your meeting.',
    });
  }

  function shareRoomLink() {
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
    if (room && !isInMeeting) {
      setRoomId(room);
    }
  }, []);

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
      <div className="max-w-2xl mx-auto space-y-6">
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
                placeholder="Enter room ID from friend or leave empty"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              {myPeerId && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Your Peer ID (for manual sharing):</p>
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
                </div>
              )}
              {!myPeerId && (
                <p className="text-xs text-muted-foreground">
                  Initializing peer connection...
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
                  <p className="font-medium text-blue-500 mb-1">How to use:</p>
                  <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                    <li>Click "Create Meeting" to start a new room</li>
                    <li>Share the link or Room ID with your friend</li>
                    <li>Your friend pastes the Room ID and clicks "Join Meeting"</li>
                    <li>You'll be connected via peer-to-peer video!</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <Button 
              className="w-full btn-gradient" 
              size="lg" 
              onClick={joinMeeting}
              disabled={!myPeerId || isConnecting}
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
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {/* User Video */}
          <div className="relative bg-foreground/90 rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                !isVideoOn && "hidden"
              )}
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">You</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">You</span>
              {speechRecognition.isListening && (
                <VoiceWave isActive className="scale-75" />
              )}
            </div>
          </div>

          {/* Remote Participants */}
          {participants.map((participant) => (
            <div 
              key={participant.id} 
              className="relative bg-foreground rounded-xl overflow-hidden aspect-video"
            >
              <video
                ref={(el) => {
                  if (el && participant.stream) {
                    el.srcObject = participant.stream;
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
            <div className="relative bg-foreground rounded-xl overflow-hidden aspect-video flex items-center justify-center">
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
                <p className="text-xs text-muted-foreground">Your Room ID</p>
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