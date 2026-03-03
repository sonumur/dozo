import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST']
    }
});

// Serve static files from the React app build folder
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Health check and generic root response for backend-only hosting
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/', (req, res, next) => {
    // Only serve index.html if it exists, otherwise provide a friendly message
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            res.status(200).send('Dozu Backend is live and running. Connect via Socket.io.');
        }
    });
});

interface User {
    id: string;
    socket: Socket;
    mode: 'text' | 'video';
    partnerId: string | null;
}

const waitingQueue: User[] = [];
const activeUsers = new Map<string, User>();

function broadcastUserCount() {
    const realCount = io.engine.clientsCount;
    // Base number 400k + real count + oscillating jitter
    const fakeBase = 432105;
    const timeRef = Date.now() / 10000; // Changes every 10 seconds
    const slowOscillation = Math.floor(Math.sin(timeRef) * 200);
    const jitter = Math.floor(Math.random() * 80);
    const countToEmit = realCount + fakeBase + slowOscillation + jitter;
    io.emit('userCount', { count: countToEmit });
}

// Broadcast every 5 seconds to keep it "live"
setInterval(broadcastUserCount, 5000);

io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);
    broadcastUserCount();

    socket.on('join', (data: { mode: 'text' | 'video' }) => {
        const newUser: User = {
            id: socket.id,
            socket,
            mode: data.mode,
            partnerId: null
        };
        activeUsers.set(socket.id, newUser);
        findPartner(newUser);
    });

    socket.on('next', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            disconnectPartner(user);
            findPartner(user);
        }
    });

    // Signaling for WebRTC
    socket.on('signal', (data: { target: string, signal: any }) => {
        const targetUser = activeUsers.get(data.target);
        if (targetUser) {
            targetUser.socket.emit('signal', { from: socket.id, signal: data.signal });
        }
    });

    socket.on('message', (data: { text: string }) => {
        const user = activeUsers.get(socket.id);
        if (user && user.partnerId) {
            const partner = activeUsers.get(user.partnerId);
            if (partner) {
                partner.socket.emit('message', { text: data.text, from: socket.id });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        broadcastUserCount();
        const user = activeUsers.get(socket.id);
        if (user) {
            disconnectPartner(user);
            activeUsers.delete(socket.id);

            const queueIndex = waitingQueue.findIndex(u => u.id === socket.id);
            if (queueIndex !== -1) waitingQueue.splice(queueIndex, 1);
        }
    });
});

function findPartner(user: User) {
    // Clear any existing presence in queue first
    const existingQueueIndex = waitingQueue.findIndex(u => u.id === user.id);
    if (existingQueueIndex !== -1) {
        waitingQueue.splice(existingQueueIndex, 1);
    }

    const partnerIndex = waitingQueue.findIndex(u => u.mode === user.mode && u.id !== user.id);

    if (partnerIndex !== -1) {
        const partner = waitingQueue.splice(partnerIndex, 1)[0];

        user.partnerId = partner.id;
        partner.partnerId = user.id;

        user.socket.emit('paired', { partnerId: partner.id });
        partner.socket.emit('paired', { partnerId: user.id });

        console.log(`Paired: ${user.id} <-> ${partner.id}`);
    } else {
        waitingQueue.push(user);
        user.socket.emit('waiting');
    }
}

function disconnectPartner(user: User) {
    if (user.partnerId) {
        const partner = activeUsers.get(user.partnerId);
        if (partner) {
            partner.partnerId = null;
            partner.socket.emit('partnerDisconnected');
        }
        user.partnerId = null;
    }
}

// Catch-all route to serve the React app
app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
