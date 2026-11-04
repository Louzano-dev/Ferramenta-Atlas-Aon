/* Client feedback copy only; persisted statuses and insurer labels stay intact. */
module.exports = function clientFeedbackCopy(html) {
  function replaceGuarded(source, before, after, name) {
    const oldCount = source.split(before).length - 1;
    const newCount = source.split(after).length - 1;
    if (oldCount === 1 && newCount === 0) return source.replace(before, after);
    if (oldCount === 0 && newCount === 1) return source;
    throw new Error('Expected one original or updated ' + name + ' integration point');
  }
  function component(name, next, update) {
    const startToken = 'function ' + name + '(';
    const endToken = 'function ' + next + '(';
    const start = html.indexOf(startToken);
    const end = html.indexOf(endToken, start);
    if (start < 0 || end < 0 || html.indexOf(startToken, start + startToken.length) >= 0) {
      throw new Error('Expected unique component boundaries: ' + name);
    }
    html = html.slice(0, start) + update(html.slice(start, end)) + html.slice(end);
  }
  component('statusCaso', 'linhaDoTempo', code => replaceGuarded(code,
    'label: "Em organização pela Aon",',
    'label: "Em análise pela Aon",',
    'Aon case status label'));
  component('explicaStatus', 'gerarDossieHtml', code => replaceGuarded(code,
    'if (L === "Em organização pela Aon") return "A Aon está conferindo as informações e os documentos e se prepara para encaminhar o caso à seguradora.";',
    'if (L === "Em análise pela Aon") return "A Aon está analisando as informações e os documentos para preparar o encaminhamento do caso à seguradora. A análise de cobertura será realizada pela seguradora.";',
    'Aon case status explanation'));
  component('ClientList', 'ClientDetail', code => replaceGuarded(code,
    '}, "Pendências "), p.total ?',
    '}, "Pendências: "), p.total ?',
    'client card pending label'));
  html = replaceGuarded(html,
    'STATUS_AON.map(value => rce("option", {key: value}, value))',
    'STATUS_AON.map(value => rce("option", {key: value, value}, value === "Em organização" ? "Em análise pela Aon" : value))',
    'Aon status option label');
  html = replaceGuarded(html,
    'Se o incidente ainda está acontecendo, acione primeiro a sua equipe de TI ou de segurança. O Atlas serve para comunicar e acompanhar o caso: ele não faz contenção, perícia nem recuperação de sistemas.',
    'Se o incidente estiver em andamento, acione sua equipe de TI ou de segurança e comunique o caso à Aon em paralelo. Não espere a resolução do incidente para iniciar a abertura do sinistro na seguradora. O Atlas serve para comunicar e acompanhar o caso; a contenção, a perícia e a recuperação dos sistemas seguem com as equipes técnicas responsáveis.',
    'parallel incident response notice');
  html = replaceGuarded(html,
    'a Aon organiza as informações, identifica pendências e prepara o encaminhamento à seguradora. Você verá cada atualização no acompanhamento.',
    'A Aon analisará as informações. Se estiver tudo correto, o sinistro será aberto na seguradora. Caso haja pendências, entrará em contato. Você pode acompanhar o status diretamente na plataforma.',
    'client confirmation next steps');
  return html;
};
