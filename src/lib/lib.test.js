import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as normal from './normal.js';
import * as bs from './bs.js';
import * as binomial from './binomial.js';
import * as payoff from './payoff.js';
import * as sim from './sim.js';
import * as varswap from './varswap.js';
import * as surface from './surface.js';
import * as fmt from './fmt.js';
import { ACME, HBR, RATE, chain, occSymbol, smileIV } from './market.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b}, got ${a} (tol ${tol})`);

test('normal cdf matches reference values', () => {
  close(normal.cdf(0), 0.5, 1e-15);
  close(normal.cdf(1), 0.8413447460685429, 1e-13);
  close(normal.cdf(1.96), 0.9750021048517795, 1e-13);
  close(normal.cdf(-2.5), 0.006209665325776132, 1e-14);
  close(normal.cdf(8), 1 - 6.22096057427178e-16, 1e-15);
});

test('inverse normal round-trips', () => {
  for (const p of [1e-8, 0.001, 0.025, 0.3, 0.5, 0.8, 0.975, 0.9999]) close(normal.cdf(normal.inv(p)), p, 1e-12 + p * 1e-10);
});

test('Black-Scholes matches Hull textbook values', () => {
  // Hull: S=42 K=40 r=10% sigma=20% T=0.5 -> c=4.76, p=0.81
  close(bs.price({ S: 42, K: 40, T: 0.5, r: 0.1, sigma: 0.2, type: 'call' }), 4.7594, 1e-4);
  close(bs.price({ S: 42, K: 40, T: 0.5, r: 0.1, sigma: 0.2, type: 'put' }), 0.8086, 1e-4);
  close(bs.price({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, type: 'call' }), 10.450583572185565, 1e-10);
  close(bs.price({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, type: 'put' }), 5.573526022256971, 1e-10);
});

test('put-call parity holds with dividends', () => {
  for (const K of [70, 95, 100, 130]) {
    const o = { S: 100, K, T: 0.4, r: RATE, q: ACME.q, sigma: 0.3 };
    const c = bs.price({ ...o, type: 'call' }), p = bs.price({ ...o, type: 'put' });
    close(c - p, 100 * Math.exp(-ACME.q * 0.4) - K * Math.exp(-RATE * 0.4), 1e-10, `K=${K}`);
  }
});

test('analytic Greeks agree with finite differences', () => {
  for (const type of ['call', 'put']) {
    const o = { S: 103, K: 100, T: 0.3, r: 0.04, q: 0.02, sigma: 0.27, type };
    const g = bs.greeks(o);
    const h = 1e-3;
    const P = (d) => bs.price({ ...o, ...d });
    close(g.delta, (P({ S: o.S + h }) - P({ S: o.S - h })) / (2 * h), 1e-6, `${type} delta`);
    close(g.gamma, (P({ S: o.S + h }) - 2 * P({}) + P({ S: o.S - h })) / (h * h), 1e-4, `${type} gamma`);
    close(g.annual.vega, (P({ sigma: o.sigma + h }) - P({ sigma: o.sigma - h })) / (2 * h), 1e-5, `${type} vega`);
    close(g.annual.theta, -(P({ T: o.T + h }) - P({ T: o.T - h })) / (2 * h), 1e-4, `${type} theta`);
    close(g.annual.rho, (P({ r: o.r + h }) - P({ r: o.r - h })) / (2 * h), 1e-5, `${type} rho`);
    const D = (d) => bs.greeks({ ...o, ...d }).delta;
    close(g.vanna, (D({ sigma: o.sigma + h }) - D({ sigma: o.sigma - h })) / (2 * h), 1e-5, `${type} vanna`);
    close(g.annual.charm, -(D({ T: o.T + h }) - D({ T: o.T - h })) / (2 * h), 1e-4, `${type} charm`);
    const V = (d) => bs.greeks({ ...o, ...d }).annual.vega;
    close(g.volga, (V({ sigma: o.sigma + h }) - V({ sigma: o.sigma - h })) / (2 * h), 1e-3, `${type} volga`);
    const G = (d) => bs.greeks({ ...o, ...d }).gamma;
    close(g.speed, (G({ S: o.S + h }) - G({ S: o.S - h })) / (2 * h), 1e-6, `${type} speed`);
  }
});

test('implied vol recovers the input vol', () => {
  for (const sigma of [0.05, 0.3, 1.2]) for (const K of [60, 100, 150]) for (const type of ['call', 'put']) {
    const o = { S: 100, K, T: 0.25, r: 0.04, q: 0.02, type };
    const price = bs.price({ ...o, sigma });
    if (price < 1e-6) continue;
    const iv = bs.impliedVol({ ...o, price });
    // where vega is negligible the vol is not identifiable; the recovered vol must still reprice
    close(bs.price({ ...o, sigma: iv }), price, 1e-8, `${type} K=${K} sigma=${sigma}`);
    if (bs.greeks({ ...o, sigma }).vega > 1e-3) close(iv, sigma, 1e-6, `${type} K=${K} sigma=${sigma}`);
  }
  assert.ok(Number.isNaN(bs.impliedVol({ price: 200, S: 100, K: 100, T: 0.25, r: 0, type: 'call' })));
});

test('binomial converges to Black-Scholes for European options', () => {
  const o = { S: 100, K: 105, T: 0.5, r: 0.04, q: 0.02, sigma: 0.3 };
  for (const type of ['call', 'put']) close(binomial.price({ ...o, type, steps: 2000 }).price, bs.price({ ...o, type }), 2e-3, type);
});

test('American put is worth more than European; American call without dividends equals European', () => {
  const o = { S: 100, K: 110, T: 1, r: 0.08, sigma: 0.25, steps: 500 };
  assert.ok(binomial.price({ ...o, type: 'put', american: true }).price > binomial.price({ ...o, type: 'put' }).price + 0.1);
  close(binomial.price({ ...o, type: 'call', american: true }).price, binomial.price({ ...o, type: 'call' }).price, 1e-9);
});

test('American call with a large dividend shows early exercise', () => {
  const o = { S: 100, K: 80, T: 0.25, r: 0.04, sigma: 0.2, type: 'call', steps: 300, dividends: [{ t: 0.1, amount: 5 }] };
  assert.ok(binomial.price({ ...o, american: true }).price > binomial.price(o).price + 0.5);
});

test('payoff: long call', () => {
  const legs = [{ kind: 'call', qty: 1, strike: 100, premium: 3 }];
  assert.equal(payoff.pnlAtExpiry(legs, 90), -300);
  assert.equal(payoff.pnlAtExpiry(legs, 110), 700);
  assert.deepEqual(payoff.breakevens(legs), [103]);
  const e = payoff.extremes(legs);
  assert.equal(e.maxProfit, Infinity); assert.equal(e.maxLoss, -300);
});

test('payoff: iron condor', () => {
  const legs = [
    { kind: 'put', qty: 1, strike: 85, premium: 0.5 }, { kind: 'put', qty: -1, strike: 90, premium: 1.2 },
    { kind: 'call', qty: -1, strike: 110, premium: 1.1 }, { kind: 'call', qty: 1, strike: 115, premium: 0.4 },
  ];
  const s = payoff.summary(legs);
  close(s.netPremium, -140, 1e-9);
  close(s.maxProfit, 140, 1e-9); close(s.maxLoss, -360, 1e-9);
  assert.deepEqual(s.breakevens, [88.6, 111.4]);
});

test('payoff: covered call and short put have bounded upside, short call unbounded loss', () => {
  const cc = [{ kind: 'stock', qty: 100, price: 100 }, { kind: 'call', qty: -1, strike: 105, premium: 2 }];
  const e = payoff.extremes(cc);
  close(e.maxProfit, 700, 1e-9); close(e.maxLoss, -9800, 1e-9);
  assert.deepEqual(payoff.breakevens(cc), [98]);
  assert.equal(payoff.extremes([{ kind: 'call', qty: -1, strike: 100, premium: 3 }]).maxLoss, -Infinity);
});

test('payoff: P&L before expiry at entry is zero when premiums are BS values', () => {
  const sigma = 0.3, dte = 45;
  const prem = bs.price({ S: 100, K: 105, T: dte / 365, r: 0.04, q: 0, sigma, type: 'call' });
  const legs = [{ kind: 'call', qty: 2, strike: 105, premium: prem, dte, iv: sigma }];
  close(payoff.pnlAt(legs, 100, 0, { r: 0.04 }), 0, 1e-9);
  close(payoff.positionGreeks(legs, 100, 0, { r: 0.04 }).delta, 200 * bs.greeks({ S: 100, K: 105, T: dte / 365, r: 0.04, sigma, type: 'call' }).delta, 1e-9);
});

test('delta hedging at implied = realized vol has small P&L; long gamma profits when realized > implied', () => {
  const T = 0.25, steps = 252;
  const results = (realized, iv) => {
    let total = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const path = sim.gbmPath({ S0: 100, sigma: realized, T, steps, seed });
      total += sim.deltaHedge({ path, K: 100, T, r: 0, iv, qty: 1 }).pnl;
    }
    return total / 60;
  };
  assert.ok(Math.abs(results(0.3, 0.3)) < 0.15);
  assert.ok(results(0.4, 0.3) > 1);
  assert.ok(results(0.2, 0.3) < -1);
});

test('variance-swap replication recovers flat volatility', () => {
  const T = 30 / 365, r = 0.04, sigma = 0.25, S = 100;
  const quotes = [];
  for (let K = 40; K <= 220; K += 1) quotes.push({
    strike: K,
    call: bs.price({ S, K, T, r, sigma, type: 'call' }),
    put: bs.price({ S, K, T, r, sigma, type: 'put' }),
  });
  const res = varswap.fairVariance(quotes, { T, r });
  close(res.vol, sigma, 2e-3);
});

test('SVI checks', () => {
  const p = { a: 0.02, b: 0.1, rho: -0.4, m: 0, s: 0.2 };
  const ks = Array.from({ length: 41 }, (_, i) => -1 + i * 0.05);
  assert.ok(surface.sviDensityCheck(p, ks).ok);
  assert.ok(surface.calendarCheck([{ T: 0.1, params: p }, { T: 0.5, params: { ...p, a: 0.05 } }], ks).ok);
  assert.ok(!surface.calendarCheck([{ T: 0.1, params: p }, { T: 0.5, params: { ...p, a: 0.0 } }], ks).ok);
});

test('chain is deterministic, has sane quotes and obeys parity on theo values', () => {
  const a = chain(ACME, { dte: 30 }), b = chain(ACME, { dte: 30 });
  assert.deepEqual(a, b);
  for (const row of a.rows) {
    for (const side of ['call', 'put']) {
      assert.ok(row[side].bid <= row[side].theo && row[side].theo <= row[side].ask, `${row.strike} ${side}`);
    }
  }
  assert.equal(a.rows.length, 13);
  assert.equal(chain(HBR, { dte: 7 }).rows[6].strike, 5000);
});

test('smile is anchored: 30-day ATM vol equals the documented vol', () => {
  close(smileIV(ACME, 100, 30 / 365), 0.30, 1e-12);
  close(smileIV(HBR, 5000, 30 / 365), 0.18, 1e-12);
  assert.ok(smileIV(ACME, 100, 1) > smileIV(ACME, 100, 30 / 365));
});

test('OCC symbol', () => {
  assert.equal(occSymbol('ACME', '2026-12-18', 'call', 105), 'ACME  261218C00105000');
  assert.equal(occSymbol('HBR', '2027-01-15', 'put', 4987.5), 'HBR   270115P04987500');
});

test('formatting', () => {
  assert.equal(fmt.usd(1234.5), '$1,234.50');
  assert.equal(fmt.usd(-3), '−$3.00');
  assert.equal(fmt.usd(Infinity), 'unlimited');
  assert.equal(fmt.pct(0.3), '30.0%');
  assert.equal(fmt.signedUsd(12), '+$12.00');
  assert.equal(fmt.signed(-0.5234), '−0.52');
});
