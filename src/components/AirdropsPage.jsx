import React,{useEffect,useMemo,useState} from 'react';
import {FiActivity,FiBell,FiBookOpen,FiCalendar,FiCheck,FiCompass,FiDollarSign,FiExternalLink,FiFilter,FiRefreshCw,FiSearch,FiShield,FiStar,FiTrendingUp,FiBriefcase} from 'react-icons/fi';
import api,{APP_SLUG} from '../services/api.js';
import {trackTelemetry} from '../services/telemetry.js';
import '../airdrops-native.css';

const base=`/v1/apps/${APP_SLUG}/market/airdrops`;
const unwrap=(response)=>response?.data?.data??response?.data;
const money=(value)=>`${Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} USDT`;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value||0)));
const CACHE_KEY='kryvion.airdrops.snapshot.v2';
const ROUTES_KEY='kryvion.airdrops.saved.v2';
const WALLET_KEY='kryvion.airdrops.wallet.v1';

function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{/* storage não bloqueia a experiência */}}
function scoreLabel(score,risk){if(score>=80&&risk<=45)return 'Priorizar';if(score>=65)return 'Monitorar';return 'Baixa prioridade'}

export default function AirdropsPage(){
 const cached=useMemo(()=>readJson(CACHE_KEY,[]),[]);
 const [campaigns,setCampaigns]=useState(Array.isArray(cached)?cached:[]);
 const [loading,setLoading]=useState(!campaigns.length);
 const [error,setError]=useState('');
 const [updatedAt,setUpdatedAt]=useState(null);
 const [capital,setCapital]=useState(280);
 const [riskProfile,setRiskProfile]=useState('moderado');
 const [plan,setPlan]=useState(null);
 const [tab,setTab]=useState('opportunities');
 const [selected,setSelected]=useState(null);
 const [saved,setSaved]=useState(()=>readJson(ROUTES_KEY,[]));
 const [wallet,setWallet]=useState(()=>localStorage.getItem(WALLET_KEY)||'');
 const [query,setQuery]=useState('');
 const [network,setNetwork]=useState('all');
 const [maxRisk,setMaxRisk]=useState(100);
 const [maxCost,setMaxCost]=useState(9999);
 const [status,setStatus]=useState('all');
 const [message,setMessage]=useState('');

 const load=async({silent=false}={})=>{
  const started=performance.now();
  if(!silent)setLoading(true);setError('');
  try{
   const data=unwrap(await api.get(`${base}/intelligence`,{params:{capital_usdt:Number(capital),risk_profile:riskProfile}}));
   const list=Array.isArray(data?.campaigns)?data.campaigns:(Array.isArray(data)?data:[]);
   setCampaigns(list);writeJson(CACHE_KEY,list);if(data?.plan)setPlan(data.plan);setUpdatedAt(new Date());
   trackTelemetry('view',{object_type:'airdrop_dashboard',result:'success',duration_ms:Math.round(performance.now()-started),campaigns:list.length});
  }catch(requestError){
   setError(requestError?.response?.data?.message||'Não foi possível atualizar as oportunidades agora.');
   trackTelemetry('view',{object_type:'airdrop_dashboard',result:'error',duration_ms:Math.round(performance.now()-started),status:requestError?.response?.status||0});
  }finally{if(!silent)setLoading(false)}
 };
 useEffect(()=>{load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load({silent:true})},120000);return()=>clearInterval(timer)},[]);

 const enriched=useMemo(()=>campaigns.map((item)=>{
  const opportunity=clamp(item.opportunity_score,0,100);
  const risk=clamp(item.risk_score,0,100);
  const fees=Number(item.estimated_fees_usdt||0);
  const capitalFit=Number(capital)>=Number(item.capital_min_usdt||0);
  const efficiency=clamp(opportunity-(risk*.45)-(fees*.65),0,100);
  const confidence=clamp(item.confidence_score??(100-Math.round(risk*.35)),0,100);
  return {...item,opportunity,risk,fees,capitalFit,efficiency,confidence,decision:scoreLabel(opportunity,risk)};
 }),[campaigns,capital]);

 const filtered=useMemo(()=>enriched.filter((item)=>{
  const hay=`${item.project} ${item.network} ${(item.tags||[]).join(' ')}`.toLowerCase();
  return (!query||hay.includes(query.toLowerCase()))&&(network==='all'||item.network===network)&&(item.risk<=Number(maxRisk))&&(item.fees<=Number(maxCost))&&(status==='all'||item.status===status);
 }).sort((a,b)=>b.efficiency-a.efficiency),[enriched,query,network,maxRisk,maxCost,status]);

 const compatible=enriched.filter((item)=>item.capitalFit);
 const best=filtered[0]||null;
 const demos=enriched.filter((item)=>item.status==='demo').length;
 const live=enriched.filter((item)=>item.status!=='demo').length;
 const networks=[...new Set(enriched.map((item)=>item.network).filter(Boolean))];
 const totalFees=compatible.reduce((sum,item)=>sum+item.fees,0);
 const pendingTasks=enriched.reduce((sum,item)=>sum+Math.max(0,Number(item.task_count||0)-Number(item.completed_tasks||0)),0);

 const buildPlan=async()=>{
  setMessage('');
  try{setPlan(unwrap(await api.post(`${base}/plan`,{capital_usdt:Number(capital),risk_profile:riskProfile})))}catch(e){setMessage(e?.response?.data?.message||'Não foi possível montar o plano.')}
 };
 const openCampaign=async(item)=>{
  setMessage('');
  try{
   const detail=unwrap(await api.get(`${base}/${encodeURIComponent(item.slug)}`));
   setSelected(detail);
   const url=new URL(window.location.href);url.searchParams.set('airdrop',item.slug);window.history.replaceState({},'',url);
   trackTelemetry('view',{object_type:'airdrop_campaign',object_id:item.slug,result:'success'});
  }catch(e){setMessage(e?.response?.data?.message||'Não foi possível abrir esta rota.')}
 };
 const closeDetail=()=>{setSelected(null);const url=new URL(window.location.href);url.searchParams.delete('airdrop');window.history.replaceState({},'',url)};
 const toggleSave=async(slug)=>{const shouldSave=!saved.includes(slug);const next=shouldSave?[...saved,slug]:saved.filter((id)=>id!==slug);setSaved(next);writeJson(ROUTES_KEY,next);try{await api.put(`${base}/watchlist/${encodeURIComponent(slug)}`,{saved:shouldSave})}catch{/* cache local mantém UX resiliente */}};
 const saveWallet=async()=>{const address=wallet.trim();localStorage.setItem(WALLET_KEY,address);if(!address){setMessage('Carteira removida.');return;}try{const result=unwrap(await api.post(`${base}/wallet/eligibility`,{address}));setMessage(result?.message||'Carteira salva em modo somente leitura.')}catch(e){setMessage(e?.response?.data?.message||'Carteira salva localmente; a checagem on-chain está indisponível.')}};
 const completeTask=async(task)=>{
  if(!selected)return;
  try{const next=unwrap(await api.post(`${base}/${encodeURIComponent(selected.slug)}/tasks/${encodeURIComponent(task.id)}/complete`,{confirmed_by_user:true}));setSelected(next);await load({silent:true});setMessage('Tarefa registrada.')}
  catch(e){setMessage(e?.response?.data?.message||'Não foi possível registrar a tarefa.')}
 };

 const dashboard=<>
  <section className="air-native-hero">
   <div><small>KRYVION AIRDROP INTELLIGENCE</small><h1>Airdrops que merecem sua atenção</h1><p>A Kryvion prioriza oportunidade, risco, custo, capital e progresso. Campanhas sem fonte validada continuam claramente identificadas como demonstração.</p><div className="air-native-actions"><button className="air-primary" onClick={buildPlan}><FiCompass/> Gerar minha rota</button><button className="air-secondary" onClick={()=>load()}><FiRefreshCw className={loading?'spin':''}/> Atualizar</button></div></div>
   <div className="air-capital-card"><small>SEU CAPITAL</small><strong>{money(capital)}</strong><input aria-label="Capital em USDT" type="range" min="25" max="5000" step="25" value={capital} onChange={(e)=>setCapital(e.target.value)}/><div><span>{compatible.length} rotas compatíveis</span><span>{money(totalFees)} em taxas estimadas</span></div></div>
  </section>

  <section className="air-kpis">
   <article><FiTrendingUp/><small>Melhor oportunidade</small><strong>{best?`${best.opportunity}/100`:'—'}</strong><span>{best?.project||'Aguardando dados'}</span></article>
   <article><FiShield/><small>Dados verificados</small><strong>{live}</strong><span>{demos} demonstração(ões)</span></article>
   <article><FiActivity/><small>Ações pendentes</small><strong>{pendingTasks}</strong><span>entre suas rotas monitoradas</span></article>
   <article><FiBell/><small>Atualização</small><strong>{updatedAt?updatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'cache'}</strong><span>refresh automático a cada 2 min</span></article>
  </section>
 </>;

 return <div className="air-native-page">
  {dashboard}
  {message&&<div className="air-notice"><FiShield/><span>{message}</span></div>}
  {error&&<div className="air-error"><b>Dados em modo resiliente</b><span>{error}</span><button onClick={()=>load()}>Tentar novamente</button></div>}

  <nav className="air-tabs" aria-label="Airdrops"><button className={tab==='opportunities'?'active':''} onClick={()=>setTab('opportunities')}><FiCompass/>Oportunidades</button><button className={tab==='routes'?'active':''} onClick={()=>setTab('routes')}><FiStar/>Minhas rotas</button><button className={tab==='portfolio'?'active':''} onClick={()=>setTab('portfolio')}><FiBriefcase/>Carteira</button><button className={tab==='calendar'?'active':''} onClick={()=>setTab('calendar')}><FiCalendar/>Calendário</button><button className={tab==='learn'?'active':''} onClick={()=>setTab('learn')}><FiBookOpen/>Aprenda</button></nav>

  {tab==='opportunities'&&<>
   <section className="air-toolbar"><label><FiSearch/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar projeto, rede ou categoria"/></label><div className="air-filter-row"><FiFilter/><select value={network} onChange={(e)=>setNetwork(e.target.value)}><option value="all">Todas as redes</option>{networks.map((value)=><option key={value}>{value}</option>)}</select><select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">Todos os status</option><option value="demo">Demonstração</option><option value="active">Ativos</option><option value="watch">Monitorados</option></select><label>Risco ≤ <input type="number" min="0" max="100" value={maxRisk} onChange={(e)=>setMaxRisk(e.target.value)}/></label><label>Custo ≤ <input type="number" min="0" step="1" value={maxCost} onChange={(e)=>setMaxCost(e.target.value)}/></label></div></section>
   <section className="air-layout"><div className="air-list"><div className="air-section-title"><div><small>RANKING PERSONALIZADO</small><h2>Onde olhar primeiro</h2></div><span>{filtered.length} resultado(s)</span></div>{loading&&!campaigns.length?<div className="air-skeleton"/>:filtered.map((item,index)=><article className="air-opportunity" key={item.slug}><div className="air-rank">#{index+1}</div><div className="air-project"><div className="air-project-head"><div><small>{item.network} · {item.status==='demo'?'DEMO':String(item.status||'monitorado').toUpperCase()}</small><h3>{item.project}</h3></div><button className={saved.includes(item.slug)?'saved':''} onClick={()=>toggleSave(item.slug)} aria-label="Salvar rota"><FiStar/></button></div><div className="air-tags"><span className={item.decision==='Priorizar'?'good':item.decision==='Monitorar'?'watch':'muted'}>{item.decision}</span><span>{item.capitalFit?'Cabe no seu capital':'Capital insuficiente'}</span><span>{money(item.fees)} taxas</span></div></div><div className="air-score"><small>Potencial</small><b>{item.opportunity}</b><span>/100</span></div><div className="air-score"><small>Risco</small><b>{item.risk}</b><span>/100</span></div><div className="air-score"><small>Confiança</small><b>{item.confidence}</b><span>/100</span></div><div className="air-progress"><small>{item.completed_tasks||0}/{item.task_count||0} tarefas</small><i><em style={{width:`${clamp(item.progress_pct,0,100)}%`}}/></i><button onClick={()=>openCampaign(item)}>Ver análise <FiExternalLink/></button></div></article>)}{!loading&&!filtered.length&&<div className="air-empty"><FiCompass/><h3>Nenhuma oportunidade combina com estes filtros</h3><p>Reduza as restrições ou aguarde novas campanhas verificadas.</p></div>}</div>
   <aside className="air-planner"><small>AI ROUTE BUILDER</small><h2>Monte uma estratégia</h2><label>Capital<input type="number" min="1" value={capital} onChange={(e)=>setCapital(e.target.value)}/></label><label>Perfil<select value={riskProfile} onChange={(e)=>setRiskProfile(e.target.value)}><option value="conservador">Conservador</option><option value="moderado">Moderado</option><option value="agressivo">Agressivo</option></select></label><button className="air-primary" onClick={buildPlan}><FiDollarSign/>Calcular</button>{plan&&<div className="air-plan"><span><small>Reserva</small><b>{money(plan.reserve_usdt)}</b></span><span><small>Utilizável</small><b>{money(plan.deployable_usdt)}</b></span><span><small>Taxas</small><b>{money(plan.fee_budget_usdt)}</b></span><span><small>Máx. tarefa</small><b>{money(plan.max_single_task_usdt)}</b></span></div>}<div className="air-why"><FiShield/><p>O ranking muda com seu capital e preserva uma reserva antes de considerar custos operacionais.</p></div></aside></section>
  </>}

  {tab==='routes'&&<section className="air-panel"><div className="air-section-title"><div><small>MINHAS ROTAS</small><h2>O que você decidiu acompanhar</h2></div></div>{enriched.filter((item)=>saved.includes(item.slug)).map((item)=><button className="air-route-row" key={item.slug} onClick={()=>openCampaign(item)}><div><b>{item.project}</b><span>{item.network}</span></div><strong>{item.progress_pct||0}%</strong><span>{Math.max(0,Number(item.task_count||0)-Number(item.completed_tasks||0))} pendente(s)</span></button>)}{!saved.length&&<div className="air-empty"><FiStar/><h3>Você ainda não salvou nenhuma rota</h3><p>Use a estrela no ranking para acompanhar apenas as oportunidades que fazem sentido para você.</p></div>}</section>}

  {tab==='portfolio'&&<section className="air-layout"><div className="air-panel"><div className="air-section-title"><div><small>CARTEIRA SOMENTE LEITURA</small><h2>Elegibilidade e histórico</h2></div></div><p>Informe um endereço público. A Kryvion não solicita seed phrase, chave privada ou permissão de saque.</p><div className="air-wallet-form"><input value={wallet} onChange={(e)=>setWallet(e.target.value)} placeholder="0x... ou endereço público"/><button className="air-primary" onClick={saveWallet}><FiBriefcase/>Salvar carteira</button></div><div className="air-eligibility"><article><small>Rotas compatíveis</small><strong>{compatible.length}</strong></article><article><small>Rotas salvas</small><strong>{saved.length}</strong></article><article><small>Checagem on-chain</small><strong>{wallet?'Preparada':'Aguardando carteira'}</strong></article></div></div><aside className="air-panel"><small>SEGURANÇA</small><h3>Conexão de baixo privilégio</h3><p>O primeiro estágio usa somente endereço público para leitura. Qualquer ação transacional exige confirmação explícita do usuário.</p></aside></section>}

  {tab==='calendar'&&<section className="air-panel"><div className="air-section-title"><div><small>CALENDÁRIO & CLAIM MONITOR</small><h2>Datas que podem exigir ação</h2></div></div>{enriched.map((item)=><div className="air-calendar-row" key={item.slug}><FiCalendar/><div><b>{item.project}</b><span>TGE: {item.tge_status||'não confirmado'} · snapshot: {item.snapshot_at||'não informado'} · deadline: {item.deadline_at||'não informado'}</span></div><button onClick={()=>openCampaign(item)}>Abrir</button></div>)}</section>}

  {tab==='learn'&&<section className="air-learn"><article><FiShield/><h3>Como a Kryvion pontua</h3><p>Potencial, risco, custo, capital, confiança e progresso são exibidos separadamente para evitar que um único número esconda trade-offs importantes.</p></article><article><FiDollarSign/><h3>Gas antes de recompensa</h3><p>Uma rota pode ter bom potencial e ainda não valer a pena se as taxas consumirem parte grande do capital disponível.</p></article><article><FiCheck/><h3>Sem atividade artificial</h3><p>Wash trading, fake volume, self-trade e churn de alavancagem permanecem bloqueados. A Kryvion só apoia tarefas legítimas e confirmadas.</p></article></section>}

  {selected&&<div className="air-detail-backdrop" onClick={closeDetail}><section className="air-detail" onClick={(e)=>e.stopPropagation()}><button className="air-detail-close" onClick={closeDetail}>×</button><small>{selected.network} · {selected.status}</small><h2>{selected.project}</h2><p>{selected.source_label}</p><div className="air-detail-grid"><span><small>Potencial</small><b>{selected.opportunity_score}/100</b></span><span><small>Risco</small><b>{selected.risk_score}/100</b></span><span><small>Taxas</small><b>{money(selected.estimated_fees_usdt)}</b></span><span><small>Progresso</small><b>{selected.progress_pct||0}%</b></span></div>{selected.source_url&&<a href={selected.source_url} target="_blank" rel="noreferrer">Fonte oficial <FiExternalLink/></a>}<h3>Próximo passo</h3><p>{(selected.tasks||[]).find((task)=>!task.completed&&!task.requires_market_manipulation)?.label||'Nenhuma tarefa legítima pendente.'}</p><div className="air-task-list">{(selected.tasks||[]).map((task)=><div className={`air-task ${task.completed?'done':''} ${task.requires_market_manipulation?'blocked':''}`} key={task.id}><span>{task.completed?<FiCheck/>:<FiCompass/>}</span><div><b>{task.label}</b><small>{task.requires_market_manipulation?'Bloqueada pelo Risk Guardian':task.automation_allowed?'Pode ser verificada/confirmada':'Etapa manual'}</small></div><button disabled={task.completed||task.requires_market_manipulation} onClick={()=>completeTask(task)}>{task.completed?'Concluída':task.requires_market_manipulation?'Bloqueada':'Concluir'}</button></div>)}</div></section></div>}
 </div>;
}