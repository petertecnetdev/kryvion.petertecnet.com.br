const SENSITIVE_KEY_PATTERN = /password|token|secret|cookie|card|cpf|document|authorization|code/i;
const TELEMETRY_SCHEMA = '3';

let activeTelemetry = null;

export function trackTelemetry(type, details = {}) {
  if (!activeTelemetry) return false;
  activeTelemetry.enqueue(type, details);
  if (details.immediate) activeTelemetry.flush(true);
  return true;
}

export function flushTelemetry() {
  return activeTelemetry?.flush(true);
}

export function startTelemetry({ apiBaseUrl, appSlug, appId, getToken = () => localStorage.getItem('token') }) {
  if (typeof window === 'undefined') return () => {};
  if (window.__peterTelemetryStarted && activeTelemetry) return activeTelemetry.stop || (() => {});

  const normalizedSlug = String(appSlug || '').trim().toLowerCase();
  if (!normalizedSlug) return () => {};

  window.__peterTelemetryStarted = true;

  const endpoint = `${String(apiBaseUrl).replace(/\/+$/, '')}/interactions/batch`;
  const sessionKey = `peter_telemetry_session_${normalizedSlug}`;
  const sessionId = sessionStorage.getItem(sessionKey) || createId();
  sessionStorage.setItem(sessionKey, sessionId);

  const sessionStartedAt = Date.now();
  let queue = [];
  let lastPath = page();
  let lastScreen = '';
  let lastScreenStartedAt = Date.now();
  let scrollMilestones = new Set();
  let flushing = false;
  let sessionEnded = false;
  let inputTimer = null;
  let screenTimer = null;

  function createId() {
    return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function clean(value, limit = 200) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
  }

  function slug(value) {
    return clean(value, 160)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100);
  }

  function safeUrl(value, relativeForSameOrigin = true) {
    if (!value) return '';

    try {
      const url = new URL(String(value), window.location.origin);
      if (relativeForSameOrigin && url.origin === window.location.origin) return url.pathname;
      return `${url.origin}${url.pathname}`;
    } catch {
      return clean(String(value).split(/[?#]/, 1)[0], 500);
    }
  }

  function page() {
    return window.location.pathname;
  }

  function normalizeMetadata(details = {}) {
    const metadata = {};
    for (const [key, value] of Object.entries(details.metadata || {})) {
      if (SENSITIVE_KEY_PATTERN.test(key) || value === undefined || value === null) continue;
      if (typeof value === 'boolean' || typeof value === 'number') metadata[key] = value;
      else if (Array.isArray(value)) metadata[key] = value.slice(0, 20).map((item) => clean(item, 120));
      else metadata[key] = clean(value, 500);
    }
    return metadata;
  }

  function enqueue(type, details = {}) {
    const eventType = clean(type || 'interaction', 80) || 'interaction';
    queue.push({
      id: createId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      page: page(),
      label: clean(details.label || eventType),
      target: clean(details.target),
      metadata: normalizeMetadata(details),
    });

    if (queue.length >= 20) flush();
  }

  async function flush(force = false) {
    if ((!force && flushing) || !queue.length) return;
    if (!force) flushing = true;

    const events = queue.splice(0, 50);
    const token = getToken?.();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Peter-App': normalizedSlug,
          'X-App-Slug': normalizedSlug,
          'X-Telemetry-Schema': TELEMETRY_SCHEMA,
          'X-Frontend-Page': safeUrl(window.location.href),
          ...(appId ? { 'X-App-ID': String(appId) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId, events }),
      });

      if (response.status === 429 || response.status >= 500) {
        queue.unshift(...events.slice(-20));
      }
    } catch {
      queue.unshift(...events.slice(-20));
    } finally {
      if (!force) flushing = false;
    }
  }

  function contextOf(element) {
    const container = element?.closest?.('form,article,section,.panel,.kry-chart-panel,.kry-candle-terminal,.sidebar,header');
    if (!container) return '';
    const heading = container.querySelector?.('h1,h2,h3,h4,[data-telemetry-title]');
    return clean(heading?.textContent || container.getAttribute?.('aria-label') || container.className || '', 160);
  }

  function labelOf(element) {
    return clean(
      element?.dataset?.track
      || element?.getAttribute?.('aria-label')
      || element?.getAttribute?.('title')
      || element?.textContent
      || element?.name
      || element?.id
      || element?.tagName,
      180,
    );
  }

  function trackedDataset(element) {
    const result = {};
    for (const [key, value] of Object.entries(element?.dataset || {})) {
      if (key === 'track' || SENSITIVE_KEY_PATTERN.test(key)) continue;
      if (value !== undefined && value !== null) result[`data_${key}`] = clean(value, 200);
    }
    return result;
  }

  function deferNavigation(source) {
    const callback = () => recordNavigation(source);
    if (typeof window.queueMicrotask === 'function') window.queueMicrotask(callback);
    else window.setTimeout(callback, 0);
  }

  function recordNavigation(source) {
    const current = page();
    if (current === lastPath) return;
    enqueue('navigation', { label: current, metadata: { from: lastPath, source } });
    lastPath = current;
    scrollMilestones = new Set();
    scheduleScreenDetection('route');
  }

  function detectScreen(source = 'dom') {
    const heading = document.querySelector('main h1, main [data-telemetry-screen], h1[data-telemetry-screen]');
    const screen = clean(heading?.textContent || page(), 160);
    if (!screen || screen === lastScreen) return;

    const now = Date.now();
    enqueue('screen_view', {
      label: screen,
      target: slug(screen),
      metadata: {
        screen: slug(screen),
        previous_screen: slug(lastScreen),
        previous_duration_ms: lastScreen ? now - lastScreenStartedAt : 0,
        source,
      },
    });
    lastScreen = screen;
    lastScreenStartedAt = now;
    scrollMilestones = new Set();
  }

  function scheduleScreenDetection(source = 'dom') {
    window.clearTimeout(screenTimer);
    screenTimer = window.setTimeout(() => detectScreen(source), 40);
  }

  function onClick(event) {
    const element = event.target?.closest?.("a,button,[role='button'],[data-track]");
    if (!element || element.closest?.('[data-telemetry-ignore]')) return;

    const href = element.getAttribute('href');
    const destination = safeUrl(href);
    const label = labelOf(element);
    const context = contextOf(element);

    enqueue('click', {
      label,
      target: destination || element.id || element.name || element.tagName,
      metadata: {
        tag: element.tagName,
        destination,
        context,
        ui_action: slug([context, label].filter(Boolean).join(' ')),
        ...trackedDataset(element),
      },
    });

    scheduleScreenDetection('click');
  }

  function onSubmit(event) {
    const form = event.target;
    if (form.closest?.('[data-telemetry-ignore]')) return;

    const context = contextOf(form);
    const identity = form.getAttribute('aria-label') || form.name || form.id || context || 'formulário';
    const searchForm = /search|busca|pesquisa/i.test(identity);
    enqueue(searchForm ? 'search' : 'form_submit', {
      label: identity,
      target: safeUrl(form.action) || page(),
      metadata: { method: form.method || 'GET', context, ui_action: slug(`${identity} submit`) },
    });
  }

  function onChange(event) {
    const element = event.target;
    if (!element?.matches?.("select,input[type='checkbox'],input[type='radio'],input[type='range']") || element.closest?.('[data-telemetry-ignore]')) return;

    const context = contextOf(element);
    const label = element.getAttribute('aria-label') || element.name || element.id || context || element.type;
    const isSelect = element.matches('select');
    const isRange = element.matches("input[type='range']");
    const metadata = {
      control: element.type || element.tagName,
      context,
      ui_action: slug([context, label, 'changed'].filter(Boolean).join(' ')),
    };

    if (element.matches("input[type='checkbox'],input[type='radio']")) metadata.checked = Boolean(element.checked);
    if (isSelect || isRange) metadata.value = clean(element.value, 120);

    enqueue(isSelect ? 'filter' : 'field_change', {
      label,
      target: element.id || element.name || element.tagName,
      metadata,
    });
  }

  function onInput(event) {
    const element = event.target;
    if (!element?.matches?.("input[type='search'],input[placeholder*='Buscar' i],input[placeholder*='Pesquisar' i]") || element.closest?.('[data-telemetry-ignore]')) return;

    window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(() => {
      enqueue('search_input', {
        label: element.getAttribute('aria-label') || element.placeholder || 'Busca',
        target: element.id || element.name || element.tagName,
        metadata: {
          context: contextOf(element),
          query_length: String(element.value || '').length,
        },
      });
    }, 700);
  }

  function onScroll() {
    const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const percentage = Math.min(100, Math.round((window.scrollY / documentHeight) * 100));

    for (const milestone of [25, 50, 75, 100]) {
      if (percentage >= milestone && !scrollMilestones.has(milestone)) {
        scrollMilestones.add(milestone);
        enqueue('scroll', {
          label: `${milestone}% da tela`,
          metadata: { milestone, screen: slug(lastScreen) },
        });
      }
    }
  }

  function onVisibilityChange() {
    enqueue('visibility_change', {
      label: document.visibilityState === 'visible' ? 'Aplicação em foco' : 'Aplicação em segundo plano',
      metadata: { state: document.visibilityState, screen: slug(lastScreen) },
    });
    if (document.visibilityState === 'hidden') flush(true);
  }

  function onError(event) {
    enqueue('frontend_error', {
      label: event.message || 'Erro JavaScript',
      metadata: { source: safeUrl(event.filename, false), line: event.lineno, column: event.colno, screen: slug(lastScreen) },
    });
  }

  function onRejection(event) {
    enqueue('frontend_error', {
      label: event.reason?.message || 'Promise rejeitada',
      metadata: { kind: 'unhandledrejection', screen: slug(lastScreen) },
    });
  }

  function onPopState() {
    recordNavigation('popstate');
  }

  function onPageHide() {
    if (!sessionEnded) {
      sessionEnded = true;
      enqueue('session_end', {
        label: 'Sessão encerrada',
        metadata: {
          duration_ms: Date.now() - sessionStartedAt,
          last_screen: slug(lastScreen),
          last_screen_duration_ms: Date.now() - lastScreenStartedAt,
        },
      });
    }
    flush(true);
  }

  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  window.history.pushState = function (...args) {
    const result = originalPush.apply(this, args);
    deferNavigation('pushState');
    return result;
  };
  window.history.replaceState = function (...args) {
    const result = originalReplace.apply(this, args);
    deferNavigation('replaceState');
    return result;
  };

  const observer = new MutationObserver(() => scheduleScreenDetection('dom'));
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  document.addEventListener('change', onChange, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('popstate', onPopState);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pagehide', onPageHide);

  enqueue('session_start', {
    label: 'Sessão iniciada',
    metadata: {
      referrer: safeUrl(document.referrer, false),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      telemetry_schema: TELEMETRY_SCHEMA,
    },
  });

  scheduleScreenDetection('session_start');
  flush();
  const timer = window.setInterval(flush, 5000);

  function stop() {
    window.clearInterval(timer);
    window.clearTimeout(inputTimer);
    window.clearTimeout(screenTimer);
    onPageHide();
    observer.disconnect();
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('submit', onSubmit, true);
    document.removeEventListener('change', onChange, true);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('popstate', onPopState);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pagehide', onPageHide);
    window.history.pushState = originalPush;
    window.history.replaceState = originalReplace;
    window.__peterTelemetryStarted = false;
    if (activeTelemetry?.sessionId === sessionId) activeTelemetry = null;
  }

  activeTelemetry = { enqueue, flush, stop, sessionId, appSlug: normalizedSlug };
  return stop;
}
