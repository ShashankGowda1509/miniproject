import { cn } from '@/lib/utils';

interface VoiceWaveProps {
  isActive: boolean;
  className?: string;
}

export default function VoiceWave({ isActive, className }: VoiceWaveProps) {
  return (
    <div className={cn("voice-wave", className)}>
      {[...Array(5)].map((_, i) => (
        <span 
          key={i}
          className={cn(
            "transition-all duration-300",
            isActive ? "animate-pulse" : "opacity-30"
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            height: isActive ? `${8 + (i < 2 || i > 2 ? 8 : 16)}px` : '4px',
          }}
        />
      ))}
    </div>
  );
}
