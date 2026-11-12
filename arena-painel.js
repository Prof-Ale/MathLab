/* ===== Painel do professor em 3 camadas (camada separada) =====
   Usa os dados que o relatório da Arena já guarda neste aparelho (window.ArenaRel).
   Camada 1: visão rápida (a turma está bem ou mal e o que fazer na próxima aula).
   Camada 2: assuntos e erros mais comuns.
   Camada 3: detalhe por questão e por partida.
   A Arena guarda só apelidos e contagens, então não existe detalhe por aluno, de propósito.
   Não altera regras, pontuação, Firebase nem o relatório existente. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(a,b)=>b>0?Math.round(100*a/b):null;
const ptxt=p=>p==null?'sem dados':p+'%';
const REL=()=>window.ArenaRel||null;
const MODS=()=>(window.__arenaInt&&window.__arenaInt.MODS)||[];
const meta=x=>MODS().find(k=>k&&(k.id===x||k.nome===x))||null;
const nomeDe=id=>{const m=meta(id);return m?m.nome:null};

/* faixa de desempenho: texto + símbolo, nunca só cor */
function faixa(p){
  if(p==null)return{k:'sd',s:'–',t:'Sem dados'};
  if(p>=75)return{k:'ok',s:'✔',t:'Bem'};
  if(p>=50)return{k:'at',s:'▲',t:'Atenção'};
  return{k:'re',s:'■',t:'Retomar'};
}
const chip=p=>{const f=faixa(p);return `<span class="pc pc-${f.k}"><b aria-hidden="true">${f.s}</b> ${f.t}</span>`};
const barra=p=>`<span class="pb" aria-hidden="true"><i class="pb-${faixa(p).k}" style="width:${p==null?0:p}%"></i></span>`;

/* ---------- filtro de escopo ---------- */
function escopos(todas,padrao){
  const o=[{v:'todas',t:'Todas as partidas',f:()=>todas}];
  if(todas.length>1)o.push({v:'ultima',t:'Só a última partida',f:()=>todas.slice(-1)});
  [...new Set(todas.map(s=>s.turma).filter(Boolean))].forEach(t=>o.push({v:'t:'+t,t:'Turma '+t,f:()=>todas.filter(s=>s.turma===t)}));
  return{lista:o,atual:o.find(x=>x.v===padrao)||o[0]};
}

/* ---------- camada 1: visão rápida ---------- */
function camada1(ss,A){
  const g=pct(A.ac,A.tot),f=faixa(g);
  const frase=g==null?'Ainda não há respostas para avaliar.':g>=75?'A turma foi bem. Dá para avançar.':g>=50?'A turma está no meio do caminho. Vale reforçar os pontos abaixo.':'A turma teve dificuldade. Vale retomar antes de avançar.';
  const L=[];
  const pior=A.mods.filter(m=>m.rod>=1&&pct(m.ac,m.tot)!=null&&pct(m.ac,m.tot)<75)[0];
  if(pior){const m=meta(pior.id||pior.nome),pre=((m&&m.prereq)||[]).map(nomeDe).filter(Boolean);
    L.push(`Retomar <b>${esc(pior.nome)}</b> (${pct(pior.ac,pior.tot)}% de acerto).${pre.length?' Se o erro persistir, olhe os pré-requisitos: '+pre.map(x=>'<b>'+esc(x)+'</b>').join(', ')+'.':''}`)}
  const e=A.erros[0];
  if(e)L.push(`Engano mais comum: <b>${esc(e.tag)}</b> em ${esc(e.nome)} (${e.n} ${e.n===1?'vez':'vezes'}).${e.msg?' '+esc(e.msg):''}`);
  const bom=A.mods.filter(m=>m.rod>=2&&pct(m.ac,m.tot)>=80).map(m=>{const mm=meta(m.id||m.nome),nx=((mm&&mm.proximo)||[]).map(nomeDe).filter(Boolean);return nx.length?`Pode avançar de <b>${esc(m.nome)}</b> para ${nx.map(x=>'<b>'+esc(x)+'</b>').join(', ')}.`:''}).filter(Boolean)[0];
  if(bom)L.push(bom);
  if(!L.length&&g!=null)L.push('Nenhum ponto crítico apareceu nesta amostra. Se quiser mais segurança, jogue outra partida com assuntos diferentes.');
  let tend='';
  if(ss.length>=2){
    const u=ss[ss.length-1],pa=u.rod.reduce((t,r)=>t+r.ac,0),ta=u.rod.reduce((t,r)=>t+r.tot,0),ant=ss.slice(0,-1),pb=ant.reduce((t,s)=>t+s.rod.reduce((x,r)=>x+r.ac,0),0),tb=ant.reduce((t,s)=>t+s.rod.reduce((x,r)=>x+r.tot,0),0),a=pct(pa,ta),b=pct(pb,tb);
    if(a!=null&&b!=null){const d=a-b;tend=`<p class="pt">Última partida: <b>${a}%</b> contra ${b}% nas anteriores (${d>0?'▲ subiu '+d:d<0?'▼ caiu '+(-d):'igual'}${d?' pontos':''}).</p>`}
  }
  const pouco=A.qs<5?`<p class="pn">Poucas questões até agora (${A.qs}). Leia o resultado com cuidado.</p>`:'';
  return `<div class="p1 p1-${f.k}"><div class="p1n"><b>${ptxt(g)}</b><span>acerto geral</span></div><div class="p1t"><h3>${chip(g)}</h3><p class="p1f">${esc(frase)}</p></div></div>
  <div class="rk"><div><b>${A.sessoes}</b><span>${A.sessoes===1?'partida':'partidas'}</span></div><div><b>${A.part}</b><span>participações</span></div><div><b>${A.qs}</b><span>questões jogadas</span></div><div><b>${A.mods.length}</b><span>${A.mods.length===1?'assunto':'assuntos'}</span></div></div>
  ${tend}${pouco}
  <h3>Para a próxima aula</h3>${L.length?`<ul class="pl">${L.map(t=>`<li>${t}</li>`).join('')}</ul>`:'<p>Ainda não há dados suficientes para sugerir um caminho.</p>'}`;
}

/* ---------- camada 2: assuntos e erros ---------- */
function camada2(A){
  const tm=A.mods.length?`<div class="tw"><table class="pt2"><thead><tr><th>Assunto</th><th>Situação</th><th style="width:26%">Acerto</th><th class="n">%</th><th class="n">Questões</th><th class="n">Ver</th></tr></thead><tbody>${A.mods.map(m=>{const p=pct(m.ac,m.tot);return `<tr><td>${esc(m.nome)}<br><small>Nível ${[...m.niv].sort().join(', ')}</small></td><td>${chip(p)}</td><td>${barra(p)}</td><td class="n">${ptxt(p)}</td><td class="n">${m.rod}</td><td class="n"><button type="button" class="pv" data-ass="${esc(m.nome)}">questões</button></td></tr>`}).join('')}</tbody></table></div>`:'<p>Sem dados.</p>';
  const te=A.erros.length?`<div class="tw"><table class="pt2"><thead><tr><th>Assunto</th><th>Engano típico</th><th class="n">Vezes</th><th class="n">% dos erros</th><th>O que retomar</th></tr></thead><tbody>${A.erros.slice(0,8).map(e=>`<tr><td>${esc(e.nome)}</td><td>${esc(e.tag)}</td><td class="n">${e.n}</td><td class="n">${A.totErr?Math.round(100*e.n/A.totErr):0}%</td><td>${esc(e.msg||'')}</td></tr>`).join('')}</tbody></table></div>`:'<p>Nenhum engano classificado ainda.</p>';
  return `<h3>Acerto por assunto</h3>${tm}<h3>Erros mais comuns e o que retomar</h3>${te}`;
}

/* ---------- camada 3: detalhe por questão e por partida ---------- */
function camada3(ss,filtro){
  const rs=[];
  ss.forEach(s=>s.rod.forEach(r=>{if(r.tot>0&&(!filtro||r.nome===filtro))rs.push(Object.assign({},r,{data:s.data,turma:s.turma}))}));
  rs.sort((a,b)=>a.ac/a.tot-b.ac/b.tot||b.tot-a.tot);
  const nomes=[...new Set(ss.flatMap(s=>s.rod.map(r=>r.nome)))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const sel=`<label class="pf">Assunto <select id="pnlAss"><option value="">Todos</option>${nomes.map(n=>`<option value="${esc(n)}"${n===filtro?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  const qs=rs.slice(0,60).map(r=>{
    const p=pct(r.ac,r.tot),er=(r.er||[]).filter(x=>x.n!=null).sort((a,b)=>b.n-a.n),top=er[0]&&er[0].n>0?er[0]:null;
    return `<details class="pq"><summary>${chip(p)} <b>${esc(r.nome)}</b> · Nível ${esc(r.nivel)} · ${r.ac} de ${r.tot} acertaram (${ptxt(p)})<span class="pe">${esc(r.enun)}</span></summary>
    <p>Resposta certa: <b>${esc(r.certa)}</b></p>${r.expl?`<p>Resolução: ${esc(r.expl)}</p>`:''}
    ${top?`<p>Alternativa errada mais escolhida: <b>${esc(top.t)}</b> (${top.n} ${top.n===1?'aluno':'alunos'})${top.tag?`, tipo de engano: ${esc(top.tag)}`:''}.${top.m?' '+esc(top.m):''}</p>`:''}
    ${er.some(x=>x.n>0)?`<ul class="pl">${er.map(x=>`<li>${esc(x.t)}: ${x.n} ${x.n===1?'aluno':'alunos'}${x.tag?` (${esc(x.tag)})`:''}</li>`).join('')}</ul>`:''}
    <small>${esc(r.data)}${r.turma?' · '+esc(r.turma):''}</small></details>`}).join('');
  const ps=`<div class="tw"><table class="pt2"><thead><tr><th>Data</th><th>Turma</th><th>Modo</th><th class="n">Participantes</th><th class="n">Questões</th><th class="n">Acerto</th></tr></thead><tbody>${ss.map(s=>{const a=s.rod.reduce((t,r)=>t+r.ac,0),t=s.rod.reduce((x,r)=>x+r.tot,0);return `<tr><td>${esc(s.data)}</td><td>${esc(s.turma||'')}</td><td>${s.modo==='celulares'?'Celulares':'Local'}</td><td class="n">${s.n||0}</td><td class="n">${s.rod.length}</td><td class="n">${ptxt(pct(a,t))}</td></tr>`}).join('')}</tbody></table></div>`;
  return `<h3>Questões, das que mais desafiaram para as que menos</h3>${sel}${qs||'<p>Nenhuma questão com respostas.</p>'}${rs.length>60?`<p class="pn">Mostrando as 60 primeiras de ${rs.length}. Use o filtro de assunto para ver as outras.</p>`:''}
  <h3>Partidas</h3>${ps}
  <p class="pn">A Arena usa apelidos e equipes e guarda só contagens. Por isso o detalhe é por questão e por partida, não por aluno.</p>`;
}

/* ---------- janela ---------- */
const CSS=`#arPnl{position:fixed;inset:0;z-index:10000;background:rgba(2,8,23,.8);overflow:auto;padding:1rem}
#arPnl .pc0{max-width:62rem;margin:0 auto;background:var(--card,#fff);color:var(--tx,#111);border:1px solid var(--bd,#999);border-radius:18px;padding:1.2rem;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#arPnl .pbar{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;margin-bottom:.8rem}
#arPnl .pbar>div{display:flex;gap:.5rem;flex-wrap:wrap}
#arPnl h2{font-size:1.4rem;margin:0;color:var(--gold2,#8a5a00)}#arPnl h3{font-size:1.05rem;margin:1.1rem 0 .5rem;color:var(--gold2,#8a5a00)}
#arPnl .pf select,#arPnl .pesc select{max-width:100%;margin-left:.4rem;padding:.35rem;border-radius:8px;border:1px solid var(--bd,#999);background:var(--card,#fff);color:var(--tx,#111)}
#arPnl [role=tablist]{display:flex;gap:.4rem;flex-wrap:wrap;margin:.6rem 0;border-bottom:2px solid var(--bd,#999)}
#arPnl [role=tab]{font:inherit;font-weight:700;padding:.6rem .9rem;border:1px solid var(--bd,#999);border-bottom:0;border-radius:10px 10px 0 0;background:transparent;color:var(--tx,#111);cursor:pointer;min-height:44px}
#arPnl [role=tab][aria-selected=true]{background:var(--gold,#e09000);color:#111;border-color:var(--gold,#e09000)}
#arPnl [role=tab]:focus-visible,#arPnl button:focus-visible,#arPnl select:focus-visible,#arPnl summary:focus-visible{outline:3px solid #4dabf7;outline-offset:2px}
#arPnl .p1{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;border:2px solid var(--bd,#999);border-radius:16px;padding:1rem;margin:.6rem 0}
#arPnl .p1n b{display:block;font-size:2.6rem;line-height:1}#arPnl .p1n span{font-size:.85rem;color:var(--mu,#444)}
#arPnl .p1t h3{margin:0 0 .2rem}#arPnl .p1f{font-size:1.1rem;margin:.2rem 0;font-weight:600}
#arPnl .p1-ok{border-color:#2b9348}#arPnl .p1-at{border-color:#e09000}#arPnl .p1-re{border-color:#d62839}
#arPnl .pc{display:inline-block;padding:.15rem .55rem;border-radius:999px;font-size:.85rem;font-weight:700;border:1.5px solid currentColor;white-space:nowrap}
#arPnl .pc-ok{background:#d3f0dc;color:#14532d;border-color:#14532d}#arPnl .pc-at{background:#fde8b8;color:#5c3800;border-color:#5c3800}#arPnl .pc-re{background:#fbd0d4;color:#7a1420;border-color:#7a1420}#arPnl .pc-sd{background:#e4e4e4;color:#333;border-color:#333}#arPnl .tw{overflow-x:auto}#arPnl .pc0{min-width:0;overflow-x:hidden}#arPnl .pq summary{overflow-wrap:anywhere}
#arPnl .pb{display:block;height:11px;border:1px solid var(--mu,#666);border-radius:6px;overflow:hidden}#arPnl .pb i{display:block;height:100%}
#arPnl .pb-ok{background:#2b9348}#arPnl .pb-at{background:#e09000}#arPnl .pb-re{background:#d62839}#arPnl .pb-sd{background:#888}
#arPnl .rk{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:.6rem;margin:.8rem 0}
#arPnl .rk div{border:1px solid var(--bd,#999);border-radius:12px;padding:.6rem;text-align:center}#arPnl .rk b{display:block;font-size:1.4rem}#arPnl .rk span{font-size:.82rem;color:var(--mu,#444)}
#arPnl table{width:100%;border-collapse:collapse;font-size:.92rem}#arPnl th,#arPnl td{padding:.5rem;border-bottom:1px solid var(--bd,#999);text-align:left;vertical-align:top}#arPnl th{color:var(--gold2,#8a5a00)}#arPnl .n{text-align:right;white-space:nowrap}
#arPnl .pv{font:inherit;font-size:.85rem;padding:.3rem .6rem;border-radius:8px;border:1px solid var(--bd,#999);background:transparent;color:var(--tx,#111);cursor:pointer;min-height:36px}
#arPnl .pq{border:1px solid var(--bd,#999);border-radius:12px;padding:.6rem .8rem;margin:.5rem 0}#arPnl .pq summary{cursor:pointer}#arPnl .pe{display:block;margin-top:.25rem;color:var(--mu,#444);font-size:.9rem}
#arPnl .pl{padding-left:1.2rem}#arPnl .pl li{margin:.35rem 0}#arPnl .pn,#arPnl .pt{font-size:.88rem;color:var(--mu,#444);margin:.4rem 0}#arPnl .pt{font-size:.95rem;color:inherit}
#arPnl [role=tabpanel][hidden]{display:none}
@media (max-width:560px){#arPnl{padding:.4rem}#arPnl .pc0{padding:.8rem;border-radius:12px}#arPnl [role=tab]{flex:1;padding:.55rem .4rem;font-size:.88rem}#arPnl table{font-size:.84rem}#arPnl th,#arPnl td{padding:.35rem}#arPnl .p1n b{font-size:2.1rem}}
@media print{body.arpnl-open>*:not(#arPnl){display:none!important}#arPnl{position:static!important;background:#fff!important;padding:0!important;overflow:visible!important}
#arPnl .pc0{box-shadow:none!important;border:0!important;background:#fff!important;color:#000!important;max-width:none!important;padding:0!important}#arPnl .pbar,#arPnl [role=tablist],#arPnl .pv,#arPnl .pf{display:none!important}
#arPnl [role=tabpanel][hidden]{display:block!important}#arPnl details{display:block}#arPnl details>*{display:block}#arPnl h2,#arPnl h3,#arPnl th{color:#0b2a52!important}#arPnl td,#arPnl th{border-bottom:1px solid #999!important;color:#000!important}#arPnl .pb i{background:#555!important}#arPnl .pc{color:#000!important}#arPnl .p1,#arPnl .pq,#arPnl .rk div{break-inside:avoid;border-color:#999!important}#arPnl h3{break-after:avoid}}`;

let focoAnt=null,dados=null;
function fechar(){const m=$('arPnl');if(m)m.remove();document.body.classList.remove('arpnl-open');document.removeEventListener('keydown',tecla,true);if(focoAnt&&focoAnt.focus)focoAnt.focus();dados=null}
function foc(m){return[...m.querySelectorAll('button:not([disabled]),select,summary,[tabindex="0"]')].filter(e=>e.offsetParent!==null)}
function tecla(e){
  const m=$('arPnl');if(!m)return;
  if(e.key==='Escape'){e.stopPropagation();fechar();return}
  if(e.key==='Tab'){const f=foc(m);if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}
}
function csvBaixar(ss){const R=REL();if(!R)return;try{const d=new Date(),p=n=>String(n).padStart(2,'0'),b=new Blob([R.csv(ss)],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`mathlab-painel-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}catch(_){alert('Não consegui gerar a planilha neste navegador.')}}

function abrir(padrao){
  const R=REL();if(!R)return;
  const todas=R.carregar();
  if(!todas.length){alert('Ainda não há partidas salvas para montar o painel.');return}
  fechar();focoAnt=document.activeElement;
  if(!$('arPnlCss')){const st=document.createElement('style');st.id='arPnlCss';st.textContent=CSS;document.head.appendChild(st)}
  const E=escopos(todas,padrao);dados={todas,E,esc:E.atual,filtro:''};
  const m=document.createElement('div');m.id='arPnl';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','pnlT');
  document.body.appendChild(m);document.body.classList.add('arpnl-open');
  document.addEventListener('keydown',tecla,true);
  desenhar(m,0);
  const t=$('pnlT');if(t)t.focus();
}
function desenhar(m,aba){
  const D=dados,ss=D.esc.f(),A=REL().agregar(ss);
  const rot=ss.length===1?ss[0].data:ss.length+' partidas, de '+ss[0].data+' a '+ss[ss.length-1].data;
  const abas=['Visão rápida','Assuntos e erros','Detalhe'];
  const pan=[camada1(ss,A),camada2(A),camada3(ss,D.filtro)];
  m.innerHTML=`<div class="pc0"><div class="pbar"><div><h2 id="pnlT" tabindex="-1">Painel do professor</h2></div><div><button class="ar-go peq" type="button" id="pnlPrint">Imprimir ou salvar em PDF</button><button class="ar-btn sec peq" type="button" id="pnlCsv">Baixar planilha (CSV)</button><button class="ar-btn sec peq" type="button" id="pnlFecha">Fechar</button></div></div>
  <p class="pn">${esc(rot)}</p>
  <label class="pesc">Mostrar <select id="pnlEsc">${D.E.lista.map(o=>`<option value="${esc(o.v)}"${o===D.esc?' selected':''}>${esc(o.t)}</option>`).join('')}</select></label>
  <div role="tablist" aria-label="Camadas do painel">${abas.map((t,i)=>`<button role="tab" type="button" id="pnlTab${i}" aria-controls="pnlP${i}" aria-selected="${i===aba}" tabindex="${i===aba?0:-1}">${i+1}. ${t}</button>`).join('')}</div>
  ${pan.map((h,i)=>`<div role="tabpanel" id="pnlP${i}" aria-labelledby="pnlTab${i}" ${i===aba?'':'hidden'}>${h}</div>`).join('')}
  <p class="pn">Dados guardados só neste aparelho e neste navegador. Sugestões baseadas no acerto da turma e nos pré-requisitos dos assuntos. Complementam o olhar do professor, não o substituem.</p></div>`;
  const ir=i=>{desenhar(m,i);const b=$('pnlTab'+i);b&&b.focus()};
  m.querySelectorAll('[role=tab]').forEach((b,i)=>{
    b.onclick=()=>ir(i);
    b.onkeydown=e=>{const k=e.key;if(k==='ArrowRight'||k==='ArrowLeft'||k==='Home'||k==='End'){e.preventDefault();ir(k==='Home'?0:k==='End'?2:(i+(k==='ArrowRight'?1:2))%3)}};
  });
  $('pnlPrint').onclick=()=>window.print();$('pnlCsv').onclick=()=>csvBaixar(ss);$('pnlFecha').onclick=fechar;
  $('pnlEsc').onchange=e=>{D.esc=D.E.lista.find(o=>o.v===e.target.value)||D.E.lista[0];D.filtro='';desenhar(m,aba);const s=$('pnlEsc');s&&s.focus()};
  m.querySelectorAll('.pv').forEach(b=>b.onclick=()=>{D.filtro=b.dataset.ass;ir(2)});
  const fa=$('pnlAss');if(fa)fa.onchange=e=>{D.filtro=e.target.value;desenhar(m,2);const s=$('pnlAss');s&&s.focus()};
}

/* ---------- botões nas telas da Arena ---------- */
function botoes(){
  [['arRelAbre','todas'],['arRelUma','ultima']].forEach(([id,pad])=>{
    const b=$(id);if(!b||b.parentNode.querySelector('[data-pnl="'+id+'"]'))return;
    const n=document.createElement('button');n.type='button';n.className='ar-go peq';n.textContent='Painel do professor';n.dataset.pnl=id;
    n.onclick=()=>abrir(pad);b.insertAdjacentElement('afterend',n);
  });
}
let tmr=null;
function iniciar(){
  const m=$('arMain');if(!m)return;
  new MutationObserver(()=>{clearTimeout(tmr);tmr=setTimeout(()=>{try{botoes()}catch(e){try{console.warn('arena-painel',e)}catch(_){}}},160)}).observe(m,{childList:true});
  setTimeout(()=>{try{botoes()}catch(_){}},200);
}
window.ArenaPainel={abrir,camada1,camada2,camada3};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
