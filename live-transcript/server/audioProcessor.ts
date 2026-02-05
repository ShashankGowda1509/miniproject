/**
 * Audio Processing Utilities
 * 
 * Provides audio format conversion, buffering, and validation
 * for incoming audio streams.
 */

export interface AudioFormat {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export class AudioProcessor {
  private readonly targetFormat: AudioFormat = {
    sampleRate: 16000,  // 16kHz
    channels: 1,        // Mono
    bitDepth: 16        // 16-bit PCM
  };

  /**
   * Validate incoming audio buffer
   */
  validateAudioBuffer(buffer: Buffer | ArrayBuffer): boolean {
    const size = buffer instanceof Buffer ? buffer.length : buffer.byteLength;
    
    // Basic validation: check if buffer is not empty and has reasonable size
    if (size === 0) {
      console.warn('Received empty audio buffer');
      return false;
    }

    // Check if size is multiple of 2 (16-bit samples)
    if (size % 2 !== 0) {
      console.warn('Invalid audio buffer size (not multiple of 2)');
      return false;
    }

    // Check maximum buffer size (prevent DoS)
    const maxSize = 1024 * 1024; // 1MB
    if (size > maxSize) {
      console.warn(`Audio buffer too large: ${size} bytes`);
      return false;
    }

    return true;
  }

  /**
   * Convert ArrayBuffer to Buffer if needed
   */
  toBuffer(data: Buffer | ArrayBuffer): Buffer {
    if (data instanceof Buffer) {
      return data;
    }
    return Buffer.from(new Uint8Array(data));
  }

  /**
   * Get audio format information
   */
  getTargetFormat(): AudioFormat {
    return { ...this.targetFormat };
  }

  /**
   * Calculate duration of audio buffer in milliseconds
   */
  calculateDuration(buffer: Buffer): number {
    const sampleCount = buffer.length / 2; // 16-bit samples
    const durationSeconds = sampleCount / this.targetFormat.sampleRate;
    return durationSeconds * 1000;
  }

  /**
   * Resample audio (simplified - for production use a proper resampling library)
   * This is a basic implementation for demonstration
   */
  resampleIfNeeded(
    buffer: Buffer,
    sourceSampleRate: number
  ): Buffer {
    // If sample rates match, no resampling needed
    if (sourceSampleRate === this.targetFormat.sampleRate) {
      return buffer;
    }

    console.log(`Resampling from ${sourceSampleRate}Hz to ${this.targetFormat.sampleRate}Hz`);

    // Simple linear interpolation resampling
    const ratio = sourceSampleRate / this.targetFormat.sampleRate;
    const sourceLength = buffer.length / 2; // 16-bit samples
    const targetLength = Math.floor(sourceLength / ratio);
    const resampled = Buffer.allocUnsafe(targetLength * 2);

    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = Math.floor(i * ratio);
      const value = buffer.readInt16LE(sourceIndex * 2);
      resampled.writeInt16LE(value, i * 2);
    }

    return resampled;
  }

  /**
   * Convert stereo to mono by averaging channels
   */
  stereoToMono(buffer: Buffer): Buffer {
    const sampleCount = buffer.length / 4; // 2 channels, 16-bit each
    const mono = Buffer.allocUnsafe(sampleCount * 2);

    for (let i = 0; i < sampleCount; i++) {
      const left = buffer.readInt16LE(i * 4);
      const right = buffer.readInt16LE(i * 4 + 2);
      const avg = Math.floor((left + right) / 2);
      mono.writeInt16LE(avg, i * 2);
    }

    return mono;
  }

  /**
   * Apply basic noise gate to reduce background noise
   */
  applyNoiseGate(buffer: Buffer, threshold: number = 500): Buffer {
    const processed = Buffer.allocUnsafe(buffer.length);
    
    for (let i = 0; i < buffer.length; i += 2) {
      let sample = buffer.readInt16LE(i);
      
      // Apply noise gate: zero out samples below threshold
      if (Math.abs(sample) < threshold) {
        sample = 0;
      }
      
      processed.writeInt16LE(sample, i);
    }
    
    return processed;
  }

  /**
   * Normalize audio levels
   */
  normalize(buffer: Buffer, targetPeak: number = 0x6000): Buffer {
    // Find peak value
    let peak = 0;
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = Math.abs(buffer.readInt16LE(i));
      if (sample > peak) {
        peak = sample;
      }
    }

    // If already quiet, don't amplify noise
    if (peak < 1000) {
      return buffer;
    }

    // Calculate gain
    const gain = targetPeak / peak;
    
    // Apply gain
    const normalized = Buffer.allocUnsafe(buffer.length);
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i);
      const amplified = Math.max(-32768, Math.min(32767, Math.round(sample * gain)));
      normalized.writeInt16LE(amplified, i);
    }

    return normalized;
  }
}

/**
 * Audio Buffer Manager for handling chunked audio streams
 */
export class AudioBufferManager {
  private buffer: Buffer[] = [];
  private totalSize: number = 0;
  private readonly maxBufferSize: number;

  constructor(maxBufferSizeMs: number = 1000, sampleRate: number = 16000) {
    // Calculate max buffer size in bytes
    this.maxBufferSize = (maxBufferSizeMs / 1000) * sampleRate * 2; // 16-bit samples
  }

  /**
   * Add audio chunk to buffer
   */
  add(chunk: Buffer): void {
    this.buffer.push(chunk);
    this.totalSize += chunk.length;
  }

  /**
   * Get and clear buffered audio
   */
  flush(): Buffer | null {
    if (this.buffer.length === 0) {
      return null;
    }

    const combined = Buffer.concat(this.buffer, this.totalSize);
    this.clear();
    return combined;
  }

  /**
   * Check if buffer exceeds threshold
   */
  shouldFlush(): boolean {
    return this.totalSize >= this.maxBufferSize;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
    this.totalSize = 0;
  }

  /**
   * Get current buffer size in bytes
   */
  getSize(): number {
    return this.totalSize;
  }
}
