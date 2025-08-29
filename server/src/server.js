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
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';

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
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  }
}));

// Additional headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Middleware de protección contra fuzzing
app.use((req, res, next) => {
  // Limitar tamaño del body
  if (req.headers['content-length'] > 10000) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  // Validar content-type para POST/PUT
  if (['POST', 'PUT'].includes(req.method) && 
      !req.headers['content-type']?.includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported media type' });
  }

  // Limitar parámetros de query
  if (Object.keys(req.query).length > 20) {
    return res.status(400).json({ error: 'Too many query parameters' });
  }

  next();
});

// Validación de inputs
app.use((req, res, next) => {
  // Limitar profundidad de objetos JSON
  if (JSON.stringify(req.body).length > 2000) {
    return res.status(400).json({ error: 'Payload too complex' });
  }
  next();
});

// Ejemplo de validación específica para rutas POST
app.post('/api/*', [
  body().custom(body => {
    const size = Buffer.byteLength(JSON.stringify(body));
    if (size > 1000) throw new Error('Payload too large');
    return true;
  })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

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
