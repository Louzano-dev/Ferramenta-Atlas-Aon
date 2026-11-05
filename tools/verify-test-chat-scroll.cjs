const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const report = {checks:[], errors:[]};
  try {
    const context = await browser.newContext({viewport:{width:1366,height:900},offline:true,reducedMotion:'reduce'});
    const page = await context.newPage();
    const url = pathToFileURL(path.resolve('Atlas-teste.html')).href;
    const enter = async (page, role) => {await page.locator('[data-profile='+role+']').click();await page.getByRole('button',{name:/Entrar na demonstra/}).click();await page.locator('.atl-top').waitFor();};
    await page.goto(url);
    await page.waitForFunction(()=>!!localStorage.getItem('atlas-teste-seguros:v5'));
    await page.evaluate(()=>{
      const state=JSON.parse(localStorage.getItem('atlas-teste-seguros:v5'));
      const s=state.sinistros.find(s=>s.id==='SIN-2026-006');
      s.mensagens=Array.from({length:40},(_,i)=>({id:'SCROLL-'+i,ts:new Date(1793790000000+i*60000).toISOString(),de:i%2?'Aon':'Cliente',por:'Teste',texto:'Mensagem '+i+' para verificar a leitura e a rolagem de uma conversa extensa.'}));
      localStorage.setItem('atlas-teste-seguros:v5',JSON.stringify(state));
    });
    await page.reload();await enter(page,'aon');
    await page.locator('.atl-nav').getByRole('button',{name:'Sinistros',exact:true}).click();
    await page.getByRole('button',{name:'SIN-2026-006',exact:true}).click();
    await page.getByRole('tab',{name:'Conversa com o cliente',exact:true}).click();
    const scroll=page.locator('[data-chat-scroll]');
    assert(await scroll.evaluate(el=>el.scrollTop>0));
    await scroll.evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'));});
    const client=await context.newPage();await client.goto(url);await enter(client,'cliente');
    await client.locator('[data-sinistro="SIN-2026-006"]').click();
    await client.getByRole('button',{name:'Conversar com a Aon',exact:true}).click();
    await client.getByLabel('Mensagem para a Aon',{exact:true}).fill('Nova mensagem em outra aba do mesmo navegador.');
    await client.getByRole('button',{name:'Enviar mensagem',exact:true}).click();
    await page.getByRole('button',{name:'Novas mensagens · Ir para o fim'}).waitFor();
    assert.equal(await scroll.evaluate(el=>el.scrollTop),0,'Incoming messages must not interrupt reading');
    await page.getByRole('button',{name:'Novas mensagens · Ir para o fim'}).click();
    assert(await scroll.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight<5));
    report.checks.push('Same-browser tabs synchronize; incoming messages preserve reading position and the jump button reaches the end');
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>{const el=document.querySelector('[data-chat-scroll]');return el.scrollHeight-el.scrollTop-el.clientHeight<5;});
    await page.setViewportSize({width:1366,height:900});
    await page.waitForFunction(()=>{const el=document.querySelector('[data-chat-scroll]');return el.scrollHeight-el.scrollTop-el.clientHeight<5;});
    await page.getByRole('button',{name:'Buscar mensagens',exact:true}).click();
    await page.getByLabel('Buscar na conversa',{exact:true}).press('Escape');
    assert(await page.getByRole('button',{name:'Buscar mensagens',exact:true}).evaluate(el=>el===document.activeElement));
    report.checks.push('Responsive reflow keeps the latest message visible and Escape restores search-toggle focus');
    const input=page.getByLabel('Mensagem para o cliente',{exact:true});
    await input.fill('Texto em composição');
    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-teste-seguros:v5')).sinistros.find(s=>s.id==='SIN-2026-006').mensagens.length);
    await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',ctrlKey:true,isComposing:true});
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-teste-seguros:v5')).sinistros.find(s=>s.id==='SIN-2026-006').mensagens.length),before);
    report.checks.push('IME composition does not accidentally submit a message');
    const contrast=[];
    for(const mode of ['light','dark']){
      await page.evaluate(mode=>window.AtlasAppearance.set(mode),mode);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const values=await page.locator('[data-atlas-chat]').evaluate(el=>{
        const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
        const tests=[...el.querySelectorAll('.atc-text,.atc-author strong,.atc-author>span,.atc-message-meta,.atc-composer label,.atc-heading h2,.atc-heading p,.atc-send,.atc-footer small,.atc-hints')];
        return tests.map(node=>{const style=getComputedStyle(node);let p=node,bg='rgba(0, 0, 0, 0)';while(p&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(p).backgroundColor;p=p.parentElement;}const a=lum(style.color),b=lum(bg);return {role:node.className||node.tagName,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
      });
      assert(values.every(v=>v.ratio>=4.5),JSON.stringify({mode,low:values.filter(v=>v.ratio<4.5)}));
      contrast.push({mode,min:Math.min(...values.map(v=>v.ratio)),checked:values.length});
    }
    report.checks.push('Chat body, metadata, hints and active send button meet4.5:1 contrast in both themes');
    report.contrast=contrast;
  } catch(error){report.errors.push(error.stack);throw error;}
  finally {fs.mkdirSync('tools/atlas-test-review',{recursive:true});fs.writeFileSync('tools/atlas-test-review/scroll-validation.json',JSON.stringify(report,null,2));await browser.close();}
  console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exit(1);});
