/* Read-only, complete snapshot of one case. Text is plain PDF content, not HTML. */
function caseReportLabel(key) {
  const labels = {
    id: 'Identificador', segurado: 'Empresa segurada', apolice: 'Apólice', tipo: 'Tipo',
    dataOcorrencia: 'Data da ocorrência', dataComunicacao: 'Data da comunicação', dataIdentificacao: 'Data de identificação',
    descricao: 'Descrição completa', sistemas: 'Sistemas ou operações afetados', impactos: 'Outros impactos informados',
    exposicaoDados: 'Possível exposição de dados', indisponibilidade: 'Indisponibilidade de sistemas ou da operação',
    pessoasAfetadas: 'Pessoas possivelmente afetadas', valorEstimado: 'Prejuízo estimado', medidas: 'Medidas emergenciais adotadas',
    contato: 'Contato', nome: 'Nome', email: 'E-mail', telefone: 'Telefone', origem: 'Origem', canal: 'Canal',
    registradoPor: 'Registrado por', criadoEm: 'Registrado em', criadaEm: 'Criada em', atualizadoEm: 'Última atualização',
    responsavel: 'Responsável', status: 'Situação', organizadoEm: 'Análise inicial da Aon registrada em',
    retornoAonPrevisto: 'Previsão de retorno da Aon ao cliente', retornoPrevisto: 'Retorno previsto informado pela seguradora',
    categoria: 'Categoria', severidade: 'Severidade', prioridade: 'Prioridade', risco: 'Risco sugerido', pontos: 'Pontuação',
    fatores: 'Fatores considerados', lacunas: 'Informações ainda desconhecidas', docsNec: 'Documentos sugeridos para conferência',
    proximos: 'Próximas ações sugeridas pelas regras', sugerida: 'Categoria sugerida pelo relato', divergencia: 'Divergência a conferir',
    confirmada: 'Triagem confirmada pela Aon', confirmadaEm: 'Confirmada em', ajustado: 'Classificação ajustada pela Aon',
    por: 'Responsável pelo registro', perfil: 'Perfil', de: 'Remetente', texto: 'Texto integral', ts: 'Data e horário',
    titulo: 'Título', etapa: 'Etapa', prazo: 'Prazo', concluidaEm: 'Concluída em',
    estado: 'Situação registrada', solicitado: 'Documento solicitado', motivo: 'Motivo / observação', manual: 'Recebido por outro canal',
    recebidoEm: 'Recebido em', validadoEm: 'Validado em', documentoId: 'Identificador do documento', tipoDocumento: 'Documento',
    tipoDoc: 'Classificação do arquivo', formato: 'Formato', tamanho: 'Tamanho', anexadoEm: 'Anexado em', anexadoPor: 'Anexado por',
    guardado: 'Armazenamento do arquivo confirmado no envio', substituido: 'Arquivo substituído',
    resposta: 'Resposta integral', respondidaEm: 'Respondida em', fonte: 'Fonte da informação', compartilhar: 'Compartilhado com o cliente',
    seguradora: 'Seguradora', mensagem: 'Mensagem completa de encaminhamento', dataEnvio: 'Envio registrado em',
    dataRecebimento: 'Recebimento confirmado em', dataAbertura: 'Abertura na seguradora registrada em',
    protocolo: 'Protocolo da seguradora', protocoloFonte: 'Fonte do protocolo', protocoloRegistradoEm: 'Protocolo registrado no Atlas em',
    andamentoSeg: 'Andamento informado pela seguradora', andamentoEm: 'Andamento registrado em',
    situacao: 'Situação informada', data: 'Data informada', valorAprovado: 'Valor aprovado informado', valorPago: 'Valor pago informado',
    dataPagamento: 'Data do pagamento informada', nota: 'Observação integral', legado: 'Movimentação legada',
    interno: 'Registro interno da Aon', detalhes: 'Detalhes completos da movimentação', estadoAnterior: 'Situação anterior',
    estadoAtual: 'Situação após a movimentação', conclusaoAnterior: 'Conclusão anterior preservada', movimentoId: 'Identificador da movimentação',
    antes: 'Antes', depois: 'Depois', vigenciaIni: 'Início da vigência cadastrada', vigenciaFim: 'Fim da vigência cadastrada',
    numero: 'Número', limite: 'Limite cadastrado', franquia: 'Franquia cadastrada', itens: 'Itens cadastrados', exclui: 'Exclusões cadastradas',
    naoSei: 'Campos marcados como desconhecidos', pessoas: 'Pessoas afetadas', valor: 'Valor estimado', data: 'Data',
    documentos: 'Documentos', solicitacoes: 'Solicitações', complementos: 'Complementos', mensagens: 'Mensagens', retornos: 'Retornos da seguradora'
  };
  return labels[key] || String(key).replace(/([a-zà-ú])([A-ZÀ-Ú])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
}

function caseReportValue(value, key = '', depth = 0) {
  if (value === null || value === undefined || value === '') return 'Não registrado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') {
    if (['valorEstimado', 'valorAprovado', 'valorPago', 'limite', 'franquia'].includes(key) && Number.isFinite(value)) return fmtBRL(value);
    if (key === 'tamanho' && Number.isFinite(value)) return `${typeof fmtTam === 'function' ? fmtTam(value) : value.toLocaleString('pt-BR') + ' bytes'} (${value.toLocaleString('pt-BR')} bytes)`;
    return Number.isFinite(value) ? value.toLocaleString('pt-BR') : String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return 'Nenhum registro';
    return value.map((item, index) => `${index + 1}. ${caseReportValue(item, key, depth + 1)}`).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return 'Registro sem campos preenchidos';
    return entries.map(([field, item]) => `${caseReportLabel(field)}: ${caseReportValue(item, field, depth + 1)}`).join('\n');
  }
  const text = String(value);
  const dateKey = /^(?:ts|data|.*Em|prazo|dataOcorrencia|dataComunicacao|dataIdentificacao|dataEnvio|dataRecebimento|dataAbertura|dataPagamento|retornoPrevisto|retornoAonPrevisto|vigenciaIni|vigenciaFim)$/.test(key);
  if (dateKey && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text)) {
    const parsed = new Date(text.length === 10 ? text + 'T12:00:00' : text);
    const calendarValid = text.length !== 10 || (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() === Number(text.slice(0, 4)) && parsed.getMonth() + 1 === Number(text.slice(5, 7)) && parsed.getDate() === Number(text.slice(8, 10)));
    if (!Number.isNaN(parsed.getTime()) && calendarValid) return text.length === 10 ? formatDate(text) : fmtTs(text);
    return text + ' (data registrada inválida)';
  }
  if (key === 'tipo') return {conclusao: 'Conclusão', reabertura: 'Reabertura', informacao: 'Informação', documento: 'Documento'}[text] || text;
  if (key === 'estadoAnterior' || key === 'estadoAtual') return {ativo: 'Ativo', concluido: 'Concluído', reaberto: 'Reaberto'}[text] || text;
  return text;
}

function caseReportChronological(items, dateKey = 'ts') {
  return (items || []).map((item, index) => ({item, index})).sort((a, b) => {
    const first = new Date(a.item[dateKey] || 0).getTime(), second = new Date(b.item[dateKey] || 0).getTime();
    return (Number.isFinite(first) ? first : 0) - (Number.isFinite(second) ? second : 0) || a.index - b.index;
  }).map(entry => entry.item);
}

function buildCaseReportModel(s, todos, nomeAon, generatedAt = nowTs(), apolices = []) {
  if (!s || !s.id) throw new Error('Selecione um sinistro para gerar o relatório.');
  const sections = [], attachments = [];
  const section = (id, title) => {const item = {id, title, blocks: []}; sections.push(item); return item.blocks;};
  const add = (blocks, label, value, key = '') => blocks.push({label, text: caseReportValue(value, key)});
  const fields = (blocks, record, names) => names.forEach(key => add(blocks, caseReportLabel(key), record && record[key], key));
  const record = (blocks, label, item) => add(blocks, label, item);
  const listRecords = (blocks, items, singular, empty, dateKey) => {
    const list = dateKey ? caseReportChronological(items, dateKey) : (items || []);
    if (!list.length) {add(blocks, '', empty); return;}
    list.forEach((item, index) => record(blocks, `${singular} ${index + 1}${item.titulo || item.nome ? ' — ' + (item.titulo || item.nome) : ''}`, item));
  };
  const documents = Array.isArray(s.documentos) ? s.documentos : [];
  const pending = pendencias(s);
  const analysis = analisar(s, Array.isArray(todos) ? todos : [s]);
  const triage = triagemEfetiva(s, Array.isArray(todos) ? todos : [s]);
  const currentStatus = statusCaso(s, false).label;
  const phase = s.encerrado ? 'Acompanhamento concluído' : 'Acompanhamento em andamento';
  const docsReviewed = documents.length > 0 && documents.every(doc => doc.estado === 'Validado');
  const report = {id: String(s.id), title: 'Relatório completo do sinistro', company: String(s.segurado || 'Empresa não informada'), status: currentStatus, phase,
    generatedAt, generatedBy: String(nomeAon || 'Aon'), complete: !!s.encerrado, docsReviewed, sections, attachments};

  let blocks = section('situacao', 'Situação do acompanhamento na geração');
  add(blocks, 'Conteúdo do relatório', 'Registro integral das informações disponíveis neste caso no momento da geração, incluindo anotações internas da Aon e todos os eventos registrados.');
  add(blocks, 'Acompanhamento', phase);
  add(blocks, 'Status registrado', currentStatus);
  add(blocks, 'Gerado em', generatedAt, 'ts');
  add(blocks, 'Gerado por', report.generatedBy);
  fields(blocks, s, ['criadoEm', 'atualizadoEm', 'responsavel', 'retornoAonPrevisto']);
  add(blocks, 'Próxima ação registrada / esperada', proximaAcao(s, false));
  add(blocks, 'Pendências na geração', `${pending.docs.length} documento(s) e ${pending.sols.length} solicitação(ões) de informação em aberto; total: ${pending.total}.`);
  add(blocks, 'Conferência documental', !documents.length ? 'Sem documentos registrados.' : docsReviewed ? 'Todos os documentos registrados estão validados pela Aon.' : 'Há documentos registrados que ainda não estão validados pela Aon.');
  add(blocks, 'Decisões de cobertura e indenização', 'As decisões constam nas seções próprias somente quando registradas. A geração deste relatório não muda a fase nem conclui o acompanhamento.');

  blocks = section('identificacao', 'Empresa, contato e registro do incidente');
  fields(blocks, s, ['id', 'segurado', 'apolice', 'contato', 'tipo', 'origem', 'canal', 'registradoPor', 'criadoEm', 'organizadoEm']);

  blocks = section('ocorrencia', 'Ocorrência, impactos e medidas adotadas');
  fields(blocks, s, ['dataOcorrencia', 'dataComunicacao', 'dataIdentificacao', 'descricao', 'sistemas', 'exposicaoDados', 'indisponibilidade', 'impactos', 'pessoasAfetadas', 'valorEstimado', 'medidas', 'naoSei']);
  listRecords(blocks, s.complementos, 'Complemento', 'Nenhuma informação complementar registrada.', 'ts');

  blocks = section('andamento', 'Etapas do processo e situação registrada');
  if (typeof linhaDoTempo === 'function') linhaDoTempo(s, false).forEach((step, index) => {
    record(blocks, `Etapa ${index + 1} — ${step.titulo}`, {
      situacao: step.feito ? 'Etapa realizada conforme os registros' : step.estado === 'atual' ? 'Etapa atual, aguardando registro' : 'Etapa ainda não registrada',
      fonte: step.fonte, data: step.quando || null, ...(step.detalhe ? {detalhes: step.detalhe} : {})
    });
  });
  else add(blocks, 'Status atual', currentStatus);

  blocks = section('triagem', 'Triagem, classificação e fundamentos');
  add(blocks, 'Situação da triagem', triage.confirmada ? 'Triagem confirmada pela Aon. O registro completo da confirmação consta abaixo.' : 'Triagem ainda não confirmada. A classificação abaixo é uma sugestão das regras locais do Atlas.');
  record(blocks, 'Classificação efetiva exibida no Atlas', triage);
  if (s.triagem) record(blocks, 'Registro integral da triagem pela Aon', s.triagem);
  else add(blocks, 'Registro de confirmação', 'Não registrado.');
  record(blocks, 'Fundamentos e sugestões das regras locais', analysis);

  blocks = section('apolice', 'Apólice vinculada e conferência cadastral');
  add(blocks, 'Número informado no caso', s.apolice);
  const policy = (apolices || []).find(item => norm(item.numero) === norm(s.apolice) && norm(item.segurado) === norm(s.segurado));
  if (policy) {
    record(blocks, 'Dados completos do cadastro da apólice vinculada', policy);
    if (typeof sinalizarCobertura === 'function') {
      const {apolice: checkedPolicy, ...check} = sinalizarCobertura(s, [policy]);
      record(blocks, 'Conferência cadastral (não representa decisão de cobertura)', check);
    }
  } else add(blocks, 'Cadastro da apólice', 'Nenhum cadastro de apólice vinculado à mesma empresa foi fornecido para este relatório. O número informado no caso está preservado acima.');

  blocks = section('plano', 'Plano de ações e responsáveis');
  listRecords(blocks, s.tarefas, 'Ação', 'Nenhuma ação de acompanhamento registrada.', 'criadaEm');

  blocks = section('documentos', 'Documentos, validações e relação integral de arquivos');
  if (!documents.length) add(blocks, '', 'Nenhum documento registrado.');
  documents.forEach((doc, index) => {
    const {arquivos, ...documentRecord} = doc;
    record(blocks, `Documento ${index + 1} — ${doc.nome || 'Sem nome registrado'}`, documentRecord);
    if (!(arquivos || []).length) add(blocks, 'Arquivo digital', doc.manual ? 'Recebimento registrado por outro canal. Não há arquivo digital anexado a este documento no Atlas.' : 'Nenhum arquivo digital anexado a este documento no Atlas.');
    (arquivos || []).forEach((file, fileIndex) => {
      const attachment = {...file, id: file.id, nome: file.nome || 'Arquivo sem nome', documentoId: doc.id, tipoDocumento: doc.nome || 'Documento sem nome', estado: doc.estado || 'Não registrado', substituido: !!file.substituido};
      attachments.push(attachment);
      record(blocks, `Arquivo ${index + 1}.${fileIndex + 1} — ${attachment.nome}`, attachment);
    });
  });

  blocks = section('solicitacoes', 'Solicitações, respostas e pendências');
  listRecords(blocks, s.solicitacoes, 'Solicitação', 'Nenhuma solicitação de informação registrada.', 'criadaEm');

  blocks = section('mensagens', 'Comunicações entre a empresa segurada e a Aon');
  listRecords(blocks, s.mensagens, 'Mensagem', 'Nenhuma mensagem registrada.', 'ts');

  blocks = section('encaminhamento', 'Encaminhamento, abertura na seguradora e protocolo');
  const insurer = {...(s.encaminhamento || {})};
  if (insurer.estado) insurer.estado = {nenhum: 'Ainda não encaminhado', preparado: 'Mensagem preparada, ainda não enviada', enviado: 'Enviado pela Aon', recebido: 'Recebimento confirmado pela seguradora', aberto: 'Sinistro aberto na seguradora'}[insurer.estado] || insurer.estado;
  record(blocks, 'Registro completo do encaminhamento', insurer);
  fields(blocks, s, ['andamentoSeg', 'andamentoEm', 'retornoPrevisto']);
  listRecords(blocks, s.retornos, 'Retorno da seguradora', 'Nenhum retorno da seguradora registrado.', 'ts');

  blocks = section('decisoes', 'Decisões de cobertura e registros de indenização');
  if (s.cobertura) record(blocks, 'Decisão de cobertura registrada', s.cobertura);
  else add(blocks, 'Decisão de cobertura', 'Ainda não registrada.');
  if (s.indenizacao) record(blocks, 'Registro integral de indenização', s.indenizacao);
  else add(blocks, 'Indenização', 'Ainda não registrada.');

  blocks = section('ciclos', 'Conclusões e reaberturas do acompanhamento');
  if (s.encerrado) record(blocks, 'Conclusão vigente do acompanhamento', s.encerrado);
  else add(blocks, 'Situação vigente', 'Acompanhamento em andamento; não há conclusão vigente.');
  listRecords(blocks, s.acompanhamentoMovimentos, 'Movimentação do acompanhamento', 'Nenhum ciclo adicional de conclusão ou reabertura registrado.', 'ts');

  blocks = section('historico', 'Histórico completo das movimentações');
  add(blocks, 'Critério de apresentação', 'Todos os eventos registrados, em ordem cronológica, inclusive registros internos da Aon. Os textos completos de mensagens, retornos e observações também constam nas respectivas seções.');
  caseReportChronological(s.historico).forEach((event, index) => record(blocks, `Movimentação ${index + 1}${event.interno ? ' — interna da Aon' : ''}`, event));
  if (!(s.historico || []).length) add(blocks, '', 'Nenhuma movimentação registrada.');

  const covered = new Set(['id','segurado','apolice','tipo','dataOcorrencia','dataComunicacao','dataIdentificacao','descricao','sistemas','impactos','exposicaoDados','indisponibilidade','pessoasAfetadas','valorEstimado','medidas','naoSei','triagem','tarefas','contato','origem','canal','registradoPor','criadoEm','responsavel','status','organizadoEm','documentos','solicitacoes','complementos','encaminhamento','andamentoSeg','andamentoEm','mensagens','retornos','retornoPrevisto','retornoAonPrevisto','cobertura','indenizacao','encerrado','acompanhamentoMovimentos','historico','atualizadoEm']);
  const extra = Object.fromEntries(Object.entries(s).filter(([key]) => !covered.has(key)));
  if (Object.keys(extra).length) record(section('registros-complementares', 'Outros dados registrados no caso'), 'Informações complementares do registro', extra);
  report.stats = {
    documents: documents.length, validatedDocuments: documents.filter(doc => doc.estado === 'Validado').length,
    files: attachments.length, replacedFiles: attachments.filter(file => file.substituido).length,
    pendingDocuments: pending.docs.length, openRequests: pending.sols.length, pendingTotal: pending.total,
    historyEvents: (s.historico || []).length, internalHistoryEvents: (s.historico || []).filter(event => event.interno).length,
    openTasks: (s.tarefas || []).filter(task => task.status === 'Aberta').length,
    completedTasks: (s.tarefas || []).filter(task => task.status === 'Concluída').length,
    hasCoverageDecision: !!s.cobertura, hasPaymentRecord: !!s.indenizacao
  };
  return report;
}
