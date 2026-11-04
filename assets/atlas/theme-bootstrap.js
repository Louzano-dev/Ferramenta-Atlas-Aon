/* Apply the saved appearance before the first paint; independent of case data. */
(function () {
  var key = 'atlas:theme:v1';
  var current = 'light';
  try { var saved = localStorage.getItem(key); if (saved === 'dark' || saved === 'light') current = saved; } catch (_) {}
  function apply(value, persist) {
    current = value === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.atlasTheme = current;
    document.documentElement.style.colorScheme = current;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = current === 'dark' ? '#0c1422' : '#17496b';
    if (persist) try { localStorage.setItem(key, current); } catch (_) {}
    window.dispatchEvent(new CustomEvent('atlas:theme-change', {detail: current}));
  }
  window.AtlasAppearance = {get: function () {return current;}, set: function (value) {apply(value, true);}};
  window.addEventListener('storage', function (event) {
    if (event.key === key) apply(event.newValue === 'dark' ? 'dark' : 'light', false);
  });
  apply(current, false);
})();
