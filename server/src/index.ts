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
import messageRoutes from './routes/messageRoutes';
import meetingRoutes from './routes/meetingRoutes';
import uploadRoutes from './routes/uploadRoutes';

// --- INITIAL CONFIG ---
dotenv.config();
const app = express();
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 8080;
const VERSION = "1.0.14-FINAL-HARDENED";

// --- 1. REQUEST LOGGER (FOR DEBUGGING RAILWAY PROBES) ---
app.use((req, res, next) => {
    console.log(`[REQUEST] ${new Date().toISOString()} | ${req.method} ${req.url} | IP: ${req.ip} | Host: ${req.headers.host}`);
    next();
});

// --- 2. CRITICAL HEALTH CHECKS ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', version: VERSION, db: mongoose.connection.readyState }));
app.get('/health', (req, res) => res.status(200).send('HEALTHY'));
app.get('/ping', (req, res) => res.status(200).send('pong'));
app.get('/', (req, res) => res.status(200).send(`ProChat Stable - Version ${VERSION}`));

// --- 3. MIDDLEWARE ---
app.use(cors({
    origin: (origin, callback) => callback(null, true), // Reflections origin for maximum compatibility
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'token'],
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));

// --- 4. ROUTES ---
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/upload', uploadRoutes);

// --- 5. STATIC FILES ---
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

// --- 6. ERROR HANDLERS ---
app.use(notFound);
app.use(errorHandler);

// --- 7. SERVER AND DATABASE ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", credentials: true } });

io.on('connection', (socket) => {
    socket.on('setup', (userData: any) => { socket.join(userData._id); socket.emit('connected'); });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prochat')
    .then(() => console.log('[STARTUP] MongoDB Success'))
    .catch(err => console.error('[STARTUP] MongoDB Fail:', err));

// Start listening - Using a simpler listen approach
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] VERSION ${VERSION} listening on 0.0.0.0:${PORT}`);
});

// Heartbeat remains for visibility
setInterval(() => {
    console.log(`[HEARTBEAT] ${new Date().toISOString()} | Stable: True | DB: ${mongoose.connection.readyState}`);
}, 10000);

process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Railway SIGTERM received');
    process.exit(0);
});

process.on('uncaughtException', (err: any) => {
    console.error('CRITICAL UNCAUGHT:', err);
    setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', (reason: any) => {
    console.error('REJECTION:', reason);
});
