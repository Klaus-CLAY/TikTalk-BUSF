# 🚀 Quick Start Guide - Run TikTalk Locally

## ⚠️ Prerequisites

**You need Node.js installed first!**

1. Download Node.js from: **https://nodejs.org/**
2. Choose the **LTS version** (recommended)
3. Install it (restart your computer if needed)
4. Verify installation by opening PowerShell and running:
   ```powershell
   node --version
   npm --version
   ```

## 🎯 Running the App (2 Steps)

### Option 1: Using PowerShell Scripts (Easiest)

**Step 1: Start Backend Server**
- Open PowerShell in this folder
- Run: `.\start-backend.ps1`
- Keep this window open!

**Step 2: Start Frontend Server**
- Open a **NEW** PowerShell window in this folder
- Run: `.\start-frontend.ps1`
- Browser will open automatically!

### Option 2: Manual Commands

**Terminal 1 (Backend):**
```powershell
npm install express socket.io cors
node server.js
```

**Terminal 2 (Frontend):**
```powershell
npm start
```

## ✅ What You Should See

1. **Backend Terminal**: Shows "TikTalk WebSocket server running on port 3000"
2. **Frontend Terminal**: Shows server starting on port 8080
3. **Browser**: Opens to `http://localhost:8080` with the TikTalk app
4. **Connection Status**: Should show "Connected" in the app

## 🐛 Troubleshooting

### "npm is not recognized"
- **Solution**: Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### "Cannot find module 'express'"
- **Solution**: Run `npm install express socket.io cors` in the project folder

### "Port 3000 already in use"
- **Solution**: Close any other apps using port 3000, or change the port in `server.js`

### Connection fails in browser
- **Solution**: 
  1. Make sure backend is running (check Terminal 1)
  2. Open browser console (F12) and check for errors
  3. Verify `config.js` uses `http://localhost:3000`

## 📝 Notes

- You need **TWO terminal windows** - one for backend, one for frontend
- Keep both terminals open while using the app
- Press `Ctrl+C` in each terminal to stop the servers
- The app connects to `http://localhost:3000` for the WebSocket server

## 🎉 Ready to Chat!

Once both servers are running:
1. Click "Start Chatting" button
2. Wait for a match
3. Start chatting with other users!

