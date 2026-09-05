import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiShield, FiTrendingUp, FiZap } from 'react-icons/fi';
import Brand, { KryvionMark } from './Brand.jsx';
import { fetchRuntimeConfig, login, loginWithGoogle } from '../services/auth.js';

const GOOGLE_SCRIPT_ID = 'kryvion-google-identity';

function messageOf(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

function retryAfterOf(error) {
  const bodyValue = Number(error?.response?.data?.retry_after);
  const headerValue = Number(error?.response?.headers?.['retry-after']);
  const candidate = Number.isFinite(bodyValue) && bodyValue > 0 ? bodyValue : headerValue;
  return Math.max(1, Math.min(300, Number.isFinite(candidate) && candidate > 0 ? Math.ceil(candidate) : 60));
}

function loadGoogleSdk() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  return new Promise((resolve, reject) => {
    let script = document.getElementById(GOOGLE_SCRIPT_ID);
    const onReady = () => window.google?.accounts?.id
      ? resolve(window.google.accounts.id)
      : reject(new Error('O Google Identity Services não inicializou corretamente.'));

    if (script) {
      script.addEventListener('load', onReady, { once: true });
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar o login Google.')), { once: true });
      return;
    }

    script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', () => reject(new Error('Não foi possível carregar o login Google.')), { once: true });
    document.head.appendChild(script);
  });
}

export default function LoginScreen({ onAuthenticated }) {
  const googleHost = useRef(null);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const rateLimitUntilRef = useRef(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const rateLimited = cooldown > 0;
  const canSubmit = useMemo(
    () => username.trim() && password && !loading && !rateLimited,
    [username, password, loading, rateLimited],
  );

  function handleRequestError(requestError, fallback) {
    if (requestError?.response?.status === 429) {
      const seconds = retryAfterOf(requestError);
      rateLimitUntilRef.current = Date.now() + (seconds * 1000);
      setCooldown(seconds);
      setError(`Aguarde ${seconds}s antes de tentar novamente. A página vai liberar o acesso automaticamente.`);
      return;
    }

    setError(messageOf(requestError, fallback));
  }

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    mounted.current = true;
    let active = true;

    async function completeGoogle(credential) {
      if (!credential || busyRef.current || Date.now() < rateLimitUntilRef.current) return;
      busyRef.current = true;
      setLoading(true);
      setError('');
      try {
        const session = await loginWithGoogle(credential);
        if (active) onAuthenticated(session.user);
      } catch (requestError) {
        if (active) handleRequestError(requestError, 'Não foi possível entrar com o Google.');
      } finally {
        busyRef.current = false;
        if (active) setLoading(false);
      }
    }

    async function bootGoogle() {
      try {
        const config = await fetchRuntimeConfig();
        const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || config?.google_client_id || '').trim();
        if (!clientId) throw new Error('O login Google ainda não está configurado na API central.');

        const identity = await loadGoogleSdk();
        if (!active || !googleHost.current) return;

        identity.initialize({
          client_id: clientId,
          callback: ({ credential }) => completeGoogle(credential),
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
        });

        googleHost.current.replaceChildren();
        identity.renderButton(googleHost.current, {
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: Math.min(420, Math.max(280, googleHost.current.clientWidth || 360)),
          locale: 'pt-BR',
        });
        if (active) setGoogleReady(true);
      } catch (bootError) {
        if (active) setGoogleError(messageOf(bootError, 'Não foi possível preparar o login Google.'));
      }
    }

    bootGoogle();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [onAuthenticated]);

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || busyRef.current || Date.now() < rateLimitUntilRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setError('');
    try {
      const session = await login(username.trim(), password);
      if (mounted.current) onAuthenticated(session.user);
    } catch (requestError) {
      if (mounted.current) handleRequestError(requestError, 'Não foi possível entrar.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-aurora login-aurora-a" />
      <div className="login-aurora login-aurora-b" />
      <div className="login-grid" />

      <section className="login-story">
        <Brand />
        <div className="login-story-copy">
          <span className="login-kicker"><i /> MARKET INTELLIGENCE</span>
          <h1>Decisões melhores.<br/><em>Risco sob controle.</em></h1>
          <p>A Kryvion cruza mercado, tendência, risco e contexto para transformar dados em decisões explicáveis.</p>
        </div>

        <div className="login-features">
          <div><FiTrendingUp /><span><b>Opportunity Engine</b><small>Prioriza ativos por oportunidade × risco.</small></span></div>
          <div><FiShield /><span><b>Risk Guardian</b><small>Protege exposição, liquidez e concentração.</small></span></div>
          <div><FiZap /><span><b>Decision Engine</b><small>Converte sinais em estratégias de entrada e saída.</small></span></div>
        </div>

        <div className="login-orbit" aria-hidden="true">
          <div className="orbit-ring orbit-one" />
          <div className="orbit-ring orbit-two" />
          <div className="orbit-core"><KryvionMark /></div>
        </div>
      </section>

      <section className="login-access">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-head">
            <span className="login-lock"><FiLock /></span>
            <div><small>CONTA GRATUITA · PETER TECNET</small><h2>Entrar ou começar grátis</h2></div>
          </div>

          <p className="login-card-subtitle">Entre com sua conta existente ou continue com Google para criar sua conta gratuita.</p>

          {error && <div className="login-error" role="alert">{error}</div>}

          <label className="login-field">
            <span>Usuário ou e-mail</span>
            <div>
              <FiMail />
              <input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Digite seu usuário ou e-mail" disabled={loading} />
            </div>
          </label>

          <label className="login-field">
            <span>Senha</span>
            <div>
              <FiLock />
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" disabled={loading} />
              <button type="button" className="login-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          <button className="login-submit" type="submit" disabled={!canSubmit}>
            <span>{loading ? 'Autenticando...' : rateLimited ? `Tente novamente em ${cooldown}s` : 'Entrar na Kryvion'}</span><FiArrowRight />
          </button>

          <div className="login-divider"><span>ou</span></div>

          <div className={`google-shell ${googleReady ? 'is-ready' : ''}`} aria-disabled={rateLimited}>
            <div ref={googleHost} className="google-host" />
            {rateLimited
              ? <div className="google-loading">Aguarde {cooldown}s…</div>
              : !googleReady && !googleError && <div className="google-loading">Preparando Google…</div>}
          </div>
          {googleError && <p className="google-note">{googleError}</p>}

          <div className="login-security">
            <FiShield />
            <span>Sessão centralizada, SSO entre plataformas e proteção de token pelo ecossistema Peter Tecnet.</span>
          </div>
        </form>
      </section>
    </div>
  );
}
