import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT Token into each request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('paperplane_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Clear token and reload if unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Avoid redirect loops, only clear and reload if we had a token to begin with
      if (localStorage.getItem('paperplane_jwt_token')) {
        localStorage.removeItem('paperplane_jwt_token');
        localStorage.removeItem('paperplane_user_data');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
