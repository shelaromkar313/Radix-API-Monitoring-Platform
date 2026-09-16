import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initSocket } from './config/socket.js';
import { initDb } from './config/db.js';
import { connectRedis } from './config/redis.js';
import prisma from './config/client.js';
// import { connectRabbitMQ } from './config/rabbitmq.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import endpointRoutes from './routes/endpointRoutes.js';
import testingRoutes from './routes/testingRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import mockRoutes from './routes/mockRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import remediationRoutes from './routes/remediationRoutes.js';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { startWorker } from './workers/scannerWorker.js';
import { errorHandler } from './middleware/errorHandler.js';
dotenv.config();
const app = express();
const httpServer = http.createServer(app);
// Initialize Socket.io
const io = initSocket(httpServer);
// Security & Performance Middleware
app.use(helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(compression());
// Permissive CORS for deployed frontend, localhost, and custom domains
app.use(cors({
    origin: (origin, callback) => {
        // Requests with no origin (curl, server-to-server, mobile)
        if (!origin)
            return callback(null, true);
        // Allow any onrender.com origin, localhost, vercel, or custom configured frontend URL
        if (origin.includes('onrender.com') ||
            origin.includes('localhost') ||
            origin.includes('vercel.app') ||
            (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)) {
            return callback(null, true);
        }
        // Permissive fallback so production frontend is never blocked
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());
// Rewrite duplicate /api/api prefix if client sends /api/api/...
app.use((req, res, next) => {
    if (req.url.startsWith('/api/api/')) {
        req.url = req.url.replace(/^\/api\/api\//, '/api/');
    }
    next();
});
// Rate Limiting (Allows healthy polling and testing console calls)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'production' ? 2000 : 20000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use(['/api/', '/api/api/'], limiter);
// App-wide Socket instance
app.set('io', io);
app.use(['/api/auth', '/auth', '/api/api/auth'], authRoutes);
app.use(['/api/projects', '/projects', '/api/api/projects'], projectRoutes);
app.use(['/api/endpoints', '/endpoints', '/api/api/endpoints'], endpointRoutes);
app.use(['/api/testing', '/testing', '/api/api/testing'], testingRoutes);
app.use(['/api/teams', '/teams', '/api/api/teams'], teamRoutes);
app.use(['/api/mock', '/mock', '/api/api/mock'], mockRoutes);
app.use(['/api/github', '/github', '/api/api/github'], githubRoutes);
app.use(['/api/incidents', '/incidents', '/api/api/incidents'], incidentRoutes);
app.use(['/api/remediations', '/remediations', '/api/api/remediations'], remediationRoutes);
// Basic health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'RADIX Server running' });
});
// Global Error Handler
app.use(errorHandler);
// Start function
const start = async () => {
    const PORT = process.env.PORT || 5000;
    // 1. Bind to PORT immediately so Render health checks succeed without 502 Bad Gateway
    httpServer.listen(PORT, () => {
        console.log(`🚀 RADIX Backend Operational on port ${PORT}`);
        console.log(`🔗 Health Check: /api/health`);
    });
    httpServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Error: Port ${PORT} is already in use. Please stop the process using it.`);
        }
        else {
            console.error('Server failed to start:', error);
        }
        process.exit(1);
    });
    // 2. Initialize database and background services
    try {
        await initDb();
        // Recover any dangling scans from previous server restarts
        prisma.project.updateMany({
            where: { status: 'scanning' },
            data: { status: 'failed' }
        }).then((res) => {
            if (res?.count > 0)
                console.log(`Cleaned up ${res.count} orphaned scanning jobs.`);
        }).catch(() => { });
    }
    catch (error) {
        console.error('⚠️  Database initial connection error (will retry on incoming requests):', error);
    }
    // 3. Start background services
    connectRedis().then(() => {
        startWorker();
    }).catch(err => {
        console.warn('⚠️  Redis unavailable on this environment, continuing with in-memory/DB mode:', err.message);
    });
};
start();
