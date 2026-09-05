import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiMail, FiLoader } from 'react-icons/fi';
import api, { APP_SLUG } from '../services/api.js';

const HOST_ID = 'kryvion-notification-email-preference';

function ensurePreferenceHost() {
  const panel = document.querySelector('.notification-panel');
  if (!panel) return null;

  let host = panel.querySelector(`#${HOST_ID}`);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    const list = panel.querySelector('.notification-list');
    if (list) panel.insertBefore(host, list);
    else panel.appendChild(host);
  }
  return host;
}

export default function NotificationEmailPreference() {
  const [host, setHost] = useState(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => setHost(ensurePreferenceHost());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!host || loaded) return;
    let active = true;
    api.get(`/v1/apps/${APP_SLUG}/notifications`, { params: { per_page: 1 } })
      .then(({ data }) => {
        if (!active) return;
        setEmailEnabled(data?.preferences?.email_enabled !== false);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
        setError('Não foi possível carregar sua preferência de e-mail.');
      });
    return () => { active = false; };
  }, [host, loaded]);

  const updatePreference = async () => {
    const next = !emailEnabled;
    const previous = emailEnabled;
    setEmailEnabled(next);
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/v1/apps/${APP_SLUG}/notifications/read-all`, {
        preference_only: true,
        email_enabled: next,
      });
      setEmailEnabled(data?.preferences?.email_enabled !== false);
    } catch (requestError) {
      setEmailEnabled(previous);
      setError(requestError?.response?.data?.message || 'Não foi possível salvar sua preferência.');
    } finally {
      setSaving(false);
    }
  };

  if (!host) return null;

  return createPortal(<>
    <style>{`
      .notification-email-preference{margin:0 14px 10px;padding:13px 14px;border:1px solid rgba(97,244,203,.18);border-radius:14px;background:rgba(8,25,42,.82);display:flex;align-items:center;gap:12px;color:#eaf4ff}
      .notification-email-preference .mail-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:0 0 auto;background:rgba(97,244,203,.1);color:#61f4cb}
      .notification-email-preference .copy{min-width:0;flex:1}.notification-email-preference b{display:block;font-size:.86rem}.notification-email-preference small{display:block;margin-top:3px;color:#8fa5b9;line-height:1.35}
      .notification-email-preference button{position:relative;width:48px;height:27px;flex:0 0 auto;border:0;border-radius:999px;background:rgba(126,148,169,.35);cursor:pointer;transition:.2s ease}.notification-email-preference button.active{background:#61f4cb}.notification-email-preference button:disabled{cursor:wait;opacity:.65}
      .notification-email-preference button span{position:absolute;top:4px;left:4px;width:19px;height:19px;border-radius:50%;background:#fff;transition:.2s ease}.notification-email-preference button.active span{transform:translateX(21px);background:#07111f}
      .notification-email-preference .saving{animation:kryvionMailSpin .8s linear infinite;color:#61f4cb}@keyframes kryvionMailSpin{to{transform:rotate(360deg)}}
      .notification-email-preference-error{margin:-5px 16px 10px;color:#ff9e9e;font-size:.75rem}
    `}</style>
    <div className="notification-email-preference">
      <span className="mail-icon"><FiMail /></span>
      <span className="copy">
        <b>Notificações por e-mail</b>
        <small>{emailEnabled ? 'Você recebe por e-mail os novos alertas da Kryvion.' : 'Os alertas continuam aqui, mas não serão enviados ao seu e-mail.'}</small>
      </span>
      {!loaded || saving
        ? <FiLoader className="saving" aria-label="Salvando preferência" />
        : <button type="button" className={emailEnabled ? 'active' : ''} onClick={updatePreference} role="switch" aria-checked={emailEnabled} aria-label="Receber notificações da Kryvion por e-mail"><span /></button>}
    </div>
    {error && <div className="notification-email-preference-error">{error}</div>}
  </>, host);
}
