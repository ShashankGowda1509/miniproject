import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles/index.css';
import { Room } from 'livekit-client';
import { useTranscription } from '@/hooks/useTranscription';
import { TranscriptPanel } from '@/components/TranscriptPanel';

export default function LiveMeeting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get room and name from URL params
  const roomFromUrl = searchParams.get('room');
  const nameFromUrl = searchParams.get('name');
  
  const [roomName, setRoomName] = useState(roomFromUrl || '');
  const [userName, setUserName] = useState(nameFromUrl || '');
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // If both room and name are in URL, auto-join
    if (roomFromUrl && nameFromUrl) {
      handleJoinRoom(null);
    }
  }, [roomFromUrl, nameFromUrl]);

  const handleJoinRoom = async (e: React.FormEvent | null) => {
    if (e) e.preventDefault();
    
    if (!userName.trim() || !roomName.trim()) {
      setError('Please enter both name and room name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Call backend to get LiveKit token
      const response = await fetch('http://localhost:3001/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName.trim(),
          participantName: userName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get access token');
      }

      const data = await response.json();
      setToken(data.token);
      setIsJoined(true);
      setError('');
    } catch (err: any) {
      console.error('Error joining room:', err);
      setError(err.message || 'Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    setIsJoined(false);
    setToken('');
    setError('');
    navigate('/live-meeting');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleError = (error: Error) => {
    console.error('LiveKit error:', error);
    
    if (error.message.includes('Permission') || error.message.includes('NotAllowedError')) {
      setError('Camera/microphone permission denied. Please allow access and refresh the page.');
    } else if (error.message.includes('NotFoundError')) {
      setError('No camera or microphone found. Please connect a device and refresh.');
    } else {
      setError(`Connection error: ${error.message}`);
    }
  };

  // Show join screen if not joined
  if (!isJoined || !token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">LiveKit Meeting</h1>
            <p className="text-gray-300">Join or create a video meeting room</p>
          </div>

          <div className="space-y-6">
            {/* Participant Name Input */}
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-200 mb-2">
                Your Name
              </label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && userName && roomName) {
                    handleJoinRoom(null);
                  }
                }}
              />
            </div>

            {/* Room Name Input */}
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-200 mb-2">
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && userName && roomName) {
                    handleJoinRoom(null);
                  }
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleJoinRoom(null)}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Joining...
                  </span>
                ) : (
                  'Join Room'
                )}
              </button>
              <button
                onClick={() => handleJoinRoom(null)}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            <div className="text-center text-sm text-gray-400 mt-6">
              <p>Powered by LiveKit SFU</p>
              <p className="mt-1">Supports 5-10 participants</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show LiveKit meeting room
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://miniproject-r3p8k1py.livekit.cloud';

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden z-10">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        onDisconnected={handleLeaveRoom}
        onError={handleError}
        style={{ height: '100%', width: '100%', overflow: 'hidden' }}
        data-lk-theme="default"
      >
        <RoomWithTranscript onDisconnect={handleLeaveRoom} />
      </LiveKitRoom>
    </div>
  );
}

// Inner component that has access to room context
function RoomWithTranscript({ onDisconnect }: { onDisconnect: () => void }) {
  const room = useRoomContext();
  const [showTranscript, setShowTranscript] = useState(true);

  // Check for Web Speech API support
  const speechRecognitionSupported = 
    !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  // Use transcription hook (now uses Web Speech API)
  const { transcripts, isTranscribing, error, startTranscription, stopTranscription } = useTranscription({
    room,
    enabled: true
  });

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main video conference area */}
      <div className="flex-1 h-full overflow-hidden">
        <div className="h-full w-full overflow-hidden">
          <VideoConference />
        </div>
        <RoomAudioRenderer />
        
        {/* Browser Compatibility Notice */}
        {!speechRecognitionSupported && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 bg-yellow-500/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-yellow-600">
            <p className="text-sm text-black font-medium">
              ⚠️ Live transcription requires Chrome or Edge browser
            </p>
          </div>
        )}
        
        {/* Top Control Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent p-4">
          <div className="flex items-center justify-between">
            {/* Left side - Leave Button */}
            <button
              onClick={onDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-full shadow-lg transition-all flex items-center gap-2 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Leave
            </button>

            {/* Center - Room Info */}
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">Live Meeting</span>
            </div>

            {/* Right side - Transcript Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`${
                showTranscript ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              } text-white font-semibold py-2.5 px-5 rounded-full shadow-lg transition-all flex items-center gap-2 hover:scale-105`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Transcript
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Transcript Sidebar */}
      <div
        className={`${
          showTranscript ? 'w-96' : 'w-0'
        } transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 border-l border-gray-800 h-full`}
      >
        {showTranscript && (
          <div className="w-96 h-full overflow-hidden">
            <TranscriptPanel
              transcripts={transcripts}
              isTranscribing={isTranscribing}
              error={error}
              onStartTranscription={startTranscription}
              onStopTranscription={stopTranscription}
            />
          </div>
        )}
      </div>

      {/* Floating Toggle Button (for when sidebar is closed) */}
      {!showTranscript && (
        <button
          onClick={() => setShowTranscript(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-l-xl shadow-2xl transition-all hover:scale-110 animate-pulse"
          title="Show Transcript"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}