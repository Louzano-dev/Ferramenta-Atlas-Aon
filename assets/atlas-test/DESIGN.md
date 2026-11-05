# Atlas — sistema visual da versão de testes

Escopo autorizado: melhorar o design de toda a ferramenta na cópia de testes. A versão principal, seus dados e os arquivos de fontes compartilhados ficam preservados. A marca e a entrada com a Terra são referências já aprovadas pelo usuário.

A interface serve ao trabalho de comunicar e acompanhar sinistros. A direção mantém azul profundo, vermelho Aon, tipografia sem serifa, hierarquia compacta e superfícies discretas. Impeccable orienta os estados e a precisão da interface; UI/UX Pro Max orienta contraste, teclado e toque; Taste orienta consistência, alinhamento e contenção visual. As recomendações de páginas comerciais, vídeos, geração de imagens e efeitos de marketing não correspondem a esta ferramenta.

## Critérios aplicados em toda a ferramenta

- UI/UX Pro Max: densidade adequada a um painel operacional, rótulos associados aos campos, etapas identificadas, foco visível, controles de toque e campos legíveis no celular. A busca inicial trouxe uma estrutura de página comercial; a consulta específica de estilo confirmou a adequação de um painel operacional. A marca existente prevalece sobre sugestões genéricas de cores e fontes.
- Impeccable, modo Operate: superfícies e estados coerentes, navegação previsível, hierarquia entre título, instrução e conteúdo, tratamento dos dois temas e revisão de capturas reais. O motor local da skill estava indisponível; as referências foram aplicadas diretamente.
- Taste: alinhamento de bordas, uma família de controles, textos diretos, movimento restrito às interações e à Terra já solicitada. A composição de acesso preserva a referência aprovada.
- Humanizer: 14 ajustes de microcopy, sem mudar os nomes dos controles, os avisos do protótipo, as informações dos casos ou a mensagem de próxima etapa fornecida pelo usuário. As mudanças estão em `LANGUAGE.md`.
- Verificação: navegação nos dois perfis, formulário completo, abas e diálogos dos casos, PDF real, valores formatados, conversa por sinistro, temas, contraste, teclado, telas de 320 a 1366 px e paisagem.

## Sistema visual

O menu lateral usa azul profundo e o símbolo Atlas claro com o arco vermelho. O conteúdo usa superfícies brancas no modo claro e azul escuro no modo escuro. As cores semânticas distinguem informação, pendência, sucesso e erro com texto e marcadores, sem depender apenas da cor.

A tipografia usa a família de interface disponível no dispositivo, com títulos compactos e campos de 16 px. Controles mantêm alvos de 44 px. O conteúdo tem largura limitada, tabelas rolam dentro do próprio quadro e formulários reorganizam suas colunas em telas menores.

O painel da Aon apresenta os indicadores antes da ajuda detalhada, que pode ser aberta por um botão. O cliente tem um resumo dos sinistros e cartões com uma ação explícita para acompanhar cada caso. Seções dos casos passam a ter títulos semânticos e áreas de conteúdo identificadas; documentos, linha do tempo, tarefas, filtros e diálogos compartilham o mesmo sistema.

## Decisões

- Refinar o sistema existente em vez de trocar a identidade aprovada.
- Central Conversas no grupo Ações do menu lateral dos dois perfis, após Comunicar incidente / Registrar comunicação. Conversa por sinistro, com contraparte, autor, data, hora e balões distintos.
- Seletor de sinistro em todas as telas e lista pesquisável em computadores. A Aon acessa todos os casos; o cliente acessa somente os da própria empresa. A seleção é lembrada por perfil na sessão. Cada conversa identifica empresa, sinistro, tipo, status e contato.
- Os detalhes do sinistro têm atalhos para abrir a conversa na central. A central também permite abrir os detalhes do caso selecionado. A navegação não modifica as mensagens nem o histórico.
- Campo de mensagem crescente, rascunho por caso e perfil, validação e confirmação de registro. Enter cria uma linha; Ctrl/Command + Enter envia, inclusive com proteção para composição de teclado.
- Respeitar a leitura de mensagens antigas: não puxar a rolagem quando chega mensagem e a pessoa está longe do fim.
- Manter o formato de mensagens, histórico, PDF e regras de conclusão. Não apresentar presença, recibos de leitura ou entrega pela internet.
- Chaves de dados, sessão, arquivos e tema próprias da versão de testes. Não copiar ou modificar os dados da versão principal.

## Alternativas consideradas

Só alterar as cores manteria os problemas de leitura e de resposta. Um mensageiro completo com servidor mudaria a natureza portátil do protótipo. O experimento melhora a conversa já existente sem dependências externas.

## Execução e verificação

1. Criar fontes próprias em `assets/atlas-test` e um gerador que lê a versão principal sem alterá-la.
2. Substituir o componente compartilhado de conversa e acrescentar a aba da Aon.
3. Aplicar o sistema visual ao acesso, à navegação, aos painéis, aos formulários e às áreas operacionais, com variáveis para claro e escuro.
4. Verificar os fluxos e as conversas nos dois perfis, rascunhos, bloqueio, busca, persistência, isolamento dos dados e telas pequenas.
5. Conferir capturas renderizadas e o hash de `Atlas.html`.

Para reconstruir apenas o experimento: `node tools/build-atlas-test.cjs`.
