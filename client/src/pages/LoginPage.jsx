import React, { useState, useContext } from 'react';
import api from '../api/http.js';
import { useNavigate, Link } from 'react-router-dom'; // Se añade Link
import './Form.css';
import { AuthContext } from '../context/AuthContext.jsx';

// Función para decodificar el token JWT
const decodeToken = (token) => {
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    return JSON.parse(decodedJson);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};

const LoginPage = () => {
  const [formData, setFormData] = useState({
    correo_electronico: '',
    contrasena: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Añadido para feedback al usuario
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const response = await api.post('auth/login', formData, { withCredentials: true });
      const token = response.data.token;

      localStorage.setItem('authToken', token);

      // === LA SOLUCIÓN CLAVE ===
      // 1. Decodificamos el token para obtener los datos del usuario.
      const userData = decodeToken(token);
      
      // 2. Guardamos el objeto de usuario COMPLETO en el contexto.
      setUser(userData);

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" name="correo_electronico" placeholder="Correo electrónico" onChange={handleChange} required />
          <input type="password" name="contrasena" placeholder="Contraseña" onChange={handleChange} required />
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        <div className="form-footnote">
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;