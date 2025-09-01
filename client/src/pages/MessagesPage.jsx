import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/http.js';

const useIsMobile = () => {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 900 : false));
  useEffect(() => {
    const onR = () => setM(window.innerWidth <= 900);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return m;
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  const w = Math.floor(days / 7);
  if (w < 4) return `${w}w`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo`;
  const y = Math.floor(days / 365);
  return `${y}y`;
};

const MessagesPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { username } = useParams();
  const [params] = useSearchParams();
  const uidParam = params.get('uid');

  const [loadingList, setLoadingList] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [listError, setListError] = useState('');
  const [q, setQ] = useState('');

  const [otherUser, setOtherUser] = useState(null); // { id_usuario, nombre_usuario, nombre_perfil, foto_perfil_url }
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [convError, setConvError] = useState('');
  const [text, setText] = useState('');
  const endRef = useRef(null);
  // Attachments for media (images/videos)
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]); // File[]
  const [uploading, setUploading] = useState(false);
  const [block, setBlock] = useState({ blockedByMe: false, blockedMe: false, loading: false });

  const activeUserId = useMemo(() => {
    const n = parseInt(uidParam || '', 10);
    return Number.isFinite(n) ? n : null;
  }, [uidParam]);

  const scrollToBottom = () => {
    try { endRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  };

  // Load conversation list
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingList(true);
      setListError('');
      try {
        const res = await api.get('/dm');
        if (!cancelled) setConversations(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) setListError('No se pudieron cargar tus conversaciones.');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Resolve other user when on /messages/:username
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!username && !activeUserId) { setOtherUser(null); setMessages([]); return; }
      setLoadingConv(true);
      setConvError('');
      try {
        let id = activeUserId;
        let other = null;
        if (!id) {
          const ures = await api.get(`/users/${username}`);
          id = ures.data?.id_usuario;
          other = ures.data || null;
        }
        if (!id) throw new Error('Usuario no encontrado');
        if (!other) {
          // try to find in conversations cache
          const fromList = conversations.find((c) => c?.otro_usuario?.id_usuario === id)?.otro_usuario;
          other = fromList || null;
        }
        if (!cancelled) setOtherUser(other || { id_usuario: id, nombre_usuario: username });

        // Load messages
        const mres = await api.get(`/dm/${id}/messages`, { params: { page: 1, limit: 50 } });
        const msgs = mres.data?.messages || mres.data || [];
        if (!cancelled) setMessages(Array.isArray(msgs) ? msgs : []);

        // Mark as read (best-effort)
        try { await api.post(`/dm/${id}/read`); } catch {}

        // Load block status (best-effort)
        try {
          const bres = await api.get(`/users/${id}/blocks`);
          if (!cancelled) setBlock({ blockedByMe: !!bres.data?.blockedByMe, blockedMe: !!bres.data?.blockedMe, loading: false });
        } catch {}

        // Scroll
        setTimeout(scrollToBottom, 20);
      } catch (e) {
        if (!cancelled) setConvError('No se pudo abrir la conversación.');
      } finally {
        if (!cancelled) setLoadingConv(false);
      }
    };
    resolve();
  }, [username, activeUserId]);

  // Polling for new messages while a conversation is open
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      if (!otherUser?.id_usuario) return;
      try {
        const mres = await api.get(`/dm/${otherUser.id_usuario}/messages`, { params: { page: 1, limit: 50 } });
        const msgs = mres.data?.messages || mres.data || [];
        if (!stop) setMessages(Array.isArray(msgs) ? msgs : []);
      } catch {}
    };
    const t = setInterval(poll, 6000);
    return () => { stop = true; clearInterval(t); };
  }, [otherUser?.id_usuario]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!otherUser?.id_usuario) return;
    const content = (text || '').toString().replace(/\s+/g, ' ').trim();
    if (content.length === 0 && files.length === 0) return;
    if (content.length > 1000) { alert('El mensaje es demasiado largo (máximo 1000 caracteres).'); return; }
    try {
      let lastSaved = null; // track last saved/created message for conversation preview
      // 1) If media attached, upload first and send each URL as its own message
      if (files.length > 0) {
        setUploading(true);
        const fd = new FormData();
        for (const f of files) fd.append('images', f);
        const up = await api.post('upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const arr = up.data?.archivos || [];
        for (const a of arr) {
          const url = a?.url || '';
          if (!url) continue;
          // Send each media URL as a message
          try {
            const mres = await api.post(`/dm/${otherUser.id_usuario}/messages`, { contenido: url });
            const savedM = mres.data?.message || null;
            if (savedM) setMessages((prev) => [...prev, savedM]);
            else setMessages((prev) => [...prev, { id_mensaje: Date.now() + Math.random(), contenido: url, fecha_creacion: new Date().toISOString(), id_remitente: -1 }]);
            lastSaved = savedM || { contenido: url, fecha_creacion: new Date().toISOString(), id_remitente: -1 };
          } catch {}
        }
        setFiles([]);
        setUploading(false);
        setTimeout(scrollToBottom, 10);
      }

      // 2) Send text if provided
      if (content.length > 0) {
        const res = await api.post(`/dm/${otherUser.id_usuario}/messages`, { contenido: content });
        const saved = res.data?.message || null;
        if (saved) setMessages((prev) => [...prev, saved]);
        else setMessages((prev) => [...prev, { id_mensaje: Date.now(), contenido: content, fecha_creacion: new Date().toISOString(), id_remitente: -1 }]);
        lastSaved = saved || { contenido: content, fecha_creacion: new Date().toISOString(), id_remitente: -1 };
      }
      // Ensure conversation shows up immediately in the list
      try {
        const nowIso = new Date().toISOString();
        setConversations((prev) => {
          const convId = lastSaved?.id_conversacion || prev.find((c) => c?.otro_usuario?.id_usuario === otherUser.id_usuario)?.id_conversacion || `temp-${otherUser.id_usuario}`;
          const updated = {
            id_conversacion: convId,
            ultima_actividad: nowIso,
            otro_usuario: otherUser,
            ultimo_mensaje: lastSaved || { contenido: content, fecha_creacion: nowIso, id_remitente: -1 },
            unread_count: 0,
            isFollowedByMe: true,
            isFollowingMe: false,
          };
          const exists = prev.findIndex((c) => c?.otro_usuario?.id_usuario === otherUser.id_usuario);
          if (exists >= 0) {
            const next = [...prev];
            next.splice(exists, 1);
            return [...next, updated];
          }
          return [updated, ...prev];
        });
      } catch {}
      setText('');
      setTimeout(scrollToBottom, 10);
    } catch (e2) {
      const status = e2?.response?.status;
      const msg = e2?.response?.data?.message || 'No se pudo enviar el mensaje';
      alert(status === 429 ? 'Estás enviando mensajes muy rápido. Intenta de nuevo en unos segundos.' : msg);
    }
  };

  const onPickFiles = (e) => {
    const sel = Array.from(e.target.files || []);
    // Limit to 5 as backend accepts up to 5
    const limited = sel.slice(0, 5);
    setFiles(limited);
  };

  const renderContent = (contenido) => {
    const text = String(contenido || '');
    const isUrl = /^https?:\/\//i.test(text);
    const isImg = isUrl && /(\.png|\.jpe?g|\.gif|\.webp|\.avif)(\?.*)?$/i.test(text) || /\/image\/upload\//.test(text);
    const isVid = isUrl && /(\.mp4|\.webm|\.ogg|\.mov)(\?.*)?$/i.test(text) || /\/video\/upload\//.test(text);
    if (isImg) return (<a href={text} target="_blank" rel="noreferrer" className="media"><img src={text} alt="media" /></a>);
    if (isVid) return (
      <div className="media">
        <video src={text} controls preload="metadata" />
      </div>
    );
    return <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>;
  };

  const openConversation = (c) => {
    if (!c?.otro_usuario?.nombre_usuario) return;
    navigate(`/messages/${c.otro_usuario.nombre_usuario}?uid=${c.otro_usuario.id_usuario}`);
  };

  // Toggle block/unblock current other user
  const toggleBlock = async () => {
    if (!otherUser?.id_usuario) return;
    setBlock((prev) => ({ ...prev, loading: true }));
    try {
      if (!block.blockedByMe) {
        await api.post(`/users/${otherUser.id_usuario}/block`);
      } else {
        await api.delete(`/users/${otherUser.id_usuario}/block`);
      }
      const st = await api.get(`/users/${otherUser.id_usuario}/blocks`);
      setBlock({ blockedByMe: !!st.data?.blockedByMe, blockedMe: !!st.data?.blockedMe, loading: false });
    } catch (e) {
      setBlock((prev) => ({ ...prev, loading: false }));
      alert('No se pudo actualizar el estado de bloqueo.');
    }
  };

  const filtered = useMemo(() => {
    const norm = (s) => (s || '').toString().toLowerCase();
    const term = norm(q);
    let list = conversations;
    if (term) list = list.filter((c) => norm(c?.otro_usuario?.nombre_perfil).includes(term) || norm(c?.otro_usuario?.nombre_usuario).includes(term));
    return list;
  }, [q, conversations]);

  const renderList = (
    <div className="dm-list">
      {/* Header */}
      <div style={{ padding: '4px 4px 12px 4px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Mensajes</div>
      </div>

      {/* Search */}
      <div className="dm-search">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="dm-search-input" />
      </div>

      {/* List */}
      <div className="dm-items">
        {loadingList && <p style={{ color: 'var(--muted)', padding: '4px 8px' }}>Cargando…</p>}
        {listError && <p style={{ color: 'var(--primary)', padding: '4px 8px' }}>{listError}</p>}
        {filtered.map((c) => {
          const other = c?.otro_usuario;
          const last = c?.ultimo_mensaje;
          const when = timeAgo(last?.fecha_creacion || c?.ultima_actividad);
          const unread = (c?.unread_count || 0) > 0;
          return (
            <button key={c.id_conversacion} onClick={() => openConversation(c)} className={`dm-item ${unread ? 'unread' : ''}`}>
              <img src={other?.foto_perfil_url || '/default-avatar.svg'} alt="avatar" className="avatar" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nameline">
                  <div className="name">{other?.nombre_perfil || other?.nombre_usuario}</div>
                  <div className="when">{when}</div>
                </div>
                <div className="subline">
                  {last?.contenido ? last.contenido : 'Sin mensajes'}
                </div>
              </div>
              {unread && <span className="unread-dot" />}
            </button>
          );
        })}
        {filtered.length === 0 && !loadingList && (
          <p style={{ color: 'var(--muted)', padding: '8px 12px' }}>No hay conversaciones.</p>
        )}
      </div>
    </div>
  );

  const renderConversation = (
    <div className="dm-thread">
      {/* Header */}
      <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{otherUser?.nombre_perfil || otherUser?.nombre_usuario || 'Conversación'}</div>
          {otherUser?.nombre_usuario && <div style={{ color: 'var(--muted)', fontSize: 12 }}>@{otherUser.nombre_usuario}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggleBlock} className="btn btn-ghost" disabled={block.loading}>
            {block.blockedByMe ? 'Desbloquear' : 'Bloquear'}
          </button>
          <Link to="/messages" className="btn btn-ghost" style={{ display: isMobile ? 'inline-flex' : 'none' }}>Volver</Link>
        </div>
      </div>

      {/* Messages list */}
      <div className="dm-messages">
        {loadingConv && <p style={{ color: 'var(--muted)' }}>Cargando conversación…</p>}
        {convError && <p style={{ color: 'var(--primary)' }}>{convError}</p>}
        {messages.map((m) => {
          const isOther = m.id_remitente === otherUser?.id_usuario;
          return (
            <div key={m.id_mensaje || `${m.fecha_creacion}-${m.id_remitente}`}
                 className={`message-row ${isOther ? 'message-row--other' : 'message-row--me'}`}>
              <div className={`bubble ${isOther ? 'bubble--other' : 'bubble--me'}`}>
                {renderContent(m.contenido)}
                <div className="time">{new Date(m.fecha_creacion).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Block status message */}
      {(block.blockedMe || block.blockedByMe) && (
        <div style={{ 
          margin: '16px 8px', 
          padding: '12px 16px', 
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: '12px', 
          color: 'var(--muted)', 
          textAlign: 'center',
          fontSize: '14px'
        }}>
          {block.blockedMe ? '🚫 No puedes enviar mensajes a este usuario' : '🔒 Has bloqueado a este usuario. Desbloquéalo para enviar mensajes'}
        </div>
      )}
      <form onSubmit={handleSend} className="dm-composer">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={block.blockedMe ? 'No puedes enviar mensajes a este usuario' : (block.blockedByMe ? 'Has bloqueado a este usuario' : 'Escribe un mensaje…')}
          maxLength={1000}
          className="dm-input input-white"
          disabled={block.blockedMe || block.blockedByMe}
        />
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={onPickFiles} style={{ display: 'none' }} />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          title={files.length > 0 ? `${files.length} adjunto(s)` : 'Adjuntar archivo'}
          aria-label={files.length > 0 ? `${files.length} adjunto(s)` : 'Adjuntar archivo'}
          disabled={block.blockedMe || block.blockedByMe || uploading}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            padding: 0,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)'
          }}
        >
          {/* Image-like icon inside rounded square */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="currentColor" strokeWidth="1.6"/>
            <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
            <path d="M5.5 17L10 12.5C10.6 11.9 11.6 11.9 12.2 12.5L18.5 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.8 13.3L18.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          {files.length > 0 && (
            <span style={{ marginLeft: 6, fontWeight: 700 }}>{files.length}</span>
          )}
        </button>
        <button
          type="submit"
          className="btn btn-ghost-success dm-send"
          title={uploading ? 'Enviando…' : 'Enviar'}
          aria-label={uploading ? 'Enviando…' : 'Enviar'}
          disabled={block.blockedMe || block.blockedByMe}
          style={{ width: 40, height: 40, borderRadius: 10, padding: 0, display: 'grid', placeItems: 'center' }}
        >
          {uploading ? (
            // Simple spinner
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M12 3a9 9 0 1 1-6.364 2.636" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            // Send icon (paper plane) only green stroke, no background
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#16a34a' }}>
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );

  const EmptyPane = (
    <div style={{ flex: 1, minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--border)', margin: '0 auto 12px', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>💬</div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Tus mensajes</div>
        <div style={{ color: 'var(--muted)', marginBottom: 12 }}>Envía un mensaje para iniciar una conversación.</div>
        <Link className="btn btn-primary btn-pill" to="/search">Enviar mensaje</Link>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 12, display: 'flex', minHeight: '70vh' }}>
        {/* Left list on desktop or when not in a conversation on mobile */}
        {!isMobile && renderList}
        {isMobile && !(username || otherUser) && renderList}

        {/* Right pane */}
        <div style={{ flex: 1, padding: 12 }}>
          {username || otherUser ? renderConversation : (!isMobile ? EmptyPane : null)}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
