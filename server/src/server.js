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
//  Configuración Inicial
// =================================================================
const isProduction = process.env.NODE_ENV === 'production';

// Carga las variables de .env solo si no estamos en producción
if (!isProduction) {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 10000; // Render usa la variable PORT

// =================================================================
//  Logger (Winston) - Adaptado para Producción
// =================================================================
const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(timestamp(), json()),
  transports: [
    new transports.Console({
      // En desarrollo, formato simple y con colores. En producción, formato JSON.
      format: isProduction ? json() : combine(colorize(), simple())
    })
  ]
});

logger.debug('Iniciando la inicialización del servidor...');

// =================================================================
//  Conexión a MongoDB
// =================================================================
// Las opciones 'useNewUrlParser' y 'useUnifiedTopology' están obsoletas
// y ya no son necesarias en las versiones modernas de Mongoose.
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
// Configuración de seguridad básica con Helmet
app.use(helmet());

// Middlewares para parsear el cuerpo de las peticiones
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === ¡VITAL PARA PRODUCCIÓN DETRÁS DE UN PROXY (COMO RENDER)! ===
// Express confiará en la cabecera X-Forwarded-Proto que Render añade,
// lo que le permite saber que la conexión es segura (HTTPS),
// lo cual es necesario para que las cookies seguras funcionen.
app.set('trust proxy', 1);

// =================================================================
//  Configuración de CORS - Profesional y Dinámica
// =================================================================
const whitelist = [
  'http://localhost:5173',          // Desarrollo local del frontend
  'https://linkosss.vercel.app',      // URL de producción del frontend
  /^https:\/\/.*\.vercel\.app$/      // Expresión regular para TODAS las preview URLs de Vercel
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (ej: Postman)
    if (!origin) return callback(null, true);
    
    // Comprueba si el origen está en la whitelist (incluyendo la expresión regular)
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
  credentials: true, // ¡Esencial para que funcionen las sesiones y cookies!
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// =================================================================
//  Configuración de Sesión - Adaptada para Producción
// =================================================================
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // Enviar cookie solo sobre HTTPS
    sameSite: isProduction ? 'none' : 'lax', // 'none' es necesario para cross-origin y requiere 'secure: true'
    httpOnly: true, // Previene acceso a la cookie desde JavaScript en el cliente
    maxAge: 1000 * 60 * 60 * 24 * 7 // Cookie válida por 7 días
  }
}));

// =================================================================
//  Rutas de Verificación de Salud
// =================================================================
app.get('/', (req, res) => {
  res.status(200).json({ app: 'Linko Backend', status: 'running', uptime: process.uptime() });
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
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