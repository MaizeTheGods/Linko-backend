import React from 'react';

const shimmer = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.06) 63%)',
  backgroundSize: '400% 100%',
  animation: 'shimmer 1.4s ease infinite',
};

const PostSkeleton = () => {
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <style>
        {`@keyframes shimmer { 0% { background-position: 100% 0 } 100% { background-position: 0 0 } }`}
      </style>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', ...shimmer }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '40%', height: 10, borderRadius: 4, ...shimmer, marginBottom: 6 }} />
          <div style={{ width: '30%', height: 10, borderRadius: 4, ...shimmer }} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ width: '100%', height: 10, borderRadius: 4, ...shimmer, marginBottom: 6 }} />
        <div style={{ width: '90%', height: 10, borderRadius: 4, ...shimmer, marginBottom: 6 }} />
        <div style={{ width: '85%', height: 10, borderRadius: 4, ...shimmer }} />
      </div>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ height: 80, borderRadius: 6, ...shimmer }} />
        <div style={{ height: 80, borderRadius: 6, ...shimmer }} />
        <div style={{ height: 80, borderRadius: 6, ...shimmer }} />
      </div>
    </div>
  );
};

export default PostSkeleton;

