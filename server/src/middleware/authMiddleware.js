import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const protect = async (req, res, next) => {
  let token;

  // Warn if secret is missing to avoid silent logouts from 401
  if (!process.env.JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('[AUTH WARNING] JWT_SECRET is not defined. All protected routes will fail with 401.');
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Obtener el token del header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Adjuntar el usuario del token a la petición (sin la contraseña)
      req.user = await prisma.usuario.findUnique({
        where: { id_usuario: decoded.id },
        select: { id_usuario: true, nombre_usuario: true, correo_electronico: true }
      });

      next(); // Pasar al siguiente paso (el controlador)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AUTH ERROR]', { message: error?.message, name: error?.name });
      const msg = !process.env.JWT_SECRET
        ? 'No autorizado, falta JWT_SECRET en el servidor'
        : 'No autorizado, token inválido o expirado';
      res.status(401).json({ message: msg });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

// Autenticación opcional: si hay token válido adjunta req.user; si no, continua sin error
export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await prisma.usuario.findUnique({
        where: { id_usuario: decoded.id },
        select: { id_usuario: true, nombre_usuario: true, correo_electronico: true }
      });
    }
  } catch (e) {
    // Si el token es inválido, seguimos sin usuario en modo público
    req.user = undefined;
  }
  next();
};
