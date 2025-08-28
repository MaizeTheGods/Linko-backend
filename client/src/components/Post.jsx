import React, { useState, useContext, useEffect, useRef } from 'react';
import api from '../api/http.js';
import Comment from './Comment.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import MediaCarousel from './MediaCarousel.jsx';
import useOnScreen from '../hooks/useOnScreen.js';

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

const Post = ({ post, onUpdated, onDeleted, onSavedChanged, autoOpenComments = false, inDetail = false }) => {
  const initialLiked = Array.isArray(post.me_gusta) && post.me_gusta.length > 0;
  const initialCount = post?._count?.me_gusta ?? 0;
  const initialCommentsCount = post?._count?.comentarios ?? 0;

  const navigate = useNavigate();

  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.texto_contenido || '');
  const [busy, setBusy] = useState(false);
  const { user } = useContext(AuthContext);
  const initialSaved = !!post?.guardado_por_mi || !!post?.saved;
  const [saved, setSaved] = useState(initialSaved);

  const renderWithMentions = (text) => {
    if (!text) return null;
    const parts = String(text).split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      const m = /^@([a-zA-Z0-9_]+)$/.exec(part);
      if (m) {
        const username = m[1];
        return (
          <Link key={idx} to={`/perfil/${username}`} style={{ color: 'var(--link)', textDecoration: 'none', fontWeight: 600 }}>
            @{username}
          </Link>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Poll (Encuesta) UI
  const [pollChoice, setPollChoice] = useState(null);
  const [pollBusy, setPollBusy] = useState(false);
  const [pollResults, setPollResults] = useState([]);
  const [pollTotal, setPollTotal] = useState(0);
  const [pollSelected, setPollSelected] = useState(null);
  const [pollLoading, setPollLoading] = useState(false);
  const pollData = post?.encuesta || post?.poll;

  const loadPollResults = async () => {
    if (!post?.id_publicacion || !pollData) return;
    setPollLoading(true);
    try {
      const res = await api.get(`/posts/${post.id_publicacion}/poll/results`);
      const { results = [], total = 0, selected = null } = res.data || {};
      setPollResults(results);
      setPollTotal(total);
      setPollSelected(selected);
      // For compatibility: when selected comes as id_opcion, convert to index
      if (Array.isArray(results) && results.length > 0 && selected != null) {
        const idx = results.findIndex(r => r.id_opcion === selected);
        if (idx >= 0) setPollChoice(idx);
      }
    } catch (e) {
      // ignore silently to avoid noisy UI
    } finally {
      setPollLoading(false);
    }
  };

  // Defer poll loading until the post is on screen
  const rootRef = useRef(null);
  const onScreen = useOnScreen(rootRef, '200px');

  useEffect(() => {
    if (onScreen) {
      loadPollResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScreen, post?.id_publicacion]);

  const handleVote = async (idx) => {
    if (!post?.id_publicacion) return;
    if (pollBusy) return;
    setPollBusy(true);
    const prev = pollChoice;
    setPollChoice(idx);
    try {
      await api.post(`/posts/${post.id_publicacion}/poll/vote`, { opcion: idx });
      await loadPollResults();
    } catch {
      // rollback
      setPollChoice(prev);
      setError('No se pudo registrar tu voto.');
    } finally {
      setPollBusy(false);
    }
  };

  const handleLike = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setError('');
    // Optimistic update
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      await api.post(`/posts/${post.id_publicacion}/like`, {});
    } catch (e) {
      // Revert on error
      setLiked(prevLiked);
      setCount(prevCount);
      setError('No se pudo actualizar el Me Gusta.');
    }
  };

  const handleSave = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setError('');
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) {
        await api.delete(`/posts/${post.id_publicacion}/save`);
        if (typeof onSavedChanged === 'function') onSavedChanged(false, post.id_publicacion);
      } else {
        await api.post(`/posts/${post.id_publicacion}/save`, {});
        if (typeof onSavedChanged === 'function') onSavedChanged(true, post.id_publicacion);
      }
    } catch (e) {
      setSaved(wasSaved);
      setError('No se pudo actualizar el guardado.');
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/posts/${post.id_publicacion}/comments`);
      setComments(res.data || []);
    } catch (e) {
      setError('No se pudieron cargar los comentarios.');
    } finally {
      setLoadingComments(false);
    }
  };

  // Abrir comentarios automáticamente si se solicita (por ejemplo, desde notificaciones)
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (autoOpenComments && !commentsVisible) {
        setCommentsVisible(true);
        if (comments.length === 0) {
          await loadComments();
          if (ignore) return;
        }
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenComments, post?.id_publicacion]);

  const toggleComments = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!inDetail) {
      navigate(`/post/${post.id_publicacion}`);
      return;
    }
    setCommentsVisible((v) => !v);
    if (!commentsVisible && comments.length === 0) {
      await loadComments();
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    setError('');
    const text = newCommentText.trim();
    if (!text) return;
    try {
      await api.post(`/posts/${post.id_publicacion}/comments`, { texto_comentario: text });
      setNewCommentText('');
      // Optimistic: increase count
      setCommentsCount((c) => c + 1);
      // Refresh list
      await loadComments();
    } catch (e) {
      setError('No se pudo publicar el comentario.');
    }
  };

  const onAfterReply = async () => {
    setCommentsCount((c) => c + 1);
    await loadComments();
  };

  return (
    <div
      className="post-card"
      ref={rootRef}
      onClick={() => { if (!inDetail) navigate(`/post/${post.id_publicacion}`); }}
      style={{ cursor: inDetail ? 'default' : 'pointer' }}
    >
      <h4 style={{ margin: 0 }}>{post.usuario?.nombre_perfil || 'Usuario'}</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {post.usuario?.nombre_usuario ? (
          <small>
            <Link to={`/perfil/${post.usuario.nombre_usuario}`} style={{ color: 'var(--link)', fontWeight: 600, textDecoration: 'none' }}>
              @{post.usuario.nombre_usuario}
            </Link>
          </small>
        ) : (
          <small>@usuario</small>
        )}
        {post?.fecha_creacion && (
          <small style={{ color: 'var(--muted)' }}>· {formatRelativeEs(post.fecha_creacion)}</small>
        )}
      </div>
      {!editing ? (
        <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{renderWithMentions(post.texto_contenido)}</p>
      ) : (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button disabled={busy} onClick={async () => {
              setBusy(true); setError('');
              try {
                await api.put(`/posts/${post.id_publicacion}`, { texto_contenido: editText });
                setEditing(false);
                if (onUpdated) onUpdated();
              } catch {
                setError('No se pudo actualizar la publicación');
              } finally { setBusy(false); }
            }}>Guardar</button>
            <button disabled={busy} onClick={() => { setEditing(false); setEditText(post.texto_contenido || ''); }}>Cancelar</button>
          </div>
        </div>
      )}
      {Array.isArray(post.archivos) && post.archivos.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <MediaCarousel items={post.archivos} />
        </div>
      )}
      {pollData && Array.isArray(pollData.opciones) && pollData.opciones.length > 1 && (
        <div style={{ marginTop: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', borderRadius: 10, padding: 12 }}>
          {pollData.pregunta && <div style={{ fontWeight: 600, marginBottom: 8 }}>{pollData.pregunta}</div>}
          <div style={{ display: 'grid', gap: 8 }}>
            {pollLoading ? (
              <div style={{ color: 'var(--muted)' }}>Cargando resultados…</div>
            ) : (
              pollData.opciones.slice(0, 4).map((opt, idx) => {
                const optText = typeof opt === 'string' ? opt : (opt?.texto || `Opción ${idx + 1}`);
                // Try to get count from pollResults by orden or text match
                const r = pollResults.find(o => o.orden === idx) || pollResults[idx] || null;
                const votos = r?.votos ?? 0;
                const pct = pollTotal > 0 ? Math.round((votos * 100) / pollTotal) : 0;
                const isChosen = pollChoice === idx || pollSelected === r?.id_opcion;
                return (
                  <div key={idx} style={{ display: 'grid', gap: 6 }}>
                    <button
                      disabled={pollBusy}
                      onClick={() => handleVote(idx)}
                      style={{ textAlign: 'left', backgroundColor: 'var(--card)', color: 'var(--text)', border: `1px solid ${isChosen ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px', position: 'relative', overflow: 'hidden' }}
                      title={pollBusy ? 'Procesando…' : 'Votar'}
                    >
                      <span style={{ position: 'relative', zIndex: 2, fontWeight: isChosen ? 700 : 500 }}>
                        {optText}
                        {isChosen ? ' ✓' : ''}
                      </span>
                      <span
                        aria-hidden
                        style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(37, 99, 235, 0.35)', zIndex: 1, transition: 'width 0.25s ease' }}
                      />
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                      <span>{votos} votos</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {error && <div style={{ color: 'var(--primary)', marginTop: 6 }}>{error}</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <button
          className="icon-btn"
          onClick={handleLike}
          title={liked ? 'Quitar Me Gusta' : 'Me Gusta'}
          aria-label="Me Gusta"
          style={{ ...iconBtnStyle(liked), cursor: 'pointer' }}
        >
          <HeartIcon filled={liked} />
          <span style={{ fontWeight: 600 }}>{count}</span>
        </button>

        <button
          className="icon-btn"
          onClick={toggleComments}
          title="Comentarios"
          aria-label="Comentarios"
          style={{ ...iconBtnStyle(false), cursor: 'pointer' }}
        >
          <CommentIcon />
          <span style={{ fontWeight: 600 }}>{commentsCount}</span>
        </button>

        <button
          className="icon-btn"
          onClick={handleSave}
          title={saved ? 'Quitar guardado' : 'Guardar'}
          aria-label="Guardar"
          style={{ ...iconBtnStyle(saved), cursor: 'pointer' }}
        >
          <BookmarkIcon filled={saved} />
          <span className="btn-label" style={{ fontWeight: 600 }}>{saved ? 'Guardado' : 'Guardar'}</span>
        </button>

        {user?.id_usuario && post?.usuario?.id_usuario === user.id_usuario && !editing && (
          <>
            <button
              className="icon-btn"
              onClick={(e) => { if (e.stopPropagation) e.stopPropagation(); setEditing(true); }}
              title="Editar"
              aria-label="Editar"
              style={{ ...iconBtnStyle(false), cursor: 'pointer' }}
            >
              <EditIcon />
              <span className="btn-label" style={{ fontWeight: 600 }}>Editar</span>
            </button>
            <button
              className="icon-btn"
              onClick={async () => {
                // prevent card navigation
                // (wrapping in async arrow makes getting event harder; rely on confirm modal not to bubble)
                if (!window.confirm('¿Eliminar esta publicación?')) return;
                setBusy(true); setError('');
                try {
                  await api.delete(`/posts/${post.id_publicacion}`);
                  if (onDeleted) onDeleted();
                } catch {
                  setError('No se pudo eliminar la publicación');
                } finally { setBusy(false); }
              }}
              title="Eliminar"
              aria-label="Eliminar"
              style={{ ...iconBtnStyle(false), cursor: 'pointer' }}
            >
              <TrashIcon />
              <span className="btn-label" style={{ fontWeight: 600 }}>Eliminar</span>
            </button>
          </>
        )}
      </div>
      {error && <div style={{ color: 'var(--primary)', marginTop: 8 }}>{error}</div>}

      {inDetail && commentsVisible && (
        <div style={{ marginTop: 10, textAlign: 'left' }}>
          <form onSubmit={submitComment} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Escribe un comentario..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="input-white"
              style={{ flex: 1 }}
            />
            <button type="submit">Enviar</button>
          </form>
          <div style={{ marginTop: 10 }}>
            {loadingComments ? (
              <p>Cargando comentarios...</p>
            ) : comments.length === 0 ? (
              <p>Sin comentarios aún.</p>
            ) : (
              comments.map((c) => (
                <Comment
                  key={c.id_comentario}
                  comment={c}
                  postId={post.id_publicacion}
                  onAfterReply={onAfterReply}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Small UI primitives for action icons ---
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

function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>
  );
}

export default Post;
