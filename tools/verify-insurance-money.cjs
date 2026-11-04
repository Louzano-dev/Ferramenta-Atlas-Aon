/* Verify real-time formatting and numeric integrity in the Aon money fields. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('node_modules/.cache/playwright-browsers');
const {chromium,webkit,devices}=require('playwright');
const url=pathToFileURL(path.resolve('Atlas.html')).href;
(async()=>{
 const report={checks:[],scenarios:[],errors:[]};const browsers={};
 const scenarios=[{name:'Chrome desktop',engine:'chromium',options:{viewport:{width:1366,height:900}}},{name:'Chrome Android emulation',engine:'chromium',options:devices['Pixel 7']},{name:'WebKit iPhone emulation',engine:'webkit',options:devices['iPhone 13']}];
 try{
  for(const scenario of scenarios){
   if(!browsers[scenario.engine])browsers[scenario.engine]=await(scenario.engine==='webkit'?webkit.launch({headless:true}):chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}));
   const context=await browsers[scenario.engine].newContext({...scenario.options,offline:true,reducedMotion:'reduce'}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(scenario.name+': '+e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   async function menu(){await page.locator('.atl-top').waitFor();const toggle=page.getByRole('button',{name:'Abrir menu',exact:true});if(await toggle.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await toggle.click();}
   async function nav(name){await menu();await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();}
   async function open(){await nav('Sinistros');if(page.viewportSize().width>=768)await page.getByRole('button',{name:'SIN-2026-005',exact:true}).click();else await page.getByRole('button',{name:/SIN-2026-005/}).click();await page.getByRole('tab',{name:'Seguradora (externa)',exact:true}).click();}
   const amount=label=>page.getByLabel(label,{exact:true});
   async function typeWhole(label,digits,expected){
    const input=amount(label);await input.fill('');await input.pressSequentially(digits);assert.equal(await input.inputValue(),expected,label+' must be formatted before blur');assert(await input.evaluate(el=>el===document.activeElement));
   }
   async function save(){await page.getByRole('button',{name:'Atualizar registro de indenização',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.id==='SIN-2026-005').indenizacao.valorAprovado===50);}
   const record=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.id==='SIN-2026-005'));
   await page.goto(url);
   await page.locator('[data-profile=aon]').waitFor();
   await page.waitForFunction(()=>!!localStorage.getItem('atlas-seguros:v5'));
   await page.evaluate(()=>{
    const cases=seedSinistros(),s=cases.find(s=>s.id==='SIN-2026-005');s.indenizacao={...s.indenizacao,status:'Pagamento parcial',valorAprovado:40000.75,valorPago:12345.5,dataPagamento:'2001-01-01'};
    localStorage.setItem('atlas-seguros:v5',JSON.stringify({v:5,sinistros:cases,apolices:seedApolices()}));sessionStorage.setItem('atlas-seguros:sessao',JSON.stringify({perfil:'aon',nome:'Teste Valores',empresa:'Aon (corretora)'}));
   });
   await page.reload();await page.locator('.atl-top').waitFor();await open();
   assert.equal(await amount('Valor aprovado').inputValue(),'40.000,75');assert.equal(await amount('Valor pago').inputValue(),'12.345,50');
   await page.getByRole('button',{name:'Atualizar registro de indenização',exact:true}).click();
   let saved=await record();assert.strictEqual(saved.indenizacao.valorAprovado,40000.75);assert.strictEqual(saved.indenizacao.valorPago,12345.5);
   const before=JSON.parse(JSON.stringify(saved));
   await typeWhole('Valor aprovado','5','5,00');await amount('Valor aprovado').pressSequentially('0');assert.equal(await amount('Valor aprovado').inputValue(),'50,00');
   await amount('Valor aprovado').press('Backspace');assert.equal(await amount('Valor aprovado').inputValue(),'5,00');await amount('Valor aprovado').press('Backspace');assert.equal(await amount('Valor aprovado').inputValue(),'');
   await typeWhole('Valor aprovado','5000000','5.000.000,00');
   const fractionSelection=await amount('Valor aprovado').evaluate(el=>{el.dispatchEvent(new KeyboardEvent('keydown',{key:',',bubbles:true,cancelable:true}));return {start:el.selectionStart,end:el.selectionEnd,comma:el.value.indexOf(',')};});assert.equal(fractionSelection.start,fractionSelection.comma+1);assert.equal(fractionSelection.end,fractionSelection.comma+3);
   await amount('Valor aprovado').pressSequentially('75');assert.equal(await amount('Valor aprovado').inputValue(),'5.000.000,75');
   await typeWhole('Valor aprovado','50','50,00');await typeWhole('Valor pago','30','30,00');await save();
   saved=await record();assert.strictEqual(saved.indenizacao.valorAprovado,50);assert.strictEqual(saved.indenizacao.valorPago,30);assert.deepStrictEqual(saved.cobertura,before.cobertura);assert.deepStrictEqual(saved.encaminhamento,before.encaminhamento);
   const texts=await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('atlas-seguros:v5')),s=state.sinistros.find(s=>s.id==='SIN-2026-005');return buildCaseReportModel(s,state.sinistros,'Teste Valores',nowTs(),state.apolices).sections.flatMap(section=>section.blocks.map(block=>block.text)).join('\n');});assert(texts.replace(/\s/g,'').includes('R$50,00'));assert(texts.replace(/\s/g,'').includes('R$30,00'));
   await page.reload();await open();assert.equal(await amount('Valor aprovado').inputValue(),'50,00');assert.equal(await amount('Valor pago').inputValue(),'30,00');
   await page.getByRole('button',{name:'Atualizar registro de indenização',exact:true}).click();saved=await record();assert.strictEqual(saved.indenizacao.valorAprovado,50);assert.strictEqual(saved.indenizacao.valorPago,30);
   await nav('Apólices');await typeWhole('Limite','500000','500.000,00');await typeWhole('Franquia','50','50,00');
   await page.getByLabel('Número da apólice',{exact:true}).fill('AP-MONEY-TEST');await page.getByLabel('Empresa da apólice',{exact:true}).fill('Varejo Horizonte S.A.');await page.getByLabel('Início da vigência',{exact:true}).fill('2026-01-01');await page.getByLabel('Fim da vigência',{exact:true}).fill('2026-12-31');await page.getByRole('checkbox',{name:'Resposta a incidentes',exact:true}).click();await page.getByRole('button',{name:'Cadastrar apólice',exact:true}).click();
   const policy=await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).apolices.find(a=>a.numero==='AP-MONEY-TEST'));assert.strictEqual(policy.limite,500000);assert.strictEqual(policy.franquia,50);
   await nav('Registrar comunicação');await page.getByLabel('Empresa segurada',{exact:true}).fill('Varejo Horizonte S.A.');await page.getByLabel('Responsável pelo contato',{exact:true}).fill('Teste Valores');await page.getByLabel('E-mail',{exact:true}).fill('valores@empresa.exemplo');await page.getByRole('button',{name:'Continuar',exact:true}).click();await typeWhole('Prejuízo estimado','50','50,00');
   const input=amount('Prejuízo estimado');await input.fill('');
   for(const digit of ['5','0']){
    await input.evaluate((el,digit)=>{el.focus();el.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:digit}));},digit);
   }
   assert.equal(await input.inputValue(),'50,00');
   for(const width of [320,390,768,1366]){await page.setViewportSize({width,height:844});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));const box=await input.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1&&box.height>=44);}
   report.scenarios.push({name:scenario.name,approved:50,paid:30,limit:500000,deductible:50,preloadedFractionsPreserved:true,immediateFormatting:true});
   console.log('PASS: '+scenario.name+' formats all five money fields immediately and persists exact reais/cents');await context.close();
  }
  assert.deepStrictEqual(report.errors,[]);report.checks=['50 becomes 50,00 before blur in approved, paid, estimate, limit and deductible','Preloaded decimal values survive untouched saves; reais are not reinterpreted as cents','Comma editing and Backspace to empty work; keyboard beforeinput works','Numeric values survive save/reload and appear correctly in PDF report data'];
 }finally{fs.writeFileSync('tools/insurance-money-validation.json',JSON.stringify(report,null,2));for(const browser of Object.values(browsers))await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
