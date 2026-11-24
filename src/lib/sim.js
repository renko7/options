// Seeded random paths and a delta-hedging simulator.

import * as bs from './bs.js';

/** Seeded uniform RNG (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded standard normal generator (Box-Muller). */
export function normals(seed = 1) {
  const u = rng(seed);
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let a = 0; while (a === 0) a = u();
    const b = u();
    const m = Math.sqrt(-2 * Math.log(a));
    spare = m * Math.sin(2 * Math.PI * b);
    return m * Math.cos(2 * Math.PI * b);
  };
}

/** Geometric Brownian motion path with `steps` steps over T years. Returns steps+1 prices. */
export function gbmPath({ S0, mu = 0, sigma, T, steps, seed = 1 }) {
  const z = normals(seed);
  const dt = T / steps;
  const out = [S0];
  let s = S0;
  for (let i = 0; i < steps; i++) {
    s *= Math.exp((mu - sigma * sigma / 2) * dt + sigma * Math.sqrt(dt) * z());
    out.push(s);
  }
  return out;
}

/**
 * Delta-hedge an option position along a path.
 * The trader holds `qty` options (+ long, − short; 1 = one option on one share), priced and
 * hedged at implied vol `iv`, rebalancing every `hedgeEvery` steps. Cash earns r.
 * Returns per-step records and the final P&L, plus the realized volatility of the path.
 */
export function deltaHedge({ path, K, T, r = 0, q = 0, iv, type = 'call', qty = 1, hedgeEvery = 1 }) {
  const steps = path.length - 1;
  const dt = T / steps;
  const t0 = { S: path[0], K, T, r, q, sigma: iv, type };
  let optVal = bs.price(t0);
  let shares = -qty * bs.greeks(t0).delta;
  let cash = -qty * optVal - shares * path[0];
  const rec = [{ i: 0, S: path[0], shares, cash, pnl: 0, optVal }];
  for (let i = 1; i <= steps; i++) {
    const S = path[i];
    const tLeft = T - i * dt;
    cash *= Math.exp(r * dt);
    cash += shares * S * (Math.exp(q * dt) - 1); // dividends on shares held
    const o = { S, K, T: Math.max(tLeft, 0), r, q, sigma: iv, type };
    optVal = tLeft > 1e-12 ? bs.price(o) : bs.intrinsic(o);
    if (i < steps && i % hedgeEvery === 0) {
      const target = -qty * bs.greeks(o).delta;
      cash -= (target - shares) * S;
      shares = target;
    }
    const pnl = cash + shares * S + qty * optVal;
    rec.push({ i, S, shares, cash, pnl, optVal });
  }
  let sum = 0;
  for (let i = 1; i <= steps; i++) { const x = Math.log(path[i] / path[i - 1]); sum += x * x; }
  const realizedVol = Math.sqrt(sum / T);
  return { records: rec, pnl: rec[rec.length - 1].pnl, realizedVol };
}
