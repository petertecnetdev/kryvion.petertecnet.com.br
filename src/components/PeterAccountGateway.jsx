import React, { useEffect, useRef } from 'react';
import { API_BASE_URL, APP_SLUG } from '../services/api.js';

const SDK_VERSION = '3.0.0';
const TELEMETRY_VERSION = '3.1.0';
const SUBSCRIPTION_VERSION = '1.0.0';
const SDK_URL = `https://petertecnet.com.br/ecosystem/peter-ecosystem-v3.js?v=${SDK_VERSION}`;
const TELEMETRY_URL = `https://petertecnet.com.br/ecosystem/peter-telemetry-v3.js?v=${TELEMETRY_VERSION}`;
const SUBSCRIPTION_URL = `https://petertecnet.com.br/ecosystem/peter-subscriptions-v1.js?v=${SUBSCRIPTION_VERSION}`;
let sdkPromise;
let telemetryPromise;
let subscriptionPromise;

function loadTelemetry() {
  if (window.PeterTecnetTelemetry?.version === TELEMETRY_VERSION) {
    window.PeterTecnetTelemetry.start({ apiBaseUrl: API_BASE_URL, appSlug: APP_SLUG });
    return Promise.resolve();
  }

  if (telemetryPromise) {
    return telemetryPromise.then(() => {
      window.PeterTecnetTelemetry?.start({ apiBaseUrl: API_BASE_URL, appSlug: APP_SLUG });
    });
  }

  telemetryPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-peter-telemetry-sdk]');
    const ready = () => {
      window.PeterTecnetTelemetry?.start({ apiBaseUrl: API_BASE_URL, appSlug: APP_SLUG });
      resolve();
    };

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
  }).catch((error) => {
    telemetryPromise = undefined;
    throw error;
  });

  return telemetryPromise;
}

function loadSdk() {
  if (customElements.get('peter-ecosystem-launcher')) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-peter-ecosystem-sdk]');
    const script = existing || document.createElement('script');
    const done = () => customElements.get('peter-ecosystem-launcher')
      ? resolve()
      : reject(new Error('SDK do ecossistema não iniciou.'));

    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', () => reject(new Error('Falha ao carregar o ecossistema Peter Tecnet.')), { once: true });

    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      script.dataset.peterEcosystemSdk = SDK_VERSION;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    sdkPromise = undefined;
    throw error;
  });

  return sdkPromise;
}

function loadSubscriptions() {
  if (window.PeterTecnetSubscriptions?.version === SUBSCRIPTION_VERSION && customElements.get('peter-subscription-gate')) return Promise.resolve();
  if (subscriptionPromise) return subscriptionPromise;

  subscriptionPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-peter-subscription-sdk]');
    const script = existing || document.createElement('script');
    const done = () => customElements.get('peter-subscription-gate')
      ? resolve()
      : reject(new Error('SDK de assinaturas não iniciou.'));

    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', () => reject(new Error('Falha ao carregar as assinaturas Peter Tecnet.')), { once: true });

    if (!existing) {
      script.src = SUBSCRIPTION_URL;
      script.async = true;
      script.dataset.peterSubscriptionSdk = SUBSCRIPTION_VERSION;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    subscriptionPromise = undefined;
    throw error;
  });

  return subscriptionPromise;
}

export default function PeterAccountGateway() {
  const hostRef = useRef(null);

  useEffect(() => {
    let active = true;

    loadTelemetry()
      .catch((error) => console.error('[Kryvion Telemetry]', error))
      .finally(() => Promise.all([loadSdk(), loadSubscriptions()]).then(() => {
        if (!active || !hostRef.current) return;
        const launcher = document.createElement('peter-ecosystem-launcher');
        launcher.setAttribute('api-base', API_BASE_URL);
        launcher.setAttribute('app-slug', APP_SLUG);
        launcher.setAttribute('sdk-version', SDK_VERSION);
        const subscriptionGate = document.createElement('peter-subscription-gate');
        subscriptionGate.setAttribute('api-base', API_BASE_URL);
        subscriptionGate.setAttribute('app-slug', APP_SLUG);
        hostRef.current.replaceChildren(launcher, subscriptionGate);
      }).catch((error) => console.error('[Kryvion Ecosystem]', error)));

    return () => {
      active = false;
      hostRef.current?.replaceChildren();
    };
  }, []);

  return <span ref={hostRef} style={{ display: 'contents' }} />;
}
