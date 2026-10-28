#!/usr/bin/env node
/**
 * testes-geradores.mjs  (versão 2)
 * Valida os geradores de questões e os simuladores do MathLab. Não modifica o app.
 *
 * Uso:
 *   node testes-geradores.mjs [arquivo.html] [opções]
 *
 * Opções:
 *   --rodadas=N     sorteios por gerador (padrão 1000)
 *   --seed=N        semente do sorteio (padrão 20261017). Uma falha se repete com a mesma semente.
 *   --modulo=a,b    testa só esses módulos (ids do MODS, por exemplo: med,prob)
 *   --estrito       avisos também reprovam (exit 1)
 *   --verbose       lista também os avisos de cada gerador
 *
 * O que verifica, por gerador:
 *   1. Forma: enunciado, 4 alternativas diferentes, índice certo, explicação, dicas, tg/ms coerentes.
 *   2. Texto: NaN, undefined, decimais longos, concordância conhecida ("azuls"), palavras repetidas.
 *   3. Resposta: recalcula a resposta correta por fora do app e compara (onde há conferência em CONF).
 *   4. Estado do simulador (campo s): só usa controles que existem e valores dentro do intervalo.
 *   5. Variedade: avisa se o gerador produz poucos enunciados diferentes.
 * E, por módulo:
 *   6. Simulador: fix, info, desc e draw em grade de valores (inclusive fora do intervalo) e em cada
 *      estado s das questões, com o botão de resposta liberado e travado.
 *   7. Acessibilidade (Fase 5.3): desc(v), a descrição do desenho para leitor de tela, existe e
 *      devolve texto válido. Módulo sem desc() gera aviso.
 *
 * Para cobrir um módulo novo com conferência de resposta, acrescente uma entrada em CONF.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- 0. Argumentos ----------------------------------------------------------
const args = process.argv.slice(2);
const opt = (nome, padrao) => {
  const a = args.find(x => x.startsWith(`--${nome}=`));
  return a ? a.split('=')[1] : padrao;
};
const flag = nome => args.includes(`--${nome}`);
const RODADAS = Number(opt('rodadas', 1000));
const SEMENTE = Number(opt('seed', 20261017));
const SO_MODULOS = opt('modulo', '') ? opt('modulo', '').split(',') : null;
const ESTRITO = flag('estrito');
const VERBOSE = flag('verbose');

const CANDIDATOS = ['index.html', 'index (2).html', 'index.HTML', 'index.htm'];
const arqArg = args.find(a => !a.startsWith('--'));
const HTML = arqArg ? (existsSync(arqArg) ? arqArg : null) : CANDIDATOS.map(n => join(__dirname, n)).find(p => existsSync(p));
if (!HTML) {
  console.error('Não encontrei o HTML. Passe o caminho ou coloque "index.html" na mesma pasta.');
  process.exit(1);
}
console.log(`Arquivo: ${HTML}`);
console.log(`Rodadas: ${RODADAS} por gerador | semente: ${SEMENTE}\n`);

// ---- 1. Sorteio com semente (para reproduzir falhas) ------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const semear = chave => { Math.random = mulberry32((SEMENTE ^ hash(chave)) >>> 0); };

// ---- 2. Ambiente mínimo para rodar o script do app sem navegador ------------
const noop = () => {};
function definir(nome, valor) {
  try { Object.defineProperty(globalThis, nome, { value: valor, writable: true, configurable: true }); } catch {}
}
const fakeEl = new Proxy(function () {}, {
  get: (t, p) => {
    if (p === 'style' || p === 'classList' || p === 'dataset') return fakeEl;
    if (p === 'children') return [];
    if (p === 'value' || p === 'textContent' || p === 'innerHTML') return '';
    if (p === Symbol.toPrimitive) return () => '';
    return fakeEl;
  },
  set: () => true, apply: () => fakeEl, construct: () => fakeEl
});
definir('window', globalThis);
definir('document', {
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => fakeEl, body: fakeEl, head: fakeEl,
  documentElement: { style: { setProperty: noop } }, addEventListener: noop, removeEventListener: noop
});
definir('localStorage', { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } });
for (const n of ['addEventListener', 'removeEventListener', 'alert']) definir(n, noop);
definir('devicePixelRatio', 1);
definir('getComputedStyle', () => ({ getPropertyValue: () => '' }));
for (const n of ['speechSynthesis', 'AudioContext', 'webkitAudioContext']) definir(n, undefined);
definir('SpeechSynthesisUtterance', class {});
definir('location', { protocol: 'file:', href: 'file:///test', search: '' });
definir('confirm', () => false);
definir('prompt', () => null);
definir('fetch', () => Promise.reject(new Error('sem rede nos testes')));
definir('setTimeout', fn => { try { if (typeof fn === 'function') fn(); } catch {} return 0; });
definir('setInterval', () => 0);
definir('clearInterval', noop);
definir('clearTimeout', noop);
definir('requestAnimationFrame', noop);
definir('Blob', class {});
definir('URL', { createObjectURL: () => '', revokeObjectURL: noop });
try {
  Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: noop }, userAgent: 'node-test' }, configurable: true });
} catch {}

// ---- 3. Carrega o script principal ------------------------------------------
const html = readFileSync(HTML, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) { console.error('Nenhum <script> encontrado no HTML.'); process.exit(1); }
let codigo = scripts.reduce((a, b) => (a.length > b.length ? a : b));

// Remove as chamadas finais que dependem da interface. Avisa se alguma não foi encontrada.
const AVISOS_CARGA = [];
const tirar = (re, nome) => { if (re.test(codigo)) codigo = codigo.replace(re, ''); else AVISOS_CARGA.push(nome); };
tirar(/^\s*save\(\);\s*$/m, 'save();');
tirar(/^\s*stats\(\);\s*home\(\);\s*ui\(\);\s*$/m, 'stats(); home(); ui();');
codigo = codigo.replace(/^\s*if\s*\(S\.tema\)\s*tema\(S\.tema\);\s*$/m, '');
codigo = codigo.replace(/^\s*if\s*\(S\.fs\)\s*\{[^}]*\}\s*$/m, '');

semear('carga');
let ctx;
try {
  ctx = new Function(`
    ${codigo}
    return {
      MODS: typeof MODS !== 'undefined' ? MODS : null,
      setLocked: typeof locked !== 'undefined' ? (v => { locked = v; }) : null
    };
  `)();
} catch (e) {
  console.error('Falha ao executar o script principal:', e.message);
  console.error(e.stack);
  process.exit(1);
}
if (!Array.isArray(ctx.MODS) || !ctx.MODS.length) { console.error('MODS não encontrado.'); process.exit(1); }
if (AVISOS_CARGA.length) console.log(`Aviso: não achei estas linhas finais no script (pode ser normal): ${AVISOS_CARGA.join(', ')}\n`);

// ---- 4. Utilitários de conferência ------------------------------------------
const pt = s => parseFloat(String(s).replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.').replace('%', '').replace('−', '-'));
const nums = s => (String(s).replace(/−/g, '-').match(/-?\d+/g) || []).map(Number);
const perto = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const mdc = (a, b) => (b ? mdc(b, a % b) : a);
const frac = (n, d) => { if (n === 0) return '0'; if (n === d) return '1'; const g = mdc(n, d); return `${n / g}/${d / g}`; };
const fmt = x => { const r = Math.round(x * 1e4) / 1e4; return String(r).replace('.', ','); };
const quad = (x, y) => (x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : x > 0 && y < 0 ? 'IV' : '');
const SUPM = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
const avalia = s => Function('return ' + s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/[\[{]/g, '(').replace(/[\]}]/g, ')'))();
const T = { mm: .001, cm: .01, m: 1, km: 1000, mg: .001, g: 1, kg: 1000, s: 1, min: 60, h: 3600, mL: 1, L: 1000 };
const primo = n => n > 1 && [...Array(n).keys()].slice(2).every(d => n % d);
const faces = [1, 2, 3, 4, 5, 6];
const estat = d => {
  const o = [...d].sort((a, b) => a - b), n = o.length;
  const media = d.reduce((a, b) => a + b, 0) / n;
  const med = n % 2 ? o[(n - 1) / 2] : (o[n / 2 - 1] + o[n / 2]) / 2;
  const f = {}; d.forEach(x => (f[x] = (f[x] || 0) + 1));
  const mx = Math.max(...Object.values(f));
  return { media, med, modas: Object.keys(f).filter(k => f[k] === mx).map(Number).sort((a, b) => a - b) };
};

// Conferências de resposta. Chave "modulo:nivel:gerador" (gerador começa em 1; "*" vale para todos os níveis).
// Cada função recebe a questão e devolve null se estiver certa, ou um texto explicando o erro.
// Ela deve recalcular a resposta só a partir do enunciado, sem usar código do app.
const certo = q => q.o[q.c];
const igual = (got, esp) => (String(got) === String(esp) ? null : `resposta "${got}", esperado "${esp}"`);
const igualNum = (got, esp, tol) => (perto(got, esp, tol) ? null : `resposta ${got}, esperado ${esp}`);

const CONF = {
  // ---------- pot ----------
  'pot:1:1': q => { const m = q.q.match(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/); const e = [...m[2]].reduce((a, c) => a * 10 + SUPM[c], 0); return igualNum(Number(certo(q)), Number(m[1]) ** e); },
  'pot:2:1': q => { const m = q.q.match(/√(\d+)/); return igualNum(Number(certo(q)) ** 2, Number(m[1])); },
  'pot:2:4': q => { const z = Number(q.q.match(/√(\d+)/)[1]); const [a, b] = certo(q).split(' e ').map(Number); return a * a < z && z < b * b && b === a + 1 ? null : `"${certo(q)}" não envolve √${z}`; },
  // ---------- expr ----------
  'expr:*:1': q => igualNum(pt(certo(q)), avalia(q.q.match(/valor de (.*)\?$/)[1]), 1e-9),
  'expr:*:3': q => igualNum(avalia(certo(q)), avalia(q.q.match(/passo de (.*), como/)[1]), 1e-9),
  // ---------- dec ----------
  'dec:1:1': q => igualNum(pt(certo(q)), (m => m[1] / m[2])(q.q.match(/fração (\d+)\/(\d+)/)), 1e-3),
  'dec:1:2': q => igualNum(pt(certo(q)), pt(q.q.match(/Escreva ([\d,]+)/)[1]) * 100, 1e-3),
  'dec:1:3': q => igualNum(pt(certo(q)), q.q.match(/é (\d+)%/)[1] / 100, 1e-3),
  'dec:1:4': q => { const m = q.q.match(/maior: ([\d,]+) ou ([\d,]+)/); return igualNum(pt(certo(q)), Math.max(pt(m[1]), pt(m[2])), 1e-3); },
  'dec:2:1': q => { const m = q.q.match(/([\d,]+) ([+−]) ([\d,]+)/); const a = pt(m[1]), b = pt(m[3]); return igualNum(pt(certo(q)), m[2] === '+' ? a + b : a - b, 1e-3); },
  'dec:2:2': q => { const m = q.q.match(/([\d,]+) × (\d+)/); return igualNum(pt(certo(q)), pt(m[1]) * pt(m[2]), 1e-3); },
  'dec:2:3': q => { const m = q.q.match(/([\d,]+) × (\d+)/); return igualNum(pt(certo(q)), pt(m[1]) * pt(m[2]), 1e-3); },
  'dec:2:4': q => { const m = q.q.match(/custa (R\$ [\d.,]+)\. .* (\d+) canetas/); return igualNum(pt(certo(q)), pt(m[1]) * Number(m[2]), 1e-3); },
  'dec:3:1': q => { const m = q.q.match(/(\d+)% de (\d+)/); return igualNum(pt(certo(q)), m[1] * m[2] / 100, 1e-3); },
  'dec:3:2': q => { const m = q.q.match(/R\$ (\d+),00 está com (\d+)%/); return igualNum(pt(certo(q)), m[1] * (1 - m[2] / 100), 1e-3); },
  'dec:3:3': q => { const m = q.q.match(/R\$ (\d+),00 sofreu aumento de (\d+)%/); return igualNum(pt(certo(q)), m[1] * (1 + m[2] / 100), 1e-3); },
  'dec:3:4': q => { const m = q.q.match(/(\d+) alunos, (\d+)%/); return igualNum(pt(certo(q)), m[1] * m[2] / 100, 1e-3); },
  // ---------- cart ----------
  'cart:1:1': q => { const [x, y] = nums(q.q); return igual(certo(q), 'Quadrante ' + quad(x, y)); },
  'cart:1:2': q => { const w = q.q.match(/quadrante (\w+)\?/)[1], [x, y] = nums(certo(q)); return igual(quad(x, y), w); },
  'cart:1:3': q => { const [x, y] = nums(q.q); return igual(certo(q), x === 0 && y === 0 ? 'na origem' : y === 0 ? 'sobre o eixo x' : 'sobre o eixo y'); },
  'cart:1:4': q => { const m = q.q.match(/ande (\d+) para a (direita|esquerda) e (\d+) para (cima|baixo)/); return igual(certo(q), `(${m[2] === 'esquerda' ? '−' : ''}${m[1]}, ${m[4] === 'baixo' ? '−' : ''}${m[3]})`); },
  'cart:2:2': q => { const [x, y] = nums(q.q); return igual(nums(certo(q)).join(), [x, -y].join()); },
  'cart:2:3': q => { const [x, y] = nums(q.q); return igual(nums(certo(q)).join(), [-x, y].join()); },
  'cart:2:4': q => { const [x, y, a, b] = nums(q.q); const h = /direita/.test(q.q) ? 1 : -1, v = /para cima/.test(q.q) ? 1 : -1; return igual(nums(certo(q)).join(), [x + h * a, y + v * b].join()); },
  'cart:3:1': q => { const [a, b, c, d] = nums(q.q); return igual(certo(q), Math.abs(a - c) + Math.abs(b - d)); },
  'cart:3:2': q => { const [a, b, c, d] = nums(q.q); return igual(certo(q), Math.hypot(c - a, d - b)); },
  'cart:3:3': q => { const [a, b, c, d] = nums(q.q); return igual(certo(q), 2 * (Math.abs(c - a) + Math.abs(d - b))); },
  'cart:3:4': q => { const n = nums(q.q); if (/^Um retângulo/.test(q.q)) return igual(certo(q), Math.abs(n[2] - n[0]) * Math.abs(n[3] - n[1])); return igual(certo(q), Math.abs(n[2] - n[0]) * Math.abs(n[5] - n[1]) / 2); },
  // ---------- med ----------
  'med:1:*': q => { const m = q.q.match(/Converta ([\d.,]+) (\S+) em (\S+)\./); return igualNum(pt(certo(q)), pt(m[1]) * T[m[2]] / T[m[3]]); },
  'med:2:1': q => { const m = q.q.match(/^(\d+) (\S+) (\d+) (\S+) = \? (\S+)$/); return igualNum(pt(certo(q)), pt(m[1]) * T[m[2]] / T[m[5]] + pt(m[3]) * T[m[4]] / T[m[5]]); },
  'med:2:2': q => { const m = q.q.match(/Quanto é ([\d.,]+) (\S+) \+ (\d+) (\S+), em (\S+)\?/); return igualNum(pt(certo(q)), pt(m[1]) * T[m[2]] / T[m[5]] + pt(m[3]) * T[m[4]] / T[m[5]]); },
  'med:2:3': q => { const m = q.q.match(/Quanto é ([\d.,]+) (\S+) − (\d+) (\S+), em (\S+)\?/); return igualNum(pt(certo(q)), pt(m[1]) * T[m[2]] / T[m[5]] - pt(m[3]) * T[m[4]] / T[m[5]]); },
  'med:2:4': q => { const m = q.q.match(/maior: (\d+) (\S+) ou (\d+) (\S+)\?/); const A = pt(m[1]) * T[m[2]], B = pt(m[3]) * T[m[4]]; return igual(certo(q), perto(A, B) ? 'São iguais' : A > B ? `${m[1]} ${m[2]} é maior` : `${m[3]} ${m[4]} é maior`); },
  'med:3:3': q => {
    if (/receita/.test(q.q)) return igualNum(pt(certo(q)), pt(q.q.match(/Para (\d+) porções/)[1]) * 250 / 1000);
    const m = q.q.match(/dura (\d+) h (\d+) min\. Já se passaram (\d+) h (\d+) min/); const f = (+m[1] * 60 + +m[2]) - (+m[3] * 60 + +m[4]); const hh = Math.floor(f / 60), mi = f % 60;
    return igual(certo(q), hh ? `${hh} h ${mi} min` : `${mi} min`);
  },
  'med:3:4': q => { const m = q.q.match(/há em (\d+) (\S+)\?/); return igualNum(pt(certo(q)), pt(m[1]) * { km: 1e6, h: 3600, kg: 1e6 }[m[2]]); },
  // ---------- prob ----------
  'prob:1:1': q => { const p = predDado(q.q); return p ? igual(certo(q), frac(faces.filter(p).length, 6)) : 'predicado de dado não reconhecido pelo teste'; },
  'prob:1:4': q => { const p = predDado(q.q); return p ? igual(certo(q), frac(faces.filter(p).length, 6)) : 'predicado de dado não reconhecido pelo teste'; },
  'prob:1:2': q => {
    const esp = /duas darem cara/.test(q.q) ? '1/4' : /exatamente uma cara/.test(q.q) ? '1/2' : /uma vez.*cara/.test(q.q) ? '1/2' : null;
    return esp ? igual(certo(q), esp) : 'enunciado de moeda não reconhecido pelo teste';
  },
  'prob:1:3': q => {
    // O enunciado pode vir em dois formatos:
    //   antigo: "tem 2 bolas vermelhas, 2 azuis e 2 verdes."
    //   novo:   "tem 2 bolas vermelhas, 2 bolas azuis e 2 bolas verdes."
    // Aceitamos os dois, com ou sem "bolas" antes de cada cor.
    const m = q.q.match(/tem (\d+) (?:bolas? )?vermelhas?, (\d+) (?:bolas? )?(?:azuis?|azul) e (\d+) (?:bolas? )?(?:verdes?|verde)\./);
    if (!m) return 'o teste não reconheceu o enunciado da urna';
    const cm = q.q.match(/bola (vermelha|azul|verde)\?/);
    if (!cm) return 'o teste não reconheceu a cor pedida';
    const v = { vermelha: +m[1], azul: +m[2], verde: +m[3] };
    return igual(certo(q), frac(v[cm[1]], +m[1] + +m[2] + +m[3]));
  },
  'prob:2:1': q => { const m = q.q.match(/lançada (\d+) vezes e deu cara (\d+) vezes/); return igualNum(pt(certo(q)), Math.round(m[2] / m[1] * 100)); },
  'prob:2:2': q => { const m = q.q.match(/Em (\d+) sorteios.*saiu bola \w+ (\d+) vezes/); return igual(certo(q), frac(+m[2], +m[1])); },
  'prob:2:3': q => { const m = q.q.match(/Em (\d+) lançamentos, saíram (\d+) caras \((\d+)%\)/); return igual(+m[3], Math.round(m[2] / m[1] * 100)); },
  'prob:2:4': q => {
    // "Qual grupo de lançamentos tende a dar a frequência mais próxima da teórica?"
    // A resposta correta é o MAIOR número de lançamentos.
    const ok = certo(q);
    const nOk = Number(String(ok).replace(/\D/g,''));
    if (!Number.isFinite(nOk)) return 'alternativa correta não tem número';
    const outros = q.o.filter(o => o !== ok).map(o => Number(String(o).replace(/\D/g,'')));
    return outros.every(x => !Number.isFinite(x) || x < nOk)
      ? null
      : 'a alternativa correta não é o maior número de lançamentos';
  },
  'prob:3:1': q => igualNum(pt(certo(q)), estat(nums(q.q.split('formam')[0])).media),
  'prob:3:2': q => igualNum(pt(certo(q)), estat(nums(q.q.split('formam')[0])).med),
  'prob:3:3': q => igual(certo(q), estat(nums(q.q.split('formam')[0])).modas.join(' e ')),
  'prob:3:4': q => {
    const lista = (q.q.match(/R\$ [\d.]+/g) || []).map(pt); const e = estat(lista);
    const val = (certo(q).match(/R\$ ([\d.]+)/) || [])[1];
    return /^A mediana/.test(certo(q)) && pt(val) === e.med ? null : `esperava "A mediana (R$ ${e.med})", veio "${certo(q)}"`;
  }
  ,
  // ---------- func ----------
  'func:1:1': q => {
    const m = q.q.match(/quando x vale (.*), o valor de y é (.*), nessa ordem/); if (!m) return 'enunciado não reconhecido';
    const xs = nums(m[1]), ys = nums(m[2]);
    const serve = o => xs.every((x, i) => fnAval(o.replace(/^f\(x\) = /, ''), x) === ys[i]);
    if (!serve(certo(q))) return `"${certo(q)}" não reproduz a tabela`;
    const outras = q.o.filter((o, i) => i !== q.c && serve(o));
    return outras.length ? `alternativa errada também serve: "${outras[0]}"` : null;
  },
  'func:1:2': q => { const m = q.q.match(/Se f\(x\) = (.*), quanto vale f\((.*)\)\?/); return igualNum(pt(certo(q)), fnAval(m[1], pt(m[2]))); },
  'func:1:3': q => {
    const x = pt(q.q.match(/quando x = (−?\d+)/)[1]);
    if (!q.s || q.s.oc !== 1) return 'o gráfico deveria estar com a expressão escondida (oc = 1)';
    return igualNum(pt(certo(q)), q.s.a * x + q.s.b);
  },
  'func:1:4': q => {
    const nao = /NÃO é uma função/.test(q.q);
    const ehFuncao = o => { const P = [...o.matchAll(/\((\d+), (\d+)\)/g)].map(m => [m[1], m[2]]); const mp = {}; return P.every(([x, y]) => (mp[x] === undefined ? (mp[x] = y, true) : mp[x] === y)); };
    const bate = q.o.map(ehFuncao).map(f => (nao ? !f : f));
    if (bate.filter(Boolean).length !== 1) return `${bate.filter(Boolean).length} alternativas atendem ao enunciado`;
    return bate[q.c] ? null : 'a alternativa marcada como certa não atende ao enunciado';
  },
  'func:2:1': q => {
    const rhs = q.q.match(/f\(x\) = (.*?)(?:,| corta)/)[1], f0 = fnAval(rhs, 0), f1 = fnAval(rhs, 1);
    if (/coeficiente angular/.test(q.q)) return igualNum(pt(certo(q)), f1 - f0);
    if (/termo independente/.test(q.q)) return igualNum(pt(certo(q)), f0);
    if (/corta o eixo y/.test(q.q)) return igual(certo(q), `(0, ${f0 < 0 ? '−' + (-f0) : f0})`);
    return 'variante não reconhecida';
  },
  'func:2:2': q => {
    const rhs = q.q.match(/A função f\(x\) = (.*) é crescente/)[1], d = fnAval(rhs, 1) - fnAval(rhs, 0);
    return igual(certo(q), d > 0 ? 'crescente' : d < 0 ? 'decrescente' : 'constante');
  },
  'func:2:3': q => { const rhs = q.q.match(/função f\(x\) = (.*?), isto é/)[1]; return igualNum(fnAval(rhs, pt(certo(q))), 0, 1e-9); },
  'func:2:4': q => {
    const m = q.q.match(/R\$ (\d+),00 .*? mais R\$ (\d+),00/); if (!m) return 'enunciado não reconhecido';
    const B = +m[1], p = +m[2];
    if (/Qual expressão/.test(q.q)) { const r = certo(q).replace(/^C\(x\) = /, ''); return fnAval(r, 0) === B && fnAval(r, 1) === B + p && fnAval(r, 5) === B + 5 * p ? null : `"${certo(q)}" não é ${p}x + ${B}`; }
    if (/Qual é o custo de/.test(q.q)) { const d = +q.q.match(/custo de \D*?(\d+)/)[1]; return igualNum(pt(certo(q)), p * d + B); }
    if (/custo total foi/.test(q.q)) { const P = +q.q.match(/custo total foi R\$ (\d+),00/)[1]; return igualNum(Number(certo(q)), (P - B) / p); }
    return 'variante não reconhecida';
  },
  'func:3:1': q => {
    if (!q.s || q.s.oc !== 1) return 'o gráfico deveria estar com a expressão escondida (oc = 1)';
    const { a, b } = q.s;
    if (/expressão/.test(q.q)) { const r = certo(q).replace(/^f\(x\) = /, ''); return fnAval(r, 0) === b && fnAval(r, 1) - fnAval(r, 0) === a ? null : `"${certo(q)}" não bate com a=${a}, b=${b} do simulador`; }
    if (/corta o eixo x/.test(q.q)) return igualNum(a * pt(certo(q)) + b, 0, 1e-9);
    if (/coeficiente angular/.test(q.q)) return igualNum(pt(certo(q)), a);
    return 'variante não reconhecida';
  },
  'func:3:2': q => { const m = q.q.match(/Se f\(x\) = (.*), quanto vale f\((.*)\)\?/); return igualNum(pt(certo(q)), fnAval(m[1], pt(m[2]))); },
  'func:3:3': q => {
    const m = q.q.match(/f\(x\) = (.*?) e g\(x\) = (.*?)\. Qual/), a1 = fnAval(m[1], 1) - fnAval(m[1], 0), a2 = fnAval(m[2], 1) - fnAval(m[2], 0);
    return igual(certo(q), a1 > a2 ? 'f cresce mais rápido' : a2 > a1 ? 'g cresce mais rápido' : 'as duas crescem na mesma velocidade');
  },
  'func:3:4': q => {
    const rhs = q.q.match(/h\(t\) = (.*?), em que/)[1], h = t => fnAval(rhs, t);
    let tm = 0, hm = -1e9; for (let t = 0; t <= 12; t += 0.5) if (h(t) > hm) { hm = h(t); tm = t; }
    if (/altura máxima atingida/.test(q.q)) return igual(certo(q), `${hm} m`);
    if (/instante a bola atinge a altura máxima/.test(q.q)) return igual(certo(q), `${tm} s`);
    if (/volta ao chão/.test(q.q)) { let z = null; for (let t = 1; t <= 12; t++) if (h(t) === 0) { z = t; break; } return igual(certo(q), `${z} s`); }
    return 'variante não reconhecida';
  },
  // ---------- pi ----------
  'pi:1:1': q => { const m = q.q.match(/tem (raio|diâmetro) (\d+) cm/); return igualNum(pt(certo(q)), m[1] === 'raio' ? 2 * +m[2] : +m[2] / 2); },
  'pi:1:2': q => {
    const t = q.q, esp = /volta completa/.test(t) ? 'circunferência' : /passa pelo centro/.test(t) ? 'diâmetro' : /liga o centro/.test(t) ? 'raio' : /espaço existe dentro/.test(t) ? 'área' : null;
    return esp ? igual(certo(q), esp) : 'enunciado não reconhecido';
  },
  'pi:1:3': q => { const m = q.q.match(/volta de .*: ([\d,]+) cm\. O diâmetro mede (\d+) cm/); return igualNum(pt(certo(q)), pt(m[1]) / +m[2], 1e-3); },
  'pi:1:4': q => { const D = +q.q.match(/diâmetro (\d+) cm/)[1]; return igualNum(pt(certo(q)), 3 * D); },
  'pi:2:1': q => { const r = +q.q.match(/raio (\d+) cm/)[1]; return igualNum(pt(certo(q)), 2 * 3.14 * r, 1e-6); },
  'pi:2:2': q => {
    const d = +q.q.match(/diâmetro (\d+) cm/)[1];
    const pi = /25\/8/.test(q.q) ? 25 / 8 : /22\/7/.test(q.q) ? 22 / 7 : 3.14;
    return igualNum(pt(certo(q)), pi * d, 1e-6);
  },
  'pi:2:3': q => { const m = q.q.match(/raio (\d+) cm\. Quantos centímetros .* em (\d+) voltas/); return igualNum(pt(certo(q)), 2 * 3.14 * m[1] * m[2], 1e-6); },
  'pi:2:4': q => { const C = pt(q.q.match(/mede ([\d,]+) cm/)[1]); return igualNum(pt(certo(q)), C / (2 * 3.14), 1e-6); },
  'pi:3:1': q => { const m = q.q.match(/tem (raio|diâmetro) (\d+) cm/), r = m[1] === 'raio' ? +m[2] : +m[2] / 2; return igualNum(pt(certo(q)), 3.14 * r * r, 1e-6); },
  'pi:3:2': q => { const m = q.q.match(/raio (\d+) cm é cortada .*?em (2|4) (?:metades|fatias)/); return igualNum(pt(certo(q)), 3.14 * m[1] * m[1] / m[2], 1e-6); },
  'pi:3:3': q => {
    const r = +q.q.match(/raio (\d+) m/)[1], p = +q.q.match(/R\$ (\d+),00 o metro/)[1];
    return igualNum(pt(certo(q)), /cerca/.test(q.q) ? 2 * 3.14 * r * p : 3.14 * r * r * p, 1e-6);
  },
  'pi:3:4': q => {
    const k = /quadruplica/.test(q.q) ? 4 : /triplica/.test(q.q) ? 3 : 2, circ = /circunferência\?/.test(q.q);
    return igual(certo(q), `fica ${circ ? k : k * k} vezes maior`);
  }
};
// Avalia o lado direito de uma função escrita como no app: "3x − 5", "−x² + 4x", "t" também vale como variável.
const fnAval = (rhs, x) => Function('x', 'return ' + rhs.replace(/−/g, '-').replace(/[xt]²/g, '(x*x)').replace(/t/g, 'x').replace(/(\d)(?=[x(])/g, '$1*'))(x);
function predDado(t) {
  if (/número primo/.test(t)) return primo;
  if (/número par/.test(t)) return n => n % 2 === 0;
  if (/número ímpar/.test(t)) return n => n % 2 === 1;
  if (/número negativo/.test(t)) return n => n < 0;
  if (/número positivo/.test(t)) return n => n > 0;
  let m;
  if ((m = t.match(/menor que (\d+)/))) return n => n < +m[1];
  if ((m = t.match(/maior que (\d+)/))) return n => n > +m[1];
  if ((m = t.match(/múltiplo de (\d+)/))) return n => n % +m[1] === 0;
  if ((m = t.match(/sair o número (\d+)/))) return n => n === +m[1];
  return null;
}
const achaConf = (mod, nivel, g) => CONF[`${mod}:${nivel}:${g}`] || CONF[`${mod}:*:${g}`] || CONF[`${mod}:${nivel}:*`] || CONF[`${mod}:*:*`] || null;

// ---- 5. Verificações genéricas ----------------------------------------------
const RE_RUIM = /(\bNaN\b|\bundefined\b|\[object Object\]|\bInfinity\b|^\s*$)/;
// Padrões de texto suspeito (aviso de redação, não de conta)
const LINT = [
  [/azuls\b/, 'plural errado "azuls"'],
  [/\b1 (azuis|verdes|bolas|vermelhas)\b/, 'singular com plural ("1 azuis")'],
  [/\b\d+,\d{5,}/, 'decimal muito longo'],
  [/(^|[^\d])−0(?!,)\b/, '"−0"'],
  [/(?<!\b(?:por|de|em|com|a|o|para|e|ou)\s)\b([A-Za-zÀ-ú]{2,}) \1\b/, 'palavra repetida'],
  [/(?<!→) {2,}(?!→)/, 'espaço duplo'],
  [/ [,.;:](?!\.)/, 'espaço antes de pontuação']
];
const textoTodo = q => [q.q, ...(q.o || []), q.e, ...(q.h || []), ...((q.ms || []).filter(Boolean))].filter(x => typeof x === 'string').join(' ¦ ');

function validarQuestao(q, mod) {
  const erros = [];
  if (!q || typeof q !== 'object') return ['questão não é objeto'];
  if (typeof q.q !== 'string' || !q.q.trim()) erros.push('enunciado vazio');
  else if (RE_RUIM.test(q.q)) erros.push(`enunciado com valor inválido: "${q.q.slice(0, 60)}"`);
  if (!Array.isArray(q.o) || q.o.length !== 4) erros.push(`o deve ter 4 alternativas, tem ${q.o?.length}`);
  else {
    if (new Set(q.o).size !== 4) erros.push(`alternativas duplicadas: ${JSON.stringify(q.o)}`);
    q.o.forEach((alt, i) => {
      if (typeof alt !== 'string' || !alt.trim()) erros.push(`alternativa ${i} vazia`);
      else if (RE_RUIM.test(alt)) erros.push(`alternativa ${i} inválida: "${alt.slice(0, 40)}"`);
    });
  }
  if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) erros.push(`índice correto inválido: ${q.c}`);
  if (typeof q.e !== 'string' || !q.e.trim()) erros.push('explicação vazia');
  else if (RE_RUIM.test(q.e)) erros.push(`explicação com valor inválido: "${q.e.slice(0, 40)}"`);
  if (!Array.isArray(q.h) || !q.h.length) erros.push('dicas vazias');
  else if (q.h.some(h => typeof h !== 'string' || !h.trim() || RE_RUIM.test(h))) erros.push('dica vazia ou inválida');
  // tg e ms: a alternativa certa não tem etiqueta de erro, as erradas têm
  if (Array.isArray(q.tg) && Number.isInteger(q.c)) {
    if (q.tg[q.c] != null) erros.push('a alternativa certa tem etiqueta de erro (tg)');
  }
  if (Array.isArray(q.ms) && Number.isInteger(q.c)) {
    if (q.ms[q.c] != null) erros.push('a alternativa certa tem mensagem de erro (ms)');
  }
  // estado do simulador
  if (q.s != null) {
    if (typeof q.s !== 'object') erros.push('estado s não é objeto');
    else {
      const ctl = Object.fromEntries((mod.ctl || []).map(c => [c.k, c]));
      const reset = mod.reset || {};
      // O teste de gerador isolado NÃO valida o intervalo de s: o app clampa no
      // mk() (quando cur existe) e no fix() do módulo, e o rodaSim abaixo valida
      // o intervalo de verdade com estados do simulador. Aqui só exigimos que
      // s seja objeto de números finitos com chaves conhecidas.
      for (const [k, v] of Object.entries(q.s)) {
        if (typeof v === 'number' && !Number.isFinite(v))
          erros.push(`s.${k} não é finito`);
        if (!(k in ctl) && !(k in reset) && typeof v === 'number') {
          // chave numérica desconhecida pode ser estado interno: não é erro,
          // mas avisamos em verbose. Para não poluir, só registramos se o
          // módulo declarar explicitamente _semEstadoInterno.
        }
      }
    }
  }
  return erros;
}

// ---- 6. Roda os geradores ---------------------------------------------------
const mods = ctx.MODS.filter(m => !SO_MODULOS || SO_MODULOS.includes(m.id));
if (!mods.length) { console.error('Nenhum módulo encontrado com esse filtro.'); process.exit(1); }

let totalGer = 0, comConf = 0;
const falhas = [], avisos = [];
const porModulo = {};

for (const m of mods) {
  porModulo[m.id] = { ger: 0, conf: 0, falhas: 0, avisos: 0, sim: 0 };
  for (const [nivel, arr] of Object.entries(m.gens || {})) {
    if (!Array.isArray(arr)) continue;
    arr.forEach((fn, i) => {
      const g = i + 1, nome = `${m.id} N${nivel} gerador ${g}`;
      const conf = achaConf(m.id, nivel, g);
      totalGer++; porModulo[m.id].ger++;
      if (conf) { comConf++; porModulo[m.id].conf++; }
      semear(nome);
      const f = [], enun = new Set(), lintVisto = new Set();
      for (let r = 0; r < RODADAS && f.length < 4; r++) {
        let q;
        try { q = fn(); } catch (e) { f.push(`rodada ${r}: exceção: ${e.message}`); continue; }
        const erros = validarQuestao(q, m);
        if (!erros.length && typeof q.q === 'string') {
          enun.add(q.q);
          for (const [re, desc] of LINT) if (re.test(textoTodo(q)) && !lintVisto.has(desc)) { lintVisto.add(desc); avisos.push({ nome, msg: `texto: ${desc}: ${textoTodo(q).slice(0, 150)}` }); porModulo[m.id].avisos++; }
          if (conf) {
            let res;
            try { res = conf(q); } catch (e) { res = `o teste não conseguiu ler o enunciado (${e.message}): "${q.q.slice(0, 90)}"`; }
            if (res) erros.push(`${res} | enunciado: "${q.q.slice(0, 110)}"`);
          }
        }
        if (erros.length) f.push(`rodada ${r}: ${erros.join(' | ')}`);
      }
      if (f.length) { falhas.push({ nome, f }); porModulo[m.id].falhas++; }
      else if (enun.size < 3 && RODADAS >= 100) { avisos.push({ nome, msg: `variedade baixa: só ${enun.size} enunciados diferentes em ${RODADAS} rodadas` }); porModulo[m.id].avisos++; }
    });
  }
}

// ---- 7. Simulador de cada módulo --------------------------------------------
const cv = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? () => ({ width: 8 }) : noop), set: (t, k, v) => { t[k] = v; return true; } });
const cores = { t: '#fff', m: '#aaa', a: '#fc0', b: '#fa0', c1: '#0cf', c2: '#f0c', pk: '#f0c', c3: '#0f8', c4: '#f80', g: '#888' };
const falhasSim = [];

function rodaSim(m, v, rotulo) {
  try {
    const padroes = Object.fromEntries((m.ctl || []).map(c => [c.k, c.v]));
    const x = { ...padroes, ...(m.reset || {}), ...v };
    m.fix(x);
    for (const c of m.ctl || []) {
      if (typeof x[c.k] === 'number' && !Number.isFinite(x[c.k])) throw new Error(`fix deixou ${c.k} não finito`);
    }
    const info = m.info ? m.info(x) : '';
    if (typeof info === 'string' && RE_RUIM.test(info)) throw new Error(`info com valor inválido: "${info.slice(0, 80)}"`);
    if (typeof m.desc === 'function') {
      const d = m.desc(x);
      if (typeof d !== 'string' || d.trim().length < 15 || RE_RUIM.test(d)) throw new Error(`desc inválida: "${String(d).slice(0, 80)}"`);
    }
    m.draw(cv, x, 420, 300, cores);
    m.draw(cv, x, 700, 360, cores);
    return null;
  } catch (e) {
    return `${rotulo} ${JSON.stringify(v).slice(0, 120)}: ${e.message}`;
  }
}

for (const m of mods) {
  if (typeof m.fix !== 'function' || typeof m.draw !== 'function') { falhasSim.push({ nome: m.id, f: ['módulo sem fix ou draw'] }); continue; }
  if (typeof m.desc !== 'function') { avisos.push({ nome: m.id, msg: 'sem desc(): o leitor de tela recebe só o texto de info' }); porModulo[m.id].avisos++; }
  semear('sim:' + m.id);
  const f = [];
  const estados = [];
  // grade: extremos, meio e fora do intervalo de cada controle
  const ctl = m.ctl || [];
  const pontos = c => [c.min, c.max, Math.round((c.min + c.max) / 2), c.min - 1, c.max + 1, c.min - 50, c.max + 50, c.v];
  for (const c of ctl) for (const p of pontos(c)) estados.push({ [c.k]: p });
  // combinações sorteadas
  for (let i = 0; i < 400; i++) {
    const v = {};
    for (const c of ctl) { const p = pontos(c); v[c.k] = Math.random() < .7 ? Math.round(c.min + Math.random() * (c.max - c.min)) : p[Math.floor(Math.random() * p.length)]; }
    estados.push(v);
  }
  // estados s das questões reais
  for (const arr of Object.values(m.gens || {})) for (const fn of arr) for (let i = 0; i < 60; i++) { try { const q = fn(); if (q && q.s) estados.push(q.s); } catch {} }
  for (const travado of [false, true]) {
    if (ctx.setLocked) ctx.setLocked(travado);
    for (const v of estados) {
      const r = rodaSim(m, v, travado ? 'travado' : 'livre');
      if (r) { f.push(r); if (f.length >= 4) break; }
    }
    if (f.length >= 4) break;
  }
  if (ctx.setLocked) ctx.setLocked(false);
  porModulo[m.id].sim = estados.length * 2;
  if (f.length) { falhasSim.push({ nome: `${m.id} simulador`, f }); porModulo[m.id].falhas++; }
}

// ---- 8. Relatório ------------------------------------------------------------
console.log('Módulo      geradores  com conferência de resposta  estados do simulador  falhas  avisos');
for (const m of mods) {
  const p = porModulo[m.id];
  console.log(`${m.id.padEnd(11)} ${String(p.ger).padStart(9)}  ${String(p.conf).padStart(27)}  ${String(p.sim).padStart(20)}  ${String(p.falhas).padStart(6)}  ${String(p.avisos).padStart(6)}`);
}
console.log(`\nTotal: ${totalGer} geradores, ${comConf} com conferência de resposta, ${totalGer - comConf} só com verificação de forma e texto.\n`);

const todas = [...falhas, ...falhasSim];
if (avisos.length && (VERBOSE || ESTRITO || todas.length === 0)) {
  console.log(`${avisos.length} avisos${VERBOSE ? '' : ' (use --verbose para listar)'}:`);
  if (VERBOSE) for (const a of avisos) console.log(`  - ${a.nome}: ${a.msg}`);
  console.log();
}

if (!todas.length) {
  console.log(`Tudo certo: ${totalGer} geradores e ${mods.length} simuladores passaram.`);
  process.exit(ESTRITO && avisos.length ? 1 : 0);
}
console.log(`${todas.length} com falha:\n`);
for (const { nome, f } of todas) {
  console.log(`  > ${nome}`);
  for (const x of f) console.log(`      ${x}`);
  console.log();
}
console.log(`Para repetir: node testes-geradores.mjs ${arqArg || ''} --seed=${SEMENTE} --modulo=${[...new Set(todas.map(t => t.nome.split(' ')[0]))].join(',')}`.replace('  ', ' '));
process.exit(1);
