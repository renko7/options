// Variance-swap replicator: the fair variance strike from a strip of OTM options (Cboe VIX discretization).
import { ACME, RATE, bs, varswap, num, pct, usd } from '../lib/index.js';
import { barChart } from '../charts.js';
import { h, slider, stat, frame } from './ui.js';

export function mount(el, cfg) {
  const s = { dte: cfg.dte ?? 30, step: cfg.strikeStep ?? 5, skew: cfg.skew ?? 0.35, atm: cfg.iv ?? ACME.iv };
  const S = ACME.spot, r = RATE, q = 0;
  const st = { fair: stat('Fair variance strike (as vol)'), atm: stat('ATM implied vol'), prem: stat('Strike minus ATM'), n: stat('Options in the strip') };
  const box = h('div');
  el.replaceChildren(frame(cfg.title || 'Variance-swap replicator', `ACME, ${s.dte}-day strip`,
    h('div', { class: 'tool-body' },
      h('div', { style: 'min-width:0' }, h('div', { class: 'stats', style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-bottom:12px' }, Object.values(st).map((x) => x.node)), box),
      h('div', { class: 'controls' },
        slider({ label: 'ATM implied vol', min: 0.1, max: 0.8, step: 0.01, value: s.atm, fmt: (v) => pct(v, 0), onInput: (v) => { s.atm = v; update(); } }),
        slider({ label: 'Skew steepness', min: 0, max: 1, step: 0.05, value: s.skew, fmt: (v) => num(v, 2), onInput: (v) => { s.skew = v; update(); } }),
        slider({ label: 'Days to expiration', min: 7, max: 120, step: 1, value: s.dte, fmt: (v) => `${v} d`, onInput: (v) => { s.dte = v; update(); } }),
        slider({ label: 'Strike spacing', min: 1, max: 10, step: 1, value: s.step, fmt: (v) => usd(v, 0), onInput: (v) => { s.step = v; update(); } }))),
    h('p', { class: 'tool-note' }, 'Each bar is one option\'s contribution to fair variance: (2/T)·(ΔK/K²)·e^{rT}·price. Puts (orange) below the forward, calls (blue) above. Low strikes carry more weight per dollar of premium because of the 1/K² factor, which is why skew raises the variance strike above ATM vol.')));
  const chart = barChart(box, { bars: [{ label: '', value: 0 }], height: 260 });

  function update() {
    const T = s.dte / 365;
    const iv = (K) => {
      const x = Math.log(K / S) / Math.sqrt(Math.max(T, 7 / 365) / 0.25);
      return Math.max(0.05, s.atm * (1 - s.skew * x + 0.6 * x * x));
    };
    const quotes = [];
    for (let K = Math.max(s.step, Math.round(S * 0.4 / s.step) * s.step); K <= S * 1.8; K += s.step) {
      const sig = iv(K);
      quotes.push({ strike: K, call: bs.price({ S, K, T, r, q, sigma: sig, type: 'call' }), put: bs.price({ S, K, T, r, q, sigma: sig, type: 'put' }) });
    }
    const res = varswap.fairVariance(quotes, { T, r });
    const atm = iv(S);
    st.fair.set(pct(res.vol)); st.atm.set(pct(atm)); st.prem.set(`${res.vol >= atm ? '+' : ''}${num((res.vol - atm) * 100, 2)} vol pts`); st.n.set(String(res.contributions.filter((c) => c.Q > 0.005).length));
    const shown = res.contributions.filter((c) => c.strike >= S * 0.55 && c.strike <= S * 1.5);
    chart.update({
      bars: shown.map((c) => ({ label: '$' + num(c.strike, 0), value: c.contribution * 10000, color: c.type === 'put' ? 'var(--put)' : c.type === 'call' ? 'var(--call)' : 'var(--series-4)', series: `${c.type === 'both' ? 'ATM call and put' : c.type} at ${usd(c.Q)}`, extra: `${num(c.contribution / res.variance * 100, 1)}% of fair variance` })),
      y: { fmt: (v) => num(v, 1) }, xLabel: 'Strike (bar height = contribution in variance points, vol² in %²)',
      ariaLabel: 'Contribution of each strike to fair variance',
    });
  }
  update();
}
