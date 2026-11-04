const fs=require('fs');
const path=require('path');
const assetRoot=path.resolve('assets/atlas');
const assetManifest=[];
const mimeTypes={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
function assetDataUrl(file){
  const resolved=path.resolve(assetRoot,file);
  if(!resolved.startsWith(assetRoot+path.sep))throw Error('Asset outside the Atlas source folder');
  const mime=mimeTypes[path.extname(resolved).toLowerCase()];
  if(!mime)throw Error('Unsupported embedded asset: '+file);
  const bytes=fs.readFileSync(resolved);
  assetManifest.push({file,bytes:bytes.length});
  return 'data:'+mime+';base64,'+bytes.toString('base64');
}
function inlineCss(file){
  const css=fs.readFileSync(path.join(assetRoot,file),'utf8').replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g,(_,quote,url)=>{
    if(/^(data:|#)/i.test(url))return 'url("'+url+'")';
    return 'url("'+assetDataUrl(path.join(path.dirname(file),url))+'")';
  });
  if(/<\/style/i.test(css))throw Error('Unsafe inline style closing tag in '+file);
  return '<style data-atlas-source="'+file+'">\n'+css+'\n</style>';
}
let html=fs.readFileSync('tools/atlas-base.source','utf8');
const start=html.indexOf('function Landing({'),end=html.indexOf('/* ------------------------------ componentes compartilhados',start);
if(start<0||end<0)throw Error('Landing boundary missing');
html=html.slice(0,start)+fs.readFileSync('assets/atlas/entrance.js','utf8')+'\n'+html.slice(end);
html=require('./case-evolution.cjs')(html);
html=require('./client-feedback.cjs')(html);
html=require('./client-filter.cjs')(html);
html=require('./theme.cjs')(html);
html=require('./case-report.cjs')(html);
const themeBoot=fs.readFileSync('assets/atlas/theme-bootstrap.js','utf8');
html=html.replace('<title>',()=>'<script data-atlas-appearance>\n'+themeBoot+'\n</script>\n<title>');
const renderStart='ReactDOM.createRoot(document.getElementById("root"))';
if(!html.includes(renderStart))throw Error('Expected application render entry point missing');
html=html.replace(renderStart,()=>fs.readFileSync('assets/atlas/portable-storage.js','utf8')+renderStart);
html=require('./dashboard-brand.cjs')(html);
const gsapTag='<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.14.2/gsap.min.js" onerror="void 0"></script>';
if(!html.includes(gsapTag))throw Error('Expected original GSAP script tag missing');
const gsap=fs.readFileSync(path.join(assetRoot,'gsap.min.js'),'utf8').replace(/\/\/[#@]\s*sourceMappingURL=[^\r\n]*/g,'').replace(/<\/script/gi,'<\\/script');
html=html.replace(gsapTag,()=>'<script data-atlas-library="gsap">\n'+gsap+'\n</script>');
const pdfLibraries=['pdf-lib.min.js','fontkit.umd.min.js'].map(file=>'<script data-atlas-library="'+file+'">\n'+fs.readFileSync(path.join(assetRoot,file),'utf8').replace(/\/\/[#@]\s*sourceMappingURL=[^\r\n]*/g,'').replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n');
const pdfAssets={fontRegular:assetDataUrl('NotoSans-Regular.ttf'),fontBold:assetDataUrl('NotoSans-Bold.ttf')};
html=html.replace('</head>',()=>pdfLibraries+'\n<script data-atlas-pdf-assets>window.ATLAS_PDF_ASSETS='+JSON.stringify(pdfAssets)+';</script>\n</head>');
const styles=['entrance.css','reference-layout.css','dashboard-brand.css','case-lifecycle.css','case-history.css','client-return.css','client-filter.css','theme.css','theme-dashboard.css','theme-entrance.css','case-report.css'].map(inlineCss).join('\n');
html=html.replace('</head>',()=>styles+'\n</head>');
for(const file of ['aon.svg','atlas-statue.png','earth-horizon.png']){
  const source='assets/atlas/'+file;
  if(!html.includes(source))throw Error('Expected image source missing: '+file);
  html=html.replaceAll(source,assetDataUrl(file));
}
html=html.replaceAll('Atlas Seguros','Atlas');
html=html.replace(/<noscript>[\s\S]*?<\/noscript>/i,'<noscript><div style="font-family:Arial,sans-serif;padding:24px;max-width:620px;margin:auto;color:#10213a"><h1 style="font-size:22px">Abra o Atlas em um navegador</h1><p>Este protótipo interativo precisa de JavaScript. Salve o arquivo Atlas.html e abra-o em um navegador ou aplicativo compatível com páginas HTML. A prévia de anexos do WhatsApp ou do sistema pode não executar o protótipo.</p></div></noscript>');
// Live Server searches for the first literal closing body tag. Escape tags inside
// inline JavaScript strings; JavaScript still produces the same document markup.
html=html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g,(_,open,code,close)=>open+code.replaceAll('</body>','<\\/body>')+close);
html=html.replace('</head>','<link rel="icon" href="data:,">\n</head>');
if(/<script\b[^>]*\bsrc\s*=/i.test(html)||/<link\b[^>]*rel=["']stylesheet["']/i.test(html)||html.includes('assets/atlas/'))throw Error('Atlas output still depends on external project files');
for(const [i,m] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){if(m[1].trim())try{new (require('vm').Script)(m[1]);}catch(e){throw Error('Script '+i+': '+e.message);}}
fs.writeFileSync('Atlas.html',html);
fs.writeFileSync('tools/portable-build.json',JSON.stringify({output:'Atlas.html',bytes:Buffer.byteLength(html),selfContained:true,assets:assetManifest},null,2));
console.log('Standalone Atlas.html built ('+(Buffer.byteLength(html)/1024/1024).toFixed(2)+' MiB); all inline scripts parse.');
