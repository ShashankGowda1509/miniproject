#!/bin/bash
# Start both backend and frontend

# Start backend in background
cd backend && npx tsx server.ts &

# Wait a bit for backend to start
sleep 3

# Start Next.js frontend
cd .. && npm start
