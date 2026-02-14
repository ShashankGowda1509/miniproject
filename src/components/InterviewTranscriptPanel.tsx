/**
 * Interview Transcript Panel Component
 * For AI Interview and Resume Interview pages
 */

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface TranscriptItem {
  id: string;
  text: string;
  speaker: 'interviewer' | 'candidate';
  timestamp: Date;
}

interface InterviewTranscriptPanelProps {
  items: TranscriptItem[];
  className?: string;
}

export default function InterviewTranscriptPanel({ items, className = '' }: InterviewTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm">Transcript will appear here</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg ${
                  item.speaker === 'interviewer'
                    ? 'bg-accent/20 border-l-4 border-l-accent'
                    : 'bg-primary/10 border-l-4 border-l-primary'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {item.speaker === 'interviewer' ? '🤖 Interviewer' : '👤 You'}
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
      </CardContent>
    </Card>
  );
}
