#!/bin/bash

# Start all transcription services for development

echo "🚀 Starting Transcription Services..."
echo "======================================"

# Check if running on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    echo "📝 Detected Windows environment"
    
    # Start Whisper server
    echo ""
    echo "1️⃣  Starting Whisper Server..."
    cd transcription-server
    start cmd /k "python whisper_server.py"
    cd ..
    
    # Start transcription bridge
    echo ""
    echo "2️⃣  Starting Transcription Bridge..."
    cd livekit-meeting
    start cmd /k "npm run transcription"
    cd ..
    
    # Start main backend
    echo ""
    echo "3️⃣  Starting LiveKit Backend..."
    cd livekit-meeting
    start cmd /k "npm run server"
    cd ..
    
    # Start frontend
    echo ""
    echo "4️⃣  Starting Frontend..."
    cd livekit-meeting
    start cmd /k "npm run dev"
    cd ..
    
else
    # Unix-like (Mac/Linux)
    echo "📝 Detected Unix environment"
    
    # Start Whisper server
    echo ""
    echo "1️⃣  Starting Whisper Server..."
    cd transcription-server
    python whisper_server.py &
    WHISPER_PID=$!
    cd ..
    
    # Wait for Whisper to be ready
    sleep 3
    
    # Start transcription bridge
    echo ""
    echo "2️⃣  Starting Transcription Bridge..."
    cd livekit-meeting
    npm run transcription &
    BRIDGE_PID=$!
    cd ..
    
    # Wait for bridge to be ready
    sleep 2
    
    # Start main backend
    echo ""
    echo "3️⃣  Starting LiveKit Backend..."
    cd livekit-meeting
    npm run server &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to be ready
    sleep 2
    
    # Start frontend
    echo ""
    echo "4️⃣  Starting Frontend..."
    cd livekit-meeting
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Save PIDs for cleanup
    echo "$WHISPER_PID $BRIDGE_PID $BACKEND_PID $FRONTEND_PID" > .transcription_pids
fi

echo ""
echo "======================================"
echo "✅ All services started!"
echo "======================================"
echo ""
echo "📍 Services running at:"
echo "   Whisper Server:  ws://localhost:8765"
echo "   Bridge Server:   http://localhost:3002"
echo "   Backend Server:  http://localhost:3001"
echo "   Frontend:        http://localhost:3000"
echo ""
echo "🎤 Open http://localhost:3000 to test transcription!"
echo ""
echo "To stop all services:"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "   Close all the CMD windows"
else
    echo "   ./stop-transcription.sh"
fi
echo ""
