import api, { APP_SLUG } from './api.js';

export const marketSignalsApi = {
  current: () => api.get(`/v1/apps/${APP_SLUG}/market/signals`),
};

export default marketSignalsApi;
