export const normalizeSearchValue=(value='')=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

export function buildSearchResults(query,{assets=[],positions=[],navigation=[]}={}){
 const term=normalizeSearchValue(query);
 if(!term)return [];
 const includes=(...values)=>values.some((value)=>normalizeSearchValue(value).includes(term));
 const results=[];
 navigation.forEach(([id,label])=>{if(includes(label,id))results.push({key:`nav:${id}`,kind:'Seção',label,description:'Abrir área da Kryvion',page:id,icon:'nav'});});
 assets.forEach((asset)=>{
  if(!includes(asset.symbol,asset.name,asset.id))return;
  const score=Math.round(Number(asset.score||0));
  results.push({key:`asset:${asset.id}`,kind:'Ativo',label:`${asset.symbol} · ${asset.name}`,description:`Preço atual · score ${score}/100`,page:'radar',icon:'asset'});
  const signal=score>=75?'Momentum e liquidez alinhados':score>=60?'Confluência parcial':'Risco supera oportunidade';
  results.push({key:`signal:${asset.id}`,kind:'Sinal',label:`${asset.symbol} · ${signal}`,description:`Confiança ${Math.round(Number(asset.confidence||0))}%`,page:'signals',icon:'signal'});
 });
 positions.forEach((position)=>{if(includes(position.symbol,position.name,position.asset_id,position.label))results.push({key:`position:${position.id||position.asset_id}`,kind:'Posição',label:`${position.symbol||position.asset_id}`,description:position.name||'Posição da sua carteira',page:'portfolio',icon:'position'});});
 return results.slice(0,8);
}
