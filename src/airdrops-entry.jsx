import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FiCheck,FiCompass,FiDollarSign,FiShield,FiX} from 'react-icons/fi';
import api,{APP_SLUG} from './services/api.js';
import './airdrops.css';

const base=`/v1/apps/${APP_SLUG}/market/airdrops`;
const unwrap=(response)=>response?.data?.data??response?.data;
const usdt=(value)=>`${Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} USDT`;

function AirdropsWorkspace({onClose}){
 const [campaigns,setCampaigns]=useState([]);
 const [selected,setSelected]=useState(null);
 const [capital,setCapital]=useState(280);
 const [risk,setRisk]=useState('moderado');
 const [plan,setPlan]=useState(null);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const demos=useMemo(()=>campaigns.filter((item)=>item.status==='demo').length,[campaigns]);

 const load=async()=>{
  setLoading(true);setMessage('');
  try{setCampaigns(unwrap(await api.get(base))||[]);}catch(error){setMessage(error?.response?.data?.message||'Não foi possível carregar as campanhas de airdrop.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{load();},[]);

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
   <header className="airdrop-header"><div><small>KRYVION INTELLIGENCE ENGINE</small><h1>Airdrops</h1><p>Descoberta, elegibilidade, capital, custos e progresso com proteção contra atividade artificial.</p></div><button onClick={onClose} aria-label="Fechar Airdrops"><FiX/></button></header>
   {message&&<div className="airdrop-message"><FiShield/><span>{message}</span></div>}
   <section className="airdrop-metrics"><article><FiCompass/><span><small>Campanhas</small><b>{campaigns.length}</b></span></article><article><FiCheck/><span><small>Com progresso</small><b>{campaigns.filter((item)=>item.progress_pct>0).length}</b></span></article><article><FiShield/><span><small>Modelos demo</small><b>{demos}</b></span></article></section>
   <section className="airdrop-grid">
    <div className="airdrop-panel airdrop-span2"><div className="airdrop-panel-head"><div><small>OPPORTUNITY × ELIGIBILITY</small><h2>Campanhas monitoradas</h2></div></div>
     {loading?<p>Carregando campanhas…</p>:campaigns.map((campaign)=><button className="airdrop-campaign" key={campaign.slug} onClick={()=>openCampaign(campaign.slug)}>
      <div><strong>{campaign.project}</strong><small>{campaign.network} · {campaign.status==='demo'?'MODELO DEMONSTRATIVO':campaign.status}</small></div>
      <span><small>Score</small><b>{campaign.opportunity_score}/100</b></span><span><small>Risco</small><b>{campaign.risk_score}/100</b></span><span><small>Capital</small><b>{campaign.capital_min_usdt}–{campaign.capital_max_usdt} USDT</b></span><span className="airdrop-progress"><small>{campaign.completed_tasks}/{campaign.task_count} tarefas</small><i><em style={{width:`${campaign.progress_pct}%`}}/></i></span>
     </button>)}
    </div>
    <div className="airdrop-panel"><div className="airdrop-panel-head"><div><small>CAPITAL PLANNER</small><h2>Planejar rota</h2></div></div>
     <label>Capital disponível (USDT)<input type="number" min="1" value={capital} onChange={(event)=>setCapital(event.target.value)}/></label>
     <label>Perfil de risco<select value={risk} onChange={(event)=>setRisk(event.target.value)}><option value="conservador">Conservador</option><option value="moderado">Moderado</option><option value="agressivo">Agressivo</option></select></label>
     <button className="airdrop-primary" onClick={buildPlan}><FiDollarSign/> Calcular capital</button>
     {plan&&<div className="airdrop-plan"><span><small>Reserva protegida</small><b>{usdt(plan.reserve_usdt)}</b></span><span><small>Capital utilizável</small><b>{usdt(plan.deployable_usdt)}</b></span><span><small>Orçamento de taxas</small><b>{usdt(plan.fee_budget_usdt)}</b></span><span><small>Máx. por tarefa</small><b>{usdt(plan.max_single_task_usdt)}</b></span><p>{plan.disclaimer}</p></div>}
    </div>
   </section>
   <section className="airdrop-safety"><FiShield/><div><b>Guardrails ativos</b><p>Sem wash trading, fake volume, self-trade ou churn de alavancagem. Tarefas legítimas exigem confirmação do usuário e as campanhas demonstrativas não são apresentadas como oportunidades ao vivo.</p></div></section>
  </div>
  {selected&&<div className="airdrop-detail"><div className="airdrop-detail-card"><button className="airdrop-detail-close" onClick={()=>setSelected(null)}><FiX/></button><small>{selected.network} · {selected.status}</small><h2>{selected.project}</h2><p>{selected.source_label}</p><div className="airdrop-detail-stats"><span>Opportunity <b>{selected.opportunity_score}/100</b></span><span>Risco <b>{selected.risk_score}/100</b></span><span>Fees estimadas <b>{usdt(selected.estimated_fees_usdt)}</b></span><span>Progresso <b>{selected.progress_pct}%</b></span></div><h3>Checklist de elegibilidade</h3>{(selected.tasks||[]).map((task)=><div className={`airdrop-task ${task.completed?'done':''} ${task.requires_market_manipulation?'blocked':''}`} key={task.id}><span>{task.completed?<FiCheck/>:<FiCompass/>}</span><div><b>{task.label}</b><small>{task.requires_market_manipulation?'Bloqueada pelo Risk Guardian':task.automation_allowed?'Ação compatível com fluxo confirmado':'Registro/manual'}</small></div><button disabled={task.completed||task.requires_market_manipulation} onClick={()=>complete(task)}>{task.completed?'Concluída':task.requires_market_manipulation?'Bloqueada':'Marcar concluída'}</button></div>)}</div></div>}
 </div>;
}

function mountAirdrops(){
 const sidebar=document.querySelector('.sidebar nav');
 if(!sidebar||sidebar.querySelector('[data-kryvion-airdrops]'))return false;
 const button=document.createElement('button');button.type='button';button.dataset.kryvionAirdrops='1';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M5 7h14M7 17h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Airdrops</span>';
 button.addEventListener('click',()=>{
  document.querySelectorAll('.sidebar nav button').forEach((item)=>item.classList.remove('active'));
  button.classList.add('active');
  let host=document.getElementById('kryvion-airdrops-root');if(!host){host=document.createElement('div');host.id='kryvion-airdrops-root';document.body.appendChild(host);}
  const root=createRoot(host);root.render(<AirdropsWorkspace onClose={()=>{root.unmount();host.remove();button.classList.remove('active');}}/>);
 });
 sidebar.appendChild(button);return true;
}

if(!mountAirdrops()){
 const observer=new MutationObserver(()=>{if(mountAirdrops())observer.disconnect();});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 window.setTimeout(()=>observer.disconnect(),15000);
}
