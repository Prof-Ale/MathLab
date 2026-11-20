#!/usr/bin/env node
/**
 * testes-arena.mjs
 * Testa a quantidade de questões da Arena e o sorteio sem repetição. Não modifica o app.
 *
 * Uso:  node testes-arena.mjs        (ou: node --test testes-arena.mjs)
 *
 * O que verifica, usando o código real de arena.js e os geradores reais de index.html:
 *   1. Opções de quantidade: 5, 10, 15, 20, 25 e 30, com padrão 15 e a escolha lembrada.
 *   2. A partida sempre traz exatamente a quantidade escolhida, mesmo com um só assunto de estoque pequeno.
 *   3. Os modelos (geradores) de um assunto entram em rodízio: nenhum é usado mais de uma vez
 *      a mais que os outros dentro da partida.
 *   4. Entre partidas seguidas, a memória reduz as questões repetidas.
 *   5. A memória tem limite e não cresce sem parar.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ARENA = readFileSync(join(AQUI, 'arena.js'), 'utf8');
const HTML = readFileSync(join(AQUI, 'index.html'), 'utf8');

// ---- semente ---------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const semear = n => { Math.random = mulberry32(n); };

// ---- ambiente mínimo (o mesmo princípio de testes-geradores.mjs) -----------
const noop = () => {};
const definir = (n, v) => { try { Object.defineProperty(globalThis, n, { value: v, writable: true, configurable: true }); } catch {} };
const fakeEl = new Proxy(function () {}, {
  get: (t, p) => (p === 'children' ? [] : (p === 'value' || p === 'textContent' || p === 'innerHTML') ? '' : p === Symbol.toPrimitive ? () => '' : fakeEl),
  set: () => true, apply: () => fakeEl, construct: () => fakeEl
});
definir('window', globalThis);
definir('document', { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => fakeEl, body: fakeEl, head: fakeEl, documentElement: { style: { setProperty: noop } }, addEventListener: noop, removeEventListener: noop });
const memoria = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
definir('localStorage', memoria);
for (const n of ['addEventListener', 'removeEventListener', 'alert']) definir(n, noop);
definir('devicePixelRatio', 1);
definir('getComputedStyle', () => ({ getPropertyValue: () => '' }));
for (const n of ['speechSynthesis', 'AudioContext', 'webkitAudioContext']) definir(n, undefined);
definir('SpeechSynthesisUtterance', class {});
definir('location', { protocol: 'file:', href: 'file:///test', search: '' });
definir('confirm', () => false); definir('prompt', () => null);
definir('fetch', () => Promise.reject(new Error('sem rede')));
definir('setTimeout', fn => { try { if (typeof fn === 'function') fn(); } catch {} return 0; });
definir('setInterval', () => 0); definir('clearInterval', noop); definir('clearTimeout', noop);
definir('requestAnimationFrame', noop); definir('Blob', class {}); definir('URL', { createObjectURL: () => '', revokeObjectURL: noop });
try { Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: noop }, userAgent: 'node-test' }, configurable: true }); } catch {}

// ---- geradores reais de index.html -----------------------------------------
const scripts = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let codigo = scripts.reduce((a, b) => (a.length > b.length ? a : b));
codigo = codigo.replace(/^\s*save\(\);\s*$/m, '').replace(/^\s*stats\(\);\s*home\(\);\s*ui\(\);\s*$/m, '')
  .replace(/^\s*if\s*\(S\.tema\)\s*tema\(S\.tema\);\s*$/m, '').replace(/^\s*if\s*\(S\.fs\)\s*\{[^}]*\}\s*$/m, '');
semear(1);
const MODS = new Function(`${codigo}\nreturn typeof MODS!=='undefined'?MODS:null;`)();
assert.ok(Array.isArray(MODS) && MODS.length > 50, 'MODS não carregou');

// ---- código real do sorteio em arena.js ------------------------------------
const bloco = ARENA.slice(ARENA.indexOf('/*SORTEIO-INI*/'), ARENA.indexOf('/*SORTEIO-FIM*/'));
const montarSrc = ARENA.slice(ARENA.indexOf('function montar(){'), ARENA.indexOf('function iniciar(){'));
assert.ok(bloco.length > 200 && montarSrc.length > 200, 'não achei o bloco do sorteio em arena.js');

const validarQuestao = c => !!c && typeof c.q === 'string' && c.q.length > 3 && Array.isArray(c.o) && c.o.length === 4 && new Set(c.o.map(String)).size === 4 && Number.isInteger(c.c) && c.c >= 0 && c.c < 4;
const sh = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

function criarArena(ids, total, nivel = 0) {
  const modsSel = MODS.filter(m => ids.includes(m.id));
  assert.equal(modsSel.length, ids.length, 'assunto não encontrado: ' + ids);
  const E = { sel: new Set(ids), total, nivel };
  const f = new Function('E', 'elegiveis', 'sh', 'PONTE', 'validarQuestao', 'localStorage',
    `${bloco}\n${montarSrc}\nreturn {montar, escolherGerador, SORT_MAX_Q, SORT_MAX_G, SORT_KEY};`);
  return { E, ...f(E, () => modsSel, sh, { setCur: noop }, validarQuestao, memoria) };
}
const limpar = () => { memoria._d = {}; };
const chaves = lista => lista.map(x => x.mod.id + '|' + x.q.q);

// ---- 1. opções, padrão e preferência ---------------------------------------
test('quantidade: opções 5, 10, 15, 20, 25 e 30, padrão 15, escolha lembrada', () => {
  assert.match(ARENA, /const TOTAIS=\[5,10,15,20,25,30\];/);
  assert.match(ARENA, /nivel:0,total:15,tempo:30/);
  assert.match(ARENA, /\$\{TOTAIS\.map\(n=>/);
  assert.match(ARENA, /total:E\.total\}\)\)/, 'a preferência deve gravar o total');
  assert.match(ARENA, /if\(TOTAIS\.includes\(p\.total\)\)E\.total=p\.total;/, 'a preferência deve ser lida só se for opção válida');
  assert.match(ARENA, /E\.total=\+\$\('cTotal'\)\.value;[^}]*salvarPref\(\)/, 'trocar o seletor deve gravar a escolha');
});

// ---- 2. quantidade exata ----------------------------------------------------
test('partida traz exatamente a quantidade escolhida, inclusive com assunto de estoque pequeno', () => {
  const casos = [['rigidez'], ['tabmul'], ['pit'], ['poligonos', 'mmc'], MODS.slice(0, 5).map(m => m.id), MODS.map(m => m.id)];
  for (const ids of casos) for (const total of [5, 10, 15, 20, 25, 30]) {
    limpar(); semear(100 + total);
    const A = criarArena(ids, total);
    const lista = A.montar();
    assert.equal(lista.length, total, `${ids.slice(0, 3)} total ${total}`);
    for (const x of lista) assert.ok(validarQuestao(x.q));
  }
});

// ---- 3. rodízio de modelos --------------------------------------------------
test('rodízio: dentro da partida, os modelos de um assunto são usados de forma equilibrada', () => {
  for (const id of ['funcafim', 'funcquad', 'pa', 'rigidez', 'poligonos', 'combinatoria']) {
    const m = MODS.find(x => x.id === id); assert.ok(m, 'assunto não encontrado: ' + id);
    limpar(); semear(7);
    const A = criarArena([id], 15, 0);
    A.montar();
    const R = JSON.parse(memoria.getItem(A.SORT_KEY));
    for (const nv of [1, 2, 3]) {
      const uso = R.g[id + '|' + nv] || [];
      const n = (m.gens[nv] || m.gens[1]).length;
      const cont = new Array(n).fill(0); uso.forEach(i => cont[i]++);
      assert.equal(uso.length, 5, `${id} N${nv}: 5 questões por nível em 15`);
      assert.ok(Math.max(...cont) - Math.min(...cont) <= 1, `${id} N${nv} desequilibrado: ${cont}`);
    }
  }
});

// ---- 4. memória entre partidas ---------------------------------------------
test('memória: partidas seguidas repetem menos questões do que sem memória', () => {
  const ids = ['rigidez', 'poligonos', 'pit'];
  let comMem = 0, semMem = 0;
  for (let rep = 0; rep < 20; rep++) {
    // sem memória: limpa entre as duas partidas
    limpar(); semear(500 + rep);
    let A = criarArena(ids, 15); const p1 = chaves(A.montar());
    limpar(); semear(900 + rep);
    A = criarArena(ids, 15); const p2 = new Set(chaves(A.montar()));
    semMem += p1.filter(k => p2.has(k)).length;
    // com memória: mantém entre as duas
    limpar(); semear(500 + rep);
    A = criarArena(ids, 15); const q1 = chaves(A.montar());
    semear(900 + rep);
    A = criarArena(ids, 15); const q2 = new Set(chaves(A.montar()));
    comMem += q1.filter(k => q2.has(k)).length;
  }
  assert.ok(comMem < semMem, `com memória ${comMem} deve ser menor que sem memória ${semMem}`);
});

test('memória de questões: assunto de modelo único (só 45 questões possíveis) não repete na partida seguinte', () => {
  // tabmul no nível 1 tem um único gerador: o rodízio não ajuda, só a memória de questões evita repetir.
  let comMem = 0, semMem = 0;
  for (let rep = 0; rep < 10; rep++) {
    limpar(); semear(3000 + rep);
    let A = criarArena(['tabmul'], 10, 1); const p1 = chaves(A.montar());
    A = criarArena(['tabmul'], 10, 1); const p2 = new Set(chaves(A.montar()));
    comMem += p1.filter(k => p2.has(k)).length;
    limpar(); semear(3000 + rep);
    A = criarArena(['tabmul'], 10, 1); const q1 = chaves(A.montar());
    limpar();
    A = criarArena(['tabmul'], 10, 1); const q2 = new Set(chaves(A.montar()));
    semMem += q1.filter(k => q2.has(k)).length;
  }
  assert.equal(comMem, 0, 'com memória não deve repetir');
  assert.ok(semMem > 0, 'o cenário precisa ser capaz de repetir sem memória (senão o teste não prova nada)');
});

// ---- 5. limites da memória --------------------------------------------------
test('memória tem limite: não passa de 600 questões nem de 12 usos por modelo', () => {
  limpar(); semear(42);
  const ids = MODS.map(m => m.id);
  for (let i = 0; i < 40; i++) criarArena(ids, 30).montar();
  const A = criarArena(ids, 5);
  const R = JSON.parse(memoria.getItem(A.SORT_KEY));
  assert.ok(R.q.length <= A.SORT_MAX_Q, 'questões lembradas: ' + R.q.length);
  for (const [k, uso] of Object.entries(R.g)) assert.ok(uso.length <= A.SORT_MAX_G, k);
});

test('memória corrompida não derruba o sorteio', () => {
  limpar(); memoria.setItem('mathlab-arena-recentes', '{isto não é json');
  semear(3);
  const A = criarArena(['funcafim'], 10);
  assert.equal(A.montar().length, 10);
  memoria.setItem('mathlab-arena-recentes', JSON.stringify({ q: 'x', g: [1, 2] }));
  assert.equal(criarArena(['funcafim'], 10).montar().length, 10);
});
