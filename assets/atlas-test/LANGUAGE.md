# Textos da interface de testes

Revisão com Humanizer, em modo incorporado à tarefa de design. A voz é direta e neutra: quem age, em qual sinistro e o que a pessoa pode fazer.

O transformador `tools/atlas-test-language.cjs` revisa 14 textos de apoio. Cada substituição exige um único literal completo, entre aspas. Não altera dados, estados, regras, nomes de ações, abas, menus ou campos acessíveis.

## Critérios aplicados

- Trocar expressões genéricas como “em um só lugar” pelo objeto real da tela.
- Remover repetição entre a explicação e o contexto já identificado no cabeçalho.
- Nomear a Aon quando ela é responsável por uma confirmação.
- Usar verbos diretos em instruções e mensagens de validação.
- Manter os estados vazios ligados ao sinistro e à próxima ação possível.

Exemplos:

| Antes | Depois |
|---|---|
| Converse com as empresas e acompanhe cada sinistro em um só lugar. | Mensagens das empresas, organizadas por sinistro. |
| Inclui prioridades sugeridas ainda não confirmadas. | Inclui sugestões de prioridade que a Aon ainda não confirmou. |
| Nenhuma ação registrada. | Este sinistro ainda não tem ações registradas. |
| Escreva a resposta antes de enviar. | Preencha a resposta para enviar. |

Os avisos de demonstração, armazenamento e privacidade, a distinção entre comunicação e abertura do sinistro e o texto de próxima etapa fornecido pelo usuário ficam preservados. As mensagens de exemplo e os registros históricos também ficam preservados.
