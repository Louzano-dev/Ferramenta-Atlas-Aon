/* Isolated company fixtures verify counts, filtering, navigation and responsive KPIs. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const url=pathToFileURL(path.resolve('Atlas.html')).href;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:900},offline:true,reducedMotion:'reduce'}),page=await context.newPage();
 const checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const stat=async key=>Number(await page.locator('[data-stat="'+key+'"] .text-2xl').innerText());
 const raw=()=>page.evaluate(()=>localStorage.getItem('atlas-seguros:v5'));
 async function nav(name){
  const menu=page.getByRole('button',{name:'Abrir menu',exact:true});
  if(await menu.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await menu.click();
  await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();
 }
 async function update(state){
  await page.evaluate(state=>{const raw=JSON.stringify(state);localStorage.setItem('atlas-seguros:v5',raw);window.dispatchEvent(new StorageEvent('storage',{key:'atlas-seguros:v5',newValue:raw}));},state);
 }
 const selector=()=>page.getByLabel('Filtrar por cliente',{exact:true});
 async function select(name){
  const value=await selector().locator('option').evaluateAll((options,name)=>options.find(el=>el.textContent.includes(name)).value,name);
  await selector().selectOption(value);return value;
 }
 try{
  await page.goto(url);
  const state=await page.evaluate(()=>{
   const seed=seedSinistros(),names=['Álfa Serviços S.A.','  ALFA  SERVIÇOS S.A.  ','Alfa Serviços S.A.','Beta Comércio Ltda.','Gama Encerrada S.A.'];
   const cases=names.map((name,i)=>({...seed[i],id:'FILTER-00'+(i+1),segurado:name,encerrado:null,solicitacoes:[],documentos:[],tarefas:[],valorEstimado:i===3?9999999999.99:100000*(i+1),historico:[{ts:'2026-11-04T12:00:00.000Z',texto:(i<3?'Documento recebido de ':'Indenização registrada para ')+name,perfil:'Aon',por:i<3?'Analista Alpha':'Analista Beta',interno:false}]}));
   for(const i of [2,4])cases[i].encerrado={ts:'2026-11-04T13:00:00.000Z',por:'Teste Filtro',nota:'Conclusão demonstrativa'};
   cases[0].tarefas=[{id:'FILTER-TASK-A',titulo:'Ação Alpha exclusiva',status:'Aberta',responsavel:'Teste Filtro',etapa:'Triagem',prazo:'2001-01-01'}];
   cases[3].tarefas=[{id:'FILTER-TASK-B',titulo:'Ação Beta exclusiva',status:'Aberta',responsavel:'Teste Filtro',etapa:'Triagem',prazo:'2001-01-01'}];
   cases[1].documentos=[{...seed[0].documentos[0],id:'FILTER-DOC',nome:'Documento pendente Alpha',estado:'Pendente',arquivos:[]}];
   const state={v:5,sinistros:cases,apolices:seedApolices()};
   localStorage.setItem('atlas-seguros:v5',JSON.stringify(state));sessionStorage.setItem('atlas-seguros:sessao',JSON.stringify({perfil:'aon',nome:'Teste Filtro',empresa:'Aon (corretora)'}));return state;
  });
  await page.reload();await page.locator('[data-stat=clientes]').waitFor();
  const initialRaw=await raw();
  assert.equal(await stat('clientes'),3);assert.equal(await stat('total'),5);assert.equal(await stat('ativos'),3);assert.equal(await stat('concluidos'),2);
  assert.equal(await selector().locator('option').count(),4);
  await page.locator('[data-stat=clientes]').click();assert.equal(await selector().evaluate(el=>el===document.activeElement),true);
  checks.push('Unique client card deduplicates accents/case/spacing and counts closed-only clients, without counting policies');
  const alphaKey=await select('Serviços');
  assert.equal(await stat('clientes'),1);assert.equal(await stat('total'),3);assert.equal(await stat('ativos'),2);assert.equal(await stat('concluidos'),1);assert.equal(await stat('acoes'),1);assert.equal(await stat('pend'),1);
  assert.equal(await selector().locator('option').count(),4);
  const amounts=await page.locator('[data-stat=exposicao] .text-2xl').innerText();assert(amounts.replace(/\s/g,'').includes('300.000,00'));
  const charts=await page.locator('[data-chart="Por tipo de incidente"] [data-valor]').evaluateAll(rows=>rows.reduce((sum,el)=>sum+Number(el.dataset.valor),0));assert.equal(charts,3);
  await page.locator('[data-stat=ativos]').click();
  assert.equal(await selector().inputValue(),alphaKey);
  let ids=await page.locator('tr[data-sinistro]').evaluateAll(rows=>rows.map(el=>el.dataset.sinistro));assert.deepStrictEqual(ids.sort(),['FILTER-001','FILTER-002']);
  await page.getByLabel('Buscar',{exact:true}).fill('Beta');assert.equal(await page.locator('tr[data-sinistro]').count(),0);
  await page.getByLabel('Buscar',{exact:true}).fill('');await page.getByRole('checkbox',{name:'Só com documentos pendentes',exact:true}).click();
  assert.deepStrictEqual(await page.locator('tr[data-sinistro]').evaluateAll(rows=>rows.map(el=>el.dataset.sinistro)),['FILTER-002']);
  await page.getByRole('checkbox',{name:'Só com documentos pendentes',exact:true}).click();
  await page.getByRole('button',{name:'FILTER-001',exact:true}).click();assert.equal(await selector().count(),0);
  await page.getByRole('button',{name:'← Sinistros',exact:true}).click();assert.equal(await selector().inputValue(),alphaKey);
  checks.push('Client selection filters all dashboard metrics/charts and combines with list search/pending filters; details return preserves selection');
  await nav('Casos concluídos');assert.equal(await selector().inputValue(),alphaKey);
  assert.deepStrictEqual(await page.locator('[data-concluido]').evaluateAll(rows=>rows.map(el=>el.dataset.concluido)),['FILTER-003']);
  await nav('Histórico geral');assert.deepStrictEqual((await page.locator('[data-history-case]').evaluateAll(rows=>rows.map(el=>el.dataset.historyCase))).sort(),['FILTER-001','FILTER-002','FILTER-003']);
  await page.getByLabel('Filtrar histórico',{exact:true}).fill('Beta');assert.equal(await page.locator('[data-history-case]').count(),0);
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();assert.equal(await selector().inputValue(),alphaKey);
  await page.getByLabel('Responsável pela movimentação',{exact:true}).selectOption('Analista Alpha');
  await page.getByLabel('Tipo de movimentação',{exact:true}).selectOption('Documentos');
  await select('Beta');
  assert.equal(await page.getByLabel('Responsável pela movimentação',{exact:true}).inputValue(),'');
  assert.equal(await page.getByLabel('Tipo de movimentação',{exact:true}).inputValue(),'');
  assert.deepStrictEqual(await page.locator('[data-history-case]').evaluateAll(rows=>rows.map(el=>el.dataset.historyCase)),['FILTER-004']);
  await selector().selectOption(alphaKey);
  await nav('Monitoramento');assert((await page.getByRole('main').innerText()).includes('Ação Alpha exclusiva'));assert(!(await page.getByRole('main').innerText()).includes('Ação Beta exclusiva'));
  await nav('Visão geral');await select('Gama');assert.equal(await stat('clientes'),1);assert.equal(await stat('ativos'),0);assert.equal(await stat('concluidos'),1);
  await page.locator('[data-stat=ativos]').click();assert.equal(await page.locator('tr[data-sinistro]').count(),0);
  await nav('Casos concluídos');assert.deepStrictEqual(await page.locator('[data-concluido]').evaluateAll(rows=>rows.map(el=>el.dataset.concluido)),['FILTER-005']);
  assert.equal(await raw(),initialRaw);
  checks.push('Completed/history/monitor views respect the same client, including a company with only concluded cases; filtering never mutates storage');
  await nav('Visão geral');await page.getByRole('button',{name:'Limpar filtro de cliente',exact:true}).click();
  assert.equal(await stat('clientes'),3);assert.equal(await stat('total'),5);
  for(const width of [320,390,768,1366,1920]){
   await page.setViewportSize({width,height:900});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   const input=selector(),box=await input.boundingBox();assert(box.height>=44&&box.x>=0&&box.x+box.width<=width+1);assert(Number(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)))>=16);
   const clipped=await page.locator('[data-stat] .text-2xl').evaluateAll(els=>els.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>({stat:el.parentElement.dataset.stat,text:el.textContent,width:el.clientWidth,scrollWidth:el.scrollWidth,whiteSpace:getComputedStyle(el).whiteSpace,overflowWrap:getComputedStyle(el).overflowWrap})));assert.deepStrictEqual(clipped,[],width+'px: '+JSON.stringify(clipped));
   if(width===390)await page.screenshot({path:'tools/atlas-client-filter-mobile.png',fullPage:true});
   if(width===1366)await page.screenshot({path:'tools/atlas-client-filter-desktop.png',fullPage:true});
  }
  checks.push('Filter and large currency KPI fit 320/390/768/1366/1920px without clipped values');
  const key=await select('Serviços');
  const expanded={...state,sinistros:[...state.sinistros,{...state.sinistros[3],id:'FILTER-006',segurado:'Zeta Nova S.A.'}]};
  await update(expanded);await page.waitForFunction(()=>document.querySelector('[aria-label="Filtrar por cliente"]').options.length===5);
  assert.equal(await selector().inputValue(),key);assert.equal(await stat('clientes'),1);
  await page.getByRole('button',{name:'Limpar filtro de cliente',exact:true}).click();assert.equal(await stat('clientes'),4);
  await select('Zeta');await update(state);await page.waitForFunction(()=>document.querySelector('[aria-label="Filtrar por cliente"]').value==='');
  assert.equal(await stat('clientes'),3);assert.equal(await stat('total'),5);
  checks.push('Client options/counts follow new records and recover safely when selected company disappears');
  assert.deepStrictEqual(errors,[]);fs.writeFileSync('tools/client-filter-validation.json',JSON.stringify({checks,errors},null,2));checks.forEach(check=>console.log('PASS: '+check));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
