// Greeks explorer: one Greek across stock prices for up to three expirations, or across time for ITM/ATM/OTM.
import { bs, RATE, ACME, usd, num, pct } from '../lib/index.js';
import { lineChart } from '../charts.js';
import { h, slider, seg, frame } from './ui.js';

const GREEKS = {
  price: { label: 'Price', unit: '$ per share', get: (g) => g.price, fmt: (v) => usd(v) },
  delta: { label: 'Delta', unit: 'per $1 move', get: (g) => g.delta, fmt: (v) => num(v, 3) },
  gamma: { label: 'Gamma', unit: 'delta change per $1', get: (g) => g.gamma, fmt: (v) => num(v, 4) },
  theta: { label: 'Theta', unit: '$ per share per day', get: (g) => g.theta, fmt: (v) => num(v, 3) },
  vega: { label: 'Vega', unit: '$ per share per vol point', get: (g) => g.vega, fmt: (v) => num(v, 3) },
};
const COLORS = ['var(--call)', 'var(--put)', 'var(--series-3)'];

export function mount(el, cfg) {
  const s = {
    greek: cfg.greek ?? 'delta', type: cfg.type ?? 'call', K: cfg.K ?? 100, iv: cfg.iv ?? ACME.iv,
    dtes: (cfg.dtes ?? [7, 30, 90]).slice(0, 3), x: cfg.x ?? 'spot', S: cfg.S ?? ACME.spot,
  };
  const r = cfg.r ?? RATE, q = cfg.q ?? ACME.q;
  const chartBox = h('div');
  const dteSliders = s.dtes.map((d, i) => slider({ label: `Expiration ${i + 1}`, min: 1, max: 365, step: 1, value: d, fmt: (v) => `${v} d`, onInput: (v) => { s.dtes[i] = v; update(); } }));
  const spotSlider = slider({ label: 'Stock price (time view)', min: Math.round(s.K * 0.7), max: Math.round(s.K * 1.3), step: 0.5, value: s.S, fmt: (v) => usd(v), onInput: (v) => { s.S = v; update(); } });
  const controls = h('div', { class: 'controls' },
    seg('Greek', Object.entries(GREEKS).map(([k, g]) => [k, g.label]), s.greek, (v) => { s.greek = v; update(); }),
    seg('Option', [['call', 'Call'], ['put', 'Put']], s.type, (v) => { s.type = v; update(); }),
    seg('Plot against', [['spot', 'Stock price'], ['dte', 'Days left']], s.x, (v) => { s.x = v; update(); }),
    slider({ label: 'Implied volatility', min: 0.05, max: 1, step: 0.01, value: s.iv, fmt: (v) => pct(v, 0), onInput: (v) => { s.iv = v; update(); } }),
    ...dteSliders, spotSlider);
  el.replaceChildren(frame(cfg.title || 'Greeks explorer', `Strike ${usd(s.K, 0)}`, h('div', { class: 'tool-body' }, h('div', { style: 'min-width:0' }, chartBox), controls),
    h('p', { class: 'tool-note' }, 'Per share, for one option. Multiply by 100 for one contract.')));
  const chart = lineChart(chartBox, { x: { min: 0, max: 1 }, y: {}, series: [], height: 300 });

  function update() {
    const G = GREEKS[s.greek];
    dteSliders.forEach((d) => (d.hidden = s.x !== 'spot'));
    spotSlider.hidden = s.x !== 'dte';
    if (s.x === 'spot') {
      const lo = s.K * 0.6, hi = s.K * 1.4;
      const xs = Array.from({ length: 141 }, (_, i) => lo + (hi - lo) * i / 140);
      chart.update({
        x: { min: lo, max: hi, fmt: (v) => '$' + num(v, 0), label: 'Stock price' },
        y: { fmt: G.fmt, label: `${G.label} (${G.unit})`, includeZero: s.greek !== 'price' ? true : true },
        tipY: G.fmt,
        series: s.dtes.map((d, i) => ({ name: `${d} days left`, color: COLORS[i], points: xs.map((x) => [x, G.get(bs.greeks({ S: x, K: s.K, T: d / 365, r, q, sigma: s.iv, type: s.type }))]) })),
        markers: [{ x: s.K, label: `Strike ${usd(s.K, 0)}` }], legend: true,
        ariaLabel: `${G.label} against stock price`,
      });
    } else {
      const strikes = s.type === 'call'
        ? [['In the money', s.S * 0.9], ['At the money', s.S], ['Out of the money', s.S * 1.1]]
        : [['In the money', s.S * 1.1], ['At the money', s.S], ['Out of the money', s.S * 0.9]];
      const xs = Array.from({ length: 120 }, (_, i) => 120 - i).concat([0.25]);
      chart.update({
        x: { min: 120, max: 0.25, fmt: (v) => `${num(v, 0)} d`, label: 'Days to expiration (time runs left to right)' },
        y: { fmt: G.fmt, label: `${G.label} (${G.unit})`, includeZero: true },
        tipY: G.fmt,
        series: strikes.map(([name, K], i) => ({ name: `${name} (strike ${usd(K, 0)})`, color: COLORS[i], points: xs.map((d) => [d, G.get(bs.greeks({ S: s.S, K, T: d / 365, r, q, sigma: s.iv, type: s.type }))]) })),
        markers: [], legend: true,
        ariaLabel: `${G.label} as expiration approaches`,
      });
    }
  }
  update();
}
