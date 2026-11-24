---
title: The protective put
summary: Insure a stock position with a put, price that insurance per year, and choose the strike and expiration that fit what you are protecting against.
---

```calc
const env = { r: RATE, q: ACME.q };
const exp = expiryDate(30);
const tenorList = [30, 58, 121];
const chains = Object.fromEntries(tenorList.map((d) => [d, chain(ACME, { dte: d })]));
const put = (d, k) => chains[d].rows.find((r) => r.strike === k).put;
const p95 = put(30, 95);
const cost = p95.ask;
const pp = [{ kind: 'stock', qty: 100, price: 100 }, { kind: 'put', qty: 1, strike: 95, premium: cost, dte: 30, iv: p95.iv }];
const stock = [{ kind: 'stock', qty: 100, price: 100 }];
const s = payoff.summary(pp);
const g = payoff.positionGreeks(pp, 100, 0, env);
const ann = (d, k) => put(d, k).ask / 100 * 365 / d;
const crash = 85;
```

A stock position has no floor. If you own 100 ACME at $100, a bad quarter, a lawsuit or a market panic can take any amount off it, and a stop-loss order only sells at whatever price the market offers once it is triggered, which after an overnight gap may be far below your stop. A [[protective put]] gives you a floor that does not depend on the market being orderly: the right to sell at the strike, whatever happens.

## The position

Own the shares, and buy one put for every 100 shares. When you buy the stock and the put on the same day, the pair is called a [[married put]]; the payoff is the same either way.

:::example Insuring 100 ACME with the December 95 put
You own 100 ACME at $100. The December 95 put is offered at {{ usd(cost) }}. You buy one for {{ usd(cost * 100) }}.

At expiration on {{ longDate(exp) }}:

- **ACME at $80.** Your shares lost $2,000, but you exercise the put and sell them at $95. Your total loss is {{ usd(-payoff.pnlAtExpiry(pp, 80)) }}: $5 a share from $100 down to the strike, plus the {{ usd(cost) }} premium. That is the [[max loss]], and it is the same at $80, $50 or zero.
- **ACME at $100.** The put expires worthless. You are down the premium, {{ usd(-payoff.pnlAtExpiry(pp, 100)) }}.
- **ACME at $120.** The shares gained $2,000; after the premium you keep {{ usd(payoff.pnlAtExpiry(pp, 120)) }}. Your upside is unlimited, starting from the break-even of {{ usd(s.breakevens[0]) }}.
:::

The language of insurance fits well. The premium is the insurance premium. The distance from the stock price to the strike, $5 here, is the deductible: the loss you absorb before the policy pays. The expiration is the policy term.

By [[put-call parity]], stock plus a put has the same payoff as a call plus cash. A protective put is a long call in disguise, with limited loss and unlimited gain, and its position Greeks show it: delta {{ num(g.delta, 0) }} shares instead of 100, positive gamma ({{ signed(g.gamma, 2) }} shares per $1), negative theta ({{ signedUsd(g.theta) }} a day) and positive vega ({{ signedUsd(g.vega) }} per vol point). You are now [[long premium]].

## What insurance costs per year

One month of protection looks cheap. Insurance is not a one-month decision, though; if you want to stay protected, you have to keep buying it. Annualizing the cost makes the comparison honest:

\[ \text{annualized cost} = \frac{P}{S} \times \frac{365}{D} \]

where \(P\) is the put's premium, \(S\) the stock price and \(D\) the days to expiration.

| Put (ask) | December, 30 days | January, 58 days | March, 121 days |
|---|---|---|---|
| 90 strike | {{ usd(put(30, 90).ask) }} ({{ pct(ann(30, 90), 1) }} a year) | {{ usd(put(58, 90).ask) }} ({{ pct(ann(58, 90), 1) }}) | {{ usd(put(121, 90).ask) }} ({{ pct(ann(121, 90), 1) }}) |
| 95 strike | {{ usd(put(30, 95).ask) }} ({{ pct(ann(30, 95), 1) }} a year) | {{ usd(put(58, 95).ask) }} ({{ pct(ann(58, 95), 1) }}) | {{ usd(put(121, 95).ask) }} ({{ pct(ann(121, 95), 1) }}) |
| 100 strike | {{ usd(put(30, 100).ask) }} ({{ pct(ann(30, 100), 1) }} a year) | {{ usd(put(58, 100).ask) }} ({{ pct(ann(58, 100), 1) }}) | {{ usd(put(121, 100).ask) }} ({{ pct(ann(121, 100), 1) }}) |

Two patterns stand out.

1. **Near the money, longer protection is cheaper per year.** The time value of an at-the-money option grows roughly with the square root of time, so four months of protection costs much less than four times one month. Rolling one-month 95 puts all year would cost about {{ pct(ann(30, 95), 0) }} of the position, more than most stocks return in a year; buying four-month 95 puts costs about {{ pct(ann(121, 95), 0) }}. Far from the money the pattern fades or reverses: a 10% fall within one month is unlikely, so the one-month 90 put is very cheap, while over four months that fall is much more plausible and the 90 put costs {{ pct(ann(121, 90), 1) }} a year against {{ pct(ann(30, 90), 1) }}.
2. **A bigger deductible is much cheaper.** The 90 put costs a fraction of the at-the-money put. Out-of-the-money puts protect against disasters, not against ordinary bad months.

:::warning Permanent insurance is a losing trade
Buying puts on everything, all the time, at these prices would consume most of a stock portfolio's expected return. Out-of-the-money puts also carry the higher implied volatility of the [[volatility skew]], so you pay extra for exactly the protection people want most. Insurance makes sense for a specific risk, a specific period or a position you cannot afford to lose, not as a habit.
:::

## Choosing the strike and the expiration

Start from what you are protecting against.

- **A known event**, such as an [[earnings announcement]] or a court ruling: buy the shortest expiration that covers the event, and accept that implied volatility will be high going in. The put will lose much of its value once the event has passed, whatever the stock does.
- **A drawdown you cannot tolerate**, such as a concentrated position that funds a house purchase: choose the strike from the loss you can live with (a 95 put caps a 100-share loss at $5 a share plus the premium), and the expiration from how long the risk lasts. Longer near-the-money puts are cheaper per year and need fewer decisions.
- **General unease about the market**: a protective put on one stock is an expensive way to hedge it. Index puts, covered in [Index options and 0DTE](#core-13), are usually cheaper per dollar protected. A smaller position can also be the cheapest hedge of all.

:::practice How professionals cheapen protection
They rarely buy outright puts and hold them. Common alternatives: buy a put and sell a lower-strike put against it (a put spread, see [Directional spreads](#core-10)), which protects a band of losses for less; sell a call to pay for the put (the [collar](#core-09-collar), next Lesson); or buy longer-dated puts and sell them back while they still have time value, rather than holding them to expiration.
:::

## Before expiration

A protective put pays off before expiration as well. If ACME falls to ${{ int(crash) }} ten days after you buy the put, the position shows {{ usd(payoff.pnlAt(pp, crash, 10, env)) }} against {{ usd(payoff.pnlAt(stock, crash, 10, env)) }} for the shares alone. If implied volatility jumps 10 points in the sell-off, as it often does, the put is worth more and the position shows {{ usd(payoff.pnlAt(pp, crash, 10, { ...env, ivShift: 0.10 })) }}. The put can be sold, the shares kept, and new protection bought at a lower strike.

The failure mode is a slow drift down that never reaches the strike. If ACME ends December at $96, the put expires worthless and you lose {{ usd(-payoff.pnlAtExpiry(pp, 96)) }}: {{ usd(400) }} on the stock and the whole premium. Protection pays only below the strike.

Long puts carry no assignment risk; only option writers can be assigned. If you hold the put to expiration and it is in the money, it is exercised automatically and your shares are sold at the strike, unless you instruct your broker otherwise.

```tool position-builder
{ title: 'Protective put: 100 ACME plus the December 95 put', legs: pp, range: [75, 125] }
```

:::rule Puts and the holding period of your shares (as of 2026)
Under IRS rules, buying a put on stock you have held for one year or less is generally treated like a short sale: the stock's holding period is wiped out and starts again only when the put is sold, exercised or expires. A married put, where you buy the stock and the put on the same day and identify the stock as the shares to be delivered on exercise, is an exception: the put's cost is added to the stock's basis. This is not tax advice; see [US taxes](#core-14).
:::

:::key
A protective put sets a floor under a stock position: the most you can lose is the distance to the strike plus the premium. It behaves like a long call. Price it per year, because insurance you keep renewing is expensive; lower strikes cost less, near-the-money protection costs less per year in longer expirations, and the right choice depends on what specific risk you are insuring.
:::

```quiz
- q: >-
    You own 100 ACME at $100 and buy the December 95 put for {{ usd(cost) }}. What is the most you can lose by expiration?
  choices:
    - >-
      {{ usd(cost * 100) }}
    - >-
      {{ usd(-s.maxLoss) }}
    - >-
      $500.00
  answer: 1
  explain: >-
    You absorb the $5 a share between $100 and the $95 strike, and you paid {{ usd(cost) }} a share for the put: ({{ usd(5) }} + {{ usd(cost) }}) × 100 = {{ usd(-s.maxLoss) }}. The premium alone is the loss only if ACME stays at or above $100. Leaving out the premium understates the loss.
- q: >-
    Which is cheaper per year of protection on the 95 strike?
  choices:
    - >-
      Buying the December put and rolling it every month
    - >-
      Buying the March put
    - >-
      They cost the same per year
  answer: 1
  explain: >-
    The March put costs about {{ pct(ann(121, 95), 1) }} a year against {{ pct(ann(30, 95), 1) }} for the December put, because time value grows more slowly than time. Rolling short-dated puts also adds spreads and commissions each month.
- q: >-
    You own 100 ACME plus the December 95 put. What does the combination behave like?
  choices:
    - >-
      A long call
    - >-
      A short put
    - >-
      A covered call
  answer: 0
  explain: >-
    Stock plus a put pays like a call plus cash (put-call parity): limited loss below the strike and unlimited gain above. Its Greeks match: positive gamma and vega, negative theta. A covered call and a short put have the opposite shape, with limited gain and large loss.
- q: >-
    ACME drifts to $96 at December expiration. How did the protective put work out?
  choices:
    - >-
      It paid off, because the stock fell
    - >-
      It expired worthless; you lost {{ usd(-payoff.pnlAtExpiry(pp, 96)) }} including the premium
    - >-
      You were assigned on the put
  answer: 1
  explain: >-
    The put pays only below $95. At $96 it expires worthless, so you lose $400 on the shares and the {{ usd(cost * 100) }} premium. A buyer of a put cannot be assigned; only writers are.
```
