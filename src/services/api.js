import axios from 'axios';
import { startTelemetry, trackTelemetry } from './telemetry.js';

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

function cleanPath(raw = '') {
  try {
    return new URL(String(raw), API_BASE_URL).pathname.replace(/^\/api/, '') || '/';
  } catch {
    return String(raw || '').split(/[?#]/, 1)[0] || '/';
  }
}

function classifyRequest(config = {}) {
  const method = String(config.method || 'GET').toUpperCase();
  const path = cleanPath(config.url);
  const params = config.params || {};
  const marketPrefix = `/v1/apps/${APP_SLUG}/market`;

  const exact = (suffix) => path === `${marketPrefix}${suffix}`;
  const starts = (suffix) => path.startsWith(`${marketPrefix}${suffix}`);

  if (path === '/auth/login' && method === 'POST') return { type: 'login_attempt', label: 'Tentativa de login com usuário e senha' };
  if (path === '/auth/google' && method === 'POST') return { type: 'google_login_attempt', label: 'Tentativa de login com Google' };
  if (path === '/auth/me' && method === 'GET') return { type: 'session_validation', label: 'Validação da sessão do usuário' };
  if (path === '/auth/logout' && method === 'POST') return { type: 'logout', label: 'Logout da Kryvion' };
  if (path === `/v1/apps/${APP_SLUG}/config` && method === 'GET') return { type: 'runtime_config_loaded', label: 'Carregamento da configuração da Kryvion' };

  if (exact('/overview') && method === 'GET') return { type: 'market_overview_loaded', label: 'Carregamento da visão geral do mercado' };
  if (/\/market\/assets\/[^/]+\/ohlcv$/.test(path) && method === 'GET') {
    const symbol = decodeURIComponent(path.split('/').at(-2) || 'ativo');
    return {
      type: 'market_chart_loaded',
      label: `Carregamento do gráfico OHLCV de ${symbol}`,
      metadata: { asset: symbol, interval: params.interval, limit: params.limit, quote: params.quote },
    };
  }
  if (exact('/analyze') && method === 'POST') return { type: 'opportunity_analysis_run', label: 'Execução de análise de oportunidades' };
  if (exact('/portfolio') && method === 'GET') return { type: 'portfolio_viewed', label: 'Carregamento do portfólio' };
  if (exact('/positions') && method === 'POST') return { type: 'portfolio_position_created', label: 'Criação de posição no portfólio' };
  if (starts('/positions/') && method === 'DELETE') return { type: 'portfolio_position_deleted', label: 'Remoção de posição do portfólio', metadata: { position_id: path.split('/').at(-1) } };
  if (exact('/simulate') && method === 'POST') return { type: 'portfolio_simulation_run', label: 'Execução de simulação de carteira' };
  if (exact('/risk-profile') && method === 'GET') return { type: 'risk_profile_viewed', label: 'Carregamento do perfil de risco' };
  if (exact('/risk-profile') && method === 'PUT') return { type: 'risk_profile_saved', label: 'Atualização do perfil de risco' };
  if (exact('/alerts') && method === 'GET') return { type: 'alerts_viewed', label: 'Carregamento dos alertas' };
  if (exact('/alerts') && method === 'POST') return { type: 'alert_created', label: 'Criação de alerta de mercado' };
  if (starts('/alerts/') && method === 'DELETE') return { type: 'alert_deleted', label: 'Remoção de alerta de mercado', metadata: { alert_id: path.split('/').at(-1) } };

  return {
    type: 'api_action',
    label: `${method} ${path}`,
    metadata: { method, path },
  };
}

function recordApiOutcome(config, status, outcome, errorCode = '') {
  const telemetry = config?.__kryvionTelemetry || {
    startedAt: Date.now(),
    action: classifyRequest(config),
  };
  const action = telemetry.action || classifyRequest(config);
  const path = cleanPath(config?.url);
  const method = String(config?.method || 'GET').toUpperCase();

  trackTelemetry(action.type, {
    label: action.label,
    target: path,
    metadata: {
      ...(action.metadata || {}),
      method,
      path,
      outcome,
      status: Number(status || 0),
      duration_ms: Math.max(0, Date.now() - Number(telemetry.startedAt || Date.now())),
      error_code: errorCode || '',
    },
  });
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Frontend-Page'] = window.location.pathname;
  config.__kryvionTelemetry = {
    startedAt: Date.now(),
    action: classifyRequest(config),
  };
  return config;
});

api.interceptors.response.use(
  (response) => {
    recordApiOutcome(response.config, response.status, 'success');
    return response;
  },
  (error) => {
    recordApiOutcome(
      error?.config,
      error?.response?.status || 0,
      'error',
      error?.code || error?.response?.data?.code || '',
    );

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
