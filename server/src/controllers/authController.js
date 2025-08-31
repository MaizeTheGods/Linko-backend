import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
    const { username, email, password } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo o nombre de usuario ya está en uso' });
    }
    
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Crear nuevo usuario
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await newUser.save();
    
    // Generar token
    const token = generateToken(newUser._id);
    
    res.status(201).json({
      id: newUser._id,
      username: newUser.username,
      token
    });
  } catch (error) {
    console.error('[REGISTER_ERROR]', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
    });
    res.status(500).json({ message: 'Error en el registro' });
  }
};

// @desc    Autenticar (login) un usuario
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar usuario
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar contraseña
    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }
    
    // Generar token
    const token = generateToken(existingUser._id);
    
    res.status(200).json({
      id: existingUser._id,
      username: existingUser.username,
      token
    });
  } catch (error) {
    console.error('[LOGIN_ERROR]', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
    });
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};
