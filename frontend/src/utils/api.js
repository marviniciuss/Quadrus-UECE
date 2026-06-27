import axios from 'axios';
import { auth } from './firebaseConfig.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: dynamically injects the active Firebase ID token
api.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Fetch JWT ID token. Automatically refreshes if expired.
        const idToken = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${idToken}`;
        console.log('Firebase ID token anexado à requisição:', config.url);
      } catch (error) {
        console.error('Failed to attach Firebase Auth ID token:', error);
      }
    } else {
      console.warn('Nenhum usuário logado no Firebase Auth ao tentar enviar requisição:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (e.g. auto redirection on 401 Unauthorized status)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto-handling logout or session expiration stubs...
      console.warn('Session expired or unauthorized request.');
    }
    return Promise.reject(error);
  }
);

export default api;
