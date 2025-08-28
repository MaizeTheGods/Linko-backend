import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Función para generar un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // El token expira en 30 días
  });
};

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { nombre_usuario, correo_electronico, contrasena, nombre_perfil } = req.body;

    if (!nombre_usuario || !correo_electronico || !contrasena || !nombre_perfil) {
      return res.status(400).json({ message: 'Por favor, completa todos los campos' });
    }

    // Verificar si el usuario ya existe
    const userExists = await prisma.usuario.findFirst({
      where: { OR: [{ correo_electronico }, { nombre_usuario }] }
    });

    if (userExists) {
      return res.status(400).json({ message: 'El correo o nombre de usuario ya está en uso' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Crear usuario
    const user = await prisma.usuario.create({
      data: {
        nombre_usuario,
        correo_electronico,
        nombre_perfil,
        contrasena: hashedPassword,
      },
    });

    if (user) {
      return res.status(201).json({
        id: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        token: generateToken(user.id_usuario),
      });
    }
    return res.status(400).json({ message: 'Datos de usuario inválidos' });
  } catch (error) {
    console.error('[REGISTER_ERROR]', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
    });
    return res.status(500).json({ message: 'Error en el registro' });
  }
};

// @desc    Autenticar (login) un usuario
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { correo_electronico, contrasena } = req.body;

    // Buscar usuario por email
    const user = await prisma.usuario.findUnique({
      where: { correo_electronico },
    });

    // Verificar usuario y comparar contraseñas
    if (user && (await bcrypt.compare(contrasena, user.contrasena))) {
      return res.json({
        id: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        token: generateToken(user.id_usuario),
      });
    }
    return res.status(401).json({ message: 'Correo o contraseña inválidos' });
  } catch (error) {
    console.error('[LOGIN_ERROR]', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
    });
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};
