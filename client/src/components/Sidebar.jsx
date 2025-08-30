import React, { useState, useEffect, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/http.js';
import useIsMobile from '../hooks/useIsMobile.js';
import { AuthContext } from '../context/AuthContext'; // 1. Importamos el AuthContext

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
      // Evita la navegación en enlaces deshabilitados
      onClick={(e) => { if (isDisabled) e.preventDefault(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={({ isActive }) => ({
        ...itemBase,
        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
        background: isActive ? 'var(--primary-tint)' : (hover ? 'var(--primary-tint)' : 'transparent'),
        // Estilo visual para el enlace mientras carga
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
      })}
    >
      {children}
    </NavLink>
  );
}

const Sidebar = () => {
  // === LA SOLUCIÓN: Usamos el usuario Y el estado de carga del contexto ===
  const { user, loading } = useContext(AuthContext);

  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', stored);
    return stored;
  });

  const isMobile = useIsMobile(900);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ==================================================================
  // LÓGICA DE 3 ESTADOS PARA EL ENLACE DE PERFIL (A PRUEBA DE ERRORES)
  // ==================================================================
  let profilePath = '#'; // Estado 1 (Por defecto): Enlace deshabilitado mientras carga.
  let profileTitle = 'Cargando perfil...';

  // Solo calculamos la ruta real cuando la verificación de auth ha terminado.
  if (!loading) {
    if (user?.nombre_usuario) {
      // Estado 2 (Logueado): El enlace apunta al perfil del usuario.
      profilePath = `/perfil/${user.nombre_usuario}`;
      profileTitle = 'Ver mi perfil';
    } else {
      // Estado 3 (No Logueado): El enlace apunta a la página de login.
      profilePath = '/login';
      profileTitle = 'Iniciar sesión';
    }
  }

  const AsideContent = (
    <aside style={{ position: 'sticky', top: 12, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <NavItem to="/" end title="Inicio"><HomeIcon /><span>Inicio</span></NavItem>
      <NavItem to="/explore" title="Explorar"><ExploreIcon /><span>Explorar</span></NavItem>
      <NavItem to="/notifications" title="Notificaciones"><BellIcon /><span>Notificaciones</span></NavItem>
      <NavItem to="/messages" title="Mensajes"><MessageIcon /><span>Mensajes</span></NavItem>
      <NavItem to="/saved" title="Guardados"><SavedIcon /><span>Guardados</span></NavItem>
      
      {/* El enlace de perfil ahora usa la lógica segura y el título dinámico */}
      <NavItem to={profilePath} title={profileTitle}><UserIcon /><span>Perfil</span></NavItem>

      <button type="button" onClick={toggleTheme} title="Alternar tema" style={{...itemBase, cursor: 'pointer', background: 'transparent'}}>
        <ThemeIcon mode={theme} />
        <span>Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
      </button>
    </aside>
  );

  if (!isMobile) return AsideContent;

  // --- Navegación Móvil (también usa la variable `profilePath` correcta) ---
  return (
    <nav className="bottom-nav">
       {/* ... Aquí iría tu código para la barra de navegación móvil ... */}
    </nav>
  );
};


// --- Todos los componentes de Iconos están aquí ---
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

export default Sidebar;