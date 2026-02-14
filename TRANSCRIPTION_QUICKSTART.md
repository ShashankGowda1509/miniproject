# 🎤 Quick Start: Live Transcription

Get transcription running in 5 minutes!

## 🚀 Quick Local Setup

### 1. Install Python Dependencies
```bash
cd transcription-server
pip install -r requirements.txt
```

### 2. Start Whisper Server
```bash
python whisper_server.py
```
Should see: `✅ Whisper model loaded successfully`

### 3. Install Node Dependencies
```bash
cd ../livekit-meeting
npm install
```

### 4. Start Transcription Bridge
```bash
npm run transcription
```
Should see: `🚀 Transcription Bridge running on http://localhost:3002`

### 5. Start Your Existing App
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev
```

### 6. Test It!
1. Open http://localhost:3000
2. Join a room
3. Start speaking
4. See transcripts appear on the right panel!

---

## ⚙️ Environment Variables

Create `livekit-meeting/.env.local`:
```env
NEXT_PUBLIC_TRANSCRIPTION_SERVER_URL=http://localhost:3002
```

Create `livekit-meeting/backend/.env`:
```env
WHISPER_SERVER_URL=ws://localhost:8765
FRONTEND_URL=http://localhost:3000
```

---

## 🐛 Quick Troubleshooting

**No transcripts appearing?**
- Check browser console for errors
- Verify all 3 servers are running
- Check microphone permissions

**Whisper server error?**
- First run downloads model (~1GB) - takes 2-3 minutes
- Check you have Python 3.11+
- Run: `pip install --upgrade faster-whisper`

**High CPU usage?**
- This is normal - Whisper is CPU-intensive
- For production, use cloud hosting

---

## 📝 How It Works

```
Your Microphone
    ↓
LiveKit captures audio
    ↓
Sends to Transcription Bridge (Node.js)
    ↓
Forwards to Whisper Server (Python)
    ↓
Transcribes with faster-whisper
    ↓
Sends back to Bridge
    ↓
Broadcasts to all users via Socket.IO
    ↓
Displays in Transcript Panel
```

---

## 🎯 Next: Deploy to Production

See [TRANSCRIPTION_DEPLOYMENT.md](./TRANSCRIPTION_DEPLOYMENT.md) for full deployment guide.

**Quick Deploy:**
1. Deploy Whisper server to Render (Free tier works!)
2. Update environment variables
3. Done! 🎉
