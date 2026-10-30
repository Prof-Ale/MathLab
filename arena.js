/* Arena MathLab, modo local (projetor). Arquivo separado: se falhar, o MathLab continua intacto.
   Lê os geradores do index.html por uma ponte mínima (window.__mlArena). Não grava nada no progresso do aluno.
   © 2026 Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate). Todos os direitos reservados. */
(()=>{
'use strict';
/* ===== NÚCLEO PURO (testável) ===== */
const BASE=100,BONUS_MAX=25;
function pontuar(seq,tempoSeg,tempoTotal,bonusOn){
  // seq: sequência de acertos já contando este acerto
  let rap=0;
  if(bonusOn&&tempoTotal>0)rap=Math.round(BONUS_MAX*Math.max(0,Math.min(1,(tempoTotal-tempoSeg)/tempoTotal)));
  const bseq=seq>=5?60:seq>=3?30:0;
  return {base:BASE,rapidez:rap,sequencia:bseq,total:BASE+rap+bseq};
}
function tempoMedio(p){return p.acertos>0?p.somaTempo/p.acertos:Infinity}
function classificar(placar,bonusOn){
  const o=[...placar].sort((a,b)=>b.pts-a.pts||(bonusOn?tempoMedio(a)-tempoMedio(b):0)||b.acertos-a.acertos);
  let pos=0;
  return o.map((p,i)=>{
    const ant=o[i-1];
    const igual=ant&&ant.pts===p.pts&&ant.acertos===p.acertos&&(!bonusOn||tempoMedio(ant)===tempoMedio(p));
    if(!igual)pos=i+1;
    return Object.assign({},p,{pos,empate:false});
  }).map((p,i,a)=>{p.empate=a.some((x,j)=>j!==i&&x.pos===p.pos);return p});
}
function validarQuestao(q){
  return !!q&&typeof q==='object'&&typeof q.q==='string'&&q.q.length>0&&Array.isArray(q.o)&&q.o.length===4
    &&q.o.every(o=>typeof o==='string'&&o.length>0)&&new Set(q.o).size===4
    &&Number.isInteger(q.c)&&q.c>=0&&q.c<4;
}
window.ArenaCore={pontuar,classificar,validarQuestao,tempoMedio};

/* ===== UTIL ===== */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sh=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const L='ABCD';
const EIXO_N={'Números':1,'Álgebra':2,'Geometria':3,'Grandezas e Medidas':4,'Probabilidade e Estatística':5};
const EIXOS=Object.keys(EIXO_N);
const CORES=['#38bdf8','#f472b6','#2dd4bf','#f2b01e','#a78bfa','#fb923c','#4ade80','#f87171'];
const SIMB=['●','▲','■','◆','★','✚','⬟','⬢'];
const HIST_KEY='mathlab-arena-hist',PREF_KEY='mathlab-arena-pref';
const fmt1=n=>n.toFixed(1).replace('.',',');

/* ===== ESTADO ===== */
const E={
  parts:[{nome:'Equipe Alfa'},{nome:'Equipe Beta'}],
  sel:new Set(),ano:'todos',nivel:0,total:10,tempo:30,bonus:false,
  ativa:false,qs:[],qi:0,placar:[],resp:{},revelada:false,tInicio:0,tRestante:0,timer:null,
  erros:{},rodadas:[],somOn:true,fs:1
};
let PONTE=null,MODS=[],AC=null;

/* ===== PREFERÊNCIAS (só da Arena; lê o tema do app sem gravar nele) ===== */
function lerPref(){
  let p={};
  try{p=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{}}catch(_){}
  if(!p.tema){try{const s=JSON.parse(localStorage.getItem('mathlab')||'{}');if(s&&['light','contrast','dark'].includes(s.tema))p.tema=s.tema;if(s&&Number.isFinite(s.fs)&&!p.fs)p.fs=s.fs}catch(_){}}
  return p;
}
function salvarPref(){try{localStorage.setItem(PREF_KEY,JSON.stringify({tema:E.tema,fs:E.fs,som:E.somOn}))}catch(_){}}
function aplicarTema(m){
  E.tema=m;document.body.classList.remove('theme-light','theme-contrast');
  if(m==='light')document.body.classList.add('theme-light');if(m==='contrast')document.body.classList.add('theme-contrast');
  document.querySelectorAll('[data-tema]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tema===m?'true':'false'));
  salvarPref();desenharFigura();
}
function aplicarFonte(f){E.fs=Math.min(1.4,Math.max(.85,Math.round(f*10)/10));document.documentElement.style.setProperty('--fs',E.fs+'rem');salvarPref()}
window.addEventListener('DOMContentLoaded',()=>{});

/* ===== ÁUDIO E VOZ ===== */
function bip(f,d,t='triangle'){
  if(!E.somOn)return;
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;if(!AC)AC=new C();if(AC.state==='suspended')AC.resume();
    const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(.16,AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d+.02)}catch(_){}
}
function som(t){
  if(t==='ok'){bip(523.25,.14);setTimeout(()=>bip(783.99,.22),110)}
  else if(t==='fim'){bip(220,.3,'sawtooth')}
  else if(t==='podio'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>bip(f,.26),i*110))}
  else if(t==='tic'){bip(880,.04)}
}
function anunciar(t){const a=$('arAnuncio');if(a){a.textContent='';setTimeout(()=>{a.textContent=t},30)}}
function ler(){
  const it=E.qs[E.qi];if(!it||!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return;
  try{speechSynthesis.cancel();let t=it.q.q+'. ';it.q.o.forEach((o,i)=>{t+='Alternativa '+L[i]+': '+o+'. '});
    const u=new SpeechSynthesisUtterance(t);u.lang='pt-BR';speechSynthesis.speak(u)}catch(_){}
}

/* ===== CARGA DOS GERADORES (ponte mínima do index.html) ===== */
function elegiveis(){return MODS.filter(m=>m&&m.gens&&!m.gg&&typeof m.ctl!=='undefined')}
function carregar(){
  const fr=$('mlFonte');let tent=0;
  const ver=()=>{
    try{const p=fr.contentWindow&&fr.contentWindow.__mlArena;
      if(p&&Array.isArray(p.MODS)&&p.MODS.length){PONTE=p;MODS=p.MODS;elegiveis().forEach(m=>E.sel.add(m.id));telaConfig();return true}}catch(_){}
    return false;
  };
  const tentar=()=>{if(ver())return;if(++tent>40){falhaCarga();return}setTimeout(tentar,250)};
  fr.addEventListener('load',()=>setTimeout(tentar,50));
  setTimeout(()=>{if(!PONTE&&tent===0)tentar()},800);
}
function falhaCarga(){
  $('arMain').innerHTML=`<section class="ar-box"><h2 tabindex="-1" id="arT">Não consegui ler os assuntos do MathLab</h2>
  <p>A Arena lê os geradores do <code>index.html</code>, que precisa estar na mesma pasta e ser aberto por um endereço de internet (o site do MathLab) ou por um servidor local. Abrir o arquivo direto do computador (endereço <code>file://</code>) é bloqueado pelo navegador.</p>
  <p>Se estiver no site, atualize a página. Se o problema continuar, volte ao MathLab e abra a Arena de novo.</p>
  <p><a class="ar-btn" href="index.html">Voltar ao MathLab</a></p></section>`;
}

/* ===== TELA 1: CONFIGURAÇÃO ===== */
const hist=()=>{try{const a=JSON.parse(localStorage.getItem(HIST_KEY)||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}};
function telaConfig(){
  E.ativa=false;window.onbeforeunload=null;clearInterval(E.timer);
  const mods=elegiveis(),anos=[...new Set(mods.map(m=>m.ano))].filter(Number.isFinite).sort((a,b)=>a-b);
  const vis=mods.filter(m=>E.ano==='todos'||String(m.ano)===String(E.ano));
  const porEixo=EIXOS.map(e=>[e,vis.filter(m=>(m.eixo||'')===e)]).filter(x=>x[1].length);
  const outros=vis.filter(m=>!EIXOS.includes(m.eixo||''));if(outros.length)porEixo.push(['Outros',outros]);
  const H=hist();
  $('arMain').innerHTML=`
  <section class="ar-hero"><div><h1 id="arT" tabindex="-1">Arena MathLab</h1><p>Desafios em sala, no projetor. Equipes ou apelidos, sem dados pessoais. A pontuação da Arena não altera o progresso de ninguém no MathLab.</p></div></section>

  <section class="ar-box" aria-labelledby="hQuem"><h2 id="hQuem">1. Quem joga</h2>
    <div class="ar-lin"><label class="ar-fld" style="flex:1;min-width:14rem">Nome da equipe ou apelido<input type="text" id="novoNome" maxlength="24" placeholder="Ex.: Equipe Delta" onkeydown="if(event.key==='Enter'){event.preventDefault();ArenaUI.add()}"></label>
      <button class="ar-btn" type="button" onclick="ArenaUI.add()">Adicionar</button>
      <button class="ar-btn sec" type="button" onclick="ArenaUI.quatro()">4 equipes prontas</button></div>
    <ul class="ar-parts" aria-label="Participantes">${E.parts.map((p,i)=>`<li style="--pc:${CORES[i%CORES.length]}"><span class="sim" aria-hidden="true">${SIMB[i%SIMB.length]}</span><b>${esc(p.nome)}</b><button class="ar-x" type="button" aria-label="Remover ${esc(p.nome)}" onclick="ArenaUI.rem(${i})">&times;</button></li>`).join('')}</ul>
    <p class="ar-dica">${E.parts.length===1?'Com um só participante, ele responde clicando nas alternativas da tela.':'Com duas ou mais equipes, você registra a resposta de cada uma nos botões A a D, abaixo da questão.'}</p>
  </section>

  <section class="ar-box" aria-labelledby="hComo"><h2 id="hComo">2. Como joga</h2>
    <div class="ar-cfg">
      <label class="ar-fld">Nível<select id="cNivel" onchange="ArenaUI.cfg()"><option value="0" ${E.nivel===0?'selected':''}>Progressivo (1, 2 e 3)</option><option value="1" ${E.nivel===1?'selected':''}>Nível 1, base</option><option value="2" ${E.nivel===2?'selected':''}>Nível 2, cálculo</option><option value="3" ${E.nivel===3?'selected':''}>Nível 3, problemas</option></select></label>
      <label class="ar-fld">Questões<select id="cTotal" onchange="ArenaUI.cfg()">${[5,10,15,20].map(n=>`<option value="${n}" ${E.total===n?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="ar-fld">Tempo por questão<select id="cTempo" onchange="ArenaUI.cfg()">${[[15,'15 segundos'],[30,'30 segundos'],[45,'45 segundos'],[60,'60 segundos'],[0,'Sem limite']].map(([v,t])=>`<option value="${v}" ${E.tempo===v?'selected':''}>${t}</option>`).join('')}</select></label>
      <label class="ar-chk"><input type="checkbox" id="cBonus" ${E.bonus?'checked':''} ${E.tempo===0?'disabled':''} onchange="ArenaUI.cfg()"><span><b>Bônus de rapidez</b> (até 25 pontos). Conta o tempo até você marcar a resposta da equipe. Use quando marcar na ordem em que elas respondem.</span></label>
    </div>
    <p class="ar-dica">Pontos: acerto <b>100</b> · sequência de 3 acertos <b>+30</b> · sequência de 5 ou mais <b>+60</b>${E.bonus&&E.tempo?' · rapidez <b>até +25</b>':''} · erro ou sem resposta <b>0</b>. Empate fica empatado.</p>
  </section>

  <section class="ar-box" aria-labelledby="hO"><div class="ar-lin" style="justify-content:space-between"><h2 id="hO">3. O que entra (${E.sel.size} de ${mods.length} assuntos)</h2>
    <label class="ar-fld ar-inl">Ano<select id="cAno" onchange="ArenaUI.ano(this.value)"><option value="todos">Todos</option>${anos.map(a=>`<option value="${a}" ${String(E.ano)===String(a)?'selected':''}>${a}º ano</option>`).join('')}</select></label></div>
    ${porEixo.map(([e,l])=>{const n=EIXO_N[e]||1;return `<fieldset class="ar-eixo" style="--ax:var(--ax${n})"><legend>${esc(e)}</legend>
      <div class="ar-lin"><button class="ar-btn sec peq" type="button" onclick="ArenaUI.eixo('${esc(e)}',true)">Marcar todos</button><button class="ar-btn sec peq" type="button" onclick="ArenaUI.eixo('${esc(e)}',false)">Desmarcar</button></div>
      <div class="ar-mods">${l.map(m=>`<label class="ar-mod"><input type="checkbox" ${E.sel.has(m.id)?'checked':''} onchange="ArenaUI.mod('${m.id}',this.checked)"><span><span aria-hidden="true">${m.ic}</span> ${esc(m.nome)} <small>${m.ano}º</small></span></label>`).join('')}</div></fieldset>`}).join('')}
    <p class="ar-dica">O assunto Sólidos geométricos fica de fora porque usa o 3D do GeoGebra, que precisa de internet e de interação individual.</p>
  </section>

  <div class="ar-inicio"><button class="ar-go" type="button" onclick="ArenaUI.iniciar()">Iniciar partida</button></div>

  ${H.length?`<section class="ar-box" aria-labelledby="hH"><div class="ar-lin" style="justify-content:space-between"><h2 id="hH">Últimas partidas neste aparelho</h2><button class="ar-btn sec peq" type="button" onclick="ArenaUI.limpaHist()">Limpar</button></div>
    <div class="ar-tbw"><table class="ar-tb"><thead><tr><th>Data</th><th>Questões</th><th>Primeiro lugar</th><th>Pontos</th></tr></thead><tbody>${H.slice(-5).reverse().map(h=>`<tr><td>${esc(h.data)}</td><td>${h.questoes}</td><td><b>${esc(h.vencedor)}</b></td><td>${h.pontos}</td></tr>`).join('')}</tbody></table></div></section>`:''}`;
  const t=$('arT');if(t&&!E.focoConfig){E.focoConfig=true}
  try{document.dispatchEvent(new CustomEvent('arena:config'))}catch(_){}
}
const UI={
  add(){const i=$('novoNome');const n=(i&&i.value||'').trim();if(!n)return;if(E.parts.length>=8){anunciar('Máximo de 8 participantes.');return}
    if(E.parts.some(p=>p.nome.toLowerCase()===n.toLowerCase())){anunciar('Esse nome já está na lista.');return}
    E.parts.push({nome:n});telaConfig();const x=$('novoNome');if(x)x.focus()},
  quatro(){E.parts=['Equipe Alfa','Equipe Beta','Equipe Gama','Equipe Delta'].map(nome=>({nome}));telaConfig()},
  rem(i){if(E.parts.length<=1){anunciar('Precisa de pelo menos um participante.');return}E.parts.splice(i,1);telaConfig()},
  cfg(){E.nivel=+$('cNivel').value;E.total=+$('cTotal').value;E.tempo=+$('cTempo').value;E.bonus=$('cBonus').checked&&E.tempo>0;telaConfig()},
  ano(v){E.ano=v;telaConfig()},
  mod(id,on){on?E.sel.add(id):E.sel.delete(id);const h=$('hO');if(h)h.textContent=`3. O que entra (${E.sel.size} de ${elegiveis().length} assuntos)`},
  eixo(e,on){elegiveis().filter(m=>(m.eixo||'Outros')===e&&(E.ano==='todos'||String(m.ano)===String(E.ano))).forEach(m=>on?E.sel.add(m.id):E.sel.delete(m.id));telaConfig()},
  limpaHist(){try{localStorage.removeItem(HIST_KEY)}catch(_){}telaConfig()},
  iniciar:iniciar,voto:voto,revelar:revelar,proxima:proxima,ler:ler,novo:telaConfig,imprimir:()=>window.print(),clique:cliqueSolo
};
window.ArenaUI=UI;

/* ===== SORTEIO ===== */
function montar(){
  const mods=elegiveis().filter(m=>E.sel.has(m.id));if(!mods.length)return null;
  const lista=[],vistos=new Set();let fila=[];
  for(let i=0;i<E.total;i++){
    if(!fila.length)fila=sh(mods);
    const m=fila.pop();
    const nv=E.nivel===0?(i<E.total/3?1:i<2*E.total/3?2:3):E.nivel;
    const gens=m.gens[nv]||m.gens[1];
    let q=null;
    try{PONTE.setCur(m)}catch(_){}
    for(let t=0;t<30&&!q;t++){
      try{const c=gens[Math.floor(Math.random()*gens.length)]();
        if(validarQuestao(c)&&!vistos.has(m.id+'|'+c.q)){q=c;vistos.add(m.id+'|'+c.q)}}catch(_){}
    }
    if(!q){try{const c=gens[0]();if(validarQuestao(c))q=c}catch(_){}}
    try{PONTE.setCur(null)}catch(_){}
    if(q)lista.push({mod:m,nivel:nv,q});
  }
  return lista;
}
function iniciar(){
  if(!E.sel.size){anunciar('Marque pelo menos um assunto.');alert('Marque pelo menos um assunto para a partida.');return}
  if(!E.parts.length)return;
  const qs=montar();if(!qs||!qs.length){alert('Não foi possível sortear questões com os assuntos marcados.');return}
  E.qs=qs;E.qi=0;E.erros={};E.rodadas=[];E.ativa=true;
  E.placar=E.parts.map((p,i)=>({nome:p.nome,cor:CORES[i%CORES.length],sim:SIMB[i%SIMB.length],pts:0,acertos:0,seq:0,maxSeq:0,somaTempo:0}));
  window.onbeforeunload=e=>{e.preventDefault();e.returnValue=''};
  rodada();
}

/* ===== RODADA ===== */
const solo=()=>E.placar.length===1;
function rodada(){
  clearInterval(E.timer);E.revelada=false;E.resp={};E.tRestante=E.tempo;E.tInicio=performance.now();
  telaQuestao();
  if(E.tempo>0){
    E.timer=setInterval(()=>{
      const dec=(performance.now()-E.tInicio)/1000;E.tRestante=Math.max(0,Math.ceil(E.tempo-dec));
      relogio(dec);
      if(E.tRestante<=0){clearInterval(E.timer);som('fim');const s=$('arStatus');if(s)s.textContent='Tempo esgotado. Registre as respostas que faltam e revele.';anunciar('Tempo esgotado.')}
    },200);
  }
}
function relogio(dec){
  const n=$('arTn'),c=$('arAnel');
  if(n){n.textContent=E.tempo>0?E.tRestante:'∞';n.parentNode.classList.toggle('urg',E.tempo>0&&E.tRestante<=5&&E.tRestante>0)}
  if(c&&E.tempo>0)c.style.strokeDashoffset=String(170*(Math.min(1,dec/E.tempo)));
}
function temFigura(it){return !!(it&&it.mod&&typeof it.mod.draw==='function'&&it.q&&it.q.s)}
function corEixo(m){return 'var(--ax'+(EIXO_N[m.eixo]||1)+')'}
function telaQuestao(){
  const it=E.qs[E.qi],q=it.q,fig=temFigura(it);
  $('arMain').innerHTML=`<section class="ar-rodada" style="--ax:${corEixo(it.mod)}" aria-labelledby="arEnun">
    <div class="ar-top">
      <div class="ar-info"><span class="ar-pill"><b>Questão ${E.qi+1}</b> de ${E.qs.length}</span><span class="ar-pill eixo"><span aria-hidden="true">${it.mod.ic}</span> ${esc(it.mod.nome)} · Nível ${it.nivel}</span></div>
      <div class="ar-lin"><button class="ar-btn sec peq" type="button" onclick="ArenaUI.ler()" aria-label="Ler a questão em voz alta">Ler em voz alta</button>
      <div class="ar-timer ${E.tempo?'':'sem'}" role="timer" aria-label="Tempo da questão"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" class="tr"/><circle id="arAnel" cx="32" cy="32" r="27" class="tp" style="stroke-dasharray:170;stroke-dashoffset:0"/></svg><span id="arTn">${E.tempo>0?E.tempo:'∞'}</span></div></div>
    </div>
    <div class="ar-grid ${fig?'com-fig':''}">
      ${fig?`<div class="ar-fig"><canvas id="arCv" role="img" aria-label="Figura da questão, sem a resposta"></canvas></div>`:''}
      <div class="ar-qc"><h2 id="arEnun" class="ar-enun" tabindex="-1">${esc(q.q)}</h2>
        <div class="ar-ops" role="${solo()?'group':'list'}" aria-label="Alternativas">${q.o.map((o,i)=>solo()
          ?`<button type="button" class="ar-op" data-i="${i}" onclick="ArenaUI.clique(${i})"><span class="ar-l">${L[i]}</span><span>${esc(o)}</span></button>`
          :`<div class="ar-op" data-i="${i}" role="listitem"><span class="ar-l">${L[i]}</span><span>${esc(o)}</span></div>`).join('')}</div></div>
    </div>
    ${solo()?'':`<div class="ar-votos"><h3>Registre a resposta de cada equipe</h3><div class="ar-vg">${E.placar.map((p,i)=>`<div class="ar-voto" style="--pc:${p.cor}" id="v${i}"><div class="ar-vh"><b><span aria-hidden="true">${p.sim}</span> ${esc(p.nome)}</b><small id="vp${i}">${p.pts} pts${p.seq>=3?' · sequência '+p.seq:''}</small></div>
      <div class="ar-vb" role="group" aria-label="Resposta de ${esc(p.nome)}">${[0,1,2,3].map(op=>`<button type="button" data-o="${op}" aria-pressed="false" onclick="ArenaUI.voto(${i},${op})">${L[op]}</button>`).join('')}</div><small class="ar-vs" id="vs${i}">Sem resposta</small></div>`).join('')}</div></div>`}
    <div class="ar-acoes"><p id="arStatus" class="ar-status" aria-live="off">${solo()?'Clique na alternativa ou use as teclas A a D.':'Registre as respostas e revele quando quiser.'}</p>
      ${solo()?'':`<button class="ar-go" type="button" id="arRev" onclick="ArenaUI.revelar()">Revelar resposta e pontuar</button>`}</div>
    <div id="arResultado"></div></section>`;
  desenharFigura();
  const h=$('arEnun');if(h)h.focus({preventScroll:true});
  anunciar(`Questão ${E.qi+1} de ${E.qs.length}. ${it.mod.nome}.`);
}
function desenharFigura(){
  const cv=$('arCv'),it=E.qs[E.qi];if(!cv||!it||!E.ativa||!temFigura(it))return;
  try{
    const m=it.mod,d=window.devicePixelRatio||1,r=cv.getBoundingClientRect(),W=Math.max(260,r.width||420),H=260;
    cv.width=W*d;cv.height=H*d;const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);
    const v={};(m.ctl||[]).forEach(x=>v[x.k]=x.v);Object.assign(v,m.reset||{},it.q.s||{});
    if(typeof m.fix==='function')m.fix(v);
    PONTE.setCur(m);PONTE.setLocked(E.revelada);
    const g=getComputedStyle(document.body),f=n=>g.getPropertyValue(n).trim();
    m.draw(c,v,W,H,{t:f('--tx'),m:f('--mu'),a:f('--gold'),b:f('--gold2'),c1:f('--cy'),c2:f('--pk'),pk:f('--pk'),gr:f('--gr'),f:'rgba(230,159,0,.3)'});
  }catch(_){}
  finally{try{PONTE.setCur(null);PONTE.setLocked(false)}catch(_){}}
}
window.addEventListener('resize',()=>{clearTimeout(E.rz);E.rz=setTimeout(desenharFigura,150)});

function voto(i,op){
  if(E.revelada)return;
  const t=Math.max(.2,(performance.now()-E.tInicio)/1000);
  E.resp[i]={op,t};
  const box=$('v'+i);
  if(box){box.querySelectorAll('.ar-vb button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.o===op)));
    const s=$('vs'+i);if(s)s.textContent='Resposta '+L[op]}
  som('tic');anunciar(`${E.placar[i].nome}: ${L[op]}`);
  const todos=Object.keys(E.resp).length===E.placar.length;
  const st=$('arStatus');if(st)st.textContent=todos?'Todas as respostas registradas. Pode revelar.':`${Object.keys(E.resp).length} de ${E.placar.length} respostas registradas.`;
}
function cliqueSolo(op){
  if(E.revelada||!solo())return;
  E.resp[0]={op,t:Math.max(.2,(performance.now()-E.tInicio)/1000)};
  revelar();
}
function revelar(){
  if(E.revelada||!E.ativa)return;
  clearInterval(E.timer);E.revelada=true;
  const it=E.qs[E.qi],q=it.q,res=[];let acertos=0;
  E.placar.forEach((p,i)=>{
    const r=E.resp[i];
    if(r&&r.op===q.c){
      acertos++;p.acertos++;p.seq++;p.maxSeq=Math.max(p.maxSeq,p.seq);p.somaTempo+=r.t;
      const s=pontuar(p.seq,r.t,E.tempo,E.bonus&&E.tempo>0);p.pts+=s.total;res.push({i,ok:true,ganho:s.total,s});
    }else{
      p.seq=0;res.push({i,ok:false,ganho:0,op:r?r.op:null});
      if(r&&q.tg&&q.tg[r.op]){const k=`${it.mod.nome}: ${q.tg[r.op]}`;E.erros[k]=(E.erros[k]||0)+1}
    }
  });
  E.rodadas.push({q,modNome:it.mod.nome,nivel:it.nivel,acertos,total:E.placar.length});
  som(acertos?'ok':'fim');
  mostrarResultado(it,res);
  desenharFigura();
}
function mostrarResultado(it,res){
  const q=it.q;
  document.querySelectorAll('.ar-op').forEach(el=>{
    const i=+el.dataset.i;el.classList.toggle('certa',i===q.c);el.classList.toggle('errada',i!==q.c);
    if(el.tagName==='BUTTON')el.disabled=true;
    if(i===q.c&&!el.querySelector('.ar-sel')){const s=document.createElement('span');s.className='ar-sel';s.textContent='✔ Correta';el.appendChild(s)}
  });
  const rev=$('arRev');if(rev)rev.disabled=true;
  document.querySelectorAll('.ar-vb button').forEach(b=>b.disabled=true);
  res.forEach(r=>{
    const p=E.placar[r.i],s=$('vs'+r.i),pp=$('vp'+r.i);
    if(s)s.textContent=r.ok?`Acertou, +${r.ganho}`:(r.op==null?'Sem resposta, 0':`Marcou ${L[r.op]}, 0`);
    if(s)s.classList.add(r.ok?'ok':'no');
    if(pp)pp.textContent=`${p.pts} pts${p.seq>=3?' · sequência '+p.seq:''}`;
  });
  const ord=classificar(E.placar,E.bonus&&E.tempo>0),ult=E.qi+1>=E.qs.length;
  const unico=solo()?res[0]:null;
  const bonusTxt=r=>r.s&&(r.s.rapidez||r.s.sequencia)?` (${[r.s.rapidez?`rapidez +${r.s.rapidez}`:'',r.s.sequencia?`sequência +${r.s.sequencia}`:''].filter(Boolean).join(', ')})`:'';
  $('arResultado').innerHTML=`<div class="ar-res"><h3 tabindex="-1" id="arRH">Resposta correta: ${L[q.c]}, ${esc(q.o[q.c])}</h3>
    <p><b>Por quê:</b> ${esc(q.e||'')}</p>
    ${unico?`<p class="${unico.ok?'okt':'not'}">${unico.ok?`Você acertou, +${unico.ganho}${bonusTxt(unico)}.`:'Não foi dessa vez.'}</p>`:''}
    <div class="ar-mini"><b>Placar:</b> ${ord.map(p=>`<span class="ar-ch" style="--pc:${p.cor}">${p.pos}º ${p.sim} ${esc(p.nome)} · ${p.pts}</span>`).join('')}</div>
    <div class="ar-lin" style="margin-top:.8rem"><button class="ar-go" type="button" onclick="ArenaUI.proxima()" id="arProx">${ult?'Ver o pódio':'Próxima questão'}</button></div></div>`;
  const pr=$('arProx');if(pr)pr.focus({preventScroll:false});
  const st=$('arStatus');if(st)st.textContent='Resposta revelada.';
  anunciar(`Resposta correta: ${L[q.c]}, ${q.o[q.c]}.`);
}
function proxima(){if(E.qi+1<E.qs.length){E.qi++;rodada();window.scrollTo(0,0)}else final()}

/* ===== FIM: PÓDIO E RESUMO DO PROFESSOR ===== */
function final(){
  clearInterval(E.timer);E.ativa=false;window.onbeforeunload=null;som('podio');
  const rk=classificar(E.placar,E.bonus&&E.tempo>0),topo=rk[0];
  try{const a=hist();a.push({data:new Date().toLocaleDateString('pt-BR'),questoes:E.qs.length,vencedor:rk.filter(p=>p.pos===1).map(p=>p.nome).join(' e '),pontos:topo?topo.pts:0});localStorage.setItem(HIST_KEY,JSON.stringify(a.slice(-30)))}catch(_){}
  const erros=Object.entries(E.erros).sort((a,b)=>b[1]-a[1]);
  const dif=[...E.rodadas].filter(r=>r.acertos<r.total).sort((a,b)=>a.acertos/a.total-b.acertos/b.total).slice(0,5);
  const med=['1º','2º','3º'];
  $('arMain').innerHTML=`<section class="ar-box" aria-labelledby="arT"><div class="ar-lin" style="justify-content:space-between"><h1 id="arT" tabindex="-1">Pódio da partida</h1>
    <div class="ar-lin no-print"><button class="ar-btn sec" type="button" onclick="ArenaUI.imprimir()">Imprimir ou salvar em PDF</button><button class="ar-go peq" type="button" onclick="ArenaUI.novo()">Nova partida</button></div></div>
    <div class="ar-podio">${rk.slice(0,3).map(p=>`<div class="ar-pc pos${p.pos}" style="--pc:${p.cor}"><div class="ar-m">${p.pos}º</div><h3>${p.sim} ${esc(p.nome)}${p.empate?' <small>(empate)</small>':''}</h3><div class="ar-pts">${p.pts} pontos</div><small>${p.acertos} de ${E.qs.length} acertos${E.bonus&&E.tempo&&p.acertos?' · tempo médio '+fmt1(tempoMedio(p))+' s':''}</small></div>`).join('')}</div>
    <h2>Classificação completa</h2>
    <div class="ar-tbw"><table class="ar-tb"><thead><tr><th>Pos.</th><th>Participante</th><th>Pontos</th><th>Acertos</th><th>Maior sequência</th>${E.bonus&&E.tempo?'<th>Tempo médio</th>':''}</tr></thead><tbody>${rk.map(p=>`<tr><td><b>${p.pos}º</b></td><td><span aria-hidden="true" style="color:${p.cor}">${p.sim}</span> ${esc(p.nome)}</td><td><b>${p.pts}</b></td><td>${p.acertos} de ${E.qs.length}</td><td>${p.maxSeq}</td>${E.bonus&&E.tempo?`<td>${p.acertos?fmt1(tempoMedio(p))+' s':'sem acertos'}</td>`:''}</tr>`).join('')}</tbody></table></div>
    <h2>Para a próxima aula: tipos de engano mais comuns</h2>
    ${erros.length?`<ul class="ar-lst">${erros.map(([t,n])=>`<li><b>${esc(t)}</b>, ${n} ${n===1?'vez':'vezes'}</li>`).join('')}</ul><p class="ar-dica">Os tipos vêm da classificação de erros do próprio MathLab. Eles descrevem o raciocínio, não quem errou.</p>`:'<p class="ar-dica">Nenhum engano classificado nesta partida.</p>'}
    <h2>Questões que mais desafiaram</h2>
    ${dif.length?dif.map(r=>`<div class="ar-rev"><small><b>${esc(r.modNome)}</b> · Nível ${r.nivel} · acertos ${r.acertos} de ${r.total}</small><p><b>${esc(r.q.q)}</b></p><p class="okt">Resposta: ${esc(r.q.o[r.q.c])}</p><p class="ar-dica">${esc(r.q.e||'')}</p></div>`).join(''):'<p class="okt">Todas as questões foram acertadas por todos.</p>'}
  </section>`;
  const t=$('arT');if(t)t.focus();
  anunciar('Partida encerrada. Pódio disponível.');window.scrollTo(0,0);
}

/* ===== TECLADO ===== */
document.addEventListener('keydown',e=>{
  if(!E.ativa||E.revelada||!solo())return;
  if(e.target&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key.toUpperCase();let i=L.indexOf(k);if(i<0&&'1234'.includes(k)&&k)i=+k-1;
  if(i>=0&&i<4){e.preventDefault();cliqueSolo(i)}
});

/* ===== CABEÇALHO ===== */
window.ArenaHdr={
  tema:m=>aplicarTema(m),fonte:d=>{aplicarFonte(E.fs+d*.1)},
  som:()=>{E.somOn=!E.somOn;const b=$('btnSom');if(b){b.setAttribute('aria-pressed',String(E.somOn));b.textContent=E.somOn?'Som ligado':'Som desligado'}salvarPref();if(E.somOn)som('tic')}
};
function iniciarApp(){
  const p=lerPref();aplicarFonte(p.fs||1);E.somOn=p.som!==false;
  const b=$('btnSom');if(b){b.setAttribute('aria-pressed',String(E.somOn));b.textContent=E.somOn?'Som ligado':'Som desligado'}
  aplicarTema(p.tema||'dark');carregar();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciarApp);else iniciarApp();
window.__arenaEstado=E;
window.__arenaInt={E,montar,desenharFigura,elegiveis,telaConfig,anunciar,som,esc,L,CORES,SIMB,corEixo,temFigura,fmt1,hist,HIST_KEY,EIXO_N,get PONTE(){return PONTE},get MODS(){return MODS}};
})();
