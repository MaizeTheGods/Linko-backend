import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/http.js';
import Post from '../components/Post.jsx';

const useDebounced = (value, delay = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const qParam = (params.get('q') || '').toString();
  const [q, setQ] = useState(qParam);
  const qDebounced = useDebounced(q, 350);

  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  useEffect(() => {
    const search = async () => {
      const query = qDebounced.trim();
      const queryCI = query.toLowerCase();
      setError('');
      setLoading(true);
      setUsers([]);
      setPosts([]);
      try {
        if (query.length === 0) return;
        // keep URL in sync
        setParams((prev) => {
          const p = new URLSearchParams(prev);
          if (query) p.set('q', query); else p.delete('q');
          return p;
        });
        // parallel requests
        const [uRes, pRes] = await Promise.all([
          api.get('search/users', { params: { q: queryCI, limit: 8 } }).catch(() => ({ data: [] })),
          api.get('search/posts', { params: { q: queryCI, limit: 12 } }).catch(() => ({ data: [] })),
        ]);
        setUsers(Array.isArray(uRes.data) ? uRes.data : []);
        setPosts(Array.isArray(pRes.data) ? pRes.data : []);
      } catch (e) {
        setError('No se pudo realizar la búsqueda.');
      } finally {
        setLoading(false);
      }
    };
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  const hint = useMemo(() => 'Busca usuarios (@usuario, nombre) y publicaciones (texto, #tag)', []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Buscar</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={q}
          placeholder={hint}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        />
      </div>
      {error && <p style={{ color: 'var(--primary)' }}>{error}</p>}

      {loading ? (
        <p>Buscando…</p>
      ) : qDebounced.trim().length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Escribe para buscar.</p>
      ) : (
        <>
          <h3>Usuarios</h3>
          {users.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>Sin resultados.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {users.map((u) => (
                <li key={u.id_usuario} style={{ padding: 0, margin: 0 }}>
                  <Link
                    to={`/perfil/${u.nombre_usuario}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 8,
                      borderBottom: '1px solid var(--border)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <img
                      src={u.foto_perfil_url || '/default-avatar.svg'}
                      alt={u.nombre_usuario}
                      width={36}
                      height={36}
                      style={{ borderRadius: '50%', objectFit: 'cover', background: 'var(--surface)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>@{u.nombre_usuario}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{u.nombre_perfil}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div style={{ height: 18 }} />
          <h3>Publicaciones</h3>
          {posts.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>Sin resultados.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {posts.map((p) => (
                <div key={p.id_publicacion} style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 12, padding: 10 }}>
                  <Post post={p} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
