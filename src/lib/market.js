// The Fictional Underlying. Every Worked Example uses these numbers (see docs/adr/0001).

import * as bs from './bs.js';

export const RATE = 0.04;

export const ACME = Object.freeze({
  symbol: 'ACME',
  name: 'ACME Corp',
  spot: 100,
  iv: 0.30,              // at-the-money implied volatility
  q: 0.02,               // continuous dividend yield used for pricing
  dividend: 0.5,         // quarterly cash dividend per share
  multiplier: 100,
});

export const HBR = Object.freeze({
  symbol: 'HBR',
  name: 'Harbor 100 Index',
  spot: 5000,
  iv: 0.18,
  q: 0.015,
  multiplier: 100,
  style: 'european',
  settlement: 'cash',
});

/**
 * Implied volatility smile for a fictional underlying: a skewed parabola in log-moneyness,
 * flattening with time. Deterministic, so chains and examples never change.
 */
export function smileIV(u, K, T) {
  const x = Math.log(K / u.spot) / Math.sqrt(Math.max(T, 1 / 365) / 0.25);
  const skew = u.symbol === 'HBR' ? -0.55 : -0.35;
  const curve = u.symbol === 'HBR' ? 0.9 : 0.6;
  // gentle upward-sloping term structure, anchored so the 30-day ATM vol equals u.iv
  const term = 1 + (u.symbol === 'HBR' ? 0.06 : 0.04) * Math.log(Math.max(T, 1 / 365) / (30 / 365));
  return Math.max(0.05, u.iv * term * (1 + skew * x + curve * x * x));
}

/** Deterministic pseudo-random in [0,1) from a string. */
function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function tick(p) { return p < 3 ? 0.01 : 0.05; }

/**
 * Build an options chain for one expiration.
 * @returns {{dte:number, T:number, rows:{strike:number, call:object, put:object}[]}}
 */
export function chain(u = ACME, { dte = 30, strikes, spot = u.spot, r = RATE } = {}) {
  const T = dte / 365;
  const step = u === HBR ? 25 : (spot >= 50 ? 5 : 1);
  const ks = strikes || Array.from({ length: 13 }, (_, i) => Math.round(spot / step) * step + (i - 6) * step);
  const S = spot;
  const rows = ks.map((K) => {
    const sigma = smileIV({ ...u, spot: S }, K, T);
    const side = (type) => {
      const g = bs.greeks({ S, K, T, r, q: u.q, sigma, type });
      // American options (ACME) can never trade below intrinsic value; European index options can.
      if (u.style !== 'european') g.price = Math.max(g.price, bs.intrinsic({ S, K, type }));
      const half = Math.max(0.01, g.price * 0.02) + (u === HBR ? 0.2 : 0.02);
      const t = tick(g.price);
      const bid = Math.max(0, Math.floor((g.price - half) / t) * t);
      const ask = Math.ceil((g.price + half) / t) * t;
      const dist = Math.abs(Math.log(K / S));
      const seed = `${u.symbol}${dte}${K}${type}`;
      const oi = Math.round((8000 * Math.exp(-dist * 18) + 300) * (0.6 + hash01(seed) * 0.8));
      const volume = Math.round(oi * (0.05 + hash01(seed + 'v') * 0.25));
      return {
        bid: Number(bid.toFixed(2)), ask: Number(ask.toFixed(2)), mid: Number(((bid + ask) / 2).toFixed(3)),
        theo: g.price, iv: sigma, delta: g.delta, gamma: g.gamma, theta: g.theta, vega: g.vega, oi, volume,
      };
    };
    return { strike: K, call: side('call'), put: side('put') };
  });
  return { underlying: u.symbol, spot: S, dte, T, rows };
}

/** OCC option symbol, e.g. occSymbol('ACME', '2026-12-18', 'call', 105) -> 'ACME  261218C00105000' */
export function occSymbol(root, isoDate, type, strike) {
  const [y, m, d] = isoDate.split('-');
  const k = String(Math.round(strike * 1000)).padStart(8, '0');
  return root.padEnd(6, ' ') + y.slice(2) + m + d + (type === 'call' ? 'C' : 'P') + k;
}

/** The Course's fixed "today". All dates in Worked Examples count from here. */
export const TODAY = '2026-11-18';

/** Listed ACME expirations as days to expiry; monthly ones are third Fridays. */
export const EXPIRATIONS = Object.freeze([
  { dte: 2, date: '2026-11-20', type: 'monthly' },
  { dte: 9, date: '2026-11-27', type: 'weekly' },
  { dte: 30, date: '2026-12-18', type: 'monthly' },
  { dte: 58, date: '2027-01-15', type: 'monthly' },
  { dte: 121, date: '2027-03-19', type: 'monthly' },
  { dte: 212, date: '2027-06-18', type: 'monthly' },
  { dte: 394, date: '2027-12-17', type: 'LEAPS' },
]);

/** ACME's next ex-dividend date ($0.50); a call holder must exercise by the business day before (Dec 9). */
export const ACME_EX_DIVIDEND = '2026-12-10';

/** ACME's next earnings report: after the close on this date (inside the January expiration). */
export const ACME_EARNINGS = '2027-01-12';

/** ISO date `dte` calendar days after TODAY. */
export function expiryDate(dte) {
  const d = new Date(TODAY + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dte);
  return d.toISOString().slice(0, 10);
}

/** "Dec 18, 2026" */
export function longDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
