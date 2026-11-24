---
title: The straddle
summary: Buy or sell a call and a put at the same strike to trade the size of a move rather than its direction, and know exactly what each side is betting.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const exp = expiryDate(30);
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
const c = R(100).call, p = R(100).put;
const mid = c.mid + p.mid, nat = c.ask + p.ask;
const longFill = fillD(mid), shortFill = fillC(mid);
const ls = [
  { kind: 'call', qty: 1, strike: 100, premium: longFill - p.mid, dte: 30, iv: c.iv },
  { kind: 'put', qty: 1, strike: 100, premium: p.mid, dte: 30, iv: p.iv },
];
const ss = [
  { kind: 'call', qty: -1, strike: 100, premium: shortFill - p.mid, dte: 30, iv: c.iv },
  { kind: 'put', qty: -1, strike: 100, premium: p.mid, dte: 30, iv: p.iv },
];
const lsum = payoff.summary(ls), ssum = payoff.summary(ss);
const lg = payoff.positionGreeks(ls, 100, 0, env);
const em = 0.8 * ACME.iv * Math.sqrt(T) * 100;
const cpx = (K) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T), type: 'call' });
const pAbove = (K) => Math.exp(RATE * T) * (cpx(K - 0.01) - cpx(K + 0.01)) / 0.02;
const pOutside = pAbove(lsum.breakevens[1]) + 1 - pAbove(lsum.breakevens[0]);
const marginShort = (c.mid + Math.max(0.20 * 100, 0.10 * 100)) * 100 + p.mid * 100;
```

Every strategy in the last two Modules needed a view on direction. Sometimes the view is about size instead: "ACME is going to move a lot after this announcement, and I do not know which way," or "ACME is going to sit still." A [[straddle]] trades exactly that. It is a call and a put at the same strike and expiration, bought together or sold together.

## The long straddle

:::example Buying the December 100 straddle
ACME is at $100. Buy the December 100 call and the December 100 put (expiring {{ longDate(exp) }}) as one order. The natural price is {{ usd(nat) }}, the mid {{ usd(mid, 3) }}; you are filled at **{{ usd(longFill) }}**, {{ usd(longFill * 100) }} in total.

At expiration, exactly one of the two options can be worth anything:

- **ACME at $100**: both expire worthless. You lose the whole {{ usd(-lsum.maxLoss) }}, the max loss.
- **ACME at $110**: the call is worth $10, the put nothing. Profit {{ usd(payoff.pnlAtExpiry(ls, 110)) }}.
- **ACME at $90**: the put is worth $10, the call nothing. Profit {{ usd(payoff.pnlAtExpiry(ls, 90)) }}.
- **Break-evens**: $100 ± {{ usd(longFill) }}, that is **{{ usd(lsum.breakevens[0]) }}** and **{{ usd(lsum.breakevens[1]) }}**. You need ACME to finish more than {{ pct(longFill / 100, 1) }} away from $100, in either direction.
:::

The upside is unlimited and the downside profit is large (up to {{ usd(payoff.pnlAtExpiry(ls, 0)) }} if ACME went to zero), but the loss in the middle is certain if nothing happens.

## The straddle price is the market's expected move

An at-the-money straddle's price is a direct reading of how far the market expects the stock to move by expiration. A standard rule of thumb is

\[ \text{ATM straddle} \approx 0.8 \times \sigma \sqrt{T} \times S \]

With \(\sigma\) = 30%, \(T\) = 30/365 and \(S\) = $100 that gives {{ usd(em) }}, close to the {{ usd(mid, 3) }} mid. (The 0.8 is \(\sqrt{2/\pi}\), the average size of a normally distributed move measured in standard deviations.) This is the [[expected move]] from [Implied volatility](#core-06).

So buying the straddle at {{ usd(longFill) }} is a bet that ACME's move by December will be larger than the market's estimate. At the market's own odds, read from the chain's prices, ACME finishes outside the break-evens only about {{ pct(pOutside, 0) }} of the time. The long straddle loses more often than it wins; when it wins, it can win big. It makes money over time only if you are better than the market at spotting stocks that are about to move more than their options imply.

## Greeks: long gamma, short theta

| Greek | Long straddle at entry | Meaning |
|---|---|---|
| Delta | {{ signed(lg.delta, 1) }} shares | Almost no direction |
| Gamma | {{ signed(lg.gamma, 2) }} shares per $1 | Delta grows in whichever direction ACME moves |
| Theta | {{ signedUsd(lg.theta) }} a day | The cost of waiting |
| Vega | {{ signedUsd(lg.vega) }} per vol point | Gains if implied volatility rises |

This is the purest [[long premium]] position: large positive [[gamma]] and [[vega]], paid for with large negative [[theta]]. Every day ACME does not move costs about {{ usd(-lg.theta) }}, more as expiration approaches.

## Before expiration: the vol crush

Straddles are often bought before an [[earnings announcement]], when implied volatility is high because the market knows a jump is coming. After the announcement, implied volatility falls sharply (the [[volatility crush]]), even if the stock moves.

| ACME ten days later | Implied vol unchanged | Implied vol 5 points lower |
|---|---|---|
| $90 | {{ usd(payoff.pnlAt(ls, 90, 10, env)) }} | {{ usd(payoff.pnlAt(ls, 90, 10, { ...env, ivShift: -0.05 })) }} |
| $95 | {{ usd(payoff.pnlAt(ls, 95, 10, env)) }} | {{ usd(payoff.pnlAt(ls, 95, 10, { ...env, ivShift: -0.05 })) }} |
| $100 | {{ usd(payoff.pnlAt(ls, 100, 10, env)) }} | {{ usd(payoff.pnlAt(ls, 100, 10, { ...env, ivShift: -0.05 })) }} |
| $105 | {{ usd(payoff.pnlAt(ls, 105, 10, env)) }} | {{ usd(payoff.pnlAt(ls, 105, 10, { ...env, ivShift: -0.05 })) }} |
| $110 | {{ usd(payoff.pnlAt(ls, 110, 10, env)) }} | {{ usd(payoff.pnlAt(ls, 110, 10, { ...env, ivShift: -0.05 })) }} |

A $5 move in ten days barely covers the time decay, and a drop in implied volatility turns it into a loss. A straddle buyer needs the move to beat both the passage of time and any fall in implied volatility.

:::warning Earnings straddles are priced for the jump
Before a known event, the straddle already prices the typical size of the reaction. Buying it is a bet that this reaction will be bigger than usual. Many traders learn this by watching a stock move 5% on earnings while their straddle, bought at an implied move of 7%, loses money.
:::

## The short straddle

Selling the straddle is the opposite bet: ACME will move less than the market expects.

:::example Selling the December 100 straddle
Sell the December 100 call and put, filled at a credit of **{{ usd(shortFill) }}** ({{ usd(shortFill * 100) }}).

- Max profit: {{ usd(ssum.maxProfit) }}, only if ACME finishes exactly at $100.
- Break-evens: {{ usd(ssum.breakevens[0]) }} and {{ usd(ssum.breakevens[1]) }}.
- Max loss: unlimited on the upside, and {{ usd(-payoff.pnlAtExpiry(ss, 0)) }} if ACME went to zero. At $120 you lose {{ usd(-payoff.pnlAtExpiry(ss, 120)) }}.
:::

The short straddle collects the largest possible premium for a neutral view, and it is the purest [[short premium]] position: positive theta, negative gamma, negative vega. Its failure mode is any large move, especially a gap: there is no strike beyond which the losses stop. After any move, one leg is in the money, so assignment risk is constant: a deep in-the-money put can be exercised early, and an in-the-money call the day before an ex-dividend date.

:::rule Margin for short straddles (as of 2026)
Both legs are naked. The standard minimum is the naked requirement on the side with the larger requirement plus the premium of the other side. For the ACME 100 straddle that is roughly {{ usd(marginShort, 0) }} at today's prices, and it rises with every dollar the stock moves. Short straddles need the highest options approval level at most brokers and are not allowed in IRAs.
:::

```tool position-builder
{ title: 'Long the December 100 straddle', legs: ls, range: [80, 120] }
```

:::key
A straddle is a call and a put at the same strike. Its price is the market's expected move; the long straddle profits if the actual move is larger, the short straddle if it is smaller. Long straddles are long gamma and vega and pay theta every day; short straddles collect theta and carry unlimited risk. Neither has an edge unless your forecast of the move beats the market's.
:::

```quiz
- q: >-
    You buy the December 100 straddle for {{ usd(longFill) }}. ACME finishes at $96. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(ls, 96)) }}
    - >-
      {{ usd(400) }}
    - >-
      {{ usd(-longFill * 100) }}
  answer: 0
  explain: >-
    The put is worth $4, the call nothing, so you recover $400 of the {{ usd(longFill * 100) }} you paid: {{ usd(payoff.pnlAtExpiry(ls, 96)) }}. $400 forgets the cost of the straddle. You lose the whole premium only at exactly $100.
- q: >-
    ACME's December 100 straddle trades at {{ usd(mid, 2) }}. What is the market saying?
  choices:
    - >-
      ACME is expected to move roughly {{ usd(mid, 2) }} in one direction or the other by expiration
    - >-
      ACME is expected to rise by {{ usd(mid, 2) }}
    - >-
      There is a 50% chance ACME finishes between {{ usd(lsum.breakevens[0]) }} and {{ usd(lsum.breakevens[1]) }}
  answer: 0
  explain: >-
    The at-the-money straddle is the market's expected size of the move, with no direction. The market-implied chance of finishing inside the break-evens is about {{ pct(1 - pOutside, 0) }}, not 50%: the average move is pulled up by occasional large ones, so the stock usually moves less than the average.
- q: >-
    You bought the straddle ten days ago. ACME is at $105 and implied volatility has fallen 5 points. Why is the position losing money?
  choices:
    - >-
      Ten days of time decay and the drop in implied volatility outweigh the gain from a $5 move
    - >-
      The put lost more than the call gained, because puts have higher implied volatility
    - >-
      Straddles only make money at expiration
  answer: 0
  explain: >-
    The long straddle pays about {{ usd(-lg.theta) }} a day in theta and loses {{ usd(lg.vega) }} for every vol point of implied volatility, roughly. A $5 move in ten days is not enough to cover both, so the position shows {{ usd(payoff.pnlAt(ls, 105, 10, { ...env, ivShift: -0.05 })) }}. Straddles can make money before expiration; this one just has not moved enough.
- q: >-
    Which statement about the short straddle is true?
  choices:
    - >-
      It has the largest credit of any neutral structure but no limit on its loss above the strike
    - >-
      Its maximum loss is the credit received
    - >-
      It is long gamma
  answer: 0
  explain: >-
    Selling both at-the-money options collects the most premium, {{ usd(shortFill * 100) }} here, and above the strike the short call's loss is unlimited. The credit is the maximum profit, not the maximum loss. Being short options makes it short gamma: every move works against it.
```
