import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // 1. Importamos el proveedor de autenticación
import './index.css'; // Tu archivo de estilos principal

// Creamos el punto de entrada de la aplicación en el DOM
const root = ReactDOM.createRoot(document.getElementById('root'));

// 2. Renderizamos la aplicación con la estructura correcta de proveedores
root.render(
  <React.StrictMode>
    {/* BrowserRouter debe envolver a toda la aplicación para que el enrutamiento funcione */}
    <BrowserRouter>
      {/* 
        AuthProvider envuelve a App.
        Esta es la solución clave: asegura que el contexto de autenticación (user, loading)
        esté disponible para el componente App y todos sus hijos desde el principio.
      */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);