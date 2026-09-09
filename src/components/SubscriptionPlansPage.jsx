import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../services/api.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/v1/apps/kryvion/subscription-plans`, {
      headers: { Accept: 'application/json', 'X-Peter-App': 'kryvion' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Falha ao carregar planos.');
        return response.json();
      })
      .then((payload) => active && setPlans(payload?.data?.plans || []))
      .catch(() => active && setError('Não foi possível carregar os planos agora.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const choose = (plan) => {
    localStorage.setItem('pending_subscription_plan', JSON.stringify({
      application: 'kryvion',
      plan: plan.code,
      selected_at: new Date().toISOString(),
    }));
    window.location.assign(`/entrar?plan=${encodeURIComponent(plan.code)}`);
  };

  return (
    <main className="kryvion-pricing">
      <header className="kryvion-pricing__hero">
        <span>KRYVION</span>
        <h1>Inteligência de mercado no nível que você precisa</h1>
        <p>Comece grátis e evolua para sinais, alertas e análises avançadas quando fizer sentido.</p>
      </header>

      {loading && <p className="kryvion-pricing__status">Carregando planos…</p>}
      {error && <p className="kryvion-pricing__error">{error}</p>}

      <section className="kryvion-pricing__grid">
        {plans.map((plan) => {
          const free = Number(plan.price_cents || 0) === 0;
          return (
            <article className={`kryvion-pricing__card${plan.recommended ? ' is-recommended' : ''}`} key={plan.id || plan.code}>
              {plan.recommended && <span className="kryvion-pricing__badge">Recomendado</span>}
              <h2>{plan.name}</h2>
              <div className="kryvion-pricing__price">
                <strong>{free ? 'Grátis' : money.format(plan.price ?? plan.price_cents / 100)}</strong>
                {!free && <small>/mês</small>}
              </div>
              <ul>{(plan.features || []).map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <button type="button" onClick={() => choose(plan)}>{free ? 'Criar conta grátis' : `Escolher ${plan.name}`}</button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
