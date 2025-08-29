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
  // === MEJORA 1: Añadimos un estado de carga ===
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Evita envíos múltiples si ya está cargando

    setError('');
    setLoading(true); // Inicia el estado de carga

    try {
      const response = await api.post('/auth/login', formData);
      localStorage.setItem('authToken', response.data.token);
      setUser({ loggedIn: true }); // O podrías decodificar el token y guardar los datos del usuario
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión. Revisa tus credenciales.');
      console.error(err);
    } finally {
      setLoading(false); // Finaliza el estado de carga, tanto en éxito como en error
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          {/* === MEJORA 2: Se añaden etiquetas <label> para accesibilidad === */}
          <label htmlFor="correo_electronico" className="sr-only">Correo electrónico</label>
          <input 
            id="correo_electronico"
            type="email" 
            name="correo_electronico" 
            placeholder="Correo electrónico" 
            onChange={handleChange} 
            required 
          />
          
          <label htmlFor="contrasena" className="sr-only">Contraseña</label>
          <input 
            id="contrasena"
            type="password" 
            name="contrasena" 
            placeholder="Contraseña" 
            onChange={handleChange} 
            required 
          />
          
          {/* El botón ahora se deshabilita mientras carga */}
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