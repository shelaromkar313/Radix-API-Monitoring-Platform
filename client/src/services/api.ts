import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL , // you can deployed at render or aws ec2 both
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // Prevent accidental double /api/api/ prefix if baseURL already includes /api or URL has /api/api
    if (config.url) {
      if (config.baseURL?.endsWith('/api') && config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api/, '');
      } else if (config.url.startsWith('/api/api/')) {
        config.url = config.url.replace(/^\/api\/api\//, '/api/');
      }
    }
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/login') ||
                        error.config?.url?.includes('/auth/register') ||
                        error.config?.url?.includes('/auth/google');

    if (error.response?.status === 401 && !isAuthRoute) {
      console.warn('Session expired or unauthorized (401). Clearing credentials.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
