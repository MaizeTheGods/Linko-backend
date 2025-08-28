import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div style={{ padding: 16, textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>404</h1>
      <p>La página que buscas no existe.</p>
      <div style={{ marginTop: 16 }}>
        <Link to="/">
          <button>Volver al inicio</button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
