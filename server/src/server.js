// =================================================================
//  Imports
// =================================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createLogger, transports, format } from 'winston';
import cloudinary from 'cloudinary';
import session from 'express-session';
import mongoose from 'mongoose';

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

const { combine, timestamp, json, simple, colorize } = format;
// =================================================================
//  "Caja Negra" - Atrapa Errores Fatales
// =================================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('ERROR GRAVE: Promesa no manejada:', promise, 'razón:', reason);
  // Aquí podrías usar tu logger si estuviera inicializado, 
  // pero console.error es más directo para crashes.
});

process.on('uncaughtException', (error) => {
  console.error('ERROR GRAVE: Excepción no capturada:', error);
  // Es importante salir del proceso después de un error no capturado.
  // Render lo reiniciará automáticamente.
  process.exit(1); 
});

// =================================================================
//  Configuración Inicial
// =================================================================
const isProduction = process.env.NODE_ENV === 'production';

// Carga las variables de .env solo si estamos en desarrollo local
if (!isProduction) {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 10000;

// =================================================================
//  Logger (Winston) - Adaptado para Producción
// =================================================================
const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(timestamp(), json()),
  transports: [
    new transports.Console({
      format: isProduction ? json() : combine(colorize(), simple())
    })
  ]
});

logger.debug('Iniciando la inicialización del servidor...');

// =================================================================
//  Conexión a MongoDB
// =================================================================
mongoose.connect(process.env.DATABASE_URL)
  .then(() => logger.info('Conectado a MongoDB Atlas'))
  .catch(err => logger.error('Error en la conexión a MongoDB:', err));

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

// === ¡VITAL PARA PRODUCCIÓN DETRÁS DE UN PROXY (COMO RENDER)! ===
app.set('trust proxy', 1);

// =================================================================
//  Configuración de CORS - Profesional y Dinámica
// =================================================================
const whitelist = [
  'http://localhost:5173',
  'https://linkosss.vercel.app',
  /^https:\/\/.*\.vercel\.app$/  // <-- ¡ESTA ES LA VERSIÓN CORRECTA!
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (whitelist.some(allowedOrigin => 
      typeof allowedOrigin === 'string' 
        ? allowedOrigin === origin 
        : allowedOrigin.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// =================================================================
//  Configuración de Sesión - A PRUEBA DE BALAS
// =================================================================
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  logger.error('FATAL ERROR: La variable de entorno SESSION_SECRET no está definida. Saliendo...');
  process.exit(1); // Detiene la aplicación si el secreto no existe
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 días
  }
}));

// =================================================================
//  Rutas de Verificación de Salud
// =================================================================
app.get('/', (req, res) => {
  res.status(200).json({ app: 'Linko Backend', status: 'running', uptime: process.uptime() });
});

// =================================================================
//  Rutas de la API (¡Todas con el prefijo /api!)
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
  logger.info(`Servidor corriendo en el puerto ${PORT}`);
});

// =================================================================
//  Cierre Limpio del Servidor (Graceful Shutdown)
// =================================================================
const gracefulShutdown = (signal) => {
  logger.warn(`Recibida la señal ${signal}. Apagando el servidor...`);
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    mongoose.connection.close(false, () => {
      logger.info('Conexión a MongoDB cerrada.');
      process.exit(0);
    });
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
