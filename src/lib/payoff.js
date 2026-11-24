// Multi-leg positions: P&L at expiration and before it, break-evens, max profit and loss.
//
// A leg is one of:
//   { kind: 'call' | 'put', qty, strike, premium, dte?, iv? }   qty in contracts, + long / − short; premium per share
//   { kind: 'stock', qty, price }                                 qty in shares, + long / − short
// P&L is in dollars for the whole position. multiplier defaults to 100.

import * as bs from './bs.js';

const M = 100;

function legValueAtExpiry(leg, S) {
  if (leg.kind === 'stock') return leg.qty * S;
  const intr = leg.kind === 'call' ? Math.max(S - leg.strike, 0) : Math.max(leg.strike - S, 0);
  return leg.qty * (leg.multiplier || M) * intr;
}

function legCost(leg) {
  if (leg.kind === 'stock') return leg.qty * leg.price;
  return leg.qty * (leg.multiplier || M) * leg.premium;
}

/** Net premium paid (positive = debit, negative = credit), options legs only. */
export function netPremium(legs) {
  return legs.filter((l) => l.kind !== 'stock').reduce((a, l) => a + legCost(l), 0);
}

/** P&L in dollars at expiration with the underlying at S. */
export function pnlAtExpiry(legs, S) {
  return legs.reduce((a, l) => a + legValueAtExpiry(l, S) - legCost(l), 0);
}

/**
 * P&L in dollars before expiration, valuing each option with Black-Scholes.
 * @param {number} daysPassed calendar days since entry
 * @param {{r?:number,q?:number,ivShift?:number}} env ivShift is added to every leg's iv (0.01 = +1 vol point)
 */
export function pnlAt(legs, S, daysPassed = 0, { r = 0.04, q = 0, ivShift = 0 } = {}) {
  return legs.reduce((a, l) => {
    if (l.kind === 'stock') return a + l.qty * (S - l.price);
    const left = Math.max((l.dte ?? 0) - daysPassed, 0);
    const v = left > 0
      ? bs.price({ S, K: l.strike, T: left / 365, r, q, sigma: Math.max(0.01, (l.iv ?? 0.3) + ivShift), type: l.kind })
      : bs.intrinsic({ S, K: l.strike, type: l.kind });
    return a + l.qty * (l.multiplier || M) * (v - l.premium);
  }, 0);
}

/** Position Greeks in dollar terms per $1 / per day / per vol point, summed over legs. */
export function positionGreeks(legs, S, daysPassed = 0, { r = 0.04, q = 0, ivShift = 0 } = {}) {
  const out = { delta: 0, gamma: 0, theta: 0, vega: 0 };
  for (const l of legs) {
    if (l.kind === 'stock') { out.delta += l.qty; continue; }
    const left = Math.max((l.dte ?? 0) - daysPassed, 0);
    if (left <= 0) continue;
    const g = bs.greeks({ S, K: l.strike, T: left / 365, r, q, sigma: Math.max(0.01, (l.iv ?? 0.3) + ivShift), type: l.kind });
    const m = l.qty * (l.multiplier || M);
    out.delta += m * g.delta; out.gamma += m * g.gamma; out.theta += m * g.theta; out.vega += m * g.vega;
  }
  return out;
}

function strikes(legs) {
  return [...new Set(legs.filter((l) => l.kind !== 'stock').map((l) => l.strike))].sort((a, b) => a - b);
}

/** Underlying prices where P&L at expiration crosses zero. */
export function breakevens(legs) {
  const ks = strikes(legs);
  const top = Math.max(...ks, ...legs.filter((l) => l.kind === 'stock').map((l) => l.price), 1) * 4;
  const pts = [0, ...ks, top];
  const out = [];
  const f = (s) => pnlAtExpiry(legs, s);
  for (let i = 0; i < pts.length - 1; i++) {
    let a = pts[i], b = pts[i + 1];
    const fa = f(a), fb = f(b);
    if (Math.abs(fa) < 1e-9 && i === 0) { if (a > 0) out.push(a); continue; }
    if (fa * fb < 0) {
      for (let k = 0; k < 200; k++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; }
      out.push(Number(((a + b) / 2).toFixed(6)));
    } else if (Math.abs(fb) < 1e-9 && i < pts.length - 2) {
      out.push(b);
    }
  }
  return [...new Set(out.map((x) => Number(x.toFixed(4))))];
}

/** Max profit and max loss at expiration. Infinity / -Infinity when unbounded. */
export function extremes(legs) {
  const ks = strikes(legs);
  const stockPx = legs.filter((l) => l.kind === 'stock').map((l) => l.price);
  const cands = [0, ...ks, ...stockPx];
  const vals = cands.map((s) => pnlAtExpiry(legs, s));
  // slope above the highest strike: calls and stock contribute
  const slope = legs.reduce((a, l) => a + (l.kind === 'stock' ? l.qty : l.kind === 'call' ? l.qty * (l.multiplier || M) : 0), 0);
  let maxProfit = Math.max(...vals), maxLoss = Math.min(...vals);
  if (slope > 1e-9) maxProfit = Infinity;
  if (slope < -1e-9) maxLoss = -Infinity;
  return { maxProfit, maxLoss };
}

/** Summary used by Lessons and the position builder. */
export function summary(legs) {
  return { netPremium: netPremium(legs), breakevens: breakevens(legs), ...extremes(legs) };
}
