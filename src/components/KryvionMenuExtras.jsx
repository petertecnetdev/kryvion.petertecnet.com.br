import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {FiActivity,FiExternalLink,FiGrid,FiTrendingUp} from 'react-icons/fi';

function closeMenu(){
 document.querySelector('.sidebar .close-mobile')?.click();
}

function openDock(selector){
 closeMenu();
 window.requestAnimationFrame(()=>{
  const button=document.querySelector(selector);
  if(button)button.click();
 });
}

function suppressFloatingEcosystemLaunchers(){
 const selectors=[
  '[aria-label*="ecossistema" i]',
  '[aria-label*="ecosystem" i]',
  '[title*="ecossistema" i]',
  '[title*="ecosystem" i]',
  '[id*="ecosystem" i]',
  '[class*="ecosystem" i]',
 ];
 document.querySelectorAll(selectors.join(',')).forEach((node)=>{
  if(node.closest('.sidebar'))return;
  const style=window.getComputedStyle(node);
  if(style.position==='fixed')node.classList.add('kryvion-floating-control-hidden');
 });
}

export default function KryvionMenuExtras(){
 const [host,setHost]=useState(null);

 useEffect(()=>{
  const resolveHost=()=>{
   const target=document.querySelector('.sidebar .side-bottom');
   if(target)setHost(target);
   suppressFloatingEcosystemLaunchers();
  };

  resolveHost();
  const observer=new MutationObserver(resolveHost);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);

 if(!host)return null;

 return createPortal(
  <section className="kryvion-menu-extras" aria-label="Acessos rápidos da Kryvion">
   <small>INTELIGÊNCIA E ECOSSISTEMA</small>
   <div className="kryvion-menu-extra-grid">
    <button type="button" onClick={()=>openDock('.cmc-launcher')}>
     <span><FiTrendingUp/></span>
     <div><b>Radar de possível alta</b><em>Scanner probabilístico do mercado</em></div>
    </button>
    <button type="button" onClick={()=>openDock('.kry-intel-toggle')}>
     <span><FiActivity/></span>
     <div><b>Market Intelligence</b><em>Sinais, força relativa e contexto</em></div>
    </button>
    <a href="https://petertecnet.com.br" rel="noreferrer">
     <span><FiGrid/></span>
     <div><b>Ecossistema Peter Tecnet</b><em>Abrir plataformas e soluções</em></div>
     <FiExternalLink/>
    </a>
   </div>
  </section>,
  host,
 );
}
