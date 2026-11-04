const fs=require('fs');
module.exports=function caseLifecycle(html){
  const start=html.indexOf('function ResumoTab({'),end=html.indexOf('function gerarResumoCaso(',start);
  if(start<0||end<0)throw Error('Expected ResumoTab boundaries missing');
  let resumo=html.slice(start,end);
  const sectionStart=resumo.search(/\), \/\*#__PURE__\*\/React\.createElement\(Secao, \{\r?\n    titulo: "Atualizar andamento"/);
  const converseStart=resumo.indexOf(', /*#__PURE__*/React.createElement(Conversa, {',sectionStart);
  if(sectionStart<0||converseStart<0)throw Error('Expected Aon lifecycle section boundaries missing');
  // Leave the existing company/incident summary and conversation unchanged.
  resumo=resumo.slice(0,sectionStart)+'), rce(CaseLifecyclePanel, {s, actions, ator})'+resumo.slice(converseStart);
  const stateStart=resumo.indexOf('  const [st, setSt]'),lineStart=resumo.indexOf('  const linha =',stateStart);
  if(stateStart<0||lineStart<0)throw Error('Expected legacy ResumoTab state missing');
  resumo=resumo.slice(0,stateStart)+resumo.slice(lineStart);
  html=html.slice(0,start)+fs.readFileSync('assets/atlas/case-lifecycle.js','utf8')+'\n'+resumo+html.slice(end);
  const actionStart=html.indexOf('    encerrar: (id, nota) => patch(id, s => log({');
  const actionEndMatch=actionStart<0?null:html.slice(actionStart).match(/\r?\n  };\r?\n  function criarComunicacao\(d\)/);
  const actionEnd=actionEndMatch?actionStart+actionEndMatch.index:-1;
  if(actionStart<0||actionEnd<0)throw Error('Expected AtlasApp lifecycle actions missing');
  const actions=`    encerrar: (id, nota, confirmarPendencias = false) => {
      if (ATOR.perfil !== "Aon") throw new Error("Somente a Aon pode concluir acompanhamentos.");
      const reason = String(nota || "").trim(), current = listaRef.current.find(s => s.id === id);
      if (!current || current.encerrado) return false;
      if (reason.length < 5) throw new Error("Informe uma observação de conclusão com pelo menos 5 caracteres.");
      if ((pendencias(current).total > 0 || !current.cobertura) && !confirmarPendencias) throw new Error("Confirme a conclusão com questões em aberto.");
      const actor = {...ATOR}, event = {id: uid("ACOMP"), tipo: "conclusao", ts: nowTs(), por: actor.nome, nota: reason};
      patch(id, s => s.encerrado ? s : caseLifecycleTransition(s, "conclusao", reason, actor, event));
      return true;
    },
    reabrir: (id, justificativa) => {
      if (ATOR.perfil !== "Aon") throw new Error("Somente a Aon pode reabrir acompanhamentos.");
      const reason = String(justificativa || "").trim(), current = listaRef.current.find(s => s.id === id);
      if (!current || !current.encerrado) return false;
      if (reason.length < 5) throw new Error("Justifique a reabertura com pelo menos 5 caracteres.");
      const actor = {...ATOR}, event = {id: uid("ACOMP"), tipo: "reabertura", ts: nowTs(), por: actor.nome, nota: reason};
      patch(id, s => !s.encerrado ? s : caseLifecycleTransition(s, "reabertura", reason, actor, event));
      return true;
    }`;
  return html.slice(0,actionStart)+actions+html.slice(actionEnd);
};
