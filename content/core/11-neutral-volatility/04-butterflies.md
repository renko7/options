---
title: Butterflies and the iron butterfly
summary: Build a long call butterfly and an iron butterfly, see why they are the same trade, and use them to bet cheaply on a price at expiration.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const exp = expiryDate(30);
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
const cpx = (K) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T), type: 'call' });
const dens = (K) => Math.exp(RATE * T) * (cpx(K - 0.05) - 2 * cpx(K) + cpx(K + 0.05)) / 0.0025;
const stats = (legs) => {
  let ev = 0, pw = 0, win = 0, pl = 0, loss = 0;
  for (let x = 50; x < 200; x += 0.05) {
    const f = dens(x) * 0.05, v = payoff.pnlAtExpiry(legs, x);
    ev += f * v;
    if (v > 0) { pw += f; win += f * v; } else { pl += f; loss += f * v; }
  }
  return { ev, pop: pw, avgWin: win / pw, avgLoss: loss / pl };
};
// long call butterfly 95/100/105
const flyMid = R(95).call.mid - 2 * R(100).call.mid + R(105).call.mid;
const flyNat = R(95).call.ask - 2 * R(100).call.bid + R(105).call.ask;
const flyFill = fillD(flyMid);
const fly = [
  { kind: 'call', qty: 1, strike: 95, premium: R(95).call.mid + (flyFill - flyMid), dte: 30, iv: R(95).call.iv },
  { kind: 'call', qty: -2, strike: 100, premium: R(100).call.mid, dte: 30, iv: R(100).call.iv },
  { kind: 'call', qty: 1, strike: 105, premium: R(105).call.mid, dte: 30, iv: R(105).call.iv },
];
const fs = payoff.summary(fly), fg = payoff.positionGreeks(fly, 100, 0, env), fst = stats(fly);
// iron butterfly: short 100 straddle, long 95 put and 105 call
const ifMid = R(100).call.mid + R(100).put.mid - R(95).put.mid - R(105).call.mid;
const ifFill = fillC(ifMid);
const ifly = [
  { kind: 'put', qty: 1, strike: 95, premium: R(95).put.mid, dte: 30, iv: R(95).put.iv },
  { kind: 'put', qty: -1, strike: 100, premium: R(100).put.mid + (ifFill - ifMid), dte: 30, iv: R(100).put.iv },
  { kind: 'call', qty: -1, strike: 100, premium: R(100).call.mid, dte: 30, iv: R(100).call.iv },
  { kind: 'call', qty: 1, strike: 105, premium: R(105).call.mid, dte: 30, iv: R(105).call.iv },
];
const is = payoff.summary(ifly), ig = payoff.positionGreeks(ifly, 100, 0, env), ist = stats(ifly);
const dfW = 5 * Math.exp(-RATE * T);
// a butterfly centered on a target: 100/105/110
const tMid = R(100).call.mid - 2 * R(105).call.mid + R(110).call.mid;
const tFill = fillD(tMid);
const tfly = [
  { kind: 'call', qty: 1, strike: 100, premium: R(100).call.mid + (tFill - tMid), dte: 30, iv: R(100).call.iv },
  { kind: 'call', qty: -2, strike: 105, premium: R(105).call.mid, dte: 30, iv: R(105).call.iv },
  { kind: 'call', qty: 1, strike: 110, premium: R(110).call.mid, dte: 30, iv: R(110).call.iv },
];
const ts = payoff.summary(tfly);
```

A [[butterfly spread]] pays most if the stock finishes at one particular price, and loses a small, fixed amount anywhere else. It is the cheapest way to bet that a stock will be *there* on expiration day, and it is the defined-risk cousin of the short straddle.

## The long call butterfly

A butterfly uses three equally spaced strikes in one expiration: buy one call at the lowest strike, sell two at the middle strike (the body), and buy one at the highest strike. The outer options are the [[wings]].

:::example The December 95/100/105 call butterfly
ACME is at $100. Buy one December 95 call, sell two December 100 calls, buy one December 105 call. The natural price is {{ usd(flyNat) }}, the mid {{ usd(flyMid, 3) }}; you are filled at a debit of **{{ usd(flyFill) }}**, {{ usd(flyFill * 100) }}.

At expiration on {{ longDate(exp) }}:

- **At $100**: the 95 call is worth $5 and everything else is worthless. Profit ($5 − {{ usd(flyFill) }}) × 100 = **{{ usd(fs.maxProfit) }}**, the max profit.
- **At or below $95, or at or above $105**: the position is worth nothing (above $105, the two short calls exactly cancel the two long ones). You lose the debit, {{ usd(-fs.maxLoss) }}.
- **Break-evens**: $95 + {{ usd(flyFill) }} = {{ usd(fs.breakevens[0]) }} and $105 − {{ usd(flyFill) }} = {{ usd(fs.breakevens[1]) }}.
:::

A butterfly is a bull call spread (95/100) plus a bear call spread (100/105). Its payoff is a tent: zero on both sides, rising to a peak of the wing width at the body. Paying {{ usd(flyFill) }} for a chance at {{ usd(5) }} tells you the market thinks finishing near $100 is fairly unlikely: at the market's odds, the butterfly makes money only {{ pct(fst.pop, 0) }} of the time.

## The iron butterfly

Sell the at-the-money straddle and buy an out-of-the-money put and call as wings, and you have an [[iron butterfly]]: an iron condor whose two short strikes are the same.

:::example The December 95/100/105 iron butterfly
Sell the December 100 call and 100 put; buy the December 95 put and 105 call. The mid is a {{ usd(ifMid, 3) }} credit; you are filled at **{{ usd(ifFill) }}**, {{ usd(ifFill * 100) }}.

- **Max profit**: the credit, {{ usd(is.maxProfit) }}, at exactly $100.
- **Max loss**: ($5 − {{ usd(ifFill) }}) × 100 = {{ usd(-is.maxLoss) }}, at or beyond either wing.
- **Break-evens**: {{ usd(is.breakevens[0]) }} and {{ usd(is.breakevens[1]) }}.
:::

Compare the two examples: same strikes, same max profit, same max loss, same break-evens. The long call butterfly costs {{ usd(flyFill) }}; the iron butterfly collects {{ usd(ifFill) }}; and {{ usd(flyFill) }} + {{ usd(ifFill) }} = {{ usd(flyFill + ifFill) }}, the wing width. At the mids the sum is {{ usd(flyMid + ifMid, 3) }}, within a couple of cents of the width discounted to today, {{ usd(dfW, 3) }}. This is the same [[put-call parity]] argument as for [vertical spreads](#core-10): a butterfly is two verticals, and each call vertical has a put twin with the same payoff. As with verticals, choose the version whose options are easier to trade; the iron butterfly uses only out-of-the-money and at-the-money options, which is why it is popular.

## Greeks: a short straddle with a floor

| | Long call butterfly | Iron butterfly |
|---|---|---|
| Delta | {{ signed(fg.delta, 1) }} shares | {{ signed(ig.delta, 1) }} shares |
| Gamma | {{ signed(fg.gamma, 2) }} | {{ signed(ig.gamma, 2) }} |
| Theta | {{ signedUsd(fg.theta) }}/day | {{ signedUsd(ig.theta) }}/day |
| Vega | {{ signedUsd(fg.vega) }} | {{ signedUsd(ig.vega) }} |

With ACME at the body, both versions are [[short premium]]: short gamma, short vega, collecting theta. They are short straddles whose wings cap the loss. Unlike a short straddle, the Greeks are small at the start and grow as expiration approaches, because the tent only takes its sharp shape in the final days:

| ACME | After 10 days | After 25 days | After 29 days |
|---|---|---|---|
{{ [95, 100, 105].map((S) => `| $${S} | ${usd(payoff.pnlAt(fly, S, 10, env))} | ${usd(payoff.pnlAt(fly, S, 25, env))} | ${usd(payoff.pnlAt(fly, S, 29, env))} |`).join('\n') }}

Even with ACME pinned at $100, the butterfly has made only {{ usd(payoff.pnlAt(fly, 100, 10, env)) }} after ten days. A butterfly is a slow trade until the last week, and then a very fast one: near expiration, small moves swing it between large gains and losses. That is when the [pin risk](#core-10) on the short body options matters most.

## Two ways to use a butterfly

**A neutral, short-volatility trade.** Centered at the money, a butterfly is a cheap, defined-risk version of the short straddle. Compared with the [iron condor](#core-11-iron-condor), it pays more at the center and wins less often: the market gives the iron butterfly a {{ pct(ist.pop, 0) }} chance of profit, with an average win of {{ usd(ist.avgWin) }} and an average loss of {{ usd(ist.avgLoss) }}. Its expected P&L at the market's odds is {{ signedUsd(ist.ev) }}, again just the cost of trading. As always, the edge must come from your forecast.

**A cheap bet on a target price.** Center the butterfly where you think the stock will be. If you expect ACME at $105 on December expiration, the 100/105/110 call butterfly costs {{ usd(tFill) }} and pays up to {{ usd(ts.maxProfit) }} at exactly $105, a reward of about {{ num(ts.maxProfit / -ts.maxLoss, 1) }} times the risk. It is right only in a narrow range ({{ usd(ts.breakevens[0]) }} to {{ usd(ts.breakevens[1]) }}), so it is a high-payoff, low-probability expression of a precise view.

:::practice How traders set up butterflies
Traders choose the wing width from how precise their view is: narrow wings pay a larger multiple of the cost but need a precise finish; wide wings forgive more and cost more. They often buy butterflies one to three weeks before expiration, when the tent begins to form, and close them before the final day rather than hold through the pin. A butterfly whose wings are not equally spaced (a broken-wing butterfly) tilts the payoff toward one side, at the cost of extra risk on that side.
:::

```tool position-builder
{ title: 'December 95/100/105 call butterfly', legs: fly, range: [88, 112] }
```

:::key
A butterfly is a long wing, two short options at the body, and a long wing, equally spaced. It costs a small debit (or, as an iron butterfly, collects a credit equal to the width minus that debit) and pays most at the body. Its Greeks are those of a short straddle with the loss capped, and they stay small until the last days. Use it for a neutral short-volatility view with defined risk, or as a cheap bet on a specific price.
:::

```quiz
- q: >-
    You buy the December 95/100/105 call butterfly for {{ usd(flyFill) }}. ACME finishes at $102. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(fly, 102)) }}
    - >-
      {{ usd(fs.maxProfit) }}
    - >-
      {{ usd(-flyFill * 100) }}
  answer: 0
  explain: >-
    The 95 call is worth $7, the two short 100 calls cost $2 each, and the 105 call is worthless: 7 − 4 = $3 a share, less the {{ usd(flyFill) }} debit, {{ usd(payoff.pnlAtExpiry(fly, 102)) }}. The max profit needs ACME at exactly $100; losing the debit happens only at or beyond the wings.
- q: >-
    The 95/100/105 call butterfly costs {{ usd(flyFill) }}. About what should the 95/100/105 iron butterfly collect?
  choices:
    - >-
      About {{ usd(5 - flyFill) }}
    - >-
      About {{ usd(flyFill) }}
    - >-
      About $5.00
  answer: 0
  explain: >-
    The two have the same payoff shape, so the call butterfly's debit plus the iron butterfly's credit must equal the $5 width (discounted slightly for time). If the iron butterfly collected only {{ usd(flyFill) }}, its max loss would be far larger than the call butterfly's for the same payoff.
- q: >-
    Ten days into the call butterfly, ACME is exactly at $100. Why is the profit still small?
  choices:
    - >-
      The tent only takes its full shape near expiration; with 20 days left, the options still carry time value that offsets most of it
    - >-
      Butterflies lose money when the stock is at the body
    - >-
      Implied volatility must have risen
  answer: 0
  explain: >-
    A butterfly's value approaches the full tent only as expiration nears; with 20 days left it shows {{ usd(payoff.pnlAt(fly, 100, 10, env)) }}, and the bulk of the gain comes in the final week. The body is where the butterfly makes the most, not where it loses. Nothing about implied volatility is needed to explain it.
- q: >-
    You expect ACME to be very close to $105 on December expiration. Which trade expresses that most cheaply?
  choices:
    - >-
      The 100/105/110 call butterfly for {{ usd(tFill) }}
    - >-
      The 100/105 bull call spread
    - >-
      The short 105 straddle
  answer: 0
  explain: >-
    The butterfly centered at $105 costs {{ usd(tFill) }} and pays up to {{ usd(ts.maxProfit) }} at $105, with no more than the debit at risk. The bull call spread also pays at $105 but keeps paying above it, which you are not forecasting, and costs more. The short straddle at 105 pays most at $105 too, but its loss is unlimited.
```
