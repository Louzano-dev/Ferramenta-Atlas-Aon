function Conversa({s, actions, ator, titulo, bloqueado}) {
  const h = React.createElement;
  const draftKey = 'atlas-teste:chat:draft:' + s.id + ':' + ator.perfil + ':' + (ator.nome || '');
  const readDraft = key => { try { return sessionStorage.getItem(key) || ''; } catch (_) { return ''; } };
  const [draft, setDraft] = React.useState(() => ({key: draftKey, text: readDraft(draftKey)}));
  const [erro, setErro] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [newMessages, setNewMessages] = React.useState(0);
  const scrollRef = React.useRef(null), inputRef = React.useRef(null), searchRef = React.useRef(null), searchToggleRef = React.useRef(null);
  const nearBottom = React.useRef(true), forceBottom = React.useRef(true), busy = React.useRef(false);
  const previous = React.useRef({caseId: s.id, count: 0, last: ''});
  const uid = React.useId().replace(/:/g, '');
  const inputId = 'atlas-chat-input-' + uid, errorId = 'atlas-chat-error-' + uid, hintId = 'atlas-chat-hint-' + uid;
  const isAon = ator.perfil === 'Aon';
  const text = draft.key === draftKey ? draft.text : readDraft(draftKey);
  const messages = [...(s.mensagens || [])].sort((a, b) => {
    const first = Date.parse(a.ts), second = Date.parse(b.ts);
    return Number.isFinite(first) && Number.isFinite(second) ? first - second : 0;
  });
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const search = fold(query.trim());
  const visible = search ? messages.filter(m => fold(m.texto + ' ' + m.por + ' ' + m.de).includes(search)) : messages;
  const last = messages[messages.length - 1];
  const icon = (name, size = 20) => {
    const paths = {
      search: [h('circle', {key:'a', cx:10.5, cy:10.5, r:6.5}), h('path', {key:'b', d:'m16 16 4 4'})],
      send: [h('path', {key:'a', d:'m22 2-7 20-4-9-9-4 20-7Z'}), h('path', {key:'b', d:'M22 2 11 13'})],
      chat: [h('path', {key:'a', d:'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z'}), h('path', {key:'b', d:'M7 9h9M7 13h6'})],
      close: [h('path', {key:'a', d:'m6 6 12 12M6 18 18 6'})],
      down: [h('path', {key:'a', d:'M12 4v16m-6-6 6 6 6-6'})],
      lock: [h('rect', {key:'a', x:5, y:10, width:14, height:11, rx:2}), h('path', {key:'b', d:'M8 10V7a4 4 0 0 1 8 0v3'})]
    };
    return h('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.7, strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true}, paths[name]);
  };
  const storeDraft = next => {
    setDraft({key: draftKey, text: next});
    try { if (next) sessionStorage.setItem(draftKey, next); else sessionStorage.removeItem(draftKey); } catch (_) {}
  };
  React.useEffect(() => {
    setDraft({key:draftKey, text:readDraft(draftKey)});
    setErro(''); setStatus(''); setQuery(''); setSearchOpen(false); setNewMessages(0);
  }, [draftKey]);
  React.useLayoutEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = Math.min(192, Math.max(84, node.scrollHeight)) + 'px';
  }, [text, bloqueado]);
  React.useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  React.useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const before = previous.current;
    if (search) {
      node.scrollTop = 0;
    } else if (forceBottom.current || nearBottom.current || before.caseId !== s.id) {
      node.scrollTop = node.scrollHeight;
      nearBottom.current = true; forceBottom.current = false; setNewMessages(0);
    } else if (last?.id !== before.last && messages.length > before.count) {
      setNewMessages(count => count + messages.length - before.count);
    }
    previous.current = {caseId:s.id, count:messages.length, last:last?.id || ''};
  }, [s.id, messages.length, last?.id, search]);
  React.useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let width = node.clientWidth, height = node.clientHeight;
    const observer = new ResizeObserver(() => {
      if (width === node.clientWidth && height === node.clientHeight) return;
      width = node.clientWidth; height = node.clientHeight;
      if (nearBottom.current && !search) node.scrollTop = node.scrollHeight;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [s.id, search]);
  const send = async event => {
    event?.preventDefault();
    if (bloqueado || busy.current) return;
    const value = text.trim();
    if (value.length < 2) { setErro('Escreva pelo menos 2 caracteres para enviar.'); inputRef.current?.focus(); return; }
    if (value.length > 10000) { setErro('Sua mensagem ultrapassou 10.000 caracteres. Divida o texto em duas mensagens.'); inputRef.current?.focus(); return; }
    busy.current = true; setSending(true); setErro(''); setStatus('');
    try {
      // Keep the existing action: it also records case history and Aon triage side effects.
      forceBottom.current = true;
      await actions.enviarMensagem(s.id, value);
      storeDraft(''); setQuery(''); setStatus('Mensagem registrada.');
      if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({preventScroll:true});
    } catch (_) {
      setErro('Não foi possível registrar a mensagem. Seu texto foi mantido; tente novamente.');
    } finally { busy.current = false; setSending(false); }
  };
  let dayBefore = '';
  const renderedMessages = [];
  visible.forEach((m, index) => {
    const date = new Date(m.ts), validDate = Number.isFinite(date.getTime());
    const dayKey = validDate ? date.toLocaleDateString('pt-BR') : 'sem-data';
    const dayLabel = validDate ? date.toLocaleDateString('pt-BR', {day:'numeric', month:'long', year:'numeric'}) : 'Data não informada';
    if (dayKey !== dayBefore) {
      renderedMessages.push(h('li', {key:'day-' + dayKey + '-' + index, className:'atc-day', role:'presentation'}, h('span', null, dayLabel)));
      dayBefore = dayKey;
    }
    const own = m.de === ator.perfil;
    renderedMessages.push(h('li', {key:m.id || 'msg-' + index, className:'atc-message', 'data-chat-own':own, 'data-chat-message':m.id || index},
      h('article', {className:'atc-bubble'},
        h('div', {className:'atc-author'}, h('strong', null, own ? 'Você' : (m.por || (m.de === 'Aon' ? 'Equipe Aon' : s.segurado))), h('span', null, m.de === 'Aon' ? 'Aon' : 'Empresa segurada')),
        h('p', {className:'atc-text'}, m.texto),
        h('div', {className:'atc-message-meta'}, own && m.por && h('span', null, m.por), h('time', {dateTime:validDate ? date.toISOString() : undefined, title:validDate ? fmtTs(m.ts) : 'Horário não informado'}, validDate ? date.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : 'Sem horário')))));
  });
  return h('section', {className:'atc-chat', 'data-atlas-chat':s.id, 'data-conversa':true, 'aria-label':titulo || (isAon ? 'Conversa com o cliente' : 'Conversa com a Aon')},
    h('header', {className:'atc-header'},
      h('div', {className:'atc-identity'}, h('div', {className:'atc-avatar', 'data-counterpart':isAon ? 'cliente' : 'aon', 'aria-hidden':true}, isAon ? icon('chat', 24) : 'Aon'),
        h('div', {className:'atc-heading'}, h('h2', null, titulo || (isAon ? 'Conversa com o cliente' : 'Conversa com a Aon')), h('p', null, s.segurado, h('span', {'aria-hidden':true}, ' · '), s.id))),
      h('button', {ref:searchToggleRef, type:'button', className:'atc-icon-button', 'aria-label':searchOpen ? 'Fechar busca' : 'Buscar mensagens', title:searchOpen ? 'Fechar busca' : 'Buscar mensagens', 'aria-expanded':searchOpen, onClick:() => {setSearchOpen(!searchOpen); setQuery('');}}, icon(searchOpen ? 'close' : 'search'))),
    h('div', {className:'atc-context'}, h('span', null, messages.length + (messages.length === 1 ? ' mensagem' : ' mensagens')), h('span', null, 'Histórico desta conversa')),
    searchOpen && h('div', {className:'atc-search'}, h('div', {className:'atc-search-field'}, icon('search', 18), h('input', {ref:searchRef, type:'search', value:query, onChange:e=>setQuery(e.target.value), placeholder:'Buscar mensagem ou autor', 'aria-label':'Buscar na conversa', onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();setQuery('');setSearchOpen(false);searchToggleRef.current?.focus();}}})), h('span', {role:'status'}, search ? visible.length + (visible.length === 1 ? ' resultado' : ' resultados') : 'Busque no texto e nos autores')),
    h('div', {className:'atc-scroll', 'data-chat-scroll':true, ref:scrollRef, tabIndex:0, role:'region', 'aria-label':'Mensagens da conversa', onScroll:e=>{const n=e.currentTarget;nearBottom.current=n.scrollHeight-n.scrollTop-n.clientHeight<80;if(nearBottom.current)setNewMessages(0);}},
      visible.length ? h('ol', {className:'atc-messages', role:'log', 'aria-label':'Histórico de mensagens', 'aria-live':'polite', 'aria-relevant':'additions text'}, renderedMessages) : h('div', {className:'atc-empty'}, icon('chat', 34), h('h3', null, search ? 'Nenhuma mensagem encontrada' : 'A conversa começa aqui'), h('p', null, search ? 'Tente outra palavra ou o nome de quem enviou.' : isAon ? 'Converse com a empresa sobre este sinistro. As mensagens ficam reunidas neste histórico.' : 'Envie suas dúvidas ou informações para a Aon. A conversa fica vinculada a este sinistro.'))),
    newMessages > 0 && !search && h('button', {type:'button', className:'atc-new-messages', onClick:()=>{scrollRef.current.scrollTop=scrollRef.current.scrollHeight;nearBottom.current=true;setNewMessages(0);}}, icon('down',16), 'Novas mensagens · Ir para o fim'),
    bloqueado ? h('div', {className:'atc-closed', role:'status'}, icon('lock'), h('div', null, h('strong', null, 'Acompanhamento concluído'), h('p', null, 'A conversa permanece disponível para consulta. A Aon pode reabrir o acompanhamento para continuar.'))) :
      h('form', {className:'atc-composer', onSubmit:send},
        h('label', {htmlFor:inputId}, isAon ? 'Mensagem para o cliente' : 'Mensagem para a Aon'),
        h('textarea', {id:inputId, ref:inputRef, value:text, rows:2, maxLength:10000, placeholder:isAon ? 'Escreva sua resposta para a empresa…' : 'Escreva sua mensagem para a Aon…', 'aria-describedby':hintId + (erro ? ' ' + errorId : ''), 'aria-invalid':erro ? true : undefined, onChange:e=>{storeDraft(e.target.value);setErro('');setStatus('');}, onKeyDown:e=>{if(e.key==='Enter' && (e.ctrlKey||e.metaKey) && !e.nativeEvent.isComposing && e.keyCode!==229){e.preventDefault();send(e);}}}),
        erro && h('p', {className:'atc-error', id:errorId, role:'alert'}, erro),
        h('div', {className:'atc-composer-footer'}, h('div', {className:'atc-hints', id:hintId}, h('span', {className:'atc-shortcut'}, 'Enter para nova linha · Ctrl/⌘ + Enter para enviar'), h('span', {className:'atc-draft-note'}, text.length ? 'Rascunho nesta aba' : 'Conversa vinculada a este sinistro'), text.length >= 8000 && h('span', null, text.length.toLocaleString('pt-BR') + '/10.000 caracteres')),
          h('button', {type:'submit', className:'atc-send', disabled:sending || text.trim().length<2}, icon('send',18), h('span', null, sending ? 'Registrando…' : 'Enviar mensagem')))),
    h('footer', {className:'atc-footer'}, h('span', {role:'status', 'aria-live':'polite', className:'atc-status'}, status), h('small', null, 'Demonstração: mensagens salvas neste navegador.')));
}
