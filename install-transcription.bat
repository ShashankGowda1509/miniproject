@echo off
REM Install all dependencies for transcription feature

echo ========================================
echo 📦 Installing Transcription Dependencies
echo ========================================
echo.

REM Check Python
echo 🐍 Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)
python --version
echo.

REM Check Node.js
echo 📦 Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo.

REM Install Python dependencies
echo ========================================
echo 1️⃣  Installing Python Dependencies...
echo ========================================
cd transcription-server
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)
echo ✅ Python dependencies installed
cd ..
echo.

REM Install Node.js dependencies
echo ========================================
echo 2️⃣  Installing Node.js Dependencies...
echo ========================================
cd livekit-meeting
call npm install
if errorlevel 1 (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)
echo ✅ Node.js dependencies installed
cd ..
echo.

echo ========================================
echo ✅ Installation Complete!
echo ========================================
echo.
echo 📝 Next steps:
echo    1. Configure environment variables (see .env.example files)
echo    2. Run: start-transcription.bat
echo    3. Open: http://localhost:3000
echo.
echo 📚 Documentation:
echo    - Quick Start: TRANSCRIPTION_QUICKSTART.md
echo    - Full Guide:  TRANSCRIPTION_README.md
echo    - Deployment:  TRANSCRIPTION_DEPLOYMENT.md
echo.
pause
