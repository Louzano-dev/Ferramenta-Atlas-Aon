function useAtlasConversationSelection(profile, company) {
  const key = 'atlas-teste:conversation-selection:' + profile + ':' + String(company || '');
  const [value, setValue] = React.useState(() => {
    try { return sessionStorage.getItem(key) || ''; } catch (_) { return ''; }
  });
  React.useEffect(() => {
    try { if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key); } catch (_) {}
  }, [key, value]);
  return [value, setValue];
}

function CaseConversationLink({s, onOpen}) {
  return React.createElement('div', {className:'ach-case-link'},
    React.createElement('div', null,
      React.createElement('strong', null, 'Conversa deste sinistro'),
      React.createElement('p', null, s.id, ' · ', (s.mensagens || []).length, ' mensagem(ns) registradas')),
    React.createElement('button', {type:'button', className:BTN_SECONDARY, onClick:()=>onOpen(s.id)}, 'Abrir conversa deste sinistro'));
}

function AtlasConversations({sinistros, ator, actions, selectedId, onSelect, onOpenCase}) {
  const h = React.createElement;
  const [query, setQuery] = React.useState('');
  const isAon = ator.perfil === 'Aon';
  const pickerId = 'ach-case-picker-' + React.useId().replace(/:/g, '');
  const lastMessage = s => {
    const messages = s.mensagens || [];
    return messages[messages.length - 1] || null;
  };
  const timestamp = s => Date.parse(lastMessage(s)?.ts || s.atualizadoEm || s.criadoEm) || 0;
  const cases = [...sinistros].sort((a,b) => {
    const count = Number(!!lastMessage(b)) - Number(!!lastMessage(a));
    return count || timestamp(b) - timestamp(a) || String(a.id).localeCompare(String(b.id));
  });
  // Select from the exact list supplied by the role, never the global case collection.
  const selected = cases.find(s=>s.id === selectedId) || cases[0] || null;
  React.useEffect(() => {
    if (selected && selected.id !== selectedId) onSelect(selected.id);
    else if (!selected && selectedId) onSelect('');
  }, [selected?.id, selectedId, onSelect]);
  const needle = atlasClientKey(query);
  const filtered = needle ? cases.filter(s=>atlasClientKey([s.id,s.segurado,s.tipo,s.contato?.nome].join(' ')).includes(needle)) : cases;
  return h('section', {className:'ach-page', 'data-conversation-hub':ator.perfil, 'aria-label':'Central de conversas'},
    h('header', {className:'ach-page-header'},
      h('h1', {className:'text-xl'}, 'Conversas'),
      h('p', null, isAon ? 'Converse com as empresas e acompanhe cada sinistro em um só lugar.' : 'Converse com a Aon e acompanhe as mensagens de cada sinistro.')),
    !cases.length ? h('div', {className:'ach-empty'},
      h('h2', null, 'Nenhum sinistro para conversar'),
      h('p', null, isAon ? 'Registre uma comunicação para iniciar uma conversa vinculada ao caso.' : 'Comunique um incidente para iniciar uma conversa com a Aon.')) :
    h('div', {className:'ach-layout'},
      h('aside', {className:'ach-sidebar', 'aria-label':'Conversas por sinistro'},
        h('div', {className:'ach-list-title'}, h('h2', null, 'Por sinistro'), h('span', null, cases.length)),
        h('label', {className:'ach-list-search'}, h('span', null, 'Buscar sinistro ou empresa'), h('input', {type:'search', value:query, onChange:e=>setQuery(e.target.value), placeholder:'Empresa, número ou incidente', 'aria-label':'Buscar sinistro ou empresa'})),
        h('p', {className:'ach-list-caption', role:'status'}, filtered.length + ' de ' + cases.length + ' sinistro(s)'),
        filtered.length ? h('ul', {className:'ach-list'}, filtered.map(s=>{
          const last = lastMessage(s);
          return h('li', {key:s.id}, h('button', {type:'button', className:'ach-item', 'data-conversation-case':s.id, 'aria-current':selected?.id===s.id ? 'true' : undefined, onClick:()=>onSelect(s.id)},
            h('span', {className:'ach-item-company'}, s.segurado),
            h('strong', {className:'ach-item-id'}, s.id),
            h('span', {className:'ach-item-type'}, s.tipo || 'Incidente Cyber'),
            h('span', {className:'ach-item-preview'}, last ? (last.de === ator.perfil ? 'Você: ' : last.de === 'Aon' ? 'Aon: ' : 'Cliente: ') + last.texto : 'Iniciar conversa sobre este sinistro'),
            h('span', {className:'ach-item-foot'}, h('span', null, s.encerrado ? 'Concluído · consulta' : (s.mensagens || []).length + ' mensagem(ns)'), last && h('time', {dateTime:last.ts}, fmtTs(last.ts)))));
        })) : h('div', {className:'ach-empty ach-list-empty'}, h('p', null, 'Nenhum sinistro encontrado. Tente outro nome ou número.'))),
      selected && h('div', {className:'ach-main', 'data-conversation-selected':selected.id},
        h('div', {className:'ach-case-picker'},
          h('label', {htmlFor:pickerId}, 'Sinistro desta conversa'),
          h('select', {id:pickerId, value:selected.id, onChange:e=>onSelect(e.target.value), 'aria-label':'Selecionar sinistro da conversa'}, cases.map(s=>h('option', {key:s.id, value:s.id}, s.id + ' · ' + s.segurado + ' · ' + s.tipo + (s.encerrado ? ' · Concluído' : ''))))),
        h('section', {className:'ach-case-context', 'aria-label':'Dados do sinistro em conversa'},
          h('div', {className:'ach-case-summary'},
            h('div', null, h('h2', null, selected.segurado),
              h('p', null, h('strong', {className:'ach-case-id'}, selected.id), ' · ', h('span', {className:'ach-case-type'}, selected.tipo || 'Incidente Cyber'))),
            h(StatusBadge, {s:selected, paraCliente:!isAon})),
          h('dl', {className:'ach-contact'},
            h('div', null, h('dt', null, 'Contato da empresa'), h('dd', null, selected.contato?.nome || 'Não informado')),
            h('div', null, h('dt', null, 'E-mail'), h('dd', null, selected.contato?.email || 'Não informado'))),
          h('button', {type:'button', className:BTN_SECONDARY, onClick:()=>onOpenCase(selected.id)}, 'Ver detalhes do sinistro')),
        h('div', {className:'ach-chat-wrap'}, h(Conversa, {key:selected.id, s:selected, actions, ator, titulo:isAon ? 'Conversa com o cliente' : 'Conversa com a Aon', bloqueado:!!selected.encerrado})),
        h('p', {className:'ach-record-note'}, 'Mensagens vinculadas a ', h('strong', null, selected.id), '. O histórico e o relatório PDF deste sinistro reúnem os registros da conversa.'))));
}
