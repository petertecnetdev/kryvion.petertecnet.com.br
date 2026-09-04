import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSearchResults,normalizeSearchValue} from '../src/services/search.js';

const context={
 navigation:[['overview','Visão geral'],['portfolio','Portfólio'],['signals','Sinais']],
 assets:[{id:'bitcoin',symbol:'BTC',name:'Bitcoin',score:82,confidence:76}],
 positions:[{id:4,asset_id:'bitcoin',symbol:'BTC',name:'Bitcoin'}],
};

test('normaliza acentos e caixa para busca previsível',()=>assert.equal(normalizeSearchValue(' Portfólio '),'portfolio'));
test('encontra ativo, sinal e posição pelo símbolo',()=>{
 const results=buildSearchResults('btc',context);
 assert.deepEqual(results.map((item)=>item.kind),['Ativo','Sinal','Posição']);
});
test('encontra navegação ignorando acentos',()=>assert.equal(buildSearchResults('portfolio',context)[0]?.page,'portfolio'));
test('limita resultados para proteger a paleta',()=>{
 const many={assets:Array.from({length:20},(_,i)=>({id:`asset-${i}`,symbol:`A${i}`,name:`Asset ${i}`}))};
 assert.equal(buildSearchResults('a',many).length,8);
});