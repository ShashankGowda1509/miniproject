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
  speaker: 'You' | 'Friend';
  text: string;
  timestamp: Date;
}

export default function LiveMeeting() {
  // UI State
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [roomIdInput, setRoomIdInput] = useState('');
  
  // Connection State
  const [myPeerId, setMyPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // Transcript State
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  // Refs
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

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
      console.log('✅ My Peer ID:', id);
      setMyPeerId(id);
      peerRef.current = peer;
    });

    peer.on('call', async (incomingCall) => {
      console.log('📞 Receiving call from:', incomingCall.peer);
      
      if (!localStream) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { echoCancellation: true, noiseSuppression: true }
          });
          setLocalStream(stream);
          setIsInMeeting(true);
          startSpeechRecognition();
          incomingCall.answer(stream);
        } catch (err) {
          console.error('Failed to get media:', err);
          return;
        }
      } else {
        incomingCall.answer(localStream);
      }
      
      incomingCall.on('stream', (stream) => {
        console.log('✅ Connected!');
        setRemoteStream(stream);
        setRemotePeerId(incomingCall.peer);
        setIsConnected(true);
        setIsConnecting(false);
        toast({ title: 'Connected!', description: 'You are now in the meeting' });
      });
      
      incomingCall.on('close', () => handleCallEnd());
      callRef.current = incomingCall;
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      if (err.type === 'peer-unavailable') {
        setIsConnecting(false);
        toast({ title: 'Connection Failed', description: 'Person not available', variant: 'destructive' });
      }
    });

    return () => {
      if (peer && !peer.destroyed) peer.destroy();
    };
  }, []);

  // Attach videos
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-join from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room !== myPeerId && !isInMeeting) {
      setRoomIdInput(room);
      toast({ title: 'Meeting Link Detected', description: 'Click "Join Meeting" to connect' });
    }
  }, [myPeerId]);

  // Start meeting
  async function startMeeting() {
    if (!peerRef.current) {
      toast({ title: 'Not Ready', description: 'Please wait...', variant: 'destructive' });
      return;
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

      if (roomIdInput && roomIdInput.trim() && roomIdInput !== myPeerId) {
        setTimeout(() => callPeer(roomIdInput.trim()), 1000);
      }

      toast({
        title: 'Meeting Started',
        description: roomIdInput ? 'Connecting...' : 'Share your link to invite others'
      });
    } catch (err) {
      console.error('Error:', err);
      setIsConnecting(false);
      toast({ title: 'Access Denied', description: 'Please allow camera and microphone', variant: 'destructive' });
    }
  }

  // Call peer
  function callPeer(peerId: string) {
    if (!peerRef.current || !localStream || peerId === myPeerId) return;

    console.log('📞 Calling:', peerId);
    setIsConnecting(true);

    const call = peerRef.current.call(peerId, localStream);
    
    const timeout = setTimeout(() => {
      setIsConnecting(false);
      toast({ title: 'Timeout', description: 'Could not connect', variant: 'destructive' });
    }, 15000);

    call.on('stream', (stream) => {
      clearTimeout(timeout);
      console.log('✅ Connected!');
      setRemoteStream(stream);
      setRemotePeerId(peerId);
      setIsConnected(true);
      setIsConnecting(false);
      toast({ title: 'Connected!', description: 'You are now in the meeting' });
    });

    call.on('close', () => {
      clearTimeout(timeout);
      handleCallEnd();
    });

    callRef.current = call;
  }

  // Handle call end
  function handleCallEnd() {
    setRemoteStream(null);
    setRemotePeerId('');
    setIsConnected(false);
    addTranscript('You', 'Other person left the meeting');
    toast({ title: 'Disconnected', description: 'Other person left' });
  }

  // Leave meeting
  function leaveMeeting() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setIsInMeeting(false);
    setIsConnected(false);
    setRemoteStream(null);
    setTranscript([]);
    setIsListening(false);
    
    toast({ title: 'Meeting Ended', description: 'You left the meeting' });
  }

  // Speech recognition
  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript;
      addTranscript('You', text);
    };

    recognition.onend = () => {
      if (isInMeeting && recognitionRef.current) {
        setTimeout(() => { try { recognition.start(); } catch (e) {} }, 100);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
    } catch (e) {}
  }

  // Add transcript
  function addTranscript(speaker: 'You' | 'Friend', text: string) {
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
      toast({ title: 'Link Copied!', description: 'Share this link with others' });
    }
  }

  function copyId() {
    navigator.clipboard.writeText(myPeerId);
    toast({ title: 'Copied!', description: 'Meeting ID copied' });
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
            <span className="font-medium">{isConnected ? '2' : '1'} Participant{isConnected ? 's' : ''}</span>
          </div>
          
          {isConnected && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
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
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 bg-muted rounded-lg overflow-hidden relative">
            {remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {isConnecting ? 'Connecting...' : 'Waiting for others'}
                  </p>
                  {myPeerId && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Meeting ID: <code className="bg-muted px-2 py-1 rounded">{myPeerId}</code>
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white shadow-lg">
              {localStream && (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
              {!isVideoOn && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="h-8 w-8" />
                </div>
              )}
            </div>
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
              Participants ({isConnected ? '2' : '1'})
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-md">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">You</span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-md">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Friend</span>
                </div>
              )}
              {!isConnected && (
                <div className="text-xs text-muted-foreground px-3 py-2">
                  Waiting for others to join...
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
                <p>Start speaking to see transcript</p>
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
