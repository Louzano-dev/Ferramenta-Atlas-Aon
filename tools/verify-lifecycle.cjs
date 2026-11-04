const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const url='file:///'+path.resolve('Atlas.html').replaceAll('\\','/');
const TARGET='SIN-2026-005',LEGACY='SIN-2026-007';
const allowed=['encerrado','historico','acompanhamentoMovimentos','atualizadoEm'];
const stable=(s,extra=[])=>Object.fromEntries(Object.entries(s).filter(([key])=>![...allowed,...extra].includes(key)));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},offline:true,reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const record=()=>page.evaluate(id=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.id===id),TARGET);
 const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros);
 const openMenu=async()=>{const menu=page.getByRole('button',{name:'Abrir menu',exact:true});if(await menu.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await menu.click();};
 const nav=async name=>{await openMenu();await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();};
 const logout=async()=>{await openMenu();await page.getByRole('button',{name:'Trocar de perfil',exact:true}).first().click();};
 const enter=async profile=>{await page.locator('[data-profile='+profile+']').click();await page.getByRole('button',{name:'Entrar na demonstração'}).click();await page.locator('.atl-top').waitFor();};
 const openActive=async id=>{await nav('Sinistros');await page.getByRole('button',{name:id,exact:true}).click();await page.locator('[data-case-lifecycle="'+id+'"]').waitFor();};
 const openClosed=async id=>{await nav('Casos concluídos');await page.getByRole('button',{name:'Ver detalhes de '+id,exact:true}).click();await page.locator('[data-case-lifecycle="'+id+'"]').waitFor();};
 const changed=async(id,closed)=>page.waitForFunction(({id,closed})=>!!JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.id===id).encerrado===closed,{id,closed});
 const conclude=async(id,note)=>{await page.locator('[data-case-lifecycle="'+id+'"] [data-lifecycle-action=concluir]').click();const dialog=page.getByRole('dialog',{name:'Concluir acompanhamento',exact:true});await dialog.getByLabel('Observação da conclusão').fill(note);const check=dialog.getByRole('checkbox');if(await check.count())await check.click();await dialog.getByRole('button',{name:'Confirmar conclusão',exact:true}).click();await changed(id,true);await dialog.waitFor({state:'detached'});};
 const reopen=async(id,note)=>{await page.locator('[data-case-lifecycle="'+id+'"] [data-lifecycle-action=reabrir]').click();const dialog=page.getByRole('dialog',{name:'Reabrir acompanhamento',exact:true});await dialog.getByLabel('Justificativa da reabertura').fill(note);await dialog.getByRole('button',{name:'Confirmar reabertura',exact:true}).click();await changed(id,false);await dialog.waitFor({state:'detached'});};
 try{
  await page.goto(url);await enter('aon');
  const initial=await records(),before=initial.find(s=>s.id===TARGET),legacyBefore=initial.find(s=>s.id===LEGACY);
  assert(!before.encerrado);assert(legacyBefore.encerrado);
  const activeBefore=Number(await page.locator('[data-stat=ativos] .text-2xl').innerText()),closedBefore=Number(await page.locator('[data-stat=concluidos] .text-2xl').innerText());
  await openActive(TARGET);
  await page.locator('[data-lifecycle-action=concluir]').click();
  let dialog=page.getByRole('dialog',{name:'Concluir acompanhamento',exact:true});
  await dialog.getByLabel('Observação da conclusão').fill('abc');await dialog.getByRole('button',{name:'Confirmar conclusão'}).click();
  await dialog.getByRole('alert').waitFor();assert.deepStrictEqual(await record(),before);
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();assert.deepStrictEqual(await record(),before);
  await page.locator('[data-lifecycle-action=concluir]').click();dialog=page.getByRole('dialog',{name:'Concluir acompanhamento',exact:true});
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Observação da conclusão');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Confirmar conclusão');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Observação da conclusão');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>document.activeElement.dataset.lifecycleAction),'concluir');assert.deepStrictEqual(await record(),before);
  checks.push('Mandatory conclusion note, cancel, Escape and trapped/restored focus');

  const note1='Conclusão de teste preservando todos os dados da seguradora.';
  await conclude(TARGET,note1);let closed=await record();assert(closed.encerrado);assert.equal(closed.encerrado.nota,note1);assert.equal(closed.encerrado.por,'Vitor Louzano');assert.deepStrictEqual(stable(closed),stable(before));assert.deepStrictEqual(closed.historico.slice(0,before.historico.length),before.historico);assert.equal(closed.historico.at(-1).tipo,'conclusao');
  await nav('Sinistros');assert.equal(await page.getByRole('button',{name:TARGET,exact:true}).count(),0);
  await nav('Casos concluídos');assert.equal(await page.locator('[data-concluido="'+TARGET+'"]').count(),1);
  await nav('Visão geral');assert.equal(Number(await page.locator('[data-stat=ativos] .text-2xl').innerText()),activeBefore-1);assert.equal(Number(await page.locator('[data-stat=concluidos] .text-2xl').innerText()),closedBefore+1);
  await nav('Histórico geral');await page.getByLabel('Filtrar histórico',{exact:true}).fill(TARGET);await page.getByLabel('Tipo de movimentação',{exact:true}).selectOption('Conclusão');assert((await page.locator('.cth-table').innerText()).includes(note1));
  checks.push('Conclusion moves case from active to completed, updates counters and actual history');

  await openClosed(TARGET);await page.locator('[data-lifecycle-action=reabrir]').click();dialog=page.getByRole('dialog',{name:'Reabrir acompanhamento',exact:true});await dialog.getByRole('button',{name:'Confirmar reabertura'}).click();await dialog.getByRole('alert').waitFor();assert.deepStrictEqual(await record(),closed);await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  const reason1='Novos documentos exigem acompanhamento adicional.';
  await reopen(TARGET,reason1);let reopened=await record();assert.equal(reopened.encerrado,null);assert.deepStrictEqual(stable(reopened),stable(before));assert.equal(reopened.historico.at(-1).tipo,'reabertura');assert.equal(reopened.historico.at(-1).detalhes.conclusaoAnterior.nota,note1);
  await nav('Casos concluídos');assert.equal(await page.locator('[data-concluido="'+TARGET+'"]').count(),0);await openActive(TARGET);
  await nav('Visão geral');assert.equal(Number(await page.locator('[data-stat=ativos] .text-2xl').innerText()),activeBefore);assert.equal(Number(await page.locator('[data-stat=concluidos] .text-2xl').innerText()),closedBefore);
  checks.push('Reopening requires reason and preserves same case, coverage, payment, protocol and documents');

  await openActive(TARGET);await conclude(TARGET,'Segunda conclusão documentada no mesmo acompanhamento.');await reopen(TARGET,'Nova informação recebida após a segunda conclusão.');
  const select=page.getByLabel('Responsável',{exact:true}),current=await select.inputValue();const next=await select.locator('option').evaluateAll((els,current)=>els.map(el=>el.value).find(value=>value!==current&&value!=='A definir'),current);
  await select.selectOption(next);await page.waitForFunction(({id,next})=>JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros.find(s=>s.id===id).responsavel===next,{id:TARGET,next});
  await conclude(TARGET,'Terceira conclusão após atualização do responsável.');closed=await record();assert.equal(closed.acompanhamentoMovimentos.filter(m=>m.tipo==='conclusao').length,3);assert.equal(closed.acompanhamentoMovimentos.filter(m=>m.tipo==='reabertura').length,2);assert.equal(closed.historico.length,before.historico.length+6);assert.deepStrictEqual(stable(closed,['responsavel']),stable(before,['responsavel']));assert.equal((await records()).filter(s=>s.id===TARGET).length,1);assert.equal((await records()).length,initial.length);
  checks.push('Repeated close/reopen/update/close cycles accumulate without duplicate records');

  await openClosed(LEGACY);await reopen(LEGACY,'Reabertura de caso legado para novas informações.');const legacy=(await records()).find(s=>s.id===LEGACY);assert.deepStrictEqual(stable(legacy),stable(legacyBefore));assert.equal(legacy.acompanhamentoMovimentos[0].tipo,'conclusao');assert.equal(legacy.acompanhamentoMovimentos[0].nota,legacyBefore.encerrado.nota);assert.equal(legacy.acompanhamentoMovimentos[0].ts,legacyBefore.encerrado.ts);assert.equal(legacy.historico.at(-1).detalhes.conclusaoAnterior.por,legacyBefore.encerrado.por);
  await page.reload();await page.locator('.atl-top').waitFor();const persisted=await records();assert.deepStrictEqual(persisted.find(s=>s.id===TARGET),closed);assert.deepStrictEqual(persisted.find(s=>s.id===LEGACY),legacy);
  checks.push('Legacy closure preserved on reopen and full state survives reload');

  await openActive('SIN-2026-001');const issueBefore=(await records()).find(s=>s.id==='SIN-2026-001');await page.locator('[data-lifecycle-action=concluir]').click();dialog=page.getByRole('dialog',{name:'Concluir acompanhamento',exact:true});assert.equal(await dialog.getByRole('checkbox').count(),1);await dialog.getByLabel('Observação da conclusão').fill('Conclusão com pendências explicitamente reconhecidas.');await dialog.getByRole('button',{name:'Confirmar conclusão'}).click();assert((await dialog.getByRole('alert').innerText()).includes('questões em aberto'));assert.deepStrictEqual((await records()).find(s=>s.id==='SIN-2026-001'),issueBefore);await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  checks.push('Open issues require explicit acknowledgement, without changing insurer decisions');

  await logout();await enter('cliente');const clientData=await page.evaluate(()=>({session:JSON.parse(sessionStorage.getItem('atlas-seguros:sessao')),all:JSON.parse(localStorage.getItem('atlas-seguros:v5')).sinistros,ids:[...document.querySelectorAll('button[data-sinistro]')].map(el=>el.dataset.sinistro)}));
  for(const id of clientData.ids)assert.equal(clientData.all.find(s=>s.id===id).segurado,clientData.session.empresa);
  await page.locator('button[data-sinistro]').first().click();assert.equal(await page.locator('[data-lifecycle-action]').count(),0);
  const denied=await page.evaluate(({activeId,closedId})=>{
    const host=document.querySelector('.atl-shell'),key=Object.keys(host).find(name=>name.startsWith('__reactFiber'));
    let f=host[key],actions=null;while(f){if(f.memoizedProps&&f.memoizedProps.actions){actions=f.memoizedProps.actions;break;}f=f.return;}
    if(!actions)return {found:false};const result={found:true};for(const [name,args] of [['encerrar',[activeId,'Tentativa indevida do cliente',true]],['reabrir',[closedId,'Tentativa indevida do cliente']]])try{actions[name](...args);result[name]=false;}catch(e){result[name]=e.message.includes('Somente a Aon');}return result;
  },{activeId:LEGACY,closedId:TARGET});assert(denied.found&&denied.encerrar&&denied.reabrir);assert.deepStrictEqual(await records(),persisted);
  checks.push('Client remains limited to own company and lifecycle action APIs reject Cliente');

  for(const width of [320,390]){
    const mobile=await browser.newContext({viewport:{width,height:640},offline:true,reducedMotion:'reduce'}),p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('[data-profile=aon]').click();await p.getByRole('button',{name:'Entrar na demonstração'}).click();await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await p.locator('.atl-nav').getByRole('button',{name:'Sinistros',exact:true}).click();await p.getByRole('button',{name:new RegExp(TARGET)}).click();await p.locator('[data-lifecycle-action=concluir]').click();const d=p.getByRole('dialog',{name:'Concluir acompanhamento',exact:true}),b=await d.boundingBox();assert(b.x>=0&&b.x+b.width<=width+.5);assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await p.keyboard.press('Escape');await d.waitFor({state:'detached'});await mobile.close();
  }
  checks.push('320/390px confirmation fits viewport and Escape works');
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync('tools/lifecycle-validation.json',JSON.stringify({checks,errors,caseCount:initial.length,cycles:3},null,2));checks.forEach(check=>console.log('PASS: '+check));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
