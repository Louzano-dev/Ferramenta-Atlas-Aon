/* Central conversation navigation: real UI, offline, isolated browser state. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const {pathToFileURL} = require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('node_modules/.cache/playwright-browsers');
const {chromium, webkit, devices} = require('playwright');
const STORE = 'atlas-teste-seguros:v5';
const TARGET = 'SIN-2026-006', SECOND = 'SIN-2026-001', CLOSED = 'SIN-2026-007', OTHER = 'SIN-2026-002';
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
      page.on('pageerror', error=>errors.push(error.message));
      page.on('console', msg=>{if(msg.type()==='error')errors.push(msg.text());});
      const hub = () => page.locator('[data-conversation-hub]:visible');
      const selector = () => hub().getByLabel('Selecionar sinistro da conversa',{exact:true});
      const chat = () => hub().locator('[data-atlas-chat]:visible');
      const input = role => chat().getByLabel(role==='cliente'?'Mensagem para a Aon':'Mensagem para o cliente',{exact:true});
      const send = () => chat().getByRole('button',{name:'Enviar mensagem',exact:true});
      const allRecords = () => page.evaluate(key=>JSON.parse(localStorage.getItem(key)).sinistros,STORE);
      const record = async id => (await allRecords()).find(s=>s.id===id);
      const menu = async () => {
        await page.locator('.atl-top').waitFor();
        const button=page.getByRole('button',{name:'Abrir menu',exact:true});
        if(await button.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await button.click();
      };
      const nav = async name => {await menu();await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();};
      const logout = async () => {await menu();await page.locator('.atl-side').getByRole('button',{name:'Trocar de perfil',exact:true}).click();};
      const enter = async role => {await page.locator('[data-profile='+role+']').click();await page.getByRole('button',{name:/^Entrar na demonstração/}).click();await page.locator('.atl-top').waitFor();};
      const selectCase = async id => {await selector().selectOption(id);await page.locator('[data-conversation-hub] [data-atlas-chat="'+id+'"]:visible').waitFor();};
      const waitText = (id,text) => page.waitForFunction(({key,id,text})=>JSON.parse(localStorage.getItem(key)).sinistros.find(s=>s.id===id).mensagens.some(m=>m.texto===text),{key:STORE,id,text});
      const verifyActionGroup = async () => {
        await menu();
        const group=page.locator('.atl-group').filter({has:page.getByRole('button',{name:'Conversas',exact:true})});
        assert.equal((await group.locator('.atl-group-t').innerText()).trim(),'Ações');
        const labels=await group.getByRole('button').allTextContents();
        const idx=labels.findIndex(label=>label.trim()==='Conversas');
        assert(idx>0&&/Comunicar incidente|Registrar comunicação/.test(labels[idx-1]),'Conversas should follow the communication action in Ações');
        await group.getByRole('button',{name:'Conversas',exact:true}).click();
        await hub().waitFor();
      };
      try {
        await page.goto(pathToFileURL(path.resolve('Atlas-teste.html')).href);
        await page.waitForFunction(key=>!!localStorage.getItem(key),STORE);
        const fixture=await page.evaluate(({key,target,second,closed,other})=>{
          const sinistros=seedSinistros(), company=sinistros.find(s=>s.id===target).segurado;
          for(const id of [target,second,closed])sinistros.find(s=>s.id===id).segurado=company;
          sinistros.find(s=>s.id===other).segurado='Empresa Externa de Teste S.A.';
          for(const s of sinistros)s.mensagens=[];
          sinistros.find(s=>s.id===target).mensagens=[{id:'HUB-SEED-1',ts:'2026-11-04T12:00:00Z',de:'Aon',por:'Equipe Aon',texto:'Conversa inicial exclusiva do caso seis.'}];
          sinistros.find(s=>s.id===second).mensagens=[{id:'HUB-SEED-2',ts:'2026-11-04T13:00:00Z',de:'Cliente',por:'Helena Prado',texto:'Conversa inicial exclusiva do caso um.'}];
          const state={v:5,sinistros,apolices:seedApolices()};
          const original=JSON.stringify({marker:'main-data-untouched',state});
          localStorage.setItem('atlas-seguros:v5',original);
          sessionStorage.setItem('atlas-seguros:sessao','main-session-untouched');
          localStorage.setItem('atlas:theme:v1','light');
          localStorage.setItem(key,JSON.stringify(state));
          sessionStorage.removeItem('atlas-teste-seguros:sessao');
          return {company,original,ownIds:sinistros.filter(s=>s.segurado===company).map(s=>s.id),allIds:sinistros.map(s=>s.id),targetType:sinistros.find(s=>s.id===target).tipo,targetContact:sinistros.find(s=>s.id===target).contato};
        },{key:STORE,target:TARGET,second:SECOND,closed:CLOSED,other:OTHER});
        await page.reload();await enter('cliente');await verifyActionGroup();
        const ownOptions=await selector().locator('option').evaluateAll(nodes=>nodes.filter(n=>n.value).map(n=>({id:n.value,label:n.textContent})));
        assert.deepStrictEqual(ownOptions.map(o=>o.id).sort(),fixture.ownIds.sort(),'Cliente must only access their company cases');
        assert(ownOptions.every(o=>o.label.includes(o.id)&&o.label.includes(fixture.company)),'Every selector option should identify case and company');
        assert(!ownOptions.some(o=>o.id===OTHER));
        await selectCase(TARGET);
        const hubText=await hub().innerText();
        assert(hubText.includes(TARGET)&&hubText.includes(fixture.company)&&hubText.includes(fixture.targetType),'Selected conversation must identify case, company and incident');
        assert(hubText.includes(fixture.targetContact.nome),'Conversation context must identify the company contact');
        if(fixture.targetContact.email)assert(hubText.includes(fixture.targetContact.email));
        assert((await chat().innerText()).includes('Conversa inicial exclusiva do caso seis.'));
        assert(!(await chat().innerText()).includes('Conversa inicial exclusiva do caso um.'));
        report.checks.push(scenario.name+': Conversas fica em Ações; cliente vê somente seus casos, com empresa, sinistro e tipo identificados');

        const firstDraft='Rascunho exclusivo do caso seis';
        await input('cliente').fill(firstDraft);await selectCase(SECOND);assert.equal(await input('cliente').inputValue(),'');
        await input('cliente').fill('Rascunho exclusivo do caso um');await selectCase(TARGET);assert.equal(await input('cliente').inputValue(),firstDraft);
        await selectCase(SECOND);await nav('Meus sinistros');await nav('Conversas');
        assert.equal(await selector().inputValue(),SECOND,'Leaving and returning must preserve the selected case');
        await page.reload();await nav('Conversas');
        assert.equal(await selector().inputValue(),SECOND,'Reloading must preserve the case selection for this profile and company');
        await selectCase(TARGET);
        const first='Cliente no caso seis: solicito uma atualização sobre a análise.';
        await input('cliente').fill(first);await send().click();await waitText(TARGET,first);
        assert(!(await record(SECOND)).mensagens.some(m=>m.texto===first));
        await selectCase(SECOND);assert.equal(await input('cliente').inputValue(),'Rascunho exclusivo do caso um');
        const second='Cliente no caso um: os documentos deste sinistro foram revisados.';
        await input('cliente').fill(second);await send().click();await waitText(SECOND,second);
        assert(!(await record(TARGET)).mensagens.some(m=>m.texto===second));
        assert((await record(TARGET)).historico.some(h=>h.texto.includes('Cliente no caso seis')));
        assert((await record(SECOND)).historico.some(h=>h.texto.includes('Cliente no caso um')));
        report.checks.push(scenario.name+': troca de sinistro mantém rascunhos separados e cada envio entra somente no caso e histórico corretos');

        await selectCase(TARGET);await hub().getByRole('button',{name:'Ver detalhes do sinistro',exact:true}).click();
        await page.getByRole('heading',{name:new RegExp(TARGET)}).waitFor();
        assert.equal(await hub().count(),0,'Details action must leave the central conversation view');
        await nav('Conversas');await hub().waitFor();await selectCase(CLOSED);
        assert.equal(await chat().locator('textarea').count(),0,'Concluded conversations must be read-only');
        assert((await chat().innerText()).includes('Acompanhamento concluído'));
        await logout();await enter('aon');await verifyActionGroup();
        const aonOptions=await selector().locator('option').evaluateAll(nodes=>nodes.filter(n=>n.value).map(n=>({id:n.value,label:n.textContent})));
        assert.deepStrictEqual(aonOptions.map(o=>o.id).sort(),fixture.allIds.sort(),'Aon should have access to all client cases, including concluded');
        assert(aonOptions.find(o=>o.id===OTHER).label.includes('Empresa Externa de Teste S.A.'));
        const listSearch=hub().getByLabel('Buscar sinistro ou empresa',{exact:true});
        if(await listSearch.isVisible()){
          const beforeSearch=JSON.stringify(await allRecords());
          await listSearch.fill('Empresa Externa de Teste');
          const caseButtons=hub().locator('.ach-sidebar [data-conversation-case]');
          assert.equal(await caseButtons.count(),1,'Conversation list search must narrow to the matching company');
          await caseButtons.click();assert.equal(await selector().inputValue(),OTHER);
          await listSearch.fill('nenhum-sinistro-deste-nome');
          assert.equal(await caseButtons.count(),0);
          assert.equal(await selector().inputValue(),OTHER,'An empty search must preserve the open conversation');
          await listSearch.fill('');assert.equal(await caseButtons.count(),fixture.allIds.length);
          assert.equal(JSON.stringify(await allRecords()),beforeSearch,'List searching and selecting must not alter case records');
        }
        await nav('Visão geral');
        const dashboardFilter=page.getByLabel('Filtrar por cliente',{exact:true});
        if(await dashboardFilter.count()){
          const value=await dashboardFilter.locator('option').filter({hasText:'Empresa Externa de Teste S.A.'}).getAttribute('value');
          if(value)await dashboardFilter.selectOption(value);
        }
        await nav('Conversas');
        assert.equal(await selector().locator('option[value="'+TARGET+'"]').count(),1,'A dashboard company filter must not hide unrelated central conversations');
        await selectCase(TARGET);assert((await chat().innerText()).includes(first));
        assert.equal(await input('aon').inputValue(),'','Aon must not inherit the Cliente draft');
        const reply='Aon no caso seis: as informações deste sinistro estão em conferência.';
        await input('aon').fill(reply);await send().click();await waitText(TARGET,reply);
        assert.equal((await record(TARGET)).mensagens.at(-1).de,'Aon');
        assert(!(await record(SECOND)).mensagens.some(m=>m.texto===reply));
        const exported=await page.evaluate(({key,id})=>{const state=JSON.parse(localStorage.getItem(key)),s=state.sinistros.find(s=>s.id===id);return buildCaseReportModel(s,state.sinistros,'Equipe Teste',nowTs(),state.apolices).sections.find(section=>section.id==='mensagens');},{key:STORE,id:TARGET});
        assert(JSON.stringify(exported).includes(first)&&JSON.stringify(exported).includes(reply),'PDF report must retain the full conversation for the selected case');
        assert(!JSON.stringify(exported).includes(second));
        report.checks.push(scenario.name+': Aon acessa todas as empresas, responde no caso certo e o relatório PDF mantém a conversa daquele sinistro');

        await selectCase(OTHER);assert((await hub().innerText()).includes('Empresa Externa de Teste S.A.'));
        assert(!(await chat().innerText()).includes(reply));
        await hub().getByRole('button',{name:'Ver detalhes do sinistro',exact:true}).click();
        await page.getByRole('heading',{name:new RegExp(OTHER)}).waitFor();
        await nav('Conversas');await selectCase(CLOSED);
        assert.equal(await chat().locator('textarea').count(),0);
        await selectCase(TARGET);
        for(const mode of ['light','dark']){
          await page.evaluate(mode=>window.AtlasAppearance.set(mode),mode);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          for(const width of scenario.engine==='webkit'?[390]:[320,390,768,1366]){
            await page.setViewportSize({width,height:844});
            await hub().scrollIntoViewIfNeeded();
            assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),mode+' '+width+'px central conversations overflow');
            const selBox=await selector().boundingBox();
            assert(selBox.x>=0&&selBox.x+selBox.width<=width+1&&selBox.height>=44,'Case selector must fit with a full touch target');
            assert(parseFloat(await selector().evaluate(el=>getComputedStyle(el).fontSize))>=16);
            assert(await chat().locator('[data-chat-scroll]').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
            const box=await send().boundingBox();assert(box.height>=44&&box.x+box.width<=width+1);
            if(scenario.engine==='chromium'&&(width===390||width===1366))await page.screenshot({path:path.join(out,'hub-aon-'+mode+'-'+width+'.png'),fullPage:true});
          }
        }
        await logout();await enter('cliente');await nav('Conversas');await selectCase(TARGET);
        assert((await chat().innerText()).includes(reply));
        assert(!(await chat().innerText()).includes(second));
        await page.setViewportSize({width:390,height:844});
        await page.screenshot({path:path.join(out,'hub-cliente-'+scenario.engine+'-390.png'),fullPage:true});
        assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-seguros:v5')),fixture.original);
        assert.equal(await page.evaluate(()=>sessionStorage.getItem('atlas-seguros:sessao')),'main-session-untouched');
        assert.equal(await page.evaluate(()=>localStorage.getItem('atlas:theme:v1')),'light');
        assert.deepStrictEqual(errors,[]);
        report.checks.push(scenario.name+': detalhes abrem o sinistro correto; concluídos ficam para consulta; 320/390/768/1366 e dois temas preservam layout e dados principais');
        report.scenarios.push({name:scenario.name,passed:true});
      } finally {await context.close();}
    }
    assert.equal(hash('Atlas.html'),mainHash,'Main Atlas.html changed');
  } catch(error){report.errors.push(error.stack||String(error));throw error;}
  finally {
    fs.writeFileSync(path.join(out,'conversation-hub-validation.json'),JSON.stringify(report,null,2));
    for(const browser of Object.values(browsers))await browser.close();
    report.checks.forEach(check=>console.log('PASS: '+check));
  }
})().catch(error=>{console.error(error);process.exit(1);});
