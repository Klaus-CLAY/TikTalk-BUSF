# ✅ TikTalk Render Setup Checklist

## Step 1: Get Your URLs from Render Dashboard

- [ ] Go to https://dashboard.render.com
- [ ] Click on **"TikTalk-Server"** service
- [ ] Copy the backend URL (e.g., `https://tiktalk-server-abc123.onrender.com`)
- [ ] Click on **"TikTalk-BUSF"** service  
- [ ] Copy the frontend URL (e.g., `https://tiktalk-busf-xyz789.onrender.com`)

## Step 2: Update config.js

- [ ] Open `config.js` file
- [ ] Find line 16: `const MANUAL_SERVER_URL = '';`
- [ ] Paste your **backend server URL** between the quotes
- [ ] Example: `const MANUAL_SERVER_URL = 'https://tiktalk-server-abc123.onrender.com';`
- [ ] Save the file

## Step 3: Update Backend Environment Variable

- [ ] Go to Render Dashboard → **TikTalk-Server** → **Environment** tab
- [ ] Find `FRONTEND_URL` variable
- [ ] Update it with your **frontend URL** (e.g., `https://tiktalk-busf-xyz789.onrender.com`)
- [ ] Click **Save Changes** (server will restart)

## Step 4: Deploy Changes

- [ ] Commit the updated `config.js`:
   ```bash
   git add config.js
   git commit -m "Update server URL configuration"
   git push
   ```
- [ ] Wait for Render to auto-deploy (check Render dashboard)

## Step 5: Verify Everything Works

- [ ] Visit your frontend URL
- [ ] Open browser console (F12)
- [ ] Look for: `✅ Server health check passed`
- [ ] Check connection status shows "Connected"
- [ ] Try clicking "Start Chatting" button

## 🐛 If Something Doesn't Work

1. **Connection fails?**
   - Check browser console (F12) for errors
   - Verify server URL in console logs matches your Render URL
   - Test: Visit `https://your-server-url.onrender.com/health`

2. **CORS errors?**
   - Make sure `FRONTEND_URL` in backend environment matches your exact frontend URL
   - Include `https://` in the URL

3. **Still not working?**
   - Double-check both URLs are correct (no typos)
   - Make sure both services show "Live" status in Render
   - Check Render logs for any errors

## 📝 Quick Reference

- **Backend URL**: Where your WebSocket server runs
- **Frontend URL**: Where your website is hosted
- **config.js**: Tells frontend where to find the backend
- **FRONTEND_URL**: Tells backend which frontend to allow (CORS)

