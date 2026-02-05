# Live Transcript Module

Real-time speech-to-text transcription module for live meetings with high accuracy using streaming STT services.

## 🏗️ Architecture

### System Flow

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client    │◄────────────────────────────│   Server    │
│  (Browser)  │         Audio Stream        │  (Node.js)  │
└──────┬──────┘                             └──────┬──────┘
       │                                           │
       │ 1. Capture microphone                     │ 3. Forward to
       │ 2. Convert to 16kHz PCM                   │    STT Provider
       │ 3. Stream via WebSocket                   │
       │                                           │
       │         ┌─────────────────────────────────▼────┐
       │         │       Deepgram Streaming API         │
       │         │   - Model: nova-2                    │
       │         │   - interim_results: true            │
       │         │   - smart_format: true               │
       └─────────┤   - punctuate: true                  │
                 │   - diarization: optional            │
                 └────────────────────────────────┬─────┘
                                                  │
                          4. Receive transcripts  │
                          5. Send to client       │
                                                  │
                     { text, isFinal, metadata }  │
                                                  ▼
```

### Component Overview

#### Client-Side (`/client`)

- **audioCapture.ts**: Captures microphone audio, converts to 16kHz mono PCM
- **useLiveTranscript.ts**: React hook managing WebSocket connection and transcription state
- **TranscriptPanel.tsx**: UI component displaying live transcripts with controls

#### Server-Side (`/server`)

- **transcriptSocket.ts**: WebSocket server handling client connections
- **audioProcessor.ts**: Audio format validation and processing utilities
- **sttProvider.ts**: Abstract STT provider interface for extensibility

#### Providers (`/providers`)

- **deepgram.ts**: Deepgram streaming STT implementation

## 🚀 Quick Start

### 1. Installation

```bash
cd live-transcript
npm install
```

### 2. Environment Setup

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Deepgram API key:

```env
DEEPGRAM_API_KEY=your_api_key_here
```

**Get a Deepgram API key**: [https://console.deepgram.com/signup](https://console.deepgram.com/signup)

### 3. Build

```bash
npm run build
```

### 4. Start Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

## 📦 Integration with Existing Projects

### Server Integration

Add to your existing Node.js server:

```typescript
import express from 'express';
import { createServer } from 'http';
import { TranscriptSocketServer } from './live-transcript/server/transcriptSocket';

const app = express();
const server = createServer(app);

// Initialize transcript WebSocket server
const transcriptServer = new TranscriptSocketServer(server, '/transcript');

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### React Client Integration

```tsx
import { useLiveTranscript } from './live-transcript/client/useLiveTranscript';
import { TranscriptPanel } from './live-transcript/client/TranscriptPanel';

function MeetingRoom({ roomId }: { roomId: string }) {
  const transcript = useLiveTranscript({
    roomId,
    serverUrl: 'ws://localhost:3001',
    onSegment: (segment) => {
      console.log('New transcript:', segment.text);
    }
  });

  return (
    <div className="meeting-container">
      {/* Your video UI */}
      <div className="video-grid">
        {/* Video tiles */}
      </div>

      {/* Transcript Panel */}
      <TranscriptPanel
        segments={transcript.segments}
        isTranscribing={transcript.isTranscribing}
        isConnected={transcript.isConnected}
        error={transcript.error}
        onStart={transcript.start}
        onStop={transcript.stop}
        onClear={transcript.clearTranscripts}
        className="transcript-sidebar"
      />
    </div>
  );
}
```

## 🎛️ Configuration

### Client Audio Settings

```typescript
const audioCapture = new AudioCapture({
  sampleRate: 16000,    // Hz (optimal for STT)
  channelCount: 1,      // Mono
  chunkDuration: 100    // ms (latency vs bandwidth tradeoff)
});
```

### Server STT Settings

```typescript
const sttProvider = new DeepgramProvider(apiKey, {
  model: 'nova-2',           // Deepgram's latest model
  language: 'en-US',         // Language code
  interimResults: true,      // Enable partial transcripts
  punctuation: true,         // Add punctuation
  diarization: false,        // Enable speaker detection
  sampleRate: 16000          // Match client sample rate
});
```

## 🔌 API Reference

### `useLiveTranscript` Hook

```typescript
const {
  segments,           // TranscriptSegment[]
  isConnected,        // boolean
  isTranscribing,     // boolean
  error,              // string | null
  start,              // () => Promise<void>
  stop,               // () => void
  clearTranscripts,   // () => void
  getCurrentTranscript // () => string
} = useLiveTranscript({
  roomId: string,
  serverUrl?: string,
  autoStart?: boolean,
  onSegment?: (segment: TranscriptSegment) => void,
  onError?: (error: Error) => void
});
```

### TranscriptSegment Interface

```typescript
interface TranscriptSegment {
  id: string;
  text: string;
  isFinal: boolean;      // true = final, false = interim
  timestamp: number;
  speaker?: string;      // Optional speaker identification
}
```

## 🎯 Accuracy Optimization

### Audio Quality Best Practices

1. **Sample Rate**: Always use 16kHz (optimal for speech recognition)
2. **Format**: 16-bit mono PCM (reduces bandwidth, maintains quality)
3. **Chunking**: 100ms chunks balance latency and accuracy
4. **Preprocessing**: Enable browser's noise suppression and echo cancellation

### Deepgram Configuration

- **Model**: `nova-2` (latest, highest accuracy)
- **Smart Format**: Enabled (better readability)
- **Punctuation**: Enabled (proper sentence structure)
- **Interim Results**: Enabled (low latency feedback)

### Network Considerations

- Use WebSocket for bidirectional streaming (lower latency than HTTP)
- Implement reconnection logic for dropped connections
- Buffer audio during reconnection to avoid data loss

## 🔧 Advanced Features

### Speaker Diarization

Enable in configuration:

```typescript
const sttProvider = new DeepgramProvider(apiKey, {
  diarization: true
});
```

Segments will include `speaker` field:

```typescript
{
  text: "Hello everyone",
  speaker: "Speaker 1",
  isFinal: true
}
```

### Custom STT Providers

Implement the `STTProvider` interface:

```typescript
import { STTProvider, STTConfig } from './server/sttProvider';

export class CustomProvider extends STTProvider {
  async initialize(): Promise<void> {
    // Connect to your STT service
  }

  sendAudio(audioData: Buffer | ArrayBuffer): void {
    // Forward audio to service
  }

  close(): void {
    // Cleanup connection
  }
}
```

### Room-Scoped Transcripts

Transcripts are automatically scoped by `roomId`. Access room-specific connections:

```typescript
const connections = transcriptServer.getConnectionsByRoom(roomId);
transcriptServer.broadcastToRoom(roomId, { 
  type: 'announcement',
  message: 'Recording started' 
});
```

## 📊 Performance Characteristics

### Latency

- **Audio Capture**: ~100ms chunks
- **Network Transfer**: 10-50ms (local) / 50-200ms (cloud)
- **STT Processing**: 200-500ms (Deepgram nova-2)
- **Total End-to-End**: 300-700ms typical

### Bandwidth

- **16kHz mono PCM**: ~256 kbps
- **Typical Usage**: ~2 MB per minute per user
- **10-minute meeting**: ~20 MB upload per user

### Scaling

- **Concurrent Users**: Limited by server CPU/memory
- **WebSocket Connections**: 1 per active transcriber
- **STT API Limits**: Check provider's concurrent stream limits

## 🐛 Troubleshooting

### "Microphone access denied"

- Check browser permissions
- Ensure HTTPS in production (HTTP only works on localhost)
- Test with: `navigator.mediaDevices.getUserMedia({ audio: true })`

### "Connection timeout"

- Verify server is running
- Check WebSocket URL (should start with `ws://` or `wss://`)
- Inspect network tab for WebSocket connection

### "No transcripts appearing"

- Verify `DEEPGRAM_API_KEY` is set
- Check server logs for Deepgram errors
- Test API key: [https://developers.deepgram.com/docs/test-your-api-key](https://developers.deepgram.com/docs/test-your-api-key)
- Ensure audio is being sent (check browser console)

### Poor accuracy

- Check audio quality (avoid background noise)
- Verify 16kHz sample rate
- Try different Deepgram models
- Enable smart formatting and punctuation

## 📝 Notes

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Requires HTTPS for microphone access

### Production Checklist

- [ ] Use HTTPS/WSS in production
- [ ] Store API keys in environment variables
- [ ] Implement rate limiting
- [ ] Add authentication for WebSocket connections
- [ ] Monitor STT API usage and costs
- [ ] Implement error tracking (Sentry, etc.)
- [ ] Add connection retry logic
- [ ] Test with various network conditions

## 📄 License

MIT

## 🤝 Contributing

This module is designed to be extended. Contributions for additional STT providers, improved audio processing, or UI enhancements are welcome.

---

**Note**: This is an academic and demo project. Performance characteristics depend on network conditions, audio quality, and STT provider capabilities. Always test in your target environment before production deployment.
