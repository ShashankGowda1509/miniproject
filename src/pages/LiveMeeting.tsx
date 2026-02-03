import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import Peer from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { toast } from '@/hooks/use-toast';
import io, { Socket } from 'socket.io-client';

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';

interface TranscriptItem {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
}

interface Participant {
  socketId: string;
  peerId: string;
  name: string;
  stream?: MediaStream;
  call?: MediaConnection;
}

export default function LiveMeeting() {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [userName, setUserName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [myPeerId, setMyPeerId] = useState('');
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const myPeerIdRef = useRef('');
  const mySocketIdRef = useRef('');
  const participantsRef = useRef<Map<string, Participant>>(new Map());

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    myPeerIdRef.current = myPeerId;
  }, [myPeerId]);

  useEffect(() => {
    console.log('🔧 Initializing Socket.IO and PeerJS...');
    
    const socket = io(SIGNALING_SERVER);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      mySocketIdRef.current = socket.id!;
    });

    socket.on('room-created', ({ roomId }) => {
      setRoomId(roomId);
      console.log('✅ Room created:', roomId);
    });

    socket.on('existing-participants', (existingParticipants: Participant[]) => {
      console.log('📋 Existing participants:', existingParticipants);
      existingParticipants.forEach(participant => {
        callParticipant(participant);
      });
    });

    socket.on('participant-joined', (participant: Participant) => {
      console.log('👤 New participant joined:', participant);
      addTranscript('System', `${participant.name} joined the meeting`);
      toast({ 
        title: 'Participant Joined', 
        description: `${participant.name} joined the meeting` 
      });
    });

    socket.on('participant-left', ({ socketId, name }) => {
      console.log('👋 Participant left:', name);
      removeParticipant(socketId);
      addTranscript('System', `${name} left the meeting`);
      toast({ 
        title: 'Participant Left', 
        description: `${name} left the meeting` 
      });
    });

    socket.on('room-not-found', () => {
      toast({ 
        title: 'Room Not Found', 
        description: 'The meeting room does not exist', 
        variant: 'destructive' 
      });
      setIsConnecting(false);
    });

    socket.on('room-full', ({ maxParticipants }) => {
      toast({ 
        title: 'Room Full', 
        description: `Maximum ${maxParticipants} participants allowed`, 
        variant: 'destructive' 
      });
      setIsConnecting(false);
    });

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('open', (id) => {
      console.log('✅ My Peer ID:', id);
      setMyPeerId(id);
      myPeerIdRef.current = id;
      peerRef.current = peer;
    });

    peer.on('call', async (incomingCall) => {
      console.log('📞 Receiving call from:', incomingCall.peer);
      
      if (incomingCall.peer === myPeerIdRef.current) {
        console.log('❌ Ignoring call from self');
        return;
      }

      const stream = localStreamRef.current;
      if (!stream) {
        console.error('❌ No local stream available');
        return;
      }
      
      incomingCall.answer(stream);
      
      incomingCall.on('stream', (remoteStream) => {
        console.log('✅ Stream received from:', incomingCall.peer);
        updateParticipantStream(incomingCall.peer, remoteStream, incomingCall);
      });
      
      incomingCall.on('close', () => {
        console.log('📴 Call closed from:', incomingCall.peer);
      });

      incomingCall.on('error', (err) => {
        console.error('❌ Call error:', err);
      });
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      setIsConnecting(false);
    });

    return () => {
      socket.disconnect();
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localStream]);

  function callParticipant(participant: Participant) {
    const stream = localStreamRef.current;
    const peer = peerRef.current;

    if (!peer || !stream) {
      console.error('❌ Cannot call: missing peer or stream');
      return;
    }

    console.log('📞 Calling:', participant.name, participant.peerId);

    const call = peer.call(participant.peerId, stream, {
      metadata: { name: userName, socketId: mySocketIdRef.current }
    });

    if (!call) {
      console.error('❌ Failed to initiate call');
      return;
    }

    call.on('stream', (remoteStream) => {
      console.log('✅ Stream received from:', participant.name);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(participant.socketId, {
          ...participant,
          stream: remoteStream,
          call
        });
        return newMap;
      });
    });

    call.on('close', () => {
      removeParticipant(participant.socketId);
    });

    call.on('error', (err) => {
      console.error('❌ Call error:', err);
    });

    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.set(participant.socketId, {
        ...participant,
        call
      });
      return newMap;
    });
  }

  function updateParticipantStream(peerId: string, stream: MediaStream, call: MediaConnection) {
    setParticipants(prev => {
      const newMap = new Map(prev);
      for (const [key, value] of newMap.entries()) {
        if (value.peerId === peerId) {
          newMap.set(key, { ...value, stream, call });
          break;
        }
      }
      return newMap;
    });
  }

  function removeParticipant(socketId: string) {
    setParticipants(prev => {
      const newMap = new Map(prev);
      const participant = newMap.get(socketId);
      if (participant?.call) {
        participant.call.close();
      }
      newMap.delete(socketId);
      return newMap;
    });
  }

  async function startMeeting() {
    if (!peerRef.current || !socketRef.current) {
      toast({ title: 'Not Ready', description: 'Please wait...', variant: 'destructive' });
      return;
    }

    if (!userName.trim()) {
      toast({ title: 'Name Required', description: 'Please enter your name', variant: 'destructive' });
      return;
    }

    setIsConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsInMeeting(true);
      setIsConnecting(false);
      startSpeechRecognition();

      if (roomIdInput.trim()) {
        setIsHost(false);
        setRoomId(roomIdInput.trim());
        socketRef.current.emit('join-room', {
          roomId: roomIdInput.trim(),
          name: userName,
          peerId: myPeerId
        });
        addTranscript('You', 'Joined the meeting');
      } else {
        setIsHost(true);
        const newRoomId = generateRoomId();
        setRoomId(newRoomId);
        socketRef.current.emit('create-room', {
          roomId: newRoomId,
          name: userName,
          peerId: myPeerId
        });
        addTranscript('You', 'Meeting started');
        toast({ title: 'Meeting Started', description: 'Share your link to invite others' });
      }
    } catch (err) {
      console.error('Error:', err);
      setIsConnecting(false);
      toast({ title: 'Access Denied', description: 'Please allow camera and microphone', variant: 'destructive' });
    }
  }

  function generateRoomId() {
    return `room-${Math.random().toString(36).substring(2, 12)}`;
  }

  function leaveMeeting() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    
    participants.forEach((participant) => {
      try {
        participant.call?.close();
      } catch (e) {}
    });
    setParticipants(new Map());
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (socketRef.current && roomId) {
      socketRef.current.emit('leave-room', { roomId });
    }
    
    setIsInMeeting(false);
    setTranscript([]);
    setIsListening(false);
    setRoomIdInput('');
    setRoomId('');
    
    toast({ title: 'Meeting Ended', description: 'You left the meeting' });
  }

  function startSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript;
      addTranscript('You', text);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error('Speech error:', event.error);
      }
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

  function addTranscript(speaker: string, text: string) {
    setTranscript(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      speaker,
      text,
      timestamp: new Date()
    }]);
  }

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

  function shareLink() {
    const link = `${window.location.origin}/live-meeting?room=${roomId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link Copied!', description: 'Share this link with others' });
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId);
    toast({ title: 'Copied!', description: 'Meeting ID copied' });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && !isInMeeting && myPeerId) {
      setRoomIdInput(room);
      toast({ title: 'Meeting Link Detected', description: 'Enter your name and join' });
    }
  }, [myPeerId, isInMeeting]);

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
              <p className="text-muted-foreground mt-2">Video call with live transcription</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">Your Name *</p>
                <Input
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Meeting ID (Optional)</p>
                <Input
                  placeholder="Enter meeting ID to join (leave empty for new)"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                />
              </div>

              <Button
                className="w-full h-12"
                onClick={startMeeting}
                disabled={isConnecting || !myPeerId || !userName.trim()}
              >
                {isConnecting ? 'Starting...' : roomIdInput ? 'Join Meeting' : 'Start New Meeting'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>✓ HD Video & Audio • ✓ Live Transcription • ✓ Up to 10 Participants</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const participantCount = participants.size + 1;
  const participantsArray = Array.from(participants.values());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Video className="h-5 w-5 text-primary" />
          <span className="font-semibold">Live Meeting</span>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span>{participantCount} / 10</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-600">Live</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-muted px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="text-xs">Room:</span>
            <code className="text-xs font-mono">{roomId.substring(0, 12)}...</code>
            <Button size="sm" variant="ghost" onClick={copyRoomId} className="h-6 w-6 p-0">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={shareLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 grid gap-4" style={{
            gridTemplateColumns: participantsArray.length <= 1 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gridTemplateRows: participantsArray.length <= 3 ? '1fr' : 'repeat(2, 1fr)'
          }}>
            <div className="bg-muted rounded-lg overflow-hidden relative">
              {localStream && (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
              {!isVideoOn && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1 rounded-full">
                <span className="text-white text-sm">{userName} (You)</span>
              </div>
              {!isAudioOn && (
                <div className="absolute top-3 right-3 bg-red-500 p-2 rounded-full">
                  <MicOff className="h-4 w-4 text-white" />
                </div>
              )}
              {isHost && (
                <div className="absolute top-3 left-3 bg-primary px-2 py-1 rounded-md">
                  <span className="text-white text-xs">Host</span>
                </div>
              )}
            </div>

            {participantsArray.map((participant) => (
              <RemoteVideo key={participant.socketId} participant={participant} />
            ))}

            {participantsArray.length === 0 && (
              <div className="bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Waiting for others...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button size="lg" variant={isAudioOn ? 'default' : 'destructive'} onClick={toggleAudio} className="rounded-full h-14 w-14">
              {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button size="lg" variant={isVideoOn ? 'default' : 'destructive'} onClick={toggleVideo} className="rounded-full h-14 w-14">
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button size="lg" variant="destructive" onClick={leaveMeeting} className="rounded-full h-14 px-6">
              <PhoneOff className="h-5 w-5 mr-2" />
              Leave
            </Button>
          </div>
        </div>

        <div className="w-96 bg-card border rounded-lg flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({participantCount})
            </h3>
            <div className="space-y-2 mt-3 max-h-40 overflow-y-auto">
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-md">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">{userName} (You{isHost ? ' - Host' : ''})</span>
              </div>
              {participantsArray.map((p) => (
                <div key={p.socketId} className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-md">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm">{p.name}</span>
                </div>
              ))}
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
              </div>
            ) : (
              transcript.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">{item.speaker}</span>
                    <span className="text-xs text-muted-foreground">{item.timestamp.toLocaleTimeString()}</span>
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

function RemoteVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(console.error);
    }
  }, [participant.stream]);

  return (
    <div className="bg-muted rounded-lg overflow-hidden relative">
      {participant.stream ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Users className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1 rounded-full">
        <span className="text-white text-sm">{participant.name}</span>
      </div>
    </div>
  );
}