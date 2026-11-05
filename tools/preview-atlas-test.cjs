const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const {chromium} = require('playwright');
(async () => {
  const out = path.resolve('tools/atlas-test-review');
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1366,height:900},offline:true,reducedMotion:'reduce',timezoneId:'America/Sao_Paulo'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve('Atlas-teste.html')).href);
    await page.waitForFunction(()=>!!localStorage.getItem('atlas-teste-seguros:v5'));
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('atlas-teste-seguros:v5'));
      const s = state.sinistros.find(s=>s.id==='SIN-2026-006');
      s.mensagens = [
        {id:'PREVIEW-1',ts:'2026-11-04T13:00:00Z',de:'Cliente',por:'Helena Prado',texto:'Bom dia! A equipe de TI reuniu as primeiras evidências do incidente. Quais documentos vocês precisam para seguir com a análise?'},
        {id:'PREVIEW-2',ts:'2026-11-04T13:15:00Z',de:'Aon',por:'Equipe Aon',texto:'Bom dia, Helena. Envie o relatório inicial e a relação dos sistemas afetados na área de Documentos. Vamos conferir as informações e registrar o próximo retorno aqui no Atlas.'},
        {id:'PREVIEW-3',ts:'2026-11-05T12:00:00Z',de:'Cliente',por:'Helena Prado',texto:'Combinado, obrigada! O relatório inicial já está disponível. Estamos concluindo a relação dos sistemas.'}
      ];
      localStorage.setItem('atlas-teste-seguros:v5',JSON.stringify(state));
    });
    await page.reload();
    await page.locator('[data-profile=aon]').click();
    await page.getByRole('button',{name:/Entrar na demonstra/}).click();
    await page.locator('.atl-top').waitFor();
    for (const mode of ['light','dark']) {
      await page.evaluate(mode=>window.AtlasAppearance.set(mode),mode);
      await page.screenshot({path:path.join(out,'dashboard-'+mode+'-1366.png')});
    }
    await page.locator('.atl-nav').getByRole('button',{name:'Sinistros',exact:true}).click();
    await page.getByRole('button',{name:'SIN-2026-006',exact:true}).click();
    await page.getByRole('tab',{name:'Conversa com o cliente',exact:true}).click();
    for (const mode of ['light','dark']) {
      await page.evaluate(mode=>window.AtlasAppearance.set(mode),mode);
      for (const width of [1366,390]) {
        await page.setViewportSize({width,height:900});
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.screenshot({path:path.join(out,'hub-preview-'+mode+'-'+width+'.png'),fullPage:true});
        await page.locator('[data-atlas-chat]').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-84));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.screenshot({path:path.join(out,'conversation-'+mode+'-'+width+'.png')});
      }
    }
    const metrics = await page.locator('[data-atlas-chat]').evaluate(el=>{
      const ratio = (a,b) => {const lum = c=>{const v=(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4);});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      return [...el.querySelectorAll('.atc-text,.atc-heading h2,.atc-heading p,.atc-send,.atc-message-meta,.atc-author>span')].map(node=>{const s=getComputedStyle(node);let p=node,bg='rgba(0, 0, 0, 0)';while(p&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(p).backgroundColor;p=p.parentElement;}return{role:node.className,color:s.color,background:bg,contrast:ratio(s.color,bg)};});
    });
    fs.writeFileSync(path.join(out,'visual-check.json'),JSON.stringify({errors,metrics},null,2));
    if (errors.length) throw Error(errors.join('\n'));
    console.log('Rendered dashboard and conversation in both themes at1366/390. Contrast metrics saved.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
