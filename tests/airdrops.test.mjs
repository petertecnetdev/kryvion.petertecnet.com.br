import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const entry=readFileSync(new URL('../src/entry.jsx',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/components/AirdropsPage.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/airdrops-native.css',import.meta.url),'utf8');

test('Airdrops é navegação nativa e lazy-loaded',()=>{
 assert.match(main,/AirdropsPage=lazy/);
 assert.match(main,/\['airdrops','Airdrops'/);
 assert.match(main,/page==='airdrops'/);
 assert.doesNotMatch(entry,/airdrops-entry\.jsx/);
});

test('Airdrops mantém guardrails e estados resilientes',()=>{
 assert.match(page,/somente leitura/i);
 assert.match(page,/seed phrase/i);
 assert.match(page,/modo resiliente/i);
 assert.match(page,/requires_market_manipulation/);
});

test('Airdrops cobre breakpoints móveis críticos',()=>{
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css,/grid-template-columns:1fr/);
});
