const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {pathToFileURL} = require('url');
const {chromium} = require('playwright');
const TARGET = 'SIN-2026-006';
const url = pathToFileURL(path.resolve('Atlas.html')).href;

(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context = await browser.newContext({viewport:{width:1366,height:768},offline:true,reducedMotion:'reduce',timezoneId:'America/Sao_Paulo'});
  const page = await context.newPage();
  const checks = [], errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const records = () => page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros);
  const record = async () => (await records()).find(s=>s.id===TARGET);
  const stable = s => Object.fromEntries(Object.entries(s).filter(([key])=>!['retornoAonPrevisto','atualizadoEm','historico'].includes(key)));
  const menu = async () => {
    const button=page.getByRole('button',{name:'Abrir menu',exact:true});
    if(await button.isVisible()&&!await page.locator('.atl-side').evaluate(e=>e.classList.contains('is-open')))await button.click();
  };
  const nav = async name => {await menu();await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();};
  const logout = async () => {await menu();await page.locator('.atl-side').getByRole('button',{name:'Trocar de perfil',exact:true}).click();};
  const enter = async profile => {await page.locator('[data-profile='+profile+']').click();await page.getByRole('button',{name:'Entrar na demonstração'}).click();await page.locator('.atl-top').waitFor();};
  const waitDate = value => page.waitForFunction(({id,value})=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.id===id).retornoAonPrevisto===value,{id:TARGET,value});
  const callAction = args => page.evaluate(args=>{
    const host=document.querySelector('.atl-shell');
    let fiber=host[Object.keys(host).find(key=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.actions)fiber=fiber.return;
    if(!fiber)throw Error('Missing actions');
    try{return {value:fiber.memoizedProps.actions.setRetornoAonPrevisto(...args)};}
    catch(e){return {error:e.message};}
  },args);
  try {
    await page.goto(url);
    await enter('cliente');
    let card=page.locator('[data-sinistro="'+TARGET+'"]');
    assert((await card.innerText()).includes('Em análise pela Aon'));
    assert((await card.innerText()).includes('Pendências: nenhuma'));
    assert((await card.locator('[data-client-return]').innerText()).includes('A definir pela Aon'));
    const pendingCard=page.locator('[data-sinistro="SIN-2026-001"]');
    assert((await pendingCard.innerText()).includes('Pendências: 2 aguardando você'));
    checks.push('Requested status and punctuation appear in client cards; no invented return date');
    await card.click();
    assert((await page.locator('[data-relatorio] [data-client-return]').innerText()).includes('A definir pela Aon'));
    assert.equal(await page.locator('[data-aon-return]').count(),0);
    const before = await record();
    const denied=await callAction([TARGET,'2099-11-06']);
    assert(denied.error&&denied.error.includes('Aon'));
    assert.deepStrictEqual(await record(),before);
    checks.push('Cliente sees estimate in the report and cannot change it through actions');
    await logout();await enter('aon');await nav('Sinistros');
    await page.getByRole('button',{name:TARGET,exact:true}).click();
    const form=page.locator('[data-aon-return="'+TARGET+'"]');
    await form.waitFor();
    assert.equal(await page.getByLabel('Status do acompanhamento',{exact:true}).inputValue(),'Em organização');
    assert.equal(await page.getByLabel('Status do acompanhamento',{exact:true}).locator('option:checked').innerText(),'Em análise pela Aon');
    const invalid=await callAction([TARGET,'2099-02-30']);
    assert(invalid.error);assert.deepStrictEqual(await record(),before);
    await form.getByLabel('Previsão de retorno ao cliente',{exact:true}).fill('2099-11-06');
    await form.getByRole('button',{name:'Salvar previsão de retorno',exact:true}).click();
    await waitDate('2099-11-06');
    const saved=await record();
    assert.deepStrictEqual(stable(saved),stable(before));
    assert.equal(saved.retornoPrevisto,before.retornoPrevisto);
    assert.equal(saved.historico.length,before.historico.length+1);
    assert(saved.historico.at(-1).texto.includes('06/11/2099'));
    assert(saved.historico.at(-1).por);
    await callAction([TARGET,'2099-11-06']);
    assert.equal((await record()).historico.length,saved.historico.length);
    checks.push('Aon saves a valid date with author/history; no duplicate, phase or insurer-date changes');
    await page.reload();await page.locator('.atl-top').waitFor();
    assert.equal((await record()).retornoAonPrevisto,'2099-11-06');
    await logout();await enter('cliente');
    card=page.locator('[data-sinistro="'+TARGET+'"]');
    assert((await card.locator('[data-client-return]').innerText()).includes('06/11/2099'));
    await card.click();
    assert((await page.locator('[data-relatorio] [data-client-return]').innerText()).includes('06/11/2099'));
    checks.push('Date persists across reload and appears consistently in client list and report');
    await logout();await enter('aon');await nav('Sinistros');await page.getByRole('button',{name:TARGET,exact:true}).click();
    await callAction([TARGET,'2001-01-01']);await waitDate('2001-01-01');
    await logout();await enter('cliente');
    card=page.locator('[data-sinistro="'+TARGET+'"]');
    assert((await card.locator('[data-client-return]').innerText()).includes('vencida'));
    await logout();await enter('aon');await nav('Sinistros');await page.getByRole('button',{name:TARGET,exact:true}).click();
    await callAction([TARGET,'']);await waitDate('');
    const cleared=await record();assert.deepStrictEqual(stable(cleared),stable(before));
    const closed = await callAction(['SIN-2026-007','2099-11-06']);
    assert(closed.error||closed.value===false);
    checks.push('Expired forecasts remain transparent, clearing works, and closed cases reject new estimates');
    for(const width of [320,390,768,1366]){
      await page.setViewportSize({width,height:844});
      assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
      if(width===320){
        const input=page.locator('[data-aon-return] input');
        assert(Number(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)))>=16);
        assert((await input.boundingBox()).height>=44);
        await page.screenshot({path:'tools/atlas-return-mobile-aon.png',fullPage:true});
      }
    }
    await logout();await enter('cliente');
    for(const width of [320,390,768,1366]){
      await page.setViewportSize({width,height:844});
      assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
      const badge=page.locator('[data-sinistro="SIN-2026-001"] .atl-badge');
      const bounds=await badge.boundingBox();assert(bounds.x+bounds.width<=width+1);
      if(width===390)await page.screenshot({path:'tools/atlas-return-mobile-client.png',fullPage:true});
    }
    checks.push('Client cards and return controls fit 320/390/768/1366px layouts');
    assert.deepStrictEqual(errors,[]);
    fs.writeFileSync('tools/client-feedback-validation.json',JSON.stringify({checks,errors},null,2));
    checks.forEach(check=>console.log('PASS: '+check));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
