import React from 'react';
import Sidebar from './Sidebar.jsx';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
