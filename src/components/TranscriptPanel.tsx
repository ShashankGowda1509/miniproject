/**
 * Live Transcript Panel Component
 * Displays real-time transcriptions with speaker names and auto-scroll
 */

'use client';

import { useEffect, useRef } from 'react';
import { Transcript } from '../hooks/useTranscription';

interface TranscriptPanelProps {
  transcripts: Transcript[];
  isTranscribing: boolean;
  error: string | null;
  className?: string;
}

export function TranscriptPanel({
  transcripts,
  isTranscribing,
  error,
  className = ''
}: TranscriptPanelProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (!isUserScrollingRef.current && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts]);

  // Detect manual scrolling
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    isUserScrollingRef.current = !isAtBottom;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get speaker color based on name (consistent colors for same speakers)
  const getSpeakerColor = (speaker: string) => {
    const colors = [
      'text-blue-400',
      'text-green-400',
      'text-purple-400',
      'text-pink-400',
      'text-yellow-400',
      'text-cyan-400',
      'text-orange-400',
      'text-indigo-400'
    ];
    
    // Simple hash function for consistent colors
    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <svg
              className="w-5 h-5 text-blue-400"
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
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Live Transcript</h3>
            <p className="text-xs text-gray-400">Real-time captions</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {isTranscribing && (
            <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Live</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-red-400 font-medium">Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Transcript List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {transcripts.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-2xl backdrop-blur-sm border border-white/10 mb-4">
              <svg
                className="w-16 h-16 text-blue-400 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-white mb-2">
              {isTranscribing ? 'Listening...' : 'Ready to Transcribe'}
            </h4>
            <p className="text-sm text-gray-400 max-w-xs">
              {isTranscribing
                ? 'Start speaking and your words will appear here in real-time'
                : 'Enable your microphone to see live transcriptions'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400">Transcription Error</p>
              <p className="text-xs text-red-300 mt-1 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {transcripts.map((transcript, index) => (
          <div
            key={`${transcript.sessionId}-${index}`}
            className="group hover:bg-white/5 p-3 rounded-xl transition-all duration-200 animate-slide-up"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  {transcript.speaker.charAt(0).toUpperCase()}
                </div>
                <span className={`text-sm font-bold ${getSpeakerColor(transcript.speaker)}`}>
                  {transcript.speaker}
                </span>
              </div>
              <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                {formatTime(transcript.timestamp)}
              </span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed pl-10 group-hover:text-white transition-colors">
              {transcript.text}
            </p>
          </div>
        ))}

        <div ref={transcriptEndRef} />
      </div>

      {/* Footer with transcript count */}
      <div className="px-5 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-xs text-gray-400 font-medium">
              {transcripts.length} {transcripts.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
          {transcripts.length > 0 && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Add custom animations to your global CSS or Tailwind config
// @keyframes fade-in {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fade-in { animation: fade-in 0.3s ease-out; }
