/* Presentation-only replacements for the shared Cliente/Aon shell. */
module.exports = function dashboardBrand(html) {
  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const lines = value => value.replace(/\n/g, nl);
  const sidebar = lines(`  }, rce("div", {
    className: "atl-logo",
    "aria-hidden": "true"
  }, "A"), rce("div", {
    className: "atl-brand-t"
  }, rce("strong", null, "Atlas Seguros"), rce("span", null, perfil === "cliente" ? "Cliente / Empresa segurada" : "Aon / Corretora"))), rce("nav", {`);
  const sidebarLogo = lines(`  }, rce(AtlasBrand, {
    className: "atl-sidebar-brand"
  }), rce("div", {
    className: "atl-brand-t"
  }, rce("span", null, perfil === "cliente" ? "Cliente / Empresa segurada" : "Aon / Corretora"))), rce("nav", {`);
  const breadcrumb = lines(`    className: "atl-crumb"
  }, "Atlas Seguros", rce("span", {`);
  const headerLogo = lines(`    className: "atl-crumb"
  }, rce(AtlasBrand, {
    className: "atl-header-brand"
  }), rce("span", {`);
  for (const [name, before, after] of [['sidebar', sidebar, sidebarLogo], ['header', breadcrumb, headerLogo]]) {
    if (html.split(before).length !== 2) throw Error('Expected one shared Atlas ' + name + ' brand block');
    html = html.replace(before, after);
  }
  return html;
};
