# LiveKit Meeting App 🎥

A Zoom-like group video meeting web application supporting 5-10 participants, powered by **LiveKit SFU** (Selective Forwarding Unit) for optimal scalability and performance.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Video Infrastructure**: LiveKit (SFU) - eliminates P2P mesh scaling issues
- **Authentication**: Simple username entry (no password)

## ✨ Features

- ✅ Create or join video rooms with custom names
- ✅ High-quality video grid for 5-10 participants
- ✅ Audio/video controls (mute/unmute, camera on/off)
- ✅ Real-time participant join/leave updates
- ✅ Automatic reconnection on network drops
- ✅ Device permission error handling with friendly UI
- ✅ Responsive design for desktop and mobile
- ✅ SFU architecture for optimal performance

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- LiveKit account (self-hosted or LiveKit Cloud)

## 🔧 Setup Instructions

### 1. Get LiveKit Credentials

**Option A: LiveKit Cloud (Recommended for quick start)**
1. Go to [https://cloud.livekit.io/](https://cloud.livekit.io/)
2. Sign up and create a new project
3. Copy your credentials:
   - WebSocket URL (e.g., `wss://your-project.livekit.cloud`)
   - API Key
   - API Secret

**Option B: Self-hosted LiveKit (Docker)**
```bash
# Run LiveKit server locally
docker run -d \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -v $PWD/livekit.yaml:/livekit.yaml \
  livekit/livekit-server \
  --config /livekit.yaml
```

### 2. Install Dependencies

```bash
cd livekit-meeting
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your LiveKit credentials:

```env
# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here

# Backend Server Port
PORT=3001
```

⚠️ **Important**: 
- `NEXT_PUBLIC_LIVEKIT_URL` must start with `wss://` (cloud) or `ws://` (local)
- Never commit `.env` to version control

### 4. Run the Application

**Terminal 1 - Backend Server:**
```bash
npm run server
```

You should see:
```
🚀 Backend server running on http://localhost:3001
📡 Token endpoint: http://localhost:3001/api/token
```

**Terminal 2 - Frontend (Next.js):**
```bash
npm run dev
```

You should see:
```
✓ Ready on http://localhost:3000
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 🎮 Usage

1. **Landing Page** (`/`)
   - Enter your name
   - Enter a room name
   - Click "Create Room" or "Join Room"

2. **Meeting Room** (`/room/[roomName]`)
   - Your video appears automatically
   - See other participants in a grid layout
   - Use controls to:
     - 🎤 Mute/unmute microphone
     - 📹 Turn camera on/off
     - 🔇 Adjust audio settings
     - 📺 Share screen (if enabled)
   - Click "Leave Room" to exit

## 📁 Project Structure

```
livekit-meeting/
├── backend/
│   ├── server.ts           # Express server with token endpoint
│   └── tsconfig.json       # Backend TypeScript config
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Landing page (name + room input)
│   │   ├── globals.css     # Global styles
│   │   └── room/
│   │       └── [roomName]/
│   │           └── page.tsx # Meeting room page
│   ├── hooks/
│   │   └── useLiveKitToken.ts # Custom hook for token fetching
│   └── lib/
│       ├── api.ts          # API client functions
│       └── utils.ts        # Utility functions
├── .env.example            # Environment template
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.ts      # Tailwind CSS config
└── next.config.js          # Next.js configuration
```

## 🔌 API Endpoints

### POST `/api/token`

Generates a LiveKit access token for room access.

**Request:**
```json
{
  "roomName": "my-meeting",
  "participantName": "John Doe"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roomName": "my-meeting",
  "participantName": "John Doe"
}
```

**Error Response:**
```json
{
  "error": "Missing required fields: roomName and participantName"
}
```

## 🛠️ Development

### Build for Production

```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Run Backend in Production

```bash
cd backend
npx tsx server.ts
```

### Linting

```bash
npm run lint
```

## 🔒 Security Notes

- **Never expose** `LIVEKIT_API_SECRET` in frontend code
- API credentials should **only** be used on the backend
- Token generation happens server-side for security
- Consider adding authentication for production use

## 🐛 Troubleshooting

### Issue: "Failed to connect to server"
- ✅ Ensure backend server is running on port 3001
- ✅ Check `.env` file has correct LiveKit credentials
- ✅ Verify LiveKit URL uses `wss://` (not `https://`)

### Issue: "Camera/microphone permission denied"
- ✅ Browser must be on HTTPS (or localhost)
- ✅ Click "Allow" when prompted for permissions
- ✅ Check browser settings → Privacy → Camera/Microphone

### Issue: "No camera or microphone found"
- ✅ Connect a webcam or ensure built-in camera is enabled
- ✅ Check device is not in use by another application
- ✅ Restart browser after connecting devices

### Issue: Connection drops frequently
- ✅ Check network stability
- ✅ Verify firewall allows WebSocket connections
- ✅ Try switching between WiFi and ethernet

### Issue: Video quality is poor
- ✅ Check internet bandwidth (recommended: 2+ Mbps per participant)
- ✅ Reduce number of participants if on slow connection
- ✅ Close other bandwidth-heavy applications

## 📊 Scalability

This app uses **LiveKit SFU** (Selective Forwarding Unit) architecture:

- **5-10 participants**: Excellent performance ✅
- **10-20 participants**: Good performance with moderate bandwidth
- **20+ participants**: Consider LiveKit Cloud for auto-scaling

### Why SFU vs P2P Mesh?

| Architecture | 5 users | 10 users | Bandwidth per user |
|-------------|---------|----------|-------------------|
| **P2P Mesh** | 4 connections | 9 connections | 📈 N-1 streams |
| **SFU (LiveKit)** | 1 connection | 1 connection | ⚡ 1 stream up, N-1 down |

**Result**: SFU scales much better for group calls!

## 🌐 Deployment

### Deploy Frontend (Vercel)
```bash
npm run build
# Push to GitHub and connect to Vercel
```

### Deploy Backend (Railway/Render/Fly.io)
- Set environment variables in platform dashboard
- Deploy from GitHub repository
- Update `NEXT_PUBLIC_API_URL` in frontend `.env`

### Using LiveKit Cloud
- No self-hosting needed
- Automatic scaling
- Global edge network
- 50 GB free monthly bandwidth

## 📝 License

MIT License - feel free to use this project for your own applications!

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📞 Support

For LiveKit-specific questions:
- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit GitHub](https://github.com/livekit)
- [LiveKit Community Slack](https://livekit.io/community)

---

**Built with ❤️ using LiveKit SFU - No P2P mesh, just pure scalable video!**
