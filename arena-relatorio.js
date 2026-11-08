/* ===== Relatório pedagógico da Arena (camada separada) =====
   Guarda um resumo de cada partida neste aparelho e monta um relatório para o professor:
   acerto por assunto, erros mais comuns com o que retomar, questões que mais desafiaram
   e sugestões para a próxima aula. Só usa apelidos e contagens, nunca lista quem errou.
   Não altera as regras, a pontuação nem o Firebase. */
(function(){
'use strict';
const KEY='mathlab-arena-rel',TKEY='mathlab-arena-rel-turma',MAX=40;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=()=>window.__arenaInt||null;
const pct=(a,b)=>b>0?Math.round(100*a/b):null;
const ptxt=p=>p==null?'sem dados':p+'%';

/* ---------- armazenamento ---------- */
function carregar(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(s=>s&&Array.isArray(s.rod)):[]}catch(_){return[]}}
function gravar(a){
  for(const n of [MAX,25,12]){try{localStorage.setItem(KEY,JSON.stringify(a.slice(-n)));return true}catch(_){}}
  return false;
}
const turmaSalva=()=>{try{return localStorage.getItem(TKEY)||''}catch(_){return''}};

/* ---------- captura da partida que acabou ---------- */
function fonte(){
  const ii=I();if(!ii)return null;
  let LV=null;try{LV=window.__arenaHostEstado&&window.__arenaHostEstado()}catch(_){}
  if(LV&&LV.fase==='podio'&&Array.isArray(LV.rodadas)&&LV.rodadas.length)
    return{modo:'celulares',rodadas:LV.rodadas,erros:LV.erros||{},n:Object.keys(LV.placar||{}).length,id:'L|'+(LV.cod||'')+'|'+(LV.inicioEm||'')};
  const E=ii.E;
  if(E&&Array.isArray(E.rodadas)&&E.rodadas.length&&!E.ativa){
    if(E._relArr!==E.rodadas){E._relArr=E.rodadas;E._relId='E|'+Date.now()}
    return{modo:'local',rodadas:E.rodadas,erros:E.erros||{},n:(E.placar||[]).length,id:E._relId};
  }
  return null;
}
function registro(f){
  const mods=(I().MODS||[]),idDe=n=>(mods.find(m=>m&&m.nome===n)||{}).id||'';
  const rod=f.rodadas.map(r=>{
    const q=r.q||{},er=[];
    (q.o||[]).forEach((t,i)=>{if(i===q.c)return;er.push({t:String(t),tag:(q.tg&&q.tg[i])||'',m:(q.ms&&q.ms[i])||'',n:r.dist&&Number.isFinite(r.dist[i])?r.dist[i]:null})});
    return{mod:idDe(r.modNome),nome:r.modNome,nivel:r.nivel,enun:String(q.q||''),certa:String((q.o||[])[q.c]||''),expl:String(q.e||''),ac:r.acertos||0,tot:r.total||0,er};
  });
  const nomes=[...new Set(rod.map(r=>r.nome))].sort((a,b)=>b.length-a.length);
  const err=[];
  Object.entries(f.erros||{}).forEach(([k,n])=>{const nm=nomes.find(x=>k.startsWith(x+': '));if(nm)err.push({nome:nm,tag:k.slice(nm.length+2),n})});
  const d=new Date();
  return{id:f.id,ts:d.getTime(),data:d.toLocaleDateString('pt-BR'),turma:turmaSalva(),modo:f.modo,n:f.n,rod,err};
}
function capturar(){
  const f=fonte();if(!f)return null;
  const a=carregar();let s=a.find(x=>x.id===f.id);
  if(!s){s=registro(f);a.push(s);gravar(a)}
  return s;
}
function atualizarTurma(id,turma){
  try{localStorage.setItem(TKEY,turma)}catch(_){}
  const a=carregar(),s=a.find(x=>x.id===id);if(s){s.turma=turma;gravar(a)}
}

/* ---------- agregação ---------- */
const meta=x=>{const m=(I()&&I().MODS)||[];return m.find(k=>k&&(k.id===x||k.nome===x))||null};
function agregar(ss){
  const mod={},err={},des=[];let part=0,qs=0,tot=0,ac=0;
  ss.forEach(s=>{
    part+=s.n||0;
    s.rod.forEach(r=>{
      const m=mod[r.nome]=mod[r.nome]||{nome:r.nome,id:r.mod,tot:0,ac:0,rod:0,niv:new Set()};
      m.tot+=r.tot;m.ac+=r.ac;m.rod++;m.niv.add(r.nivel);tot+=r.tot;ac+=r.ac;qs++;
      des.push(Object.assign({},r,{data:s.data,turma:s.turma}));
    });
    (s.err||[]).forEach(e=>{
      const k=e.nome+'\u0001'+e.tag,o=err[k]=err[k]||{nome:e.nome,tag:e.tag,n:0,msg:''};o.n+=e.n;
      if(!o.msg)s.rod.forEach(r=>{if(!o.msg&&r.nome===e.nome)r.er.forEach(x=>{if(!o.msg&&x.tag===e.tag&&x.m)o.msg=x.m})});
    });
  });
  const erros=Object.values(err).sort((a,b)=>b.n-a.n),totErr=erros.reduce((t,e)=>t+e.n,0);
  const mods=Object.values(mod).sort((a,b)=>{const pa=pct(a.ac,a.tot),pb=pct(b.ac,b.tot);return(pa==null?101:pa)-(pb==null?101:pb)});
  const desaf=des.filter(r=>r.tot>0&&r.ac<r.tot).sort((a,b)=>a.ac/a.tot-b.ac/b.tot).slice(0,5);
  return{sessoes:ss.length,part,qs,tot,ac,mods,erros,totErr,desaf};
}
function sugestoes(A){
  const L=[],ok=new Set();
  const add=(k,t)=>{if(!ok.has(k)){ok.add(k);L.push(t)}};
  const nm=id=>{const m=meta(id);return m?m.nome:null};
  A.mods.forEach(m=>{
    const p=pct(m.ac,m.tot);if(p==null||m.rod<2)return;
    const mm=meta(m.id||m.nome),pre=((mm&&mm.prereq)||[]).map(nm).filter(Boolean);
    if(p<50)add('b'+m.nome,`<b>${esc(m.nome)}</b>: ${p}% de acerto. Vale retomar em sala antes de avançar${pre.length?`. Se o erro persistir, revise os pré-requisitos: ${pre.map(x=>'<b>'+esc(x)+'</b>').join(', ')}`:''}.`);
    else if(p>=80){const nx=((mm&&mm.proximo)||[]).map(nm).filter(Boolean);if(nx.length)add('a'+m.nome,`<b>${esc(m.nome)}</b>: ${p}% de acerto. A turma pode avançar para ${nx.map(x=>'<b>'+esc(x)+'</b>').join(', ')}.`)}
  });
  A.erros.slice(0,3).forEach(e=>add('e'+e.nome+e.tag,`Engano frequente em <b>${esc(e.nome)}</b>: ${esc(e.tag)} (${e.n} ${e.n===1?'vez':'vezes'}).${e.msg?' Para retomar: '+esc(e.msg):''}`));
  return L.slice(0,6);
}
const barra=p=>`<span class="rb"><i style="width:${p==null?0:p}%"></i></span>`;
function maisEscolhida(r){
  const c=(r.er||[]).filter(x=>x.n!=null&&x.n>0).sort((a,b)=>b.n-a.n)[0];
  return c?`A alternativa errada mais escolhida foi <b>${esc(c.t)}</b> (${c.n} ${c.n===1?'aluno':'alunos'})${c.tag?`, tipo de engano: ${esc(c.tag)}`:''}.`:'';
}

/* ---------- HTML do relatório ---------- */
function htmlRelatorio(ss,titulo,rotulo){
  const A=agregar(ss),g=pct(A.ac,A.tot),S=sugestoes(A);
  const kp=`<div class="rk"><div><b>${A.sessoes}</b><span>${A.sessoes===1?'partida':'partidas'}</span></div><div><b>${A.part}</b><span>participações</span></div><div><b>${A.qs}</b><span>questões jogadas</span></div><div><b>${ptxt(g)}</b><span>acerto geral</span></div></div>`;
  const tMod=A.mods.length?`<table class="rt"><thead><tr><th>Assunto</th><th>Nível</th><th class="n">Questões</th><th style="width:30%">Acerto</th><th class="n">%</th></tr></thead><tbody>${A.mods.map(m=>{const p=pct(m.ac,m.tot);return `<tr><td>${esc(m.nome)}</td><td>${[...m.niv].sort().join(', ')}</td><td class="n">${m.rod}</td><td>${barra(p)}</td><td class="n">${ptxt(p)}</td></tr>`}).join('')}</tbody></table>`:'<p>Sem questões registradas.</p>';
  const tErr=A.erros.length?`<table class="rt"><thead><tr><th>Assunto</th><th>Engano típico</th><th class="n">Vezes</th><th class="n">% dos erros</th><th>O que retomar</th></tr></thead><tbody>${A.erros.slice(0,10).map(e=>`<tr><td>${esc(e.nome)}</td><td>${esc(e.tag)}</td><td class="n">${e.n}</td><td class="n">${pct(e.n,A.totErr)}%</td><td>${esc(e.msg||'')}</td></tr>`).join('')}</tbody></table><p class="rn">Os tipos descrevem o raciocínio por trás do erro, não quem errou. Só entram respostas em que o engano foi classificado.</p>`:'<p>Nenhum engano classificado neste período.</p>';
  const tDes=A.desaf.length?A.desaf.map(r=>`<div class="rq"><small><b>${esc(r.nome)}</b> · Nível ${esc(r.nivel)} · acertos ${r.ac} de ${r.tot}${r.turma?' · '+esc(r.turma):''} · ${esc(r.data)}</small><p><b>${esc(r.enun)}</b></p><p>Resposta: ${esc(r.certa)}</p>${maisEscolhida(r)?`<p>${maisEscolhida(r)}</p>`:''}${r.expl?`<p class="rn">${esc(r.expl)}</p>`:''}</div>`).join(''):'<p>Todas as questões foram acertadas por todos.</p>';
  return `<header class="rh"><h1 id="arRelT" tabindex="-1">${esc(titulo)}</h1><p>${esc(rotulo)}</p></header>${kp}
  <h2>Acerto por assunto</h2>${tMod}
  <h2>Erros mais comuns e o que retomar</h2>${tErr}
  <h2>Questões que mais desafiaram</h2>${tDes}
  <h2>Sugestões para a próxima aula</h2>${S.length?`<ul class="rl">${S.map(t=>`<li>${t}</li>`).join('')}</ul>`:'<p>Ainda não há dados suficientes para sugerir um caminho. Com 2 ou mais questões por assunto, as sugestões aparecem.</p>'}
  <p class="rn">Sugestões baseadas no acerto da turma e na ordem de pré-requisitos dos assuntos. Complementam o olhar do professor, não o substituem.</p>
  <h2>Observações do professor</h2><div class="ro" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Observações do professor"></div>
  <p class="rn">Dados guardados só neste aparelho e neste navegador. A Arena usa apelidos e equipes, sem dados pessoais.</p>`;
}

/* ---------- janela do relatório ---------- */
const CSS=`#arRel{position:fixed;inset:0;z-index:9999;background:rgba(2,8,23,.78);overflow:auto;padding:1rem}
#arRel .rc{max-width:62rem;margin:0 auto;background:var(--card,#fff);color:var(--tx,#111);border:1px solid var(--bd,#999);border-radius:18px;padding:1.3rem;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#arRel .rbar{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:flex-end;margin-bottom:.8rem}
#arRel h1{font-size:1.5rem;margin:0 0 .2rem;color:var(--gold2,#8a5a00)}#arRel h2{font-size:1.1rem;margin:1.3rem 0 .5rem;color:var(--gold2,#8a5a00)}
#arRel .rk{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.7rem;margin:.9rem 0}
#arRel .rk div{border:1px solid var(--bd,#999);border-radius:12px;padding:.7rem;text-align:center}#arRel .rk b{display:block;font-size:1.6rem}#arRel .rk span{font-size:.85rem;color:var(--mu,#444)}
#arRel table{width:100%;border-collapse:collapse;font-size:.92rem}#arRel th,#arRel td{padding:.5rem;border-bottom:1px solid var(--bd,#999);text-align:left;vertical-align:top}#arRel th{color:var(--gold2,#8a5a00)}#arRel .n{text-align:right;white-space:nowrap}
#arRel .rb{display:block;height:11px;border:1px solid var(--mu,#666);border-radius:6px;overflow:hidden}#arRel .rb i{display:block;height:100%;background:var(--gold,#e09000)}
#arRel .rq{border:1px solid var(--bd,#999);border-radius:12px;padding:.7rem;margin:.5rem 0}#arRel .rq p{margin:.3rem 0}
#arRel .rn{font-size:.82rem;color:var(--mu,#444);margin:.4rem 0}#arRel .rl{padding-left:1.2rem}#arRel .rl li{margin:.35rem 0}
#arRel .ro{min-height:5rem;border:1px dashed var(--mu,#666);border-radius:10px;padding:.6rem}
@media print{body.arrel-open>*:not(#arRel){display:none!important}#arRel{position:static!important;background:#fff!important;padding:0!important;overflow:visible!important}
#arRel .rc{box-shadow:none!important;border:0!important;background:#fff!important;color:#000!important;max-width:none!important;padding:0!important}#arRel .rbar{display:none!important}
#arRel h1,#arRel h2,#arRel th{color:#0b2a52!important}#arRel td,#arRel th{border-bottom:1px solid #999!important;color:#000!important}#arRel .rb i{background:#555!important}#arRel .rk div,#arRel .rq{break-inside:avoid;border-color:#999!important}#arRel .rn,#arRel .rk span{color:#333!important}}`;
let focoAnt=null;
function fechar(){const m=$('arRel');if(m)m.remove();document.body.classList.remove('arrel-open');document.removeEventListener('keydown',tecla);if(focoAnt&&focoAnt.focus)focoAnt.focus()}
function tecla(e){if(e.key==='Escape')fechar()}
function csv(ss){
  const c=v=>{v=String(v==null?'':v).replace(/\r?\n/g,' ');return /[;"]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const L=[['data','turma','modo','assunto','nivel','enunciado','respostas_certas','participantes','percentual'].join(';')];
  ss.forEach(s=>s.rod.forEach(r=>L.push([s.data,s.turma,s.modo==='celulares'?'celulares':'local',r.nome,r.nivel,r.enun,r.ac,r.tot,r.tot?Math.round(100*r.ac/r.tot):''].map(c).join(';'))));
  L.push('');L.push(['assunto','engano_tipico','vezes'].join(';'));
  agregar(ss).erros.forEach(e=>L.push([e.nome,e.tag,e.n].map(c).join(';')));
  return '﻿'+L.join('\r\n');
}
function baixar(ss){
  try{const d=new Date(),p=n=>String(n).padStart(2,'0'),b=new Blob([csv(ss)],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download=`mathlab-arena-relatorio-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}catch(e){alert('Não consegui gerar o arquivo.')}
}
function abrir(ss,titulo,rotulo){
  if(!ss.length){alert('Ainda não há partidas salvas para este relatório.');return}
  fechar();focoAnt=document.activeElement;
  if(!$('arRelCss')){const st=document.createElement('style');st.id='arRelCss';st.textContent=CSS;document.head.appendChild(st)}
  const m=document.createElement('div');m.id='arRel';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','arRelT');
  m.innerHTML=`<div class="rc"><div class="rbar"><button class="ar-go peq" type="button" id="arRelPrint">Imprimir ou salvar em PDF</button><button class="ar-btn sec peq" type="button" id="arRelCsv">Baixar planilha (CSV)</button><button class="ar-btn sec peq" type="button" id="arRelFecha">Fechar</button></div>${htmlRelatorio(ss,titulo,rotulo)}</div>`;
  document.body.appendChild(m);document.body.classList.add('arrel-open');
  $('arRelPrint').onclick=()=>window.print();$('arRelCsv').onclick=()=>baixar(ss);$('arRelFecha').onclick=fechar;
  document.addEventListener('keydown',tecla);const t=$('arRelT');if(t)t.focus();
}
const rotuloSess=ss=>{const t=[...new Set(ss.map(s=>s.turma).filter(Boolean))];return (t.length?'Turma: '+t.join(', ')+' · ':'')+(ss.length===1?ss[0].data:ss.length+' partidas, de '+ss[0].data+' a '+ss[ss.length-1].data)};

/* ---------- encaixe nas telas da Arena ---------- */
function noPodio(){
  const t=$('arT');if(!t||t.textContent.trim()!=='Pódio da partida'||$('arRelPod'))return;
  const s=capturar();if(!s)return;
  const h2=document.querySelector('#arMain h2');if(!h2)return;
  const box=document.createElement('div');box.id='arRelPod';box.className='ar-lin no-print';box.style.cssText='align-items:flex-end;flex-wrap:wrap;gap:.7rem;margin:.6rem 0';
  box.innerHTML=`<label class="ar-fld" style="flex:1;min-width:12rem">Turma (opcional, ajuda no relatório acumulado)<input type="text" id="arRelTurma" maxlength="30" value="${esc(s.turma||turmaSalva())}" placeholder="Ex.: 1º A noturno"></label><button class="ar-go peq" type="button" id="arRelUma">Relatório pedagógico desta partida</button>`;
  h2.parentNode.insertBefore(box,h2);
  $('arRelTurma').addEventListener('change',e=>{atualizarTurma(s.id,e.target.value.trim())});
  $('arRelUma').onclick=()=>{atualizarTurma(s.id,$('arRelTurma').value.trim());const a=carregar().find(x=>x.id===s.id)||s;abrir([a],'Relatório pedagógico da partida',rotuloSess([a]))};
}
function naConfig(){
  const t=$('arT');if(!t||t.textContent.trim()!=='Arena MathLab'||$('arRelBox'))return;
  const a=carregar();if(!a.length)return;
  const main=$('arMain'),sec=document.createElement('section');sec.className='ar-box';sec.id='arRelBox';sec.setAttribute('aria-labelledby','hRel');
  const turmas=[...new Set(a.map(s=>s.turma||'').filter(x=>x))];
  const lista=sel=>{const ss=sel?a.filter(s=>s.turma===sel):a;return ss};
  sec.innerHTML=`<div class="ar-lin" style="justify-content:space-between"><h2 id="hRel">Relatório pedagógico acumulado</h2><button class="ar-btn sec peq" type="button" id="arRelLimpa">Apagar relatórios salvos</button></div>
   <p class="ar-dica">${a.length} ${a.length===1?'partida salva':'partidas salvas'} neste aparelho. O relatório junta os erros mais comuns e mostra o que retomar em sala.</p>
   <div class="ar-lin" style="align-items:flex-end;flex-wrap:wrap;gap:.7rem">${turmas.length?`<label class="ar-fld">Turma<select id="arRelSel"><option value="">Todas as partidas</option>${turmas.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`:''}<button class="ar-go peq" type="button" id="arRelAbre">Abrir relatório acumulado</button><button class="ar-btn sec peq" type="button" id="arRelBaixa">Baixar planilha (CSV)</button></div>`;
  const ant=$('hH');const ref=ant?ant.closest('section'):null;
  if(ref&&ref.parentNode===main)ref.insertAdjacentElement('afterend',sec);else main.appendChild(sec);
  const sel=()=>{const e=$('arRelSel');return e?e.value:''};
  $('arRelAbre').onclick=()=>{const ss=lista(sel());abrir(ss,'Relatório pedagógico acumulado da Arena',rotuloSess(ss))};
  $('arRelBaixa').onclick=()=>{const ss=lista(sel());if(ss.length)baixar(ss)};
  $('arRelLimpa').onclick=()=>{if(confirm('Apagar todos os relatórios pedagógicos salvos neste aparelho? Isso não afeta o histórico de partidas.')){try{localStorage.removeItem(KEY)}catch(_){}sec.remove()}};
}
let tmr=null;
function ajustar(){try{noPodio();naConfig()}catch(e){try{console.warn('arena-relatorio',e)}catch(_){}}}
function iniciar(){
  const m=$('arMain');if(!m)return;
  new MutationObserver(()=>{clearTimeout(tmr);tmr=setTimeout(ajustar,60)}).observe(m,{childList:true});
  ajustar();
}
window.ArenaRel={agregar,registro,htmlRelatorio,carregar,abrir,csv,capturar};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
