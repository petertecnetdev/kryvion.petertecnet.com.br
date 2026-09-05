const TELEMETRY_VERSION = '3.2.0';
const TELEMETRY_URL = `https://petertecnet.com.br/ecosystem/peter-telemetry-v3.js?v=${TELEMETRY_VERSION}`;
const SCRIPT_ID = 'peter-telemetry-v3-sdk';
const MAX_PENDING_EVENTS = 100;

let telemetryPromise = null;
let pendingEvents = [];

function sharedTelemetryReady() {
  return window.PeterTecnetTelemetry?.version === TELEMETRY_VERSION;
}

function drainPendingEvents() {
  const telemetry = window.PeterTecnetTelemetry;
  if (!telemetry?.runtime || !pendingEvents.length) return;

  const events = pendingEvents;
  pendingEvents = [];
  for (const { type, details } of events) {
    telemetry.track(type, details);
    if (details?.immediate) telemetry.flush();
  }
}

function startSharedTelemetry({ apiBaseUrl, appSlug }) {
  const runtime = window.PeterTecnetTelemetry?.start({ apiBaseUrl, appSlug });
  drainPendingEvents();
  return runtime;
}

function loadSharedTelemetry(options) {
  if (sharedTelemetryReady()) {
    return Promise.resolve(startSharedTelemetry(options));
  }

  if (telemetryPromise) return telemetryPromise;

  telemetryPromise = new Promise((resolve, reject) => {
    const ready = () => resolve(startSharedTelemetry(options));
    const failed = () => reject(new Error('Falha ao carregar telemetria compartilhada Peter Tecnet'));
    const existing = document.getElementById(SCRIPT_ID)
      || Array.from(document.scripts).find((script) => script.src?.includes('/ecosystem/peter-telemetry-v3.js'));

    if (existing) {
      if (sharedTelemetryReady()) {
        ready();
        return;
      }
      existing.addEventListener('load', ready, { once: true });
      existing.addEventListener('error', failed, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = TELEMETRY_URL;
    script.async = true;
    script.dataset.appSlug = String(options.appSlug || '');
    script.dataset.apiBase = String(options.apiBaseUrl || '');
    script.addEventListener('load', ready, { once: true });
    script.addEventListener('error', failed, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    telemetryPromise = null;
    console.warn('[Peter Telemetry] SDK compartilhado indisponível.', error);
    return null;
  });

  return telemetryPromise;
}

export function trackTelemetry(type, details = {}) {
  if (typeof window === 'undefined') return false;

  const telemetry = window.PeterTecnetTelemetry;
  if (telemetry?.runtime) {
    telemetry.track(type, details);
    if (details.immediate) telemetry.flush();
    return true;
  }

  pendingEvents.push({ type, details });
  if (pendingEvents.length > MAX_PENDING_EVENTS) {
    pendingEvents = pendingEvents.slice(-MAX_PENDING_EVENTS);
  }
  return false;
}

export function flushTelemetry() {
  if (typeof window === 'undefined') return undefined;
  if (window.PeterTecnetTelemetry?.runtime) {
    drainPendingEvents();
    return window.PeterTecnetTelemetry.flush();
  }
  return telemetryPromise?.then(() => {
    drainPendingEvents();
    return window.PeterTecnetTelemetry?.flush();
  });
}

export function startTelemetry({ apiBaseUrl, appSlug }) {
  if (typeof window === 'undefined') return () => {};

  loadSharedTelemetry({ apiBaseUrl, appSlug });

  return () => {
    window.PeterTecnetTelemetry?.runtime?.stop?.();
  };
}
