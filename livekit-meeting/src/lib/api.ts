export interface TokenResponse {
  token: string;
  roomName: string;
  participantName: string;
}

export interface TokenRequest {
  roomName: string;
  participantName: string;
}

export interface ErrorResponse {
  error: string;
}

// API client for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getAccessToken(
  roomName: string,
  participantName: string
): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomName,
      participantName,
    }),
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || 'Failed to get access token');
  }

  return response.json();
}
