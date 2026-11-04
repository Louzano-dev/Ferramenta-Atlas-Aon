const {chromium}=require('playwright'),path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1672,height:941},reducedMotion:'reduce'});page.on('pageerror',e=>console.log('ERROR:',e.message));
 await page.goto('file:///'+path.resolve('Atlas.html').replaceAll('\\','/'));await page.locator('.ac-earth-image').evaluate(i=>i.decode());await page.screenshot({path:'tools/atlas-reference-preview.png',fullPage:true});console.log('Reference panel bounds',await page.locator('.ac-access').boundingBox());
 for(const width of [801,1024,1366]){
  await page.setViewportSize({width,height:768});const title=await page.locator('.ac-panel h1').boundingBox(),panel=await page.locator('.ac-panel').boundingBox();
  if(title.x+title.width>panel.x+panel.width+1||await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Layout overflow at '+width);
 }
 console.log('801/1024/1366px layouts OK');await page.setViewportSize({width:1672,height:941});await page.locator('[data-profile=cliente]').click();await page.getByRole('button',{name:'Entrar na demonstração'}).click();await page.screenshot({path:'tools/atlas-client-brand.png',fullPage:true});await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
