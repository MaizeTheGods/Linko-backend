// Importar las librerías necesarias
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import authRoutes from './api/authRoutes.js';
import userRoutes from './api/userRoutes.js';
import postRoutes from './api/postRoutes.js';
import commentRoutes from './api/commentRoutes.js';
import uploadRoutes from './api/uploadRoutes.js';
import dmRoutes from './api/dmRoutes.js';
import searchRoutes from './api/searchRoutes.js';
import notificationsRoutes from './api/notificationsRoutes.js';
import errorHandler from './src/middleware/errorMiddleware.js';

// Cargar las variables de entorno del archivo .env
dotenv.config();
const prisma = new PrismaClient();

// Inicializar la aplicación de Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (funciones que se ejecutan en cada petición)
// CORS dinámico para permitir frontend local y el dominio en producción
const allowedOrigins = new Set([
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
}));
app.use(compression()); // Agregar compresión gzip
app.use(express.json()); // Permite al servidor entender JSON

// Rutas de la API
app.get('/api/test', (req, res) => res.json({ message: 'API funcionando' }));
// Health check con verificación de conexión a la base de datos
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'up' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[HEALTH_DB_ERROR]', { message: err?.message, code: err?.code });
    res.status(500).json({ ok: false, db: 'down' });
  }
});

// Usar los enrutadores
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);
app.use('/api', uploadRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationsRoutes);

// Manejo básico de errores no controlados para facilitar el debug
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[UNHANDLED_REJECTION]', { reason: reason?.message || String(reason) });
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[UNCAUGHT_EXCEPTION]', {
    message: err?.message,
    stack: err?.stack?.split('\n').slice(0, 3).join(' | '),
  });
});

// Error handling (must be last middleware)
app.use(errorHandler);

// Iniciar el servidor para que escuche peticiones
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  try {
    // eslint-disable-next-line no-console
    console.log('[CONFIG]', {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'development',
    });
  } catch {}
});
