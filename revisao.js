/* MathLab: camada aditiva de revisão espaçada. Precisa de revisao-core.js carregado antes.
   Se este arquivo falhar ou for removido, o app segue como antes.
   O que faz: registra a 1ª resposta de cada questão por assunto e mostra "Para revisar hoje" na página inicial. */
(function(){
'use strict';
try{
if(typeof home!=='function'||typeof MODS==='undefined'||typeof resp!=='function'||!window.MLRevisao)return;
const R=window.MLRevisao;
if(Array.isArray(CAMPOS_PROGRESSO)&&!CAMPOS_PROGRESSO.includes('rev'))CAMPOS_PROGRESSO.push('rev');

const respAntes=resp;
resp=function(i,b){
  let id=null,q=null,antes=0,travado=false;
  try{id=cur&&cur.id;q=Q;antes=tries;travado=locked}catch(e){}
  respAntes.apply(this,arguments);
  try{
    if(!id||!q||travado||antes!==0||q._rv)return; // só a primeira resposta de cada questão
    q._rv=1;
    if(!S.rev||typeof S.rev!=='object'||Array.isArray(S.rev))S.rev={};
    S.rev[id]=R.registrar(S.rev[id],i===q.c,dataLocal());
    save();
  }catch(e){console.warn('revisão',e)}
};

const css=document.createElement('style');
css.textContent=`
#mlRevisao{margin:0 0 1rem;padding:.9rem 1rem;border-radius:14px;border:1px solid var(--bd);background:var(--card);color:var(--tx)}
#mlRevisao h2{margin:0 0 .25rem;font-size:1.05rem}
#mlRevisao p{margin:0 0 .6rem;color:var(--mu);font-size:.9rem}
#mlRevisao .lista{display:flex;flex-wrap:wrap;gap:.5rem}
#mlRevisao button{background:var(--gold);color:#002855;border:0;border-radius:10px;padding:.55rem .9rem;font-weight:800;font:inherit;font-weight:800;cursor:pointer}
#mlRevisao button:focus-visible{outline:3px solid var(--tx);outline-offset:2px}
`;
document.head.appendChild(css);

function prereqDe(id){const m=MODS.find(x=>x.id===id);return m&&m.prereq||[]}
function montar(){
  const velho=document.getElementById('mlRevisao');if(velho)velho.remove();
  if(cur)return;
  const lista=R.devidos(S.rev||{},dataLocal(),prereqDe).filter(i=>MODS.some(m=>m.id===i.id)).slice(0,3);
  if(!lista.length)return;
  const box=document.createElement('section');box.id='mlRevisao';box.setAttribute('aria-label','Para revisar hoje');
  const h=document.createElement('h2');h.textContent='Para revisar hoje';
  const p=document.createElement('p');p.textContent=lista.length===1?'Este assunto já esfriou. Cinco minutos agora ajudam a fixar.':'Estes assuntos já esfriaram. Cinco minutos em cada um ajudam a fixar.';
  const l=document.createElement('div');l.className='lista';
  lista.forEach(i=>{const m=MODS.find(x=>x.id===i.id),b=document.createElement('button');b.type='button';b.textContent=m.nome;b.onclick=()=>abrir(m.id);l.appendChild(b)});
  box.append(h,p,l);
  const topo=document.getElementById('skTopo'),fil=document.getElementById('skFiltros'),main=document.getElementById('main');
  if(topo&&fil&&fil.parentNode===topo)topo.insertBefore(box,fil);else if(main)main.insertBefore(box,main.firstChild);
}
const homeAntes=home;
home=function(){homeAntes.apply(this,arguments);try{montar()}catch(e){console.warn('revisão home',e)}};
if(!cur)home();
}catch(e){console.warn('revisão desativada:',e)}
})();
