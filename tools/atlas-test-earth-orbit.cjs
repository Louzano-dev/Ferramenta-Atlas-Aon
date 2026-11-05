const fs = require('fs');
module.exports = function earthOrbit(html) {
  const oldOrbit = "rce('svg',{className:'ac-earth-orbit',viewBox:'0 0 395 677',preserveAspectRatio:'none','aria-hidden':true},rce('defs',null,rce('radialGradient',{id:'ac-orbit-glow'},rce('stop',{offset:'0%',stopColor:'#fff'}),rce('stop',{offset:'25%',stopColor:'#ff7585'}),rce('stop',{offset:'100%',stopColor:'#eb0017',stopOpacity:0}))),rce('path',{d:'M-20 360 Q190 238 410 232',fill:'none',stroke:'#EB0017',strokeWidth:1.6}),rce('circle',{cx:322,cy:235,r:15,fill:'url(#ac-orbit-glow)'}),rce('circle',{cx:322,cy:235,r:2.5,fill:'#fff'}))";
  if (html.split(oldOrbit).length !== 2) throw Error('Expected one entrance orbit');
  if (html.split('function Landing({onEnter}){').length !== 2) throw Error('Expected one entrance function');
  return html.replace(oldOrbit, 'rce(AtlasEarthOrbit)').replace('function Landing({onEnter}){', fs.readFileSync('assets/atlas-test/earth-orbit.js', 'utf8') + '\nfunction Landing({onEnter}){');
};
