/* Arena MathLab, modo celulares (professor). Arquivo separado: se faltar ou falhar, a Arena local segue igual.
   Usa ArenaLive (Firebase) e os ganchos mínimos expostos por arena.js (window.__arenaInt).
   © 2026 Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate). Todos os direitos reservados. */
(()=>{
'use strict';
const K='mathlab-arena-live',PK='mathlab-arena-live-pref';
let LV=null;
const $=id=>document.getElementById(id);
const I=()=>window.__arenaInt;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
const live=()=>window.ArenaLive;

/* ===== CSS DO MODO CELULARES ===== */
(function(){
  const s=document.createElement('style');s.id='lvCss';
  s.textContent=`
.lv-box{border-left:6px solid var(--gold)}
.lv-topo{display:grid;grid-template-columns:minmax(0,1fr);gap:1rem}
@media(min-width:900px){.lv-topo{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}
.lv-entrar{display:flex;flex-direction:column;gap:.6rem;align-items:center;text-align:center;padding:1rem;border:1px solid var(--bd);border-radius:16px;background:var(--bg)}
.lv-cod{font-size:clamp(2.6rem,9vw,5.2rem);font-weight:900;letter-spacing:.14em;color:var(--gold2);font-variant-numeric:tabular-nums;line-height:1}
.lv-url{font-size:clamp(1rem,2.4vw,1.4rem);font-weight:800;word-break:break-all}
.lv-qr{background:#fff;border-radius:14px;padding:.5rem;line-height:0}
.lv-qr svg{width:min(60vw,260px);height:auto}
.lv-lista{list-style:none;display:flex;gap:.45rem;flex-wrap:wrap;max-height:18rem;overflow:auto;padding:.2rem}
.lv-chip{display:inline-flex;align-items:center;gap:.35rem;border:1px solid var(--bd);border-radius:999px;padding:.25rem .3rem .25rem .8rem;background:var(--bg);font-weight:700}
.lv-chip.off{opacity:.55}
.lv-chip button{background:none;border:0;color:var(--tx);cursor:pointer;font-size:1.15rem;line-height:1;padding:0 .35rem}
.lv-num{font-size:1.1rem}
.lv-aviso{border:1px solid var(--gold);border-radius:12px;padding:.6rem .8rem;background:var(--glow);font-size:.9rem}
.lv-conn{font-size:.85rem;color:var(--mu)}.lv-conn.ruim{color:#ffb4b4;font-weight:800}
.lv-prog{display:flex;flex-direction:column;gap:.35rem}
.lv-barra{height:14px;border-radius:99px;background:var(--bg);border:1px solid var(--bd);overflow:hidden}
.lv-barra i{display:block;height:100%;background:var(--gold);width:0;transition:width .25s}
.lv-dist{display:flex;flex-direction:column;gap:.45rem;margin:.4rem 0}
.lv-d{display:grid;grid-template-columns:2rem 1fr 3rem;align-items:center;gap:.6rem}
.lv-d .l{font-weight:900;text-align:center}
.lv-d .b{height:22px;border-radius:8px;background:var(--bg);border:1px solid var(--bd);overflow:hidden}
.lv-d .b i{display:block;height:100%;background:var(--mu);opacity:.7}
.lv-d.ok .b i{background:var(--ok);opacity:1}.lv-d.ok .l{color:var(--ok)}
.lv-d b{text-align:right;font-variant-numeric:tabular-nums}
.lv-retomar{border:2px dashed var(--gold);border-radius:14px;padding:.8rem 1rem;display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;justify-content:space-between;margin-bottom:1rem}
`;
  document.head.appendChild(s);
})();

/* ===== PREFERÊNCIA (só do modo celulares) ===== */
const pref=()=>{try{return JSON.parse(localStorage.getItem(PK)||'{}')||{}}catch(_){return{}}};
const salvarPref=p=>{try{localStorage.setItem(PK,JSON.stringify(p))}catch(_){}};

/* ===== SESSÃO (para voltar depois de recarregar a página) ===== */
function salvar(){
  if(!LV||!LV.cod)return;
  try{sessionStorage.setItem(K,JSON.stringify({cod:LV.cod,cfg:LV.cfg,fase:LV.fase,qi:LV.qi,inicioEm:LV.inicioEm,
    qs:(LV.qs||[]).map(x=>({id:x.mod.id,nivel:x.nivel,q:x.q})),placar:LV.placar,rodadas:LV.rodadas,erros:LV.erros,ultRes:LV.ultRes,dist:LV.dist,
    sel:[...I().E.sel],nivel:I().E.nivel}))}catch(_){}
}
const lerSessao=()=>{try{return JSON.parse(sessionStorage.getItem(K)||'null')}catch(_){return null}};
const limparSessao=()=>{try{sessionStorage.removeItem(K)}catch(_){}};

/* ===== SEÇÃO NA TELA DE CONFIGURAÇÃO ===== */
function inserirSecao(){
  const E=I().E;if(!live()||$('lvSec'))return;
  const ref=document.querySelector('.ar-inicio');if(!ref)return;
  const p=pref(),bonus=p.bonus!==false;
  const s=lerSessao(),ret=s&&s.cod&&s.fase;
  const sec=document.createElement('section');sec.className='ar-box lv-box';sec.id='lvSec';sec.setAttribute('aria-labelledby','hLv');
  sec.innerHTML=`<h2 id="hLv">Jogar com celulares, em tempo real</h2>
    <p class="ar-dica">Cada aluno entra pelo celular com um código ou QR Code, escolhe um apelido e responde. Você conduz pelo projetor. Usa os assuntos, o nível, as questões e o tempo escolhidos acima. Precisa de internet. Se a rede da escola bloquear, use o modo local.</p>
    ${ret?`<div class="lv-retomar"><span>Há uma sala aberta neste navegador (código <b>${esc(s.cod)}</b>).</span><span class="ar-lin"><button class="ar-go peq" type="button" onclick="ArenaHost.retomar()">Voltar para a sala</button><button class="ar-btn sec peq" type="button" onclick="ArenaHost.descartar()">Fechar essa sala</button></span></div>`:''}
    <label class="ar-chk"><input type="checkbox" id="lvBonus" ${bonus&&E.tempo>0?'checked':''} ${E.tempo===0?'disabled':''} onchange="ArenaHost.pref()"><span><b>Bônus de rapidez</b> (até 25 pontos). O tempo é medido pelo relógio do servidor, do instante em que a questão aparece até a resposta chegar.</span></label>
    <div class="ar-lin"><button class="ar-go" type="button" onclick="ArenaHost.abrir()">Abrir sala para celulares</button></div>`;
  ref.parentNode.insertBefore(sec,ref.nextSibling);
}
document.addEventListener('arena:config',inserirSecao);

/* ===== UTILITÁRIOS DO JOGO ===== */
function jogadores(){
  const j=(LV&&LV.sala&&LV.sala.jogadores)||{};
  const a=Object.keys(j).map(u=>({uid:u,apelido:String(j[u].apelido||'?'),online:j[u].online!==false}));
  a.sort((x,y)=>x.apelido.toLowerCase().localeCompare(y.apelido.toLowerCase(),'pt')||x.uid.localeCompare(y.uid));
  const cont={};a.forEach(p=>{const k=p.apelido.toLowerCase();cont[k]=(cont[k]||0)+1;p.nome=cont[k]>1?`${p.apelido} (${cont[k]})`:p.apelido});
  return a;
}
function urlAluno(){
  let u;try{u=new URL('aluno.html',location.href)}catch(_){u={href:'aluno.html'}}
  u.search='';u.hash='';return u.href;
}
const urlComCodigo=()=>urlAluno()+'?c='+LV.cod;
const urlCurta=()=>urlAluno().replace(/^https?:\/\//,'').replace(/\/$/,'');
function erroTela(msg,detalhe,botoes){
  clearInterval(LV&&LV.timer);
  $('arMain').innerHTML=`<section class="ar-box" aria-labelledby="arT"><h2 id="arT" tabindex="-1">${esc(msg)}</h2>${detalhe?`<p>${esc(detalhe)}</p>`:''}
    <div class="ar-lin">${botoes||`<button class="ar-go" type="button" onclick="ArenaHost.voltar()">Voltar</button>`}</div></section>`;
  const t=$('arT');if(t)t.focus();
}

/* ===== ABRIR A SALA ===== */
async function abrir(){
  const II=I(),E=II.E;
  if(!live()){alert('A camada em tempo real não carregou. Atualize a página.');return}
  if(!E.sel.size){alert('Marque pelo menos um assunto para a partida.');return}
  const b=$('lvBonus');const bonus=!!(b&&b.checked&&E.tempo>0);
  salvarPref({bonus:b?b.checked:pref().bonus!==false});
  LV={cod:null,cfg:{total:E.total,tempo:E.tempo,bonus},sala:null,fase:'conectando',qi:0,qs:[],placar:{},rodadas:[],erros:{},dist:[],ultRes:null,timer:null,conectado:true};
  $('arMain').innerHTML=`<section class="ar-box" aria-live="polite"><h2 id="arT" tabindex="-1">Abrindo a sala</h2><p>Conectando ao servidor. Só um instante.</p></section>`;
  try{
    LV.cod=await live().prof.criarSala(LV.cfg);
  }catch(e){
    LV=null;
    erroTela('Não consegui abrir a sala',e&&e.message,`<button class="ar-go" type="button" onclick="ArenaHost.abrir()">Tentar de novo</button><button class="ar-btn sec" type="button" onclick="ArenaHost.voltar()">Voltar e usar o modo local</button>`);
    return;
  }
  LV.fase='lobby';ligar();salvar();
  window.onbeforeunload=e=>{e.preventDefault();e.returnValue=''};
  telaLobby();
}
function ligar(){
  live().prof.ouvirSala((s,err)=>{
    if(!LV)return;
    if(err){LV.erroLeitura=err;return}
    if(s===null){
      if(LV.encerrando||LV.fase==='conectando')return;
      LV.ficouNula=(LV.ficouNula||0)+1;
      if(LV.ficouNula>=1&&LV.sala){erroTela('A sala deixou de existir','Ela pode ter sido apagada no console do Firebase. Volte e abra uma nova.',null)}
      return;
    }
    LV.sala=s;
    if(LV.fase==='lobby')atualizarLobby();
    else if(LV.fase==='questao')atualizarProgresso();
  });
  live().prof.ouvirConexao(ok=>{
    if(!LV)return;LV.conectado=ok;
    const c=$('lvConn');if(c){c.textContent=ok?'Conexão com o servidor: ativa.':'Conexão com o servidor perdida. Tentando voltar sozinha. Os alunos continuam na sala.';c.classList.toggle('ruim',!ok)}
  });
}

/* ===== LOBBY ===== */
function telaLobby(){
  const II=I(),E=II.E;
  const cod=LV.cod,cod3=cod.slice(0,3)+' '+cod.slice(3);
  $('arMain').innerHTML=`<section class="ar-box" aria-labelledby="arT"><div class="ar-lin" style="justify-content:space-between"><h1 id="arT" tabindex="-1">Sala aberta</h1>
    <div class="ar-lin"><span class="ar-pill"><b>${LV.cfg.total}</b> questões</span><span class="ar-pill">${LV.cfg.tempo?LV.cfg.tempo+' segundos':'Sem limite de tempo'}</span><span class="ar-pill" id="lvBonusPill">${LV.cfg.bonus?'Com bônus de rapidez':'Sem bônus de rapidez'}</span></div></div>
    <div class="lv-topo">
      <div class="lv-entrar"><p>No celular, abra</p><p class="lv-url">${esc(urlCurta())}</p><p>e digite o código</p>
        <p class="lv-cod" aria-label="Código da sala: ${cod.split('').join(' ')}">${cod3}</p>
        <div class="lv-qr">${window.ArenaQR?window.ArenaQR.svg(urlComCodigo(),260):''}</div><p class="ar-dica">Ou aponte a câmera para o QR Code.</p></div>
      <div class="ar-lin" style="flex-direction:column;align-items:stretch;gap:.7rem">
        <h2 id="lvH2" class="lv-num">Alunos na sala: <b id="lvN">0</b></h2>
        <div role="status" aria-live="polite" class="sr-only" id="lvSr"></div>
        <ul class="lv-lista" id="lvLista" aria-label="Alunos na sala"></ul>
        <div id="lvAviso"></div>
        <p class="lv-conn" id="lvConn">Conexão com o servidor: ativa.</p>
      </div></div>
    <div class="ar-lin" style="justify-content:space-between">
      <label class="ar-chk" style="grid-column:auto"><input type="checkbox" id="lvBonusC" ${LV.cfg.bonus?'checked':''} ${LV.cfg.tempo===0?'disabled':''} onchange="ArenaHost.bonus()"><span><b>Bônus de rapidez</b></span></label>
      <div class="ar-lin"><button class="ar-btn sec" type="button" onclick="ArenaHost.cancelar()">Cancelar sala</button><button class="ar-go" type="button" id="lvIni" onclick="ArenaHost.comecar()" disabled>Começar partida</button></div></div>
    <p class="ar-dica">Quando você começar, a sala fecha para novos alunos. Quem cair da internet volta sozinho com o mesmo apelido. Os alunos só veem a questão e as alternativas no celular. Figuras aparecem no projetor.</p></section>`;
  atualizarLobby();
  const t=$('arT');if(t)t.focus();
}
function atualizarLobby(){
  const l=$('lvLista');if(!l||!LV)return;
  const js=jogadores();
  const antes=LV.nAnt||0;
  l.innerHTML=js.map(p=>`<li class="lv-chip ${p.online?'':'off'}"><span>${esc(p.nome)}</span><button type="button" aria-label="Remover ${esc(p.nome)} da sala" onclick="ArenaHost.expulsar('${esc(p.uid)}')">&times;</button></li>`).join('');
  const n=$('lvN');if(n)n.textContent=String(js.length);
  const b=$('lvIni');if(b)b.disabled=js.length===0;
  const av=$('lvAviso');
  if(av)av.innerHTML=js.length>=70?`<p class="lv-aviso">Atenção: o plano gratuito do Firebase aceita 100 conexões ao mesmo tempo, somando todas as salas. Você está perto do limite.</p>`:'';
  if(js.length!==antes){const sr=$('lvSr');if(sr)sr.textContent=`${js.length} ${js.length===1?'aluno':'alunos'} na sala.`;LV.nAnt=js.length}
}
async function expulsar(uid){
  const j=jogadores().find(p=>p.uid===uid);
  try{await live().prof.removerJogador(uid)}catch(e){alert(e.message)}
  if(j)I().anunciar(`${j.nome} removido.`);
}
async function mudarBonus(){
  const c=$('lvBonusC');if(!c||!LV)return;
  const v=c.checked&&LV.cfg.tempo>0;
  try{await live().prof.mudarCfg({bonus:v});LV.cfg.bonus=v;const p=$('lvBonusPill');if(p)p.textContent=v?'Com bônus de rapidez':'Sem bônus de rapidez';salvar()}
  catch(e){c.checked=LV.cfg.bonus;alert(e.message)}
}
async function cancelar(){
  if(!LV)return;
  if(!confirm('Cancelar a sala? Os alunos que já entraram serão desconectados.'))return;
  await encerrar(true);
}
async function encerrar(voltarConfig){
  if(LV){LV.encerrando=true;clearInterval(LV.timer)}
  try{await live().prof.encerrarSala()}catch(_){}
  limparSessao();LV=null;window.onbeforeunload=null;
  const E=I().E;E.ativa=false;
  if(voltarConfig)I().telaConfig();
}

/* ===== PARTIDA ===== */
async function comecar(){
  const II=I(),E=II.E;
  if(!LV||LV.fase!=='lobby')return;
  if(jogadores().length===0)return;
  const b=$('lvIni');if(b)b.disabled=true;
  const qs=II.montar();
  if(!qs||!qs.length){alert('Não foi possível sortear questões com os assuntos marcados.');if(b)b.disabled=false;return}
  LV.qs=qs;E.qs=qs;E.qi=0;E.ativa=true;E.revelada=false;E.placar=[];E.erros={};
  if(qs.length!==LV.cfg.total){try{await live().prof.mudarCfg({total:qs.length});LV.cfg.total=qs.length}catch(_){}}
  LV.placar={};jogadores().forEach(p=>{LV.placar[p.uid]={apelido:p.apelido,pts:0,acertos:0,seq:0,maxSeq:0,somaTempo:0}});
  LV.rodadas=[];LV.erros={};LV.dist=[];
  await rodada(0);
}
async function rodada(qi){
  const II=I(),E=II.E;
  clearInterval(LV.timer);
  LV.qi=qi;E.qi=qi;E.revelada=false;LV.fase='questao';LV.revelando=false;LV.ultRes=null;
  const it=LV.qs[qi];
  try{
    LV.inicioEm=await live().prof.publicarQuestao({qi,mod:it.mod.nome,ic:it.mod.ic,nivel:it.nivel,eixo:it.mod.eixo,q:it.q.q,o:it.q.o,fig:II.temFigura(it),tempoSeg:LV.cfg.tempo});
  }catch(e){
    erroTela('Não consegui enviar a questão aos celulares',e&&e.message,`<button class="ar-go" type="button" onclick="ArenaHost.rodada(${qi})">Tentar de novo</button>`);return;
  }
  salvar();telaQuestao();iniciarRelogio();
}
function relogioTick(){
  if(!LV||LV.fase!=='questao')return;
  const T=LV.cfg.tempo;if(!T)return;
  const dec=Math.max(0,(live().agora()-LV.inicioEm)/1000),rest=Math.max(0,Math.ceil(T-dec));
  const n=$('arTn'),c=$('arAnel');
  if(n){n.textContent=rest;n.parentNode.classList.toggle('urg',rest<=5&&rest>0)}
  if(c)c.style.strokeDashoffset=String(170*Math.min(1,dec/T));
  if(rest<=0&&!LV.fimAvisado){LV.fimAvisado=true;clearInterval(LV.timer);I().som('fim');const s=$('arStatus');if(s)s.textContent='Tempo esgotado. Revele quando quiser.';I().anunciar('Tempo esgotado.')}
}
function iniciarRelogio(){LV.fimAvisado=false;clearInterval(LV.timer);if(LV.cfg.tempo>0){relogioTick();LV.timer=setInterval(relogioTick,200)}}
function contarRespostas(){
  const r=(LV.sala&&LV.sala.respostas)||{},j=(LV.sala&&LV.sala.jogadores)||{};
  return {n:Object.keys(r).filter(u=>j[u]).length,total:Object.keys(j).length};
}
function atualizarProgresso(){
  const {n,total}=contarRespostas();
  const t=$('lvCont'),b=$('lvBarra');
  if(t)t.textContent=`${n} de ${total} responderam`;
  if(b)b.style.width=(total?Math.round(100*n/total):0)+'%';
  const s=$('arStatus');
  if(s&&!LV.fimAvisado&&!LV.revelando){
    const todos=total>0&&n>=total;
    if(todos&&!LV.todosAvisado){LV.todosAvisado=true;s.textContent='Todos responderam. Pode revelar.';I().anunciar('Todos responderam.')}
  }
}
function telaQuestao(){
  const II=I(),E=II.E,L=II.L,it=LV.qs[LV.qi],q=it.q,fig=II.temFigura(it),T=LV.cfg.tempo;
  LV.todosAvisado=false;
  $('arMain').innerHTML=`<section class="ar-rodada" style="--ax:${II.corEixo(it.mod)}" aria-labelledby="arEnun">
    <div class="ar-top"><div class="ar-info"><span class="ar-pill"><b>Questão ${LV.qi+1}</b> de ${LV.qs.length}</span><span class="ar-pill eixo"><span aria-hidden="true">${it.mod.ic}</span> ${esc(it.mod.nome)} · Nível ${it.nivel}</span><span class="ar-pill">Sala <b>${esc(LV.cod)}</b></span></div>
      <div class="ar-lin"><button class="ar-btn sec peq" type="button" onclick="ArenaUI.ler()" aria-label="Ler a questão em voz alta">Ler em voz alta</button>
      <div class="ar-timer ${T?'':'sem'}" role="timer" aria-label="Tempo da questão"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" class="tr"/><circle id="arAnel" cx="32" cy="32" r="27" class="tp" style="stroke-dasharray:170;stroke-dashoffset:0"/></svg><span id="arTn">${T>0?T:'∞'}</span></div></div></div>
    <div class="ar-grid ${fig?'com-fig':''}">
      ${fig?`<div class="ar-fig"><canvas id="arCv" role="img" aria-label="Figura da questão, sem a resposta"></canvas></div>`:''}
      <div class="ar-qc"><h2 id="arEnun" class="ar-enun" tabindex="-1">${esc(q.q)}</h2>
        <div class="ar-ops" role="list" aria-label="Alternativas">${q.o.map((o,i)=>`<div class="ar-op" data-i="${i}" role="listitem"><span class="ar-l">${L[i]}</span><span>${esc(o)}</span></div>`).join('')}</div></div></div>
    <div class="lv-prog"><b id="lvCont">0 de ${Object.keys((LV.sala&&LV.sala.jogadores)||{}).length} responderam</b><div class="lv-barra" aria-hidden="true"><i id="lvBarra"></i></div></div>
    <p class="lv-conn" id="lvConn">${LV.conectado?'Conexão com o servidor: ativa.':'Conexão com o servidor perdida. Tentando voltar sozinha.'}</p>
    <div class="ar-acoes"><p id="arStatus" class="ar-status" aria-live="off">Os alunos estão respondendo no celular. Revele quando quiser.</p>
      <button class="ar-go" type="button" id="arRev" onclick="ArenaHost.revelar()">Revelar resposta e pontuar</button></div>
    <div id="arResultado"></div></section>`;
  II.desenharFigura();
  const h=$('arEnun');if(h)h.focus({preventScroll:true});
  II.anunciar(`Questão ${LV.qi+1} de ${LV.qs.length}. ${it.mod.nome}.`);
  atualizarProgresso();
}

/* ===== REVELAR E PONTUAR ===== */
function calcular(it,resp,jogs){
  const II=I(),core=window.ArenaCore,q=it.q,T=LV.cfg.tempo,bonus=LV.cfg.bonus&&T>0;
  const dist=[0,0,0,0];let sem=0,acertos=0;const ganhos={};
  jogs.forEach(p=>{
    const pl=LV.placar[p.uid]||(LV.placar[p.uid]={apelido:p.apelido,pts:0,acertos:0,seq:0,maxSeq:0,somaTempo:0});
    pl.apelido=p.apelido;
    const r=resp[p.uid];
    const valida=r&&r.qi===LV.qi&&Number.isInteger(r.op)&&r.op>=0&&r.op<4;
    if(!valida){sem++;pl.seq=0;ganhos[p.uid]=0;return}
    dist[r.op]++;
    let t=(Number(r.t)-LV.inicioEm)/1000;if(!Number.isFinite(t))t=T||30;
    t=Math.max(.2,T>0?Math.min(T,t):t);
    if(r.op===q.c){
      acertos++;pl.acertos++;pl.seq++;pl.maxSeq=Math.max(pl.maxSeq,pl.seq);pl.somaTempo=Math.round((pl.somaTempo+t)*100)/100;
      const s=core.pontuar(pl.seq,t,T,bonus);pl.pts+=s.total;ganhos[p.uid]=s.total;
    }else{
      pl.seq=0;ganhos[p.uid]=0;
      if(q.tg&&q.tg[r.op]){const k=`${it.mod.nome}: ${q.tg[r.op]}`;LV.erros[k]=(LV.erros[k]||0)+1}
    }
  });
  return {dist,sem,acertos,ganhos};
}
function rankPlacar(){
  const arr=Object.keys(LV.placar).map(u=>Object.assign({uid:u},LV.placar[u]));
  return window.ArenaCore.classificar(arr,LV.cfg.bonus&&LV.cfg.tempo>0);
}
async function revelar(){
  if(!LV||LV.fase!=='questao'||LV.revelando)return;
  const II=I(),E=II.E;
  LV.revelando=true;clearInterval(LV.timer);E.revelada=true;
  const b=$('arRev');if(b)b.disabled=true;
  const s=$('arStatus');if(s)s.textContent='Fechando as respostas e contando.';
  try{await live().prof.fecharRespostas()}catch(e){LV.revelando=false;E.revelada=false;if(b)b.disabled=false;alert(e.message);return}
  await pausa(700);                         // respostas que ainda estavam a caminho
  const it=LV.qs[LV.qi],q=it.q;
  let jogs=jogadores();
  const copiaPlacar=JSON.stringify(LV.placar);
  const resp=(LV.sala&&LV.sala.respostas)||{};
  const res=calcular(it,resp,jogs);
  const ult=LV.qi+1>=LV.qs.length;
  let rk=rankPlacar();
  const montarEscrita=lista=>{const w={};lista.forEach(p=>{const pl=LV.placar[p.uid],r=rk.find(x=>x.uid===p.uid);w[p.uid]={pts:pl.pts,acertos:pl.acertos,seq:pl.seq,maxSeq:pl.maxSeq,somaTempo:Math.min(100000,Math.round(pl.somaTempo*10)/10),pos:Math.min(200,r?r.pos:1),ult}});return w};
  const rev={qi:LV.qi,correta:q.c,explicacao:q.e||''};
  try{
    await live().prof.publicarResultado(rev,montarEscrita(jogs),'resultado');
  }catch(e1){
    // um aluno pode ter sido removido durante a contagem: confere de novo e tenta uma vez
    try{
      jogs=jogadores();LV.placar=JSON.parse(copiaPlacar);const res2=calcular(it,(LV.sala&&LV.sala.respostas)||{},jogs);Object.assign(res,res2);rk=rankPlacar();
      await live().prof.publicarResultado(rev,montarEscrita(jogs),'resultado');
    }catch(e2){
      LV.placar=JSON.parse(copiaPlacar);LV.revelando=false;LV.fase='questao';E.revelada=false;
      erroTela('Não consegui publicar o resultado',e2&&e2.message,`<button class="ar-go" type="button" onclick="ArenaHost.rodadaAtual()">Voltar à questão</button>`);return;
    }
  }
  LV.fase='resultado';
  LV.rodadas.push({q,modNome:it.mod.nome,nivel:it.nivel,acertos:res.acertos,total:jogs.length,dist:res.dist});
  LV.dist.push(res.dist);
  LV.ultRes={dist:res.dist,sem:res.sem,acertos:res.acertos,total:jogs.length,ganhos:res.ganhos};
  salvar();
  II.som(res.acertos?'ok':'fim');
  mostrarResultado();
  II.desenharFigura();
}
function rodadaAtual(){telaQuestao();iniciarRelogio();const b=$('arRev');if(b)b.disabled=false}
function mostrarResultado(){
  const II=I(),L=II.L,it=LV.qs[LV.qi],q=it.q,R=LV.ultRes,rk=rankPlacar(),ult=LV.qi+1>=LV.qs.length;
  const mx=Math.max(1,...R.dist);
  document.querySelectorAll('.ar-op').forEach(el=>{
    const i=+el.dataset.i;el.classList.toggle('certa',i===q.c);el.classList.toggle('errada',i!==q.c);
    if(i===q.c&&!el.querySelector('.ar-sel')){const s=document.createElement('span');s.className='ar-sel';s.textContent='✔ Correta';el.appendChild(s)}
  });
  const rev=$('arRev');if(rev)rev.disabled=true;
  const topo=rk.slice(0,5);
  $('arResultado').innerHTML=`<div class="ar-res"><h3 tabindex="-1" id="arRH">Resposta correta: ${L[q.c]}, ${esc(q.o[q.c])}</h3>
    <p><b>Por quê:</b> ${esc(q.e||'')}</p>
    <p><b>${R.acertos} de ${R.total}</b> acertaram${R.sem?` · ${R.sem} sem resposta`:''}.</p>
    <div class="lv-dist" role="list" aria-label="Quantos escolheram cada alternativa">${[0,1,2,3].map(i=>`<div class="lv-d ${i===q.c?'ok':''}" role="listitem"><span class="l">${L[i]}</span><div class="b"><i style="width:${Math.round(100*R.dist[i]/mx)}%"></i></div><b>${R.dist[i]}</b></div>`).join('')}</div>
    <div class="ar-mini"><b>Placar:</b> ${topo.map(p=>`<span class="ar-ch">${p.pos}º ${esc(p.apelido)} · ${p.pts}${R.ganhos[p.uid]?` (+${R.ganhos[p.uid]})`:''}</span>`).join('')}${rk.length>5?`<span class="ar-ch">e mais ${rk.length-5}</span>`:''}</div>
    <div class="ar-lin" style="margin-top:.8rem"><button class="ar-go" type="button" id="arProx" onclick="ArenaHost.proxima()">${ult?'Ver o pódio':'Próxima questão'}</button></div></div>`;
  const pr=$('arProx');if(pr)pr.focus({preventScroll:false});
  const st=$('arStatus');if(st)st.textContent='Resposta revelada.';
  II.anunciar(`Resposta correta: ${L[q.c]}, ${q.o[q.c]}. ${R.acertos} de ${R.total} acertaram.`);
}
async function proxima(){
  if(!LV||LV.fase!=='resultado')return;
  if(LV.qi+1<LV.qs.length){window.scrollTo(0,0);await rodada(LV.qi+1)}else await podio();
}

/* ===== PÓDIO ===== */
async function podio(){
  const II=I(),E=II.E;
  clearInterval(LV.timer);
  try{await live().prof.mudarEstado('podio')}catch(_){}
  LV.fase='podio';E.ativa=false;salvar();
  const bonus=LV.cfg.bonus&&LV.cfg.tempo>0;
  const rk=rankPlacar(),topo=rk[0];
  try{const a=II.hist();a.push({data:new Date().toLocaleDateString('pt-BR'),questoes:LV.qs.length,vencedor:rk.filter(p=>p.pos===1).map(p=>p.apelido).join(' e ')||'sem participantes',pontos:topo?topo.pts:0});localStorage.setItem(II.HIST_KEY,JSON.stringify(a.slice(-30)))}catch(_){}
  const erros=Object.entries(LV.erros).sort((a,b)=>b[1]-a[1]);
  const dif=[...LV.rodadas].filter(r=>r.acertos<r.total).sort((a,b)=>a.acertos/a.total-b.acertos/b.total).slice(0,5);
  const cor=['var(--gold2)','#cbd5e1','#d89560'];
  II.som('podio');
  $('arMain').innerHTML=`<section class="ar-box" aria-labelledby="arT"><div class="ar-lin" style="justify-content:space-between"><h1 id="arT" tabindex="-1">Pódio da partida</h1>
    <div class="ar-lin no-print"><button class="ar-btn sec" type="button" onclick="window.print()">Imprimir ou salvar em PDF</button><button class="ar-go peq" type="button" onclick="ArenaHost.fechar()">Encerrar a sala</button></div></div>
    <p class="ar-dica no-print">Os alunos estão vendo a própria colocação no celular. Quando encerrar a sala, o código deixa de funcionar e os dados são apagados do servidor.</p>
    <div class="ar-podio">${rk.slice(0,3).map(p=>`<div class="ar-pc pos${p.pos}" style="--pc:${cor[Math.min(2,p.pos-1)]}"><div class="ar-m">${p.pos}º</div><h3>${esc(p.apelido)}${p.empate?' <small>(empate)</small>':''}</h3><div class="ar-pts">${p.pts} pontos</div><small>${p.acertos} de ${LV.qs.length} acertos${bonus&&p.acertos?' · tempo médio '+II.fmt1(window.ArenaCore.tempoMedio(p))+' s':''}</small></div>`).join('')}</div>
    <h2>Classificação completa</h2>
    <div class="ar-tbw"><table class="ar-tb"><thead><tr><th>Pos.</th><th>Aluno</th><th>Pontos</th><th>Acertos</th><th>Maior sequência</th>${bonus?'<th>Tempo médio</th>':''}</tr></thead><tbody>${rk.map(p=>`<tr><td><b>${p.pos}º</b></td><td>${esc(p.apelido)}</td><td><b>${p.pts}</b></td><td>${p.acertos} de ${LV.qs.length}</td><td>${p.maxSeq}</td>${bonus?`<td>${p.acertos?II.fmt1(window.ArenaCore.tempoMedio(p))+' s':'sem acertos'}</td>`:''}</tr>`).join('')}</tbody></table></div>
    <h2>Para a próxima aula: tipos de engano mais comuns</h2>
    ${erros.length?`<ul class="ar-lst">${erros.map(([t,n])=>`<li><b>${esc(t)}</b>, ${n} ${n===1?'vez':'vezes'}</li>`).join('')}</ul><p class="ar-dica">Os tipos vêm da classificação de erros do próprio MathLab. Eles descrevem o raciocínio, não quem errou.</p>`:'<p class="ar-dica">Nenhum engano classificado nesta partida.</p>'}
    <h2>Questões que mais desafiaram</h2>
    ${dif.length?dif.map(r=>`<div class="ar-rev"><small><b>${esc(r.modNome)}</b> · Nível ${r.nivel} · acertos ${r.acertos} de ${r.total} · escolhas A ${r.dist[0]}, B ${r.dist[1]}, C ${r.dist[2]}, D ${r.dist[3]}</small><p><b>${esc(r.q.q)}</b></p><p class="okt">Resposta: ${esc(r.q.o[r.q.c])}</p><p class="ar-dica">${esc(r.q.e||'')}</p></div>`).join(''):'<p class="okt">Todas as questões foram acertadas por todos.</p>'}
  </section>`;
  const t=$('arT');if(t)t.focus();
  II.anunciar('Partida encerrada. Pódio disponível.');window.scrollTo(0,0);
}
async function fechar(){
  if(!confirm('Encerrar a sala? Os alunos voltarão para a tela de entrada e os dados da sala serão apagados do servidor.'))return;
  await encerrar(true);
}

/* ===== RETOMAR DEPOIS DE RECARREGAR ===== */
async function retomar(){
  const II=I(),E=II.E,s=lerSessao();
  if(!s||!s.cod){descartar();return}
  $('arMain').innerHTML=`<section class="ar-box" aria-live="polite"><h2 id="arT" tabindex="-1">Voltando para a sala ${esc(s.cod)}</h2><p>Conectando ao servidor.</p></section>`;
  try{await live().prof.retomarSala(s.cod)}
  catch(e){
    limparSessao();
    erroTela('Não consegui voltar para essa sala',(e&&e.codigo==='sem-sala')?'Ela já foi encerrada ou apagada. Abra uma nova.':(e&&e.message),null);return;
  }
  const mods=II.MODS;
  const qs=(s.qs||[]).map(x=>({mod:mods.find(m=>m.id===x.id),nivel:x.nivel,q:x.q}));
  if(qs.some(x=>!x.mod)){limparSessao();erroTela('Não consegui restaurar as questões','O MathLab foi atualizado desde que a sala abriu. Abra uma nova sala.',null);return}
  LV={cod:s.cod,cfg:s.cfg,sala:null,fase:s.fase,qi:s.qi||0,qs,placar:s.placar||{},rodadas:s.rodadas||[],erros:s.erros||{},dist:s.dist||[],ultRes:s.ultRes||null,inicioEm:s.inicioEm,timer:null,conectado:true};
  E.qs=qs;E.qi=LV.qi;E.ativa=LV.fase!=='podio'&&LV.fase!=='lobby';E.revelada=LV.fase==='resultado';
  if(s.sel)E.sel=new Set(s.sel);
  ligar();window.onbeforeunload=e=>{e.preventDefault();e.returnValue=''};
  await new Promise(r=>{let n=0;const w=()=>{if(LV.sala||++n>30)r();else setTimeout(w,100)};w()});
  if(LV.fase==='lobby')telaLobby();
  else if(LV.fase==='questao'){telaQuestao();iniciarRelogio()}
  else if(LV.fase==='resultado'){telaQuestao();LV.fase='resultado';clearInterval(LV.timer);const b=$('arRev');if(b)b.disabled=true;if(LV.ultRes)mostrarResultado();II.desenharFigura()}
  else if(LV.fase==='podio')await podio();
  else telaLobby();
}
function descartar(){
  const s=lerSessao();
  limparSessao();
  if(s&&s.cod&&live()){
    (async()=>{try{await live().prof.retomarSala(s.cod);await live().prof.encerrarSala()}catch(_){}})();
  }
  I().telaConfig();
}
function voltar(){
  if(LV){LV.encerrando=true;clearInterval(LV.timer)}
  LV=null;window.onbeforeunload=null;I().E.ativa=false;I().telaConfig();
}
function prefChange(){const b=$('lvBonus');if(b)salvarPref({bonus:b.checked})}

window.ArenaHost={abrir,comecar,revelar,proxima,expulsar,bonus:mudarBonus,cancelar,fechar,retomar,descartar,voltar,rodada,rodadaAtual,pref:prefChange};
window.__arenaHostEstado=()=>LV;
})();
