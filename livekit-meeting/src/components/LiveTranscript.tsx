/**
 * Live Transcript Integration for LiveKit Meeting
 * 
 * This component wraps the transcript functionality from the live-transcript module
 * and integrates it seamlessly with the LiveKit meeting room.
 */

'use client';

import { useLiveTranscript } from '../../../live-transcript/client/useLiveTranscript';
import { TranscriptPanel } from '../../../live-transcript/client/TranscriptPanel';

interface LiveTranscriptProps {
  roomName: string;
  className?: string;
}

export function LiveTranscript({ roomName, className }: LiveTranscriptProps) {
  const transcript = useLiveTranscript({
    roomId: roomName,
    serverUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoStart: false, // User must click Start button
    onSegment: (segment) => {
      console.log('New transcript segment:', segment.text);
    },
    onError: (error) => {
      console.error('Transcription error:', error);
    }
  });

  return (
    <TranscriptPanel
      segments={transcript.segments}
      isTranscribing={transcript.isTranscribing}
      isConnected={transcript.isConnected}
      error={transcript.error}
      onStart={transcript.start}
      onStop={transcript.stop}
      onClear={transcript.clearTranscripts}
      className={className}
      showControls={true}
      autoScroll={true}
    />
  );
}
