import React from 'react';
import {Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';

const fmtBRL=(value)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:Number(value)<10?2:0}).format(Number(value||0));

export default function StressScenarioChart({total}){
 const chart=Array.from({length:9},(_,index)=>{const move=-40+index*10;return {move:`${move}%`,value:Math.max(0,total*(1+move/100))};});
 return <div className="chart-big"><ResponsiveContainer width="100%" height={320}><AreaChart data={chart}><defs><linearGradient id="kry-stress-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b3dff" stopOpacity={.5}/><stop offset="100%" stopColor="#8b3dff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="move" stroke="#727a95"/><YAxis stroke="#727a95" tickFormatter={(value)=>`R$${Math.round(value/1000)}k`}/><Tooltip formatter={(value)=>fmtBRL(value)}/><Area dataKey="value" stroke="#aa63ff" fill="url(#kry-stress-fill)"/></AreaChart></ResponsiveContainer></div>;
}
