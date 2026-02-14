@echo off
REM Start all transcription services for development on Windows

echo ========================================
echo 🚀 Starting Transcription Services...
echo ========================================
echo.

REM Start Whisper server
echo 1️⃣  Starting Whisper Server...
start "Whisper Server" cmd /k "cd transcription-server && python whisper_server.py"
timeout /t 3 /nobreak >nul

REM Start transcription bridge
echo 2️⃣  Starting Transcription Bridge...
start "Transcription Bridge" cmd /k "cd livekit-meeting && npm run transcription"
timeout /t 2 /nobreak >nul

REM Start main backend
echo 3️⃣  Starting LiveKit Backend...
start "LiveKit Backend" cmd /k "cd livekit-meeting && npm run server"
timeout /t 2 /nobreak >nul

REM Start frontend
echo 4️⃣  Starting Frontend...
start "Frontend" cmd /k "cd livekit-meeting && npm run dev"

echo.
echo ========================================
echo ✅ All services started!
echo ========================================
echo.
echo 📍 Services running at:
echo    Whisper Server:  ws://localhost:8765
echo    Bridge Server:   http://localhost:3002
echo    Backend Server:  http://localhost:3001
echo    Frontend:        http://localhost:3000
echo.
echo 🎤 Open http://localhost:3000 to test transcription!
echo.
echo To stop: Close all CMD windows or use Task Manager
echo.
pause
