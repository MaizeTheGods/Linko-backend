import React, { useState } from 'react';

const MediaCarousel = ({ items = [] }) => {
  const [index, setIndex] = useState(0);
  if (!Array.isArray(items) || items.length === 0) return null;
  const current = items[Math.max(0, Math.min(index, items.length - 1))];

  const go = (dir) => {
    const next = (index + dir + items.length) % items.length;
    setIndex(next);
  };

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {current?.tipo_archivo === 'VIDEO' ? (
        <video
          key={current.id_archivo || current.url_archivo}
          src={current.url_archivo}
          controls
          playsInline
          style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain', background: 'var(--bg)' }}
        />
      ) : (
        <img
          key={current.id_archivo || current.url_archivo}
          src={current.url_archivo}
          alt="media"
          style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain', background: 'var(--bg)', display: 'block' }}
          loading="lazy"
        />
      )}

      {items.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', background: 'rgba(246, 177, 122, 0.15)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
            aria-label="Anterior"
          >‹</button>
          <button
            onClick={() => go(1)}
            style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', background: 'rgba(246, 177, 122, 0.15)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
            aria-label="Siguiente"
          >›</button>
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
            {items.map((_, i) => (
              <span key={i} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', margin: 3, background: i === index ? 'var(--primary)' : 'rgba(255,255,255,0.45)' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MediaCarousel;
