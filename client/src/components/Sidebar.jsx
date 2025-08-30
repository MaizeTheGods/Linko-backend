import React, { useState, useEffect, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/http.js';
import useIsMobile from '../hooks/useIsMobile.js';
import { AuthContext } from '../context/AuthContext'; // Importamos el AuthContext

const itemBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  color: 'var(--text)',
  textDecoration: 'none',
  fontWeight: 600,
};

function NavItem({ to, title, end, children }) {
  const [hover, setHover] = useState(false);
  const isDisabled = to === '#'; // El enlace se deshabilita si apunta a '#'

  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      aria-label={title}
      onClick={(e) => { if (isDisabled) e.preventDefault(); }} // Evita la navegación en enlaces deshabilitados
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={({ isActive }) => ({
        ...itemBase,
        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
        background: isActive ? 'var(--primary-tint)' : (hover ? 'var(--primary-tint)' : 'transparent'),
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled ? 0.6 : 1, // Estilo visual para el enlace mientras carga
      })}
    >
      {children}
    </NavLink>
  );
}

const Sidebar = () => {
  // Obtenemos el usuario Y el estado de carga del contexto. ¡Esta es la clave!
  const { user, loading } = useContext(AuthContext);

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark'; // Default a oscuro
  });

  const isMobile = useIsMobile(900);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const formatCap = (n, cap) => {
    const num = parseInt(n, 10) || 0;
    if (num <= cap) return String(num);
    return `${cap}+`;
  };

  // Este useEffect busca notificaciones y DMs, pero ahora es más inteligente.
  useEffect(() => {
    // Si no hay usuario, no hacemos nada.
    if (!user) {
      setUnreadDMs(0);
      setUnreadNotifs(0);
      return;
    }

    let canceled = false;
    const fetchCounts = async () => {
      try {
        const { data } = await api.get('/dm');
        if (!canceled) setUnreadDMs(data.reduce((acc, c) => acc + (c?.unread_count || 0), 0));
      } catch (_) {}
      try {
        const { data } = await api.get('/notifications/unread-count');
        if (!canceled) setUnreadNotifs(parseInt(data?.count ?? 0, 10));
      } catch (_) {}
    };

    fetchCounts();
    const id = setInterval(fetchCounts, 30000);
    return () => { canceled = true; clearInterval(id); };
  }, [user]); // Se ejecuta solo cuando el estado del usuario cambia.

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Lógica de 3 estados para el enlace de perfil (a prueba de errores)
  let profilePath = '#'; // 1. Por defecto: Enlace deshabilitado mientras carga.
  let profileTitle = 'Cargando perfil...';

  if (!loading) {
    if (user?.nombre_usuario) {
      // 2. Logueado: El enlace apunta al perfil del usuario.
      profilePath = `/perfil/${user.nombre_usuario}`;
      profileTitle = 'Ver mi perfil';
    } else {
      // 3. No Logueado: El enlace apunta a la página de login.
      profilePath = '/login';
      profileTitle = 'Iniciar sesión';
    }
  }

  const AsideContent = (
    <aside style={{ position: 'sticky', top: 12, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <NavItem to="/" end title="Inicio"><HomeIcon /><span>Inicio</span></NavItem>
      <NavItem to="/explore" title="Explorar"><ExploreIcon /><span>Explorar</span></NavItem>
      <NavItem to="/notifications" title="Notificaciones">
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <BellIcon /><span>Notificaciones</span>
          {unreadNotifs > 0 && <Badge>{formatCap(unreadNotifs, 99)}</Badge>}
        </div>
      </NavItem>
      <NavItem to="/messages" title="Mensajes">
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <MessageIcon /><span>Mensajes</span>
          {unreadDMs > 0 && <Badge>{formatCap(unreadDMs, 9)}</Badge>}
        </div>
      </NavItem>
      <NavItem to="/saved" title="Guardados"><SavedIcon /><span>Guardados</span></NavItem>
      <NavItem to="/search" title="Buscar"><SearchIcon /><span>Buscar</span></NavItem>
      <NavItem to={profilePath} title={profileTitle}><UserIcon /><span>Perfil</span></NavItem>
      <button type="button" onClick={toggleTheme} title="Alternar tema" style={{...itemBase, cursor: 'pointer', background: 'transparent'}}>
        <ThemeIcon mode={theme} />
        <span>Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
      </button>
    </aside>
  );

  if (!isMobile) return AsideContent;

  // --- Navegación Móvil (completa y corregida) ---
  const mobileItemBase = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', color: 'var(--text)', textDecoration: 'none', flex: 1 };
  function MobileItem({ to, title, end, children }) {
    return (
      <NavLink to={to} end={end} title={title} aria-label={title} style={({ isActive }) => ({...mobileItemBase, borderTop: isActive ? '2px solid var(--primary)' : '2px solid transparent', position: 'relative'})}>
        <span style={{ position: 'relative' }}>
          {children}
          {to === '/notifications' && unreadNotifs > 0 && <Badge style={{ position: 'absolute', top: -6, right: -10 }}>{formatCap(unreadNotifs, 99)}</Badge>}
          {to === '/messages' && unreadDMs > 0 && <Badge style={{ position: 'absolute', top: -6, right: -10 }}>{formatCap(unreadDMs, 4)}</Badge>}
        </span>
      </NavLink>
    );
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación inferior">
      <MobileItem to="/" end title="Inicio"><HomeIcon /></MobileItem>
      <MobileItem to="/explore" title="Explorar"><ExploreIcon /></MobileItem>
      <MobileItem to="/notifications" title="Notificaciones"><BellIcon /></MobileItem>
      <MobileItem to="/messages" title="Mensajes"><MessageIcon /></MobileItem>
      <MobileItem to="/search" title="Buscar"><SearchIcon /></MobileItem>
      <MobileItem to={profilePath} title="Perfil"><UserIcon /></MobileItem>
    </nav>
  );
};

// --- Todos los componentes de Iconos y Badge están aquí ---
function HomeIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5l9-7 9 7"/><path d="M9 21V12h6v9"/></svg>); }
function ExploreIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 8-4-4 8-4z"/></svg>); }
function BellIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>); }
function MessageIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z"/></svg>); }
function SavedIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>); }
function SearchIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>); }
function UserIcon() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>); }
function ThemeIcon({ mode }) { if (mode === 'dark') { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>); } return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>); }
function Badge({ children, style }) { return (<span style={{display: 'inline-block', minWidth: 18, height: 18, padding: '0 6px', borderRadius: 9999, background: '#ef4444', color: '#fff', fontSize: 11, lineHeight: '18px', textAlign: 'center', fontWeight: 700, boxShadow: '0 1px 2px rgba(0,0,0,.2)', ...style}}>{children}</span>); }

export default Sidebar;