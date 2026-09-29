import axios from 'axios';
import toast from 'react-hot-toast';

// 1. Base URL configuration from environment variables
const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

// 2. Derive backend-origin helper (strips trailing /api or /api/)
export const getBackendOrigin = () => {
  return baseURL.replace(/\/api\/?$/, '');
};

// 3. Helper to prefix relative image paths like /uploads/xyz.png with backend origin
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const origin = getBackendOrigin();
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${origin}${cleanPath}`;
};

// 4. Axios instance
const API = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 5. Request Interceptor: Attach JWT Bearer Token if present
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 6. Response Interceptor: Handle 401 Unauthorized & 429 Rate Limiting
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Handle 429 Too Many Requests (Rate Limiting)
    if (status === 429) {
      const serverMsg = error.response?.data?.message;
      toast.error(
        serverMsg || 'Too many attempts. Rate limit exceeded, please try again in 15 minutes.',
        { id: 'rate-limit-toast' }
      );
    }

    // Handle 401 Unauthorized (Expired or invalid token)
    // Don't auto-redirect on login or register failure (let form show validation error)
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (hadToken) {
        toast.error('Session expired. Please sign in again.', { id: 'session-expired' });
        // Trigger window custom event or direct navigation to login
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

export default API;