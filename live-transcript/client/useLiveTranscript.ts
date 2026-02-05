/**
 * React Hook for Live Transcription
 * 
 * Manages WebSocket connection, audio capture, and transcription state.
 * Provides a simple interface for components to access live transcripts.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioCapture, AudioChunk } from './audioCapture';

export interface TranscriptSegment {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
  speaker?: string; // Optional speaker identification
}

export interface LiveTranscriptState {
  segments: TranscriptSegment[];
  isConnected: boolean;
  isTranscribing: boolean;
  error: string | null;
}

export interface UseLiveTranscriptOptions {
  roomId: string;
  serverUrl?: string;
  autoStart?: boolean;
  onSegment?: (segment: TranscriptSegment) => void;
  onError?: (error: Error) => void;
}

export interface UseLiveTranscriptReturn extends LiveTranscriptState {
  start: () => Promise<void>;
  stop: () => void;
  clearTranscripts: () => void;
  getCurrentTranscript: () => string;
}

/**
 * Hook for real-time speech-to-text transcription
 */
export function useLiveTranscript(options: UseLiveTranscriptOptions): UseLiveTranscriptReturn {
  const {
    roomId,
    serverUrl = window.location.origin.replace(/^http/, 'ws'),
    autoStart = false,
    onSegment,
    onError
  } = options;

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const segmentCounterRef = useRef(0);

  /**
   * Establish WebSocket connection to transcription server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${serverUrl}/transcript?roomId=${encodeURIComponent(roomId)}`;
    console.log('Connecting to transcription server:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Transcription WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'transcript') {
            const segment: TranscriptSegment = {
              id: message.id || `segment-${segmentCounterRef.current++}`,
              text: message.text,
              isFinal: message.isFinal || false,
              timestamp: message.timestamp || Date.now(),
              speaker: message.speaker
            };

            setSegments((prev: TranscriptSegment[]) => {
              // Replace interim segments, append final ones
              if (segment.isFinal) {
                // Remove any interim segments and add final
                return [...prev.filter((s: TranscriptSegment) => s.isFinal), segment];
              } else {
                // Replace last interim segment if exists
                const finalSegments = prev.filter((s: TranscriptSegment) => s.isFinal);
                return [...finalSegments, segment];
              }
            });

            if (onSegment) {
              onSegment(segment);
            }
          } else if (message.type === 'error') {
            const err = new Error(message.message || 'Transcription error');
            setError(err.message);
            if (onError) {
              onError(err);
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
        const err = new Error('WebSocket connection error');
        if (onError) {
          onError(err);
        }
      };

      ws.onclose = () => {
        console.log('Transcription WebSocket closed');
        setIsConnected(false);
        
        // Attempt reconnection if was transcribing
        if (isTranscribing) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to transcription server');
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  }, [roomId, serverUrl, isTranscribing, onSegment, onError]);

  /**
   * Send audio chunk to server
   */
  const sendAudioChunk = useCallback((chunk: AudioChunk) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send binary audio data
      wsRef.current.send(chunk.data.buffer);
    }
  }, []);

  /**
   * Start transcription
   */
  const start = useCallback(async () => {
    if (isTranscribing) {
      console.warn('Transcription already started');
      return;
    }

    try {
      setError(null);
      
      // Connect WebSocket if not connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
        
        // Wait for connection
        await new Promise<void>((resolve, reject) => {
          const checkConnection = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkConnection);
            reject(new Error('Connection timeout'));
          }, 5000);
        });
      }

      // Start audio capture
      if (!audioCaptureRef.current) {
        audioCaptureRef.current = new AudioCapture();
      }

      await audioCaptureRef.current.start(sendAudioChunk);
      setIsTranscribing(true);
      console.log('Live transcription started');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start transcription');
      console.error('Failed to start transcription:', error);
      setError(error.message);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [isTranscribing, connect, sendAudioChunk, onError]);

  /**
   * Stop transcription
   */
  const stop = useCallback(() => {
    if (!isTranscribing) return;

    // Stop audio capture
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop();
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsTranscribing(false);
    setIsConnected(false);
    console.log('Live transcription stopped');
  }, [isTranscribing]);

  /**
   * Clear all transcript segments
   */
  const clearTranscripts = useCallback(() => {
    setSegments([]);
    segmentCounterRef.current = 0;
  }, []);

  /**
   * Get concatenated transcript text
   */
  const getCurrentTranscript = useCallback((): string => {
    return segments
      .filter((s: TranscriptSegment) => s.isFinal)
      .map((s: TranscriptSegment) => s.text)
      .join(' ');
  }, [segments]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      // Cleanup on unmount
      stop();
    };
  }, []); // Only run once on mount

  return {
    segments,
    isConnected,
    isTranscribing,
    error,
    start,
    stop,
    clearTranscripts,
    getCurrentTranscript
  };
}
