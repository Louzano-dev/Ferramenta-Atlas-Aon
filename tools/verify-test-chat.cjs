/* Exercise the experimental conversation through the UI with isolated browser storage. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const {pathToFileURL} = require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('node_modules/.cache/playwright-browsers');
const {chromium, webkit, devices} = require('playwright');
const TARGET = 'SIN-2026-006', SECOND = 'SIN-2026-001', CLOSED = 'SIN-2026-007';
const STORE = 'atlas-teste-seguros:v5', SESSION = 'atlas-teste-seguros:sessao';
const out = path.resolve('tools/atlas-test-review');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

(async () => {
  fs.mkdirSync(out, {recursive:true});
  const mainHash = hash('Atlas.html');
  const report = {target:'Atlas-teste.html', checks:[], scenarios:[], errors:[]};
  const scenarios = [{name:'Chrome desktop', engine:'chromium', options:{viewport:{width:1366,height:900}}}];
  if (!process.argv.includes('--chromium-only')) scenarios.push({name:'WebKit iPhone', engine:'webkit', options:devices['iPhone 13']});
  const browsers = {};
  try {
    for (const scenario of scenarios) {
      if (!browsers[scenario.engine]) browsers[scenario.engine] = await (scenario.engine === 'webkit'
        ? webkit.launch({headless:true})
        : chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}));
      const context = await browsers[scenario.engine].newContext({...scenario.options, offline:true, reducedMotion:'reduce', timezoneId:'America/Sao_Paulo'});
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
      const chat = () => page.locator('[data-atlas-chat]:visible');
      const scroll = () => chat().locator('[data-chat-scroll]');
      const input = profile => chat().getByLabel(profile==='cliente'?'Mensagem para a Aon':'Mensagem para o cliente', {exact:true});
      const send = () => chat().getByRole('button', {name:'Enviar mensagem',exact:true});
      const records = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).sinistros, STORE);
      const record = async id => (await records()).find(s=>s.id===id);
      const menu = async () => {
        await page.locator('.atl-top').waitFor();
        const button=page.getByRole('button',{name:'Abrir menu',exact:true});
        if (await button.isVisible() && !await page.locator('.atl-side').evaluate(e=>e.classList.contains('is-open'))) await button.click();
      };
      const nav = async name => { await menu(); await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click(); };
      const logout = async () => { await menu(); await page.locator('.atl-side').getByRole('button',{name:'Trocar de perfil',exact:true}).click(); };
      const enter = async profile => { await page.locator('[data-profile='+profile+']').click(); await page.getByRole('button',{name:/^Entrar na demonstração/}).click(); await page.locator('.atl-top').waitFor(); };
      const open = async (profile, id=TARGET) => {
        if (profile==='cliente') {
          await nav('Meus sinistros');
          await page.locator('[data-sinistro="'+id+'"]:visible').click();
          await page.getByRole('button',{name:'Conversar com a Aon',exact:true}).click();
        } else {
          await nav(id===CLOSED?'Casos concluídos':'Sinistros');
          const exact=page.getByRole('button',{name:id,exact:true});
          if (await exact.isVisible()) await exact.click();
          else await page.getByRole('button',{name:new RegExp(id)}).click();
          await page.getByRole('tab',{name:'Conversa com o cliente',exact:true}).click();
        }
        await chat().waitFor();
      };
      const waitText = (id,text) => page.waitForFunction(({key,id,text}) => JSON.parse(localStorage.getItem(key)).sinistros.find(s=>s.id===id).mensagens.some(m=>m.texto===text),{key:STORE,id,text});
      const assertReadOnly = async () => {
        const composer=chat().locator('textarea'),submit=chat().getByRole('button',{name:'Enviar mensagem',exact:true});
        if (await composer.count()) assert(await composer.isDisabled()||await composer.evaluate(el=>el.readOnly),'Concluded case must prevent message editing');
        if (await submit.count()) assert(await submit.isDisabled(),'Concluded case must prevent message submission');
      };
      try {
        await page.goto(pathToFileURL(path.resolve('Atlas-teste.html')).href);
        await page.locator('[data-profile=cliente]').waitFor();
        await page.waitForFunction(key=>!!localStorage.getItem(key),STORE);
        const originalState = await page.evaluate(({key,session}) => {
          const seed=seedSinistros(), company=seed.find(s=>s.id==='SIN-2026-006').segurado;
          const state={v:5,sinistros:seed,apolices:seedApolices()};
          for (const id of ['SIN-2026-006','SIN-2026-001','SIN-2026-007']) {
            const s=seed.find(s=>s.id===id); s.segurado=company;
            s.mensagens=id==='SIN-2026-006'?[{id:'CHAT-OLD-1',ts:'2026-11-04T12:00:00.000Z',de:'Aon',por:'Analista Atlas',texto:'Recebemos as informações. A equipe está analisando o caso.'}]:[];
          }
          const main=JSON.stringify({...state,marker:'original-preservado'});
          localStorage.setItem('atlas-seguros:v5',main);
          localStorage.setItem('atlas:theme:v1','light');
          sessionStorage.setItem('atlas-seguros:sessao','original-session-preservada');
          localStorage.setItem(key,JSON.stringify(state)); sessionStorage.removeItem(session);
          return main;
        },{key:STORE,session:SESSION});
        await page.reload(); await enter('cliente'); await open('cliente');
        assert((await scroll().innerText()).includes('Recebemos as informações.'));
        assert(await send().isDisabled(),'Empty messages must not be submitted');
        const draft='Rascunho do cliente: dados adicionais para a Aon';
        await input('cliente').fill(draft);
        await open('cliente',SECOND); assert.equal(await input('cliente').inputValue(),'');
        await input('cliente').fill('Rascunho exclusivo do segundo sinistro');
        await open('cliente'); assert.equal(await input('cliente').inputValue(),draft);
        await page.reload(); await open('cliente'); assert.equal(await input('cliente').inputValue(),draft);
        report.checks.push(scenario.name+': rascunhos persistem no reload e ficam separados por sinistro');

        const text='Cliente: envio de informações\nSegunda linha com acentos: situação, apólice e análise. <img src=x onerror="window.chatXss=true">';
        await input('cliente').fill('Cliente: envio de informações');
        await input('cliente').press('Enter');
        assert.equal((await record(TARGET)).mensagens.length,1,'Enter must insert a newline without sending');
        assert((await input('cliente').inputValue()).includes('\n'));
        await input('cliente').fill(text); await input('cliente').press('Control+Enter'); await waitText(TARGET,text);
        assert.equal((await record(TARGET)).mensagens.length,2);
        assert.equal((await record(TARGET)).mensagens.at(-1).de,'Cliente');
        assert.equal(await input('cliente').inputValue(),'');
        assert((await scroll().innerText()).includes('<img src=x onerror='));
        assert.equal(await scroll().locator('img').count(),0);
        assert.equal(await page.evaluate(()=>window.chatXss),undefined);
        assert((await chat().innerText()).includes('Mensagem registrada.'));
        report.checks.push(scenario.name+': Enter mantém linha, Ctrl+Enter envia uma única mensagem e HTML é texto literal');

        await input('cliente').fill('Rascunho privado do perfil Cliente');
        await logout(); await enter('aon'); await open('aon');
        assert.equal(await input('aon').inputValue(),'','Cliente draft must not appear for Aon');
        assert((await scroll().innerText()).includes(text));
        const reply='Aon: recebemos os detalhes; o próximo retorno será registrado na plataforma.';
        await input('aon').fill(reply); await send().click(); await waitText(TARGET,reply);
        const sent=await record(TARGET);
        assert.equal(sent.mensagens.length,3); assert.equal(sent.mensagens.at(-1).de,'Aon');
        assert(sent.historico.at(-1).texto.includes('Mensagem da Aon ao cliente'));
        assert(sent.mensagens.every(m=>m.id&&m.ts&&m.de&&m.por&&typeof m.texto==='string'));
        await chat().getByRole('button',{name:'Buscar mensagens',exact:true}).click();
        const search=chat().getByLabel('Buscar na conversa',{exact:true});
        await search.fill('apólice'); assert((await scroll().innerText()).includes(text));
        assert(!(await scroll().innerText()).includes(reply),'Search must narrow the displayed conversation');
        await search.fill('nenhuma-correspondencia-xyz'); assert(!(await scroll().innerText()).includes(text));
        await search.fill(''); assert((await scroll().innerText()).includes(reply));
        assert.equal((await record(TARGET)).mensagens.length,3,'Searching must not mutate stored messages');
        const exported=await page.evaluate(({key,id})=>{const state=JSON.parse(localStorage.getItem(key)),s=state.sinistros.find(s=>s.id===id);return buildCaseReportModel(s,state.sinistros,'Teste Chat',nowTs(),state.apolices).sections.find(section=>section.id==='mensagens');},{key:STORE,id:TARGET});
        assert(JSON.stringify(exported).includes(reply)); assert(JSON.stringify(exported).includes('Segunda linha com acentos'));
        report.checks.push(scenario.name+': ambos os perfis compartilham mensagens, busca não altera dados e PDF mantém a conversa completa');

        await input('aon').fill(' '); assert(await send().isDisabled());
        await input('aon').fill('x'); assert(await send().isDisabled());
        const longText='Relato detalhado com acentos. '+('https://exemplo.test/'+ 'a'.repeat(160)+'\n').repeat(20);
        await input('aon').fill(longText); await send().click(); await waitText(TARGET,longText.trim());
        assert.equal((await record(TARGET)).mensagens.length,4);
        assert.equal(await input('aon').getAttribute('maxlength'),'10000');
        await open('aon',CLOSED);
        await assertReadOnly();
        await open('aon');

        for (const mode of ['light','dark']) {
          await page.evaluate(mode=>window.AtlasAppearance.set(mode),mode);
          await page.waitForFunction(mode=>document.documentElement.dataset.atlasTheme===mode,mode);
          for (const width of [320,390,768,1366]) {
            if (scenario.engine==='webkit' && width!==390) continue;
            await page.setViewportSize({width,height:844});
            await input('aon').scrollIntoViewIfNeeded();
            assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),mode+' '+width+'px overflows');
            const box=await input('aon').boundingBox(),buttonBox=await send().boundingBox();
            assert(box.x>=0&&box.x+box.width<=width+1&&box.height>=44);
            assert(buttonBox.height>=44&&buttonBox.x+buttonBox.width<=width+1);
            assert(Number(await input('aon').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)))>=16);
            assert(await scroll().evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Message body overflows its scroll container');
            if (scenario.engine==='chromium'&&(width===390||width===1366)) {
              await chat().scrollIntoViewIfNeeded();
              await chat().screenshot({path:path.join(out,'chat-aon-'+mode+'-'+width+'.png')});
            }
          }
        }
        await logout(); await enter('cliente'); await open('cliente');
        assert.equal(await input('cliente').inputValue(),'Rascunho privado do perfil Cliente');
        assert((await scroll().innerText()).includes(reply));
        for (const width of [320,390,768,1366]) {
          if (scenario.engine==='webkit'&&width!==390) continue;
          await page.setViewportSize({width,height:844});
          const clientOverflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(el).position!=='fixed';}).slice(0,12).map(el=>({tag:el.tagName,class:el.className,text:el.textContent.slice(0,140),bounds:el.getBoundingClientRect().toJSON()}))}));
          if (clientOverflow.width>width+1) {
            fs.writeFileSync(path.join(out,'client-overflow.json'),JSON.stringify(clientOverflow,null,2));
            await page.screenshot({path:path.join(out,'client-overflow.png'),fullPage:true});
          }
          assert(clientOverflow.width<=width+1,'Cliente '+width+'px overflows: '+JSON.stringify(clientOverflow));
        }
        await page.setViewportSize({width:390,height:844});
        await chat().scrollIntoViewIfNeeded();
        await chat().screenshot({path:path.join(out,'chat-cliente-'+scenario.engine+'-390.png')});
        await open('cliente',CLOSED); await assertReadOnly();
        assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-seguros:v5')),originalState);
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('atlas-seguros:sessao')),'original-session-preservada');
        assert.equal(await page.evaluate(()=>localStorage.getItem('atlas:theme:v1')),'light');
        assert.deepStrictEqual(errors,[]);
        report.checks.push(scenario.name+': encerrados ficam somente leitura; temas e 320/390/768/1366px ficam utilizáveis; dados originais preservados');
        report.scenarios.push({name:scenario.name,passed:true});
      } finally { await context.close(); }
    }
    assert.equal(hash('Atlas.html'),mainHash,'The original Atlas.html must remain byte-identical');
  } catch (error) {
    report.errors.push(error.stack||String(error)); throw error;
  } finally {
    fs.writeFileSync(path.join(out,'chat-validation.json'),JSON.stringify(report,null,2));
    for (const browser of Object.values(browsers)) await browser.close();
    report.checks.forEach(check=>console.log('PASS: '+check));
  }
})().catch(error=>{console.error(error);process.exit(1);});
