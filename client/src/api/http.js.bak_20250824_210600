import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Add Authorization header if token exists
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

// Redirect to login on 401 and clear token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    // Detailed console report for easier debugging
    try {
      const cfg = error?.config || {};
      const fullUrl = (cfg.baseURL || '') + (cfg.url || '');
      const serverMsg = error?.response?.data?.message || error?.message;
      // eslint-disable-next-line no-console
      console.error('[API ERROR]', {
        method: (cfg.method || 'GET').toUpperCase(),
        url: fullUrl,
        status,
        message: serverMsg,
        data: error?.response?.data,
      });
    } catch {}

    if (status === 401) {
      // Only logout on genuine auth failures indicated by the server message
      const msg = (error?.response?.data?.message || '').toString();
      const shouldLogout = /no autorizado/i.test(msg) || /token inválido/i.test(msg) || /token invalido/i.test(msg) || /expirado/i.test(msg);
      if (shouldLogout) {
        try { localStorage.removeItem('authToken'); } catch {}
        if (typeof window !== 'undefined' && window.location && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
