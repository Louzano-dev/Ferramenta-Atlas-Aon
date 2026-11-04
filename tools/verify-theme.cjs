const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('node_modules/.cache/playwright-browsers');
const {chromium,webkit,devices}=require('playwright');
const url=pathToFileURL(path.resolve('Atlas.html')).href;

/* Inspect actual computed foregrounds against their composited ancestor surfaces. */
function inspectContrast(){
 const color=text=>{
  const n=(text.match(/[\d.]+/g)||[]).map(Number);
  return n.length>=3?[n[0],n[1],n[2],n.length>3?n[3]:1]:[0,0,0,0];
 };
 const over=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
 const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>{const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
 function surfaces(el){
  const chain=[];for(let node=el;node;node=node.parentElement)chain.unshift(node);
  let colors=[[255,255,255,1]];
  for(const node of chain){
   const s=getComputedStyle(node),bg=color(s.backgroundColor);
   colors=colors.map(c=>over(bg,c));
   if(s.backgroundImage.includes('gradient')){
    const stops=(s.backgroundImage.match(/rgba?\([^)]*\)/g)||[]).map(color);
    if(stops.length)colors=colors.flatMap(c=>stops.map(stop=>over(stop,c))).slice(-8);
   }
  }
  return colors;
 }
 const failures=[],seen=new Set();let checked=0;
 function check(el,text,pseudo){
  const bounds=el.getBoundingClientRect(),s=getComputedStyle(el,pseudo||null);
  if(!el.getClientRects().length||bounds.right<=0||bounds.left>=innerWidth||s.visibility!=='visible'||el.closest('button:disabled,input:disabled,select:disabled,textarea:disabled,[aria-hidden="true"],script,style,svg'))return;
  for(let node=el;node;node=node.parentElement)if(Number(getComputedStyle(node).opacity)<.99)return;
  const token=(el.className?.baseVal||el.className||el.tagName)+'|'+text;
  if(seen.has(token))return;seen.add(token);
  const large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseFloat(s.fontWeight)>=700),minimum=large?3:4.5;
  const backgrounds=surfaces(el),fg=color(s.color),value=Math.min(...backgrounds.map(bg=>ratio(over(fg,bg),bg)));
  checked++;
  if(value<minimum-.04)failures.push({text:text.slice(0,90),classes:String(el.className),color:s.color,backgrounds:backgrounds.map(c=>c.slice(0,3).map(Math.round)),ratio:+value.toFixed(2),minimum});
 }
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode,text=node.nodeValue.trim();if(text)check(node.parentElement,text);
 }
 for(const input of document.querySelectorAll('input:not([type=file]),textarea,select')){
  if(input.value)check(input,'[campo] '+input.value);
  else if(input.placeholder)check(input,'[placeholder] '+input.placeholder,'::placeholder');
 }
 return {checked,failures};
}

(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 let webkitBrowser;
 const report={checks:[],contrast:[],errors:[]};
 const context=await browser.newContext({viewport:{width:1366,height:768},offline:true,reducedMotion:'reduce'}),page=await context.newPage();
 function watch(p){p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});}
 watch(page);
 const mode=()=>page.evaluate(()=>document.documentElement.dataset.atlasTheme);
 async function contrast(name,p=page){
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  let result=await p.evaluate(inspectContrast),settlePasses=0;
  // WebKit may return inherited foregrounds from the previous style flush while
  // the new surface is already computed. Inspect the settled, rendered palette.
  while(result.failures.length&&settlePasses<5){await p.waitForTimeout(60);result=await p.evaluate(inspectContrast);settlePasses++;}
  report.contrast.push({name,...result,settlePasses});
 }
 async function menu(){const button=page.getByRole('button',{name:'Abrir menu',exact:true});if(await button.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await button.click();}
 async function nav(name){await menu();await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();}
 async function logout(){await menu();await page.locator('.atl-side').getByRole('button',{name:'Trocar de perfil',exact:true}).click();}
 async function enter(profile){await page.locator('[data-profile='+profile+']').click();await page.getByRole('button',{name:'Entrar na demonstração'}).click();await page.locator('.atl-top').waitFor();}
 async function layout(p=page){
  assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
  const control=p.locator('[data-atlas-toggle]');assert.equal(await control.count(),1);assert(await control.isVisible());
  const box=await control.boundingBox();assert(box.height>=44&&box.width>=44&&box.x>=0&&box.x+box.width<=p.viewportSize().width+1);
  const header=p.locator('.ac-header');
  if(await header.count()){
   const bounds=await header.locator(':scope > *').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};}));
   for(const b of bounds)assert(b.x>=-.5&&b.right<=p.viewportSize().width+.5);
   for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];assert(Math.min(a.right,b.right)-Math.max(a.x,b.x)<.5||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<.5);}
  }
 }
 try{
  await page.goto(url);await page.locator('[data-atlas-toggle]').waitFor();
  assert.equal(await mode(),'light');
  await page.getByRole('button',{name:'Ativar modo escuro',exact:true}).click();assert.equal(await mode(),'dark');
  assert.equal(await page.locator('[data-atlas-toggle]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>localStorage.getItem('atlas:theme:v1')),'dark');
  assert.equal(await page.locator('meta[name=theme-color]').getAttribute('content'),'#0c1422');
  await page.reload();assert.equal(await mode(),'dark');
  const initial=await page.evaluate(()=>localStorage.getItem('atlas-seguros:v5'));
  report.checks.push('Shared accessible toggle applies dark appearance, browser chrome color and saved preference before reload rendering');
  for(const selected of ['light','dark']){
   await page.evaluate(value=>AtlasAppearance.set(value),selected);await contrast(selected+' entrance');await layout();
   if(selected==='dark')await page.screenshot({path:'tools/atlas-theme-dark-entry.png',fullPage:true});
   await page.locator('[data-profile=cliente]').click();await contrast(selected+' access form');
   await page.getByLabel('Nome',{exact:true}).fill('Helena Prado');await page.getByRole('button',{name:'Entrar na demonstração'}).click();await contrast(selected+' client list');
   await page.locator('[data-sinistro="SIN-2026-001"]').click();await contrast(selected+' client detail, timeline, documents, requests and payments');
   await nav('Comunicar incidente');await page.getByLabel('E-mail',{exact:true}).fill('tema@empresa.exemplo');
   const formValue=await page.getByLabel('E-mail',{exact:true}).inputValue();
   await page.locator('[data-atlas-toggle]').focus();await page.locator('[data-atlas-toggle]').press('Space');await page.locator('[data-atlas-toggle]').press('Enter');assert.equal(await mode(),selected);assert.equal(await page.getByLabel('E-mail',{exact:true}).inputValue(),formValue);
   await contrast(selected+' incident identification and notice');
   await page.getByRole('button',{name:'Continuar',exact:true}).click();
   await page.getByLabel('Tipo de incidente',{exact:true}).selectOption({index:1});await page.getByLabel('Data da ocorrência',{exact:true}).fill('2001-01-01');await page.getByLabel('Descrição',{exact:true}).fill('Descrição fictícia para testar as cores do formulário sem registrar um incidente.');
   await page.getByLabel('Prejuízo estimado',{exact:true}).fill('500000');await page.getByLabel('Prejuízo estimado',{exact:true}).blur();
   await contrast(selected+' incident details and currency');
   await page.getByLabel('Prejuízo estimado',{exact:true}).evaluate(el=>{el.focus();const event=new Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{getData:()=>'-100'}});el.dispatchEvent(event);});
   await contrast(selected+' currency validation error');await page.getByLabel('Prejuízo estimado',{exact:true}).fill('500000');
   await page.getByRole('button',{name:'Continuar',exact:true}).click();await contrast(selected+' attachments');await page.getByRole('button',{name:'Continuar',exact:true}).click();await contrast(selected+' incident review');
   await page.getByRole('button',{name:'← Cancelar',exact:true}).click();
   await logout();await enter('aon');
   for(const name of ['Visão geral','Sinistros','Casos concluídos','Monitoramento','Apólices','Histórico geral','Configurações']){
    await nav(name);await contrast(selected+' Aon '+name);await layout();
    if(name==='Histórico geral'){
     await page.getByRole('button',{name:/^Ver movimentação de/}).first().click();await contrast(selected+' movement dialog');await page.getByRole('button',{name:'Fechar movimentação',exact:true}).click();
    }
   }
   await nav('Sinistros');await page.getByRole('button',{name:'SIN-2026-005',exact:true}).click();
   for(const name of ['Resumo e andamento','Triagem e apólice','Plano de ações','Documentos e solicitações','Seguradora (externa)','Histórico']){
    await page.getByRole('tab',{name,exact:true}).click();await contrast(selected+' case '+name);
   }
   await page.getByRole('tab',{name:'Resumo e andamento',exact:true}).click();
   await page.locator('[data-lifecycle-action=concluir]').click();
   await page.getByRole('button',{name:'Confirmar conclusão',exact:true}).click();await contrast(selected+' lifecycle dialog and validation');
   await page.getByRole('button',{name:'Cancelar',exact:true}).click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-seguros:v5')),initial);
   await nav('Visão geral');
   for(const width of [320,390,768,1366]){await page.setViewportSize({width,height:844});await layout();await contrast(selected+' dashboard '+width);}
   if(selected==='dark'){await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tools/atlas-theme-dark-mobile.png',fullPage:true});await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'tools/atlas-theme-dark-dashboard.png',fullPage:true});}
   await logout();
   for(const width of [320,390,768,1366]){await page.setViewportSize({width,height:844});await layout();await contrast(selected+' entrance '+width);}
   await page.setViewportSize({width:1366,height:768});
  }
  report.checks.push('Light/dark layouts, both profiles, all Aon views, forms, tables, details, dialogs and validation inspected; values and records remain unchanged');
  const blocked=await browser.newContext({viewport:{width:390,height:844},offline:true,reducedMotion:'reduce'});
  await blocked.addInitScript(()=>{
   const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='atlas:theme:v1')throw new DOMException('blocked','SecurityError');return set.call(this,key,value);};
  });
  const bp=await blocked.newPage();watch(bp);await bp.goto(url);await bp.getByRole('button',{name:'Ativar modo escuro',exact:true}).click();assert.equal(await bp.evaluate(()=>document.documentElement.dataset.atlasTheme),'dark');await layout(bp);await blocked.close();
  report.checks.push('Toggle remains usable when saving the appearance preference is blocked');
  webkitBrowser=await webkit.launch({headless:true});
  const wk=await webkitBrowser.newContext({...devices['iPhone 13'],offline:true,reducedMotion:'reduce'}),wp=await wk.newPage();watch(wp);
  await wp.goto(url);await wp.getByRole('button',{name:'Ativar modo escuro',exact:true}).click();await wp.reload();assert.equal(await wp.evaluate(()=>document.documentElement.dataset.atlasTheme),'dark');await layout(wp);await contrast('WebKit dark entrance',wp);
  await wp.locator('[data-profile=cliente]').click();await wp.getByRole('button',{name:'Entrar na demonstração'}).click();await layout(wp);await contrast('WebKit dark client',wp);
  await wp.getByRole('button',{name:'Ativar modo claro',exact:true}).click();assert.equal(await wp.evaluate(()=>document.documentElement.dataset.atlasTheme),'light');await contrast('WebKit light client',wp);
  await wk.close();report.checks.push('Actual WebKit engine in iPhone emulation supports saved appearance, header control and both color palettes');
  assert.deepStrictEqual(report.errors,[]);
  const failures=report.contrast.flatMap(view=>view.failures.map(item=>({view:view.name,...item})));
  assert.equal(failures.length,0,'Contrast issues: '+JSON.stringify(failures.slice(0,20),null,2));
  report.checks.push('Computed contrast checks passed for representative visible text and placeholders across both themes');
  report.checks.forEach(check=>console.log('PASS: '+check));
 }finally{fs.writeFileSync('tools/theme-validation.json',JSON.stringify(report,null,2));await browser.close();if(webkitBrowser)await webkitBrowser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
