// TikTalk WebSocket Server
// Real-time chat server for Bicol University students

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.io
const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL] 
    : ["*"]; // Allow all origins if FRONTEND_URL not set

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            // Allow all origins in development, or specific origin in production
            if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                // Also allow common Render patterns
                if (origin.includes('onrender.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
                    callback(null, true);
                } else {
                    console.warn(`CORS blocked origin: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

console.log('CORS configured for origins:', allowedOrigins);

// Enable CORS for Express
app.use(cors());
app.use(express.json());

// Store active users waiting for matches
const waitingQueue = [];
// Store active chat pairs: { roomId: { user1: socketId, user2: socketId } }
const activeChats = new Map();
// Store user info: { socketId: { id, campus, status } }
const users = new Map();

// Helper function to generate room ID
function generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to find match
function findMatch(currentUser) {
    // Find a compatible user from the queue
    for (let i = 0; i < waitingQueue.length; i++) {
        const waitingUser = waitingQueue[i];
        
        // Don't match with yourself
        if (waitingUser.socketId === currentUser.socketId) continue;
        
        // Optional: Add campus matching logic here
        // if (currentUser.campus && waitingUser.campus && currentUser.campus === waitingUser.campus) {
        //     return waitingUser;
        // }
        
        // Return first available user
        return waitingUser;
    }
    return null;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // User joins waiting queue
    socket.on('find-match', (userData) => {
        const userInfo = {
            socketId: socket.id,
            id: userData.id || socket.id,
            campus: userData.campus || null,
            joinedAt: new Date()
        };
        
        users.set(socket.id, userInfo);
        
        // Check if there's a match available
        const match = findMatch(userInfo);
        
        if (match) {
            // Remove matched user from queue
            const matchIndex = waitingQueue.findIndex(u => u.socketId === match.socketId);
            if (matchIndex !== -1) {
                waitingQueue.splice(matchIndex, 1);
            }
            
            // Create chat room
            const roomId = generateRoomId();
            activeChats.set(roomId, {
                user1: socket.id,
                user2: match.socketId,
                createdAt: new Date()
            });
            
            // Join both users to the room
            socket.join(roomId);
            io.to(match.socketId).socketsJoin(roomId);
            
            // Notify both users
            socket.emit('matched', { roomId, partnerId: match.id });
            io.to(match.socketId).emit('matched', { roomId, partnerId: userInfo.id });
            
            console.log(`Match created: ${socket.id} <-> ${match.socketId} in room ${roomId}`);
        } else {
            // Add to waiting queue
            waitingQueue.push(userInfo);
            socket.emit('waiting', { message: 'Looking for a match...' });
            console.log(`User ${socket.id} added to queue. Queue size: ${waitingQueue.length}`);
        }
    });
    
    // Handle new message
    socket.on('send-message', (data) => {
        const { roomId, message, messageId, image } = data;
        
        if (!roomId || !activeChats.has(roomId)) {
            socket.emit('error', { message: 'Invalid chat room' });
            return;
        }
        
        const chat = activeChats.get(roomId);
        const isUser1 = chat.user1 === socket.id;
        const recipientId = isUser1 ? chat.user2 : chat.user1;
        
        // Broadcast message to the other user in the room
        io.to(recipientId).emit('new-message', {
            messageId,
            message,
            image: image || null,
            timestamp: new Date(),
            senderId: socket.id
        });
        
        // Confirm message sent
        socket.emit('message-sent', { messageId });
        
        console.log(`Message sent in room ${roomId} from ${socket.id}${image ? ' (with image)' : ''}`);
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
        const { roomId } = data;
        
        if (!roomId || !activeChats.has(roomId)) {
            return;
        }
        
        const chat = activeChats.get(roomId);
        const recipientId = chat.user1 === socket.id ? chat.user2 : chat.user1;
        
        io.to(recipientId).emit('partner-typing', { isTyping: true });
    });
    
    socket.on('stop-typing', (data) => {
        const { roomId } = data;
        
        if (!roomId || !activeChats.has(roomId)) {
            return;
        }
        
        const chat = activeChats.get(roomId);
        const recipientId = chat.user1 === socket.id ? chat.user2 : chat.user1;
        
        io.to(recipientId).emit('partner-typing', { isTyping: false });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        // Remove from waiting queue
        const queueIndex = waitingQueue.findIndex(u => u.socketId === socket.id);
        if (queueIndex !== -1) {
            waitingQueue.splice(queueIndex, 1);
        }
        
        // Handle active chat disconnection
        for (const [roomId, chat] of activeChats.entries()) {
            if (chat.user1 === socket.id || chat.user2 === socket.id) {
                const partnerId = chat.user1 === socket.id ? chat.user2 : chat.user1;
                
                // Notify partner
                io.to(partnerId).emit('partner-disconnected', { roomId });
                
                // Clean up
                activeChats.delete(roomId);
                users.delete(socket.id);
                users.delete(partnerId);
                
                console.log(`Chat room ${roomId} closed`);
                break;
            }
        }
        
        users.delete(socket.id);
    });
    
    // Handle new match request (skip current partner)
    socket.on('new-match', () => {
        // Find and close current chat
        for (const [roomId, chat] of activeChats.entries()) {
            if (chat.user1 === socket.id || chat.user2 === socket.id) {
                const partnerId = chat.user1 === socket.id ? chat.user2 : chat.user1;
                
                // Notify partner
                io.to(partnerId).emit('partner-left', { roomId });
                
                // Clean up
                activeChats.delete(roomId);
                users.delete(partnerId);
                break;
            }
        }
        
        // Start looking for new match
        const userInfo = users.get(socket.id);
        if (userInfo) {
            const match = findMatch(userInfo);
            
            if (match) {
                const matchIndex = waitingQueue.findIndex(u => u.socketId === match.socketId);
                if (matchIndex !== -1) {
                    waitingQueue.splice(matchIndex, 1);
                }
                
                const roomId = generateRoomId();
                activeChats.set(roomId, {
                    user1: socket.id,
                    user2: match.socketId,
                    createdAt: new Date()
                });
                
                socket.join(roomId);
                io.to(match.socketId).socketsJoin(roomId);
                
                socket.emit('matched', { roomId, partnerId: match.id });
                io.to(match.socketId).emit('matched', { roomId, partnerId: userInfo.id });
            } else {
                waitingQueue.push(userInfo);
                socket.emit('waiting', { message: 'Looking for a new match...' });
            }
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        activeUsers: users.size,
        waitingQueue: waitingQueue.length,
        activeChats: activeChats.size
    });
});

// Get server stats
app.get('/stats', (req, res) => {
    res.json({
        activeUsers: users.size,
        waitingQueue: waitingQueue.length,
        activeChats: activeChats.size,
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`TikTalk WebSocket server running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
});

