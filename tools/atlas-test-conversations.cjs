const fs = require('fs');
module.exports = function conversations(html) {
  function once(source, before, after, name) {
    if (source.split(before).length !== 2) throw Error('Expected one conversation hub integration: ' + name);
    return source.replace(before, after);
  }
  function component(name, next, change) {
    const start = html.indexOf('function ' + name + '('), end = html.indexOf('function ' + next + '(', start);
    if (start < 0 || end < 0) throw Error('Conversation component boundary missing: ' + name);
    html = html.slice(0,start) + change(html.slice(start,end)) + html.slice(end);
  }
  html = once(html, 'function Conversa({', fs.readFileSync('assets/atlas-test/conversations.js','utf8') + '\n\nfunction Conversa({', 'hub component');
  html = once(html, 'NAV_ICONS.form = NAV_ICONS.novo;', 'NAV_ICONS.form = NAV_ICONS.novo;\nNAV_ICONS.conversas = [{tag:"path",attrs:{d:"M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z"}},{tag:"path",attrs:{d:"M7 9h9M7 13h6"}}];', 'sidebar icon');
  html = once(html, '  form: "Ações"', '  conversas: "Ações",\n  form: "Ações"', 'sidebar action group');
  component('PerfilShell','Landing', code=>{
    const before = '  const atual = nav.find(n => n.id === active) || nav[0];';
    const effect = `  React.useEffect(() => {
    const rail = asideRef.current?.querySelector('.atl-nav');
    if (!rail) return;
    const reveal = () => {
      const item = rail.querySelector('[aria-current="page"]');
      if (!item) return;
      const row = item.getBoundingClientRect(), bounds = rail.getBoundingClientRect();
      if (row.bottom > bounds.bottom) rail.scrollTop += row.bottom - bounds.bottom + 8;
      else if (row.top < bounds.top) rail.scrollTop -= bounds.top - row.top + 8;
    };
    reveal();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reveal);
    observer?.observe(rail);
    return () => observer?.disconnect();
  }, [active, recolhida]);
`;
    return once(code, before, effect + before, 'keep active sidebar entry visible');
  });
  component('ClientDetail','ClientApp', code=>{
    code = once(code, '  onBack\n}) {', '  onBack,\n  onOpenConversation\n}) {', 'client detail callback');
    const before = 'React.createElement(Conversa, {\n    s: s,\n    actions: actions,\n    ator: ator,\n    titulo: "Conversa com a Aon",\n    bloqueado: !!s.encerrado\n  })';
    return once(code, before, 'React.createElement(CaseConversationLink, {s, onOpen:onOpenConversation})', 'client detail shortcut');
  });
  component('ResumoTab','gerarResumoCaso', code=>{
    code = once(code, '  ator\n}) {', '  ator,\n  onOpenConversation\n}) {', 'Aon summary callback');
    const before = 'React.createElement(Conversa, {\n    s: s,\n    actions: actions,\n    ator: ator,\n    titulo: "Conversa com o cliente",\n    bloqueado: !!s.encerrado\n  })';
    return once(code, before, 'React.createElement(CaseConversationLink, {s, onOpen:onOpenConversation})', 'Aon summary shortcut');
  });
  component('ClientApp','AonOverview', code=>{
    code = once(code, '  const minhas = sinistros.filter(', '  const [conversationId, setConversationId] = useAtlasConversationSelection("Cliente", sessao.empresa);\n  const abrirConversa = id => {setConversationId(id);setView("conversas");};\n  const minhas = sinistros.filter(', 'client selection state');
    code = once(code, 'label: "Comunicar incidente"\n    }]', 'label: "Comunicar incidente"\n    }, {id:"conversas", label:"Conversas"}]', 'client sidebar route');
    code = once(code, '  }, view === "lista" &&', '  }, view === "conversas" && React.createElement(AtlasConversations, {sinistros:minhas, ator, actions, selectedId:conversationId, onSelect:setConversationId, onOpenCase:id=>{setSelId(id);setView("detail");}}), view === "lista" &&', 'client conversations view');
    return once(code, 'React.createElement(ClientDetail, {\n    key:', 'React.createElement(ClientDetail, {\n    onOpenConversation: abrirConversa,\n    key:', 'client case integration');
  });
  component('AonDetail','AonApp', code=>{
    code = once(code, '  onBack\n}) {', '  onBack,\n  onOpenConversation\n}) {', 'Aon detail callback');
    code = once(code, '    onClick: () => setTab(k),', '    onClick: () => k === "conversa" ? onOpenConversation(s.id) : setTab(k),', 'Aon tab shortcut');
    code = once(code, 'tab === "conversa" && React.createElement(Conversa, {key: s.id, s, actions, ator, titulo: "Conversa com o cliente", bloqueado: !!s.encerrado}), ', '', 'remove inline Aon chat');
    return once(code, 'React.createElement(ResumoTab, {\n    key:', 'React.createElement(ResumoTab, {\n    onOpenConversation,\n    key:', 'Aon summary route');
  });
  component('AonApp','log', code=>{
    code = once(code, '  const [clienteSelecionado,', '  const [conversationId, setConversationId] = useAtlasConversationSelection("Aon", sessao.nome);\n  const abrirConversa = id => {setConversationId(id);setView("conversas");};\n  const [clienteSelecionado,', 'Aon selection state');
    code = once(code, 'label: "Registrar comunicação"\n  }];', 'label: "Registrar comunicação"\n  }, {id:"conversas", label:"Conversas"}];', 'Aon sidebar route');
    code = once(code, '  }, ["geral", "lista",', '  }, view === "conversas" && React.createElement(AtlasConversations, {sinistros, ator, actions, selectedId:conversationId, onSelect:setConversationId, onOpenCase:abrir}), ["geral", "lista",', 'Aon conversations view');
    return once(code, 'React.createElement(AonDetail, {\n    s: sel,', 'React.createElement(AonDetail, {\n    onOpenConversation: abrirConversa,\n    s: sel,', 'Aon detail route');
  });
  return html;
};
