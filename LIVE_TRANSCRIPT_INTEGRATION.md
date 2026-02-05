# Live Transcription Integration Guide

## ✅ Integration Complete

The `live-transcript` module has been successfully integrated into your `livekit-meeting` project!

## 🎯 What Was Added

### 1. **Backend Integration** (`livekit-meeting/backend/server.ts`)
   - WebSocket server for real-time transcription
   - Endpoint: `ws://localhost:3001/transcript`
   - Deepgram API integration for speech-to-text

### 2. **Frontend Integration** (`livekit-meeting/src/app/room/[roomName]/page.tsx`)
   - TranscriptPanel displayed alongside video tiles
   - 384px width sidebar on the right
   - Real-time transcript display

### 3. **New Component** (`livekit-meeting/src/components/LiveTranscript.tsx`)
   - Wrapper component for easy integration
   - Auto-connects to room-scoped transcription

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
cd livekit-meeting
npm install
```

### Step 2: Configure Environment Variables

Update your `.env` file (copy from `.env.example`):

```env
# Existing LiveKit config
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880

# Backend
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# NEW: Add Deepgram API key
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# NEW: WebSocket URL for transcription
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

**Get Deepgram API Key**: https://console.deepgram.com/signup

### Step 3: Build the Live Transcript Module

```bash
cd ../live-transcript
npm run build
```

### Step 4: Start the Backend Server

```bash
cd ../livekit-meeting
npm run server
```

You should see:
```
🚀 Backend server running on http://localhost:3001
📡 Token endpoint: http://localhost:3001/api/token
📝 Transcript WebSocket: ws://localhost:3001/transcript
🎙️  Deepgram API Key configured
```

### Step 5: Start the Frontend

In a new terminal:

```bash
cd livekit-meeting
npm run dev
```

### Step 6: Start LiveKit Server (if self-hosting)

In another terminal:

```bash
livekit-server --dev
```

## 🎥 How to Use

1. **Open your browser** to `http://localhost:3000`
2. **Enter a room name and your name**
3. **Join the meeting** - you'll see:
   - Video tiles on the left (main area)
   - Transcript panel on the right (sidebar)
4. **Click "Start"** in the transcript panel to begin transcription
5. **Start speaking** - watch the real-time transcription appear!

## 📐 UI Layout

```
┌─────────────────────────────────────┬──────────────┐
│                                     │              │
│         Video Conference            │   Live       │
│         (Video Tiles)               │   Transcript │
│                                     │   Panel      │
│         - Camera feeds              │              │
│         - Screen shares             │   - Start/   │
│         - Controls                  │     Stop     │
│                                     │   - Copy     │
│  [Leave Room]                       │   - Export   │
│                                     │   - Clear    │
│                                     │              │
│                                     │   [Segments] │
│                                     │              │
└─────────────────────────────────────┴──────────────┘
        Main Area (flex-1)              Sidebar (384px)
```

## 🎨 Features Available

### Transcript Panel Features:
- ✅ **Real-time transcription** with interim results
- ✅ **Start/Stop controls** for on-demand transcription
- ✅ **Copy to clipboard** for quick sharing
- ✅ **Export as .txt file** with timestamps
- ✅ **Clear transcripts** to start fresh
- ✅ **Auto-scroll** with manual override
- ✅ **Connection status indicator**
- ✅ **Error handling** with user-friendly messages
- ✅ **Speaker labels** (if diarization enabled)

### Technical Features:
- ✅ **16kHz mono PCM audio** for optimal accuracy
- ✅ **WebSocket streaming** for low latency
- ✅ **Room-scoped transcripts** - each room has its own transcript
- ✅ **Automatic reconnection** on connection loss
- ✅ **Deepgram nova-2 model** for high accuracy

## 🔧 Customization Options

### Adjust Transcript Panel Width

In `page.tsx`, change the width class:

```tsx
{/* Change w-96 to w-80, w-[500px], etc. */}
<div className="w-96 border-l border-gray-700 bg-gray-900">
  <LiveTranscript />
</div>
```

### Hide Transcript Panel

Remove or comment out the transcript panel div:

```tsx
{/* <div className="w-96 border-l border-gray-700 bg-gray-900">
  <LiveTranscript roomName={decodeURIComponent(roomName)} />
</div> */}
```

### Enable Speaker Diarization

Update `live-transcript/providers/deepgram.ts` options:

```typescript
const options = {
  model: 'nova-2',
  language: 'en-US',
  diarize: true,  // Change to true
  // ... other options
};
```

### Auto-start Transcription

In `LiveTranscript.tsx`:

```typescript
const transcript = useLiveTranscript({
  roomId: roomName,
  serverUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  autoStart: true,  // Change to true
});
```

## 📂 File Structure

```
miniproject/
├── live-transcript/              # Standalone transcription module
│   ├── client/                   # React components & hooks
│   ├── server/                   # WebSocket server
│   ├── providers/                # STT provider (Deepgram)
│   └── dist/                     # Built files
│
└── livekit-meeting/              # Main meeting app
    ├── backend/
    │   └── server.ts             # ✨ Updated with transcript server
    ├── src/
    │   ├── components/
    │   │   └── LiveTranscript.tsx # ✨ New integration component
    │   └── app/
    │       └── room/[roomName]/
    │           └── page.tsx       # ✨ Updated with transcript panel
    └── .env                       # ✨ Add DEEPGRAM_API_KEY
```

## 🐛 Troubleshooting

### No transcripts appearing

1. **Check Deepgram API key**: Verify it's set in `.env`
2. **Check microphone**: Allow browser microphone access
3. **Check backend logs**: Should show "Deepgram API Key configured"
4. **Check browser console**: Look for WebSocket connection errors

### "Connection timeout" error

1. **Verify backend is running**: `npm run server` in livekit-meeting
2. **Check WebSocket URL**: Should be `ws://localhost:3001/transcript`
3. **Check firewall**: Ensure port 3001 is open

### Poor transcription accuracy

1. **Check audio quality**: Reduce background noise
2. **Speak clearly**: Enunciate and avoid mumbling
3. **Check sample rate**: Should be 16kHz (automatic)
4. **Try different model**: Change from nova-2 to nova in Deepgram config

### Build errors

1. **Rebuild live-transcript**: `cd live-transcript && npm run build`
2. **Install dependencies**: `cd livekit-meeting && npm install`
3. **Check TypeScript version**: Should be ^5.x

## 🚀 Production Deployment

When deploying to production:

1. **Update environment variables**:
   ```env
   NEXT_PUBLIC_WS_URL=wss://your-domain.com
   DEEPGRAM_API_KEY=your_production_key
   ```

2. **Use HTTPS/WSS**: Always use secure WebSocket (wss://) in production

3. **Add authentication**: Protect transcript WebSocket with room tokens

4. **Monitor API usage**: Track Deepgram API costs and usage

5. **Enable compression**: Use WebSocket compression for bandwidth savings

## 📚 Additional Resources

- **Deepgram Docs**: https://developers.deepgram.com/docs
- **LiveKit Docs**: https://docs.livekit.io/
- **live-transcript README**: `../live-transcript/README.md`

## 🎉 Success!

Your LiveKit meeting now has real-time speech-to-text transcription! Test it by joining a room and clicking "Start" in the transcript panel.

---

**Questions or issues?** Check the README files or console logs for detailed error messages.
