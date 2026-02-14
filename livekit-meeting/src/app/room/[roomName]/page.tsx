'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface RoomPageProps {
  params: {
    roomName: string;
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomName } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const participantName = searchParams.get('name');

  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Validate participant name
    if (!participantName) {
      router.push('/');
      return;
    }

    // Fetch token from backend
    const fetchToken = async () => {
      try {
        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName: decodeURIComponent(roomName),
            participantName: decodeURIComponent(participantName),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get access token');
        }

        const data = await response.json();
        setToken(data.token);
        setError('');
      } catch (err) {
        console.error('Error fetching token:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect. Please check if the backend server is running.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [roomName, participantName, router]);

  const handleDisconnect = () => {
    router.push('/');
  };

  const handleError = (error: Error) => {
    console.error('LiveKit error:', error);
    
    // Check for permission errors
    if (error.message.includes('Permission') || error.message.includes('NotAllowedError')) {
      setError('Camera/microphone permission denied. Please allow access and refresh the page.');
    } else if (error.message.includes('NotFoundError')) {
      setError('No camera or microphone found. Please connect a device and refresh.');
    } else {
      setError(`Connection error: ${error.message}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white text-lg">Connecting to room...</p>
          <p className="text-gray-400 mt-2">Room: {decodeURIComponent(roomName)}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-4">Connection Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main room UI
  if (!token) {
    return null;
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  return (
    <div className="min-h-screen bg-gray-900">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        onDisconnected={handleDisconnect}
        onError={handleError}
        style={{ height: '100vh' }}
        data-lk-theme="default"
      >
        <RoomWithTranscript onDisconnect={handleDisconnect} />
      </LiveKitRoom>
    </div>
  );
}

// Inner component that has access to room context
function RoomWithTranscript({ onDisconnect }: { onDisconnect: () => void }) {
  const room = useRoomContext();
  const [showTranscript, setShowTranscript] = useState(true);

  // Use transcription hook
  const { transcripts, isTranscribing, error } = useTranscription({
    room,
    enabled: true
  });

  return (
    <div className="flex h-screen">
      {/* Main video conference area */}
      <div className="flex-1 relative">
        <VideoConference />
        <RoomAudioRenderer />
        
        {/* Custom Leave Button */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={onDisconnect}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-colors"
          >
            Leave Room
          </button>
        </div>

        {/* Toggle Transcript Button */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </button>
        </div>
      </div>

      {/* Transcript Panel */}
      {showTranscript && (
        <div className="w-96 flex-shrink-0">
          <TranscriptPanel
            transcripts={transcripts}
            isTranscribing={isTranscribing}
            error={error}
          />
        </div>
      )}
    </div>
  );
}
