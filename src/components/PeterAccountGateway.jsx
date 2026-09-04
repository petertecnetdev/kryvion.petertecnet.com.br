import React, { useEffect, useRef } from 'react';
import { API_BASE_URL, APP_SLUG } from '../services/api.js';

const SDK_VERSION = '3.0.0';
const SDK_URL = `https://petertecnet.com.br/ecosystem/peter-ecosystem-v3.js?v=${SDK_VERSION}`;
let sdkPromise;

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

export default function PeterAccountGateway() {
  const hostRef = useRef(null);

  useEffect(() => {
    let active = true;

    loadSdk().then(() => {
      if (!active || !hostRef.current) return;
      const launcher = document.createElement('peter-ecosystem-launcher');
      launcher.setAttribute('api-base', API_BASE_URL);
      launcher.setAttribute('app-slug', APP_SLUG);
      launcher.setAttribute('sdk-version', SDK_VERSION);
      hostRef.current.replaceChildren(launcher);
    }).catch((error) => console.error('[Kryvion Ecosystem]', error));

    return () => {
      active = false;
      hostRef.current?.replaceChildren();
    };
  }, []);

  return <span ref={hostRef} style={{ display: 'contents' }} />;
}
