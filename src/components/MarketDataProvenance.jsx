import React from 'react';
import {FiActivity,FiBarChart2,FiClock,FiCpu,FiDatabase} from 'react-icons/fi';

function ageLabel(updatedAt){
 if(!updatedAt)return 'aguardando atualização';
 const date=updatedAt instanceof Date?updatedAt:new Date(updatedAt);
 if(Number.isNaN(date.getTime()))return 'horário indisponível';
 const seconds=Math.max(0,Math.floor((Date.now()-date.getTime())/1000));
 if(seconds<60)return `há ${seconds}s`;
 const minutes=Math.floor(seconds/60);
 if(minutes<60)return `há ${minutes} min`;
 return date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

export default function MarketDataProvenance({marketState='connecting',updatedAt=null,provider='coingecko'}){
 const live=marketState==='live';
 const stale=marketState==='stale';
 const statusLabel=live?'Atualizado':stale?'Cache de resiliência':marketState==='offline'?'Indisponível':'Conectando';
 const marketProvider=provider==='coingecko'?'CoinGecko':provider||'CoinGecko';

 return <section className="market-provenance" aria-label="Origem e qualidade dos dados de mercado">
  <div className="provenance-head">
   <div><small>TRANSPARÊNCIA DOS DADOS</small><h3>De onde vêm as informações da Kryvion</h3></div>
   <span className={`provenance-status ${marketState}`}><i/>{statusLabel}</span>
  </div>
  <div className="provenance-grid">
   <div className="provenance-item"><FiDatabase/><div><small>Mercado spot</small><strong>{marketProvider}</strong><span>Preço, market cap, volume, 24h/7d e histórico resumido.</span></div></div>
   <div className="provenance-item"><FiBarChart2/><div><small>OHLCV profissional</small><strong>Binance Spot</strong><span>Open, high, low, close, volume e quantidade de trades.</span></div></div>
   <div className="provenance-item"><FiCpu/><div><small>Inteligência Kryvion</small><strong>Indicadores calculados</strong><span>Score, risco, regime, correlação, drawdown, EMA, RSI, MACD e sinais derivados.</span></div></div>
   <div className="provenance-item"><FiClock/><div><small>Atualização</small><strong>{ageLabel(updatedAt)}</strong><span>{live?'Dados de mercado atuais dentro da janela de cache.':stale?'Último snapshot válido mantido por resiliência.':'Aguardando uma leitura válida do mercado.'}</span></div></div>
  </div>
  <div className="provenance-note"><FiActivity/><span><b>Importante:</b> scores e classificações são interpretações quantitativas da Kryvion sobre dados reais de mercado; não são fatos fornecidos pelas exchanges nem promessa de retorno.</span></div>
 </section>;
}
