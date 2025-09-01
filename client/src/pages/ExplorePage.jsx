import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/http.js';
import Post from '../components/Post.jsx';
import PostSkeleton from '../components/PostSkeleton.jsx';

const ExplorePage = () => {
  const [searchParams] = useSearchParams();
  const tagParam = (searchParams.get('tag') || '').toString();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const load = async (nextPage = 1, append = false) => {
      try {
        const res = await api.get('posts/explore', { params: { page: nextPage, limit, tag: tagParam } });
        const data = res.data || [];
        setPosts((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === limit);
      } catch (e) {
        setError('No se pudieron cargar las publicaciones de explorar.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    // reset when tag changes
    setLoading(true);
    setPage(1);
    setHasMore(true);
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagParam]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore) {
        const np = page + 1;
        setLoadingMore(true);
        setPage(np);
        // call loader defined in first effect via direct API call here
        api.get('posts/explore', { params: { page: np, limit } })
          .then((res) => {
            const data = res.data || [];
            setPosts((prev) => [...prev, ...data]);
            setHasMore(data.length === limit);
          })
          .catch(() => setError('No se pudieron cargar más publicaciones.'))
          .finally(() => setLoadingMore(false));
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [page, hasMore, loadingMore, tagParam]);

  if (loading && posts.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Explorar</h2>
        {Array.from({ length: 6 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{tagParam ? `Tendencia: #${tagParam}` : 'Explorar'}</h2>
        <a href="/">Volver al inicio</a>
      </div>
      {error && <p style={{ color: 'var(--primary)' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {posts.length === 0 ? (
          <p>No hay publicaciones aún.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id_publicacion} style={{ border: '1px solid var(--border)', background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 12, padding: 12 }}>
              <Post post={post} />
            </div>
          ))
        )}
        {loadingMore && (
          <div style={{ gridColumn: '1 / -1' }}>
            <PostSkeleton />
          </div>
        )}
        <div ref={sentinelRef} />
      </div>
    </div>
  );
};

export default ExplorePage;
