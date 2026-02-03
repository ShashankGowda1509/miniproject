'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [participantName, setParticipantName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');

  const handleJoinRoom = (isCreating: boolean) => {
    setError('');

    // Validate inputs
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    // Sanitize room name (remove spaces, special chars)
    const sanitizedRoomName = roomName.trim().replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    
    // Navigate to room with participant name in URL query
    router.push(`/room/${sanitizedRoomName}?name=${encodeURIComponent(participantName.trim())}`);
  };

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
            <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && participantName && roomName) {
                  handleJoinRoom(false);
                }
              }}
            />
          </div>

          {/* Room Name Input */}
          <div>
            <label htmlFor="room" className="block text-sm font-medium text-gray-200 mb-2">
              Room Name
            </label>
            <input
              id="room"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && participantName && roomName) {
                  handleJoinRoom(false);
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
              onClick={() => handleJoinRoom(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Join Room
            </button>
            <button
              onClick={() => handleJoinRoom(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Create Room
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
