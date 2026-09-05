import './main.jsx';
import './public-site.css';
import './responsive-typography.css';
import './candlestick-responsive.css';
import './market-integrity.css';
import './market-tools.css';
import './notification-center.css';
import './kryvion-fullscreen-menu.css';
import './floating-tools-safety.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { API_BASE_URL, APP_SLUG } from './services/api.js';
import { getToken } from './services/auth.js';
import { startTelemetry } from './services/telemetry.js';
import { mountMarketIntelligence } from './MarketIntelligenceOverlay.jsx';
import { mountCoinMarketCapScanner } from './CoinMarketCapScannerOverlay.jsx';
import { mountMarketDataProvenance } from './components/MarketDataProvenance.jsx';
import KryvionMenuExtras from './components/KryvionMenuExtras.jsx';
import MarketReportShareButton from './components/MarketReportShareButton.jsx';

startTelemetry({
  apiBaseUrl: API_BASE_URL,
  appSlug: APP_SLUG,
  getToken,
});

// Ferramentas pesadas e flutuantes da área autenticada NÃO podem ser montadas
// na landing page nem na tela de login. Antes elas eram criadas globalmente e,
// em telas desktop, o Market Intelligence abria ocupando boa parte da direita.
// Isso encobria CTA, navegação e até o formulário de autenticação.
let authenticatedToolsMounted = false;

function syncAuthenticatedTools() {
  const insideAuthenticatedApp = Boolean(document.querySelector('.app-shell'));

  if (insideAuthenticatedApp && !authenticatedToolsMounted) {
    mountMarketIntelligence();
    mountCoinMarketCapScanner();
    mountMarketDataProvenance();
    authenticatedToolsMounted = true;
  }

  // Se o usuário fizer logout, os roots externos podem continuar existindo.
  // Mantemos todos invisíveis fora do app para nunca obstruírem páginas públicas.
  [
    'kryvion-market-intelligence-root',
    'kryvion-cmc-scanner-root',
    'kryvion-market-provenance-root',
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.hidden = !insideAuthenticatedApp;
  });
}

syncAuthenticatedTools();
const authenticatedToolsObserver = new MutationObserver(syncAuthenticatedTools);
authenticatedToolsObserver.observe(document.body, { childList: true, subtree: true });

const menuExtrasHost=document.createElement('div');
menuExtrasHost.id='kryvion-menu-extras-root';
document.body.appendChild(menuExtrasHost);
createRoot(menuExtrasHost).render(<KryvionMenuExtras/>);

const marketReportShareHost=document.createElement('div');
marketReportShareHost.id='kryvion-market-report-share-root';
document.body.appendChild(marketReportShareHost);
createRoot(marketReportShareHost).render(<MarketReportShareButton/>);
