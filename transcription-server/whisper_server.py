#!/usr/bin/env python3
"""
High-Performance Whisper Transcription Server
Optimized for 3-4 concurrent users with streaming audio
"""

import asyncio
import json
import logging
import os
import wave
import io
from datetime import datetime
from typing import Dict, Set
import numpy as np

import websockets
from websockets.server import WebSocketServerProtocol
from faster_whisper import WhisperModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")  # small for best balance of speed and accuracy
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")  # int8 for CPU
NUM_WORKERS = int(os.getenv("WHISPER_WORKERS", "4"))  # Max concurrent transcriptions
PORT = int(os.getenv("PORT", "8765"))

# Audio settings
SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2  # 16-bit audio

# Transcription settings - optimized for accuracy
BEAM_SIZE = 5
BEST_OF = 5  # Number of candidates when sampling
TEMPERATURE = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]  # Try different temperatures for better accuracy
VAD_FILTER = True
VAD_PARAMETERS = {
    "threshold": 0.5,
    "min_speech_duration_ms": 250,
    "min_silence_duration_ms": 500
}
MIN_CHUNK_DURATION = 2.0  # Require at least 2 seconds of audio
MAX_CHUNK_DURATION = 30.0  # seconds


class TranscriptionSession:
    """Manages a single user's transcription session"""
    
    def __init__(self, session_id: str, speaker_name: str):
        self.session_id = session_id
        self.speaker_name = speaker_name
        self.audio_buffer = bytearray()
        self.is_transcribing = False
        self.last_transcript = ""
        self.created_at = datetime.now()
        logger.info(f"Created session {session_id} for speaker {speaker_name}")
    
    def add_audio(self, audio_data: bytes):
        """Add audio data to buffer"""
        self.audio_buffer.extend(audio_data)
    
    def get_audio_duration(self) -> float:
        """Calculate duration of buffered audio in seconds"""
        num_frames = len(self.audio_buffer) // (SAMPLE_WIDTH * CHANNELS)
        return num_frames / SAMPLE_RATE
    
    def get_audio_array(self) -> np.ndarray:
        """Convert audio buffer to numpy array for Whisper"""
        audio_array = np.frombuffer(self.audio_buffer, dtype=np.int16)
        # Convert to float32 and normalize to [-1, 1]
        audio_float = audio_array.astype(np.float32) / 32768.0
        return audio_float
    
    def clear_buffer(self):
        """Clear the audio buffer after transcription"""
        self.audio_buffer.clear()


class WhisperTranscriptionServer:
    """WebSocket server for real-time Whisper transcription"""
    
    def __init__(self):
        self.model = None
        self.sessions: Dict[str, TranscriptionSession] = {}
        self.active_connections: Set[WebSocketServerProtocol] = set()
        self.transcription_queue = asyncio.Queue(maxsize=NUM_WORKERS * 2)
        self.is_running = False
        
    async def initialize(self):
        """Load Whisper model"""
        logger.info(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE}")
        logger.info(f"Compute type: {COMPUTE_TYPE}")
        
        try:
            self.model = WhisperModel(
                MODEL_SIZE,
                device=DEVICE,
                compute_type=COMPUTE_TYPE,
                num_workers=NUM_WORKERS,
                download_root=os.getenv("MODEL_CACHE_DIR", "./models")
            )
            logger.info("✅ Whisper model loaded successfully")
            self.is_running = True
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            raise
    
    async def transcribe_audio(self, session: TranscriptionSession) -> dict:
        """Transcribe audio buffer using faster-whisper"""
        if session.is_transcribing:
            logger.warning(f"Session {session.session_id} is already transcribing")
            return None
        
        duration = session.get_audio_duration()
        if duration < MIN_CHUNK_DURATION:
            logger.debug(f"Audio chunk too short: {duration:.2f}s")
            return None
        
        session.is_transcribing = True
        
        try:
            audio_array = session.get_audio_array()
            logger.info(f"Transcribing {duration:.2f}s of audio for {session.speaker_name}")
            
            # Transcribe with optimized settings for accuracy
            segments, info = self.model.transcribe(
                audio_array,
                beam_size=BEAM_SIZE,
                best_of=BEST_OF,
                temperature=TEMPERATURE,
                vad_filter=VAD_FILTER,
                vad_parameters=VAD_PARAMETERS,
                word_timestamps=True,
                language="en",
                condition_on_previous_text=True,
                compression_ratio_threshold=2.4,
                log_prob_threshold=-0.8,  # Stricter - reject low confidence
                no_speech_threshold=0.8,  # Much stricter - reject non-speech
                initial_prompt="This is a conversation with clear speech. Names include Shashank Gowda K."
            )
            
            # Collect all segments
            transcript_parts = []
            for segment in segments:
                transcript_parts.append(segment.text.strip())
            
            full_transcript = " ".join(transcript_parts).strip()
            
            if full_transcript:
                logger.info(f"Transcription: [{session.speaker_name}] {full_transcript}")
                session.last_transcript = full_transcript
                
                return {
                    "type": "transcript",
                    "sessionId": session.session_id,
                    "speaker": session.speaker_name,
                    "text": full_transcript,
                    "isFinal": True,
                    "timestamp": datetime.now().isoformat(),
                    "duration": duration,
                    "language": info.language,
                    "language_probability": info.language_probability
                }
            else:
                logger.debug("No speech detected in audio chunk")
                return None
                
        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            return {
                "type": "error",
                "sessionId": session.session_id,
                "message": str(e)
            }
        finally:
            session.is_transcribing = False
            session.clear_buffer()
    
    async def handle_message(self, websocket: WebSocketServerProtocol, message: str):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "init":
                # Initialize new transcription session
                session_id = data.get("sessionId")
                speaker_name = data.get("speakerName", "Unknown")
                
                if session_id not in self.sessions:
                    session = TranscriptionSession(session_id, speaker_name)
                    self.sessions[session_id] = session
                    
                    await websocket.send(json.dumps({
                        "type": "ready",
                        "sessionId": session_id,
                        "message": "Transcription session initialized"
                    }))
                    logger.info(f"Session initialized: {session_id}")
                
            elif msg_type == "close":
                # Close transcription session
                session_id = data.get("sessionId")
                if session_id in self.sessions:
                    del self.sessions[session_id]
                    logger.info(f"Session closed: {session_id}")
                    
                    await websocket.send(json.dumps({
                        "type": "closed",
                        "sessionId": session_id
                    }))
            
            elif msg_type == "ping":
                # Health check
                await websocket.send(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat(),
                    "activeSessions": len(self.sessions)
                }))
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON message received")
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
    
    async def handle_audio(self, websocket: WebSocketServerProtocol, audio_data: bytes):
        """Handle incoming audio data"""
        try:
            # First 36 bytes contain session ID (assuming fixed length)
            # Format: sessionId (32 bytes) + audio data
            if len(audio_data) < 36:
                logger.warning("Audio packet too small")
                return
            
            session_id = audio_data[:36].decode('utf-8').strip('\x00')
            audio_chunk = audio_data[36:]
            
            if session_id not in self.sessions:
                logger.warning(f"Unknown session: {session_id}")
                return
            
            session = self.sessions[session_id]
            session.add_audio(audio_chunk)
            
            # Check if we should transcribe
            duration = session.get_audio_duration()
            
            if duration >= MIN_CHUNK_DURATION and not session.is_transcribing:
                # Transcribe in background
                result = await self.transcribe_audio(session)
                
                if result:
                    # Send transcript to all connected clients
                    await self.broadcast(result)
                    
        except Exception as e:
            logger.error(f"Error handling audio: {e}", exc_info=True)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        message_str = json.dumps(message)
        disconnected = set()
        
        for websocket in self.active_connections:
            try:
                await websocket.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.add(websocket)
        
        # Remove disconnected clients
        self.active_connections -= disconnected
    
    async def handle_client(self, websocket: WebSocketServerProtocol):
        """Handle a client connection"""
        self.active_connections.add(websocket)
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        logger.info(f"Client connected: {client_id}")
        
        try:
            async for message in websocket:
                if isinstance(message, str):
                    # Text message (JSON)
                    await self.handle_message(websocket, message)
                elif isinstance(message, bytes):
                    # Binary message (audio data)
                    await self.handle_audio(websocket, message)
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {client_id}")
        except Exception as e:
            logger.error(f"Error with client {client_id}: {e}", exc_info=True)
        finally:
            self.active_connections.discard(websocket)
    
    async def run(self):
        """Start the WebSocket server"""
        await self.initialize()
        
        logger.info(f"🚀 Starting Whisper transcription server on port {PORT}")
        logger.info(f"📊 Max concurrent users: {NUM_WORKERS}")
        logger.info(f"🎤 Audio format: {SAMPLE_RATE}Hz, {CHANNELS} channel(s), {SAMPLE_WIDTH*8}-bit")
        
        async with websockets.serve(
            self.handle_client,
            "0.0.0.0",
            PORT,
            max_size=10_000_000,  # 10MB max message size
            ping_interval=20,
            ping_timeout=20
        ):
            logger.info("✅ Server is ready to accept connections")
            await asyncio.Future()  # Run forever


async def main():
    """Main entry point"""
    server = WhisperTranscriptionServer()
    try:
        await server.run()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
