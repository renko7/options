// Volatility surface: smiles across expirations, ATM term structure, and an SVI slice with an arbitrage check.
import { ACME, HBR, RATE, EXPIRATIONS, smileIV, surface, bs, num, pct, usd, int } from '../lib/index.js';
import { lineChart } from '../charts.js';
import { h, slider, seg, stat, frame } from './ui.js';

const COLORS = ['var(--call)', 'var(--put)', 'var(--series-3)', 'var(--series-4)'];

export function mount(el, cfg) {
  let u = cfg.underlying === 'HBR' ? HBR : ACME;
  let view = cfg.view ?? 'smile';
  let xAxis = 'strike';
  const svi = { a: 0.004, b: 0.06, rho: -0.5, m: 0.02, s: 0.12, T: 30 / 365 };
  const chartBox = h('div');
  const sviCtl = h('div', { class: 'controls' });
  const st = { check: stat('Butterfly-arbitrage check', true), atm: stat('ATM vol') };
  const extra = h('div', { class: 'stats' }, st.check.node, st.atm.node);
  const ctlTop = h('div', { class: 'controls' },
    seg('Underlying', [['ACME', 'ACME'], ['HBR', 'HBR']], u.symbol, (v) => { u = v === 'HBR' ? HBR : ACME; update(); }),
    seg('View', [['smile', 'Smiles'], ['term', 'Term structure'], ['svi', 'SVI fit']], view, (v) => { view = v; update(); }),
    seg('Smile x-axis', [['strike', 'Strike'], ['moneyness', 'ln(K/F)']], xAxis, (v) => { xAxis = v; update(); }));
  const sl = (key, label, min, max, step, fmt) => slider({ label, min, max, step, value: svi[key], fmt, onInput: (v) => { svi[key] = v; update(); } });
  sviCtl.append(
    sl('a', 'a (level)', -0.02, 0.05, 0.001, (v) => num(v, 3)),
    sl('b', 'b (wing slope)', 0, 0.3, 0.005, (v) => num(v, 3)),
    sl('rho', 'ρ (skew)', -0.95, 0.95, 0.01, (v) => num(v, 2)),
    sl('m', 'm (shift)', -0.3, 0.3, 0.005, (v) => num(v, 3)),
    sl('s', 'σ (ATM curvature)', 0.01, 0.5, 0.005, (v) => num(v, 3)));
  el.replaceChildren(frame(cfg.title || 'Volatility surface', 'Implied volatility', h('div', { class: 'tool-body' }, h('div', { style: 'min-width:0' }, chartBox), h('div', { class: 'controls' }, ctlTop, sviCtl, extra)),
    h('p', { class: 'tool-note' }, 'Smiles and term structure use the same implied volatilities as the chain Tool. In the SVI view, total variance w(k) = a + b(ρ(k − m) + √((k − m)² + σ²)) is drawn as implied vol for a 30-day slice; the check fails when the implied density would go negative.')));
  const chart = lineChart(chartBox, { x: { min: 0, max: 1 }, y: {}, series: [], height: 320 });

  function update() {
    sviCtl.hidden = view !== 'svi';
    extra.hidden = view !== 'svi';
    ctlTop.children[2].hidden = view !== 'smile';
    if (view === 'smile') {
      const dtes = u === HBR ? [2, 30, 121, 394] : [9, 30, 121, 394];
      const lo = u.spot * 0.7, hi = u.spot * 1.3;
      const ks = Array.from({ length: 121 }, (_, i) => lo + (hi - lo) * i / 120);
      const fwd = (T) => bs.forward({ S: u.spot, T, r: RATE, q: u.q });
      chart.update({
        x: xAxis === 'strike'
          ? { min: lo, max: hi, fmt: (v) => (u === HBR ? int(v) : '$' + num(v, 0)), label: 'Strike' }
          : { min: Math.log(0.7), max: Math.log(1.3), fmt: (v) => num(v, 2), label: 'Log-moneyness ln(K/F)' },
        y: { fmt: (v) => pct(v, 0), label: 'Implied volatility' },
        tipY: (v) => pct(v),
        series: dtes.map((d, i) => {
          const T = d / 365;
          return { name: `${d} days`, color: COLORS[i], points: ks.map((K) => [xAxis === 'strike' ? K : Math.log(K / fwd(T)), smileIV(u, K, T)]) };
        }),
        markers: xAxis === 'strike' ? [{ x: u.spot, label: `Spot ${u === HBR ? int(u.spot) : usd(u.spot, 0)}` }] : [{ x: 0, label: 'Forward' }],
        legend: true, ariaLabel: 'Implied volatility smiles by expiration',
      });
    } else if (view === 'term') {
      const ds = Array.from({ length: 79 }, (_, i) => 2 + i * 5);
      const lines = [['ATM', 1], ['10% below spot', 0.9], ['10% above spot', 1.1]];
      chart.update({
        x: { min: 2, max: 392, fmt: (v) => `${num(v, 0)} d`, label: 'Days to expiration' },
        y: { fmt: (v) => pct(v, 0), label: 'Implied volatility' },
        tipY: (v) => pct(v),
        series: lines.map(([name, m], i) => ({ name: `Strike ${name}`, color: COLORS[i], points: ds.map((d) => [d, smileIV(u, u.spot * m, d / 365)]) })),
        markers: (u === HBR ? [] : EXPIRATIONS).map((e) => ({ x: e.dte })), legend: true,
        ariaLabel: 'Implied volatility term structure',
      });
    } else {
      const ks = Array.from({ length: 161 }, (_, i) => -0.8 + i * 0.01);
      const check = surface.sviDensityCheck(svi, ks);
      const mkt = ks.map((k) => [k, smileIV(u, u.spot * Math.exp(k), svi.T)]);
      chart.update({
        x: { min: -0.8, max: 0.8, fmt: (v) => num(v, 1), label: 'Log-moneyness k = ln(K/F)' },
        y: { fmt: (v) => pct(v, 0), label: 'Implied volatility (30 days)' },
        tipY: (v) => pct(v),
        series: [
          { name: 'SVI slice', color: 'var(--accent)', points: ks.map((k) => [k, surface.sviVol(svi, k, svi.T)]) },
          { name: `${u.symbol} 30-day smile`, color: 'var(--ink-2)', dash: true, points: mkt },
        ],
        markers: [{ x: 0, label: 'Forward' }], legend: true, ariaLabel: 'SVI implied volatility slice',
      });
      st.check.set(check.ok ? 'Passes: implied density is non-negative everywhere' : `Fails near k = ${num(check.at, 2)}: this smile allows a butterfly arbitrage`, check.ok ? 'pos' : 'neg');
      st.atm.set(pct(surface.sviVol(svi, 0, svi.T)));
    }
  }
  update();
}
