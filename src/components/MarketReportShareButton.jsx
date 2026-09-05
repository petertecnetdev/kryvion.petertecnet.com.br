import React, { useEffect, useMemo, useState } from 'react';
import { FiShare2 } from 'react-icons/fi';
import '../market-report-share.css';

function readOpenReportSymbol() {
  const fromQuery = new URLSearchParams(window.location.search).get('marketReport');
  if (fromQuery) return String(fromQuery).toUpperCase();

  const heading = document.querySelector('.market-report-hero h2')?.textContent || '';
  const symbol = heading.split('·')[0]?.trim();
  return symbol ? symbol.toUpperCase() : '';
}

function buildPublicReportUrl(symbol) {
  const url = new URL(window.location.origin + window.location.pathname);
  if (symbol) url.searchParams.set('marketReport', symbol);
  return url.href;
}

function buildShareText(symbol, reportUrl) {
  const label = symbol ? `Análise de ${symbol}` : 'Análise de mercado';
  return `🚨 Kryvion · ${label}\n\nVeja o detalhamento completo desta notificação e a análise atualizada:\n${reportUrl}\n\nAnálise de dados da Kryvion. Não constitui recomendação financeira.`;
}

export default function MarketReportShareButton() {
  const [visible, setVisible] = useState(false);
  const [symbol, setSymbol] = useState('');

  useEffect(() => {
    const sync = () => {
      const reportOpen = Boolean(document.querySelector('.market-report-overlay'));
      setVisible(reportOpen);
      if (reportOpen) setSymbol(readOpenReportSymbol());
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', sync);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const reportUrl = useMemo(() => buildPublicReportUrl(symbol), [symbol]);

  if (!visible) return null;

  const share = async () => {
    const text = buildShareText(symbol, reportUrl);

    if (navigator.share) {
      try {
        await navigator.share({
          title: symbol ? `Kryvion · ${symbol}` : 'Kryvion · Análise de mercado',
          text: symbol ? `Veja a análise completa de ${symbol} na Kryvion.` : 'Veja esta análise completa na Kryvion.',
          url: reportUrl,
        });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      className="market-report-share-floating"
      onClick={share}
      aria-label="Compartilhar esta análise da Kryvion"
      title="Compartilhar análise"
    >
      <FiShare2 />
      <span>Compartilhar</span>
    </button>
  );
}
