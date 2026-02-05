/**
 * Deepgram STT Provider
 * 
 * Implementation of STT provider using Deepgram's streaming API.
 * Provides real-time speech-to-text with high accuracy.
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { STTProvider, STTConfig, TranscriptMetadata } from '../server/sttProvider';

export class DeepgramProvider extends STTProvider {
  private client: any;
  private liveTranscription: any;
  private apiKey: string;

  constructor(apiKey: string, config?: STTConfig) {
    super(config);
    this.apiKey = apiKey;
  }

  /**
   * Initialize Deepgram live transcription connection
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Deepgram provider...');

      // Create Deepgram client
      this.client = createClient(this.apiKey);

      // Configure live transcription options
      const options = {
        model: this.config.model || 'nova-2',
        language: this.config.language || 'en-US',
        smart_format: true,
        punctuate: this.config.punctuation !== false,
        interim_results: this.config.interimResults !== false,
        encoding: 'linear16',
        sample_rate: this.config.sampleRate || 16000,
        channels: 1,
        
        // Optional features
        ...(this.config.diarization && { diarize: true }),
        ...(this.config.profanityFilter && { profanity_filter: true }),
        
        // Utterance detection for better segmentation
        utterance_end_ms: 1000,
        vad_events: true
      };

      // Create live transcription connection
      this.liveTranscription = this.client.listen.live(options);

      // Set up event listeners
      this.setupEventHandlers();

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Deepgram connection timeout'));
        }, 10000);

        this.liveTranscription.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(timeout);
          this.isInitialized = true;
          console.log('Deepgram connection established');
          resolve();
        });

        this.liveTranscription.on(LiveTranscriptionEvents.Error, (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      console.error('Failed to initialize Deepgram:', error);
      this.isInitialized = false;
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
      throw error;
    }
  }

  /**
   * Setup Deepgram event handlers
   */
  private setupEventHandlers(): void {
    // Handle transcription results
    this.liveTranscription.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      try {
        const channel = data.channel;
        const alternatives = channel?.alternatives;
        
        if (!alternatives || alternatives.length === 0) {
          return;
        }

        const result = alternatives[0];
        const transcript = result.transcript;

        // Ignore empty transcripts
        if (!transcript || transcript.trim().length === 0) {
          return;
        }

        const isFinal = data.is_final || false;
        const speechFinal = data.speech_final || false;

        // Extract metadata
        const metadata: TranscriptMetadata = {
          confidence: result.confidence,
          language: data.language
        };

        // Handle speaker diarization if available
        if (result.words && result.words.length > 0) {
          const speakers = new Set(result.words.map((w: any) => w.speaker).filter(Boolean));
          if (speakers.size > 0) {
            metadata.speaker = `Speaker ${Array.from(speakers)[0]}`;
          }
        }

        // Call transcript callback
        if (this.transcriptCallback) {
          this.transcriptCallback(transcript, isFinal || speechFinal, metadata);
        }

      } catch (error) {
        console.error('Error processing Deepgram transcript:', error);
      }
    });

    // Handle errors
    this.liveTranscription.on(LiveTranscriptionEvents.Error, (error: Error) => {
      console.error('Deepgram error:', error);
      if (this.errorCallback) {
        this.errorCallback(error);
      }
    });

    // Handle connection close
    this.liveTranscription.on(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram connection closed');
      this.isInitialized = false;
      if (this.closeCallback) {
        this.closeCallback();
      }
    });

    // Handle metadata (optional, for debugging)
    this.liveTranscription.on(LiveTranscriptionEvents.Metadata, (data: any) => {
      console.log('Deepgram metadata:', data);
    });

    // Handle utterance end events
    this.liveTranscription.on(LiveTranscriptionEvents.UtteranceEnd, (data: any) => {
      console.log('Utterance ended');
      // Can be used for better segmentation
    });
  }

  /**
   * Send audio data to Deepgram
   */
  sendAudio(audioData: Buffer | ArrayBuffer): void {
    if (!this.isInitialized) {
      console.warn('Deepgram not initialized, cannot send audio');
      return;
    }

    try {
      // Convert to Buffer if needed
      const buffer = audioData instanceof Buffer 
        ? audioData 
        : Buffer.from(new Uint8Array(audioData));

      // Send to Deepgram
      this.liveTranscription.send(buffer);
    } catch (error) {
      console.error('Error sending audio to Deepgram:', error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
    }
  }

  /**
   * Close Deepgram connection
   */
  close(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Closing Deepgram connection...');
      
      // Send close frame
      if (this.liveTranscription) {
        this.liveTranscription.finish();
      }

      this.isInitialized = false;
    } catch (error) {
      console.error('Error closing Deepgram connection:', error);
    }
  }

  /**
   * Keep connection alive (call periodically if needed)
   */
  keepAlive(): void {
    if (this.isInitialized && this.liveTranscription) {
      try {
        this.liveTranscription.keepAlive();
      } catch (error) {
        console.error('Error sending keepalive:', error);
      }
    }
  }
}
