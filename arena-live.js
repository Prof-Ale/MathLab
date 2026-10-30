/* Arena MathLab, camada em tempo real (Firebase). Arquivo isolado: se falhar, a Arena local segue funcionando.
   © 2026 Prof. Alessandro Barbosa dos Santos (Prof. Alê Chocolate). Todos os direitos reservados. */
(()=>{
'use strict';
const VER='10.14.1',BASE='https://www.gstatic.com/firebasejs/'+VER+'/';
let F=null,app=null,auth=null,db=null,uid=null,off=0,conectando=null;

function erro(codigo,msg,orig){const e=new Error(msg);e.codigo=codigo;e.orig=orig;return e}
function traduzir(e){
  if(e&&e.codigo&&e.message)return e;
  const c=String((e&&e.code)||''),m=String((e&&e.message)||e||'');
  if(/operation-not-allowed|admin-restricted/.test(c))return erro('anon-off','O login anônimo não está ativado no Firebase. No console, abra Authentication, Método de login, e ative o provedor Anônimo.',e);
  if(/network-request-failed/.test(c))return erro('rede','Sem conexão com o Firebase. A rede da escola pode estar bloqueando. Tente pelos dados móveis ou use o modo local.',e);
  if(/too-many-requests/.test(c))return erro('limite','Muitas tentativas seguidas. Espere um minuto e tente de novo.',e);
  if(/permission_denied|permission denied/i.test(c+m))return erro('permissao','O banco recusou a operação. Confira se as regras de segurança foram publicadas.',e);
  if(/import|fetch|load|module|script/i.test(m)&&!c)return erro('sdk','Não consegui carregar o Firebase. A rede pode estar bloqueando o endereço www.gstatic.com.',e);
  return erro('geral','Algo deu errado na conexão: '+m,e);
}
const limite=(p,ms,msg)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(erro('tempo',msg||'A conexão demorou demais.')),ms))]);

async function sdk(){
  if(F)return F;
  const cfg=window.ARENA_FIREBASE;
  if(!cfg||!cfg.apiKey)throw erro('config','A configuração do Firebase não foi encontrada (arena-config.js).');
  try{
    const [a,b,c]=await limite(Promise.all([import(BASE+'firebase-app.js'),import(BASE+'firebase-auth.js'),import(BASE+'firebase-database.js')]),15000,'O Firebase demorou para carregar. A rede da escola pode estar bloqueando.');
    F=Object.assign({},a,b,c);
  }catch(e){throw e&&e.codigo?e:erro('sdk','Não consegui carregar o Firebase. A rede pode estar bloqueando o endereço www.gstatic.com.',e)}
  return F;
}
function conectar(){
  if(conectando)return conectando;
  conectando=(async()=>{
    try{
      const f=await sdk();
      app=f.initializeApp(window.ARENA_FIREBASE);
      auth=f.getAuth(app);
      const cred=await limite(f.signInAnonymously(auth),15000,'O login anônimo demorou demais.');
      uid=cred.user.uid;db=f.getDatabase(app);
      f.onValue(f.ref(db,'.info/serverTimeOffset'),s=>{off=Number(s.val())||0});
    }catch(e){conectando=null;throw traduzir(e)}
    return uid;
  })();
  return conectando;
}
const agora=()=>Date.now()+off;
const R=p=>F.ref(db,p);
const SALA=c=>'salas/'+c;
const soDig=s=>String(s||'').replace(/\D/g,'');
async function tenta(fn){try{return await fn()}catch(e){throw traduzir(e)}}

/* ===== APELIDO ===== */
const PROIB=['porra','caralho','puta','puto','putaria','merda','bosta','cuzao','cu','buceta','bucetao','piroca','pau','rola','viado','viada','bicha','sapatao','macaco','macaca','preto','nazista','hitler','estupro','estuprador','vagabunda','vagabundo','otario','otaria','retardado','mongoloide','fdp','pqp','vsf','tnc','arrombado','arrombada','cacete','punheta','foder','fodase','foda','corno','corna','idiota','imbecil','lixo','nigger','fuck','shit','bitch','dick','pussy','cock','slut','whore','fag','faggot'];
function norm(s){
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e').replace(/4/g,'a').replace(/5/g,'s').replace(/7/g,'t').replace(/@/g,'a').replace(/\$/g,'s');
}
function apelidoValido(txt){
  const a=String(txt||'').replace(/\s+/g,' ').trim();
  if(a.length<2)return {ok:false,msg:'O apelido precisa ter pelo menos 2 letras.'};
  if(a.length>20)return {ok:false,msg:'O apelido pode ter no máximo 20 letras.'};
  if(!/^[\p{L}\p{N} ._]+$/u.test(a))return {ok:false,msg:'Use só letras, números, espaço, ponto ou sublinhado.'};
  if(/\d{5,}/.test(a.replace(/[ ._]/g,'')))return {ok:false,msg:'Não coloque telefone nem números pessoais. Escolha um apelido.'};
  if(/http|www|\.com|\.br/i.test(a))return {ok:false,msg:'Não use endereços de internet no apelido.'};
  const n=norm(a),palavras=n.split(/[^a-z]+/).filter(Boolean),junto=n.replace(/[^a-z]/g,'');
  if(palavras.some(p=>PROIB.includes(p))||PROIB.includes(junto))return {ok:false,msg:'Esse apelido não pode. Escolha outro, sem ofensas.'};
  return {ok:true,apelido:a};
}

/* ===== PROFESSOR ===== */
const H={cod:null,unsub:[]};
async function criarSala(cfg){
  return tenta(async()=>{
    await conectar();
    // limpa salas antigas deste mesmo professor
    try{
      const s=await F.get(R('anfitrioes/'+uid));
      if(s.exists()){
        for(const c of Object.keys(s.val())){
          try{await F.remove(R(SALA(c)))}catch(_){}
          try{await F.remove(R('anfitrioes/'+uid+'/'+c))}catch(_){}
        }
      }
    }catch(_){}
    let ultimo=null;
    for(let t=0;t<8;t++){
      const cod=String(100000+Math.floor(Math.random()*900000));
      try{
        await F.set(R(SALA(cod)),{hostUid:uid,hostOnline:true,criadaEm:F.serverTimestamp(),estado:'lobby',
          cfg:{total:cfg.total,tempo:cfg.tempo,bonus:!!cfg.bonus,trancada:false}});
        H.cod=cod;
        try{await F.set(R('anfitrioes/'+uid+'/'+cod),Date.now())}catch(_){}
        try{F.onDisconnect(R(SALA(cod)+'/hostOnline')).set(false)}catch(_){}
        return cod;
      }catch(e){ultimo=e}
    }
    throw traduzir(ultimo||erro('geral','Não consegui criar a sala.'));
  });
}
async function retomarSala(cod){
  return tenta(async()=>{
    await conectar();
    const s=await F.get(R(SALA(cod)));
    if(!s.exists())throw erro('sem-sala','A sala não existe mais.');
    H.cod=cod;
    await F.set(R(SALA(cod)+'/hostOnline'),true);
    try{F.onDisconnect(R(SALA(cod)+'/hostOnline')).set(false)}catch(_){}
    return s.val();
  });
}
function ouvirSala(cb){
  const un=F.onValue(R(SALA(H.cod)),s=>cb(s.exists()?s.val():null),e=>cb(null,traduzir(e)));
  H.unsub.push(un);return un;
}
function ouvirConexao(cb){
  const un=F.onValue(R('.info/connected'),s=>{
    const ok=!!s.val();cb(ok);
    if(ok&&H.cod){
      F.set(R(SALA(H.cod)+'/hostOnline'),true).catch(()=>{});
      try{F.onDisconnect(R(SALA(H.cod)+'/hostOnline')).set(false)}catch(_){}
    }
  });H.unsub.push(un);return un;
}
async function mudarCfg(patch){
  const up={};Object.keys(patch).forEach(k=>{up[SALA(H.cod)+'/cfg/'+k]=patch[k]});
  return tenta(()=>F.update(F.ref(db),up));
}
/* r: {qi,mod,ic,nivel,eixo,q,o:[4],fig,tempoSeg} */
async function publicarQuestao(r){
  const c=SALA(H.cod),inicioEm=agora();
  const o={};r.o.forEach((x,i)=>{o[i]=String(x).slice(0,240)});
  const rod={qi:r.qi,mod:String(r.mod).slice(0,80),ic:String(r.ic||'').slice(0,16),nivel:r.nivel,eixo:String(r.eixo||'').slice(0,60),
    q:String(r.q).slice(0,700),o,fig:!!r.fig,inicioEm,tempoSeg:r.tempoSeg};
  await tenta(()=>F.update(F.ref(db),{[c+'/revelacao']:null,[c+'/respostas']:null,[c+'/rodada']:rod,[c+'/estado']:'questao',[c+'/cfg/trancada']:true}));
  return inicioEm;
}
async function fecharRespostas(){return tenta(()=>F.set(R(SALA(H.cod)+'/estado'),'resultado'))}
/* rev: {qi,correta,explicacao}; placar: {uid:{pts,acertos,seq,maxSeq,somaTempo,pos,ult}} ; estadoFinal: 'resultado'|'podio' */
async function publicarResultado(rev,placar,estadoFinal){
  const c=SALA(H.cod),up={};
  up[c+'/revelacao']={qi:rev.qi,correta:rev.correta,explicacao:String(rev.explicacao||'').slice(0,900)};
  Object.keys(placar).forEach(u=>{const p=placar[u];['pts','acertos','seq','maxSeq','somaTempo','pos','ult'].forEach(k=>{if(p[k]!==undefined)up[c+'/jogadores/'+u+'/'+k]=p[k]})});
  up[c+'/estado']=estadoFinal||'resultado';
  return tenta(()=>F.update(F.ref(db),up));
}
async function mudarEstado(e){return tenta(()=>F.set(R(SALA(H.cod)+'/estado'),e))}
async function removerJogador(u){return tenta(()=>F.remove(R(SALA(H.cod)+'/jogadores/'+u)))}
async function encerrarSala(){
  const cod=H.cod;if(!cod)return;
  H.unsub.forEach(u=>{try{u()}catch(_){}});H.unsub=[];
  try{await F.onDisconnect(R(SALA(cod)+'/hostOnline')).cancel()}catch(_){}
  try{await F.remove(R(SALA(cod)))}catch(_){}
  try{await F.remove(R('anfitrioes/'+uid+'/'+cod))}catch(_){}
  H.cod=null;
}

/* ===== ALUNO ===== */
const A={cod:null,unsub:[]};
async function existeSala(cod){
  return tenta(async()=>{await conectar();const s=await F.get(R(SALA(cod)+'/estado'));return s.exists()});
}
async function entrar(cod,apelido,retomando){
  return tenta(async()=>{
    await conectar();
    const est=await F.get(R(SALA(cod)+'/estado'));
    if(!est.exists())throw erro('sem-sala','Não encontrei essa sala. Confira o código no quadro.');
    const eu=await F.get(R(SALA(cod)+'/jogadores/'+uid));
    let nome=apelido;
    if(eu.exists()&&eu.val().apelido){nome=eu.val().apelido;
      await F.update(F.ref(db),{[SALA(cod)+'/jogadores/'+uid+'/online']:true});
    }else{
      if(retomando)throw erro('saiu','Você não está mais nesta sala.');
      const cfg=await F.get(R(SALA(cod)+'/cfg/trancada'));
      if(cfg.val()===true)throw erro('trancada','A partida já começou. Peça ao professor para reabrir a sala.');
      const v=apelidoValido(apelido);if(!v.ok)throw erro('apelido',v.msg);
      nome=v.apelido;
      await F.update(F.ref(db),{[SALA(cod)+'/jogadores/'+uid+'/apelido']:nome,[SALA(cod)+'/jogadores/'+uid+'/online']:true});
    }
    A.cod=cod;
    try{F.onDisconnect(R(SALA(cod)+'/jogadores/'+uid+'/online')).set(false)}catch(_){}
    return {uid,apelido:nome};
  });
}
/* ouvintes: {estado,cfg,rodada,revelacao,eu,host,conexao} cada um recebe o valor (ou null) */
function ouvir(cb){
  const c=SALA(A.cod),m={estado:c+'/estado',cfg:c+'/cfg',rodada:c+'/rodada',revelacao:c+'/revelacao',eu:c+'/jogadores/'+uid,host:c+'/hostOnline'};
  Object.keys(m).forEach(k=>{A.unsub.push(F.onValue(R(m[k]),s=>cb(k,s.exists()?s.val():null),e=>cb('erro',traduzir(e))))});
  A.unsub.push(F.onValue(R('.info/connected'),s=>{
    const ok=!!s.val();cb('conexao',ok);
    if(ok&&A.cod){
      F.update(F.ref(db),{[SALA(A.cod)+'/jogadores/'+uid+'/online']:true}).catch(()=>{});
      try{F.onDisconnect(R(SALA(A.cod)+'/jogadores/'+uid+'/online')).set(false)}catch(_){}
    }
  }));
}
async function responder(op,qi){
  return tenta(()=>F.set(R(SALA(A.cod)+'/respostas/'+uid),{op,t:F.serverTimestamp(),qi}));
}
async function sair(){
  A.unsub.forEach(u=>{try{u()}catch(_){}});A.unsub=[];
  try{if(A.cod&&uid){await F.update(F.ref(db),{[SALA(A.cod)+'/jogadores/'+uid+'/online']:false})}}catch(_){}
  A.cod=null;
}

window.ArenaLive={
  conectar,agora,apelidoValido,traduzir,soDig,
  uid:()=>uid,
  prof:{criarSala,retomarSala,ouvirSala,ouvirConexao,mudarCfg,publicarQuestao,fecharRespostas,publicarResultado,mudarEstado,removerJogador,encerrarSala,codigo:()=>H.cod},
  aluno:{existeSala,entrar,ouvir,responder,sair}
};
})();
