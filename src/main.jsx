import React,{lazy,Suspense,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FiActivity,FiBarChart2,FiBell,FiBriefcase,FiCompass,FiDollarSign,FiLogOut,FiMenu,FiPieChart,FiPlus,FiRefreshCw,FiShield,FiTrash2,FiTrendingUp,FiX} from 'react-icons/fi';
import {marketApi} from './services/api.js';
import {fetchCurrentUser,getStoredUser,getToken,logout} from './services/auth.js';
import Brand,{KryvionMark} from './components/Brand.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import PeterAccountGateway from './components/PeterAccountGateway.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PublicSite from './components/PublicSite.jsx';
import GlobalSearch from './components/GlobalSearch.jsx';
const AdvancedMarketCharts=lazy(()=>import('./components/AdvancedMarketCharts.jsx'));
const CandlestickTerminal=lazy(()=>import('./components/CandlestickTerminal.jsx'));
const StressScenarioChart=lazy(()=>import('./components/StressScenarioChart.jsx'));
import './styles.css';
import './global-search.css';

const MARKET_CACHE_KEY='kryvion.market.overview.v1';
const MARKET_POLL_MS=60_000;
const DEFAULT_REGIME={label:'Aguardando mercado',code:'neutral',confidence:0};

function readMarketCache(){
 try{
  const cached=JSON.parse(localStorage.getItem(MARKET_CACHE_KEY)||'null');
  return cached?.assets?.length?cached:null;
 }catch{
  return null;
 }
}

function writeMarketCache(snapshot){
 try{
  localStorage.setItem(MARKET_CACHE_KEY,JSON.stringify(snapshot));
 }catch{
  // Cache é apenas uma camada de resiliência; falhas de storage não bloqueiam o mercado.
 }
}

const fmtBRL=(n)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:Number(n)<10?2:0}).format(Number(n||0));
const pct=(n)=>`${Number(n||0)>=0?'+':''}${Number(n||0).toFixed(2)}%`;
const nav=[['overview','Visão geral',FiBarChart2],['radar','Radar',FiCompass],['portfolio','Portfólio',FiBriefcase],['signals','Sinais',FiActivity],['simulator','Simulador',FiTrendingUp],['alerts','Alertas',FiBell],['risk','Risco',FiShield]];

function Spark({data,positive=true}){
 const values=(Array.isArray(data)&&data.length?data:[1,2,3,2,4]).map(Number).filter(Number.isFinite);
 const safe=values.length>1?values:[0,0];
 const min=Math.min(...safe);
 const max=Math.max(...safe);
 const spread=Math.max(1,max-min);
 const points=safe.map((value,index)=>`${(index/(safe.length-1))*100},${38-((value-min)/spread)*34}`).join(' ');
 return <div className="spark"><svg viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} stroke={positive?'#61f4cb':'#ff5f8f'}/></svg></div>;
}

function ScoreRing({score}){
 const safe=Math.max(0,Math.min(100,Number(score||0)));
 return <div className="score-ring" style={{'--score':`${safe*3.6}deg`}}><span>{Math.round(safe)}</span></div>;
}

function MarketOpportunityReport({symbol,onClose}){
 const [report,setReport]=useState(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  marketApi.opportunityReport(symbol).then((response)=>{
   if(active)setReport(response.data?.data||response.data);
  }).catch((requestError)=>{
   if(active)setError(requestError?.response?.data?.message||'Não foi possível carregar esta análise agora.');
  }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[symbol]);
 const usd=(value)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:Number(value)<1?6:2}).format(Number(value||0));
 return <div className="market-report-overlay" role="dialog" aria-modal="true" aria-label={`Análise de ${symbol}`}>
  <div className="market-report-card">
   <button className="market-report-close" onClick={onClose} aria-label="Fechar análise"><FiX/></button>
   {loading&&<div className="market-report-loading"><FiActivity className="spin"/><b>Atualizando análise de {symbol}…</b><span>Os dados são recalculados no momento da abertura.</span></div>}
   {error&&<div className="market-report-error"><FiShield/><b>Análise indisponível</b><span>{error}</span><button onClick={onClose}>Voltar ao painel</button></div>}
   {report&&<>
    <div className="market-report-brand"><span><KryvionMark/></span><div><small>KRYVION · RELATÓRIO AUTENTICADO</small><b>Análise completa de oportunidade</b></div></div>
    <div className="market-report-hero"><div><small>{report.classification}</small><h2>{report.symbol} · {report.name}</h2><p>{report.timing_note||'Sinal multifator recalculado com dados atuais de mercado.'}</p></div><div className="market-report-score"><strong>{report.score}</strong><span>/100</span><small>{report.confidence}% confiança</small></div></div>
    <div className="market-report-metrics"><span><small>PREÇO AGORA</small><b>{usd(report.price_usd)}</b></span><span><small>ENTRADA / CONFIRMAÇÃO</small><b>{report.entry_window}</b></span><span><small>JANELA DE SAÍDA</small><b>{report.exit_window}</b></span><span><small>ALVO PROBABILÍSTICO</small><b>{usd(report.target_price_min_usd)} – {usd(report.target_price_max_usd)}</b></span></div>
    <div className="market-report-chart"><div><small>1H</small><span><i style={{width:`${Math.min(100,Math.max(5,Math.abs(Number(report.change_1h))*2))}%`}}/></span><b>{pct(report.change_1h)}</b></div><div><small>24H</small><span><i style={{width:`${Math.min(100,Math.max(5,Math.abs(Number(report.change_24h))*2))}%`}}/></span><b>{pct(report.change_24h)}</b></div><div><small>7D</small><span><i style={{width:`${Math.min(100,Math.max(5,Math.abs(Number(report.change_7d))*1.2))}%`}}/></span><b>{pct(report.change_7d)}</b></div></div>
    <div className="market-report-grid"><section><small>POR QUE ENTRAR NO RADAR</small><h3>Confluências detectadas</h3><ul>{(report.reasons||[]).map((reason)=><li key={reason}>{reason}</li>)}</ul></section><section><small>QUANDO REALIZAR / SAIR</small><h3>Plano de monitoramento</h3><p>O alvo estatístico atual fica entre <b>{usd(report.target_price_min_usd)}</b> e <b>{usd(report.target_price_max_usd)}</b>, equivalente a aproximadamente +{Number(report.upside_min_pct).toFixed(1)}% a +{Number(report.upside_max_pct).toFixed(1)}% sobre o preço observado.</p><p>{report.exit_window}. Reavalie o sinal se momentum ou volume perderem confirmação antes da faixa-alvo.</p></section></div>
    <div className="market-report-risk"><FiShield/><div><b>Riscos e invalidação</b><p>{(report.risks||[]).join(' ')} {report.disclaimer}</p></div></div>
   </>}
  </div>
 </div>;
}

function App({user,onLogout}){
 const initialReport=useMemo(()=>new URLSearchParams(window.location.search).get('marketReport'),[]);
 const [marketReport,setMarketReport]=useState(initialReport);
 const [page,setPage]=useState('overview');
 const [mobile,setMobile]=useState(false);
 const cachedMarket=useMemo(()=>readMarketCache(),[]);
 const [assets,setAssets]=useState(()=>cachedMarket?.assets||[]);
 const [regime,setRegime]=useState(()=>cachedMarket?.regime||DEFAULT_REGIME);
 const [loading,setLoading]=useState(true);
 const [updated,setUpdated]=useState(()=>cachedMarket?.updatedAt?new Date(cachedMarket.updatedAt):null);
 const [marketState,setMarketState]=useState(()=>cachedMarket?.assets?.length?'stale':'connecting');
 const [marketError,setMarketError]=useState('');
 const [amount,setAmount]=useState(1000);
 const [risk,setRisk]=useState('moderado');
 const [analysis,setAnalysis]=useState(null);
 const [positions,setPositions]=useState([]);
 const [alerts,setAlerts]=useState([]);
 const [toast,setToast]=useState('');
 const [simMove,setSimMove]=useState(-15);

 const flash=(message)=>{
   setToast(message);
   window.setTimeout(()=>setToast(''),2600);
 };

 const load=async({background=false}={})=>{
   if(!background)setLoading(true);
   try{
     const response=await marketApi.overview();
     const data=response.data?.data||response.data;
     const nextAssets=Array.isArray(data?.assets)?data.assets:[];
     if(!nextAssets.length)throw new Error('A API não retornou ativos de mercado.');

     const nextRegime=data?.regime||DEFAULT_REGIME;
     const candidateUpdated=data?.fetched_at?new Date(data.fetched_at):new Date();
     const nextUpdated=Number.isNaN(candidateUpdated.getTime())?new Date():candidateUpdated;

     setAssets(nextAssets);
     setRegime(nextRegime);
     setUpdated(nextUpdated);
     setMarketState('live');
     setMarketError('');
     writeMarketCache({
       assets:nextAssets,
       regime:nextRegime,
       updatedAt:nextUpdated.toISOString(),
       provider:data?.provider||null,
       currency:data?.currency||'BRL',
     });
   }catch(error){
     const cached=readMarketCache();
     if(cached?.assets?.length){
       setAssets(cached.assets);
       setRegime(cached.regime||DEFAULT_REGIME);
       setUpdated(cached.updatedAt?new Date(cached.updatedAt):null);
       setMarketState('stale');
     }else{
       setAssets([]);
       setRegime(DEFAULT_REGIME);
       setUpdated(null);
       setMarketState('offline');
     }
     setMarketError(error?.response?.data?.message||error?.message||'Não foi possível atualizar os dados de mercado.');
   }finally{
     if(!background)setLoading(false);
   }
 };

 useEffect(()=>{
   load();
   Promise.allSettled([marketApi.portfolio(),marketApi.alerts()]).then(([portfolioResult,alertResult])=>{
     if(portfolioResult.status==='fulfilled')setPositions(portfolioResult.value.data?.data?.positions||portfolioResult.value.data?.positions||[]);
     if(alertResult.status==='fulfilled')setAlerts(alertResult.value.data?.data||alertResult.value.data?.alerts||[]);
   });

   const timer=window.setInterval(()=>{
     if(document.visibilityState==='visible')load({background:true});
   },MARKET_POLL_MS);
   const refreshWhenVisible=()=>{
     if(document.visibilityState==='visible')load({background:true});
   };
   document.addEventListener('visibilitychange',refreshWhenVisible);

   return()=>{
     window.clearInterval(timer);
     document.removeEventListener('visibilitychange',refreshWhenVisible);
   };
 },[]);

 const totalMarket=useMemo(()=>assets.reduce((sum,asset)=>sum+Number(asset.market_cap||0),0),[assets]);
 const sentiment=useMemo(()=>Math.round(assets.reduce((sum,asset)=>sum+Math.max(0,Math.min(100,Number(asset.score||50))),0)/Math.max(1,assets.length)),[assets]);
 const portfolioValue=positions.reduce((sum,position)=>sum+Number(position.current_value||position.quantity*position.current_price||0),0);
 const simValue=portfolioValue*(1+Number(simMove)/100);

 const analyze=async()=>{
   try{
     const response=await marketApi.analyze({amount:Number(amount),risk_profile:risk,horizon:'swing',asset_ids:assets.slice(0,8).map((asset)=>asset.id)});
     setAnalysis(response.data?.data||response.data);
     flash('Análise recalculada com dados atuais.');
   }catch(error){
     setAnalysis(null);
     flash(error?.response?.data?.message||'Análise indisponível no momento. Nenhuma alocação sintética foi gerada.');
   }
 };

 return <div className="app-shell">
  {marketReport&&<MarketOpportunityReport symbol={marketReport} onClose={()=>{setMarketReport(null);const url=new URL(window.location.href);url.searchParams.delete('marketReport');window.history.replaceState({},'',url);}}/>}
  <aside className={`sidebar ${mobile?'open':''}`}>
   <div className="side-top"><Brand/><button className="close-mobile" onClick={()=>setMobile(false)}><FiX/></button></div>
   <nav>{nav.map(([id,label,Icon])=><button key={id} onClick={()=>{setPage(id);setMobile(false)}} className={page===id?'active':''}><Icon/><span>{label}</span></button>)}</nav>
   <div className="side-bottom">
    <div className="risk-mini"><FiShield/><div><small>Risk Guardian</small><strong>Monitor de risco</strong></div><span className="pulse-dot"/></div>
    <a href="https://petertecnet.com.br" rel="noreferrer">Ecossistema Peter Tecnet</a>
   </div>
  </aside>

  <main>
   <header>
    <button className="menu-mobile" onClick={()=>setMobile(true)}><FiMenu/></button>
    <GlobalSearch assets={assets} positions={positions} navigation={nav} onNavigate={(target)=>{setPage(target);setMobile(false);}}/>
    <div className="header-actions">
     <div className={`market-status ${regime.code||''}`}><span/> {regime.label}</div>
     <button onClick={load} className="icon-btn"><FiRefreshCw className={loading?'spin':''}/></button>
     <NotificationCenter onNavigate={(target)=>{if(target==='/alerts'){setPage('alerts');return;}if(target.startsWith('/'))window.location.assign(target);}}/>
     <div className="account-chip">
      <div className="avatar">{`${user?.first_name?.[0]||'P'}${user?.last_name?.[0]||'T'}`.toUpperCase()}</div>
      <div className="account-copy"><b>{user?.first_name||user?.user_name||'Conta Peter'}</b><small>Kryvion</small></div>
      <button className="logout-btn" onClick={onLogout} title="Sair"><FiLogOut/></button>
     </div>
    </div>
   </header>

   <section className="content">
    <div className="page-head">
     <div><p className="eyebrow">KRYVION INTELLIGENCE ENGINE</p><h1>{nav.find((item)=>item[0]===page)?.[1]}</h1><p>Decisões orientadas por contexto, risco e evidências — nunca por um único indicador.</p></div>
     <div className={`timestamp ${marketState}`}>{marketState==='live'&&updated?`Dados reais · ${updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:marketState==='stale'&&updated?`Dados em cache · ${updated.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:marketState==='offline'?'Mercado indisponível':'Conectando ao mercado'}</div>
    </div>

    {(marketState==='stale'||marketState==='offline')&&<div className={`market-data-banner ${marketState}`}>
     <FiActivity/>
     <div><b>{marketState==='stale'?'Atualização temporariamente indisponível':'Dados de mercado indisponíveis'}</b><span>{marketError||'A Kryvion não exibirá dados sintéticos como se fossem atuais.'}</span></div>
     <button onClick={()=>load()}>Tentar novamente</button>
    </div>}

    {page==='overview'&&<>
     <div className="hero-grid">
      <div className="hero-card glow">
       <div><span className="label">Regime de mercado</span><h2>{regime.label}</h2><p>O motor combina momentum, amplitude, liquidez e volatilidade para classificar o ambiente.</p><div className="confidence"><span>Confiança do regime</span><b>{Math.round(Number(regime.confidence??0))}%</b><div><i style={{width:`${Math.max(0,Math.min(100,Number(regime.confidence??0)))}%`}}/></div></div></div>
       <div className="orb"><div>{Math.round(Number(regime.confidence??0))}<small>%</small></div></div>
      </div>
      <div className="metric-card"><span className="metric-icon"><FiDollarSign/></span><small>Mercado monitorado</small><strong>R$ {(totalMarket/1e12).toFixed(1)} tri</strong><em>liquidez agregada</em></div>
      <div className="metric-card"><span className="metric-icon"><FiActivity/></span><small>Opportunity Index</small><strong>{sentiment}/100</strong><em>{sentiment>70?'favorável':'seletivo'}</em></div>
     </div>

     <Suspense fallback={<div className="chart-suspense" aria-label="Carregando gráficos de mercado"/>}><CandlestickTerminal assets={assets}/></Suspense>
     <Suspense fallback={<div className="chart-suspense" aria-label="Carregando análise gráfica"/>}><AdvancedMarketCharts assets={assets} regime={regime}/></Suspense>

     <div className="section-grid">
      <div className="panel span-2">
       <div className="panel-head"><div><small>RADAR PRIORITÁRIO</small><h3>Oportunidades agora</h3></div><button onClick={()=>setPage('radar')}>Ver radar completo</button></div>
       <div className="asset-table">
        <div className="table-row table-head"><span>Ativo</span><span>Preço</span><span>24h</span><span>Tendência</span><span>Score</span><span>Leitura</span></div>
        {assets.slice(0,5).map((asset)=><div className="table-row" key={asset.id}>
         <span className="asset-name"><b>{asset.symbol}</b><small>{asset.name}</small></span>
         <span>{fmtBRL(asset.price)}</span>
         <span className={asset.change_24h>=0?'up':'down'}>{pct(asset.change_24h)}</span>
         <Spark data={asset.spark} positive={asset.change_24h>=0}/>
         <span><ScoreRing score={asset.score||50}/></span>
         <span className={`pill ${asset.score>=75?'buy':asset.score>=60?'watch':'wait'}`}>{asset.score>=75?'Entrada parcial':asset.score>=60?'Observar':'Aguardar'}</span>
        </div>)}
       </div>
      </div>

      <div className="panel decision">
       <div className="panel-head"><div><small>MODO OPORTUNIDADE</small><h3>Alocar capital</h3></div></div>
       <label>Capital disponível<input type="number" min="0" value={amount} onChange={(event)=>setAmount(event.target.value)}/></label>
       <label>Perfil de risco<select value={risk} onChange={(event)=>setRisk(event.target.value)}><option value="conservador">Conservador</option><option value="moderado">Moderado</option><option value="agressivo">Agressivo</option></select></label>
       <button className="primary" onClick={analyze}><FiCompass/> Analisar oportunidades</button>
       <div className="guardian-note"><FiShield/><span>O Risk Guardian limita exposição e preserva reserva de liquidez.</span></div>
      </div>
     </div>

     {analysis&&<div className="panel allocation">
      <div className="panel-head"><div><small>ALLOCATION PLAN</small><h3>Plano sugerido pelo motor</h3></div><span className="pill watch">explicável</span></div>
      <div className="allocation-grid">
       {(analysis.allocation||[]).map((item,index)=><div className="allocation-item" key={`${item.asset}-${index}`}><div><b>{item.asset}</b><small>{item.name}</small></div><strong>{fmtBRL(item.amount)}</strong><span>Score {item.score}</span><em>{item.action}</em></div>)}
       <div className="allocation-item reserve"><div><b>RESERVA</b><small>Liquidez protegida</small></div><strong>{fmtBRL(analysis.reserve||0)}</strong><span>Risk Guardian</span><em>Não alocar</em></div>
      </div>
      <p className="disclaimer">{analysis.disclaimer||'Ferramenta de apoio à decisão. Resultados não garantem retornos.'}</p>
     </div>}
    </>}

    {page==='radar'&&<Radar assets={assets}/>}
    {page==='signals'&&<Signals assets={assets}/>}
    {page==='portfolio'&&<Portfolio positions={positions} total={portfolioValue} assets={assets} setPositions={setPositions} flash={flash}/>}
    {page==='simulator'&&<Simulator total={portfolioValue} simMove={simMove} setSimMove={setSimMove} simValue={simValue}/>}
    {page==='alerts'&&<Alerts alerts={alerts} assets={assets} setAlerts={setAlerts} flash={flash}/>}
    {page==='risk'&&<Risk flash={flash}/>}
   </section>
  </main>

  <PeterAccountGateway/>
  {toast&&<div className="toast">{toast}</div>}
 </div>;
}

function Radar({assets}){
 return <div className="panel"><div className="panel-head"><div><small>MULTIFACTOR RANKING</small><h3>Opportunity × Risk</h3></div><span className="pill wait">tempo real</span></div><div className="radar-cards">{assets.map((asset)=><article className="radar-card" key={asset.id}><div className="radar-top"><div className="coin">{asset.symbol.slice(0,1)}</div><div><h3>{asset.name}</h3><small>{asset.symbol} · risco {asset.risk}</small></div><ScoreRing score={asset.score||50}/></div><Spark data={asset.spark} positive={asset.change_24h>=0}/><div className="factor-grid"><span>Momentum <b>{Math.min(100,50+Number(asset.change_7d||0)*4).toFixed(0)}</b></span><span>Liquidez <b>{Math.min(98,55+Math.log10(Math.max(1,asset.volume||1))*3).toFixed(0)}</b></span><span>Confiança <b>{asset.confidence||60}</b></span><span>24h <b className={asset.change_24h>=0?'up':'down'}>{pct(asset.change_24h)}</b></span></div><button>Ver explicação</button></article>)}</div></div>;
}

function Signals({assets}){
 return <div className="signals-grid">{assets.map((asset)=><div className="signal-card" key={asset.id}><div className={`signal-icon ${asset.score>=75?'positive':asset.score<60?'negative':'neutral'}`}><FiActivity/></div><div><small>Leitura do snapshot atual · {asset.symbol}</small><h3>{asset.score>=75?'Momentum e liquidez alinhados':asset.score>=60?'Confluência parcial':'Risco supera oportunidade'}</h3><p>{asset.score>=75?'Tendência de 7 dias, volume e estrutura favorecem entrada fracionada.':'O motor recomenda confirmação adicional antes de aumentar exposição.'}</p><div className="signal-meta"><span>Score {asset.score}</span><span>Confiança {asset.confidence||60}%</span><span>{asset.risk}</span></div></div></div>)}</div>;
}

function Portfolio({positions,total,assets,setPositions,flash}){
 const [editing,setEditing]=useState(false);
 const [assetId,setAssetId]=useState(assets[0]?.id||'');
 const [quantity,setQuantity]=useState('');
 const [averagePrice,setAveragePrice]=useState('');
 const [saving,setSaving]=useState(false);
 const pnl=positions.reduce((sum,position)=>sum+Number(position.pnl_amount||0),0);
 const concentration=total>0?Math.max(0,...positions.map((position)=>Number(position.current_value||0)))/total*100:0;

 useEffect(()=>{
  if(!assetId&&assets[0]?.id)setAssetId(assets[0].id);
 },[assetId,assets]);

 const refresh=async()=>{
  const response=await marketApi.portfolio();
  const data=response.data?.data||response.data;
  setPositions(data?.positions||[]);
 };

 const submit=async(event)=>{
  event.preventDefault();
  if(!assetId||Number(quantity)<=0||Number(averagePrice)<=0){flash('Informe ativo, quantidade e preço médio válidos.');return;}
  setSaving(true);
  try{
   await marketApi.addPosition({asset_id:assetId,quantity:Number(quantity),average_price:Number(averagePrice)});
   await refresh();
   setQuantity('');setAveragePrice('');setEditing(false);
   flash('Posição adicionada e precificada com o mercado atual.');
  }catch(error){
   flash(error?.response?.data?.message||'Não foi possível adicionar a posição.');
  }finally{setSaving(false);}
 };

 const remove=async(id)=>{
  try{
   await marketApi.removePosition(id);
   setPositions((current)=>current.filter((position)=>position.id!==id));
   flash('Posição removida.');
  }catch(error){flash(error?.response?.data?.message||'Não foi possível remover a posição.');}
 };

 return <>
  <div className="hero-grid">
   <div className="metric-card"><span className="metric-icon"><FiBriefcase/></span><small>Valor atual</small><strong>{fmtBRL(total)}</strong><em>{positions.length} posições</em></div>
   <div className="metric-card"><span className="metric-icon"><FiPieChart/></span><small>Maior exposição</small><strong>{positions.length?`${concentration.toFixed(1)}%`:'—'}</strong><em>concentração atual</em></div>
   <div className="metric-card"><span className="metric-icon"><FiTrendingUp/></span><small>P/L atual</small><strong className={pnl>=0?'up':'down'}>{positions.length?fmtBRL(pnl):'—'}</strong><em>marcação pelo preço atual</em></div>
  </div>
  <div className="panel">
   <div className="panel-head"><div><small>PORTFÓLIO</small><h3>Posições e exposição</h3></div><button onClick={()=>setEditing((value)=>!value)}><FiPlus/> {editing?'Fechar':'Adicionar posição'}</button></div>
   {editing&&<form className="market-tool-form" onSubmit={submit}>
    <label>Ativo<select value={assetId} onChange={(event)=>setAssetId(event.target.value)}>{assets.map((asset)=><option key={asset.id} value={asset.id}>{asset.symbol} · {asset.name}</option>)}</select></label>
    <label>Quantidade<input type="number" min="0" step="any" value={quantity} onChange={(event)=>setQuantity(event.target.value)} placeholder="0,00"/></label>
    <label>Preço médio (BRL)<input type="number" min="0" step="any" value={averagePrice} onChange={(event)=>setAveragePrice(event.target.value)} placeholder="0,00"/></label>
    <button className="primary compact" disabled={saving}>{saving?'Salvando…':'Salvar posição'}</button>
   </form>}
   {positions.length?<div className="asset-table"><div className="table-row portfolio-head"><span>Ativo</span><span>Quantidade</span><span>Preço médio</span><span>Valor atual</span><span>P/L</span><span>Ações</span></div>{positions.map((position,index)=><div className="table-row" key={position.id||index}><span className="asset-name"><b>{position.symbol}</b><small>{position.name||position.asset_id}</small></span><span>{Number(position.quantity).toLocaleString('pt-BR',{maximumFractionDigits:8})}</span><span>{fmtBRL(position.average_price)}</span><span>{fmtBRL(position.current_value||0)}</span><span className={(position.pnl_percent||0)>=0?'up':'down'}>{pct(position.pnl_percent||0)}</span><span><button className="danger-icon" onClick={()=>remove(position.id)} title="Remover posição"><FiTrash2/></button></span></div>)}</div>:<div className="empty"><FiBriefcase/><h3>Nenhuma posição registrada</h3><p>Adicione suas posições para medir P/L, concentração e exposição com preços atuais.</p></div>}
  </div>
 </>;
}

function Simulator({total,simMove,setSimMove,simValue}){
 return <div className="section-grid"><div className="panel span-2"><div className="panel-head"><div><small>STRESS TEST</small><h3>Impacto na carteira</h3></div></div><Suspense fallback={<div className="chart-suspense" aria-label="Carregando simulação"/>}><StressScenarioChart total={total}/></Suspense></div><div className="panel simulator-control"><small>CENÁRIO</small><h3>Choque de mercado</h3><input type="range" min="-50" max="50" step="1" value={simMove} onChange={(event)=>setSimMove(event.target.value)}/><strong className={simMove>=0?'up':'down'}>{simMove>0?'+':''}{simMove}%</strong><div className="projection"><span>Carteira hoje<b>{fmtBRL(total)}</b></span><span>Após cenário<b>{fmtBRL(simValue)}</b></span><span>Impacto<b className={simMove>=0?'up':'down'}>{fmtBRL(simValue-total)}</b></span></div><p>Simulação simplificada e não probabilística. O motor de cenários pode receber correlações por ativo via API.</p></div></div>;
}

function Alerts({alerts,assets,setAlerts,flash}){
 const [editing,setEditing]=useState(false);
 const [assetId,setAssetId]=useState(assets[0]?.id||'');
 const [metric,setMetric]=useState('price');
 const [operator,setOperator]=useState('>');
 const [threshold,setThreshold]=useState('');
 const [saving,setSaving]=useState(false);

 useEffect(()=>{
  if(!assetId&&assets[0]?.id)setAssetId(assets[0].id);
 },[assetId,assets]);

 const submit=async(event)=>{
  event.preventDefault();
  if(!assetId||threshold===''){flash('Defina o ativo e o valor do gatilho.');return;}
  setSaving(true);
  try{
   const response=await marketApi.addAlert({asset_id:assetId,metric,operator,threshold:Number(threshold),active:true});
   const alert=response.data?.data||response.data;
   setAlerts((current)=>[alert,...current.filter((item)=>item.id!==alert.id)]);
   setThreshold('');setEditing(false);
   flash('Alerta de mercado criado.');
  }catch(error){flash(error?.response?.data?.message||'Não foi possível criar o alerta.');}
  finally{setSaving(false);}
 };

 const remove=async(id)=>{
  try{
   await marketApi.removeAlert(id);
   setAlerts((current)=>current.filter((alert)=>alert.id!==id));
   flash('Alerta removido.');
  }catch(error){flash(error?.response?.data?.message||'Não foi possível remover o alerta.');}
 };

 return <div className="panel">
  <div className="panel-head"><div><small>SMART ALERTS</small><h3>Condições de mercado</h3></div><button onClick={()=>setEditing((value)=>!value)}><FiPlus/> {editing?'Fechar':'Novo alerta'}</button></div>
  {editing&&<form className="market-tool-form alert-form" onSubmit={submit}>
   <label>Ativo<select value={assetId} onChange={(event)=>setAssetId(event.target.value)}>{assets.map((asset)=><option key={asset.id} value={asset.id}>{asset.symbol}</option>)}</select></label>
   <label>Métrica<select value={metric} onChange={(event)=>setMetric(event.target.value)}><option value="price">Preço</option><option value="change_24h">Variação 24h</option><option value="change_7d">Variação 7d</option><option value="score">Opportunity Score</option><option value="confidence">Confiança</option></select></label>
   <label>Condição<select value={operator} onChange={(event)=>setOperator(event.target.value)}><option value=">">maior que</option><option value=">=">maior ou igual</option><option value="<">menor que</option><option value="<=">menor ou igual</option></select></label>
   <label>Valor<input type="number" step="any" value={threshold} onChange={(event)=>setThreshold(event.target.value)} placeholder="Gatilho"/></label>
   <button className="primary compact" disabled={saving}>{saving?'Criando…':'Criar alerta'}</button>
  </form>}
  {alerts.length?<div className="alerts-list">{alerts.map((alert)=><div className={`alert-row ${alert.triggered?'triggered':''}`} key={alert.id}><div className="coin">{String(alert.asset||alert.asset_symbol||'A').slice(0,1)}</div><div><b>{alert.asset||alert.asset_symbol}</b><small>{alert.condition||alert.rule}</small></div><span className={alert.triggered?'status-triggered':alert.active!==false?'status-on':'status-off'}>{alert.triggered?'Disparado':alert.active!==false?'Ativo':'Pausado'}</span><button className="danger-icon" onClick={()=>remove(alert.id)} title="Remover alerta"><FiTrash2/></button></div>)}</div>:<div className="empty"><FiBell/><h3>Nenhum alerta configurado</h3><p>Crie condições por preço, variação, score ou confiança e acompanhe quando forem atingidas.</p></div>}
 </div>;
}

function Risk({flash}){
 const [level,setLevel]=useState('moderado');
 const [maxAsset,setMaxAsset]=useState(25);
 const [maxLoss,setMaxLoss]=useState(8);
 const [minReserve,setMinReserve]=useState(15);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);

 useEffect(()=>{
  let active=true;
  marketApi.risk().then((response)=>{
   const data=response.data?.data||response.data;
   if(!active||!data)return;
   setLevel(data.risk_profile||'moderado');
   setMaxAsset(Number(data.max_asset_exposure??25));
   setMaxLoss(Number(data.max_scenario_loss??8));
   setMinReserve(Number(data.min_liquidity_reserve??15));
  }).catch((error)=>{
   if(active)flash(error?.response?.data?.message||'Não foi possível carregar sua política de risco.');
  }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);

 const save=async()=>{
  setSaving(true);
  try{
   const response=await marketApi.saveRisk({risk_profile:level,max_asset_exposure:Number(maxAsset),max_scenario_loss:Number(maxLoss),min_liquidity_reserve:Number(minReserve)});
   const data=response.data?.data||response.data;
   if(data){setLevel(data.risk_profile||level);setMaxAsset(Number(data.max_asset_exposure??maxAsset));setMaxLoss(Number(data.max_scenario_loss??maxLoss));setMinReserve(Number(data.min_liquidity_reserve??minReserve));}
   flash('Política de risco salva na sua conta.');
  }catch(error){
   flash(error?.response?.data?.message||'Não foi possível salvar a política de risco.');
  }finally{setSaving(false);}
 };

 return <div className="section-grid"><div className="panel span-2"><div className="panel-head"><div><small>RISK GUARDIAN</small><h3>Política pessoal de risco</h3></div><span className={`pill ${loading?'wait':'buy'}`}>{loading?'carregando':'sincronizado'}</span></div><div className="risk-form"><label>Perfil<select value={level} onChange={(event)=>setLevel(event.target.value)} disabled={loading}><option value="conservador">conservador</option><option value="moderado">moderado</option><option value="agressivo">agressivo</option></select></label><label>Exposição máxima por ativo <b>{maxAsset}%</b><input type="range" min="5" max="100" value={maxAsset} onChange={(event)=>setMaxAsset(event.target.value)} disabled={loading}/></label><label>Perda máxima tolerada no cenário <b>{maxLoss}%</b><input type="range" min="1" max="90" value={maxLoss} onChange={(event)=>setMaxLoss(event.target.value)} disabled={loading}/></label><label>Reserva mínima de liquidez <b>{minReserve}%</b><input type="range" min="0" max="95" value={minReserve} onChange={(event)=>setMinReserve(event.target.value)} disabled={loading}/></label><button className="primary" onClick={save} disabled={saving||loading}><FiShield/> {saving?'Salvando…':'Salvar política'}</button></div></div><div className="panel"><small>REGRAS DE PROTEÇÃO</small><h3>Guardrails aplicados</h3><ul className="guard-list"><li><FiShield/> Preservar a reserva mínima configurada</li><li><FiShield/> Limitar exposição por ativo</li><li><FiShield/> Exibir cenários de perda antes de decisões</li><li><FiShield/> Exigir evidências e confiança nos sinais</li><li><FiShield/> Não executar ordens automaticamente</li></ul></div></div>;
}

function AuthRoot(){
 const [checking,setChecking]=useState(Boolean(getToken()));
 const [user,setUser]=useState(getStoredUser());
 const [authenticated,setAuthenticated]=useState(Boolean(getToken()));

 useEffect(()=>{
   let active=true;

   async function validate(){
     if(!getToken()){
       setChecking(false);
       setAuthenticated(false);
       return;
     }

     try{
       const current=await fetchCurrentUser();
       if(active){
         setUser(current||getStoredUser());
         setAuthenticated(true);
       }
     }catch{
       if(active){
         setUser(null);
         setAuthenticated(false);
       }
     }finally{
       if(active)setChecking(false);
     }
   }

   validate();
   const sync=()=>{
     const has=Boolean(getToken());
     setAuthenticated(has);
     if(!has)setUser(null);
   };
   window.addEventListener('authChanged',sync);
   return()=>{
     active=false;
     window.removeEventListener('authChanged',sync);
   };
 },[]);

 const signedIn=(nextUser)=>{
   setUser(nextUser||getStoredUser());
   setAuthenticated(true);
   setChecking(false);
 };

 const signOut=async()=>{
   await logout();
   setUser(null);
   setAuthenticated(false);
 };

 const publicPath=window.location.pathname;
 if(publicPath==='/blog'||publicPath.startsWith('/blog/'))return <PublicSite/>;
 if(checking)return <div className="auth-splash"><div className="auth-splash-mark"><KryvionMark/></div><strong>KRYVION</strong><span>Sincronizando sua Conta Peter Tecnet…</span></div>;
 const requiresReportAuth=Boolean(new URLSearchParams(window.location.search).get('marketReport'));
 if(!authenticated)return (publicPath==='/entrar'||requiresReportAuth)?<LoginScreen onAuthenticated={signedIn}/>:<PublicSite/>;
 return <App user={user} onLogout={signOut}/>;
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><AuthRoot/></ErrorBoundary>);