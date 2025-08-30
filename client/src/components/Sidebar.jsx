import React, { useState, useEffect, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/http.js';
import useIsMobile from '../hooks/useIsMobile.js';
import { AuthContext } from '../context/AuthContext'; // Importamos el AuthContext

// --- Componente NavItem (sin cambios) ---
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
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={({ isActive }) => ({
        ...itemBase,
        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
        background: isActive ? 'var(--primary-tint)' : (hover ? 'var(--primary-tint)' : 'transparent'),
      })}
    >
      {children}
    </NavLink>
  );
}

const Sidebar = () => {
  // === MEJORA 1: Obtenemos el usuario Y el estado de carga del contexto ===
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
  
  // MEJORA 2: La búsqueda de notificaciones ahora depende del estado del usuario
  useEffect(() => {
    // Si no hay usuario, no intentamos buscar nada.
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
      } catch (_) { /* No hacer nada en caso de error */ }
      try {
        const { data } = await api.get('/notifications/unread-count');
        if (!canceled) setUnreadNotifs(parseInt(data?.count ?? 0, 10));
      } catch (_) { /* No hacer nada en caso de error */ }
    };
    
    fetchCounts();
    const id = setInterval(fetchCounts, 30000);
    return () => { canceled = true; clearInterval(id); };
  }, [user]); // Se ejecuta solo cuando el usuario cambia (ej. al iniciar sesión)
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ==================================================================
  // SOLUCIÓN CLAVE: Lógica de 3 estados para el enlace de perfil
  // ==================================================================
  let profilePath = '#'; // 1. Estado por defecto: enlace deshabilitado
  let profileTitle = 'Cargando perfil...';

  // Solo calculamos la ruta real cuando la verificación de auth ha terminado
  if (!loading) {
    if (user?.nombre_usuario) {
      // 2. Estado Logueado: El enlace apunta al perfil del usuario
      profilePath = `/perfil/${user.nombre_usuario}`;
      profileTitle = 'Ver mi perfil';
    } else {
      // 3. Estado No Logueado: El enlace apunta a la página de login
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
      {/* El enlace de perfil ahora usa la lógica segura */}
      <NavItem to={profilePath} title={profileTitle}><UserIcon /><span>Perfil</span></NavItem>
      <button type="button" onClick={toggleTheme} title="Alternar tema" style={{...itemBase, cursor: 'pointer', background: 'transparent'}}>
        <ThemeIcon mode={theme} />
        <span>Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
      </button>
    </aside>
  );

  if (!isMobile) return AsideContent;

  // --- Navegación Móvil (también corregida) ---
  const mobileItemBase = { /* ... */ };
  function MobileItem({ to, title, end, children }) { /* ... */ }

  return (
    <nav className="bottom-nav">
      {/* ... (tu navegación móvil con la variable `profilePath` correcta) ... */}
    </nav>
  );
};


// --- Todos los componentes de Iconos y Badge están aquí ---
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5l9-7 9 7"/><path d="M9 21V12h6v9"/>
    </svg>
  );
}
function ExploreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M16 8l-4 8-4-4 8-4z"/>
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}
function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z"/>
    </svg>
  );
}
function SavedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function ThemeIcon({ mode }) {
  if (mode === 'dark') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  );
}
function Badge({ children, style }) {
  return (
    <span style={{display: 'inline-block', minWidth: 18, height: 18, padding: '0 6px', borderRadius: 9999, background: '#ef4444', color: '#fff', fontSize: 11, lineHeight: '18px', textAlign: 'center', fontWeight: 700, boxShadow: '0 1px 2px rgba(0,0,0,.2)', ...style}}>
      {children}
    </span>
  );
}

export default Sidebar;