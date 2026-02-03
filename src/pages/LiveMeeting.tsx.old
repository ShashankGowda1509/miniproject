import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { toast } from '@/hooks/use-toast';

interface TranscriptItem {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
}

interface Participant {
  peerId: string;
  stream: MediaStream;
  call: MediaConnection;
}

export default function LiveMeeting() {
  // UI State
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [roomIdInput, setRoomIdInput] = useState('');
  
  // Connection State
  const [myPeerId, setMyPeerId] = useState('');
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  // Transcript State
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  // Refs
  const peerRef = useRef<Peer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const participantsRef = useRef<Map<string, Participant>>(new Map());

  // Keep participants ref in sync
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Initialize PeerJS
  useEffect(() => {
    console.log('🔧 Initializing PeerJS...');
    
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id) => {
      console.log('✅ My Peer ID:', id);
      setMyPeerId(id);
      peerRef.current = peer;
    });

    peer.on('call', async (incomingCall) => {
      console.log('📞 Receiving call from:', incomingCall.peer);
      
      // Don't accept calls from yourself
      if (incomingCall.peer === myPeerId) {
        console.log('❌ Ignoring call from self');
        return;
      }

      // Check if already connected to this peer
      if (participantsRef.current.has(incomingCall.peer)) {
        console.log('⚠️ Already connected to', incomingCall.peer);
        return;
      }
      
      // Get local stream if not already in meeting
      let stream = localStream;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          setLocalStream(stream);
          setIsInMeeting(true);
          startSpeechRecognition();
        } catch (err) {
          console.error('Failed to get media:', err);
          toast({ title: 'Access Denied', description: 'Camera/microphone access required', variant: 'destructive' });
          return;
        }
      }
      
      // Answer the call
      incomingCall.answer(stream);
      
      incomingCall.on('stream', (remoteStream) => {
        console.log('✅ Stream received from:', incomingCall.peer);
        addParticipant(incomingCall.peer, remoteStream, incomingCall);
        toast({ 
          title: 'Participant Joined', 
          description: `${incomingCall.peer.substring(0, 8)}... joined the meeting` 
        });
      });
      
      incomingCall.on('close', () => {
        console.log('📴 Call closed from:', incomingCall.peer);
        removeParticipant(incomingCall.peer);
      });

      incomingCall.on('error', (err) => {
        console.error('❌ Call error from', incomingCall.peer, err);
        removeParticipant(incomingCall.peer);
      });
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      setIsConnecting(false);
      
      if (err.type === 'peer-unavailable') {
        toast({ title: 'Connection Failed', description: 'Person not available or offline', variant: 'destructive' });
      } else if (err.type === 'network') {
        toast({ title: 'Network Error', description: 'Check your internet connection', variant: 'destructive' });
      } else {
        toast({ title: 'Connection Error', description: err.message || 'Please try again', variant: 'destructive' });
      }
    });

    peer.on('disconnected', () => {
      console.log('⚠️ Peer disconnected, attempting reconnect...');
      setTimeout(() => {
        if (peer && !peer.destroyed) {
          peer.reconnect();
        }
      }, 1000);
    });

    return () => {
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    };
  }, []);

  // Attach local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => {
        console.error('Error playing local video:', err);
      });
    }
  }, [localStream]);

  // Add participant helper
  function addParticipant(peerId: string, stream: MediaStream, call: MediaConnection) {
    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.set(peerId, { peerId, stream, call });
      return newMap;
    });
    addTranscript(peerId.substring(0, 8), `${peerId.substring(0, 8)}... joined`);
  }

  // Remove participant helper
  function removeParticipant(peerId: string) {
    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
    addTranscript(peerId.substring(0, 8), `${peerId.substring(0, 8)}... left the meeting`);
    toast({ 
      title: 'Participant Left', 
      description: `${peerId.substring(0, 8)}... left the meeting` 
    });
  }

  // Auto-join from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room !== myPeerId && !isInMeeting && myPeerId) {
      setRoomIdInput(room);
      toast({ title: 'Meeting Link Detected', description: 'Click "Join Meeting" to connect' });
    }
  }, [myPeerId, isInMeeting]);

  // Start meeting
  async function startMeeting() {
    if (!peerRef.current) {
      toast({ title: 'Not Ready', description: 'Please wait for initialization...', variant: 'destructive' });
      return;
    }

    // Validate room ID if provided
    const targetPeerId = roomIdInput.trim();
    if (targetPeerId) {
      if (targetPeerId === myPeerId) {
        toast({ title: 'Invalid Room ID', description: 'Cannot join your own meeting', variant: 'destructive' });
        return;
      }
    }

    setIsConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      setLocalStream(stream);
      setIsInMeeting(true);
      setIsConnecting(false);
      startSpeechRecognition();
      
      addTranscript('You', 'Meeting started. Share your link to invite others.');

      // If joining someone, call them
      if (targetPeerId) {
        setTimeout(() => callPeer(targetPeerId), 500);
        toast({ title: 'Meeting Started', description: 'Connecting to peer...' });
      } else {
        toast({ title: 'Meeting Started', description: 'Share your link to invite others' });
      }
    } catch (err) {
      console.error('Error:', err);
      setIsConnecting(false);
      toast({ title: 'Access Denied', description: 'Please allow camera and microphone', variant: 'destructive' });
    }
  }

  // Call peer
  function callPeer(peerId: string) {
    if (!peerRef.current || !localStream) {
      console.log('❌ Cannot call: missing peer or stream');
      return;
    }

    if (peerId === myPeerId) {
      toast({ title: 'Invalid', description: 'Cannot call yourself', variant: 'destructive' });
      return;
    }

    if (participantsRef.current.has(peerId)) {
      console.log('⚠️ Already connected to', peerId);
      toast({ title: 'Already Connected', description: 'You are already in a call with this person' });
      return;
    }

    console.log('📞 Calling:', peerId);
    setIsConnecting(true);

    const call = peerRef.current.call(peerId, localStream);
    
    const timeout = setTimeout(() => {
      setIsConnecting(false);
      if (!participantsRef.current.has(peerId)) {
        toast({ title: 'Connection Timeout', description: 'Could not reach peer. Check the ID and try again.', variant: 'destructive' });
      }
    }, 15000);

    call.on('stream', (stream) => {
      clearTimeout(timeout);
      console.log('✅ Stream received from:', peerId);
      addParticipant(peerId, stream, call);
      setIsConnecting(false);
      toast({ title: 'Connected!', description: `Connected to ${peerId.substring(0, 8)}...` });
    });

    call.on('close', () => {
      clearTimeout(timeout);
      removeParticipant(peerId);
    });

    call.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ Call error:', err);
      setIsConnecting(false);
      toast({ title: 'Call Failed', description: 'Could not connect to peer', variant: 'destructive' });
    });
  }

  // Leave meeting
  function leaveMeeting() {
    // Stop speech recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    
    // Close all peer connections
    participants.forEach((participant) => {
      try {
        participant.call.close();
      } catch (e) {
        console.error('Error closing call:', e);
      }
    });
    setParticipants(new Map());
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setIsInMeeting(false);
    setTranscript([]);
    setIsListening(false);
    setRoomIdInput('');
    
    toast({ title: 'Meeting Ended', description: 'You left the meeting' });
  }

  // Speech recognition
  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('⚠️ Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript;
      addTranscript('You', text);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Just restart, this is normal
        return;
      }
    };

    recognition.onend = () => {
      if (isInMeeting && recognitionRef.current) {
        setTimeout(() => { 
          try { 
            recognition.start(); 
          } catch (e) {
            console.log('Recognition restart failed:', e);
          } 
        }, 100);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
      console.log('✅ Speech recognition started');
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }

  // Add transcript
  function addTranscript(speaker: string, text: string) {
    setTranscript(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      speaker,
      text,
      timestamp: new Date()
    }]);
  }

  // Toggle controls
  function toggleVideo() {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoOn(track.enabled);
      }
    }
  }

  function toggleAudio() {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsAudioOn(track.enabled);
      }
    }
  }

  // Share link
  function shareLink() {
    const link = `${window.location.origin}/live-meeting?room=${myPeerId}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Join My Meeting', url: link });
    } else {
      navigator.clipboard.writeText(link);
      toast({ title: 'Link Copied!', description: 'Share this link with others to join' });
    }
  }

  function copyId() {
    navigator.clipboard.writeText(myPeerId);
    toast({ title: 'Copied!', description: 'Meeting ID copied to clipboard' });
  }

  // Add more people to existing meeting
  function addMorePeople() {
    const peerId = prompt('Enter Peer ID to add:');
    if (peerId && peerId.trim()) {
      callPeer(peerId.trim());
    }
  }

  // Join screen
  if (!isInMeeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl">Live Video Meeting</CardTitle>
              <p className="text-muted-foreground mt-2">
                Video call with live transcription
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {myPeerId && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Your Meeting ID:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono truncate">
                      {myPeerId}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyId}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium">Join Meeting (Optional)</label>
                <Input
                  placeholder="Enter Meeting ID to join someone"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                />
              </div>

              <Button
                className="w-full h-12"
                onClick={startMeeting}
                disabled={isConnecting || !myPeerId}
              >
                {isConnecting ? 'Starting...' : roomIdInput ? 'Join Meeting' : 'Start New Meeting'}
              </Button>

              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>✓ HD Video & Audio</p>
                <p>✓ Live Transcription</p>
                <p>✓ Share Link</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Meeting view
  const participantCount = participants.size + 1; // +1 for yourself
  const participantsArray = Array.from(participants.values());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary" />
            <span className="font-semibold">Live Meeting</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span className="font-medium">{participantCount} Participant{participantCount > 1 ? 's' : ''}</span>
          </div>
          
          {participants.size > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-600 dark:text-green-400 font-medium">Live</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-muted px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Meeting ID:</span>
            <code className="text-xs font-mono font-semibold">{myPeerId.substring(0, 12)}...</code>
            <Button size="sm" variant="ghost" onClick={copyId} className="h-6 w-6 p-0">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={shareLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button size="sm" variant="outline" onClick={addMorePeople}>
            <Users className="h-4 w-4 mr-2" />
            Add People
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          {/* Video Grid */}
          <div className="flex-1 grid gap-4" style={{
            gridTemplateColumns: participantsArray.length === 0 ? '1fr' :
                                 participantsArray.length === 1 ? 'repeat(2, 1fr)' :
                                 participantsArray.length === 2 ? 'repeat(2, 1fr)' :
                                 'repeat(2, 1fr)',
            gridTemplateRows: participantsArray.length <= 2 ? '1fr' : 'repeat(2, 1fr)'
          }}>
            {/* Your video */}
            <div className="bg-muted rounded-lg overflow-hidden relative">
              {localStream && (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
              )}
              {!isVideoOn && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Camera Off</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">You</span>
              </div>
              {!isAudioOn && (
                <div className="absolute top-3 right-3 bg-red-500 p-2 rounded-full">
                  <MicOff className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Remote participants */}
            {participantsArray.map((participant) => (
              <RemoteVideo key={participant.peerId} participant={participant} />
            ))}

            {/* Waiting placeholder */}
            {participantsArray.length === 0 && (
              <div className="bg-muted rounded-lg overflow-hidden relative flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">
                    {isConnecting ? 'Connecting...' : 'Waiting for others to join'}
                  </p>
                  {myPeerId && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-muted-foreground">Share your Meeting ID:</p>
                      <code className="bg-muted-foreground/20 px-3 py-1 rounded text-sm">{myPeerId}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              variant={isAudioOn ? 'default' : 'destructive'}
              onClick={toggleAudio}
              className="rounded-full h-14 w-14"
            >
              {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              size="lg"
              variant={isVideoOn ? 'default' : 'destructive'}
              onClick={toggleVideo}
              className="rounded-full h-14 w-14"
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            <Button
              size="lg"
              variant="destructive"
              onClick={leaveMeeting}
              className="rounded-full h-14 px-6"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Leave
            </Button>
          </div>
        </div>

        <div className="w-96 bg-card border rounded-lg flex flex-col">
          <div className="p-4 border-b space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({participantCount})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-md">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">You (Host)</span>
              </div>
              {participantsArray.map((participant) => (
                <div key={participant.peerId} className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-md">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">{participant.peerId.substring(0, 12)}...</span>
                </div>
              ))}
              {participantsArray.length === 0 && (
                <div className="text-xs text-muted-foreground px-3 py-2">
                  No other participants yet
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", isListening ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
              Live Transcript
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {transcript.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>Transcript will appear here</p>
                <p className="text-xs mt-2">Start speaking to see live transcription</p>
              </div>
            ) : (
              transcript.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-medium", item.speaker === 'You' ? 'text-primary' : 'text-blue-500')}>
                      {item.speaker}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{item.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for remote video participant
function RemoteVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(err => {
        console.error('Error playing remote video:', err);
        // Retry after a short delay
        setTimeout(() => {
          videoRef.current?.play().catch(e => console.error('Retry failed:', e));
        }, 500);
      });
    }
  }, [participant.stream]);

  return (
    <div className="bg-muted rounded-lg overflow-hidden relative">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover" 
      />
      <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1 rounded-full">
        <span className="text-white text-sm font-medium">
          {participant.peerId.substring(0, 12)}...
        </span>
      </div>
    </div>
  );
}
