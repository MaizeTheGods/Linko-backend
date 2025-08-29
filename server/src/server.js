import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: [
    'https://linko-backend-ggjpdia54-maizethegods-projects.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Essential middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'https://linkosss.vercel.app', 'http://localhost:5173'].filter(Boolean),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(helmet());
app.use(express.json());

// Enhanced logging middleware
app.use((req, res, next) => {
  const user = req.user?.nombre_usuario || 'anonymous';
  const device = req.headers['user-agent'] || 'unknown_device';
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - User: ${user}, Device: ${device}`);
  next();
});

// Add headers for all responses
app.use((req, res, next) => {
  res.set('X-Application-Status', 'OK');
  res.set('Cache-Control', 'no-cache');
  next();
});

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint for uptime monitoring
app.get('/', (req, res) => {
  res.status(200).json({
    app: 'Linko Backend',
    status: 'running',
    uptime: process.uptime()
  });
});

// API Routes
import authRoutes from './api/authRoutes.js';
import dmRoutes from './api/dmRoutes.js';
import notificationRoutes from './api/notificationRoutes.js';
import postRoutes from './api/postRoutes.js';

// Error handling with enhanced logging
const router = express.Router();
router.use((err, req, res, next) => {
  const user = req.user?.nombre_usuario || 'anonymous';
  const device = req.headers['user-agent'] || 'unknown_device';
  console.error(`[ERROR][${new Date().toISOString()}] ${req.method} ${req.path} - User: ${user}, Device: ${device}`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// Enhanced request logging middleware
router.use((req, res, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path,
      user: req.user?.nombre_usuario || 'anonymous',
      userId: req.user?.id_usuario || null,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: res.statusCode,
      durationMs: duration
    }, null, 2));
  });
  
  next();
});

app.use('/api/auth', router.use(authRoutes));
app.use('/api/dm', router.use(dmRoutes));
app.use('/api/notifications', router.use(notificationRoutes));
app.use('/api/posts', router.use(postRoutes));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
