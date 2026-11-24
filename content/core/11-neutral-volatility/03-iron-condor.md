---
title: The iron condor
summary: Sell a strangle with protective wings to get a defined-risk neutral trade, and separate its probability of profit from its expected value.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const exp = expiryDate(30);
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
// market-implied distribution from the chain's own prices
const cpx = (K) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T), type: 'call' });
const dens = (K) => Math.exp(RATE * T) * (cpx(K - 0.05) - 2 * cpx(K) + cpx(K + 0.05)) / 0.0025;
const stats = (legs) => {
  let ev = 0, pw = 0, win = 0, pl = 0, loss = 0, pMaxLoss = 0;
  const mx = payoff.extremes(legs);
  for (let x = 50; x < 200; x += 0.05) {
    const f = dens(x) * 0.05, v = payoff.pnlAtExpiry(legs, x);
    ev += f * v;
    if (v > 0) { pw += f; win += f * v; } else { pl += f; loss += f * v; }
    if (v <= mx.maxLoss + 0.01) pMaxLoss += f;
  }
  return { ev, pop: pw, pl, avgWin: win / pw, avgLoss: loss / pl, pMaxLoss };
};
const condor = (lp, sp, sc, lc) => {
  const mid = R(sp).put.mid + R(sc).call.mid - R(lp).put.mid - R(lc).call.mid;
  const nat = R(sp).put.bid + R(sc).call.bid - R(lp).put.ask - R(lc).call.ask;
  const fill = fillC(mid);
  const legs = [
    { kind: 'put', qty: 1, strike: lp, premium: R(lp).put.mid, dte: 30, iv: R(lp).put.iv },
    { kind: 'put', qty: -1, strike: sp, premium: R(sp).put.mid + (fill - mid), dte: 30, iv: R(sp).put.iv },
    { kind: 'call', qty: -1, strike: sc, premium: R(sc).call.mid, dte: 30, iv: R(sc).call.iv },
    { kind: 'call', qty: 1, strike: lc, premium: R(lc).call.mid, dte: 30, iv: R(lc).call.iv },
  ];
  const s = payoff.summary(legs);
  return { lp, sp, sc, lc, mid, nat, fill, legs, s, g: payoff.positionGreeks(legs, 100, 0, env), st: stats(legs) };
};
const ic = condor(90, 95, 105, 110);
const wide = condor(85, 95, 105, 115);
const far = condor(85, 90, 110, 115);
const strangle = [
  { kind: 'put', qty: -1, strike: 95, premium: R(95).put.mid, dte: 30, iv: R(95).put.iv },
  { kind: 'call', qty: -1, strike: 105, premium: fillC(R(95).put.mid + R(105).call.mid) - R(95).put.mid, dte: 30, iv: R(105).call.iv },
];
```

The [short strangle](#core-11-strangle) has one flaw that keeps many traders away from it: its loss has no limit. An [[iron condor]] fixes that by buying a further out-of-the-money put and call, the [[wings]], which cap the loss on each side. The result is a neutral, [[defined risk]] trade that profits if the stock stays in a range.

## The structure

An iron condor is four options in one expiration:

- a [bull put spread](#core-10) below the market: short a put, long a lower put;
- a [bear call spread](#core-10) above the market: short a call, long a higher call.

Both spreads are sold for a credit. Since the stock can only finish on one side, only one spread can lose, so the risk is the width of one spread less the total credit.

:::example The December 90/95/105/110 iron condor
ACME is at $100. In the December expiration ({{ longDate(exp) }}):

- sell the 95 put and buy the 90 put;
- sell the 105 call and buy the 110 call.

The natural credit is {{ usd(ic.nat) }}, the mid {{ usd(ic.mid, 3) }}; you are filled at a credit of **{{ usd(ic.fill) }}**, {{ usd(ic.fill * 100) }} in total.

At expiration:

- **Between $95 and $105**: all four options expire worthless. You keep {{ usd(ic.s.maxProfit) }}, the max profit.
- **Below $90 or above $110**: one spread loses its full $5 width. Max loss: ($5 − {{ usd(ic.fill) }}) × 100 = {{ usd(-ic.s.maxLoss) }}.
- **Break-evens**: $95 − {{ usd(ic.fill) }} = **{{ usd(ic.s.breakevens[0]) }}** and $105 + {{ usd(ic.fill) }} = **{{ usd(ic.s.breakevens[1]) }}**.

Position Greeks at entry: delta {{ signed(ic.g.delta, 1) }} shares, gamma {{ signed(ic.g.gamma, 2) }} shares per $1, theta {{ signedUsd(ic.g.theta) }} a day, vega {{ signedUsd(ic.g.vega) }} per vol point.
:::

The wings cost money. The short 95/105 strangle alone brings in {{ usd(-payoff.netPremium(strangle)) }}; the condor brings in {{ usd(ic.fill * 100) }}. In exchange, a move to $120 costs the condor {{ usd(-payoff.pnlAtExpiry(ic.legs, 120)) }} instead of the strangle's {{ usd(-payoff.pnlAtExpiry(strangle, 120)) }}, and the margin requirement falls to the max loss.

:::rule Margin for iron condors (as of 2026)
In a margin account, an iron condor is treated as two credit spreads in which only one side can lose at expiration, so most brokers require collateral equal to the wider spread's width times 100, less the total credit: {{ usd(-ic.s.maxLoss) }} here. It needs spread-level options approval, not naked approval.
:::

## Probability of profit is not expected value

Iron condors are often sold on their probability of profit. Here is that number, and the ones that matter as much. All of them use the market's own probabilities, read from the chain's prices:

:::example What the December iron condor really offers
- **Chance of any profit** (ACME finishes between {{ usd(ic.s.breakevens[0]) }} and {{ usd(ic.s.breakevens[1]) }}): {{ pct(ic.st.pop, 0) }}.
- **Average result when it wins**: {{ usd(ic.st.avgWin) }}. Most wins are the full credit, some are partial.
- **Average result when it loses**: {{ usd(ic.st.avgLoss) }}.
- **Chance of the full {{ usd(-ic.s.maxLoss) }} loss** (ACME beyond a wing): {{ pct(ic.st.pMaxLoss, 0) }}.
- **Expected P&L**: the wins contribute {{ usd(ic.st.pop * ic.st.avgWin) }} (about a {{ pct(ic.st.pop, 0) }} chance of an average {{ usd(ic.st.avgWin) }}) and the losses {{ usd(ic.st.pl * ic.st.avgLoss) }} (about a {{ pct(ic.st.pl, 0) }} chance of an average {{ usd(ic.st.avgLoss) }}): **{{ signedUsd(ic.st.ev) }}** per condor, which is the cost of trading a little worse than the mid. Commissions on four legs make it more negative.
:::

The condor wins most of the time and still has an expected value of about zero, because its losses are larger than its wins. This is not a flaw in the iron condor; it is how fair prices work. A seller who collects {{ usd(ic.fill * 100) }} with a {{ pct(ic.st.pop, 0) }} chance of keeping something is being paid exactly what the risk is worth at the market's odds.

An iron condor makes money over time only if the stock actually moves less than the options' [[implied volatility]] predicted. Historically, implied volatility has on average been somewhat higher than the volatility that followed, which is the premium sellers' real edge. That edge is small, it comes in many small wins, and it is paid back in occasional full losses. Sizing must survive those losses.

:::warning Win rate tells you nothing on its own
A trader who sells iron condors can win 8 or 9 months out of 10 and still lose money over a year, if one or two full losses exceed the credits. Track your average win and average loss, not just how often you win.
:::

## Choosing the strikes and wings

Three December condors on ACME at $100:

| Condor (put wing / short put / short call / call wing) | Credit | Max loss | Chance of profit | Chance of max loss | Expected P&L |
|---|---|---|---|---|---|
{{ [ic, wide, far].map((x) => `| ${x.lp}/${x.sp}/${x.sc}/${x.lc} | ${usd(x.fill * 100)} | ${usd(-x.s.maxLoss)} | ${pct(x.st.pop, 0)} | ${pct(x.st.pMaxLoss, 0)} | ${signedUsd(x.st.ev)} |`).join('\n') }}

- **Wider wings** ({{ int(wide.lp) }}/{{ int(wide.sp) }}/{{ int(wide.sc) }}/{{ int(wide.lc) }}) collect more and lose the maximum less often, but the maximum is much larger. As the wings move out, the condor becomes a short strangle.
- **Further short strikes** ({{ int(far.lp) }}/{{ int(far.sp) }}/{{ int(far.sc) }}/{{ int(far.lc) }}) win more often and collect much less.

Every row has an expected P&L near zero. You are choosing a shape of outcomes, not an edge. Professionals commonly sell the short strikes near 15 to 20 delta, 30 to 45 days out, choose the wing width from the loss they accept, and take profits at a fraction of the credit rather than waiting for expiration.

## Before expiration

A condor collects its theta slowly and is most sensitive when the stock approaches a short strike. Here is the 90/95/105/110 condor along the way:

| ACME | After 10 days | After 20 days | After 10 days, implied vol +5 |
|---|---|---|---|
{{ [90, 95, 100, 105, 110].map((S) => `| $${S} | ${usd(payoff.pnlAt(ic.legs, S, 10, env))} | ${usd(payoff.pnlAt(ic.legs, S, 20, env))} | ${usd(payoff.pnlAt(ic.legs, S, 10, { ...env, ivShift: 0.05 }))} |`).join('\n') }}

With ACME unchanged, the condor has earned only {{ usd(payoff.pnlAt(ic.legs, 100, 10, env)) }} after a third of its life. Most of the time value arrives in the last weeks, which is also when gamma is largest and a move to a short strike does the most damage. The early-assignment and pin risks of each side are those of the vertical spreads in [Directional spreads](#core-10).

```tool position-builder
{ title: 'December 90/95/105/110 iron condor', legs: ic.legs, range: [82, 118] }
```

:::key
An iron condor is a bull put spread plus a bear call spread: a short strangle with wings that cap the loss. Max profit is the credit, max loss is one spread's width minus the credit. It wins most of the time, but at fair prices its expected value is about zero, because its average loss is larger than its average win. Its edge, when there is one, comes only from realized volatility coming in below implied.
:::

```quiz
- q: >-
    You sell the December 90/95/105/110 iron condor for {{ usd(ic.fill) }}. ACME finishes at $107. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(ic.legs, 107)) }}
    - >-
      {{ usd(ic.s.maxProfit) }}
    - >-
      {{ usd(ic.s.maxLoss) }}
  answer: 0
  explain: >-
    The short 105 call is $2 in the money and everything else is worthless, so you pay $200 against the {{ usd(ic.fill * 100) }} credit: {{ usd(payoff.pnlAtExpiry(ic.legs, 107)) }}. You keep the full credit only between $95 and $105; the full loss needs ACME above $110.
- q: >-
    The condor wins about {{ pct(ic.st.pop, 0) }} of the time. Why is its expected P&L still about zero?
  choices:
    - >-
      Because its average loss ({{ usd(ic.st.avgLoss) }}) is larger than its average win ({{ usd(ic.st.avgWin) }})
    - >-
      Because commissions cancel the profits
    - >-
      Because the probability is wrong
  answer: 0
  explain: >-
    At fair prices, a frequent small win is balanced by a less frequent larger loss: {{ pct(ic.st.pop, 0) }} × {{ usd(ic.st.avgWin) }} is offset by {{ pct(1 - ic.st.pop, 0) }} × {{ usd(ic.st.avgLoss) }}. Commissions make it slightly worse, but even without them the expected value is close to zero.
- q: >-
    What is the main difference between the 90/95/105/110 iron condor and the short 95/105 strangle?
  choices:
    - >-
      The condor's loss is capped at {{ usd(-ic.s.maxLoss) }}; in exchange it collects less premium
    - >-
      The condor collects more premium because it has four legs
    - >-
      The condor profits from large moves
  answer: 0
  explain: >-
    The long 90 put and 110 call cap each side's loss, so the worst case is {{ usd(-ic.s.maxLoss) }} instead of an unlimited loss. Buying those wings costs part of the premium: the condor collects {{ usd(ic.fill * 100) }} against {{ usd(-payoff.netPremium(strangle)) }} for the strangle. Both are short volatility and lose on large moves.
- q: >-
    When does an iron condor seller make money over many trades?
  choices:
    - >-
      When the stock's realized moves are smaller than its options' implied volatility predicted
    - >-
      Whenever the probability of profit is above 50%
    - >-
      When implied volatility rises after the trade
  answer: 0
  explain: >-
    The condor is short volatility, priced so that its expected P&L is about zero at the market's odds. It earns more than that only if the stock moves less than implied. A high probability of profit is bought with a larger average loss, and a rise in implied volatility hurts it (its vega is {{ signedUsd(ic.g.vega) }} per point).
```
