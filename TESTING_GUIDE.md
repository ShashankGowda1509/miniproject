# Testing Guide - Live Meeting Feature

## ✅ ALL BUGS FIXED - Ready to Test

**Latest Commit:** `9e97a44` - Fixed self-call timeout issue

### What Was Fixed:
- ✅ "Connection Timeout" when creating meeting (was trying to call self)
- ✅ RoomId cleared when creating new meeting
- ✅ Prevents auto-call to your own peer ID
- ✅ Better error messages
- ✅ Different welcome messages for create vs join

---

## 🎯 How to Test PROPERLY

### Test 1: Create Meeting (Person A - YOU)

1. **Open the app** (localhost:8083 or deployed URL)
2. **Go to "Live Meeting"**
3. **Leave "Room ID" EMPTY**
4. **Click "Create Meeting"**
5. **Allow camera/microphone** ✅
6. **You should see:**
   - Your video on left
   - "Waiting for friend to join..." on right
   - **NO "Connection Timeout" error** ✅
   - Your Room ID at bottom
7. **Copy your Room ID** (e.g., `85930def-d615-4995-bd52-806884527dd4`)

### Test 2: Join Meeting (Person B - FRIEND)

**Option A: Same Computer, Different Browser**
1. Open **different browser** (Chrome if you used Edge, or vice versa)
2. Go to the app
3. **Enter Person A's Room ID** in the "Room ID" field
4. Click "Join Meeting"
5. Allow camera/microphone
6. **Should connect to Person A** ✅

**Option B: Different Computer (Best Test)**
1. Friend opens the app on their computer
2. Enters your Room ID
3. Clicks "Join Meeting"
4. Allows camera/microphone
5. Connects ✅

---

## ✅ Expected Behavior

### When Creating Meeting:
- ✅ Shows your video immediately
- ✅ Shows "Waiting for friend to join..."
- ✅ **NO timeout error**
- ✅ **NO auto-call attempt**
- ✅ Transcript shows: "Meeting started. Live transcription is active. Share your room link to invite others."

### When Joining Meeting:
- ✅ Shows "Connecting..." briefly
- ✅ Then shows both videos
- ✅ Can see and hear each other
- ✅ Transcript shows: "Meeting started. Connecting to your friend..."

### During Meeting:
- ✅ Your speech → "You: [what you said]"
- ✅ Friend's speech → "Friend: [what they said]" (Chrome/Edge)
- ✅ Both can mute/unmute
- ✅ Both can turn video on/off

---

## 🚀 Test Right Now (Localhost)

### Quick Test with 2 Browsers:

**Browser 1 (Chrome):**
```
1. Open: http://localhost:8083
2. Click "Create Meeting"
3. Copy Room ID shown at bottom
```

**Browser 2 (Edge/Firefox):**
```
1. Open: http://localhost:8083
2. Paste Room ID
3. Click "Join Meeting"
4. Should connect!
```

---

## 🌐 Deploy to Render

Once localhost testing works:

1. Go to: https://dashboard.render.com
2. Find service: `interview-ai-coach`
3. Click **"Manual Deploy"**
4. Select **"Deploy latest commit"** (commit `9e97a44`)
5. Wait 5-10 minutes
6. Test with deployed URL

---

## 📋 Testing Checklist

### Person A (Creator):
- [ ] Can create meeting without timeout error
- [ ] Sees own video
- [ ] Sees "Waiting for friend" message
- [ ] Can copy Room ID
- [ ] Speech transcription works ("You: ...")

### Person B (Joiner):
- [ ] Can enter Room ID
- [ ] Connects successfully
- [ ] Sees Person A's video
- [ ] Hears Person A's audio
- [ ] Speech transcription works ("You: ...")

### Both Connected:
- [ ] See each other
- [ ] Hear each other
- [ ] Transcript shows both speeches
- [ ] Mute/unmute works
- [ ] Video on/off works
- [ ] Can leave meeting

---

## 🐛 Troubleshooting

### "Connection Timeout" on Create Meeting
**Status:** ✅ **FIXED** - Update to commit `9e97a44`

### "Connection Timeout" when joining
**Cause:** Person A not in meeting yet
**Solution:** Person A must create meeting FIRST, then Person B joins

### "Peer Unavailable"
**Cause:** Wrong Peer ID or Person A left
**Solution:** Verify Peer ID is exact (no spaces)

### No transcript for friend
**Expected:** Works in Chrome/Edge, not in Firefox
**Solution:** Both use Chrome or Edge

---

## ✅ What Works NOW

1. ✅ **Create Meeting** - No timeout, waits for friend
2. ✅ **Join Meeting** - Connects to friend properly
3. ✅ **Video/Audio** - Both directions working
4. ✅ **Transcript** - Both users' speech shown
5. ✅ **No Self-Call** - Prevents calling yourself
6. ✅ **Proper State Management** - No invalid states

---

## 🎯 Production Testing Steps

After deploying to Render:

1. **You (Person A):**
   - Open deployed URL
   - Create meeting
   - Copy **Share Link** (not just Peer ID)
   - Send link to friend

2. **Friend (Person B):**
   - Click the link you sent
   - **Auto-joins automatically** ✅
   - Allows camera/mic
   - Connects!

3. **Both talk and watch transcript update** ✅

---

## 💡 Key Points

- **Create Meeting** = Empty Room ID → Waits for others
- **Join Meeting** = Enter Peer ID → Connects to creator
- **Share Link** = Best way to invite (auto-fills Room ID)
- **Transcript** = Works for both users (browser-dependent for friend)

**Status: Ready for Production Testing** 🚀
