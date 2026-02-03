import { useEffect, useState } from 'react';

// Custom hook to get token for LiveKit room
export function useLiveKitToken(roomName: string, participantName: string) {
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomName || !participantName) {
      setIsLoading(false);
      return;
    }

    const fetchToken = async () => {
      try {
        setIsLoading(true);
        setError('');

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/api/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName: decodeURIComponent(roomName),
            participantName: decodeURIComponent(participantName),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get access token');
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        console.error('Error fetching token:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect to server'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [roomName, participantName]);

  return { token, error, isLoading };
}
