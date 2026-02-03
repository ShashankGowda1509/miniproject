import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Validate environment variables
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('❌ Missing required environment variables: LIVEKIT_API_KEY and LIVEKIT_API_SECRET');
  process.exit(1);
}

interface TokenRequestBody {
  roomName: string;
  participantName: string;
}

// POST /api/token - Generate LiveKit access token
app.post('/api/token', async (req: Request<{}, {}, TokenRequestBody>, res: Response) => {
  try {
    const { roomName, participantName } = req.body;

    // Validate input
    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'Missing required fields: roomName and participantName',
      });
    }

    // Sanitize inputs
    const sanitizedRoomName = roomName.trim();
    const sanitizedParticipantName = participantName.trim();

    if (!sanitizedRoomName || !sanitizedParticipantName) {
      return res.status(400).json({
        error: 'roomName and participantName cannot be empty',
      });
    }

    // Create access token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: sanitizedParticipantName,
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: sanitizedRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate token
    const token = await at.toJwt();

    console.log(`✅ Token generated for ${sanitizedParticipantName} in room ${sanitizedRoomName}`);

    res.json({
      token,
      roomName: sanitizedRoomName,
      participantName: sanitizedParticipantName,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      error: 'Failed to generate access token',
    });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Token endpoint: http://localhost:${PORT}/api/token`);
  console.log(`🔑 LiveKit API Key: ${LIVEKIT_API_KEY?.substring(0, 10)}...`);
});
