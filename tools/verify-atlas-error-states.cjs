const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const checks=[];
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},offline:true,reducedMotion:'reduce'});
    await page.goto(pathToFileURL(path.resolve('Atlas-teste.html')).href);
    await page.locator('[data-profile=cliente]').click();
    await page.locator('.ac-submit').click();
    await page.getByRole('button',{name:'Comunicar incidente Cyber',exact:true}).click();
    await page.getByRole('button',{name:'Continuar',exact:true}).click();
    assert(await page.getByRole('alert').count()>0,'Missing required contact must produce a visible error');
    const source=fs.readFileSync('tools/verify-theme.cjs','utf8');
    const inspect=new Function('return ('+source.slice(source.indexOf('function inspectContrast(){'),source.indexOf('\n(async()=>{'))+')')();
    for(const mode of ['light','dark']){
      await page.evaluate(mode=>AtlasAppearance.set(mode),mode);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const audit=await page.evaluate(inspect);
      assert.equal(audit.failures.length,0,JSON.stringify(audit.failures));
      assert(await page.getByRole('alert').first().isVisible());
      await page.screenshot({path:'tools/atlas-design-review/final-form-error-'+mode+'-390.png',fullPage:true});
      checks.push('Required-contact validation is visible and readable in '+mode+' mode');
    }
    fs.writeFileSync('tools/atlas-design-review/error-validation.json',JSON.stringify({checks,errors:[]},null,2));
    checks.forEach(value=>console.log('PASS: '+value));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
