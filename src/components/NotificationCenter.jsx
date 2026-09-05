import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiActivity,
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiDatabase,
  FiExternalLink,
  FiInfo,
  FiLoader,
  FiShare2,
  FiShield,
  FiTrendingUp,
  FiVolume2,
  FiX,
} from 'react-icons/fi';
import { marketApi } from '../services/api.js';
import { connectNotificationRealtime } from '../services/realtime.js';
import '../notification-insight.css';

const POLL_MS = 60_000;
const SHARED_NOTIFICATION_PARAM = 'notification';
const SHARED_NOTIFICATION_PAGE_SIZE = 50;
const MAX_SHARED_NOTIFICATION_PAGES = 40;

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
    // Alguns navegadores bloqueiam áudio até a primeira interação do usuário.
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

function getNotificationDetailUrl(notification) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(SHARED_NOTIFICATION_PARAM, String(notification?.id || ''));
    return url.href;
  } catch {
    return window.location.href;
  }
}

function setNotificationUrl(notificationId) {
  try {
    const url = new URL(window.location.href);
    if (notificationId) url.searchParams.set(SHARED_NOTIFICATION_PARAM, String(notificationId));
    else url.searchParams.delete(SHARED_NOTIFICATION_PARAM);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // O detalhamento continua funcional mesmo se o navegador bloquear History API.
  }
}

function getMarketSymbol(notification) {
  const direct = notification?.asset_symbol || notification?.symbol || notification?.metadata?.symbol || notification?.data?.symbol;
  if (direct) return String(direct).toUpperCase();
  try {
    const url = new URL(notification?.reference_url || '', window.location.origin);
    return (url.searchParams.get('marketReport') || url.searchParams.get('symbol') || '').toUpperCase();
  } catch {
    return '';
  }
}

function buildShareMessage(notification) {
  const title = notification?.title || 'Alerta de mercado Kryvion';
  const message = notification?.message ? `\n\n${notification.message}` : '';
  const detailUrl = getNotificationDetailUrl(notification);
  return `🚨 Kryvion · ${title}${message}\n\nVeja o detalhamento completo da notificação:\n${detailUrl}\n\nAnálise de dados da Kryvion. Não constitui recomendação financeira.`;
}

async function shareNotification(notification) {
  if (!notification?.id) return;
  const title = notification?.title || 'Alerta de mercado Kryvion';
  const url = getNotificationDetailUrl(notification);
  const text = notification?.message
    ? `${notification.message}\n\nAnálise de dados da Kryvion. Não constitui recomendação financeira.`
    : 'Veja o detalhamento completo desta análise da Kryvion.';

  if (navigator.share) {
    try {
      await navigator.share({ title: `Kryvion · ${title}`, text, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(buildShareMessage(notification))}`, '_blank', 'noopener,noreferrer');
}

function formatUsd(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number(value) < 1 ? 6 : 2,
  }).format(Number(value || 0));
}

function formatPct(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value || 0);
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function normalizeSources(report, notification) {
  const received = report?.sources || notification?.sources || notification?.metadata?.sources || notification?.data?.sources;
  if (Array.isArray(received) && received.length) {
    return received.map((source, index) => typeof source === 'string'
      ? { name: source, detail: 'Fonte informada pela análise.' }
      : {
        name: source?.name || source?.provider || source?.label || `Fonte ${index + 1}`,
        detail: source?.detail || source?.description || source?.data || source?.fields || 'Dados utilizados na análise.',
        url: source?.url || source?.reference_url || '',
      });
  }

  return [
    {
      name: 'CoinGecko',
      detail: 'Preço, capitalização, volume e variações de mercado usados no snapshot da Kryvion.',
    },
    {
      name: 'Binance Spot',
      detail: 'Candles OHLCV e atividade de negociação quando a análise técnica do ativo utiliza séries de mercado.',
    },
    {
      name: 'Kryvion Intelligence Engine',
      detail: 'Score, confiança, classificação, confluências, riscos e faixas probabilísticas calculados pela Kryvion.',
    },
  ];
}

function plainConclusion(notification, report) {
  if (report?.timing_note) return report.timing_note;
  if (notification?.explanation) return notification.explanation;
  if (notification?.message) return notification.message;
  return 'A Kryvion detectou uma combinação de sinais que merece atenção. A leitura abaixo mostra o que sustentou o alerta e quais dados foram utilizados.';
}

function NotificationInsight({ notification, onClose, onNavigate }) {
  const symbol = useMemo(() => getMarketSymbol(notification), [notification]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(Boolean(symbol));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!symbol) {
      setLoading(false);
      return undefined;
    }

    marketApi.opportunityReport(symbol)
      .then((response) => {
        if (active) setReport(response.data?.data || response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Não foi possível atualizar o relatório deste ativo agora.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [symbol]);

  const reasons = report?.reasons || notification?.reasons || notification?.metadata?.reasons || notification?.data?.reasons || [];
  const risks = report?.risks || notification?.risks || notification?.metadata?.risks || notification?.data?.risks || [];
  const sources = normalizeSources(report, notification);
  const hasMetrics = report && [report.price_usd, report.change_1h, report.change_24h, report.change_7d, report.score, report.confidence].some((value) => value !== null && value !== undefined);

  const openReference = () => {
    const target = notification?.reference_url;
    if (!target) return;
    onClose();
    if (onNavigate) onNavigate(target, notification);
  };

  return <div className="notification-insight-overlay" role="dialog" aria-modal="true" aria-label="Detalhamento da notificação">
    <article className="notification-insight-card">
      <header className="notification-insight-header">
        <div>
          <small>KRYVION · EXPLICAÇÃO DO ALERTA</small>
          <h2>{notification?.title || (symbol ? `Análise de ${symbol}` : 'Detalhamento da notificação')}</h2>
          <p>{relativeTime(notification?.created_at)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhamento"><FiX /></button>
      </header>

      <section className="notification-insight-summary">
        <span className="notification-insight-summary-icon"><FiTrendingUp /></span>
        <div>
          <small>O QUE ISSO QUER DIZER</small>
          <p>{plainConclusion(notification, report)}</p>
        </div>
      </section>

      {loading && <div className="notification-insight-loading"><FiLoader className="spin" /><span>Atualizando os dados usados nesta análise…</span></div>}
      {error && <div className="notification-insight-warning"><FiInfo /><span>{error} A explicação original da notificação continua disponível abaixo.</span></div>}

      {report && <section className="notification-insight-verdict">
        <div><small>CLASSIFICAÇÃO</small><strong>{report.classification || 'Em observação'}</strong></div>
        <div><small>SCORE</small><strong>{report.score ?? '—'}<span>/100</span></strong></div>
        <div><small>CONFIANÇA</small><strong>{report.confidence ?? '—'}<span>%</span></strong></div>
      </section>}

      <section className="notification-insight-section">
        <div className="notification-insight-section-title"><FiActivity /><div><small>POR QUE ISSO É INTERESSANTE</small><h3>Evidências que sustentam o alerta</h3></div></div>
        {reasons.length
          ? <div className="notification-insight-reasons">{reasons.map((reason, index) => <div key={`${reason}-${index}`}><b>{index + 1}</b><span>{reason}</span></div>)}</div>
          : <p className="notification-insight-empty">A notificação não trouxe uma lista estruturada de confluências. A Kryvion exibe somente o que recebeu da análise, sem completar evidências artificialmente.</p>}
      </section>

      {hasMetrics && <section className="notification-insight-section">
        <div className="notification-insight-section-title"><FiDatabase /><div><small>DADOS OBSERVADOS</small><h3>Números usados para contextualizar a conclusão</h3></div></div>
        <div className="notification-insight-metrics">
          <div><small>PREÇO AGORA</small><b>{formatUsd(report.price_usd)}</b></div>
          <div><small>1 HORA</small><b>{formatPct(report.change_1h)}</b></div>
          <div><small>24 HORAS</small><b>{formatPct(report.change_24h)}</b></div>
          <div><small>7 DIAS</small><b>{formatPct(report.change_7d)}</b></div>
          {report.entry_window && <div className="wide"><small>ENTRADA / CONFIRMAÇÃO</small><b>{report.entry_window}</b></div>}
          {report.target_price_min_usd !== undefined && <div className="wide"><small>FAIXA-ALVO PROBABILÍSTICA</small><b>{formatUsd(report.target_price_min_usd)} – {formatUsd(report.target_price_max_usd)}</b></div>}
        </div>
      </section>}

      <section className="notification-insight-section">
        <div className="notification-insight-section-title"><FiDatabase /><div><small>FONTES E PROCEDÊNCIA</small><h3>De onde vieram os dados</h3></div></div>
        <div className="notification-insight-sources">
          {sources.map((source, index) => <div key={`${source.name}-${index}`}>
            <span>{index + 1}</span>
            <div><b>{source.name}</b><p>{typeof source.detail === 'string' ? source.detail : JSON.stringify(source.detail)}</p></div>
            {source.url && <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Abrir fonte ${source.name}`}><FiExternalLink /></a>}
          </div>)}
        </div>
      </section>

      {(risks.length > 0 || report?.disclaimer) && <section className="notification-insight-risk">
        <FiShield />
        <div>
          <b>O que pode invalidar essa leitura?</b>
          {risks.length > 0 && <p>{risks.join(' ')}</p>}
          {report?.disclaimer && <small>{report.disclaimer}</small>}
        </div>
      </section>}

      <footer className="notification-insight-footer">
        <button type="button" className="notification-insight-share" onClick={() => shareNotification(notification)}><FiShare2 /> Compartilhar</button>
        {notification?.reference_url && <button type="button" className="notification-insight-reference" onClick={openReference}>Abrir análise completa <FiChevronRight /></button>}
      </footer>
    </article>
  </div>;
}

export default function NotificationCenter({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveNotice, setLiveNotice] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const shellRef = useRef(null);
  const sharedNotificationLoadedRef = useRef('');

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

  const loadSharedNotification = useCallback(async (notificationId) => {
    if (!notificationId || sharedNotificationLoadedRef.current === String(notificationId)) return;
    sharedNotificationLoadedRef.current = String(notificationId);

    try {
      for (let page = 1; page <= MAX_SHARED_NOTIFICATION_PAGES; page += 1) {
        const { data } = await marketApi.notifications({ per_page: SHARED_NOTIFICATION_PAGE_SIZE, page });
        const pageItems = normalizeList(data);
        const notification = pageItems.find((item) => String(item.id) === String(notificationId));

        if (notification) {
          setSelectedNotification(notification);
          setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
          if (!notification.read_at) {
            marketApi.markNotificationRead(notification.id).then(() => loadCount()).catch(() => {});
          }
          return;
        }

        const paginator = data?.notifications;
        const currentPage = Number(paginator?.current_page || page);
        const lastPage = Number(paginator?.last_page || currentPage);
        if (!pageItems.length || currentPage >= lastPage) break;
      }
    } catch {
      sharedNotificationLoadedRef.current = '';
    }
  }, [loadCount]);

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
    const syncSharedNotification = () => {
      const notificationId = new URLSearchParams(window.location.search).get(SHARED_NOTIFICATION_PARAM);
      if (notificationId) loadSharedNotification(notificationId);
    };

    syncSharedNotification();
    window.addEventListener('popstate', syncSharedNotification);
    return () => window.removeEventListener('popstate', syncSharedNotification);
  }, [loadSharedNotification]);

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

  const closeNotificationDetail = () => {
    setSelectedNotification(null);
    sharedNotificationLoadedRef.current = '';
    setNotificationUrl(null);
  };

  const markRead = async (notification) => {
    if (!notification?.read_at) {
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnread((current) => Math.max(0, current - 1));
      try {
        await marketApi.markNotificationRead(notification.id);
      } catch {
        loadNotifications();
      }
    }
    setOpen(false);
    setSelectedNotification(notification);
    sharedNotificationLoadedRef.current = String(notification.id);
    setNotificationUrl(notification.id);
  };

  const shareFromList = (notification, event) => {
    event?.stopPropagation();
    shareNotification(notification);
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
    {selectedNotification && <NotificationInsight notification={selectedNotification} onClose={closeNotificationDetail} onNavigate={onNavigate} />}
    <div className="notification-center" ref={shellRef}>
      {liveNotice && <button type="button" className="notification-live-toast" onClick={() => {
        setSelectedNotification(liveNotice);
        sharedNotificationLoadedRef.current = String(liveNotice.id);
        setNotificationUrl(liveNotice.id);
        setLiveNotice(null);
      }}><small>AO VIVO · MERCADO</small><b>{liveNotice.title}</b>{liveNotice.message && <span>{liveNotice.message}</span>}</button>}
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
            <small>CENTRAL KRYVION</small>
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
          {items.map((notification) => <div
            className={`notification-item ${notification.read_at ? 'read' : 'unread'}`}
            key={notification.id}
            role="button"
            tabIndex={0}
            onClick={() => markRead(notification)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                markRead(notification);
              }
            }}
          >
            <span className="notification-status">{notification.read_at ? <FiCheck /> : <i />}</span>
            <span className="notification-copy">
              <b>{notification.title || 'Nova notificação'}</b>
              {notification.message && <span>{notification.message}</span>}
              <small>{relativeTime(notification.created_at)} · toque para entender</small>
            </span>
            <button
              type="button"
              className="notification-share"
              onClick={(event) => shareFromList(notification, event)}
              aria-label={`Compartilhar ${notification.title || 'notificação'}`}
              title="Compartilhar notificação"
              style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(97,244,203,.22)', background: 'rgba(97,244,203,.08)', cursor: 'pointer' }}
            >
              <FiShare2 />
            </button>
          </div>)}
        </div>
      </section>}
    </div>
  </>;
}
