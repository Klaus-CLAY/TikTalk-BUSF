# TikTalk Deployment Guide for Render

This guide will help you deploy TikTalk to Render successfully.

## Prerequisites

- A Render account (free tier works)
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Deploy the Backend Server (WebSocket)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your repository
4. Configure the service:
   - **Name**: `tiktalk-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: Leave empty (or create a `server` folder if you organize files differently)

5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `FRONTEND_URL` = `https://your-frontend-url.onrender.com` (update after deploying frontend)

6. Click **"Create Web Service"**

7. **Important**: Copy the server URL (e.g., `https://tiktalk-server-xxxx.onrender.com`)

### 2. Deploy the Frontend (Static Site)

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect your repository
3. Configure:
   - **Name**: `tiktalk` (or your preferred name)
   - **Build Command**: Leave empty
   - **Publish Directory**: `.` (root)

4. Click **"Create Static Site"**

5. **Important**: Copy the frontend URL (e.g., `https://tiktalk-xxxx.onrender.com`)

### 3. Update Configuration

1. Go back to your **Backend Server** settings
2. Update the `FRONTEND_URL` environment variable with your frontend URL
3. Save changes (this will restart the server)

4. In your code repository, update `config.js`:
   ```javascript
   const MANUAL_SERVER_URL = 'https://tiktalk-server-xxxx.onrender.com'; // Your server URL
   ```

5. Commit and push the change (Render will auto-deploy)

### 4. Verify Deployment

1. **Test Backend**: Visit `https://your-server-url.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"...","activeUsers":0,...}`

2. **Test Frontend**: Visit your frontend URL
   - Open browser console (F12)
   - Check for connection messages
   - Try starting a chat

## Troubleshooting

### Connection Issues

1. **Check Browser Console** (F12):
   - Look for WebSocket connection errors
   - Check if server URL is correct in console logs

2. **Verify Server URL**:
   - In `config.js`, ensure `MANUAL_SERVER_URL` matches your Render server URL
   - Server URL should be like: `https://tiktalk-server-xxxx.onrender.com`

3. **Check CORS**:
   - Server should allow your frontend origin
   - Verify `FRONTEND_URL` environment variable in Render

4. **Server Health Check**:
   - Visit: `https://your-server-url.onrender.com/health`
   - Should return JSON with server status

### Common Issues

**Issue**: "Failed to connect to chat server"
- **Solution**: Check server URL in `config.js` and ensure server is running

**Issue**: "CORS error"
- **Solution**: Update `FRONTEND_URL` in backend environment variables

**Issue**: Messages not sending
- **Solution**: Check browser console for WebSocket errors, verify server is connected

**Issue**: Service Worker errors
- **Solution**: Clear browser cache and reload, or disable service worker temporarily

## Features Checklist

After deployment, verify these features work:

- ✅ WebSocket connection
- ✅ Finding matches
- ✅ Sending/receiving messages
- ✅ Typing indicators
- ✅ Image sharing
- ✅ Emoji reactions
- ✅ Message search
- ✅ Settings (theme, notifications, etc.)
- ✅ Export chat
- ✅ Report/Block user

## Environment Variables Reference

### Backend (WebSocket Server)
- `NODE_ENV`: `production`
- `PORT`: `3000` (or Render's assigned port)
- `FRONTEND_URL`: Your frontend URL (for CORS)

### Frontend
- No environment variables needed (uses `config.js`)

## Support

If you encounter issues:
1. Check Render logs (Dashboard → Service → Logs)
2. Check browser console (F12)
3. Verify all URLs are correct
4. Ensure both services are running

