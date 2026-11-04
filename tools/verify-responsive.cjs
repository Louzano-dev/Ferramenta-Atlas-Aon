const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');

const sizes=[
  [320,568],[360,640],[390,844],[430,932],[568,320],[640,360],
  [768,1024],[820,1180],[1024,768],[1180,820],[1280,720],
  [1366,768],[1440,900],[1672,941],[1920,1080],[2560,1440]
];
const captures=new Set([320,390,768,1024,1366,1920]);
const url='file:///'+path.resolve('Atlas.html').replaceAll('\\','/');

(async()=>{
  const browser=await chromium.launch({
    executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:true
  });
  const context=await browser.newContext({reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

  async function layout(stage,width){
    const state=await page.evaluate(()=>{
      const width=innerWidth;
      const controls=[...document.querySelectorAll('.ac-panel button,.ac-panel input,.ac-panel select,.ac-panel textarea')]
        .filter(el=>{const s=getComputedStyle(el);return el.getClientRects().length&&s.display!=='none'&&s.visibility!=='hidden';})
        .map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {name:el.getAttribute('aria-label')||el.textContent.trim().slice(0,45)||el.tagName,x:r.x,y:r.y,w:r.width,h:r.height,font:parseFloat(s.fontSize),input:el.matches('input,select,textarea')};});
      const headings=[...document.querySelectorAll('.ac-panel h1')].map(el=>({text:el.textContent,overflow:el.scrollWidth-el.clientWidth,font:parseFloat(getComputedStyle(el).fontSize)}));
      const p=document.querySelector('.ac-access').getBoundingClientRect();
      return {width,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,panel:{x:p.x,y:p.y,width:p.width,height:p.height},controls,headings};
    });
    const fail=message=>{throw Error(`${width}px ${stage}: ${message}`);};
    if(state.scrollWidth>state.width+1)fail(`horizontal page overflow (${state.scrollWidth}px)`);
    if(width>=1200&&state.panel.width>760.5)fail(`desktop access panel too large (${state.panel.width.toFixed(1)}px)`);
    for(const c of state.controls){
      if(c.x<-.5||c.x+c.w>state.width+.5)fail(`control outside screen: ${c.name}`);
      if(c.h<43.5)fail(`control shorter than 44px: ${c.name} (${c.h.toFixed(1)}px)`);
      if(width<=639&&c.input&&c.font<16)fail(`mobile input below 16px: ${c.name}`);
    }
    for(let i=0;i<state.controls.length;i++)for(let j=i+1;j<state.controls.length;j++){
      const a=state.controls[i],b=state.controls[j];
      const horizontal=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
      const vertical=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
      if(horizontal>1&&vertical>1)fail(`overlapping controls: ${a.name} / ${b.name}`);
    }
    for(const h of state.headings){
      if(h.overflow>1)fail(`clipped heading: ${h.text}`);
      if(h.font<22)fail(`heading too small (${h.font}px)`);
    }
    return {stage,height:state.height,panel:state.panel};
  }

  async function checkForm(profile,width){
    await page.locator(`[data-profile=${profile}]`).click();
    await page.getByLabel('Nome',{exact:true}).waitFor();
    const state=await layout(profile+' form',width);
    const submit=page.getByRole('button',{name:'Entrar na demonstração'});
    await submit.scrollIntoViewIfNeeded();
    const b=await submit.boundingBox(),vh=await page.evaluate(()=>innerHeight);
    if(!b||b.y<-.5||b.y+b.height>vh+.5)throw Error(`${width}px ${profile}: submit cannot be reached by scrolling`);
    if((width===390||width===1366)&&profile==='cliente')await page.screenshot({path:`tools/atlas-responsive-${width}-cliente-form.png`,fullPage:true});
    return state;
  }

  try{
    for(const [width,height] of sizes){
      await page.setViewportSize({width,height});await page.goto(url);
      await page.locator('[data-profile=cliente]').waitFor();
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
      const states=[await layout('profiles',width)];
      if(captures.has(width))await page.screenshot({path:`tools/atlas-responsive-${width}-entry.png`,fullPage:true});
      states.push(await checkForm('cliente',width));
      await page.getByRole('button',{name:'Voltar aos perfis'}).click();
      states.push(await checkForm('aon',width));
      await page.getByRole('button',{name:'Voltar aos perfis'}).click();
      results.push({width,height,states});console.log(`${width}×${height}: profiles and both forms OK`);
    }

    await page.setViewportSize({width:320,height:568});
    for(const profile of ['aon','cliente']){
      await page.locator(`[data-profile=${profile}]`).click();
      await page.getByRole('button',{name:'Entrar na demonstração'}).click();
      await page.getByRole('button',{name:'Abrir menu',exact:true}).waitFor();
      if(!await page.locator('.atl-top .atl-header-brand').isVisible())throw Error(`320px ${profile}: header Atlas logo missing`);
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(`320px ${profile}: dashboard horizontal overflow`);
      await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.atl-side.is-open')?.getBoundingClientRect().x>=-.5);
      const drawer=await page.locator('.atl-side.is-open').boundingBox();
      if(!drawer||drawer.x<-.5||drawer.x+drawer.width>320.5)throw Error(`320px ${profile}: menu drawer outside screen`);
      const logout=page.getByRole('button',{name:'Trocar de perfil',exact:true}).first();
      await logout.scrollIntoViewIfNeeded();
      await page.screenshot({path:`tools/atlas-responsive-320-${profile}-menu.png`,fullPage:true});
      await logout.click();console.log(`320px ${profile}: dashboard header and menu OK`);
    }

    if(errors.length)throw Error(errors.join('\n'));
    fs.writeFileSync('tools/responsive-validation.json',JSON.stringify({errors,viewports:results},null,2));
    console.log('PASS: all responsive layouts, controls, profile flows and console checks.');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1);});
