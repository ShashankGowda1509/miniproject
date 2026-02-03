# Quick Start Guide

## Option 1: LiveKit Cloud (Fastest)

1. **Get LiveKit Cloud credentials** (5 minutes)
   - Visit: https://cloud.livekit.io/
   - Sign up (free tier available)
   - Create new project
   - Copy: API Key, API Secret, WebSocket URL

2. **Install & Configure**
   ```bash
   cd livekit-meeting
   npm install
   cp .env.example .env
   # Edit .env with your LiveKit Cloud credentials
   ```

3. **Run the app**
   ```bash
   # Terminal 1
   npm run server

   # Terminal 2  
   npm run dev
   ```

4. **Test it!**
   - Open: http://localhost:3000
   - Enter your name and room name
   - Click "Create Room" or "Join Room"
   - Open in another browser/tab to test multi-party

## Option 2: Self-hosted LiveKit (Docker)

1. **Start LiveKit server**
   ```bash
   cd livekit-meeting
   docker-compose up -d
   ```

2. **Configure .env**
   ```env
   NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=apisecret
   PORT=3001
   ```

3. **Install & Run**
   ```bash
   npm install
   npm run server  # Terminal 1
   npm run dev     # Terminal 2
   ```

## Common Issues

**Backend not starting?**
```bash
# Check if port 3001 is available
netstat -ano | findstr :3001
```

**Frontend can't connect?**
- Ensure backend shows: "🚀 Backend server running on http://localhost:3001"
- Check .env has NEXT_PUBLIC_LIVEKIT_URL set correctly

**Camera/mic not working?**
- Allow permissions when prompted
- Use HTTPS or localhost only
- Check browser privacy settings

## Test Checklist

- [ ] Landing page loads
- [ ] Can enter name and room name
- [ ] "Create Room" navigates to /room/[name]
- [ ] Camera preview appears
- [ ] Can mute/unmute audio
- [ ] Can turn camera on/off
- [ ] Second participant can join
- [ ] Both participants see each other
- [ ] "Leave Room" returns to home
