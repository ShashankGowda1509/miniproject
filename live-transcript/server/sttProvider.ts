/**
 * Speech-to-Text Provider Interface
 * 
 * Abstract interface for STT providers to enable easy switching
 * between different services (Deepgram, Google STT, Whisper, etc.)
 */

export interface STTConfig {
  language?: string;
  model?: string;
  interimResults?: boolean;
  punctuation?: boolean;
  profanityFilter?: boolean;
  diarization?: boolean;
  sampleRate?: number;
}

export interface TranscriptMetadata {
  speaker?: string;
  confidence?: number;
  language?: string;
  [key: string]: any;
}

export type TranscriptCallback = (
  text: string,
  isFinal: boolean,
  metadata?: TranscriptMetadata
) => void;

export type ErrorCallback = (error: Error) => void;
export type CloseCallback = () => void;

/**
 * Abstract STT Provider Interface
 * 
 * All STT providers must implement this interface to ensure
 * compatibility with the transcription server.
 */
export abstract class STTProvider {
  protected transcriptCallback?: TranscriptCallback;
  protected errorCallback?: ErrorCallback;
  protected closeCallback?: CloseCallback;
  protected isInitialized: boolean = false;
  protected config: STTConfig;

  constructor(config: STTConfig = {}) {
    this.config = {
      language: 'en-US',
      interimResults: true,
      punctuation: true,
      profanityFilter: false,
      diarization: false,
      sampleRate: 16000,
      ...config
    };
  }

  /**
   * Initialize the STT provider connection
   */
  abstract initialize(): Promise<void>;

  /**
   * Send audio data to the STT service
   */
  abstract sendAudio(audioData: Buffer | ArrayBuffer): void;

  /**
   * Close the connection and cleanup
   */
  abstract close(): void;

  /**
   * Register callback for transcript results
   */
  onTranscript(callback: TranscriptCallback): void {
    this.transcriptCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Register callback for connection close
   */
  onClose(callback: CloseCallback): void {
    this.closeCallback = callback;
  }

  /**
   * Check if provider is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): STTConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<STTConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Provider Factory
 * 
 * Creates STT provider instances based on configuration.
 * Useful for runtime provider selection.
 */
export class STTProviderFactory {
  static create(
    providerName: string,
    apiKey: string,
    config?: STTConfig
  ): STTProvider {
    switch (providerName.toLowerCase()) {
      case 'deepgram':
        // Lazy load to avoid circular dependencies
        const { DeepgramProvider } = require('../providers/deepgram');
        return new DeepgramProvider(apiKey, config);
      
      // Future providers can be added here:
      // case 'google':
      //   return new GoogleSTTProvider(apiKey, config);
      // case 'whisper':
      //   return new WhisperProvider(apiKey, config);
      
      default:
        throw new Error(`Unknown STT provider: ${providerName}`);
    }
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): string[] {
    return ['deepgram'];
  }
}
