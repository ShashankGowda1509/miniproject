/**
 * Audio Capture Module
 * 
 * Captures microphone audio and converts it to 16kHz mono PCM format
 * for optimal speech-to-text accuracy. Streams audio chunks in real-time.
 */

export interface AudioCaptureConfig {
  sampleRate: number;
  channelCount: number;
  chunkDuration: number; // milliseconds
}

export interface AudioChunk {
  data: Int16Array;
  timestamp: number;
}

export class AudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isCapturing: boolean = false;

  private config: AudioCaptureConfig = {
    sampleRate: 16000, // 16kHz for optimal STT
    channelCount: 1,    // Mono
    chunkDuration: 100  // 100ms chunks for low latency
  };

  private onChunkCallback: ((chunk: AudioChunk) => void) | null = null;

  constructor(config?: Partial<AudioCaptureConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize audio capture from microphone
   */
  async start(onChunk: (chunk: AudioChunk) => void): Promise<void> {
    if (this.isCapturing) {
      console.warn('Audio capture already started');
      return;
    }

    this.onChunkCallback = onChunk;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate
        },
        video: false
      });

      // Create audio context with target sample rate
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      });

      // Create source from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create processor for audio chunks
      // Using ScriptProcessorNode for compatibility (deprecated but widely supported)
      // In production, consider migrating to AudioWorklet for better performance
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        this.config.channelCount,
        this.config.channelCount
      );

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isCapturing) return;

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = this.convertFloat32ToInt16(inputData);
        
        if (this.onChunkCallback) {
          this.onChunkCallback({
            data: pcmData,
            timestamp: Date.now()
          });
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isCapturing = true;
      console.log('Audio capture started at', this.config.sampleRate, 'Hz');
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Stop audio capture and cleanup resources
   */
  stop(): void {
    if (!this.isCapturing) return;

    this.isCapturing = false;

    // Disconnect and cleanup audio nodes
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.onChunkCallback = null;
    console.log('Audio capture stopped');
  }

  /**
   * Convert Float32Array (-1.0 to 1.0) to Int16Array PCM format
   */
  private convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] range
      const clamped = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit integer range
      int16Array[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    }
    
    return int16Array;
  }

  /**
   * Check if currently capturing
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioCaptureConfig {
    return { ...this.config };
  }
}
