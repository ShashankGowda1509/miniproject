// Utility function to sanitize room names
export function sanitizeRoomName(roomName: string): string {
  return roomName
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();
}

// Utility function to validate participant name
export function validateParticipantName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 50;
}

// Utility function to validate room name
export function validateRoomName(roomName: string): boolean {
  return roomName.trim().length > 0 && roomName.trim().length <= 50;
}

// Format error messages for user display
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Permission') || error.message.includes('NotAllowedError')) {
      return 'Camera/microphone permission denied. Please allow access in your browser settings.';
    } else if (error.message.includes('NotFoundError')) {
      return 'No camera or microphone found. Please connect a device.';
    } else if (error.message.includes('NotReadableError')) {
      return 'Camera/microphone is already in use by another application.';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}
