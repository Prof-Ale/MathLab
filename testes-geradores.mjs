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

const vMat = txt => { const m = txt.match(/Linha 1 \(frente\): (\d), (\d), (\d)\. Linha 2: (\d), (\d), (\d)\. Linha 3 \(fundo\): (\d), (\d), (\d)\./); const n = m.slice(1).map(Number); return [n.slice(0, 3), n.slice(3, 6), n.slice(6, 9)]; };

// Ajudantes do módulo paralelas: classificação independente dos pares de ângulos e leitura de expressões "mx + n".
function plClasse(i, j) {
  const pos = n => ({ topo: n <= 4, q: (n - 1) % 4 });
  const a = pos(i), b = pos(j);
  if (a.topo === b.topo) return Math.abs(a.q - b.q) === 2 ? 'opostos pelo vértice' : '?';
  if (a.q === b.q) return 'correspondentes';
  const lado = p => (p.q === 1 || p.q === 2 ? 'E' : 'D');
  const interno = p => (p.topo ? p.q >= 2 : p.q <= 1);
  const ia = interno(a), ib = interno(b);
  if (ia !== ib) return '?';
  const mesmo = lado(a) === lado(b);
  return ia ? (mesmo ? 'colaterais internos' : 'alternos internos') : (mesmo ? 'colaterais externos' : 'alternos externos');
}
function plExp(s) { const m = s.match(/(\d+)x ([+−]) (\d+)/); return [+m[1], (m[2] === '−' ? -1 : 1) * m[3]]; }

function ciExp(s) { const m = s.match(/(\d+)x ([+−]) (\d+)/); return [+m[1], (m[2] === '−' ? -1 : 1) * m[3]]; }

const esN = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function lgDados(txt) { const m = txt.match(/: (.+?)\. /) || txt.match(/: (.+?)\.$/); const t = {}; const seg = txt.split(': ')[1].split('. ')[0]; seg.split(', ').forEach(p => { const k = p.lastIndexOf(' '); t[p.slice(0, k)] = +p.slice(k + 1); }); return t; }

function rmF(n, d) { const sg = (n < 0) !== (d < 0) ? -1 : 1, a = Math.abs(n), b = Math.abs(d), g = (x, y) => (y ? g(y, x % y) : x), z = g(a, b) || 1, x = a / z, y = b / z; return (sg < 0 && x !== 0 ? '−' : '') + (y === 1 ? String(x) : `${x}/${y}`); }

// ---- ajudantes do Ensino Médio (lote 1) ----
const nsn = n => String(n).replace('-', '−');
const frN = t => { const s = String(t).replace('−', '-'); if (s.includes('/')) { const [a, b] = s.split('/'); return +a / +b; } return pt(s); };
const raizN = t => { const s = String(t).replace(/ (cm|m|km)$/, '').replace('−', '-'); let m = s.match(/^(\d*)√(\d+)\/(\d+)$/); if (m) return (m[1] === '' ? 1 : +m[1]) * Math.sqrt(+m[2]) / +m[3]; m = s.match(/^(\d*)√(\d+)$/); if (m) return (m[1] === '' ? 1 : +m[1]) * Math.sqrt(+m[2]); m = s.match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2]; return pt(s); };
const vF = str => { const t = String(str).replace(/−/g, '-').replace(/\s+/g, ''); let m = t.match(/^(-?\d*)x(?:([+-]\d+))?$/); if (m) return { a: m[1] === '' ? 1 : m[1] === '-' ? -1 : +m[1], b: m[2] ? +m[2] : 0 }; return { a: 0, b: +t }; };
const vQ = str => { const t = String(str).replace(/−/g, '-').replace(/\s+/g, ''); const r = { a: 0, b: 0, c: 0 }; (t.match(/[+-]?[^+-]+/g) || []).forEach(u => { const co = x => (x === '' || x === '+' ? 1 : x === '-' ? -1 : +x); if (u.endsWith('x²')) r.a = co(u.slice(0, -2)); else if (u.endsWith('x')) r.b = co(u.slice(0, -1)); else r.c = +u; }); return r; };
const raizesFat = txt => [...txt.matchAll(/\(x ([−+]) (\d+)\)/g)].map(m => (m[1] === '−' ? 1 : -1) * +m[2]);
const ehPA = l => l.length > 2 && l.every((x, i) => i === 0 || x - l[i - 1] === l[1] - l[0]);
const ehPG = l => l.length > 2 && l[0] !== 0 && l.every((x, i) => i === 0 || x * l[0] === l[i - 1] * l[1] * 1 && x / l[i - 1] === l[1] / l[0]);

// ---- ajudantes do Ensino Médio (lote 2) ----
const pSupD = '⁰¹²³⁴⁵⁶⁷⁸⁹', pSubD = '₀₁₂₃₄₅₆₇₈₉';
const supN = t => parseInt(String(t).replace(/⁻/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => pSupD.indexOf(c)), 10);
const subN = t => parseInt([...String(t)].map(c => pSubD.indexOf(c)).join(''), 10);
const subS = n => String(n).replace(/\d/g, d => pSubD[d]);
const supS = n => String(n).replace(/-/g, '⁻').replace(/\d/g, d => pSupD[d]);
const SCI_RE = /(\d+(?:,\d+)?) × 10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/g;
const sciAll = t => [...String(t).matchAll(SCI_RE)].map(m => ({ m: pt(m[1]), e: supN(m[2]), v: pt(m[1]) * Math.pow(10, supN(m[2])) }));
const rel = (got, esp, tol = 1e-9) => (Math.abs(got - esp) <= tol * Math.max(Math.abs(esp), 1e-300) ? null : `resposta ${got}, esperado ${esp}`);
const sciOk = (txt, esp) => { const a = sciAll(txt)[0]; if (!a) return `sem notação científica em "${txt}"`; if (!(a.m >= 1 && a.m < 10)) return `mantissa fora de [1,10): ${txt}`; return rel(a.v, esp); };
const ivsT = t => [...String(t).matchAll(/([\[(])(−?\d+), (−?\d+)([\])])/g)].map(m => ({ l: +m[2].replace('−', '-'), r: +m[3].replace('−', '-'), lc: m[1] === '[', rc: m[4] === ']' }));
const noIv = (I, x) => (x > I.l || (x === I.l && I.lc)) && (x < I.r || (x === I.r && I.rc));
const noLista = (L, x) => L.some(I => noIv(I, x));
const amostra = f => { const o = []; for (let x = -20; x <= 30; x += .5) o.push(f(x) ? 1 : 0); return o.join(''); };
const rosL = t => String(t).split(', ').map(x => +x.replace('−', '-')).filter(x => !isNaN(x));
const rosC = q => { const m = q.match(/A = \{([^}]*)\} e B = \{([^}]*)\}/); const A = rosL(m[1]), B = rosL(m[2]); return { A, B, i: A.filter(x => B.includes(x)).length, u: new Set([...A, ...B]).size }; };
const feLei = t => { const m = String(t).match(/f\(x\) = (?:(\d+) · )?(?:\(1\/(\d+)\)|(\d+))ˣ/); return { a: m[1] ? +m[1] : 1, b: m[2] ? +m[2] : +m[3], inv: !!m[2] }; };
const logB = (N, b) => Math.round(Math.log(N) / Math.log(b));


// ---- auxiliares do módulo angx ----
const axp = t => { t = t.trim(); let m = t.match(/^(\d*)x(?: ([+−]) (\d+)°)?$/); if (m) return [m[1] === '' ? 1 : +m[1], m[2] ? (m[2] === '+' ? 1 : -1) * +m[3] : 0]; m = t.match(/^(\d+)°$/); if (m) return [0, +m[1]]; throw new Error('expressão não lida: ' + t); };
const axl = s => s.split(/, | e /).map(axp);
const axSoma = (e, T) => (T - e.reduce((s, t) => s + t[1], 0)) / e.reduce((s, t) => s + t[0], 0);
const axLista = q => axl(q.q.match(/medem (.+?)\. (?:Qual|Quanto)/)[1]);
const axFig = q => (/quadrilátero/.test(q.q) ? 360 : 180);
const axF = (p, q) => { const a = p === 0 ? '' : (p === 1 ? '' : p) + 'x'; if (p === 0) return `${q}°`; return q === 0 ? a : `${a} ${q > 0 ? '+' : '−'} ${Math.abs(q)}°`; };

// ---- auxiliares do Lote 3 ----
const cicPi = t => { t = t.replace(/ rad| cm/g, '').trim(); let m = t.match(/^(\d*)π(?:\/(\d+))?$/); if (m) return (m[1] === '' ? 1 : +m[1]) / (m[2] ? +m[2] : 1); if (t === '0') return 0; throw new Error('π não lido: ' + t); };
const cicNum = t => { t = t.replace(/−/g, '-').trim(); let sg = 1; if (t[0] === '-') { sg = -1; t = t.slice(1); } let m = t.match(/^(?:√(\d+)|(\d+))(?:\/(\d+))?$/); if (m) { const top = m[1] ? Math.sqrt(+m[1]) : +m[2]; return sg * top / (m[3] ? +m[3] : 1); } m = t.match(/^√(\d+)\/(\d+)$/); if (m) return sg * Math.sqrt(+m[1]) / +m[2]; throw new Error('número não lido: ' + t); };
const cicTrig = (f, d) => (f === 'sen' ? Math.sin(d * Math.PI / 180) : Math.cos(d * Math.PI / 180));
const cicQuad = d => { d = ((d % 360) + 360) % 360; return d < 90 ? 1 : d < 180 ? 2 : d < 270 ? 3 : 4; };
const cicG2 = (a, b) => (b ? cicG2(b, a % b) : Math.abs(a));
const cicFr = d => { if (d === 0) return '0'; const g = cicG2(d, 180), n = d / g, m = 180 / g; return m === 1 ? (n === 1 ? 'π' : `${n}π`) : (n === 1 ? `π/${m}` : `${n}π/${m}`); };

const ftFl = t => parseFloat(String(t).replace(/−/g, '-').replace(',', '.'));
const ftExp = t => { const m = t.match(/y = (?:(\d+)·)?(sen|cos)(?: x|\((\d+)x\))(?: ([+−]) (\d+))?/); return { A: m[1] ? +m[1] : 1, fn: m[2], B: m[3] ? +m[3] : 1, D: m[4] ? (m[4] === '+' ? 1 : -1) * +m[5] : 0 }; };
const ftCtx = t => { const m = t.match(/h\(t\) = (\d+) \+ (?:(\d+)·)?sen\((\d+)t\)/); return { D: +m[1], A: m[2] ? +m[2] : 1, B: +m[3] }; };
const ftSg = n => String(n).replace('-', '−');
const lsnV = s => { const m = String(s).replace(/−/g,'-').match(/^(\d+)?(?:√(\d+))?/); return (m[1] ? +m[1] : 1) * (m[2] ? Math.sqrt(+m[2]) : 1); };
const lsnD = x => x * 180 / Math.PI, lsnR = d => d * Math.PI / 180;
const lsnCl = (x, y, z) => { const m = Math.max(x, y, z), d = m * m - (x * x + y * y + z * z - m * m); return d === 0 ? 'Retângulo' : d < 0 ? 'Acutângulo' : 'Obtusângulo'; };
const lsnNum = (got, esp) => (Math.abs(lsnV(got) - esp) < 1e-6 ? null : `resposta ${got}, esperado ${esp}`);
const cmbF = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const cmbC = (n, p) => Math.round(cmbF(n) / (cmbF(p) * cmbF(n - p)));
const cmbN = s => Number(String(s).replace(/\./g, ''));
const cmbAna = w => { const m = {}; for (const ch of w) m[ch] = (m[ch] || 0) + 1; let r = cmbF(w.length); Object.values(m).forEach(k => r /= cmbF(k)); return Math.round(r); };
const mtzMs = t => [...t.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].split(';').map(r => nums(r)));
const mtzMul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
const mtzFm = M => '[' + M.map(r => r.map(x => (x < 0 ? '−' + (-x) : String(x))).join(' ')).join('; ') + ']';
const mtzSub = t => '₀₁₂₃₄₅₆₇₈₉';
const pcG = (a, b) => (b ? pcG(b, a % b) : a);
const pcFr = (n, d) => { const g = pcG(Math.abs(n), d) || 1; n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; };
const edN = x => Number(String(x).replace(/\./g, '').replace(',', '.').replace('−', '-'));
const edList = (t, a, b) => nums(t.split(a)[1].split(b)[0]);
const edMean = d => d.reduce((x, y) => x + y, 0) / d.length;
const edVar = d => { const m = edMean(d); return d.reduce((x, y) => x + (y - m) ** 2, 0) / d.length; };
const gsN = x => Number(String(x).match(/^[\d.]+/)[0].replace(/\./g, ''));
const gaPts = t => [...t.matchAll(/\((−?\d+), (−?\d+)\)/g)].map(m => [+m[1].replace('−', '-'), +m[2].replace('−', '-')]);
const gaS = x => (x < 0 ? '−' : '') + String(Math.abs(x));
const gaPt = (x, y) => `(${gaS(x)}, ${gaS(y)})`;
const gaG = (a, b) => (b ? gaG(b, a % b) : Math.abs(a));
const gaFr = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gaG(n, d) || 1; n /= g; d /= g; return d === 1 ? gaS(n) : `${gaS(n)}/${d}`; };
const gaEq = (m, n) => { if (m === 0) return `y = ${gaS(n)}`; const mm = m === 1 ? 'x' : m === -1 ? '−x' : `${gaS(m)}x`; return `y = ${mm}${n === 0 ? '' : n > 0 ? ` + ${n}` : ` − ${-n}`}`; };
const gaParse = t => { const u = t.replace(/−/g, '-'); let r = u.match(/^y = (-?)(\d*)x(?: ([+-]) (\d+))?$/); if (r) return { m: (r[1] ? -1 : 1) * (r[2] === '' ? 1 : +r[2]), n: r[3] ? (r[3] === '-' ? -1 : 1) * +r[4] : 0 }; r = u.match(/^y = (-?\d+)$/); return { m: 0, n: +r[1] }; };
const gaN = x => Number(String(x).replace('−', '-').replace(',', '.'));
const gcT = (a, w) => (a === 0 ? `${w}²` : `(${w} ${a > 0 ? '−' : '+'} ${Math.abs(a)})²`);
const gcEq = (a, b, r2) => `${gcT(a, 'x')} + ${gcT(b, 'y')} = ${r2}`;
const gcPar = t => { const m = t.match(/(?:\(x ([−+]) (\d+)\)²|x²) \+ (?:\(y ([−+]) (\d+)\)²|y²) = (\d+)/); const f = (sg, v) => (sg ? (sg === '−' ? +v : -v) : 0); return { a: f(m[1], m[2]), b: f(m[3], m[4]), r2: +m[5] }; };
const gcGe = t => { let u = t.match(/x² \+ y²([^=]*) = 0/)[1]; const sg = x => (x === '−' ? -1 : 1); let cx = 0, cy = 0; u = u.replace(/ ([+−]) (\d+)x/, (_, s, v) => { cx = sg(s) * +v; return ''; }).replace(/ ([+−]) (\d+)y/, (_, s, v) => { cy = sg(s) * +v; return ''; }); let c = 0; const mm = u.match(/ ([+−]) (\d+)/); if (mm) c = sg(mm[1]) * +mm[2]; const a = -cx / 2, b = -cy / 2; return { a, b, r2: a * a + b * b - c }; };
const gcPos = (d2, r2) => (d2 < r2 ? 'Interior' : d2 === r2 ? 'Pertence à circunferência' : 'Exterior');

// ---- Lote 5: ajudantes de conferência (independentes dos geradores) ----
const l5S = n => String(n).replace('-', '−');
const l5G = (a, b) => (b ? l5G(b, a % b) : Math.abs(a));
const l5Lin = t => { const m = String(t).trim().match(/^(−?\d*)x(?: ([+−]) (\d+))?$/); if (!m) return null; const a = m[1] === '' ? 1 : m[1] === '−' ? -1 : +m[1].replace('−', '-'); const b = m[2] ? (m[2] === '−' ? -1 : 1) * +m[3] : 0; return [a, b]; };
const l5Fac = t => [...String(t).replace(/f\(x\)/g, 'F').matchAll(/\((x(?: [−+] \d+)?)\)/g)].map(m => { const r = m[1].match(/x(?: ([−+]) (\d+))?/); return r[1] ? (r[1] === '−' ? +r[2] : -r[2]) : 0; });
const l5ModH = t => { const m = String(t).match(/\|x(?: ([−+]) (\d+))?\|/); return m ? (m[1] ? (m[1] === '−' ? +m[2] : -m[2]) : 0) : null; };
const l5ModK = t => { const m = String(t).match(/\|x[^|]*\|(?: ([+−]) (\d+))?/); return m && m[1] ? (m[1] === '+' ? +m[2] : -m[2]) : 0; };
const l5Eq2 = (p, q) => `x = ${l5S(p)} ou x = ${l5S(q)}`;
const l5Rad = a => { if (a === 0) return '0'; const g = l5G(a, 180), n = a / g, d = 180 / g; return `${n === 1 ? '' : n}π${d === 1 ? '' : '/' + d}`; };
const l5Num = x => String(Math.round(x * 100) / 100).replace('.', ',').replace('-', '−');
const l5Tab = q => [...q.matchAll(/valor (\d): (\d+) vez/g)].map(m => [+m[1], +m[2]]);
const l5Sort = a => [...a].sort((x, y) => x - y);
const l5Lst = q => { const m = q.match(/\(([\d, ]+)\)/); return m ? m[1].split(',').map(Number) : []; };
const l5Pi = t => { const m = t.match(/(\d*)π(?:\/(\d+))?/); return m ? [m[1] === '' ? 1 : +m[1], m[2] ? +m[2] : 1] : null; };
const l5H = (a, b) => Math.round(Math.sqrt(a * a + b * b));

// ---- Lote 6: ajudantes ----
const l6N = t => +String(t).replace('−', '-');
const l6Eq = (str, vs) => { const [lhs, rhs] = str.split(' = '); const co = vs.map(() => 0); [...lhs.replace(/−/g, '-').matchAll(/([+-]?)\s*(\d*)([a-z])/g)].forEach(m => { const i = vs.indexOf(m[3]); if (i >= 0) co[i] += (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : +m[2]); }); return { co, r: l6N(rhs) }; };
const l6D3 = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
const l6Solve3 = (M, r) => { const D = l6D3(M); return [0, 1, 2].map(j => l6D3(M.map((row, i) => row.map((v, k) => (k === j ? r[i] : v)))) / D); };
const l6Tr = a => `(${a.map(x => l5S(Math.round(x * 1000) / 1000)).join(', ')})`;
const l6Cl = (a1, b1, c1, a2, b2, c2) => { const D = a1 * b2 - a2 * b1; if (D !== 0) return 0; return (a1 * c2 - a2 * c1 === 0 && b1 * c2 - b2 * c1 === 0) ? 1 : 2; };
const l6Sys2 = q => { const m = q.q.match(/sistema:? (.+?); (.+?)(?:\.|\?)/); const e1 = l6Eq(m[1], ['x', 'y']), e2 = l6Eq(m[2], ['x', 'y']); return [e1.co[0], e1.co[1], e1.r, e2.co[0], e2.co[1], e2.r]; };

const l6Poly = str => { const ts = String(str).replace(/−/g, '-').replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || []; const d = {}; ts.forEach(t => { const m = t.match(/^([+-]?)(\d*)(x[²³]?)?$/); if (!m) return; const e = m[3] ? (m[3] === 'x³' ? 3 : m[3] === 'x²' ? 2 : 1) : 0; d[e] = (d[e] || 0) + (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : +m[2]); }); const n = Math.max(...Object.keys(d).map(Number)); return Array.from({ length: n + 1 }, (_, i) => d[n - i] || 0); };
const l6Val = (co, x) => co.reduce((s, c) => s * x + c, 0);
const l6Ruf = (co, r) => { const q = [co[0]]; for (let i = 1; i < co.length; i++) q.push(co[i] + r * q[i - 1]); return q; };
const l6Tx = co => { const n = co.length - 1; let t = ''; co.forEach((c, i) => { if (!c) return; const e = n - i, a = Math.abs(c), b = e === 0 ? String(a) : (a === 1 ? '' : String(a)) + (e === 1 ? 'x' : e === 2 ? 'x²' : 'x³'); t += t === '' ? (c < 0 ? '−' + b : b) : (c < 0 ? ' − ' + b : ' + ' + b); }); return t; };
const l6Set = a => `{${[...a].sort((x, y) => x - y).map(l5S).join(', ')}}`;
const l6Div = q => { const m = q.q.match(/por x ([+−]) (\d+)/); return (m[1] === '+' ? -1 : 1) * +m[2]; };

const l6Un = s => +String(s || '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c));
const l6Pas = n => { let r = [1]; for (let i = 0; i < n; i++) { const t = [1]; for (let j = 1; j < r.length; j++) t.push(r[j - 1] + r[j]); t.push(1); r = t; } return r; };
const l6Mil = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const l6Term = (c, e) => e === 0 ? String(c) : (c === 1 ? '' : String(c)) + (e === 1 ? 'x' : 'x' + String(e).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]));

const l6Mon = s => parseFloat(String(s).replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.'));
const l6M = x => { const [a, b] = (Math.round(x * 100) / 100).toFixed(2).split('.'); return `R$ ${a.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${b}`; };
const l6Fin = q => { const t = q.q; const P = l6Mon(t.match(/(?:de|financiamento de) (R\$ [\d.,]+)/)[1]); const n = +(t.match(/em (\d+) parcelas/) || [])[1]; const i = +(t.match(/a (\d+)% ao mês/) || [])[1]; return { P, n, i }; };

const l6Fr = (n, d) => { const g = l5G(n, d); n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; };
const l6Pi = n => `${n === 1 ? '' : l6Mil(n)}π`;

const l7Sq = N => { let a = 1; for (let k = 2; k * k <= N; k++) if (N % (k * k) === 0) a = k; return [a, N / (a * a)]; };
const l7Cb = N => { let a = 1; for (let k = 2; k ** 3 <= N; k++) if (N % (k ** 3) === 0) a = k; return [a, N / (a ** 3)]; };
const l7Rt = (a, b) => `${a === 1 ? '' : a}√${b}`;
const l7Co = t => (t === '' ? 1 : +t);

const l7N = s => Number(String(s).replace('−', '-'));

const l7Ev = (s, x) => Function('x', 'return ' + String(s).replace(/−/g, '-').replace(/²/g, '**2').replace(/(\d)([x(])/g, '$1*$2').replace(/x\(/g, 'x*(').replace(/\)\(/g, ')*(').replace(/\)x/g, ')*x').replace(/x(?=\d)/g, 'x*'))(x);
const l7Eq = (a, b) => [-3, 2, 5, 7, -4].every(x => Math.abs(l7Ev(a, x) - l7Ev(b, x)) < 1e-9);
const l7Fz = q => { const m = q.q.includes(':') ? q.q.match(/: (.+)\.$/) : q.q.match(/^Fatore (.+)\.$/); const got = certo(q); return igual(got.includes('(') && l7Eq(got, m[1]) ? 'ok' : got, 'ok'); };

const EMN_T = z => (z < 0 ? '−' + (-z) : String(z));
const l7Un = s => Number(String(s).replace(/[₀-₉]/g, d => '₀₁₂₃₄₅₆₇₈₉'.indexOf(d)));
const l7Fr = (n, k) => { const g = ((a, b) => { while (b) [a, b] = [b, a % b]; return a; })(Math.abs(n), k); return k / g === 1 ? String(n / g).replace('-', '−') : `${String(n / g).replace('-', '−')}/${k / g}`; };

const l7Cs = (sg, n) => (sg === '+' ? -Number(n) : Number(n));

const l7Fp = (n, d) => { let a = n, b = d; while (b) [a, b] = [b, a % b]; return d / a === 1 ? String(n / a) : `${n / a}/${d / a}`; };

const l7Pv = s => { const m = String(s).match(/^(\d*)π(?:\/(\d+))?/); return m ? (m[1] === '' ? 1 : Number(m[1])) / (m[2] ? Number(m[2]) : 1) : NaN; };
const l7Pk = (q, v) => { const got = certo(q); return Math.abs(l7Pv(got) - v) < 1e-9 ? null : `resposta "${got}", esperado ${v}π`; };



const l7G = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const l7Pi = (n, d) => { const g = l7G(n, d) || 1; n /= g; d /= g; return d === 1 ? `${n === 1 ? '' : n}π` : `${n === 1 ? '' : n}π/${d}`; };

// Conferências de resposta. Chave "modulo:nivel:gerador" (gerador começa em 1; "*" vale para todos os níveis).
// Cada função recebe a questão e devolve null se estiver certa, ou um texto explicando o erro.
// Ela deve recalcular a resposta só a partir do enunciado, sem usar código do app.
const certo = q => q.o[q.c];
const igual = (got, esp) => (String(got) === String(esp) ? null : `resposta "${got}", esperado "${esp}"`);
const igualNum = (got, esp, tol) => (perto(got, esp, tol) ? null : `resposta ${got}, esperado ${esp}`);


// balanca: resolve "Resolva: 3x + 4 = x − 2." por fora do app
const ladoEq = t => { let nx = 0, c = 0; for (const m of t.replace(/−/g, '-').replace(/\s+/g, '').matchAll(/([+-]?)(\d*)(x?)/g)) { if (!m[0]) continue; const sg = m[1] === '-' ? -1 : 1; if (m[3]) nx += sg * (m[2] === '' ? 1 : Number(m[2])); else if (m[2] !== '') c += sg * Number(m[2]); } return [nx, c]; };
const resolveEq = q => { const t = q.q.match(/Resolva: (.*)\.$/)[1].split('='); const [a, b] = ladoEq(t[0]), [d, e] = ladoEq(t[1]); return igualNum(pt(certo(q)), (e - b) / (a - d)); };
const fracP = s => { const m = String(s).replace('−','-').match(/^(-?\d+)(?:\/(\d+))?$/); return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : NaN; };
// lê "4x² + 12x + 9" (ou com − e coeficiente 1 implícito) e devolve [x², x, constante]
const coefPoli = t => { const r = [0, 0, 0]; for (const m of t.replace(/−/g, '-').replace(/\s+/g, '').matchAll(/([+-]?)(\d*)(x²|x)?/g)) { if (!m[0]) continue; const sg = m[1] === '-' ? -1 : 1; const val = m[2] === '' ? (m[3] ? 1 : 0) : Number(m[2]); if (m[3] === 'x²') r[0] += sg * val; else if (m[3] === 'x') r[1] += sg * val; else r[2] += sg * val; } return r; };
const ppSM = s => s.replace(/[()\s]/g, '').replace(/−/g, '-').split(',').map(Number);
const fmtSM = (x, y) => { const f = n => (n < 0 ? '−' + (-n) : String(n)); return `(${f(x)}, ${f(y)})`; };
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
  // ---------- balanca ----------
  'balanca:1:1': q => { const m = q.q.match(/x \+ (\d+) = (\d+)/); return igualNum(pt(certo(q)), m[2] - m[1]); },
  'balanca:1:2': q => { const m = q.q.match(/(\d+)x = (\d+)\. Qual/); return igualNum(pt(certo(q)), m[2] / m[1]); },
  'balanca:1:4': q => { const m = q.q.match(/peso de (\d+) kg\. No outro prato há (\d+) kg/); return igualNum(pt(certo(q)), m[2] - m[1]); },
  'balanca:2:1': q => resolveEq(q), 'balanca:2:2': q => resolveEq(q), 'balanca:3:1': q => resolveEq(q), 'balanca:3:4': q => resolveEq(q),
  'balanca:2:4': q => { const m = q.q.match(/tem (\d+) .* e mais (\d+) .* soltas\. Ao todo são (\d+)/); return igualNum(pt(certo(q)), (m[3] - m[2]) / m[1]); },
  'balanca:3:3': q => { const m = q.q.match(/taxa de R\$ (\d+) mais R\$ (\d+) por aula\. A segunda: taxa de R\$ (\d+) mais R\$ (\d+)/); return igualNum(pt(certo(q)), (m[1] - m[3]) / (m[4] - m[2])); },
  // ---------- probexp ----------
  'probexp:1:1': q => { const t = q.q; const f = i => ({ 'um número par': [2, 4, 6], 'um número ímpar': [1, 3, 5], 'um múltiplo de 3': [3, 6], 'um número maior que 4': [5, 6], 'um número menor que 3': [1, 2], 'o número 5': [5] }); const m = t.match(/de sair (.*)\?$/) || t.match(/de (sair .*)\?$/); const mapa = { 'sair um número par': 3, 'sair um número ímpar': 3, 'sair um múltiplo de 3': 2, 'sair um número maior que 4': 2, 'sair um número menor que 3': 2, 'sair o número 5': 1 }; const k = Object.keys(mapa).find(x => t.includes(x)); return igualNum(fracP(certo(q)), mapa[k] / 6, 1e-9); },
  'probexp:1:2': q => { const m = q.q.match(/(\d+) setores iguais: (\d+) vermelhos?, (\d+) azu(?:l|is) e (\d+) verdes?\. .* no (\w+)\?/); const i = { vermelho: 2, azul: 3, verde: 4 }[m[5]]; return igualNum(fracP(certo(q)), m[i] / m[1], 1e-9); },
  'probexp:1:3': q => { const m = q.q.match(/lançada (\d+) vezes e deu cara (\d+) vezes/); return igualNum(pt(certo(q)), Math.round(m[2] / m[1] * 1000) / 10, 1e-6); },
  'probexp:2:1': q => { const m = q.q.match(/soma (igual a|de pelo menos|de no máximo) (\d+)\?/); const s = Number(m[2]); let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) { const t = i + j; if (m[1] === 'igual a' ? t === s : m[1] === 'de pelo menos' ? t >= s : t <= s) c++; } return igualNum(fracP(certo(q)), c / 36, 1e-9); },
  'probexp:2:3': q => { const m = q.q.match(/(\d+) setores iguais, a probabilidade de parar no \w+ é (\d+)(?:\/(\d+))?\./); const T = Number(m[1]), p = fracP(m[2] + (m[3] ? '/' + m[3] : '')); return igualNum(fracP(certo(q)), 1 - p, 1e-9); },
  'probexp:2:4': q => { const m = q.q.match(/girou (\d+) vezes .* parou (\d+) vezes/); return igualNum(pt(certo(q)), Math.round(m[2] / m[1] * 1000) / 10, 1e-6); },
  'probexp:3:1': q => igual(certo(q), q.q.includes('TROCAR') ? '2/3' : '1/3'),
  'probexp:3:3': q => { const n = Number(q.q.match(/lançada (\d+) vezes/)[1]); return igualNum(fracP(certo(q)), 1 - 0.5 ** n, 1e-9); },
  // ---------- prop ----------
  'prop:1:1': q => { const m = q.q.match(/^(\d+) .* custam R\$ (\d+),00/); return igualNum(pt(certo(q)), m[2] / m[1]); },
  'prop:1:2': q => { const m = q.q.match(/traz (\d+) .* em (\d+) pacotes/); return igualNum(pt(certo(q)), m[1] * m[2]); },
  'prop:2:1': q => { const m = q.q.match(/(\d+) \S+ com (\d+) .* em (\d+) /); return igualNum(pt(certo(q)), m[1] / m[2] * m[3]); },
  'prop:2:2': q => { const m = q.q.match(/^(\d+) operários.* em (\d+) dias\. Em quantos dias (\d+) operários/); return igualNum(pt(certo(q)), m[1] * m[2] / m[3]); },
  'prop:2:4': q => { const m = q.q.match(/1 cm representa (\d+) km.* a (\d+) cm/); return igualNum(pt(certo(q)), m[1] * m[2]); },
  'prop:3:1': q => { const m = q.q.match(/R\$ (\d+),00 serão divididos .* a (\d+) e (\d+)\./); return igualNum(pt(certo(q)), m[1] * m[2] / (+m[2] + +m[3])); },
  'prop:3:2': q => { const m = q.q.match(/A (\d+) km\/h.* em (\d+) horas\. Se andar a (\d+) km\/h/); return igualNum(pt(certo(q)), m[1] * m[2] / m[3]); },
  'prop:3:4': q => { const m = q.q.match(/para (\d+) porções usa ([\d,]+) .* para (\d+) porções/); return igualNum(pt(certo(q)), pt(m[2]) / m[1] * m[3]); },
  // ---------- sist ----------
  'sist:1:1': q => { const m = q.q.match(/custam R\$ (\d+),00\. Dois cadernos e uma caneta custam R\$ (\d+),00/); return igualNum(pt(certo(q)), m[2] - m[1]); },
  'sist:1:2': q => { const m = q.q.match(/custam R\$ (\d+),00\. Um lápis e duas borrachas custam R\$ (\d+),00/); return igualNum(pt(certo(q)), m[2] - m[1]); },
  'sist:2:1': q => { const m = q.q.match(/^(\d+) cadernos? e (\d+) canetas? custam R\$ (\d+),00\. (\d+) cadernos? e (\d+) canetas? custam R\$ (\d+),00\. Quanto custa (uma caneta|um caderno)/); const [a1, b1, c1, a2, b2, c2] = m.slice(1, 7).map(Number); const D = a1 * b2 - a2 * b1; const x = (c1 * b2 - c2 * b1) / D, y = (a1 * c2 - a2 * c1) / D; return igualNum(pt(certo(q)), m[7] === 'uma caneta' ? y : x); },
  'sist:2:2': q => { const m = q.q.match(/ao todo (\d+) veículos e (\d+) rodas/); return igualNum(pt(certo(q)), (m[2] - 2 * m[1]) / 2); },
  'sist:3:1': q => { const m = q.q.match(/sistema (\d*)x \+ (\d*)y = (\d+) e (\d*)x \+ (\d*)y = (\d+)\. Quanto vale (x|y)/); const n = s => s === '' ? 1 : +s; const [a1, b1, c1, a2, b2, c2] = [n(m[1]), n(m[2]), +m[3], n(m[4]), n(m[5]), +m[6]]; const D = a1 * b2 - a2 * b1; const x = (c1 * b2 - c2 * b1) / D, y = (a1 * c2 - a2 * c1) / D; return igualNum(pt(certo(q)), m[7] === 'x' ? x : y); },
  'sist:3:3': q => { const m = q.q.match(/R\$ (\d+),00 por (\d+) (?:pão|pães) e (\d+) sucos\. Beto pagou R\$ (\d+),00 por (\d+) (?:pão|pães) e (\d+) sucos?/); const [c1, a1, b1, c2, a2, b2] = m.slice(1, 7).map(Number); const D = a1 * b2 - a2 * b1; return igualNum(pt(certo(q)), (c1 * b2 - c2 * b1) / D + (a1 * c2 - a2 * c1) / D); },
  // ---------- volume ----------
  'volume:1:1': q => { const m = q.q.match(/(\d+) no comprimento, (\d+) na largura e (\d+) na altura/); return igualNum(pt(certo(q)), m[1] * m[2] * m[3]); },
  'volume:1:2': q => { const m = q.q.match(/mede (\d+) cm .* (\d+) cm de largura e (\d+) cm de altura/); return igualNum(pt(certo(q)), m[1] * m[2] * m[3]); },
  'volume:1:3': q => { const m = q.q.match(/volume de (\d+) dm³/); return igualNum(pt(certo(q)), m[1]); },
  'volume:2:1': q => { const m = q.q.match(/mede (\d+) dm .* (\d+) dm de largura e (\d+) dm de altura/); return igualNum(pt(certo(q)), m[1] * m[2] * m[3]); },
  'volume:2:2': q => { const m = q.q.match(/fundo de (\d+) dm por (\d+) dm .* chega a (\d+) dm/); return igualNum(pt(certo(q)), m[1] * m[2] * m[3]); },
  'volume:2:3': q => { const m = q.q.match(/tem (\d+) cm de comprimento, (\d+) cm de largura e (\d+) cm de altura/); return igualNum(pt(certo(q)), m[1] * m[2] * m[3] / 1000, 1e-9); },
  'volume:2:4': q => { const m = q.q.match(/volume de (\d+) m³/); return igualNum(pt(certo(q)), m[1] * 1000); },
  'volume:3:1': q => { const m = q.q.match(/fundo de (\d+) dm por (\d+) dm e (\d+) dm de altura. Há água até (\d+)/); return igualNum(pt(certo(q)), m[1] * m[2] * (m[3] - m[4])); },
  'volume:3:2': q => { const m = q.q.match(/(\d+) litros de água por minuto .* de (\d+) dm por (\d+) dm por (\d+) dm/); return igualNum(pt(certo(q)), m[2] * m[3] * m[4] / m[1], 1e-9); },
  'volume:3:3': q => { const m = q.q.match(/(\d+) dm de comprimento, (\d+) dm de largura e (\d+) dm de altura. Quantos cubos de (\d+) dm/); return igualNum(pt(certo(q)), m[1] * m[2] * m[3] / m[4] ** 3, 1e-9); },
  'volume:3:4': q => { const m = q.q.match(/(\d+) m de comprimento, (\d+) m de largura e (\d+) m de profundidade/); return igualNum(pt(certo(q)), m[1] * m[2] * m[3] * 1000); },
  // ---------- notaveis ----------
  'notaveis:1:1': q => { const m = q.q.match(/(\d+) cm e (\d+) cm/); return igualNum(pt(certo(q)), (+m[1] + +m[2]) ** 2); },
  'notaveis:1:2': q => { const m = q.q.match(/\(x \+ (\d+)\)²/); return igualNum(pt(certo(q)), 2 * m[1]); },
  'notaveis:1:3': q => { const m = q.q.match(/lados (\d+) e (\d+) têm/); return igualNum(pt(certo(q)), 2 * m[1] * m[2]); },
  'notaveis:1:4': q => { const m = q.q.match(/calcular (\d+)²/); return igualNum(pt(certo(q)), m[1] ** 2); },
  'notaveis:2:1': q => { const b = +q.q.match(/\(x \+ (\d+)\)²/)[1]; const [p2, q1, r0] = coefPoli(certo(q)); return p2 === 1 && q1 === 2 * b && r0 === b * b ? null : `"${certo(q)}" não é (x+${b})²`; },
  'notaveis:2:2': q => { const b = +q.q.match(/\(x − (\d+)\)²/)[1]; const [p2, q1, r0] = coefPoli(certo(q)); return p2 === 1 && q1 === -2 * b && r0 === b * b ? null : `"${certo(q)}" não é (x−${b})²`; },
  'notaveis:2:3': q => { const m = q.q.match(/calcular (\d+) × (\d+)/); return igualNum(pt(certo(q)), m[1] * m[2]); },
  'notaveis:2:4': q => { const m = q.q.match(/calcular (\d+)²/); return igualNum(pt(certo(q)), m[1] ** 2); },
  'notaveis:3:1': q => { const m = q.q.match(/\((\d+)x \+ (\d+)\)²/); const [p2, q1, r0] = coefPoli(certo(q)); return p2 === m[1] ** 2 && q1 === 2 * m[1] * m[2] && r0 === m[2] ** 2 ? null : `"${certo(q)}" errado`; },
  'notaveis:3:2': q => { const m = q.q.match(/\((\d+)x − (\d+)\)\(/); const [p2, q1, r0] = coefPoli(certo(q)); return p2 === m[1] ** 2 && q1 === 0 && r0 === -(m[2] ** 2) ? null : `"${certo(q)}" errado`; },
  'notaveis:3:3': q => { const [, q1, r0] = coefPoli(q.q.match(/Fatore (.*)\.$/)[1]); const m = certo(q).match(/^\(x \+ (\d+)\)²$/); return m && 2 * m[1] === q1 && m[1] ** 2 === r0 ? null : `"${certo(q)}" não fatora o trinômio`; },
  'notaveis:3:4': q => { const m = q.q.match(/x \+ y = (\d+) e x · y = (\d+)/); return igualNum(pt(certo(q)), m[1] ** 2 - 2 * m[2]); },
  // ---------- poligonos ----------
  'poligonos:1:1': q => { const n = +q.q.match(/de (\d+) lados/)[1]; return igualNum(pt(certo(q)), n - 2); },
  'poligonos:1:2': q => { const n = +q.q.match(/de (\d+) lados/)[1]; return igualNum(pt(certo(q)), (n - 2) * 180); },
  'poligonos:1:3': q => { const N = { triângulo: 3, quadrado: 4, pentágono: 5, hexágono: 6, octógono: 8, decágono: 10, dodecágono: 12 }[q.q.match(/de um (\S+) regular/)[1]]; return igualNum(pt(certo(q)), 180 - 360 / N); },
  'poligonos:1:4': q => { const N = { triângulo: 3, quadrado: 4, pentágono: 5, hexágono: 6, octógono: 8, eneágono: 9, decágono: 10, dodecágono: 12 }[q.q.match(/de um (\S+) regular/)[1]]; return igualNum(pt(certo(q)), 360 / N); },
  'poligonos:2:1': q => { const n = +q.q.match(/de (\d+) lados/)[1]; return igualNum(pt(certo(q)), 180 - 360 / n); },
  'poligonos:2:2': q => igualNum(pt(certo(q)), 180 - +q.q.match(/mede (\d+)°/)[1]),
  'poligonos:2:3': q => igualNum(pt(certo(q)), 360 / q.q.match(/mede (\d+)°/)[1]),
  'poligonos:2:4': q => { const n = +q.q.match(/tem (\d+) lados/)[1]; return igualNum(pt(certo(q)), (n - 2) * 180); },
  'poligonos:3:1': q => { const i = +q.q.match(/mede (\d+)°/)[1]; return igualNum(pt(certo(q)), 360 / (180 - i)); },
  'poligonos:3:2': q => { const N = { triângulo: 3, quadrado: 4, hexágono: 6 }[q.q.match(/Quantos (\S+)s regulares/)[1]]; return igualNum(pt(certo(q)), 360 / (180 - 360 / N)); },
  'poligonos:3:3': q => { const N = { dodecágonos: 12, octógonos: 8, pentágonos: 5, hexágonos: 6 }[q.q.match(/Dois (\S+) regulares/)[1]]; const t = 360 - 2 * (180 - 360 / N), l = 360 / (180 - t); return Number.isInteger(l) && l >= 3 ? igualNum(pt(certo(q)), l) : `terceiro polígono inexistente (${l})`; },
  'poligonos:3:4': q => { const S = +q.q.match(/somam (\d+)°/)[1]; return igualNum(pt(certo(q)), S / 180 + 2); },
  // ---------- dizimas ----------
  'dizimas:1:1': q => { const m = q.q.match(/Dividindo (\d+) por (\d+)/); const [p, d] = [+m[1], +m[2]]; let r = p % d; const seen = {}, dig = []; while (r && seen[r] === undefined) { seen[r] = dig.length; r *= 10; dig.push(Math.floor(r / d)); r %= d; } const per = dig.slice(seen[r]).join(''); return igual(certo(q), per); },
  'dizimas:1:2': q => { const L = q.q.match(/Entre (.*), qual/)[1].split(/, | e /); const fin = L.filter(f => { let [n, d] = f.split('/').map(Number); const g = ((a, b) => { while (b) [a, b] = [b, a % b]; return a; })(n, d); d /= g; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; }); return fin.length === 1 && fin[0] === certo(q) ? null : `finitas: ${fin} resposta ${certo(q)}`; },
  'dizimas:1:3': q => { const n = +q.q.match(/Escreva ([\d ]+) em/)[1].replace(/\s/g, ''); const s = String(n); const e = s.length - 1; return igual(certo(q), `${s[0]} × 10${[...String(e)].map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')}`); },
  'dizimas:1:4': q => { const k = +q.q.match(/10⁻([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/)[1].split('').reduce((a, c) => a * 10 + SUPM[c], 0); return igual(certo(q), '0,' + '0'.repeat(k - 1) + '1'); },
  'dizimas:2:1': q => { const m = q.q.match(/0,\((\d+)\)/); const B = +m[1], r = m[1].length; const g = ((a, b) => { while (b) [a, b] = [b, a % b]; return a; })(B, 10 ** r - 1); const d = (10 ** r - 1) / g, n = B / g; return igual(certo(q), d === 1 ? String(n) : `${n}/${d}`); },
  'dizimas:2:2': q => { const m = q.q.match(/Escreva ([\d, ]+) em/)[1].replace(/\s/g, '').replace(',', '.'); const x = Number(m); const e = Math.floor(Math.log10(x) + 1e-12); const c = x / 10 ** e; const got = certo(q).match(/^([\d,]+) × 10(.*)$/); const ge = [...got[2]].reduce((a, ch) => ch === '⁻' ? -Math.abs(a) || '-' : a, 0); const gexp = Number(got[2].split('').map(ch => ch === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)).join('')); return Math.abs(Number(got[1].replace(',', '.')) * 10 ** gexp - x) < Math.abs(x) * 1e-9 && Number(got[1].replace(',', '.')) >= 1 && Number(got[1].replace(',', '.')) < 10 ? null : `"${certo(q)}" não representa ${x}`; },
  'dizimas:2:3': q => { const m = q.q.match(/Escreva ([\d, ]+) em/)[1].replace(/\s/g, '').replace(',', '.'); const x = Number(m); const got = certo(q).match(/^([\d,]+) × 10(.*)$/); const gexp = Number(got[2].split('').map(ch => ch === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)).join('')); const cf = Number(got[1].replace(',', '.')); return Math.abs(cf * 10 ** gexp - x) < Math.abs(x) * 1e-9 && cf >= 1 && cf < 10 ? null : `"${certo(q)}" não representa ${x}`; },
  'dizimas:2:4': q => { const m = q.q.match(/Escreva (\d+)\/(\d+) como/); return igualNum(pt(certo(q)), m[1] / m[2], 1e-9); },
  'dizimas:3:1': q => { const m = q.q.match(/0,(\d*)\((\d+)\)\?/); const A = m[1], B = m[2]; const n = parseInt(A + B, 10) - parseInt(A || '0', 10), d = (10 ** B.length - 1) * 10 ** A.length; return igualNum(fracP(certo(q)), n / d, 1e-9); },
  'dizimas:3:2': q => { const m = q.q.match(/de (\d+),\((\d+)\)\?/); return igualNum(fracP(certo(q)), +m[1] + m[2] / 9, 1e-9); },
  'dizimas:3:3': q => { const m = q.q.match(/\((\d+) × 10(.*?)\) × \((\d+) × 10(.*?)\)/); const ex = t => Number(t.split('').map(ch => ch === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)).join('')); const val = m[1] * 10 ** ex(m[2]) * m[3] * 10 ** ex(m[4]); const got = certo(q).match(/^([\d,]+) × 10(.*)$/); const cf = Number(got[1].replace(',', '.')); return Math.abs(cf * 10 ** ex(got[2]) - val) < Math.abs(val) * 1e-9 && cf >= 1 && cf < 10 ? null : `"${certo(q)}" não vale ${val}`; },
  'dizimas:3:4': q => { const m = q.q.match(/\((\d+) × 10(.*?)\) ÷ \((\d+) × 10(.*?)\)/); const ex = t => Number(t.split('').map(ch => ch === '⁻' ? '-' : '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)).join('')); const val = m[1] / m[3] * 10 ** (ex(m[2]) - ex(m[4])); const got = certo(q).match(/^([\d,]+) × 10(.*)$/); const cf = Number(got[1].replace(',', '.')); return Math.abs(cf * 10 ** ex(got[2]) - val) < Math.abs(val) * 1e-9 && cf >= 1 && cf < 10 ? null : `"${certo(q)}" não vale ${val}`; },
  // ---------- irracionais ----------
  'irracionais:1:1': q => { const L = q.q.match(/Entre (.*), qual é irracional/)[1].split(/, | e /); const irr = L.filter(x => x === 'π' || (/^√(\d+)$/.test(x) && !Number.isInteger(Math.sqrt(+x.slice(1))))); return irr.length === 1 && irr[0] === certo(q) ? null : `irracionais ${irr} resposta ${certo(q)}`; },
  'irracionais:1:2': q => { const j = +q.q.match(/número (\d+) tem/)[1]; return igual(certo(q), `√${j + 1}`); },
  'irracionais:1:3': q => { const k = +q.q.match(/√(\d+) está/)[1]; const a = Math.floor(Math.sqrt(k)); return igual(certo(q), `${a} e ${a + 1}`); },
  'irracionais:1:4': q => { const L = q.q.match(/Entre (.*), qual NÃO é/)[1].split(/, | e /); const rac = L.filter(x => !(x === 'π' || (/^√(\d+)$/.test(x) && !Number.isInteger(Math.sqrt(+x.slice(1)))))); return rac.length === 1 && rac[0] === certo(q) ? null : `racionais ${rac} resposta ${certo(q)}`; },
  'irracionais:2:1': q => { const k = +q.q.match(/mede √(\d+)\. Quanto/)[1]; return igual(certo(q), `√${k + 1}`); },
  'irracionais:2:2': q => { const k = +q.q.match(/Aproxime √(\d+)/)[1]; return igualNum(pt(certo(q)), Math.round(Math.sqrt(k) * 10) / 10, 1e-9); },
  'irracionais:2:3': q => { const k = +q.q.match(/de √(\d+)\?/)[1]; return igualNum(pt(certo(q)), Math.round(Math.sqrt(k)), 1e-9); },
  'irracionais:2:4': q => { const m = q.q.match(/de ([\d,]+), √(\d+) e ([\d,]+)\?/); const [a, k, b] = [pt(m[1]), +m[2], pt(m[3])]; return certo(q) === `${m[1]} < √${k} < ${m[3]}` && a < Math.sqrt(k) && Math.sqrt(k) < b ? null : `ordem incorreta para √${k}`; },
  'irracionais:3:1': q => { const L = +q.q.match(/lado (\d+) cm/)[1]; return igual(certo(q), `${L}√2 cm`); },
  'irracionais:3:2': q => { const m = +q.q.match(/mede exatamente (\d+)\?/)[1]; return igualNum(pt(certo(q)), m * m - 1); },
  'irracionais:3:3': q => { const L = q.q.match(/Quantos dos números (.*) são irracionais/)[1].split(/, | e /); const n = L.filter(x => x === 'π' || (/^√(\d+)$/.test(x) && !Number.isInteger(Math.sqrt(+x.slice(1))))).length; return igualNum(pt(certo(q)), n); },
  'irracionais:3:4': q => { const k = +q.q.match(/área de (\d+) cm²/)[1]; return igual(certo(q), `√${k} cm`); },
  // ---------- simetria ----------
  'simetria:1:1': q => { const [a, b] = ppSM(q.q.match(/ponto A(\([^)]*\))/)[1]); return igual(certo(q), fmtSM(a, -b)); },
  'simetria:1:2': q => { const [a, b] = ppSM(q.q.match(/ponto A(\([^)]*\))/)[1]); return igual(certo(q), fmtSM(-a, b)); },
  'simetria:1:3': q => { const m = q.q.match(/ponto A(\([^)]*\)) é transladado pelo vetor (\([^)]*\))/); const [a, b] = ppSM(m[1]), [x, y] = ppSM(m[2]); return igual(certo(q), fmtSM(a + x, b + y)); },
  'simetria:1:4': q => { const M = { 'um triângulo equilátero': 3, 'um quadrado': 4, 'um retângulo que não é quadrado': 2, 'um pentágono regular': 5, 'um hexágono regular': 6, 'um losango que não é quadrado': 2 }; return igual(certo(q), M[q.q.match(/tem (.*)\?$/)[1]]); },
  'simetria:2:1': q => { const m = q.q.match(/A(\([^)]*\)) é refletido na reta vertical x = (−?\d+)/); const [a, b] = ppSM(m[1]); return igual(certo(q), fmtSM(2 * +m[2].replace('−', '-') - a, b)); },
  'simetria:2:2': q => { const m = q.q.match(/A(\([^)]*\)) é refletido na reta horizontal y = (−?\d+)/); const [a, b] = ppSM(m[1]); return igual(certo(q), fmtSM(a, 2 * +m[2].replace('−', '-') - b)); },
  'simetria:2:3': q => { const m = q.q.match(/A(\([^)]*\)) gira (.*) em torno/); const [a, b] = ppSM(m[1]); const t = m[2]; const r = t === '180°' ? [-a, -b] : t === '90° no sentido anti-horário' ? [-b, a] : t === '90° no sentido horário' ? [b, -a] : [b, -a]; return igual(certo(q), fmtSM(r[0], r[1])); },
  'simetria:2:4': q => { const m = q.q.match(/ponto A(\([^)]*\)) ao ponto B(\([^)]*\))/); const [a, b] = ppSM(m[1]), [c, d] = ppSM(m[2]); return igual(certo(q), fmtSM(c - a, d - b)); },
  'simetria:3:1': q => { const m = q.q.match(/ponto A(\([^)]*\)) .* vetor (\([^)]*\))\./); const [a, b] = ppSM(m[1]), [x, y] = ppSM(m[2]); return igual(certo(q), fmtSM(-a + x, b + y)); },
  'simetria:3:2': q => { const [a, b] = ppSM(q.q.match(/ponto A(\([^)]*\))/)[1]); return igual(certo(q), fmtSM(-b, -a)); },
  'simetria:3:3': q => { const m = q.q.match(/x = (−?\d+) e, em seguida, na reta x = (−?\d+)/); const d = +m[2].replace('−', '-') - +m[1].replace('−', '-'); return igual(certo(q), fmtSM(2 * d, 0)); },
  'simetria:3:4': q => { const [a, b] = ppSM(q.q.match(/ponto A(\([^)]*\))/)[1]); return igual(certo(q), fmtSM(-a, -b)); },
  // ---------- semelhanca ----------
  'semelhanca:1:1': q => { const m = q.q.match(/razão (\d+)\. .* media (\d+) cm/); return igualNum(pt(certo(q)), m[1] * m[2]); },
  'semelhanca:1:2': q => { const m = q.q.match(/1\/(\d+) do tamanho. .* media (\d+) cm/); return igualNum(pt(certo(q)), m[2] / m[1]); },
  'semelhanca:1:3': q => { const m = q.q.match(/corresponde, no segundo, a um lado de (\d+)/); const l = q.q.match(/lados (\d+), (\d+) e (\d+)\./).slice(1).map(Number); const novo = +m[1]; const cands = l.filter(x => novo % x === 0).map(x => novo / x); return cands.includes(+certo(q)) ? null : `razão ${certo(q)} não explica ${novo} entre ${l}`; },
  'semelhanca:1:4': q => { const a = q.q.match(/mede (\d+)°\. Quanto/)[1]; return igual(certo(q), a + '°'); },
  'semelhanca:2:1': q => { const m = q.q.match(/lados (\d+), (\d+) e (\d+)\. .* correspondente a (\d+) mede (\d+)\. .* correspondente a (\d+)\?/); const k = m[5] / m[4]; return igualNum(pt(certo(q)), m[6] * k, 1e-9); },
  'semelhanca:2:2': q => { const m = q.q.match(/perímetro de (\d+) cm .* razão (\d+)/); return igualNum(pt(certo(q)), m[1] * m[2]); },
  'semelhanca:2:3': q => { const m = q.q.match(/área de (\d+) cm² .* razão (\d+)/); return igualNum(pt(certo(q)), m[1] * m[2] ** 2); },
  'semelhanca:2:4': q => { const m = q.q.match(/vara de (\d+) m projeta uma sombra de (\d+) m .* sombra de (\d+) m/); return igualNum(pt(certo(q)), m[1] * m[3] / m[2], 1e-9); },
  'semelhanca:3:1': q => { const m = q.q.match(/é (\d+)\/(\d+)\. Qual é a razão entre as áreas/); const sq = x => x * x; const g = ((a, b) => { while (b) [a, b] = [b, a % b]; return a; })(sq(m[1]), sq(m[2])); const n = sq(m[1]) / g, d = sq(m[2]) / g; return igual(certo(q), d === 1 ? String(n) : `${n}/${d}`); },
  'semelhanca:3:2': q => { const m = q.q.match(/razão (\d+)\/(\d+)\. Qual é a razão entre os lados/); return igual(certo(q), `${Math.sqrt(m[1])}/${Math.sqrt(m[2])}`); },
  'semelhanca:3:3': q => { const m = q.q.match(/escala 1:(\d+), .* a (\d+) cm/); return igualNum(pt(certo(q)), m[1] * m[2] / 100, 1e-9); },
  'semelhanca:3:4': q => { const m = q.q.match(/de ([\d,]+) m de altura projeta uma sombra de (\d+) m, .* sombra de (\d+) m/); return igualNum(pt(certo(q)), pt(m[1]) * m[3] / m[2], 1e-9); },
  'semelhanca:3:5': q => { let esp; let m;
    if ((m = q.q.match(/ângulos de (\d+)° e (\d+)°\. O triângulo B tem ângulos de (\d+)° e (\d+)°/))) { const A = [+m[1], +m[2], 180 - m[1] - m[2]].sort(), B = [+m[3], +m[4], 180 - m[3] - m[4]].sort(); esp = A.join() === B.join() ? 'Sim, pelo critério AA' : 'Não são semelhantes'; }
    else if ((m = q.q.match(/lados (\d+), (\d+) e (\d+)\. O triângulo B tem lados (\d+), (\d+) e (\d+)\./))) { const r = [m[4] / m[1], m[5] / m[2], m[6] / m[3]]; esp = r[0] === r[1] && r[1] === r[2] ? 'Sim, pelo critério LLL' : 'Não são semelhantes'; }
    else { m = q.q.match(/lados (\d+) e (\d+), com um ângulo de (\d+)° entre eles\. .* lados (\d+) e (\d+), com um ângulo de (\d+)°/); esp = m[4] / m[1] === m[5] / m[2] && m[3] === m[6] ? 'Sim, pelo critério LAL' : 'Não são semelhantes'; }
    return igual(certo(q), esp); },
  // ---------- graficos ----------
  'graficos:1:1': q => { const m = q.q.match(/A = (\d+) e B = (\d+)\./); return igual(certo(q), m[2] - m[1]); },
  'graficos:1:2': q => { const p = +q.q.match(/representa (\d+)% dos dados/)[1]; return igual(certo(q), `${Math.round(p * 360) / 100}°`); },
  'graficos:1:3': q => { const d = q.q.match(/foram: ([\d, ]+)\./)[1].split(', ').map(Number); const m = q.q.match(/classe \[(\d+), (\d+)\)\?/); return igual(certo(q), d.filter(x => x >= +m[1] && x < +m[2]).length); },
  'graficos:1:4': q => { const e = { 'a evolução da temperatura': 'Gráfico de linhas', 'a participação de cada gasto': 'Gráfico de setores', 'a comparação das vendas': 'Gráfico de colunas', 'como as alturas': 'Histograma' }; const k = Object.keys(e).find(x => q.q.includes(x)); return k ? igual(certo(q), e[k]) : 'situação não reconhecida'; },
  'graficos:2:1': q => { const d = q.q.match(/foram: ([\d, ]+)\./)[1].split(', ').map(Number); const m = q.q.match(/classe \[(\d+), (\d+)\)\?/); return igual(certo(q), d.filter(x => x >= +m[1] && x < +m[2]).length); },
  'graficos:2:2': q => { const m = q.q.match(/com (\d+) pessoas, (\d+) preferem/); return igualNum(pt(certo(q)), m[2] / m[1] * 360, 1e-9); },
  'graficos:2:3': q => { const m = q.q.match(/começa em (\d+)\. A coluna A representa (\d+) e a coluna B representa (\d+)\./); return igualNum(pt(certo(q)), (m[3] - m[1]) / (m[2] - m[1]), 1e-9); },
  'graficos:2:4': q => { const m = q.q.match(/vão de (\d+) a (\d+)\. .* amplitude (\d+)/); let n = 0; for (let a = +m[1]; a <= +m[2]; a += +m[3]) n++; /* classes [a, a+w) até conter o valor final */ let cont = 0, ini = +m[1]; while (!(+m[2] >= ini && +m[2] < ini + +m[3])) { ini += +m[3]; cont++; } return igual(certo(q), cont + 1); },
  'graficos:3:1': q => { const m = q.q.match(/é (\d+) vezes a altura da coluna A\. Os valores são A = (\d+) e B = (\d+)\./); const k = +m[1], a = +m[2], b = +m[3]; let x = null; for (let t = 0; t < a; t++) if (Math.abs((b - t) - k * (a - t)) < 1e-9) x = t; return igual(certo(q), x); },
  'graficos:3:2': q => { const g = +q.q.match(/ângulo de (\d+)°/)[1]; return igualNum(pt(certo(q)), g / 360 * 100, 1e-9); },
  'graficos:3:3': q => { let m; if ((m = q.q.match(/dos (\d+) alunos de uma escola, foram sorteados (\d+) alunos/))) return igualNum(pt(certo(q)), m[2] / m[1] * 100, 1e-9); return igual(certo(q), /perguntou-se a todos/.test(q.q) ? 'Censo' : /sortearam-se/.test(q.q) ? 'Amostra' : '?'); },
  'graficos:3:4': q => { const d = q.q.match(/foram: ([\d, ]+)\./)[1].split(', ').map(Number); const m = q.q.match(/classe \[(\d+), (\d+)\)\?/); return igualNum(pt(certo(q)), d.filter(x => x >= +m[1] && x < +m[2]).length / d.length * 100, 1e-9); },
  // ---------- sequencias ----------
  'sequencias:1:1': q => { const l = q.q.match(/sequência (\d+(?:, \d+)*), \.\.\./)[1].split(', ').map(Number); return igual(certo(q), l[l.length - 1] + (l[1] - l[0])); },
  'sequencias:1:2': q => { const l = q.q.match(/sequência (\d+(?:, \d+)*), \.\.\./)[1].split(', ').map(Number); return igual(certo(q), l[1] - l[0]); },
  'sequencias:1:3': q => { const m = q.q.match(/Com 1 \S+ são usados (\d+) palitos, com 2 são usados (\d+) palitos .* Quantos palitos são usados com (\d+)/); return igual(certo(q), +m[1] + (m[3] - 1) * (m[2] - m[1])); },
  'sequencias:1:4': q => { const l = q.q.match(/sequência (\d+(?:, \d+)*), \.\.\./)[1].split(', ').map(Number); return igual(certo(q), l[l.length - 1] * (l[1] / l[0])); },
  'sequencias:2:1': q => { const m = q.q.match(/começa com (\d+(?:, \d+)*), e continua do mesmo jeito\. Qual é o (\d+)º termo/); const l = m[1].split(', ').map(Number); return igual(certo(q), l[0] + (m[2] - 1) * (l[1] - l[0])); },
  'sequencias:2:2': q => { const m = q.q.match(/sequência (\d+(?:, \d+)*), \.\.\., o número (\d+) é um dos termos/); const l = m[1].split(', ').map(Number); return igual(certo(q), `${(m[2] - l[0]) / (l[1] - l[0]) + 1}ª posição`); },
  'sequencias:2:3': q => { const m = q.q.match(/Com 1 \S+ são usados (\d+) palitos, com 2 são usados (\d+) palitos .* Quantos palitos são usados com (\d+)/); return igual(certo(q), +m[1] + (m[3] - 1) * (m[2] - m[1])); },
  'sequencias:2:4': q => { const m = q.q.match(/começa com (\d+(?:, \d+)*), e continua multiplicando .* Qual é o (\d+)º termo/); const l = m[1].split(', ').map(Number); return igual(certo(q), l[0] * (l[1] / l[0]) ** (m[2] - 1)); },
  'sequencias:3:1': q => { const l = q.q.match(/começa com (\d+(?:, \d+)*)\. Qual é o termo geral/)[1].split(', ').map(Number); const r = l[1] - l[0], c = l[0] - r; return igual(certo(q), `an = ${c === 0 ? r + 'n' : r + 'n ' + (c < 0 ? '−' : '+') + ' ' + Math.abs(c)}`); },
  'sequencias:3:2': q => { const m = q.q.match(/Com 1 \S+ são usados (\d+) palitos, com 2 são usados (\d+) palitos .* Com (\d+) palitos, quantos/); return igual(certo(q), (m[3] - m[1]) / (m[2] - m[1]) + 1); },
  'sequencias:3:3': q => { const m = q.q.match(/a\(1\) = (\d+) e a\(n\) = a\(n−1\) (\+|×) (\d+), para n maior que 1\. Qual é o valor de a\((\d+)\)/); let a = +m[1]; for (let i = 2; i <= +m[4]; i++) a = m[2] === '+' ? a + +m[3] : a * m[3]; return igual(certo(q), a); },
  'sequencias:3:4': q => { const m = q.q.match(/número (\d+) faz parte da sequência de termo geral an = (\d+)n \+ (\d+)\?/); const n = (m[1] - m[3]) / m[2]; return igual(certo(q), Number.isInteger(n) && n >= 1 ? `Sim, na posição ${n}` : 'Não faz parte da sequência'); },
  // ---------- contagem ----------
  'contagem:1:1': q => { const m = q.q.match(/tem (\d+) camisetas e (\d+) bermudas/); return igual(certo(q), m[1] * m[2]); },
  'contagem:1:2': q => { const m = q.q.match(/oferece (\d+) sabores, (\d+) coberturas e (\d+) tipos/); return igual(certo(q), m[1] * m[2] * m[3]); },
  'contagem:1:3': q => { const m = q.q.match(/tem (\d+) dígitos, .* de (\d+) símbolos/); return igual(certo(q), m[2] ** m[1]); },
  'contagem:1:4': q => { const n = +q.q.match(/De quantas maneiras (\d+) pessoas/)[1]; let r = 1; for (let i = 2; i <= n; i++) r *= i; return igual(certo(q), r); },
  'contagem:2:1': q => { const m = q.q.match(/tem (\d+) entradas, (\d+) pratos principais e (\d+) sobremesas/); return igual(certo(q), m[1] * m[2] * m[3]); },
  'contagem:2:2': q => { const m = q.q.match(/tem (\d+) algarismos diferentes, .* entre (\d+) algarismos/); let r = 1; for (let i = 0; i < +m[1]; i++) r *= m[2] - i; return igual(certo(q), r); },
  'contagem:2:3': q => { const n = +q.q.match(/(\d+) atletas disputam/)[1]; return igual(certo(q), n * (n - 1) * (n - 2)); },
  'contagem:2:4': q => { const m = q.q.match(/Quantos números de (\d) algarismos( distintos)? existem/); let r = 9; for (let i = 1; i < +m[1]; i++) r *= m[2] ? 10 - i : 10; return igual(certo(q), r); },
  'contagem:3:1': q => { const m = q.q.match(/tem (\d+) camisas e (\d+) calças\. .*, (\d+) combinações/); return igual(certo(q), m[1] * m[2] - m[3]); },
  'contagem:3:2': q => { const w = q.q.match(/palavra (\S+),/)[1]; if (new Set(w).size !== w.length) return 'palavra com letra repetida'; let r = 1; for (let i = 2; i <= w.length; i++) r *= i; return igual(certo(q), r); },
  'contagem:3:3': q => { const m = q.q.match(/valor de (\d+)! ÷ (\d+)!/); let r = 1; for (let i = +m[2] + 1; i <= +m[1]; i++) r *= i; return igual(certo(q), r); },
  'contagem:3:4': q => { const n = +q.q.match(/^(\d+) pessoas em uma reunião/)[1]; return igual(certo(q), n * (n - 1) / 2); },
  // ---------- quadril ----------
  'quadril:1:1': q => { const t = q.q.match(/tem (.*)\. Qual é o nome/)[1]; const M = { '4 lados iguais e 4 ângulos retos': 'Quadrado', '4 ângulos retos e lados vizinhos com medidas diferentes': 'Retângulo', '4 lados iguais e ângulos que não são retos': 'Losango', 'lados opostos paralelos e iguais, sem ângulos retos e sem os 4 lados iguais': 'Paralelogramo', 'apenas um par de lados paralelos': 'Trapézio' }; return igual(certo(q), M[t]); },
  'quadril:1:2': q => { const n = q.q.match(/tem um (\S+)\?/)[1]; return igual(certo(q), n === 'trapézio' ? 1 : 2); },
  'quadril:1:3': q => { const V = ['quadrado>retângulo', 'quadrado>losango', 'quadrado>paralelogramo', 'retângulo>paralelogramo', 'losango>paralelogramo']; const m = certo(q).match(/Todo (\S+) é (\S+)\./); return V.includes(m[1] + '>' + m[2]) ? null : 'afirmação marcada como certa é falsa: ' + certo(q); },
  'quadril:1:4': q => { const P = +q.q.match(/perímetro de (\d+) cm/)[1]; return igual(certo(q), P / 4 + ' cm'); },
  'quadril:2:1': q => { const m = q.q.match(/medem (\d+)°, (\d+)° e (\d+)°/); return igual(certo(q), 360 - m[1] - m[2] - m[3] + '°'); },
  'quadril:2:2': q => { const a = +q.q.match(/um ângulo mede (\d+)°/)[1]; return igual(certo(q), 180 - a + '°'); },
  'quadril:2:3': q => { const D = +q.q.match(/Uma diagonal mede (\d+) cm/)[1]; return igual(certo(q), D / 2 + ' cm'); },
  'quadril:2:4': q => { const N = +q.q.match(/Uma estrutura tem (\d+) varetas/)[1]; return igual(certo(q), N - 3); },
  'quadril:3:1': q => { const A = +q.q.match(/área de (\d+) cm²/)[1]; return igual(certo(q), A / 2 + ' cm²'); },
  'quadril:3:2': q => { const M = { 'dois lados e o ângulo entre eles com medidas iguais': 'Sim, pelo caso LAL', 'os três lados com medidas iguais': 'Sim, pelo caso LLL', 'dois ângulos e o lado entre eles com medidas iguais': 'Sim, pelo caso ALA', 'os três ângulos com medidas iguais': 'Não, ângulos iguais não bastam', 'dois lados e um ângulo que não está entre eles com medidas iguais': 'Não, esses dados não garantem' }; const t = q.q.match(/Dois triângulos têm (.*)\. Eles/)[1]; return igual(certo(q), M[t]); },
  'quadril:3:3': q => { const m = q.q.match(/AB = x \+ (\d+) e CD = (\d+)x − (\d+)\./); return igual(certo(q), (+m[1] + +m[3]) / (m[2] - 1)); },
  'quadril:3:4': q => { const m = q.q.match(/medem (\d+) cm e (\d+) cm/); return igualNum(pt(certo(q)), Math.hypot(m[1] / 2, m[2] / 2), 1e-9); },
  // ---------- vistas ----------
  'vistas:1:1': q => { const m = vMat(q.q); return igual(certo(q), m.flat().reduce((a, b) => a + b, 0)); },
  'vistas:1:2': q => { const m = vMat(q.q); return igual(certo(q), m.flat().filter(x => x > 0).length); },
  'vistas:1:3': q => { const r = +q.q.match(/raio da base de (\d+) cm/)[1]; return igualNum(pt(certo(q)), 3.14 * r * r, 1e-9); },
  'vistas:1:4': q => { const m = q.q.match(/na (vista de [a-z]+) de (.*)\?/); const t = { 'um cilindro em pé': { 'vista de cima': 'Círculo', 'vista de frente': 'Retângulo' }, 'um cone em pé': { 'vista de cima': 'Círculo', 'vista de frente': 'Triângulo' }, 'uma esfera': { 'vista de frente': 'Círculo', 'vista de cima': 'Círculo' }, 'um cubo': { 'vista de cima': 'Quadrado', 'vista de frente': 'Quadrado' } }; return igual(certo(q), t[m[2]][m[1]]); },
  'vistas:2:1': q => { const m = vMat(q.q), c = +q.q.match(/coluna (\d) \(contando/)[1] - 1; return igual(certo(q), Math.max(m[0][c], m[1][c], m[2][c])); },
  'vistas:2:2': q => { const m = q.q.match(/raio da base de (\d+) cm e altura de (\d+) cm/); return igualNum(pt(certo(q)), 3.14 * m[1] * m[1] * m[2], 1e-9); },
  'vistas:2:3': q => { const m = vMat(q.q), l = +q.q.match(/para a linha (\d)\?/)[1] - 1; return igual(certo(q), Math.max(...m[l])); },
  'vistas:2:4': q => { const m = q.q.match(/tem (\d+) cm de diâmetro e (\d+) cm de altura/); const r = m[1] / 2; return igualNum(pt(certo(q)), 3.14 * r * r * m[2] / 1000, 1e-9); },
  'vistas:3:1': q => { const m = q.q.match(/raio (\d+) cm e altura (\d+) cm cabe/); return igualNum(pt(certo(q)), (4 - 3.14) * m[1] * m[1] * m[2], 1e-9); },
  'vistas:3:2': q => { const k = { 'o raio dobra e a altura continua a mesma': 4, 'o raio triplica e a altura continua a mesma': 9, 'a altura dobra e o raio continua o mesmo': 2, 'o raio dobra e a altura também dobra': 8 }; const f = Object.keys(k).find(x => q.q.includes(x)); return f ? igual(certo(q), `${k[f]} vezes`) : 'caso não reconhecido'; },
  'vistas:3:3': q => { const m = q.q.match(/volume de ([\d.,]+) cm³ e altura de (\d+) cm/); const r = Math.sqrt(pt(m[1]) / (3.14 * m[2])); return igualNum(pt(certo(q)), r, 1e-6); },
  'vistas:3:4': q => { const m = q.q.match(/colunas, da esquerda para a direita, são (\d), (\d), (\d)\. .* linhas, da frente para o fundo, são (\d), (\d), (\d)\./); const f = [+m[1], +m[2], +m[3]], l = [+m[4], +m[5], +m[6]]; let s = 0; for (const a of l) for (const b of f) s += Math.min(a, b); return igual(certo(q), s); },
  // ---------- quad ----------
  'quad:1:1': q => { const D = { 'quatro lados iguais e quatro ângulos retos': 'Quadrado', 'quatro ângulos retos e lados vizinhos de medidas diferentes': 'Retângulo', 'quatro lados iguais e ângulos que não são retos': 'Losango', 'dois pares de lados paralelos, lados vizinhos diferentes e ângulos que não são retos': 'Paralelogramo', 'apenas um par de lados paralelos': 'Trapézio' }; const m = q.q.match(/Um quadrilátero tem (.*)\. Qual é o nome/); return igual(certo(q), D[m[1]]); },
  'quad:1:2': q => { const m = q.q.match(/tem um (.+)\?/); return ['quadrado', 'retângulo', 'losango', 'paralelogramo'].includes(m[1]) ? igual(certo(q), '2') : 'figura inesperada'; },
  'quad:1:3': q => { const V = ['Todo quadrado é também um retângulo.', 'Todo quadrado é também um losango.', 'Todo losango é também um paralelogramo.', 'Todo retângulo é também um paralelogramo.', 'Num paralelogramo, os lados opostos são paralelos e têm a mesma medida.', 'A soma dos ângulos internos de qualquer quadrilátero é 360°.']; const F = ['Todo retângulo é também um quadrado.', 'Todo losango tem os quatro ângulos retos.', 'Todo paralelogramo tem os quatro lados iguais.', 'Todo losango é também um retângulo.', 'As diagonais de todo retângulo são perpendiculares.', 'Todo paralelogramo é um retângulo.']; if (!V.includes(certo(q))) return 'resposta marcada não é uma afirmação verdadeira'; const f = q.o.filter(x => V.includes(x)).length; return f === 1 && q.o.every(x => V.includes(x) || F.includes(x)) ? null : 'opções com mais de uma verdadeira ou texto estranho'; },
  'quad:1:4': q => { let m, esp; if ((m = q.q.match(/Um quadrado tem lado de (\d+) cm/))) esp = 4 * m[1]; else if ((m = q.q.match(/Um retângulo tem (\d+) cm de comprimento e (\d+) cm de largura/))) esp = 2 * (+m[1] + +m[2]); else if ((m = q.q.match(/Um losango tem lado de (\d+) cm/))) esp = 4 * m[1]; else return 'enunciado inesperado'; return igualNum(pt(certo(q)), esp, 1e-9); },
  'quad:2:1': q => { const x = +q.q.match(/ângulo mede (\d+)°/)[1]; return igualNum(pt(certo(q)), 180 - x, 1e-9); },
  'quad:2:2': q => { const m = q.q.match(/medem (\d+)°, (\d+)° e (\d+)°/); return igualNum(pt(certo(q)), 360 - m[1] - m[2] - m[3], 1e-9); },
  'quad:2:3': q => { const m = q.q.match(/medem (\d+) cm e (\d+) cm/); return igualNum(pt(certo(q)), Math.hypot(m[1] / 2, m[2] / 2), 1e-9); },
  'quad:2:4': q => { const m = q.q.match(/mede (\d+) cm por (\d+) cm/); return igualNum(pt(certo(q)), Math.hypot(+m[1], +m[2]), 1e-9); },
  'quad:3:1': q => { const m = q.q.match(/AB = (\d+)x \+ (\d+) e CD = (\d+)/); return igualNum(pt(certo(q)), (m[3] - m[2]) / m[1], 1e-9); },
  'quad:3:2': q => igual(certo(q), /três lados iguais/.test(q.q) ? 'LLL' : /ângulo B igual ao ângulo D/.test(q.q) ? 'LAL' : '?'),
  'quad:3:3': q => { const m = q.q.match(/lados de (\d+) cm, (\d+) cm e (\d+) cm/); return igualNum(pt(certo(q)), 2 * (+m[1] + +m[2]), 1e-9); },
  'quad:3:4': q => { const m = q.q.match(/diagonais de (\d+) cm e (\d+) cm/); return igualNum(pt(certo(q)), m[1] * m[2] / 2, 1e-9); },
  // ---------- paralelas ----------
  'paralelas:1:1': q => { const m = q.q.match(/chamam os ângulos (\d) e (\d)\?/); return igual(certo(q), plClasse(+m[1], +m[2])); },
  'paralelas:1:2': q => { const m = q.q.match(/ângulos (\d) e (\d) são (.+)\. O ângulo \1 mede (\d+)° \. ?|ângulos (\d) e (\d) são (.+)\. O ângulo (\d) mede (\d+)°\. Quanto mede o ângulo (\d)\?/); const r = q.q.match(/ângulos (\d) e (\d) são (.+?)\. O ângulo (\d) mede (\d+)°\. Quanto mede o ângulo (\d)\?/); const i = +r[1], j = +r[2], x = +r[5]; if (plClasse(i, j) !== r[3]) return 'classe do enunciado não confere com as posições'; const th = i % 2 ? x : 180 - x; return igualNum(pt(certo(q)), j % 2 ? th : 180 - th, 1e-9); },
  'paralelas:1:3': q => { const V = ['Ângulos correspondentes entre paralelas são iguais.', 'Ângulos alternos internos entre paralelas são iguais.', 'Ângulos colaterais internos entre paralelas somam 180°.', 'Ângulos opostos pelo vértice são sempre iguais.']; return V.includes(certo(q)) && q.o.filter(x => V.includes(x)).length === 1 ? null : 'marcada não é a única verdadeira'; },
  'paralelas:1:4': q => { const m = q.q.match(/Dois ângulos (.+) medem (\d+)° e (\d+)°/); const eq = ['correspondentes', 'alternos internos', 'alternos externos'].includes(m[1]); const par = eq ? m[2] === m[3] : +m[2] + +m[3] === 180; const esp = par ? (eq ? 'Sim, porque são iguais' : 'Sim, porque somam 180°') : (eq ? 'Não, porque deveriam ser iguais' : 'Não, porque deveriam somar 180°'); return igual(certo(q), esp); },
  'paralelas:2:1': q => { const r = q.q.match(/mede \((.+?)\)° e o ângulo \d mede \((.+?)\)°/); const a = plExp(r[1]), b = plExp(r[2]); return igualNum(pt(certo(q)), (b[1] - a[1]) / (a[0] - b[0]), 1e-9); },
  'paralelas:2:2': q => { const r = q.q.match(/mede \((.+?)\)° e o ângulo \d mede \((.+?)\)°/); const a = plExp(r[1]), b = plExp(r[2]); return igualNum(pt(certo(q)), (180 - a[1] - b[1]) / (a[0] + b[0]), 1e-9); },
  'paralelas:2:3': q => { const m = q.q.match(/O ângulo (\d) mede (\d+)°\. Quanto mede o ângulo (\d)\?/); const i = +m[1], j = +m[3], th = i % 2 ? +m[2] : 180 - m[2]; return igualNum(pt(certo(q)), j % 2 ? th : 180 - th, 1e-9); },
  'paralelas:2:4': q => { const m = q.q.match(/medem (\d+)° e (\d+)°/); return igualNum(pt(certo(q)), 180 - m[1] - m[2], 1e-9); },
  'paralelas:3:1': q => { const m = q.q.match(/de (\d+)° e (\d+)°/); return igualNum(pt(certo(q)), +m[1] + +m[2], 1e-9); },
  'paralelas:3:2': q => igual(certo(q), /soma dos ângulos internos/.test(q.q) ? 'Alternos internos' : 'As retas são paralelas'),
  'paralelas:3:3': q => { const r = q.q.match(/A mede \((.+?)\)° e o ângulo D mede \((.+?)\)°/); const a = plExp(r[1]), b = plExp(r[2]); const x = (180 - a[1] - b[1]) / (a[0] + b[0]); return igualNum(pt(certo(q)), b[0] * x + b[1], 1e-9); },
  'paralelas:3:4': q => { const r = q.q.match(/O ângulo (\d) mede \((.+?)\)° e o ângulo (\d) mede \((.+?)\)°\. Quanto mede o ângulo (\d)\?/); const a = plExp(r[2]), b = plExp(r[4]); const x = (b[1] - a[1]) / (a[0] - b[0]), th = a[0] * x + a[1]; const e = +r[5]; return igualNum(pt(certo(q)), e % 2 ? th : 180 - th, 1e-9); },
  // ---------- circ ----------
  'circ:1:1': q => { const x = +q.q.match(/mede (\d+)°/)[1]; return igualNum(pt(certo(q)), x, 1e-9); },
  'circ:1:2': q => { const x = +q.q.match(/mede (\d+)°/)[1]; return igualNum(pt(certo(q)), 2 * x, 1e-9); },
  'circ:1:3': q => { const a = +q.q.match(/arco de circunferência mede (\d+)°/)[1]; return igualNum(pt(certo(q)), a / 2, 1e-9); },
  'circ:1:4': q => igual(certo(q), /diâmetro|semicircunferência/.test(q.q) ? '90°' : '?'),
  'circ:2:1': q => { const r = q.q.match(/central mede \((.+?)\)° e o inscrito mede \((.+?)\)°/); const a = ciExp(r[1]), b = ciExp(r[2]); return igualNum(pt(certo(q)), (2 * b[1] - a[1]) / (a[0] - 2 * b[0]), 1e-9); },
  'circ:2:2': q => { const X = +q.q.match(/AÔB de uma circunferência mede (\d+)°/)[1]; return igualNum(pt(certo(q)), (180 - X) / 2, 1e-9); },
  'circ:2:3': q => { const r = q.q.match(/APB mede (\d+)° e o AQB mede \((.+?)\)°/); const b = ciExp(r[2]); return igualNum(pt(certo(q)), (r[1] - b[1]) / b[0], 1e-9); },
  'circ:2:4': q => { const r = q.q.match(/inscrito mede (\d+)° e o arco que ele enxerga mede \((.+?)\)°/); const b = ciExp(r[2]); return igualNum(pt(certo(q)), (2 * r[1] - b[1]) / b[0], 1e-9); },
  'circ:3:1': q => { const r = q.q.match(/medem (\d+)°, (\d+)° e (\d+)°\. Quanto mede o ângulo ([ABC])/); const arc = { C: +r[1], A: +r[2], B: +r[3] }[r[4]]; return igualNum(pt(certo(q)), arc / 2, 1e-9); },
  'circ:3:2': q => { const B = +q.q.match(/ângulo B mede (\d+)°/)[1]; return igualNum(pt(certo(q)), 90 - B, 1e-9); },
  'circ:3:3': q => { const r = q.q.match(/ângulo A mede \((.+?)\)° e o ângulo B mede \((.+?)\)°/); const a = ciExp(r[1]), b = ciExp(r[2]); return igualNum(pt(certo(q)), (90 - a[1] - b[1]) / (a[0] + b[0]), 1e-9); },
  'circ:3:4': q => { const S = +q.q.match(/dois é (\d+)°/)[1]; return igualNum(pt(certo(q)), S / 3, 1e-9); },
  // ---------- estim ----------
  'estim:1:1': q => { const m = q.q.match(/Arredondando ([\d.]+) para a (\w+)/); const b = { dezena: 10, centena: 100, milhar: 1000 }[m[2]]; const n = pt(m[1]); return igualNum(pt(certo(q)), Math.floor((n + b / 2) / b) * b, 1e-9); },
  'estim:1:2': q => { const m = q.q.match(/^([\d.]+) está entre quais (\w+)/); const b = /milhares/.test(q.q) ? 1000 : /centenas/.test(q.q) ? 100 : 10; const n = pt(m[1]); const lo = Math.floor(n / b) * b; return igual(certo(q), `${esN(lo)} e ${esN(lo + b)}`); },
  'estim:1:3': q => { const m = q.q.match(/estimar ([\d.]+) \+ ([\d.]+), .* para a (\w+)/); const b = m[3] === 'centena' ? 100 : 1000; const r = x => Math.floor((x + b / 2) / b) * b; return igualNum(pt(certo(q)), r(pt(m[1])) + r(pt(m[2])), 1e-9); },
  'estim:1:4': q => { const al = pt(q.q.match(/resulta em ([\d.]+)/)[1]); const n = pt(certo(q)); return igualNum(Math.floor((n + 50) / 100) * 100, al, 1e-9) || (q.o.filter(x => Math.floor((pt(x) + 50) / 100) * 100 === al).length === 1 ? null : 'mais de uma opção válida'); },
  'estim:2:1': q => { const m = q.q.match(/estimar (\d+) × (\d+)/); const r = x => Math.floor((x + 5) / 10) * 10; return igualNum(pt(certo(q)), r(+m[1]) * r(+m[2]), 1e-9); },
  'estim:2:2': q => { const m = q.q.match(/estimar ([\d.]+) ÷ (\d+)/); const A = Math.floor((pt(m[1]) + 50) / 100) * 100, B = Math.floor((+m[2] + 5) / 10) * 10; return igualNum(pt(certo(q)), A / B, 1e-9); },
  'estim:2:3': q => { const m = q.q.match(/tem (\d) itens/); return igual(certo(q), `R$ ${m[1] * 10 / 100 < 1 ? '0,' + String(m[1] * 10).padStart(2, '0') : '?'}`); },
  'estim:3:1': q => { const m = q.q.match(/o (maior|menor) número natural .* a (\w+) mais próxima, dá ([\d.]+)/); const b = { dezena: 10, centena: 100, milhar: 1000 }[m[2]]; const A = pt(m[3]); return igualNum(pt(certo(q)), m[1] === 'maior' ? A + b / 2 - 1 : A - b / 2, 1e-9); },
  'estim:3:2': q => { const m = q.q.match(/estimar (\d+) × (\d+)/); const r = x => Math.floor((x + 5) / 10) * 10; const e = r(+m[1]) * r(+m[2]), x = m[1] * m[2]; return igual(certo(q), e > x ? 'Maior que o resultado exato' : 'Menor que o resultado exato'); },
  'estim:3:3': q => { const m = pt(q.q.match(/arredondamento correto de ([\d.]+) para a centena/)[1]); return igualNum(pt(certo(q)), Math.floor((m + 50) / 100) * 100, 1e-9); },
  // ---------- lergraf ----------
  'lergraf:1:1': q => { const t = lgDados(q.q), m = q.q.match(/escolheram (.+)\?$/); return igualNum(pt(certo(q)), t[m[1]], 1e-9); },
  'lergraf:1:2': q => { const t = lgDados(q.q), maior = /mais escolhida/.test(q.q), e = Object.entries(t).sort((a, b) => maior ? b[1] - a[1] : a[1] - b[1]); return igual(certo(q), e[0][0]); },
  'lergraf:1:3': q => { const t = lgDados(q.q); return igualNum(pt(certo(q)), Object.values(t).reduce((a, b) => a + b, 0), 1e-9); },
  'lergraf:2:1': q => { const t = lgDados(q.q), m = q.q.match(/escolheram (.+) e (.+)\?$/); return igualNum(pt(certo(q)), Math.abs(t[m[1]] - t[m[2]]), 1e-9); },
  'lergraf:2:2': q => { const t = lgDados(q.q), m = q.q.match(/escolheram (.+)\?$/), T = Object.values(t).reduce((a, b) => a + b, 0); return igualNum(pt(certo(q)), t[m[1]] * 100 / T, 1e-9); },
  'lergraf:2:3': q => { const t = lgDados(q.q), mx = /a maior/.test(q.q), e = Object.entries(t).sort((a, b) => mx ? b[1] - a[1] : a[1] - b[1]); return igual(certo(q), e[0][0]); },
  'lergraf:3:1': q => { const t = lgDados(q.q), m = q.q.match(/escolheu (.+)\? Dê/), T = Object.values(t).reduce((a, b) => a + b, 0), v = t[m[1]], g = (a, b) => (b ? g(b, a % b) : a), d = g(v, T); return igual(certo(q), d === T / d * 0 + (T / d === 1 ? 1 : 0) && T / d === 1 ? String(v / d) : `${v / d}/${T / d}`); },
  'lergraf:3:2': q => { const t = lgDados(q.q), s = Object.values(t).reduce((a, b) => a + b, 0); return igualNum(pt(certo(q)), s / 6, 1e-9); },
  'lergraf:3:3': q => { const t = lgDados(q.q), n = Object.keys(t), v = Object.values(t); let b = 0, bi = 0; for (let i = 0; i < 5; i++) if (v[i + 1] - v[i] > b) { b = v[i + 1] - v[i]; bi = i; } return igual(certo(q), `${n[bi]} para ${n[bi + 1]}`); },
  // ---------- racmul ----------
  'racmul:1:1': q => { const m = q.q.match(/Quanto é (\d+)\/(\d+) × (\d+)\/(\d+)\?/); return igual(certo(q), rmF(m[1] * m[3], m[2] * m[4])); },
  'racmul:1:2': q => { const m = q.q.match(/Quanto é (\d+)\/(\d+) de (\d+)\?/); return igualNum(pt(certo(q)), m[1] * m[3] / m[2], 1e-9); },
  'racmul:1:3': q => { const m = q.q.match(/pedaços de 1\/(\d+) de pizza saem de (\d+) pizzas/); return igualNum(pt(certo(q)), m[1] * m[2], 1e-9); },
  'racmul:2:1': q => { const m = q.q.match(/Quanto é (\d+)\/(\d+) ÷ (\d+)\/(\d+)\?/); return igual(certo(q), rmF(m[1] * m[4], m[2] * m[3])); },
  'racmul:2:2': q => { const m = q.q.match(/Quanto é ([\d,]+) × ([\d,]+)\?/); const a = pt(m[1]), b = pt(m[2]); return igualNum(pt(certo(q)), Math.round(a * b * 100) / 100, 1e-9); },
  'racmul:2:3': q => { const m = q.q.match(/Quanto é \(?(−?\d+)\/(\d+)\)? × \(?(−?\d+)\/(\d+)\)?\? Dê/); return igual(certo(q), rmF(m[1].replace('−', '-') * m[3].replace('−', '-'), m[2] * m[4])); },
  'racmul:3:1': q => { const m = q.q.match(/com (\d+)\/(\d+) da capacidade\. Foram usados (\d+)\/(\d+)/); return igual(certo(q), rmF(m[1] * m[3], m[2] * m[4])); },
  'racmul:3:2': q => { const m = q.q.match(/fita de (\d+)(?:\/(\d+))? m será cortada em pedaços de (\d+)\/(\d+) m/); const tn = +m[1], td = +(m[2] || 1), pn = +m[3], pd = +m[4]; return igualNum(pt(certo(q)), (tn * pd) / (td * pn), 1e-9); },
  'racmul:3:3': q => { const m = q.q.match(/Quanto é \(?(−?\d+)\/(\d+)\)? ÷ \(?(−?\d+)\/(\d+)\)?\? Dê/); const A = +m[1].replace('−', '-'), C = +m[3].replace('−', '-'); return igual(certo(q), rmF(A * m[4], m[2] * C)); },
  // ---------- grandezas ----------
  'grandezas:1:1': q => { const m = q.q.match(/percorreu (\d+) km em (\d+) horas/); return igualNum(pt(certo(q)), m[1] / m[2], 1e-9); },
  'grandezas:1:2': q => { const m = q.q.match(/tem ([\d.]+) habitantes em (\d+) km²/); return igualNum(pt(certo(q)), pt(m[1]) / m[2], 1e-9); },
  'grandezas:1:3': q => { const m = q.q.match(/massa de (\d+) g e volume de (\d+) cm³/); return igualNum(pt(certo(q)), m[1] / m[2], 1e-9); },
  'grandezas:2:1': q => { const m = q.q.match(/média de (\d+) km\/h\. Quantos quilômetros ele percorre em (\d+) horas/); return igualNum(pt(certo(q)), m[1] * m[2], 1e-9); },
  'grandezas:2:2': q => { const m = q.q.match(/percorrer (\d+) km a (\d+) km\/h/); return igualNum(pt(certo(q)), m[1] / m[2], 1e-9); },
  'grandezas:2:3': q => { const m = q.q.match(/densidade demográfica de (\d+) hab\/km² e área de (\d+) km²/); return igualNum(pt(certo(q)), m[1] * m[2], 1e-9); },
  'grandezas:3:1': q => { const v = +q.q.match(/a (\d+) km\/h/)[1]; return igualNum(pt(certo(q)), v / 3.6, 1e-9); },
  'grandezas:3:2': q => { const m = q.q.match(/A cidade A tem ([\d.]+) habitantes em (\d+) km²\. A cidade B tem ([\d.]+) habitantes em (\d+) km²/); return igual(certo(q), pt(m[1]) / m[2] > pt(m[3]) / m[4] ? 'Cidade A' : 'Cidade B'); },
  'grandezas:3:3': q => { const m = q.q.match(/a (\d+) km\/h e volta pelo mesmo caminho a (\d+) km\/h/); return igualNum(pt(certo(q)), 2 * m[1] * m[2] / (+m[1] + +m[2]), 1e-9); },
  // ---------- rigidez ----------
  'rigidez:1:1': q => igual(certo(q), 'Triângulo'),
  'rigidez:1:2': q => { const N = { quadrilátero: 4, pentágono: 5, hexágono: 6, heptágono: 7, octógono: 8 }; const n = N[q.q.match(/Um (\S+) de varetas/)[1]]; return igual(certo(q), n - 3); },
  'rigidez:1:3': q => igual(certo(q), 'Para formar dois triângulos, que não se deformam'),
  'rigidez:2:1': q => { const n = +q.q.match(/polígono de (\d+) lados/)[1]; return igual(certo(q), n - 2); },
  'rigidez:2:2': q => { const N = { pentágono: 5, hexágono: 6, heptágono: 7, octógono: 8 }; const m = q.q.match(/Um (\S+) tem (\d+) travessas?/); return igual(certo(q), N[m[1]] - 3 - m[2]); },
  'rigidez:2:3': q => { const N = { pentágono: 5, hexágono: 6, heptágono: 7, octógono: 8 }; const m = q.q.match(/Um (\S+) de varetas tem (\d+) travessas/); const rig = +m[2] >= N[m[1]] - 3; return igual(certo(q), rig ? 'Sim, porque tudo ficou dividido em triângulos' : 'Não, porque ainda sobra uma parte que não é triângulo'); },
  'rigidez:3:1': q => { const m = q.q.match(/varetas de (\d+) cm, (\d+) cm e (\d+) cm/); const [a, b, c] = [+m[1], +m[2], +m[3]]; const ok = a + b > c && a + c > b && b + c > a; return igual(certo(q), ok ? 'Sim, porque cada lado é menor que a soma dos outros dois' : 'Não, porque um lado é maior ou igual à soma dos outros dois'); },
  'rigidez:3:2': q => { const n = +q.q.match(/estrutura de (\d+) lados/)[1]; return igual(certo(q), 2 * n - 3); },
  'rigidez:3:3': q => { const m = q.q.match(/mede (\d+) cm por (\d+) cm/); return igualNum(pt(certo(q)), Math.hypot(+m[1], +m[2]), 1e-9); },
  // ---------- Ensino Médio, lote 1 ----------
  'trigret:1:1': q => { const a = q.q.match(/reto em C, os catetos medem BC = (\d+) cm e AC = (\d+) cm/); const ang = q.q.match(/ângulo ([AB]),/)[1]; return igual(certo(q).startsWith(ang === 'A' ? 'BC' : 'AC'), true); },
  'trigret:1:2': q => { const m = q.q.match(/BC = (\d+), AC = (\d+) e AB = (\d+)\. Qual é o (\w+) do ângulo ([AB])/); const [, a, b, c, fn, ang] = m; const op = ang === 'A' ? +a : +b, ad = ang === 'A' ? +b : +a; const v = fn === 'seno' ? op / +c : fn === 'cosseno' ? ad / +c : op / ad; return igualNum(frN(certo(q)), v, 1e-9); },
  'trigret:1:3': q => { const m = q.q.match(/valor de (\w+) (\d+)°/); const T = { sen: { 30: 0.5, 45: Math.SQRT2 / 2, 60: Math.sqrt(3) / 2 }, cos: { 30: Math.sqrt(3) / 2, 45: Math.SQRT2 / 2, 60: 0.5 }, tg: { 30: Math.sqrt(3) / 3, 45: 1, 60: Math.sqrt(3) } }; return igualNum(raizN(certo(q)), T[m[1]][m[2]], 1e-9); },
  'trigret:1:4': q => { const x = +q.q.match(/mede (\d+)°/)[1]; return igual(certo(q), `${90 - x}°`); },
  'trigret:2:1': q => { const m = q.q.match(/hipotenusa mede (\d+) cm e um ângulo agudo mede (\d+)°.*cateto (\w+) a esse/); const r = +m[2] * Math.PI / 180; return igualNum(raizN(certo(q)), +m[1] * (m[3] === 'oposto' ? Math.sin(r) : Math.cos(r)), 1e-9); },
  'trigret:2:2': q => { const m = q.q.match(/vale (\d+)\/(\d+) e a hipotenusa mede (\d+) cm/); return igualNum(pt(certo(q)), +m[3] * m[1] / m[2], 1e-9); },
  'trigret:2:3': q => { const m = q.q.match(/tem (seno|cosseno) igual a (\d+)\/(\d+),/); const x = m[2] / m[3]; return igualNum(frN(certo(q)), Math.sqrt(1 - x * x), 1e-9); },
  'trigret:2:4': q => { const m = q.q.match(/tem (seno|cosseno) igual a (\d+)\/(\d+),/); const x = m[2] / m[3], y = Math.sqrt(1 - x * x); return igualNum(frN(certo(q)), m[1] === 'seno' ? x / y : y / x, 1e-9); },
  'trigret:3:1': q => { let m = q.q.match(/rampa de (\d+) m de comprimento/); if (m) return igual(certo(q), `${m[1] / 2} m`); m = q.q.match(/subir (\d+) m de altura/); return igual(certo(q), `${m[1] * 2} m`); },
  'trigret:3:2': q => { const m = q.q.match(/sombra de (\d+) m .* formam (\d+)°/); return igualNum(raizN(certo(q)), +m[1] * Math.tan(m[2] * Math.PI / 180), 1e-9); },
  'trigret:3:3': q => { const m = q.q.match(/poste de (\d+) m .* formando (\d+)°/); return igualNum(raizN(certo(q)), +m[1] / Math.sin(m[2] * Math.PI / 180), 1e-9); },
  'trigret:3:4': q => { if (/igual ao cateto adjacente/.test(q.q)) return igual(certo(q), '45°'); const m = q.q.match(/cateto (oposto|adjacente) a um ângulo agudo α mede (\d+) cm e a hipotenusa mede (\d+) cm/); const x = m[2] / m[3]; const d = Math.round((m[1] === 'oposto' ? Math.asin(x) : Math.acos(x)) * 180 / Math.PI); return igual(certo(q), `${d}°`); },
  'funcafim:1:1': q => { const l = vF(q.q.match(/f\(x\) = ([^,]+),/)[1]); return igualNum(pt(certo(q)), l.a); },
  'funcafim:1:2': q => { const l = vF(q.q.match(/f\(x\) = (.+?)\?/)[1]); return igualNum(pt(certo(q)), -l.b / l.a); },
  'funcafim:1:3': q => { const b = +q.q.match(/\(0, (−?\d+)\)/)[1].replace('−', '-'); const m = q.q.match(/y (aumenta|diminui) (\d+)/); const a = (m[1] === 'aumenta' ? 1 : -1) * +m[2]; const r = vF(certo(q).replace('f(x) = ', '')); return r.a === a && r.b === b ? null : `lei ${certo(q)}, esperado a=${a}, b=${b}`; },
  'funcafim:1:4': q => { const l = vF(q.q.match(/f\(x\) = (.+?) é crescente/)[1]); return igual(certo(q), l.a > 0 ? 'Crescente' : 'Decrescente'); },
  'funcafim:2:1': q => { const n = nums(q.q); const [x1, y1, x2, y2] = n; const a = (y2 - y1) / (x2 - x1), b = y1 - a * x1; const r = vF(certo(q).replace('f(x) = ', '')); return r.a === a && r.b === b ? null : `lei ${certo(q)}, esperado a=${a}, b=${b}`; },
  'funcafim:2:2': q => { const l = vF(q.q.match(/sendo f\(x\) = (.+?)\?/)[1]); const r = -l.b / l.a; return igual(certo(q), `x ${l.a > 0 ? '>' : '<'} ${nsn(r)}`); },
  'funcafim:2:3': q => { const m = q.q.match(/inequação (.+) < (−?\d+)\./); const l = vF(m[1]), c = +m[2].replace('−', '-'); const t = (c - l.b) / l.a; return igual(certo(q), `x ${l.a > 0 ? '<' : '>'} ${nsn(t)}`); },
  'funcafim:2:4': q => { const l = vF(q.q.match(/f\(x\) = ([^,]+),/)[1]); const c = +q.q.match(/f\(x\) = (−?\d+)\?/)[1].replace('−', '-'); return igualNum(pt(certo(q)), (c - l.b) / l.a); },
  'funcafim:3:1': q => { const [b1, a1, b2, a2] = nums(q.q); return igual(certo(q), `${(b2 - b1) / (a1 - a2)} km`); },
  'funcafim:3:2': q => { const [F0, c, p] = nums(q.q); return igual(certo(q), `${F0 / (p - c)} camisetas`); },
  'funcafim:3:3': q => { const [b, a, k] = nums(q.q); return igualNum(pt(certo(q)), a * k + b); },
  'funcafim:3:4': q => { const [y0, v] = nums(q.q); return igual(certo(q), `${y0 / v} min`); },
  'funcquad:1:1': q => { const l = vQ(q.q.match(/f\(x\) = (.+?) tem a concavidade/)[1]); return igual(certo(q), l.a > 0 ? 'Para cima' : 'Para baixo'); },
  'funcquad:1:2': q => { const l = vQ(q.q.match(/f\(x\) = (.+?) corta/)[1]); return igual(certo(q), `(0, ${nsn(l.c)})`); },
  'funcquad:1:3': q => { const l = vQ(q.q.match(/f\(x\) = (.+?)\?/)[1]); return igual(certo(q), `x = ${nsn(-l.b / (2 * l.a))}`); },
  'funcquad:1:4': q => { const m = q.q.match(/f\(x\) = (−?\d*)\(x ([−+]) (\d+)\)² ([+−]) (\d+)\?/); const h = (m[2] === '−' ? 1 : -1) * +m[3], k = (m[4] === '+' ? 1 : -1) * +m[5]; return igual(certo(q), `(${nsn(h)}, ${nsn(k)})`); },
  'funcquad:2:1': q => { const r = raizesFat(q.q); return igualNum(pt(certo(q)), (r[0] + r[1]) / 2); },
  'funcquad:2:2': q => { const m = q.q.match(/valor (mínimo|máximo) da função f\(x\) = (.+?)\?/); const l = vQ(m[2]); if ((l.a > 0) !== (m[1] === 'mínimo')) return 'mínimo/máximo incoerente com a'; return igualNum(pt(certo(q)), l.c - l.b * l.b / (4 * l.a)); },
  'funcquad:2:3': q => { const l = vQ(q.q.match(/função f\(x\) = (.+?) é crescente/)[1]); const xv = -l.b / (2 * l.a); return igual(certo(q), `x ${l.a < 0 ? '<' : '>'} ${nsn(xv)}`); },
  'funcquad:2:4': q => { const r = raizesFat(q.q).sort((a, b) => a - b); return igual(certo(q), `${nsn(r[0])} e ${nsn(r[1])}`); },
  'funcquad:3:1': q => { const P = nums(q.q)[0], m = P / 4; return /cada lado/.test(q.q) ? igual(certo(q), `${m} m`) : igual(certo(q), `${m * m} m²`); },
  'funcquad:3:2': q => { const l = vQ(q.q.match(/R\(p\) = (.+?), em que/)[1].replace(/p/g, 'x')); const m = l.b / 2; return /Qual preço/.test(q.q) ? igualNum(pt(certo(q)), m) : igualNum(pt(certo(q)), m * m); },
  'funcquad:3:3': q => { const l = vQ(q.q.match(/h\(t\) = (.+?)\. (Em|Qual)/)[1].replace(/t/g, 'x')); const tv = -l.b / (2 * l.a), hm = l.c - l.b * l.b / (4 * l.a); return /instante/.test(q.q) ? igual(certo(q), `${tv} s`) : igual(certo(q), `${hm} m`); },
  'funcquad:3:4': q => { const r = raizesFat(q.q).sort((a, b) => a - b); const neg = /f\(x\) < 0/.test(q.q); return igual(certo(q), neg ? `${nsn(r[0])} < x < ${nsn(r[1])}` : `x < ${nsn(r[0])} ou x > ${nsn(r[1])}`); },
  'pa:1:1': q => { const t = nums(q.q.split('é uma')[0]); return igualNum(pt(certo(q)), t[1] - t[0]); },
  'pa:1:2': q => { const opts = q.o.map(o => nums(o)); const bons = opts.filter(ehPA); return bons.length === 1 && ehPA(opts[q.c]) ? null : `${bons.length} opções são PA`; },
  'pa:1:3': q => { const t = nums(q.q.split('qual')[0]); return igualNum(pt(certo(q)), t[2] + (t[1] - t[0])); },
  'pa:1:4': q => { const [x, y] = nums(q.q); return igualNum(pt(certo(q)), (x + y) / 2); },
  'pa:2:1': q => { const [a1, r, n] = nums(q.q); return igualNum(pt(certo(q)), a1 + (n - 1) * r); },
  'pa:2:2': q => { const t = nums(q.q); const a1 = t[0], r = t[1] - t[0], T = t[3]; return igual(certo(q), String((T - a1) / r + 1)); },
  'pa:2:3': q => { const t = nums(q.q); const r = t[1] - t[0], a1 = t[0]; const l = vF(certo(q).replace('a(n) = ', '').replace(/n/g, 'x')); return l.a === r && l.b === a1 - r ? null : `lei ${certo(q)}, esperado ${r}n + ${a1 - r}`; },
  'pa:2:4': q => { const [m, A, B] = nums(q.q); return igualNum(pt(certo(q)), (B - A) / (m + 1)); },
  'pa:3:1': q => { const [a1, r, n] = nums(q.q); return igualNum(pt(certo(q)), n * (2 * a1 + (n - 1) * r) / 2); },
  'pa:3:2': q => { const t = q.q.match(/\+ \.\.\. \+ (\d+)\?/); const N = +t[1]; return igualNum(pt(certo(q)), N * (N + 1) / 2); },
  'pa:3:3': q => { const [n, a1, r] = nums(q.q); return igualNum(pt(certo(q)), n * (2 * a1 + (n - 1) * r) / 2); },
  'pa:3:4': q => { const [a1, r, n] = nums(q.q); return igualNum(pt(certo(q)), a1 + (n - 1) * r); },
  'pg:1:1': q => { const t = nums(q.q.split('é uma')[0]); return igualNum(frN(certo(q)), t[1] / t[0], 1e-9); },
  'pg:1:2': q => { const t = nums(q.q.split('qual')[0]); return igualNum(pt(certo(q)), t[2] * t[2] / t[1]); },
  'pg:1:3': q => { const [x, y] = nums(q.q); return igualNum(pt(certo(q)), Math.sqrt(x * y), 1e-9); },
  'pg:1:4': q => { const opts = q.o.map(o => nums(o)); const bons = opts.filter(l => l.length > 2 && l[0] !== 0 && l.every((x, i) => i === 0 || Math.abs(x / l[i - 1] - l[1] / l[0]) < 1e-12)); return bons.length === 1 && bons[0] === opts[q.c] ? null : `${bons.length} opções são PG`; },
  'pg:2:1': q => { const [a1, r, n] = nums(q.q); return igualNum(pt(certo(q)), a1 * Math.pow(r, n - 1)); },
  'pg:2:2': q => { const [a1, r] = nums(q.q); return igualNum(pt(certo(q)), a1 * Math.pow(r, 5) - (a1 + 5 * r)); },
  'pg:2:3': q => { const t = nums(q.q.split('em que')[0]); const T = pt(q.q.match(/número ([\d.]+)\?/)[1]); const r = t[1] / t[0]; return igual(certo(q), String(Math.round(Math.log(T / t[0]) / Math.log(r)) + 1)); },
  'pg:2:4': q => { const t = nums(q.q.split('qual')[0]); const r = t[1] / t[0]; return igualNum(pt(certo(q)), t[2] * r, 1e-9); },
  'pg:3:1': q => { const [a1, r, n] = nums(q.q); return igualNum(pt(certo(q)), a1 * (Math.pow(r, n) - 1) / (r - 1)); },
  'pg:3:2': q => { const a1 = +q.q.match(/infinita (\d+) \+/)[1]; const m = q.q.match(/razão (\d+)\/(\d+)\?/); return igualNum(pt(certo(q)), a1 / (1 - m[1] / m[2]), 1e-9); },
  'pg:3:3': q => { const [a1, n] = nums(q.q); return igualNum(pt(certo(q)), a1 * Math.pow(2, n)); },
  'pg:3:4': q => { const [m0, h] = nums(q.q); return igual(certo(q), `${m0 / Math.pow(2, h)} g`); },
  // ---------- Ensino Médio, lote 2 ----------
  'conj:1:1': q => { const m = q.q.match(/\| (−?\d+) ≤ x ≤ (−?\d+)\}/); return igual(certo(q), +m[2].replace('−', '-') - +m[1].replace('−', '-') + 1); },
  'conj:1:2': q => igual(certo(q), rosC(q.q).i),
  'conj:1:3': q => igual(certo(q), rosC(q.q).u),
  'conj:1:4': q => { const m = q.q.match(/\| (−?\d+) (≤|<) x (≤|<) (−?\d+)\}/); return igual(certo(q), `${m[2] === '≤' ? '[' : '('}${m[1]}, ${m[4]}${m[3] === '≤' ? ']' : ')'}`); },
  'conj:2:1': q => { const [a, b, i] = nums(q.q); return igual(certo(q), a + b - i); },
  'conj:2:2': q => { const c = rosC(q.q); return igual(certo(q), c.A.length - c.i); },
  'conj:2:3': q => { const [A, B] = ivsT(q.q); const f = x => noIv(A, x) && noIv(B, x); const ok = amostra(f); const alt = q.o.map(o => amostra(x => noLista(ivsT(o), x))); const got = alt[q.c]; if (got !== ok) return `a opção marcada não é A ∩ B: ${certo(q)}`; return alt.filter(z => z === ok).length === 1 ? null : 'duas opções equivalentes'; },
  'conj:2:4': q => { const [A, B] = ivsT(q.q); const f = x => noIv(A, x) || noIv(B, x); const ok = amostra(f); const alt = q.o.map(o => amostra(x => noLista(ivsT(o), x))); if (alt[q.c] !== ok) return `a opção marcada não é A ∪ B: ${certo(q)}`; return alt.filter(z => z === ok).length === 1 ? null : 'duas opções equivalentes'; },
  'conj:3:1': q => { const [N, X, Y, Z] = nums(q.q); const u = X + Y - Z; return igual(certo(q), /nenhum/.test(q.q) ? N - u : u); },
  'conj:3:2': q => { const [X, Y, Z] = nums(q.q); return igual(certo(q), /apenas de matemática/.test(q.q) ? X - Z : X + Y - 2 * Z); },
  'conj:3:3': q => { const [I] = ivsT(q.q); let n = 0; for (let x = -20; x <= 30; x++) if (noIv(I, x)) n++; return igual(certo(q), n); },
  'conj:3:4': q => { const [A, B] = ivsT(q.q); let n = 0; for (let x = -20; x <= 30; x++) if (noIv(A, x) && noIv(B, x)) n++; return igual(certo(q), n); },
  'notcient:1:1': q => sciOk(certo(q), pt(q.q.match(/Escreva ([\d.,]+) em/)[1])),
  'notcient:1:2': q => sciOk(certo(q), pt(q.q.match(/Escreva ([\d.,]+) em/)[1])),
  'notcient:1:3': q => { const a = sciAll(q.q)[0]; return rel(pt(certo(q)), a.v); },
  'notcient:1:4': q => { const bons = q.o.filter(o => { const a = sciAll(o)[0]; return a && a.m >= 1 && a.m < 10; }); return bons.length === 1 && bons[0] === certo(q) ? null : `${bons.length} opções em notação científica`; },
  'notcient:2:1': q => { const [a, b] = sciAll(q.q); return sciOk(certo(q), a.v * b.v); },
  'notcient:2:2': q => { const [a, b] = sciAll(q.q); return sciOk(certo(q), a.v / b.v); },
  'notcient:2:3': q => { const a = sciAll(q.q)[0]; return igual(certo(q), `10${supS(a.m < Math.sqrt(10) ? a.e : a.e + 1)}`); },
  'notcient:2:4': q => { const [a, b] = sciAll(q.q); return sciOk(certo(q), a.v + b.v); },
  'notcient:3:1': q => { const a = sciAll(q.q)[0]; return rel(pt(certo(q)), 1e-3 / a.v); },
  'notcient:3:2': q => { const [v, d] = sciAll(q.q); return sciOk(certo(q), d.v / v.v); },
  'notcient:3:3': q => { const [a, b] = sciAll(q.q); return sciOk(certo(q), a.v * b.v); },
  'notcient:3:4': q => { const [a, b] = sciAll(q.q); const mx = a.v > b.v ? a : b; const t = `${String(mx.m).replace('.', ',')} × 10${supS(mx.e)}`; return igual(certo(q), t); },
  'funcexp:1:1': q => { const l = feLei(q.q), n = +q.q.match(/calcule f\((\d+)\)/)[1]; return rel(pt(certo(q)), l.a * Math.pow(l.b, n)); },
  'funcexp:1:2': q => { const l = feLei(q.q); return igual(certo(q), l.b === 1 ? 'Constante' : l.inv ? 'Decrescente' : 'Crescente'); },
  'funcexp:1:3': q => { const l = feLei(q.q); return igual(certo(q), `(0, ${l.a})`); },
  'funcexp:1:4': q => { const m = q.q.match(/Quanto vale (\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)\?/); const b = +m[1], n = -supN(m[2]); return igual(certo(q), `1/${Math.pow(b, n)}`); },
  'funcexp:2:1': q => { const m = q.q.match(/f\(0\) = (\d+) e f\(2\) = (\d+)/); return rel(pt(certo(q)), Math.sqrt(m[2] / m[1])); },
  'funcexp:2:2': q => { const m = q.q.match(/equação (\d+)ˣ = (\S+?)\./); return rel(pt(certo(q)), logB(frN(m[2]), +m[1])); },
  'funcexp:2:3': q => { const m = q.q.match(/equação (\d+)ˣ = (\d+)\./); return rel(frN(certo(q)), Math.log(+m[2]) / Math.log(+m[1])); },
  'funcexp:2:4': q => { const m = q.q.match(/V\(t\) = ([\d.]+) · ([\d,]+)ᵗ.*após (\d+) anos/); return rel(pt(certo(q)), pt(m[1]) * Math.pow(pt(m[2]), +m[3]), 1e-9); },
  'funcexp:3:1': q => { const m = q.q.match(/N\(t\) = (\d+) · (\d+)ᵗ.*chega a ([\d.]+) bactérias/); return igual(certo(q), `${logB(pt(m[3]) / +m[1], +m[2])} horas`); },
  'funcexp:3:2': q => { const m = q.q.match(/tem (\d+) g e sua meia-vida é de (\d+) horas.*após (\d+) horas/); return igual(certo(q), `${+m[1] / Math.pow(2, +m[3] / +m[2])} g`); },
  'funcexp:3:3': q => { const m = q.q.match(/hoje de ([\d.]+) habitantes e cresce (\d+)% ao ano.*em (\d+) anos/); return rel(pt(certo(q)), pt(m[1]) * Math.pow(1 + m[2] / 100, +m[3]), 1e-9); },
  'funcexp:3:4': q => { const m = q.q.match(/x = (\d+), qual é maior: (\d+)ˣ ou (\d+)x\?/); const A = Math.pow(+m[2], +m[1]), B = +m[3] * +m[1]; return igual(certo(q), A > B ? `${m[2]}ˣ` : `${m[3]}x`); },
  'log:1:1': q => { const m = q.q.match(/log([₀-₉]+) ([\d.]+)\?/); return igual(certo(q), logB(pt(m[2]), subN(m[1]))); },
  'log:1:2': q => { const m = q.q.match(/Escreva (\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = ([\d.]+) na/); const b = +m[1], x = supN(m[2]); return igual(certo(q), `log${subS(b)} ${m[3]} = ${x}`); },
  'log:1:3': q => { const m = q.q.match(/log([₀-₉]+) (\S+?)\?/); return rel(pt(certo(q)), logB(frN(m[2]), subN(m[1]))); },
  'log:1:4': q => { const m = q.q.match(/log ([\d.,]+)\?/); return rel(pt(certo(q)), Math.round(Math.log10(pt(m[1].replace(/\.(?=\d{3}\b)/g, ''))))); },
  'log:2:1': q => { const m = q.q.match(/log([₀-₉]+) x = (\d+)/); return rel(pt(certo(q)), Math.pow(subN(m[1]), +m[2])); },
  'log:2:2': q => { const m = q.q.match(/logaritmo de ([\d.]+) na base b vale (\d+)/); return rel(pt(certo(q)), Math.round(Math.pow(pt(m[1]), 1 / +m[2]))); },
  'log:2:3': q => { const m = q.q.match(/log([₀-₉]+) ([\d.]+) ([+−]) log[₀-₉]+ ([\d.]+)/); const b = subN(m[1]), x = logB(pt(m[2]), b), y = logB(pt(m[4]), b); return rel(pt(certo(q)), m[3] === '+' ? x + y : x - y); },
  'log:2:4': q => { const m = q.q.match(/log([₀-₉]+) \((\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\)/); return rel(pt(certo(q)), logB(+m[2], subN(m[1])) * supN(m[3])); },
  'log:3:1': q => { const k = supN(q.q.match(/igual a 10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+) mol/)[1]); return rel(pt(certo(q)), -k); },
  'log:3:2': q => { const m = q.q.match(/pH (\d+) e outra tem pH (\d+)/); return rel(pt(certo(q)), Math.pow(10, m[2] - m[1])); },
  'log:3:3': q => { const m = q.q.match(/sobra 1\/(\d+)/); return rel(pt(certo(q)), logB(+m[1], 2)); },
  'log:3:4': q => { const m = q.q.match(/magnitude (\d+) é maior que a de um de magnitude (\d+)/); return rel(pt(certo(q)), Math.pow(10, m[1] - m[2])); },
  'matfin:1:1': q => { const m = q.q.match(/capital de (R\$ [\d.,]+) é aplicado a juros compostos de (\d+)% ao mês durante (\d+) meses/); return rel(pt(certo(q)), pt(m[1]) * Math.pow(1 + m[2] / 100, +m[3]), 5e-7); },
  'matfin:1:2': q => { const m = q.q.match(/capital de (R\$ [\d.,]+) rende (\d+)% ao mês durante (\d+) meses/); const C = pt(m[1]), i = m[2] / 100, n = +m[3]; return rel(pt(certo(q)), C * Math.pow(1 + i, n) - C * (1 + i * n), 5e-6); },
  'matfin:1:3': q => { const m = q.q.match(/aplicar (R\$ [\d.,]+) a juros compostos de (\d+)% ao mês durante (\d+) meses/); const C = pt(m[1]); return rel(pt(certo(q)), C * Math.pow(1 + m[2] / 100, +m[3]) - C, 5e-6); },
  'matfin:1:4': q => { const [a, b] = nums(q.q); return rel(pt(certo(q)), (100 + a) * (100 + b) / 100 - 100, 1e-9); },
  'matfin:2:1': q => { const m = q.q.match(/Após (\d+) meses a juros compostos de (\d+)% ao mês, um capital virou (R\$ [\d.,]+)\./); return rel(pt(certo(q)), pt(m[3]) / Math.pow(1 + m[2] / 100, +m[1]), 5e-6); },
  'matfin:2:2': q => { const m = q.q.match(/capital de (R\$ [\d.,]+) rende (\d+)% ao mês a juros compostos\. Em quantos meses o montante chega a (R\$ [\d.,]+)\?/); return igual(certo(q), `${Math.round(Math.log(pt(m[3]) / pt(m[1])) / Math.log(1 + m[2] / 100))} meses`); },
  'matfin:2:3': q => { const m = q.q.match(/capital de (R\$ [\d.,]+) virou (R\$ [\d.,]+) em 2 meses/); return rel(pt(certo(q)), Math.round((Math.sqrt(pt(m[2]) / pt(m[1])) - 1) * 100), 1e-9); },
  'matfin:2:4': q => { const m = q.q.match(/produto de (R\$ [\d.,]+) sobe (\d+)%/); return rel(pt(certo(q)), pt(m[1]) * (1 - m[2] * m[2] / 10000), 5e-6); },
  'matfin:3:1': q => { const m = q.q.match(/inflação foi de (\d+)% ao ano durante (\d+) anos/); return rel(pt(certo(q)), (Math.pow(1 + m[1] / 100, +m[2]) - 1) * 100, 1e-6); },
  'matfin:3:2': q => { const m = q.q.match(/TV custa (R\$ [\d.,]+) à vista ou uma parcela única de (R\$ [\d.,]+)/); return rel(pt(certo(q)), Math.round((Math.sqrt(pt(m[2]) / pt(m[1])) - 1) * 100), 1e-9); },
  'matfin:3:3': q => { const m = q.q.match(/inflação de (\d+)% ao mês, quanto um salário de (R\$ [\d.,]+) precisa/); return rel(pt(certo(q)), pt(m[2]) * Math.pow(1 + m[1] / 100, 2), 5e-6); },
  'matfin:3:4': q => igual(certo(q), '2º mês'),
  // ---------- angpol ----------
  'angpol:1:1': q => { const [a, b] = nums(q.q); return igual(certo(q), `${180 - a - b}°`); },
  'angpol:1:2': q => { const [a, b, c] = nums(q.q); return igual(certo(q), `${360 - a - b - c}°`); },
  'angpol:1:3': q => igual(certo(q), /externos/.test(q.q) || /quadrilátero/.test(q.q) ? '360°' : '180°'),
  'angpol:1:4': q => { const [x] = nums(q.q); return igual(certo(q), `${180 - x}°`); },
  'angpol:2:1': q => { const [a, b] = nums(q.q); return igual(certo(q), `${a + b}°`); },
  'angpol:2:2': q => { const n = nums(q.q.replace(/360°/, '')); return igual(certo(q), `${360 - n.reduce((x, y) => x + y, 0)}°`); },
  'angpol:2:3': q => { const n = nums(q.q.replace(/x \+ /g, '+')); const d = n.slice(0, 3); const x = (360 - d.reduce((a, b) => a + b, 0)) / 4; return igual(certo(q), `${x}°`); },
  'angpol:2:4': q => { const [b] = nums(q.q); return igual(certo(q), `${180 - 2 * b}°`); },
  'angpol:3:1': q => { const [p, r, t] = nums(q.q); const s = p + r + t; return igual(certo(q), `${180 * Math.max(p, r, t) / s}°`); },
  'angpol:3:2': q => { const [e] = nums(q.q); return igual(certo(q), `${e / 2}°`); },
  'angpol:3:3': q => { const [e1, e2, e3] = nums(q.q); return igual(certo(q), `${e1 + e2 + e3 - 180}°`); },
  'angpol:3:4': q => { const m = nums(q.q); return igual(certo(q), `${m[0] - m[1]}°`); },
  // ---------- angx ----------
  'angx:1:1': q => igual(certo(q), `${axSoma(axLista(q), 180)}°`),
  'angx:1:2': q => igual(certo(q), `${axSoma(axLista(q), 360)}°`),
  'angx:1:3': q => igual(certo(q), `${axSoma(axLista(q), 180)}°`),
  'angx:1:4': q => { const e = axLista(q), T = axFig(q), P = e.reduce((s, t) => s + t[0], 0), Q = e.reduce((s, t) => s + t[1], 0); return igual(certo(q), `${axF(P, Q)} = ${T}°`); },
  'angx:2:1': q => igual(certo(q), `${axSoma(axLista(q), 180)}°`),
  'angx:2:2': q => igual(certo(q), `${axSoma(axLista(q), 360)}°`),
  'angx:2:3': q => { const e = axLista(q), x = axSoma(e, axFig(q)); return igual(certo(q), `${Math.max(...e.map(t => t[0] * x + t[1]))}°`); },
  'angx:2:4': q => { const e = axLista(q), x = axSoma(e, axFig(q)), t = axp(q.q.match(/mede o ângulo (.+?)\?$/)[1]); return igual(certo(q), `${t[0] * x + t[1]}°`); },
  'angx:3:1': q => { const m = q.q.match(/em A mede (.+?), o interno em B mede (.+?) e o externo em C mede (.+?)\. Qual/); const [a, b, c] = [axp(m[1]), axp(m[2]), axp(m[3])]; return igual(certo(q), `${(c[1] - a[1] - b[1]) / (a[0] + b[0] - c[0])}°`); },
  'angx:3:2': q => { const m = q.q.match(/mede (\d+)° e os ângulos da base medem (.+?) e (.+?)\. Qual/); const a = axp(m[2]), b = axp(m[3]); return igual(certo(q), `${(b[1] - a[1]) / (a[0] - b[0])}°`); },
  'angx:3:3': q => { const m = q.q.match(/consecutivos medem (.+?) e (.+?)\. Qual/); const a = axp(m[1]), b = axp(m[2]); return igual(certo(q), `${(180 - a[1] - b[1]) / (a[0] + b[0])}°`); },
  'angx:3:4': q => { const m = q.q.match(/em A mede (.+?), o interno em B mede (.+?) e o externo em C mede (.+?)\. Quanto mede o ângulo (interno|externo) em C/); const [a, b, c] = [axp(m[1]), axp(m[2]), axp(m[3])]; const x = (c[1] - a[1] - b[1]) / (a[0] + b[0] - c[0]); const X = c[0] * x + c[1]; return igual(certo(q), `${m[4] === 'externo' ? X : 180 - X}°`); },
  // ---------- ciclotrig ----------
  'ciclotrig:1:1': q => { const a = nums(q.q)[0]; return igual(certo(q), `${cicFr(a)} rad`); },
  'ciclotrig:1:2': q => { const f = q.q.match(/a (.+?) rad\?/)[1]; return igual(certo(q), `${cicPi(f) * 180}°`); },
  'ciclotrig:1:3': q => { const m = q.q.match(/valor de (sen|cos) (\d+)°/); return igualNum(cicNum(certo(q)), cicTrig(m[1], +m[2]), 1e-9); },
  'ciclotrig:1:4': q => { const a = nums(q.q)[0], n = ['', 'Primeiro', 'Segundo', 'Terceiro', 'Quarto'][cicQuad(a)]; return igual(certo(q), `${n} quadrante`); },
  'ciclotrig:2:1': q => { const a = nums(q.q)[0], s = Math.sin(a * Math.PI / 180) > 0, c = Math.cos(a * Math.PI / 180) > 0; return igual(certo(q), `sen ${s ? '>' : '<'} 0 e cos ${c ? '>' : '<'} 0`); },
  'ciclotrig:2:2': q => { const m = q.q.match(/valor de (sen|cos) (\d+)°/); return igualNum(cicNum(certo(q)), cicTrig(m[1], +m[2]), 1e-9); },
  'ciclotrig:2:3': q => { const a = nums(q.q)[0]; return igual(certo(q), `${((a % 360) + 360) % 360}°`); },
  'ciclotrig:2:4': q => { const f = q.q.match(/de (.+?) rad\?/)[1], d = cicPi(f) * 180; return igual(certo(q), `${cicFr(d % 360)} rad`); },
  'ciclotrig:3:1': q => { const m = q.q.match(/Se (sen|cos) θ = (−?\d+\/\d+) e θ está no (\d)º quadrante, qual é o valor de (sen|cos) θ\?/); const v = cicNum(m[2]), qd = +m[3], r = Math.sqrt(1 - v * v); const sgn = m[4] === 'cos' ? ((qd === 1 || qd === 4) ? 1 : -1) : (qd <= 2 ? 1 : -1); return igualNum(cicNum(certo(q)), sgn * r, 1e-9); },
  'ciclotrig:3:2': q => { const m = q.q.match(/satisfazem (sen|cos) x = (.+?)\?/); const v = cicNum(m[2]); let n = 0; for (let x = 0; x < 360; x++) if (Math.abs(cicTrig(m[1], x) - v) < 1e-9) n++; return igual(certo(q), String(n)); },
  'ciclotrig:3:3': q => { const [r, a] = nums(q.q); return igualNum(cicPi(certo(q)), a * r / 180, 1e-9); },
  'ciclotrig:3:4': q => { const t = nums(q.q)[0]; return igual(certo(q), `${Math.floor(t / 360)} voltas e ${t % 360}°`); },
  // ---------- functrig ----------
  'functrig:1:1': q => { const e = ftExp(q.q), mx = /máximo/.test(q.q.split(' de y')[0]); return igual(certo(q), ftSg(mx ? e.A + e.D : e.D - e.A)); },
  'functrig:1:2': q => { const e = ftExp(q.q); return igual(certo(q), `${360 / e.B}°`); },
  'functrig:1:3': q => { const e = ftExp(q.q); return igual(certo(q), `[${ftSg(e.D - e.A)}, ${ftSg(e.D + e.A)}]`); },
  'functrig:1:4': q => { const e = ftExp(q.q); return igual(certo(q), String(e.fn === 'sen' ? 2 * e.B + 1 : 2 * e.B)); },
  'functrig:2:1': q => { const e = ftCtx(q.q), mx = /maior altura/.test(q.q.split('Qual é a')[1] || q.q); return igual(certo(q), `${mx ? e.D + e.A : e.D - e.A} m`); },
  'functrig:2:2': q => { const e = ftCtx(q.q); return igual(certo(q), `${360 / e.B} minutos`); },
  'functrig:2:3': q => { const m = q.q.match(/f\(x\) = (?:(\d+)·)?(sen|cos) x(?: ([+−]) (\d+))?\. Quanto vale f\((\d+)°\)/); const A = m[1] ? +m[1] : 1, D = m[3] ? (m[3] === '+' ? 1 : -1) * +m[4] : 0, x = +m[5]; const v = A * cicTrig(m[2], x) + D; return igualNum(ftFl(certo(q)), v, 1e-9); },
  'functrig:2:4': q => { const am = o => ftExp(o).A; const mx = /maior amplitude/.test(q.q), best = mx ? Math.max(...q.o.map(am)) : Math.min(...q.o.map(am)); return am(certo(q)) === best && q.o.filter(o => am(o) === best).length === 1 ? null : 'a resposta não tem a amplitude pedida'; },
  'functrig:3:1': q => { const m = q.q.match(/máximo (−?\d+) e valor mínimo (−?\d+)\. Quanto vale (A|D)\?/); const M = ftFl(m[1]), n = ftFl(m[2]); return igual(certo(q), ftSg(m[3] === 'A' ? (M - n) / 2 : (M + n) / 2)); },
  'functrig:3:2': q => { const P = nums(q.q.match(/período (\d+)°/)[1])[0]; return igual(certo(q), String(360 / P)); },
  'functrig:3:3': q => { const e = ftCtx(q.q); return igual(certo(q), `${90 / e.B} horas`); },
  'functrig:3:4': q => { const e = ftCtx(q.q), T = +q.q.match(/t = (\d+)\?/)[1]; const v = e.D + e.A * cicTrig('sen', e.B * T); return igualNum(ftFl(certo(q)), v, 1e-9); },
  'leistrig:1:1': q => { const n = nums(q.q); return lsnNum(certo(q), n[0] * Math.sin(lsnR(n[2])) / Math.sin(lsnR(n[1]))); },
  'leistrig:1:2': q => { const n = nums(q.q); return igual(certo(q), `${Math.round(Math.hypot(n[0], n[1]))} cm`); },
  'leistrig:1:3': q => { const n = nums(q.q); return igual(certo(q), `${Math.round(Math.sqrt(n[0] ** 2 + n[1] ** 2 - n[0] * n[1]))} cm`); },
  'leistrig:1:4': q => { const t = q.q, sen = /dois ângulos e um lado|um lado e o ângulo oposto/.test(t); return igual(certo(q), sen ? 'Lei dos senos' : 'Lei dos cossenos'); },
  'leistrig:2:1': q => { const n = nums(q.q); return lsnNum(certo(q), n[0] / (2 * Math.sin(lsnR(n[1])))); },
  'leistrig:2:2': q => { const n = nums(q.q); return igual(certo(q), `${Math.round(Math.sqrt(n[0] ** 2 + n[1] ** 2 + n[0] * n[1]))} cm`); },
  'leistrig:2:3': q => { const t = q.q, a = +t.match(/lado a mede (\d+)/)[1], A = +t.match(/ângulo A mede (\d+)/)[1], b = lsnV(t.match(/lado b mede (\S+) cm/)[1]); return igual(certo(q), `${Math.round(lsnD(Math.asin(b * Math.sin(lsnR(A)) / a)))}°`); },
  'leistrig:2:4': q => { const n = nums(q.q), ar = n[0] * n[1] * Math.sin(lsnR(n[2])) / 2; return igualNum(Number(String(certo(q)).replace(/[^\d,]/g, '').replace(',', '.')), ar); },
  'leistrig:3:1': q => { const t = q.q, AB = +t.match(/a (\d+) m um/)[1], A = +t.match(/CAB = (\d+)/)[1], B = +t.match(/CBA = (\d+)/)[1]; return lsnNum(certo(q), AB * Math.sin(lsnR(B)) / Math.sin(lsnR(180 - A - B))); },
  'leistrig:3:2': q => { const t = q.q, ang = +t.match(/ângulo de (\d+)°/)[1], b = +t.match(/a (\d+) km\/h e/)[1], c = +t.match(/outro a (\d+) km/)[1], h = +t.match(/depois de (\d+)/)[1], B = b * h, C = c * h; return igual(certo(q), `${Math.round(Math.sqrt(B * B + C * C - 2 * B * C * Math.cos(lsnR(ang))))} km`); },
  'leistrig:3:3': q => { const n = nums(q.q), a = n[3], o = n.slice(0, 3); o.splice(o.indexOf(a), 1); return igual(certo(q), `${Math.round(lsnD(Math.acos((o[0] ** 2 + o[1] ** 2 - a * a) / (2 * o[0] * o[1]))))}°`); },
  'leistrig:3:4': q => { const n = nums(q.q); return igual(certo(q), lsnCl(n[0], n[1], n[2])); },
  'combinatoria:1:1': q => igualNum(cmbN(certo(q)), cmbF(nums(q.q)[0])),
  'combinatoria:1:2': q => igualNum(cmbN(certo(q)), cmbF(nums(q.q)[0])),
  'combinatoria:1:3': q => { const n = nums(q.q)[0]; return igualNum(cmbN(certo(q)), n * (n - 1) * (n - 2)); },
  'combinatoria:1:4': q => igualNum(cmbN(certo(q)), cmbC(nums(q.q)[1], 2)),
  'combinatoria:2:1': q => igualNum(cmbN(certo(q)), cmbC(nums(q.q)[0], 3)),
  'combinatoria:2:2': q => { const k = nums(q.q)[0]; let r = 1; for (let i = 0; i < k; i++) r *= 10 - i; return igualNum(cmbN(certo(q)), r); },
  'combinatoria:2:3': q => igualNum(cmbN(certo(q)), cmbF(q.q.match(/palavra (\S+) começam/)[1].length - 1)),
  'combinatoria:2:4': q => igualNum(cmbN(certo(q)), cmbAna(q.q.match(/palavra (\S+)\?/)[1])),
  'combinatoria:3:1': q => { const n = nums(q.q); return igualNum(cmbN(certo(q)), cmbC(n[1], 2) * cmbC(n[0], 2)); },
  'combinatoria:3:2': q => { const n = nums(q.q); return igualNum(cmbN(certo(q)), cmbC(n[0] + n[1], 3) - cmbC(n[0], 3)); },
  'combinatoria:3:3': q => { const k = nums(q.q)[0]; let n = 2; while (n * (n - 1) / 2 < k) n++; return igualNum(cmbN(certo(q)), n); },
  'combinatoria:3:4': q => { const n = nums(q.q)[0]; return igualNum(cmbN(certo(q)), n * (n - 1)); },
  'matriz:1:1': q => { const n = nums(q.q); return igual(certo(q), `${n[0]} × ${n[1]}`); },
  'matriz:1:2': q => { const A = mtzMs(q.q)[0], t = q.q.match(/a([₀-₉])([₀-₉])/), i = mtzSub().indexOf(t[1]), j = mtzSub().indexOf(t[2]); return igualNum(nums(certo(q))[0], A[i - 1][j - 1]); },
  'matriz:1:3': q => { const [A, B] = mtzMs(q.q); return igual(certo(q), mtzFm(A.map((r, i) => r.map((x, j) => x + B[i][j])))); },
  'matriz:1:4': q => { const A = mtzMs(q.q)[0], k = +q.q.match(/calcule (\d+)·A/)[1]; return igual(certo(q), mtzFm(A.map(r => r.map(x => k * x)))); },
  'matriz:2:1': q => { const [A, B] = mtzMs(q.q); return igual(certo(q), mtzFm(mtzMul(A, B))); },
  'matriz:2:2': q => { const [A, B] = mtzMs(q.q), t = q.q.match(/c([₀-₉])([₀-₉])/), i = mtzSub().indexOf(t[1]), j = mtzSub().indexOf(t[2]); return igualNum(nums(certo(q))[0], mtzMul(A, B)[i - 1][j - 1]); },
  'matriz:2:3': q => { const A = mtzMs(q.q)[0]; return igual(certo(q), mtzFm(A[0].map((_, j) => A.map(r => r[j])))); },
  'matriz:2:4': q => { const A = mtzMs(q.q)[0]; return igualNum(nums(certo(q))[0], A[0][0] * A[1][1] - A[0][1] * A[1][0]); },
  'matriz:3:1': q => { const t = q.q.match(/\[x (\d+); (\d+) (\d+)\]/), d = nums(q.q.split('igual a')[1])[0], a = +t[1], b = +t[2], c = +t[3]; return igualNum(nums(certo(q))[0], (d + a * b) / c); },
  'matriz:3:2': q => { const f = q.q.match(/aᵢⱼ = (.+)\.$/)[1], e = { 'i + j': (i, j) => i + j, '2i − j': (i, j) => 2 * i - j, 'i · j': (i, j) => i * j, 'i² + j': (i, j) => i * i + j, '3i − 2j': (i, j) => 3 * i - 2 * j, 'i − j': (i, j) => i - j }[f]; return igual(certo(q), mtzFm([[e(1, 1), e(1, 2)], [e(2, 1), e(2, 2)]])); },
  'matriz:3:3': q => { const [A, B] = mtzMs(q.q); return igual(certo(q), mtzFm(B.map((r, i) => r.map((x, j) => x - A[i][j])))); },
  'matriz:3:4': q => { const [A, B] = mtzMs(q.q); return igualNum(nums(certo(q))[0], mtzMul(B, A)[0][0]); },
  'probcond:1:1': q => { const [r, b] = nums(q.q), v = /ser vermelha/.test(q.q) ? r : /ser azul/.test(q.q) ? b : -1; return igual(certo(q), pcFr(v, r + b)); },
  'probcond:1:2': q => { const [r, b] = nums(q.q), n = r + b; return igual(certo(q), pcFr(r * r, n * n)); },
  'probcond:1:3': q => { const [r, b] = nums(q.q), n = r + b; return igual(certo(q), pcFr(r * (r - 1), n * (n - 1))); },
  'probcond:1:4': q => { const [a, b, c, d] = nums(q.q.replace(/\d+º/g, '')); return igual(certo(q), pcFr(a + b, a + b + c + d)); },
  'probcond:2:1': q => { const [r, b] = nums(q.q); return igual(certo(q), pcFr(b, r + b - 1)); },
  'probcond:2:2': q => { const [r, b] = nums(q.q), n = r + b; return igual(certo(q), pcFr(r * b, n * (n - 1))); },
  'probcond:2:3': q => { const [a, b, c, d] = nums(q.q.replace(/\d+º/g, '')); return igual(certo(q), pcFr(a, a + c)); },
  'probcond:2:4': q => { const t = q.q, p = /par/.test(t) || /ímpar/.test(t) ? 3 : /maior que 4/.test(t) || /menor que 3/.test(t) ? 2 : 1; return igual(certo(q), pcFr(p, 12)); },
  'probcond:3:1': q => { const [r, b] = nums(q.q), n = r + b; return igual(certo(q), pcFr(n * (n - 1) - b * (b - 1), n * (n - 1))); },
  'probcond:3:2': q => { const [r, b] = nums(q.q), n = r + b; return igual(certo(q), pcFr(r * (r - 1) + b * (b - 1), n * (n - 1))); },
  'probcond:3:3': q => { const [a, b, c, d] = nums(q.q.replace(/\d+º/g, '')); return igual(certo(q), pcFr(a, a + b)); },
  'probcond:3:4': q => { const [a, b, c, d] = nums(q.q.replace(/\d+º/g, '')); return igual(certo(q), a * d === b * c ? 'Sim' : 'Não'); },
  'estatdisp:1:1': q => igualNum(edN(certo(q)), edMean(edList(q.q, 'são ', '. Qual'))),
  'estatdisp:1:2': q => { const d = edList(q.q, 'são ', '. Qual'); return igualNum(edN(certo(q)), Math.max(...d) - Math.min(...d)); },
  'estatdisp:1:3': q => igualNum(edN(certo(q)), edList(q.q, 'são ', '. Qual').sort((a, b) => a - b)[2]),
  'estatdisp:1:4': q => { const d = edList(q.q, 'são ', '. Qual'), f = {}; d.forEach(x => f[x] = (f[x] || 0) + 1); return igualNum(edN(certo(q)), +Object.keys(f).sort((a, b) => f[b] - f[a])[0]); },
  'estatdisp:2:1': q => igualNum(edN(certo(q)), edVar(edList(q.q, 'são ', '. Sabendo'))),
  'estatdisp:2:2': q => igualNum(edN(certo(q)), Math.sqrt(edVar(edList(q.q, 'são ', '. Qual')))),
  'estatdisp:2:3': q => igualNum(edN(certo(q)), nums(q.q)[1]),
  'estatdisp:2:4': q => { const A = edList(q.q, 'conjunto A é ', ' e o conjunto B'), B = edList(q.q, 'conjunto B é ', '. Os dois'); return igual(certo(q), edVar(A) > edVar(B) ? 'Conjunto A' : 'Conjunto B'); },
  'estatdisp:3:1': q => { const n = nums(q.q); const k = (n.length - 1) / 2, N = n.slice(0, k), P = n.slice(k + 1); return igualNum(edN(certo(q)), N.reduce((a, x, i) => a + x * P[i], 0) / P.reduce((a, b) => a + b, 0), 0.006); },
  'estatdisp:3:2': q => { const n = nums(q.q); const [N, m] = n, d = n.slice(2); return igualNum(edN(certo(q)), m * N - d.reduce((a, b) => a + b, 0)); },
  'estatdisp:3:3': q => { const n = nums(q.q); return igualNum(edN(certo(q)), n[1] * n[2]); },
  'estatdisp:3:4': q => { const d = []; for (const m of q.q.matchAll(/(\d+) aparece (\d+) vez/g)) for (let i = 0; i < +m[2]; i++) d.push(+m[1]); return igualNum(edN(certo(q)), edVar(d)); },
  'geoesp:1:1': q => { const n = nums(q.q); return igualNum(gsN(certo(q)), n[0] * n[1] * n[2]); },
  'geoesp:1:2': q => { const n = nums(q.q); return igualNum(gsN(certo(q)), n[0] * n[0] * n[1]); },
  'geoesp:1:3': q => igualNum(gsN(certo(q)), 6 * nums(q.q)[0] ** 2),
  'geoesp:1:4': q => igualNum(gsN(certo(q)), 4 * nums(q.q)[0] ** 3 / 3),
  'geoesp:2:1': q => { const n = nums(q.q); return igualNum(gsN(certo(q)), 2 * n[0] * (n[0] + n[1])); },
  'geoesp:2:2': q => { const n = nums(q.q); return igualNum(gsN(certo(q)), Math.hypot(n[0], n[1])); },
  'geoesp:2:3': q => { const n = nums(q.q); return igualNum(gsN(certo(q)), n[0] * n[0] * n[1] / 3); },
  'geoesp:2:4': q => { const n = nums(q.q); return igualNum(gsN(certo(q)), n[0] * n[0] * n[1] / 3); },
  'geoesp:3:1': q => { const n = nums(q.q); return igualNum(gsN(certo(q)), n[0] * n[0] + 2 * n[0] * n[2]); },
  'geoesp:3:2': q => { const t = q.q.match(/raio da base de (\d+) dm e altura de (\d+) dm/); return igualNum(gsN(certo(q)), 3 * t[1] * t[1] * t[2]); },
  'geoesp:3:3': q => { const k = /igual à altura/.test(q.q) ? 1 : +q.q.match(/(\d+) vezes/)[1]; return igualNum(Number(certo(q)), 3 * k); },
  'geoesp:3:4': q => { const t = q.q.match(/altura (\d+) cm tem volume (\d+)π/); return igualNum(gsN(certo(q)), Math.sqrt(t[2] / t[1])); },
  'ga_reta:1:1': q => { const [A, B] = gaPts(q.q); return igualNum(gaN(certo(q)), Math.hypot(B[0] - A[0], B[1] - A[1])); },
  'ga_reta:1:2': q => { const [A, B] = gaPts(q.q); return igual(certo(q), gaPt((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)); },
  'ga_reta:1:3': q => { const [A, B] = gaPts(q.q); return igual(certo(q), gaFr(B[1] - A[1], B[0] - A[0])); },
  'ga_reta:1:4': q => { const m = +q.q.match(/angular (−?\d+)/)[1].replace('−', '-') ; const n = gaPts(q.q)[0][1]; return igual(certo(q), gaEq(+String(m), n)); },
  'ga_reta:2:1': q => { const [A, B] = gaPts(q.q), m = (B[1] - A[1]) / (B[0] - A[0]); return igual(certo(q), gaEq(m, A[1] - m * A[0])); },
  'ga_reta:2:2': q => { const e = gaParse(q.q.match(/equação (y = .+?)\. Qual/)[1]), P = gaPts(q.q)[0]; return igual(certo(q), gaEq(e.m, P[1] - e.m * P[0])); },
  'ga_reta:2:3': q => { const t = q.q.match(/angular (−?\d+)(?:\/(\d+))?\./), p = +t[1].replace('−', '-'), d = t[2] ? +t[2] : 1; return igual(certo(q), gaFr(-d, p)); },
  'ga_reta:2:4': q => { const e = gaParse(q.q.match(/reta (y = .+?)\?/)[1]), P = gaPts(q.q)[0]; return igual(certo(q), e.m * P[0] + e.n === P[1] ? 'Sim' : 'Não'); },
  'ga_reta:3:1': q => { const [a, b] = q.q.replace(/^.*retas /, '').replace(/\?$/, '').split(' e ').map(gaParse), x = (b.n - a.n) / (a.m - b.m); return igual(certo(q), gaPt(x, a.m * x + a.n)); },
  'ga_reta:3:2': q => { const t = q.q.match(/P\((−?\d+), (−?\d+)\) à reta (\d+)x ([+−]) (\d+)y(?: ([+−]) (\d+))? = 0/), x = +t[1].replace('−', '-'), y = +t[2].replace('−', '-'), A = +t[3], B = (t[4] === '−' ? -1 : 1) * +t[5], c = t[6] ? (t[6] === '−' ? -1 : 1) * +t[7] : 0; return igualNum(gaN(certo(q)), Math.abs(A * x + B * y + c) / Math.hypot(A, B)); },
  'ga_reta:3:3': q => { const P = gaPts(q.q); return igual(certo(q), gaPt((P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3)); },
  'ga_reta:3:4': q => { const P = gaPts(q.q); return igualNum(gaN(certo(q)), Math.abs(P[1][0] * P[2][1] - P[2][0] * P[1][1]) / 2); },
  'ga_circ:1:1': q => { const C = gaPts(q.q)[0], r = +q.q.match(/raio (\d+)/)[1]; return igual(certo(q), gcEq(C[0], C[1], r * r)); },
  'ga_circ:1:2': q => { const e = gcPar(q.q); return igual(certo(q), /centro/.test(q.q.split('. ')[1] || '') ? gaPt(e.a, e.b) : String(Math.sqrt(e.r2))); },
  'ga_circ:1:3': q => { const e = gcPar(q.q), P = gaPts(q.q)[0]; return igual(certo(q), (P[0] - e.a) ** 2 + (P[1] - e.b) ** 2 === e.r2 ? 'Sim' : 'Não'); },
  'ga_circ:1:4': q => { const [C, P] = gaPts(q.q); return igual(certo(q), String(Math.hypot(P[0] - C[0], P[1] - C[1]))); },
  'ga_circ:2:1': q => { const e = gcGe(q.q); return igual(certo(q), gaPt(e.a, e.b)); },
  'ga_circ:2:2': q => { const e = gcGe(q.q); return igual(certo(q), String(Math.sqrt(e.r2))); },
  'ga_circ:2:3': q => { const e = gcPar(q.q), P = gaPts(q.q)[0]; return igual(certo(q), gcPos((P[0] - e.a) ** 2 + (P[1] - e.b) ** 2, e.r2)); },
  'ga_circ:2:4': q => { const e = gcPar(q.q), k = +q.q.match(/y = (−?\d+) e/)[1].replace('−', '-'), d = Math.abs(k - e.b); return igual(certo(q), d * d < e.r2 ? 'Secante' : d * d === e.r2 ? 'Tangente' : 'Exterior'); },
  'ga_circ:3:1': q => { const [A, B] = gaPts(q.q), a = (A[0] + B[0]) / 2, b = (A[1] + B[1]) / 2; return igual(certo(q), gcEq(a, b, ((B[0] - A[0]) / 2) ** 2 + ((B[1] - A[1]) / 2) ** 2)); },
  'ga_circ:3:2': q => { const e = gcPar(q.q), r = Math.sqrt(e.r2); return igual(certo(q), `k = ${gaS(e.b + r)} ou k = ${gaS(e.b - r)}`); },
  'ga_circ:3:3': q => { const e = gcPar(q.q), k = +q.q.match(/y = (−?\d+) corta/)[1].replace('−', '-'), d = Math.abs(k - e.b); return igualNum(Number(certo(q)), 2 * Math.sqrt(e.r2 - d * d)); },
  'ga_circ:3:4': q => igual(certo(q), `${gcPar(q.q).r2}π`),

  // ---------- Lote 5 ----------
  'funcmod:1:1': q => { const t = q.q, h = l5ModH(t), k = l5ModK(t), x0 = +t.match(/valor de f\((−?\d+)\)/)[1].replace('−', '-'); return igual(certo(q), l5S(Math.abs(x0 - h) + k)); },
  'funcmod:1:2': q => { const h = l5ModH(q.q), k = l5ModK(q.q); return igual(certo(q), `(${l5S(h)}, ${l5S(k)})`); },
  'funcmod:1:3': q => { const c = +q.q.match(/= (\d+)\?/)[1]; return igual(certo(q), l5Eq2(-c, c)); },
  'funcmod:1:4': q => { const v = [...q.q.matchAll(/\|(−?\d+)\|/g)].map(m => Math.abs(+m[1].replace('−', '-'))); return igual(certo(q), l5S(v[0] + v[1] - v[2])); },
  'funcmod:2:1': q => { const t = q.q, a0 = t.match(/f\(x\) = (−?\d*)\|/)[1], a = a0 === '' ? 1 : a0 === '−' ? -1 : +a0.replace('−', '-'), h = l5ModH(t), k = l5ModK(t), x0 = +t.match(/valor de f\((−?\d+)\)/)[1].replace('−', '-'); return igual(certo(q), l5S(a * Math.abs(x0 - h) + k)); },
  'funcmod:2:2': q => { const t = q.q, a0 = t.match(/f\(x\) = (−?\d*)\|/)[1], a = a0 === '' ? 1 : a0 === '−' ? -1 : +a0.replace('−', '-'), k = l5ModK(t); const tipo = a > 0 ? 'mínimo' : 'máximo'; return t.includes(tipo) ? igual(certo(q), l5S(k)) : 'tipo de extremo incoerente com o sinal de a'; },
  'funcmod:2:3': q => { const h = l5ModH(q.q), c = +q.q.match(/= (\d+)\?/)[1]; return igual(certo(q), l5Eq2(h - c, h + c)); },
  'funcmod:2:4': q => { const t = q.q, a0 = t.match(/f\(x\) = (−?\d*)\|/)[1], a = a0 === '' ? 1 : a0 === '−' ? -1 : +a0.replace('−', '-'), h = l5ModH(t), k = l5ModK(t), tt = -k / a; return igual(certo(q), l5Eq2(h - tt, h + tt)); },
  'funcmod:3:1': q => { const h = l5ModH(q.q), c = +q.q.match(/< (\d+)\?/)[1]; return igual(certo(q), `${l5S(h - c)} < x < ${l5S(h + c)}`); },
  'funcmod:3:2': q => { const h = l5ModH(q.q), c = +q.q.match(/≥ (\d+)\?/)[1]; return igual(certo(q), `x ≤ ${l5S(h - c)} ou x ≥ ${l5S(h + c)}`); },
  'funcmod:3:3': q => { const c = +q.q.match(/[<≤] (\d+)\?/)[1], est = q.q.includes('< ' + c); let n = 0; const h = l5ModH(q.q); for (let x = h - c - 2; x <= h + c + 2; x++) { const d = Math.abs(x - h); if (est ? d < c : d <= c) n++; } return igual(certo(q), String(n)); },
  'funcmod:3:4': q => { const m = q.q.match(/\|2x ([−+]) (\d+)\| = (\d+)/), b = (m[1] === '−' ? 1 : -1) * +m[2], c = +m[3], p = (b - c) / 2, r = (b + c) / 2; return igual(certo(q), l5Eq2(Math.min(p, r), Math.max(p, r))); },

  'inequacao:1:1': q => { const [a, b] = l5Lin(q.q.match(/solução de (.+?) > 0/)[1]), p = -b / a; return igual(certo(q), a > 0 ? `x > ${l5S(p)}` : `x < ${l5S(p)}`); },
  'inequacao:1:2': q => { const [a, b] = l5Lin(q.q.match(/solução de (.+?) > 0/)[1]), p = -b / a; return igual(certo(q), a > 0 ? `x > ${l5S(p)}` : `x < ${l5S(p)}`); },
  'inequacao:1:3': q => { const m = q.q.match(/solução de (.+?) ≤ (−?\d+)\?/), [a, b] = l5Lin(m[1]), c = +m[2].replace('−', '-'); return igual(certo(q), `x ≤ ${l5S((c - b) / a)}`); },
  'inequacao:1:4': q => { const m = q.q.match(/f\(x\) = (.+?) tem raiz x = (−?\d+)\. Qual é o sinal de f\((−?\d+)\)/), [a] = l5Lin(m[1]), p = +m[2].replace('−', '-'), t = +m[3].replace('−', '-'), s = Math.sign(a * (t - p)); return igual(certo(q), s > 0 ? 'Positivo' : s < 0 ? 'Negativo' : 'Zero'); },
  'inequacao:2:1': q => { const [p, r] = l5Fac(q.q).sort((x, y) => x - y); return igual(certo(q), `${l5S(p)} < x < ${l5S(r)}`); },
  'inequacao:2:2': q => { const [p, r] = l5Fac(q.q).sort((x, y) => x - y); return igual(certo(q), `x < ${l5S(p)} ou x > ${l5S(r)}`); },
  'inequacao:2:3': q => { const [p, r] = l5Fac(q.q).sort((x, y) => x - y); return igual(certo(q), `${l5S(p)} < x < ${l5S(r)}`); },
  'inequacao:2:4': q => { const m = q.q.match(/solução de x²(?: ([−+]) (\d+)x)?(?: ([−+]) (\d+))? ≥ 0/), S = m[1] ? (m[1] === '−' ? 1 : -1) * +m[2] : 0, P = m[3] ? (m[3] === '+' ? 1 : -1) * +m[4] : 0, D = Math.sqrt(S * S - 4 * P), p = (S - D) / 2, r = (S + D) / 2; return igual(certo(q), `x ≤ ${l5S(p)} ou x ≥ ${l5S(r)}`); },
  'inequacao:3:1': q => { const [p, r] = l5Fac(q.q).sort((x, y) => x - y); return igual(certo(q), String(r - p - 1)); },
  'inequacao:3:2': q => { const [p, r] = l5Fac(q.q).sort((x, y) => x - y); return igual(certo(q), `x ≤ ${l5S(p)} ou x ≥ ${l5S(r)}`); },
  'inequacao:3:3': q => { const [p, r] = l5Fac(q.q).sort((x, y) => x - y); return igual(certo(q), `x < ${l5S(p)} ou x > ${l5S(r)}`); },
  'inequacao:3:4': q => { const [p, r] = l5Fac(q.q).sort((x, y) => x - y); return igual(certo(q), String(r - p + 1)); },

  'funccomp:1:1': q => { const m = q.q.match(/f\(x\) = (.+?) e g\(x\) = (.+?), qual é o valor de f\(g\((−?\d+)\)\)/), [a, b] = l5Lin(m[1]), [c, d] = l5Lin(m[2]), x = +m[3].replace('−', '-'); return igual(certo(q), l5S(a * (c * x + d) + b)); },
  'funccomp:1:2': q => { const m = q.q.match(/f\(x\) = (.+?) e g\(x\) = (.+?), qual é o valor de g\(f\((−?\d+)\)\)/), [a, b] = l5Lin(m[1]), [c, d] = l5Lin(m[2]), x = +m[3].replace('−', '-'); return igual(certo(q), l5S(c * (a * x + b) + d)); },
  'funccomp:1:3': q => { const m = q.q.match(/f\((−?\d+)\) = (−?\d+)\. Qual é o valor de f⁻¹\((−?\d+)\)/); return m[2] === m[3] ? igual(certo(q), m[1]) : 'f⁻¹ pedida em ponto diferente'; },
  'funccomp:1:4': q => { const m = q.q.match(/f\(x\) = (.+?), qual é o valor de f\(f\((−?\d+)\)\)/), [a, b] = l5Lin(m[1]), x = +m[2].replace('−', '-'); return igual(certo(q), l5S(a * (a * x + b) + b)); },
  'funccomp:2:1': q => { const m = q.q.match(/f\(x\) = (.+?) e g\(x\) = (.+?), qual é a expressão de \(f∘g\)/), [a, b] = l5Lin(m[1]), [c, d] = l5Lin(m[2]), mm = a * c, n = a * d + b; const e = mm === 1 ? 'x' : mm === -1 ? '−x' : `${l5S(mm)}x`; return igual(certo(q), e + (n === 0 ? '' : n > 0 ? ` + ${n}` : ` − ${-n}`)); },
  'funccomp:2:2': q => { const m = q.q.match(/f\(x\) = (.+?) e g\(x\) = (.+?), qual é a expressão de \(g∘f\)/), [a, b] = l5Lin(m[1]), [c, d] = l5Lin(m[2]), mm = a * c, n = c * b + d; const e = mm === 1 ? 'x' : mm === -1 ? '−x' : `${l5S(mm)}x`; return igual(certo(q), e + (n === 0 ? '' : n > 0 ? ` + ${n}` : ` − ${-n}`)); },
  'funccomp:2:3': q => { const [a, b] = l5Lin(q.q.match(/f\(x\) = (.+?)\?/)[1]); return igual(certo(q), `f⁻¹(x) = (x ${b > 0 ? '−' : '+'} ${Math.abs(b)}) / ${a}`); },
  'funccomp:2:4': q => { const m = q.q.match(/f\(x\) = (.+?), qual é o valor de f⁻¹\((−?\d+)\)/), [a, b] = l5Lin(m[1]), y = +m[2].replace('−', '-'); return igual(certo(q), l5S((y - b) / a)); },
  'funccomp:3:1': q => { const m = q.q.match(/f\(x\) = (−?\d*)x² ([+−]) (\d+) e g\(x\) = (.+?), qual é o valor de (f\(g|g\(f)\((−?\d+)\)\)/), a = m[1] === '' ? 1 : m[1] === '−' ? -1 : +m[1].replace('−', '-'), b = (m[2] === '−' ? -1 : 1) * +m[3], [c, d] = l5Lin(m[4]), x = +m[6].replace('−', '-'); const f = z => a * z * z + b, g = z => c * z + d; return igual(certo(q), l5S(m[5] === 'f(g' ? f(g(x)) : g(f(x)))); },
  'funccomp:3:2': q => { const m = q.q.match(/f\(x\) = (.+?) e g\(x\) = (.+?), para qual valor de x tem-se f\(g\(x\)\) = (−?\d+)/), [a, b] = l5Lin(m[1]), [c, d] = l5Lin(m[2]), v = +m[3].replace('−', '-'); return igual(certo(q), l5S((v - b - a * d) / (a * c))); },
  'funccomp:3:3': q => { const m = q.q.match(/f\(x\) = (−?\d+)x \+ b\. Sabendo que f\(f\((−?\d+)\)\) = (−?\d+)/), a = +m[1].replace('−', '-'), x = +m[2].replace('−', '-'), v = +m[3].replace('−', '-'); return igual(certo(q), l5S((v - a * a * x) / (a + 1))); },
  'funccomp:3:4': q => { let m = q.q.match(/ponto \((−?\d+), (−?\d+)\) pertence/); if (m) return igual(certo(q), `(${m[2]}, ${m[1]})`); m = q.q.match(/f\((−?\d+)\) = (−?\d+) e f\((−?\d+)\) = (−?\d+)\. Quanto vale/); const M = +m[1].replace('−', '-'), R = +m[4].replace('−', '-'); return igual(certo(q), l5S(M + R)); },

  'trigrel:1:1': q => { const a = +q.q.match(/a (\d+)°/)[1]; return igual(certo(q), `${l5Rad(a)} rad`); },
  'trigrel:1:2': q => { const [n, d] = l5Pi(q.q.match(/a (\S+) rad/)[1]); return igual(certo(q), `${180 * n / d}°`); },
  'trigrel:1:3': q => { const m = q.q.match(/sen θ = (\d+)\/(\d+)/), s = +m[1], h = +m[2], c = Math.round(Math.sqrt(h * h - s * s)); return igual(certo(q), `${c}/${h}`); },
  'trigrel:1:4': q => { const m = q.q.match(/sen θ = (\d+)\/(\d+) e cos θ = (\d+)\/(\d+)/), g = l5G(+m[1], +m[3]); return igual(certo(q), (+m[3] / g === 1) ? String(+m[1] / g) : `${+m[1] / g}/${+m[3] / g}`); },
  'trigrel:2:1': q => { const m = q.q.match(/sen θ = (\d+)\/(\d+)/), s = +m[1], h = +m[2], c = Math.round(Math.sqrt(h * h - s * s)); return igual(certo(q), `−${c}/${h}`); },
  'trigrel:2:2': q => { const m = q.q.match(/tg θ = (\d+)\/(\d+)/), o = +m[1], a = +m[2]; return igual(certo(q), `${o}/${l5H(o, a)}`); },
  'trigrel:2:3': q => { const M = { 'tg x · cos x': 'sen x', 'sen x / tg x': 'cos x', '(1 − cos² x) / sen x': 'sen x', '(1 − sen² x) / cos x': 'cos x', 'sen x / cos x': 'tg x' }, ex = q.q.match(/Simplificando (.+?), com x agudo/)[1]; return igual(certo(q), M[ex]); },
  'trigrel:2:4': q => { const m = q.q.match(/arco de (\S+) rad .* raio (\d+) cm/), [n, d] = l5Pi(m[1]), r = +m[2], k = n * r / d; return igual(certo(q), `${k === 1 ? '' : k}π cm`); },
  'trigrel:3:1': q => { const m = q.q.match(/sen θ = −(\d+)\/(\d+)/), s = +m[1], h = +m[2], c = Math.round(Math.sqrt(h * h - s * s)); return igual(certo(q), `−${c}/${h}`); },
  'trigrel:3:2': q => { const m = q.q.match(/cos θ = (\d+)\/(\d+)/), a = +m[1], h = +m[2], o = Math.round(Math.sqrt(h * h - a * a)); return igual(certo(q), `−${o}/${a}`); },
  'trigrel:3:3': q => { const m = q.q.match(/arco de (\d+)° .* raio (\d+) cm/), a = +m[1], r = +m[2], k = a * r / 180; return igual(certo(q), `${k === 1 ? '' : k}π cm`); },
  'trigrel:3:4': q => { let m = q.q.match(/determinação positiva de (\S+) rad/); if (m) { const [n, d] = l5Pi(m[1]); const deg = ((n / d) * 180) % 360; return igual(certo(q), `${l5Rad(deg)} rad`); } m = q.q.match(/arco de (\d+)°/); return igual(certo(q), `${+m[1] % 360}°`); },

  'freqbox:1:1': q => igual(certo(q), String(l5Tab(q.q).reduce((a, r) => a + r[1], 0))),
  'freqbox:1:2': q => { const m = q.q.match(/grupo de (\d+) pessoas, (\d+) escolhe\S+/); return igual(certo(q), `${100 * +m[2] / +m[1]}%`); },
  'freqbox:1:3': q => { const T = l5Tab(q.q), mx = Math.max(...T.map(r => r[1])); const w = T.filter(r => r[1] === mx); return w.length === 1 ? igual(certo(q), String(w[0][0])) : 'moda não é única'; },
  'freqbox:1:4': q => { const L = q.q.match(/conjunto (.+?)\?/)[1].split(', ').map(x => +x.replace('−', '-')); return igual(certo(q), l5S(Math.max(...L) - Math.min(...L))); },
  'freqbox:2:1': q => { const T = l5Tab(q.q), n = T.reduce((a, r) => a + r[1], 0), s = T.reduce((a, r) => a + r[0] * r[1], 0); return igualNum(+certo(q).replace(',', '.'), s / n); },
  'freqbox:2:2': q => { const rows = []; l5Tab(q.q).forEach(([v, f]) => { for (let i = 0; i < f; i++) rows.push(v); }); const n = rows.length, med = n % 2 ? rows[(n - 1) / 2] : (rows[n / 2 - 1] + rows[n / 2]) / 2; return igual(certo(q), l5Num(med)); },
  'freqbox:2:3': q => { const s = l5Sort(l5Lst(q.q)); return igual(certo(q), String(s[1])); },
  'freqbox:2:4': q => { const s = l5Sort(l5Lst(q.q)); return igual(certo(q), String(q.q.includes('mediana') ? s[3] : s[5])); },
  'freqbox:3:1': q => { const s = l5Sort(l5Lst(q.q)); return igual(certo(q), String(s[5] - s[1])); },
  'freqbox:3:2': q => { const s = l5Sort(l5Lst(q.q)); return igual(certo(q), l5Num(s[5] + 1.5 * (s[5] - s[1]))); },
  'freqbox:3:3': q => { const M = { 'fica entre Q1 e Q3': 50, 'fica entre o mínimo e Q1': 25, 'fica acima de Q3': 25, 'fica entre Q1 e a mediana': 25, 'fica abaixo da mediana': 50, 'fica entre o mínimo e Q3': 75 }, k = Object.keys(M).find(x => q.q.includes(x)); return igual(certo(q), `${M[k]}%`); },
  'freqbox:3:4': q => { const f = [...q.q.matchAll(/\((\d+)(?: pessoas)?\)/g)].map(m => +m[1]), n = f.reduce((a, b) => a + b, 0), s = f.reduce((a, x, i) => a + x * (5 + 10 * i), 0); return igualNum(+certo(q).replace(',', '.'), s / n); },

  // ---------- Lote 6: sislin ----------
  'sislin:1:1': q => { const m = q.q.match(/x \+ y \+ z = (−?\d+); y \+ z = (−?\d+); z = (−?\d+)\./), S = l6N(m[1]), T = l6N(m[2]), Z = l6N(m[3]); return igual(certo(q), l6Tr([S - T, T - Z, Z])); },
  'sislin:1:2': q => igual(certo(q), ['Possível e determinado', 'Possível e indeterminado', 'Impossível'][l6Cl(...l6Sys2(q))]),
  'sislin:1:3': q => { const m = q.q.match(/sistema (.+?); (.+?)\?/), e1 = l6Eq(m[1], ['x', 'y']), e2 = l6Eq(m[2], ['x', 'y']); return igual(certo(q), l5S(e1.co[0] * e2.co[1] - e1.co[1] * e2.co[0])); },
  'sislin:1:4': q => igual(certo(q), ['Uma', 'Infinitas', 'Nenhuma'][l6Cl(...l6Sys2(q))]),
  'sislin:2:1': q => { const m = q.q.match(/sistema: (.+?)\. Qual/)[1].split('; ').map(e => l6Eq(e, ['x', 'y', 'z'])); return igual(certo(q), l6Tr(l6Solve3(m.map(e => e.co), m.map(e => e.r)))); },
  'sislin:2:2': q => { const rows = q.q.match(/\[ (.+?) \]/)[1].split(' | ').map(r => r.split(' ').map(l6N)); return igual(certo(q), l5S(l6D3(rows))); },
  'sislin:2:3': q => { const m = q.q.match(/x \+ y = (\d+); (.+?) \+ ky = (−?\d+) é (impossível|possível e indeterminado)/), p = +m[1], mm = l6Eq(m[2] + ' = 0', ['x', 'y']).co[0], qq = l6N(m[3]), imp = m[4] === 'impossível'; if ((qq === mm * p) === imp) return 'tipo incoerente com o termo independente'; return igual(certo(q), l5S(mm)); },
  'sislin:2:4': q => { const m = q.q.match(/(\d+) (\S+) e (\d+) (\S+) custam R\$ (\d+)\. (\d+) \S+ e (\d+) \S+ custam R\$ (\d+)\. Quanto custa 1/), a1 = +m[1], b1 = +m[3], t1 = +m[5], a2 = +m[6], b2 = +m[7], t2 = +m[8], D = a1 * b2 - a2 * b1, y = (a1 * t2 - a2 * t1) / D; return igual(certo(q), `R$ ${y}`); },
  'sislin:3:1': q => { const m = q.q.match(/Se (.+?), qual é o valor de (.+?)\?/), es = m[1].split('; ').map(e => l6Eq(e, ['x', 'y', 'z'])), [x, y, z] = l6Solve3(es.map(e => e.co), es.map(e => e.r)); const F = { 'x + y + z': x + y + z, 'x − z': x - z, '2x + y': 2 * x + y, 'y − x + z': y - x + z }; return igual(certo(q), l5S(F[m[2]])); },
  'sislin:3:2': q => { const m = q.q.match(/sistema (.+?); (.+?), qual/), e1 = l6Eq(m[1], ['x', 'y']), e2 = l6Eq(m[2], ['x', 'y']), D = e1.co[0] * e2.co[1] - e1.co[1] * e2.co[0], x = (e1.r * e2.co[1] - e1.co[1] * e2.r) / D; return igual(certo(q), l5S(x)); },
  'sislin:3:3': q => { const SETS = [['livro', 'caderno', 'estojo'], ['bola', 'boné', 'camiseta'], ['caderno', 'caneta', 'lápis']], ask = q.q.match(/Quanto custa 1 (\S+)\?/)[1], set = SETS.find(s => s.includes(ask)), sing = w => (w === 'lápis' ? w : w.replace(/s$/, '')), rows = [...q.q.matchAll(/compra: (.+?) custam R\$ (\d+)\./g)], M = [], r = []; rows.forEach(m => { const co = [0, 0, 0]; m[1].split(', ').forEach(t => { const [n, ...w] = t.split(' '); const i = set.indexOf(sing(w.join(' '))); co[i] = +n; }); M.push(co); r.push(+m[2]); }); const sol = l6Solve3(M, r); return igual(certo(q), `R$ ${sol[set.indexOf(ask)]}`); },
  'sislin:3:4': q => { const m = q.q.match(/(\d)x ([−+]) (\d+)y = (\d+)/), mm = +m[1], n = (m[2] === '−' ? -1 : 1) * +m[3]; return igual(certo(q), `k ≠ ${l5S(n / mm)}`); },

  // ---------- Lote 6: polinomios ----------
  'polinomios:1:1': q => { const m = q.q.match(/p\(x\) = (.+?), qual é o valor de p\((−?\d+)\)/); return igual(certo(q), l5S(l6Val(l6Poly(m[1]), l6N(m[2])))); },
  'polinomios:1:2': q => igual(certo(q), l5S(l6Poly(q.q.match(/p\(x\) = (.+?)\?/)[1]).reduce((a, b) => a + b, 0))),
  'polinomios:1:3': q => { const m = q.q.match(/grau (\d+) e q\(x\) tem grau (\d+)\. Qual é o grau de p\(x\) ([·+])/), a = +m[1], b = +m[2]; return igual(certo(q), String(m[3] === '·' ? a + b : Math.max(a, b))); },
  'polinomios:1:4': q => { const m = q.q.match(/\(x − (\d+)\)\(x \+ (\d+)\)/), a = +m[1], b = +m[2], ok = l6N(certo(q)); return (ok === a) ? null : `a resposta ${certo(q)} não é a raiz esperada ${a}`; },
  'polinomios:2:1': q => { const m = q.q.match(/Qual é (a soma|o produto) das raízes da equação (.+?) = 0/), co = l6Poly(m[2]); return igual(certo(q), l5S(m[1] === 'a soma' ? -co[1] / co[0] : co[2] / co[0])); },
  'polinomios:2:2': q => { const co = l6Poly(q.q.match(/p\(x\) = (.+?) por x/)[1]); return igual(certo(q), l5S(l6Val(co, l6Div(q)))); },
  'polinomios:2:3': q => { const co = l6Poly(q.q.match(/p\(x\) = (.+?) por x/)[1]), qq = l6Ruf(co, l6Div(q)); return qq[3] !== 0 ? 'divisão não exata' : igual(certo(q), `q(x) = ${l6Tx(qq.slice(0, 3))}`); },
  'polinomios:2:4': q => { const rs = [...q.q.matchAll(/\(x ([−+]) (\d+)\)/g)].map(m => (m[1] === '−' ? 1 : -1) * +m[2]); return igual(certo(q), l6Set(rs)); },
  'polinomios:3:1': q => { const co = l6Poly(q.q.match(/p\(x\) = (.+?) são/)[1]); const t = q.q; const v = t.includes('r₁ + r₂ + r₃') ? -co[1] : t.includes('r₁ · r₂ · r₃') ? -co[3] : co[2]; return igual(certo(q), l5S(v)); },
  'polinomios:3:2': q => { const m = q.q.match(/p\(x\) = (.+?) é divisível por x ([+−]) (\d+)/), co = l6Poly(m[1].replace('kx²', '0x²')), r = (m[2] === '+' ? -1 : 1) * +m[3], c = co[2], d = co[3]; return igual(certo(q), l5S(-(r * r * r + c * r + d) / (r * r))); },
  'polinomios:3:3': q => { const m = q.q.match(/que (−?\d+) é raiz de p\(x\) = (.+?), qual/), co = l6Poly(m[2]); return igual(certo(q), l5S(-co[1] - l6N(m[1]))); },
  'polinomios:3:4': q => { const m = q.q.match(/que (−?\d+) é raiz de p\(x\) = (.+?), quais/), co = l6Poly(m[2]), r = l6N(m[1]), qq = l6Ruf(co, r); if (qq[3] !== 0) return 'não é raiz'; const D = qq[1] * qq[1] - 4 * qq[2], s = Math.sqrt(D); return igual(certo(q), l6Set([(-qq[1] - s) / 2, (-qq[1] + s) / 2])); },

  // ---------- Lote 6: binomio ----------
  'binomio:1:1': q => { const m = q.q.match(/C\((\d+), (\d+)\)/); return igual(certo(q), String(l6Pas(+m[1])[+m[2]])); },
  'binomio:1:2': q => igual(certo(q), String(2 ** +q.q.match(/linha (\d+)/)[1])),
  'binomio:1:3': q => igual(certo(q), String(l6Un(q.q.match(/\(x \+ y\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/)[1]) + 1)),
  'binomio:1:4': q => igual(certo(q), l6Pas(+q.q.match(/linha (\d+)/)[1]).join(', ')),
  'binomio:2:1': q => { const m = q.q.match(/coeficiente de x([⁰¹²³⁴⁵⁶⁷⁸⁹]*) no desenvolvimento de \(x \+ (\d)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/), k = m[1] ? l6Un(m[1]) : 1, a = +m[2], n = l6Un(m[3]); return igual(certo(q), String(l6Pas(n)[k] * a ** (n - k))); },
  'binomio:2:2': q => { const m = q.q.match(/\((\d*)x ([−+]) (\d+)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/), a = m[1] === '' ? 1 : +m[1], b = (m[2] === '−' ? -1 : 1) * +m[3], n = l6Un(m[4]); return igual(certo(q), l5S(l6Mil((a + b) ** n))); },
  'binomio:2:3': q => { const m = q.q.match(/\(x − (\d)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/), a = +m[1], n = l6Un(m[2]); let k; if (q.q.includes('termo independente')) k = 0; else { const t = q.q.match(/coeficiente de x([⁰¹²³⁴⁵⁶⁷⁸⁹]*) /); k = t[1] ? l6Un(t[1]) : 1; } return igual(certo(q), l5S(l6Pas(n)[k] * (-a) ** (n - k))); },
  'binomio:2:4': q => { const m = q.q.match(/\(x \+ (\d)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+).*qual é o (\d+)º termo/), a = +m[1], n = l6Un(m[2]), k = +m[3] - 1; return igual(certo(q), l6Term(l6Pas(n)[k] * a ** k, n - k)); },
  'binomio:3:1': q => { const m = q.q.match(/\(x \+ (\d)\/x\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/), a = +m[1], n = l6Un(m[2]); return igual(certo(q), String(l6Pas(n)[n / 2] * a ** (n / 2))); },
  'binomio:3:2': q => { const m = q.q.match(/coeficiente de x([⁰¹²³⁴⁵⁶⁷⁸⁹]+) no desenvolvimento de \(x \+ (\d)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/), k = l6Un(m[1]), a = +m[2], n = l6Un(m[3]); return igual(certo(q), l6Mil(l6Pas(n)[k] * a ** (n - k))); },
  'binomio:3:3': q => { const m = q.q.match(/C\((\d+), (\d+)\) = (\d+) e C\(\d+, \d+\) = (\d+)/), n = +m[1], k = +m[2]; if (+m[3] !== l6Pas(n)[k] || +m[4] !== l6Pas(n)[k + 1]) return 'valores dados incoerentes'; return igual(certo(q), String(l6Pas(n + 1)[k + 1])); },
  'binomio:3:4': q => igual(certo(q), String(Math.max(...l6Pas(+q.q.match(/linha (\d+)/)[1])))),

  // ---------- Lote 6: financ ----------
  'financ:1:1': q => { const { P, n } = l6Fin(q); return igual(certo(q), l6M(P / n)); },
  'financ:1:2': q => { const { P, i } = l6Fin(q); return igual(certo(q), l6M(P * i / 100)); },
  'financ:1:3': q => { const { P, n, i } = l6Fin(q); return igual(certo(q), l6M(P / n + P * i / 100)); },
  'financ:1:4': q => { const m = q.q.match(/financiamento de (R\$ [\d.,]+) foi pago em (\d+) parcelas fixas de (R\$ [\d.,]+)/), P = l6Mon(m[1]), n = +m[2], A = l6Mon(m[3]); return igual(certo(q), l6M(A * n - P)); },
  'financ:2:1': q => { const m = q.q.match(/SAC de (R\$ [\d.,]+) em (\d+) parcelas.*após o pagamento da (\d+)ª/), P = l6Mon(m[1]), n = +m[2], k = +m[3]; return igual(certo(q), l6M(P - k * P / n)); },
  'financ:2:2': q => { const { P, n, i } = l6Fin(q), k = +q.q.match(/juros da (\d+)ª/)[1]; return igual(certo(q), l6M((P - (k - 1) * P / n) * i / 100)); },
  'financ:2:3': q => { const { P, n, i } = l6Fin(q), k = +q.q.match(/valor da (\d+)ª parcela/)[1]; return igual(certo(q), l6M(P / n + (P - (k - 1) * P / n) * i / 100)); },
  'financ:2:4': q => { const m = q.q.match(/Price de (R\$ [\d.,]+), a (\d+)% ao mês, a parcela fixa é (R\$ [\d.,]+)/), P = l6Mon(m[1]), i = +m[2], A = l6Mon(m[3]); return igual(certo(q), l6M(A - P * i / 100)); },
  'financ:3:1': q => { const { P, n, i } = l6Fin(q); let s = P, j = 0; for (let k = 0; k < n; k++) { j += s * i / 100; s -= P / n; } return igual(certo(q), l6M(j)); },
  'financ:3:2': q => { const { P, n, i } = l6Fin(q), A = P / n, f = A + P * i / 100, l = A + (P - (n - 1) * A) * i / 100; return igual(certo(q), l6M(f - l)); },
  'financ:3:3': q => { const m = q.q.match(/é (\d,\d{4})\. Qual é a parcela de um financiamento de (R\$ [\d.,]+)/), c = parseFloat(m[1].replace(',', '.')), P = l6Mon(m[2]); return igual(certo(q), l6M(P * c)); },
  'financ:3:4': q => { const m = q.q.match(/Price de (R\$ [\d.,]+), a (\d+)% ao mês, a parcela fixa é (R\$ [\d.,]+)/), P = l6Mon(m[1]), i = +m[2], A = l6Mon(m[3]); return igual(certo(q), l6M(P + P * i / 100 - A)); },

  // ---------- Lote 6: troncos ----------
  'troncos:1:1': q => { const m = q.q.match(/altura (\d+) cm e raio da base (\d+) cm .* a (\d+) cm do vértice/), H = +m[1], R = +m[2], hp = +m[3]; return igual(certo(q), `${R * hp / H} cm`); },
  'troncos:1:2': q => { const m = q.q.match(/é (\d+)\/(\d+)\./), p = +m[1], d = +m[2]; return igual(certo(q), l6Fr(p * p, d * d)); },
  'troncos:1:3': q => { const m = q.q.match(/lado (\d+) cm e altura (\d+) cm/), L = +m[1], H = +m[2]; return igual(certo(q), `${l6Mil(L * L * H / 3)} cm³`); },
  'troncos:1:4': q => { const m = q.q.match(/altura (\d+) cm, é obtido .* altura (\d+) cm por/), a = +m[1], b = +m[2]; return igual(certo(q), l6Fr(a, b)); },
  'troncos:2:1': q => { const m = q.q.match(/lados (\d+) cm e (\d+) cm e altura (\d+) cm/), A = +m[1], B = +m[2], h = +m[3]; return igual(certo(q), `${l6Mil(h * (A * A + A * B + B * B) / 3)} cm³`); },
  'troncos:2:2': q => { const m = q.q.match(/bases (\d+) cm e (\d+) cm e altura (\d+) cm/), A = +m[1], B = +m[2], h = +m[3]; return igual(certo(q), `${l6Pi(h * (A * A + A * B + B * B) / 3)} cm³`); },
  'troncos:2:3': q => { const m = q.q.match(/altura (\d+) cm tem raios das bases (\d+) cm e (\d+) cm/), h = +m[1], R = +m[2], r = +m[3]; return igual(certo(q), `${h * R / (R - r)} cm`); },
  'troncos:2:4': q => { const m = q.q.match(/áreas (\d+) cm² e (\d+) cm² e a altura é (\d+) cm/), A = +m[1], a = +m[2], h = +m[3]; return igual(certo(q), `${l6Mil(h * (A + Math.sqrt(A * a) + a) / 3)} cm³`); },
  'troncos:3:1': q => { const m = q.q.match(/bases (\d+) cm e (\d+) cm e altura (\d+) cm/), R = +m[1], r = +m[2], h = +m[3]; return igual(certo(q), `${Math.round(Math.sqrt(h * h + (R - r) ** 2))} cm`); },
  'troncos:3:2': q => { const m = q.q.match(/bases (\d+) cm e (\d+) cm e altura (\d+) cm.*geratriz mede (\d+) cm/), R = +m[1], r = +m[2], h = +m[3], g = +m[4]; if (g * g !== h * h + (R - r) ** 2) return 'geratriz incoerente'; return igual(certo(q), `${l6Pi((R + r) * g)} cm²`); },
  'troncos:3:3': q => { const m = q.q.match(/raio (\d+) cm e altura (\d+) cm retira-se .* raio (\d+) cm e altura (\d+) cm/), R = +m[1], H = +m[2], r = +m[3], hp = +m[4]; if (r * H !== R * hp) return 'cones não semelhantes'; return igual(certo(q), `${l6Pi((R * R * H - r * r * hp) / 3)} cm³`); },
  'troncos:3:4': q => { const m = q.q.match(/é (\d+)\/(\d+) da altura/), p = +m[1], d = +m[2]; return igual(certo(q), l6Fr(p ** 3, d ** 3)); },

  // ---------- radicais ----------
  'radicais:1:1': q => { const m = q.q.match(/vale (√|∛|∜)(\d+)\?/); const n = { '√': 2, '∛': 3, '∜': 4 }[m[1]], x = +m[2], r = Math.round(x ** (1 / n)); return r ** n === x ? igual(certo(q), String(r)) : 'radicando não é potência'; },
  'radicais:1:2': q => { const m = q.q.match(/vale (\d+)\^−(\d+)\?/); return igual(certo(q), `1/${Number(m[1]) ** Number(m[2])}`); },
  'radicais:1:3': q => { const m = q.q.match(/(?:√|raiz de índice (\d+) de )\(x\^(\d+)\)/); const n = m[1] ? +m[1] : 2; return igual(certo(q), `x^(${m[2]}/${n})`); },
  'radicais:1:4': q => { const m = q.q.match(/√(\d+) · √(\d+)/); const p = +m[1] * +m[2], r = Math.round(Math.sqrt(p)); return r * r === p ? igual(certo(q), String(r)) : 'produto não é quadrado'; },
  'radicais:2:1': q => { const N = +q.q.match(/√(\d+)/)[1], [a, b] = l7Sq(N); return igual(certo(q), l7Rt(a, b)); },
  'radicais:2:2': q => { const m = q.q.match(/vale (\d+)\^\((\d+)\/(\d+)\)\?/); return igualNum(+certo(q), Math.round(Number(m[1]) ** (+m[2] / +m[3]))); },
  'radicais:2:3': q => { const m = q.q.match(/Calcule (\d*)√(\d+) \+ (\d*)√(\d+)/); return m[2] === m[4] ? igual(certo(q), l7Rt(l7Co(m[1]) + l7Co(m[3]), m[2])) : 'radicais diferentes'; },
  'radicais:2:4': q => { const m = q.q.match(/\((\d+)√(\d+)\) · \((\d+)√(\d+)\)/); return igual(certo(q), String(+m[1] * +m[3] * +m[2])); },
  'radicais:3:1': q => { const m = q.q.match(/de (\d+)\/√(\d+)/); return igual(certo(q), `${+m[1] === 1 ? '' : m[1]}√${m[2]}/${m[2]}`); },
  'radicais:3:2': q => { const N = +q.q.match(/∛(\d+)/)[1], [a, b] = l7Cb(N); return igual(certo(q), `${a === 1 ? '' : a}∛${b}`); },
  'radicais:3:3': q => { const m = q.q.match(/vale (\d+)\^\((\d+)\/(\d+)\) · \d+\^\((\d+)\/\d+\)/); return igual(certo(q), String(Number(m[1]) ** ((+m[2] + +m[4]) / +m[3]))); },
  'radicais:3:4': q => { const m = q.q.match(/\((\d+)√(\d+) \+ (\d+)√\d+\)²/); return igual(certo(q), String((+m[1] + +m[3]) ** 2 * +m[2])); },

  'funcconc:1:1': q => { const m = [...q.q.matchAll(/(\d) → (\w)/g)], c = {}; m.forEach(x => c[x[1]] = (c[x[1]] || 0) + 1); const ok = ['1','2','3'].every(k => c[k] === 1); const sem = ['1','2','3'].some(k => !c[k]); return igual(certo(q), ok ? 'Sim, é função' : sem ? 'Não, um elemento de A fica sem imagem' : 'Não, um elemento de A tem duas imagens'); },
  'funcconc:1:2': q => { const m = q.q.match(/(\d+)x \+ (\d+)\. Qual é a imagem de (\d+)/); return igual(certo(q), String(m[1] * m[3] + Number(m[2]))); },
  'funcconc:1:3': q => { const c = Number(q.q.match(/de −(\d+)/)[1]); return igual(certo(q), String(c * c)); },
  'funcconc:1:4': q => igual(certo(q), q.q.match(/x − (\d+)\)/)[1]),
  'funcconc:2:1': q => { const y = [...q.q.matchAll(/f\(\d\) = (\d)/g)].map(m => Number(m[1])); return igual(certo(q), `{${[...new Set(y)].sort((a, b) => a - b).join(', ')}}`); },
  'funcconc:2:2': q => { const m = q.q.match(/√\(x ([+−]) (\d+)\)/); const c = m ? (m[1] === '+' ? -Number(m[2]) : Number(m[2])) : 0; return igual(certo(q), `x ≥ ${c < 0 ? '−' + (-c) : c}`); },
  'funcconc:2:3': q => { const m = q.q.match(/f\(1\) = (−?\d+) e f\(3\) = (−?\d+)/), p = l7N(m[1]), r = l7N(m[2]), v = p - (r - p) / 2; return igual(certo(q), v < 0 ? '−' + (-v) : String(v)); },
  'funcconc:2:4': q => { const m = q.q.match(/\{1, \.\.\., (\d+)\}.*\{0, 1, \.\.\., (\d+)\}/); return igual(certo(q), String(Number(m[2]) + 1 - Number(m[1]))); },
  'funcconc:3:1': q => { const m = q.q.match(/x² (?:([+−]) (\d+) )?quando x varia no intervalo \[(−?\d+), (\d+)\]/); const k = m[1] ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0, lo = l7N(m[3]), hi = Number(m[4]), M = Math.max(lo * lo, hi * hi), f = z => z < 0 ? '−' + (-z) : String(z); return igual(certo(q), `[${f(k)}, ${f(M + k)}]`); },
  'funcconc:3:2': q => igual(certo(q), '2'),
  'funcconc:3:3': q => { const m = q.q.match(/√\((−?\d+) − x\)\/(?:\(x ([+−]) (\d+)\)|x\b)/), c = l7N(m[1]), d = m[2] ? (m[2] === '+' ? -Number(m[3]) : Number(m[3])) : 0, f = z => z < 0 ? '−' + (-z) : String(z); return igual(certo(q), `x ≤ ${f(c)} e x ≠ ${f(d)}`); },
  'funcconc:3:4': q => { const m = q.q.match(/com (\d+) elementos em um conjunto com (\d+)/); return igual(certo(q), String(Number(m[2]) ** Number(m[1]))); },

  'fatoracao:1:1': q => l7Fz(q),
  'fatoracao:1:2': q => { const m = q.q.match(/produto (\(.+\))\.$/), got = certo(q); return igual(!got.includes('(') && l7Eq(got, m[1]) ? 'ok' : got, 'ok'); },
  'fatoracao:1:3': q => l7Fz(q),
  'fatoracao:1:4': q => { const m = q.q.match(/calcular (\d+)² − (\d+)²/); return igual(certo(q), String(Number(m[1]) ** 2 - Number(m[2]) ** 2)); },
  'fatoracao:2:1': q => l7Fz(q),
  'fatoracao:2:2': q => l7Fz(q),
  'fatoracao:2:3': q => l7Fz(q),
  'fatoracao:2:4': q => l7Fz(q),
  'fatoracao:3:1': q => { const e = q.q.match(/equação (.+) = 0/)[1], rs = certo(q).split(' e ').map(l7N); const ok = rs.length === 2 && rs[0] < rs[1] && rs.every(r => Math.abs(l7Ev(e, r)) < 1e-9); return igual(ok ? 'ok' : certo(q), 'ok'); },
  'fatoracao:3:2': q => igual(certo(q), 'x + ' + Math.sqrt(Number(q.q.match(/x² − (\d+)\)/)[1]))),
  'fatoracao:3:3': q => { const m = q.q.match(/x \+ y = (\d+) e x − y = (\d+)/); return igual(certo(q), String(m[1] * m[2])); },
  'fatoracao:3:4': q => l7Fz(q),

  'eqexplog:1:1': q => { const m = q.q.match(/(\d+)\^x = (\d+)/); return igual(certo(q), String(Math.round(Math.log(Number(m[2])) / Math.log(Number(m[1]))))); },
  'eqexplog:1:2': q => { const m = q.q.match(/log([₀-₉]+) (\d+)/); return igual(certo(q), String(Math.round(Math.log(Number(m[2])) / Math.log(l7Un(m[1]))))); },
  'eqexplog:1:3': q => { const m = q.q.match(/log([₀-₉]+) x = (\d+)/); return igual(certo(q), String(l7Un(m[1]) ** Number(m[2]))); },
  'eqexplog:1:4': q => { const m = q.q.match(/(\d+)\^\(x \+ (\d+)\) = (\d+)/); return igual(certo(q), String(Math.round(Math.log(Number(m[3])) / Math.log(Number(m[1]))) - Number(m[2]))); },
  'eqexplog:2:1': q => { const m = q.q.match(/(\d+)\^x = (\d+)/), k = Math.log2(Number(m[1])), n = Math.log2(Number(m[2])); return igual(certo(q), l7Fr(n, k)); },
  'eqexplog:2:2': q => { const T = Number(q.q.match(/= (\d+)\.$/)[1]); return igual(certo(q), String(Math.log2(T / 3))); },
  'eqexplog:2:3': q => { const m = q.q.match(/log([₀-₉]+) \(x \+ (\d+)\) = (\d+)/); return igual(certo(q), EMN_T(l7Un(m[1]) ** Number(m[3]) - Number(m[2]))); },
  'eqexplog:2:4': q => { const m = q.q.match(/log([₀-₉]+) (\d+) − log[₀-₉]+ (\d+)/); return igual(certo(q), String(Math.round(Math.log(Number(m[2]) / Number(m[3])) / Math.log(l7Un(m[1]))))); },
  'eqexplog:3:1': q => { const m = q.q.match(/de (\d+)\^\(2x\) − (\d+)·\d+\^x \+ (\d+) = 0/), b = Number(m[1]), S = Number(m[2]), P = Number(m[3]), xs = []; for (let x = -1; x <= 6; x++) { const t = b ** x; if (Math.abs(t * t - S * t + P) < 1e-9) xs.push(x); } return igual(certo(q), xs.map(String).join(' e ')); },
  'eqexplog:3:2': q => { const m = q.q.match(/a cada (\d+) horas.*ficar (\d+) vezes/) || q.q.match(/a cada (\d+) horas.*fica (\d+) vezes/); return igual(certo(q), String(Number(m[1]) * Math.log2(Number(m[2])))); },
  'eqexplog:3:3': q => { const m = q.q.match(/de (\d+) na base x vale (\d+)/); return igual(certo(q), String(Math.round(Number(m[1]) ** (1 / Number(m[2]))))); },
  'eqexplog:3:4': q => { const m = q.q.match(/\(x − (\d+)\) = (\d+)/), k = Number(m[1]), M = Number(m[2]); let r = null; for (let x = k + 1; x < 100; x++) if (Math.abs(x * (x - k) - 2 ** M) < 1e-9) r = x; return igual(certo(q), String(r)); },

  'funclog:1:1': q => { const m = q.q.match(/\(x ([+−]) (\d+)\)/), c = l7Cs(m[1], m[2]); return igual(certo(q), 'x > ' + EMN_T(c)); },
  'funclog:1:2': q => { const b = q.q.match(/na base (\S+) é/)[1]; return igual(certo(q), b.includes('/') ? 'Decrescente' : 'Crescente'); },
  'funclog:1:3': q => { const m = q.q.match(/log([₀-₉]+) x, quanto vale f\(1\/(\d+)\)/), b = l7Un(m[1]), N = Number(m[2]); return igual(certo(q), EMN_T(-Math.round(Math.log(N) / Math.log(b)))); },
  'funclog:1:4': q => { const m = q.q.match(/\(x ([+−]) (\d+)\)\?/), c = l7Cs(m[1], m[2]); return igual(certo(q), 'x = ' + EMN_T(c)); },
  'funclog:2:1': q => { const b = q.q.match(/f\(x\) = (\d+)\^x/)[1]; return igual(certo(q), 'g(x) = log' + '₀₁₂₃₄₅₆₇₈₉'.split('').reduce((a, d, i) => a.replace(new RegExp(i, 'g'), d), b) + ' x'); },
  'funclog:2:2': q => { const m = q.q.match(/log([₀-₉]+) x(?: ([+−]) (\d+))?, qual valor de x dá f\(x\) = (−?\d+)/) ; const b = l7Un(m[1]), k = !m[2] ? 0 : m[2] === '+' ? Number(m[3]) : -Number(m[3]), t = l7N(m[4]); return igual(certo(q), String(b ** (t - k))); },
  'funclog:2:3': q => { const m = q.q.match(/log([₀-₉]+)\(x ([+−]) (\d+)\)\) passa pelo ponto \((−?\d+), y\)/) || q.q.match(/log([₀-₉]+)\(x ([+−]) (\d+)\) passa pelo ponto \((−?\d+), y\)/), b = l7Un(m[1]), h = l7Cs(m[2] === '+' ? '+' : '-', m[3]) * 1; const hh = m[2] === '+' ? -Number(m[3]) : Number(m[3]); return igual(certo(q), String(Math.round(Math.log(l7N(m[4]) - hh) / Math.log(b)))); },
  'funclog:2:4': q => { const m = q.q.match(/\((\d+) − (\d+)x\)/); return igual(certo(q), 'x < ' + Number(m[1]) / Number(m[2])); },
  'funclog:3:1': q => { const n = Number(q.q.match(/(?:> |maior que )(\d+)/)[1]); return igual(certo(q), q.q.includes('1/2') ? `0 < x < 1/${2 ** n}` : `x > ${2 ** n}`); },
  'funclog:3:2': q => { const d = q.q.match(/= 0,(0*)1 mol/)[1].length + 1; return igual(certo(q), String(d)); },
  'funclog:3:3': q => { const N = Number(q.q.match(/vale log₂ (\d+)\?/)[1]), n = Math.round(Math.log2(N / 3)); return igual(certo(q), (Math.round((n + 1.58) * 100) / 100 + '').replace('.', ',')); },
  'funclog:3:4': q => { const m = q.q.match(/\(x ([+−]) (\d+)\) ([+−]) (\d+), qual valor de x dá f\(x\) = (\d+)/), h = l7Cs(m[1], m[2]), k = m[3] === '+' ? Number(m[4]) : -Number(m[4]), t = Number(m[5]); return igual(certo(q), EMN_T(2 ** (t - k) + h)); },

  'probuniao:1:1': q => { const m = q.q.match(/de 1 a (\d+).*múltiplo de (\d+) ou de (\d+)/), N = Number(m[1]); let c = 0; for (let i = 1; i <= N; i++) if (i % m[2] === 0 || i % m[3] === 0) c++; return igual(certo(q), l7Fp(c, N)); },
  'probuniao:1:2': q => { const m = q.q.match(/P\(A\) = (\d+)% e P\(B\) = (\d+)%/); return igual(certo(q), `${Number(m[1]) + Number(m[2])}%`); },
  'probuniao:1:3': q => igual(certo(q), `${100 - Number(q.q.match(/é (\d+)%/)[1])}%`),
  'probuniao:1:4': q => { const m = q.q.match(/(\d+) gostam de futebol, (\d+) gostam de vôlei e (\d+) gostam dos dois/); return igual(certo(q), String(m[1] - -m[2] - m[3])); },
  'probuniao:2:1': q => { const m = q.q.match(/P\(A\) = (\d+)%, P\(B\) = (\d+)% e P\(A e B\) = (\d+)%/); return igual(certo(q), `${Number(m[1]) + Number(m[2]) - Number(m[3])}%`); },
  'probuniao:2:2': q => { const m = q.q.match(/P\(A\) = (\d+)%, P\(B\) = (\d+)% e P\(A ou B\) = (\d+)%/); return igual(certo(q), `${Number(m[1]) + Number(m[2]) - Number(m[3])}%`); },
  'probuniao:2:3': q => { const m = q.q.match(/de (\d+) pessoas, (\d+) usam ônibus, (\d+) usam metrô e (\d+) usam os dois/); return igual(certo(q), String(m[1] - (Number(m[2]) + Number(m[3]) - m[4]))); },
  'probuniao:2:4': q => { const n = { 'rei ou carta de copas': 16, 'ás ou carta vermelha': 28, 'figura (valete, dama ou rei) ou carta de copas': 22 }; const k = Object.keys(n).find(z => q.q.includes('sair ' + z + '?')); return igual(certo(q), l7Fp(n[k], 52)); },
  'probuniao:3:1': q => { const x = [...q.q.matchAll(/(\d+) (?:pessoas estudam inglês|espanhol|francês)/g)]; const n = q.q.match(/(\d+) pessoas estudam inglês, (\d+) espanhol e (\d+) francês\. Estudam inglês e espanhol (\d+), inglês e francês (\d+), espanhol e francês (\d+), e (\d+) estudam/).slice(1).map(Number); return igual(certo(q), String(n[0] + n[1] + n[2] - n[3] - n[4] - n[5] + n[6])); },
  'probuniao:3:2': q => { const m = q.q.match(/soma ser (\d+) ou (\d+)\?/); let c = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === Number(m[1]) || i + j === Number(m[2])) c++; return igual(certo(q), l7Fp(c, 36)); },
  'probuniao:3:3': q => { const m = q.q.match(/(\d+)% dos moradores têm carro, (\d+)% têm moto e (\d+)% têm os dois/); return igual(certo(q), `${100 - (Number(m[1]) + Number(m[2]) - Number(m[3]))}%`); },
  'probuniao:3:4': q => { const m = q.q.match(/P\(A\) = (\d+)% e P\(B\) = (\d+)%/), a = Number(m[1]), b = Number(m[2]); return igual(certo(q), `${a + b - a * b / 100}%`); },

  'setorcirc:1:1': q => l7Pk(q, 2 * Number(q.q.match(/raio (\d+)/)[1])),
  'setorcirc:1:2': q => l7Pk(q, Number(q.q.match(/raio (\d+)/)[1]) ** 2),
  'setorcirc:1:3': q => { const a = Number(q.q.match(/de (\d+)°/)[1]); return igual(certo(q), l7Fp(a, 360)); },
  'setorcirc:1:4': q => igual(certo(q), `${360 / Number(q.q.match(/em (\d+) fatias/)[1])}°`),
  'setorcirc:2:1': q => { const m = q.q.match(/arco de (\d+)° .* raio (\d+)/); return l7Pk(q, m[1] * m[2] / 180); },
  'setorcirc:2:2': q => { const m = q.q.match(/de (\d+)° e raio (\d+)/); return l7Pk(q, m[1] * m[2] * m[2] / 360); },
  'setorcirc:2:3': q => { const m = q.q.match(/raio (\d+) cm, um arco mede (\S+) cm/), v = l7Pv(m[2]), ang = v * 180 / Number(m[1]); return igual(certo(q), `${Math.round(ang)}°`); },
  'setorcirc:2:4': q => { const a = Number(q.q.match(/Converta (\d+)°/)[1]), got = certo(q); return Math.abs(l7Pv(got) - a / 180) < 1e-9 && got.endsWith(' rad') ? null : `resposta "${got}" para ${a}°`; },
  'setorcirc:3:1': q => { const m = q.q.match(/raios (\d+) cm e (\d+) cm/); return l7Pk(q, m[1] ** 2 - m[2] ** 2); },
  'setorcirc:3:2': q => { const m = q.q.match(/raio (\d+) cm e arco de comprimento (\S+) cm/), r = Number(m[1]), L = l7Pv(m[2]); return l7Pk(q, L * r / 2); },
  'setorcirc:3:3': q => { const m = q.q.match(/de (\d+)° e raio (\d+)/), r = Number(m[2]), arc = m[1] * r / 180, got = certo(q), mm = got.match(/^(\d+) \+ (\d+)π cm$/); return mm && Number(mm[1]) === 2 * r && Number(mm[2]) === arc ? null : `resposta "${got}", esperado ${2 * r} + ${arc}π cm`; },
  'setorcirc:3:4': q => { const m = q.q.match(/mede (\d+) cm\. Em (\d+) minutos/); return l7Pk(q, m[2] / 60 * 2 * m[1]); },

  'regra3c:1:1': q => { const m = q.q.match(/(\d+) cadernos iguais custam R\$ (\d+)\. Quanto custam (\d+)/); return igual(certo(q), `R$ ${m[2] / m[1] * m[3]}`); },
  'regra3c:1:2': q => { const m = q.q.match(/^(\d+) operários terminam .* em (\d+) dias\. Em quantos dias (\d+) operários/); return igual(certo(q), `${m[1] * m[2] / m[3]} dias`); },
  'regra3c:1:3': q => { const t = { 'a velocidade média e o tempo': 'inversamente proporcionais', 'o número de operários e os dias': 'inversamente proporcionais', 'a quantidade de litros de gasolina': 'diretamente proporcionais', 'o número de pães': 'diretamente proporcionais', 'a idade de uma pessoa': 'não proporcionais', 'o número de torneiras iguais': 'inversamente proporcionais' }; const k = Object.keys(t).find(z => q.q.includes(z)); return igual(certo(q), t[k]); },
  'regra3c:1:4': q => { const m = q.q.match(/percorre (\d+) km em (\d+) horas/); return igual(certo(q), `${m[1] / m[2]} km/h`); },
  'regra3c:2:1': q => { const m = q.q.match(/^(\d+) máquinas iguais, em (\d+) dias, produzem (\d+) peças\. Quantas peças (\d+) dessas máquinas produzem em (\d+) dias/); return igual(certo(q), String(m[3] / (m[1] * m[2]) * m[4] * m[5])); },
  'regra3c:2:2': q => { const m = q.q.match(/^(\d+) operários, trabalhando (\d+) horas por dia, terminam uma obra em (\d+) dias\. Quantos dias (\d+) operários levam, trabalhando (\d+) horas/); return igual(certo(q), `${m[1] * m[2] * m[3] / (m[4] * m[5])} dias`); },
  'regra3c:2:3': q => { const m = q.q.match(/a (\d+) km\/h faz um trajeto em (\d+) horas.*a (\d+) km\/h/); return igual(certo(q), `${m[1] * m[2] / m[3]} h`); },
  'regra3c:2:4': q => { const m = q.q.match(/^(\d+) pessoas consomem (\d+) litros de água em (\d+) dias\. Quantos litros (\d+) pessoas consomem em (\d+) dias/); return igual(certo(q), `${m[2] / (m[1] * m[3]) * m[4] * m[5]} litros`); },
  'regra3c:3:1': q => { const m = q.q.match(/^(\d+) pedreiros levantam (\d+) m² de muro em (\d+) dias, trabalhando (\d+) horas por dia\. Quantos dias (\d+) pedreiros levam para levantar (\d+) m² trabalhando (\d+) horas/), r = m[2] / (m[1] * m[3] * m[4]); return igual(certo(q), `${m[6] / (r * m[5] * m[7])} dias`); },
  'regra3c:3:2': q => { const m = q.q.match(/escala 1:([\d.\s]+), a distância entre duas cidades mede (\d+) cm/), S = Number(m[1].replace(/\D/g, '')); return igual(certo(q), `${m[2] * S / 100000} km`); },
  'regra3c:3:3': q => { const m = q.q.match(/^(\d+)% de uma quantidade correspondem a (\d+)\. Quanto correspondem a (\d+)%/); return igual(certo(q), String(m[2] / m[1] * m[3])); },
  'regra3c:3:4': q => { const m = q.q.match(/a (\d+) km\/h e volta pelo mesmo caminho a (\d+) km\/h/), a = Number(m[1]), b = Number(m[2]); return igual(certo(q), `${2 * a * b / (a + b)} km/h`); },

  'setorcirc:1:1': q => { const r = Number(q.q.match(/raio (\d+) cm/)[1]); return igual(certo(q), `${2 * r}π cm`); },
  'setorcirc:1:2': q => { const r = Number(q.q.match(/raio (\d+) cm/)[1]); return igual(certo(q), `${r * r}π cm²`); },
  'setorcirc:1:3': q => { const a = Number(q.q.match(/de (\d+)°/)[1]), g = l7G(a, 360); return igual(certo(q), 360 / g === 1 ? String(a / g) : `${a / g}/${360 / g}`); },
  'setorcirc:1:4': q => { const n = Number(q.q.match(/em (\d+) fatias/)[1]); return igual(certo(q), `${360 / n}°`); },
  'setorcirc:2:1': q => { const m = q.q.match(/arco de (\d+)° .* raio (\d+) cm/); return igual(certo(q), `${l7Pi(m[1] * m[2], 180)} cm`); },
  'setorcirc:2:2': q => { const m = q.q.match(/de (\d+)° e raio (\d+) cm/); return igual(certo(q), `${l7Pi(m[1] * m[2] * m[2], 360)} cm²`); },
  'setorcirc:2:3': q => { const m = q.q.match(/raio (\d+) cm, um arco mede (\d*)π(?:\/(\d+))? cm/), r = Number(m[1]), n = m[2] === '' ? 1 : Number(m[2]), d = m[3] ? Number(m[3]) : 1; return igual(certo(q), `${Math.round(n / d * 180 / r)}°`); },
  'setorcirc:2:4': q => { const a = Number(q.q.match(/Converta (\d+)°/)[1]); return igual(certo(q), `${l7Pi(a, 180)} rad`); },
  'setorcirc:3:1': q => { const m = q.q.match(/raios (\d+) cm e (\d+) cm/); return igual(certo(q), `${m[1] * m[1] - m[2] * m[2]}π cm²`); },
  'setorcirc:3:2': q => { const m = q.q.match(/raio (\d+) cm e arco de comprimento (\d*)π(?:\/(\d+))? cm/), r = Number(m[1]), n = m[2] === '' ? 1 : Number(m[2]), d = m[3] ? Number(m[3]) : 1, A = n / d * r / 2; return igual(certo(q), `${l7Pi(Math.round(A * 360), 360)} cm²`); },
  'setorcirc:3:3': q => { const m = q.q.match(/de (\d+)° e raio (\d+) cm/), a = Number(m[1]), r = Number(m[2]); return igual(certo(q), `${2 * r} + ${a * r / 180}π cm`); },
  'setorcirc:3:4': q => { const m = q.q.match(/mede (\d+) cm\. Em (\d+) minutos/); return igual(certo(q), `${l7Pi(m[1] * m[2], 30)} cm`); },

  // ---------- juros ----------
  'juros:1:1': q => { const m = q.q.match(/custa (R\$ [\d.,]+) e está com (\d+)%/); return igualNum(pt(certo(q)), pt(m[1]) * (1 - m[2] / 100), 1e-6); },
  'juros:1:2': q => { const m = q.q.match(/de (R\$ [\d.,]+) sofreu aumento de (\d+)%/); return igualNum(pt(certo(q)), pt(m[1]) * (1 + m[2] / 100), 1e-6); },
  'juros:1:3': q => { const m = q.q.match(/de (\d+) alunos, (\d+)%/); return igualNum(pt(certo(q)), m[1] * m[2] / 100); },
  'juros:1:4': q => { const m = q.q.match(/(aumento|desconto) de (\d+)%/); return igualNum(pt(certo(q)), 1 + (m[1] === 'aumento' ? 1 : -1) * m[2] / 100, 1e-9); },
  'juros:2:1': q => { const m = q.q.match(/de (R\$ [\d.,]+) teve aumento de (\d+)% e, depois, desconto de (\d+)%/); return igualNum(pt(certo(q)), pt(m[1]) * (1 + m[2] / 100) * (1 - m[3] / 100), 1e-6); },
  'juros:2:2': q => { const p = +q.q.match(/sobe (\d+)%/)[1]; return igualNum(pt(certo(q)), p * p / 100, 1e-9); },
  'juros:2:3': q => { const m = q.q.match(/capital de (R\$ [\d.,]+) .* simples de (\d+)% ao mês durante (\d+) meses/); return igualNum(pt(certo(q)), pt(m[1]) * (1 + m[2] * m[3] / 100), 1e-6); },
  'juros:2:4': q => { const m = q.q.match(/de (R\$ [\d.,]+) foi vendida com abatimento de (R\$ [\d.,]+)/); return igualNum(pt(certo(q)), pt(m[2]) / pt(m[1]) * 100, 1e-6); },
  'juros:3:1': q => { const m = q.q.match(/capital de (R\$ [\d.,]+) rende (\d+)% ao mês .* após (\d+) meses/); return igualNum(pt(certo(q)), pt(m[1]) * (1 + m[2] / 100) ** m[3], 0.006); },
  'juros:3:2': q => { const m = q.q.match(/capital de (R\$ [\d.,]+) é aplicado por 2 meses a (\d+)%/); const C = pt(m[1]), i = m[2] / 100; return igualNum(pt(certo(q)), C * (1 + i) ** 2 - C * (1 + 2 * i), 0.006); },
  'juros:3:3': q => { const m = q.q.match(/custa (R\$ [\d.,]+) à vista, ou (\d+) parcelas de (R\$ [\d.,]+)/); const P = pt(m[1]); return igualNum(pt(certo(q)), (m[2] * pt(m[3]) - P) / P * 100, 1e-6); },
  'juros:3:4': q => { const m = q.q.match(/subiu (\d+)% em janeiro e mais (\d+)%/); return igualNum(pt(certo(q)), (100 + +m[1]) * (100 + +m[2]) / 100 - 100, 1e-6); },
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
  if (Array.isArray(q.ms) && Array.isArray(q.o) && q.ms.length !== q.o.length) erros.push(`ms tem ${q.ms.length} itens e o tem ${q.o.length}`);
  if (Array.isArray(q.tg) && Array.isArray(q.o) && q.tg.length !== q.o.length) erros.push(`tg tem ${q.tg.length} itens e o tem ${q.o.length}`);
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
      let dicasMin = 99; const f = [], enun = new Set(), lintVisto = new Set();
      for (let r = 0; r < RODADAS && f.length < 4; r++) {
        let q;
        try { q = fn(); } catch (e) { f.push(`rodada ${r}: exceção: ${e.message}`); continue; }
        const erros = validarQuestao(q, m);
        if (!erros.length && typeof q.q === 'string') {
          enun.add(q.q);
          dicasMin = Math.min(dicasMin, new Set((q.h || []).filter(Boolean)).size);
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
      else if (dicasMin < 2 && RODADAS >= 100) { avisos.push({ nome, msg: 'só 1 dica distinta: o 2º degrau da escada de ajuda não traz dica nova' }); porModulo[m.id].avisos++; }
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
