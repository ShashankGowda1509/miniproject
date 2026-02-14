#!/usr/bin/env python3
"""
Test script for Whisper transcription server
"""

import asyncio
import json
import sys
from websockets import connect

WHISPER_SERVER_URL = "ws://localhost:8765"

async def test_whisper_connection():
    """Test basic connection to Whisper server"""
    print("🔗 Testing Whisper server connection...")
    
    try:
        async with connect(WHISPER_SERVER_URL) as websocket:
            print("✅ Connected to Whisper server")
            
            # Send ping
            await websocket.send(json.dumps({"type": "ping"}))
            print("📤 Sent ping")
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "pong":
                print(f"✅ Received pong: {data}")
                print(f"   Active sessions: {data.get('activeSessions', 0)}")
                return True
            else:
                print(f"❌ Unexpected response: {data}")
                return False
                
    except asyncio.TimeoutError:
        print("❌ Timeout waiting for response")
        return False
    except ConnectionRefusedError:
        print("❌ Connection refused - is the server running?")
        print("   Start it with: python whisper_server.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

async def test_session_init():
    """Test session initialization"""
    print("\n🎬 Testing session initialization...")
    
    try:
        async with connect(WHISPER_SERVER_URL) as websocket:
            # Initialize session
            init_message = {
                "type": "init",
                "sessionId": "test-session-123",
                "speakerName": "Test User"
            }
            
            await websocket.send(json.dumps(init_message))
            print("📤 Sent init message")
            
            # Wait for ready response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "ready":
                print(f"✅ Session initialized: {data}")
                
                # Close session
                close_message = {
                    "type": "close",
                    "sessionId": "test-session-123"
                }
                await websocket.send(json.dumps(close_message))
                
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                print(f"✅ Session closed: {data}")
                
                return True
            else:
                print(f"❌ Unexpected response: {data}")
                return False
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 Whisper Transcription Server Test Suite")
    print("=" * 60)
    
    results = []
    
    # Test 1: Connection
    result = await test_whisper_connection()
    results.append(("Connection", result))
    
    if not result:
        print("\n❌ Cannot proceed with other tests - server not responding")
        sys.exit(1)
    
    # Test 2: Session management
    result = await test_session_init()
    results.append(("Session Management", result))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results:")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
