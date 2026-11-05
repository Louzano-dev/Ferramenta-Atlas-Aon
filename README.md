# Ferramenta Atlas Aon

Protótipo de gestão e acompanhamento de sinistros Cyber, com perfis de empresa segurada e corretora Aon.

Abra `Atlas.html` em um navegador com JavaScript. O arquivo inclui os recursos necessários e funciona sem internet, sem instalação e sem servidor. Também pode ser aberto pelo Live Server do VS Code.

## Versão de testes

Abra `Atlas-teste.html` para usar a interface em desenvolvimento: navegação revisada, painéis e formulários atualizados e uma central de conversas por empresa e sinistro.

Essa versão também é um HTML independente e funciona sem internet. Os dados de teste ficam separados dos dados de `Atlas.html`, que mantém a versão preservada.

O protótipo oferece acompanhamento de sinistros, triagem, documentos, histórico, filtros por cliente, modo claro e escuro e relatórios em PDF.

Os dados são demonstrativos e ficam armazenados no navegador de cada dispositivo. Não há autenticação real nem sincronização entre dispositivos.

## Manutenção

As fontes ficam em `assets/atlas` e `tools`. Para gerar novamente o HTML independente, execute:

```sh
node tools/build-entrance.cjs
```

As alterações da versão de testes ficam em `assets/atlas-test`. Para reconstruir somente essa versão, mantendo `Atlas.html` intacto:

```sh
node tools/build-atlas-test.cjs
```

Os testes da versão de testes estão em `tools/verify-atlas-design.cjs`, `tools/verify-conversation-hub.cjs` e nos demais arquivos `verify-*.cjs`. Eles usam Playwright e navegadores instalados no ambiente de desenvolvimento. Capturas, PDFs e relatórios gerados pelos testes ficam fora do controle de versão.

Consulte `LEIA-ME-ATLAS.md` para mais detalhes. As licenças das bibliotecas e fontes incorporadas estão em `assets/atlas`.
