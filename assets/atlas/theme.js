/* Shared control for the entrance and both profile headers. */
function AtlasThemeToggle({className = ''} = {}) {
  const [mode, setMode] = useState(() => window.AtlasAppearance.get());
  useEffect(() => {
    const update = () => setMode(window.AtlasAppearance.get());
    window.addEventListener('atlas:theme-change', update);
    update();
    return () => window.removeEventListener('atlas:theme-change', update);
  }, []);
  const dark = mode === 'dark';
  const action = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
  const icon = rce('svg', {viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false'},
    dark ? rce('path', {d: 'M20.7 13A8.5 8.5 0 0 1 11 3.3 8.5 8.5 0 1 0 20.7 13Z'}) : rce(React.Fragment, null,
      rce('circle', {cx: 12, cy: 12, r: 4}),
      rce('path', {d: 'M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'})));
  return rce('button', {type: 'button', className: 'at-theme-toggle ' + className, 'data-atlas-toggle': true, 'aria-label': action, 'aria-pressed': dark, title: action, onClick: () => window.AtlasAppearance.set(dark ? 'light' : 'dark')},
    icon, rce('span', {className: 'at-theme-label'}, dark ? 'Modo escuro' : 'Modo claro'));
}
