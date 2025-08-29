import React, { useState, useContext } from 'react';
import api from '../api/http.js';
import { useNavigate, Link } from 'react-router-dom';
import './Form.css';
import { AuthContext } from '../context/AuthContext.jsx';

// === CAMBIO 1: Añadimos una función para decodificar el token ===
const decodeToken = (token) => {
  try {
    // El payload del token está en la segunda parte, codificado en Base64
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64); // Decodifica de Base64
    const decodedPayload = JSON.parse(decodedJson); // Convierte el JSON a objeto
    return decodedPayload;
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
  const [loading, setLoading] = useState(false);
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
      const response = await api.post('/auth/login', formData);
      const token = response.data.token;

      // Guarda el token en el navegador
      localStorage.setItem('authToken', token);

      // === CAMBIO 2: Decodificamos el token para obtener los datos del usuario ===
      const userData = decodeToken(token);

      // Actualiza el contexto con TODA la información del usuario, no solo { loggedIn: true }
      setUser(userData);

      // Redirige al usuario a la página de inicio
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
      console.error(err);
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