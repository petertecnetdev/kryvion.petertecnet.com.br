import React,{useEffect,useMemo,useRef,useState} from 'react';
import {FiActivity,FiBarChart2,FiRefreshCw} from 'react-icons/fi';
import {marketApi} from '../services/api.js';
import '../candlestick-terminal.css';

const TIMEFRAMES=[['15m',180],['1h',240],['4h',240],['1d',180]];
const fmt=(value,digits=2)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:digits}).format(Number(value||0));
const compact=(value)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:2}).format(Number(value||0));

function ema(values,period){
 if(!values.length)return [];
 const k=2/(period+1);
 let previous=Number(values[0]);
 return values.map((raw,index)=>{
  const value=Number(raw);
  previous=index===0?value:(value*k)+(previous*(1-k));
  return previous;
 });
}

function useSize(ref){
 const [size,setSize]=useState({width:900,height:460});
 useEffect(()=>{
  const node=ref.current;
  if(!node)return undefined;
  const update=()=>setSize({width:Math.max(320,node.clientWidth),height:Math.max(380,node.clientHeight||460)});
  update();
  const observer=new ResizeObserver(update);
  observer.observe(node);
  return()=>observer.disconnect();
 },[ref]);
 return size;
}

export default function CandlestickTerminal({assets=[]}){
 const candidates=useMemo(()=>assets.filter((asset)=>asset?.symbol).slice(0,8),[assets]);
 const [assetId,setAssetId]=useState(null);
 const [interval,setInterval]=useState('1h');
 const [candles,setCandles]=useState([]);
 const [meta,setMeta]=useState(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [hover,setHover]=useState(null);
 const frameRef=useRef(null);
 const size=useSize(frameRef);
 const selected=candidates.find((asset)=>asset.id===assetId)||candidates[0];

 const load=async()=>{
  if(!selected?.symbol)return;
  setLoading(true);
  setError('');
  try{
   const limit=TIMEFRAMES.find(([key])=>key===interval)?.[1]||240;
   const response=await marketApi.ohlcv(selected.symbol,{interval,limit,quote:'USDT'});
   const payload=response.data?.data||response.data;
   const rows=Array.isArray(payload?.candles)?payload.candles:[];
   if(!rows.length)throw new Error('Sem candles para este período.');
   setCandles(rows);
   setMeta(payload);
  }catch(err){
   setCandles([]);
   setMeta(null);
   setError(err?.response?.data?.message||err?.message||'Não foi possível carregar o histórico OHLCV.');
  }finally{
   setLoading(false);
  }
 };

 useEffect(()=>{load();},[selected?.symbol,interval]);

 const geometry=useMemo(()=>{
  if(!candles.length)return null;
  const width=size.width;
  const height=460;
  const margin={top:24,right:72,bottom:34,left:12};
  const volumeHeight=92;
  const gap=18;
  const plotHeight=height-margin.top-margin.bottom-volumeHeight-gap;
  const plotWidth=width-margin.left-margin.right;
  const highs=candles.map((c)=>Number(c.high));
  const lows=candles.map((c)=>Number(c.low));
  let max=Math.max(...highs);
  let min=Math.min(...lows);
  const padding=(max-min||max*.01||1)*.08;
  max+=padding;min-=padding;
  const maxVolume=Math.max(1,...candles.map((c)=>Number(c.volume||0)));
  const slot=plotWidth/Math.max(1,candles.length);
  const body=Math.max(1,Math.min(9,slot*.66));
  const x=(index)=>margin.left+(index+.5)*slot;
  const y=(value)=>margin.top+((max-Number(value))/(max-min))*plotHeight;
  const vy=(volume)=>margin.top+plotHeight+gap+volumeHeight-(Number(volume)/maxVolume)*volumeHeight;
  const closes=candles.map((c)=>Number(c.close));
  const ema9=ema(closes,9);
  const ema21=ema(closes,21);
  const points=(series)=>series.map((value,index)=>`${x(index)},${y(value)}`).join(' ');
  return {width,height,margin,volumeHeight,gap,plotHeight,plotWidth,max,min,maxVolume,slot,body,x,y,vy,ema9,ema21,points};
 },[candles,size.width]);

 const hovered=hover!==null?candles[hover]:candles.at(-1);
 const current=hovered||{};
 const delta=Number(current.close||0)-Number(current.open||0);
 const deltaPct=Number(current.open)?delta/Number(current.open)*100:0;
 const last=Number(candles.at(-1)?.close||0);
 const previous=Number(candles.at(-2)?.close||last);
 const lastChange=previous?(last-previous)/previous*100:0;

 const pointerMove=(event)=>{
  if(!geometry||!candles.length)return;
  const rect=event.currentTarget.getBoundingClientRect();
  const localX=event.clientX-rect.left;
  const scaleX=geometry.width/rect.width;
  const graphX=localX*scaleX;
  const index=Math.max(0,Math.min(candles.length-1,Math.floor((graphX-geometry.margin.left)/geometry.slot)));
  setHover(index);
 };

 return <article className="kry-candle-terminal">
  <div className="kry-candle-head">
   <div className="kry-candle-title"><small>PRO CHART · REAL OHLCV</small><h3><FiBarChart2/>{selected?.symbol||'—'} / USDT</h3><p>Candles reais do mercado spot, volume e médias exponenciais.</p></div>
   <div className="kry-candle-controls">
    <select value={selected?.id||''} onChange={(event)=>setAssetId(event.target.value)}>{candidates.map((asset)=><option key={asset.id} value={asset.id}>{asset.symbol} · {asset.name}</option>)}</select>
    <div className="kry-candle-timeframes">{TIMEFRAMES.map(([key])=><button key={key} className={interval===key?'active':''} onClick={()=>setInterval(key)}>{key}</button>)}</div>
    <button className="kry-candle-refresh" onClick={load} disabled={loading} title="Atualizar"><FiRefreshCw className={loading?'spin':''}/></button>
   </div>
  </div>

  <div className="kry-candle-stats">
   <span>Último<strong>{last?fmt(last,last<10?4:2):'—'} USDT</strong></span>
   <span>Variação candle<strong className={deltaPct>=0?'up':'down'}>{deltaPct>=0?'+':''}{fmt(deltaPct)}%</strong></span>
   <span>Última variação<strong className={lastChange>=0?'up':'down'}>{lastChange>=0?'+':''}{fmt(lastChange)}%</strong></span>
   <span>Volume<strong>{compact(current.volume)} {selected?.symbol}</strong></span>
   <span>Trades<strong>{compact(current.trades)}</strong></span>
   <span>Fonte<strong>{meta?.provider==='binance_spot'?'Binance Spot':'—'}</strong></span>
  </div>

  {error?<div className="kry-candle-error"><FiActivity/><div><b>Histórico OHLCV indisponível</b><span>{error}</span><small>Os demais gráficos continuam operando; nenhum candle sintético é exibido.</small></div><button onClick={load}>Tentar novamente</button></div>:
  <div className={`kry-candle-frame ${loading?'loading':''}`} ref={frameRef}>
   {geometry&&<svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" onMouseMove={pointerMove} onMouseLeave={()=>setHover(null)}>
    <defs>
     <linearGradient id="candleVolumeGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8e61ff" stopOpacity=".58"/><stop offset="100%" stopColor="#8e61ff" stopOpacity=".08"/></linearGradient>
    </defs>
    {Array.from({length:6},(_,index)=>{
     const y=geometry.margin.top+(geometry.plotHeight/5)*index;
     const value=geometry.max-((geometry.max-geometry.min)/5)*index;
     return <g key={`grid-${index}`}><line x1={geometry.margin.left} x2={geometry.width-geometry.margin.right} y1={y} y2={y} className="grid-line"/><text x={geometry.width-geometry.margin.right+8} y={y+3} className="axis-text">{fmt(value,value<10?4:2)}</text></g>;
    })}
    <line x1={geometry.margin.left} x2={geometry.width-geometry.margin.right} y1={geometry.margin.top+geometry.plotHeight+geometry.gap-8} y2={geometry.margin.top+geometry.plotHeight+geometry.gap-8} className="divider-line"/>
    {candles.map((candle,index)=>{
     const up=Number(candle.close)>=Number(candle.open);
     const x=geometry.x(index);
     const yOpen=geometry.y(candle.open);
     const yClose=geometry.y(candle.close);
     const top=Math.min(yOpen,yClose);
     const height=Math.max(1,Math.abs(yClose-yOpen));
     const volumeY=geometry.vy(candle.volume);
     return <g key={`${candle.time}-${index}`} className={up?'candle-up':'candle-down'}>
      <line x1={x} x2={x} y1={geometry.y(candle.high)} y2={geometry.y(candle.low)} className="wick"/>
      <rect x={x-geometry.body/2} y={top} width={geometry.body} height={height} rx=".7" className="body"/>
      <rect x={x-geometry.body/2} y={volumeY} width={geometry.body} height={geometry.margin.top+geometry.plotHeight+geometry.gap+geometry.volumeHeight-volumeY} rx="1" className="volume"/>
     </g>;
    })}
    <polyline points={geometry.points(geometry.ema21)} className="ema ema21"/>
    <polyline points={geometry.points(geometry.ema9)} className="ema ema9"/>
    {hover!==null&&<g className="crosshair"><line x1={geometry.x(hover)} x2={geometry.x(hover)} y1={geometry.margin.top} y2={geometry.height-geometry.margin.bottom}/><line x1={geometry.margin.left} x2={geometry.width-geometry.margin.right} y1={geometry.y(current.close)} y2={geometry.y(current.close)}/><circle cx={geometry.x(hover)} cy={geometry.y(current.close)} r="3"/><text x={geometry.width-geometry.margin.right+8} y={geometry.y(current.close)+3} className="price-tag">{fmt(current.close,Number(current.close)<10?4:2)}</text></g>}
   </svg>}
   {loading&&<div className="kry-candle-loading"><FiRefreshCw className="spin"/>Atualizando mercado</div>}
   {hover!==null&&current.time&&<div className="kry-candle-tooltip">
    <small>{new Date(Number(current.time)).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</small>
    <div><span>O</span><b>{fmt(current.open,Number(current.open)<10?4:2)}</b><span>H</span><b>{fmt(current.high,Number(current.high)<10?4:2)}</b></div>
    <div><span>L</span><b>{fmt(current.low,Number(current.low)<10?4:2)}</b><span>C</span><b className={delta>=0?'up':'down'}>{fmt(current.close,Number(current.close)<10?4:2)}</b></div>
    <div><span>Vol</span><b>{compact(current.volume)}</b><span>Trades</span><b>{compact(current.trades)}</b></div>
   </div>}
   <div className="kry-candle-legend"><span><i className="ema9"/>EMA 9</span><span><i className="ema21"/>EMA 21</span><span><i className="volume"/>Volume</span></div>
  </div>}
  <div className="kry-candle-foot"><span>Par: {meta?.pair||`${selected?.symbol||'—'}USDT`}</span><span>Intervalo: {interval}</span><span>{meta?.fetched_at?`Fonte atualizada ${new Date(meta.fetched_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Aguardando dados'}</span><em>Dados de mercado informativos; não constituem recomendação financeira.</em></div>
 </article>;
}
