/**
 * Transcription Bridge Service
 * Connects LiveKit rooms to Whisper transcription server
 */

import express, { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 1e8 // 100MB
});

const PORT = process.env.TRANSCRIPTION_BRIDGE_PORT || 6824;
const WHISPER_SERVER_URL = process.env.WHISPER_SERVER_URL || 'ws://localhost:8765';

// Middleware
app.use(express.json());

interface TranscriptionSession {
  sessionId: string;
  roomName: string;
  participantName: string;
  socketId: string;
  socket: any; // Socket.IO socket reference
  whisperConnection: WebSocket | null;
  isActive: boolean;
  audioBuffer: Buffer[];
}

class TranscriptionBridge {
  private sessions: Map<string, TranscriptionSession> = new Map();
  private roomTranscripts: Map<string, any[]> = new Map();

  constructor() {
    this.setupSocketIO();
  }

  private setupSocketIO() {
    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      // Initialize transcription session
      socket.on('init-transcription', async (data: {
        roomName: string;
        participantName: string;
      }) => {
        try {
          const { roomName, participantName } = data;
          const sessionId = uuidv4();

          console.log(`📝 Initializing transcription for ${participantName} in ${roomName}`);

          // Create session
          const session: TranscriptionSession = {
            sessionId,
            roomName,
            participantName,
            socketId: socket.id,
            socket: socket,
            whisperConnection: null,
            isActive: true,
            audioBuffer: []
          };

          this.sessions.set(sessionId, session);

          // Connect to Whisper server
          await this.connectToWhisper(session);

          // Join room for broadcasts
          socket.join(roomName);

          // Note: transcription-ready will be emitted when Whisper sends 'ready' message

        } catch (error) {
          console.error('Error initializing transcription:', error);
          socket.emit('transcription-error', {
            message: 'Failed to initialize transcription'
          });
        }
      });

      // Receive audio data from frontend
      socket.on('audio-data', (data: {
        sessionId: string;
        audioData: ArrayBuffer;
      }) => {
        const { sessionId, audioData } = data;
        const session = this.sessions.get(sessionId);

        if (!session || !session.isActive) {
          return;
        }

        // Forward audio to Whisper server
        this.sendAudioToWhisper(session, Buffer.from(audioData));
      });

      // Stop transcription
      socket.on('stop-transcription', (data: { sessionId: string }) => {
        const { sessionId } = data;
        this.stopSession(sessionId);
      });

      // Get transcript history
      socket.on('get-transcripts', (data: { roomName: string }) => {
        const { roomName } = data;
        const transcripts = this.roomTranscripts.get(roomName) || [];
        socket.emit('transcript-history', { transcripts });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        
        // Clean up sessions for this socket
        this.sessions.forEach((session, sessionId) => {
          if (session.socketId === socket.id) {
            this.stopSession(sessionId);
          }
        });
      });
    });
  }

  private async connectToWhisper(session: TranscriptionSession): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(WHISPER_SERVER_URL);

        ws.on('open', () => {
          console.log(`🔌 Connected to Whisper server for session ${session.sessionId}`);
          
          // Initialize session with Whisper
          ws.send(JSON.stringify({
            type: 'init',
            sessionId: session.sessionId,
            speakerName: session.participantName
          }));

          session.whisperConnection = ws;
          resolve();
        });

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleWhisperMessage(session, message);
          } catch (error) {
            console.error('Error parsing Whisper message:', error);
          }
        });

        ws.on('error', (error) => {
          console.error(`Whisper WebSocket error for session ${session.sessionId}:`, error);
          reject(error);
        });

        ws.on('close', () => {
          console.log(`🔌 Disconnected from Whisper server for session ${session.sessionId}`);
          session.whisperConnection = null;
        });

      } catch (error) {
        console.error('Failed to connect to Whisper server:', error);
        reject(error);
      }
    });
  }

  private sendAudioToWhisper(session: TranscriptionSession, audioData: Buffer) {
    if (!session.whisperConnection || session.whisperConnection.readyState !== WebSocket.OPEN) {
      console.warn(`Whisper connection not ready for session ${session.sessionId}`);
      return;
    }

    try {
      // Prepare binary message: sessionId (36 bytes) + audio data
      const sessionIdBuffer = Buffer.alloc(36);
      sessionIdBuffer.write(session.sessionId, 0, 36, 'utf8');
      
      const message = Buffer.concat([sessionIdBuffer, audioData]);
      
      session.whisperConnection.send(message);
    } catch (error) {
      console.error('Error sending audio to Whisper:', error);
    }
  }

  private handleWhisperMessage(session: TranscriptionSession, message: any) {
    const { type } = message;

    if (type === 'transcript') {
      // Broadcast transcript to all participants in the room
      const transcript = {
        sessionId: session.sessionId,
        speaker: message.speaker,
        text: message.text,
        timestamp: message.timestamp,
        isFinal: message.isFinal
      };

      console.log(`📝 Transcript: [${message.speaker}] ${message.text}`);

      // Store in room history
      if (!this.roomTranscripts.has(session.roomName)) {
        this.roomTranscripts.set(session.roomName, []);
      }
      this.roomTranscripts.get(session.roomName)!.push(transcript);

      // Broadcast to all participants in the room
      io.to(session.roomName).emit('new-transcript', transcript);

    } else if (type === 'ready') {
      console.log(`✅ Transcription ready for session ${session.sessionId}`);
      
      // Now notify frontend that transcription is ready
      if (session.socket) {
        session.socket.emit('transcription-ready', {
          sessionId: session.sessionId,
          message: 'Transcription initialized'
        });
      }
    } else if (type === 'error') {
      console.error(`❌ Transcription error: ${message.message}`);
      
      // Notify client
      const clientSocket = io.sockets.sockets.get(session.socketId);
      if (clientSocket) {
        clientSocket.emit('transcription-error', {
          message: message.message
        });
      }
    }
  }

  private stopSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🛑 Stopping transcription session ${sessionId}`);

    // Close Whisper connection
    if (session.whisperConnection) {
      session.whisperConnection.send(JSON.stringify({
        type: 'close',
        sessionId: sessionId
      }));
      session.whisperConnection.close();
    }

    session.isActive = false;
    this.sessions.delete(sessionId);
  }

  // Cleanup old transcripts (optional)
  public cleanupOldTranscripts(maxAge: number = 3600000) { // 1 hour
    const now = Date.now();
    this.roomTranscripts.forEach((transcripts, roomName) => {
      const filtered = transcripts.filter((t) => {
        const age = now - new Date(t.timestamp).getTime();
        return age < maxAge;
      });
      this.roomTranscripts.set(roomName, filtered);
    });
  }
}

// Initialize bridge
const bridge = new TranscriptionBridge();

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    whisperServer: WHISPER_SERVER_URL
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Transcription Bridge running on http://localhost:${PORT}`);
  console.log(`🔗 Whisper Server: ${WHISPER_SERVER_URL}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Cleanup interval
setInterval(() => {
  bridge.cleanupOldTranscripts();
}, 600000); // Every 10 minutes
