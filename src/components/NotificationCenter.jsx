import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiLoader, FiVolume2, FiX } from 'react-icons/fi';
import { marketApi } from '../services/api.js';
import { connectNotificationRealtime } from '../services/realtime.js';

const POLL_MS = 60_000;

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    oscillator.addEventListener('ended', () => context.close().catch(() => {}), { once: true });
  } catch {
    // O navegador pode bloquear áudio até ocorrer uma interação do usuário.
  }
}

function NotificationPermissionGate() {
  const [permission, setPermission] = useState(() => window.Notification?.permission || 'unsupported');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return undefined;
    const sync = () => setPermission(window.Notification.permission);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  if (permission === 'granted' || permission === 'unsupported') return null;

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    setRequesting(true);
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') playNotificationSound();
    } finally {
      setRequesting(false);
    }
  };

  return <div className="notification-permission-gate" role="dialog" aria-modal="true" aria-labelledby="notification-required-title">
    <div className="notification-permission-card">
      <span className="notification-permission-icon"><FiBell /></span>
      <small>KRYVION · ALERTAS EM TEMPO REAL</small>
      <h2 id="notification-required-title">Ative as notificações para continuar</h2>
      <p>A Kryvion usa notificações para avisar imediatamente sobre movimentos relevantes do mercado, sinais e mudanças importantes no radar.</p>
      {permission === 'denied' && <p className="notification-permission-denied">As notificações estão bloqueadas neste navegador. Abra as permissões do site, altere “Notificações” para “Permitir” e volte para esta tela.</p>}
      <button type="button" onClick={requestPermission} disabled={requesting || permission === 'denied'}>
        <FiVolume2 /> {requesting ? 'Solicitando permissão…' : permission === 'denied' ? 'Permissão bloqueada no navegador' : 'Ativar notificações e som'}
      </button>
      {permission === 'denied' && <button type="button" className="notification-permission-recheck" onClick={() => setPermission(window.Notification.permission)}>Já alterei a permissão</button>}
    </div>
  </div>;
}

function normalizeList(payload) {
  const paginator = payload?.notifications;
  if (Array.isArray(paginator)) return paginator;
  if (Array.isArray(paginator?.data)) return paginator.data;
  return [];
}

function relativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function NotificationCenter({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveNotice, setLiveNotice] = useState(null);
  const shellRef = useRef(null);

  const loadCount = useCallback(async () => {
    try {
      const { data } = await marketApi.notificationUnreadCount();
      setUnread(Number(data?.unread_count || 0));
    } catch {
      // O contador não deve interromper o restante do dashboard.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await marketApi.notifications({ per_page: 20 });
      setItems(normalizeList(data));
      setUnread(Number(data?.unread_count || 0));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Não foi possível carregar suas notificações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadCount();
    }, POLL_MS);
    const visible = () => document.visibilityState === 'visible' && loadCount();
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadCount]);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    let disconnect = () => {};
    let active = true;
    connectNotificationRealtime((notification) => {
      if (!active || !notification?.id) return;
      playNotificationSound();
      setUnread((current) => current + (notification.read_at ? 0 : 1));
      setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
      setLiveNotice(notification);
      window.setTimeout(() => setLiveNotice((current) => current?.id === notification.id ? null : current), 8000);
      if (document.visibilityState !== 'visible' && window.Notification?.permission === 'granted') {
        new window.Notification(notification.title || 'Kryvion', { body: notification.message || 'Novo alerta de mercado.' });
      }
    }).then((cleanup) => { if (active) disconnect = cleanup; else cleanup?.(); });
    return () => { active = false; disconnect(); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (shellRef.current && !shellRef.current.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  const markRead = async (notification) => {
    if (!notification?.read_at) {
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnread((current) => Math.max(0, current - 1));
      try {
        await marketApi.markNotificationRead(notification.id);
      } catch {
        loadNotifications();
        return;
      }
    }

    const target = notification?.reference_url;
    if (target) {
      setOpen(false);
      if (onNavigate) onNavigate(target, notification);
    }
  };

  const markAllRead = async () => {
    if (!unread) return;
    const previousItems = items;
    const previousUnread = unread;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
    setUnread(0);
    try {
      await marketApi.markAllNotificationsRead();
    } catch {
      setItems(previousItems);
      setUnread(previousUnread);
    }
  };

  return <>
    <NotificationPermissionGate />
    <div className="notification-center" ref={shellRef}>
      {liveNotice && <button type="button" className="notification-live-toast" onClick={() => { setOpen(true); setLiveNotice(null); }}><small>AO VIVO · MERCADO</small><b>{liveNotice.title}</b>{liveNotice.message && <span>{liveNotice.message}</span>}</button>}
      <button
        type="button"
        className={`icon-btn notification-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `${unread} notificações não lidas` : 'Notificações'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FiBell />
        {unread > 0 && <span className="notification-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && <section className="notification-panel" role="dialog" aria-label="Central de notificações">
        <div className="notification-head">
          <div>
            <small>CENTRAL PETER TECNET</small>
            <h3>Notificações</h3>
          </div>
          <div className="notification-head-actions">
            {unread > 0 && <button type="button" onClick={markAllRead} title="Marcar todas como lidas"><FiCheckCircle /> <span>Ler todas</span></button>}
            <button type="button" className="notification-close" onClick={() => setOpen(false)} aria-label="Fechar notificações"><FiX /></button>
          </div>
        </div>

        <div className="notification-list">
          {loading && !items.length && <div className="notification-state"><FiLoader className="spin" /><span>Sincronizando notificações…</span></div>}
          {error && !items.length && <div className="notification-state error"><span>{error}</span><button type="button" onClick={loadNotifications}>Tentar novamente</button></div>}
          {!loading && !error && !items.length && <div className="notification-state"><FiBell /><b>Tudo em dia</b><span>Alertas de mercado e atualizações da sua conta aparecerão aqui.</span></div>}
          {items.map((notification) => <button
            type="button"
            className={`notification-item ${notification.read_at ? 'read' : 'unread'}`}
            key={notification.id}
            onClick={() => markRead(notification)}
          >
            <span className="notification-status">{notification.read_at ? <FiCheck /> : <i />}</span>
            <span className="notification-copy">
              <b>{notification.title || 'Nova notificação'}</b>
              {notification.message && <span>{notification.message}</span>}
              <small>{relativeTime(notification.created_at)}</small>
            </span>
          </button>)}
        </div>
      </section>}
    </div>
  </>;
}
