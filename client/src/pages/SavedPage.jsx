import React, { useEffect, useState } from 'react';
import api from '../api/http.js';
import Post from '../components/Post.jsx';

const SavedPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`posts/saved?page=${p}&limit=20`);
      const data = Array.isArray(res.data) ? res.data : [];
      const normalized = data.map((post) => ({ ...post, saved: post.guardado_por_mi ?? true }));
      setItems((prev) => (p === 1 ? normalized : [...prev, ...normalized]));
      setHasMore(data.length === 20);
    } catch (e) {
      setError('No se pudieron cargar tus guardados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  const handleDeleted = (id) => {
    setItems((prev) => prev.filter((p) => p.id_publicacion !== id));
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Guardados</h2>

      {loading && items.length === 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 12, padding: 16 }}>
          <p>Cargando…</p>
        </div>
      )}

      {error && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 12, padding: 16 }}>
          <p style={{ color: 'var(--primary)' }}>{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 12, padding: 16 }}>
          <p style={{ color: 'var(--muted)' }}>Aún no has guardado publicaciones.</p>
        </div>
      )}

      {items.map((post) => (
        <Post
          key={post.id_publicacion}
          post={post}
          onUpdated={() => { /* no-op: saved list doesn't change content on edit */ }}
          onDeleted={() => handleDeleted(post.id_publicacion)}
          onSavedChanged={(isSaved, id) => {
            if (!isSaved) handleDeleted(id);
          }}
        />
      ))}

      {hasMore && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
          <button onClick={() => { const next = page + 1; setPage(next); fetchPage(next); }}>Cargar más</button>
        </div>
      )}
    </div>
  );
};

export default SavedPage;
