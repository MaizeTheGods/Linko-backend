import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  
  // Leemos la ruta directamente. React se encargará de re-renderizar cuando cambie.
  let pageTitle = location.pathname;

  // Opcional: Lógica para poner nombres bonitos en lugar de solo la ruta
  if (pageTitle === '/') {
    pageTitle = 'Inicio';
  } else if (pageTitle.startsWith('/perfil/')) {
    // Extrae el nombre de usuario para un título más dinámico
    const username = pageTitle.split('/')[2];
    pageTitle = `Perfil de @${username}`;
  } else {
    // Capitaliza la primera letra para otros casos
    pageTitle = pageTitle.charAt(1).toUpperCase() + pageTitle.slice(2);
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 style={{ margin: '6px 0 10px' }}>{pageTitle}</h1>
        {children}
      </main>
    </div>
  );
}
