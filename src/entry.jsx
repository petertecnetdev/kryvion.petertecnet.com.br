import './main.jsx';
import './responsive-typography.css';
import './candlestick-responsive.css';
import './market-integrity.css';
import './market-tools.css';
import { API_BASE_URL, APP_SLUG } from './services/api.js';
import { getToken } from './services/auth.js';
import { startTelemetry } from './services/telemetry.js';

startTelemetry({
  apiBaseUrl: API_BASE_URL,
  appSlug: APP_SLUG,
  getToken,
});
