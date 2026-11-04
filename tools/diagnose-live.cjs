const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)console.log('HTTP:',r.status(),r.url());});
 await page.goto('http://127.0.0.1:5500/Atlas.html');await page.waitForTimeout(3000);
 console.log('Title:',await page.title(),'Profiles:',await page.locator('.ac-profile').count());
 if(await page.locator('.ac-profile').count()!==2)throw Error('Landing failed: '+errors.join('; '));
 const report=await page.evaluate(async()=>{const output=await gerarRelatorioPdf(seedSinistros()[0],seedSinistros(),'Teste',null,seedApolices());return {header:String.fromCharCode(...output.bytes.slice(0,5)),pages:output.pageCount};});
 if(report.header!=='%PDF-'||report.pages<1)throw Error('PDF generation failed');
 await page.locator('[data-profile=aon]').click();await page.getByRole('button',{name:'Entrar na demonstração'}).click();await page.getByRole('button',{name:'Visão geral',exact:true}).waitFor();
 console.log('Live Server: Aon dashboard and document generation OK');await page.screenshot({path:'tools/atlas-live-server.png',fullPage:true});await browser.close();
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: no console errors.');
})().catch(e=>{console.error(e);process.exit(1)});
