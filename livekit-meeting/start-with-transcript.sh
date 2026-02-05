#!/bin/bash

# Quick Start Script for LiveKit Meeting with Live Transcription
# This script starts the backend server with transcription support

echo "🚀 Starting LiveKit Meeting Backend with Live Transcription..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env and add your API keys:"
    echo "   - LIVEKIT_API_KEY"
    echo "   - LIVEKIT_API_SECRET"
    echo "   - DEEPGRAM_API_KEY"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if live-transcript is built
if [ ! -d "../live-transcript/dist" ]; then
    echo "🔨 Building live-transcript module..."
    cd ../live-transcript
    npm install
    npm run build
    cd ../livekit-meeting
    echo ""
fi

echo "✅ Starting backend server..."
echo "📡 Token endpoint: http://localhost:3001/api/token"
echo "📝 Transcript WebSocket: ws://localhost:3001/transcript"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run server
