# Atlas — interface de acesso

**Atlas.html é um arquivo único e independente.** Imagens, estilos, React, GSAP e código do protótipo estão incorporados nele. Você pode copiar somente esse HTML para outra pasta ou outro computador e abri-lo em um navegador, sem internet, servidor ou instalação.

Para enviar pelo WhatsApp, use **Documento** e selecione `Atlas.html`. Quem receber deve baixar o arquivo e abri-lo em um navegador ou aplicativo que execute páginas HTML com JavaScript. A prévia de anexos do WhatsApp ou do sistema não garante a execução do protótipo; no iPhone/iPad, as opções de abertura dependem dos aplicativos disponíveis. Para abrir por um link comum, sem escolher um aplicativo para o arquivo, seria necessário publicar uma cópia em HTTPS. Nenhuma publicação foi feita.

A pasta `assets` e os scripts em `tools` são fontes para manutenção: **não precisam acompanhar o HTML compartilhado**. Alterações nesses arquivos entram na versão portátil após executar `node tools/build-entrance.cjs`.

Também funciona com **Go Live / Live Server** no VS Code: abra esta pasta, selecione `Atlas.html` e use **Open with Live Server**. A geração de relatórios PDF também funciona nessa abertura.

## O que foi integrado

- Entrada baseada na nova referência `Gestão Inteligente de Sinistros Cyber.png`: escultura estática, símbolo Atlas em destaque à esquerda, título em duas linhas, dois cartões de acesso e painel navy com a Terra, sem textos sobre a imagem.
- Composição compacta no computador, com painel de acesso de até 680 px. Tablets usam o painel centralizado; celulares usam uma coluna, com a Terra em uma faixa abaixo do acesso. Em telas baixas, os formulários rolam normalmente.
- Textos mantêm tamanhos legíveis, campos usam fonte de 16 px e os controles principais têm pelo menos 44 px de altura. O rodapé acompanha o conteúdo sem se sobrepor aos formulários.
- A Terra é uma imagem com deslocamento lateral lento, em tamanho constante, sem zoom ou inclinação. Marca, escultura, cartões e formulário permanecem estáticos. Não há modelo 3D nem dependência de WebGL.
- Logo completo Atlas no menu lateral e no cabeçalho dos dois perfis: Cliente e Aon. O menu recolhido mantém o símbolo; o cabeçalho mantém a marca completa.
- Exatamente dois perfis: Cliente e Aon. A escolha abre imediatamente o formulário demonstrativo no próprio painel, com retorno à seleção e acesso direto ao dashboard.
- Movimento reduzido mantém a Terra estática. Há foco por teclado e versão móvel. O movimento pausa com a aba oculta ou quando a imagem está fora da área visível.
- Imagens e estilos locais: funciona em `file://` e no Go Live, sem baixar bibliotecas para exibir a Terra.
- Arquivo final autossuficiente: nenhum recurso da pasta do projeto ou CDN é solicitado para exibir e usar o protótipo.
- Símbolo Atlas com navy mais escuro e curva vermelha contínua, sem o recorte branco que interrompia o desenho.
- **Sinistros registrados** apresenta somente acompanhamentos ativos. **Casos concluídos** reúne os encerrados com busca por ID/empresa, período de conclusão e tipo de incidente, reutilizando os detalhes existentes.
- **Concluir acompanhamento** e **Reabrir acompanhamento** exigem confirmação e observação/justificativa. Data, horário, responsável e todos os ciclos ficam acumulados; o caso mantém o mesmo ID e todas as informações de documentos, protocolo, cobertura e indenização. Apenas o perfil demonstrativo Aon tem essas ações.
- O dashboard mostra ativos e concluídos sem contar reabertura como novo sinistro. Concluir o acompanhamento não significa aprovação de cobertura nem pagamento pela seguradora.
- **Filtrar por cliente** permite selecionar uma empresa ou **Todos os clientes** nas telas da Aon: Visão geral, Sinistros, Casos concluídos, Monitoramento e Histórico geral. A seleção atualiza os indicadores e as listas, combina com os filtros visíveis de cada tela e permanece ao abrir/voltar de um caso ou navegar. Ao trocar de cliente no Histórico geral, os filtros locais reiniciam para evitar opções que não existem na nova seleção.
- O cartão **Clientes acompanhados** conta empresas únicas com sinistros registrados, incluindo empresas que só possuem casos concluídos. Vários casos da mesma empresa não aumentam essa contagem. Com um cliente selecionado, mostra a quantidade do recorte atual. Nomes são agrupados desconsiderando diferenças de maiúsculas, acentos e espaços; os registros originais permanecem intactos. O cartão leva ao seletor de cliente. Os indicadores usam três colunas no computador; a exposição estimada ocupa a largura disponível nas telas menores para manter o valor legível.
- **Modo claro e modo escuro**: o botão com sol/lua fica no cabeçalho da entrada e dos perfis Cliente e Aon. A escolha é mantida no navegador ao recarregar ou trocar de perfil; o padrão inicial é claro. As paletas tratam fundos, textos, campos, estados desabilitados, foco, tabelas, gráficos, status, avisos, janelas e logos Atlas. A escultura e a Terra continuam sendo imagens, com o mesmo movimento lateral da Terra. O modo muda sem apagar formulários ou alterar os registros.
- **Histórico geral** agora é uma tabela compacta, com os eventos de todos os casos, detalhes das movimentações, filtros combináveis e paginação de 20/50/100 registros. Não existe mais o limite permanente de 80 eventos.
- Revisão do áudio de 04/11/2026: cartões do cliente usam **Pendências:** e o status **Em análise pela Aon**, com explicação própria para essa etapa.
- O andamento e o status usam **Sinistro aberto na seguradora**, conforme o segundo áudio. Explicações, glossário, pergunta do painel Aon e relatório PDF usam a mesma terminologia. A mudança é de texto: etapas, protocolos, datas e registros históricos são preservados.
- O aviso inicial de comunicação orienta o cliente a acionar TI/segurança e comunicar o caso à Aon **em paralelo**, sem aguardar a resolução do incidente para iniciar a abertura do sinistro na seguradora. A resposta técnica continua com as equipes responsáveis.
- A confirmação **Comunicação registrada** apresenta o texto fornecido para a próxima etapa: análise das informações pela Aon, abertura na seguradora se estiver tudo correto, contato em caso de pendências e acompanhamento do status na plataforma.
- Os cinco campos monetários — **Prejuízo estimado**, **Valor aprovado**, **Valor pago**, **Limite** e **Franquia** — mostram pontos e duas casas decimais durante a digitação: `50` aparece como `50,00` e `500000` como `500.000,00`, sem precisar digitar a vírgula ou sair do campo. O cursor permanece na parte dos reais para continuar digitando; vírgula ou ponto permite editar os centavos quando necessário. Valores fracionários já registrados são carregados no padrão brasileiro, preservando o montante ao salvar novamente. A opção **Não sei informar** permanece no prejuízo estimado.
- **Previsão de retorno da Aon** aparece nos cartões e no relatório do cliente. No perfil Aon, abra o caso e use **Resumo e andamento → Próximo retorno ao cliente** para definir ou limpar a data. A alteração registra autor e histórico. Sem data, aparece **A definir pela Aon**; uma data passada fica marcada como **Previsão vencida**. Casos concluídos ocultam a previsão. Não há SLA automático: a data representa a próxima atualização prevista pela Aon e é independente do retorno informado pela seguradora.

O acesso continua sendo uma demonstração sem autenticação real. Foram mantidos `onEnter`, os painéis internos, os dados demonstrativos e as chaves `atlas-seguros:v5`, `atlas-seguros:sessao` e o IndexedDB. Os dados de exemplo acompanham o HTML; os registros e anexos criados depois de abrir o protótipo ficam no navegador da pessoa e não são incorporados automaticamente ao arquivo enviado.

Quando o navegador permite localStorage, mas bloqueia o IndexedDB para arquivos locais, anexos usam uma alternativa local, respeitando a cota disponível. Se todo armazenamento estiver bloqueado ou a cota acabar, a interface informa a limitação. Abra sempre o mesmo arquivo/caminho para continuar usando os dados locais daquele contexto.

## Relatório PDF por sinistro

No perfil **Aon**, abra um caso em **Sinistros** ou **Casos concluídos** e use **Baixar relatório em PDF**, no topo dos detalhes. A opção aparece em qualquer aba e fase, inclusive com pendências ou depois da conclusão. O PDF é gerado diretamente no navegador, sem internet, servidor ou diálogo de impressão, e substitui o dossiê HTML.

Cada emissão fotografa os registros daquele momento, sem avançar etapas, validar documentos ou concluir o acompanhamento. O relatório inclui capa, emissão, sumário clicável, paginação, identificação e ocorrência, impactos e prejuízo, etapas, triagem e fundamentos, apólice vinculada, plano de ações, documentos e validações, solicitações e respostas, mensagens completas, encaminhamento e protocolo, retornos da seguradora, cobertura, indenização, ciclos de conclusão/reabertura e todo o histórico. As anotações internas da Aon estão incluídas e identificadas; os textos não são limitados aos primeiros eventos nem resumidos no lugar do conteúdo integral.

Os **arquivos originais disponíveis neste navegador** são incorporados ao PDF, inclusive versões substituídas. Imagens PNG/JPEG e PDFs legíveis também ganham páginas de visualização ao final. Outros formatos permanecem como originais incorporados, sem simular conversões. Para abrir ou extrair os originais, o leitor de PDF precisa oferecer a área de anexos. Arquivos ausentes, protegidos ou sem prévia são identificados no inventário e nas observações; documentos recebidos por outro canal, sem arquivo digital, continuam descritos dessa forma.

O PDF usa fundo claro e fontes incorporadas, independentemente do tema do aplicativo. Se um caractere não existir na fonte, o texto integral é preservado em anexo UTF-8 e a ocorrência é informada. Os bytes dos originais não são modificados. Os registros criados no navegador continuam locais e não passam a acompanhar automaticamente uma cópia do HTML.

## Arquivos e manutenção

- `assets/atlas/entrance.css`: estilos da nova entrada.
- `assets/atlas/entrance.js`: componentes de apresentação e Landing; fonte usada na montagem do HTML.
- `assets/atlas/portable-storage.js`: compatibilidade de anexos para navegadores que restringem IndexedDB em arquivos locais; usa as funções originais e uma alternativa em localStorage quando necessário.
- `assets/atlas/case-lifecycle.js` e `.css`: confirmação de conclusão/reabertura, validações e preservação do histórico dos ciclos.
- `assets/atlas/case-history.js` e `.css`: tabelas de concluídos e histórico, filtros, paginação e detalhes das movimentações.
- `assets/atlas/client-return.js` e `.css`: previsão de retorno ao cliente, formulário Aon e indicação de previsão vencida.
- `assets/atlas/currency-input.js`: formatação monetária imediata, duas casas decimais automáticas, preservação do cursor, validação e inicialização de valores numéricos existentes.
- `assets/atlas/client-filter.js` e `.css`: filtro compartilhado de clientes no painel Aon, contagem de empresas únicas e disposição dos indicadores.
- `assets/atlas/theme-bootstrap.js`: aplica a preferência salva antes da apresentação da interface, usando somente a chave `atlas:theme:v1`.
- `assets/atlas/theme.js` e `theme.css`: controle de aparência compartilhado, teclado, identificação acessível e disposição nos cabeçalhos.
- `assets/atlas/theme-dashboard.css` e `theme-entrance.css`: cores específicas do modo escuro, estados e contraste dos elementos; sem inversão global de imagens.
- `assets/atlas/case-report-data.js`: retrato completo dos registros de um caso, sem alterar o armazenamento.
- `assets/atlas/case-report-pdf.js`: composição A4, paginação, sumário, originais incorporados e páginas de anexos.
- `assets/atlas/case-report-ui.js` e `case-report.css`: botão em qualquer fase, progresso, download e observações da emissão.
- `assets/atlas/pdf-lib.min.js` (pdf-lib 1.17.1, MIT), `fontkit.umd.min.js` (@pdf-lib/fontkit 1.1.1, MIT) e fontes `NotoSans-Regular.ttf`/`NotoSans-Bold.ttf` (SIL Open Font License): recursos incorporados para o PDF offline, com suas licenças nos arquivos de manutenção.
- `assets/atlas/atlas-statue.png`: recurso transparente da escultura.
- `assets/atlas/earth-horizon.png`: imagem da Terra preparada com base na referência, sem textos ou interface incorporados.
- `assets/atlas/reference-layout.css`: camadas da Terra e movimento discreto da imagem.
- `assets/atlas/dashboard-brand.css`: logo dos painéis internos, incluindo celular e menu recolhido.
- `assets/atlas/aon.svg`: desenho vetorial institucional, extraído de https://www.aon.com/lib/icons/symbol-defs.svg, símbolo `aon-logo`; o desenho foi preservado, com preenchimento vermelho da paleta fornecida.
- `assets/atlas/gsap.min.js`: GSAP 3.14.2, preservado para os painéis internos existentes. A entrada não utiliza GSAP. Termos: https://gsap.com/standard-license/.
- `tools/build-entrance.cjs`: recompõe o HTML a partir do original, incorpora a apresentação e valida a sintaxe dos scripts. Requer Node.js apenas para manutenção.
- `tools/dashboard-brand.cjs`: aplica somente a identidade visual ao cabeçalho e ao menu compartilhados entre os perfis.
- `tools/case-evolution.cjs`, `case-navigation.cjs`, `case-lifecycle.cjs` e `case-history.cjs`: aplicam as alterações de negócio e apresentação ao código original preservado.
- `tools/client-feedback.cjs`, `client-feedback-copy.cjs` e `client-return.cjs`: integram os ajustes do áudio e a previsão da Aon; preservam os valores internos de status e o campo de retorno da seguradora.
- `tools/claim-opening-copy.cjs`: padroniza os textos de abertura do sinistro na seguradora.
- `tools/currency-input.cjs`: aplica o campo monetário ao prejuízo estimado, aos valores aprovado/pago e ao limite/franquia da apólice, preservando os parsers e a persistência numérica.
- `tools/client-filter.cjs`: integra o filtro às telas de acompanhamento e o cartão de clientes à visão geral, mantendo os dados completos nos detalhes e no armazenamento.
- `tools/theme.cjs`: integra o controle de aparência ao cabeçalho dos dois perfis.
- `tools/case-report.cjs`: remove a exportação HTML e integra o relatório completo em PDF ao caso.
- `tools/verify-entrance.cjs`: validação de navegador; requer Node.js, Playwright e Chrome. Executar `node tools/verify-entrance.cjs`.
- `tools/verify-responsive.cjs`: verifica seleção de perfil, ambos os formulários e layouts em 16 tamanhos entre 320 e 2560 px, incluindo orientação horizontal; também confere os menus dos dois perfis em 320 px. Executar `node tools/verify-responsive.cjs`.
- `tools/verify-portable.cjs`: copia somente o HTML para uma pasta temporária vazia e testa abertura offline, os dois perfis, criação de caso, anexos, armazenamento e recarregamento. Testes móveis usam emulação de tela/toque; não são testes de aparelhos físicos nem do WhatsApp.
- `tools/verify-lifecycle.cjs`: conclusão, reabertura, múltiplos ciclos, legado, indicadores, integridade, persistência, permissões e diálogos em celular.
- `tools/verify-history.cjs`: busca e filtros combinados, datas no calendário local, detalhes, responsividade e acesso a mais de 80 registros pela paginação.
- `tools/verify-client-feedback.cjs`: textos do cliente, previsão definida pela Aon, validação, histórico, permissões, persistência, datas vencidas e layouts de 320 a 1366 px.
- `tools/verify-currency-input.cjs`: digitação, colagem, centavos, edição, revisão, persistência numérica e “Não sei informar” em Chrome e WebKit com telas de celular e computador.
- `tools/verify-insurance-money.cjs`: formatação imediata dos cinco campos, indenização salva/reaberta, centavos preexistentes, apólice e valores no modelo do relatório PDF em Chrome e WebKit.
- `tools/verify-client-filter.cjs`: empresas únicas, métricas, combinação de filtros, navegação, casos concluídos, histórico, novos clientes e recuperação de seleção inválida, com verificações entre 320 e 1920 px.
- `tools/verify-theme.cjs`: troca e persistência dos modos, formulário preservado, contraste calculado de textos e placeholders, cabeçalhos entre 320 e 1366 px, tabelas, avisos, detalhes e janelas nos dois perfis. Inclui WebKit com emulação de iPhone, sem equivaler a teste em aparelho físico ou certificação de acessibilidade.
- `tools/verify-case-report.cjs`: PDFs de caso inicial, em andamento e concluído, texto integral de 162 eventos, dados internos, anexos originais extraídos byte a byte, versões substituídas, arquivos ausentes/corrompidos e download offline no WebKit móvel. Usa pdfjs-dist local apenas nos testes.
- `tools/preview-case-report.cjs`: renderiza páginas representativas dos PDFs de teste para inspeção visual; não é necessário para usar o protótipo.

As fontes Helvetica Now não foram fornecidas; o CSS mantém a preferência por elas e usa Helvetica/Arial quando não estiverem instaladas. A escultura e a Terra são imagens separadas; os textos, os logos, os cartões e os formulários são elementos reais da interface.

## Recurso de imagem

Escultura preparada com a ferramenta integrada `image_gen`, usando a imagem enviada como referência. Arquivo final: `assets/atlas/atlas-statue.png`.

Prompt utilizado:

> Use case: background-extraction. Produce a transparent PNG asset for the user's Atlas website. Extract ONLY the monumental grayscale marble Atlas statue carrying the celestial globe from the left of the reference. Preserve exactly the same photoreal marble sculpture, face, pose, proportions, dramatic light and celestial sphere. Remove ALL logos, all text, UI, background, cards, icons, red curves. Statue occupies left side, globe spans top, body cropped at bottom, just as reference. True transparent background around the sculpture and globe. No new illustration. Deliver only isolated sculpture with sphere.

Terra preparada com a ferramenta integrada `image_gen`. Arquivo final: `assets/atlas/earth-horizon.png`. Prompt utilizado:

> Use case: precise-object-edit. Asset type: website decorative Earth photo, separate visual layer. Input image is the exact visual reference. Extract/reconstruct ONLY the RIGHT DARK SPACE PANEL artwork, preserving its actual Earth-from-orbit horizon composition faithfully: curved blue-white atmosphere slopes from lower left toward upper right, nighttime Europe and Mediterranean with warm city lights, large close view of planet occupying bottom 60% and empty deep navy space at top. Preserve realistic photographic planet and its lighting, geography and perspective exactly as source. Remove ALL typography (Atlas, AON, signature), remove ALL card borders, UI, white panel, remove ALL red orbital lines and glowing red dots; these will be real vector layers in the app. The top 40 percent must be uninterrupted dark navy (#081628 to #14283e) so HTML headings can be placed over it. Portrait rectangular composition approximately 4:7. No full ball globe, no sphere floating in space, no illustration. This is a photo asset, not a UI screenshot. Opaque background, no text, no marks.
