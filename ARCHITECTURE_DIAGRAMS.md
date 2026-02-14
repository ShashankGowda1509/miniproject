# 🎨 Live Transcription Architecture Diagram

## System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Frontend                           │ │
│  │  ┏━━━━━━━━━━━━━━━━━━━━┓    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │ │
│  │  ┃   Video Grid       ┃    ┃   Transcript Panel         ┃  │ │
│  │  ┃   (LiveKit)        ┃    ┃   [Speaker]: text...       ┃  │ │
│  │  ┃   👤 👤 👤        ┃    ┃   [Speaker]: text...       ┃  │ │
│  │  ┗━━━━━━━━━━━━━━━━━━━━┛    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │ │
│  │           ↕                            ↕                      │ │
│  │    LiveKit SDK              useTranscription Hook            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│           ↓ WebRTC                     ↓ Socket.IO                 │
└───────────────────────────────────────────────────────────────────┘
             ↓                            ↓
┌────────────────────┐      ┌────────────────────────────────────┐
│   LiveKit Server   │      │   Transcription Bridge (Node.js)   │
│   (Existing)       │      │   Port: 3002                        │
│                    │      │   ┌──────────────────────────────┐ │
│   - Video routing  │      │   │ Socket.IO Server            │ │
│   - Audio routing  │      │   │ - Receive audio chunks      │ │
│   - Signaling      │◀────▶│   │ - Forward to Whisper        │ │
│                    │      │   │ - Broadcast transcripts     │ │
└────────────────────┘      │   └──────────────────────────────┘ │
                            └────────────────────────────────────┘
                                         ↓ WebSocket
                            ┌────────────────────────────────────┐
                            │   Whisper Server (Python)          │
                            │   Port: 8765                        │
                            │   ┌──────────────────────────────┐ │
                            │   │ WebSocket Server            │ │
                            │   │ ┌────────────────────────┐  │ │
                            │   │ │  faster-whisper        │  │ │
                            │   │ │  - Model: medium       │  │ │
                            │   │ │  - Device: CPU         │  │ │
                            │   │ │  - Workers: 4          │  │ │
                            │   │ └────────────────────────┘  │ │
                            │   │ Session Manager             │ │
                            │   └──────────────────────────────┘ │
                            └────────────────────────────────────┘
```

## Data Flow - Detailed

```
1. USER SPEAKS
   ↓
2. MICROPHONE CAPTURE (Browser)
   - MediaStream API
   - Audio track from LiveKit
   ↓
3. AUDIO PROCESSING (Frontend)
   - useTranscription hook
   - AudioContext (16kHz, mono)
   - ScriptProcessor (4096 samples)
   - Convert float32 → int16
   ↓
4. SEND TO BRIDGE (Socket.IO)
   Event: 'audio-data'
   Data: { sessionId, audioData: ArrayBuffer }
   ↓
5. BRIDGE RECEIVES (Node.js)
   - Validate session
   - Add to buffer
   ↓
6. FORWARD TO WHISPER (WebSocket)
   Format: sessionId (36 bytes) + audio data
   ↓
7. WHISPER PROCESSES (Python)
   - Receive binary data
   - Extract sessionId
   - Parse audio chunk
   - Add to buffer (1-30 seconds)
   ↓
8. TRANSCRIBE (faster-whisper)
   - Convert to numpy array
   - Normalize audio
   - Run Whisper model
   - Extract text segments
   ↓
9. RETURN TRANSCRIPT (WebSocket)
   JSON: {
     type: 'transcript',
     sessionId: '...',
     speaker: 'John Doe',
     text: 'Hello everyone',
     timestamp: '...',
     isFinal: true
   }
   ↓
10. BROADCAST (Socket.IO)
    - Bridge receives transcript
    - Emit to all room participants
    Event: 'new-transcript'
    ↓
11. DISPLAY (Frontend)
    - React state update
    - TranscriptPanel re-renders
    - Auto-scroll to bottom
    - Show with speaker color
```

## Component Interaction

```
Frontend Components:
┌──────────────────────────────────────────┐
│ RoomPage                                 │
│  ├─ LiveKitRoom                          │
│  │   ├─ VideoConference (existing)       │
│  │   └─ RoomAudioRenderer (existing)     │
│  │                                        │
│  └─ RoomWithTranscript (NEW)             │
│      ├─ useRoomContext() → room          │
│      ├─ useTranscription(room) → hook    │
│      │    ├─ Socket.IO connection        │
│      │    ├─ Audio capture               │
│      │    └─ Transcript state            │
│      │                                    │
│      └─ TranscriptPanel (NEW)            │
│           ├─ Transcript list             │
│           ├─ Auto-scroll                 │
│           └─ Speaker colors              │
└──────────────────────────────────────────┘
```

## Session Lifecycle

```
SESSION START:
┌─────────────────────────────────────────┐
│ 1. User joins LiveKit room              │
│    ↓                                     │
│ 2. useTranscription hook activates      │
│    ↓                                     │
│ 3. Connect to bridge via Socket.IO      │
│    ↓                                     │
│ 4. Emit 'init-transcription'            │
│    ↓                                     │
│ 5. Bridge creates session               │
│    ↓                                     │
│ 6. Bridge connects to Whisper           │
│    ↓                                     │
│ 7. Whisper creates session              │
│    ↓                                     │
│ 8. Bridge returns sessionId             │
│    ↓                                     │
│ 9. Start audio capture                  │
└─────────────────────────────────────────┘

ACTIVE TRANSCRIPTION:
┌─────────────────────────────────────────┐
│ Loop:                                   │
│   1. Capture audio chunk (4096 samples) │
│   2. Send to bridge                     │
│   3. Bridge forwards to Whisper         │
│   4. Whisper buffers (1-30s)            │
│   5. Transcribe when ready              │
│   6. Return transcript                  │
│   7. Bridge broadcasts                  │
│   8. Frontend displays                  │
│   Repeat...                             │
└─────────────────────────────────────────┘

SESSION END:
┌─────────────────────────────────────────┐
│ 1. User leaves room OR closes app       │
│    ↓                                     │
│ 2. useTranscription cleanup             │
│    ↓                                     │
│ 3. Emit 'stop-transcription'            │
│    ↓                                     │
│ 4. Bridge closes Whisper connection     │
│    ↓                                     │
│ 5. Whisper cleans up session            │
│    ↓                                     │
│ 6. Bridge removes session               │
│    ↓                                     │
│ 7. Socket.IO disconnect                 │
└─────────────────────────────────────────┘
```

## Multi-User Scenario

```
Room: "Interview Room 1"
Participants: Alice, Bob, Charlie

ALICE SPEAKS:
  Alice's browser → Bridge (session-alice-123) → Whisper → Transcribe
  → Bridge broadcasts to: Alice, Bob, Charlie
  → All see: "[Alice]: Hello everyone"

BOB SPEAKS:
  Bob's browser → Bridge (session-bob-456) → Whisper → Transcribe
  → Bridge broadcasts to: Alice, Bob, Charlie
  → All see: "[Bob]: Hi Alice"

CHARLIE SPEAKS:
  Charlie's browser → Bridge (session-charlie-789) → Whisper → Transcribe
  → Bridge broadcasts to: Alice, Bob, Charlie
  → All see: "[Charlie]: Good morning"

Result:
┌────────────────────────────────┐
│ Transcript Panel (All Users)   │
├────────────────────────────────┤
│ [Alice]: Hello everyone        │
│ [Bob]: Hi Alice                │
│ [Charlie]: Good morning        │
└────────────────────────────────┘
```

## Deployment Architecture

```
DEVELOPMENT:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Frontend     │  │ Backend      │  │ Bridge       │  │ Whisper      │
│ localhost    │◀▶│ localhost    │◀─│ localhost    │◀─│ localhost    │
│ :3000        │  │ :3001        │  │ :3002        │  │ :8765        │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

PRODUCTION:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Frontend     │  │ Backend      │  │ Bridge       │  │ Whisper      │
│ Vercel       │◀▶│ Render       │◀─│ Render       │◀─│ Render       │
│ your-app     │  │ backend-api  │  │ transcribe   │  │ whisper-srv  │
│ .vercel.app  │  │ .onrender    │  │ .onrender    │  │ .onrender    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

## Performance Metrics

```
Audio Pipeline Latency:
┌────────────────────────┬──────────┐
│ Step                   │ Latency  │
├────────────────────────┼──────────┤
│ Mic capture            │ ~10ms    │
│ Audio processing       │ ~50ms    │
│ Send to bridge         │ ~20ms    │
│ Forward to Whisper     │ ~10ms    │
│ Buffer accumulation    │ 1000ms   │
│ Whisper transcription  │ 800ms    │
│ Return transcript      │ ~20ms    │
│ Broadcast to users     │ ~30ms    │
│ UI update              │ ~10ms    │
├────────────────────────┼──────────┤
│ TOTAL                  │ ~2s      │
└────────────────────────┴──────────┘

Resource Usage (per user):
┌────────────────────────┬──────────┐
│ Component              │ Usage    │
├────────────────────────┼──────────┤
│ Frontend (browser)     │ 50MB RAM │
│ Bridge (Node.js)       │ 10MB RAM │
│ Whisper (Python)       │ 1GB RAM  │
│ Whisper (CPU)          │ 70%      │
├────────────────────────┼──────────┤
│ Total per user         │ 1GB RAM  │
│                        │ 70% CPU  │
└────────────────────────┴──────────┘

Scaling Capacity:
┌────────────────────────┬──────────┐
│ Server Tier            │ Users    │
├────────────────────────┼──────────┤
│ Render Starter ($7)    │ 2-3      │
│ Render Standard ($15)  │ 3-4      │
│ Render Pro ($50)       │ 10-15    │
│ Multi-instance         │ 50+      │
└────────────────────────┴──────────┘
```

## Network Protocol

```
Socket.IO Events (Frontend ↔ Bridge):
┌─────────────────────────────────────────────┐
│ Client → Server                             │
├─────────────────────────────────────────────┤
│ 'init-transcription'                        │
│   { roomName, participantName }             │
│                                             │
│ 'audio-data'                                │
│   { sessionId, audioData: ArrayBuffer }     │
│                                             │
│ 'stop-transcription'                        │
│   { sessionId }                             │
│                                             │
│ 'get-transcripts'                           │
│   { roomName }                              │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Server → Client                             │
├─────────────────────────────────────────────┤
│ 'transcription-ready'                       │
│   { sessionId, message }                    │
│                                             │
│ 'new-transcript'                            │
│   { sessionId, speaker, text, timestamp }   │
│                                             │
│ 'transcript-history'                        │
│   { transcripts: [...] }                    │
│                                             │
│ 'transcription-error'                       │
│   { message }                               │
└─────────────────────────────────────────────┘

WebSocket Messages (Bridge ↔ Whisper):
┌─────────────────────────────────────────────┐
│ Client → Server (Text)                      │
├─────────────────────────────────────────────┤
│ { type: 'init',                             │
│   sessionId: '...',                         │
│   speakerName: '...' }                      │
│                                             │
│ { type: 'close',                            │
│   sessionId: '...' }                        │
│                                             │
│ { type: 'ping' }                            │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Client → Server (Binary)                    │
├─────────────────────────────────────────────┤
│ [36 bytes: sessionId]                       │
│ [N bytes: audio data (int16)]               │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Server → Client (Text)                      │
├─────────────────────────────────────────────┤
│ { type: 'ready',                            │
│   sessionId: '...' }                        │
│                                             │
│ { type: 'transcript',                       │
│   sessionId: '...',                         │
│   speaker: '...',                           │
│   text: '...',                              │
│   isFinal: true,                            │
│   timestamp: '...' }                        │
│                                             │
│ { type: 'pong',                             │
│   timestamp: '...',                         │
│   activeSessions: N }                       │
│                                             │
│ { type: 'error',                            │
│   message: '...' }                          │
└─────────────────────────────────────────────┘
```

---

**Legend:**
- ┌─┐ Box drawing
- ↓ ↑ ← → ↔ Arrows (flow direction)
- ━ ┃ Heavy lines (emphasis)
- ─ │ Light lines (structure)
