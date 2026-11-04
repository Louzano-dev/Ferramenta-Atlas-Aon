/* Compact views over the case records; no event or case is copied into storage. */
function caseTableDay(value){
  if(!value)return '';
  const text=String(value);
  if(text.length<=10)return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:'';
  const date=new Date(text);if(Number.isNaN(date.getTime()))return '';
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function caseTableTime(value){const n=new Date(value||0).getTime();return Number.isNaN(n)?0:n;}
function caseTableInPeriod(value,start,end){const day=caseTableDay(value);return (!start||!!day&&day>=start)&&(!end||!!day&&day<=end);}
function caseTableFold(value){return norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function caseWasReopened(s){
  return (s.acompanhamentoMovimentos||[]).some(m=>m.tipo==='reabertura')||(s.historico||[]).some(h=>h.tipo==='reabertura'||/acompanhamento reaberto/.test(caseTableFold(h.texto)));
}
function caseCurrentFollowup(s){return s.encerrado?'Concluído':caseWasReopened(s)?'Reaberto (ativo)':'Ativo';}
function caseHistoryCategory(h){
  if(h.tipo==='conclusao')return 'Conclusão';
  if(h.tipo==='reabertura')return 'Reabertura';
  const t=caseTableFold(h.texto);
  if(/acompanhamento.*(?:concluido|encerrado)|(?:concluido|encerrado).*acompanhamento/.test(t))return 'Conclusão';
  if(/acompanhamento reaberto|reabertura.*acompanhamento/.test(t))return 'Reabertura';
  if(/comunicacao registrada|incidente registrado|novo incidente/.test(t))return 'Registro de incidente';
  if(/indenizacao|pagamento/.test(t))return 'Indenização';
  if(/cobertura/.test(t))return 'Cobertura';
  if(/protocolo|abertura formal/.test(t))return 'Abertura e protocolo';
  if(/encaminhamento|recebimento confirmado pela seguradora|mensagem de envio/.test(t))return 'Encaminhamento';
  if(/pendencia|solicitacao|substituicao/.test(t))return 'Pendências';
  if(/documento|arquivo|anexo|validacao/.test(t))return 'Documentos';
  if(/mensagem|conversa|retorno da seguradora|comunicacao/.test(t))return 'Comunicação';
  if(/status|andamento|caso em organizacao/.test(t))return 'Status e andamento';
  if(/responsavel/.test(t))return 'Responsável';
  if(/triagem|prioridade|severidade/.test(t))return 'Triagem';
  if(/\b(?:tarefas?|acao|acoes|plano)\b/.test(t))return 'Plano de acompanhamento';
  return 'Atualização do caso';
}
function CaseTableField({label,children}){return rce('label',{className:'cth-field'},rce('span',null,label),children);}
function CaseTablePager({page,pages,total,size,onPage,onSize}){
  const first=total?(page-1)*size+1:0,last=Math.min(page*size,total);
  return rce('div',{className:'cth-pager'},rce('p',{role:'status','aria-live':'polite'},first,'–',last,' de ',total,' registro(s)'),
    rce('label',{className:'cth-size'},'Por página',rce('select',{className:'input',value:size,onChange:e=>onSize(Number(e.target.value)),'aria-label':'Registros por página'},[20,50,100].map(n=>rce('option',{key:n,value:n},n)))),
    rce('nav',{'aria-label':'Paginação',className:'cth-pager-controls'},rce('button',{type:'button',className:BTN_SECONDARY,disabled:page<=1,onClick:()=>onPage(page-1),'aria-label':'Página anterior'},'Anterior'),rce('span',null,'Página ',page,' de ',pages),rce('button',{type:'button',className:BTN_SECONDARY,disabled:page>=pages,onClick:()=>onPage(page+1),'aria-label':'Próxima página'},'Próxima')));
}
function caseRecordedLabel(name){
  const labels={motivo:'Motivo',nota:'Observação',justificativa:'Justificativa',estadoAnterior:'Situação anterior',estadoAtual:'Situação após a movimentação',conclusaoAnterior:'Conclusão anterior',ts:'Data e horário',por:'Responsável',perfil:'Perfil',tipo:'Tipo',id:'Identificador',movimentoId:'Identificador da movimentação',antes:'Antes',depois:'Depois',data:'Data',criadoEm:'Registrado em',atualizadoEm:'Atualizado em'};
  if(labels[name])return labels[name];
  const words=String(name||'Informação').replace(/([a-zà-ú])([A-ZÀ-Ú])/g,'$1 $2').replace(/[_-]+/g,' ');
  return words.charAt(0).toUpperCase()+words.slice(1);
}
function CaseRecordedValue({value,name=''}){
  if(value===null||value===undefined||value==='')return rce('span',{className:'cth-note'},'Não registrado');
  if(Array.isArray(value))return value.length?rce('ul',{className:'cth-recorded-list'},value.map((item,i)=>rce('li',{key:i},rce(CaseRecordedValue,{value:item,name})))):rce('span',{className:'cth-note'},'Nenhum item registrado');
  if(typeof value==='object'){
    const fields=Object.entries(value);
    return fields.length?rce('dl',{className:'cth-recorded-details'},fields.map(([key,item])=>rce('div',{key},rce('dt',null,caseRecordedLabel(key)),rce('dd',null,rce(CaseRecordedValue,{value:item,name:key}))))):rce('span',{className:'cth-note'},'Nenhum dado adicional registrado');
  }
  if(typeof value==='boolean')return rce('span',null,value?'Sim':'Não');
  let text=String(value);
  if(name==='estadoAnterior'||name==='estadoAtual')text={ativo:'Ativo',concluido:'Concluído',reaberto:'Reaberto'}[text]||text;
  if(/^(?:ts|data|criadoEm|atualizadoEm|concluidoEm|encerradoEm|reabertoEm)$/.test(name)&&/^\d{4}-\d{2}-\d{2}/.test(text)&&!Number.isNaN(new Date(text).getTime()))text=fmtTs(text);
  return rce('span',{className:'cth-recorded-text'},text);
}
function CaseHistoryDialog({event,onClose,onOpen}){
  const ref=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const old=document.activeElement,previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const root=ref.current;root.querySelector('button')?.focus();
    function keys(e){
      if(e.key==='Escape'){e.preventDefault();close.current();return;}
      if(e.key!=='Tab')return;
      const items=[...root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
      if(!items.length){e.preventDefault();return;}
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',keys);
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keys);if(old?.isConnected)old.focus();};
  },[]);
  const h=event.h,s=event.s;
  return rce('div',{className:'cth-modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)onClose();}},
    rce('section',{className:'cth-modal',role:'dialog','aria-modal':'true','aria-labelledby':'cth-event-title',ref},
      rce('header',{className:'cth-modal-header'},rce('div',null,rce('h2',{id:'cth-event-title'},'Detalhes da movimentação'),rce('p',{className:'cth-note'},s.id,' · ',s.segurado)),rce('button',{type:'button',className:BTN_SECONDARY,onClick:onClose,'aria-label':'Fechar movimentação'},'Fechar')),
      rce('dl',{className:'cth-meta'},rce('div',null,rce('dt',null,'Data e horário'),rce('dd',null,fmtTs(h.ts))),rce('div',null,rce('dt',null,'Responsável'),rce('dd',null,h.por||'Não informado',h.perfil?' · '+h.perfil:'')),rce('div',null,rce('dt',null,'Tipo de movimentação'),rce('dd',null,event.category)),rce('div',null,rce('dt',null,'Visibilidade registrada'),rce('dd',null,h.interno?'Interna da Aon':'Compartilhada com o cliente')),rce('div',null,rce('dt',null,'Situação atual do acompanhamento'),rce('dd',null,caseCurrentFollowup(s)))),
      rce('h3',null,'Descrição registrada'),rce('p',{className:'cth-event-text'},h.texto||'Sem descrição no registro.'),
      h.detalhes?rce(React.Fragment,null,rce('h3',null,'Dados registrados nesta movimentação'),rce('div',{className:'cth-recorded-data'},rce(CaseRecordedValue,{value:h.detalhes}))):rce('p',{className:'cth-note'},'Os detalhes disponíveis desta movimentação estão na descrição acima.'),
      rce('p',{className:'cth-note'},'A situação exibida é a atual do acompanhamento.'),
      rce('footer',{className:'cth-modal-actions'},rce('button',{type:'button',className:BTN_PRIMARY,onClick:()=>onOpen(s.id)},'Abrir caso ',s.id),rce('button',{type:'button',className:BTN_SECONDARY,onClick:onClose},'Voltar ao histórico'))));
}
function AonCompleted({sinistros,onOpen}){
  const [filters,setFilters]=useState({q:'',start:'',end:'',type:''}),[page,setPage]=useState(1),[size,setSize]=useState(20);
  const set=(name,value)=>{setFilters(f=>({...f,[name]:value}));setPage(1);};
  const closed=sinistros.filter(s=>!!s.encerrado),query=caseTableFold(filters.q),invalidPeriod=!!filters.start&&!!filters.end&&filters.start>filters.end;
  const items=closed.filter(s=>(!query||caseTableFold(s.id+' '+s.segurado).includes(query))&&(!filters.type||s.tipo===filters.type)&&caseTableInPeriod(s.encerrado.ts,filters.start,filters.end)).sort((a,b)=>caseTableTime(b.encerrado.ts)-caseTableTime(a.encerrado.ts)||String(a.id).localeCompare(String(b.id)));
  const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.min(page,pages),rows=items.slice((current-1)*size,current*size);
  useEffect(()=>{if(page>pages)setPage(pages);},[page,pages]);
  return rce('section',{className:'cth-view','data-view':'concluidos'},
    rce('header',{className:'cth-view-heading'},rce('h1',{className:'text-xl font-semibold text-gray-900'},'Casos concluídos'),rce('p',{className:'cth-note'},'Acompanhamentos concluídos pela Aon. A conclusão não implica aprovação de cobertura ou pagamento pela seguradora.')),
    rce('div',{className:'cth-filters'},rce(CaseTableField,{label:'Buscar caso ou empresa'},rce('input',{className:'input',value:filters.q,onChange:e=>set('q',e.target.value),placeholder:'Identificador ou empresa','aria-label':'Buscar casos concluídos'})),rce(CaseTableField,{label:'Conclusão a partir de'},rce('input',{type:'date',className:'input',value:filters.start,max:filters.end||undefined,onChange:e=>set('start',e.target.value),'aria-label':'Conclusão a partir de'})),rce(CaseTableField,{label:'Conclusão até'},rce('input',{type:'date',className:'input',value:filters.end,min:filters.start||undefined,onChange:e=>set('end',e.target.value),'aria-label':'Conclusão até'})),rce(CaseTableField,{label:'Tipo de incidente'},rce('select',{className:'input',value:filters.type,onChange:e=>set('type',e.target.value),'aria-label':'Tipo de incidente concluído'},rce('option',{value:''},'Todos os tipos'),TIPOS_INCIDENTE.map(type=>rce('option',{key:type,value:type},type)))),rce('button',{type:'button',className:BTN_SECONDARY,onClick:()=>{setFilters({q:'',start:'',end:'',type:''});setPage(1);}},'Limpar filtros')),
    invalidPeriod&&rce('p',{className:'cth-error',role:'alert'},'A data inicial não pode ser posterior à data final.'),
    rce('p',{className:'cth-note',role:'status'},items.length,' de ',closed.length,' acompanhamento(s) concluído(s). O período considera a data de conclusão.'),
    rce('div',{className:'cth-table-scroll',role:'region','aria-label':'Tabela de casos concluídos',tabIndex:0},rce('table',{className:'cth-table cth-completed'},
      rce('thead',null,rce('tr',null,['Caso','Empresa segurada','Incidente Cyber','Abertura / registro','Conclusão','Responsável pelo encerramento','Situação final','Ação'].map(title=>rce('th',{key:title,scope:'col'},title)))),
      rce('tbody',null,rows.length?rows.map(s=>rce('tr',{key:s.id,'data-concluido':s.id},rce('td',null,rce('button',{type:'button',className:BTN_LINK,onClick:()=>onOpen(s.id)},s.id)),rce('td',null,s.segurado),rce('td',null,s.tipo),rce('td',null,formatDate(caseTableDay(s.encaminhamento?.dataAbertura||s.dataComunicacao||s.criadoEm)),rce('small',null,s.encaminhamento?.dataAbertura?'Formal, pela seguradora':'Registro no Atlas')),rce('td',null,fmtTs(s.encerrado.ts)),rce('td',null,s.encerrado.por||'Não informado'),rce('td',null,rce('span',{className:'cth-state-complete'},'Acompanhamento concluído')),rce('td',null,rce('button',{type:'button',className:BTN_SECONDARY,onClick:()=>onOpen(s.id),'aria-label':'Ver detalhes de '+s.id},'Ver detalhes')))):rce('tr',null,rce('td',{colSpan:8,className:'cth-empty'},'Nenhum caso concluído corresponde aos filtros.'))))),
    rce(CaseTablePager,{page:current,pages,total:items.length,size,onPage:setPage,onSize:n=>{setSize(n);setPage(1);}}));
}
function AonHistorico({sinistros,onOpen}){
  const [filters,setFilters]=useState({q:'',start:'',end:'',type:'',person:'',status:''}),[page,setPage]=useState(1),[size,setSize]=useState(20),[selected,setSelected]=useState(null);
  const set=(name,value)=>{setFilters(f=>({...f,[name]:value}));setPage(1);};
  const all=sinistros.flatMap((s,si)=>(s.historico||[]).map((h,hi)=>({s,h,category:caseHistoryCategory(h),key:s.id+':'+hi,si,hi}))).sort((a,b)=>caseTableTime(b.h.ts)-caseTableTime(a.h.ts)||a.si-b.si||b.hi-a.hi);
  const categories=[...new Set(all.map(e=>e.category))].sort((a,b)=>a.localeCompare(b,'pt-BR')),people=[...new Set(all.map(e=>e.h.por||''))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const query=caseTableFold(filters.q),invalidPeriod=!!filters.start&&!!filters.end&&filters.start>filters.end;
  const items=all.filter(e=>(!query||caseTableFold(e.s.id+' '+e.s.segurado+' '+(e.h.texto||'')).includes(query))&&caseTableInPeriod(e.h.ts,filters.start,filters.end)&&(!filters.type||e.category===filters.type)&&(!filters.person||(e.h.por||'__nao_informado__')===filters.person)&&(!filters.status||(filters.status==='concluido'?!!e.s.encerrado:filters.status==='ativo'?!e.s.encerrado:!e.s.encerrado&&caseWasReopened(e.s))));
  const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.min(page,pages),rows=items.slice((current-1)*size,current*size);
  useEffect(()=>{if(page>pages)setPage(pages);},[page,pages]);
  return rce('section',{className:'cth-view','data-view':'historico'},
    rce('header',{className:'cth-view-heading'},rce('h1',{className:'text-xl font-semibold text-gray-900'},'Histórico geral'),rce('p',{className:'cth-note'},'Movimentações efetivamente registradas de todos os casos, inclusive concluídos. Itens internos da Aon permanecem restritos a este ambiente.')),
    rce('div',{className:'cth-filters cth-history-filters'},rce(CaseTableField,{label:'Buscar caso ou empresa'},rce('input',{className:'input',value:filters.q,onChange:e=>set('q',e.target.value),placeholder:'Identificador ou empresa','aria-label':'Filtrar histórico'})),rce(CaseTableField,{label:'Movimentação a partir de'},rce('input',{type:'date',className:'input',value:filters.start,max:filters.end||undefined,onChange:e=>set('start',e.target.value),'aria-label':'Histórico a partir de'})),rce(CaseTableField,{label:'Movimentação até'},rce('input',{type:'date',className:'input',value:filters.end,min:filters.start||undefined,onChange:e=>set('end',e.target.value),'aria-label':'Histórico até'})),rce(CaseTableField,{label:'Tipo de movimentação'},rce('select',{className:'input',value:filters.type,onChange:e=>set('type',e.target.value),'aria-label':'Tipo de movimentação'},rce('option',{value:''},'Todas as movimentações'),categories.map(type=>rce('option',{key:type,value:type},type)))),rce(CaseTableField,{label:'Responsável'},rce('select',{className:'input',value:filters.person,onChange:e=>set('person',e.target.value),'aria-label':'Responsável pela movimentação'},rce('option',{value:''},'Todos os responsáveis'),people.map(person=>rce('option',{key:person||'unknown',value:person||'__nao_informado__'},person||'Não informado')))),rce(CaseTableField,{label:'Situação atual do caso'},rce('select',{className:'input',value:filters.status,onChange:e=>set('status',e.target.value),'aria-label':'Situação atual do caso'},rce('option',{value:''},'Todos os casos'),rce('option',{value:'ativo'},'Ativos (inclui reabertos)'),rce('option',{value:'concluido'},'Concluídos'),rce('option',{value:'reaberto'},'Reabertos (ativos)'))),rce('button',{type:'button',className:BTN_SECONDARY,onClick:()=>{setFilters({q:'',start:'',end:'',type:'',person:'',status:''});setPage(1);}},'Limpar filtros')),
    invalidPeriod&&rce('p',{className:'cth-error',role:'alert'},'A data inicial não pode ser posterior à data final.'),
    rce('p',{className:'cth-note',role:'status'},items.length,' de ',all.length,' movimentação(ões). Todos os registros armazenados podem ser consultados pela paginação.'),
    rce('div',{className:'cth-table-scroll',role:'region','aria-label':'Tabela do histórico geral',tabIndex:0},rce('table',{className:'cth-table cth-history'},
      rce('thead',null,rce('tr',null,['Data e horário','Caso','Empresa','Movimentação','Responsável','Ação'].map(title=>rce('th',{key:title,scope:'col'},title)))),
      rce('tbody',null,rows.length?rows.map(e=>rce('tr',{key:e.key,'data-history-case':e.s.id},rce('td',null,fmtTs(e.h.ts)),rce('td',null,rce('button',{type:'button',className:BTN_LINK,onClick:()=>onOpen(e.s.id)},e.s.id)),rce('td',null,e.s.segurado),rce('td',null,rce('strong',null,e.category),rce('span',{className:'cth-summary',title:e.h.texto},e.h.texto||'Sem descrição'),e.h.interno&&rce('small',{className:'cth-internal'},'Interno da Aon')),rce('td',null,e.h.por||'Não informado',e.h.perfil&&rce('small',null,e.h.perfil)),rce('td',null,rce('button',{type:'button',className:BTN_SECONDARY,onClick:()=>setSelected(e),'aria-label':'Ver movimentação de '+e.s.id+' em '+fmtTs(e.h.ts)},'Ver movimentação')))):rce('tr',null,rce('td',{colSpan:6,className:'cth-empty'},'Nenhuma movimentação corresponde aos filtros.'))))),
    rce(CaseTablePager,{page:current,pages,total:items.length,size,onPage:setPage,onSize:n=>{setSize(n);setPage(1);}}),
    selected&&rce(CaseHistoryDialog,{event:selected,onClose:()=>setSelected(null),onOpen:id=>{setSelected(null);onOpen(id);}}));
}
