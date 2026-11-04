const fs=require('fs');
const path=require('path');
module.exports=function caseHistory(html){
  const start=html.indexOf('function AonHistorico({'),end=html.indexOf('function AonConfig({',start);
  if(start<0||end<0||html.indexOf('function AonHistorico({',start+1)!==-1)throw Error('Expected one existing AonHistorico component');
  const source=fs.readFileSync(path.join(__dirname,'../assets/atlas/case-history.js'),'utf8');
  return html.slice(0,start)+source+'\n'+html.slice(end);
};
