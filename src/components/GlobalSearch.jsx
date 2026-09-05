import React,{useEffect,useMemo,useRef,useState} from 'react';
import {FiActivity,FiBriefcase,FiCompass,FiSearch,FiTrendingUp} from 'react-icons/fi';

import {buildSearchResults} from '../services/search.js';


const ResultIcon=({type})=>type==='position'?<FiBriefcase/>:type==='signal'?<FiActivity/>:type==='asset'?<FiTrendingUp/>:<FiCompass/>;

export default function GlobalSearch({assets,positions,navigation,onNavigate}){
 const [query,setQuery]=useState('');
 const [open,setOpen]=useState(false);
 const [activeIndex,setActiveIndex]=useState(0);
 const inputRef=useRef(null);
 const rootRef=useRef(null);
 const results=useMemo(()=>buildSearchResults(query,{assets,positions,navigation}),[query,assets,positions,navigation]);

 useEffect(()=>setActiveIndex(0),[query]);
 useEffect(()=>{
  const onGlobalKey=(event)=>{
   const target=event.target;
   const typing=target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target?.isContentEditable;
   if(event.key==='/'&&!typing){event.preventDefault();inputRef.current?.focus();setOpen(true);}
   if(event.key==='Escape'){setOpen(false);inputRef.current?.blur();}
  };
  const closeOutside=(event)=>{if(rootRef.current&&!rootRef.current.contains(event.target))setOpen(false);};
  document.addEventListener('keydown',onGlobalKey);
  document.addEventListener('pointerdown',closeOutside);
  return()=>{document.removeEventListener('keydown',onGlobalKey);document.removeEventListener('pointerdown',closeOutside);};
 },[]);

 const activate=(result)=>{
  if(!result)return;
  onNavigate(result.page);
  setQuery('');
  setOpen(false);
  inputRef.current?.blur();
 };

 const onKeyDown=(event)=>{
  if(!open||!results.length)return;
  if(event.key==='ArrowDown'){event.preventDefault();setActiveIndex((index)=>(index+1)%results.length);}
  if(event.key==='ArrowUp'){event.preventDefault();setActiveIndex((index)=>(index-1+results.length)%results.length);}
  if(event.key==='Enter'){event.preventDefault();activate(results[activeIndex]);}
 };

 return <div className={`global-search ${open?'open':''}`} ref={rootRef}>
  <button type="button" className="mobile-search-trigger" onClick={()=>{setOpen(true);window.setTimeout(()=>inputRef.current?.focus(),0);}} aria-label="Abrir busca" aria-expanded={open}><FiSearch/></button>
  <div className={`search ${open?'active':''}`}><FiSearch/><input ref={inputRef} value={query} onChange={(event)=>{setQuery(event.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={onKeyDown} placeholder="Buscar ativo, sinal ou posição..." aria-label="Buscar na Kryvion" role="combobox" aria-autocomplete="list" aria-expanded={open&&Boolean(query)} aria-controls="kryvion-search-results" aria-activedescendant={open&&results.length?`kryvion-search-option-${activeIndex}`:undefined}/><kbd>/</kbd></div>
  {open&&query&&<div className="search-results" id="kryvion-search-results" role="listbox" aria-label="Resultados da busca">
   {results.length?results.map((result,index)=><button id={`kryvion-search-option-${index}`} type="button" role="option" aria-selected={index===activeIndex} className={index===activeIndex?'active':''} key={result.key} onMouseEnter={()=>setActiveIndex(index)} onClick={()=>activate(result)}><span className="search-result-icon"><ResultIcon type={result.icon}/></span><span><small>{result.kind}</small><b>{result.label}</b><em>{result.description}</em></span></button>):<div className="search-empty"><FiSearch/><b>Nenhum resultado</b><span>Tente pelo nome, símbolo ou seção.</span></div>}
  </div>}
 </div>;
}
