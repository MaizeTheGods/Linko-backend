import React from 'react';
import { useLocation } from 'react-router-dom';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  
  let pageTitle = location.pathname;

  if (pageTitle === '/') {
    pageTitle = 'Inicio';
  } else if (pageTitle.startsWith('/perfil/')) {
    const username = pageTitle.split('/')[2];
    pageTitle = `Perfil de @${username}`;
  } else {
    pageTitle = pageTitle.charAt(1).toUpperCase() + pageTitle.slice(2);
  }

  return (
    <main className="main-content">
      <h1 style={{ margin: '6px 0 10px' }}>{pageTitle}</h1>
      {children}
    </main>
  );
}
