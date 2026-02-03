import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Configuration from environment
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const MAX_PARTICIPANTS = parseInt(process.env.MAX_PARTICIPANTS_PER_ROOM || '10', 10);
const ENABLE_DEBUG = process.env.ENABLE_DEBUG_LOGS === 'true';

// Helper logging function
const log = (...args: any[]) => {
  if (ENABLE_DEBUG || NODE_ENV === 'development') {
    console.log(...args);
  }
};

// CORS configuration - Allow all origins in development
const corsOptions = NODE_ENV === 'development' 
  ? { origin: '*', credentials: false }
  : { origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'], credentials: true };

app.use(cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    maxParticipants: MAX_PARTICIPANTS
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Video Meeting Signaling Server',
    version: '1.0.0',
    status: 'running'
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: NODE_ENV === 'development' 
    ? { origin: '*', methods: ["GET", "POST"], credentials: false }
    : { 
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
        methods: ["GET", "POST"],
        credentials: true
      },
  pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT || '60000', 10),
  pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '25000', 10)
});

interface Room {
  id: string;
  host: string;
  participants: Map<string, { socketId: string; name: string; peerId: string }>;
  createdAt: Date;
}

const rooms = new Map<string, Room>();

// Socket.IO connection handler
io.on('connection', (socket) => {
  log('✅ User connected:', socket.id);

  // Create a new room
  socket.on('create-room', ({ roomId, name, peerId }) => {
    log(`📋 Create room request: ${roomId} by ${name}`);

    // Check if room already exists
    if (rooms.has(roomId)) {
      socket.emit('room-already-exists', { roomId });
      return;
    }

    const room: Room = {
      id: roomId,
      host: socket.id,
      participants: new Map(),
      createdAt: new Date()
    };
    
    room.participants.set(socket.id, { socketId: socket.id, name, peerId });
    rooms.set(roomId, room);
    socket.join(roomId);
    
    socket.emit('room-created', { roomId, peerId });
    console.log(`🏠 Room created: ${roomId} by ${name} (Total rooms: ${rooms.size})`);
  });

  // Join an existing room
  socket.on('join-room', ({ roomId, name, peerId }) => {
    log(`📋 Join room request: ${roomId} by ${name}`);

    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('room-not-found');
      log(`❌ Room not found: ${roomId}`);
      return;
    }

    // Check max participants
    if (room.participants.size >= MAX_PARTICIPANTS) {
      socket.emit('room-full', { maxParticipants: MAX_PARTICIPANTS });
      log(`❌ Room full: ${roomId} (${room.participants.size}/${MAX_PARTICIPANTS})`);
      return;
    }

    socket.join(roomId);
    room.participants.set(socket.id, { socketId: socket.id, name, peerId });

    // Send existing participants to the new user
    const existingParticipants = Array.from(room.participants.values())
      .filter(p => p.socketId !== socket.id);
    
    socket.emit('existing-participants', existingParticipants);

    // Notify others about the new participant
    socket.to(roomId).emit('participant-joined', {
      socketId: socket.id,
      name,
      peerId
    });

    console.log(`👤 ${name} joined room ${roomId} (${room.participants.size}/${MAX_PARTICIPANTS})`);
  });

  // Handle signaling for WebRTC
  socket.on('signal', ({ to, signal, from }) => {
    log(`📡 Signal from ${from} to ${to}`);
    io.to(to).emit('signal', { signal, from });
  });

  // Leave room
  socket.on('leave-room', ({ roomId }) => {
    log(`👋 Leave room request: ${roomId} by ${socket.id}`);
    handleLeaveRoom(socket, roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    
    // Find and remove from all rooms
    rooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        handleLeaveRoom(socket, roomId);
      }
    });
  });

  // Handle leaving a room
  function handleLeaveRoom(socket: any, roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);
    socket.leave(roomId);

    // Notify others
    socket.to(roomId).emit('participant-left', {
      socketId: socket.id,
      name: participant?.name
    });

    // Delete room if empty
    if (room.participants.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty) - Total rooms: ${rooms.size}`);
    } else {
      log(`👋 ${participant?.name} left room ${roomId} (${room.participants.size} remaining)`);
    }
  }

  // Get room info (optional feature)
  socket.on('get-room-info', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('room-info', {
        id: room.id,
        participantCount: room.participants.size,
        maxParticipants: MAX_PARTICIPANTS,
        createdAt: room.createdAt
      });
    } else {
      socket.emit('room-not-found');
    }
  });
});

// Cleanup old rooms periodically (optional)
if (process.env.AUTO_DELETE_EMPTY_ROOMS === 'true') {
  const cleanupInterval = parseInt(process.env.ROOM_CLEANUP_INTERVAL || '300000', 10);
  setInterval(() => {
    let deletedCount = 0;
    rooms.forEach((room, roomId) => {
      if (room.participants.size === 0) {
        rooms.delete(roomId);
        deletedCount++;
      }
    });
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} empty rooms`);
    }
  }, cleanupInterval);
}

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🚀 Video Meeting Signaling Server');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📡 Environment:     ${NODE_ENV}`);
  console.log(`🔌 Port:            ${PORT}`);
  console.log(`🔗 CORS:            ${NODE_ENV === 'development' ? 'All origins allowed (dev mode)' : corsOptions.origin}`);
  console.log(`👥 Max per room:    ${MAX_PARTICIPANTS} participants`);
  console.log(`🐛 Debug logging:   ${ENABLE_DEBUG ? 'enabled' : 'disabled'}`);
  console.log(`🧹 Auto cleanup:    ${process.env.AUTO_DELETE_EMPTY_ROOMS === 'true' ? 'enabled' : 'disabled'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Server ready at http://localhost:${PORT}`);
  console.log(`💚 Health check:   http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});