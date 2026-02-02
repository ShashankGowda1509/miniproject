# Deployment Guide - Interview AI Coach

## Problem: Why Can't My Friends Connect?

When running on **localhost** (like `http://localhost:5173`), only YOU can access the app on YOUR computer. Your friends cannot access your localhost URL - it will show "not found" or "connection refused" for them.

### Solution: Deploy the App

To let friends connect easily, deploy the app to a hosting service so everyone can access the same URL.

---

## Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

**Configuration files are included!** (`vercel.json` handles SPA routing)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   npm run build
   vercel --prod
   ```

4. **Done!** Vercel will give you a URL like `https://your-app.vercel.app`
   - Share this URL with friends
   - They can click the link and join your meetings instantly
   - The `vercel.json` file prevents "not found" errors on shared links

**Auto-redeploy on changes:**
- Connect your GitHub repo to Vercel
- Every push to `main` branch auto-deploys

---

### Option 2: Netlify

**Configuration files included!** (`netlify.toml` and `public/_redirects`)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Build and Deploy:**
   ```bash
   npm run build
   netlify deploy --prod
   ```

4. **Your app is live!** URL: `https://your-app.netlify.app`
   - The redirect rules prevent "not found" errors

**Or use drag-and-drop:**
- Run `npm run build`
- Go to https://app.netlify.com/drop
- Drag the `dist` folder
- Done!

---

### Option 3: Render

**Important:** Render configuration files are now included in the project!

1. **Files already created for you:**
   - `render.yaml` - Render configuration
   - Handles SPA routing (fixes "not found" errors)

2. **Push to GitHub**

3. **Connect to Render:**
   - Go to https://dashboard.render.com
   - Click "New" → "Static Site"  
   - Connect your GitHub repo
   - Render auto-detects `render.yaml` settings
   - Click "Create Static Site"

4. **Live URL:** `https://your-app.onrender.com`

**Troubleshooting "Not Found" errors:**
- The `render.yaml` file is configured to redirect all routes to `index.html`
- This is required for Single Page Applications (SPA)
- If you still get "not found", verify `render.yaml` is in your repo root
- Make sure the build command is `npm install && npm run build`
- Static publish path should be `./dist`

---

## Alternative: Both Run Locally (No Deployment)

If you don't want to deploy, both you and your friend must:

1. **Clone the repo** on your own computers
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run locally:**
   ```bash
   npm run dev
   ```
4. **Open:** `http://localhost:5173`

**Then to connect:**
- Person A: Creates meeting → Copies their **Peer ID** (not the link!)
- Person B: Opens their own localhost → Enters Person A's Peer ID → Joins

⚠️ **Important:** 
- Do NOT share localhost links - they won't work
- Only share the **Peer ID** (the long string of letters/numbers)
- Both must be running the app locally at the same time

---

## After Deploying

### For Host (Creating Meeting):
1. Go to your deployed URL: `https://your-app.vercel.app`
2. Click "Create Meeting"
3. Copy the **Link** (now it's a real URL, not localhost!)
4. Share with friends via WhatsApp, Discord, etc.

### For Guest (Joining):
1. Click the link your friend sent
2. Browser opens with Room ID already filled
3. Click "Join Meeting"
4. Allow camera/mic permissions
5. You're connected!

---

## Localhost Detection

The app now automatically detects if you're running on localhost and shows warnings:
- ⚠️ Yellow banners explaining localhost limitations
- Copy button only copies Peer ID (not useless localhost link)
- Clear instructions on what to do

When deployed, these warnings disappear and full link sharing works.

---

## Troubleshooting

### "Not Found" error when sharing Render/Vercel/Netlify links

**Problem:** Friend clicks your link and gets 404/Not Found error

**Cause:** Single Page Application (SPA) routing not configured on hosting platform

**Solution:**
✅ **Already fixed!** The following config files are now included:
- `render.yaml` - For Render deployments
- `vercel.json` - For Vercel deployments  
- `netlify.toml` - For Netlify deployments
- `public/_redirects` - Backup for Netlify

**What these files do:**
- Redirect all routes (like `/dashboard/live-meeting?room=xyz`) to `/index.html`
- Let React Router handle the routing client-side
- Prevent 404 errors on direct URL access

**If you still get "not found":**
1. Verify the config file is in your repo root
2. Make sure you pushed the latest changes to GitHub
3. Redeploy the app (delete and recreate if needed)
4. Check build logs for errors

### Opening in another tab not connecting

**Problem:** You copy the link, open in a new tab, but connection doesn't start

**Solution:**
✅ **Fixed!** The app now:
- Auto-fills the Room ID from URL parameter `?room=PEERID`
- Shows a toast notification when Room ID is detected
- You just need to click "Join Meeting" button

**Steps to test:**
1. Person A: Create meeting → Get URL with `?room=xxx`
2. Person A: Copy that URL, open in new tab or send to friend
3. Person B: Room ID auto-fills from URL
4. Person B: Click "Join Meeting" → Camera activates → Connection established

**Still not working?**
- Check browser console for errors (F12)
- Verify both users clicked "Join Meeting" (not just opened the page)
- Ensure camera/mic permissions are granted
- Both must be online simultaneously

### "Peer unavailable" error
- Make sure both users are online and in the meeting
- Verify the Peer ID is correct (no typos/extra spaces)
- Try refreshing and reconnecting

### Camera/microphone not working
- Check browser permissions (click lock icon in address bar)
- Make sure no other app is using camera
- Try a different browser (Chrome/Edge recommended)

### Connection slow or failing
- Check internet connection
- Firewall might be blocking WebRTC
- Try using mobile hotspot

---

## Recommended: Vercel with GitHub

Best workflow for continuous updates:

1. Push code to GitHub
2. Connect repo to Vercel
3. Vercel auto-deploys on every push
4. Your app is always up-to-date
5. Share the same permanent URL with everyone

**No more localhost problems!** 🎉
