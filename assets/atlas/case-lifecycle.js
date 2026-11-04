/* Case lifecycle keeps the current flag compatible with all existing screens. */
function caseLifecycleTransition(s, mode, note, actor, event) {
  const moves = Array.isArray(s.acompanhamentoMovimentos) ? [...s.acompanhamentoMovimentos] : [];
  if (s.encerrado && !moves.some(m => m.tipo === "conclusao" && m.ts === s.encerrado.ts && m.por === s.encerrado.por && m.nota === s.encerrado.nota)) {
    moves.push({
      id: `legado:${s.id}:${s.encerrado.ts}`,
      tipo: "conclusao",
      ts: s.encerrado.ts,
      por: s.encerrado.por || "Não registrado",
      nota: s.encerrado.nota || "",
      legado: true
    });
  }
  const previousClosure = s.encerrado ? {...s.encerrado} : null;
  const next = {
    ...s,
    encerrado: mode === "conclusao" ? {ts: event.ts, nota: note, por: actor.nome, movimentoId: event.id} : null,
    acompanhamentoMovimentos: [...moves, event],
    atualizadoEm: event.ts,
    historico: [...(s.historico || []), {
      ts: event.ts,
      texto: mode === "conclusao" ? `Acompanhamento concluído pela Aon: ${note}` : `Acompanhamento reaberto pela Aon: ${note}`,
      perfil: "Aon",
      por: actor.nome,
      interno: false,
      tipo: mode,
      detalhes: {
        motivo: note,
        estadoAnterior: mode === "conclusao" ? "ativo" : "concluido",
        estadoAtual: mode === "conclusao" ? "concluido" : "ativo",
        ...(previousClosure ? {conclusaoAnterior: previousClosure} : {})
      }
    }]
  };
  return next;
}

function CaseLifecyclePanel({s, actions, ator}) {
  const [st, setSt] = useState(STATUS_AON.includes(s.status) ? s.status : STATUS_AON[0]);
  const [mode, setMode] = useState(null), [note, setNote] = useState("");
  const [force, setForce] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const dialogRef = useRef(null), panelRef = useRef(null);
  const titleId = "case-lifecycle-title-" + s.id;
  const descriptionId = "case-lifecycle-description-" + s.id;
  const errorId = "case-lifecycle-error-" + s.id;
  const closing = mode === "conclusao";
  const pending = pendencias(s), coveragePending = !s.cobertura;
  const unresolved = pending.total > 0 || coveragePending;
  const permitted = ator && ator.perfil === "Aon";
  useEffect(() => setSt(STATUS_AON.includes(s.status) ? s.status : STATUS_AON[0]), [s.id, s.status]);
  useEffect(() => {
    if (!mode) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog.querySelector("textarea")?.focus();
    function keydown(e) {
      if (e.key === "Escape") { e.preventDefault(); setMode(null); return; }
      if (e.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
      if (!focusable.length) { e.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown, true);
      if (previous && previous.isConnected) previous.focus({preventScroll: true});
      else panelRef.current?.querySelector('[data-lifecycle-action]')?.focus({preventScroll: true});
    };
  }, [mode]);
  if (!permitted) return null;
  function open(nextMode) { setNote(""); setForce(false); setError(""); setSuccess(""); setMode(nextMode); }
  function submit(e) {
    e.preventDefault();
    if (note.trim().length < 5) { setError(closing ? "Informe uma observação de conclusão com pelo menos 5 caracteres." : "Justifique a reabertura com pelo menos 5 caracteres."); return; }
    if (closing && unresolved && !force) { setError("Confirme que deseja concluir mesmo com as questões em aberto."); return; }
    try {
      const changed = closing ? actions.encerrar(s.id, note.trim(), force) : actions.reabrir(s.id, note.trim());
      if (!changed) { setError("O acompanhamento já foi alterado. Feche esta janela e confira a situação atual."); return; }
      setSuccess(closing ? "Acompanhamento concluído. O caso está em Casos concluídos." : "Acompanhamento reaberto. O caso voltou aos Sinistros registrados.");
      setMode(null);
    } catch (err) { setError(err && err.message || "Não foi possível atualizar o acompanhamento."); }
  }
  const dialog = mode && ReactDOM.createPortal(rce("div", {className: "cl-overlay"},
    rce("section", {className: "cl-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, "aria-describedby": descriptionId, tabIndex: -1, ref: dialogRef},
      rce("h2", {id: titleId}, closing ? "Concluir acompanhamento" : "Reabrir acompanhamento"),
      rce("p", {className: "cl-case"}, rce("strong", null, s.id), " · ", s.segurado),
      rce("p", {id: descriptionId, className: "cl-description"}, closing ? "Esta ação conclui o acompanhamento da Aon e mantém todos os dados do caso. Não representa decisão de cobertura nem confirmação de pagamento da seguradora." : "A reabertura retoma o acompanhamento da Aon no mesmo caso. Documentos, comunicações, protocolo, cobertura e indenização serão preservados."),
      rce("form", {onSubmit: submit, noValidate: true, className: "cl-form"},
        rce("label", null, rce("span", null, closing ? "Observação da conclusão" : "Justificativa da reabertura"),
          rce("textarea", {className: "input", rows: 4, required: true, minLength: 5, value: note, onChange: e => setNote(e.target.value), "aria-label": closing ? "Observação da conclusão" : "Justificativa da reabertura", "aria-invalid": !!error, "aria-describedby": error ? errorId : undefined})),
        closing && unresolved && rce("div", {className: "cl-pending"},
          rce("p", null, [pending.total > 0 && `${pending.total} pendência(s) em aberto`, coveragePending && "decisão de cobertura ainda não registrada"].filter(Boolean).join(" · ")),
          rce(Check, {label: "Concluir mesmo com essas questões em aberto", v: force, on: setForce})),
        error && rce("p", {id: errorId, className: "cl-error", role: "alert"}, error),
        rce("div", {className: "cl-actions"},
          rce("button", {type: "button", className: BTN_SECONDARY, onClick: () => setMode(null)}, "Cancelar"),
          rce("button", {type: "submit", className: BTN_PRIMARY}, closing ? "Confirmar conclusão" : "Confirmar reabertura"))))), document.body);
  return rce("section", {ref: panelRef, "data-case-lifecycle": s.id, "data-case-state": s.encerrado ? "concluido" : "ativo"},
    rce(Secao, {titulo: "Acompanhamento da Aon", aside: rce(StatusBadge, {s})},
      s.encerrado ? rce("div", {className: "space-y-3"},
        rce("p", {className: "text-sm text-gray-700"}, "Acompanhamento concluído em ", fmtTs(s.encerrado.ts), s.encerrado.por ? ` por ${s.encerrado.por}` : "", "."),
        s.encerrado.nota && rce("p", {className: "text-sm text-gray-700"}, s.encerrado.nota),
        rce("button", {type: "button", className: BTN_SECONDARY, "data-lifecycle-action": "reabrir", onClick: () => open("reabertura")}, "Reabrir acompanhamento")) : rce("div", {className: "space-y-4"},
        encIdx(s) < 2 ? rce("div", {className: "flex gap-3 flex-wrap items-end"},
          rce(Field, {label: "Status do acompanhamento"}, rce("select", {className: "input", value: st, "aria-label": "Status do acompanhamento", onChange: e => setSt(e.target.value)}, STATUS_AON.map(value => rce("option", {key: value}, value)))),
          rce("button", {type: "button", className: BTN_PRIMARY, onClick: () => { actions.setStatus(s.id, st); setSuccess("Status atualizado; o cliente verá a mudança."); }}, "Atualizar status")) : rce("p", {className: "text-sm text-gray-600"}, 'Depois do encaminhamento, o status acompanha as etapas registradas na aba "Seguradora".'),
        rce("div", {className: "flex gap-3 flex-wrap items-end"}, rce(Field, {label: "Responsável pelo acompanhamento"}, rce("select", {className: "input", value: s.responsavel, "aria-label": "Responsável", onChange: e => actions.setResponsavel(s.id, e.target.value)}, ["A definir", ...EQUIPE_AON].map(value => rce("option", {key: value}, value))))),
        rce("div", {className: "cl-complete"}, rce("p", {className: "text-xs text-gray-600"}, "A conclusão encerra apenas o acompanhamento da Aon. Os dados e o histórico ficam disponíveis."),
          rce("button", {type: "button", className: BTN_SECONDARY, "data-lifecycle-action": "concluir", onClick: () => open("conclusao")}, "Concluir acompanhamento"))),
      success && rce("p", {role: "status", className: "text-sm text-emerald-700"}, success)), dialog);
}
