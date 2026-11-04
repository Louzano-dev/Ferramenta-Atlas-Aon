/* Verify the delivered HTML in an otherwise empty directory, fully offline.
   Mobile devices below are Chromium viewport/touch/UA emulations, not hardware tests. */
const fs=require('fs');
const os=require('os');
const path=require('path');
const {pathToFileURL}=require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('node_modules/.cache/playwright-browsers');
const {chromium,webkit,devices}=require('playwright');

const source=path.resolve('Atlas.html');
const tempRoot=fs.realpathSync(os.tmpdir());
const isolated=fs.mkdtempSync(path.join(tempRoot,'atlas-portable-'));
const copied=path.join(isolated,'Atlas.html');
fs.copyFileSync(source,copied);
const url=pathToFileURL(copied).href;
const attachmentName='atlas-offline-verification.txt';
const attachmentContent='Fictitious file for offline Atlas prototype verification.';
const description='Incidente fictício para verificar o protótipo portátil e o armazenamento offline.';
const scenarios=[
  {name:'desktop',engine:'Chromium',options:{viewport:{width:1672,height:941}}},
  {name:'Pixel 7 emulation',engine:'Chromium',options:devices['Pixel 7']},
  {name:'iPhone 13 emulation',engine:'Chromium',options:devices['iPhone 13']},
  {name:'iPad Pro 11 emulation',engine:'Chromium',options:devices['iPad Pro 11']},
  {name:'WebKit iPhone 13 emulation',engine:'WebKit',options:devices['iPhone 13']},
  {name:'WebKit iPad Pro 11 emulation',engine:'WebKit',options:devices['iPad Pro 11']}
];

(async()=>{
  let browser,webkitBrowser;
  const report={fileBytes:fs.statSync(source).size,isolatedFiles:fs.readdirSync(isolated),offline:true,browsers:['Chromium (installed Chrome)','Playwright WebKit'],mobileTests:'Viewport, touch and user-agent emulation; WebKit tests use the actual WebKit engine but not physical iOS or WhatsApp',results:[],errors:[]};
  try{
    browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    const selected=process.argv.includes('--webkit')?scenarios.filter(s=>s.engine==='WebKit'):scenarios;
    for(const scenario of selected){
      const external=[],localDependencies=[],errors=[];
      if(scenario.engine==='WebKit'&&!webkitBrowser)webkitBrowser=await webkit.launch({headless:true});
      const context=await (scenario.engine==='WebKit'?webkitBrowser:browser).newContext({...scenario.options,offline:true,reducedMotion:'reduce'});
      await context.route(/^https?:\/\//,route=>route.abort());
      context.on('request',request=>{
        const requested=request.url();
        if(/^https?:/i.test(requested))external.push(requested);
        if(requested.startsWith('file:')&&requested!==url)localDependencies.push(requested);
      });
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      const fail=message=>{throw Error(scenario.name+': '+message);};
      async function layout(){
        if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))fail('horizontal document overflow');
      }
      async function header(){
        if(!await page.locator('.atl-top .atl-header-brand').isVisible())fail('Atlas header logo missing');
        await layout();
      }
      async function openDrawerIfNeeded(target){
        const menu=page.getByRole('button',{name:'Abrir menu',exact:true});
        if(await menu.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await menu.click();
      }
      async function nav(name){
        const button=page.locator('.atl-nav').getByRole('button',{name,exact:true});
        await openDrawerIfNeeded(button);await button.click();await layout();
      }
      async function logout(){
        const button=page.locator('.atl-side').getByRole('button',{name:'Trocar de perfil',exact:true});
        await openDrawerIfNeeded(button);await button.click();
        await page.locator('[data-profile=cliente]').waitFor();
      }
      async function enter(profile){
        await page.locator(`[data-profile=${profile}]`).click();
        await page.getByRole('button',{name:'Entrar na demonstração'}).click();
        await page.locator('.atl-top').waitFor();await header();
      }
      await page.goto(url);
      await page.locator('[data-profile=cliente]').waitFor();
      await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
      await layout();
      const resources=await page.evaluate(()=>({
        scriptSources:[...document.querySelectorAll('script[src]')].map(x=>x.getAttribute('src')),
        stylesheets:[...document.querySelectorAll('link[rel=stylesheet]')].map(x=>x.getAttribute('href')),
        images:[...document.images].map(x=>({embedded:x.src.startsWith('data:'),loaded:x.complete&&x.naturalWidth>0}))
      }));
      if(resources.scriptSources.length||resources.stylesheets.length||resources.images.some(x=>!x.embedded||!x.loaded))fail('standalone document contains missing or external resources');

      const fileApi=await page.evaluate(async()=>{
        const text='portable API check';
        await arquivoPut('portable-api-check',new Blob([text],{type:'text/plain'}));
        const restored=await arquivoGet('portable-api-check');
        const putGet=restored&&await restored.text()===text;
        await arquivoDel('portable-api-check');
        const deleted=await arquivoGet('portable-api-check')==null;
        await arquivoPut('portable-clear-check',new Blob([text],{type:'text/plain'}));
        await arquivosLimpar();
        const cleared=await arquivoGet('portable-clear-check')==null;
        return {putGet:!!putGet,deleted,cleared};
      });
      if(Object.values(fileApi).some(value=>!value))fail('attachment API round-trip/delete/clear failed: '+JSON.stringify(fileApi));

      await enter('cliente');
      await page.locator('button[data-sinistro]').first().click();
      await page.getByText('Identificação e protocolo (não confundir)',{exact:true}).waitFor();
      await header();
      await nav('Comunicar incidente');
      await page.getByLabel('E-mail',{exact:true}).fill('portatil@empresa.exemplo');
      await page.getByRole('button',{name:'Continuar',exact:true}).click();
      await page.getByLabel('Tipo de incidente',{exact:true}).selectOption({index:1});
      await page.getByLabel('Data da ocorrência',{exact:true}).fill('2001-01-01');
      await page.getByLabel('Descrição',{exact:true}).fill(description);
      await page.getByRole('button',{name:'Continuar',exact:true}).click();
      await page.locator('input[type=file]').setInputFiles({name:attachmentName,mimeType:'text/plain',buffer:Buffer.from(attachmentContent)});
      await page.getByRole('button',{name:'Continuar',exact:true}).click();
      await page.getByRole('button',{name:'Registrar comunicação',exact:true}).click();
      await page.getByText('Comunicação registrada',{exact:true}).waitFor();
      const createdId=await page.getByTestId('id-criado').innerText();
      const persisted=await page.evaluate(async({createdId,attachmentName})=>{
        const state=JSON.parse(localStorage.getItem('atlas-seguros:v5'));
        const record=state.sinistros.find(item=>item.id===createdId);
        const meta=record?.documentos.flatMap(doc=>doc.arquivos||[]).find(file=>file.nome===attachmentName);
        const blob=meta?await arquivoGet(meta.id):null;
        return {id:record?.id,description:record?.descricao,attachmentText:blob?await blob.text():null};
      },{createdId,attachmentName});
      if(persisted.id!==createdId||persisted.description!==description)fail('case did not persist: '+JSON.stringify({createdId,persisted}));
      const attachmentPersisted=persisted.attachmentText===attachmentContent;
      if(!attachmentPersisted){
        const probes=await page.evaluate(async()=>{
          const result={};
          for(const [key,value] of [['blob',new Blob(['probe'],{type:'text/plain'})],['file',new File(['probe'],'probe.txt',{type:'text/plain'})]]){
            try{await arquivoPut('portable-probe-'+key,value);const restored=await arquivoGet('portable-probe-'+key);result[key]={ok:true,text:await restored.text()};await arquivoDel('portable-probe-'+key);}catch(e){result[key]={name:e?.name||null,message:e?.message||String(e)};}
          }
          return result;
        });
        const alerts=await page.locator('[role=alert]').allTextContents();
        fail('attachment content did not persist: '+JSON.stringify({createdId,persisted,probes,alerts,errors}));
      }
      await page.reload();
      await page.locator(`button[data-sinistro="${createdId}"]`).waitFor();await header();
      const clientSession=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atlas-seguros:sessao')));
      if(clientSession.perfil!=='cliente')fail('Cliente session did not persist');

      await logout();await enter('aon');
      const views=['Visão geral','Sinistros','Monitoramento','Apólices','Histórico geral','Configurações'];
      for(const name of views){
        await nav(name);await header();
        if(name==='Sinistros'&&await page.locator(`[data-sinistro="${createdId}"]`).count()!==1)fail('created case is not shared with Aon');
      }
      await page.reload();await page.locator('.atl-top').waitFor();await header();
      const aonSession=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atlas-seguros:sessao')));
      if(aonSession.perfil!=='aon')fail('Aon session did not persist');
      await logout();
      if(external.length||localDependencies.length)fail('document attempted to load outside resources');
      if(errors.length)fail(errors.join('; '));
      report.results.push({name:scenario.name,engine:scenario.engine,viewport:page.viewportSize(),externalRequests:external,localDependencies,embeddedImages:resources.images.length,fileApi,clientSession:clientSession.perfil,aonSession:aonSession.perfil,views,createdCase:createdId,attachmentContentPersists:attachmentPersisted,reloadPersistence:true,errors});
      await context.close();console.log(scenario.name+': relocated/offline UI, both profiles, file APIs, case creation, sharing, attachment and reload OK');
    }
    console.log('PASS: standalone viewing and prototype flows work offline without the assets folder in every tested browser/device scenario.');
  }catch(error){report.errors.push(error.message);throw error;}
  finally{
    if(browser)await browser.close();
    if(webkitBrowser)await webkitBrowser.close();
    fs.writeFileSync('tools/portable-validation.json',JSON.stringify(report,null,2));
    const resolved=path.resolve(isolated),relative=path.relative(tempRoot,resolved);
    if(path.dirname(resolved)!==tempRoot||!relative.startsWith('atlas-portable-')||relative.includes(path.sep)||relative.startsWith('..'))throw Error('Refusing to clean an unexpected temporary directory');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exit(1);});
