import './main.jsx';
import './public-site.css';
import './responsive-typography.css';
import './candlestick-responsive.css';
import './market-integrity.css';
import './market-tools.css';
import './notification-center.css';
import './kryvion-fullscreen-menu.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { API_BASE_URL, APP_SLUG } from './services/api.js';
import { getToken } from './services/auth.js';
import { startTelemetry } from './services/telemetry.js';
import { mountMarketIntelligence } from './MarketIntelligenceOverlay.jsx';
import { mountCoinMarketCapScanner } from './CoinMarketCapScannerOverlay.jsx';
import { mountMarketDataProvenance } from './components/MarketDataProvenance.jsx';
import KryvionMenuExtras from './components/KryvionMenuExtras.jsx';

startTelemetry({
  apiBaseUrl: API_BASE_URL,
  appSlug: APP_SLUG,
  getToken,
});

mountMarketIntelligence();
mountCoinMarketCapScanner();
mountMarketDataProvenance();

const menuExtrasHost=document.createElement('div');
menuExtrasHost.id='kryvion-menu-extras-root';
document.body.appendChild(menuExtrasHost);
createRoot(menuExtrasHost).render(<KryvionMenuExtras/>);
