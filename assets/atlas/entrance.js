/* Presentation layer only. The operational Atlas contract stays in Landing/onEnter. */
function AtlasSymbol({ className = '' }) {
  return rce('svg', {viewBox:'0 0 128 108',className:'ac-symbol '+className,'aria-hidden':true,focusable:'false'},
    rce('path',{fill:'#10213A',d:'M65 3 121 103H96L65 47 34 103H9Z'}),
    rce('path',{className:'ac-swoosh',d:'M6 100C-1 88 27 63 59 51C75 45 92 41 110 39L111 46C90 48 68 55 47 66C24 78 9 90 6 100Z',style:{fill:'#EB0017',stroke:'none'}}),
    rce('circle',{cx:120,cy:40,r:6.5,fill:'#EB0017'}));
}
function AtlasBrand({className=''}={}){return rce('div',{className:'ac-brand '+className,role:'img','aria-label':'Atlas'},rce(AtlasSymbol),rce('span',null,'ATLAS'));}
function AonSignature(){return rce('img',{className:'ac-aon',src:'assets/atlas/aon.svg',alt:'Aon'});}
function AtlasEarth(){
  const host=useRef(null);
  useEffect(()=>{
    const el=host.current;
    const pause=()=>el.classList.toggle('is-paused',document.hidden);
    const observer=new IntersectionObserver(entries=>el.classList.toggle('is-offscreen',!entries[0].isIntersecting));
    observer.observe(el);document.addEventListener('visibilitychange',pause);pause();
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',pause);};
  },[]);
  return rce('div',{className:'ac-earth-photo',ref:host,'aria-hidden':true},rce('img',{src:'assets/atlas/earth-horizon.png',alt:'',className:'ac-earth-image',decoding:'async'}));
}
function Landing({onEnter}){
  const [perfil,setPerfil]=useState(null),[nome,setNome]=useState(''),[empresa,setEmpresa]=useState(''),[erro,setErro]=useState(''),[busy,setBusy]=useState(false);
  const content=useRef(null),selectButton=useRef(null);
  useEffect(()=>{
    const el=content.current;
    if(perfil){el.querySelector('input')?.focus({preventScroll:true});}else if(selectButton.current){el.querySelector('[data-profile="'+selectButton.current+'"]')?.focus({preventScroll:true});}
  },[perfil]);
  function trocar(p){
    if(busy)return;
    setPerfil(p);setErro('');if(p){selectButton.current=p;setNome(p==='cliente'?'Helena Prado':'Vitor Louzano');setEmpresa(p==='cliente'?SEGURADOS_DEMO[0]:'Aon (corretora)');}
  }
  function entrar(e){
    e.preventDefault();if(busy)return;if(nome.trim().length<2){setErro('Informe o seu nome (fictício).');return;}if(!empresa.trim()){setErro('Informe a empresa.');return;}
    const canonica=SEGURADOS_DEMO.find(x=>norm(x)===norm(empresa));const session={perfil,nome:nome.trim(),empresa:perfil==='aon'?'Aon (corretora)':canonica||empresa.trim()};setBusy(true);
    onEnter(session);
  }
  const building=rce('svg',{viewBox:'0 0 40 40',fill:'none',stroke:'currentColor',strokeWidth:2,'aria-hidden':true},rce('path',{d:'M4 36h32M9 36V14h8V5h15v31M17 14v22M22 10h4m-4 6h4m-4 6h4m-4 6h4M12 19h2m-2 6h2m-2 5h2'}));
  return rce('div',{className:'atlas-cinema'},
    rce('img',{className:'ac-statue',src:'assets/atlas/atlas-statue.png',alt:'', 'aria-hidden':true}),rce('div',{className:'ac-light'}),rce('div',{className:'ac-orbit-bg'}),
    rce('header',{className:'ac-header'},rce(AonSignature),rce('span',{className:'ac-divider'}),rce(AtlasBrand),rce(AtlasThemeToggle,{className:'at-theme-entrance'})),
    rce('main',{className:'ac-layout'},rce('section',{className:'ac-identity','aria-label':'Atlas: Gestão Inteligente de Sinistros Cyber'},rce(AtlasSymbol,{className:'ac-hero-symbol'}),rce('div',{className:'ac-rule'}),rce('p',{className:'ac-tagline'},'Gestão Inteligente de ',rce('br'),'Sinistros Cyber')),
    rce('section',{className:'ac-access','aria-label':'Acesso à plataforma'},rce('div',{className:'ac-panel'},rce('div',{className:'ac-panel-content',ref:content},
      !perfil?rce(React.Fragment,null,rce('div',{className:'ac-rule'}),rce('h1',null,'Como deseja acessar?'),rce('div',{className:'ac-profiles'},[['cliente','Sou uma empresa segurada'],['aon','Sou da Aon']].map(([p,t])=>rce('button',{key:p,type:'button',className:'ac-profile','data-profile':p,onClick:()=>trocar(p)},rce('span',{className:'ac-profile-icon'},p==='cliente'?building:rce(AonSignature)),rce('span',{className:'ac-profile-copy'},rce('strong',null,p==='cliente'?rce(React.Fragment,null,'Sou uma',rce('br'),'empresa segurada'):t),rce('small',null,p==='cliente'?rce(React.Fragment,null,'Comunique incidentes',rce('br'),'e acompanhe seu caso.'):rce(React.Fragment,null,'Organize documentos',rce('br'),'e acompanhe os casos.'))),rce('span',{className:'ac-arrow','aria-hidden':true},'›'))))):
      rce(React.Fragment,null,rce('button',{type:'button',className:'ac-back',disabled:busy,onClick:()=>trocar(null)},'← Voltar aos perfis'),rce('div',{className:'ac-demo'},'Protótipo de demonstração'),rce('div',{className:'ac-rule'}),rce('h1',null,perfil==='cliente'?'Acesso Cliente':'Acesso Aon'),rce('form',{className:'ac-form',onSubmit:entrar,'aria-busy':busy},rce('p',{className:'ac-form-help'},'Use somente dados fictícios. Esta demonstração não possui senha nem autenticação real.'),rce('label',null,'Seu nome (fictício)',rce('input',{className:'input',value:nome,onChange:e=>setNome(e.target.value),'aria-label':'Nome',autoComplete:'off',disabled:busy,'aria-invalid':!!erro,'aria-describedby':erro?'ac-error':undefined})),perfil==='cliente'&&rce('label',null,'Empresa segurada',rce('input',{className:'input',list:'empresas-demo',value:empresa,onChange:e=>setEmpresa(e.target.value),'aria-label':'Empresa',disabled:busy}),rce('datalist',{id:'empresas-demo'},SEGURADOS_DEMO.map(x=>rce('option',{key:x,value:x})))),perfil==='cliente'&&rce('p',{className:'ac-form-help'},'Escolha uma empresa de exemplo ou digite outra. A visualização por empresa é um filtro demonstrativo.'),erro&&rce('p',{id:'ac-error',role:'alert',className:'ac-error'},erro),rce('button',{type:'submit',className:BTN_PRIMARY+' ac-submit',disabled:busy},busy?'Abrindo plataforma…':'Entrar na demonstração →')))),
      rce('footer',{className:'ac-panel-foot'},'Plataforma Atlas · Uma solução da Aon',rce('br'), 'Protótipo acadêmico · Dados fictícios')),
      rce('aside',{className:'ac-space','aria-label':'Visão da Terra'},rce(AtlasEarth),rce('svg',{className:'ac-earth-orbit',viewBox:'0 0 395 677',preserveAspectRatio:'none','aria-hidden':true},rce('defs',null,rce('radialGradient',{id:'ac-orbit-glow'},rce('stop',{offset:'0%',stopColor:'#fff'}),rce('stop',{offset:'25%',stopColor:'#ff7585'}),rce('stop',{offset:'100%',stopColor:'#eb0017',stopOpacity:0}))),rce('path',{d:'M-20 360 Q190 238 410 232',fill:'none',stroke:'#EB0017',strokeWidth:1.6}),rce('circle',{cx:322,cy:235,r:15,fill:'url(#ac-orbit-glow)'}),rce('circle',{cx:322,cy:235,r:2.5,fill:'#fff'}))))),
    rce('footer',{className:'ac-legal'},rce('span',null,'Demonstração local · A análise de cobertura e a indenização são responsabilidades da seguradora.'),rce(LinksLegais)));
}
