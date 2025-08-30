import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/http.js';
import Post from '../components/Post.jsx';
import PostSkeleton from '../components/PostSkeleton.jsx';
import { AuthContext } from '../context/AuthContext.jsx'; // 1. Importamos el contexto

const DEFAULT_AVATAR = '/default-avatar.svg';
const DEFAULT_BANNER = '/default-banner.svg';

const ProfilePage = () => {
  const { username: usernameFromParams } = useParams();
  const navigate = useNavigate();
  const { user: loggedInUser } = useContext(AuthContext); // 2. Obtenemos el usuario del contexto

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/users/${usernameFromParams}`);
        if (!cancelled) {
          const fetchedData = res.data;
          setProfileData(fetchedData);
          setIsFollowing(!!fetchedData?.isFollowing);
          setFollowersCount(fetchedData?._count?.seguidores ?? 0);

          // 3. MEJORA: Si la URL era '/perfil/me', la reemplazamos por la URL real
          if (usernameFromParams === 'me' && fetchedData?.nombre_usuario) {
            navigate(`/perfil/${fetchedData.nombre_usuario}`, { replace: true });
          }
        }
      } catch (e) {
        if (!cancelled) {
          if (e.response?.status === 404) {
            navigate('/404'); // Redirigimos a una página 404 si el perfil no existe
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
  }, [usernameFromParams, navigate]);

  const handleFollowToggle = async () => {
    if (followLoading || !profileData) return;
    setFollowLoading(true);

    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    setIsFollowing(!prevFollowing);
    setFollowersCount(prevFollowing ? prevCount - 1 : prevCount + 1);

    try {
      const endpoint = `/users/${profileData.id_usuario}/follow`;
      if (prevFollowing) {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint, {});
      }
    } catch (e) {
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
      setError('No se pudo actualizar el seguimiento.');
    } finally {
      setFollowLoading(false);
    }
  };

  // 4. MEJORA: Usamos un skeleton para una mejor experiencia de carga
  if (loading) return <ProfileSkeleton />;
  if (error) return <div className="error-message">{error}</div>;
  if (!profileData) return <div className="error-message">No se encontraron los datos del perfil.</div>;

  const stats = profileData._count || { publicaciones: 0, seguidores: 0, seguidos: 0 };
  // 5. MEJORA: Comparamos directamente con el usuario del contexto
  const isOwnProfile = loggedInUser && profileData?.id_usuario === loggedInUser.id;
  const bannerUrl = profileData.foto_portada_url || DEFAULT_BANNER;

  return (
    <div className="profile-page">
      <div
        className="profile-hero"
        style={{ backgroundImage: `url(${bannerUrl})` }}
      >
        <div className="profile-overlay">
          <div className="profile-head">
            <img
              src={profileData.foto_perfil_url || DEFAULT_AVATAR}
              alt="Foto de perfil"
              className="profile-avatar"
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
                  {followLoading ? 'Cargando…' : (isFollowing ? 'Dejar de seguir' : 'Seguir')}
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
          <div className="profile-stats">
            <div><strong>{stats.publicaciones}</strong> publicaciones</div>
            <div><strong>{followersCount}</strong> seguidores</div>
            <div><strong>{stats.seguidos}</strong> seguidos</div>
          </div>
        </div>
      </div>
      <div className="profile-content">
        <h3>Publicaciones</h3>
        {!profileData.canViewPosts && profileData.isPrivate ? (
          <p>Este perfil es privado. {isFollowing ? 'Ya sigues a este usuario.' : 'Sigue a este usuario para ver sus publicaciones.'}</p>
        ) : profileData.publicaciones?.length > 0 ? (
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

// Componente de Skeleton para una mejor UI de carga
const ProfileSkeleton = () => (
  <div className="profile-page skeleton">
    <div className="profile-hero" style={{ backgroundColor: '#2a2a2a' }}>
      <div className="profile-overlay">
        <div className="profile-head">
          <div className="profile-avatar" style={{ backgroundColor: '#444' }} />
          <div className="profile-main">
            <div className="skeleton-line" style={{ width: '150px', height: '28px' }} />
            <div className="skeleton-line" style={{ width: '100px', height: '16px', marginTop: '8px' }} />
          </div>
        </div>
        <div className="profile-stats">
          <div className="skeleton-line" style={{ width: '100px' }} />
          <div className="skeleton-line" style={{ width: '100px' }} />
          <div className="skeleton-line" style={{ width: '100px' }} />
        </div>
      </div>
    </div>
    <div className="profile-content">
      <h3>Publicaciones</h3>
      <PostSkeleton />
      <PostSkeleton />
    </div>
  </div>
);

export default ProfilePage;