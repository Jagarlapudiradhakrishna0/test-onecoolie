import axios from 'axios';

// Centralized API Base URL resolution (Phase 7):
// - If VITE_API_URL is explicitly set, use it across all environments.
// - In development fallback: use '/api' to cleanly leverage Vite's reverse proxy to localhost:5000.
// - In production fallback: use production cloud backend URL.
const resolvedBaseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'https://onecoolie.onrender.com/api');

const instance = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ======================================
// ADD JWT TOKEN TO EVERY REQUEST
// ======================================
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ======================================
// HANDLE EXPIRED / INVALID SESSIONS
// ======================================
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    }
    return Promise.reject(error);
  }
);

export default instance;