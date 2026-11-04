function CasePdfDownload({s, todos, apolices, ator}) {
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(''), [error, setError] = useState(''), [result, setResult] = useState(null);
  const active = useRef(true);
  useEffect(() => () => {active.current = false;}, []);
  if (!ator || ator.perfil !== 'Aon') return null;
  async function download() {
    if (busy) return;
    setBusy(true);setError('');setResult(null);setProgress('Preparando o relatório…');
    try {
      const snapshot = JSON.parse(JSON.stringify(s)), all = JSON.parse(JSON.stringify(todos || [])), policies = JSON.parse(JSON.stringify(apolices || []));
      const output = await gerarRelatorioPdf(snapshot, all, ator.nome, text => {if(active.current)setProgress(String(text));}, policies);
      const blob = new Blob([output.bytes], {type:'application/pdf'}), url = URL.createObjectURL(blob);
      const link = document.createElement('a');link.href=url;link.download=output.fileName;link.style.display='none';document.body.appendChild(link);link.click();link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      if (active.current) {setResult({pageCount:output.pageCount,attachmentCount:output.attachmentCount,issues:output.issues});setProgress('PDF gerado e enviado para download.');}
    } catch (err) {if(active.current){setProgress('');setError(err && err.message || 'Não foi possível gerar o PDF. Tente novamente.');}}
    finally {if(active.current)setBusy(false);}
  }
  return rce('section', {className:'crp-download', 'data-case-pdf':s.id, 'aria-label':'Relatório completo do sinistro'},
    rce('div', {className:'crp-copy'},rce('h2', null, 'Relatório completo do sinistro'),
      rce('p', null, 'Gere um PDF com a situação atual, triagem, decisões, anotações, histórico e documentos. Disponível durante todo o acompanhamento, inclusive com pendências.'),
      rce('p', {className:'crp-help'}, 'Imagens e PDFs legíveis aparecem em páginas de anexos. Os arquivos originais disponíveis ficam incorporados ao PDF; a abertura desses originais depende do leitor de PDF.')),
    rce('button', {type:'button', className:BTN_PRIMARY, disabled:busy, onClick:download, 'aria-busy':busy, 'data-download-case-pdf':s.id}, busy ? 'Gerando PDF…' : 'Baixar relatório em PDF'),
    rce('p', {role:'status', 'aria-live':'polite', className:'crp-status'},progress,
      result && ` ${result.pageCount} página(s) · ${result.attachmentCount} arquivo(s) original(is) incorporado(s).`),
    error && rce('p', {role:'alert', className:'crp-error'},error),
    result && result.issues && result.issues.length > 0 && rce('details', {className:'crp-issues'},
      rce('summary', null, 'Observações sobre os anexos (',result.issues.length,')'),
      rce('ul', null, result.issues.map((issue,i)=>rce('li',{key:i},String(issue))))));
}
