/* Aon's next customer update is separate from any insurer return estimate. */
function caseReturnIsDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(value + "T12:00:00");
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
}

function ClientReturnEstimate({s, compact = false}) {
  if (s.encerrado) return null;
  const value = caseReturnIsDate(s.retornoAonPrevisto || "") ? s.retornoAonPrevisto : "";
  const overdue = !!value && value < hojeIsoStr();
  return rce("div", {className: "cr-estimate" + (compact ? " cr-estimate-compact" : "") + (overdue ? " is-overdue" : ""), "data-client-return": s.id},
    rce("div", null, rce("span", {className: "cr-label"}, "Previsão de retorno da Aon: "),
      value ? rce("time", {dateTime: value, className: "cr-value"}, formatDate(value)) : rce("span", {className: "cr-value"}, "A definir pela Aon")),
    overdue && rce("p", {className: "cr-note"}, "Previsão vencida. Aguarde a atualização da Aon."),
    !compact && rce("p", {className: "cr-note"}, "Estimativa da próxima atualização do acompanhamento pela Aon."));
}

function AonReturnEstimateForm({s, actions, ator}) {
  const [value, setValue] = useState(s.retornoAonPrevisto || "");
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const helpId = "cr-return-help-" + s.id, errorId = "cr-return-error-" + s.id;
  useEffect(() => setValue(s.retornoAonPrevisto || ""), [s.id, s.retornoAonPrevisto]);
  useEffect(() => {setError(""); setMessage("");}, [s.id]);
  if (!ator || ator.perfil !== "Aon" || s.encerrado) return null;
  function save(next) {
    setError(""); setMessage("");
    if (next && !caseReturnIsDate(next)) {setError("Informe uma data válida para a previsão de retorno."); return;}
    try {
      const changed = actions.setRetornoAonPrevisto(s.id, next);
      setValue(next);
      setMessage(changed ? next ? "Previsão salva; a data está disponível para o cliente." : "Previsão removida; o cliente verá que a data está a definir." : "Essa previsão já está salva.");
    } catch (err) {setError(err && err.message || "Não foi possível salvar a previsão.");}
  }
  return rce("section", {className: "cr-aon-return", "data-aon-return": s.id},
    rce(Secao, {titulo: "Próximo retorno ao cliente"},
      rce("p", {id: helpId, className: "cr-note"}, "Informe quando a Aon prevê atualizar o cliente. Essa data aparece na lista e no relatório do caso e pode ser revisada durante o acompanhamento."),
      rce("form", {className: "cr-form", noValidate: true, onSubmit: e => {e.preventDefault(); save(value);}},
        rce(Field, {label: "Previsão de retorno ao cliente"},
          rce("input", {type: "date", className: "input", value, onChange: e => {setValue(e.target.value); setError(""); setMessage("");}, "aria-label": "Previsão de retorno ao cliente", "aria-invalid": !!error, "aria-describedby": helpId + (error ? " " + errorId : "")})),
        rce("div", {className: "cr-form-actions"},
          rce("button", {type: "submit", className: BTN_PRIMARY}, "Salvar previsão de retorno"),
          rce("button", {type: "button", className: BTN_SECONDARY, disabled: !value && !s.retornoAonPrevisto, onClick: () => save("")}, "Limpar previsão"))),
      error && rce("p", {id: errorId, className: "cr-error", role: "alert"}, error),
      rce("p", {className: "cr-message", role: "status", "aria-live": "polite"}, message)));
}
