// Position builder: multi-leg P&L at expiration and before it, break-evens, extremes, position Greeks.
import { bs, payoff, ACME, HBR, RATE, smileIV, usd, signedUsd, num, int } from '../lib/index.js';
import { lineChart } from '../charts.js';
import { h, slider, stat, frame, signCls, nextId } from './ui.js';

function presets(S, step) {
  const k = (n) => Math.round(S / step) * step + n * step;
  return {
    'Long call': [{ kind: 'call', qty: 1, strike: k(0) }],
    'Long put': [{ kind: 'put', qty: 1, strike: k(0) }],
    'Short put': [{ kind: 'put', qty: -1, strike: k(-1) }],
    'Covered call': [{ kind: 'stock', qty: 100, price: S }, { kind: 'call', qty: -1, strike: k(1) }],
    'Protective put': [{ kind: 'stock', qty: 100, price: S }, { kind: 'put', qty: 1, strike: k(-1) }],
    Collar: [{ kind: 'stock', qty: 100, price: S }, { kind: 'put', qty: 1, strike: k(-1) }, { kind: 'call', qty: -1, strike: k(1) }],
    'Bull call spread': [{ kind: 'call', qty: 1, strike: k(0) }, { kind: 'call', qty: -1, strike: k(2) }],
    'Bear put spread': [{ kind: 'put', qty: 1, strike: k(0) }, { kind: 'put', qty: -1, strike: k(-2) }],
    'Bull put spread': [{ kind: 'put', qty: -1, strike: k(-1) }, { kind: 'put', qty: 1, strike: k(-3) }],
    'Bear call spread': [{ kind: 'call', qty: -1, strike: k(1) }, { kind: 'call', qty: 1, strike: k(3) }],
    'Long straddle': [{ kind: 'call', qty: 1, strike: k(0) }, { kind: 'put', qty: 1, strike: k(0) }],
    'Short strangle': [{ kind: 'call', qty: -1, strike: k(2) }, { kind: 'put', qty: -1, strike: k(-2) }],
    'Iron condor': [{ kind: 'put', qty: 1, strike: k(-3) }, { kind: 'put', qty: -1, strike: k(-2) }, { kind: 'call', qty: -1, strike: k(2) }, { kind: 'call', qty: 1, strike: k(3) }],
    'Long call butterfly': [{ kind: 'call', qty: 1, strike: k(-1) }, { kind: 'call', qty: -2, strike: k(0) }, { kind: 'call', qty: 1, strike: k(1) }],
    'Call calendar': [{ kind: 'call', qty: -1, strike: k(0), dte: 30 }, { kind: 'call', qty: 1, strike: k(0), dte: 58 }],
  };
}

export function mount(el, cfg) {
  const u = cfg.underlying === 'HBR' ? HBR : ACME;
  const S0 = cfg.spot ?? u.spot;
  const step = u === HBR ? 25 : 5;
  const r = cfg.r ?? RATE, q = cfg.q ?? u.q;
  const editable = cfg.editable !== false;
  const showToday = cfg.showToday !== false;

  const norm = (l) => {
    if (l.kind === 'stock') return { kind: 'stock', qty: l.qty ?? 100, price: l.price ?? S0 };
    const dte = l.dte ?? 30;
    const iv = l.iv ?? smileIV(u, l.strike, dte / 365);
    const auto = l.premium === undefined;
    const premium = auto ? bs.price({ S: S0, K: l.strike, T: dte / 365, r, q, sigma: iv, type: l.kind }) : l.premium;
    return { kind: l.kind, qty: l.qty ?? 1, strike: l.strike, dte, iv, premium, auto };
  };
  let legs = (cfg.legs && cfg.legs.length ? cfg.legs : [{ kind: 'call', qty: 1, strike: Math.round(S0 / step) * step }]).map(norm);
  let daysPassed = cfg.daysPassed ?? 0;
  let ivShift = cfg.ivShift ?? 0;
  let what = S0;
  const fixedRange = cfg.range;

  const optLegs = () => legs.filter((l) => l.kind !== 'stock');
  const minDte = () => Math.min(...optLegs().map((l) => l.dte), Infinity);
  const multiExp = () => new Set(optLegs().map((l) => l.dte)).size > 1;
  const range = () => {
    if (fixedRange) return fixedRange;
    const ks = optLegs().map((l) => l.strike);
    const lo = Math.min(S0, ...ks), hi = Math.max(S0, ...ks);
    const pad = Math.max((hi - lo) * 0.6, S0 * 0.15);
    return [Math.max(0, lo - pad), hi + pad];
  };

  // ---------- layout ----------
  const chartBox = h('div');
  const st = {
    net: stat('Net premium', true), maxP: stat('Max profit'), maxL: stat('Max loss'), be: stat('Break-even', true),
    pnlExp: stat('P&L at expiration'), pnlNow: stat('P&L now'),
    delta: stat('Delta (shares)'), gamma: stat('Gamma (per $1)'), theta: stat('Theta ($/day)'), vega: stat('Vega ($/vol pt)'),
  };
  const fmtS = (v) => (u === HBR ? num(v, 0) : usd(v));
  const sSpot = slider({ label: `${u.symbol} price`, min: 0, max: 1, step: u === HBR ? 5 : 0.5, value: what, fmt: fmtS, onInput: (v) => { what = v; update(); } });
  const sDays = slider({ label: 'Days passed', min: 0, max: 1, step: 1, value: daysPassed, fmt: (v) => `${v} d`, onInput: (v) => { daysPassed = v; update(); } });
  const sIv = slider({ label: 'Implied vol change', min: -0.2, max: 0.2, step: 0.01, value: ivShift, fmt: (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)} pts`, onInput: (v) => { ivShift = v; update(); } });
  const side = h('div', { class: 'controls' }, sSpot, sDays, sIv,
    h('div', { class: 'stats' }, st.be.node, st.net.node, st.maxP.node, st.maxL.node, st.pnlExp.node, st.pnlNow.node, st.delta.node, st.gamma.node, st.theta.node, st.vega.node));
  const legsWrap = h('div', { class: 'legs-wrap' });
  const actions = h('div', { class: 'tool-actions' });
  const note = h('p', { class: 'tool-note' });
  el.replaceChildren(frame(cfg.title || 'Position builder', `${u.symbol} position`,
    h('div', { class: 'tool-body' }, h('div', { style: 'min-width:0' }, chartBox, legsWrap, actions), side), note));

  const chart = lineChart(chartBox, { x: { min: 0, max: 1 }, y: {}, series: [], height: 300 });

  // ---------- legs editor ----------
  function drawLegs() {
    const cols = ['Leg', 'Qty', 'Strike / price', 'DTE', 'IV', 'Premium', ''];
    const tb = h('tbody');
    legs.forEach((l, i) => {
      const num = (val, stepv, on, w, labelText) => {
        const id = nextId('leg');
        const inp = h('input', { type: 'number', id, value: val, step: stepv, 'aria-label': labelText, disabled: !editable });
        if (w) inp.style.width = w;
        inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (Number.isFinite(v)) { on(v); refresh(); } });
        return inp;
      };
      const color = l.kind === 'call' ? 'var(--call)' : l.kind === 'put' ? 'var(--put)' : 'var(--ink-2)';
      const kindSel = h('select', { 'aria-label': `Leg ${i + 1} type`, disabled: !editable },
        ...['call', 'put', 'stock'].map((k) => h('option', { value: k, selected: l.kind === k }, k === 'stock' ? 'Stock' : k === 'call' ? 'Call' : 'Put')));
      kindSel.addEventListener('change', () => {
        const k = kindSel.value;
        legs[i] = k === 'stock' ? norm({ kind: 'stock', qty: 100, price: S0 }) : norm({ kind: k, qty: l.kind === 'stock' ? 1 : l.qty, strike: l.strike ?? Math.round(S0 / step) * step, dte: l.dte ?? 30 });
        refresh();
      });
      const lab = `Leg ${i + 1}`;
      const row = h('tr', {},
        h('td', {}, h('span', { class: 'kind-dot', style: `background:${color}` }), kindSel),
        h('td', {}, num(l.qty, 1, (v) => { l.qty = v; }, '64px', `${lab} quantity`)),
        h('td', {}, l.kind === 'stock'
          ? num(l.price, 0.5, (v) => { l.price = v; }, null, `${lab} price`)
          : num(l.strike, step, (v) => { l.strike = v; if (l.auto) { l.iv = smileIV(u, v, l.dte / 365); reprice(l); } }, null, `${lab} strike`)),
        h('td', {}, l.kind === 'stock' ? '' : num(l.dte, 1, (v) => { l.dte = Math.max(1, Math.round(v)); if (l.auto) reprice(l); }, '64px', `${lab} days to expiration`)),
        h('td', {}, l.kind === 'stock' ? '' : num(Math.round(l.iv * 1000) / 10, 0.5, (v) => { l.iv = Math.max(1, v) / 100; if (l.auto) reprice(l); }, '64px', `${lab} implied volatility percent`)),
        h('td', {}, l.kind === 'stock' ? '' : num(Number(l.premium.toFixed(2)), 0.01, (v) => { l.premium = v; l.auto = false; }, '76px', `${lab} premium per share`)),
        h('td', {}, editable ? h('button', { class: 'rm', type: 'button', 'aria-label': `Remove leg ${i + 1}`, onclick: () => { legs.splice(i, 1); if (!legs.length) legs.push(norm({ kind: 'call', qty: 1, strike: Math.round(S0 / step) * step })); refresh(); } }, '×') : ''));
      tb.append(row);
    });
    legsWrap.replaceChildren(h('table', { class: 'legs' }, h('thead', {}, h('tr', {}, cols.map((c) => h('th', {}, c)))), tb));
    actions.replaceChildren();
    if (editable) {
      const add = (kind) => h('button', { class: 'btn small', type: 'button', onclick: () => { legs.push(norm(kind === 'stock' ? { kind, qty: 100, price: S0 } : { kind, qty: 1, strike: Math.round(S0 / step) * step })); refresh(); } }, `+ ${kind === 'stock' ? 'Stock' : kind === 'call' ? 'Call' : 'Put'}`);
      const sel = h('select', { 'aria-label': 'Load a preset strategy' }, h('option', { value: '' }, 'Load a strategy…'), ...Object.keys(presets(S0, step)).map((n) => h('option', { value: n }, n)));
      sel.addEventListener('change', () => { if (!sel.value) return; legs = presets(S0, step)[sel.value].map(norm); daysPassed = 0; sDays.set(0); refresh(); sel.value = ''; });
      actions.append(add('call'), add('put'), add('stock'), sel);
    }
  }
  const reprice = (l) => { l.premium = bs.price({ S: S0, K: l.strike, T: l.dte / 365, r, q, sigma: l.iv, type: l.kind }); };

  function refresh() {
    drawLegs();
    const [lo, hi] = range();
    sSpot.input.min = lo; sSpot.input.max = hi;
    what = Math.min(Math.max(what, lo), hi); sSpot.set(what);
    const md = Number.isFinite(minDte()) ? minDte() : 0;
    sDays.input.max = Math.max(md, 0); daysPassed = Math.min(daysPassed, md); sDays.set(daysPassed);
    update();
  }

  function update() {
    const [lo, hi] = range();
    const n = 160;
    const xs = Array.from({ length: n + 1 }, (_, i) => lo + (hi - lo) * i / n);
    const md = Number.isFinite(minDte()) ? minDte() : 0;
    const env = { r, q, ivShift };
    const multi = multiExp();
    const expCurve = xs.map((s) => [s, payoff.pnlAt(legs, s, md, env)]);
    const nowCurve = xs.map((s) => [s, payoff.pnlAt(legs, s, daysPassed, env)]);
    const expName = multi ? `At first expiration (day ${md})` : 'At expiration';
    const nowName = daysPassed === 0 ? 'Today' : `After ${daysPassed} day${daysPassed === 1 ? '' : 's'}`;
    const series = [{ name: expName, color: 'var(--accent)', points: expCurve }];
    if (showToday && optLegs().length && daysPassed < md) series.push({ name: nowName, color: 'var(--series-4)', points: nowCurve, dash: true });

    let bes, maxP, maxL, extNote = '';
    if (!multi) {
      const s = payoff.summary(legs);
      bes = s.breakevens; maxP = s.maxProfit; maxL = s.maxLoss;
    } else {
      bes = [];
      for (let i = 1; i < expCurve.length; i++) {
        const [x0, y0] = expCurve[i - 1], [x1, y1] = expCurve[i];
        if (y0 === 0) bes.push(x0); else if (y0 * y1 < 0) bes.push(x0 + (x1 - x0) * (-y0) / (y1 - y0));
      }
      maxP = Math.max(...expCurve.map((p) => p[1])); maxL = Math.min(...expCurve.map((p) => p[1]));
      extNote = ' on the chart range';
    }
    chart.update({
      x: { min: lo, max: hi, fmt: (v) => (u === HBR ? int(v) : '$' + num(v, v < 10 ? 1 : 0)), label: `${u.symbol} price${multi ? ` on day ${md}` : ' at expiration'}` },
      y: { fmt: (v) => usd(v, 0), includeZero: true },
      tipY: (v) => signedUsd(v, 0),
      series, pnlFill: 0,
      markers: [{ x: what, label: `${u.symbol} ${fmtS(what)}` }],
      dots: bes.map((b) => ({ x: b, y: 0, color: 'var(--ink)' })),
      ariaLabel: `Profit and loss of the position across ${u.symbol} prices`,
    });
    const net = payoff.netPremium(legs);
    st.net.set(net > 0 ? `${usd(net, 0)} debit` : net < 0 ? `${usd(-net, 0)} credit` : usd(0, 0));
    st.maxP.set(Number.isFinite(maxP) ? usd(maxP, 0) + extNote : 'unlimited', 'pos');
    st.maxL.set(Number.isFinite(maxL) ? usd(maxL, 0) + extNote : 'unlimited', 'neg');
    st.be.set(bes.length ? bes.map((b) => fmtS(b)).join(' and ') : 'none');
    const pe = payoff.pnlAt(legs, what, md, env), pn = payoff.pnlAt(legs, what, daysPassed, env);
    st.pnlExp.set(signedUsd(pe, 0), signCls(pe));
    st.pnlNow.node.firstChild.textContent = `P&L ${nowName.toLowerCase()}`;
    st.pnlNow.set(signedUsd(pn, 0), signCls(pn));
    const g = payoff.positionGreeks(legs, what, daysPassed, env);
    st.delta.set(num(g.delta, 1)); st.gamma.set(num(g.gamma, 2)); st.theta.set(signedUsd(g.theta)); st.vega.set(signedUsd(g.vega));
    note.textContent = `Premiums are per share; one contract is ${u.multiplier} ${u === HBR ? '× the index' : 'shares'}. "Now" values use Black-Scholes with each leg's implied volatility${ivShift ? ' plus the vol change' : ''}, a ${num(r * 100, 1)}% rate and a ${num(q * 100, 1)}% dividend yield. Greeks are for the whole position at the selected price and day.`;
  }

  refresh();
}
