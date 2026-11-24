---
title: "Debit spreads: the bull call and the bear put"
summary: Build a bull call spread and a bear put spread, compute their max profit, max loss and break-even, and know how they behave before expiration.
---

```calc
const env = { r: RATE, q: ACME.q };
const exp = expiryDate(30);
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
// bull call 100/105
const c100 = R(100).call, c105 = R(105).call;
const bcMid = c100.mid - c105.mid, bcNat = c100.ask - c105.bid, bcFill = fillD(bcMid);
const bc = [
  { kind: 'call', qty: 1, strike: 100, premium: bcFill + c105.mid, dte: 30, iv: c100.iv },
  { kind: 'call', qty: -1, strike: 105, premium: c105.mid, dte: 30, iv: c105.iv },
];
const bcs = payoff.summary(bc);
const lc = [{ kind: 'call', qty: 1, strike: 100, premium: c100.ask, dte: 30, iv: c100.iv }];
const lcs = payoff.summary(lc);
// bear put 100/95
const p100 = R(100).put, p95 = R(95).put;
const bpMid = p100.mid - p95.mid, bpNat = p100.ask - p95.bid, bpFill = fillD(bpMid);
const bp = [
  { kind: 'put', qty: 1, strike: 100, premium: bpFill + p95.mid, dte: 30, iv: p100.iv },
  { kind: 'put', qty: -1, strike: 95, premium: p95.mid, dte: 30, iv: p95.iv },
];
const bps = payoff.summary(bp);
const G = (S, d) => payoff.positionGreeks(bc, S, d, env);
const prices = [90, 95, 100, 102, 105, 110, 120];
```

A long call is the simplest bullish trade, and the [[long call]] Lesson in [Payoffs at expiration](#core-03) showed its weakness: you pay for every possible rally, including the ones you do not expect. If you think ACME will rise to about $105 over the next month, the part of the call's price that pays for $120 or $130 is money spent on outcomes you do not believe in. A [[vertical spread]] sells that part back.

## The bull call spread

A [[bull call spread]] is a long call plus a short call at a higher strike, in the same expiration. Both legs are calls, both expire together, and only the strikes differ: that is what "vertical" means (strikes are listed vertically on a chain). Because the call you buy costs more than the call you sell, you pay to open it, so it is a [[debit spread]]. The distance between the strikes is the [[spread width]].

Spreads are entered as one [[complex order]] at a net price, not leg by leg. The *natural* price pays the ask on the leg you buy and takes the bid on the leg you sell; the mid is halfway between. In this Module, fills are a limit order placed a little worse than the mid, rounded to a nickel, which is how a patient trader usually gets filled on a liquid spread.

:::example The December 100/105 bull call spread
ACME is at $100. In the December expiration ({{ longDate(exp) }}, 30 days):

- buy the 100 call (bid {{ usd(c100.bid) }}, ask {{ usd(c100.ask) }});
- sell the 105 call (bid {{ usd(c105.bid) }}, ask {{ usd(c105.ask) }}).

The natural price is {{ usd(bcNat) }}; the mid is {{ usd(bcMid, 3) }}. You are filled at **{{ usd(bcFill) }}**, a debit of {{ usd(bcFill * 100) }}.

At expiration:

- **ACME at or below $100**: both calls expire worthless. You lose the debit, {{ usd(-bcs.maxLoss) }}. That is the [[max loss]].
- **ACME at $105 or above**: the 100 call is worth $5 more than the 105 call, whatever the price. You collect the $5 width less the debit: ($5 − {{ usd(bcFill) }}) × 100 = {{ usd(bcs.maxProfit) }}, the [[max profit]].
- **In between**, the spread is worth ACME minus $100. You [[break even|break-even]] at $100 + {{ usd(bcFill) }} = **{{ usd(bcs.breakevens[0]) }}**.
:::

For any debit spread, with width \(W\) and debit \(D\):

\[ \text{max loss} = D, \qquad \text{max profit} = W - D, \qquad \text{break-even} = K_L \pm D \]

where \(K_L\) is the long strike, with \(+\) for a call spread and \(-\) for a put spread. The reward-to-risk ratio here is {{ usd(bcs.maxProfit) }} to {{ usd(-bcs.maxLoss) }}.

## What you gave up, and what you got

Compare the spread with buying the 100 call alone at its ask of {{ usd(c100.ask) }}:

| ACME at expiration | Long 100 call | 100/105 bull call spread |
|---|---|---|
{{ prices.map((S) => `| $${S} | ${usd(payoff.pnlAtExpiry(lc, S))} | ${usd(payoff.pnlAtExpiry(bc, S))} |`).join('\n') }}

The spread costs {{ usd((c100.ask - bcFill) * 100) }} less, loses less if ACME goes nowhere, breaks even {{ usd(lcs.breakevens[0] - bcs.breakevens[0]) }} sooner, and does better at every price up to {{ usd(105 + (c100.ask - bcFill)) }}. Above that, the long call keeps going and the spread does not. If your target really is about $105, the spread expresses it better and more cheaply. If you think ACME could double, it is the wrong trade.

## The bear put spread

The mirror image for a bearish view is the [[bear put spread]]: buy a put, sell a put at a lower strike, same expiration.

:::example The December 100/95 bear put spread
Buy the December 100 put (ask {{ usd(p100.ask) }}) and sell the December 95 put (bid {{ usd(p95.bid) }}). Natural {{ usd(bpNat) }}, mid {{ usd(bpMid, 3) }}, filled at **{{ usd(bpFill) }}**.

- Max loss: the debit, {{ usd(-bps.maxLoss) }}, if ACME finishes at or above $100.
- Max profit: ($5 − {{ usd(bpFill) }}) × 100 = {{ usd(bps.maxProfit) }}, if ACME finishes at or below $95.
- Break-even: $100 − {{ usd(bpFill) }} = {{ usd(bps.breakevens[0]) }}.
:::

Notice the bear put spread costs a little less than the bull call spread, although both are $5 wide and start at the money. Two things cause that. ACME's [[forward price]] is slightly above $100, because the interest rate exceeds the dividend yield, so the market leans very slightly toward higher prices. And the [[volatility skew]] makes the 95 put you sell relatively expensive, which lowers the net debit.

## Greeks: a spread changes character as the stock moves

At entry, with ACME at $100, the bull call spread has a [[position delta]] of {{ num(G(100, 0).delta, 1) }} shares, theta of {{ signedUsd(G(100, 0).theta) }} a day and vega of {{ signedUsd(G(100, 0).vega) }} per vol point. It is mildly bullish and mildly long volatility. That changes as ACME moves:

| ACME | Delta (shares) | Theta ($/day) | Vega ($/vol pt) |
|---|---|---|---|
{{ [95, 100, 105, 110].map((S) => `| $${S} | ${num(G(S, 0).delta, 1)} | ${signedUsd(G(S, 0).theta)} | ${signedUsd(G(S, 0).vega)} |`).join('\n') }}

Below the middle of the strikes the spread behaves like the long call it contains: time decay hurts and higher volatility helps. Above the middle it behaves like the short call: time decay helps, and higher volatility hurts, because more volatility raises the chance ACME falls back below $105. A debit spread is not simply "long premium"; which side dominates depends on where the stock is.

## Before expiration: spreads are slow

Because the short call offsets most of the long call's moves, the spread's value changes slowly until late in its life. If ACME jumps to $105 ten days in, the spread shows {{ usd(payoff.pnlAt(bc, 105, 10, env)) }}, not {{ usd(bcs.maxProfit) }}; at $110 it shows {{ usd(payoff.pnlAt(bc, 110, 10, env)) }}. Twenty days in, at $110, it shows {{ usd(payoff.pnlAt(bc, 110, 20, env)) }}. The full width is only reached at expiration, or with the stock far beyond the short strike. Traders who need a fast payoff on a fast move prefer the outright call.

The typical failure is not a crash but disappointment: ACME drifts to $101 and the spread is worth only $1 at expiration, a loss of {{ usd(-payoff.pnlAtExpiry(bc, 101)) }}. A debit spread needs the move, and needs it by expiration.

```tool position-builder
{ title: 'December 100/105 bull call spread', legs: bc, range: [88, 115] }
```

:::key
A debit spread buys one option and sells a further out-of-the-money option in the same expiration. Max loss is the debit, max profit is the width minus the debit, and break-even is the long strike plus (calls) or minus (puts) the debit. It is cheaper than the outright option and better at every price up to somewhat beyond the short strike, but its gain is capped and it reaches full value only near expiration.
:::

```quiz
- q: >-
    You buy the December 100/110 bull call spread for $3.00. What are its max profit, max loss and break-even?
  choices:
    - >-
      Max profit {{ usd((10 - 3) * 100) }}, max loss {{ usd(300) }}, break-even {{ usd(100 + 3) }}
    - >-
      Max profit {{ usd(10 * 100) }}, max loss {{ usd(300) }}, break-even {{ usd(100 + 3) }}
    - >-
      Max profit {{ usd((10 - 3) * 100) }}, max loss {{ usd(300) }}, break-even {{ usd(110 - 3) }}
  answer: 0
  explain: >-
    The width is $10, so max profit is ($10 − $3) × 100 = {{ usd((10 - 3) * 100) }}, max loss is the {{ usd(300) }} debit, and break-even is the long strike plus the debit, {{ usd(100 + 3) }}. {{ usd(10 * 100) }} forgets to subtract the debit; {{ usd(110 - 3) }} subtracts the debit from the short strike, which is the break-even rule for a credit spread, not a debit spread.
- q: >-
    You hold the December 100/105 bull call spread bought for {{ usd(bcFill) }}. Ten days in, ACME is at $105. Why is your position worth less than the {{ usd(bcs.maxProfit) }} max profit?
  choices:
    - >-
      Because the short 105 call still has time value that offsets part of the long call's gain
    - >-
      Because the max profit is only paid if ACME is above $110
    - >-
      Because spreads lose money when volatility falls
  answer: 0
  explain: >-
    At expiration the spread is worth the full $5 width above $105, but with 20 days left both calls still carry time value, and the 105 call you are short is worth a lot more than nothing. The position shows {{ usd(payoff.pnlAt(bc, 105, 10, env)) }}. Max profit needs ACME at or above $105 at expiration, not $110. With ACME at $105 the spread's vega is negative, so a fall in volatility would actually help.
- q: >-
    ACME is at $100. Which statement about the 100/105 bull call spread's Greeks is correct?
  choices:
    - >-
      Its vega is positive at $100 and negative at $110
    - >-
      Its vega is always positive, because it is a debit spread
    - >-
      Its theta is always negative, because you paid to open it
  answer: 0
  explain: >-
    Near the long strike the long call dominates (vega {{ signedUsd(G(100, 0).vega) }}); beyond the short strike the short call dominates (vega {{ signedUsd(G(110, 0).vega) }}), and theta turns positive there too. Paying a debit does not fix the sign of the Greeks.
- q: >-
    You expect ACME to fall to about $95 by December expiration. Which trade fits best?
  choices:
    - >-
      The December 100/95 bear put spread for {{ usd(bpFill) }}
    - >-
      The December 100/105 bull call spread for {{ usd(bcFill) }}
    - >-
      The December 95 put alone
  answer: 0
  explain: >-
    The bear put spread pays its maximum, {{ usd(bps.maxProfit) }}, at exactly your target of $95 or below, for a {{ usd(bpFill * 100) }} risk. The 95 put alone would be worth nothing at $95. The bull call spread is a bullish trade.
```
