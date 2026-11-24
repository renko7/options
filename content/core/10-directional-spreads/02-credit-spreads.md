---
title: "Credit spreads: the bull put and the bear call"
summary: Build bull put and bear call spreads, compute their risk, and see why a credit spread and a debit spread on the same strikes are the same trade.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
// bull put 95/100: sell 100 put, buy 95 put
const p100 = R(100).put, p95 = R(95).put, p105 = R(105).put;
const bupMid = p100.mid - p95.mid, bupNat = p100.bid - p95.ask, bupFill = fillC(bupMid);
const bup = [
  { kind: 'put', qty: -1, strike: 100, premium: bupFill + p95.mid, dte: 30, iv: p100.iv },
  { kind: 'put', qty: 1, strike: 95, premium: p95.mid, dte: 30, iv: p95.iv },
];
const bups = payoff.summary(bup);
const gup = payoff.positionGreeks(bup, 100, 0, env);
// bear call 100/105: sell 100 call, buy 105 call
const c100 = R(100).call, c105 = R(105).call;
const bcMid = c100.mid - c105.mid, bcNat = c100.bid - c105.ask, bcFill = fillC(bcMid);
const bec = [
  { kind: 'call', qty: -1, strike: 100, premium: bcFill + c105.mid, dte: 30, iv: c100.iv },
  { kind: 'call', qty: 1, strike: 105, premium: c105.mid, dte: 30, iv: c105.iv },
];
const becs = payoff.summary(bec);
// parity: bull call 100/105 (debit) vs bull put 100/105 (credit)
const bullCallMid = c100.mid - c105.mid;
const bullPutMid = p105.mid - p100.mid;
const dfW = 5 * Math.exp(-RATE * T);
const bcD = fillD(bullCallMid);
const bpC = fillC(bullPutMid);
const bullCall = [
  { kind: 'call', qty: 1, strike: 100, premium: bcD + c105.mid, dte: 30, iv: c100.iv },
  { kind: 'call', qty: -1, strike: 105, premium: c105.mid, dte: 30, iv: c105.iv },
];
const bullPut = [
  { kind: 'put', qty: -1, strike: 105, premium: bpC + p100.mid, dte: 30, iv: p105.iv },
  { kind: 'put', qty: 1, strike: 100, premium: p100.mid, dte: 30, iv: p100.iv },
];
const s1 = payoff.summary(bullCall), s2 = payoff.summary(bullPut);
const g1 = payoff.positionGreeks(bullCall, 100, 0, env), g2 = payoff.positionGreeks(bullPut, 100, 0, env);
```

The [debit spreads](#core-10-debit-spreads) in the previous Lesson buy the more valuable option and sell the cheaper one. Turn that around, selling the more valuable option and buying a cheaper one further out of the money as protection, and you collect a premium instead of paying one. That is a [[credit spread]]. There are two: the [[bull put spread]] and the [[bear call spread]].

## The bull put spread

Sell a put, and buy a put at a lower strike in the same expiration. You keep the credit if ACME stays above the short strike. The long put caps the loss: unlike a [cash-secured put](#core-09-cash-secured-put), below the lower strike every dollar the short put loses, the long put gains back.

:::example The December 95/100 bull put spread
ACME is at $100. Sell the December 100 put (bid {{ usd(p100.bid) }}) and buy the December 95 put (ask {{ usd(p95.ask) }}). The natural credit is {{ usd(bupNat) }}, the mid {{ usd(bupMid, 3) }}; you are filled at a credit of **{{ usd(bupFill) }}**, receiving {{ usd(bupFill * 100) }}.

At expiration:

- **ACME at or above $100**: both puts expire worthless. You keep the credit, {{ usd(bups.maxProfit) }}, the max profit.
- **ACME at or below $95**: the short 100 put costs you exactly $5 more than the long 95 put pays. You lose the width less the credit: ($5 − {{ usd(bupFill) }}) × 100 = {{ usd(-bups.maxLoss) }}.
- **Break-even**: the short strike minus the credit, $100 − {{ usd(bupFill) }} = **{{ usd(bups.breakevens[0]) }}**.

At entry the position has a delta of {{ num(gup.delta, 1) }} shares, theta {{ signedUsd(gup.theta) }} a day and vega {{ signedUsd(gup.vega) }} per vol point: bullish, paid by time, hurt by rising volatility.
:::

For any credit spread with width \(W\) and credit \(C\):

\[ \text{max profit} = C, \qquad \text{max loss} = W - C, \qquad \text{break-even} = K_S \mp C \]

where \(K_S\) is the short strike: minus the credit for a put spread, plus for a call spread.

## The bear call spread

The bearish version sells a call and buys a higher-strike call.

:::example The December 100/105 bear call spread
Sell the December 100 call (bid {{ usd(c100.bid) }}) and buy the December 105 call (ask {{ usd(c105.ask) }}). Natural {{ usd(bcNat) }}, mid {{ usd(bcMid, 3) }}, filled at a credit of **{{ usd(bcFill) }}**.

- Max profit: the credit, {{ usd(becs.maxProfit) }}, if ACME finishes at or below $100.
- Max loss: ($5 − {{ usd(bcFill) }}) × 100 = {{ usd(-becs.maxLoss) }}, if ACME finishes at or above $105.
- Break-even: $100 + {{ usd(bcFill) }} = {{ usd(becs.breakevens[0]) }}.
:::

:::rule Margin for credit spreads (as of 2026)
Under FINRA and Reg T rules, a credit spread in a margin account requires collateral equal to its maximum loss: the width times the multiplier, less the credit received at most brokers. The 95/100 bull put spread ties up {{ usd(-bups.maxLoss) }}, not the $10,000 a cash-secured 100 put would. Spreads require a higher options approval level than covered calls; brokers that allow spreads in IRAs require that level there too. See [Accounts and orders](#core-08).
:::

## The same strikes, the same trade

Here is the most useful fact about verticals. A bull call spread and a bull put spread **on the same two strikes** have the same payoff.

:::derivation Why a call spread and a put spread on the same strikes are equivalent
Take strikes \(K_1 < K_2\). At expiration, for any stock price \(S\):

\[ \max(S - K_1, 0) - \max(K_1 - S, 0) = S - K_1 \]

because exactly one of the two terms is nonzero (or both are zero at \(S = K_1\)). The same holds for \(K_2\). Subtract the second identity from the first:

\[ \big[ C_{K_1} - C_{K_2} \big] - \big[ P_{K_1} - P_{K_2} \big] = (S - K_1) - (S - K_2) = K_2 - K_1 \]

Write \(X\) for the bull call spread's value at expiration, \(C_{K_1} - C_{K_2}\). The bull put spread is long the \(K_1\) put and short the \(K_2\) put, so its value at expiration is \(P_{K_1} - P_{K_2}\), which by the identity is always \(X - W\), where \(W = K_2 - K_1\).

A bull call spread bought for a debit \(D\) ends with P&L \(X - D\). A bull put spread sold for a credit \(C\) ends with \((X - W) + C\). These are equal at every stock price exactly when \(D + C = W\). Before expiration, the fixed amount \(W\) is worth its present value, so today's prices must satisfy

\[ D + C = W e^{-rT} \]

or an [[arbitrage]] exists. This is [[put-call parity]] applied to each strike and subtracted; dividends cancel because both strikes see the same ones.
:::

:::example The 100/105 bull call spread against the 100/105 bull put spread
At the mids, the December 100/105 bull call spread costs {{ usd(bullCallMid, 3) }} and the 100/105 bull put spread (sell the 105 put, buy the 100 put) brings in {{ usd(bullPutMid, 3) }}. Their sum is {{ usd(bullCallMid + bullPutMid, 3) }}; the $5 width discounted at 4% for 30 days is {{ usd(dfW, 3) }}.

Filled a little worse than the mid, the call spread costs {{ usd(bcD) }} and the put spread collects {{ usd(bpC) }}:

| | Bull call 100/105 (debit) | Bull put 100/105 (credit) |
|---|---|---|
| Cash at entry | pay {{ usd(bcD * 100) }} | receive {{ usd(bpC * 100) }} |
| Max profit | {{ usd(s1.maxProfit) }} | {{ usd(s2.maxProfit) }} |
| Max loss | {{ usd(-s1.maxLoss) }} | {{ usd(-s2.maxLoss) }} |
| Break-even | {{ usd(s1.breakevens[0]) }} | {{ usd(s2.breakevens[0]) }} |
| Delta / theta / vega at $100 | {{ num(g1.delta, 1) }} / {{ signedUsd(g1.theta) }} / {{ signedUsd(g1.vega) }} | {{ num(g2.delta, 1) }} / {{ signedUsd(g2.theta) }} / {{ signedUsd(g2.vega) }} |

Same payoff, same Greeks. One collects cash and posts collateral equal to its max loss; the other pays cash equal to its max loss. Either way, {{ usd(-s1.maxLoss) }} is at risk.
:::

So "debit spread versus credit spread" is not a choice between strategies. It is a choice between two ways of writing the same bet. A credit spread is not more likely to win than the debit spread on the same strikes; it is the same position. What does differ:

- **Which options are in the money.** In the bull put 100/105, the short 105 put is in the money from the start, so it carries [[early exercise]] risk (deep in-the-money American puts are sometimes exercised early). In the bull call 100/105, the short leg is the out-of-the-money 105 call.
- **Liquidity.** Out-of-the-money options usually have tighter markets and more open interest. Traders build the spread from whichever type is out of the money: calls for spreads above the stock price, puts for spreads below it.
- **Cash flow and interest.** The credit spread puts cash in your account, but the collateral is held against it, so there is little practical difference.

That is why traders talk about "selling a put spread" when the strikes are below the market (a bull put spread made of out-of-the-money puts) and "buying a call spread" when the strikes are above it. The choice of strikes is the real decision, and it is the subject of the [next Lesson](#core-10-choosing-strikes).

## Before expiration and the failure mode

Credit spreads collect most of their profit through time decay, slowly. Ten days into the 95/100 bull put spread, with ACME unchanged at $100, the position shows {{ usd(payoff.pnlAt(bup, 100, 10, env)) }}. If implied volatility rises 5 points with ACME unchanged, it shows {{ usd(payoff.pnlAt(bup, 100, 10, { ...env, ivShift: 0.05 })) }} instead. If ACME drops to $96 in those ten days, it shows {{ usd(payoff.pnlAt(bup, 96, 10, env)) }}.

The failure mode is the reverse of the debit spread's: many small wins and an occasional full loss. A trader who sells credit spreads with a {{ usd(bups.maxProfit) }} target and a {{ usd(-bups.maxLoss) }} risk needs to win more than {{ pct(-bups.maxLoss / (bups.maxProfit - bups.maxLoss), 0) }} of the time just to break even. Judge credit spreads by that arithmetic, not by how often they win.

```tool position-builder
{ title: 'December 95/100 bull put spread', legs: bup, range: [88, 110] }
```

:::key
A credit spread sells the more valuable option and buys a cheaper one further out as protection. Max profit is the credit, max loss is the width minus the credit, and break-even is the short strike minus (puts) or plus (calls) the credit. By put-call parity, a bull put spread and a bull call spread on the same strikes are the same trade: the debit plus the credit equals the width, discounted.
:::

```quiz
- q: >-
    You sell the December 95/100 bull put spread for {{ usd(bupFill) }}. ACME finishes at $97. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(bup, 97)) }}
    - >-
      {{ usd(bups.maxProfit) }}
    - >-
      {{ usd(bups.maxLoss) }}
  answer: 0
  explain: >-
    The short 100 put is $3 in the money and the long 95 put is worthless, so you owe $300 against the {{ usd(bupFill * 100) }} credit: {{ usd(payoff.pnlAtExpiry(bup, 97)) }}. You keep the full credit only above $100, and lose the maximum only at or below $95.
- q: >-
    The December 100/105 bull call spread trades at {{ usd(bullCallMid, 3) }} at the mid. Roughly what should the December 100/105 bull put spread bring in at the mid?
  choices:
    - >-
      About {{ usd(dfW - bullCallMid, 2) }}
    - >-
      About {{ usd(bullCallMid, 2) }}, the same as the call spread
    - >-
      About $5.00
  answer: 0
  explain: >-
    The call spread's debit plus the put spread's credit must equal the width discounted to today, {{ usd(dfW, 3) }}. So the put spread should bring in about {{ usd(dfW, 3) }} − {{ usd(bullCallMid, 3) }} = {{ usd(dfW - bullCallMid, 2) }}. If both brought in the same amount, buying one and selling the other would lock in a riskless profit.
- q: >-
    Which statement about a credit spread and a debit spread on the same two strikes and expiration is true?
  choices:
    - >-
      The credit spread has a higher probability of profit
    - >-
      They have the same payoff and Greeks; they differ in cash flow, which legs are in the money and early-exercise risk
    - >-
      The debit spread has unlimited upside
  answer: 1
  explain: >-
    Put-call parity makes them the same position: same max profit, max loss, break-even and Greeks. The probability of profit is the same because the break-even is the same. What differs is practical: one pays cash and one posts collateral, and the in-the-money short leg of one of them can be exercised early.
- q: >-
    You sell a credit spread that can make {{ usd(bups.maxProfit) }} and lose {{ usd(-bups.maxLoss) }}. Ignoring partial outcomes, how often must it win just to break even?
  choices:
    - >-
      More than {{ pct(-bups.maxLoss / (bups.maxProfit - bups.maxLoss), 0) }} of the time
    - >-
      More than 50% of the time
    - >-
      More than {{ pct(bups.maxProfit / (bups.maxProfit - bups.maxLoss), 0) }} of the time
  answer: 0
  explain: >-
    With win W and loss L, break-even needs p × W = (1 − p) × L, so p = L / (W + L) = {{ usd(-bups.maxLoss) }} / {{ usd(bups.maxProfit - bups.maxLoss) }} = {{ pct(-bups.maxLoss / (bups.maxProfit - bups.maxLoss), 0) }}. 50% would be right only if the win and loss were equal; {{ pct(bups.maxProfit / (bups.maxProfit - bups.maxLoss), 0) }} swaps the two.
```
