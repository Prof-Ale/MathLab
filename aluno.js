/* Arena MathLab, tela do aluno (celular). Fala só com o Firebase, não depende do index.html.
   © 2026 Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate). Todos os direitos reservados. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LET='ABCD',SIM=['●','▲','■','◆'],COR=['#38bdf8','#f472b6','#2dd4bf','#f2b01e'];
const SK='mathlab-arena-aluno';
const AL=window.ArenaLive;
let D={},S={cod:null,apelido:null,uid:null,tela:null},Lq={qi:-1,op:null,ptsAntes:0,enviando:false,msg:''},timer=null,rt=null;

function guardar(){try{localStorage.setItem(SK,JSON.stringify({cod:S.cod,apelido:S.apelido,t:Date.now(),resp:S.resp||null}))}catch(_){}}
function lerGuardado(){try{const g=JSON.parse(localStorage.getItem(SK)||'null');return g&&Date.now()-g.t<8*3600*1000?g:null}catch(_){return null}}
function esquecer(){try{localStorage.removeItem(SK)}catch(_){}}
function anunciar(t){const a=$('anuncio');if(a){a.textContent='';setTimeout(()=>{a.textContent=t},30)}}
function foco(){const h=document.querySelector('#app [data-foco]');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}}
function banner(t){const b=$('banner');b.className=t?'banner':'';b.textContent=t||''}
function mostrar(html,nome){
  if(S.tela!==nome){S.tela=nome;$('app').innerHTML=html;foco();window.scrollTo(0,0)}else{$('app').innerHTML=html}
}

/* ===== ENTRAR ===== */
function telaEntrar(msg,cod,apelido){
  clearInterval(timer);S.tela=null;$('hSala').textContent='';
  const p=new URLSearchParams(location.search);
  const c=cod!=null?cod:(p.get('c')||'').replace(/\D/g,'').slice(0,6);
  const g=lerGuardado();
  const ap=apelido!=null?apelido:(g&&g.apelido)||'';
  mostrar(`<div class="card"><h1 data-foco>Entrar na sala</h1>
    <p class="mu">Digite o código que está no quadro e escolha um apelido. Não use seu nome completo nem telefone.</p>
    ${msg?`<p class="erro" role="alert">${esc(msg)}</p>`:''}
    <form id="fEntrar" autocomplete="off" novalidate>
      <label>Código da sala<input class="cod" id="iCod" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" value="${esc(c)}" placeholder="000000"></label>
      <label style="margin-top:.8rem">Seu apelido<input id="iApe" maxlength="20" autocomplete="off" autocapitalize="words" value="${esc(ap)}" placeholder="Ex.: Ana"></label>
      <button class="go" id="bEntrar" type="submit" style="margin-top:1rem;width:100%">Entrar</button></form></div>`,'entrar');
  const f=$('fEntrar');
  f.addEventListener('submit',e=>{e.preventDefault();entrar($('iCod').value,$('iApe').value)});
  $('iCod').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6)});
  if(c.length===6&&!ap)$('iApe').focus();
}
async function entrar(cod,apelido,retomando){
  cod=AL.soDig(cod);
  if(cod.length!==6){telaEntrar('O código tem 6 números.',cod,apelido);return}
  if(!retomando){const v=AL.apelidoValido(apelido);if(!v.ok){telaEntrar(v.msg,cod,apelido);return}}
  S.tela=null;
  mostrar(`<div class="card"><h1 data-foco>Entrando</h1><p class="mu"><span class="pulso" aria-hidden="true"></span> Conectando à sala ${esc(cod)}.</p></div>`,'conectando');
  try{
    const r=await AL.aluno.entrar(cod,apelido,retomando);
    S.cod=cod;S.apelido=r.apelido;S.uid=r.uid;S.resp=(lerGuardado()&&lerGuardado().cod===cod)?lerGuardado().resp:null;guardar();
    $('hSala').textContent='Sala '+cod;
    D={};Lq={qi:-1,op:null,ptsAntes:0,enviando:false,msg:''};
    AL.aluno.ouvir((k,v)=>{
      if(k==='erro'){banner(v&&v.message||'Problema de conexão.');return}
      if(k==='conexao'){D.conexao=v;atualizarBanner();return}
      D[k]=v;D['_'+k]=true;
      if(k==='host')atualizarBanner();
      agendar();
    });
  }catch(e){
    if(e&&(e.codigo==='saiu'||e.codigo==='sem-sala')){esquecer()}
    telaEntrar(e&&e.message||'Não consegui entrar.',cod,apelido);
  }
}
function atualizarBanner(){
  if(D.conexao===false)banner('Sem conexão. Tentando voltar sozinho.');
  else if(D.host===false&&S.cod)banner('O professor perdeu a conexão. Aguarde, a partida continua.');
  else banner('');
}
function agendar(){clearTimeout(rt);rt=setTimeout(render,30)}

/* ===== RENDER ===== */
function render(){
  if(!S.cod)return;
  // ainda carregando os primeiros dados
  if(!D._estado||!D._eu){return}
  if(D.estado===null){fim('A sala foi encerrada','O professor encerrou a sala. Para jogar de novo, entre com um novo código.');return}
  if(D.eu===null){fim('Você saiu da sala','O professor removeu você da sala, ou a sala foi reiniciada.');return}
  const est=D.estado;
  if(est==='lobby')return telaEspera();
  if(est==='questao')return telaQuestao();
  if(est==='resultado')return telaResultado();
  if(est==='podio')return telaPodio();
}
function fim(t,m){
  clearInterval(timer);esquecer();S.cod=null;try{AL.aluno.sair()}catch(_){}
  banner('');$('hSala').textContent='';S.tela=null;
  mostrar(`<div class="card"><h1 data-foco>${esc(t)}</h1><p>${esc(m)}</p><button class="go" type="button" id="bNova">Entrar em outra sala</button></div>`,'fim');
  $('bNova').addEventListener('click',()=>{history.replaceState(null,'',location.pathname);telaEntrar()});
  anunciar(t);
}
function telaEspera(){
  clearInterval(timer);
  mostrar(`<div class="card"><h1 data-foco>Você está dentro</h1>
    <p class="grande" style="font-size:1.8rem">${esc(S.apelido)}</p>
    <p class="mu"><span class="pulso" aria-hidden="true"></span> Aguarde o professor começar a partida. Olhe o projetor.</p></div>
    <div class="card"><p class="mu">Na hora de responder, aparecem quatro botões grandes, A, B, C e D. Cada um tem uma forma e uma cor, para ficar fácil de achar.</p></div>`,'espera');
  anunciar('Você entrou na sala. Aguarde o professor começar.');
}
function respostaGuardada(qi){const r=S.resp;return r&&r.cod===S.cod&&r.qi===qi?r.op:null}
function telaQuestao(){
  const r=D.rodada;if(!r)return;
  if(Lq.qi!==r.qi){
    Lq={qi:r.qi,op:respostaGuardada(r.qi),ptsAntes:(D.eu&&D.eu.pts)||0,enviando:false,msg:''};
    S.tela=null;
  }
  const total=(D.cfg&&D.cfg.total)||'';
  const o=r.o||{},ops=[0,1,2,3].map(i=>o[i]||(Array.isArray(r.o)?r.o[i]:'')||'');
  const respondida=Lq.op!==null;
  mostrar(`<div class="topo"><span><b>Questão ${r.qi+1}</b>${total?' de '+total:''} · ${esc(r.mod||'')}</span><span class="tn" id="tn" aria-hidden="true"></span></div>
    <div class="tempo" id="tbar" aria-hidden="true"><i id="ti"></i></div>
    ${r.fig?`<p class="fig">Esta questão tem figura. Olhe o projetor.</p>`:''}
    <h1 class="enun" data-foco id="enun">${esc(r.q)}</h1>
    <div class="ops" role="group" aria-label="Alternativas">${ops.map((t,i)=>`<button type="button" class="op ${Lq.op===i?'minha':''}" data-i="${i}" style="--c:${COR[i]}" ${respondida?'disabled':''} aria-label="Alternativa ${LET[i]}: ${esc(t)}"><span class="l" aria-hidden="true">${LET[i]}</span><span class="s" aria-hidden="true">${SIM[i]}</span><span class="t">${esc(t)}</span></button>`).join('')}</div>
    <p id="msg" class="${Lq.msg?'erro':'mu'}" role="status">${respondida?(Lq.enviando?'Enviando...':'Resposta enviada. Aguarde o professor revelar.'):esc(Lq.msg)}</p>`,'q'+r.qi);
  document.querySelectorAll('.op').forEach(b=>b.addEventListener('click',()=>responder(+b.dataset.i)));
  if(!document.body.dataset.qa||document.body.dataset.qa!==String(r.qi)){document.body.dataset.qa=String(r.qi);anunciar(`Questão ${r.qi+1}. ${r.q}`)}
  iniciarTempo(r);
}
function iniciarTempo(r){
  clearInterval(timer);
  const T=r.tempoSeg||0;
  const tn=$('tn'),ti=$('ti'),bar=$('tbar');
  if(!T){if(tn)tn.textContent='sem limite';if(bar)bar.style.display='none';return}
  const tick=()=>{
    const dec=Math.max(0,(AL.agora()-r.inicioEm)/1000),rest=Math.max(0,Math.ceil(T-dec));
    const tn2=$('tn'),ti2=$('ti'),b2=$('tbar');if(!tn2||!ti2)return;
    tn2.textContent=rest+' s';ti2.style.transform=`scaleX(${Math.max(0,1-dec/T)})`;b2.classList.toggle('urg',rest<=5);
    if(rest<=0){
      clearInterval(timer);
      document.querySelectorAll('.op').forEach(b=>b.disabled=true);
      const m=$('msg');if(m&&Lq.op===null){m.className='mu';m.textContent='Tempo esgotado. Aguarde o professor revelar.';anunciar('Tempo esgotado.')}
    }
  };
  tick();timer=setInterval(tick,200);
}
async function responder(op){
  const r=D.rodada;if(!r||Lq.op!==null||Lq.qi!==r.qi)return;
  Lq.op=op;Lq.enviando=true;Lq.msg='';
  document.querySelectorAll('.op').forEach(b=>{b.disabled=true;b.classList.toggle('minha',+b.dataset.i===op)});
  const m=$('msg');if(m){m.className='mu';m.textContent='Enviando...'}
  const lento=setTimeout(()=>{const x=$('msg');if(x&&Lq.enviando)x.textContent='Sem conexão, tentando enviar. Se o tempo acabar, a resposta não conta.'},5000);
  try{
    await AL.aluno.responder(op,r.qi);
    S.resp={cod:S.cod,qi:r.qi,op};guardar();
    Lq.enviando=false;
    const x=$('msg');if(x){x.className='mu';x.textContent='Resposta enviada. Aguarde o professor revelar.'}
    anunciar('Resposta enviada.');
  }catch(e){
    Lq.enviando=false;
    const ja=(e&&e.codigo==='permissao');
    if(ja&&D.estado==='questao'){
      // recusada: ou já respondeu antes (página recarregada) ou o tempo acabou
      Lq.op=null;Lq.msg='A resposta não foi aceita. O tempo pode ter acabado, ou você já respondeu esta questão.';
    }else{Lq.op=null;Lq.msg=(e&&e.message)||'Não consegui enviar. Toque de novo.'}
    telaQuestao();
  }finally{clearTimeout(lento)}
}
function telaResultado(){
  clearInterval(timer);
  const r=D.rodada,v=D.revelacao;
  if(!r||!v||v.qi!==r.qi){
    mostrar(`<div class="card"><h1 data-foco>Conferindo as respostas</h1><p class="mu"><span class="pulso" aria-hidden="true"></span> Um instante.</p></div>`,'conf');return;
  }
  if(Lq.qi!==r.qi){Lq={qi:r.qi,op:respostaGuardada(r.qi),ptsAntes:0,enviando:false,msg:''}}
  const o=r.o||{},eu=D.eu||{};
  const acertou=Lq.op!==null&&Lq.op===v.correta,sem=Lq.op===null;
  const ganho=Math.max(0,(eu.pts||0)-Lq.ptsAntes);
  const titulo=acertou?'Você acertou':sem?'Sem resposta':'Não foi dessa vez';
  mostrar(`<div class="card"><h1 class="grande ${acertou?'ok':'no'}" data-foco>${titulo}</h1>
    ${acertou?`<p class="grande" style="font-size:1.6rem">+${ganho} pontos</p>`:''}
    <div class="cx"><div><b>${eu.pts||0}</b><small>pontos</small></div><div><b>${eu.pos&&(eu.pts||0)>0?eu.pos+'º':'–'}</b><small>posição</small></div>
    <div><b>${eu.acertos||0}</b><small>acertos</small></div><div><b>${eu.seq||0}</b><small>sequência</small></div></div></div>
    <div class="card"><h2>Resposta certa: ${LET[v.correta]}</h2><p class="enun" style="font-size:1.05rem">${esc(o[v.correta]||'')}</p>
    ${Lq.op!==null&&!acertou?`<p class="mu">Você marcou ${LET[Lq.op]}: ${esc(o[Lq.op]||'')}</p>`:''}
    ${v.explicacao?`<p>${esc(v.explicacao)}</p>`:''}</div>
    <p class="mu">${eu.ult?'Essa foi a última questão. Olhe o projetor.':'Aguarde a próxima questão. Olhe o projetor.'}</p>`,'res'+r.qi);
  const k='res'+r.qi;if(document.body.dataset.ra!==k){document.body.dataset.ra=k;anunciar(`${titulo}. Resposta certa: ${LET[v.correta]}.`)}
}
function telaPodio(){
  clearInterval(timer);
  const eu=D.eu||{},p=(eu.pts||0)>0?eu.pos:0;
  const med=p===1?'🥇':p===2?'🥈':p===3?'🥉':'';
  mostrar(`<div class="card"><h1 class="grande" data-foco>${med?med+' ':''}${p?p+'º lugar':'Fim da partida'}</h1>
    <p style="text-align:center">${esc(S.apelido)}</p>
    <div class="cx"><div><b>${eu.pts||0}</b><small>pontos</small></div><div><b>${eu.acertos||0}</b><small>acertos</small></div>
    <div><b>${eu.maxSeq||0}</b><small>maior sequência</small></div><div><b>${(D.cfg&&D.cfg.total)||'–'}</b><small>questões</small></div></div></div>
    <p class="mu">Olhe o projetor para ver o pódio da turma. Obrigado por jogar.</p>`,'podio');
  anunciar(`Fim da partida. ${p?'Você ficou em '+p+'º lugar.':''} ${eu.pts||0} pontos.`);
}

/* ===== INÍCIO ===== */
function iniciar(){
  if(!AL){mostrar(`<div class="card"><h1 data-foco>Não carregou</h1><p>A parte que conecta à sala não carregou. Atualize a página.</p></div>`,'x');return}
  const g=lerGuardado(),p=new URLSearchParams(location.search),c=(p.get('c')||'').replace(/\D/g,'');
  if(g&&g.cod&&g.apelido&&(!c||c===g.cod)){entrar(g.cod,g.apelido,true);return}
  telaEntrar();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
window.addEventListener('pagehide',()=>{try{if(S.cod)AL.aluno.sair()}catch(_){}});
})();
