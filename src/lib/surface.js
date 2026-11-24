// Volatility surface helpers: raw SVI slices and simple no-arbitrage checks.

/** Raw SVI total implied variance w(k) for log-moneyness k = ln(K/F). */
export function sviW({ a, b, rho, m, s }, k) {
  return a + b * (rho * (k - m) + Math.sqrt((k - m) ** 2 + s * s));
}

/** Implied vol from an SVI slice at log-moneyness k and maturity T. */
export function sviVol(p, k, T) {
  return Math.sqrt(Math.max(sviW(p, k), 0) / T);
}

/**
 * Butterfly-arbitrage density check (Gatheral): g(k) must stay >= 0.
 * Returns the minimum g over the grid and where it occurs.
 */
export function sviDensityCheck(p, ks) {
  let min = Infinity, at = NaN;
  for (const k of ks) {
    const h = 1e-4;
    const w = sviW(p, k);
    const w1 = (sviW(p, k + h) - sviW(p, k - h)) / (2 * h);
    const w2 = (sviW(p, k + h) - 2 * w + sviW(p, k - h)) / (h * h);
    const g = (1 - (k * w1) / (2 * w)) ** 2 - (w1 * w1 / 4) * (1 / w + 0.25) + w2 / 2;
    if (g < min) { min = g; at = k; }
  }
  return { min, at, ok: min >= -1e-9 };
}

/** Calendar-arbitrage check: total variance must not decrease with maturity at any k. */
export function calendarCheck(slices, ks) {
  // slices: [{T, params}] sorted by T
  const bad = [];
  for (let i = 1; i < slices.length; i++) {
    for (const k of ks) {
      if (sviW(slices[i].params, k) < sviW(slices[i - 1].params, k) - 1e-12) bad.push({ k, T: slices[i].T });
    }
  }
  return { ok: bad.length === 0, violations: bad };
}
