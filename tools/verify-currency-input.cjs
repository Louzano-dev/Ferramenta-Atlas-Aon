/* Browser checks for the estimate's displayed amount and persisted numeric value. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('node_modules/.cache/playwright-browsers');
const {chromium,webkit,devices}=require('playwright');
const url=pathToFileURL(path.resolve('Atlas.html')).href;
const scenarios=[
  {name:'Chrome desktop client',profile:'cliente',engine:'chromium',options:{viewport:{width:1366,height:768}},value:'5000000,75',expected:5000000.75,detailed:true},
  {name:'Chrome Pixel 7 client',profile:'cliente',engine:'chromium',options:devices['Pixel 7'],value:'500000',expected:500000},
  {name:'WebKit iPhone 13 client',profile:'cliente',engine:'webkit',options:devices['iPhone 13'],value:'1234567,89',expected:1234567.89},
  {name:'Chrome desktop Aon',profile:'aon',engine:'chromium',options:{viewport:{width:1366,height:768}},value:'500000',expected:500000}
];
(async()=>{
 const browsers={},report={checks:[],scenarios:[],errors:[]};
 try{
  for(const scenario of scenarios){
   if(!browsers[scenario.engine])browsers[scenario.engine]=await(scenario.engine==='webkit'?webkit.launch({headless:true}):chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}));
   const context=await browsers[scenario.engine].newContext({...scenario.options,offline:true,reducedMotion:'reduce'}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(scenario.name+': '+e.message));
   const next=()=>page.getByRole('button',{name:'Continuar',exact:true}).click();
   async function start(){
    if(scenario.profile==='cliente')await page.getByRole('button',{name:'Comunicar incidente Cyber',exact:true}).click();
    else{
     await page.locator('.atl-nav').getByRole('button',{name:'Registrar comunicação',exact:true}).click();
     await page.getByLabel('Empresa segurada',{exact:true}).fill('Varejo Horizonte S.A.');
     await page.getByLabel('Responsável pelo contato',{exact:true}).fill('Teste de valor');
    }
    await page.getByLabel('E-mail',{exact:true}).fill('valor@empresa.exemplo');
    await next();
    await page.getByLabel('Tipo de incidente',{exact:true}).selectOption({index:1});
    await page.getByLabel('Data da ocorrência',{exact:true}).fill('2001-01-01');
    await page.getByLabel('Descrição',{exact:true}).fill('Incidente fictício para conferir a formatação e o valor estimado informado.');
   }
   async function paste(input,text){
    await input.focus();
    await input.evaluate((el,text)=>{
     el.setSelectionRange(0,el.value.length);
     const event=new Event('paste',{bubbles:true,cancelable:true});
     Object.defineProperty(event,'clipboardData',{value:{getData:()=>text}});
     el.dispatchEvent(event);
    },text);
   }
   async function save(expected){
    await next();await next();
    const review=page.getByText('Prejuízo estimado',{exact:true}).locator('..');
    if(expected===null)assert((await review.innerText()).includes('Não sei informar'));
    else assert((await review.innerText()).replace(/\s/g,'').includes(expected.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}).replace(/\s/g,'')));
    await page.getByRole('main').getByRole('button',{name:'Registrar comunicação',exact:true}).click();
    await page.waitForFunction(({expected})=>{
     const list=JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros;
     return list.some(s=>s.descricao==='Incidente fictício para conferir a formatação e o valor estimado informado.'&&s.valorEstimado===expected);
    },{expected});
    const saved=await page.evaluate(expected=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.descricao==='Incidente fictício para conferir a formatação e o valor estimado informado.'&&s.valorEstimado===expected),expected);
    assert.strictEqual(saved.valorEstimado,expected);
    if(expected===null)assert(saved.naoSei.valor);
    await page.reload();await page.locator('.atl-top').waitFor();
    const persisted=await page.evaluate(id=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.id===id),saved.id);
    assert.strictEqual(persisted.valorEstimado,expected);
    return saved.id;
   }
   await page.goto(url);await page.locator('[data-profile='+scenario.profile+']').click();await page.getByRole('button',{name:'Entrar na demonstração'}).click();await page.locator('.atl-top').waitFor();
   await start();
   const input=page.getByLabel('Prejuízo estimado',{exact:true});
   assert.equal(await input.getAttribute('inputmode'),'decimal');
   if(scenario.detailed){
    await input.pressSequentially('500000');assert.equal(await input.inputValue(),'500.000,00');
    await input.blur();assert.equal(await input.inputValue(),'500.000,00');
    await input.fill('5000000');assert.equal(await input.inputValue(),'5.000.000,00');
    await input.blur();assert.equal(await input.inputValue(),'5.000.000,00');
    await input.fill('0');await input.blur();assert.equal(await input.inputValue(),'0,00');
    await input.fill('');await input.blur();assert.equal(await input.inputValue(),'');
    await paste(input,'R$ 1.234.567,89');assert.equal(await input.inputValue(),'1.234.567,89');
    await paste(input,'500000.50');await input.blur();assert.equal(await input.inputValue(),'500.000,50');
    for(const invalid of ['-10','1e6','cinco milhões','1,234.56','90071992547409,92']){
     const before=await input.inputValue();await paste(input,invalid);assert.equal(await input.inputValue(),before);
     assert.equal(await input.getAttribute('aria-invalid'),'true');
    }
    await input.fill('1234567,89');
    await input.evaluate(el=>{el.focus();el.setSelectionRange(4,5);});
    await input.press('Backspace');assert.equal(await input.inputValue(),'123.567,89');
    const caret=await input.evaluate(el=>el.selectionStart);assert(caret<7);
    await input.fill('1234567,89');
    await input.evaluate(el=>{el.focus();el.setSelectionRange(2,2);});
    await input.press('Backspace');assert.equal(await input.inputValue(),'234.567,89');
    await input.fill('1234');await input.press('End');await input.press('.');await input.pressSequentially('56');assert.equal(await input.inputValue(),'1.234,56');
    report.checks.push('Whole reais, cents, zero, empty, currency paste, invalid paste, mobile decimal key, separator deletion and caret editing');
   }
   await input.fill('1234567,89');
   await input.evaluate(el=>{
    el.focus();el.setSelectionRange(2,2);
    el.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'deleteContentBackward'}));
   });
   assert.equal(await input.inputValue(),'234.567,89');
   await input.fill('1234567,89');
   await input.evaluate(el=>{
    el.focus();el.setSelectionRange(1,1);
    el.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'deleteContentForward'}));
   });
   assert.equal(await input.inputValue(),'134.567,89');
   await input.fill('1234');
   await input.evaluate(el=>{
    el.focus();el.setSelectionRange(el.value.length,el.value.length);
    el.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:'.'}));
   });
   await input.pressSequentially('56');assert.equal(await input.inputValue(),'1.234,56');
   await input.fill(scenario.value);await input.blur();
   const formatted=scenario.expected.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
   assert.equal(await input.inputValue(),formatted);
   for(const width of scenario.detailed?[320,390,768,1366]:[page.viewportSize().width]){
    await page.setViewportSize({width,height:844});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
    const box=await input.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
    assert(Number(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)))>=16);
   }
   if(scenario.detailed){await page.setViewportSize({width:390,height:844});await input.scrollIntoViewIfNeeded();await page.screenshot({path:'tools/atlas-currency-mobile.png'});await page.setViewportSize({width:1366,height:768});}
   const savedId=await save(scenario.expected);
   if(scenario.detailed){
    await start();const field=page.getByLabel('Prejuízo estimado',{exact:true});await field.fill('500000');
    const unknown=page.getByRole('checkbox',{name:'Não sei informar',exact:true}).last();
    await unknown.click();assert(await field.isDisabled());
    await unknown.click();assert(!await field.isDisabled());assert((await field.inputValue()).startsWith('500.000'));
    await unknown.click();await save(null);
    report.checks.push('Unknown value disables estimate and persists null; re-enabling retains entered amount');
   }
   report.scenarios.push({name:scenario.name,storedValue:scenario.expected,createdId:savedId,reload:true});
   console.log('PASS: '+scenario.name+' displays '+formatted+' and stores '+scenario.expected+' through review, submit and reload');
   await context.close();
  }
  assert.deepStrictEqual(report.errors,[]);
 }finally{
  fs.writeFileSync('tools/currency-validation.json',JSON.stringify(report,null,2));
  for(const browser of Object.values(browsers))await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
