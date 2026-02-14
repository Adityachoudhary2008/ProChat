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

// --- BULLETPROOF CORS CONFIGURATION (TOP OF STACK) ---
const allowedOrigins = [
    'https://adomeet.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

console.log(`[STARTUP] CWD: ${process.cwd()}`);
console.log('[STARTUP] Initializing middleware stack...');

// 1. Using the official cors middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`[CORS DEBUG] Origin restricted but allowed for debug: ${origin}`);
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'token'],
    optionsSuccessStatus: 200
}));

// 2. Manual header fallback
app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', 'https://adomeet.netlify.app');
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, token');

    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
    next();
});
// -----------------------------------------------------

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    }
});

// Error Handling Listeners
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception:', err);
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('[STARTUP] Configuring standard middleware...');
app.use(express.json());
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Health Check with Enhanced Diagnostics
app.get('/api/health', (req: Request, res: Response) => {
    console.log('[HEALTH CHECK] Pinged');
    res.json({
        status: 'ok',
        dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        dbReadyState: mongoose.connection.readyState,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        requestHeaders: req.headers,
        corsOrigins: allowedOrigins,
        port: process.env.PORT,
        cwd: process.cwd()
    });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', startup: true });
});

// Database Connection
console.log('[STARTUP] Connecting to MongoDB...');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('!! [CRITICAL ERROR] MONGODB_URI is MISSING in environment !!');
} else {
    const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`[STARTUP] Using MONGODB_URI: ${maskedUri.split('@')[1] || 'URL Hidden'}`);
}

const connectionString = MONGODB_URI || 'mongodb://localhost:27017/prochat';
mongoose.connect(connectionString)
    .then(() => {
        console.log('[STARTUP] Connected to MongoDB');
        logger.info('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('[STARTUP] MongoDB connection error:', err);
        logger.error('MongoDB connection error:', err);
    });

// Routes
console.log('[STARTUP] Registering routes...');
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/upload', uploadRoutes);

const __root = process.cwd();
app.use('/uploads', express.static(path.join(__root, 'uploads')));

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
    // Determine static path relative to CWD
    const clientPath = path.join(__root, 'client', 'dist');
    const clientPathFallback = path.join(__root, '..', 'client', 'dist');

    console.log(`[STARTUP] Serving static files from: ${clientPath}`);
    app.use(express.static(clientPath));
    app.use(express.static(clientPathFallback));

    app.get('*', (req: Request, res: Response) => {
        const indexPath = path.join(clientPath, 'index.html');
        const indexPathFallback = path.join(clientPathFallback, 'index.html');

        res.sendFile(indexPath, (err) => {
            if (err) {
                res.sendFile(indexPathFallback, (err2) => {
                    if (err2) {
                        res.status(404).send('Static files not found');
                    }
                });
            }
        });
    });
} else {
    app.get('/', (req: Request, res: Response) => {
        res.send('API is running...');
    });
}

// Socket.IO Logic
io.on('connection', (socket: Socket) => {
    logger.info('Connected to socket.io');
    socket.on('setup', (userData: any) => {
        socket.join(userData._id);
        socket.emit('connected');
    });
    socket.on('join chat', (room: string) => {
        socket.join(room);
        logger.info(`User Joined Room: ${room}`);
    });
    socket.on('typing', (room: string) => socket.in(room).emit('typing'));
    socket.on('stop typing', (room: string) => socket.in(room).emit('stop typing'));
    socket.on('new message', (newMessageRecieved: any) => {
        var chat = newMessageRecieved.chat;
        if (!chat.users) return logger.error('chat.users not defined');
        chat.users.forEach((user: any) => {
            if (user._id == newMessageRecieved.sender._id) return;
            socket.in(user._id).emit('message received', newMessageRecieved);
        });
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
        io.to(data.to).emit("call-accepted", data.signal);
    });
    socket.off('setup', () => {
        logger.info('USER DISCONNECTED');
    });
});

app.use(notFound);
app.use(errorHandler);

// VITAL: Railway standard port is 8080 if not specified.
const PORT = process.env.PORT || 8080;
console.log(`[STARTUP] Attempting to listen on port ${PORT}...`);
server.listen(PORT, () => {
    console.log(`[SUCCESS] Server running on port ${PORT}`);
    logger.info(`Server running on port ${PORT}`);
});
