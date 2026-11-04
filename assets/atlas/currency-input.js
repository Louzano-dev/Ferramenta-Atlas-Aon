/* Brazilian real amounts: typed digits represent reais, never implicit cents. */
function atlasCurrencyNormalize(raw, {final = false, paste = false} = {}) {
  let text = String(raw == null ? "" : raw);
  const invalid = "Digite um valor em reais, com até duas casas decimais.";
  if (paste) {
    text = text.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
    if (text.includes(",")) {
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{0,2}$/.test(text)) return {ok: false, error: invalid};
    } else if (text.includes(".")) {
      if (/^\d+\.\d{1,2}$/.test(text)) text = text.replace(".", ",");
      else if (!/^\d{1,3}(?:\.\d{3})+$/.test(text)) return {ok: false, error: invalid};
    }
  }
  if (!text) return {ok: true, value: ""};
  if (!/^[\d.]*(?:,\d{0,2})?$/.test(text) || !/\d/.test(text) && text !== ",") return {ok: false, error: invalid};
  const parts = text.split(",");
  let integer = parts[0].replace(/\./g, "").replace(/^0+(?=\d)/, "") || "0";
  const fraction = parts.length > 1 ? parts[1] : "";
  const cents = BigInt(integer + fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return {ok: false, error: "O valor excede o limite de precisão permitido. Confira os dígitos."};
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return {ok: true, value: integer + (final ? "," + fraction.padEnd(2, "0") : parts.length > 1 ? "," + fraction : "")};
}

function atlasCurrencyCaret(raw, position, formatted) {
  const plain = raw.replace(/\./g, "");
  let count = raw.slice(0, position).replace(/\./g, "").length;
  const leading = (plain.split(",")[0].match(/^0+(?=\d)/) || [""])[0].length;
  count -= Math.min(count, leading);
  if (plain.startsWith(",") && position > 0) count++;
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== "." && ++seen >= count) return i + 1;
  }
  return formatted.length;
}

function atlasCurrencyFromNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return String(value);
  return number.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true});
}

function AtlasCurrencyInput({value, onChange, disabled, label = 'Prejuízo estimado', placeholder = 'ex: 50.000,00'}) {
  const inputRef = useRef(null), pending = useRef(null), previousSelection = useRef({start: 0, end: 0});
  const eventHandler = useRef(null);
  const [error, setError] = useState("");
  const errorId = "atlas-currency-error-" + React.useId();
  const normalized = atlasCurrencyNormalize(value, {final: true});
  const display = normalized.ok ? normalized.value : String(value || "");
  function remember(node) {
    previousSelection.current = {start: node.selectionStart || 0, end: node.selectionEnd || 0};
  }
  function restoreSelection() {
    const node = inputRef.current, selection = pending.current;
    if (!node || !selection || document.activeElement !== node) return;
    node.setSelectionRange(Math.min(selection.start, node.value.length), Math.min(selection.end, node.value.length));
    previousSelection.current = selection;
    pending.current = null;
  }
  function scheduleSelection(start, end = start) {
    pending.current = {start, end};
    requestAnimationFrame(restoreSelection);
  }
  React.useLayoutEffect(restoreSelection, [value, display, error]);
  function reject(message) {
    setError(message);
    const node = inputRef.current;
    if (node) node.value = display;
    const previous = previousSelection.current;
    scheduleSelection(previous.start, previous.end);
  }
  function accept(raw, start, end = start) {
    const result = atlasCurrencyNormalize(raw, {final: true});
    if (!result.ok) {reject(result.error); return;}
    setError("");
    scheduleSelection(atlasCurrencyCaret(raw, start, result.value), atlasCurrencyCaret(raw, end, result.value));
    onChange(result.value);
  }
  function selectFraction() {
    const node = inputRef.current;
    if (!node || disabled) return;
    remember(node);
    const wholeSelected = node.selectionStart === 0 && node.selectionEnd === node.value.length;
    const next = !node.value || wholeSelected ? '0,00' : node.value;
    // The next keystroke can arrive before an animation frame, especially when
    // the formatted value is unchanged. Move to cents in this event itself.
    node.value = next;
    node.setSelectionRange(next.indexOf(',') + 1, next.indexOf(',') + 3);
    remember(node);
    setError('');onChange(next);
    scheduleSelection(next.indexOf(',') + 1, next.indexOf(',') + 3);
  }
  function insertDigits(text) {
    const node = inputRef.current;
    if (!node || disabled || !/^\d+$/.test(text)) return;
    const start = node.selectionStart || 0, end = node.selectionEnd || 0;
    remember(node);
    const comma = node.value.indexOf(',');
    if (comma < 0 || end <= comma) {
      const raw = node.value.slice(0, start) + text + node.value.slice(end);
      accept(raw, start + text.length);return;
    }
    if (start <= comma) {
      const integer = node.value.slice(0, start) + text;
      const fraction = node.value.slice(comma + 1).split('');
      for (let i = 0; i < Math.min(2, end - comma - 1); i++) fraction[i] = '0';
      accept(integer + ',' + fraction.join(''), integer.length);return;
    }
    const offset = start - comma - 1;
    if (offset + text.length > 2) {reject('Os centavos têm duas casas decimais. Selecione os dígitos que deseja alterar.');return;}
    const fraction = node.value.slice(comma + 1).padEnd(2, '0').split('');
    for (let i = offset; i < Math.min(2, end - comma - 1); i++) fraction[i] = '0';
    for (let i = 0; i < text.length; i++) fraction[offset + i] = text[i];
    accept(node.value.slice(0, comma + 1) + fraction.join(''), start + text.length);
  }
  function removeText(backward) {
    const node = inputRef.current;
    if (!node || disabled) return;
    const start = node.selectionStart || 0, end = node.selectionEnd || 0, comma = node.value.indexOf(',');
    remember(node);
    if (start !== end) {
      if (start === 0 && end === node.value.length) {accept('', 0);return;}
      if (comma >= start && comma < end) {
        const integer = node.value.slice(0, start);
        const fraction = node.value.slice(comma + 1).split('');
        for (let i = 0; i < Math.min(2, end - comma - 1); i++) fraction[i] = '0';
        const raw = !integer.replace(/\./g, '') && fraction.join('') === '00' ? '' : integer + ',' + fraction.join('');
        accept(raw, start);return;
      }
      if (comma >= 0 && start > comma) {
        const fraction = node.value.slice(comma + 1).split('');
        for (let i = start - comma - 1; i < Math.min(2, end - comma - 1); i++) fraction[i] = '0';
        accept(node.value.slice(0, comma + 1) + fraction.join(''), start);return;
      }
      const raw = node.value.slice(0, start) + node.value.slice(end);
      accept(raw === ',00' ? '' : raw, start);return;
    }
    if (!node.value || backward && start === 0 || !backward && start === node.value.length) return;
    if (backward && start === comma + 1) {node.setSelectionRange(comma,comma);scheduleSelection(comma);return;}
    if (!backward && start === comma) {node.setSelectionRange(comma+1,comma+1);scheduleSelection(comma + 1);return;}
    if (comma >= 0 && start > comma) {
      const index = backward ? start - 1 : start;
      if (index <= comma || index >= node.value.length) return;
      accept(node.value.slice(0,index) + '0' + node.value.slice(index+1), backward ? index : start);return;
    }
    let from = backward ? start - 1 : start, to = from + 1;
    if (node.value[from] === '.') {
      if (backward) from--;
      else to++;
    }
    const raw = node.value.slice(0, Math.max(0,from)) + node.value.slice(to);
    accept(raw === ',00' ? '' : raw, Math.max(0,from));
  }
  function insertPaste(text) {
    const node=inputRef.current;
    if(!node || disabled)return;
    const result=atlasCurrencyNormalize(text,{paste:true,final:true});
    if(!result.ok){remember(node);reject(result.error);return;}
    const start=node.selectionStart||0,end=node.selectionEnd||0;
    remember(node);
    if(start===0&&end===node.value.length || !node.value){
      setError('');onChange(result.value);
      const original=atlasCurrencyNormalize(text,{paste:true});
      scheduleSelection(original.ok&&original.value.includes(',')?result.value.length:Math.max(0,result.value.indexOf(',')));
      return;
    }
    if(/^\d+$/.test(text.trim())){insertDigits(text.trim());return;}
    reject('Selecione o valor inteiro para colar um novo valor monetário.');
  }
  eventHandler.current = {selectFraction, insertDigits, removeText, accept};
  useEffect(() => {
    const node = inputRef.current;
    function beforeInput(event) {
      remember(node);
      if (event.inputType && event.inputType.startsWith('insert') && event.cancelable && event.data && /^[\d.,]+$/.test(event.data)) {
        event.preventDefault();
        if(event.data==='.'||event.data===',')eventHandler.current.selectFraction();
        else if(/^\d+$/.test(event.data))eventHandler.current.insertDigits(event.data);
        else eventHandler.current.accept(event.data,event.data.length);
      } else if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
        if(event.cancelable){event.preventDefault();eventHandler.current.removeText(event.inputType === "deleteContentBackward");}
      }
    }
    node.addEventListener("beforeinput", beforeInput);
    return () => node.removeEventListener("beforeinput", beforeInput);
  }, []);
  return rce("div", {style: {minWidth: 0, width: "100%"}},
    rce("input", {
      ref: inputRef, type: "text", value: display, disabled,
      inputMode: "decimal", placeholder, className: "input",
      style: {fontSize: 16, minHeight: 44}, "aria-label": label,
      "aria-invalid": !!error, "aria-describedby": error ? errorId : undefined,
      onSelect: e => remember(e.currentTarget),
      onChange: e => accept(e.currentTarget.value, e.currentTarget.selectionStart || 0, e.currentTarget.selectionEnd || 0),
      onKeyDown: e => {
        const node = e.currentTarget;
        remember(node);
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "." || e.key === "Decimal" || e.key === ",") {e.preventDefault(); selectFraction(); return;}
        if (/^\d$/.test(e.key)) {e.preventDefault();insertDigits(e.key);return;}
        if (e.key === "Backspace" || e.key === "Delete") {e.preventDefault();removeText(e.key === "Backspace");}
      },
      onPaste: e => {
        e.preventDefault();
        insertPaste(e.clipboardData.getData("text"));
      },
      onBlur: () => {
        const result = atlasCurrencyNormalize(display, {final: true});
        if (result.ok) {setError(""); onChange(result.value);}
        else setError(result.error);
      }
    }),
    error && rce("p", {id: errorId, role: "alert", style: {margin: "6px 0 0", fontSize: 13, lineHeight: 1.4, color: "#b42318"}}, error));
}
