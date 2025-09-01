import axios from 'axios';

const apiClient = axios.create({
  // === ¡AQUÍ ESTÁ EL CAMBIO MÁS IMPORTANTE! ===
  // Añadimos /api al final de la URL base
  baseURL: `${import.meta.env.VITE_API_URL}/api`,

  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default apiClient;