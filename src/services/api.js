import axios from 'axios';
import { getErrorMessage, showError, showSuccess } from '../utils/toast';

const getBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim().replace(/\/$/, '');
  }

  const hostname = window.location.hostname;

  if (hostname === 'localhost') return 'http://localhost:8000/api';
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return `http://${hostname}:8000/api`;

  return 'https://lotus-backend-nine.vercel.app/api';
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || '').toLowerCase();
    // muteToast only suppresses success toasts (used for silent GETs / custom handlers)
    if (response.config?.muteToast) return response;

    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const msg =
        response.config?.successMessage ||
        response.data?.message ||
        (method === 'delete'
          ? 'Deleted successfully'
          : method === 'post'
            ? 'Saved successfully'
            : 'Updated successfully');
      showSuccess(msg);
    }

    return response;
  },
  (error) => {
    // muteErrorToast for flows that handle errors manually (e.g. login)
    if (!error.config?.muteErrorToast) {
      showError(getErrorMessage(error));
    }
    return Promise.reject(error);
  }
);

/** Mute success toast only (errors still show) */
export const muteToast = { muteToast: true };

/** Mute both success and error toasts (manual handling) */
export const muteAllToasts = { muteToast: true, muteErrorToast: true };

export default api;
