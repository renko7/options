// Small SVG chart kit for the Tools: one-axis line charts with a crosshair tooltip, and bars.
// Colors always come from CSS tokens (var(--call) etc.) so charts follow the theme.

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

export function niceTicks(min, max, count = 5) {
  if (!(max > min)) { max = min + 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const out = [];
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

function interp(points, x) {
  if (!points.length) return NaN;
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1], [x1, y1] = points[i];
      return x1 === x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

/**
 * Line chart. opts:
 *  x: {min, max, fmt, label}, y: {min?, max?, fmt, label, includeZero?}
 *  series: [{name, color, points:[[x,y]], dash?:boolean}]
 *  markers: [{x, label}]          vertical dashed reference lines
 *  dots: [{x, y, color, label?}]  emphasized points
 *  pnlFill: index of a series to shade green above zero, red below
 *  height: px (default 280), legend: boolean (default series.length > 1)
 *  ariaLabel: string
 */
export function lineChart(container, opts) {
  container.classList.add('chart');
  let current = opts;
  const legend = document.createElement('div');
  legend.className = 'legend';
  const holder = document.createElement('div');
  holder.style.position = 'relative';
  const tip = document.createElement('div');
  tip.className = 'chart-tip'; tip.hidden = true;
  container.replaceChildren(legend, holder);
  holder.appendChild(tip);
  let svg;
  const fillId = 'f' + Math.random().toString(36).slice(2, 8);

  function draw() {
    const o = current;
    const W = Math.max(280, holder.clientWidth || container.clientWidth || 600);
    const H = o.height || 280;
    const m = { l: 58, r: 16, t: 12, b: o.x.label ? 40 : 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const allY = o.series.flatMap((s) => s.points.map((p) => p[1])).filter(Number.isFinite);
    (o.dots || []).forEach((d) => Number.isFinite(d.y) && allY.push(d.y));
    let ymin = o.y.min ?? Math.min(...allY), ymax = o.y.max ?? Math.max(...allY);
    if (o.y.includeZero !== false && o.pnlFill !== undefined) { ymin = Math.min(ymin, 0); ymax = Math.max(ymax, 0); }
    if (o.y.includeZero) { ymin = Math.min(ymin, 0); ymax = Math.max(ymax, 0); }
    if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
    const pad = (ymax - ymin) * 0.08;
    if (o.y.min === undefined) ymin -= pad;
    if (o.y.max === undefined) ymax += pad;
    const xs = (x) => m.l + (x - o.x.min) / (o.x.max - o.x.min) * pw;
    const ys = (y) => m.t + (1 - (y - ymin) / (ymax - ymin)) * ph;
    const clampY = (y) => Math.max(ymin - (ymax - ymin), Math.min(ymax + (ymax - ymin), y));

    if (svg) svg.remove();
    svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.ariaLabel || '' });
    holder.insertBefore(svg, tip);
    const defs = el('defs', {}, svg);
    const clip = el('clipPath', { id: fillId + 'c' }, defs);
    el('rect', { x: m.l, y: m.t, width: pw, height: ph }, clip);

    const yt = niceTicks(ymin, ymax, Math.max(3, Math.round(ph / 55)));
    const xt = niceTicks(o.x.min, o.x.max, Math.max(3, Math.round(pw / 90)));
    const g = el('g', { class: 'grid' }, svg);
    for (const t of yt) {
      el('line', { x1: m.l, x2: m.l + pw, y1: ys(t), y2: ys(t) }, g);
      const tx = el('text', { x: m.l - 8, y: ys(t) + 4, 'text-anchor': 'end' }, svg);
      tx.textContent = o.y.fmt ? o.y.fmt(t) : t;
    }
    for (const t of xt) {
      const tx = el('text', { x: xs(t), y: m.t + ph + 18, 'text-anchor': 'middle' }, svg);
      tx.textContent = o.x.fmt ? o.x.fmt(t) : t;
    }
    el('line', { class: 'axis', x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, stroke: 'var(--chart-axis)' }, svg);
    if (o.x.label) { const t = el('text', { x: m.l + pw / 2, y: H - 4, 'text-anchor': 'middle' }, svg); t.textContent = o.x.label; }
    if (o.y.label) { const t = el('text', { x: 12, y: m.t + ph / 2, transform: `rotate(-90 12 ${m.t + ph / 2})`, 'text-anchor': 'middle' }, svg); t.textContent = o.y.label; }
    if (ymin < 0 && ymax > 0) el('line', { class: 'zero', x1: m.l, x2: m.l + pw, y1: ys(0), y2: ys(0) }, svg);

    const body = el('g', { 'clip-path': `url(#${fillId}c)` }, svg);
    if (o.pnlFill !== undefined && o.series[o.pnlFill]) {
      const pts = o.series[o.pnlFill].points;
      const d = `M${xs(pts[0][0])},${ys(0)} ` + pts.map((p) => `L${xs(p[0])},${ys(clampY(p[1]))}`).join(' ') + ` L${xs(pts[pts.length - 1][0])},${ys(0)} Z`;
      const cg = el('clipPath', { id: fillId + 'g' }, defs); el('rect', { x: m.l, y: m.t, width: pw, height: Math.max(0, ys(0) - m.t) }, cg);
      const cl = el('clipPath', { id: fillId + 'l' }, defs); el('rect', { x: m.l, y: ys(0), width: pw, height: Math.max(0, m.t + ph - ys(0)) }, cl);
      el('path', { d, fill: 'var(--gain-wash)', 'clip-path': `url(#${fillId}g)` }, body);
      el('path', { d, fill: 'var(--loss-wash)', 'clip-path': `url(#${fillId}l)` }, body);
    }
    for (const mk of o.markers || []) {
      if (mk.x < o.x.min || mk.x > o.x.max) continue;
      el('line', { class: 'marker-line', x1: xs(mk.x), x2: xs(mk.x), y1: m.t, y2: m.t + ph }, svg);
      if (mk.label) {
        const right = xs(mk.x) > m.l + pw - 90;
        const t = el('text', { class: 'marker-label', x: xs(mk.x) + (right ? -4 : 4), y: m.t + 11, 'text-anchor': right ? 'end' : 'start' }, svg);
        t.textContent = mk.label;
      }
    }
    const sg = el('g', { class: 'series' }, body);
    for (const s of o.series) {
      const pts = s.points.filter((p) => Number.isFinite(p[1]));
      if (!pts.length) continue;
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(p[0]).toFixed(2)},${ys(clampY(p[1])).toFixed(2)}`).join(' ');
      el('path', { class: 'line', d, stroke: s.color, 'stroke-dasharray': s.dash ? '6 5' : null, 'stroke-width': s.width || 2, opacity: s.opacity ?? 1 }, sg);
    }
    for (const d of o.dots || []) {
      if (d.x < o.x.min || d.x > o.x.max) continue;
      el('circle', { class: 'dot', cx: xs(d.x), cy: ys(d.y), r: 5, fill: d.color || 'var(--ink)' }, svg);
      if (d.label) { const t = el('text', { class: 'marker-label', x: xs(d.x) + 8, y: ys(d.y) - 8 }, svg); t.textContent = d.label; }
    }

    // legend
    const showLegend = o.legend ?? o.series.filter((s) => s.name).length > 1;
    legend.replaceChildren();
    legend.hidden = !showLegend;
    if (showLegend) for (const s of o.series) {
      if (!s.name || s.hideInLegend) continue;
      const span = document.createElement('span');
      const i = document.createElement('i');
      i.style.background = s.color; i.style.color = s.color;
      if (s.dash) i.className = 'dash';
      span.append(i, document.createTextNode(s.name));
      legend.appendChild(span);
    }

    // crosshair + tooltip
    const xh = el('line', { class: 'xhair', y1: m.t, y2: m.t + ph, visibility: 'hidden' }, svg);
    const hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', tabindex: 0 }, svg);
    const show = (px) => {
      const x = o.x.min + Math.max(0, Math.min(1, (px - m.l) / pw)) * (o.x.max - o.x.min);
      xh.setAttribute('x1', xs(x)); xh.setAttribute('x2', xs(x)); xh.setAttribute('visibility', 'visible');
      tip.replaceChildren();
      const head = document.createElement('div'); head.className = 'tx';
      head.textContent = (o.tipX || o.x.fmt || String)(x);
      tip.appendChild(head);
      for (const s of o.series) {
        if (s.hideInTip) continue;
        const row = document.createElement('div'); row.className = 'row';
        const key = document.createElement('i'); key.className = 'key'; key.style.background = s.color;
        const name = document.createElement('span'); name.textContent = s.name || '';
        const val = document.createElement('b'); val.textContent = (o.tipY || o.y.fmt || String)(interp(s.points, x));
        row.append(key, name, val); tip.appendChild(row);
      }
      tip.hidden = false;
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / W;
      const left = xs(x) * scale;
      tip.style.top = `${m.t * scale + 4}px`;
      const tw = tip.offsetWidth;
      tip.style.left = `${left + 12 + tw > rect.width ? left - tw - 12 : left + 12}px`;
    };
    const toLocal = (ev) => { const r = svg.getBoundingClientRect(); return (ev.clientX - r.left) * (W / r.width); };
    hit.addEventListener('pointermove', (ev) => show(toLocal(ev)));
    hit.addEventListener('pointerdown', (ev) => show(toLocal(ev)));
    hit.addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
    let kx = m.l + pw / 2;
    hit.addEventListener('focus', () => show(kx));
    hit.addEventListener('blur', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
    hit.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { kx = Math.max(m.l, Math.min(m.l + pw, kx + (ev.key === 'ArrowLeft' ? -pw / 40 : pw / 40))); show(kx); ev.preventDefault(); }
    });
  }

  const ro = new ResizeObserver(() => draw());
  ro.observe(holder);
  draw();
  return { update(next) { current = { ...current, ...next }; draw(); } };
}

/**
 * Vertical bar chart. opts: { bars:[{label, value, color}], y:{fmt}, height, xLabel, ariaLabel }
 */
export function barChart(container, opts) {
  container.classList.add('chart');
  let current = opts;
  const holder = document.createElement('div'); holder.style.position = 'relative';
  const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true;
  container.replaceChildren(holder); holder.appendChild(tip);
  let svg;
  function draw() {
    const o = current;
    const W = Math.max(280, holder.clientWidth || 600), H = o.height || 240;
    const m = { l: 58, r: 12, t: 12, b: o.xLabel ? 42 : 28 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const vals = o.bars.map((b) => b.value);
    const ymax = Math.max(...vals, 0) * 1.08 || 1, ymin = Math.min(...vals, 0);
    const ys = (y) => m.t + (1 - (y - ymin) / (ymax - ymin)) * ph;
    if (svg) svg.remove();
    svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.ariaLabel || '' });
    holder.insertBefore(svg, tip);
    const g = el('g', { class: 'grid' }, svg);
    for (const t of niceTicks(ymin, ymax, 4)) {
      el('line', { x1: m.l, x2: m.l + pw, y1: ys(t), y2: ys(t) }, g);
      const tx = el('text', { x: m.l - 8, y: ys(t) + 4, 'text-anchor': 'end' }, svg); tx.textContent = o.y?.fmt ? o.y.fmt(t) : t;
    }
    const n = o.bars.length, band = pw / n, bw = Math.min(24, Math.max(2, band - 2));
    const every = Math.ceil(n / Math.max(1, Math.floor(pw / 46)));
    o.bars.forEach((b, i) => {
      const x = m.l + i * band + (band - bw) / 2;
      const y0 = ys(Math.max(0, b.value)), y1 = ys(Math.min(0, b.value));
      const h = Math.max(1, y1 - y0);
      const r = Math.min(4, bw / 2, h);
      const top = b.value >= 0;
      const d = top
        ? `M${x},${y1} L${x},${y0 + r} Q${x},${y0} ${x + r},${y0} L${x + bw - r},${y0} Q${x + bw},${y0} ${x + bw},${y0 + r} L${x + bw},${y1} Z`
        : `M${x},${y0} L${x},${y1 - r} Q${x},${y1} ${x + r},${y1} L${x + bw - r},${y1} Q${x + bw},${y1} ${x + bw},${y1 - r} L${x + bw},${y0} Z`;
      const p = el('path', { d, fill: b.color || 'var(--call)', tabindex: 0 }, svg);
      const hitR = el('rect', { x: m.l + i * band, y: m.t, width: band, height: ph, fill: 'transparent' }, svg);
      const show = () => {
        tip.replaceChildren();
        const h1 = document.createElement('div'); h1.className = 'tx'; h1.textContent = b.label;
        const row = document.createElement('div'); row.className = 'row';
        const v = document.createElement('b'); v.textContent = (o.y?.fmt || String)(b.value);
        const nm = document.createElement('span'); nm.textContent = b.series || '';
        row.append(nm, v); tip.append(h1, row);
        if (b.extra) { const e = document.createElement('div'); e.className = 'tx'; e.textContent = b.extra; tip.append(e); }
        tip.hidden = false;
        const rect = svg.getBoundingClientRect(), sc = rect.width / W;
        const left = (x + bw) * sc;
        tip.style.top = `${m.t * sc}px`;
        tip.style.left = `${left + 8 + tip.offsetWidth > rect.width ? x * sc - tip.offsetWidth - 8 : left + 8}px`;
        p.setAttribute('opacity', '0.8');
      };
      const hide = () => { tip.hidden = true; p.removeAttribute('opacity'); };
      hitR.addEventListener('pointerenter', show); hitR.addEventListener('pointerleave', hide);
      p.addEventListener('focus', show); p.addEventListener('blur', hide);
      if (i % every === 0) { const t = el('text', { x: x + bw / 2, y: m.t + ph + 16, 'text-anchor': 'middle' }, svg); t.textContent = b.label; }
    });
    el('line', { x1: m.l, x2: m.l + pw, y1: ys(0), y2: ys(0), stroke: 'var(--chart-axis)' }, svg);
    if (o.xLabel) { const t = el('text', { x: m.l + pw / 2, y: H - 4, 'text-anchor': 'middle' }, svg); t.textContent = o.xLabel; }
  }
  new ResizeObserver(() => draw()).observe(holder);
  draw();
  return { update(next) { current = { ...current, ...next }; draw(); } };
}
