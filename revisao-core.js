/* MathLab: revisão espaçada (caixas de Leitner). Lógica pura, sem tela e sem navegador.
   Unidade de revisão: o assunto (módulo). Uma sessão do dia vale como uma única evidência,
   porque 15 acertos seguidos no mesmo dia não provam memória de longo prazo.
   Estado por assunto: { caixa, prox, sessao: {d, n, ok} }  (datas AAAA-MM-DD, hora local). */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.MLRevisao = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const INTERVALOS = [0, 1, 3, 7, 14, 30, 60]; // dias de espera por caixa
  const MIN_RESPOSTAS = 3;   // abaixo disso a sessão é pouca evidência e não mexe na caixa
  const LIMIAR = 0.8;        // fração de acertos de primeira para a sessão contar como lembrada
  const DATA = /^\d{4}-\d{2}-\d{2}$/;

  const ehData = d => typeof d === 'string' && DATA.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z'));
  function somaDias(d, n) {
    const t = new Date(d + 'T00:00:00Z');
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  }
  function diasEntre(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }

  function normalizar(r) {
    const o = r && typeof r === 'object' ? r : {};
    const caixa = Number.isInteger(o.caixa) ? Math.min(Math.max(o.caixa, 0), INTERVALOS.length - 1) : 0;
    const s = o.sessao && typeof o.sessao === 'object' ? o.sessao : null;
    return {
      caixa,
      prox: ehData(o.prox) ? o.prox : null,
      sessao: s && ehData(s.d) && Number.isInteger(s.n) && Number.isInteger(s.ok) && s.n >= 0 && s.ok >= 0 && s.ok <= s.n
        ? { d: s.d, n: s.n, ok: s.ok } : null
    };
  }

  /* Fecha a sessão de um dia anterior a `hoje`, aplicando a regra de Leitner uma única vez. */
  function fechar(r, hoje) {
    const x = normalizar(r);
    if (!x.sessao || x.sessao.d >= hoje) return x;
    const { d, n, ok } = x.sessao;
    if (n >= MIN_RESPOSTAS) {
      x.caixa = ok / n >= LIMIAR ? Math.min(x.caixa + 1, INTERVALOS.length - 1) : 1;
      x.prox = somaDias(d, INTERVALOS[x.caixa]);
    }
    x.sessao = null;
    return x;
  }

  /* Registra a primeira resposta de uma questão. Devolve o novo estado do assunto (não altera o original). */
  function registrar(r, acertouDePrimeira, hoje) {
    const x = fechar(r, hoje);
    if (!x.sessao) x.sessao = { d: hoje, n: 0, ok: 0 };
    x.sessao.n += 1;
    if (acertouDePrimeira) x.sessao.ok += 1;
    return x;
  }

  /* Lista o que está na hora de revisar, do mais atrasado ao menos. Pré-requisito vencido vem antes do assunto que o usa. */
  function devidos(rev, hoje, prereqDe) {
    const lista = [];
    for (const id of Object.keys(rev && typeof rev === 'object' ? rev : {})) {
      const x = fechar(rev[id], hoje);
      if (x.prox && x.prox <= hoje) lista.push({ id, caixa: x.caixa, prox: x.prox, atraso: diasEntre(x.prox, hoje) });
    }
    lista.sort((a, b) => b.atraso - a.atraso || a.caixa - b.caixa || a.id.localeCompare(b.id));
    if (typeof prereqDe !== 'function') return lista;
    const ids = new Set(lista.map(i => i.id)), saida = [], posto = new Set();
    const por = new Map(lista.map(i => [i.id, i]));
    const poe = (i, pilha) => {
      if (posto.has(i.id) || pilha.has(i.id)) return;
      pilha.add(i.id);
      for (const p of (prereqDe(i.id) || [])) if (ids.has(p)) poe(por.get(p), pilha);
      posto.add(i.id); saida.push(i);
    };
    lista.forEach(i => poe(i, new Set()));
    return saida;
  }

  return { INTERVALOS, MIN_RESPOSTAS, LIMIAR, normalizar, fechar, registrar, devidos, somaDias };
});
