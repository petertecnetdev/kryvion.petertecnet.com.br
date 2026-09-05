import React, { useEffect, useRef } from 'react';
import { API_BASE_URL, APP_SLUG } from '../services/api.js';

const SDK_VERSION = '3.0.0';
const TELEMETRY_VERSION = '3.1.0';
const SDK_URL = `https://petertecnet.com.br/ecosystem/peter-ecosystem-v3.js?v=${SDK_VERSION}`;
const TELEMETRY_URL = `https://petertecnet.com.br/ecosystem/peter-telemetry-v3.js?v=${TELEMETRY_VERSION}`;
let sdkPromise;
let telemetryPromise;

function loadTelemetry() {
  if (window.PeterTecnetTelemetry?.version === TELEMETRY_VERSION) {
    window.PeterTecnetTelemetry.start({ apiBaseUrl: API_BASE_URL, appSlug: APP_SLUG });
    return Promise.resolve();
  }
  if (telemetryPromise) return telemetryPromise.then(() => window.PeterTecnetTelemetry?.start({ apiBaseUrl: API_BASE_URL, appSlug: APP_SLUG }));
  telemetryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-peter-telemetry-sdk]');
    const ready = () => { window.PeterTecnetTelemetry?.start({ apiBaseUrl: API_BASE_URL, appSlug: APP_SLUG }); resolve(); };
    if (existing) {
      if (window.PeterTecnetTelemetry) ready();
      else {
        existing.addEventListener('load', ready, { once: true });
        existing.addEventListener('error', () => reject(new Error('Falha ao carregar a telemetria Peter Tecnet.')), { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.src = TELEMETRY_URL;
    script.async = true;
    script.dataset.peterTelemetrySdk = TELEMETRY_VERSION;
    script.dataset.appSlug = APP_SLUG || '';
    script.dataset.apiBase = API_BASE_URL || 'https://api.petertecnet.com.br/api';
    script.addEventListener('load', ready, { once: true });
    script.addEventListener('error', () => reject(new Error('Falha ao carregar a telemetria Peter Tecnet.')), { once: true });
    document.head.appendChild(script);
  }).catch((error) => { telemetryPromise = undefined; throw error; });
  return telemetryPromise;
}

function loadSdk() {
  if (customElements.get('peter-ecosystem-launcher')) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-peter-ecosystem-sdk]');
    const script = existing || document.createElement('script');
    const done = () => customElements.get('peter-ecosystem-launcher') ? resolve() : reject(new Error('SDK do ecossistema não iniciou.'));
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', () => reject(new Error('Falha ao carregar o ecossistema Peter Tecnet.')), { once: true });
    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      script.dataset.peterEcosystemSdk = SDK_VERSION;
      document.head.appendChild(script);
    }
  }).catch((error) => { sdkPromise = undefined; throw error; });
  return sdkPromise;
}

function dockLauncherInNavbar(launcher) {
  const selectors = ['[data-peter-ecosystem-slot]', '.cut-navbar__inner', '.navlog__navbar .container', '.globalnav__header .navbar', '.navbar .container', '.navbar .container-fluid', '.navbar', 'header nav', "nav[role='navigation']", 'nav'];
  const findTarget = () => selectors.map((selector) => document.querySelector(selector)).find(Boolean) || null;
  const applyDockedLayout = () => {
    if (!launcher?.isConnected || !launcher.shadowRoot) return;
    const shell = launcher.shadowRoot.querySelector('.launcher');
    const button = launcher.shadowRoot.querySelector('.launcher-button');
    const panel = launcher.shadowRoot.querySelector('.panel');
    if (shell) Object.assign(shell.style, { position: 'relative', right: 'auto', top: 'auto', bottom: 'auto', zIndex: '2147483000', display: 'inline-flex', alignItems: 'center' });
    if (button) Object.assign(button.style, { width: '42px', height: '42px', flex: '0 0 auto', boxShadow: 'none' });
    if (panel) Object.assign(panel.style, { position: 'fixed', right: '12px', left: 'auto', top: 'calc(env(safe-area-inset-top) + 68px)', bottom: 'auto', width: 'min(370px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 92px)' });
  };
  const mount = () => {
    const target = findTarget();
    if (!target) return false;
    const toggle = target.querySelector?.('.navbar-toggler');
    if (toggle && toggle.parentElement === target) target.insertBefore(launcher, toggle);
    else if (launcher.parentElement !== target) target.appendChild(launcher);
    Object.assign(launcher.style, { display: 'inline-flex', alignItems: 'center', marginLeft: '8px', flex: '0 0 auto' });
    launcher.setAttribute('data-peter-navbar-docked', 'true');
    applyDockedLayout();
    return true;
  };
  let frame = 0;
  const scheduleMount = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      mount();
      applyDockedLayout();
    });
  };
  mount();
  const shadowObserver = new MutationObserver(applyDockedLayout);
  if (launcher.shadowRoot) shadowObserver.observe(launcher.shadowRoot, { childList: true, subtree: true });
  const navObserver = new MutationObserver(scheduleMount);
  navObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleMount, { passive: true });
  return () => {
    shadowObserver.disconnect();
    navObserver.disconnect();
    window.removeEventListener('resize', scheduleMount);
    if (frame) window.cancelAnimationFrame(frame);
  };
}

export default function PeterAccountGateway() {
  const hostRef = useRef(null);
  useEffect(() => {
    let active = true;
    let launcher = null;
    let cleanupDock = null;
    loadTelemetry()
      .catch((error) => console.error('[Kryvion Telemetry]', error))
      .finally(() => loadSdk().then(() => {
        if (!active || !hostRef.current) return;
        launcher = document.createElement('peter-ecosystem-launcher');
        launcher.setAttribute('api-base', API_BASE_URL);
        launcher.setAttribute('app-slug', APP_SLUG);
        launcher.setAttribute('sdk-version', SDK_VERSION);
        hostRef.current.replaceChildren(launcher);
        cleanupDock = dockLauncherInNavbar(launcher);
      }).catch((error) => console.error('[Kryvion Ecosystem]', error)));
    return () => {
      active = false;
      cleanupDock?.();
      launcher?.remove();
      hostRef.current?.replaceChildren();
    };
  }, []);
  return <span ref={hostRef} style={{ display: 'contents' }} />;
}
