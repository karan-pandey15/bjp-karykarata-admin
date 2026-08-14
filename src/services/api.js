import axios from 'axios';
import { getErrorMessage, showError, showSuccess } from '../utils/toast';

/** Live Lotus backend — always use this host */
export const API_ORIGIN = 'https://api.pracharpost.in';
export const PRODUCTION_API = `${API_ORIGIN}/api`;

const normalizeBaseUrl = (url) => {
  let value = String(url || '').trim().replace(/\/$/, '');
  if (!value) return PRODUCTION_API;

  value = value.replace(/^http:\/\/api\.pracharpost\.in/i, 'https://api.pracharpost.in');

  // Origin only → append /api (routes live under /api)
  if (/^https:\/\/api\.pracharpost\.in$/i.test(value)) {
    return `${value}/api`;
  }

  return value;
};

const getBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  const normalized = fromEnv && String(fromEnv).trim() ? normalizeBaseUrl(fromEnv) : '';

  // Never use a relative `/api` path in production builds (that hits the
  // frontend host, not PracharPost, and login returns HTML → no token).
  if (!normalized || normalized.startsWith('/') || !/pracharpost\.in/i.test(normalized)) {
    return PRODUCTION_API;
  }

  return normalized;
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
    if (config.skipAuth) {
      delete config.headers.Authorization;
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Let the browser set multipart boundary for file uploads
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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

export { API_BASE_URL };
export default api;
