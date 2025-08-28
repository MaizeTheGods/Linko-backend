import { useState, useEffect } from 'react';
import api from '../api/http.js';

export default function usePosts(fetchUrl, initialPosts = []) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async () => {
    if (!hasMore) return;
    
    try {
      setLoading(true);
      const res = await api.get(fetchUrl);
      setPosts(prev => [...prev, ...res.data]);
      setHasMore(res.data.length > 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchUrl]);

  return {
    posts,
    loading,
    error,
    hasMore,
    fetchMore: fetchPosts,
    setPosts
  };
}
