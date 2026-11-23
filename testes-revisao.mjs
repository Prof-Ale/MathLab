#!/usr/bin/env node
/** Testa a revisão espaçada (revisao-core.js). Uso: node testes-revisao.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const R = createRequire(import.meta.url)('./revisao-core.js');

const sessao = (r, d, ok, n) => { for (let i = 0; i < n; i++) r = R.registrar(r, i < ok, d); return r; };

test('uma sessão do dia não muda a caixa até o dia seguinte', () => {
  const r = sessao(undefined, '2026-11-01', 10, 10);
  assert.equal(r.caixa, 0); assert.equal(r.prox, null);
  assert.equal(R.devidos({ a: r }, '2026-11-01').length, 0);
});
test('sessão boa sobe a caixa e agenda 1 dia depois', () => {
  const r = sessao(undefined, '2026-11-01', 9, 10);
  assert.deepEqual(R.devidos({ a: r }, '2026-11-02').map(i => i.id), ['a']);
  assert.equal(R.fechar(r, '2026-11-02').prox, '2026-11-02');
});
test('sessão fraca volta para a caixa 1', () => {
  let r = sessao(undefined, '2026-11-01', 10, 10);
  r = sessao(R.fechar(r, '2026-11-02'), '2026-11-02', 10, 10);
  r = sessao(R.fechar(r, '2026-11-05'), '2026-11-05', 10, 10);
  assert.equal(R.fechar(r, '2026-11-06').caixa, 3);
  r = sessao(r, '2026-11-12', 2, 10);
  const f = R.fechar(r, '2026-11-13');
  assert.equal(f.caixa, 1); assert.equal(f.prox, '2026-11-13');
});
test('os intervalos crescem e a caixa tem teto', () => {
  let r, dia = '2026-01-01';
  for (let k = 0; k < 12; k++) { r = sessao(R.fechar(r, dia), dia, 10, 10); const f = R.fechar(r, R.somaDias(dia, 1)); dia = f.prox > dia ? f.prox : R.somaDias(dia, 1); }
  assert.equal(R.fechar(r, '2030-01-01').caixa, R.INTERVALOS.length - 1);
});
test('sessão com poucas respostas não altera o agendamento', () => {
  const r = sessao(undefined, '2026-11-01', 2, 2);
  const f = R.fechar(r, '2026-11-09');
  assert.equal(f.caixa, 0); assert.equal(f.prox, null); assert.equal(f.sessao, null);
});
test('mais atrasado vem primeiro e pré-requisito vencido vem antes', () => {
  const rev = {
    frac: { caixa: 1, prox: '2026-11-05' }, eq: { caixa: 1, prox: '2026-11-01' }, dec: { caixa: 2, prox: '2026-11-04' }
  };
  assert.deepEqual(R.devidos(rev, '2026-11-10').map(i => i.id), ['eq', 'dec', 'frac']);
  const pre = id => id === 'eq' ? ['frac'] : [];
  assert.deepEqual(R.devidos(rev, '2026-11-10', pre).map(i => i.id), ['frac', 'eq', 'dec']);
  assert.deepEqual(R.devidos({ a: { prox: '2026-11-11' } }, '2026-11-10'), []);
});
test('ciclo de pré-requisitos não trava', () => {
  const rev = { a: { caixa: 1, prox: '2026-11-01' }, b: { caixa: 1, prox: '2026-11-01' } };
  const r = R.devidos(rev, '2026-11-10', id => id === 'a' ? ['b'] : ['a']);
  assert.equal(r.length, 2);
});
test('dados corrompidos são tolerados', () => {
  assert.equal(R.normalizar(null).caixa, 0);
  assert.equal(R.normalizar({ caixa: 99, prox: 'x', sessao: { d: '2026-11-01', n: 1, ok: 5 } }).sessao, null);
  assert.deepEqual(R.devidos(null, '2026-11-10'), []);
  assert.deepEqual(R.devidos({ a: 7, b: 'x' }, '2026-11-10'), []);
});
test('registrar não altera o objeto original', () => {
  const r0 = Object.freeze({ caixa: 1, prox: '2026-11-01', sessao: null });
  assert.doesNotThrow(() => R.registrar(r0, true, '2026-11-10'));
});
test('integração: arquivos existem, são carregados e ficam no cache offline', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
  assert.ok(html.indexOf('revisao-core.js') < html.indexOf('revisao.js'));
  assert.ok(html.includes('<script src="revisao.js">'));
  assert.ok(sw.includes("'revisao-core.js'") && sw.includes("'revisao.js'"));
});
