import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/http.js';
import Post from '../components/Post.jsx';

const DEFAULT_AVATAR = '/default-avatar.svg';
const DEFAULT_BANNER = '/default-banner.svg';

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;
      const base64 = token.split('.')[1];
      const payload = JSON.parse(atob(base64));
      return Number(payload?.id) || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      setProfileData(null);
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/users/${username}`);
        if (!cancelled) {
          setProfileData(res.data);
          setIsFollowing(!!res.data?.isFollowing);
          setFollowersCount(res.data?._count?.seguidores ?? 0);
        }
      } catch (e) {
        if (!cancelled) {
          if (e.response?.status === 404) {
            navigate('/', { state: { error: 'Perfil no encontrado', status: 404 } });
          } else {
            setError('No se pudo cargar el perfil.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [username, navigate]);

  const handleFollowToggle = async () => {
    if (followLoading) return;
    const token = localStorage.getItem('authToken');
    if (!token || !profileData?.id_usuario) {
      navigate('/login');
      return;
    }
    setFollowLoading(true);

    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    // Optimistic update
    setIsFollowing(!prevFollowing);
    setFollowersCount(prevFollowing ? prevCount - 1 : prevCount + 1);

    try {
      if (prevFollowing) {
        const res = await api.delete(`/users/${profileData.id_usuario}/follow`);
        setFollowersCount(res.data?.followersCount ?? prevCount - 1);
      } else {
        const res = await api.post(`/users/${profileData.id_usuario}/follow`, {});
        setFollowersCount(res.data?.followersCount ?? prevCount + 1);
      }
    } catch (e) {
      // rollback
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
      if (e?.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError('No se pudo actualizar el seguimiento.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Cargando perfil...</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>{error}</div>;
  if (!profileData) return null;

  const stats = profileData._count || { publicaciones: 0, seguidores: 0, seguidos: 0 };
  const currentUserId = getCurrentUserId();
  const isOwnProfile = currentUserId && profileData?.id_usuario === currentUserId;
  const bannerUrl = profileData.foto_portada_url || DEFAULT_BANNER;

  return (
    <div className="profile-page">
      {/* Banner */}
      <div
        className="profile-hero"
        style={{ backgroundImage: `url(${bannerUrl})` }}
        loading="lazy"
      >
        <div className="profile-overlay">
          <div className="profile-head">
            <img
              src={profileData.foto_perfil_url || DEFAULT_AVATAR}
              alt="Foto de perfil"
              className="profile-avatar"
              loading="lazy"
              decoding="async"
            />
            <div className="profile-main">
              <h2 className="profile-name">{profileData.nombre_perfil}</h2>
              <div className="profile-username">@{profileData.nombre_usuario}</div>
              {profileData.biografia && <p className="profile-bio">{profileData.biografia}</p>}
            </div>
            {isOwnProfile ? (
              <div className="profile-actions">
                <Link to="/settings/profile" className="btn btn-ghost">Editar Perfil</Link>
                <Link to="/settings/account" className="btn btn-ghost">Cuenta</Link>
              </div>
            ) : (
              <div className="profile-actions" style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? 'Guardando…' : (isFollowing ? 'Dejar de seguir' : 'Seguir')}
                </button>
                <button
                  className="btn btn-primary btn-pill"
                  onClick={() => navigate(`/messages/${profileData.nombre_usuario}?uid=${profileData.id_usuario}`)}
                  title="Enviar mensaje"
                >
                  Mensaje
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="profile-stats">
            <div><strong>{stats.publicaciones}</strong> publicaciones</div>
            <div><strong>{followersCount}</strong> seguidores</div>
            <div><strong>{stats.seguidos}</strong> seguidos</div>
          </div>
        </div>
      </div>

      {/* Posts section */}
      <div className="profile-content">
        <h3>Publicaciones</h3>
        {!profileData.canViewPosts && profileData.isPrivate ? (
          <p>Este perfil es privado. {isFollowing ? 'Ya sigues a este usuario.' : 'Envía una solicitud para ver sus publicaciones.'}</p>
        ) : profileData.publicaciones?.length ? (
          // Añade este console.log para ver la estructura de tus posts
          console.log('Datos de publicaciones:', profileData.publicaciones),
          profileData.publicaciones.map((p) => (
            <Post key={p.id_publicacion} post={p} />
          ))
        ) : (
          <p>Este usuario aún no tiene publicaciones.</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
