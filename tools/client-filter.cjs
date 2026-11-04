const fs = require('fs');
module.exports = function clientFilter(html) {
  function once(source, before, after, name) {
    if (source.split(before).length !== 2) throw Error('Expected one client filter integration point: ' + name);
    return source.replace(before, after);
  }
  function component(name, next, change) {
    const marker = 'function ' + name + '(', start = html.indexOf(marker);
    const end = html.indexOf('function ' + next + '(', start);
    if (start < 0 || end < 0 || html.indexOf(marker, start + marker.length) >= 0) throw Error('Expected unique client filter component: ' + name);
    html = html.slice(0, start) + change(html.slice(start, end)) + html.slice(end);
  }
  component('AonOverview', 'AonList', code => {
    code = once(code, '  onNew,\n  onNav\n}) {', '  onNew,\n  onNav,\n  onFocusClientFilter,\n  clienteNome\n}) {', 'overview props');
    code = once(code, 'className: `${PANEL} p-4 text-left hover:border-blue-400`', 'className: `cf-stat ${PANEL} p-4 text-left hover:border-blue-400`', 'stat card scope');
    code = once(code, 'className: "text-2xl font-semibold text-gray-900 mt-1"', 'className: "cf-stat-value text-2xl font-semibold text-gray-900 mt-1"', 'stat value scope');
    code = once(code, 'className: "grid grid-cols-2 lg:grid-cols-4 gap-3"', 'className: "cf-stats grid grid-cols-2 lg:grid-cols-3 gap-3"', 'stat grid');
    code = once(code, '}, stat("Acompanhamentos ativos", ativos.length,', '}, stat("Clientes acompanhados", atlasClientOptions(sinistros).length, clienteNome ? "cliente selecionado: " + clienteNome : "empresas com sinistros no Atlas", onFocusClientFilter, "clientes"), stat("Acompanhamentos ativos", ativos.length,', 'client count card');
    return code;
  });
  component('AonApp', 'log', code => {
    const state = `  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const clienteFiltroRef = useRef(null);
  const clientesAcompanhados = atlasClientOptions(sinistros);
  const clienteAtual = clientesAcompanhados.find(client => client.key === clienteSelecionado) || null;
  const clienteAtivo = clienteAtual ? clienteAtual.key : "";
  const sinistrosDoCliente = clienteAtivo ? sinistros.filter(s => atlasClientKey(s.segurado) === clienteAtivo) : sinistros;
  useEffect(() => {
    if (clienteSelecionado && !clienteAtivo) setClienteSelecionado("");
  }, [clienteSelecionado, clienteAtivo]);
`;
    code = once(code, '  const sel = sinistros.find(s => s.id === selId) || null;', state + '  const sel = sinistros.find(s => s.id === selId) || null;', 'Aon client filter state');
    code = once(code, '  }, view === "geral" && /*#__PURE__*/React.createElement(AonOverview, {', '  }, ["geral", "lista", "concluidos", "monitor", "historico"].includes(view) && rce(ClientFilterBar, {clients: clientesAcompanhados, value: clienteAtivo, onChange: setClienteSelecionado, selectRef: clienteFiltroRef}), view === "geral" && /*#__PURE__*/React.createElement(AonOverview, {', 'shared Aon filter toolbar');
    for (const name of ['AonOverview', 'AonList', 'AonCompleted', 'AonMonitor', 'AonHistorico']) {
      const pattern = new RegExp('(React\\.createElement\\(' + name + ', \\{\\r?\\n    sinistros: )sinistros,', 'g');
      if ([...code.matchAll(pattern)].length !== 1) throw Error('Expected one filtered Aon view: ' + name);
      code = code.replace(pattern, '$1sinistrosDoCliente,');
    }
    code = once(code, 'React.createElement(AonOverview, {\n    sinistros: sinistrosDoCliente,', 'React.createElement(AonOverview, {\n    sinistros: sinistrosDoCliente,\n    onFocusClientFilter: () => clienteFiltroRef.current?.focus(),\n    clienteNome: clienteAtual ? clienteAtual.name : "",', 'overview filter context');
    code = once(code, 'React.createElement(AonHistorico, {\n    sinistros: sinistrosDoCliente,', 'React.createElement(AonHistorico, {\n    key: clienteAtivo,\n    sinistros: sinistrosDoCliente,', 'reset history filters when client changes');
    return code;
  });
  const marker = 'function AonOverview(';
  return once(html, marker, fs.readFileSync('assets/atlas/client-filter.js', 'utf8') + '\n' + marker, 'client helpers');
};
