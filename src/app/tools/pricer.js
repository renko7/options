// Black-Scholes pricer: every input is a slider; price decomposition and Greeks update live.
import { bs, RATE, ACME, usd, num, pct, signed } from '../lib/index.js';
import { lineChart } from '../charts.js';
import { h, slider, seg, stat, frame } from './ui.js';

export function mount(el, cfg) {
  const s = {
    S: cfg.S ?? ACME.spot, K: cfg.K ?? 100, dte: cfg.dte ?? 30, iv: cfg.iv ?? ACME.iv,
    r: cfg.r ?? RATE, q: cfg.q ?? ACME.q, type: cfg.type ?? 'call',
  };
  const st = {
    price: stat('Price per share'), contract: stat('Per contract'), intr: stat('Intrinsic value'), extr: stat('Extrinsic value'),
    delta: stat('Delta'), gamma: stat('Gamma'), theta: stat('Theta (per day)'), vega: stat('Vega (per vol pt)'), rho: stat('Rho (per rate pt)'), p: stat('Prob. finishing ITM'),
  };
  const kLo = Math.max(1, Math.round(s.K * 0.5)), kHi = Math.round(s.K * 1.5);
  const ctl = [
    seg('Option', [['call', 'Call'], ['put', 'Put']], s.type, (v) => { s.type = v; update(); }),
    slider({ label: 'Stock price', min: kLo, max: kHi, step: 0.5, value: s.S, fmt: (v) => usd(v), onInput: (v) => { s.S = v; update(); } }),
    slider({ label: 'Strike', min: kLo, max: kHi, step: 1, value: s.K, fmt: (v) => usd(v, 0), onInput: (v) => { s.K = v; update(); } }),
    slider({ label: 'Days to expiration', min: 0, max: 730, step: 1, value: s.dte, fmt: (v) => `${v} d`, onInput: (v) => { s.dte = v; update(); } }),
    slider({ label: 'Implied volatility', min: 0.05, max: 1.5, step: 0.01, value: s.iv, fmt: (v) => pct(v, 0), onInput: (v) => { s.iv = v; update(); } }),
    slider({ label: 'Interest rate', min: 0, max: 0.1, step: 0.0025, value: s.r, fmt: (v) => pct(v, 2), onInput: (v) => { s.r = v; update(); } }),
    slider({ label: 'Dividend yield', min: 0, max: 0.1, step: 0.0025, value: s.q, fmt: (v) => pct(v, 2), onInput: (v) => { s.q = v; update(); } }),
  ];
  const chartBox = h('div');
  el.replaceChildren(frame(cfg.title || 'Black-Scholes pricer', 'European option, continuous dividend yield',
    h('div', { class: 'tool-body' },
      h('div', { style: 'min-width:0' },
        h('div', { class: 'stats', style: 'grid-template-columns:repeat(auto-fill,minmax(130px,1fr));margin-bottom:12px' }, Object.values(st).map((x) => x.node)),
        chartBox),
      h('div', { class: 'controls' }, ctl)),
    h('p', { class: 'tool-note' }, 'The chart shows the option value across stock prices today (solid) and its value at expiration (dashed). The gap between them is extrinsic value.')));
  const chart = lineChart(chartBox, { x: { min: 0, max: 1 }, y: {}, series: [], height: 240 });

  function update() {
    const T = s.dte / 365;
    const o = { S: s.S, K: s.K, T, r: s.r, q: s.q, sigma: s.iv, type: s.type };
    const g = bs.greeks(o);
    const intr = bs.intrinsic(o);
    st.price.set(usd(g.price)); st.contract.set(usd(g.price * 100));
    st.intr.set(usd(intr)); st.extr.set(usd(g.price - intr));
    st.delta.set(signed(g.delta, 3)); st.gamma.set(num(g.gamma, 4)); st.theta.set(signed(g.theta, 3));
    st.vega.set(num(g.vega, 3)); st.rho.set(signed(g.rho, 3)); st.p.set(pct(bs.probITM(o)));
    const lo = Math.max(0.5, s.K * 0.5), hi = s.K * 1.5;
    const xs = Array.from({ length: 121 }, (_, i) => lo + (hi - lo) * i / 120);
    chart.update({
      x: { min: lo, max: hi, fmt: (v) => '$' + num(v, 0), label: 'Stock price' },
      y: { fmt: (v) => '$' + num(v, v < 10 ? 1 : 0), includeZero: true, min: 0 },
      tipY: (v) => usd(v),
      series: [
        { name: s.dte ? `Value with ${s.dte} days left` : 'Value at expiration', color: s.type === 'call' ? 'var(--call)' : 'var(--put)', points: xs.map((x) => [x, T > 0 ? bs.price({ ...o, S: x }) : bs.intrinsic({ ...o, S: x })]) },
        { name: 'Value at expiration', color: 'var(--ink-2)', dash: true, points: xs.map((x) => [x, bs.intrinsic({ ...o, S: x })]) },
      ],
      markers: [{ x: s.S, label: `Stock ${usd(s.S)}` }],
      dots: [{ x: s.S, y: g.price, color: s.type === 'call' ? 'var(--call)' : 'var(--put)' }],
      ariaLabel: 'Option value across stock prices',
    });
  }
  update();
}
