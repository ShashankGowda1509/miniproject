# Live Transcript + LiveKit Meeting - Integration Demo

## 🎨 UI Layout Overview

```
┌────────────────────────────────────────────────────────────────────────┬─────────────────────────┐
│  [Leave Room]                                                          │   Live Transcript       │
│                                                                        │   [🟢 Connected]        │
│                                                                        │                         │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   [Start] [Copy] [Clear]│
│   │                 │  │                 │  │                 │     │                         │
│   │   Participant   │  │   Participant   │  │   Participant   │     │  ─────────────────────  │
│   │      Video      │  │      Video      │  │      Video      │     │                         │
│   │                 │  │                 │  │                 │     │  "Hello everyone,       │
│   │      [🎤 🎥]    │  │      [🎤 🎥]    │  │      [🎤 🎥]    │     │   welcome to the        │
│   │                 │  │                 │  │                 │     │   meeting."             │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘     │   [10:23:45 AM]         │
│                                                                        │                         │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │  "Let's discuss the     │
│   │                 │  │                 │  │                 │     │   project timeline."    │
│   │   Participant   │  │   Participant   │  │   Screen        │     │   [10:24:01 AM]         │
│   │      Video      │  │      Video      │  │      Share      │     │                         │
│   │                 │  │                 │  │                 │     │  "I think we should..."│
│   │      [🎤 🎥]    │  │      [🎤 🎥]    │  │                 │     │   (in progress)         │
│   │                 │  │                 │  │                 │     │                         │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘     │                         │
│                                                                        │                         │
│  ─────────────────────────────────────────────────────────────────   │                         │
│  [🎤] [🎥] [Share Screen] [Chat] [Participants]                      │                         │
│                                                                        │  [🟢 Transcribing...]  │
└────────────────────────────────────────────────────────────────────────┴─────────────────────────┘
     LiveKit Video Conference (Main Area - flex-1)                         Transcript Panel (384px)
```

## 📱 Responsive Behavior

### Desktop (> 1024px)
- Video area: Flexible width (takes remaining space)
- Transcript panel: Fixed 384px width on the right
- Both visible side-by-side

### Tablet (768px - 1024px)
- Video area: Full width
- Transcript panel: Collapsible overlay or hidden
- Toggle button to show/hide transcript

### Mobile (< 768px)
- Video area: Full width
- Transcript panel: Bottom sheet or separate tab
- Swipe up to view transcripts

## 🎯 Key Integration Points

### 1. Room Connection
```typescript
// Same room ID used for both video and transcript
const roomName = "meeting-123";

<LiveKitRoom roomName={roomName} ...>
  <VideoConference />
</LiveKitRoom>

<LiveTranscript roomName={roomName} />
```

### 2. WebSocket Connection
```
Client Browser → ws://localhost:3001/transcript?roomId=meeting-123
                ↓
        Backend Server (Express + WS)
                ↓
        Deepgram Streaming API
                ↓
        Real-time Transcripts ↩️ Back to Client
```

### 3. Audio Flow
```
User's Microphone
    ↓
Browser MediaDevices API (16kHz mono PCM)
    ↓
AudioCapture.ts (convert Float32 to Int16)
    ↓
WebSocket (binary data)
    ↓
Backend Server
    ↓
Deepgram STT Provider
    ↓
Transcript Results
    ↓
Back to Client UI
```

## 🎬 User Experience Flow

### Joining a Meeting with Transcription

1. **User enters room name and name**
   - Redirects to `/room/[roomName]?name=John`

2. **Backend generates tokens**
   - LiveKit token for video/audio
   - WebSocket connection for transcript

3. **UI renders**
   - Left side: Video tiles load
   - Right side: Transcript panel (stopped state)

4. **User clicks "Start" in transcript panel**
   - Requests microphone access
   - Connects to transcript WebSocket
   - Starts streaming audio

5. **Real-time transcription begins**
   - Interim results appear (gray, italic)
   - Final results replace interim (white, solid)
   - Auto-scrolls to latest

6. **During meeting**
   - Copy transcripts to clipboard
   - Export as .txt file
   - Clear to start fresh

7. **Leaving meeting**
   - Click "Leave Room"
   - Transcription auto-stops
   - WebSocket disconnects

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                 │
│  ┌──────────────────┐              ┌─────────────────────────┐│
│  │  LiveKit Room    │              │   Live Transcript       ││
│  │  - Video/Audio   │              │   - useLiveTranscript() ││
│  │  - WebRTC P2P    │              │   - AudioCapture        ││
│  └────────┬─────────┘              └───────────┬─────────────┘│
│           │                                    │               │
└───────────┼────────────────────────────────────┼───────────────┘
            │                                    │
            │ WebRTC                             │ WebSocket (audio)
            │                                    │
            ↓                                    ↓
┌───────────────────────┐         ┌──────────────────────────────┐
│  LiveKit Server       │         │  Backend Server (Express)    │
│  - SFU (port 7880)    │         │  - WebSocket Handler         │
│  - Media routing      │         │  - TranscriptSocketServer    │
└───────────────────────┘         └───────────┬──────────────────┘
                                              │
                                              │ HTTPS (streaming)
                                              │
                                              ↓
                                  ┌─────────────────────────────┐
                                  │   Deepgram API              │
                                  │   - Streaming STT           │
                                  │   - Real-time results       │
                                  └─────────────────────────────┘
```

## 🎨 Styling & Theming

The transcript panel matches the LiveKit dark theme:

```css
Background: #1a1a1a (gray-900)
Text: #ffffff (white)
Borders: #374151 (gray-700)
Accent: #3b82f6 (blue-500)
Success: #22c55e (green-500)
Error: #ef4444 (red-500)
```

## 🔧 Configuration Options

### Environment Variables
```env
# Required for video
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880

# Required for transcription
DEEPGRAM_API_KEY=...
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Backend
PORT=3001
```

### Customizable Features
- Panel width (default: 384px)
- Auto-start transcription (default: false)
- Speaker diarization (default: false)
- Language (default: en-US)
- Model selection (default: nova-2)

## 📈 Performance Metrics

### Latency Targets
- **Video**: < 200ms (LiveKit WebRTC)
- **Transcription**: 300-700ms (end-to-end)
  - Audio capture: ~100ms
  - Network: 10-200ms
  - STT processing: 200-500ms

### Bandwidth Usage
- **Video**: Varies (depends on resolution)
- **Audio (transcription)**: ~256 kbps (16kHz PCM)

### Scalability
- **Concurrent Users**: Limited by server resources
- **Room Size**: No hard limit (transcription is per-user)

## 🎯 Next Steps After Integration

1. **Test the integration**
   ```bash
   npm run server  # Start backend
   npm run dev     # Start frontend
   ```

2. **Join a test room**
   - Open http://localhost:3000
   - Create a room
   - Click "Start" in transcript panel

3. **Verify transcription works**
   - Speak clearly
   - See interim results (gray)
   - See final results (white)

4. **Customize as needed**
   - Adjust panel width
   - Enable speaker labels
   - Change language/model

5. **Deploy to production**
   - Use wss:// for WebSocket
   - Add authentication
   - Monitor API usage

---

**Integration Status**: ✅ Complete
**Documentation**: See LIVE_TRANSCRIPT_INTEGRATION.md
**Support**: Check console logs for detailed error messages
