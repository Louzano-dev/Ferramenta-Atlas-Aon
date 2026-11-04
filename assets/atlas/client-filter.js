/* Client identity is derived from saved case names; no record is changed. */
function atlasClientName(value) {
  return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
}
function atlasClientKey(value) {
  return atlasClientName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
function atlasClientOptions(sinistros) {
  const clients = new Map();
  for (const s of sinistros) {
    const name = atlasClientName(s.segurado), key = atlasClientKey(name);
    if (!key) continue;
    const previous = clients.get(key);
    if (previous) previous.count++;
    else clients.set(key, {key, name, count: 1});
  }
  return [...clients.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
function ClientFilterBar({clients, value, onChange, selectRef}) {
  const selected = clients.find(client => client.key === value);
  return rce("section", {className: "cf-filter", "data-client-filter": true, "aria-label": "Filtro de cliente"},
    rce("div", {className: "cf-filter-controls"},
      rce("label", {className: "cf-filter-field"},
        rce("span", null, "Filtrar por cliente"),
        rce("select", {ref: selectRef, className: "input", value, onChange: e => onChange(e.target.value), "aria-label": "Filtrar por cliente"},
          rce("option", {value: ""}, "Todos os clientes"),
          clients.map(client => rce("option", {key: client.key, value: client.key}, client.name)))),
      rce("button", {type: "button", className: BTN_SECONDARY, disabled: !value, onClick: () => onChange("")}, "Limpar filtro de cliente")),
    rce("p", {className: "cf-filter-status", role: "status", "aria-live": "polite"}, selected ? "Cliente selecionado: " + selected.name : "Todos os clientes"));
}
