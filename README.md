# Ferramenta Atlas Aon

Protótipo de gestão e acompanhamento de sinistros Cyber, com perfis de empresa segurada e corretora Aon.

Abra `Atlas.html` em um navegador com JavaScript. O arquivo inclui os recursos necessários e funciona sem internet, sem instalação e sem servidor. Também pode ser aberto pelo Live Server do VS Code.

O protótipo oferece acompanhamento de sinistros, triagem, documentos, histórico, filtros por cliente, modo claro e escuro e relatórios em PDF.

Os dados são demonstrativos e ficam armazenados no navegador de cada dispositivo. Não há autenticação real nem sincronização entre dispositivos.

## Manutenção

As fontes ficam em `assets/atlas` e `tools`. Para gerar novamente o HTML independente, execute:

```sh
node tools/build-entrance.cjs
```

Consulte `LEIA-ME-ATLAS.md` para mais detalhes. As licenças das bibliotecas e fontes incorporadas estão em `assets/atlas`.
