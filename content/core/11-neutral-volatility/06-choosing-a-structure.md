---
title: Long premium, short premium and choosing a structure
summary: Classify any position as long or short premium from its Greeks, and choose a structure from a view on direction, volatility and time.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const dec = chain(ACME, { dte: 30 });
const jan = chain(ACME, { dte: 58 });
const D = (k) => dec.rows.find((r) => r.strike === k);
const J = (k) => jan.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
const leg = (kind, qty, k, dte = 30, prem) => {
  const q = (dte === 30 ? D(k) : J(k))[kind];
  return { kind, qty, strike: k, premium: prem ?? q.mid, dte, iv: q.iv };
};
const cpx = (K) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T), type: 'call' });
const dens = (K) => Math.exp(RATE * T) * (cpx(K - 0.05) - 2 * cpx(K) + cpx(K + 0.05)) / 0.0025;
const stats = (legs) => {
  let pw = 0, win = 0, pl = 0, loss = 0;
  for (let x = 50; x < 200; x += 0.05) {
    const f = dens(x) * 0.05, v = payoff.pnlAtExpiry(legs, x);
    if (v > 0) { pw += f; win += f * v; } else { pl += f; loss += f * v; }
  }
  return { pop: pw, avgWin: win / pw, avgLoss: loss / pl };
};
const book = [
  ['Long 100 call', [leg('call', 1, 100)]],
  ['100/105 bull call spread', [leg('call', 1, 100), leg('call', -1, 105)]],
  ['Short 95 put', [leg('put', -1, 95)]],
  ['Long 100 straddle', [leg('call', 1, 100), leg('put', 1, 100)]],
  ['Short 95/105 strangle', [leg('put', -1, 95), leg('call', -1, 105)]],
  ['90/95/105/110 iron condor', [leg('put', 1, 90), leg('put', -1, 95), leg('call', -1, 105), leg('call', 1, 110)]],
  ['95/100/105 call butterfly', [leg('call', 1, 95), leg('call', -2, 100), leg('call', 1, 105)]],
  ['Dec/Jan 100 call calendar', [leg('call', -1, 100), leg('call', 1, 100, 58)]],
].map(([name, legs]) => ({ name, legs, g: payoff.positionGreeks(legs, 100, 0, env), net: payoff.netPremium(legs) }));
const netTxt = (x) => (x >= 0 ? `${usd(x)} debit` : `${usd(-x)} credit`);
const lstr = book[3], sstg = book[4];
const ls = stats(lstr.legs), ss = stats(sstg.legs);
const ic = book[5];
```

The last three Modules built more than twenty structures. They are easier to hold in your head than they look, because every one of them answers the same three questions: which way, how much movement, and by when. This Lesson organizes them around those questions and the two families every options trader sorts positions into.

## Long premium and short premium

A position is [[long premium]] if it owns more option value than it has sold: it pays to hold the position, loses a little every day to time decay, and profits from movement and from rising implied volatility. A position is [[short premium]] if it has sold more option value than it owns: it collects time decay and is hurt by movement and rising implied volatility.

The Greeks make the sort exact. Here is every major structure from these Modules, one contract each, December expiration, ACME at $100, priced at the mid:

:::example The same chain, eight structures
| Structure | Opens for | Delta | Gamma | Theta ($/day) | Vega ($/vol pt) |
|---|---|---|---|---|---|
{{ book.map((b) => `| ${b.name} | ${netTxt(b.net)} | ${signed(b.g.delta, 1)} | ${signed(b.g.gamma, 2)} | ${signedUsd(b.g.theta)} | ${signedUsd(b.g.vega)} |`).join('\n') }}

Read the gamma and theta columns together. Wherever gamma is positive, theta is negative, and the other way round: in this table, every position that gains from movement pays for it in time. That trade between gamma and theta is the central exchange of options trading. Vega usually has the same sign as gamma; the calendar is the exception, short gamma but long vega, because it is short the near month and long the far one.
:::

The two families also win in different ways. At the market's own odds, read from the chain's prices:

| | Long 100 straddle (long premium) | Short 95/105 strangle (short premium) |
|---|---|---|
| Chance of profit at expiration | {{ pct(ls.pop, 0) }} | {{ pct(ss.pop, 0) }} |
| Average win | {{ usd(ls.avgWin) }} | {{ usd(ss.avgWin) }} |
| Average loss | {{ usd(ls.avgLoss) }} | {{ usd(ss.avgLoss) }} |

Long premium loses more often and wins bigger; short premium wins more often and loses bigger. At fair prices both have an expected value near zero before costs. Neither family is better. What decides your results is whether the stock moves more or less than its implied volatility predicted, and whether you sized the position to survive its bad outcomes: a long-premium trader's long run of small losses, or a short-premium trader's occasional large one.

:::warning Know which family you are in
Many traders believe they are trading direction when most of their P&L comes from volatility. A trader who sells puts, covered calls and iron condors is running a short-premium book, whatever views they hold on individual stocks. When volatility rises sharply, all of those positions lose together.
:::

## Choosing a structure

Start from three questions.

1. **Direction**: up, down, or no view?
2. **Volatility**: do you expect the stock to move *more* than its implied volatility predicts (buy premium) or *less* (sell premium)? Is implied volatility high or low compared with its own history ([[IV rank]])?
3. **Time**: when do you expect the move or the calm, and how long will the view take?

Then read across:

| Direction | Expected movement vs implied | Structure | Family |
|---|---|---|---|
| Up | More (a large rally) | Long call; [call backspread](#core-10-ratio-spreads-and-backspreads) | Long premium |
| Up | To a target | [Bull call spread](#core-10-debit-spreads); call butterfly centered on the target | Mixed |
| Up | Less (slow drift, rich premium) | [Bull put spread](#core-10-credit-spreads); [cash-secured put](#core-09-cash-secured-put); [covered call](#core-09-covered-call) | Short premium |
| Up, stock-like exposure at low cost | Any | [Risk reversal](#core-10-risk-reversals) | Roughly neutral |
| Down | More (a large fall) | Long put; put backspread | Long premium |
| Down | To a target | Bear put spread; put butterfly | Mixed |
| Down | Less | Bear call spread | Short premium |
| None | More | [Long straddle](#core-11-straddle) or [strangle](#core-11-strangle) | Long premium |
| None | Less | Short strangle; [iron condor](#core-11-iron-condor); [iron butterfly](#core-11-butterflies) | Short premium |
| None, a precise price | Less, then a pin | [Butterfly](#core-11-butterflies) | Short premium |
| None near term; implied vol to hold or rise | Less now, more later | [Calendar](#core-11-calendars-and-diagonals) | Short gamma, long vega |
| Protect stock you own | — | [Protective put](#core-09-protective-put); [collar](#core-09-collar) | Long premium; neutral |

Then let time choose the expiration. A view about a specific catalyst wants the first expiration after it. A slow thesis wants more time, accepting lower gamma and higher cost. Short-premium trades are usually opened 30 to 45 days out, where time decay is meaningful but gamma is not yet extreme. Long-premium trades bought for a move need enough time for the move to happen, because their theta grows as expiration nears.

Finally, choose between defined and undefined risk. Every short-premium structure has a defined-risk version (iron condor for short strangle, iron butterfly for short straddle, credit spread for naked put). The defined-risk version costs some premium; in exchange, it survives the move that would otherwise end the account.

:::practice How professionals make the choice
Experienced traders reverse the usual order. They start from volatility: is implied volatility cheap or rich against what the stock is likely to realize? That decides long or short premium. Then direction decides which side to lean. Then the account's risk limits decide defined or undefined risk and size. Only at the end do they pick strikes, usually by delta. [Managing trades](#core-12) covers what happens after the order is filled.
:::

```tool position-builder
{ title: 'Start from the iron condor and change the legs', legs: ic.legs, range: [82, 118] }
```

:::key
Every structure is long or short premium: long premium is long gamma and vega and pays theta; short premium is the reverse. Long premium wins less often and bigger; short premium wins more often and loses bigger; at fair prices neither has an edge. Choose a structure from direction, expected movement against implied volatility, and time, then choose defined or undefined risk from what your account can survive.
:::

```quiz
- q: >-
    ACME's implied volatility is unusually high before a court ruling. You think the ruling will be a non-event and you have no view on direction. Which structure fits?
  choices:
    - >-
      An iron condor (or short strangle if you accept undefined risk)
    - >-
      A long straddle
    - >-
      A bull call spread
  answer: 0
  explain: >-
    No direction plus an expectation of less movement than implied is a short-premium, neutral view: an iron condor sells the rich premium with a capped loss. A long straddle is the opposite bet and would suffer the volatility crush after a non-event. A bull call spread needs ACME to rise.
- q: >-
    Which position is short gamma but long vega?
  choices:
    - >-
      The December/January 100 call calendar
    - >-
      The long 100 straddle
    - >-
      The short 95/105 strangle
  answer: 0
  explain: >-
    The calendar is short the near-month option, which carries more gamma, and long the far-month option, which carries more vega. The long straddle is long both; the short strangle is short both.
- q: >-
    You expect ACME to rise sharply after a product announcement in two weeks, and its options look cheap. Which choice fits best?
  choices:
    - >-
      Long calls or a call backspread in the first expiration after the announcement
    - >-
      A bull put spread 45 days out
    - >-
      A covered call
  answer: 0
  explain: >-
    A sharp move that options underprice calls for long premium with upside exposure, timed to the catalyst. A bull put spread is short premium and earns at most its credit however far ACME rises; a covered call caps the upside at the strike.
- q: >-
    A trader's book holds short puts, covered calls and iron condors on ten different stocks. What happens if market volatility jumps?
  choices:
    - >-
      Most positions lose together, because the whole book is short premium
    - >-
      The positions offset each other, because the stocks are different
    - >-
      The book gains, because it collects time decay
  answer: 0
  explain: >-
    All three structures are short gamma and short vega, so a broad rise in volatility and large moves hurts them at the same time. Different underlyings diversify direction, not volatility. Time decay is slow and cannot offset a sudden rise in implied volatility.
```
