import React, { useState, useContext } from 'react';
import api from '../api/http.js';
import { useNavigate, Link } from 'react-router-dom';
import './Form.css'; // Importar los estilos
import { AuthContext } from '../context/AuthContext.jsx';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    correo_electronico: '',
    contrasena: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Llama al endpoint de login
      const response = await api.post('/auth/login', formData);

      // Guarda el token en el navegador
      localStorage.setItem('authToken', response.data.token);

      // Actualiza el contexto para que ProtectedRoute permita el acceso
      setUser({ loggedIn: true });

      // Redirige al usuario a la página de inicio
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
      console.error(err);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" name="correo_electronico" placeholder="Correo electrónico" onChange={handleChange} required />
          <input type="password" name="contrasena" placeholder="Contraseña" onChange={handleChange} required />
          <button type="submit">Entrar</button>
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

