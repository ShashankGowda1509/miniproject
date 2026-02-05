@echo off
REM Quick Start Script for LiveKit Meeting with Live Transcription
REM This script starts the backend server with transcription support

echo.
echo 🚀 Starting LiveKit Meeting Backend with Live Transcription...
echo.

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo 📝 Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  Please edit .env and add your API keys:
    echo    - LIVEKIT_API_KEY
    echo    - LIVEKIT_API_SECRET
    echo    - DEEPGRAM_API_KEY
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

REM Check if live-transcript is built
if not exist "..\live-transcript\dist" (
    echo 🔨 Building live-transcript module...
    cd ..\live-transcript
    call npm install
    call npm run build
    cd ..\livekit-meeting
    echo.
)

echo ✅ Starting backend server...
echo 📡 Token endpoint: http://localhost:3001/api/token
echo 📝 Transcript WebSocket: ws://localhost:3001/transcript
echo.
echo Press Ctrl+C to stop the server
echo.

npm run server
