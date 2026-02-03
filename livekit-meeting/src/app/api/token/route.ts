import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName } = await request.json();

    // Validate input
    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing required fields: roomName and participantName' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedRoomName = roomName.trim();
    const sanitizedParticipantName = participantName.trim();

    if (!sanitizedRoomName || !sanitizedParticipantName) {
      return NextResponse.json(
        { error: 'roomName and participantName cannot be empty' },
        { status: 400 }
      );
    }

    // Get credentials from environment
    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('Missing LiveKit credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
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

    return NextResponse.json({
      token,
      roomName: sanitizedRoomName,
      participantName: sanitizedParticipantName,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate access token' },
      { status: 500 }
    );
  }
}
