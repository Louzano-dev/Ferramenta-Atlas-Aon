/* Isolated audit fixtures only; this script never writes the delivered source. */
const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const url=pathToFileURL(path.resolve('Atlas.html')).href;

(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'America/Sao_Paulo',reducedMotion:'reduce',offline:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const report={timezone:'America/Sao_Paulo',fixtureCases:4,fixtureEvents:152,checks:[],errors};
  const ok=message=>{report.checks.push(message);console.log(message);};
  const expect=(condition,message)=>{if(!condition)throw Error(message);};
  const historyRows=()=>page.locator('[data-history-case]');
  const completedRows=()=>page.locator('[data-concluido]');
  const totalText=()=>page.locator('.cth-pager>p').innerText();
  async function nav(name){
    const menu=page.getByRole('button',{name:'Abrir menu',exact:true});
    if(await menu.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await menu.click();
    await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();
  }
  async function resetHistory(){await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();}
  async function setStore(value){
    await page.evaluate(data=>{const raw=JSON.stringify(data);localStorage.setItem('atlas-seguros:v5',raw);window.dispatchEvent(new StorageEvent('storage',{key:'atlas-seguros:v5',newValue:raw}));},value);
  }
  try{
    await page.goto(url);
    const fixture=await page.evaluate(()=>{
      const bases=seedSinistros(),events=(count,name,offset)=>Array.from({length:count},(_,i)=>({ts:new Date(Date.UTC(2026,10,offset,10,i*5)).toISOString(),texto:'Documento recebido '+name+' número '+String(i+1).padStart(3,'0'),por:'Analista '+name,perfil:'Aon',interno:i%5===0}));
      const cases=['Alpha','Beta','Gama','Delta'].map((name,i)=>({...bases[i],id:'AUDIT-00'+(i+1),segurado:'Audit '+name,encerrado:null,acompanhamentoMovimentos:[],historico:[]}));
      cases[0].tipo='Ransomware';cases[0].historico=events(75,'A',1);
      cases[0].historico[0]={ts:'2026-11-04T00:30:00.000Z',texto:'Documento recebido em verificação de fronteira de data',por:'Analista Fronteira',perfil:'Aon',interno:false};
      cases[1].tipo='Vazamento de dados';cases[1].historico=events(70,'B',2);
      cases[1].encerrado={ts:'2026-11-04T00:30:00.000Z',por:'Analista Conclusão',nota:'Acompanhamento de teste concluído sem alterar a seguradora.'};
      cases[1].historico[69]={ts:cases[1].encerrado.ts,texto:'Acompanhamento concluído pela Aon: '+cases[1].encerrado.nota,tipo:'conclusao',por:'Analista Conclusão',perfil:'Aon',interno:false,detalhes:{motivo:cases[1].encerrado.nota,estadoAnterior:'ativo',estadoAtual:'concluido'}};
      cases[2].tipo='Ransomware';cases[2].historico=events(6,'C',1);
      cases[2].acompanhamentoMovimentos=[{id:'AUDIT-MOV-1',tipo:'reabertura',ts:'2026-11-04T13:00:00.000Z',por:'Analista Reabertura',nota:'Novos documentos após conclusão.'}];
      cases[2].historico[5]={ts:'2026-11-04T13:00:00.000Z',texto:'Acompanhamento reaberto pela Aon: Novos documentos após conclusão. Descrição completa de auditoria preservada, inclusive a informação registrada anteriormente.',tipo:'reabertura',por:'Analista Reabertura',perfil:'Aon',interno:false,detalhes:{motivo:'Novos documentos após conclusão.',estadoAnterior:'concluido',estadoAtual:'ativo',conclusaoAnterior:{ts:'2026-11-02T10:00:00.000Z',nota:'Conclusão anterior preservada.',por:'Analista anterior'}}};
      cases[3].tipo='Fraude digital';cases[3].dataComunicacao='';cases[3].encaminhamento={...cases[3].encaminhamento,dataAbertura:''};cases[3].criadoEm='2026-11-04T00:30:00.000Z';cases[3].encerrado={ts:'2026-11-05T12:00:00.000Z',por:'Analista Delta',nota:'Concluído para testar período e tipo.'};
      cases[3].historico=[{ts:cases[3].encerrado.ts,texto:'Acompanhamento concluído pela Aon: '+cases[3].encerrado.nota,tipo:'conclusao',por:'Analista Delta',perfil:'Aon',interno:false}];
      const state={v:5,sinistros:cases,apolices:seedApolices()};localStorage.setItem('atlas-seguros:v5',JSON.stringify(state));sessionStorage.setItem('atlas-seguros:sessao',JSON.stringify({perfil:'aon',nome:'Analista Auditoria',empresa:'Aon (corretora)'}));return state;
    });
    await page.reload();await nav('Casos concluídos');
    expect(await completedRows().count()===2,'Completed cases must include both fixture closures');
    expect((await page.locator('[data-concluido="AUDIT-004"] td').nth(3).innerText()).includes('03/11/2026'),'Registration timestamp fallback must use local date');
    await page.getByLabel('Buscar casos concluídos',{exact:true}).fill('Audit Beta');expect(await completedRows().count()===1,'Completed company search failed');
    await page.getByLabel('Buscar casos concluídos',{exact:true}).fill('AUDIT-002');expect(await completedRows().count()===1,'Completed identifier search failed');
    await page.getByLabel('Conclusão a partir de',{exact:true}).fill('2026-11-03');await page.getByLabel('Conclusão até',{exact:true}).fill('2026-11-03');
    await page.getByLabel('Tipo de incidente concluído',{exact:true}).selectOption('Vazamento de dados');expect(await completedRows().count()===1,'Completed inclusive local date/type filter failed');
    await page.getByLabel('Tipo de incidente concluído',{exact:true}).selectOption('Fraude digital');expect(await completedRows().count()===0,'Completed filters must combine');
    await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();expect(await completedRows().count()===2,'Completed reset failed');
    await page.getByRole('button',{name:'Ver detalhes de AUDIT-002',exact:true}).click();expect(await page.getByRole('heading',{name:/AUDIT-002/}).count()===1,'Completed action does not reuse case detail');
    ok('Completed search, combined inclusive date/type filters, reset and original case details OK');

    await nav('Histórico geral');expect((await totalText()).includes('152'),'History total does not include all events');expect(await historyRows().count()===20,'Default history page size must be20');
    const seen=new Set();
    while(true){
      for(const value of await historyRows().evaluateAll(rows=>rows.map(row=>row.getAttribute('data-history-case')+'|'+row.querySelector('.cth-summary').getAttribute('title'))))seen.add(value);
      const next=page.getByRole('button',{name:'Próxima página',exact:true});if(await next.isDisabled())break;await next.click();
    }
    expect(seen.size===152,'History pagination dropped/duplicated events: '+seen.size);expect((await totalText()).startsWith('141–152'),'Last page range incorrect');
    await page.getByLabel('Registros por página',{exact:true}).selectOption('100');expect(await historyRows().count()===100,'Page size100 not applied');
    await page.getByRole('button',{name:'Próxima página',exact:true}).click();expect(await historyRows().count()===52,'Page two at size100 must contain52 events');
    await page.getByLabel('Filtrar histórico',{exact:true}).fill('Audit Alpha');expect(await historyRows().count()===75,'Filter must reset pagination');expect((await totalText()).startsWith('1–75'),'Filtered page did not reset to1');
    await resetHistory();await page.getByLabel('Registros por página',{exact:true}).selectOption('20');await page.getByRole('button',{name:'Próxima página',exact:true}).click();
    const smaller=JSON.parse(JSON.stringify(fixture));smaller.sinistros.forEach(s=>s.historico=s.historico.slice(0,2));await setStore(smaller);await page.waitForFunction(()=>document.querySelectorAll('[data-history-case]').length===7);expect((await totalText()).startsWith('1–7'),'Page not clamped after stored data changes');await setStore(fixture);await page.waitForFunction(()=>document.querySelectorAll('[data-history-case]').length===20);
    ok('All152 events accessible, all pages/page sizes and filter/data pagination reset OK');

    await page.getByLabel('Filtrar histórico',{exact:true}).fill('AUDIT-002');await page.getByLabel('Histórico a partir de',{exact:true}).fill('2026-11-03');await page.getByLabel('Histórico até',{exact:true}).fill('2026-11-03');await page.getByLabel('Tipo de movimentação',{exact:true}).selectOption('Conclusão');await page.getByLabel('Responsável pela movimentação',{exact:true}).selectOption('Analista Conclusão');await page.getByLabel('Situação atual do caso',{exact:true}).selectOption('concluido');expect(await historyRows().count()===1,'All combined history filters failed');
    await page.getByLabel('Situação atual do caso',{exact:true}).selectOption('ativo');expect(await historyRows().count()===0,'Current active filter incorrectly includes concluded case');await resetHistory();
    await page.getByLabel('Filtrar histórico',{exact:true}).fill('AUDIT-001');await page.getByLabel('Histórico a partir de',{exact:true}).fill('2026-11-03');await page.getByLabel('Histórico até',{exact:true}).fill('2026-11-03');await page.getByLabel('Tipo de movimentação',{exact:true}).selectOption('Documentos');await page.getByLabel('Responsável pela movimentação',{exact:true}).selectOption('Analista Fronteira');expect(await historyRows().count()===1,'UTC boundary event must belong to local November3');expect((await historyRows().first().innerText()).includes('03/11/2026 21:30'),'Date display disagrees with local date filter');
    await page.getByLabel('Histórico até',{exact:true}).fill('2026-11-04');await page.getByLabel('Histórico a partir de',{exact:true}).fill('2026-11-04');expect(await historyRows().count()===0,'UTC date must not override local calendar filtering');await resetHistory();
    await page.getByLabel('Situação atual do caso',{exact:true}).selectOption('ativo');expect((await totalText()).includes('81'),'Active filter must include reopened cases');await page.getByLabel('Situação atual do caso',{exact:true}).selectOption('reaberto');expect(await historyRows().count()===6,'Reopened current-state filter must include all six actual events of that case');await page.getByLabel('Tipo de movimentação',{exact:true}).selectOption('Reabertura');expect(await historyRows().count()===1,'Reopening movement filter failed');
    ok('All combined history filters, current state semantics and SãoPaulo midnight boundary OK');

    const trigger=page.getByRole('button',{name:/^Ver movimentação de AUDIT-003/});await trigger.click();const dialog=page.getByRole('dialog',{name:'Detalhes da movimentação',exact:true});await dialog.waitFor();
    expect((await dialog.innerText()).includes('Descrição completa de auditoria preservada'),'Full original description missing');expect((await dialog.innerText()).includes('Conclusão anterior preservada.'),'Recorded structured details missing');expect(await dialog.locator('pre').count()===0,'Recorded details should be readable fields, not raw JSON');expect((await dialog.innerText()).includes('Situação após a movimentação'),'Recorded lifecycle fields are missing human labels');
    await page.keyboard.press('Shift+Tab');expect(await dialog.getByRole('button',{name:'Voltar ao histórico',exact:true}).evaluate(el=>document.activeElement===el),'ShiftTab must stay inside event dialog');await page.keyboard.press('Tab');expect(await dialog.getByRole('button',{name:'Fechar movimentação',exact:true}).evaluate(el=>document.activeElement===el),'Tab must wrap to the first dialog control');
    await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});expect(await trigger.evaluate(el=>document.activeElement===el),'Escape must restore focus to original row action');
    await trigger.click();await page.getByRole('dialog').getByRole('button',{name:'Abrir caso AUDIT-003',exact:true}).click();expect(await page.getByRole('heading',{name:/AUDIT-003/}).count()===1,'History dialog link does not open original case detail');
    ok('Event dialog preserves full/structured data, Escape focus and linked original case OK');

    for(const width of [320,768]){
      await page.setViewportSize({width,height:width===320?568:1024});await nav('Histórico geral');await page.getByLabel('Filtrar histórico',{exact:true}).fill('AUDIT-003');
      expect(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),width+'px history causes document overflow');
      await page.getByRole('button',{name:/^Ver movimentação de AUDIT-003/}).first().click();const d=page.getByRole('dialog');const rect=await d.boundingBox();expect(rect.x>=0&&rect.x+rect.width<=width+.5,width+'px dialog clipped horizontally');await page.keyboard.press('Escape');
      await nav('Casos concluídos');expect(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),width+'px completed table causes document overflow');
      if(width===320)await page.screenshot({path:'tools/atlas-completed-mobile.png',fullPage:true});
    }
    ok('320px and768px compact tables/dialogs remain inside document width');
    expect(errors.length===0,'Browser errors: '+errors.join('\n'));report.passed=true;console.log('PASS: completed cases and all history records, filters, pagination and event details.');
  }finally{fs.writeFileSync('tools/history-validation.json',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
