const fs = require('fs');
module.exports = function atlasTestDesign(html) {
  function once(source, from, to, name) {
    if (source.split(from).length !== 2) throw Error('Design integration must match once: ' + name);
    return source.replace(from,to);
  }
  function component(name, update) {
    const start=html.indexOf('function '+name+'('), end=html.indexOf('\nfunction ',start+10);
    if(start<0||end<0) throw Error('Missing design component: '+name);
    html=html.slice(0,start)+update(html.slice(start,end))+html.slice(end);
  }
  const views=['ClientList','ClientDetail','ComunicacaoForm','AonOverview','AonList','AonCompleted','AonMonitor','AonApolices','AonHistorico','AonConfig','AonDetail','ResumoTab','AnaliseTab','PlanoTab','DocsTab','SeguradoraTab'];
  for(const name of views) component(name, code=>{
    const pattern = /^  return (?:\/\*#__PURE__\*\/)?React\.createElement\("div", \{\n/m;
    if(pattern.test(code)) return code.replace(pattern, match=>match+'    "data-ui-view": "'+name+'",\n');
    const compact="  return rce('section',{";
    return once(code,compact,compact+"'data-ui-view':'"+name+"',",name+' root');
  });
  component('Secao', code=>{
    const start=code.indexOf('  return ');
    if(start<0) throw Error('Missing section return');
    return code.slice(0,start)+`  return React.createElement("section", {className:PANEL+" ui-section", "data-ui-section":typeof titulo==="string"?titulo:""},
    React.createElement("header", {className:"ui-section-heading"}, React.createElement("h2", null, titulo), aside),
    React.createElement("div", {className:"ui-section-body"}, children));
}
const hojeIso = () => isoFromDate(new Date());
`;
  });
  component('AonOverview', code=>{
    code=once(code,'const [guia, setGuia] = useState(true);','const [guia, setGuia] = useState(false);','progressive dashboard guide');
    return once(code,'}, "Registrar comunicação recebida")), guia &&','}, "Registrar comunicação recebida"), React.createElement("button", {type:"button", className:BTN_SECONDARY, "aria-expanded":guia, onClick:()=>setGuia(v=>!v)}, "Como usar o Atlas")), guia &&','guide access');
  });
  component('ClientList', code=>{
    code=once(code,'), lista.length === 0 ?', '), React.createElement(AtlasClientSummary, {lista}), lista.length === 0 ?', 'client overview');
    code=once(code,'className: "space-y-3"','className: "ui-client-cases"','client cases layout');
    return once(code,'rce(ClientReturnEstimate, {s, compact: true}));', 'rce(ClientReturnEstimate, {s, compact: true}), React.createElement("span", {className:"ui-case-open"}, "Ver acompanhamento", React.createElement("svg", {viewBox:"0 0 24 24",width:18,height:18,fill:"none",stroke:"currentColor",strokeWidth:1.7,"aria-hidden":true},React.createElement("path",{d:"M4 12h15m-6-6 6 6-6 6",strokeLinecap:"round",strokeLinejoin:"round"}))));','case navigation affordance');
  });
  component('ComunicacaoForm', code=>once(code,'    key: t,\n    className: `px-2.5 py-1 rounded border','    key: t,\n    "aria-current":i===step?"step":undefined,\n    className: `px-2.5 py-1 rounded border','current form step'));
  component('AonDetail', code=>once(code,
    'motivos.length > 0 && /*#__PURE__*/React.createElement("div", {\n    className: "text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded px-4 py-2"\n  }, "Atenção: ", motivos.join(" · "))',
    'motivos.length > 0 && React.createElement(AtlasCaseNotice, {motivos})',
    'readable case attention notice'));
  html=once(html,'m.push("Nova comunicação ainda não organizada pela Aon")','m.push("Nova comunicação aguardando análise da Aon.")','initial case attention wording');
  component('PerfilShell', code=>{
    code=once(code,'    className: "atl-shell"\n  }, rce("div", {', '    className: "atl-shell"\n  }, rce("a", {href:"#atlas-test-main",className:"ui-skip-link"}, "Ir para o conteúdo"), rce("div", {','skip to content');
    code=once(code,'    className: "atl-content"','    id: "atlas-test-main",\n    tabIndex: -1,\n    className: "atl-content"','main landmark');
    return code.replaceAll('recolhida ? 264 : 76','recolhida ? 244 : 76').replaceAll('recolhida ? 76 : 264','recolhida ? 76 : 244');
  });
  html=once(html,'function ClientList(',fs.readFileSync('assets/atlas-test/ui.js','utf8')+'\nfunction ClientList(','client summary component');
  return html;
};
