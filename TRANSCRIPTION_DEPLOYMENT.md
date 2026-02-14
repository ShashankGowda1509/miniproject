# 🚀 Transcription System Deployment Guide

## Overview

This guide covers deploying the complete live transcription system with:
- **Whisper Server** (Python) - Self-hosted transcription
- **Transcription Bridge** (Node.js) - Connects LiveKit to Whisper
- **Frontend** (Next.js) - Already running with LiveKit

---

## 📋 Prerequisites

- Render account (or any hosting service)
- LiveKit server running
- Node.js 18+ and Python 3.11+

---

## 🐍 Part 1: Deploy Whisper Server on Render

### Step 1: Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Or use **"Deploy from GitHub"**

### Step 2: Configure Service

**Basic Settings:**
```
Name: whisper-transcription-server
Region: Choose closest to your users
Branch: main
Root Directory: transcription-server
```

**Build Settings:**
```
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: python whisper_server.py
```

**Instance Type:**
```
Choose: Starter ($7/month) or higher
- Starter: Good for 2-3 users
- Standard: Better for 3-4 users (recommended)
```

**Environment Variables:**
```
WHISPER_MODEL=medium
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_WORKERS=4
PORT=8765
MODEL_CACHE_DIR=/opt/render/project/src/models
```

### Step 3: Advanced Settings

**Health Check Path:** `/` (not applicable, WebSocket only)

**Auto-Deploy:** Yes

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for build (first build takes 5-10 minutes - downloads Whisper model)
3. Note your service URL: `wss://your-whisper-server.onrender.com`

---

## 🔧 Part 2: Update Backend Environment Variables

### Step 1: Update `.env` in `livekit-meeting/backend/`

Create or update `.env`:

```env
# Existing LiveKit variables
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud

# New transcription variables
TRANSCRIPTION_BRIDGE_PORT=3002
WHISPER_SERVER_URL=wss://your-whisper-server.onrender.com
FRONTEND_URL=http://localhost:3000
```

### Step 2: Update Frontend `.env`

In `livekit-meeting/.env.local`:

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TRANSCRIPTION_SERVER_URL=http://localhost:3002
```

---

## 🚀 Part 3: Run Locally (Development)

### Terminal 1: Start LiveKit Backend
```bash
cd livekit-meeting
npm install
npm run server
```

### Terminal 2: Start Transcription Bridge
```bash
cd livekit-meeting
npm run transcription
```

### Terminal 3: Start Frontend
```bash
cd livekit-meeting
npm run dev
```

### Terminal 4: Start Whisper Server (Local Testing)
```bash
cd transcription-server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python whisper_server.py
```

---

## 🌐 Part 4: Deploy to Production

### Option A: Deploy Transcription Bridge on Render

**Create another Web Service:**

```
Name: transcription-bridge
Root Directory: livekit-meeting/backend
Build Command: npm install
Start Command: npm run transcription
Environment: Node
```

**Environment Variables:**
```
WHISPER_SERVER_URL=wss://your-whisper-server.onrender.com
FRONTEND_URL=https://your-frontend-app.vercel.app
TRANSCRIPTION_BRIDGE_PORT=3002
```

### Option B: Combine with Existing Backend

Update your existing backend to run both servers:

**Create `livekit-meeting/backend/combined-server.ts`:**

```typescript
import { exec } from 'child_process';

// Start main server
exec('tsx server.ts', (error, stdout, stderr) => {
  if (error) console.error(`Server error: ${error}`);
  console.log(stdout);
});

// Start transcription bridge
exec('tsx transcription-bridge.ts', (error, stdout, stderr) => {
  if (error) console.error(`Transcription error: ${error}`);
  console.log(stdout);
});
```

Update `package.json`:
```json
{
  "scripts": {
    "start:prod": "tsx backend/combined-server.ts"
  }
}
```

---

## 📊 Part 5: Monitoring and Optimization

### Check Whisper Server Health

```bash
# Test WebSocket connection
wscat -c wss://your-whisper-server.onrender.com

# Send ping
{"type": "ping"}

# Expected response
{"type": "pong", "timestamp": "...", "activeSessions": 0}
```

### Performance Tuning

**For 3-4 Users:**
```
WHISPER_MODEL=medium
WHISPER_WORKERS=4
Instance: Render Standard (512MB RAM minimum)
```

**For Better Accuracy (slower):**
```
WHISPER_MODEL=large-v3
WHISPER_WORKERS=2
Instance: Render Pro (2GB RAM)
```

**For Faster Response (lower accuracy):**
```
WHISPER_MODEL=small
WHISPER_WORKERS=4
Instance: Render Starter
```

---

## 🐛 Troubleshooting

### Issue: Whisper server crashes
**Solution:** Increase instance memory or reduce model size

### Issue: High latency (>5 seconds)
**Solutions:**
- Use `medium` instead of `large-v3`
- Reduce `BEAM_SIZE` to 3 in `whisper_server.py`
- Use closer Render region

### Issue: Transcripts not appearing
**Check:**
1. Browser console for WebSocket errors
2. Transcription bridge logs
3. Whisper server logs
4. Network tab for failed connections

### Issue: "Session not found" errors
**Solution:** Ensure audio is being captured. Check microphone permissions.

---

## 🔒 Security Best Practices

1. **Use HTTPS/WSS in production:**
   - Render automatically provides SSL
   
2. **Add authentication:**
   - Use JWT tokens for WebSocket connections
   - Validate room membership before transcribing

3. **Rate limiting:**
   - Add rate limits to prevent abuse
   - Limit concurrent sessions per user

4. **CORS:**
   - Configure proper CORS origins in bridge server
   - Don't use `*` in production

---

## 💰 Cost Estimation

**Render Hosting:**
- Whisper Server (Standard): $15/month
- Transcription Bridge: $7/month (can combine with backend)
- **Total: ~$22/month** for 3-4 concurrent users

**Scaling:**
- 10 users: $50/month (Pro instance)
- 20 users: $100/month (Multi-instance setup)

---

## 📈 Scaling Strategies

### Vertical Scaling
Upgrade to larger Render instances:
- Pro: 2GB RAM → 10-15 users
- Pro Plus: 4GB RAM → 20-30 users

### Horizontal Scaling
Deploy multiple Whisper servers with load balancer:

```typescript
const WHISPER_SERVERS = [
  'wss://whisper-1.onrender.com',
  'wss://whisper-2.onrender.com',
  'wss://whisper-3.onrender.com'
];

// Round-robin selection
const server = WHISPER_SERVERS[sessionCount % WHISPER_SERVERS.length];
```

---

## ✅ Deployment Checklist

- [ ] Deploy Whisper server to Render
- [ ] Note Whisper server URL
- [ ] Update backend `.env` with Whisper URL
- [ ] Update frontend `.env` with bridge URL
- [ ] Install new npm dependencies (`npm install`)
- [ ] Test locally first
- [ ] Deploy transcription bridge
- [ ] Test in production
- [ ] Monitor logs and performance
- [ ] Set up error alerts

---

## 🎯 Next Steps

1. **Test with real users** - Verify transcription quality
2. **Monitor latency** - Adjust settings if needed
3. **Add persistence** - Store transcripts in database
4. **Add exports** - Allow downloading transcripts
5. **Add languages** - Support multiple languages
6. **Add speaker diarization** - Better multi-speaker detection

---

## 📞 Support

If you encounter issues:
1. Check server logs in Render dashboard
2. Verify all environment variables
3. Test WebSocket connections
4. Check browser console for errors

---

**🎉 You're Done!** Your LiveKit meeting now has high-accuracy live transcription!
