import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorMiddleware';
import { notFound } from './middleware/notFound';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import messageRoutes from './routes/messageRoutes';
import meetingRoutes from './routes/meetingRoutes';
import uploadRoutes from './routes/uploadRoutes';
import path from 'path';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prochat';
mongoose.connect(MONGODB_URI)
    .then(() => logger.info('Connected to MongoDB'))
    .catch((err) => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/upload', uploadRoutes);

// Make uploads folder static
const __root = path.resolve();
app.use('/uploads', express.static(path.join(__root, '/uploads')));

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__root, '/client/dist')));

    app.get('*', (req, res) =>
        res.sendFile(path.resolve(__root, 'client', 'dist', 'index.html'))
    );
} else {
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

// Socket.IO
io.on('connection', (socket) => {
    logger.info('Connected to socket.io');

    socket.on('setup', (userData) => {
        socket.join(userData._id);
        socket.emit('connected');
    });

    socket.on('join chat', (room) => {
        socket.join(room);
        logger.info(`User Joined Room: ${room}`);
    });

    socket.on('typing', (room) => socket.in(room).emit('typing'));
    socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

    socket.on('typing', (room) => socket.in(room).emit('typing'));
    socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

    socket.on('new message', (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        if (!chat.users) return logger.error('chat.users not defined');

        chat.users.forEach((user: any) => {
            if (user._id == newMessageRecieved.sender._id) return;

            socket.in(user._id).emit('message received', newMessageRecieved);
        });
    });

    // WebRTC Signaling
    socket.on('join meeting', (meetingId) => {
        socket.join(meetingId);
        logger.info(`User joined meeting ${meetingId}`);
        socket.to(meetingId).emit('user-joined', socket.id);
    });

    socket.on('call-user', ({ userToCall, signalData, from, name }) => {
        io.to(userToCall).emit("call-user", { signal: signalData, from, name });
    });

    socket.on("answer-call", (data) => {
        io.to(data.to).emit("call-accepted", data.signal);
    });

    // Simple Peer signaling usually involves offer/answer/ice-candidate
    // For multi-user, it's complex. Let's start with 1-on-1 or simple mesh.
    // We'll stick to a simple signal relay for now.

    socket.off('setup', () => {
        logger.info('USER DISCONNECTED');
        // socket.leave(userData._id); // userData is not defined here scope-wise, but we can fix later or ignore for now as 'setup' off is rarely explicitly called this way in this pattern.
        // Actually, proper cleanup:
        // socket.disconnect();
    });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
