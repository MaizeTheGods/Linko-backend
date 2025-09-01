import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/http.js';
import Post from '../components/Post.jsx';

const PostDetailPage = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await api.get(`posts/${id}`);
        if (mounted) setPost(res.data);
      } catch (e) {
        if (mounted) setError('No se pudo cargar la publicación.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Publicación</h2>
      <div style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 12, padding: 12 }}>
        {loading ? (
          <div style={{ padding: 16, color: 'var(--muted)' }}>Cargando…</div>
        ) : error ? (
          <div style={{ padding: 16, color: 'var(--primary)' }}>{error}</div>
        ) : !post ? (
          <div style={{ padding: 16, color: 'var(--muted)' }}>Publicación no encontrada.</div>
        ) : (
          <Post post={post} autoOpenComments={true} inDetail={true} />
        )}
      </div>
    </div>
  );
};

export default PostDetailPage;
