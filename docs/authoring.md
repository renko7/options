# Authoring Lessons

How to write content for the Options Desk Manual. Read [CONTEXT.md](../CONTEXT.md) first; use its terms exactly (Learner, Lesson, Module, Track, Worked Example, Fictional Underlying, Rule Note, Scenario Exercise, Tool, Quiz).

## Who you are writing for

The **Learner** has bought and sold stocks through a broker and has never traded an option. By the end of the Core Track they trade and manage positions on their own; the Advanced Track takes them to practitioner level. Write the way a patient, very experienced options trader explains things to a smart colleague:

- Plain, direct sentences. Short paragraphs. Active voice. No hype, no jokes, no "let's dive in", no rhetorical questions as section openers, no "it's worth noting".
- Define every term the first time it is used in the Course (link it with `[[term]]`).
- Concrete before abstract: show the ACME example, then state the general rule.
- Teach the mechanics *and* the judgment: what professionals actually do, what goes wrong for beginners, what it costs.
- Never give personal investment advice. Describe trade-offs.
- US only. Name real products and institutions (OCC, Cboe, FINRA, IRS, SPX, VIX) when explaining their rules, and put every regulatory, exchange or tax rule in a `:::rule` callout ("as of 2026").
- Never use real tickers for numbers. All numbers use the Fictional Underlying (ACME, HBR).

## The Fictional Underlying (fixed; never change these)

| | ACME Corp (`ACME`) | Harbor 100 Index (`HBR`) |
|---|---|---|
| Spot | $100.00 | 5,000 |
| ATM implied vol | 30% | 18% |
| Dividend | $0.50 quarterly; priced as 2% continuous yield (`ACME.q`) | 1.5% yield (`HBR.q`) |
| Style / settlement | American, physical (100 shares) | European, cash ($100 × index) |

Risk-free rate `RATE` = 4.00%. The Course's "today" is **Wednesday, November 18, 2026** (`TODAY`). Listed ACME expirations (`EXPIRATIONS`): 2 DTE (Nov 20), 9 DTE (Nov 27), **30 DTE (Dec 18, the December monthly)**, 58 DTE (Jan 15, 2027), 121 DTE (Mar 19), 212 DTE (Jun 18), 394 DTE (Dec 17, 2027, LEAPS). Prefer these expirations in examples. Strikes are $5 apart for ACME ($1 near the money is fine for weeklies if you say so), 25 points for HBR.

## Files

```
content/<track>/<NN-module-slug>/module.yaml      title, summary (already exist)
content/<track>/<NN-module-slug>/NN-lesson-slug.md one file per Lesson, numbered in order
content/glossary/<module-id>.yaml                 glossary terms this Module defines
```

The Lesson id is `<module-id>-<lesson-slug>`, e.g. `content/core/03-payoffs/02-long-put.md` → `core-03-long-put`. Slugs are lowercase letters, digits and hyphens.

Each Module has **4–6 Lessons plus exactly one Scenario Exercise, which is its last file** (`kind: scenario`).

## Lesson file format

```markdown
---
title: The long call
summary: One sentence saying what the Learner will be able to do after this Lesson.
---

Body in Markdown…
```

Scenario Exercise files add `kind: scenario` to the front matter and contain a ` ```scenario ` block (below). They have no Quiz.

Length: 900–1,800 words of body text per Lesson (Advanced Lessons with Derivations can run longer). Use `##` for sections (they get anchor ids) and `###` sparingly. Every Lesson needs:

1. at least one Worked Example (`:::example`) with computed numbers;
2. a `:::key` callout summarizing the one or two ideas to remember;
3. a Quiz of 3–5 questions at the end (` ```quiz `).

Embed a Tool wherever the Learner would benefit from moving a slider (most Lessons should have one).

### Numbers: never type a computed number by hand

Every price, Greek, break-even, P&L or probability must come from the pricing library, so all Lessons agree. Put JavaScript in a ` ```calc ` block (it is removed from the output) and insert values with `{{ expression }}`. Expressions must return **strings**, so format numbers with the helpers. A raw number is a build error.

````markdown
```calc
const c105 = bs.price({ S: 100, K: 105, T: 30/365, r: RATE, q: ACME.q, sigma: 0.30, type: 'call' });
const legs = [{ kind: 'call', qty: 1, strike: 105, premium: c105 }];
const s = payoff.summary(legs);
```

The December 105 call costs {{ usd(c105) }} per share, or {{ usd(c105 * 100) }} per contract.
It breaks even at {{ usd(s.breakevens[0]) }}.
````

Round inputs you state in prose (e.g. "you pay $1.53") and then compute from that rounded number, so the arithmetic in the text adds up: `const prem = Number(c105.toFixed(2));`.

Simple given inputs such as "$100", "the 105 strike", "30 days" or "one contract = 100 shares" can be typed. Anything derived goes through `{{ }}`.

Everything below is in scope inside `calc` and `{{ }}`:

| Name | What it is |
|---|---|
| `ACME`, `HBR` | `{symbol, name, spot, iv, q, multiplier, dividend?}` |
| `RATE` | 0.04 |
| `TODAY`, `EXPIRATIONS` | see above |
| `expiryDate(dte)` → `'2026-12-18'`; `longDate(iso)` → `'Dec 18, 2026'` | dates |
| `bs.price(o)` | Black-Scholes price per share. `o = {S, K, T (years), r, q, sigma, type: 'call'\|'put'}` |
| `bs.greeks(o)` | `{price, delta, gamma, theta (per calendar day), vega (per 1 vol point), rho (per 1 rate point), vanna, volga, charm (per day), speed, d1, d2, annual:{theta, vega, rho, charm}}` per share |
| `bs.impliedVol({price, S, K, T, r, q, type})` | implied vol (decimal) |
| `bs.probITM(o)` | risk-neutral probability of finishing in the money |
| `bs.intrinsic({S, K, type})`, `bs.forward({S, T, r, q})` | |
| `binomial.price({S, K, T, r, q, sigma, type, american, steps, dividends:[{t, amount}]})` | `{price}` CRR tree, American exercise, discrete dividends |
| `payoff.*` | legs: `{kind:'call'\|'put', qty (contracts, + long / − short), strike, premium (per share), dte?, iv?}` or `{kind:'stock', qty (shares), price}`. `pnlAtExpiry(legs, S)`, `pnlAt(legs, S, daysPassed, {r, q, ivShift})`, `positionGreeks(legs, S, daysPassed, {r, q})` (delta in shares, theta $/day, vega $/vol pt), `breakevens(legs)`, `extremes(legs)` → `{maxProfit, maxLoss}` (±Infinity when unbounded), `summary(legs)`, `netPremium(legs)` (+ debit, − credit). All P&L in dollars for the whole position. |
| `chain(ACME, {dte})` | `{rows:[{strike, call:{bid, ask, mid, theo, iv, delta, gamma, theta, vega, oi, volume}, put:{…}}]}` — the same quotes the chain Tool shows |
| `smileIV(ACME, K, T)` | implied vol the chain uses for that strike and expiry |
| `occSymbol('ACME', '2026-12-18', 'call', 105)` | `'ACME  261218C00105000'` |
| `sim.gbmPath`, `sim.deltaHedge`, `varswap.fairVariance`, `surface.sviW` … | Advanced-only helpers; see `src/lib/*.js` |
| `usd(x, dp=2)` → `$1,234.56` / `−$3.00`; `signedUsd`; `pct(x, dp=1)` (0.3 → `30.0%`); `num(x, dp=2)`; `signed(x, dp)`; `int(x)` | formatting; `usd(Infinity)` → `unlimited` |

When you quote from the chain (bid/ask), use `chain(...)` so the Lesson matches the chain Tool exactly.

### Math

Inline math `\( … \)`, display math `\[ … \]` (KaTeX syntax). Do not use `$…$`: dollar signs are money. You may put `{{ }}` values inside math.

### Callouts

```markdown
:::example Buying the December 105 call
Body (Markdown, math and {{ }} allowed)…
:::
```

Types: `example` (Worked Example; give it a title), `key` (Key idea), `warning` (a mistake that costs money), `rule` (Rule Note; title it with the rule and "as of 2026"), `practice` (what professionals actually do), `derivation` (a full Derivation; Core Lessons only derive with algebra), `note`.

### Glossary links

`[[delta]]` or `[[the Greek called delta|delta]]` (display text | term). Link a term at its first use in each Lesson, not every use. Terms and which Module defines each are in `docs/glossary-plan.yaml`. You may link any term in that file; you define only your own Module's terms, in `content/glossary/<module-id>.yaml`:

```yaml
- term: Strike price
  aka: [strike, exercise price]
  def: >-
    The price at which the holder of an option may buy (call) or sell (put) the underlying.
  lesson: core-01-calls-and-puts
```

Definitions: one to three sentences, plain, self-contained. `lesson` is the Lesson that teaches it. `aka` holds alternative names (each must be unique across the whole glossary). If you genuinely need a term that is not in the plan, add it to your Module's line in `docs/glossary-plan.yaml` and define it.

### Links between Lessons

`[the long put](#core-03-long-put)`. Link to whole Modules with `#core-05`. Only link to Lesson ids that exist (your own); for other Modules link to the Module id.

### Embedding Tools

A ` ```tool <name> ` block holds a JavaScript object literal (evaluated with the same scope as `calc`, so you can use variables). Keep configs small; omitted fields have sensible defaults.

````markdown
```tool position-builder
{ title: 'Long the December 105 call', legs: [{ kind: 'call', qty: 1, strike: 105, dte: 30, iv: 0.30 }] }
```
````

| Tool | Config |
|---|---|
| `position-builder` | `title`, `legs` (payoff legs; `premium` optional: if omitted it is priced with Black-Scholes at `spot`, the leg's `dte` and `iv` (default: the smile IV)), `spot` (default 100), `underlying` (`'ACME'`/`'HBR'`), `editable` (default true: Learner can edit legs and load presets), `daysPassed` (initial slider value), `ivShift` (initial, in decimals), `range` `[lo, hi]` for the chart's x-axis, `showToday` (default true: also draw P&L before expiry) |
| `pricer` | `S`, `K`, `dte`, `iv`, `r`, `q`, `type` — initial values; all are sliders |
| `greeks-explorer` | `greek` (`'delta'`, `'gamma'`, `'theta'`, `'vega'`, `'price'`), `type`, `K`, `iv`, `dtes` (array, up to 3), `x` (`'spot'` to plot against the underlying price, `'dte'` to plot against days left for ITM/ATM/OTM strikes) |
| `chain` | `underlying` (`'ACME'`/`'HBR'`), `dte` (one of the listed expirations), `view` (`'quote'` or `'greeks'`), `highlight` `[{strike, type}]` |
| `hedge-sim` | `K`, `dte`, `iv`, `realized`, `hedge` (`'none'`,`'weekly'`,`'daily'`,`'intraday'`), `side` (`'long'`/`'short'`), `seed` |
| `vol-surface` | `underlying`, `view` (`'smile'`, `'term'`, `'svi'`) |
| `varswap` | `dte`, `strikeStep`, `skew` |

### Quiz

At the end of every Lesson. 3–5 questions; 3–4 choices each; `answer` is the 0-based index of the right choice. Every explanation says why the right answer is right *and* why the tempting wrong answer is wrong. Prefer questions that make the Learner compute or decide, not recall a definition. Use `{{ }}` for numbers. **Always write text fields as YAML block scalars (`>-`)** so that `[[links]]`, colons and backslashes are safe.

````markdown
```quiz
- q: >-
    You buy one ACME December 105 call for {{ usd(prem) }}. What is your break-even at expiration?
  choices:
    - >-
      {{ usd(105) }}
    - >-
      {{ usd(105 + prem) }}
    - >-
      {{ usd(100 + prem) }}
  answer: 1
  explain: >-
    You need the stock above the strike by the premium you paid…
```
````

### Scenario Exercise

The last file in each Module. A realistic situation with 2–4 sequential decisions; each choice has a `grade` (`best` — exactly one per step, `acceptable`, `poor`) and `feedback` explaining the consequence with numbers. A `wrap` debrief ties it back to the Module. Put a Tool before or after the block if it helps.

````markdown
---
title: The covered call that went too well
summary: Decide what to do when the stock rallies through your short call before expiration.
kind: scenario
---

Short intro paragraph (optional).

```scenario
setup: >-
  You own 300 ACME shares…
steps:
  - prompt: >-
      ACME is at {{ usd(112) }} with 9 days left…
    choices:
      - text: >-
          Buy back the calls
        grade: acceptable
        feedback: >-
          …
      - text: >-
          …
        grade: best
        feedback: >-
          …
wrap: >-
  What this shows…
```
````

## Checking your work

```bash
npm run build -- --only core-03
```

builds just that Module, checks every `{{ }}`, quiz, scenario, callout, glossary link and Lesson link, and lists all problems. A full `npm run build` must also pass before a Module is done. Reread the rendered numbers in `dist/content/<module-id>.json` and check that the sentences around them are true (a break-even should sit between the right numbers, a "small" loss should actually be small, and so on).
