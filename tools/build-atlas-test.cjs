const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const original = fs.readFileSync('Atlas.html');
let html = original.toString('utf8');
function replaceOnce(from, to) {
  if (html.split(from).length !== 2) throw Error('Experimental patch must match once: ' + from.slice(0, 90));
  html = html.replace(from, to);
}
const start = html.indexOf('function Conversa({');
const end = html.indexOf('/* ------------------------------ portal do cliente', start);
if (start < 0 || end < 0) throw Error('Chat boundary missing');
html = html.slice(0, start) + fs.readFileSync('assets/atlas-test/chat.js', 'utf8') + '\n\n' + html.slice(end);
const motionStart = html.indexOf('function motionPagina(root, st) {');
const motionEnd = html.indexOf('const NAV_ICONS =', motionStart);
if (motionStart < 0 || motionEnd < 0) throw Error('Page motion boundary missing');
// Operational screens render immediately; keep the entrance Earth motion intact.
html = html.slice(0, motionStart) + 'function motionPagina(root, st) { motionLimpar(st); }\n' + html.slice(motionEnd);
replaceOnce('  }, "← Meus sinistros"), /*#__PURE__*/React.createElement("div", {', '  }, "← Meus sinistros"), React.createElement("button", {type:"button", className:BTN_SECONDARY + " atc-client-shortcut", onClick:()=>onOpenConversation(s.id)}, "Conversar com a Aon"), /*#__PURE__*/React.createElement("div", {');
replaceOnce('["resumo", "Resumo e andamento"], ["analise", "Triagem e apólice"]', '["resumo", "Resumo e andamento"], ["conversa", "Conversa com o cliente"], ["analise", "Triagem e apólice"]');
replaceOnce('tab === "analise" && /*#__PURE__*/React.createElement(AnaliseTab, {', 'tab === "conversa" && React.createElement(Conversa, {key: s.id, s, actions, ator, titulo: "Conversa com o cliente", bloqueado: !!s.encerrado}), tab === "analise" && /*#__PURE__*/React.createElement(AnaliseTab, {');
html = require('./atlas-test-conversations.cjs')(html);
html = require('./atlas-test-design.cjs')(html);
html = require('./atlas-test-language.cjs')(html);
html = require('./atlas-test-earth-orbit.cjs')(html);
// The prototype copy owns all of its browser data, including uploaded binaries.
html = html.replaceAll('atlas-seguros', 'atlas-teste-seguros').replaceAll('atlas:theme:v1', 'atlas-teste:theme:v1');
html = html.replace('<html', '<html data-atlas-experiment="design-chat"');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Atlas · Versão de testes</title>');
const styles = ['workspace.css', 'chat.css', 'conversations.css', 'system.css', 'operations.css', 'entrance-polish.css'].map(name => '<style data-atlas-test-source="' + name + '">\n' + fs.readFileSync('assets/atlas-test/' + name, 'utf8') + '\n</style>').join('\n');
html = html.replace('</head>', styles + '\n</head>');
for (const [index, match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()) {
  if (match[1].trim()) new vm.Script(match[1], {filename: 'Atlas-teste-script-' + index});
}
if (/<script\b[^>]*\bsrc\s*=/i.test(html) || /<link\b[^>]*rel=["']stylesheet["']/i.test(html)) throw Error('Test copy must remain standalone');
// Keep embedded license comment separators free of trailing whitespace.
html = html.replace(/^ \* +$/gm, ' *');
fs.writeFileSync('Atlas-teste.html', html);
if (hash(fs.readFileSync('Atlas.html')) !== hash(original)) throw Error('Main Atlas changed unexpectedly');
console.log('Atlas-teste.html rebuilt; inline scripts valid; main Atlas preserved: ' + hash(original));
