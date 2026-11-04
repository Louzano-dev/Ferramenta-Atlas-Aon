/* Offline A4 report. Original evidence bytes stay intact inside the PDF. */
async function gerarRelatorioPdf(s, todos, nomeAon, onProgress, apolices = []) {
  if (!window.PDFLib || !window.fontkit || !window.ATLAS_PDF_ASSETS) throw new Error("Os recursos do relatório PDF não estão disponíveis neste arquivo Atlas.");
  const {PDFDocument, PDFName, rgb, degrees} = window.PDFLib;
  const snapshot = JSON.parse(JSON.stringify(s));
  const all = JSON.parse(JSON.stringify(todos || []));
  const policies = JSON.parse(JSON.stringify(apolices || []));
  const generatedAt = new Date().toISOString();
  const model = buildCaseReportModel(snapshot, all, nomeAon, generatedAt, policies);
  const issues = [], unsupported = new Set(), usedNames = new Set();
  const progress = text => {if (typeof onProgress === "function") try {onProgress(text);} catch (_) {}};
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  const issue = text => {if (!issues.includes(text)) issues.push(text);};
  const decode = value => {
    const raw = atob(String(value || "").split(",").pop()), bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  };
  const validDate = value => {const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : undefined;};
  const dateText = value => {
    const date = validDate(value);
    return date ? date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"}) : "Não registrado";
  };
  const plain = value => {
    if (value == null || value === "") return "Não registrado";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (Array.isArray(value)) return value.length ? value.map(plain).join("\n") : "Nenhum registro";
    if (typeof value === "object") return Object.entries(value).map(([key, item]) => key + ": " + plain(item)).join("\n");
    return String(value);
  };
  const uniqueName = original => {
    const base = String(original || "arquivo").replace(/[\\/]/g, "-").replace(/[\u0000-\u001f\u007f]/g, "").trim() || "arquivo";
    let result = base, number = 2;
    const dot = base.lastIndexOf("."), stem = dot > 0 ? base.slice(0, dot) : base, extension = dot > 0 ? base.slice(dot) : "";
    while (usedNames.has(result.toLocaleLowerCase("pt-BR"))) result = stem + " (" + number++ + ")" + extension;
    usedNames.add(result.toLocaleLowerCase("pt-BR"));
    return result;
  };
  progress("Preparando o relatório e as fontes…");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(window.fontkit);
  const regular = await pdf.embedFont(decode(window.ATLAS_PDF_ASSETS.fontRegular), {subset: true});
  const bold = await pdf.embedFont(decode(window.ATLAS_PDF_ASSETS.fontBold), {subset: true});
  const glyphs = new Map([[regular, new Set(regular.getCharacterSet())], [bold, new Set(bold.getCharacterSet())]]);
  function printable(value, font = regular) {
    const source = String(value == null ? "" : value).normalize("NFC").replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n").replace(/\t/g, "    ");
    const available = glyphs.get(font), square = available.has(0x25a1) ? "□" : "?";
    let result = "";
    for (const char of source) {
      const code = char.codePointAt(0);
      if (char === "\n") result += char;
      else if (code < 32 || code === 127) result += " ";
      else if (available.has(code)) result += char;
      else {unsupported.add("U+" + code.toString(16).toUpperCase()); result += square;}
    }
    return result;
  }
  const measure = (text, font, size) => font.widthOfTextAtSize(printable(text, font), size);
  function wrap(value, font, size, width) {
    const text = printable(value, font), lines = [];
    for (const paragraph of text.split("\n")) {
      if (!paragraph.trim()) {lines.push(""); continue;}
      let line = "";
      for (const word of paragraph.trim().split(/[ \t]+/)) {
        const candidate = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {line = candidate; continue;}
        if (line) {lines.push(line); line = "";}
        if (font.widthOfTextAtSize(word, size) <= width) {line = word; continue;}
        let part = "";
        for (const char of word) {
          if (part && font.widthOfTextAtSize(part + char, size) > width) {lines.push(part); part = "";}
          part += char;
        }
        line = part;
      }
      if (line) lines.push(line);
    }
    return lines.length ? lines : [""];
  }
  // Preflight every visible string so missing glyphs never silently discard the original text.
  for (const value of [model.id, model.title, model.company, model.status, model.generatedBy]) {printable(value); printable(value, bold);}
  for (const section of model.sections || []) {
    printable(section.title, bold);
    for (const block of section.blocks || []) {printable(block.label, bold); printable(plain(block.text)); if (block.rows) printable(plain(block.rows));}
  }
  for (const meta of model.attachments || []) {printable(meta.nome); printable(meta.tipoDocumento);}
  const evidence = [], seenEvidence = new Map();
  let embeddedOriginals = 0;
  for (let i = 0; i < (model.attachments || []).length; i++) {
    const meta = model.attachments[i];
    progress("Reunindo arquivo " + (i + 1) + " de " + model.attachments.length + "…");
    const item = {meta, name: meta.nome || "Arquivo sem nome", embeddedName: "", embedded: false, preview: [], state: "", bytes: null};
    evidence.push(item);
    const cacheKey = meta.id ? String(meta.id) : "";
    if (cacheKey && seenEvidence.has(cacheKey)) {
      const previous = seenEvidence.get(cacheKey);
      item.embedded = previous.embedded; item.embeddedName = previous.embeddedName; item.state = previous.state;
      item.duplicateOf = previous.name;
      continue;
    }
    if (cacheKey) seenEvidence.set(cacheKey, item);
    let blob;
    try {blob = meta.id ? await arquivoGet(meta.id) : null;} catch (_) {blob = null;}
    if (!blob) {
      item.state = "Arquivo não disponível neste navegador; somente os metadados registrados constam do relatório.";
      issue("Arquivo não disponível neste navegador: " + item.name + ".");
      await pause(); continue;
    }
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      item.bytes = bytes;
      const isPdf = bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
      const isPng = bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const isJpg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const mime = isPdf ? "application/pdf" : isPng ? "image/png" : isJpg ? "image/jpeg" : blob.type || meta.formato || "application/octet-stream";
      item.embeddedName = uniqueName(item.name);
      await pdf.attach(bytes, item.embeddedName, {mimeType: mime, description: [meta.tipoDocumento || "Documento do caso", meta.estado, meta.substituido ? "Versão substituída, preservada para histórico" : ""].filter(Boolean).join(" · "), creationDate: validDate(meta.anexadoEm)});
      item.embedded = true; embeddedOriginals++;
      item.state = "Original incorporado ao PDF.";
      try {
        if (isPdf || /\.pdf$/i.test(item.name) || mime === "application/pdf") {
          const source = await PDFDocument.load(bytes, {updateMetadata: false});
          const pages = source.getPages();
          // Validate and flatten visual content in isolation. Broken page streams
          // must not leave a deferred embedder that can fail the complete report.
          const previewDocument = await PDFDocument.create();
          const visualPages = await previewDocument.embedPdf(source, source.getPageIndices());
          for (const visual of visualPages) {
            if (!(visual.width > 0 && visual.height > 0 && Number.isFinite(visual.width) && Number.isFinite(visual.height))) throw new Error("Dimensões inválidas");
            previewDocument.addPage([visual.width, visual.height]).drawPage(visual, {x: 0, y: 0});
          }
          const previewBytes = await previewDocument.save({useObjectStreams: true, addDefaultPage: false});
          const embedded = await pdf.embedPdf(previewBytes, visualPages.map((_, index) => index));
          item.preview = embedded.map((page, index) => ({kind: "pdf", resource: page, width: page.width, height: page.height, rotation: pages[index].getRotation().angle || 0}));
          if (!item.preview.length) throw new Error("PDF sem páginas");
          item.state += " Prévia das " + item.preview.length + " página(s) ao final.";
        } else if (isPng || isJpg) {
          const image = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
          if (!(image.width > 0 && image.height > 0 && Number.isFinite(image.width) && Number.isFinite(image.height))) throw new Error("Dimensões inválidas");
          item.preview = [{kind: "image", resource: image, width: image.width, height: image.height, rotation: 0}];
          item.state += " Prévia da imagem ao final.";
        } else item.state += " Este formato é mantido como anexo original, sem conversão para páginas.";
      } catch (_) {
        item.preview = [];
        item.state += " Não foi possível criar a prévia; o arquivo original permanece incorporado.";
        issue("Prévia indisponível para " + item.name + "; o original foi incorporado.");
      }
    } catch (_) {
      item.bytes = null; item.embedded = false;
      item.state = "Não foi possível ler ou incorporar o arquivo; os metadados registrados foram preservados.";
      issue("Não foi possível incorporar o arquivo " + item.name + ".");
    }
    await pause();
  }
  let originalTextName = "";
  if (unsupported.size) {
    originalTextName = uniqueName("texto-original-do-relatorio.txt");
    const source = [model.title, "Caso: " + model.id, "Empresa: " + model.company, "Situação: " + model.status, "Emitido em: " + dateText(generatedAt), "Responsável: " + model.generatedBy,
      ...(model.sections || []).flatMap(section => ["\n" + section.title, ...(section.blocks || []).flatMap(block => [block.label || "", plain(block.text), ...(block.rows ? [plain(block.rows)] : [])])])].join("\n");
    await pdf.attach(new TextEncoder().encode(source), originalTextName, {mimeType: "text/plain; charset=utf-8", description: "Texto integral do relatório em UTF-8, com os caracteres originais."});
    issue("Alguns caracteres não possuem glifo na fonte e aparecem como quadrado. O texto original integral está no anexo " + originalTextName + ".");
  }
  pdf.setTitle("Relatório do sinistro " + model.id);
  pdf.setAuthor(model.generatedBy || nomeAon || "Aon");
  pdf.setSubject("Relatório completo do acompanhamento registrado no Atlas em " + dateText(generatedAt));
  pdf.setCreator("Atlas · Aon");pdf.setProducer("Atlas · relatório PDF offline");pdf.setLanguage("pt-BR");
  pdf.setCreationDate(new Date(generatedAt));pdf.setModificationDate(new Date(generatedAt));
  pdf.setKeywords(["Atlas", "Aon", "Sinistro Cyber", "Relatório completo", String(model.id || "")]);
  const W = 595.28, H = 841.89, M = 44, CW = W - M * 2, TOP = H - 98, BOTTOM = 62;
  const ink = rgb(16/255,33/255,58/255), body = rgb(51/255,66/255,86/255), muted = rgb(88/255,104/255,124/255), red = rgb(235/255,0,23/255), line = rgb(.82,.86,.91), tint = rgb(.95,.97,.985), white = rgb(1,1,1);
  function drawText(page, value, x, y, size = 10, font = regular, color = body) {page.drawText(printable(value, font), {x, y, size, font, color});}
  function brand(page) {
    page.drawSvgPath("M65 3 121 103H96L65 47 34 103H9Z", {x: M, y: H - 30, scale: .28, color: ink});
    page.drawSvgPath("M6 100C-1 88 27 63 59 51C75 45 92 41 110 39L111 46C90 48 68 55 47 66C24 78 9 90 6 100Z", {x: M, y: H - 30, scale: .28, color: red});
    page.drawCircle({x: M + 120*.28, y: H - 30 - 40*.28, size: 6.5*.28, color: red});
    drawText(page, "A T L A S", M + 43, H - 52, 15, bold, ink);
    page.drawLine({start: {x: M + 148, y: H - 33}, end: {x: M + 148, y: H - 58}, thickness: .7, color: line});
    drawText(page, "Aon", M + 161, H - 52, 19, bold, red);
    const caption = "RELATÓRIO DO SINISTRO";
    drawText(page, caption, W - M - measure(caption, regular, 8), H - 44, 8, regular, muted);
    const id = printable(model.id || "", bold);
    const idSize = Math.min(9, 180 / Math.max(1, measure(id, bold, 1)));
    drawText(page, id, W - M - measure(id, bold, idSize), H - 59, idSize, bold, ink);
    page.drawLine({start: {x: M, y: H - 73}, end: {x: W - M, y: H - 73}, thickness: .7, color: line});
  }
  const writer = {
    page: null, y: TOP,
    newPage() {this.page = pdf.addPage([W,H]);this.page.drawRectangle({x:0,y:0,width:W,height:H,color:white});brand(this.page);this.y = TOP;return this.page;},
    ensure(height) {if (!this.page || this.y - height < BOTTOM) this.newPage();},
    lines(lines, {x = M, size = 10, font = regular, color = body, lineHeight = 14, after = 0} = {}) {
      for (const text of lines) {this.ensure(lineHeight);if (text) drawText(this.page,text,x,this.y-size,size,font,color);this.y -= lineHeight;}
      this.y -= after;
    },
    paragraph(text, options = {}) {const font=options.font||regular,size=options.size||10,width=options.width||CW;this.lines(wrap(text,font,size,width),options);},
    heading(title) {
      const lines=wrap(title,bold,13,CW-12);this.ensure(lines.length*17+32);this.y-=14;
      this.page.drawRectangle({x:M,y:this.y-2,width:35,height:3,color:red});this.y-=14;
      const page=pdf.getPageCount();this.lines(lines,{font:bold,size:13,color:ink,lineHeight:17,after:10});return page;
    },
    block(block) {
      if (block.rows) for (const row of block.rows) this.block(Array.isArray(row)?{label:row[0],text:plain(row[1])}:row);
      if (block.text === undefined && !block.label) return;
      const label=plain(block.label||""),text=plain(block.text);
      if (block.label && label.length<42 && !text.includes("\n") && text.length<160) {
        const labels=wrap(label,bold,9,140),values=wrap(text,regular,10,CW-158),height=Math.max(labels.length*13,values.length*14)+10;
        if(height<TOP-BOTTOM){
          this.ensure(height);const top=this.y;
          this.page.drawLine({start:{x:M,y:top-height+4},end:{x:W-M,y:top-height+4},thickness:.4,color:line});
          labels.forEach((value,i)=>drawText(this.page,value,M,top-10-i*13,9,bold,muted));
          values.forEach((value,i)=>drawText(this.page,value,M+158,top-10-i*14,10,regular,body));
          this.y-=height;return;
        }
      }
      if(block.label){this.ensure(40);this.paragraph(label,{font:bold,size:9.5,color:ink,lineHeight:13,after:4});}
      this.paragraph(text,{size:10,lineHeight:14,after:10});
    }
  };
  progress("Montando o relatório completo…");
  writer.newPage();writer.y=H-125;
  writer.paragraph("RELATÓRIO COMPLETO",{font:bold,size:10,color:red,lineHeight:15,after:10});
  writer.paragraph("Acompanhamento\ndo sinistro Cyber",{font:bold,size:29,color:ink,lineHeight:37,after:20});
  writer.paragraph(model.company,{font:bold,size:18,color:ink,lineHeight:25,after:18});
  writer.block({label:"Identificador do Atlas",text:model.id});
  writer.block({label:"Data e horário da emissão",text:dateText(generatedAt)});
  writer.block({label:"Emitido pela Aon por",text:model.generatedBy||nomeAon||"Não registrado"});
  const statusLines=wrap(model.status||"Situação não registrada",bold,13,CW-32);
  const boxHeight=74+Math.max(0,statusLines.length-1)*18;writer.ensure(boxHeight+20);writer.y-=14;
  writer.page.drawRectangle({x:M,y:writer.y-boxHeight,width:CW,height:boxHeight,color:tint});
  writer.page.drawRectangle({x:M,y:writer.y-boxHeight,width:3,height:boxHeight,color:red});
  drawText(writer.page,"SITUAÇÃO NO MOMENTO DA EMISSÃO",M+16,writer.y-19,8,bold,muted);
  statusLines.forEach((text,index)=>drawText(writer.page,text,M+16,writer.y-41-index*18,13,bold,ink));
  drawText(writer.page,model.complete?"Acompanhamento concluído":"Acompanhamento em andamento",M+16,writer.y-boxHeight+13,9,regular,body);writer.y-=boxHeight+20;
  const stats=model.stats||{},figures=[['Documentos',stats.documents==null?(snapshot.documentos||[]).length:stats.documents],['Arquivos incorporados',embeddedOriginals+' de '+evidence.length],['Movimentações',stats.historyEvents==null?(snapshot.historico||[]).length:stats.historyEvents]];
  const gap=12,boxWidth=(CW-2*gap)/3;writer.ensure(74);
  figures.forEach(([label,value],index)=>{const x=M+index*(boxWidth+gap);writer.page.drawRectangle({x,y:writer.y-62,width:boxWidth,height:62,borderColor:line,borderWidth:.7});drawText(writer.page,label,x+10,writer.y-18,8,regular,muted);drawText(writer.page,String(value),x+10,writer.y-44,18,bold,ink);});writer.y-=82;
  writer.paragraph("Este relatório reúne os registros disponíveis até a data e o horário da emissão. Pode ser gerado durante o acompanhamento ou depois de sua conclusão; novas movimentações exigem uma nova emissão.",{size:9.5,lineHeight:14,after:12});
  writer.paragraph("Inclui as informações do caso, decisões, anotações, documentos e histórico registrados no Atlas, inclusive registros internos da Aon identificados no conteúdo.",{size:9,lineHeight:13,after:10});
  if(evidence.length)writer.paragraph("Originais incorporados; a abertura dos anexos depende do leitor de PDF. As prévias de PDFs e imagens disponíveis aparecem ao final do relatório. Consulte o inventário para verificar arquivos sem conteúdo disponível neste navegador.",{size:8.5,lineHeight:12,color:muted});
  const contents=(model.sections||[]).map((section,index)=>({title:(index+1)+". "+section.title,section,page:0}));
  const manifestEntry={title:(contents.length+1)+". Inventário de arquivos incorporados",page:0};contents.push(manifestEntry);
  const noteEntry={title:(contents.length+1)+". Notas da emissão",page:0};contents.push(noteEntry);
  const previewEntries=evidence.filter(item=>item.preview.length).map((item,index)=>({title:"Anexo visual "+(index+1)+" · "+item.name,item,page:0}));
  contents.push(...previewEntries);
  const tocPages=[];let tocY=TOP-50,tocPage;
  for(const entry of contents){
    const lines=wrap(entry.title,regular,10,CW-42),height=lines.length*14+10;
    if(!tocPage||tocY-height<BOTTOM){tocPage=writer.newPage();tocPages.push(tocPage);tocY=TOP-50;}
    entry.toc={page:tocPage,y:tocY,lines,height};tocY-=height;
  }
  for(const entry of contents.filter(item=>item.section)){
    if(!writer.page||tocPages.includes(writer.page))writer.newPage();
    entry.page=writer.heading(entry.title);
    for(const block of entry.section.blocks||[])writer.block(block);
    await pause();
  }
  manifestEntry.page=writer.heading(manifestEntry.title);
  writer.paragraph("Cada item abaixo corresponde a um arquivo vinculado ao caso. Arquivos substituídos permanecem identificados para preservar a sequência documental. A ausência do conteúdo no navegador não é tratada como validação nem como inclusão do original.",{size:9.5,lineHeight:14,after:10});
  if(!evidence.length)writer.paragraph("Nenhum arquivo digital foi vinculado aos documentos deste caso. Documentos registrados por outro canal constam nas seções anteriores.");
  evidence.forEach((item,index)=>{
    const meta=item.meta;
    writer.block({label:(index+1)+". "+item.name,text:[
      "Documento: "+(meta.tipoDocumento||"Não registrado"),
      "Estado: "+(meta.estado||"Não registrado")+(meta.substituido?" · versão substituída":""),
      meta.anexadoEm?"Enviado em: "+dateText(meta.anexadoEm):"Data de envio: não registrada",
      "Enviado por: "+(meta.anexadoPor||"Não registrado"),
      "Tamanho registrado: "+(typeof fmtTam==='function'?fmtTam(meta.tamanho):String(meta.tamanho||0)+" bytes"),
      item.embeddedName?"Nome do original incorporado: "+item.embeddedName:"Original não incorporado",
      item.duplicateOf?"O mesmo arquivo já consta do inventário: "+item.duplicateOf:"",
      item.state
    ].filter(Boolean).join("\n")});
  });
  noteEntry.page=writer.heading(noteEntry.title);
  writer.block({label:"Referência da emissão",text:dateText(generatedAt)+" · "+(model.generatedBy||nomeAon||"Aon")});
  writer.block({label:"Arquivos originais",text:embeddedOriginals+" arquivo(s) incorporado(s). "+evidence.length+" vínculo(s) de arquivo registrado(s) no caso."});
  if(issues.length)for(const text of issues)writer.block({label:"Observação da exportação",text});
  else writer.paragraph("Os arquivos digitais vinculados e disponíveis neste navegador foram incorporados. As informações apresentadas refletem exclusivamente os registros existentes no Atlas na emissão.");
  if(originalTextName)writer.paragraph("O anexo "+originalTextName+" preserva o texto integral em UTF-8, inclusive caracteres que não são exibidos pela fonte do PDF.");
  for(let index=0;index<previewEntries.length;index++){
    const entry=previewEntries[index],item=entry.item;progress("Preparando prévia "+(index+1)+" de "+previewEntries.length+"…");
    for(let part=0;part<item.preview.length;part++){
      writer.newPage();if(part===0)entry.page=pdf.getPageCount();
      writer.paragraph("Anexo visual "+(index+1),{font:bold,size:13,color:ink,lineHeight:17,after:5});
      writer.paragraph(item.name+(item.preview.length>1?" · página "+(part+1)+" de "+item.preview.length:""),{size:9,color:muted,lineHeight:12,after:9});
      const preview=item.preview[part],width=preview.width,height=preview.height;
      if(!(width>0&&height>0&&Number.isFinite(width)&&Number.isFinite(height))){writer.paragraph("Não foi possível dimensionar a prévia. Consulte o original incorporado.");issue("Dimensões de prévia inválidas em "+item.name+".");continue;}
      const angle=preview.kind==='pdf'?-(preview.rotation||0):0,radians=angle*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
      const displayWidth=Math.abs(width*cos)+Math.abs(height*sin),displayHeight=Math.abs(width*sin)+Math.abs(height*cos);
      const availableHeight=Math.max(40,writer.y-BOTTOM-10),scale=Math.min(CW/displayWidth,availableHeight/displayHeight);
      const x=M+(CW-displayWidth*scale)/2,y=BOTTOM+10+(availableHeight-displayHeight*scale)/2;
      writer.page.drawRectangle({x:M,y:BOTTOM+8,width:CW,height:availableHeight+2,borderColor:line,borderWidth:.5});
      if(preview.kind==='image')writer.page.drawImage(preview.resource,{x,y,width:width*scale,height:height*scale});
      else{
        const corners=[[0,0],[width*scale,0],[0,height*scale],[width*scale,height*scale]].map(([a,b])=>[a*cos-b*sin,a*sin+b*cos]);
        const minX=Math.min(...corners.map(point=>point[0])),minY=Math.min(...corners.map(point=>point[1]));
        writer.page.drawPage(preview.resource,{x:x-minX,y:y-minY,width:width*scale,height:height*scale,rotate:degrees(angle)});
      }
      await pause();
    }
  }
  tocPages.forEach((page,index)=>{
    drawText(page,index?"Conteúdo · continuação":"Conteúdo",M,TOP-16,18,bold,ink);
    drawText(page,"Seções do acompanhamento e anexos visuais",M,TOP-34,9,regular,muted);
  });
  for(const entry of contents){
    const {page,y,lines,height}=entry.toc;
    lines.forEach((text,index)=>drawText(page,text,M,y-10-index*14,10,regular,body));
    const number=String(entry.page);drawText(page,number,W-M-measure(number,bold,10),y-10,10,bold,ink);
    page.drawLine({start:{x:M,y:y-height+4},end:{x:W-M,y:y-height+4},thickness:.4,color:line});
    const destination=pdf.getPage(entry.page-1);
    const link=pdf.context.register(pdf.context.obj({Type:PDFName.of('Annot'),Subtype:PDFName.of('Link'),Rect:[M,y-height+3,W-M,y+3],Border:[0,0,0],Dest:[destination.ref,PDFName.of('Fit')]}));
    page.node.addAnnot(link);
  }
  const totalPages=pdf.getPageCount();
  for(let index=0;index<totalPages;index++){
    const page=pdf.getPage(index);page.drawLine({start:{x:M,y:43},end:{x:W-M,y:43},thickness:.6,color:line});
    const left=String(model.id||"Atlas")+" · Emissão: "+dateText(generatedAt),number="Página "+(index+1)+" de "+totalPages;
    drawText(page,left,M,29,7.5,regular,muted);drawText(page,number,W-M-measure(number,regular,7.5),29,7.5,regular,muted);
  }
  progress("Finalizando o arquivo PDF…");
  const bytes=await pdf.save({useObjectStreams:true,addDefaultPage:false});
  const safeId=String(model.id||"sinistro").replace(/[^A-Za-z0-9._-]/g,"-");
  return {bytes,fileName:"relatorio-"+safeId+"-"+generatedAt.replace(/\D/g,"").slice(0,14)+".pdf",issues,attachmentCount:embeddedOriginals,pageCount:totalPages,model,
    attachmentManifest:evidence.map(item=>({id:item.meta.id,name:item.name,embeddedName:item.embeddedName,embedded:item.embedded,previewPages:item.preview.length,state:item.state}))};
}
