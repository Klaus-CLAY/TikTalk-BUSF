# TikTalk - Bicol University Random Chat

A modern, anonymous random chat application for Bicol University students built with WebSockets.

## Features

- 🔄 Real-time chat with WebSocket connections
- 🎯 Random matching with other BU students
- 📷 Image sharing support
- 😊 Emoji reactions
- 🔍 Message search
- 📊 Chat statistics
- 💾 Export chat (TXT, JSON, CSV, HTML)
- 🎨 Dark/Light theme support
- 📱 Mobile responsive design
- 🔔 Desktop notifications
- 🛡️ Report/Block users
- ⚡ PWA support (installable)

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express, Socket.io
- **Deployment**: Render (Static Site + Web Service)

## Quick Start (Local Development)

### Prerequisites
- Node.js 16+ installed
- npm or yarn

### Frontend Setup

1. Clone the repository
2. Open terminal in project root
3. Install dependencies (if any):
   ```bash
   npm install
   ```
4. Start local server:
   ```bash
   npm start
   ```
5. Open browser to `http://localhost:8080`

### Backend Setup

1. The server files are in the root directory
2. For local development, you can use `package-server.json`:
   ```bash
   # Copy server package.json
   cp package-server.json package.json
   npm install
   npm start
   ```
3. Server will run on `http://localhost:3000`

### Configuration

Update `config.js` to point to your server:
```javascript
const MANUAL_SERVER_URL = 'http://localhost:3000'; // For local dev
```

## Deployment to Render

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment Steps:

1. **Deploy Backend (WebSocket Server)**:
   - Create new Web Service on Render
   - Use `package-server.json` as `package.json` (or copy it)
   - Set environment variables (see DEPLOYMENT.md)
   - Copy the server URL

2. **Deploy Frontend (Static Site)**:
   - Create new Static Site on Render
   - Point to repository root
   - Copy the frontend URL

3. **Update Configuration**:
   - Update `config.js` with your server URL
   - Update backend `FRONTEND_URL` environment variable
   - Redeploy both services

## Project Structure

```
.
├── index.html          # Main HTML file
├── script.js          # Frontend JavaScript
├── styles.css         # Styles
├── config.js          # Configuration
├── server.js          # WebSocket server
├── sw.js              # Service worker (PWA)
├── manifest.json      # PWA manifest
├── package.json       # Frontend package.json
├── package-server.json # Server package.json
├── render.yaml        # Render config (frontend)
├── render-server.yaml # Render config (server)
└── DEPLOYMENT.md      # Deployment guide
```

## Important Notes

### For Render Deployment:

1. **Server Package.json**: 
   - Render needs `package.json` in root for server deployment
   - You can either:
     - Copy `package-server.json` to `package.json` before deploying server
     - Or use Render's build command: `cp package-server.json package.json && npm install`

2. **Configuration**:
   - Update `config.js` with your actual Render server URL
   - Update `FRONTEND_URL` in backend environment variables

3. **CORS**:
   - Server automatically allows Render origins
   - Set `FRONTEND_URL` environment variable for production

## Features in Detail

### Chat Features
- Real-time messaging via WebSocket
- Typing indicators
- Message status (sent/delivered/read)
- Message editing (within 5 minutes)
- Message deletion
- Date separators
- Relative timestamps

### Media
- Image sharing (max 5MB)
- Image captions
- Base64 encoding for images

### User Experience
- Auto-scroll to new messages
- Jump to bottom button
- Message search with highlighting
- Keyboard shortcuts (Ctrl+F, Ctrl+K)
- Character counter (500 char limit)
- Rate limiting (10 messages/minute)

### Safety
- Report user functionality
- Block user functionality
- Content filtering (optional)
- Privacy notices

### Customization
- Theme selection (Dark/Light/Auto)
- Font size adjustment
- Sound notifications toggle
- Desktop notifications
- Auto-scroll toggle

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

## Support

For issues or questions:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
2. Check browser console (F12) for errors
3. Verify server health: `https://your-server-url.onrender.com/health`

