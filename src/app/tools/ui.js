// Shared building blocks for Tools.
export const h = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
};

let uid = 0;
export const nextId = (p) => `${p}-${++uid}`;

/** Range slider with a live value readout. */
export function slider({ label, min, max, step, value, fmt = String, onInput }) {
  const id = nextId('rng');
  const out = h('output', { for: id }, fmt(value));
  const input = h('input', { type: 'range', id, min, max, step, value });
  input.addEventListener('input', () => { out.textContent = fmt(+input.value); onInput(+input.value); });
  const wrap = h('div', { class: 'ctl' }, h('label', { for: id }, h('span', {}, label), out), input);
  wrap.set = (v) => { input.value = v; out.textContent = fmt(+v); };
  wrap.input = input;
  return wrap;
}

/** Segmented button group. */
export function seg(label, options, value, onChange) {
  const g = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  const btns = options.map(([v, text]) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(v === value) }, text);
    b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onChange(v); });
    return b;
  });
  g.append(...btns);
  return h('div', { class: 'ctl' }, h('span', { class: 'lbl' }, label), g);
}

/** Stat tile; returns {node, set(text, cls)} */
export function stat(label, wide = false) {
  const b = h('b', {}, '—');
  const node = h('div', { class: `stat${wide ? ' wide' : ''}` }, h('span', {}, label), b);
  return { node, set(text, cls) { b.textContent = text; b.className = cls || ''; } };
}

export function frame(title, kind, ...kids) {
  return h('div', { class: 'tool' }, h('div', { class: 'tool-head' }, h('span', { class: 'tool-title' }, title), h('span', { class: 'tool-kind' }, kind)), ...kids);
}

export const signCls = (x) => (x > 0.005 ? 'pos' : x < -0.005 ? 'neg' : '');
