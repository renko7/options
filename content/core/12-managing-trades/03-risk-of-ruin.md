---
title: Risk of ruin
summary: See why a strategy with a real edge can still destroy an account if each trade risks too much, and choose a risk per trade that survives losing streaks.
---

```calc
const p = 0.72, q = 1 - p, W = 0.5, Lo = 1;
const ev = p * W - q * Lo;
const trades = 200, paths = 2000, ruinLevel = 0.5;
function study(f, seed) {
  const u = sim.rng(seed);
  let ruined = 0, streak4 = 0, streak5 = 0;
  const ends = [];
  for (let i = 0; i < paths; i++) {
    let eq = 1, hit = false, run = 0, maxRun = 0;
    for (let t = 0; t < trades; t++) {
      const win = u() < p;
      eq *= 1 + f * (win ? W : -Lo);
      run = win ? 0 : run + 1;
      if (run > maxRun) maxRun = run;
      if (eq <= ruinLevel) hit = true;
    }
    if (hit) ruined++;
    if (maxRun >= 4) streak4++;
    if (maxRun >= 5) streak5++;
    ends.push(eq);
  }
  ends.sort((a, b) => a - b);
  return { f, ruin: ruined / paths, median: ends[paths / 2], p10: ends[paths / 10], streak4: streak4 / paths, streak5: streak5 / paths };
}
const fs = [0.01, 0.02, 0.05, 0.10, 0.20, 0.30];
const res = fs.map((f) => study(f, 2026));
const r = (f) => res.find((x) => x.f === f);
const kelly = p / Lo - q / W;
const growth = (f) => p * Math.log(1 + f * W) + q * Math.log(1 - f * Lo);
const recover = (d) => 1 / (1 - d) - 1;
const six10 = 1 - Math.pow(0.9, 6);
const six2 = 1 - Math.pow(0.98, 6);
const start = 40000;
const ruinText = (x) => (x.ruin === 0 ? 'none of the accounts were' : `${pct(x.ruin, 1)} of accounts were`);
const ev68 = 0.68 * W - 0.32 * Lo;
const ev66 = 0.66 * W - 0.34 * Lo;
const row = (x) => `| ${pct(x.f, 0)} | ${pct(x.ruin, 1)} | ${usd(start * x.median, 0)} | ${usd(start * x.p10, 0)} |`;
```

The previous Lesson set a risk budget per trade without justifying the number. This Lesson does. The reason traders risk 1% or 2% of the account on a trade, and not 10% or 20%, is not timidity. It is arithmetic about sequences of trades, and the arithmetic is unforgiving even for a strategy that makes money on average.

## Losses and recoveries are not symmetric

A loss of a given percentage needs a larger percentage gain to undo it, because the gain is earned on a smaller account.

| Drawdown | Gain needed to get back to the start |
|---|---|
| 10% | {{ pct(recover(0.10)) }} |
| 25% | {{ pct(recover(0.25)) }} |
| 50% | {{ pct(recover(0.50)) }} |
| 75% | {{ pct(recover(0.75)) }} |

Past about half the account, recovery stops being a matter of patience. That is why this Lesson defines **ruin** as the account falling to half its starting value at any point. [[Risk of ruin]] is the probability of that happening over a run of trades.

## A strategy with a real edge

Take a simple, stylized strategy. Each trade risks a fixed fraction \( f \) of the current account. It wins {{ pct(p, 0) }} of the time, and a win earns half of what was risked; it loses {{ pct(q, 0) }} of the time, and a loss costs everything that was risked. In units of the amount risked, the expected value per trade is

\[ {{ num(p) }} \times {{ num(W, 1) }} - {{ num(q) }} \times {{ num(Lo, 0) }} = {{ num(ev) }}. \]

That is a genuine edge: on average each trade makes {{ pct(ev, 0) }} of what it risks. Many credit-spread traders would be pleased with it. The only open question is \( f \).

:::example Two thousand accounts, two hundred trades each
Start 2,000 accounts at {{ usd(start, 0) }}. Each runs the strategy for 200 trades, with wins and losses drawn at random at the rates above. The only difference between groups is the fraction risked per trade.

| Risk per trade | Accounts that fell to half | Median ending account | Ending account of the unluckiest 10% |
|---|---|---|---|
{{ res.map(row).join('\n') }}

At {{ pct(0.02, 0) }} per trade, {{ ruinText(r(0.02)) }} ruined and the median account grew to {{ usd(start * r(0.02).median, 0) }}. At {{ pct(0.10, 0) }}, the median account did better, {{ usd(start * r(0.10).median, 0) }}, but {{ pct(r(0.10).ruin, 1) }} of the accounts were cut in half along the way. At {{ pct(0.30, 0) }} the median account finished at {{ usd(start * r(0.30).median, 0) }} and {{ pct(r(0.30).ruin, 0) }} of accounts were ruined.

The same edge, the same win rate, the same sequence of luck. Only the size changed.
:::

Look at the last column. It is what an unlucky but entirely ordinary trader would experience: not the worst account out of 2,000, just the tenth percentile. At 1%, 2% and 5% that trader still made money. At 10% and above, that trader lost money with a winning strategy.

## Losing streaks are normal

A {{ pct(q, 0) }} loss rate sounds low. But over 200 trades, {{ pct(r(0.02).streak4, 0) }} of the accounts above hit a streak of four or more losses in a row at some point, and {{ pct(r(0.02).streak5, 0) }} hit five or more. Streaks feel like evidence that something is broken; at this loss rate, they are just what 200 trades look like.

What a streak does depends entirely on size. Even a rarer streak of six straight losses at 2% per trade costs {{ pct(six2, 1) }} of the account. Six straight losses at 10% per trade cost {{ pct(six10, 1) }}, a drawdown that needs a gain of {{ pct(recover(six10), 0) }} to repair.

## The most you should ever risk: the Kelly fraction

There is a fraction that maximizes the long-run growth rate of the account. It is called the Kelly fraction. For a trade that wins a multiple \( W \) of the amount risked with probability \( p \) and loses a multiple \( L \) with probability \( q = 1 - p \), the expected growth of the account's logarithm per trade is

\[ g(f) = p \ln(1 + fW) + q \ln(1 - fL). \]

Setting the derivative to zero,

\[ \frac{pW}{1 + fW} = \frac{qL}{1 - fL} \;\Longrightarrow\; pW(1 - fL) = qL(1 + fW) \;\Longrightarrow\; f^{*} = \frac{p}{L} - \frac{q}{W}, \]

using \( p + q = 1 \). Here \( f^{*} = {{ num(p) }} - {{ num(q) }} / {{ num(W, 1) }} = {{ pct(kelly, 0) }} \).

Kelly is a ceiling, not a target. At the full Kelly fraction the account grows fastest in the very long run, yet the swings are brutal: in the table, risking {{ pct(0.20, 0) }}, a little above Kelly, halved {{ pct(r(0.20).ruin, 0) }} of the accounts. Near twice Kelly the growth rate falls to almost nothing: the expected log-growth per trade is {{ signed(growth(kelly), 4) }} at Kelly, {{ signed(growth(0.30), 4) }} at {{ pct(0.30, 0) }}, and {{ signed(growth(0.35), 4) }} at {{ pct(0.35, 0) }}. Beyond about twice Kelly, a trader loses money in the long run *with a winning strategy*.

:::warning Your edge is an estimate
Kelly assumes you know \( p \) exactly. You do not; you have a journal of a few dozen trades. If the true win rate is 68% instead of 72%, the expected value per trade falls from {{ num(ev) }} to {{ num(ev68) }} of the amount risked. At 66% it is {{ num(ev66) }}: the edge is gone. Sizing as if the optimistic estimate were certain is the fastest route to ruin, which is why professionals who use Kelly at all use a small fraction of it.
:::

## Why real trading is worse than the simulation

The simulation is kind in three ways.

- **Losses are capped at the amount risked.** That is true of a [[defined risk]] spread held to expiration. For [[undefined risk]] short premium, a gap can cost several times the "normal" loss, which is why the previous Lesson sized those positions by a stress loss.
- **Trades are independent.** Real losses cluster: a market sell-off hits every bullish position at once, and a volatility spike hits every short-premium position at once.
- **The trader follows the rules.** Real traders often raise size after a streak of wins and again after losses, to "make it back". Both raise the effective \( f \) at the worst times.

Each of these pushes the true risk of ruin above the table's numbers. Small, fixed fractions are the only defense that works against all three.

:::practice What professionals do
Risk per trade of 0.5% to 2% of capital for defined-risk positions, a separate limit on the total risk open at once, a cap on correlated positions, and a rule for cutting size after a drawdown (for example, halve the risk per trade after a 10% drawdown until it is recovered). None of these increases the edge. All of them keep the trader alive long enough for the edge to show up.
:::

:::key
The expected value per trade says whether a strategy makes money; the fraction risked per trade decides whether you survive to collect it. Losses need larger gains to recover, losing streaks are routine, and above roughly the Kelly fraction more size means less growth and a high chance of ruin. Risk a small, fixed fraction, because your edge is an estimate and real losses cluster.
:::

```quiz
- q: >-
    Your account falls 50% from its starting value. What gain do you need to get back to where you started?
  choices:
    - >-
      50%
    - >-
      {{ pct(recover(0.50), 0) }}
    - >-
      75%
  answer: 1
  explain: >-
    After a 50% loss, $1 has become $0.50, and $0.50 must double to return to $1, a {{ pct(recover(0.50), 0) }} gain. A 50% gain on $0.50 only brings it to $0.75. That asymmetry is why ruin is defined well short of zero.
- q: >-
    A strategy wins 60% of the time, earning the full amount risked, and loses 40% of the time, losing the full amount risked. What is its Kelly fraction?
  choices:
    - >-
      {{ pct(0.6 / 1 - 0.4 / 1, 0) }}
    - >-
      {{ pct(0.6, 0) }}
    - >-
      {{ pct(0.4, 0) }}
  answer: 0
  explain: >-
    With \( W = L = 1 \), \( f^{*} = p - q = 0.6 - 0.4 = {{ pct(0.2, 0) }} \) of the account. Betting the win rate, 60%, is a common confusion: it is three times Kelly, which in the long run shrinks the account even though each trade has a positive expected value. 40% is the loss rate, which has no special meaning for sizing.
- q: >-
    You risk 10% of the account per trade and hit six losses in a row. Roughly how much of the account is gone?
  choices:
    - >-
      60%
    - >-
      {{ pct(six10, 0) }}
    - >-
      {{ pct(six2, 0) }}
  answer: 1
  explain: >-
    Each loss takes 10% of what is left, so six losses leave \( 0.9^6 \) of the account and cost {{ pct(six10, 1) }}. It is less than 60% because each loss is on a smaller balance, but it still needs a gain of {{ pct(recover(six10), 0) }} to recover. {{ pct(six2, 0) }} is what the same streak costs at 2% per trade.
- q: >-
    Your journal suggests your credit spreads win 72% of the time with the payoffs in this Lesson. Why size well below the Kelly fraction of {{ pct(kelly, 0) }}?
  choices:
    - >-
      Because Kelly maximizes the probability of profit, not growth
    - >-
      Because the 72% is an estimate: at 66% the edge disappears, and real losses cluster and can exceed the amount risked
    - >-
      Because the Kelly fraction is only valid for long options
  answer: 1
  explain: >-
    Kelly is the growth-maximizing fraction only if the inputs are exactly right and trades are independent. A few dozen trades cannot pin the win rate down to within a few points, and at 66% the expected value is {{ num(ev66) }} per unit risked. Kelly is about growth, not the probability of profit, and it applies to any repeated bet, not only long options.
```
