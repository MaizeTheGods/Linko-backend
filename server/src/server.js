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
import pgSession from 'connect-pg-simple';

// =================================================================
//  Importar TODAS las rutas de tu proyecto
// =================================================================
import authRoutes from './api/authRoutes.js';
// ... (el resto de tus rutas)
import commentRoutes from './api/commentRoutes.js';
import dmRoutes from './api/dmRoutes.js';
import notificationRoutes from './api/notificationRoutes.js';
import postRoutes from './api/postRoutes.js';
import searchRoutes from './api/searchRoutes.js';
import uploadRoutes from './api/uploadRoutes.js';
import userRoutes from './api/userRoutes.js';


const { combine, timestamp, json, simple, colorize } = format;
const PgStore = pgSession(session);

// =================================================================
//  Configuración Inicial
// =================================================================
const isProduction = process.env.NODE_ENV === 'production';

// === EXPLICACIÓN DEL CAMBIO (DOTENV) ===
// dotenv solo es necesario en desarrollo. En producción (Render),
// las variables de entorno se inyectan directamente.
if (!isProduction) {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
//  Logger (Winston) - ADAPTADO PARA PRODUCCIÓN
// =================================================================
// === EXPLICACIÓN DEL CAMBIO (LOGS) ===
// Render usa un sistema de archivos efímero. Escribir logs a un archivo
// puede fallar o llenarse rápidamente. La práctica estándar es imprimir
// logs a la consola (stdout), y la plataforma (Render) se encarga de
// recolectarlos y mostrarlos en su dashboard.
const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    // Eliminamos los transportes de archivo (`new transports.File`)
    new transports.Console({
      // En desarrollo, usamos un formato simple y con colores para leerlo mejor.
      // En producción, se usará el formato JSON definido arriba.
      format: isProduction ? json() : combine(colorize(), simple())
    })
  ]
});

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

// === EXPLICACIÓN DEL CAMBIO MÁS IMPORTANTE (TRUST PROXY) ===
// Render (y Vercel, Heroku, etc.) usan un "reverse proxy". El tráfico
// llega a ellos como HTTPS, pero lo reenvían a tu app como HTTP.
// Sin esta línea, Express piensa que la conexión no es segura y se
// negará a enviar cookies con la opción `secure: true`.
// Esto es VITAL para que el login y las sesiones funcionen.
app.set('trust proxy', 1);

// === CONFIGURACIÓN DE CORS DEFINITIVA Y CORRECTA ===
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://linkosss.vercel.app', // Usa una variable de entorno
  credentials: true
}));

// =================================================================
//  Configuración de Sesión - ADAPTADA PARA PRODUCCIÓN
// =================================================================
app.use(session({
  store: new PgStore({
    conString: process.env.SUPABASE_DB_URL,
    // Añade un manejador de errores para la conexión de la sesión
    pruneSessionInterval: 60 // Limpia sesiones expiradas cada 60 segundos
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // === EXPLICACIÓN DE LA CONFIGURACIÓN DE COOKIE ===
    // secure: true -> Solo enviar la cookie sobre HTTPS. Gracias a 'trust proxy', esto ahora funciona en Render.
    // sameSite: 'none' -> Necesario para peticiones cross-origin (Vercel -> Render). REQUIERE secure: true.
    // httpOnly: true -> Previene que el JavaScript del cliente acceda a la cookie. Más seguro.
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true, 
    maxAge: 1000 * 60 * 60 * 24 * 7 // Cookie válida por 7 días
  }
}));

// El resto de tu código está perfecto, lo mantenemos igual
// =================================================================
//  Rutas Públicas y de Salud
// =================================================================
app.get('/', (req, res) => {
  res.status(200).json({ app: 'Linko Backend', status: 'running', uptime: process.uptime() });
});
app.get('/health', (req, res) => {
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
    // Aquí podrías cerrar la conexión a la base de datos si fuera necesario
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));