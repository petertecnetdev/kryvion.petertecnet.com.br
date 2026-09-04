import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import axios from 'axios';
import {FiActivity,FiChevronDown,FiChevronUp,FiRefreshCw,FiShield,FiTrendingUp} from 'react-icons/fi';
import {API_BASE_URL,APP_SLUG} from './services/api.js';
import {getToken} from './services/auth.js';
import './cmc-scanner.css';

const POLL_MS=300000;
const pct=(n)=>`${Number(n||0)>=0?'+':''}${Number(n||0).toFixed(2)}%`;
const rangePct=(a)=>`${Number(a.estimated_upside_min_pct||0).toFixed(1)}%–${Number(a.estimated_upside_max_pct||0).toFixed(1)}%`;

function CoinMarketCapScanner(){
 const [data,setData]=useState(null);
 const [open,setOpen]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const response=await axios.get(`${API_BASE_URL}/v1/apps/${APP_SLUG}/market/scanner`,{params:{limit:50},timeout:30000,headers:{Accept:'application/json','X-Peter-App':APP_SLUG}});
   setData(response.data?.data||response.data);setError('');
  }catch(e){setError(e?.response?.data?.message||e?.message||'Radar indisponível.');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{if(!getToken())return;load();const t=window.setInterval(()=>{if(document.visibilityState==='visible')load();},POLL_MS);return()=>window.clearInterval(t);},[load]);
 const rows=useMemo(()=>data?.opportunities||[],[data]);
 const leader=rows[0];
 if(!getToken())return null;
 return <aside className={`cmc-scanner ${open?'open':''}`}>
  <button className="cmc-launcher" onClick={()=>setOpen(v=>!v)}><span><FiTrendingUp/></span><div><small>RADAR DE POSSÍVEL ALTA</small><b>{leader?`${leader.symbol} · ${leader.estimated_window} · score ${leader.breakout_score}`:'Analisando mercado'}</b></div>{open?<FiChevronDown/>:<FiChevronUp/>}</button>
  {open&&<div className="cmc-body">
   <div className="cmc-head"><div><small>PREVISÃO PROBABILÍSTICA</small><h2>Qual cripto pode acelerar — e quando</h2><p>O ranking combina aceleração de preço, momentum, expansão de volume, liquidez, profundidade e penalidade de sobreaquecimento. A janela indica quando o sinal atual tende a exigir confirmação, não uma promessa de alta.</p></div><button onClick={load} disabled={loading}><FiRefreshCw className={loading?'spin':''}/></button></div>
   {data&&<div className="cmc-stats"><span><small>LISTADAS</small><b>{Number(data.total_listed||0).toLocaleString('pt-BR')}</b></span><span><small>RECEBIDAS</small><b>{Number(data.total_received||0).toLocaleString('pt-BR')}</b></span><span><small>ELEGÍVEIS</small><b>{Number(data.total_eligible||0).toLocaleString('pt-BR')}</b></span></div>}
   {error&&<div className="cmc-error">{error}</div>}
   {!data&&!error&&<div className="cmc-loading"><FiActivity className="spin"/> Processando mercado…</div>}
   <div className="cmc-list">{rows.slice(0,20).map((a,i)=><article key={a.id} title={a.timing_note||''}><span className="cmc-pos">#{i+1}</span><span className="cmc-asset"><b>{a.symbol}</b><small>{a.name} · confiança {a.confidence}%</small></span><span><small>Janela</small><b>{a.estimated_window||'—'}</b></span><span><small>Alta estimada</small><b className="up">{rangePct(a)}</b></span><span><small>24h</small><b className={a.change_24h>=0?'up':'down'}>{pct(a.change_24h)}</b></span><span><small>Volume</small><b className={a.volume_change_24h>=0?'up':'down'}>{pct(a.volume_change_24h)}</b></span><strong>{a.breakout_score}</strong></article>)}</div>
   {data&&<div className="cmc-footer"><FiShield/><p>{data.disclaimer}</p></div>}
  </div>}
 </aside>;
}

export function mountCoinMarketCapScanner(){
 if(typeof document==='undefined')return;
 let host=document.getElementById('kryvion-cmc-scanner-root');
 if(!host){host=document.createElement('div');host.id='kryvion-cmc-scanner-root';document.body.appendChild(host);}
 createRoot(host).render(<CoinMarketCapScanner/>);
}
