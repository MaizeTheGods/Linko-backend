import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/http.js';

const DEFAULT_AVATAR = '/default-avatar.svg';

const FollowRequestsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('users/me/requests');
      setItems(data || []);
    } catch (e) {
      setError('No se pudieron cargar las solicitudes');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      const path = action === 'approve' ? `users/requests/${id}/approve` : `users/requests/${id}/reject`;
      await api.post(path, {});
      setItems((prev) => prev.filter((r) => r.seguidor?.id_usuario !== id));
    } catch (e) {
      // ignore
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Solicitudes de seguimiento</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/settings/profile">Editar Perfil</Link>
          <Link to="/settings/account">Cuenta</Link>
        </div>
      </div>
      <hr />
      {loading ? (
        <p>Cargando…</p>
      ) : error ? (
        <p style={{ color: 'var(--primary)' }}>{error}</p>
      ) : items.length === 0 ? (
        <p>No tienes solicitudes pendientes.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((req) => (
            <li key={req.seguidor?.id_usuario} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <img src={req.seguidor?.foto_perfil_url || DEFAULT_AVATAR} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{req.seguidor?.nombre_perfil}</div>
                <div style={{ color: 'var(--muted)' }}>@{req.seguidor?.nombre_usuario}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => act(req.seguidor?.id_usuario, 'approve')}
                  title="Aceptar"
                  aria-label="Aceptar"
                  style={{ ...iconBtnStyle(true), cursor: 'pointer' }}
                >
                  <ApproveIcon />
                  <span style={{ fontWeight: 600 }}>Aceptar</span>
                </button>
                <button
                  onClick={() => act(req.seguidor?.id_usuario, 'reject')}
                  title="Rechazar"
                  aria-label="Rechazar"
                  style={{ ...iconBtnStyle(false), cursor: 'pointer' }}
                >
                  <RejectIcon />
                  <span style={{ fontWeight: 600 }}>Rechazar</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Small UI helpers (local to this page)
const iconBtnStyle = (positive = false) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderRadius: 10,
  border: `1px solid ${positive ? 'var(--primary)' : 'var(--border)'}`,
  background: positive ? 'rgba(246, 177, 122, 0.12)' : 'var(--surface)',
  color: 'var(--text)'
});

function ApproveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M16 10l-5 5-3-3"/>
    </svg>
  );
}

function RejectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M15 9l-6 6M9 9l6 6"/>
    </svg>
  );
}

export default FollowRequestsPage;
