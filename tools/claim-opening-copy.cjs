/* Opening terminology from the recorded review; case facts and history are unchanged. */
module.exports = function claimOpeningCopy(html) {
  const changes = [
    ['label: "Sinistro formalmente aberto pela seguradora",', 'label: "Sinistro aberto na seguradora",'],
    ['titulo: "Sinistro formalmente aberto pela seguradora",', 'titulo: "Sinistro aberto na seguradora",'],
    ['titulo: "Caso em organização pela Aon",', 'titulo: "Caso em análise pela Aon",'],
    ['if (L === "Recebimento confirmado pela seguradora") return "A seguradora confirmou que recebeu a comunicação. Falta ela abrir o sinistro formalmente e informar o protocolo.";', 'if (L === "Recebimento confirmado pela seguradora") return "A seguradora confirmou que recebeu a comunicação. Aguarde a confirmação de abertura do sinistro na seguradora e o protocolo.";'],
    ['if (L === "Sinistro formalmente aberto pela seguradora") return "A seguradora abriu o sinistro e informou um protocolo (veja acima). Agora ela vai analisar o caso.";', 'if (L === "Sinistro aberto na seguradora") return "O sinistro foi aberto na seguradora. O protocolo aparece no acompanhamento quando registrado. O caso segue para análise da seguradora.";'],
    ['if (idx === 3) return "Aguardar a abertura formal do sinistro e o protocolo da seguradora.";', 'if (idx === 3) return "Aguardar a confirmação de abertura do sinistro na seguradora e o protocolo.";'],
    ['aberto: "sinistro aberto pela seguradora"', 'aberto: "sinistro aberto na seguradora"'],
    ['É quando a seguradora registra o sinistro nos sistemas dela e informa um número de protocolo. Só a seguradora faz isso.', 'É o registro da abertura do sinistro na seguradora. A Aon acompanha esse processo e registra o protocolo no Atlas quando disponível.'],
    ['A seguradora abriu o sinistro formalmente?', 'O sinistro já foi aberto na seguradora?'],
    ['Andamento, cobertura e indenização podem ser registrados após a abertura formal pela seguradora.', 'Andamento, cobertura e indenização podem ser registrados após a abertura do sinistro na seguradora.'],
    ['Isso não representa a abertura formal do sinistro pela seguradora.', 'Isso não representa a abertura do sinistro na seguradora.'],
    ['O registro no Atlas não é, por si só, a abertura formal do sinistro pela seguradora.', 'O registro no Atlas não é, por si só, a abertura do sinistro na seguradora.'],
    ['Este registro não representa, por si só, a abertura formal do sinistro pela seguradora,', 'Este registro não representa, por si só, a abertura do sinistro na seguradora,']
  ];
  for (const [before, after] of changes) {
    const oldCount = html.split(before).length - 1;
    const newCount = html.split(after).length - 1;
    if (oldCount === 1 && newCount === 0) html = html.replace(before, after);
    else if (oldCount !== 0 || newCount !== 1) throw Error('Expected one claim opening copy point: ' + before);
  }
  return html;
};
