import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FiCheck,FiCompass,FiDollarSign,FiShield,FiTrendingUp,FiX} from 'react-icons/fi';
import api,{APP_SLUG} from './services/api.js';
import './airdrops.css';

const base=`/v1/apps/${APP_SLUG}/market/airdrops`;
const unwrap=(response)=>response?.data?.data??response?.data;
const usdt=(value)=>`${Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} USDT`;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function AirdropsWorkspace({onClose}){
 const [campaigns,setCampaigns]=useState([]);
 const [selected,setSelected]=useState(null);
 const [capital,setCapital]=useState(280);
 const [risk,setRisk]=useState('moderado');
 const [plan,setPlan]=useState(null);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const demos=useMemo(()=>campaigns.filter((item)=>item.status==='demo').length,[campaigns]);
 const ranked=useMemo(()=>[...campaigns].sort((a,b)=>Number(b.opportunity_score||0)-Number(a.opportunity_score||0)),[campaigns]);
 const best=ranked[0]||null;
 const compatible=useMemo(()=>campaigns.filter((item)=>Number(capital)>=Number(item.capital_min_usdt||0)),[campaigns,capital]);
 const estimatedFees=useMemo(()=>compatible.reduce((sum,item)=>sum+Number(item.estimated_fees_usdt||0),0),[compatible]);

 const load=async()=>{
  setLoading(true);setMessage('');
  try{setCampaigns(unwrap(await api.get(base))||[]);}catch(error){setMessage(error?.response?.data?.message||'Não foi possível carregar as campanhas de airdrop.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{load();},[]);
 useEffect(()=>{document.body.classList.add('airdrop-open');return()=>document.body.classList.remove('airdrop-open');},[]);

 const openCampaign=async(slug)=>{
  try{setSelected(unwrap(await api.get(`${base}/${encodeURIComponent(slug)}`)));}
  catch(error){setMessage(error?.response?.data?.message||'Não foi possível abrir a campanha.');}
 };
 const buildPlan=async()=>{
  try{setPlan(unwrap(await api.post(`${base}/plan`,{capital_usdt:Number(capital),risk_profile:risk})));}
  catch(error){setMessage(error?.response?.data?.message||'Não foi possível calcular o plano.');}
 };
 const complete=async(task)=>{
  if(task.requires_market_manipulation){setMessage('A Kryvion bloqueia volume artificial, self-trade e outras ações destinadas apenas a simular atividade.');return;}
  try{
   const updated=unwrap(await api.post(`${base}/${encodeURIComponent(selected.slug)}/tasks/${encodeURIComponent(task.id)}/complete`,{confirmed_by_user:true}));
   setSelected(updated);await load();setMessage('Tarefa registrada. A Kryvion não executou nenhuma transação sem sua confirmação.');
  }catch(error){setMessage(error?.response?.data?.message||'Não foi possível registrar a tarefa.');}
 };

 return <div className="airdrop-overlay" role="dialog" aria-modal="true" aria-label="Kryvion Airdrops">
  <div className="airdrop-shell">
   <header className="airdrop-header"><div><small>KRYVION AIRDROP INTELLIGENCE</small><h1>Airdrops</h1><p>Veja primeiro o que vale sua atenção: potencial, risco, capital necessário, custo estimado e exatamente o que falta fazer.</p></div><button onClick={onClose} aria-label="Fechar Airdrops"><FiX/></button></header>
   {message&&<div className="airdrop-message"><FiShield/><span>{message}</span></div>}

   <section className="airdrop-decision-strip">
    <article><small>MELHOR SCORE</small><strong>{best?`${best.opportunity_score}/100`:'—'}</strong><span>{best?.project||'Nenhuma campanha carregada'}</span></article>
    <article><small>COMPATÍVEIS COM {usdt(capital)}</small><strong>{compatible.length}</strong><span>de {campaigns.length} rotas monitoradas</span></article>
    <article><small>CUSTO ESTIMADO DAS COMPATÍVEIS</small><strong>{usdt(estimatedFees)}</strong><span>taxas estimadas, não garantia de gasto final</span></article>
    <article><small>STATUS DOS DADOS</small><strong>{demos===campaigns.length&&campaigns.length?'DEMO':'MISTO'}</strong><span>{demos} modelo(s) demonstrativo(s)</span></article>
   </section>

   <section className="airdrop-grid">
    <div className="airdrop-panel airdrop-span2"><div className="airdrop-panel-head"><div><small>RANKING DE OPORTUNIDADES</small><h2>Onde vale olhar primeiro</h2><p>Ordenado por score. Abra uma rota para ver o checklist de elegibilidade e o que falta concluir.</p></div></div>
     {loading?<p>Carregando campanhas…</p>:ranked.map((campaign,index)=>{
      const fits=Number(capital)>=Number(campaign.capital_min_usdt||0);
      const valueIndex=clamp(Number(campaign.opportunity_score||0)-Number(campaign.risk_score||0)-Number(campaign.estimated_fees_usdt||0),0,100);
      return <button className="airdrop-campaign" key={campaign.slug} onClick={()=>openCampaign(campaign.slug)}>
       <div><strong>#{index+1} · {campaign.project}</strong><small>{campaign.network} · {campaign.status==='demo'?'MODELO DEMONSTRATIVO':String(campaign.status||'monitorado').toUpperCase()}</small><em className={fits?'fit':'nofit'}>{fits?'Cabe no seu capital':'Capital abaixo do mínimo'}</em></div>
       <span><small>Score</small><b>{campaign.opportunity_score}/100</b></span>
       <span><small>Risco</small><b>{campaign.risk_score}/100</b></span>
       <span><small>Eficiência</small><b>{Math.round(valueIndex)}/100</b></span>
       <span className="airdrop-progress"><small>{campaign.completed_tasks}/{campaign.task_count} tarefas · {campaign.progress_pct}%</small><i><em style={{width:`${campaign.progress_pct}%`}}/></i></span>
      </button>})}
     {!loading&&!campaigns.length&&<div className="airdrop-empty"><FiCompass/><h3>Nenhuma campanha disponível</h3><p>A Kryvion não vai inventar oportunidade. Quando uma campanha for validada, ela entra aqui com fonte, custo, risco e checklist.</p></div>}
    </div>

    <div className="airdrop-panel"><div className="airdrop-panel-head"><div><small>CAPITAL PLANNER</small><h2>Planejar sua rota</h2><p>Use o valor real que pretende disponibilizar para farming.</p></div></div>
     <label>Capital disponível (USDT)<input type="number" min="1" value={capital} onChange={(event)=>setCapital(event.target.value)}/></label>
     <label>Perfil de risco<select value={risk} onChange={(event)=>setRisk(event.target.value)}><option value="conservador">Conservador</option><option value="moderado">Moderado</option><option value="agressivo">Agressivo</option></select></label>
     <button className="airdrop-primary" onClick={buildPlan}><FiDollarSign/> Montar plano</button>
     {plan?<div className="airdrop-plan"><span><small>Reserva protegida</small><b>{usdt(plan.reserve_usdt)}</b></span><span><small>Capital utilizável</small><b>{usdt(plan.deployable_usdt)}</b></span><span><small>Orçamento de taxas</small><b>{usdt(plan.fee_budget_usdt)}</b></span><span><small>Máx. por tarefa</small><b>{usdt(plan.max_single_task_usdt)}</b></span><p>{plan.disclaimer}</p></div>:<div className="airdrop-plan-hint"><FiTrendingUp/><p>Com {usdt(capital)}, {compatible.length} rota(s) atuais passam pelo requisito mínimo de capital.</p></div>}
    </div>
   </section>

   <section className="airdrop-howto">
    <article><b>1. Priorize</b><p>Comece pelas rotas com score alto, risco controlado e custo compatível com seu capital.</p></article>
    <article><b>2. Confira elegibilidade</b><p>Abra a campanha e veja quais ações legítimas ainda faltam. A Kryvion registra seu progresso.</p></article>
    <article><b>3. Preserve capital</b><p>Não use todo o saldo em taxas ou tarefas. O planner separa reserva antes de sugerir exposição.</p></article>
   </section>

   <section className="airdrop-safety"><FiShield/><div><b>Informação relevante, sem atividade artificial</b><p>A Kryvion bloqueia wash trading, fake volume, self-trade e churn de alavancagem. Modelos demo ficam claramente marcados e não são vendidos como oportunidade ao vivo.</p></div></section>
  </div>
  {selected&&<div className="airdrop-detail"><div className="airdrop-detail-card"><button className="airdrop-detail-close" onClick={()=>setSelected(null)}><FiX/></button><small>{selected.network} · {selected.status}</small><h2>{selected.project}</h2><p>{selected.source_label}</p><div className="airdrop-detail-stats"><span>Opportunity <b>{selected.opportunity_score}/100</b></span><span>Risco <b>{selected.risk_score}/100</b></span><span>Fees estimadas <b>{usdt(selected.estimated_fees_usdt)}</b></span><span>Progresso <b>{selected.progress_pct}%</b></span></div><div className="airdrop-next"><FiCompass/><div><b>Próximo passo</b><p>{(selected.tasks||[]).find((task)=>!task.completed&&!task.requires_market_manipulation)?.label||'Nenhuma tarefa legítima pendente nesta rota.'}</p></div></div><h3>Checklist de elegibilidade</h3>{(selected.tasks||[]).map((task)=><div className={`airdrop-task ${task.completed?'done':''} ${task.requires_market_manipulation?'blocked':''}`} key={task.id}><span>{task.completed?<FiCheck/>:<FiCompass/>}</span><div><b>{task.label}</b><small>{task.requires_market_manipulation?'Bloqueada pelo Risk Guardian':task.automation_allowed?'Ação compatível com fluxo confirmado':'Registro/manual'}</small></div><button disabled={task.completed||task.requires_market_manipulation} onClick={()=>complete(task)}>{task.completed?'Concluída':task.requires_market_manipulation?'Bloqueada':'Marcar concluída'}</button></div>)}</div></div>}
 </div>;
}

let airdropsRoot=null;
let airdropsHost=null;

function closeAirdrops(button){
 if(airdropsRoot){airdropsRoot.unmount();airdropsRoot=null;}
 if(airdropsHost?.isConnected)airdropsHost.remove();
 airdropsHost=null;
 button?.classList.remove('active');
}

function mountAirdrops(){
 const sidebar=document.querySelector('.sidebar nav');
 if(!sidebar||sidebar.querySelector('[data-kryvion-airdrops]'))return false;
 const button=document.createElement('button');button.type='button';button.dataset.kryvionAirdrops='1';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M5 7h14M7 17h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Airdrops</span>';
 button.addEventListener('click',()=>{
  document.querySelector('.sidebar.open .close-mobile')?.click();
  document.querySelectorAll('.sidebar nav button').forEach((item)=>item.classList.remove('active'));
  closeAirdrops();
  button.classList.add('active');
  airdropsHost=document.createElement('div');airdropsHost.id='kryvion-airdrops-root';document.body.appendChild(airdropsHost);
  airdropsRoot=createRoot(airdropsHost);
  airdropsRoot.render(<AirdropsWorkspace onClose={()=>closeAirdrops(button)}/>);
 });
 sidebar.appendChild(button);return true;
}

const ensureMounted=()=>mountAirdrops();
ensureMounted();
const observer=new MutationObserver(()=>ensureMounted());
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('authChanged',()=>{
 closeAirdrops(document.querySelector('[data-kryvion-airdrops]'));
 window.setTimeout(ensureMounted,0);
});