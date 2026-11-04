const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
(async()=>{
 const file=process.argv[2]||path.join('tools/pdf-validation',require('./pdf-validation.json').files.find(x=>x.file.startsWith('relatorio-PDF-CASE')).file);
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:850,height:1150},offline:true});
  await page.setContent('<body style="margin:0;background:#dce2ea"><canvas style="display:block;margin:16px auto;background:white"></canvas></body>');
  const state=await page.evaluate(async({module,worker,data})=>{
   const lib=await import(URL.createObjectURL(new Blob([module],{type:'text/javascript'})));
   lib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([worker],{type:'text/javascript'}));
   const raw=atob(data),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
   window.previewDocument=await lib.getDocument({data:bytes,isEvalSupported:false}).promise;
   window.renderPreview=async number=>{
    const p=await window.previewDocument.getPage(number),viewport=p.getViewport({scale:1.35}),canvas=document.querySelector('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
    await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return {width:canvas.width,height:canvas.height};
   };return {pages:window.previewDocument.numPages};
  },{module:fs.readFileSync('node_modules/.atlas-pdf/node_modules/pdfjs-dist/build/pdf.mjs','utf8'),worker:fs.readFileSync('node_modules/.atlas-pdf/node_modules/pdfjs-dist/build/pdf.worker.mjs','utf8'),data:fs.readFileSync(file).toString('base64')});
  for(const number of [...new Set([1,2,3,Math.max(1,state.pages-2),state.pages])]){
   await page.evaluate(n=>renderPreview(n),number);await page.locator('canvas').screenshot({path:'tools/pdf-validation/preview-page-'+number+'.png'});
  }
  console.log('Rendered representative PDF pages from '+path.basename(file));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
