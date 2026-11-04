const fs = require('fs');
module.exports = function clientReturn(html) {
  function once(before, after, label) {
    if (html.split(before).length !== 2) throw Error('Expected one client return integration point: ' + label);
    html = html.replace(before, after);
  }
  const source = fs.readFileSync('assets/atlas/client-return.js', 'utf8');
  once('function ClientList({', source + '\nfunction ClientList({', 'components');
  once('className: `w-full text-left ${PANEL} p-4 hover:border-blue-400`,', 'className: `cr-case-card w-full text-left ${PANEL} p-4 hover:border-blue-400`,', 'client case scope');
  once('p.total ? `${p.total} aguardando você` : "nenhuma")));', 'p.total ? `${p.total} aguardando você` : "nenhuma")), rce(ClientReturnEstimate, {s, compact: true}));', 'client list estimate');
  once('}, proximaAcao(s, true))), explicaStatus(statusCaso(s, true).label)', '}, proximaAcao(s, true))), rce(ClientReturnEstimate, {s}), explicaStatus(statusCaso(s, true).label)', 'client report estimate');
  once('rce(CaseLifecyclePanel, {s, actions, ator})', 'rce(AonReturnEstimateForm, {s, actions, ator}), rce(CaseLifecyclePanel, {s, actions, ator})', 'Aon summary form');
  const actions = `    setRetornoAonPrevisto: (id, previsto) => {
      if (ATOR.perfil !== "Aon") throw new Error("Somente a Aon pode definir a previsão de retorno.");
      const value = String(previsto || "");
      if (value && !caseReturnIsDate(value)) throw new Error("Informe uma data válida para a previsão de retorno.");
      const current = listaRef.current.find(s => s.id === id);
      if (!current || current.encerrado || (current.retornoAonPrevisto || "") === value) return false;
      setSinistros(list => list.map(s => {
        if (s.id !== id || s.encerrado || (s.retornoAonPrevisto || "") === value) return s;
        const previous = s.retornoAonPrevisto && caseReturnIsDate(s.retornoAonPrevisto) ? formatDate(s.retornoAonPrevisto) : "a definir";
        return log({...s, retornoAonPrevisto: value}, value ? \`Previsão de retorno da Aon ao cliente atualizada de \${previous} para \${formatDate(value)}\` : \`Previsão de retorno da Aon ao cliente removida (antes: \${previous}); nova data a definir\`);
      }));
      return true;
    },
`;
  once('  const actions = {', '  const actions = {\n' + actions, 'Aon save action');
  return html;
};
