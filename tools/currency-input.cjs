const fs = require('fs');
module.exports = function currencyInput(html) {
  function replaceOne(source, before, after, label) {
    const lines = Array.isArray(before) ? before : [before];
    const escaped = lines.map(line => line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\r?\\n');
    const pattern = new RegExp(escaped, 'g');
    if ([...source.matchAll(pattern)].length !== 1) throw Error('Expected one monetary integration: ' + label);
    return source.replace(pattern, after);
  }
  function component(name, next, update) {
    const marker = 'function ' + name + '(', start = html.indexOf(marker), end = html.indexOf('function ' + next + '(', start);
    if (start < 0 || end < 0 || html.indexOf(marker, start + marker.length) >= 0) throw Error('Expected unique monetary component: ' + name);
    html = html.slice(0, start) + update(html.slice(start, end)) + html.slice(end);
  }
  const marker = 'function ComunicacaoForm({';
  if (html.split(marker).length !== 2) throw Error('Expected one communication form for the currency input');
  const before = [
    '/*#__PURE__*/React.createElement("input", {',
    '    value: d.valor,',
    '    disabled: d.valorNsi,',
    '    onChange: e => set("valor")(e.target.value),',
    '    inputMode: "decimal",',
    '    placeholder: "ex: 50000",',
    '    className: "input",',
    '    "aria-label": "Prejuízo estimado"',
    '  })'
  ];
  html = replaceOne(html, before, 'rce(AtlasCurrencyInput, {value: d.valor, disabled: d.valorNsi, onChange: set("valor"), label: "Prejuízo estimado"})', 'estimated loss');
  component('IndenForm', 'SeguradoraTab', code => {
    code = replaceOne(code,
      '[va, setVa] = useState(i.valorAprovado ? String(i.valorAprovado) : ""),',
      '[va, setVa] = useState(atlasCurrencyFromNumber(i.valorAprovado)),', 'initial approved amount');
    code = replaceOne(code,
      '[vp, setVp] = useState(i.valorPago ? String(i.valorPago) : ""),',
      '[vp, setVp] = useState(atlasCurrencyFromNumber(i.valorPago)),', 'initial paid amount');
    for (const [value, setter, label] of [['va', 'setVa', 'Valor aprovado'], ['vp', 'setVp', 'Valor pago']]) {
      code = replaceOne(code, [
        '/*#__PURE__*/React.createElement("input", {',
        '    value: ' + value + ',',
        '    onChange: e => ' + setter + '(e.target.value),',
        '    inputMode: "decimal",',
        '    className: "input",',
        '    "aria-label": "' + label + '"',
        '  })'
      ], 'rce(AtlasCurrencyInput, {value: ' + value + ', onChange: ' + setter + ', label: "' + label + '"})', label);
    }
    return code;
  });
  component('AonApolices', 'AonHistorico', code => {
    for (const [field, label] of [['limite', 'Limite'], ['franquia', 'Franquia']]) {
      code = replaceOne(code, [
        '/*#__PURE__*/React.createElement("input", {',
        '    value: f.' + field + ',',
        '    onChange: e => setF({',
        '      ...f,',
        '      ' + field + ': e.target.value',
        '    }),',
        '    className: "input",',
        '    "aria-label": "' + label + '"',
        '  })'
      ], 'rce(AtlasCurrencyInput, {value: f.' + field + ', onChange: value => setF({...f, ' + field + ': value}), label: "' + label + '"})', label);
    }
    return code;
  });
  return html.replace(marker, () => fs.readFileSync('assets/atlas/currency-input.js', 'utf8') + '\n' + marker);
};
