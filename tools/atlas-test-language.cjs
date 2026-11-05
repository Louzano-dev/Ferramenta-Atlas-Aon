/* Humanizer: edit interface prose without changing control names or case records. */
const changes = [
  ['Converse com as empresas e acompanhe cada sinistro em um só lugar.', 'Mensagens das empresas, organizadas por sinistro.'],
  ['Converse com a Aon e acompanhe as mensagens de cada sinistro.', 'Mensagens com a Aon, organizadas por sinistro.'],
  ['Registre uma comunicação para iniciar uma conversa vinculada ao caso.', 'Registre uma comunicação para conversar sobre o caso.'],
  ['Comunique um incidente para iniciar uma conversa com a Aon.', 'Comunique um incidente para conversar com a Aon.'],
  ['Converse com a empresa sobre este sinistro. As mensagens ficam reunidas neste histórico.', 'Converse com a empresa e consulte aqui o histórico deste sinistro.'],
  ['Envie suas dúvidas ou informações para a Aon. A conversa fica vinculada a este sinistro.', 'Envie dúvidas ou informações sobre este sinistro para a Aon.'],
  ['Use para registrar uma comunicação recebida por telefone, e-mail ou outro canal. Ela passa a aparecer também para a empresa segurada.', 'Registre comunicações recebidas por telefone, e-mail ou outro canal. A empresa segurada também poderá acompanhá-las.'],
  ['Anote aqui mensagens, e-mails ou ligações da seguradora, para o histórico ficar em um só lugar.', 'Registre as mensagens, os e-mails e as ligações da seguradora no histórico do caso.'],
  ['Inclui prioridades sugeridas ainda não confirmadas.', 'Inclui sugestões de prioridade que a Aon ainda não confirmou.'],
  ['Nenhum documento registrado ainda.', 'Este sinistro ainda não tem documentos registrados.'],
  ['Nenhuma ação registrada.', 'Este sinistro ainda não tem ações registradas.'],
  ['Escreva a resposta antes de enviar.', 'Preencha a resposta para enviar.'],
  ['Empresa, número ou incidente', 'Empresa, sinistro ou tipo'],
  ['. O histórico e o relatório PDF deste sinistro reúnem os registros da conversa.', '. Consulte a conversa no histórico e no relatório PDF do sinistro.']
];

module.exports = function atlasTestLanguage(html) {
  for (const [before, after] of changes) {
    // Exact quoted literals prevent matching a record, a comment, or part of another notice.
    const variants = [
      [JSON.stringify(before), JSON.stringify(after)],
      ["'" + before.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'", "'" + after.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"]
    ];
    const matches = variants.flatMap(([source, replacement]) => {
      const count = html.split(source).length - 1;
      return count ? [{source, replacement, count}] : [];
    });
    if (matches.length !== 1 || matches[0].count !== 1) throw Error('Expected one UI prose literal: ' + before);
    html = html.replace(matches[0].source, matches[0].replacement);
  }
  return html;
};

module.exports.changes = changes;
