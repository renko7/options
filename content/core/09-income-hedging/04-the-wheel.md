---
title: The wheel, honestly
summary: Run the cycle of cash-secured puts and covered calls, and see why it is a short-volatility strategy whose real risk shows up in sharp declines.
---

```calc
const env = { r: RATE, q: ACME.q };
const dec = chain(ACME, { dte: 30 });
const p95 = dec.rows.find((r) => r.strike === 95).put;
const prem1 = p95.bid;
const csp = [{ kind: 'put', qty: -1, strike: 95, premium: prem1, dte: 30, iv: p95.iv }];
const eff = 95 - prem1;
const g1 = payoff.positionGreeks(csp, 100, 0, env);
// after a fall to $80: the next month's calls, 30 days out
const low = chain(ACME, { dte: 30, spot: 80 });
const lc = (k) => low.rows.find((r) => r.strike === k).call;
const c85 = lc(85), c90 = lc(90), c95 = lc(95);
const stockLoss80 = (80 - eff) * 100;
const phase2 = [{ kind: 'stock', qty: 100, price: 95 }, { kind: 'call', qty: -1, strike: 85, premium: c85.bid, dte: 30, iv: c85.iv }];
const g2 = payoff.positionGreeks(phase2, 80, 0, env);
const calledAt85 = prem1 * 100 + c85.bid * 100 + (85 - 95) * 100;
const holdAt95 = prem1 * 100 + c95.bid * 100;
// rally path
const rally = 115;
```

[[The wheel]] is one of the most popular option strategies among individual traders. It is easy to describe, it produces income most months, and it can be presented as "getting paid to buy stocks you like, then getting paid to sell them." All of that is true. What the description leaves out is the shape of the risk, and this Lesson is about that.

## The cycle

1. **Sell a [cash-secured put](#core-09-cash-secured-put)** below the current price. If it expires worthless, keep the premium and sell another.
2. **If assigned**, you now own 100 shares at the strike. Start selling [covered calls](#core-09-covered-call) against them, usually at or above your cost.
3. **If the shares are called away**, you are back to cash. Go to step 1.

Each step collects a premium. Because the previous two Lessons showed that a cash-secured put and a covered call on the same strike are the same position, you can see what the wheel really is: **a short put that you keep re-selling**, sometimes written as a put and sometimes as stock plus a call. At every moment you have positive [[theta]], negative [[vega]] and negative [[gamma]]. You are [[short premium]]: paid for time passing quietly, hurt by large moves and rising volatility.

## Three paths for the same first trade

:::example Month one: sell the December 95 put
ACME is at $100. You sell the December 95 put at {{ usd(prem1) }} and set aside $9,500. Your position delta is {{ num(g1.delta, 0) }} shares, theta {{ signedUsd(g1.theta) }} a day, vega {{ signedUsd(g1.vega) }} per vol point.

**Path A: ACME drifts to $98.** The put expires worthless. You keep {{ usd(prem1 * 100) }} and sell another put. This is the path the strategy is built for, and it is the most common one.

**Path B: ACME rallies to ${{ int(rally) }}.** The put expires worthless and you keep {{ usd(prem1 * 100) }}. Someone who simply bought 100 shares at $100 made {{ usd((rally - 100) * 100) }}. The wheel never owned the stock, so it caught none of the rally. You can sell another put, now at a higher strike, buying in at a higher price.

**Path C: ACME falls to $80.** You are assigned and own 100 shares at $95, an effective price of {{ usd(eff) }}. Your shares are worth $8,000, so you are down {{ usd(-stockLoss80) }}. A buyer of the stock at $100 is down $2,000. The lower entry price and the premium together saved you {{ usd(-2000 - stockLoss80) }} of that; the rest of the fall is yours.
:::

Path C is where the wheel's reputation is made or lost. You now have to sell covered calls on a stock trading $15 below your strike. Here is what the next month's calls pay with ACME at $80:

| Call sold (30 days) | Delta | Bid | If called away, total result of the cycle |
|---|---|---|---|
| 95 (your strike) | {{ num(c95.delta, 2) }} | {{ usd(c95.bid) }} | {{ usd(holdAt95) }} (only if ACME climbs back above $95) |
| 90 | {{ num(c90.delta, 2) }} | {{ usd(c90.bid) }} | {{ usd(prem1 * 100 + c90.bid * 100 + (90 - 95) * 100) }} |
| 85 | {{ num(c85.delta, 2) }} | {{ usd(c85.bid) }} | {{ usd(calledAt85) }} |

The call at your strike pays almost nothing, because it is far out of the money. A call close to the current price pays something, but if ACME recovers to $85 you are called away and lock in a loss. Many wheel traders follow a rule never to sell a call below their cost, and end up holding a falling stock while collecting a few cents a month. The strategy has quietly become "own the stock", with its full downside and a cap on the recovery.

In a real sell-off, implied volatility usually rises, so these calls would pay somewhat more than the table shows. That is not a gift either: higher implied volatility means the market expects bigger moves, in both directions.

:::warning What a sharp decline does to the wheel
A wheel trader can collect premium for many months in a row, then give back a year of income in one fall. The premiums are small and capped; the loss in a crash is close to the stock's. The strategy's long record of winning months says nothing about the size of the losing ones.
:::

## Why the shape is what it is

Line the three paths up against a plain stock position:

| Path | Wheel | Stock bought at $100 |
|---|---|---|
| Quiet ($98) | {{ signedUsd(prem1 * 100) }} | {{ signedUsd(-200) }} |
| Rally (${{ int(rally) }}) | {{ signedUsd(prem1 * 100) }} | {{ signedUsd((rally - 100) * 100) }} |
| Crash ($80), still holding | {{ signedUsd(stockLoss80) }} | {{ signedUsd(-2000) }} |

The wheel wins small in quiet markets, gives up most of the upside in rallies, and keeps most of the downside in crashes. That is the payoff of a short put, repeated. Over time it does well when the stock moves less than the options' implied volatility predicted, and badly when the stock moves more. It is a bet on low realized volatility, not a bet on the stock going up.

None of this makes the wheel a bad strategy. Selling options has historically earned a premium, because implied volatility has tended to exceed the volatility that followed, and because many buyers pay up for protection. The point is to run it knowing what you are short.

## Running it like a professional

:::practice Rules that make the wheel survivable
- **Only wheel stocks you would hold through a 30–40% fall.** Path C is not a tail event; it is a regular part of the cycle.
- **Size by the assignment value, not the premium.** One ACME put commits $9,500. Ten puts commit $95,000, which is the real position size. See [Managing trades](#core-12).
- **Decide in advance what you do after assignment**: whether you will sell calls below your cost, and at what delta. Writing it down stops you from improvising in a falling market.
- **Watch the calendar.** Earnings announcements and ex-dividend dates change the odds of large moves and early assignment.
- **Compare with the alternative.** Over a full cycle, ask whether you would have done better simply owning the stock, or owning cash.
:::

The builder shows the position you hold in Path C: 100 shares at $95 with the 85 call sold against them, ACME at $80. Its delta is {{ num(g2.delta, 0) }} shares, so you remain mostly long a stock that has just fallen 20%.

```tool position-builder
{ title: 'After assignment: 100 ACME at $95, short the 85 call, ACME at $80', legs: phase2, spot: 80, range: [65, 100] }
```

:::key
The wheel is a short put that you keep re-selling, sometimes in the form of stock plus a covered call. It collects steady premium in quiet markets, misses most of every rally and absorbs most of every crash. It profits when the stock moves less than implied volatility predicted; judge it by its losing cycles, not its winning months.
:::

```quiz
- q: >-
    Which description of the wheel's risk is most accurate?
  choices:
    - >-
      Low risk, because you only buy stocks you like at a discount
    - >-
      The risk of a short put: small capped gains, most of the stock's downside
    - >-
      The risk of a long straddle: gains from large moves either way
  answer: 1
  explain: >-
    Every stage of the wheel is a short put or its equivalent, stock plus a short call. Gains are capped at the premiums; losses in a fall are close to the stock's. "Buying at a discount" describes the effective price, not the risk: after assignment you own the stock at that price however far it has fallen. A long straddle is the opposite, long-volatility position.
- q: >-
    You were assigned at $95 (effective price {{ usd(eff) }}) and ACME is now at $80. You sell the 85 call for {{ usd(c85.bid) }} and are later called away at $85. What is the total result of the cycle?
  choices:
    - >-
      {{ usd(calledAt85) }}
    - >-
      {{ usd(prem1 * 100 + c85.bid * 100) }}
    - >-
      {{ usd((85 - 80) * 100 + c85.bid * 100) }}
  answer: 0
  explain: >-
    You collected {{ usd(prem1 * 100) }} and {{ usd(c85.bid * 100) }} in premium, but sold at $85 shares you bought at $95, a $1,000 loss: {{ usd(calledAt85) }} in total. The tempting answer measures the gain from $80, but your shares cost $95, not $80.
- q: >-
    ACME rallies from $100 to ${{ int(rally) }} during the month you are short the 95 put. How does the wheel compare with owning 100 shares?
  choices:
    - >-
      The wheel earns {{ usd(prem1 * 100) }}; the shares earn {{ usd((rally - 100) * 100) }}
    - >-
      Both earn about the same, because the wheel is long the stock
    - >-
      The wheel loses money because the put moves against you
  answer: 0
  explain: >-
    A short put gains only its premium when the stock rises; it never participates in the rally. The put does not lose money in a rally, it simply expires worthless. The wheel's delta is positive, but much smaller than 100 shares, and it vanishes as the stock rises.
- q: >-
    In which market does the wheel do best over time?
  choices:
    - >-
      Strong, steady rallies
    - >-
      A stock that moves less than its options' implied volatility predicted
    - >-
      Sharp crashes followed by sharp recoveries
  answer: 1
  explain: >-
    The wheel is short volatility: it earns time decay and loses on large moves, so it does best when realized moves are smaller than the premiums priced in. Strong rallies leave it behind the stock, and sharp crashes are where it takes its largest losses, even if the stock later recovers.
```
