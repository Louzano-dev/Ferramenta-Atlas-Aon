function AtlasEarthOrbit() {
  // Place the marker on the quadratic curve rather than guessing its height.
  const t = .8, u = 1 - t;
  const x = u * u * -20 + 2 * u * t * 190 + t * t * 410;
  const y = u * u * 360 + 2 * u * t * 238 + t * t * 232;
  return rce(React.Fragment, null,
    rce('svg', {className:'ac-earth-orbit', viewBox:'0 0 395 677', preserveAspectRatio:'none', 'aria-hidden':true},
      rce('path', {d:'M-20 360 Q190 238 410 232', fill:'none', stroke:'#EB0017', strokeWidth:1.6})),
    rce('span', {className:'ac-orbit-marker', 'aria-hidden':true, style:{left:(x / 395 * 100) + '%', top:(y / 677 * 100) + '%'}}));
}
