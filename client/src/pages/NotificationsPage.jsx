import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/http.js';

function formatRelativeEs(dateInput) {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);

  const isFuture = diffMs > 0;

  if (abs < 60 * 60000) {
    const n = Math.max(1, min);
    return isFuture ? `dentro de ${n} min` : `hace ${n} min`;
  }
  if (abs < 24 * 3600000) {
    const n = Math.max(1, hr);
    return isFuture ? `dentro de ${n} horas` : `hace ${n} horas`;
  }
  if (abs < 7 * 86400000) {
    const n = Math.max(1, day);
    return isFuture ? `dentro de ${n} día${n > 1 ? 's' : ''}` : `hace ${n} día${n > 1 ? 's' : ''}`;
  }
  // Después de una semana: fecha corta DD/MM/YYYY
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const NotificationsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await api.get('notifications');
        if (mounted) setItems(Array.isArray(res.data) ? res.data : []);
        // Marcar como leídas al abrir la página
        try { await api.post('notifications/mark-read'); } catch {}
      } catch (e) {
        if (mounted) setError('No se pudieron cargar las notificaciones.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Notificaciones</h2>
      <div style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 12, padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando…</div>
        ) : error ? (
          <div style={{ padding: 16, color: 'var(--primary)' }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--muted)' }}>Aún no hay notificaciones.</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((n, idx) => (
              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface)', display: 'grid', placeItems: 'center', fontSize: 12 }}>
                    {n.type === 'LIKE' ? '❤' : n.type === 'COMMENT' ? '💬' : '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}>
                      {n.type === 'FOLLOW' ? (
                        <span><strong>{n.actor?.nombre_perfil || n.actor?.nombre_usuario || 'Alguien'}</strong> empezó a seguirte</span>
                      ) : (
                        <Link to={n?.post_id ? `/post/${n.post_id}` : '#'} style={{ color: 'inherit', textDecoration: n?.post_id ? 'none' : 'line-through' }}>
                          {n.type === 'LIKE' ? (
                            <span><strong>{n.actor?.nombre_perfil || n.actor?.nombre_usuario || 'Alguien'}</strong> le dio Me Gusta a tu publicación</span>
                          ) : (
                            <span><strong>{n.actor?.nombre_perfil || n.actor?.nombre_usuario || 'Alguien'}</strong> comentó: {n.excerpt || ''}</span>
                          )}
                        </Link>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatRelativeEs(n.created_at)}</div>
                    {n?.post && n.type !== 'FOLLOW' && (
                      <Link to={n?.post_id ? `/post/${n.post_id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, padding: 8 }}>
                          {n.post.thumb_url && (
                            <img src={n.post.thumb_url} alt="thumb" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
                          )}
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                            {n.post.text_excerpt || 'Ver publicación'}
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
