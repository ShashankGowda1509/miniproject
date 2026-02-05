/**
 * WebSocket Server for Live Transcription
 * 
 * Handles WebSocket connections from clients, receives audio streams,
 * forwards to STT provider, and sends transcription results back.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { STTProvider } from './sttProvider';
import { DeepgramProvider } from '../providers/deepgram';

interface TranscriptConnection {
  ws: WebSocket;
  roomId: string;
  userId?: string;
  sttProvider: STTProvider;
  isActive: boolean;
}

export class TranscriptSocketServer {
  private wss: WebSocketServer;
  private connections: Map<WebSocket, TranscriptConnection> = new Map();

  constructor(server: any, path: string = '/transcript') {
    this.wss = new WebSocketServer({ 
      server, 
      path 
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log(`Transcript WebSocket server initialized on ${path}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    const userId = url.searchParams.get('userId') || undefined;

    if (!roomId) {
      ws.close(1008, 'Missing roomId parameter');
      return;
    }

    console.log(`New transcript connection: roomId=${roomId}, userId=${userId}`);

    // Initialize STT provider for this connection
    const sttProvider = this.createSTTProvider();

    const connection: TranscriptConnection = {
      ws,
      roomId,
      userId,
      sttProvider,
      isActive: true
    };

    this.connections.set(ws, connection);

    // Set up STT provider callbacks
    this.setupSTTCallbacks(connection);

    // Initialize STT provider
    sttProvider.initialize().catch(err => {
      console.error('Failed to initialize STT provider:', err);
      this.sendError(ws, 'Failed to initialize transcription service');
      ws.close();
    });

    // Handle incoming messages (audio data)
    ws.on('message', (data) => this.handleMessage(connection, data));

    // Handle connection close
    ws.on('close', () => this.handleClose(connection));

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleClose(connection);
    });
  }

  /**
   * Create STT provider instance
   * Can be extended to support multiple providers based on configuration
   */
  private createSTTProvider(): STTProvider {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is required');
    }

    // Currently using Deepgram, but architecture allows easy provider switching
    return new DeepgramProvider(apiKey);
  }

  /**
   * Setup STT provider event callbacks
   */
  private setupSTTCallbacks(connection: TranscriptConnection): void {
    const { ws, sttProvider } = connection;

    // Handle transcription results
    sttProvider.onTranscript((text: string, isFinal: boolean, metadata?: any) => {
      if (!connection.isActive) return;

      this.sendTranscript(ws, {
        text,
        isFinal,
        timestamp: Date.now(),
        speaker: metadata?.speaker,
        confidence: metadata?.confidence
      });
    });

    // Handle STT errors
    sttProvider.onError((error: Error) => {
      console.error('STT provider error:', error);
      this.sendError(ws, error.message);
    });

    // Handle STT connection close
    sttProvider.onClose(() => {
      console.log('STT provider connection closed');
    });
  }

  /**
   * Handle incoming WebSocket message (audio data)
   */
  private handleMessage(connection: TranscriptConnection, data: any): void {
    if (!connection.isActive) return;

    try {
      // Audio data is sent as binary (ArrayBuffer/Buffer)
      if (data instanceof Buffer || data instanceof ArrayBuffer) {
        connection.sttProvider.sendAudio(data);
      } else {
        console.warn('Received non-binary data, ignoring');
      }
    } catch (error) {
      console.error('Error processing audio data:', error);
      this.sendError(connection.ws, 'Failed to process audio data');
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(connection: TranscriptConnection): void {
    console.log(`Transcript connection closed: roomId=${connection.roomId}`);
    
    connection.isActive = false;
    
    // Cleanup STT provider
    if (connection.sttProvider) {
      connection.sttProvider.close();
    }

    this.connections.delete(connection.ws);
  }

  /**
   * Send transcript to client
   */
  private sendTranscript(ws: WebSocket, data: {
    text: string;
    isFinal: boolean;
    timestamp: number;
    speaker?: string;
    confidence?: number;
  }): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'transcript',
        ...data
      }));
    }
  }

  /**
   * Send error to client
   */
  private sendError(ws: WebSocket, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message
      }));
    }
  }

  /**
   * Get active connections for a room
   */
  getConnectionsByRoom(roomId: string): TranscriptConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.roomId === roomId && conn.isActive
    );
  }

  /**
   * Broadcast message to all connections in a room
   */
  broadcastToRoom(roomId: string, message: any): void {
    const connections = this.getConnectionsByRoom(roomId);
    const data = JSON.stringify(message);
    
    connections.forEach(conn => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(data);
      }
    });
  }

  /**
   * Close all connections and cleanup
   */
  close(): void {
    console.log('Closing all transcript connections');
    
    this.connections.forEach(conn => {
      conn.isActive = false;
      conn.sttProvider.close();
      conn.ws.close();
    });
    
    this.connections.clear();
    this.wss.close();
  }
}
