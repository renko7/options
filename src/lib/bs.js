// Black-Scholes-Merton pricing with a continuous dividend yield.
// Inputs: S spot, K strike, T years, r rate, q yield, sigma vol (all decimals), type 'call' | 'put'.
// Greek units (what traders quote): delta per $1, gamma per $1, theta per CALENDAR DAY,
// vega per 1 vol point (0.01), rho per 1 rate point (0.01). Raw annual values are in *.annual.

import { pdf, cdf } from './normal.js';

function check({ S, K, T, sigma, type }) {
  if (!(S > 0) || !(K > 0)) throw new Error('bs: S and K must be positive');
  if (!(T >= 0)) throw new Error('bs: T must be >= 0');
  if (!(sigma > 0)) throw new Error('bs: sigma must be positive');
  if (type !== 'call' && type !== 'put') throw new Error(`bs: type must be 'call' or 'put', got ${type}`);
}

export function d1d2({ S, K, T, r = 0, q = 0, sigma }) {
  const v = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + sigma * sigma / 2) * T) / v;
  return { d1, d2: d1 - v };
}

export function intrinsic({ S, K, type }) {
  return type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
}

/** Option price per share. */
export function price(o) {
  check(o);
  const { S, K, T, r = 0, q = 0, type } = o;
  if (T === 0) return intrinsic(o);
  const { d1, d2 } = d1d2(o);
  const dq = Math.exp(-q * T), dr = Math.exp(-r * T);
  return type === 'call'
    ? S * dq * cdf(d1) - K * dr * cdf(d2)
    : K * dr * cdf(-d2) - S * dq * cdf(-d1);
}

/** Full set of Greeks, first and higher order. */
export function greeks(o) {
  check(o);
  const { S, K, T, r = 0, q = 0, sigma, type } = o;
  const p = price(o);
  if (T === 0) {
    const itm = type === 'call' ? S > K : S < K;
    const delta = itm ? (type === 'call' ? 1 : -1) : 0;
    return { price: p, delta, gamma: 0, theta: 0, vega: 0, rho: 0, vanna: 0, volga: 0, charm: 0, speed: 0, d1: NaN, d2: NaN, annual: { theta: 0, vega: 0, rho: 0 } };
  }
  const { d1, d2 } = d1d2(o);
  const sqT = Math.sqrt(T);
  const dq = Math.exp(-q * T), dr = Math.exp(-r * T);
  const nd1 = pdf(d1);
  const call = type === 'call';
  const delta = call ? dq * cdf(d1) : -dq * cdf(-d1);
  const gamma = dq * nd1 / (S * sigma * sqT);
  const vegaA = S * dq * nd1 * sqT;
  const thetaA = call
    ? -S * dq * nd1 * sigma / (2 * sqT) - r * K * dr * cdf(d2) + q * S * dq * cdf(d1)
    : -S * dq * nd1 * sigma / (2 * sqT) + r * K * dr * cdf(-d2) - q * S * dq * cdf(-d1);
  const rhoA = call ? K * T * dr * cdf(d2) : -K * T * dr * cdf(-d2);
  const vanna = -dq * nd1 * d2 / sigma;               // d(delta)/d(sigma), per 1.00 vol
  const volga = vegaA * d1 * d2 / sigma;              // d(vega)/d(sigma), per 1.00 vol
  const common = dq * nd1 * (2 * (r - q) * T - d2 * sigma * sqT) / (2 * T * sigma * sqT);
  const charmA = call ? q * dq * cdf(d1) - common : -q * dq * cdf(-d1) - common; // -d(delta)/dT per year
  const speed = -gamma / S * (d1 / (sigma * sqT) + 1);
  return {
    price: p, delta, gamma,
    theta: thetaA / 365, vega: vegaA / 100, rho: rhoA / 100,
    vanna, volga, charm: charmA / 365, speed, d1, d2,
    annual: { theta: thetaA, vega: vegaA, rho: rhoA, charm: charmA },
  };
}

/** Implied volatility from a price. Newton with bisection fallback. Returns NaN if no solution. */
export function impliedVol({ price: target, S, K, T, r = 0, q = 0, type }) {
  const lower = type === 'call'
    ? Math.max(S * Math.exp(-q * T) - K * Math.exp(-r * T), 0)
    : Math.max(K * Math.exp(-r * T) - S * Math.exp(-q * T), 0);
  const upper = type === 'call' ? S * Math.exp(-q * T) : K * Math.exp(-r * T);
  if (!(T > 0) || target < lower - 1e-12 || target > upper + 1e-12) return NaN;
  let lo = 1e-6, hi = 5, s = 0.3;
  for (let i = 0; i < 100; i++) {
    const g = greeks({ S, K, T, r, q, sigma: s, type });
    const diff = g.price - target;
    if (Math.abs(diff) < 1e-10) return s;
    if (diff > 0) hi = s; else lo = s;
    const vega = g.annual.vega;
    let next = vega > 1e-10 ? s - diff / vega : NaN;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    s = next;
  }
  return s;
}

/** Probability (risk-neutral) that the option finishes in the money: N(d2) for calls, N(-d2) for puts. */
export function probITM(o) {
  if (o.T === 0) return intrinsic(o) > 0 ? 1 : 0;
  const { d2 } = d1d2(o);
  return o.type === 'call' ? cdf(d2) : cdf(-d2);
}

/** Forward price. */
export function forward({ S, T, r = 0, q = 0 }) {
  return S * Math.exp((r - q) * T);
}
