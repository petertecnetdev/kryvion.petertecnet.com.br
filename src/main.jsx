import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LineChart,Line,ResponsiveContainer,AreaChart,Area,Tooltip,XAxis,YAxis,CartesianGrid} from 'recharts';
import {FiActivity,FiBarChart2,FiBell,FiBriefcase,FiCompass,FiDollarSign,FiLogOut,FiMenu,FiPieChart,FiPlus,FiRefreshCw,FiSearch,FiShield,FiTrendingUp,FiX} from 'react-icons/fi';
import {marketApi} from './services/api.js';
import {fetchCurrentUser,getStoredUser,getToken,logout} from './services/auth.js';
import Brand,{KryvionMark} from './components/Brand.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import PeterAccountGateway from './components/PeterAccountGateway.jsx';
import AdvancedMarketCharts from './components/AdvancedMarketCharts.jsx';
import CandlestickTerminal from './components/CandlestickTerminal.jsx';
import './styles.css';

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
 const values=Array.isArray(data)&&data.length?data:[1,2,3,2,4];
 return <div className="spark"><ResponsiveContainer width="100%" height={42}><LineChart data={values.map((v,i)=>({i,v}))}><Line dataKey="v" type="monotone" stroke={positive?'#61f4cb':'#ff5f8f'} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>;
}

function ScoreRing({score}){
 const safe=Math.max(0,Math.min(100,Number(score||0)));
 return <div className="score-ring" style={{'--score':`${safe*3.6}deg`}}><span>{Math.round(safe)}</span></div>;
}

function App({user,onLogout}){
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
    <div className="search"><FiSearch/><input placeholder="Buscar ativo, sinal ou posição..."/></div>
    <div className="header-actions">
     <div className={`market-status ${regime.code||''}`}><span/> {regime.label}</div>
     <button onClick={load} className="icon-btn"><FiRefreshCw className={loading?'spin':''}/></button>
     <button className="icon-btn"><FiBell/></button>
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

     <CandlestickTerminal assets={assets}/>
     <AdvancedMarketCharts assets={assets} regime={regime}/>

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
    {page==='portfolio'&&<Portfolio positions={positions} total={portfolioValue} flash={flash}/>} 
    {page==='simulator'&&<Simulator total={portfolioValue} simMove={simMove} setSimMove={setSimMove} simValue={simValue}/>} 
    {page==='alerts'&&<Alerts alerts={alerts} flash={flash}/>} 
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

function Portfolio({positions,total,flash}){
 return <><div className="hero-grid"><div className="metric-card"><span className="metric-icon"><FiBriefcase/></span><small>Valor atual</small><strong>{fmtBRL(total)}</strong><em>{positions.length} posições</em></div><div className="metric-card"><span className="metric-icon"><FiPieChart/></span><small>Concentração</small><strong>{positions.length?Math.round(100/positions.length):0}%</strong><em>maior posição estimada</em></div><div className="metric-card"><span className="metric-icon"><FiShield/></span><small>Saúde da carteira</small><strong>{positions.length?'74/100':'—'}</strong><em>diversificação e risco</em></div></div><div className="panel"><div className="panel-head"><div><small>PORTFÓLIO</small><h3>Posições e exposição</h3></div><button onClick={()=>flash('Cadastro de posição usa o endpoint genérico /market/positions.')}><FiPlus/> Adicionar posição</button></div>{positions.length?<div className="asset-table">{positions.map((position,index)=><div className="table-row" key={position.id||index}><span className="asset-name"><b>{position.symbol}</b><small>{position.name||position.asset_id}</small></span><span>{position.quantity} un.</span><span>{fmtBRL(position.average_price)}</span><span>{fmtBRL(position.current_value||0)}</span><span className={(position.pnl_percent||0)>=0?'up':'down'}>{pct(position.pnl_percent||0)}</span><span className="pill watch">Monitorando</span></div>)}</div>:<div className="empty"><FiBriefcase/><h3>Nenhuma posição registrada</h3><p>Adicione suas posições para medir P/L, concentração, correlação e risco agregado.</p></div>}</div></>;
}

function Simulator({total,simMove,setSimMove,simValue}){
 const chart=Array.from({length:9},(_,index)=>{const move=-40+index*10;return {move:`${move}%`,value:Math.max(0,total*(1+move/100))};});
 return <div className="section-grid"><div className="panel span-2"><div className="panel-head"><div><small>STRESS TEST</small><h3>Impacto na carteira</h3></div></div><div className="chart-big"><ResponsiveContainer width="100%" height={320}><AreaChart data={chart}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b3dff" stopOpacity={.5}/><stop offset="100%" stopColor="#8b3dff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="move" stroke="#727a95"/><YAxis stroke="#727a95" tickFormatter={(value)=>`R$${Math.round(value/1000)}k`}/><Tooltip formatter={(value)=>fmtBRL(value)}/><Area dataKey="value" stroke="#aa63ff" fill="url(#fill)"/></AreaChart></ResponsiveContainer></div></div><div className="panel simulator-control"><small>CENÁRIO</small><h3>Choque de mercado</h3><input type="range" min="-50" max="50" step="1" value={simMove} onChange={(event)=>setSimMove(event.target.value)}/><strong className={simMove>=0?'up':'down'}>{simMove>0?'+':''}{simMove}%</strong><div className="projection"><span>Carteira hoje<b>{fmtBRL(total)}</b></span><span>Após cenário<b>{fmtBRL(simValue)}</b></span><span>Impacto<b className={simMove>=0?'up':'down'}>{fmtBRL(simValue-total)}</b></span></div><p>Simulação simplificada e não probabilística. O motor de cenários pode receber correlações por ativo via API.</p></div></div>;
}

function Alerts({alerts,flash}){
 const add=()=>flash('Criação de alertas ainda não está disponível na API. Nenhum alerta fictício foi criado.');
 return <div className="panel"><div className="panel-head"><div><small>SMART ALERTS</small><h3>Condições de mercado</h3></div><button onClick={add}><FiPlus/> Novo alerta</button></div>{alerts.length?<div className="alerts-list">{alerts.map((alert)=><div className="alert-row" key={alert.id}><div className="coin">{String(alert.asset||alert.asset_symbol||'A').slice(0,1)}</div><div><b>{alert.asset||alert.asset_symbol}</b><small>{alert.condition||alert.rule}</small></div><span className={alert.active!==false?'status-on':'status-off'}>{alert.active!==false?'Ativo':'Pausado'}</span><FiBell/></div>)}</div>:<div className="empty"><FiBell/><h3>Nenhum alerta sincronizado</h3><p>A Kryvion não exibirá alertas de demonstração como se fossem alertas reais da sua conta.</p></div>}</div>;
}

function Risk({flash}){
 const [level,setLevel]=useState('moderado');
 const [maxAsset,setMaxAsset]=useState(25);
 const [maxLoss,setMaxLoss]=useState(8);
 const [saving,setSaving]=useState(false);
 const save=async()=>{
  setSaving(true);
  try{
   await marketApi.saveRisk({risk_profile:level,max_asset_exposure:Number(maxAsset),max_scenario_loss:Number(maxLoss)});
   flash('Política de risco salva na sua conta.');
  }catch(error){
   flash(error?.response?.status===404?'Política de risco ainda não está disponível na API. Nada foi salvo.':error?.response?.data?.message||'Não foi possível salvar a política de risco.');
  }finally{
   setSaving(false);
  }
 };
 return <div className="section-grid"><div className="panel span-2"><div className="panel-head"><div><small>RISK GUARDIAN</small><h3>Política pessoal de risco</h3></div><span className="pill wait">configuração</span></div><div className="risk-form"><label>Perfil<select value={level} onChange={(event)=>setLevel(event.target.value)}><option value="conservador">conservador</option><option value="moderado">moderado</option><option value="agressivo">agressivo</option></select></label><label>Exposição máxima por ativo <b>{maxAsset}%</b><input type="range" min="5" max="60" value={maxAsset} onChange={(event)=>setMaxAsset(event.target.value)}/></label><label>Perda máxima tolerada no cenário <b>{maxLoss}%</b><input type="range" min="2" max="30" value={maxLoss} onChange={(event)=>setMaxLoss(event.target.value)}/></label><button className="primary" onClick={save} disabled={saving}><FiShield/> {saving?'Salvando…':'Salvar política'}</button></div></div><div className="panel"><small>REGRAS DE PROTEÇÃO</small><h3>Guardrails propostos</h3><ul className="guard-list"><li><FiShield/> Reservar liquidez mínima</li><li><FiShield/> Reduzir alocação em volatilidade extrema</li><li><FiShield/> Bloquear concentração acima do limite</li><li><FiShield/> Exigir confiança mínima para sinais</li><li><FiShield/> Não executar ordens automaticamente</li></ul></div></div>;
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

 if(checking)return <div className="auth-splash"><div className="auth-splash-mark"><KryvionMark/></div><strong>KRYVION</strong><span>Sincronizando sua Conta Peter Tecnet…</span></div>;
 if(!authenticated)return <LoginScreen onAuthenticated={signedIn}/>;
 return <App user={user} onLogout={signOut}/>;
}

createRoot(document.getElementById('root')).render(<AuthRoot/>);