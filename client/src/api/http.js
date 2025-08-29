import axios from 'axios';

// ==================================================================
// CORRECCIÓN PRINCIPAL: Configuración robusta de la URL base
// ==================================================================
// 1. Intenta usar la variable de entorno (ideal para cambiar entre desarrollo y producción).
// 2. Si no existe, USA LA URL DE PRODUCCIÓN como respaldo, no localhost.
const baseURL = import.meta.env.VITE_API_URL || 'https://linko-backend.onrender.com/api';

// Creamos la instancia de Axios con esta URL base.
const api = axios.create({ baseURL });


// ==================================================================
// Interceptor de Peticiones: Añade el token y el anti-cache
// Hemos combinado tus dos interceptores en uno para mayor eficiencia.
// ==================================================================
api.interceptors.request.use(
  (config) => {
    // 1. Añadir el token de autenticación
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Aseguramos que el objeto headers exista antes de modificarlo
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }

    // 2. Añadir parámetro para evitar el cacheo del navegador
    config.params = {
      ...config.params,
      _v: Date.now(),
    };

    return config;
  },
  (error) => {
    // Si hay un error al configurar la petición, lo rechazamos
    return Promise.reject(error);
  }
);


// ==================================================================
// Interceptor de Respuestas: Maneja errores 401 de forma global
// Tu lógica de log era buena, la mantenemos y simplificamos la redirección.
// ==================================================================
api.interceptors.response.use(
  (response) => response, // Si la respuesta es exitosa, no hacemos nada.
  (error) => {
    const status = error?.response?.status;

    // Logueamos el error en la consola para facilitar la depuración
    if (error.config) {
        const { method, url } = error.config;
        console.error(`[API ERROR] ${method.toUpperCase()} ${url} -> Status ${status}`, error.response?.data || error.message);
    }

    // Si el error es un 401 (No Autorizado), el token es inválido o ha expirado.
    if (status === 401) {
      console.warn("Received 401 Unauthorized. Redirecting to login.");
      // Limpiamos el token inválido del almacenamiento.
      localStorage.removeItem('authToken');
      
      // Forzamos una redirección a la página de login para que el usuario vuelva a autenticarse.
      // Usamos `window.location.href` para asegurar una recarga completa de la aplicación.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Devolvemos el error para que pueda ser manejado por cualquier `catch` específico en los componentes.
    return Promise.reject(error);
  }
);

export default api;