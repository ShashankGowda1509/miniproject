/**
 * Transcript Panel Component
 *
 * Polished UI for live transcription with animations, status indicators,
 * export/copy actions, and smooth scrolling.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TranscriptSegment } from './useLiveTranscript';

export interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  isTranscribing: boolean;
  isConnected: boolean;
  error: string | null;
  onStart?: () => void;
  onStop?: () => void;
  onClear?: () => void;
  className?: string;
  showControls?: boolean;
  autoScroll?: boolean;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = (props) => {
  const {
    segments,
    isTranscribing,
    isConnected,
    error,
    onStart,
    onStop,
    onClear,
    className = '',
    showControls = true,
    autoScroll = true,
  } = props;

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const finalSegments = segments.filter((s) => s.isFinal);
  const interimSegments = segments.filter((s) => !s.isFinal);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (autoScroll && !userScrolled && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments, autoScroll, userScrolled]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setUserScrolled(!isAtBottom);
  };

  const handleExport = () => {
    const text = segments
      .filter((s) => s.isFinal)
      .map((s) => {
        const timestamp = new Date(s.timestamp).toLocaleTimeString();
        const speaker = s.speaker ? `[${s.speaker}] ` : '';
        return `[${timestamp}] ${speaker}${s.text}`;
      })
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const text = segments
      .filter((s) => s.isFinal)
      .map((s) => s.text)
      .join(' ');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className={`relative flex flex-col h-full min-h-0 overflow-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white ${className}`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Live Transcript
              </h2>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                isConnected
                  ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                  : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            {finalSegments.length > 0 && (
              <div className="px-2 py-1 bg-gray-700/50 rounded-full text-xs text-gray-400">
                {finalSegments.length} {finalSegments.length === 1 ? 'segment' : 'segments'}
              </div>
            )}
          </div>

          {showControls && (
            <div className="flex items-center gap-2">
              {!isTranscribing ? (
                <button
                  onClick={onStart}
                  className="group px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-green-900/50 hover:shadow-green-900/70 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
                  disabled={false}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Start
                </button>
              ) : (
                <button
                  onClick={onStop}
                  className="group px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-red-900/50 hover:shadow-red-900/70 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Stop
                </button>
              )}

              <button
                onClick={handleCopy}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group relative"
                disabled={finalSegments.length === 0}
                title="Copy to clipboard"
              >
                <svg
                  className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>

              <button
                onClick={handleExport}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group"
                disabled={finalSegments.length === 0}
                title="Export as text file"
              >
                <svg
                  className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>

              <button
                onClick={onClear}
                className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group"
                disabled={segments.length === 0}
                title="Clear all transcripts"
              >
                <svg
                  className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Copied Notification */}
      {copiedNotification && (
        <div className="absolute top-20 right-4 z-50 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg animate-slide-down flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">Copied to clipboard!</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="m-4 p-4 bg-gradient-to-r from-red-900/40 to-red-800/40 border border-red-700/50 rounded-lg text-red-200 text-sm backdrop-blur-sm animate-slide-down">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold mb-1">Connection Error</p>
              <p className="text-red-300/90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Display */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {segments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl animate-pulse" />
                <svg
                  className="w-16 h-16 mx-auto text-gray-600 relative z-10"
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
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                {isTranscribing ? 'Listening...' : 'Ready to Transcribe'}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {isTranscribing
                  ? 'Start speaking and your words will appear here in real-time'
                  : 'Click the Start button above to begin capturing live transcription'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {finalSegments.map((segment, index) => (
              <div
                key={segment.id}
                className="group relative animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg p-4 border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/10 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    {segment.speaker && (
                      <div className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-md text-xs font-semibold text-blue-400">
                        {segment.speaker}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white leading-relaxed text-[15px] mb-2">{segment.text}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{formatTimestamp(segment.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {interimSegments.map((segment) => (
              <div key={segment.id} className="animate-pulse-subtle">
                <div className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-lg p-4 border border-gray-700/30 border-dashed">
                  <div className="flex items-start gap-3">
                    {segment.speaker && (
                      <div className="flex-shrink-0 px-2 py-1 bg-blue-600/10 border border-blue-500/20 rounded-md text-xs font-semibold text-blue-400/70">
                        {segment.speaker}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-gray-400 leading-relaxed text-[15px] italic flex items-center gap-2">
                        <span className="inline-flex gap-1">
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </span>
                        {segment.text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div ref={transcriptEndRef} />
          </>
        )}
      </div>

      {userScrolled && (
        <button
          onClick={() => {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setUserScrolled(false);
          }}
          className="absolute bottom-24 right-6 p-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-full shadow-2xl shadow-blue-900/50 transition-all duration-300 hover:scale-110 z-50 group animate-bounce-slow"
        >
          <svg
            className="w-5 h-5 text-white group-hover:animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}

      {isTranscribing && (
        <div className="relative bg-gradient-to-r from-green-900/40 via-emerald-900/40 to-green-900/40 border-t border-green-700/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/10 to-green-500/5 animate-pulse" />
          <div className="relative p-3 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-1 bg-green-400 rounded-full animate-audio-wave" style={{ height: '8px', animationDelay: '0ms' }} />
              <span className="w-1 bg-green-400 rounded-full animate-audio-wave" style={{ height: '12px', animationDelay: '100ms' }} />
              <span className="w-1 bg-green-400 rounded-full animate-audio-wave" style={{ height: '16px', animationDelay: '200ms' }} />
              <span className="w-1 bg-green-400 rounded-full animate-audio-wave" style={{ height: '12px', animationDelay: '300ms' }} />
              <span className="w-1 bg-green-400 rounded-full animate-audio-wave" style={{ height: '8px', animationDelay: '400ms' }} />
            </div>
            <span className="text-sm font-medium bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
              Transcribing Live
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #4b5563, #374151);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #6b7280, #4b5563);
        }

        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.3s ease-out forwards;
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        @keyframes audio-wave {
          0%, 100% { height: 8px; }
          50% { height: 20px; }
        }
        .animate-audio-wave {
          animation: audio-wave 1s ease-in-out infinite;
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
