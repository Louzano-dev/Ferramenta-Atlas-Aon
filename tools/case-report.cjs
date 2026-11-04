const fs=require('fs');
module.exports=function caseReport(html){
  function once(source,before,after,name){if(source.split(before).length!==2)throw Error('Expected one PDF integration: '+name);return source.replace(before,after);}
  const start=html.indexOf('function gerarDossieHtml('),end=html.indexOf('function copiarTexto(',start);
  if(start<0||end<0)throw Error('Expected old HTML dossier boundaries');
  const source=['case-report-data.js','case-report-pdf.js','case-report-ui.js'].map(file=>fs.readFileSync('assets/atlas/'+file,'utf8')).join('\n');
  html=html.slice(0,start)+source+'\n'+html.slice(end);
  const aside=[
    '    titulo: "Encaminhamento e protocolo",',
    '    aside: /*#__PURE__*/React.createElement("button", {',
    '      onClick: () => setMsgD(baixarArquivoTexto(`dossie-${s.id}.html`, gerarDossieHtml(s, todos, ator.nome), "text/html") ? "Dossiê gerado. Abra o arquivo e use Imprimir para salvar em PDF ou anexar ao e-mail." : "Não foi possível gerar o arquivo."),',
    '      className: BTN_SECONDARY',
    '    }, "Baixar dossiê (HTML)")',
    '  }, msgD && /*#__PURE__*/React.createElement("div", {',
    '    className: "text-xs text-emerald-700",',
    '    role: "status"',
    '  }, msgD), /*#__PURE__*/React.createElement("div", {'
  ].join('\n');
  html=once(html,aside,'    titulo: "Encaminhamento e protocolo"\n  }, /*#__PURE__*/React.createElement("div", {','remove HTML download');
  html=once(html,'  const [msgD, setMsgD] = useState(""),\n    [ret, setRet] = useState({','  const [ret, setRet] = useState({','remove HTML state');
  const boundary='}, "Caso de demonstração")), /*#__PURE__*/React.createElement("div", {\n    className: `${PANEL} p-4 space-y-3`,\n    "data-guia": true';
  html=once(html,boundary,'}, "Caso de demonstração")), rce(CasePdfDownload, {key:s.id, s, todos, apolices, ator}), /*#__PURE__*/React.createElement("div", {\n    className: `${PANEL} p-4 space-y-3`,\n    "data-guia": true','case-wide PDF control');
  html=once(html,'A Aon prepara a mensagem e o dossiê, envia à seguradora por fora do Atlas e registra o envio.','A Aon prepara a mensagem e o relatório PDF, envia à seguradora por fora do Atlas e registra o envio.','overview PDF wording');
  html=once(html,'Preparar a mensagem e o dossiê','Preparar a mensagem e o relatório PDF','insurer PDF wording');
  if(html.includes('gerarDossieHtml')||html.includes('Baixar dossiê (HTML)'))throw Error('Old HTML export remains');
  return html;
};
