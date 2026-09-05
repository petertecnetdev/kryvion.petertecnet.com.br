import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { marketApi } from './api.js';
import { getToken, getStoredUser } from './auth.js';

window.Pusher = Pusher;
let echo = null;

export async function connectNotificationRealtime(onNotification) {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user?.id) return () => {};

  try {
    const { data: config } = await marketApi.realtimeConfig();
    if (!config?.enabled || !config?.key || !config?.host) return () => {};
    echo = new Echo({
      broadcaster: 'reverb', key: config.key, wsHost: config.host,
      wsPort: Number(config.port || 80), wssPort: Number(config.port || 443),
      forceTLS: config.scheme === 'https', enabledTransports: ['ws','wss'],
      authEndpoint: config.auth_endpoint,
      auth: { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    });
    const channel = echo.private(config.channel || `App.Models.User.${user.id}`);
    channel.listen(`.${config.event || 'app.notification.created'}`, (payload) => onNotification?.(payload?.notification || payload));
    return () => { try { echo?.leave(config.channel || `App.Models.User.${user.id}`); } catch {} try { echo?.disconnect(); } catch {} echo = null; };
  } catch { return () => {}; }
}
