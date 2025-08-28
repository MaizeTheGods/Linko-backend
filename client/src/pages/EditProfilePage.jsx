import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/http.js';
import { AuthContext } from '../context/AuthContext.jsx';

// Simple reusable file picker
function FilePicker({ id, accept, onChange, file, label = 'Elegir archivo' }) {
  const inputRef = useRef(null);
  const open = () => inputRef.current?.click();
  const name = file?.name || 'Ningún archivo seleccionado';
  return (
    <div className="filepicker">
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className="filepicker-input"
        onChange={(e) => onChange((e.target.files && e.target.files[0]) || null)}
      />
      <button type="button" className="btn btn-ghost filepicker-btn" onClick={open}>{label}</button>
      <span className="filepicker-name" title={name}>{name}</span>
    </div>
  );
}

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);
  const [nombrePerfil, setNombrePerfil] = useState('');
  const [biografia, setBiografia] = useState('');
  const [privado, setPrivado] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Offline-safe placeholders (no external requests)
  const AVATAR_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" rx="40" fill="%23e5e7eb"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999">80x80</text></svg>';
  const COVER_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><rect width="100%" height="100%" rx="8" fill="%23e5e7eb"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="%23999">400x120</text></svg>';

  useEffect(() => {
    if (user) {
      setNombrePerfil(user.nombre_perfil || '');
      setBiografia(user.biografia || '');
      setPrivado(!!user.perfil_privado);
      setAvatarUrl(user.foto_perfil_url || '');
      setCoverUrl(user.foto_portada_url || '');
    }
  }, [user]);

  const uploadSingle = async (file) => {
    const form = new FormData();
    form.append('images', file);
    const res = await api.post('/upload', form);
    const url = res?.data?.archivos?.[0]?.url;
    if (!url) throw new Error('No se recibió URL de la imagen');
    return url;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      let newAvatarUrl = null;
      let newCoverUrl = null;
      if (avatarFile) newAvatarUrl = await uploadSingle(avatarFile);
      if (coverFile) newCoverUrl = await uploadSingle(coverFile);

      const payload = {
        nombre_perfil: nombrePerfil,
        biografia: biografia ?? null,
        perfil_privado: !!privado,
      };
      if (newAvatarUrl) payload.foto_perfil_url = newAvatarUrl;
      if (newCoverUrl) payload.foto_portada_url = newCoverUrl;

      const { data } = await api.patch('/users/me', payload);
      setUser((prev) => ({ ...(prev || {}), ...data }));
      setAvatarUrl(data?.foto_perfil_url ?? avatarUrl);
      setCoverUrl(data?.foto_portada_url ?? coverUrl);
      setAvatarFile(null);
      setCoverFile(null);
      setSuccess('Perfil actualizado');
      // navigate(`/perfil/${data.nombre_usuario}`);
    } catch (err) {
      const d = err?.response?.data;
      const msg = d?.message || d?.error?.message || err?.message || 'No se pudo actualizar el perfil';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="settings-header">
        <h2>Editar Perfil</h2>
        <div className="tabs">
          <Link className="tab" to="/settings/account">Cuenta</Link>
          <button type="button" className="tab btn btn-ghost" onClick={handleLogout}>Salir</button>
        </div>
      </div>
      <div className="divider" />
      <form onSubmit={handleSubmit} className="card">
        <div className="media">
          <div>
            <label className="label">Avatar</label>
            <div style={{ margin: '8px 0' }}>
              <img
                src={avatarFile ? URL.createObjectURL(avatarFile) : (avatarUrl || AVATAR_PLACEHOLDER)}
                alt="avatar"
                className="avatar-preview"
              />
            </div>
            <FilePicker id="avatar" accept="image/*" file={avatarFile} onChange={setAvatarFile} label="Seleccionar" />
            <div className="help">PNG, JPG, AVIF hasta 25MB</div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Portada</label>
            <div style={{ margin: '8px 0' }}>
              {coverFile && coverFile.type && coverFile.type.startsWith('video/') ? (
                <video className="cover-preview" src={URL.createObjectURL(coverFile)} controls />
              ) : (
                <img
                  src={coverFile ? URL.createObjectURL(coverFile) : (coverUrl || COVER_PLACEHOLDER)}
                  alt="cover"
                  className="cover-preview"
                />
              )}
            </div>
            <FilePicker id="cover" accept="image/*,video/*" file={coverFile} onChange={setCoverFile} label="Seleccionar" />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="label">Nombre de Perfil</label>
          <input
            type="text"
            value={nombrePerfil}
            onChange={(e) => setNombrePerfil(e.target.value)}
            className="input"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="label">Biografía</label>
          <textarea
            value={biografia}
            onChange={(e) => setBiografia(e.target.value)}
            rows={3}
            className="textarea"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>
            <input type="checkbox" checked={privado} onChange={(e) => setPrivado(e.target.checked)} /> Perfil privado
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Volver</button>
        </div>

        {error && <p className="help" style={{ color: 'crimson' }}>{error}</p>}
        {success && <p className="help" style={{ color: 'seagreen' }}>{success}</p>}
      </form>
    </div>
  );
};

export default EditProfilePage;
