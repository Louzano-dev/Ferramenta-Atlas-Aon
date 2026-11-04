/* Fictional isolated records and files; all PDF generation happens offline. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('node_modules/.cache/playwright-browsers');
const {chromium,webkit,devices}=require('playwright');
const PDFLib=require('../node_modules/.atlas-pdf/node_modules/pdf-lib');
const root=path.resolve('tools/pdf-validation');fs.mkdirSync(root,{recursive:true});
const url=pathToFileURL(path.resolve('Atlas.html')).href;
const fold=s=>String(s).replace(/\s/g,'');
async function parse(bytes){
 const pdfjs=await import(pathToFileURL(path.resolve('node_modules/.atlas-pdf/node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
 const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,standardFontDataUrl:path.resolve('node_modules/.atlas-pdf/node_modules/pdfjs-dist/standard_fonts')+path.sep}).promise;
 let text='',outOfBounds=[];
 for(let n=1;n<=doc.numPages;n++){
  const page=await doc.getPage(n),content=await page.getTextContent(),width=page.view[2]-page.view[0];
  for(const item of content.items){if(!item.str)continue;text+=item.str+'\n';if(item.transform[4]<-1||item.transform[4]+item.width>width+1)outOfBounds.push({page:n,text:item.str.slice(0,80),x:item.transform[4],width:item.width,pageWidth:width});}
 }
 const attachments=await doc.getAttachments();const count=doc.numPages;await doc.destroy();return {text,attachments:attachments||{},count,outOfBounds};
}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let wkBrowser;
 const context=await browser.newContext({viewport:{width:1366,height:850},offline:true,reducedMotion:'reduce',timezoneId:'America/Sao_Paulo',acceptDownloads:true}),page=await context.newPage();
 const errors=[],network=[],report={checks:[],files:[],errors};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 async function nav(name){const button=page.getByRole('button',{name:'Abrir menu',exact:true});if(await button.isVisible()&&!await page.locator('.atl-side').evaluate(el=>el.classList.contains('is-open')))await button.click();await page.locator('.atl-nav').getByRole('button',{name,exact:true}).click();}
 async function open(id,closed=false){await nav(closed?'Casos concluídos':'Sinistros');if(closed)await page.getByRole('button',{name:'Ver detalhes de '+id,exact:true}).click();else await page.getByRole('button',{name:id,exact:true}).click();await page.locator('[data-case-pdf="'+id+'"]').waitFor();}
 async function download(id){
  const event=page.waitForEvent('download',{timeout:120000});await page.locator('[data-download-case-pdf="'+id+'"]').click();
  const file=await event;assert(file.suggestedFilename().endsWith('.pdf'));const target=path.join(root,file.suggestedFilename());await file.saveAs(target);
  await page.getByText('PDF gerado e enviado para download.',{exact:false}).waitFor();const bytes=fs.readFileSync(target);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');return {bytes,target,parsed:await parse(bytes)};
 }
 try{
  const source=await PDFLib.PDFDocument.create();source.addPage([420,300]).drawText('ANEXO-PDF-ORIGINAL-UMA-PAGINA',{x:24,y:220,size:12});source.addPage([420,300]).drawText('ANEXO-PDF-ORIGINAL-SEGUNDA-PAGINA',{x:24,y:220,size:12});
  const originalPdf=await source.save();
  await page.goto(url);
  const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=260;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#10213a';x.fillRect(18,18,604,224);x.fillStyle='#fff';x.font='26px Arial';x.fillText('EVIDENCIA VISUAL DO INCIDENTE',42,122);x.fillStyle='#eb0017';x.fillRect(42,145,210,8);return c.toDataURL('image/png').split(',')[1];});
  const contents={pdf:Buffer.from(originalPdf),image:Buffer.from(image,'base64'),old:Buffer.from('VERSAO-ANTERIOR-COMPLETA com acentuação: ação.'),new:Buffer.from('VERSAO-ATUAL-COMPLETA; dados e horários do log.'),html:Buffer.from('<script>window.PDF_TEST_EXECUTED=true</script>Arquivo original de evidência.'),bad:Buffer.from('%PDF-ARQUIVO-CORROMPIDO')};
  const payload=Object.fromEntries(Object.entries(contents).map(([id,bytes])=>[id,bytes.toString('base64')]));
  const fixture=await page.evaluate(async payload=>{
   const seed=seedSinistros(),actor='Analista PDF Teste',long='OBSERVACAO-TRIAGEM-INTEGRAL '+('Análise técnica completa, com decisão registrada e revisão humana. '.repeat(16))+' FIM-TRIAGEM-INTEGRAL';
   const hist=Array.from({length:162},(_,i)=>({ts:new Date(Date.UTC(2026,9,1,9,i)).toISOString(),texto:'EVENTO-INTEGRAL-'+String(i).padStart(3,'0')+' · '+('Documento e decisão registrados. '.repeat(5))+(i===161?' FIM-HISTORICO-INTEGRAL':''),perfil:'Aon',por:actor,interno:i%3===0,tipo:i===160?'reabertura':undefined,detalhes:i===160?{motivo:'REABERTURA-MOTIVO-INTEGRAL',conclusaoAnterior:{nota:'CONCLUSAO-ANTERIOR-PRESERVADA',ts:'2026-10-01T12:00:00Z',por:actor}}:undefined}));
   const meta=(id,nome,substituido=false)=>({id,nome,formato:nome.split('.').pop().toUpperCase(),tamanho:payload[id]?atob(payload[id]).length:40,anexadoEm:'2026-11-04T12:00:00Z',anexadoPor:actor,guardado:true,substituido});
   const full={...seed[0],id:'PDF-CASE-001',segurado:'Varejo Horizonte S.A.',descricao:'DESCRICAO-INTEGRAL '+('Ocorrência com impactos e investigação em curso. '.repeat(10))+' FIM-DESCRICAO',valorEstimado:5000000.75,retornoAonPrevisto:'2026-11-10',complementos:[{ts:'2026-11-04T12:01:00Z',por:actor,texto:'COMPLEMENTO-INTEGRAL-REGISTRADO'}],triagem:{categoria:'Ransomware',severidade:'Crítica',prioridade:'Alta',confirmadaEm:'2026-11-04T12:00:00Z',por:actor,ajustado:true,observacao:long},tarefas:[{id:'T1',titulo:'ACAO-INTERNA-CONCLUIDA',etapa:'Triagem',responsavel:actor,status:'Concluída',prazo:'2026-11-04',concluidaEm:'2026-11-04T12:00:00Z',nota:'NOTA-ACAO-INTEGRAL'}],documentos:[{id:'D1',nome:'Relatório forense',estado:'Validado',solicitado:true,motivo:'VALIDACAO-OBSERVACAO-INTEGRAL',recebidoEm:'2026-11-03T12:00:00Z',validadoEm:'2026-11-04T12:00:00Z',arquivos:[meta('pdf','relatório técnico.pdf'),meta('image','evidência.png')]},{id:'D2',nome:'Logs de segurança',estado:'Recebido',arquivos:[meta('old','logs.txt',true),meta('new','logs.txt'),meta('html','evidência.html'),meta('bad','protegido-ou-invalido.pdf')]},{id:'D3',nome:'Documento ainda solicitado',estado:'Pendente',arquivos:[meta('missing','arquivo-ausente.txt')]},{id:'D4',nome:'Documento recebido por outro canal',estado:'Validado',manual:true,arquivos:[]}],solicitacoes:[{id:'S1',texto:'SOLICITACAO-INTEGRAL '+long,origem:'Seguradora',status:'Respondida',resposta:'RESPOSTA-INTEGRAL '+long,respondidaEm:'2026-11-04T12:00:00Z',por:actor}],mensagens:[{id:'M1',ts:'2026-11-04T12:00:00Z',de:'Aon',por:actor,texto:'MENSAGEM-INTEGRAL '+long+' FIM-MENSAGEM-INTEGRAL'}],retornos:[{id:'R1',ts:'2026-11-04T12:00:00Z',fonte:'E-mail',por:actor,compartilhar:false,texto:'RETORNO-INTERNO-INTEGRAL '+long+' FIM-RETORNO-INTEGRAL'}],cobertura:{situacao:'Cobertura parcial',motivo:'DECISAO-COBERTURA-INTEGRAL '+long,data:'2026-11-04',por:actor,fonte:'E-mail',compartilhar:false},indenizacao:{status:'Pagamento parcial',valorAprovado:300000,valorPago:150000,dataPagamento:'2026-11-04',por:actor,fonte:'E-mail',compartilhar:true},encerrado:null,acompanhamentoMovimentos:[{id:'C1',tipo:'conclusao',ts:'2026-11-01T12:00:00Z',por:actor,nota:'CONCLUSAO-ANTERIOR-PRESERVADA'},{id:'C2',tipo:'reabertura',ts:'2026-11-02T12:00:00Z',por:actor,nota:'REABERTURA-MOTIVO-INTEGRAL'}],historico:hist,encaminhamento:{...seed[0].encaminhamento,mensagem:'MENSAGEM-ENCAMINHAMENTO-INTEGRAL '+long},campoFuturo:{anotacao:'CAMPO-ADICIONAL-INTEGRAL'}};
   const early={...seed[3],id:'PDF-EARLY-002',segurado:'Varejo Horizonte S.A.',triagem:null,documentos:[{id:'EP',nome:'Documento inicial pendente',estado:'Pendente',arquivos:[]}],encaminhamento:{estado:'nenhum'},cobertura:null,indenizacao:null,encerrado:null};
   const completed={...full,id:'PDF-CLOSED-003',documentos:full.documentos.filter(d=>d.id!=='D3').map(d=>({...d,estado:'Validado'})),solicitacoes:[],encerrado:{ts:'2026-11-04T12:30:00Z',por:actor,nota:'CONCLUSAO-FINAL-INTEGRAL'}};
   const policies=seedApolices(),foreign={...policies[0],numero:'FOREIGN-POLICY-NEVER-EXPORT',segurado:'OUTRO-CLIENTE-NAO-EXPORTAR'};
   const state={v:5,sinistros:[full,early,completed],apolices:[...policies,foreign]};localStorage.setItem('atlas-seguros:v5',JSON.stringify(state));sessionStorage.setItem('atlas-seguros:sessao',JSON.stringify({perfil:'aon',nome:actor,empresa:'Aon (corretora)'}));
   for(const [id,base64] of Object.entries(payload)){const binary=atob(base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));await arquivoPut(id,new Blob([bytes],{type:id==='pdf'||id==='bad'?'application/pdf':id==='image'?'image/png':'text/plain'}));}
   return state;
  },payload);
  await page.reload();const before=await page.evaluate(()=>localStorage.getItem('atlas-seguros:v5'));
  await open('PDF-EARLY-002');assert(await page.locator('[data-download-case-pdf]').isEnabled());
  for(const name of ['Resumo e andamento','Triagem e apólice','Plano de ações','Documentos e solicitações','Seguradora (externa)','Histórico']){await page.getByRole('tab',{name,exact:true}).click();assert.equal(await page.locator('[data-case-pdf]').count(),1);assert(await page.locator('[data-download-case-pdf]').isEnabled());assert.equal(await page.getByRole('button',{name:'Baixar dossiê (HTML)',exact:true}).count(),0);}
  const early=await download('PDF-EARLY-002');assert(early.parsed.text.includes('PDF-EARLY-002'));assert(early.parsed.text.includes('Documento inicial pendente'));assert(!early.parsed.text.includes('CONCLUSAO-FINAL-INTEGRAL'));
  report.checks.push('Direct PDF download is available in every case tab even before triage/opening and with pending documents; HTML export removed');
  await open('PDF-CASE-001');await page.evaluate(()=>AtlasAppearance.set('dark'));
  const full=await download('PDF-CASE-001'),text=fold(full.parsed.text);
  for(const marker of ['FIM-TRIAGEM-INTEGRAL','FIM-DESCRICAO','COMPLEMENTO-INTEGRAL-REGISTRADO','NOTA-ACAO-INTEGRAL','VALIDACAO-OBSERVACAO-INTEGRAL','SOLICITACAO-INTEGRAL','RESPOSTA-INTEGRAL','FIM-MENSAGEM-INTEGRAL','FIM-RETORNO-INTEGRAL','DECISAO-COBERTURA-INTEGRAL','MENSAGEM-ENCAMINHAMENTO-INTEGRAL','CONCLUSAO-ANTERIOR-PRESERVADA','REABERTURA-MOTIVO-INTEGRAL','EVENTO-INTEGRAL-000','EVENTO-INTEGRAL-161','FIM-HISTORICO-INTEGRAL','CAMPO-ADICIONAL-INTEGRAL','ANEXO-PDF-ORIGINAL-UMA-PAGINA','ANEXO-PDF-ORIGINAL-SEGUNDA-PAGINA'])assert(text.includes(fold(marker)),'Missing complete text: '+marker);
  assert(!text.includes('OUTRO-CLIENTE-NAO-EXPORTAR'));assert(!text.includes('FOREIGN-POLICY-NEVER-EXPORT'));
  assert.equal(full.parsed.outOfBounds.length,0,'Text overflow: '+JSON.stringify(full.parsed.outOfBounds.slice(0,8)));
  const attached=Object.values(full.parsed.attachments);for(const [id,bytes] of Object.entries(contents))assert(attached.some(file=>Buffer.from(file.content).equals(bytes)),'Missing original bytes: '+id);
  assert(Object.keys(full.parsed.attachments).length>=6);assert(full.parsed.count>10);
  assert.equal(await page.evaluate(()=>!!window.PDF_TEST_EXECUTED),false);await page.locator('.crp-issues summary').click();assert((await page.locator('.crp-issues').innerText()).includes('arquivo-ausente.txt'));
  const closed=await(async()=>{await open('PDF-CLOSED-003',true);return await download('PDF-CLOSED-003');})();assert(fold(closed.parsed.text).includes('CONCLUSAO-FINAL-INTEGRAL'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('atlas-seguros:v5')),before);
  report.checks.push('Complete and concluded reports preserve triage, decisions, internal notes, full messages, all 162 history events, cycle history and future fields without changing case data');
  report.checks.push('Original PDF/image/text/HTML/corrupted files are embedded byte-for-byte, including replaced versions; readable PDF pages are visible and missing files are identified');
  for(const width of [320,390,768,1366]){await page.setViewportSize({width,height:844});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));const box=await page.locator('[data-download-case-pdf]').boundingBox();assert(box.height>=44&&box.x>=0&&box.x+box.width<=width+1);}
  report.checks.push('PDF action fits mobile/tablet/desktop layouts and dark mode');
  report.files=[early,full,closed].map(file=>({file:path.basename(file.target),bytes:file.bytes.length,pages:file.parsed.count,embeddedFiles:Object.keys(file.parsed.attachments).length}));
  fs.writeFileSync(path.join(root,'complete-report-text.txt'),full.parsed.text);
  wkBrowser=await webkit.launch({headless:true});const wk=await wkBrowser.newContext({...devices['iPhone 13'],offline:true,reducedMotion:'reduce',acceptDownloads:true}),wp=await wk.newPage();wp.on('pageerror',e=>errors.push(e.message));await wp.goto(url);await wp.locator('[data-profile=aon]').click();await wp.getByRole('button',{name:'Entrar na demonstração'}).click();await wp.getByRole('button',{name:'Abrir menu',exact:true}).click();await wp.locator('.atl-nav').getByRole('button',{name:'Sinistros',exact:true}).click();await wp.getByRole('button',{name:/SIN-2026-004/}).click();const event=wp.waitForEvent('download',{timeout:120000});await wp.locator('[data-download-case-pdf]').click();const downloaded=await event;const target=path.join(root,'webkit-mobile.pdf');await downloaded.saveAs(target);assert.equal(fs.readFileSync(target).subarray(0,5).toString(),'%PDF-');await wk.close();
  report.checks.push('Actual WebKit engine in iPhone emulation downloads a real PDF fully offline');
  assert.deepStrictEqual(network,[]);assert.deepStrictEqual(errors,[]);report.checks.forEach(check=>console.log('PASS: '+check));
 }finally{fs.writeFileSync('tools/pdf-validation.json',JSON.stringify(report,null,2));await browser.close();if(wkBrowser)await wkBrowser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
