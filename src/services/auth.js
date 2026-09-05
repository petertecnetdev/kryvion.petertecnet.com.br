import api, { APP_SLUG } from './api.js';
import { flushTelemetry } from './telemetry.js';

const TOKEN_KEYS = ['token', 'petertecnet_token', 'access_token', 'auth_token'];
const USER_KEY = 'user';
let passwordLoginPromise = null;
let googleLoginPromise = null;

export function getToken() {
  return TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) || null;
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function storeSession(payload) {
  const tokenPayload = payload?.token || payload;
  const accessToken = tokenPayload?.access_token || payload?.access_token;
  const user = tokenPayload?.user || payload?.user || null;

  if (!accessToken) throw new Error('A API não retornou uma sessão válida.');

  localStorage.setItem('token', accessToken);
  localStorage.setItem('petertecnet_token', accessToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));

  // O evento de login foi enfileirado pelo interceptor da API. Faça o flush
  // somente depois de armazenar o token para a API associá-lo ao usuário correto.
  flushTelemetry();

  window.dispatchEvent(new Event('authChanged'));
  window.dispatchEvent(new CustomEvent('peter:auth-changed', { detail: { source: APP_SLUG } }));

  return { accessToken, user };
}

export function login(username, password) {
  if (passwordLoginPromise) return passwordLoginPromise;

  passwordLoginPromise = api.post('/auth/login', { username, password })
    .then(({ data }) => storeSession(data))
    .finally(() => {
      passwordLoginPromise = null;
    });

  return passwordLoginPromise;
}

export function loginWithGoogle(tokenId) {
  if (googleLoginPromise) return googleLoginPromise;

  googleLoginPromise = api.post('/auth/google', { token_id: tokenId })
    .then(({ data }) => storeSession(data))
    .finally(() => {
      googleLoginPromise = null;
    });

  return googleLoginPromise;
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  const user = data?.user || data?.data?.user || null;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function fetchRuntimeConfig() {
  const { data } = await api.get(`/v1/apps/${APP_SLUG}/config`);
  return data || {};
}

export async function logout() {
  try {
    if (getToken()) await api.post('/auth/logout');
  } catch {
    // A sessão local deve ser encerrada mesmo se o token já tiver expirado.
  } finally {
    // Preserve a autoria do evento de logout antes de apagar a credencial local.
    await flushTelemetry();
    TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('authChanged'));
    window.dispatchEvent(new CustomEvent('peter:auth-changed', { detail: { source: `${APP_SLUG}:logout` } }));
  }
}

export function clearSession() {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(USER_KEY);
}
