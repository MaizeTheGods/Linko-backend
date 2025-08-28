import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/http.js';
import { AuthContext } from '../context/AuthContext.jsx';

const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);

  // Email
  const [nuevoCorreo, setNuevoCorreo] = useState(user?.correo_electronico || '');
  const [contrasenaEmail, setContrasenaEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [msgEmail, setMsgEmail] = useState('');
  const [errEmail, setErrEmail] = useState('');

  // Password
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);
  const [msgPass, setMsgPass] = useState('');
  const [errPass, setErrPass] = useState('');

  const submitEmail = async (e) => {
    e.preventDefault();
    setMsgEmail('');
    setErrEmail('');
    setLoadingEmail(true);
    try {
      const { data } = await api.patch('/users/me/email', { nuevo_correo: nuevoCorreo, contrasena: contrasenaEmail });
      const updated = data?.user;
      if (updated) setUser((prev) => ({ ...(prev || {}), correo_electronico: updated.correo_electronico }));
      setMsgEmail('Correo actualizado');
      setContrasenaEmail('');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'No se pudo actualizar el correo';
      setErrEmail(msg);
    } finally { setLoadingEmail(false); }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const submitPass = async (e) => {
    e.preventDefault();
    setMsgPass('');
    setErrPass('');
    setLoadingPass(true);
    try {
      const { data } = await api.patch('/users/me/password', { contrasena_actual: contrasenaActual, contrasena_nueva: contrasenaNueva });
      setMsgPass(data?.message || 'Contraseña actualizada');
      setContrasenaActual('');
      setContrasenaNueva('');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'No se pudo cambiar la contraseña';
      setErrPass(msg);
    } finally { setLoadingPass(false); }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Configuración de la Cuenta</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/settings/profile">Editar Perfil</Link>
          <button onClick={handleLogout} className="btn btn-ghost">Salir</button>
        </div>
      </div>
      <hr />

      <section style={{ marginTop: 16, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, padding: 12 }}>
        <h3>Cambiar correo</h3>
        <form onSubmit={submitEmail}>
          <div>
            <label>Nuevo correo</label>
            <input type="email" value={nuevoCorreo} onChange={(e) => setNuevoCorreo(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Contraseña</label>
            <input type="password" value={contrasenaEmail} onChange={(e) => setContrasenaEmail(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <button type="submit" disabled={loadingEmail} style={{ marginTop: 12 }}>
            {loadingEmail ? 'Guardando…' : 'Actualizar correo'}
          </button>
          {msgEmail && <p style={{ color: 'var(--primary)' }}>{msgEmail}</p>}
          {errEmail && <p style={{ color: 'var(--primary)' }}>{errEmail}</p>}
        </form>
      </section>

      <section style={{ marginTop: 24, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, padding: 12 }}>
        <h3>Cambiar contraseña</h3>
        <form onSubmit={submitPass}>
          <div>
            <label>Contraseña actual</label>
            <input type="password" value={contrasenaActual} onChange={(e) => setContrasenaActual(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Nueva contraseña</label>
            <input type="password" value={contrasenaNueva} onChange={(e) => setContrasenaNueva(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <button type="submit" disabled={loadingPass} style={{ marginTop: 12 }}>
            {loadingPass ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
          {msgPass && <p style={{ color: 'var(--primary)' }}>{msgPass}</p>}
          {errPass && <p style={{ color: 'var(--primary)' }}>{errPass}</p>}
        </form>
      </section>
    </div>
  );
};

export default AccountSettingsPage;
