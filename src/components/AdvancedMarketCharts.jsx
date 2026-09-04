import React,{useMemo,useState} from 'react';
import {
 Area,AreaChart,Bar,CartesianGrid,Cell,ComposedChart,Line,PolarAngleAxis,PolarGrid,
 Radar,RadarChart,ReferenceLine,ResponsiveContainer,Scatter,ScatterChart,Tooltip,
 XAxis,YAxis,ZAxis
} from 'recharts';
import {FiActivity,FiBarChart2,FiCrosshair,FiLayers,FiShield,FiTrendingDown,FiTrendingUp} from 'react-icons/fi';
import '../advanced-charts.css';

const COLORS=['#68f5cb','#8e61ff','#4aa8ff','#ffbd5b','#ff628f'];
const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
const formatCompact=(value)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(Number(value||0));
const formatPct=(value,digits=2)=>`${Number(value||0)>=0?'+':''}${Number(value||0).toFixed(digits)}%`;

function returns(values=[]){
 return values.slice(1).map((value,index)=>{
  const previous=Number(values[index]||0);
  return previous?((Number(value)-previous)/previous)*100:0;
 });
}

function correlation(a=[],b=[]){
 const left=returns(a);
 const right=returns(b);
 const length=Math.min(left.length,right.length);
 if(length<2)return 0;
 const x=left.slice(-length);
 const y=right.slice(-length);
 const avgX=x.reduce((sum,value)=>sum+value,0)/length;
 const avgY=y.reduce((sum,value)=>sum+value,0)/length;
 let covariance=0;
 let varianceX=0;
 let varianceY=0;
 for(let index=0;index<length;index+=1){
  const dx=x[index]-avgX;
  const dy=y[index]-avgY;
  covariance+=dx*dy;
  varianceX+=dx*dx;
  varianceY+=dy*dy;
 }
 const denominator=Math.sqrt(varianceX*varianceY);
 return denominator?covariance/denominator:0;
}

function drawdown(values=[]){
 let peak=Number(values[0]||0);
 return values.map((raw,index)=>{
  const value=Number(raw||0);
  peak=Math.max(peak,value);
  return {point:index+1,value:peak?((value-peak)/peak)*100:0};
 });
}

function ChartTooltip({active,payload,label,suffix='%'}){
 if(!active||!payload?.length)return null;
 return <div className="kry-tooltip">
  <small>{label!==undefined?`Ponto ${label}`:'Leitura'}</small>
  {payload.map((entry)=><div key={`${entry.dataKey}-${entry.name}`}><span style={{background:entry.color}}/><b>{entry.name}</b><strong>{Number(entry.value).toFixed(2)}{suffix}</strong></div>)}
 </div>;
}

function SectionTitle({eyebrow,title,meta,icon:Icon}){
 return <div className="kry-chart-title"><div><small>{eyebrow}</small><h3>{Icon&&<Icon/>}{title}</h3></div>{meta&&<span>{meta}</span>}</div>;
}

export default function AdvancedMarketCharts({assets=[],regime}){
 const safeAssets=useMemo(()=>assets.filter((asset)=>Array.isArray(asset.spark)&&asset.spark.length>1).slice(0,5),[assets]);
 const [selectedId,setSelectedId]=useState(null);
 const [windowSize,setWindowSize]=useState(12);
 const selected=useMemo(()=>safeAssets.find((asset)=>asset.id===selectedId)||safeAssets[0]||assets[0]||null,[safeAssets,assets,selectedId]);

 const normalized=useMemo(()=>{
  const list=safeAssets.length?safeAssets:assets.slice(0,5);
  const max=Math.max(0,...list.map((asset)=>asset.spark?.length||0));
  const start=Math.max(0,max-windowSize);
  return Array.from({length:Math.max(0,max-start)},(_,offset)=>{
   const index=start+offset;
   const row={point:offset+1};
   list.forEach((asset)=>{
    const source=asset.spark||[];
    const base=Number(source[start]??source[0]??1)||1;
    const value=Number(source[index]??source[source.length-1]??base);
    row[asset.symbol]=((value/base)-1)*100;
   });
   return row;
  });
 },[safeAssets,assets,windowSize]);

 const drawdownData=useMemo(()=>drawdown(selected?.spark||[]).slice(-windowSize),[selected,windowSize]);
 const maxDrawdown=useMemo(()=>Math.min(0,...drawdownData.map((item)=>item.value)),[drawdownData]);

 const liquidity=useMemo(()=>{
  const source=safeAssets.length?safeAssets:assets.slice(0,5);
  return source.map((asset,index)=>({
   symbol:asset.symbol,
   name:asset.name,
   momentum:Number(asset.change_7d||0),
   score:Number(asset.score||50),
   bubble:Math.max(12,Math.log10(Math.max(10,Number(asset.volume||1)))*18),
   volume:Number(asset.volume||0),
   color:COLORS[index%COLORS.length],
  }));
 },[safeAssets,assets]);

 const breadth=useMemo(()=>{
  const source=safeAssets.length?safeAssets:assets.slice(0,5);
  const max=Math.max(0,...source.map((asset)=>asset.spark?.length||0));
  const start=Math.max(1,max-windowSize);
  return Array.from({length:Math.max(0,max-start)},(_,offset)=>{
   const index=start+offset;
   let positive=0;
   let negative=0;
   let momentum=0;
   source.forEach((asset)=>{
    const current=Number(asset.spark?.[index]??0);
    const previous=Number(asset.spark?.[index-1]??current);
    const change=previous?((current-previous)/previous)*100:0;
    if(change>=0)positive+=1;else negative+=1;
    momentum+=change;
   });
   return {
    point:offset+1,
    breadth:source.length?(positive/source.length)*100:0,
    weakness:source.length?(negative/source.length)*100:0,
    momentum:source.length?momentum/source.length:0,
   };
  });
 },[safeAssets,assets,windowSize]);

 const correlationMatrix=useMemo(()=>{
  const source=(safeAssets.length?safeAssets:assets.slice(0,5)).slice(0,5);
  return source.map((row)=>({
   symbol:row.symbol,
   cells:source.map((column)=>({symbol:column.symbol,value:row.id===column.id?1:correlation(row.spark,column.spark)})),
  }));
 },[safeAssets,assets]);

 const factorData=useMemo(()=>{
  if(!selected)return [];
  const source=safeAssets.length?safeAssets:assets.slice(0,5);
  const volumes=source.map((asset)=>Math.log10(Math.max(1,Number(asset.volume||1))));
  const currentVolume=Math.log10(Math.max(1,Number(selected.volume||1)));
  const minVolume=Math.min(...volumes);
  const maxVolume=Math.max(...volumes);
  const liquidityScore=maxVolume===minVolume?70:40+((currentVolume-minVolume)/(maxVolume-minVolume))*55;
  const riskScore=String(selected.risk||'').toLowerCase().includes('alto')?42:String(selected.risk||'').toLowerCase().includes('baixo')?84:66;
  return [
   {factor:'Momentum',value:clamp(50+Number(selected.change_7d||0)*4)},
   {factor:'Liquidez',value:clamp(liquidityScore)},
   {factor:'Confiança',value:clamp(selected.confidence||60)},
   {factor:'Tendência',value:clamp(50+Number(selected.change_24h||0)*8)},
   {factor:'Resiliência',value:clamp(riskScore+Math.max(-25,maxDrawdown))},
   {factor:'Score',value:clamp(selected.score||50)},
  ];
 },[selected,safeAssets,assets,maxDrawdown]);

 const turnover=useMemo(()=>{
  const source=safeAssets.length?safeAssets:assets.slice(0,5);
  return source.map((asset)=>({
   symbol:asset.symbol,
   turnover:Number(asset.market_cap||0)?(Number(asset.volume||0)/Number(asset.market_cap))*100:0,
   change:Number(asset.change_24h||0),
  })).sort((a,b)=>b.turnover-a.turnover);
 },[safeAssets,assets]);

 if(!selected)return null;

 const timeframeOptions=[{label:'6P',value:6},{label:'8P',value:8},{label:'12P',value:12},{label:'Tudo',value:99}];
 const avgCorrelation=correlationMatrix.length>1?correlationMatrix.flatMap((row,index)=>row.cells.filter((_,cellIndex)=>cellIndex!==index).map((cell)=>cell.value)).reduce((sum,value)=>sum+value,0)/(correlationMatrix.length*(correlationMatrix.length-1)):0;
 const breadthNow=breadth.at(-1)?.breadth||0;

 return <section className="kry-advanced">
  <div className="kry-advanced-head">
   <div><p>KRYVION MARKET TERMINAL</p><h2>Mapa avançado do mercado</h2><span>Preço relativo, amplitude, correlação, drawdown, liquidez e leitura multifator em uma única camada.</span></div>
   <div className="kry-terminal-badge"><i/><div><small>REGIME</small><strong>{regime?.label||'Monitorando mercado'}</strong></div><b>{Math.round(Number(regime?.confidence||0))}%</b></div>
  </div>

  <div className="kry-terminal-strip">
   <div><FiActivity/><span>Amplitude positiva<strong>{breadthNow.toFixed(0)}%</strong></span></div>
   <div><FiLayers/><span>Correlação média<strong>{avgCorrelation.toFixed(2)}</strong></span></div>
   <div><FiTrendingDown/><span>Drawdown {selected.symbol}<strong>{maxDrawdown.toFixed(2)}%</strong></span></div>
   <div><FiShield/><span>Opportunity score<strong>{Math.round(Number(selected.score||0))}/100</strong></span></div>
  </div>

  <div className="kry-main-grid">
   <article className="kry-chart-panel kry-price-panel">
    <div className="kry-panel-toolbar">
     <SectionTitle eyebrow="RELATIVE PERFORMANCE" title="Força relativa do mercado" icon={FiTrendingUp}/>
     <div className="kry-timeframes">{timeframeOptions.map((item)=><button key={item.label} className={windowSize===item.value?'active':''} onClick={()=>setWindowSize(item.value)}>{item.label}</button>)}</div>
    </div>
    <div className="kry-legend">{(safeAssets.length?safeAssets:assets.slice(0,5)).map((asset,index)=><button key={asset.id} className={selected.id===asset.id?'active':''} onClick={()=>setSelectedId(asset.id)}><i style={{background:COLORS[index%COLORS.length]}}/>{asset.symbol}<span className={Number(asset.change_24h)>=0?'up':'down'}>{formatPct(asset.change_24h)}</span></button>)}</div>
    <ResponsiveContainer width="100%" height={330}>
     <ComposedChart data={normalized} margin={{top:10,right:12,left:-18,bottom:0}}>
      <defs><linearGradient id="marketPulse" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8e61ff" stopOpacity="0.20"/><stop offset="100%" stopColor="#8e61ff" stopOpacity="0"/></linearGradient></defs>
      <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false}/>
      <XAxis dataKey="point" tickLine={false} axisLine={false} tick={{fill:'#65708f',fontSize:11}}/>
      <YAxis tickLine={false} axisLine={false} tick={{fill:'#65708f',fontSize:11}} tickFormatter={(value)=>`${value.toFixed(0)}%`}/>
      <ReferenceLine y={0} stroke="rgba(255,255,255,.18)" strokeDasharray="4 4"/>
      <Tooltip content={<ChartTooltip/>}/>
      {(safeAssets.length?safeAssets:assets.slice(0,5)).map((asset,index)=><Line key={asset.id} type="monotone" dataKey={asset.symbol} name={asset.symbol} stroke={COLORS[index%COLORS.length]} strokeWidth={selected.id===asset.id?3:1.5} dot={false} opacity={selected.id===asset.id?1:.55} activeDot={{r:4}}/>) }
     </ComposedChart>
    </ResponsiveContainer>
   </article>

   <article className="kry-chart-panel kry-factor-panel">
    <SectionTitle eyebrow="MULTIFACTOR ENGINE" title={`${selected.symbol} Signal Matrix`} meta={`Confiança ${Math.round(Number(selected.confidence||0))}%`} icon={FiCrosshair}/>
    <ResponsiveContainer width="100%" height={285}>
     <RadarChart data={factorData} outerRadius="72%">
      <PolarGrid stroke="rgba(255,255,255,.09)"/>
      <PolarAngleAxis dataKey="factor" tick={{fill:'#9da7c2',fontSize:10}}/>
      <Radar dataKey="value" stroke="#68f5cb" fill="#68f5cb" fillOpacity={.16} strokeWidth={2}/>
      <Tooltip formatter={(value)=>[`${Number(value).toFixed(0)}/100`,'Score']}/>
     </RadarChart>
    </ResponsiveContainer>
    <div className="kry-factor-readout"><span>24h <b className={Number(selected.change_24h)>=0?'up':'down'}>{formatPct(selected.change_24h)}</b></span><span>7d <b className={Number(selected.change_7d)>=0?'up':'down'}>{formatPct(selected.change_7d)}</b></span><span>Volume <b>R$ {formatCompact(selected.volume)}</b></span></div>
   </article>
  </div>

  <div className="kry-secondary-grid">
   <article className="kry-chart-panel">
    <SectionTitle eyebrow="MARKET BREADTH" title="Amplitude × momentum" meta={`${breadthNow.toFixed(0)}% dos ativos positivos`} icon={FiBarChart2}/>
    <ResponsiveContainer width="100%" height={240}>
     <ComposedChart data={breadth} margin={{top:8,right:8,left:-18,bottom:0}}>
      <defs><linearGradient id="breadthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#68f5cb" stopOpacity=".28"/><stop offset="100%" stopColor="#68f5cb" stopOpacity="0"/></linearGradient></defs>
      <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/>
      <XAxis dataKey="point" hide/>
      <YAxis yAxisId="left" domain={[0,100]} tick={{fill:'#65708f',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(value)=>`${value}%`}/>
      <YAxis yAxisId="right" orientation="right" tick={{fill:'#65708f',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(value)=>`${value.toFixed(1)}%`}/>
      <Tooltip/>
      <Area yAxisId="left" type="monotone" dataKey="breadth" name="Amplitude positiva" stroke="#68f5cb" fill="url(#breadthFill)" strokeWidth={2}/>
      <Bar yAxisId="right" dataKey="momentum" name="Momentum médio" fill="#8e61ff" opacity={.55} barSize={10}/>
     </ComposedChart>
    </ResponsiveContainer>
   </article>

   <article className="kry-chart-panel">
    <SectionTitle eyebrow="DRAWDOWN MONITOR" title={`Pressão de perda · ${selected.symbol}`} meta={`Máx. ${maxDrawdown.toFixed(2)}%`} icon={FiTrendingDown}/>
    <ResponsiveContainer width="100%" height={240}>
     <AreaChart data={drawdownData} margin={{top:8,right:8,left:-18,bottom:0}}>
      <defs><linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff628f" stopOpacity=".06"/><stop offset="100%" stopColor="#ff628f" stopOpacity=".34"/></linearGradient></defs>
      <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false}/>
      <XAxis dataKey="point" hide/>
      <YAxis domain={['auto',0]} tick={{fill:'#65708f',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(value)=>`${value.toFixed(0)}%`}/>
      <ReferenceLine y={0} stroke="rgba(255,255,255,.18)"/>
      <Tooltip formatter={(value)=>[`${Number(value).toFixed(2)}%`,'Drawdown']}/>
      <Area type="monotone" dataKey="value" stroke="#ff628f" fill="url(#drawdownFill)" strokeWidth={2}/>
     </AreaChart>
    </ResponsiveContainer>
   </article>

   <article className="kry-chart-panel">
    <SectionTitle eyebrow="LIQUIDITY MAP" title="Momentum × qualidade" meta="Bolha = liquidez" icon={FiActivity}/>
    <ResponsiveContainer width="100%" height={240}>
     <ScatterChart margin={{top:12,right:12,left:-14,bottom:2}}>
      <CartesianGrid stroke="rgba(255,255,255,.05)"/>
      <XAxis type="number" dataKey="momentum" name="Momentum 7d" tick={{fill:'#65708f',fontSize:10}} axisLine={false} tickLine={false} unit="%"/>
      <YAxis type="number" dataKey="score" name="Score" domain={[35,100]} tick={{fill:'#65708f',fontSize:10}} axisLine={false} tickLine={false}/>
      <ZAxis type="number" dataKey="bubble" range={[70,520]}/>
      <ReferenceLine x={0} stroke="rgba(255,255,255,.16)" strokeDasharray="4 4"/>
      <ReferenceLine y={70} stroke="rgba(104,245,203,.22)" strokeDasharray="4 4"/>
      <Tooltip cursor={{strokeDasharray:'3 3'}} formatter={(value,name)=>name==='Momentum 7d'?[`${Number(value).toFixed(2)}%`,name]:[Number(value).toFixed(0),name]}/>
      <Scatter data={liquidity} name="Ativos">{liquidity.map((entry,index)=><Cell key={entry.symbol} fill={entry.color||COLORS[index%COLORS.length]} fillOpacity={.72}/>)}</Scatter>
     </ScatterChart>
    </ResponsiveContainer>
   </article>
  </div>

  <div className="kry-bottom-grid">
   <article className="kry-chart-panel kry-correlation-panel">
    <SectionTitle eyebrow="CORRELATION MATRIX" title="Dependência entre ativos" meta="Baseada nos retornos da série disponível" icon={FiLayers}/>
    <div className="kry-corr-grid" style={{'--corr-cols':correlationMatrix.length+1}}>
     <span/>{correlationMatrix.map((row)=><b key={`head-${row.symbol}`}>{row.symbol}</b>)}
     {correlationMatrix.flatMap((row)=>[
      <b key={`row-${row.symbol}`}>{row.symbol}</b>,
      ...row.cells.map((cell)=><span key={`${row.symbol}-${cell.symbol}`} style={{'--corr-alpha':Math.max(.08,Math.abs(cell.value)*.62),'--corr-hue':cell.value>=0?'156':'343'}} title={`${row.symbol} × ${cell.symbol}: ${cell.value.toFixed(2)}`}>{cell.value.toFixed(2)}</span>)
     ])}
    </div>
    <p className="kry-note">Correlação próxima de 1 indica movimentos semelhantes; próxima de -1 indica comportamento oposto. Não representa causalidade.</p>
   </article>

   <article className="kry-chart-panel">
    <SectionTitle eyebrow="CAPITAL VELOCITY" title="Giro de liquidez por ativo" meta="Volume / market cap" icon={FiActivity}/>
    <ResponsiveContainer width="100%" height={250}>
     <ComposedChart data={turnover} layout="vertical" margin={{top:6,right:18,left:0,bottom:0}}>
      <CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false}/>
      <XAxis type="number" tick={{fill:'#65708f',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(value)=>`${value.toFixed(1)}%`}/>
      <YAxis type="category" dataKey="symbol" tick={{fill:'#b7c0d8',fontSize:11,fontWeight:700}} axisLine={false} tickLine={false} width={46}/>
      <Tooltip formatter={(value)=>[`${Number(value).toFixed(2)}%`,'Giro']}/>
      <Bar dataKey="turnover" name="Giro" radius={[0,5,5,0]}>{turnover.map((entry,index)=><Cell key={entry.symbol} fill={COLORS[index%COLORS.length]}/>)}</Bar>
     </ComposedChart>
    </ResponsiveContainer>
   </article>
  </div>
 </section>;
}
