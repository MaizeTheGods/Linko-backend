import React, { useContext, useState } from 'react';
import api from '../api/http.js';
import { AuthContext } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

const Comment = ({ comment, postId, onAfterReply }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.texto_comentario || '');
  const { user } = useContext(AuthContext);

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

  const extractImageUrls = (text) => {
    if (!text) return [];
    try {
      const urlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/gi;
      const out = [];
      let m;
      while ((m = urlRegex.exec(text))) out.push(m[1]);
      return out.slice(0, 4);
    } catch {
      return [];
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    setError('');
    const text = replyText.trim();
    if (!text) return;
    try {
      await api.post(
        `/posts/${postId}/comments`,
        { texto_comentario: text, id_comentario_padre: comment.id_comentario }
      );
      setReplyText('');
      setIsReplying(false);
      if (onAfterReply) onAfterReply();
    } catch (e) {
      setError('No se pudo enviar la respuesta.');
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setError('');
    const text = editText.trim();
    if (!text) return;
    try {
      await api.put(`/comments/${comment.id_comentario}`, { texto_comentario: text });
      setIsEditing(false);
      if (onAfterReply) onAfterReply();
    } catch (e) {
      setError('No se pudo editar el comentario.');
    }
  };

  const deleteOwn = async () => {
    if (!window.confirm('¿Eliminar este comentario?')) return;
    setError('');
    try {
      await api.delete(`/comments/${comment.id_comentario}`);
      if (onAfterReply) onAfterReply();
    } catch (e) {
      setError('No se pudo eliminar el comentario.');
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div>
        <strong>{comment.usuario?.nombre_perfil || 'Usuario'}</strong>
        <span style={{ color: 'var(--muted)' }}> @{comment.usuario?.nombre_usuario}</span>
      </div>
      {!isEditing ? (
        <div style={{ marginTop: 4 }}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{renderWithMentions(comment.texto_comentario)}</div>
          {extractImageUrls(comment.texto_comentario).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6, marginTop: 6 }}>
              {extractImageUrls(comment.texto_comentario).map((url) => (
                <img key={url} src={url} alt="img" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submitEdit} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit">Guardar</button>
          <button type="button" onClick={() => { setIsEditing(false); setEditText(comment.texto_comentario || ''); }}>Cancelar</button>
        </form>
      )}
      <button onClick={() => setIsReplying((v) => !v)} style={{ marginTop: 4, marginRight: 8 }}>
        {isReplying ? 'Cancelar' : 'Responder'}
      </button>
      {user && comment.id_usuario === user.id_usuario && !isEditing && (
        <>
          <button onClick={() => setIsEditing(true)} style={{ marginTop: 4, marginRight: 8 }}>Editar</button>
          <button onClick={deleteOwn} style={{ marginTop: 4 }}>Eliminar</button>
        </>
      )}
      {error && <div style={{ color: 'var(--primary)', marginTop: 4 }}>{error}</div>}
      {isReplying && (
        <form onSubmit={submitReply} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            type="text"
            placeholder="Escribe una respuesta..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit">Enviar</button>
        </form>
      )}
      {Array.isArray(comment.respuestas) && comment.respuestas.length > 0 && (
        <div style={{ marginLeft: 16, borderLeft: '2px solid var(--border)', paddingLeft: 10, marginTop: 8 }}>
          {comment.respuestas.map((child) => (
            <Comment
              key={child.id_comentario}
              comment={child}
              postId={postId}
              onAfterReply={onAfterReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Comment;
