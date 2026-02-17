import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import path from 'path';

import logger from './utils/logger';
import { errorHandler } from './middleware/errorMiddleware';
import { notFound } from './middleware/notFound';

import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import passport from 'passport';
import session from 'express-session';
import configurePassport from './config/passport';
import messageRoutes from './routes/messageRoutes';
import meetingRoutes from './routes/meetingRoutes';
import uploadRoutes from './routes/uploadRoutes';
import authRoutes from './routes/authRoutes';

// --- CONFIGURATION ---
dotenv.config();
const app = express();
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 8080;

// --- 1. HEALTH CHECKS ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', db: mongoose.connection.readyState }));
app.get('/health', (req, res) => res.status(200).send('HEALTHY'));
app.get('/', (req, res) => res.status(200).send('ProChat Backend Operational'));

// --- 2. MIDDLEWARE ---
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'token'],
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Session and Passport initialization
app.use(session({
    secret: process.env.SESSION_SECRET || 'prochatSecretKey123',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// --- 3. ROUTES ---
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/upload', uploadRoutes);

// --- 4. STATIC FILES AND UPLOADS ---
const serverDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(serverDir, '..');

const uploadsPath = path.join(serverDir, 'uploads');
app.use('/uploads', express.static(uploadsPath));

if (process.env.NODE_ENV === 'production') {
    const clientPath = path.join(rootDir, 'client', 'dist');
    app.use(express.static(clientPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(clientPath, 'index.html'), (err) => {
            if (err) res.status(404).send('Not Found');
        });
    });
}

// --- 5. ERROR HANDLERS ---
app.use(notFound);
app.use(errorHandler);

// --- 6. SERVER AND DATABASE ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", credentials: true } });

const userToSocket = new Map<string, string>();

io.on('connection', (socket) => {
    socket.on('setup', (userData: any) => {
        socket.join(userData._id);
        userToSocket.set(userData._id, socket.id);
        socket.emit('connected');
        logger.info(`User mapped: ${userData._id} -> ${socket.id}`);
    });

    socket.on('join chat', (room: string) => {
        socket.join(room);
        logger.info(`User Joined Room: ${room}`);
    });

    socket.on('typing', (room: string) => socket.in(room).emit('typing', room));
    socket.on('stop typing', (room: string) => socket.in(room).emit('stop typing', room));

    socket.on('new message', (newMessageRecieved: any) => {
        var chat = newMessageRecieved.chat;
        if (!chat.users) return logger.error('chat.users not defined');
        chat.users.forEach((user: any) => {
            if (user._id == newMessageRecieved.sender._id) return;
            socket.in(user._id).emit('message received', newMessageRecieved);
        });
    });

    // --- DIRECT CALLING (WHATSAPP STYLE) ---
    socket.on('direct-call', ({ targetUserId, fromUser, meetingId }) => {
        const targetSocketId = userToSocket.get(targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming-call', { fromUser, meetingId });
            logger.info(`Call forwarded from ${fromUser.name} to ${targetUserId}`);
        } else {
            socket.emit('call-error', { message: 'User is offline' });
        }
    });

    socket.on('accept-call', ({ toUserId, meetingId }) => {
        const targetSocketId = userToSocket.get(toUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-accepted', { meetingId });
        }
    });

    socket.on('reject-call', ({ toUserId }) => {
        const targetSocketId = userToSocket.get(toUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-rejected');
        }
    });

    socket.on('join meeting', (meetingId: string) => {
        socket.join(meetingId);
        logger.info(`User joined meeting ${meetingId}`);
        socket.to(meetingId).emit('user-joined', socket.id);
    });

    socket.on('call-user', ({ userToCall, signalData, from, name }: any) => {
        io.to(userToCall).emit("call-user", { signal: signalData, from, name });
    });

    socket.on("answer-call", (data: any) => {
        io.to(data.to).emit("call-accepted-signal", data.signal);
    });

    socket.on('disconnect', () => {
        // Find and remove from map
        for (const [userId, socketId] of userToSocket.entries()) {
            if (socketId === socket.id) {
                userToSocket.delete(userId);
                break;
            }
        }
    });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prochat')
    .then(() => console.log('[STARTUP] MongoDB Connected'))
    .catch(err => console.error('[STARTUP] MongoDB Connection Error:', err));

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] Server listening on 0.0.0.0:${PORT}`);
    logger.info(`Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down.');
    process.exit(0);
});

process.on('uncaughtException', (err: any) => {
    logger.error('CRITICAL UNCAUGHT EXCEPTION:', err);
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: any) => {
    logger.error('UNHANDLED REJECTION:', reason);
});
