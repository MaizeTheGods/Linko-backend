import React from 'react';
import { useLocation } from 'react-router-dom';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  
  // Remove page title logic since it's handled elsewhere
  return (
    <main className="main-content">
      {children}
    </main>
  );
}
