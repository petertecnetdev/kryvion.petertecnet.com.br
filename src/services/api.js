import axios from 'axios';
import { startTelemetry } from './telemetry.js';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api';
export const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'kryvion';

const getAuthToken = () => ['token', 'petertecnet_token', 'access_token', 'auth_token']
  .map((key) => localStorage.getItem(key))
  .find(Boolean);

startTelemetry({
  apiBaseUrl: API_BASE_URL,
  appSlug: APP_SLUG,
  getToken: getAuthToken,
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'X-Peter-App': APP_SLUG,
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Frontend-Page'] = window.location.pathname;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      ['token', 'petertecnet_token', 'access_token', 'auth_token', 'user']
        .forEach((key) => localStorage.removeItem(key));
      window.dispatchEvent(new Event('authChanged'));
    }
    return Promise.reject(error);
  },
);

export const marketApi = {
  overview: () => api.get(`/v1/apps/${APP_SLUG}/market/overview`),
  ohlcv: (asset, params = {}) => api.get(`/v1/apps/${APP_SLUG}/market/assets/${encodeURIComponent(asset)}/ohlcv`, { params }),
  analyze: (data) => api.post(`/v1/apps/${APP_SLUG}/market/analyze`, data),
  portfolio: () => api.get(`/v1/apps/${APP_SLUG}/market/portfolio`),
  addPosition: (data) => api.post(`/v1/apps/${APP_SLUG}/market/positions`, data),
  removePosition: (id) => api.delete(`/v1/apps/${APP_SLUG}/market/positions/${id}`),
  simulate: (data) => api.post(`/v1/apps/${APP_SLUG}/market/simulate`, data),
  risk: () => api.get(`/v1/apps/${APP_SLUG}/market/risk-profile`),
  saveRisk: (data) => api.put(`/v1/apps/${APP_SLUG}/market/risk-profile`, data),
  alerts: () => api.get(`/v1/apps/${APP_SLUG}/market/alerts`),
  addAlert: (data) => api.post(`/v1/apps/${APP_SLUG}/market/alerts`, data),
  removeAlert: (id) => api.delete(`/v1/apps/${APP_SLUG}/market/alerts/${id}`),
};

export default api;