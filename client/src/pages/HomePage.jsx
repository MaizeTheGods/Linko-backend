import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/http.js';
import Post from '../components/Post.jsx';
import PostSkeleton from '../components/PostSkeleton.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';

const HomePage = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [files, setFiles] = useState([]);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(location.state?.error || '');
  const [show404, setShow404] = useState(location.state?.status === 404);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  const safeApiCall = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      console.error('API Error:', err);
      return null;
    }
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (show404) {
      const timer = setTimeout(() => {
        setShow404(false);
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show404]);

  const fetchPosts = async (nextPage = 1, append = false) => {
    try {
      const response = await safeApiCall(() => api.get('/posts', { params: { page: nextPage, limit } }));
      let data = Array.isArray(response?.data) ? response.data : [];

      // Helper: mezcla "explore" para rellenar el feed cuando venga vacío o corto
      const maybeBlendExplore = async (current, opts) => {
        try {
          const exp = await safeApiCall(() => api.get('/posts/explore', opts));
          let extra = Array.isArray(exp?.data) ? exp.data : [];
          // Excluir mis propias publicaciones
          const userId = user?.id_usuario;
          if (userId) extra = extra.filter((p) => p?.usuario?.id_usuario !== userId);
          // Evitar duplicados por id_publicacion
          const seen = new Set((current || []).map((p) => p.id_publicacion));
          return (current || []).concat(extra.filter((p) => !seen.has(p.id_publicacion))).slice(0, opts.max);
        } catch {
          return current || [];
        }
      };

      if (!append && nextPage === 1) {
        // Si la primera página es vacía o viene muy corta, mezclamos explorar
        if (data.length === 0 || data.length < limit) {
          data = await maybeBlendExplore(data, { pageNum: 1, max: limit });
        }
        setPosts(data);
        setHasMore(data.length === limit);
      } else {
        // Paginación: si viene vacío, intentamos tomar esa página desde explorar
        if (Array.isArray(data) && data.length === 0) {
          const blended = await maybeBlendExplore([], { pageNum: nextPage, max: limit });
          setPosts((prev) => prev.concat(blended));
          setHasMore(blended.length === limit);
        } else {
          setPosts((prev) => prev.concat(data));
          setHasMore(data.length === limit);
        }
      }
    } catch (err) {
      setError('No se pudieron cargar las publicaciones.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, false);
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore) {
        const np = page + 1;
        setLoadingMore(true);
        setPage(np);
        fetchPosts(np, true);
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [page, hasMore, loadingMore]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && files.length === 0) return;
    setSubmitting(true);
    let stage = 'upload';
    try {
      // Log selected files
      try {
        // eslint-disable-next-line no-console
        console.info('[POST_SUBMIT] starting', {
          filesCount: files.length,
          files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        });
      } catch {}
      let archivos = [];
      if (files.length > 0) {
        const form = new FormData();
        files.forEach((f) => form.append('imagenes', f));
        try { 
          const response = await safeApiCall(() => api.post('/posts', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          }));
          return response.data;
        } catch {}
      }
      // Extract etiquetas from content: @username
      const etiquetas = Array.from(new Set((postContent.match(/@([a-zA-Z0-9_]+)/g) || []).map((m) => m.slice(1))));

      // Optional poll payload
      let encuesta = undefined;
      if (pollEnabled) {
        const opts = (pollOptions || []).map((s) => s.trim()).filter(Boolean);
        if (pollQuestion.trim() && opts.length >= 2) {
          encuesta = { pregunta: pollQuestion.trim(), opciones: opts.slice(0, 4) };
        }
      }

      stage = 'createPost';
      try { console.info('[POST_CREATE] sending to /api/posts', { archivos: archivos.length, etiquetas: etiquetas.length, encuesta: !!encuesta }); } catch {}
      await safeApiCall(() => api.post('/posts', { texto_contenido: postContent.trim(), archivos, etiquetas, encuesta }));
      try { console.info('[POST_CREATE] success'); } catch {}
      setPostContent('');
      setFiles([]);
      setPollEnabled(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      // reset feed and fetch first page
      setPage(1);
      setHasMore(true);
      setLoading(true);
      fetchPosts(1, false);
    } catch (err) {
      try {
        // eslint-disable-next-line no-console
        console.error('[POST_SUBMIT_FAILED]', {
          stage,
          message: err?.response?.data?.message || err?.message,
          status: err?.response?.status,
          response: err?.response?.data,
        });
      } catch {}
      const serverMsg = err?.response?.data?.message;
      const fallback = stage === 'upload' ? 'Error al subir archivos.' : 'Error al crear la publicación.';
      setError(serverMsg ? `${fallback} (${serverMsg})` : fallback);
    } finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div style={{ padding: 16 }}>
        <h2 style={{ margin: '6px 0 10px' }}>Inicio</h2>
        <hr />
        <h3>Crear una nueva publicación</h3>
        <form onSubmit={handlePostSubmit}>
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="¿Qué estás pensando?"
            rows="3"
            style={{ width: '100%' }}
          ></textarea>
          <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
            Puedes mencionar usuarios con @usuario. Se incluirán como etiquetas.
          </div>
          {/* Composer actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {/* Hidden native input + label button */}
            <input
              id="composer-files"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              style={{ display: 'none' }}
            />
            <label htmlFor="composer-files" title="Adjuntar archivos" aria-label="Adjuntar archivos" style={{ ...iconBtnStyle(false), cursor: 'pointer' }}>
              <ClipIcon />
              <span style={{ fontWeight: 600 }}>{files.length > 0 ? `${files.length} archivo(s)` : 'Adjuntar'}</span>
            </label>

            <button
              type="button"
              onClick={() => setPollEnabled((v) => !v)}
              title="Encuesta"
              aria-label="Encuesta"
              style={{ ...iconBtnStyle(pollEnabled), cursor: 'pointer' }}
            >
              <PollIcon />
              <span style={{ fontWeight: 600 }}>{pollEnabled ? 'Encuesta' : 'Encuesta'}</span>
            </button>

            <button
              type="submit"
              disabled={submitting || (!postContent.trim() && files.length === 0)}
              title="Publicar"
              aria-label="Publicar"
              style={{ ...iconBtnStyle(false), marginLeft: 'auto', cursor: 'pointer' }}
            >
              <SendIcon />
              <span style={{ fontWeight: 700 }}>{submitting ? 'Publicando…' : 'Publicar'}</span>
            </button>
          </div>
          {/* Poll creator (optional) */}
          <div style={{ marginTop: 8, border: '1px solid var(--border)', background: 'var(--surface)', padding: 8, borderRadius: 8 }}>
            {pollEnabled && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Pregunta de la encuesta"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  style={{ width: '100%', marginBottom: 6 }}
                />
                {pollOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder={`Opción ${idx + 1}`}
                      value={opt}
                      onChange={(e) => setPollOptions((arr) => arr.map((v, i) => (i === idx ? e.target.value : v)))}
                      style={{ flex: 1 }}
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => setPollOptions((arr) => arr.filter((_, i) => i !== idx))}>-</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button type="button" onClick={() => setPollOptions((arr) => [...arr, ''])}>Añadir opción</button>
                )}
              </div>
            )}
          </div>
          
        </form>
        {error && <p style={{ color: 'var(--primary)' }}>{error}</p>}
        {show404 && <p style={{ color: 'var(--primary)' }}>Página no encontrada.</p>}
        <hr />
        <h3>Feed de Publicaciones</h3>
        <div>
          {loading && posts.length === 0 ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </>
          ) : posts.length === 0 ? (
            <p>No hay publicaciones todavía. ¡Sé el primero!</p>
          ) : (
            <>
              {posts.map((post) => (
                <Post key={post.id_publicacion} post={post} onDeleted={() => fetchPosts(1, false)} onUpdated={() => fetchPosts(1, false)} />
              ))}
              {loadingMore && (
                <div style={{ marginTop: 12 }}>
                  <PostSkeleton />
                </div>
              )}
              <div ref={sentinelRef} />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;

// --- Small UI primitives (icons + button style) ---
const iconBtnStyle = (active = false) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderRadius: 10,
  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
  background: active ? 'rgba(246, 177, 122, 0.12)' : 'var(--surface)',
  color: 'var(--text)',
  transition: 'transform 0.06s ease-in-out, background-color 0.2s, border-color 0.2s',
});

function ClipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.05 18.67a2 2 0 1 1-2.83-2.83l8.48-8.49"/>
    </svg>
  );
}

function PollIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V10"/>
      <path d="M10 21V3"/>
      <path d="M16 21v-6"/>
      <path d="M22 21V8"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13"/>
      <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>
  );
}
