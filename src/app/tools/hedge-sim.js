// Delta-hedging simulator: hedge an option along seeded GBM paths; P&L tracks realized minus implied vol.
import { bs, sim, ACME, usd, signedUsd, num, pct } from '../lib/index.js';
import { lineChart, barChart } from '../charts.js';
import { h, slider, seg, stat, frame, signCls } from './ui.js';

const PER_DAY = 4; // simulation steps per calendar day
const HEDGE = { none: Infinity, weekly: 7 * PER_DAY, daily: PER_DAY, intraday: 1 };

export function mount(el, cfg) {
  const s = {
    K: cfg.K ?? 100, dte: cfg.dte ?? 30, iv: cfg.iv ?? 0.3, realized: cfg.realized ?? 0.3,
    hedge: cfg.hedge ?? 'daily', side: cfg.side ?? 'long', seed: cfg.seed ?? 7,
  };
  const S0 = ACME.spot, r = 0, contracts = 1;
  const st = { pnl: stat('Final P&L (1 contract)'), rv: stat('Realized vol of this path'), exp: stat('Vol-gap estimate'), trades: stat('Hedge trades') };
  const pathBox = h('div'), pnlBox = h('div'), distBox = h('div');
  const distNote = h('p', { class: 'tool-note' });
  const run = () => { update(); };
  el.replaceChildren(frame(cfg.title || 'Delta-hedging simulator', `${s.side === 'long' ? 'Long' : 'Short'} ATM call on ACME, hedged with stock`,
    h('div', { class: 'tool-body' },
      h('div', { style: 'min-width:0;display:flex;flex-direction:column;gap:14px' },
        h('div', { class: 'stats', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr))' }, Object.values(st).map((x) => x.node)),
        h('div', { class: 'tool-kind' }, 'ACME price path'), pathBox, h('div', { class: 'tool-kind' }, 'Hedged P&L, option plus stock'), pnlBox, h('div', { class: 'tool-kind' }, 'Final P&L across 200 paths'), distBox, distNote),
      h('div', { class: 'controls' },
        seg('Position', [['long', 'Long call'], ['short', 'Short call']], s.side, (v) => { s.side = v; run(); }),
        seg('Hedge', [['none', 'Never'], ['weekly', 'Weekly'], ['daily', 'Daily'], ['intraday', '4× a day']], s.hedge, (v) => { s.hedge = v; run(); }),
        slider({ label: 'Implied vol (price paid)', min: 0.1, max: 0.8, step: 0.01, value: s.iv, fmt: (v) => pct(v, 0), onInput: (v) => { s.iv = v; run(); } }),
        slider({ label: 'Realized vol (how the stock moves)', min: 0.1, max: 0.8, step: 0.01, value: s.realized, fmt: (v) => pct(v, 0), onInput: (v) => { s.realized = v; run(); } }),
        slider({ label: 'Days to expiration', min: 5, max: 90, step: 1, value: s.dte, fmt: (v) => `${v} d`, onInput: (v) => { s.dte = v; run(); } }),
        h('button', { class: 'btn small', type: 'button', onclick: () => { s.seed += 1; run(); } }, 'New price path'))),
    h('p', { class: 'tool-note' }, 'The stock follows a random path with the realized volatility you set (seeded, so a path can be replayed). The call is bought or sold at the implied volatility and re-hedged to delta-neutral on the schedule you choose. With no interest rate and no dividend, hedged P&L comes from the gap between realized and implied volatility, plus noise from hedging only at intervals.')));
  const pathChart = lineChart(pathBox, { x: { min: 0, max: 1 }, y: {}, series: [], height: 180 });
  const pnlChart = lineChart(pnlBox, { x: { min: 0, max: 1 }, y: {}, series: [], height: 200 });
  const dist = barChart(distBox, { bars: [{ label: '', value: 0 }], height: 180 });

  function one(seed) {
    const T = s.dte / 365, steps = s.dte * PER_DAY;
    const path = sim.gbmPath({ S0, sigma: s.realized, T, steps, seed });
    const qty = (s.side === 'long' ? 1 : -1) * 100 * contracts;
    const res = sim.deltaHedge({ path, K: s.K, T, r, q: 0, iv: s.iv, type: 'call', qty, hedgeEvery: Math.min(HEDGE[s.hedge], steps + 1) });
    return { path, res };
  }

  function update() {
    const { path, res } = one(s.seed);
    const days = (i) => i / PER_DAY;
    pathChart.update({
      x: { min: 0, max: s.dte, fmt: (v) => `day ${num(v, 0)}` },
      y: { fmt: (v) => '$' + num(v, 0) },
      tipY: (v) => usd(v),
      series: [{ name: 'ACME', color: 'var(--ink-2)', points: path.map((p, i) => [days(i), p]) }],
      ariaLabel: 'Simulated ACME price path',
    });
    pnlChart.update({
      x: { min: 0, max: s.dte, fmt: (v) => `day ${num(v, 0)}` },
      y: { fmt: (v) => usd(v, 0), includeZero: true },
      tipY: (v) => signedUsd(v),
      series: [{ name: 'Hedged P&L', color: 'var(--accent)', points: res.records.map((x) => [days(x.i), x.pnl]) }],
      pnlFill: 0,
      ariaLabel: 'Cumulative hedged profit and loss',
    });
    const g = bs.greeks({ S: S0, K: s.K, T: s.dte / 365, r, q: 0, sigma: s.iv, type: 'call' });
    const sign = s.side === 'long' ? 1 : -1;
    const estimate = sign * 100 * g.annual.vega * (res.realizedVol - s.iv);
    st.pnl.set(signedUsd(res.pnl), signCls(res.pnl));
    st.rv.set(pct(res.realizedVol));
    st.exp.set(signedUsd(estimate), signCls(estimate));
    let trades = 0;
    for (let i = 1; i < res.records.length; i++) if (Math.abs(res.records[i].shares - res.records[i - 1].shares) > 1e-9) trades++;
    st.trades.set(String(trades));

    // distribution over 200 paths
    const N = 200, pnls = [];
    for (let k = 0; k < N; k++) pnls.push(one(10000 + k).res.pnl);
    const lo = Math.min(...pnls), hi = Math.max(...pnls);
    const bins = 16, w = (hi - lo) / bins || 1;
    const counts = Array(bins).fill(0);
    for (const p of pnls) counts[Math.min(bins - 1, Math.floor((p - lo) / w))]++;
    dist.update({
      bars: counts.map((c, i) => {
        const mid = lo + (i + 0.5) * w;
        return { label: usd(mid, 0), value: c, color: mid >= 0 ? 'var(--gain)' : 'var(--loss)', series: 'paths', extra: `${usd(lo + i * w, 0)} to ${usd(lo + (i + 1) * w, 0)}` };
      }),
      y: { fmt: (v) => num(v, 0) }, xLabel: 'Final P&L across 200 paths', ariaLabel: 'Distribution of hedged P&L',
    });
    const mean = pnls.reduce((a, b) => a + b, 0) / N;
    const sd = Math.sqrt(pnls.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1));
    distNote.textContent = `Across 200 paths: average ${signedUsd(mean)}, standard deviation ${usd(sd)}. Hedge more often and the spread narrows; move realized vol away from implied and the average moves with it.`;
  }
  update();
}
