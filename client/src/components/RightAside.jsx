import React, { useEffect, useState } from 'react';
import api from '../api/http.js';

const cardStyle = {
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  borderRadius: 12,
  padding: 12,
};

const RightAside = () => {
  const [show, setShow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1200 : true));
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const onResize = () => setShow(window.innerWidth >= 1200);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!show) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/posts/trends', { params: { limit: 5, days: 7 } });
        if (!mounted) return;
        const list = Array.isArray(data?.trends) ? data.trends : [];
        setTrends(list);
        setError('');
      } catch (e) {
        setError('No se pudieron cargar las tendencias');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [show]);

  if (!show) return null;

  return (
    <aside style={{ position: 'sticky', top: 12, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          placeholder="Buscar"
          aria-label="Buscar"
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            borderRadius: 999,
            outline: 'none',
          }}
        />
      </div>

      {/* Qué está pasando (datos reales) */}
      <section style={cardStyle}>
        <h3 style={{ margin: '4px 0 10px', fontSize: 18 }}>Qué está pasando</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && (
            <div style={{ color: 'var(--muted)' }}>Cargando tendencias…</div>
          )}
          {(!loading && error) && (
            <div style={{ color: 'var(--muted)' }}>{error}</div>
          )}
          {(!loading && !error && trends.length === 0) && (
            <div style={{ color: 'var(--muted)' }}>Aún no hay tendencias</div>
          )}
          {trends.map((t, idx) => {
            const title = t?.tag || '';
            const meta = typeof t?.count === 'number' ? `${t.count} publicaciones` : '';
            return (
              <a key={idx} href={`/explore?tag=${encodeURIComponent(title.replace(/^#/, ''))}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>Tendencia</div>
                  <div style={{ fontWeight: 700 }}>{title}</div>
                  {meta && (
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>{meta}</div>
                  )}
                </div>
              </a>
            );
          })}
          <a href="/explore" style={{ color: 'var(--link)', textDecoration: 'none', fontWeight: 600 }}>Mostrar más</a>
        </div>
      </section>
    </aside>
  );
};

export default RightAside;
