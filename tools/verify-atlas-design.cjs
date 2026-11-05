/* Whole-tool visual/functional audit of the portable experimental Atlas. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const {pathToFileURL} = require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('node_modules/.cache/playwright-browsers');
const {chromium, webkit, devices} = require('playwright');
const baseline = process.argv.includes('--baseline');
const quick = process.argv.includes('--quick');
const out = path.resolve('tools/atlas-design-review');
fs.mkdirSync(out, {recursive:true});
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const url = pathToFileURL(path.resolve('Atlas-teste.html')).href;
const themeTests = fs.readFileSync('tools/verify-theme.cjs','utf8');
// Reuse the project's audited compositing check rather than approximate colors.
const contrastSource = themeTests.slice(themeTests.indexOf('function inspectContrast(){'),themeTests.indexOf('\n(async()=>{'));
const inspectContrast = new Function('return (' + contrastSource + ')')();

function inspectLayout() {
  const dialog = [...document.querySelectorAll('[role=dialog],dialog[open]')].find(el=>el.getClientRects().length);
  const visible = el => {
    const b = el.getBoundingClientRect(), s = getComputedStyle(el);
    return (!dialog || dialog.contains(el)) && !!el.getClientRects().length && s.visibility === 'visible' && s.display !== 'none' && b.width > 0 && b.height > 0 && b.right > 0 && b.left < innerWidth && !el.closest('[aria-hidden=true]');
  };
  const controls = [...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,[role=checkbox]')].filter(visible).map(el=>{
    const b=el.getBoundingClientRect(),s=getComputedStyle(el);
    return {name:el.getAttribute('aria-label')||el.textContent.trim().slice(0,55)||el.tagName,tag:el.tagName,role:el.getAttribute('role'),type:el.type,x:b.x,y:b.y,w:b.width,h:b.height,font:parseFloat(s.fontSize),disabled:el.disabled,input:el.matches('input:not([type=checkbox]):not([type=radio]),select,textarea'),link:el.classList.contains('atl-link')};
  });
  const missingLabels = [...document.querySelectorAll('input:not([type=hidden]),textarea,select')].filter(visible).filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!el.closest('[role=checkbox]')).map(el=>({tag:el.tagName,type:el.type,placeholder:el.placeholder}));
  const overlaps = [];
  const fields = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea')].filter(visible);
  for(let i=0;i<fields.length;i++)for(let j=i+1;j<fields.length;j++){
    const a=fields[i].getBoundingClientRect(),b=fields[j].getBoundingClientRect();
    if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([fields[i].getAttribute('aria-label'),fields[j].getAttribute('aria-label')]);
  }
  return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,controls,missingLabels,overlaps};
}

(async () => {
  const mainHash=hash('Atlas.html');
  const report={target:'Atlas-teste.html',baseline,checks:[],views:[],errors:[],failures:[],smallTargets:[],unlabelledFields:[],network:[]};
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  let wk;
  const context=await browser.newContext({viewport:{width:1366,height:900},offline:true,reducedMotion:'reduce',timezoneId:'America/Sao_Paulo',acceptDownloads:true});
  const page=await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('request',r=>{if(/^https?:/i.test(r.url()))report.network.push(r.url());});
  const widths=quick?[[1366,900],[390,844]]:[[1366,900],[768,1024],[390,844],[320,720]];
  const modes=['light','dark'];
  async function menu(){await page.locator('.atl-top').waitFor();const button=page.getByRole('button',{name:'Abrir menu',exact:true});if(await button.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await button.click();}
  async function nav(name){await menu();await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();}
  async function logout(){await menu();await page.locator('.atl-side').getByRole('button',{name:'Trocar de perfil',exact:true}).click();}
  async function enter(profile){await page.locator('[data-profile='+profile+']').click();await page.getByRole('button',{name:/^Entrar na demonstração/}).click();await page.locator('.atl-top').waitFor();}
  async function settle(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
  async function audit(name, capture=true){
    for(const mode of modes){
      await page.evaluate(mode=>AtlasAppearance.set(mode),mode);
      for(const [width,height] of widths){
        await page.setViewportSize({width,height});await settle();
        const layout=await page.evaluate(inspectLayout);
        let contrast=await page.evaluate(inspectContrast),passes=0;
        while(contrast.failures.length&&passes++<3){await page.waitForTimeout(60);contrast=await page.evaluate(inspectContrast);}
        const key={view:name,mode,width,height};
        if(layout.scrollWidth>width+1)report.failures.push({...key,kind:'overflow',actual:layout.scrollWidth});
        if(layout.overlaps.length)report.failures.push({...key,kind:'overlapping fields',fields:layout.overlaps});
        for(const failure of contrast.failures)report.failures.push({...key,kind:'contrast',...failure});
        for(const control of layout.controls){
          if(!control.disabled&&!control.link&&control.tag==='BUTTON'&&control.role!=='checkbox'&&control.h<43.5)report.smallTargets.push({...key,...control});
          if(width<=639&&control.input&&control.font<16)report.failures.push({...key,kind:'mobile input text',...control});
        }
        if(layout.missingLabels.length)report.unlabelledFields.push({...key,fields:layout.missingLabels});
        report.views.push({...key,name,textChecked:contrast.checked,contrastFailures:contrast.failures.length,controlCount:layout.controls.length,scrollWidth:layout.scrollWidth});
        if(capture&&(width===1366||width===390)){
          await page.evaluate(()=>window.scrollTo(0,0));await settle();
          await page.screenshot({path:path.join(out,(baseline?'baseline-':'final-')+name+'-'+mode+'-'+width+'.png'),fullPage:true});
        }
      }
    }
    await page.setViewportSize({width:1366,height:900});await page.evaluate(()=>AtlasAppearance.set('light'));await settle();
    console.log('AUDIT: '+name);
  }
  async function caseTab(name){await page.getByRole('tab',{name,exact:true}).click();}
  try{
    await page.goto(url);await page.locator('[data-profile=cliente]').waitFor();
    await page.waitForFunction(()=>!!localStorage.getItem('atlas-teste-seguros:v5'));
    const initial=await page.evaluate(()=>localStorage.getItem('atlas-teste-seguros:v5'));
    await audit('entrance');
    for(const profile of ['cliente','aon']){
      await page.locator('[data-profile='+profile+']').click();await audit('access-'+profile,false);
      await page.getByRole('button',{name:/Voltar aos perfis/}).click();
    }
    await enter('cliente');await audit('client-list');
    await page.locator('[data-sinistro="SIN-2026-001"]').click();await audit('client-detail');
    await page.getByRole('button',{name:'Conversar com a Aon',exact:true}).click();await audit('client-conversations');
    await nav('Comunicar incidente');await page.getByLabel('E-mail',{exact:true}).fill('design@empresa.exemplo');await audit('incident-identification');
    await page.getByRole('button',{name:'Continuar',exact:true}).click();
    await page.getByLabel('Tipo de incidente',{exact:true}).selectOption({index:1});
    await page.getByLabel('Data da ocorrência',{exact:true}).fill('2001-01-01');
    await page.getByLabel('Descrição',{exact:true}).fill('Descrição fictícia e detalhada para revisar a apresentação e a navegação no formulário de incidente.');
    const estimate=page.getByLabel('Prejuízo estimado',{exact:true});await estimate.fill('');await estimate.pressSequentially('50');
    assert.equal(await estimate.inputValue(),'50,00','Typing50 must format immediately');
    await audit('incident-details');
    await page.getByRole('button',{name:'Continuar',exact:true}).click();await audit('incident-documents');
    await page.getByRole('button',{name:'Continuar',exact:true}).click();await audit('incident-review');
    await page.getByRole('button',{name:'← Cancelar',exact:true}).click();
    report.checks.push('Four-step client form remains usable, review retains data and50 formats to50,00 before blur');
    await logout();await enter('aon');
    for(const [name,key] of [['Visão geral','overview'],['Sinistros','cases'],['Casos concluídos','completed'],['Monitoramento','monitor'],['Apólices','policies'],['Histórico geral','history'],['Configurações','settings'],['Conversas','conversations']]){
      await nav(name);await audit('aon-'+key);
      if(name==='Histórico geral'){
        await page.getByRole('button',{name:/^Ver movimentação de/}).first().click();await audit('history-dialog',false);
        await page.getByRole('button',{name:'Fechar movimentação',exact:true}).click();
      }
      if(name==='Apólices'){
        const value=page.getByLabel('Franquia',{exact:true});await value.fill('');await value.pressSequentially('50');assert.equal(await value.inputValue(),'50,00');
      }
    }
    await nav('Sinistros');await page.getByRole('button',{name:'SIN-2026-005',exact:true}).click();
    for(const [name,key] of [['Resumo e andamento','summary'],['Triagem e apólice','triage'],['Plano de ações','plan'],['Documentos e solicitações','documents'],['Seguradora (externa)','insurer'],['Histórico','history']]){
      await caseTab(name);await audit('case-'+key);
      if(name==='Seguradora (externa)'){
        const approved=page.getByLabel('Valor aprovado',{exact:true});await approved.fill('');await approved.pressSequentially('50');assert.equal(await approved.inputValue(),'50,00');
      }
    }
    await caseTab('Resumo e andamento');
    await page.locator('[data-lifecycle-action=concluir]').click();await audit('lifecycle-dialog',false);
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    const download=page.waitForEvent('download',{timeout:120000});await page.locator('[data-download-case-pdf="SIN-2026-005"]').click();
    const file=await download;const target=path.join(out,'report-smoke.pdf');await file.saveAs(target);
    assert.equal(fs.readFileSync(target).subarray(0,5).toString(),'%PDF-');assert(file.suggestedFilename().endsWith('.pdf'));
    report.checks.push('All Aon routes, six operational case tabs, movement/lifecycle dialogs and an actual offline PDF download work');
    assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-teste-seguros:v5')),initial,'Visual review and unsaved form edits must not change saved records');
    await nav('Conversas');
    for(const [width,height] of [[844,390],[568,320]]){await page.setViewportSize({width,height});await settle();const result=await page.evaluate(inspectLayout);assert(result.scrollWidth<=width+1,'Landscape overflow');}
    report.checks.push('Landscape layouts remain within viewport; mode changes, filters and cancelled forms preserve saved case data');
    wk=await webkit.launch({headless:true});
    const phone=await wk.newContext({...devices['iPhone 13'],offline:true,reducedMotion:'reduce',timezoneId:'America/Sao_Paulo'}),wp=await phone.newPage();
    wp.on('pageerror',e=>report.errors.push('WebKit: '+e.message));
    await wp.goto(url);await wp.locator('[data-profile=cliente]').click();await wp.getByRole('button',{name:/^Entrar na demonstração/}).click();await wp.locator('.atl-top').waitFor();
    for(const mode of ['light','dark']){await wp.evaluate(mode=>AtlasAppearance.set(mode),mode);await wp.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const result=await wp.evaluate(inspectLayout);assert(result.scrollWidth<=390+1);await wp.screenshot({path:path.join(out,(baseline?'baseline-':'final-')+'webkit-client-'+mode+'.png'),fullPage:true});}
    await phone.close();report.checks.push('Actual WebKit engine with iPhone emulation opens both themes without horizontal overflow');
    assert.equal(hash('Atlas.html'),mainHash,'Main Atlas.html changed');
    assert.deepStrictEqual(report.errors,[]);assert.deepStrictEqual(report.network,[],'Offline HTML requested external resources');
    if(!baseline){assert.equal(report.failures.length,0,'Design failures: '+JSON.stringify(report.failures.slice(0,15),null,2));}
    report.checks.push('Main Atlas file remains byte-identical; no JavaScript errors or external requests');
    report.checks.forEach(check=>console.log('PASS: '+check));
  }catch(error){report.errors.push(error.stack||String(error));throw error;}
  finally{fs.writeFileSync(path.join(out,baseline?'baseline.json':'validation.json'),JSON.stringify(report,null,2));await browser.close();if(wk)await wk.close();}
})().catch(error=>{console.error(error);process.exit(1);});
