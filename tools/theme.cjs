const fs = require('fs');
module.exports = function atlasTheme(html) {
  const marker = 'function PerfilShell({';
  if (html.split(marker).length !== 2) throw Error('Expected one shell for the theme control');
  html = html.replace(marker, () => fs.readFileSync('assets/atlas/theme.js', 'utf8') + '\n' + marker);
  const before = 'className: "atl-top-r"\n  }, rce("span", {';
  if (html.split(before).length !== 2) throw Error('Expected one profile header for the theme control');
  return html.replace(before, 'className: "atl-top-r"\n  }, rce(AtlasThemeToggle), rce("span", {');
};
