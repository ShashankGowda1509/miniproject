# Transcription Guide

## ✅ What Works

### Your Speech (Local)
- **Status**: ✅ Fully Working
- Your speech is captured using your device's microphone
- Appears in transcript as: `You: [your text]`
- Real-time transcription with grammar feedback
- Works on all browsers that support Web Speech API (Chrome, Edge, Safari)

### Friend's Speech (Remote)
- **Status**: ⚠️ Browser Dependent
- Web Speech API has **limitations** with remote audio streams
- Some browsers may not support remote stream transcription
- If it works, appears as: `Friend: [their text]`
- Depends on browser's implementation of Web Audio API + Speech Recognition

## 🧪 Testing Instructions

### Test Locally (Same Computer)
1. Open first tab: `http://localhost:8083/dashboard/live-meeting`
2. Click "Join Meeting" (leave Room ID empty)
3. Copy your Peer ID from bottom
4. Open second tab in **different browser** or **incognito mode**
5. Paste Peer ID in Room ID field
6. Click "Join Meeting"
7. **Test transcription**:
   - Speak in first tab → Should see "You: [text]" in first tab's transcript
   - Speak in second tab → Should see "You: [text]" in second tab's transcript
   - Cross-transcription (seeing friend's speech) may not work locally

### Test with Friend (Real Use Case)
1. **Person A**: Deploy to Render and share link
2. **Person B**: Click link and join
3. Both should see:
   - Their own video ("You")
   - Friend's video ("Friend")
   - Their own speech in transcript: "You: [text]"
4. **Expected Behavior**:
   - Your own speech → Always works ✅
   - Friend's speech → May work depending on browser ⚠️

## 🔧 Technical Details

### Why Remote Transcription is Challenging

The Web Speech API (`SpeechRecognition`) was designed to work with:
- Local microphone input via `getUserMedia()`
- User's device audio input

It was **NOT** designed for:
- Remote peer audio streams from WebRTC
- Transcribing someone else's audio

### What We're Doing

We're using a workaround:
```javascript
// Route remote stream through Web Audio API
AudioContext → MediaStreamSource → GainNode → Destination
             → Try to feed to SpeechRecognition
```

This **may work** in some browsers/situations, but it's not guaranteed.

## 🌐 Browser Compatibility

| Browser | Your Speech | Friend's Speech |
|---------|------------|-----------------|
| Chrome  | ✅ Yes     | ⚠️ Maybe        |
| Edge    | ✅ Yes     | ⚠️ Maybe        |
| Safari  | ✅ Yes     | ❌ Unlikely     |
| Firefox | ❌ No      | ❌ No           |

*Note: Firefox doesn't support Web Speech API for Speech Recognition*

## 💡 Best Practices

1. **Use Chrome or Edge** for best results
2. **Both users should speak clearly** and one at a time
3. **Check browser console** (F12) for transcription logs:
   - `✅ Remote transcription started` = Good
   - `❌ Remote recognition error` = Issue detected
4. **Verify microphone permissions** are granted
5. **Test in a quiet environment** for better recognition

## 🐛 Troubleshooting

### Problem: Only seeing my speech, not friend's

**Possible Causes:**
1. Browser doesn't support remote stream transcription
2. Microphone permissions not granted on friend's side
3. Audio quality/network issues
4. Browser security restrictions

**Solutions:**
- ✅ Both users can still see their own transcript
- ✅ You can still hear each other clearly
- ✅ The call functionality works perfectly
- ℹ️ Transcription limitation doesn't affect call quality

### Problem: No transcription at all

**Check:**
1. Browser supports Web Speech API (use Chrome/Edge)
2. Microphone permissions granted
3. Not using Firefox (unsupported)
4. Check browser console for errors

## 📝 Current Implementation Status

**Commit**: f01343c

**Features:**
- ✅ Reliable 1-to-1 video calls
- ✅ Your own speech transcription (local)
- ⚠️ Friend's speech transcription (best effort, browser-dependent)
- ✅ Grammar feedback on your speech
- ✅ Visual indicators for transcription status
- ✅ Proper cleanup on disconnect

**Known Limitations:**
- Remote audio transcription is not guaranteed across all browsers
- Web Speech API limitation, not a bug in our code
- Alternative: Both users can see their own transcripts
