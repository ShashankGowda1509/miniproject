# 🚀 QUICK START GUIDE - CURRENT STATUS

## ✅ What's Running

### 1. Whisper Server - RUNNING ✅
**Terminal 1 (Python)** - Already started successfully!
```
Port: 8765
Status: ✅ Server is ready to accept connections
Model: medium (1.53GB) - Downloaded and loaded
```

---

## 🔧 Next Steps

### 2. Start Transcription Bridge
Open a **NEW PowerShell** terminal and run:

```powershell
cd C:\Users\dell1\Downloads\interview-ai-coach-main\interview-ai-coach-main\livekit-meeting
npm run transcription
```

**Expected output:**
```
🚀 Transcription Bridge running on http://localhost:9090
🔗 Whisper Server: ws://localhost:8765
```

### 3. Start Your Backend Server
Open **ANOTHER PowerShell** terminal and run:

```powershell
cd C:\Users\dell1\Downloads\interview-ai-coach-main\interview-ai-coach-main\livekit-meeting
npm run server
```

### 4. Start Frontend
Open **ONE MORE PowerShell** terminal and run:

```powershell
cd C:\Users\dell1\Downloads\interview-ai-coach-main\interview-ai-coach-main\livekit-meeting
npm run dev
```

---

## 📍 Expected Ports

When everything is running, you should have:

- **Whisper Server:** ws://localhost:8765 ✅ RUNNING
- **Transcription Bridge:** http://localhost:9090 (needs to start)
- **Backend Server:** http://localhost:3001 (needs to start)
- **Frontend:** http://localhost:3000 (needs to start)

---

## 🎤 How to Test

1. Open browser: http://localhost:3000
2. Join a room (enter a room name and your name)
3. Allow microphone access
4. Start speaking
5. See transcripts appear in the right panel!

---

## 🐛 If You Get "Port in Use" Errors

If you see `EADDRINUSE` errors, it means a previous process is still running.

**Option 1: Use Task Manager**
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "Node.js: Server-side JavaScript"
3. End all Node.js tasks
4. Try starting again

**Option 2: Change Port**
The transcription bridge is currently set to port 9090.
If that's in use, edit this file:
`livekit-meeting\backend\transcription-bridge.ts`

Find line: `const PORT = process.env.TRANSCRIPTION_BRIDGE_PORT || 9090;`
Change to: `const PORT = process.env.TRANSCRIPTION_BRIDGE_PORT || 9091;` (or any free port)

Then update the frontend:
`livekit-meeting\src\hooks\useTranscription.ts`

Find: `'http://localhost:9090'`
Change to: `'http://localhost:9091'`

---

## ✅ Summary

You have:
- ✅ Python dependencies installed
- ✅ Node.js dependencies installed
- ✅ Whisper server RUNNING (Terminal 1)

You need to:
- ⏳ Start transcription bridge (Terminal 2)
- ⏳ Start backend server (Terminal 3)
- ⏳ Start frontend (Terminal 4)

---

## 🎯 One-Line Commands

Copy and paste these into separate terminals:

**Terminal 2 (Transcription Bridge):**
```powershell
cd C:\Users\dell1\Downloads\interview-ai-coach-main\interview-ai-coach-main\livekit-meeting; npm run transcription
```

**Terminal 3 (Backend):**
```powershell
cd C:\Users\dell1\Downloads\interview-ai-coach-main\interview-ai-coach-main\livekit-meeting; npm run server
```

**Terminal 4 (Frontend):**
```powershell
cd C:\Users\dell1\Downloads\interview-ai-coach-main\interview-ai-coach-main\livekit-meeting; npm run dev
```

---

**You're almost there! Just 3 more terminals to open! 🚀**
