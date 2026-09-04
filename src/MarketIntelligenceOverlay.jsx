import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FiActivity,FiChevronDown,FiChevronUp,FiRefreshCw,FiShield,FiTrendingDown,FiTrendingUp} from 'react-icons/fi';
import {marketApi} from './services/api.js';
import './market-intelligence.css';

const POLL_MS=60_000;
const fmtBRL=(value)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:Number(value)<10?2:0}).format(Number(value||0));
const fmtPct=(value)=>`${Number(value||0)>=0?'+':''}${Number(value||0).toFixed(2)}%`;
const safeScore=(value)=>Math.max(0,Math.min(100,Number(value||0)));

function AssetInsight({asset,kind}){
 if(!asset)return null;
 const leader=kind==='leader';
 const Icon=leader?FiTrendingUp:FiTrendingDown;
 return <article className={`kry-intel-asset ${leader?'leader':'weak'}`}>
  <div className="kry-intel-asset-top"><div className="kry-intel-symbol"><Icon/><b>{asset.symbol}</b></div><div className="kry-intel-score"><strong>{Math.round(safeScore(asset.score))}</strong><small>/100</small></div></div>
  <small className="kry-intel-kicker">{leader?'Maior força relativa':'Menor força relativa'}</small>
  <h3>{asset.name}</h3>
  <div className="kry-intel-price">{fmtBRL(asset.price)} <span className={Number(asset.change_24h)>=0?'up':'down'}>{fmtPct(asset.change_24h)} 24h</span></div>
  <div className="kry-intel-meta"><span>7d <b>{fmtPct(asset.change_7d)}</b></span><span>Giro <b>{Number(asset.turnover_24h||0).toFixed(2)}%</b></span><span>Conf. <b>{Math.round(Number(asset.confidence||0))}%</b></span></div>
  <div className="kry-intel-label">{asset.label}</div>
  <ul>{(asset.reasons||[]).slice(0,2).map((reason)=><li key={reason}>{reason}</li>)}</ul>
  <div className="kry-intel-risk"><FiShield/><span>{asset.risks?.[0]||'A leitura é comparativa e não elimina risco.'}</span></div>
 </article>;
}

function FactorBars({asset}){
 const labels={momentum_7d:'Momentum 7d',momentum_24h:'Momentum 24h',liquidity:'Liquidez',market_quality:'Qualidade',resilience:'Resiliência',market_regime:'Regime',sentiment_balance:'Sentimento'};
 const factors=asset?.factors||{};
 return <div className="kry-intel-factors">{Object.entries(labels).map(([key,label])=>{const value=safeScore(factors[key]);return <div key={key} className="kry-intel-factor"><div><span>{label}</span><b>{Math.round(value)}</b></div><div><i style={{width:`${value}%`}}/></div></div>;})}</div>;
}

function MarketIntelligenceOverlay(){
 const [intelligence,setIntelligence]=useState(null);
 const [fetchedAt,setFetchedAt]=useState(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [open,setOpen]=useState(()=>typeof window!=='undefined'&&window.innerWidth>=1180);
 const [details,setDetails]=useState(false);

 const load=useCallback(async({silent=false}={})=>{
  if(!silent)setLoading(true);
  try{
   const response=await marketApi.overview();
   const data=response.data?.data||response.data;
   if(!data?.market_intelligence)throw new Error('Inteligência multifator indisponível nesta versão da API.');
   setIntelligence(data.market_intelligence);
   setFetchedAt(data.fetched_at?new Date(data.fetched_at):new Date());
   setError('');
  }catch(loadError){setError(loadError?.response?.data?.message||loadError?.message||'Não foi possível atualizar a inteligência de mercado.');}
  finally{if(!silent)setLoading(false);}
 },[]);

 useEffect(()=>{load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')load({silent:true});},POLL_MS);return()=>window.clearInterval(timer);},[load]);

 const sentiment=useMemo(()=>intelligence?.context?.sentiment||{},[intelligence]);
 const leader=intelligence?.relative_strength_leader;
 const weakest=intelligence?.relative_weakness;

 return <aside className={`kry-intel-dock ${open?'open':'closed'}`} aria-label="Kryvion Market Intelligence">
  <button className="kry-intel-toggle" onClick={()=>setOpen((value)=>!value)} aria-expanded={open}>
   <span className="kry-intel-live"><i/><FiActivity/></span><span><small>MARKET INTELLIGENCE</small><b>{leader?`${leader.symbol} lidera a força relativa`:'Analisando mercado'}</b></span>{open?<FiChevronDown/>:<FiChevronUp/>}
  </button>
  {open&&<div className="kry-intel-body">
   <div className="kry-intel-title"><div><small>ANÁLISE MULTIFATOR · TEMPO REAL</small><h2>Força, fragilidade e contexto</h2><p>Comparação explicável entre os ativos monitorados, sem transformar score em garantia de resultado.</p></div><button onClick={()=>load()} disabled={loading}><FiRefreshCw className={loading?'spin':''}/></button></div>
   {error&&<div className="kry-intel-error">{error}</div>}
   {intelligence&&<>
    <div className="kry-intel-context"><span><small>REGIME</small><b>{intelligence.context?.regime?.label||'Monitorando'}</b></span><span><small>FEAR & GREED</small><b>{sentiment.value??'—'}/100 · {sentiment.classification||'sem leitura'}</b></span><span><small>ATUALIZAÇÃO</small><b>{fetchedAt&&!Number.isNaN(fetchedAt.getTime())?fetchedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'agora'}</b></span></div>
    <div className="kry-intel-grid"><AssetInsight asset={leader} kind="leader"/><AssetInsight asset={weakest} kind="weak"/></div>
    <button className="kry-intel-details" onClick={()=>setDetails((value)=>!value)}><span>Ver fatores do líder</span>{details?<FiChevronUp/>:<FiChevronDown/>}</button>
    {details&&<FactorBars asset={leader}/>} 
    <div className="kry-intel-footer"><span>Fontes: CoinGecko · Alternative.me Fear & Greed Index</span><p>{intelligence.disclaimer}</p></div>
   </>}
  </div>}
 </aside>;
}

export function mountMarketIntelligence(){
 if(typeof document==='undefined')return;
 let host=document.getElementById('kryvion-market-intelligence-root');
 if(!host){host=document.createElement('div');host.id='kryvion-market-intelligence-root';document.body.appendChild(host);}
 createRoot(host).render(<MarketIntelligenceOverlay/>);
}
