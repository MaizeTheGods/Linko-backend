// =================================================================
//  Imports
// =================================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createLogger, transports } from 'winston';
import { format } from 'winston';
const { combine, timestamp, json, simple, colorize } = format;
import cloudinary from 'cloudinary';
import session from 'express-session';
import pgSession from 'connect-pg-simple';

// =================================================================
//  Importar TODAS las rutas de tu proyecto
// =================================================================
import authRoutes from './api/authRoutes.js';
import commentRoutes from './api/commentRoutes.js';
import dmRoutes from './api/dmRoutes.js';
import notificationRoutes from './api/notificationRoutes.js';
import postRoutes from './api/postRoutes.js';
import searchRoutes from './api/searchRoutes.js';
import uploadRoutes from './api/uploadRoutes.js';
import userRoutes from './api/userRoutes.js';

const PgStore = pgSession(session);

// =================================================================
//  Configuración Inicial
// =================================================================
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// =================================================================
//  Logger (Winston)
// =================================================================
const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(timestamp(), json()),
  transports: [
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    new transports.File({
      filename: 'logs/critical.log',
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

if (!isProduction) {
  logger.add(new transports.Console({
    format: combine(colorize(), simple())
  }));
}

logger.debug('Iniciando la inicialización del servidor...');

// =================================================================
//  Configuración de Cloudinary
// =================================================================
try {
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  logger.info('Cloudinary configurado exitosamente.');
} catch (err) {
  logger.error('La configuración de Cloudinary falló:', { message: err.message });
  process.exit(1);
}

// =================================================================
//  Middlewares Esenciales
// =================================================================
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === CONFIGURACIÓN DE CORS DEFINITIVA Y CORRECTA ===
app.use(cors({
  origin: 'https://linkosss.vercel.app',
  credentials: true
}));

app.use((req, res, next) => {
  res.set('X-Application-Status', 'OK');
  res.set('Cache-Control', 'no-cache');
  next();
});

// =================================================================
//  Configuración de Sesión
// =================================================================
app.use(session({
  store: new PgStore({
    conString: process.env.SUPABASE_DB_URL
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: 'none' }
}));

// =================================================================
//  Middleware de Logging
// =================================================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      user: req.user?.nombre_usuario || 'anonymous',
      userId: req.user?.id_usuario || null,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    logger.info(`Request: ${logData.method} ${logData.path} - ${logData.status}`, logData);
  });
  next();
});

// =================================================================
//  Rutas Públicas y de Salud
// =================================================================
app.get('/', (req, res) => {
  res.status(200).json({ app: 'Linko Backend', status: 'running', uptime: process.uptime() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// =================================================================
//  Rutas de la API
// =================================================================
logger.info('Montando rutas de la API...');

app.use('/api/auth', authRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

logger.info('Todas las rutas de la API han sido cargadas exitosamente.');

// =================================================================
//  Manejo de Errores Centralizado
// =================================================================
app.use((err, req, res, next) => {
  logger.error(`Error no controlado: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  const errorMessage = isProduction ? 'Error interno del servidor' : err.message;
  res.status(err.statusCode || 500).json({ error: errorMessage });
});

// =================================================================
//  Inicio del Servidor
// =================================================================
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});

const gracefulShutdown = (signal) => {
  logger.warn(`Recibida la señal ${signal}. Apagando el servidor...`);
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));