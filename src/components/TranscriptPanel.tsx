import { cn } from '@/lib/utils';

interface TranscriptItem {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
  grammarCorrection?: string | null;
}

interface TranscriptPanelProps {
  items: TranscriptItem[];
  className?: string;
}

export default function TranscriptPanel({ items, className }: TranscriptPanelProps) {
  return (
    <div className={cn("transcript-panel", className)}>
      <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wide">
        Transcript
      </h3>
      
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Conversation will appear here...
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "transcript-item",
                item.speaker === 'user' ? 'transcript-user' : 'transcript-ai'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-xs font-medium",
                  item.speaker === 'user' ? 'text-primary' : 'text-accent'
                )}>
                  {item.speaker === 'user' ? 'You' : 'AI Interviewer'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-foreground">{item.text}</p>
              
              {item.grammarCorrection && (
                <div className="mt-2 p-2 bg-warning/10 rounded text-xs">
                  <span className="font-medium text-warning">Grammar suggestion:</span>
                  <p className="text-foreground mt-1">{item.grammarCorrection}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { TranscriptItem };
