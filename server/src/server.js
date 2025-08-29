import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Essential middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'https://linkosss.vercel.app', 'http://localhost:5173'].filter(Boolean),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(helmet());
app.use(express.json());

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
import authRoutes from './api/authRoutes.js';
import dmRoutes from './api/dmRoutes.js';
import notificationRoutes from './api/notificationRoutes.js';
import postRoutes from './api/postRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/posts', postRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
