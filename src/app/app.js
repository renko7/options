// Options Desk Manual: router, navigation, Lessons, Quizzes, Scenario Exercises, Glossary, search, Progress.
import { TOOLS, mountTool } from './tools/index.js';
import { ACME, chain, occSymbol, expiryDate, pct } from './lib/index.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v; // only ever build-time compiled course HTML
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
};

// ---------- Progress (this browser only) ----------
const KEY = 'odm.progress.v1';
const progress = (() => {
  let state = { completed: {}, quiz: {}, scen: {}, last: null };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') state = { ...state, ...s }; } catch { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } };
  return {
    isDone: (id) => !!state.completed[id],
    setDone(id, done = true) { if (done) state.completed[id] = Date.now(); else delete state.completed[id]; save(); renderNav(); },
    quiz: (id) => state.quiz[id] || {},
    answer(id, qi, choice) { (state.quiz[id] ||= {})[qi] = choice; save(); },
    resetQuiz(id) { delete state.quiz[id]; save(); },
    scen: (id) => state.scen[id] || {},
    scenAnswer(id, key, choice) { (state.scen[id] ||= {})[key] = choice; save(); },
    resetScen(id) { delete state.scen[id]; save(); },
    last: () => state.last,
    setLast(id) { state.last = id; save(); },
    count: (ids) => ids.filter((id) => state.completed[id]).length,
    clear() { state = { completed: {}, quiz: {}, scen: {}, last: null }; save(); },
  };
})();

// ---------- data ----------
let manifest, glossary = [], searchIndex = [];
const moduleCache = new Map();
const lessonIndex = new Map(); // id -> {track, module, lesson, order}
let order = [];

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}
async function loadModule(mid) {
  if (!moduleCache.has(mid)) moduleCache.set(mid, getJSON(`content/${mid}.json`));
  return moduleCache.get(mid);
}

// ---------- navigation rail ----------
const openMods = new Set();
function renderNav() {
  if (!manifest) return;
  const nav = $('#nav');
  const current = currentLessonId();
  nav.replaceChildren();
  for (const t of manifest.tracks) {
    const ids = t.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const sec = h('section', { class: 'nav-track' },
      h('h2', {}, t.title, h('span', { class: 'count' }, ids.length ? `${progress.count(ids)}/${ids.length}` : '')));
    for (const m of t.modules) {
      const planned = m.status !== 'published';
      const mIds = m.lessons.map((l) => l.id);
      const isOpen = openMods.has(m.id);
      const wrap = h('div', { class: `nav-mod${planned ? ' planned' : ''}` });
      const btn = h('button', {
        type: 'button', 'aria-expanded': planned ? null : String(isOpen),
        onclick: () => { if (planned) { location.hash = m.id; return; } isOpen ? openMods.delete(m.id) : openMods.add(m.id); renderNav(); },
      },
      h('span', { class: 'num' }, String(m.number).padStart(2, '0')),
      h('span', { class: 'mtitle' }, m.title),
      planned ? h('span', { class: 'nav-tag' }, 'Soon') : h('span', { class: 'mprog' }, `${progress.count(mIds)}/${mIds.length}`));
      wrap.append(btn);
      if (!planned) {
        const ol = h('ol', { hidden: !isOpen });
        for (const l of m.lessons) {
          ol.append(h('li', {}, h('a', { href: `#${l.id}`, 'aria-current': l.id === current ? 'page' : null },
            h('span', { class: `check${progress.isDone(l.id) ? ' done' : ''}`, 'aria-label': progress.isDone(l.id) ? 'Completed' : null }),
            h('span', {}, l.kind === 'scenario' ? `Scenario: ${l.title}` : l.title))));
        }
        wrap.append(ol);
      }
      sec.append(wrap);
    }
    nav.append(sec);
  }
  nav.append(h('p', { class: 'nav-foot' }, 'Progress is saved in this browser only. ',
    h('button', { type: 'button', onclick: (e) => {
      const b = e.currentTarget;
      if (b.dataset.armed) { progress.clear(); route(); b.textContent = 'Reset progress'; delete b.dataset.armed; }
      else { b.dataset.armed = '1'; b.textContent = 'Click again to erase all progress'; }
    } }, 'Reset progress')));
}

function closeDrawer() { $('#sidebar').classList.remove('open'); $('#scrim').hidden = true; $('#menu-btn').setAttribute('aria-expanded', 'false'); }
$('#menu-btn').addEventListener('click', () => { const s = $('#sidebar'); const open = !s.classList.contains('open'); s.classList.toggle('open', open); $('#scrim').hidden = !open; $('#menu-btn').setAttribute('aria-expanded', String(open)); });
$('#scrim').addEventListener('click', closeDrawer);

// ---------- routing ----------
function currentLessonId() { return location.hash.slice(1).split('--')[0]; }
async function route() {
  const hash = location.hash.slice(1);
  const [id, anchor] = hash.split('--');
  closeDrawer();
  const main = $('#main');
  try {
    if (!id || id === 'home') renderHome(main);
    else if (id === 'tools') renderToolsPage(main);
    else if (id.startsWith('tool-')) renderToolPage(main, id.slice(5));
    else if (lessonIndex.has(id)) await renderLesson(main, id, anchor);
    else if (findModule(id)) renderModulePage(main, findModule(id));
    else renderNotFound(main);
  } catch (e) {
    main.replaceChildren(h('div', { class: 'page' }, h('h1', {}, 'This page did not load'), h('p', {}, `The course data could not be read (${e.message}). Reload the page to try again.`)));
  }
  renderNav();
  if (!anchor) window.scrollTo(0, 0);
}
function findModule(mid) { for (const t of manifest.tracks) for (const m of t.modules) if (m.id === mid) return { ...m, track: t }; return null; }

// ---------- home ----------
function renderHome(main) {
  document.title = 'Options Desk Manual';
  const last = progress.last();
  const first = order[0];
  const cont = last && lessonIndex.has(last) ? last : null;
  const q105 = chain(ACME, { dte: 30 }).rows.find((r) => r.strike === 105).call;
  const sym = occSymbol('ACME', expiryDate(30), 'call', 105);
  const ticket = h('div', { class: 'ticket', 'aria-label': 'Example option quote' },
    h('div', { class: 'ticket-head' }, h('span', {}, 'OCC symbol'), h('span', {}, 'Fictional Underlying')),
    h('div', { class: 'ticket-sym' }, sym),
    h('div', { class: 'ticket-parts' },
      h('div', {}, h('b', {}, 'ACME'), 'Root'),
      h('div', {}, h('b', {}, expiryDate(30)), 'Expiration'),
      h('div', {}, h('b', {}, 'C'), 'Call'),
      h('div', {}, h('b', {}, '105.000'), 'Strike')),
    h('div', { class: 'ticket-quote' },
      h('div', {}, h('span', {}, 'Bid'), h('b', {}, q105.bid.toFixed(2))),
      h('div', {}, h('span', {}, 'Ask'), h('b', {}, q105.ask.toFixed(2))),
      h('div', {}, h('span', {}, 'Implied vol'), h('b', {}, pct(q105.iv)))));
  const hero = h('section', { class: 'hero' },
    h('div', {},
      h('h1', {}, 'Learn options from the first call to the volatility surface.'),
      h('p', {}, 'A complete course for people who have traded stocks and want to trade options properly. Every number is worked out, every formula is derived, and every idea comes with a tool you can test it in.'),
      h('div', { class: 'hero-actions' },
        cont ? h('a', { class: 'btn primary', href: `#${cont}` }, 'Continue: ', lessonIndex.get(cont).lesson.title) : h('a', { class: 'btn primary', href: `#${first}` }, 'Start the Core Track'),
        h('a', { class: 'btn', href: '#tools' }, 'Open the Tools'))),
    ticket);

  const tracks = h('div', { class: 'tracks' }, manifest.tracks.map((t) => {
    const ids = t.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const done = progress.count(ids);
    const published = t.modules.filter((m) => m.status === 'published').length;
    return h('article', { class: 'track-card' },
      h('h3', {}, t.title), h('p', {}, t.summary),
      ids.length ? [h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': ids.length, 'aria-valuenow': done, 'aria-label': `${t.title} progress` }, h('span', { style: `width:${ids.length ? (done / ids.length) * 100 : 0}%` })),
        h('div', { class: 'meter-label' }, h('span', {}, `${done} of ${ids.length} lessons complete`), h('span', {}, `${published}/${t.modules.length} modules`))]
        : h('div', { class: 'meter-label' }, h('span', {}, `${t.modules.length} modules in preparation`)),
      h('ol', { class: 'mod-list' }, t.modules.map((m) => {
        const mIds = m.lessons.map((l) => l.id);
        return h('li', {}, h('span', { class: 'num' }, String(m.number).padStart(2, '0')),
          m.status === 'published' ? h('a', { href: `#${m.lessons[0].id}` }, m.title) : h('span', { class: 'planned' }, m.title),
          h('span', { class: 'mp' }, m.status === 'published' ? `${progress.count(mIds)}/${mIds.length}` : 'soon'));
      })));
  }));

  const u = h('div', { class: 'underlyings' },
    h('article', { class: 'u-card' }, h('h3', {}, 'ACME Corp'), h('div', { class: 'sym' }, 'ACME · stock'),
      h('p', {}, 'The stock used in every equity Worked Example. Its numbers never change, so you can check every calculation yourself.'),
      h('dl', {}, h('dt', {}, 'Spot'), h('dd', {}, '$100.00'), h('dt', {}, 'Implied volatility'), h('dd', {}, '30% at the money'),
        h('dt', {}, 'Dividend'), h('dd', {}, '$0.50 quarterly (≈2% yield)'), h('dt', {}, 'Risk-free rate'), h('dd', {}, '4.00%'))),
    h('article', { class: 'u-card' }, h('h3', {}, 'Harbor 100 Index'), h('div', { class: 'sym' }, 'HBR · cash-settled index'),
      h('p', {}, 'The index used for index-option and dispersion examples. European-style and cash-settled, like SPX.'),
      h('dl', {}, h('dt', {}, 'Level'), h('dd', {}, '5,000'), h('dt', {}, 'Implied volatility'), h('dd', {}, '18% at the money'),
        h('dt', {}, 'Dividend yield'), h('dd', {}, '1.5%'), h('dt', {}, 'Multiplier'), h('dd', {}, '$100 per point'))));

  main.replaceChildren(h('div', { class: 'home' }, hero,
    h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Two Tracks'), h('p', {}, 'Core gets you trading and managing positions on your own. Advanced covers what professional volatility traders know.')), tracks),
    h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'The Fictional Underlying'), h('p', {}, 'Real products like SPX and VIX are named wherever their rules matter. The numbers always come from these two.')), u),
    h('section', {}, h('div', { class: 'section-head' }, h('h2', {}, 'Tools'), h('p', {}, 'Each Tool also appears inside the Lessons that use it.')), toolGrid()),
    h('p', { class: 'disclaimer' }, 'Educational material only, not investment, legal or tax advice. Options involve risk and are not suitable for every investor; read the OCC booklet “Characteristics and Risks of Standardized Options” before trading. Regulatory and tax material reflects US rules as of 2026.')));
}

function toolGrid() {
  return h('div', { class: 'tool-grid' }, Object.entries(TOOLS).map(([name, t]) =>
    h('a', { class: 'tool-card', href: `#tool-${name}` }, h('span', { class: 'track-tag' }, t.track), h('b', {}, t.title), h('span', {}, t.blurb))));
}
function renderToolsPage(main) {
  document.title = 'Tools · Options Desk Manual';
  main.replaceChildren(h('div', { class: 'tools-page' },
    h('div', { class: 'eyebrow' }, 'Tools'), h('h1', { class: 'page-title', style: 'font-family:var(--font-display);font-stretch:88%;font-size:var(--step-4);margin:8px 0 18px' }, 'Tools'), toolGrid()));
}
function renderToolPage(main, name) {
  const t = TOOLS[name];
  if (!t) return renderNotFound(main);
  document.title = `${t.title} · Options Desk Manual`;
  const slot = h('div', { class: 'tool-embed' });
  main.replaceChildren(h('div', { class: 'tool-page' },
    h('div', { class: 'eyebrow' }, h('a', { href: '#tools' }, 'Tools'), h('span', {}, t.track)),
    h('h1', { style: 'font-family:var(--font-display);font-stretch:88%;font-size:var(--step-4);margin:8px 0 6px' }, t.title),
    h('p', { class: 'lede' }, t.blurb), slot));
  mountTool(slot, name, t.defaults || {});
}
function renderNotFound(main) {
  main.replaceChildren(h('div', { class: 'page' }, h('h1', {}, 'Page not found'), h('p', {}, 'That link does not match a Lesson or Tool. ', h('a', { href: '#home' }, 'Go to the start'))));
}
function renderModulePage(main, m) {
  document.title = `${m.title} · Options Desk Manual`;
  main.replaceChildren(h('div', { class: 'planned-page' },
    h('div', { class: 'eyebrow' }, h('span', {}, m.track.title), h('span', {}, `Module ${String(m.number).padStart(2, '0')}`)),
    h('h1', { style: 'font-family:var(--font-display);font-stretch:88%;font-size:var(--step-4);margin:8px 0 10px' }, m.title),
    h('p', { class: 'lede' }, m.summary),
    m.status === 'published'
      ? h('ol', { class: 'mod-list' }, m.lessons.map((l, i) => h('li', {}, h('span', { class: 'num' }, String(i + 1)), h('a', { href: `#${l.id}` }, l.title), h('span', { class: 'mp' }, `${l.minutes} min`))))
      : h('p', { class: 'empty-note' }, 'This Module is in preparation and will be published to this same page. The Core Track is complete; start there if you have not finished it.')));
}

// ---------- lesson ----------
async function renderLesson(main, id, anchor) {
  const info = lessonIndex.get(id);
  const data = await loadModule(info.module.id);
  const L = data.lessons.find((l) => l.id === id);
  progress.setLast(id);
  document.title = `${L.title} · Options Desk Manual`;
  openMods.add(info.module.id);
  const idx = order.indexOf(id);
  const prev = order[idx - 1], next = order[idx + 1];
  const lessonNo = info.module.lessons.findIndex((l) => l.id === id) + 1;

  const body = h('div', { class: 'prose', html: L.html });
  const page = h('article', { class: 'page' },
    h('div', { class: 'eyebrow' },
      h('span', {}, info.track.title.replace(' Track', '')),
      h('a', { href: `#${info.module.id}` }, `Module ${String(info.module.number).padStart(2, '0')} · ${info.module.title}`),
      h('span', {}, L.kind === 'scenario' ? 'Scenario Exercise' : `Lesson ${lessonNo} of ${info.module.lessons.length}`)),
    h('h1', {}, L.title),
    h('p', { class: 'lede' }, L.summary),
    h('div', { class: 'meta-row' }, h('span', {}, `${L.minutes} min`), progress.isDone(id) ? h('span', {}, 'Completed') : null),
    body);

  // tools
  body.querySelectorAll('.tool-embed').forEach((slot) => {
    let cfg = {};
    try { cfg = JSON.parse(slot.dataset.config || '{}'); } catch { /* bad config */ }
    mountTool(slot, slot.dataset.tool, cfg);
  });
  // scenarios
  body.querySelectorAll('.scenario-embed').forEach((slot) => renderScenario(slot, L, +slot.dataset.scenario));
  // glossary links
  body.addEventListener('click', onTermClick);

  if (L.quiz?.length) page.append(renderQuiz(L));

  const end = h('div', { class: 'lesson-end' });
  const drawEnd = () => {
    const done = progress.isDone(id);
    end.replaceChildren(
      h('span', { class: 'status' }, done ? 'You have completed this Lesson.' : L.kind === 'scenario' ? 'Work through every decision to complete this Scenario Exercise.' : 'Answer every Quiz question to complete this Lesson, or mark it complete yourself.'),
      h('button', { class: `btn ${done ? '' : 'primary'} small`, type: 'button', onclick: () => { progress.setDone(id, !done); drawEnd(); } }, done ? 'Mark as not complete' : 'Mark complete'));
  };
  drawEnd();
  page.addEventListener('lesson-complete', () => { if (!progress.isDone(id)) { progress.setDone(id, true); } drawEnd(); });
  page.append(end);
  const pager = h('nav', { class: 'pager', 'aria-label': 'Lesson navigation' });
  if (prev) pager.append(h('a', { class: 'prev', href: `#${prev}` }, h('span', { class: 'dir' }, 'Previous'), h('span', { class: 't' }, lessonIndex.get(prev).lesson.title)));
  if (next) pager.append(h('a', { class: 'next', href: `#${next}` }, h('span', { class: 'dir' }, 'Next'), h('span', { class: 't' }, lessonIndex.get(next).lesson.title)));
  page.append(pager);
  main.replaceChildren(page);
  if (anchor) { const target = document.getElementById(`${id}--${anchor}`); if (target) target.scrollIntoView(); }
}

const LETTERS = 'ABCDE';
function renderQuiz(L) {
  const sec = h('section', { class: 'quiz', 'aria-label': 'Quiz' });
  const draw = () => {
    const saved = progress.quiz(L.id);
    const answered = Object.keys(saved).length;
    const correct = L.quiz.filter((q, i) => saved[i] === q.answer).length;
    sec.replaceChildren(h('h2', {}, 'Quiz'), h('p', { class: 'quiz-intro' }, `${L.quiz.length} questions. Each answer comes with an explanation.`));
    L.quiz.forEach((q, qi) => {
      const pick = saved[qi];
      const locked = pick !== undefined;
      const box = h('div', { class: 'q' },
        h('p', { class: 'q-text' }, h('span', { class: 'q-num' }, `${qi + 1}.`), h('span', { html: q.q })));
      const choices = h('div', { class: 'q-choices', role: 'group' });
      q.choices.forEach((c, ci) => {
        let cls = 'q-choice';
        if (locked && ci === q.answer) cls += ' correct';
        else if (locked && ci === pick) cls += ' wrong';
        choices.append(h('button', { class: cls, type: 'button', disabled: locked, onclick: () => {
          progress.answer(L.id, qi, ci); draw();
          if (Object.keys(progress.quiz(L.id)).length === L.quiz.length) sec.dispatchEvent(new CustomEvent('lesson-complete', { bubbles: true }));
        } }, h('span', { class: 'letter' }, LETTERS[ci]), h('span', { html: c })));
      });
      box.append(choices);
      if (locked) {
        const ok = pick === q.answer;
        box.append(h('div', { class: `q-verdict ${ok ? 'ok' : 'no'}` }, ok ? 'Correct' : `Not quite. The answer is ${LETTERS[q.answer]}.`), h('div', { class: 'q-explain', html: q.explain }));
      }
      sec.append(box);
    });
    if (answered === L.quiz.length) {
      sec.append(h('p', { class: 'quiz-score' }, `You got ${correct} of ${L.quiz.length} right.`),
        h('button', { class: 'btn small', type: 'button', onclick: () => { progress.resetQuiz(L.id); draw(); } }, 'Retake the Quiz'));
    }
    sec.addEventListener('click', onTermClick);
  };
  draw();
  return sec;
}

function renderScenario(slot, L, si) {
  const sc = L.scenarios[si];
  const wrap = h('div', { class: 'scenario' });
  slot.replaceWith(wrap);
  const draw = () => {
    const saved = progress.scen(L.id);
    wrap.replaceChildren();
    if (sc.setup) wrap.append(h('div', { class: 'sc-setup', html: sc.setup }));
    let i = 0;
    for (; i < sc.steps.length; i++) {
      const st = sc.steps[i];
      const key = `${si}:${i}`;
      const pick = saved[key];
      const locked = pick !== undefined;
      const box = h('div', { class: 'sc-step' }, h('div', { class: 'sc-step-label' }, `Decision ${i + 1} of ${sc.steps.length}`), h('div', { html: st.prompt }));
      const choices = h('div', { class: 'q-choices' });
      st.choices.forEach((c, ci) => {
        const cls = `q-choice${locked ? ` ${c.grade}` : ''}`;
        choices.append(h('button', { class: cls, type: 'button', disabled: locked, onclick: () => {
          progress.scenAnswer(L.id, key, ci); draw();
          const allDone = L.scenarios.every((s, sj) => s.steps.every((_, k) => progress.scen(L.id)[`${sj}:${k}`] !== undefined));
          if (allDone) wrap.dispatchEvent(new CustomEvent('lesson-complete', { bubbles: true }));
        } }, h('span', { class: 'letter' }, LETTERS[ci]),
          h('span', {}, locked ? h('span', { class: `grade-tag ${c.grade}` }, c.grade === 'best' ? 'Best' : c.grade === 'acceptable' ? 'Acceptable' : 'Poor') : null, h('span', { html: c.text }))));
      });
      box.append(choices);
      if (locked) box.append(h('div', { class: 'q-explain', html: st.choices[pick].feedback }));
      wrap.append(box);
      if (!locked) break;
    }
    if (i >= sc.steps.length) {
      if (sc.wrap) wrap.append(h('div', { class: 'sc-wrap callout callout-key', html: `<div class="callout-label">Debrief</div>${sc.wrap}` }));
      wrap.append(h('button', { class: 'btn small', type: 'button', onclick: () => { progress.resetScen(L.id); draw(); } }, 'Start the scenario again'));
    }
    wrap.addEventListener('click', onTermClick);
  };
  draw();
}

// ---------- glossary ----------
function onTermClick(e) {
  const a = e.target.closest('a.term');
  if (!a) return;
  e.preventDefault();
  openGlossary(a.dataset.term);
}
function renderGlossaryList(filter = '', flash) {
  const f = filter.trim().toLowerCase();
  const list = $('#glossary-list');
  list.replaceChildren();
  const items = glossary.filter((t) => !f || t.term.toLowerCase().includes(f) || t.aka.some((a) => a.toLowerCase().includes(f)));
  if (!items.length) list.append(h('p', { class: 'sr-empty' }, `No term matches “${filter}”.`));
  for (const t of items) {
    const lesson = t.lesson && lessonIndex.get(t.lesson);
    list.append(h('div', { class: `gp-term${t.slug === flash ? ' flash' : ''}`, id: `gl-${t.slug}` },
      h('h3', {}, t.term), t.aka.length ? h('div', { class: 'aka' }, `Also: ${t.aka.join(', ')}`) : null,
      h('div', { class: 'def', html: t.def }),
      lesson ? h('a', { class: 'from', href: `#${t.lesson}`, onclick: () => closeGlossary() }, `Taught in: ${lesson.lesson.title}`) : null));
  }
}
function openGlossary(slug) {
  const p = $('#glossary-panel');
  p.hidden = false;
  $('#glossary-filter').value = '';
  renderGlossaryList('', slug);
  if (slug) { const n = document.getElementById(`gl-${slug}`); if (n) n.scrollIntoView({ block: 'start' }); }
  $('#glossary-close').focus();
}
function closeGlossary() { $('#glossary-panel').hidden = true; }
$('#glossary-btn').addEventListener('click', () => openGlossary());
$('#glossary-close').addEventListener('click', closeGlossary);
$('#glossary-filter').addEventListener('input', (e) => renderGlossaryList(e.target.value));
$('#glossary-list').addEventListener('click', onTermClick);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeGlossary(); $('#search-results').hidden = true; closeDrawer(); } });

// ---------- search ----------
const sInput = $('#search-input'), sResults = $('#search-results');
function runSearch(q) {
  q = q.trim().toLowerCase();
  sResults.replaceChildren();
  if (q.length < 2) { sResults.hidden = true; return; }
  const terms = glossary.map((t) => {
    const name = t.term.toLowerCase();
    const score = name === q ? 100 : name.startsWith(q) ? 60 : name.includes(q) ? 40 : t.aka.some((a) => a.toLowerCase().includes(q)) ? 35 : 0;
    return { t, score };
  }).filter((x) => x.score).sort((a, b) => b.score - a.score).slice(0, 4);
  const lessons = searchIndex.map((l) => {
    const title = l.title.toLowerCase();
    const i = l.text.toLowerCase().indexOf(q);
    const score = title.includes(q) ? 50 : l.summary.toLowerCase().includes(q) ? 30 : i >= 0 ? 10 : 0;
    return { l, score, i };
  }).filter((x) => x.score).sort((a, b) => b.score - a.score).slice(0, 6);
  for (const { t } of terms) {
    sResults.append(h('button', { type: 'button', class: 'sr-term', onclick: () => { sResults.hidden = true; openGlossary(t.slug); } },
      h('span', { class: 'sr-kind' }, 'Glossary'), h('span', { class: 'sr-title' }, t.term)));
  }
  for (const { l, i } of lessons) {
    const snip = i >= 0 ? '…' + l.text.slice(Math.max(0, i - 40), i + 80).trim() + '…' : l.summary;
    sResults.append(h('a', { href: `#${l.id}`, onclick: () => { sResults.hidden = true; sInput.value = ''; } },
      h('span', { class: 'sr-kind' }, 'Lesson'), h('span', { class: 'sr-title' }, l.title), h('span', { class: 'sr-snip' }, snip)));
  }
  if (!terms.length && !lessons.length) sResults.append(h('div', { class: 'sr-empty' }, `Nothing matches “${q}”.`));
  sResults.hidden = false;
}
sInput.addEventListener('input', () => runSearch(sInput.value));
sInput.addEventListener('focus', () => { if (sInput.value.trim().length >= 2) runSearch(sInput.value); });
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) sResults.hidden = true; });

// ---------- boot ----------
(async function boot() {
  try {
    [manifest, glossary, searchIndex] = await Promise.all([getJSON('manifest.json'), getJSON('glossary.json'), getJSON('search.json')]);
  } catch (e) {
    $('#main').replaceChildren(h('div', { class: 'page' }, h('h1', {}, 'The course did not load'), h('p', {}, `Reload the page to try again. (${e.message})`)));
    return;
  }
  for (const t of manifest.tracks) for (const m of t.modules) for (const l of m.lessons) {
    lessonIndex.set(l.id, { track: t, module: m, lesson: l });
    order.push(l.id);
  }
  const cur = currentLessonId();
  if (lessonIndex.has(cur)) openMods.add(lessonIndex.get(cur).module.id);
  else if (order[0]) openMods.add(lessonIndex.get(order[0]).module.id);
  window.addEventListener('hashchange', route);
  route();
})();
