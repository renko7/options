// Build the Course: content/**.md + src/app + src/lib -> dist/
// Usage: node scripts/build.mjs [--only core-03]   (--only limits which modules are compiled, for fast authoring checks)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import katex from 'katex';
import YAML from 'yaml';
import * as lib from '../src/lib/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const DIST = path.join(ROOT, 'dist');
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();

const TOOLS = ['position-builder', 'pricer', 'greeks-explorer', 'chain', 'hedge-sim', 'vol-surface', 'varswap'];
const CALLOUTS = {
  note: 'Note', key: 'Key idea', warning: 'Watch out', example: 'Worked Example',
  rule: 'Rule Note', derivation: 'Derivation', practice: 'In practice',
};

const errors = [];
const planned = new Set(Object.values(YAML.parse(fs.readFileSync(path.join(ROOT, 'docs', 'glossary-plan.yaml'), 'utf8')) || {}).flat().map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')));
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const marked = new Marked({ gfm: true, breaks: false });

// ---------- math ----------
function renderMath(tex, display, where) {
  // A bare % in TeX starts a comment; in this Course it always means "percent" (often from {{ pct() }}).
  tex = tex.replace(/(^|[^\\])%/g, '$1\\%');
  try {
    return katex.renderToString(tex, { displayMode: display, output: 'mathml', throwOnError: true, strict: 'ignore' });
  } catch (e) {
    fail(where, `math error in "${tex.slice(0, 60)}": ${e.message}`);
    return `<code>${tex}</code>`;
  }
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------- glossary ----------
function loadGlossary() {
  const dir = path.join(CONTENT, 'glossary');
  const terms = new Map();
  if (!fs.existsSync(dir)) return terms;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort()) {
    const list = YAML.parse(fs.readFileSync(path.join(dir, f), 'utf8')) || [];
    for (const t of list) {
      const where = `glossary/${f} "${t.term}"`;
      if (!t.term || !t.def) { fail(where, 'needs term and def'); continue; }
      const slug = slugify(t.term);
      if (terms.has(slug)) { fail(where, `duplicate of term in ${terms.get(slug).file}`); continue; }
      terms.set(slug, { ...t, slug, file: f });
      for (const a of t.aka || []) {
        const s = slugify(a);
        if (terms.has(s)) fail(where, `alias "${a}" collides with ${terms.get(s).term}`);
        else terms.set(s, { alias: slug });
      }
    }
  }
  return terms;
}

// ---------- markdown with extensions ----------
function makeRenderer(glossary, where) {
  // Converts our markdown dialect to HTML. Used for lesson bodies and for quiz/scenario fields.
  return function render(src, { inline = false } = {}) {
    const math = [];
    let s = src;
    // math first, so markdown escapes never touch it
    s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => { math.push(renderMath(t, true, where)); return `MATHTOKEN${math.length - 1}X`; });
    s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => { math.push(renderMath(t, false, where)); return `MATHTOKEN${math.length - 1}X`; });
    // glossary links [[term]] or [[text|term]]
    s = s.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, a, b) => {
      const text = a.trim(), term = (b || a).trim();
      let slug = slugify(term);
      const hit = glossary.get(slug);
      if (!hit) {
        if (only && planned.has(slug)) { /* defined by another module; checked in the full build */ }
        else fail(where, `glossary term not found: [[${term}]]${planned.has(slug) ? ' (planned for another module; not written yet)' : ' (not in docs/glossary-plan.yaml either)'}`);
      }
      else if (hit.alias) slug = hit.alias;
      return `<a class="term" href="#glossary" data-term="${slug}">${text}</a>`;
    });
    // callouts  :::type Optional title  ...  :::
    s = s.replace(/^:::(\w+)[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm, (_, type, title, inner) => {
      if (!CALLOUTS[type]) fail(where, `unknown callout :::${type}`);
      const label = CALLOUTS[type] || type;
      const t = title.trim();
      return `<aside class="callout callout-${type}"><div class="callout-label">${label}${t ? ` <span class="callout-title">${t}</span>` : ''}</div>\n\n${inner}\n\n</aside>\n`;
    });
    let html = inline ? marked.parseInline(s) : marked.parse(s);
    html = html.replace(/<p>MATHTOKEN(\d+)X<\/p>/g, (_, i) => `<div class="math-display">${math[+i]}</div>`);
    html = html.replace(/MATHTOKEN(\d+)X/g, (_, i) => math[+i]);
    html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    return html;
  };
}

// ---------- one lesson ----------
function shuffledOrder(n, seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const LIB_NAMES = Object.keys(lib);
const LIB_VALUES = LIB_NAMES.map((k) => lib[k]);

function compileLesson(file, id, glossary) {
  const where = path.relative(ROOT, file);
  const raw = fs.readFileSync(file, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) { fail(where, 'missing front matter'); return null; }
  const meta = YAML.parse(fm[1]) || {};
  let body = raw.slice(fm[0].length);
  if (!meta.title) fail(where, 'front matter needs title');
  if (!meta.summary) fail(where, 'front matter needs summary');
  const kind = meta.kind || 'lesson';

  // 1. calc blocks
  const calc = [];
  body = body.replace(/^```calc\n([\s\S]*?)^```\s*$/gm, (_, code) => { calc.push(code); return ''; });
  // 2. tool blocks
  const toolSrc = [];
  body = body.replace(/^```tool[ \t]+([\w-]+)[ \t]*\n([\s\S]*?)^```\s*$/gm, (_, name, cfg) => {
    if (!TOOLS.includes(name)) fail(where, `unknown tool "${name}" (known: ${TOOLS.join(', ')})`);
    toolSrc.push({ name, cfg: cfg.trim() || '{}' });
    return `TOOLTOKEN${toolSrc.length - 1}X`;
  });
  // 3. evaluate {{ expr }} and tool configs in one scope with the calc code
  const exprs = [];
  body.replace(/\{\{([\s\S]+?)\}\}/g, (_, e) => { exprs.push(e.trim()); return ''; });
  let values = [], toolConfigs = [];
  try {
    const fn = new Function(...LIB_NAMES, `"use strict";\n${calc.join('\n')}\nreturn {\n e: [${exprs.map((e) => `() => (${e})`).join(',\n')}],\n t: [${toolSrc.map((t) => `() => (${t.cfg})`).join(',\n')}] };`);
    const out = fn(...LIB_VALUES);
    values = out.e.map((f, i) => {
      try {
        const v = f();
        if (typeof v === 'number') fail(where, `{{ ${exprs[i]} }} returned a raw number; format it with usd(), num(), pct(), int() …`);
        if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) fail(where, `{{ ${exprs[i]} }} returned ${v}`);
        return String(v);
      } catch (e) { fail(where, `{{ ${exprs[i]} }} threw: ${e.message}`); return '??'; }
    });
    toolConfigs = out.t.map((f, i) => {
      try { return JSON.parse(JSON.stringify(f())); } catch (e) { fail(where, `tool ${toolSrc[i].name} config threw: ${e.message}`); return {}; }
    });
  } catch (e) {
    fail(where, `calc block failed: ${e.message}`);
  }
  let k = 0;
  body = body.replace(/\{\{([\s\S]+?)\}\}/g, () => values[k++] ?? '??');

  const render = makeRenderer(glossary, where);

  // 4. quiz and scenario blocks
  let quiz = [];
  body = body.replace(/^```quiz\n([\s\S]*?)^```\s*$/gm, (_, y) => {
    let q;
    try { q = YAML.parse(y); } catch (e) { fail(where, `quiz YAML: ${e.message}`); return ''; }
    if (!Array.isArray(q)) { fail(where, 'quiz must be a YAML list'); return ''; }
    q.forEach((item, i) => {
      const w = `quiz #${i + 1}`;
      if (!item.q || !Array.isArray(item.choices) || item.answer === undefined || !item.explain) fail(where, `${w} needs q, choices, answer, explain`);
      else if (item.choices.length < 2 || item.choices.length > 5) fail(where, `${w} needs 2–5 choices`);
      else if (!(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.choices.length)) fail(where, `${w} answer must be a 0-based index into choices`);
    });
    quiz = q.filter((x) => x.q && Array.isArray(x.choices)).map((item, qi) => {
      // Shuffle choices deterministically (seeded by lesson id and question) so the right
      // answer's position carries no signal, but stays stable across rebuilds.
      const order = shuffledOrder(item.choices.length, `${id}#${qi}`);
      return {
        q: render(String(item.q), { inline: true }),
        choices: order.map((k) => render(String(item.choices[k]), { inline: true })),
        answer: order.indexOf(item.answer),
        explain: render(String(item.explain ?? '')),
      };
    });
    return '';
  });
  const scenarios = [];
  body = body.replace(/^```scenario\n([\s\S]*?)^```\s*$/gm, (_, y) => {
    let sc;
    try { sc = YAML.parse(y); } catch (e) { fail(where, `scenario YAML: ${e.message}`); return ''; }
    if (!sc || !Array.isArray(sc.steps) || !sc.steps.length) { fail(where, 'scenario needs steps'); return ''; }
    sc.steps.forEach((st, i) => {
      const best = (st.choices || []).filter((c) => c.grade === 'best').length;
      if (best !== 1) fail(where, `scenario step ${i + 1} needs exactly one choice with grade: best`);
      for (const c of st.choices || []) if (!['best', 'acceptable', 'poor'].includes(c.grade)) fail(where, `scenario step ${i + 1}: grade must be best | acceptable | poor`);
    });
    scenarios.push({
      setup: sc.setup ? render(String(sc.setup)) : '',
      steps: sc.steps.map((st, si) => ({
        prompt: render(String(st.prompt ?? '')),
        choices: shuffledOrder((st.choices || []).length, `${id}@${scenarios.length}:${si}`).map((k) => st.choices[k]).map((c) => ({ text: render(String(c.text), { inline: true }), grade: c.grade, feedback: render(String(c.feedback ?? '')) })),
      })),
      wrap: sc.wrap ? render(String(sc.wrap)) : '',
    });
    return `SCENTOKEN${scenarios.length - 1}X`;
  });

  if (kind === 'lesson' && (quiz.length < 3 || quiz.length > 5)) fail(where, `a lesson needs 3–5 quiz questions (has ${quiz.length})`);
  if (kind === 'scenario' && scenarios.length === 0) fail(where, 'a scenario lesson needs a ```scenario block');

  // 5. markdown
  let html = render(body);
  html = html.replace(/(<p>)?TOOLTOKEN(\d+)X(<\/p>)?/g, (_, a, i) => {
    const t = toolSrc[+i];
    const cfg = JSON.stringify(toolConfigs[+i] || {}).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
    return `<div class="tool-embed" data-tool="${t.name}" data-config='${cfg}'></div>`;
  });
  html = html.replace(/(<p>)?SCENTOKEN(\d+)X(<\/p>)?/g, (_, a, i) => `<div class="scenario-embed" data-scenario="${i}"></div>`);
  html = html.replace(/<h2>(.*?)<\/h2>/g, (_, t) => `<h2 id="${id}--${slugify(t.replace(/<[^>]+>/g, ''))}">${t}</h2>`);
  if (/\{\{|\}\}|```/.test(html)) fail(where, 'leftover {{ }} or ``` in output');

  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const links = [...html.matchAll(/href="#([a-z0-9-]+)"/g)].map((m) => m[1]).filter((h) => h !== 'glossary');
  return {
    id, kind, title: meta.title, summary: meta.summary,
    minutes: Math.max(3, Math.round(words / 200 + quiz.length * 0.75 + toolSrc.length * 2)),
    html, quiz, scenarios, links, where,
    text: (meta.title + ' ' + body).replace(/<[^>]+>|[#*_`>|\\]/g, ' ').replace(/\s+/g, ' ').slice(0, 20000),
  };
}

// ---------- course ----------
function build() {
  const glossary = loadGlossary();
  const manifest = { title: 'Options Desk Manual', builtAt: new Date().toISOString().slice(0, 10), tracks: [] };
  const allIds = new Set();
  const lessonsOut = [];
  for (const track of ['core', 'advanced']) {
    const tdir = path.join(CONTENT, track);
    if (!fs.existsSync(tdir)) continue;
    const tmeta = YAML.parse(fs.readFileSync(path.join(tdir, 'track.yaml'), 'utf8'));
    const t = { id: track, title: tmeta.title, summary: tmeta.summary, modules: [] };
    for (const mdir of fs.readdirSync(tdir).filter((d) => /^\d\d-/.test(d)).sort()) {
      const num = mdir.slice(0, 2);
      const mid = `${track}-${num}`;
      allIds.add(mid);
      const mfile = path.join(tdir, mdir, 'module.yaml');
      if (!fs.existsSync(mfile)) { fail(`${track}/${mdir}`, 'missing module.yaml'); continue; }
      const mmeta = YAML.parse(fs.readFileSync(mfile, 'utf8'));
      const files = fs.readdirSync(path.join(tdir, mdir)).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
      const mod = { id: mid, number: +num, title: mmeta.title, summary: mmeta.summary, status: files.length ? 'published' : 'planned', lessons: [] };
      const compiled = [];
      for (const f of files) {
        const id = `${mid}-${f.slice(3, -3)}`;
        if (!/^[a-z0-9-]+$/.test(id)) fail(f, `lesson id "${id}" must be lowercase letters, digits and hyphens`);
        allIds.add(id);
        if (only && !mid.startsWith(only)) { mod.lessons.push({ id, title: '(skipped)', kind: 'lesson', minutes: 0 }); continue; }
        const L = compileLesson(path.join(tdir, mdir, f), id, glossary);
        if (!L) continue;
        compiled.push(L);
        mod.lessons.push({ id, title: L.title, summary: L.summary, kind: L.kind, minutes: L.minutes });
      }
      if (compiled.length) {
        const kinds = compiled.map((l) => l.kind);
        if (kinds.filter((k) => k === 'scenario').length !== 1 || kinds[kinds.length - 1] !== 'scenario') fail(`${track}/${mdir}`, 'a module needs exactly one Scenario Exercise, as its last lesson');
        lessonsOut.push(...compiled);
        fs.mkdirSync(path.join(DIST, 'content'), { recursive: true });
        fs.writeFileSync(path.join(DIST, 'content', `${mid}.json`), JSON.stringify({
          id: mid, lessons: compiled.map(({ id, kind, title, summary, html, quiz, scenarios, minutes }) => ({ id, kind, title, summary, html, quiz, scenarios, minutes })),
        }));
      }
      t.modules.push(mod);
    }
    manifest.tracks.push(t);
  }
  for (const L of lessonsOut) for (const h of L.links) {
    if (!allIds.has(h) && !h.includes('--') && !['home', 'tools', 'glossary-page'].includes(h) && !h.startsWith('tool-')) fail(L.where, `link to unknown lesson #${h}`);
  }
  // glossary
  const gl = [];
  for (const [slug, t] of glossary) {
    if (t.alias) continue;
    const render = makeRenderer(glossary, `glossary "${t.term}"`);
    gl.push({ slug, term: t.term, aka: t.aka || [], def: render(String(t.def)), lesson: t.lesson || null });
    if (t.lesson && !allIds.has(t.lesson)) fail(`glossary "${t.term}"`, `lesson ${t.lesson} not found`);
  }
  gl.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  // search index: lesson titles, summaries and text
  const search = lessonsOut.map((L) => ({ id: L.id, title: L.title, summary: L.summary, text: L.text }));

  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(DIST, 'glossary.json'), JSON.stringify(gl));
  fs.writeFileSync(path.join(DIST, 'search.json'), JSON.stringify(search));
  // app + lib
  copyDir(path.join(ROOT, 'src', 'app'), DIST);
  copyDir(path.join(ROOT, 'src', 'lib'), path.join(DIST, 'lib'), (f) => !f.endsWith('.test.js'));

  const nLessons = lessonsOut.length;
  console.log(`built ${nLessons} lessons, ${gl.length} glossary terms -> dist/`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
    process.exit(1);
  }
}

function copyDir(src, dst, filter = () => true) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, filter);
    else if (filter(f)) fs.copyFileSync(s, d);
  }
}

build();
