/* Only navigation, active listing and dashboard totals change here. */
module.exports=function caseNavigation(html){
  function replaceOnce(source,before,after,name){
    if(source.split(before).length!==2)throw Error('Expected one '+name+' integration point');
    return source.replace(before,after);
  }
  function component(name,next,update){
    const start=html.indexOf('function '+name+'('),end=html.indexOf('function '+next+'(',start);
    if(start<0||end<0)throw Error('Component boundary missing: '+name);
    html=html.slice(0,start)+update(html.slice(start,end))+html.slice(end);
  }
  html=replaceOnce(html,'NAV_ICONS.form = NAV_ICONS.novo;','NAV_ICONS.form = NAV_ICONS.novo;\nNAV_ICONS.concluidos = NAV_ICONS.historico || NAV_ICONS.lista;','completed icon');
  html=replaceOnce(html,'lista: "Navegação",','lista: "Sinistros",\n  concluidos: "Sinistros",','navigation group');
  component('AonList','DataInput',code=>{
    code=replaceOnce(code,'const lista = sinistros.filter(s => (','const lista = sinistros.filter(s => !s.encerrado && (','active listing');
    code=replaceOnce(code,'}, "Sinistros"),','}, "Sinistros registrados"),','active listing title');
    code=replaceOnce(code,'}, lista.length, " de ", sinistros.length, " sinistro(s)"),','}, lista.length, " de ", sinistros.filter(s => !s.encerrado).length, " sinistro(s) ativo(s)"),','active listing total');
    code=replaceOnce(code,'ESTADOS_CICLO.map(x =>','ESTADOS_CICLO.filter(x => x !== "Resolvido").map(x =>','active status choices');
    return code;
  });
  component('AonOverview','AonList',code=>{
    code=replaceOnce(code,'const acoes = sinistros.reduce(','const acoes = ativos.reduce(','active task total');
    const before='}, stat("Sinistros acompanhados", sinistros.length,';
    const after='}, stat("Acompanhamentos ativos", ativos.length, "casos em acompanhamento pela Aon", () => onFiltro({}), "ativos"), stat("Casos concluídos", sinistros.length - ativos.length, "acompanhamentos finalizados pela Aon", () => onNav("concluidos"), "concluidos"), stat("Sinistros acompanhados", sinistros.length,';
    return replaceOnce(code,before,after,'active/completed indicators');
  });
  component('AonApp','log',code=>{
    code=replaceOnce(code,'label: "Sinistros"\n  }, {','label: "Sinistros"\n  }, {\n    id: "concluidos",\n    label: "Casos concluídos"\n  }, {','completed navigation');
    code=replaceOnce(code,'active: view === "detalhe" ? "lista" : view,','active: view === "detalhe" ? sel && sel.encerrado ? "concluidos" : "lista" : view,','current navigation');
    const before='}), view === "monitor" && /*#__PURE__*/React.createElement(AonMonitor, {';
    const after='}), view === "concluidos" && /*#__PURE__*/React.createElement(AonCompleted, {\n    sinistros: sinistros,\n    onOpen: abrir\n  }), view === "monitor" && /*#__PURE__*/React.createElement(AonMonitor, {';
    code=replaceOnce(code,before,after,'completed view');
    const back='onBack: () => {\n      setView("lista");\n      setSelId(null);';
    const newBack='onBack: () => {\n      setView(sel && sel.encerrado ? "concluidos" : "lista");\n      setSelId(null);';
    return replaceOnce(code,back,newBack,'case back destination');
  });
  return html;
};
