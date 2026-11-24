// Options chain for the Fictional Underlying, with quote and Greeks views and a contract detail panel.
import { ACME, HBR, EXPIRATIONS, chain, occSymbol, expiryDate, longDate, usd, num, pct, int, signed } from '../lib/index.js';
import { h, seg, frame } from './ui.js';

export function mount(el, cfg) {
  const u = cfg.underlying === 'HBR' ? HBR : ACME;
  const exps = u === HBR ? [1, 2, 9, 30, 58] : EXPIRATIONS.map((e) => e.dte);
  let dte = exps.includes(cfg.dte) ? cfg.dte : 30;
  let view = cfg.view ?? 'quote';
  const hl = cfg.highlight || [];
  let sel = hl[0] ? { strike: hl[0].strike, type: hl[0].type } : null;

  const tableWrap = h('div', { class: 'chain-wrap' });
  const detail = h('div', { class: 'chain-detail', 'aria-live': 'polite' });
  const expSel = h('select', { 'aria-label': 'Expiration' }, ...exps.map((d) => h('option', { value: d, selected: d === dte }, `${longDate(expiryDate(d))} · ${d} DTE`)));
  expSel.addEventListener('change', () => { dte = +expSel.value; draw(); });
  el.replaceChildren(frame(cfg.title || `${u.symbol} options chain`, `${u.name} at ${u === HBR ? int(u.spot) : usd(u.spot)}`,
    h('div', { class: 'controls row', style: 'margin-bottom:10px' },
      h('div', { class: 'ctl' }, h('span', { class: 'lbl' }, 'Expiration'), expSel),
      seg('Columns', [['quote', 'Quotes'], ['greeks', 'Greeks']], view, (v) => { view = v; draw(); })),
    tableWrap, detail,
    h('p', { class: 'tool-note' }, `Select any quote to see the contract. Shaded cells are in the money. The line under a strike marks where ${u.symbol} trades. Quotes are per share.`)));

  const cols = () => (view === 'quote'
    ? [['Bid', (x) => x.bid.toFixed(2)], ['Ask', (x) => x.ask.toFixed(2)], ['IV', (x) => pct(x.iv)], ['Volume', (x) => int(x.volume)], ['Open int.', (x) => int(x.oi)]]
    : [['Mid', (x) => x.mid.toFixed(2)], ['IV', (x) => pct(x.iv)], ['Delta', (x) => num(x.delta, 2)], ['Gamma', (x) => num(x.gamma, 3)], ['Theta', (x) => num(x.theta, 3)], ['Vega', (x) => num(x.vega, 3)]]);

  function draw() {
    const c = chain(u, { dte });
    const cs = cols();
    const thead = h('thead', {},
      h('tr', {}, h('th', { class: 'side calls', colspan: cs.length }, 'Calls'), h('th', {}, ''), h('th', { class: 'side puts', colspan: cs.length }, 'Puts')),
      h('tr', {}, ...[...cs].reverse().map(([n]) => h('th', {}, n)), h('th', { style: 'text-align:center' }, 'Strike'), ...cs.map(([n]) => h('th', {}, n))));
    const tb = h('tbody');
    const atmIdx = c.rows.findIndex((r, i) => r.strike <= c.spot && (c.rows[i + 1]?.strike ?? Infinity) > c.spot);
    c.rows.forEach((row, i) => {
      const callItm = row.strike < c.spot, putItm = row.strike > c.spot;
      const cell = (type, [, f], itm) => {
        const isHl = hl.some((x) => x.strike === row.strike && x.type === type);
        const isSel = sel && sel.strike === row.strike && sel.type === type;
        const td = h('td', { class: [itm ? 'itm' : '', isHl ? 'hl' : '', isSel ? 'sel' : ''].join(' ').trim() || null, tabindex: 0 }, f(row[type]));
        const pick = () => { sel = { strike: row.strike, type }; draw(); };
        td.addEventListener('click', pick);
        td.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        return td;
      };
      tb.append(h('tr', { class: i === atmIdx ? 'atm-line' : null },
        ...[...cs].reverse().map((col) => cell('call', col, callItm)),
        h('td', { class: 'k' }, u === HBR ? int(row.strike) : num(row.strike, 0)),
        ...cs.map((col) => cell('put', col, putItm))));
    });
    tableWrap.replaceChildren(h('table', { class: 'chain' }, thead, tb));
    drawDetail(c);
  }

  function drawDetail(c) {
    if (!sel) { detail.textContent = 'Select a quote to see the contract details.'; return; }
    const row = c.rows.find((r) => r.strike === sel.strike);
    if (!row) { detail.textContent = 'That strike is not listed in this expiration.'; return; }
    const x = row[sel.type];
    const call = sel.type === 'call';
    const intr = Math.max(call ? c.spot - row.strike : row.strike - c.spot, 0);
    const spread = x.ask - x.bid;
    const be = call ? row.strike + x.ask : row.strike - x.ask;
    const date = expiryDate(dte);
    detail.replaceChildren(
      h('div', { class: 'occ' }, occSymbol(u.symbol, date, sel.type, row.strike)),
      h('div', {}, `${u.symbol} ${longDate(date)} ${u === HBR ? int(row.strike) : num(row.strike, 0)} ${call ? 'call' : 'put'} · ${dte} days to expiration`),
      h('div', { class: 'stats', style: 'grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-top:8px' },
        ...[
          ['Bid × ask', `${x.bid.toFixed(2)} × ${x.ask.toFixed(2)}`],
          ['Mid', x.mid.toFixed(3)],
          ['Spread', `${spread.toFixed(2)} (${pct(spread / x.mid)} of mid)`],
          ['Cost to buy 1 at the ask', usd(x.ask * u.multiplier)],
          ['Intrinsic value', usd(intr)],
          ['Extrinsic value (mid)', usd(Math.max(x.mid - intr, 0))],
          ['Break-even if bought at ask', u === HBR ? num(be, 2) : usd(be)],
          ['Implied volatility', pct(x.iv)],
          ['Delta', signed(x.delta, 3)],
          ['Open interest', int(x.oi)],
        ].map(([k, v]) => h('div', { class: 'stat' }, h('span', {}, k), h('b', {}, v)))));
  }
  draw();
}
