import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
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
app.set('trust proxy', 1);

// --- BULLETPROOF CORS ---
const allowedOrigins = [
    'https://adomeet.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

console.log(`[STARTUP] VERSION: 1.0.10 | CWD: ${process.cwd()} | ENV: ${process.env.NODE_ENV}`);

// 1. Core Health Check (TOP OF STACK)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', heartbeat: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', dbStatus: mongoose.connection.readyState }));
app.get('/', (req, res) => res.status(200).send('API Stable'));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'token'],
    optionsSuccessStatus: 200
}));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', (origin && allowedOrigins.includes(origin)) ? origin : 'https://adomeet.netlify.app');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, token');
    if (req.method === 'OPTIONS') return res.status(200).send();
    next();
});

app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/upload', uploadRoutes);

const __root = process.cwd();
const uploadsPath = path.join(__root, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Static files (Production)
if (process.env.NODE_ENV === 'production') {
    const clientPath = path.join(__root, '..', 'client', 'dist'); // Standard workspace layout
    console.log(`[STARTUP] Static Path: ${clientPath}`);
    app.use(express.static(clientPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            next();
            return;
        }
        res.sendFile(path.join(clientPath, 'index.html'), (err) => {
            if (err) res.status(404).send('Not Found');
        });
    });
}

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Server Init
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true }
});

// Socket.io logic
io.on('connection', (socket) => {
    socket.on('setup', (userData) => { socket.join(userData._id); socket.emit('connected'); });
});

// Database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prochat')
    .then(() => console.log('[STARTUP] MongoDB Connected'))
    .catch(err => console.error('[STARTUP] MongoDB Error:', err));

// Start
const rawPort = process.env.PORT || '8080';
const PORT = parseInt(rawPort, 10);
console.log(`[STARTUP] Port: ${PORT} (from ${rawPort})`);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] Listening on 0.0.0.0:${PORT}`);
    logger.info(`Server Ready on port ${PORT}`);
});

process.on('uncaughtException', (err) => { console.error('Uncaught:', err); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('Unhandled:', err); });
