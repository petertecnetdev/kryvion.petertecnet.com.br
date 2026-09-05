import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FiActivity,FiAlertTriangle,FiChevronDown,FiChevronUp,FiRefreshCw,FiShield,FiTrendingDown,FiTrendingUp,FiZap} from 'react-icons/fi';
import {marketApi} from './services/api.js';
import {marketSignalsApi} from './services/marketSignals.js';
import './market-intelligence.css';
import './market-signals.css';

const POLL_MS=60_000;
const fmtBRL=(value)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:Number(value)<10?4:0}).format(Number(value||0));
const fmtUSD=(value)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',notation:Number(value)>=1_000_000?'compact':'standard',maximumFractionDigits:Number(value)<1?6:2}).format(Number(value||0));
const fmtPct=(value)=>`${Number(value||0)>=0?'+':''}${Number(value||0).toFixed(2)}%`;
const safeScore=(value)=>Math.max(0,Math.min(100,Number(value||0)));

function SignalCard({signal,tone}){
 if(!signal)return <article className={`kry-signal-card ${tone} empty`}><small>SINAL NÃO CONFIRMADO</small><h3>Aguardando confluência</h3><p>A Kryvion só dispara este alerta quando score, confiança, momentum e volume atingem o nível mínimo.</p></article>;
 const bullish=tone==='buy'||tone==='rise';
 const Icon=bullish?FiTrendingUp:FiTrendingDown;
 return <article className={`kry-signal-card ${tone}`}>
  <div className="kry-signal-top"><span><Icon/><small>{tone==='buy'?'COMPRA':tone==='sell'?'VENDA':tone==='rise'?'POSSÍVEL GRANDE ALTA':'POSSÍVEL GRANDE BAIXA'}</small></span><b>{Math.round(safeScore(signal.score))}/100</b></div>
  <h3>{signal.title}</h3>
  <div className="kry-signal-price">{signal.symbol} · {fmtUSD(signal.price_usd)} <span>{fmtPct(signal.change_24h)} 24h</span></div>
  <div className="kry-signal-meta"><span>Confiança <b>{Math.round(Number(signal.confidence||0))}%</b></span><span>Janela <b>{signal.estimated_window||'—'}</b></span></div>
  <p>{signal.message}</p>
  <ul>{(signal.reasons||[]).slice(0,2).map((reason)=><li key={reason}>{reason}</li>)}</ul>
  <div className="kry-signal-risk"><FiAlertTriangle/><span>{signal.risks?.[0]||'Sinal probabilístico; o mercado pode inverter rapidamente.'}</span></div>
 </article>;
}

function SignalBoard({signals}){
 if(!signals)return null;
 return <section className="kry-signals-board">
  <div className="kry-signals-head"><div><small><FiActivity/> SINAIS KRYVION</small><h2>Compra, venda e movimentos extremos</h2><p>O motor só marca “agora” quando há confluência forte. Os demais cartões funcionam como radar antecipado.</p></div><span>válido por {Number(signals.valid_for_minutes||20)} min</span></div>
  <div className="kry-signals-grid primary"><SignalCard signal={signals.buy} tone="buy"/><SignalCard signal={signals.sell} tone="sell"/></div>
  <div className="kry-signals-grid"><SignalCard signal={signals.possible_large_rise} tone="rise"/><SignalCard signal={signals.possible_large_fall} tone="fall"/></div>
  <p className="kry-signals-disclaimer"><FiShield/>{signals.disclaimer}</p>
 </section>;
}

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

function BreakoutRadar({scanner}){
 const opportunities=scanner?.opportunities||[];
 const winner=opportunities[0];
 if(!winner)return null;
 return <section className="kry-breakout-radar">
  <div className="kry-breakout-head">
   <div><small><FiZap/> RADAR DE POSSÍVEL ALTA</small><h2>{winner.symbol} aparece como maior sinal de aceleração agora</h2><p>Ranking estatístico entre {Number(scanner.total_eligible||0).toLocaleString('pt-BR')} ativos elegíveis de {Number(scanner.total_listed||0).toLocaleString('pt-BR')} listados analisados na CoinMarketCap.</p></div>
   <div className="kry-breakout-score"><strong>{Math.round(safeScore(winner.breakout_score))}</strong><span>/100</span><small>{winner.classification}</small></div>
  </div>
  <div className="kry-breakout-stats"><span><small>PREÇO</small><b>{fmtUSD(winner.price_usd)}</b></span><span><small>1H</small><b className={Number(winner.change_1h)>=0?'up':'down'}>{fmtPct(winner.change_1h)}</b></span><span><small>24H</small><b className={Number(winner.change_24h)>=0?'up':'down'}>{fmtPct(winner.change_24h)}</b></span><span><small>7D</small><b className={Number(winner.change_7d)>=0?'up':'down'}>{fmtPct(winner.change_7d)}</b></span><span><small>VOLUME 24H</small><b>{fmtUSD(winner.volume_24h_usd)}</b></span><span><small>CONFIANÇA</small><b>{winner.confidence}%</b></span></div>
  <div className="kry-breakout-grid"><div><h3>Por que entrou no radar</h3><ul>{(winner.reasons||[]).map((reason)=><li key={reason}>{reason}</li>)}</ul></div><div><h3>Riscos do sinal</h3><ul>{(winner.risks||[]).map((risk)=><li key={risk}>{risk}</li>)}</ul></div></div>
  <div className="kry-breakout-top"><small>TOP 5 AGORA</small>{opportunities.slice(0,5).map((asset,index)=><div key={`${asset.id}-${asset.symbol}`}><b>#{index+1} {asset.symbol}</b><span>{asset.name}</span><strong>{asset.breakout_score}/100</strong><em>{fmtPct(asset.change_24h)} 24h</em></div>)}</div>
  <p className="kry-breakout-disclaimer">{scanner.disclaimer}</p>
 </section>;
}

function FactorBars({asset}){
 const labels={momentum_7d:'Momentum 7d',momentum_24h:'Momentum 24h',liquidity:'Liquidez',market_quality:'Qualidade',resilience:'Resiliência',market_regime:'Regime',sentiment_balance:'Sentimento'};
 const factors=asset?.factors||{};
 return <div className="kry-intel-factors">{Object.entries(labels).map(([key,label])=>{const value=safeScore(factors[key]);return <div key={key} className="kry-intel-factor"><div><span>{label}</span><b>{Math.round(value)}</b></div><div><i style={{width:`${value}%`}}/></div></div>;})}</div>;
}

function MarketIntelligenceOverlay(){
 const [intelligence,setIntelligence]=useState(null);
 const [scanner,setScanner]=useState(null);
 const [signals,setSignals]=useState(null);
 const [fetchedAt,setFetchedAt]=useState(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [open,setOpen]=useState(false);
 const [details,setDetails]=useState(false);

 const load=useCallback(async({silent=false}={})=>{
  if(!silent)setLoading(true);
  try{
   const [overviewResponse,scannerResponse,signalsResponse]=await Promise.all([marketApi.overview(),marketApi.scanner({limit:25}),marketSignalsApi.current()]);
   const data=overviewResponse.data?.data||overviewResponse.data;
   const scannerData=scannerResponse.data?.data||scannerResponse.data;
   const signalsData=signalsResponse.data?.data||signalsResponse.data;
   if(!data?.market_intelligence)throw new Error('Inteligência multifator indisponível nesta versão da API.');
   if(!scannerData?.opportunities)throw new Error('Radar de aceleração indisponível nesta versão da API.');
   setIntelligence(data.market_intelligence);
   setScanner(scannerData);
   setSignals(signalsData||null);
   setFetchedAt(signalsData?.generated_at?new Date(signalsData.generated_at):(scannerData.scanned_at?new Date(scannerData.scanned_at):(data.fetched_at?new Date(data.fetched_at):new Date())));
   setError('');
  }catch(loadError){setError(loadError?.response?.data?.message||loadError?.message||'Não foi possível atualizar a inteligência de mercado.');}
  finally{if(!silent)setLoading(false);}
 },[]);

 useEffect(()=>{load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')load({silent:true});},POLL_MS);return()=>window.clearInterval(timer);},[load]);

 const sentiment=useMemo(()=>intelligence?.context?.sentiment||{},[intelligence]);
 const leader=intelligence?.relative_strength_leader;
 const weakest=intelligence?.relative_weakness;
 const breakout=scanner?.opportunities?.[0];
 const headline=signals?.buy?`${signals.buy.symbol}: sinal forte de compra`:signals?.sell?`${signals.sell.symbol}: sinal forte de venda`:breakout?`${breakout.symbol} no topo do radar de alta`:(leader?`${leader.symbol} lidera a força relativa`:'Analisando mercado');

 return <aside className={`kry-intel-dock ${open?'open':'closed'}`} aria-label="Kryvion Market Intelligence">
  <button className="kry-intel-toggle" onClick={()=>setOpen((value)=>!value)} aria-expanded={open}>
   <span className="kry-intel-live"><i/><FiActivity/></span><span><small>MARKET INTELLIGENCE</small><b>{headline}</b></span>{open?<FiChevronDown/>:<FiChevronUp/>}
  </button>
  {open&&<div className="kry-intel-body">
   <div className="kry-intel-title"><div><small>ANÁLISE MULTIFATOR · TEMPO REAL</small><h2>Sinais de mercado + radar de aceleração</h2><p>Combina momentum, aceleração, volume, liquidez e risco para separar observação de sinais realmente fortes.</p></div><button onClick={()=>load()} disabled={loading}><FiRefreshCw className={loading?'spin':''}/></button></div>
   {error&&<div className="kry-intel-error">{error}</div>}
   {signals&&<SignalBoard signals={signals}/>} 
   {scanner&&<BreakoutRadar scanner={scanner}/>} 
   {intelligence&&<>
    <div className="kry-intel-context"><span><small>REGIME</small><b>{intelligence.context?.regime?.label||'Monitorando'}</b></span><span><small>FEAR & GREED</small><b>{sentiment.value??'—'}/100 · {sentiment.classification||'sem leitura'}</b></span><span><small>ATUALIZAÇÃO</small><b>{fetchedAt&&!Number.isNaN(fetchedAt.getTime())?fetchedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'agora'}</b></span></div>
    <div className="kry-intel-grid"><AssetInsight asset={leader} kind="leader"/><AssetInsight asset={weakest} kind="weak"/></div>
    <button className="kry-intel-details" onClick={()=>setDetails((value)=>!value)}><span>Ver fatores de força relativa</span>{details?<FiChevronUp/>:<FiChevronDown/>}</button>
    {details&&<FactorBars asset={leader}/>} 
    <div className="kry-intel-footer"><span>Fontes: CoinMarketCap · CoinGecko · Alternative.me Fear & Greed Index</span><p>{intelligence.disclaimer}</p></div>
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
