/* MathLab UX v4.9 - camada aditiva: busca de assuntos, aviso do modo professor,
   rodapé com ação. Se este arquivo falhar ou for removido, o app segue como antes. */
(function(){
'use strict';
try{
if(typeof home!=='function'||typeof MODS==='undefined')return;

const sem=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function textoBusca(m){
  let ano='';try{ano=(typeof rotuloAno==='function'?rotuloAno(m.ano):m.ano+'º ano')}catch(e){}
  let eixo='',bncc='';
  try{const r=(typeof REG!=='undefined'&&REG[m.id])||{};eixo=r.eixo||'';bncc=(r.bncc||[]).join(' ')}catch(e){}
  return sem([m.nome,m.sub,m.id,ano,m.eixo,eixo,m.bncc&&m.bncc.join(' '),bncc].join(' '));
}
let indice=null;
function indic(){if(!indice)indice=MODS.map(m=>({m,t:textoBusca(m)}));return indice}
function buscar(q){
  const ps=sem(q).split(/\s+/).filter(Boolean);if(!ps.length)return [];
  const pt=ps.join(' ');
  const nota=x=>{const n=sem(x.m.nome);let k=0;if(n.startsWith(pt))k+=4;else if(n.includes(pt))k+=3;else if(ps.every(p=>n.includes(p)))k+=2;if(sem(x.m.sub).includes(pt))k+=1;return k};
  return indic().filter(x=>ps.every(p=>x.t.includes(p))).map((x,i)=>({m:x.m,k:nota(x),i})).sort((a,b)=>b.k-a.k||a.i-b.i).map(x=>x.m);
}

const css=document.createElement('style');
css.textContent=`
#mlBusca{margin:0 0 1rem}
#mlBusca label{display:block;font-size:.85rem;color:var(--mu);margin-bottom:.3rem}
#mlBusca input{width:100%;box-sizing:border-box;padding:.75rem 1rem;border-radius:12px;border:1px solid var(--bd);background:var(--card);color:var(--tx);font:inherit;font-size:1rem}
#mlBusca input:focus{outline:3px solid var(--gold);outline-offset:1px}
#mlRes{display:none;margin:0 0 1rem}
#mlRes .cards{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
#mlRes .vazio{color:var(--mu)}
body.mlBuscando #mlRes{display:block}
body.mlBuscando #main>*:not(#mlBusca):not(#mlRes):not(#skTopo){display:none!important}
body.mlBuscando #skTopo>*:not(#mlBusca):not(#mlRes){display:none!important}
#mlAvisoProf{position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);z-index:60;max-width:92vw;background:var(--card);color:var(--tx);border:2px solid var(--gold);border-radius:14px;padding:.8rem 1rem;box-shadow:0 8px 30px rgba(0,0,0,.5);display:flex;gap:.8rem;align-items:center;flex-wrap:wrap}
#mlAvisoProf button{background:var(--gold);color:#002855;border:0;border-radius:10px;padding:.5rem .9rem;font-weight:800;cursor:pointer}
.mlComecar{background:var(--gold);color:#002855;border:0;border-radius:12px;padding:.8rem 1.2rem;font-weight:800;font-size:1rem;cursor:pointer}
`;
document.head.appendChild(css);

function montarBusca(){
  const main=$('main');if(!main||cur)return;
  document.body.classList.remove('mlBuscando');
  const old=$('mlBusca');if(old)old.remove();const oldR=$('mlRes');if(oldR)oldR.remove();
  const box=document.createElement('div');box.id='mlBusca';box.setAttribute('role','search');
  box.innerHTML='<label for="mlBuscaIn">Buscar assunto, tema ou código BNCC</label><input id="mlBuscaIn" type="search" autocomplete="off" placeholder="Ex.: Pitágoras, frações, juros, EF07MA18">';
  const res=document.createElement('div');res.id='mlRes';res.setAttribute('aria-live','polite');
  const skTopo=$('skTopo'),skFiltros=$('skFiltros');
  if(skTopo&&skFiltros&&skFiltros.parentNode===skTopo){
    skTopo.insertBefore(box,skFiltros);
    skTopo.insertBefore(res,skFiltros);
  }else{
    main.insertBefore(res,main.firstChild);main.insertBefore(box,main.firstChild);
  }
  const inp=box.querySelector('input');
  function atualizar(){
    const q=inp.value.trim();
    if(!q){document.body.classList.remove('mlBuscando');res.innerHTML='';return}
    const L=buscar(q);document.body.classList.add('mlBuscando');
    res.innerHTML=L.length
      ?`<p class="vazio">${L.length} ${L.length===1?'assunto encontrado':'assuntos encontrados'}</p><div class="cards">`+L.slice(0,24).map(m=>{
         let ano='';try{ano=rotuloAno(m.ano)}catch(e){}
         return `<button class="mod" onclick="abrir('${m.id}')"><span class="ic">${m.ic||''}</span><b>${m.nome}</b><small>${m.sub||''}</small><small>${ano}</small></button>`}).join('')+'</div>'
      :'<p class="vazio">Nenhum assunto com esses termos. Tente uma palavra só, como "área" ou "função".</p>';
    if(document.body.classList.contains('sk')&&typeof window.__mlDecorarCard==='function'){
      res.querySelectorAll('.mod[onclick^="abrir("]').forEach(window.__mlDecorarCard);
    }
  }
  inp.addEventListener('input',atualizar);
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){const L=buscar(inp.value);if(L.length){e.preventDefault();abrir(L[0].id)}}
    if(e.key==='Escape'){inp.value='';atualizar()}
  });
}

function acaoRodape(){
  const main=$('main');if(!main)return;
  [...main.querySelectorAll('p')].forEach(p=>{
    if(/Resolva alguns desafios/.test(p.textContent)&&!p.querySelector('button')){
      const m=MODS.find(x=>x.id==='nat')||MODS.find(x=>x.ano===6)||MODS[0];
      p.innerHTML='Ainda não há erros para mostrar. ';
      const b=document.createElement('button');b.className='mlComecar';b.textContent='🚀 Começar pelo 1º desafio →';
      b.onclick=()=>abrir(m.id);p.appendChild(document.createElement('br'));p.appendChild(b);
    }
  });
}

const homeAntes=home;
home=function(){
  homeAntes.apply(this,arguments);
  try{montarBusca();acaoRodape()}catch(e){console.warn('ml-ux home',e)}
};
if(!cur)home();

/* aviso 2 min antes de o modo professor expirar */
let avisoAtivo=false;
function avisoProf(){
  try{
    if(!S.modoProfessor||typeof PROF_INATIVO_MS==='undefined'){const a=$('mlAvisoProf');if(a)a.remove();avisoAtivo=false;return}
    const resta=PROF_INATIVO_MS-(Date.now()-(S.modoProfAtividade||0));
    if(resta>0&&resta<=120000){
      if(avisoAtivo)return;avisoAtivo=true;
      const a=document.createElement('div');a.id='mlAvisoProf';a.setAttribute('role','status');
      a.innerHTML='<span>O modo professor encerra em 2 minutos por inatividade.</span><button type="button">Continuar no modo professor</button>';
      a.querySelector('button').onclick=()=>{S.modoProfAtividade=Date.now();save();a.remove();avisoAtivo=false};
      document.body.appendChild(a);
    }else if(avisoAtivo){const a=$('mlAvisoProf');if(a)a.remove();avisoAtivo=false}
  }catch(e){}
}
setInterval(avisoProf,15000);
window.__mlUx={buscar};
}catch(e){console.warn('ml-ux desativado:',e)}
})();
