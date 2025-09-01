import React, { useState } from 'react';
import api from '../api/http.js';
import { useNavigate } from 'react-router-dom';
import './Form.css'; // Importar los estilos

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    nombre_perfil: '',
    nombre_usuario: '',
    correo_electronico: '',
    contrasena: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('auth/register', formData);
      console.log('Registro exitoso:', response.data);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
      console.error(err);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>PRUEBA FINAL DE VERDAD - Crear una cuenta</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="nombre_perfil" placeholder="Nombre completo" onChange={handleChange} required />
          <input type="text" name="nombre_usuario" placeholder="Nombre de usuario (@usuario)" onChange={handleChange} required />
          <input type="email" name="correo_electronico" placeholder="Correo electrónico" onChange={handleChange} required />
          <input type="password" name="contrasena" placeholder="Contraseña" onChange={handleChange} required />
          <button type="submit">Registrarse</button>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default RegisterPage;
