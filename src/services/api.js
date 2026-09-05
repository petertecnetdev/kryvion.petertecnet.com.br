import axios from 'axios';
import { startTelemetry, trackTelemetry, flushTelemetry } from './telemetry.js';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.petertecnet.com.br/api';
export const APP_SLUG = import.meta.env.VITE_APP_SLUG || 'kryvion';

const getAuthToken = () => ['token', 'petertecnet_token', 'access_token', 'auth_token']
  .map((key) => localStorage.getItem(key))
  .find(Boolean);

const AUTH_TOKEN_KEYS = ['token', 'petertecnet_token', 'access_token', 'auth_token'];
let refreshPromise = null;

function storeAccessToken(token) {
  if (!token) return;
  localStorage.setItem('token', token);
  localStorage.setItem('petertecnet_token', token);
}

function clearLocalSession() {
  [...AUTH_TOKEN_KEYS, 'user'].forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event('authChanged'));
}

async function renewAccessToken() {
  if (refreshPromise) return refreshPromise;

  const token = getAuthToken();
  if (!token) throw new Error('Sessão ausente.');

  refreshPromise = axios.post(`${API_BASE_URL}/auth/refresh`, null, {
    timeout: 12000,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Peter-App': APP_SLUG,
    },
  }).then(({ data }) => {
    const accessToken = data?.access_token || data?.token?.access_token;
    if (!accessToken) throw new Error('A API não retornou uma sessão renovada.');
    storeAccessToken(accessToken);
    return accessToken;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

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
  if (exact('/scanner') && method === 'GET') return { type: 'breakout_radar_loaded', label: 'Carregamento do radar de possíveis altas' };
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
  if (path === `/v1/apps/${APP_SLUG}/notifications` && method === 'GET') return { type: 'notifications_viewed', label: 'Carregamento da central de notificações' };
  if (path === `/v1/apps/${APP_SLUG}/notifications/unread-count` && method === 'GET') return { type: 'notification_unread_count_loaded', label: 'Atualização do contador de notificações' };
  if (path === `/v1/apps/${APP_SLUG}/notifications/read-all` && method === 'PATCH') return { type: 'notifications_marked_read', label: 'Marcação de todas as notificações como lidas' };
  if (/\/notifications\/\d+\/read$/.test(path) && method === 'PATCH') return { type: 'notification_marked_read', label: 'Marcação de notificação como lida' };

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
  async (error) => {
    recordApiOutcome(
      error?.config,
      error?.response?.status || 0,
      'error',
      error?.code || error?.response?.data?.code || '',
    );

    if (error?.response?.status === 401 && error?.config && getAuthToken()) {
      if (!error.config.__authRetry) {
        try {
          const accessToken = await renewAccessToken();
          const retryConfig = {
            ...error.config,
            __authRetry: true,
            headers: {
              ...(error.config.headers || {}),
              Authorization: `Bearer ${accessToken}`,
            },
          };
          return api.request(retryConfig);
        } catch {
          // A renovação falhou; o fluxo abaixo invalida a sessão local.
        }
      }

      trackTelemetry('session_expired', {
        label: 'Sessão expirada ou não renovável',
        target: cleanPath(error?.config?.url),
        metadata: {
          status: 401,
          method: String(error?.config?.method || 'GET').toUpperCase(),
        },
      });

      // O token ainda identifica o usuário neste momento. Envie os eventos de
      // falha antes de limpar a sessão para não transformar a ocorrência em
      // atividade anônima no Admin Center.
      await flushTelemetry();
      clearLocalSession();
    }
    return Promise.reject(error);
  },
);

export const marketApi = {
  overview: () => api.get(`/v1/apps/${APP_SLUG}/market/overview`),
  scanner: (params = {}) => api.get(`/v1/apps/${APP_SLUG}/market/scanner`, { params }),
  realtimeConfig: () => api.get(`/v1/apps/${APP_SLUG}/market/realtime-config`),
  opportunityReport: (asset) => api.get(`/v1/apps/${APP_SLUG}/market/reports/${encodeURIComponent(asset)}`),
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
  notifications: (params = {}) => api.get(`/v1/apps/${APP_SLUG}/notifications`, { params }),
  notificationUnreadCount: () => api.get(`/v1/apps/${APP_SLUG}/notifications/unread-count`),
  markNotificationRead: (id) => api.patch(`/v1/apps/${APP_SLUG}/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch(`/v1/apps/${APP_SLUG}/notifications/read-all`),
};

export default api;