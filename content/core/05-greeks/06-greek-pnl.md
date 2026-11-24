---
title: Estimating P&L with the Greeks
summary: Estimate a position's profit or loss from its Greeks, check it against a full reprice, and use the gamma–theta trade-off to find the move a position needs to break even.
---

```calc
const env = { r: RATE, q: ACME.q };
const row = chain(ACME, { dte: 30 }).rows.find((x) => x.strike === 100);
const c = row.call, p = row.put;
const strad = [{ kind: 'call', qty: 10, strike: 100, premium: c.theo, dte: 30, iv: c.iv }, { kind: 'put', qty: 10, strike: 100, premium: p.theo, dte: 30, iv: p.iv }];
const g = payoff.positionGreeks(strad, 100, 0, env);
const terms = (dS, dv) => ({ d: g.delta * dS, gm: 0.5 * g.gamma * dS * dS, th: g.theta, v: g.vega * dv });
const sm = terms(2, 1);
const smTot = sm.d + sm.gm + sm.th + sm.v;
const smFull = payoff.pnlAt(strad, 102, 1, { ...env, ivShift: 0.01 });
const bg = terms(12, 5);
const bgTot = bg.d + bg.gm + bg.th + bg.v;
const bgFull = payoff.pnlAt(strad, 112, 1, { ...env, ivShift: 0.05 });
const beMove = Math.sqrt(-2 * g.theta / g.gamma);
const dailySd = 100 * c.iv / Math.sqrt(365);
const tradingSd = 100 * c.iv / Math.sqrt(252);
const hedged = [...strad, { kind: 'stock', qty: -Math.round(g.delta), price: 100 }];
const hedgedPnl = (S) => payoff.pnlAt(hedged, S, 1, env);
```

The Greeks are most useful as a forecasting tool. Before the market opens, a trader wants to know: if the stock moves this much and volatility does that, what happens to my position? Pricing every leg again for every scenario is the exact answer. The Greeks give a fast approximation that also tells you *why* the position made or lost money.

## The Greek expansion

Put the four main Greeks together and the change in a position's value over a short time is approximately

\[ \text{P\&L} \approx \Delta\,dS + \tfrac12\,\Gamma\,dS^2 + \Theta\,dt + \text{vega}\,d\sigma \]

where \(dS\) is the move in the stock in dollars, \(dt\) the number of days that pass, and \(d\sigma\) the change in implied volatility in points. Use position Greeks (in shares and dollars, as in the [previous Lesson](#core-05-position-greeks)) and the result is in dollars for the whole position.

Each term answers one question: how much did direction earn (delta), how much did the size of the move earn (gamma), what did the day cost (theta), and what did the change in implied volatility do (vega). Splitting the day's result this way is called a **P&L explain**, and every options desk produces one daily.

:::example A long straddle, one day later
You buy 10 ACME December 100 [[straddles|straddle]]: 10 calls at {{ usd(c.theo) }} and 10 puts at {{ usd(p.theo) }}, with ACME at $100. The position Greeks are:

- delta {{ signed(g.delta, 1) }} shares
- gamma {{ signed(g.gamma, 2) }} shares per $1
- theta {{ signedUsd(g.theta) }} per day
- vega {{ signedUsd(g.vega) }} per vol point

The next day ACME is at $102 and implied volatility is up 1 point. The expansion:

| Term | Calculation | Dollars |
|---|---|---|
| Delta | {{ num(g.delta, 1) }} × 2 | {{ signedUsd(sm.d) }} |
| Gamma | ½ × {{ num(g.gamma, 2) }} × 2² | {{ signedUsd(sm.gm) }} |
| Theta | {{ num(g.theta, 2) }} × 1 day | {{ signedUsd(sm.th) }} |
| Vega | {{ num(g.vega, 2) }} × 1 point | {{ signedUsd(sm.v) }} |
| **Estimate** | | **{{ signedUsd(smTot) }}** |

Pricing every option again at $102, one day later, with volatility 1 point higher, gives **{{ signedUsd(smFull) }}**. The estimate is off by {{ usd(Math.abs(smTot - smFull)) }}, close enough to plan with, and it says where the money came from: mostly gamma and vega, with theta taking its daily cut.
:::

## Where the estimate breaks

The expansion assumes the Greeks stay fixed across the move. They do not, and the bigger the move, the more they change.

Take the same straddle and a shock: ACME jumps to $112 in one day and implied volatility rises 5 points. The Greek estimate is {{ signedUsd(bgTot) }}; a full reprice gives {{ signedUsd(bgFull) }}. The estimate overstates the gain by {{ usd(bgTot - bgFull) }}. Over a $12 move, gamma itself fell as ACME moved away from the strike, and vega shrank as the options moved away from the money, so the fixed-Greek terms overcounted both. The corrections come from higher-order Greeks (how gamma changes with the stock, how vega changes with the stock and with volatility), covered in [Higher-order Greeks](#advanced-03).

The rule in practice: use the expansion for everyday moves and quick what-ifs. For stress tests (a 10% gap, an earnings move, a crash) reprice the position at the scenario's prices, as the position builder does.

```tool position-builder
{ title: 'Long 10 ACME December 100 straddles', legs: strad, range: [80, 120], daysPassed: 1, ivShift: 0.01 }
```

## The gamma–theta trade-off

Now strip out direction. Suppose the straddle is delta-hedged: you sell {{ int(Math.round(g.delta)) }} shares so the position delta is zero. Ignoring vega, one day's P&L is just

\[ \text{P\&L for one day} \approx \tfrac12\,\Gamma\,dS^2 + \Theta . \]

Theta is negative and certain; the gamma term is positive and depends on how far the stock moves, in either direction. So a long-gamma position loses on quiet days and wins on busy ones. Where is the line?

:::derivation The break-even move
Set the one-day P&L to zero and solve for \(dS\):

\[ \tfrac12\,\Gamma\,dS^2 + \Theta = 0 \quad\Longrightarrow\quad dS^2 = \frac{-2\,\Theta}{\Gamma} \quad\Longrightarrow\quad dS = \sqrt{\frac{-2\,\Theta}{\Gamma} } . \]

For the delta-hedged straddle, \(\Theta\) = {{ num(g.theta, 2) }} and \(\Gamma\) = {{ num(g.gamma, 2) }}, so

\[ dS = \sqrt{ \frac{2 \times {{ num(-g.theta, 2) }} }{ {{ num(g.gamma, 2) }} } } = {{ num(beMove, 2) }} . \]

A move of more than {{ usd(beMove) }} in a day, up or down, makes the long-gamma position money; a smaller move loses money.

Black-Scholes links the two Greeks. When the rate and dividend yield are small, its theta per year is close to \(-\tfrac12\sigma^2 S^2\,\Gamma\) (this comes from the model's equation, derived in [the Advanced Track](#advanced-02)). Per day that is \(\Theta \approx -\tfrac12\sigma^2 S^2\,\Gamma / 365\). Substitute it:

\[ dS = \sqrt{\frac{2 \times \tfrac12\sigma^2 S^2\,\Gamma / 365}{\Gamma} } = \sqrt{\frac{\sigma^2 S^2}{365} } = \frac{\sigma S}{\sqrt{365} } . \]

Gamma cancels. The break-even move is one day's standard deviation at the implied volatility.
:::

At {{ pct(c.iv, 0) }} implied volatility on a $100 stock, one day's standard deviation is \(30\% \times 100 / \sqrt{365}\) = {{ usd(dailySd) }}, within a fraction of a cent of the {{ usd(beMove) }} computed from the Greeks. That is per calendar day, the unit theta uses. The stock moves only on trading days, about 252 a year, and the weekend's theta has to be earned on them, so on a typical trading day the move needed is closer to \(\sigma S/\sqrt{252}\) = {{ usd(tradingSd) }}, the daily move from [Volatility, rates and dividends](#core-04).

This is the most important idea in options trading, so state it plainly. **Buying options and hedging the delta is a bet that the stock will move more than its implied volatility says. Selling options and hedging is a bet that it will move less.** Theta is the price of gamma, and the implied volatility sets that price. Whether you profit depends on the volatility the stock actually delivers, which is called realized volatility and is the starting point of [Implied volatility](#core-06).

:::example One day, three outcomes
The delta-hedged straddle (10 straddles, short {{ int(Math.round(g.delta)) }} shares) after one day, with implied volatility unchanged:

| ACME next day | P&L |
|---|---|
| $100.00 (no move) | {{ signedUsd(hedgedPnl(100)) }} |
| $101.00 | {{ signedUsd(hedgedPnl(101)) }} |
| $98.00 | {{ signedUsd(hedgedPnl(98)) }} |
| $103.00 | {{ signedUsd(hedgedPnl(103)) }} |

A $1 move is smaller than the break-even of {{ usd(beMove) }}, so it loses; $2 and $3 moves win, in either direction.
:::

:::practice Gamma scalping
Traders who are long gamma lock in those gains by re-hedging: when the stock rises, their delta grows and they sell shares; when it falls, they buy shares back. They are selling high and buying low by construction, and the profit from that trading is what pays the theta. Traders who are short gamma do the reverse and pay for it in hedging losses. [Delta hedging and gamma scalping](#advanced-05) simulates both.
:::

:::key
For moderate moves, P&L ≈ \(\Delta\,dS + \tfrac12\Gamma\,dS^2 + \Theta\,dt + \text{vega}\,d\sigma\); for large moves, reprice instead. Gamma and theta are two sides of one trade: a delta-hedged long option breaks even when the stock moves about one day's standard deviation at the implied volatility, so long gamma bets on more movement than implied and short gamma on less.
:::

```quiz
- q: >-
    A position has delta +50 shares, gamma +20 shares per $1, theta −$40 a day and vega +$100 per point. Tomorrow the stock is up $1 and implied volatility is unchanged. What does the Greek expansion estimate?
  choices:
    - >-
      +$50
    - >-
      +$20
    - >-
      +$30
    - >-
      +$130
  answer: 1
  explain: >-
    Delta gives 50 × 1 = +$50, gamma ½ × 20 × 1² = +$10, theta −$40, vega 0. Total +$20. +$50 counts delta only, +$30 drops the ½ from the gamma term, and +$130 adds a vega gain that did not happen.
- q: >-
    A delta-hedged position has gamma +40 shares per $1 and theta −$80 a day. What daily move does it need to break even?
  choices:
    - >-
      $2.00
    - >-
      $4.00
    - >-
      $1.41
  answer: 0
  explain: >-
    \(dS = \sqrt{2 \times 80 / 40} = \sqrt{4} = 2\). A $2 move in either direction earns ½ × 40 × 4 = $80 of gamma, exactly paying the theta. $4.00 is \(2 \times 80 / 40\) without the square root; $1.41 is \(\sqrt{80/40}\), forgetting the factor of 2 from the ½ in the gamma term.
- q: >-
    You buy ACME options at 30% implied volatility and delta-hedge them every day. Over the next month ACME moves about as much each day as 20% volatility would imply. What is the most likely result?
  choices:
    - >-
      A profit, because you own options and long options have limited risk
    - >-
      A loss, because the stock moved less than the implied volatility you paid for
    - >-
      Break-even, because delta-hedging removes all risk
  answer: 1
  explain: >-
    A delta-hedged long option breaks even when daily moves match the implied volatility. Moves at 20% volatility are smaller, so the gamma earned does not cover the theta paid. Limited risk on the option itself is irrelevant once you hedge; and delta-hedging removes direction, not the bet on volatility, which is exactly what remains.
- q: >-
    Why does the Greek estimate overstate the straddle's gain after a $12 jump in ACME?
  choices:
    - >-
      Because theta was counted twice
    - >-
      Because gamma and vega fell during the move, while the estimate held them fixed
    - >-
      Because Greeks cannot be used for straddles
  answer: 1
  explain: >-
    The expansion uses today's Greeks for the whole move. As ACME ran from $100 to $112, the options moved away from the money and their gamma and vega shrank, so the gamma and vega terms overcounted: the estimate was {{ signedUsd(bgTot) }} against a reprice of {{ signedUsd(bgFull) }}. Straddles are handled exactly like any other position; the issue is only the size of the move.
```
