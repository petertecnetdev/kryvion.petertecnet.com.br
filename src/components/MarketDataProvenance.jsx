import React,{useCallback,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FiActivity,FiBarChart2,FiClock,FiCpu,FiDatabase} from 'react-icons/fi';
import {marketApi} from '../services/api.js';
import '../market-provenance.css';

const CACHE_KEY='kryvion.market.overview.v1';
const POLL_MS=60_000;

function readCache(){
 try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null');}catch{return null;}
}

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

function MarketDataProvenance(){
 const cached=readCache();
 const [marketState,setMarketState]=useState(cached?.assets?.length?'stale':'connecting');
 const [updatedAt,setUpdatedAt]=useState(cached?.updatedAt?new Date(cached.updatedAt):null);
 const [provider,setProvider]=useState(cached?.provider||'coingecko');

 const load=useCallback(async()=>{
  try{
   const response=await marketApi.overview();
   const data=response.data?.data||response.data;
   if(!Array.isArray(data?.assets)||!data.assets.length)throw new Error('Snapshot de mercado vazio.');
   setProvider(data.provider||'coingecko');
   setUpdatedAt(data.fetched_at?new Date(data.fetched_at):new Date());
   setMarketState('live');
  }catch{
   const fallback=readCache();
   if(fallback?.assets?.length){
    setProvider(fallback.provider||'coingecko');
    setUpdatedAt(fallback.updatedAt?new Date(fallback.updatedAt):null);
    setMarketState('stale');
   }else setMarketState('offline');
  }
 },[]);

 useEffect(()=>{
  load();
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')load();},POLL_MS);
  return()=>window.clearInterval(timer);
 },[load]);

 const live=marketState==='live';
 const stale=marketState==='stale';
 const statusLabel=live?'Atualizado':stale?'Cache de resiliência':marketState==='offline'?'Indisponível':'Conectando';
 const marketProvider=provider==='coingecko'?'CoinGecko':provider||'CoinGecko';

 return <section className="market-provenance" aria-label="Origem e qualidade dos dados de mercado">
  <div className="provenance-head">
   <div><small>TRANSPARÊNCIA DOS DADOS</small><h3>Origem, atualização e interpretação</h3></div>
   <span className={`provenance-status ${marketState}`}><i/>{statusLabel}</span>
  </div>
  <div className="provenance-grid">
   <div className="provenance-item"><FiDatabase/><div><small>Dados de mercado</small><strong>{marketProvider}</strong><span>Preço, capitalização, volume, variações 24h/7d e série resumida em BRL.</span></div></div>
   <div className="provenance-item"><FiBarChart2/><div><small>Candles OHLCV</small><strong>Binance Spot</strong><span>Open, high, low, close, volume e quantidade de trades dos pares spot.</span></div></div>
   <div className="provenance-item"><FiCpu/><div><small>Kryvion Intelligence Engine</small><strong>Indicadores derivados</strong><span>Score, risco, regime, correlação, drawdown, EMA, RSI, MACD e sinais são cálculos da Kryvion.</span></div></div>
   <div className="provenance-item"><FiClock/><div><small>Último snapshot</small><strong>{ageLabel(updatedAt)}</strong><span>{live?'Dentro da janela normal de atualização.':stale?'Último snapshot válido preservado em cache.':'Sem snapshot de mercado válido no momento.'}</span></div></div>
  </div>
  <div className="provenance-note"><FiActivity/><span><b>Como interpretar:</b> dados brutos vêm dos provedores indicados. Scores, confiança, risco e classificações são modelos quantitativos próprios e não constituem garantia, previsão certa ou recomendação individual de investimento.</span></div>
 </section>;
}

function correctMarketCapLabel(root=document){
 root.querySelectorAll('.metric-card').forEach((card)=>{
  const label=card.querySelector('small')?.textContent?.trim();
  const detail=card.querySelector('em');
  if(label==='Mercado monitorado'&&detail)detail.textContent='capitalização somada dos ativos monitorados';
 });
}

export function mountMarketDataProvenance(){
 if(typeof document==='undefined')return;
 const mount=()=>{
  const content=document.querySelector('.content');
  if(!content)return false;
  correctMarketCapLabel(content);
  if(document.getElementById('kryvion-market-provenance-root'))return true;
  const host=document.createElement('div');
  host.id='kryvion-market-provenance-root';
  const head=content.querySelector('.page-head');
  if(head?.nextSibling)content.insertBefore(host,head.nextSibling);else content.appendChild(host);
  createRoot(host).render(<MarketDataProvenance/>);
  return true;
 };
 if(mount())return;
 const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
 observer.observe(document.body,{childList:true,subtree:true});
 window.setTimeout(()=>observer.disconnect(),10_000);
}

export default MarketDataProvenance;
