function AtlasClientSummary({lista}) {
  const h = React.createElement;
  const active = lista.filter(s=>!s.encerrado).length;
  const pending = lista.filter(s=>!s.encerrado && pendencias(s).total>0).length;
  return h('section', {className:'ui-client-summary', 'aria-label':'Resumo dos sinistros'},
    [['Sinistros registrados', lista.length], ['Em acompanhamento', active], ['Com pendências para você', pending]].map(([label,value])=>
      h('div', {key:label}, h('span', null, label), h('strong', null, value))));
}

function AtlasCaseNotice({motivos}) {
  const h = React.createElement;
  // New cases already show their analysis status and next action in the case guide.
  // Keep substantive pending items without repeating that initial-state banner.
  const itens = motivos.filter(texto=>texto !== 'Nova comunicação aguardando análise da Aon.');
  if (!itens.length) return null;
  return h('section', {className:'ui-case-notice', role:'note', 'aria-label':'Pontos de atenção do sinistro'},
    h('svg', {viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor',strokeWidth:1.7,'aria-hidden':true},
      h('circle', {cx:12,cy:12,r:9}), h('path', {d:'M12 7v6m0 4h.01',strokeLinecap:'round'})),
    h('div', null, h('strong', null, 'Atenção'),
      h('ul', null, itens.map((texto,index)=>h('li', {key:index}, texto)))));
}
