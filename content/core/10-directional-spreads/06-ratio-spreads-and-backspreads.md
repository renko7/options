---
title: Ratio spreads and backspreads
summary: Trade unequal numbers of options at two strikes, and see the naked tail a ratio spread carries and the long-volatility profile a backspread buys.
---

```calc
const env = { r: RATE, q: ACME.q };
const exp = expiryDate(30);
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
const c100 = R(100).call, c105 = R(105).call;
// 1x2 call ratio spread: buy 1 100 call, sell 2 105 calls
const ratioMid = c100.mid - 2 * c105.mid;
const ratioFill = fillD(ratioMid);
const ratio = [
  { kind: 'call', qty: 1, strike: 100, premium: ratioFill + 2 * c105.mid, dte: 30, iv: c100.iv },
  { kind: 'call', qty: -2, strike: 105, premium: c105.mid, dte: 30, iv: c105.iv },
];
const rs = payoff.summary(ratio);
const rg = payoff.positionGreeks(ratio, 100, 0, env);
// call backspread: sell 1 100 call, buy 2 105 calls
const backMid = ratioMid; // the same two legs reversed: a credit
const backFill = fillC(backMid);
const back = [
  { kind: 'call', qty: -1, strike: 100, premium: backFill + 2 * c105.mid, dte: 30, iv: c100.iv },
  { kind: 'call', qty: 2, strike: 105, premium: c105.mid, dte: 30, iv: c105.iv },
];
const bs2 = payoff.summary(back);
const bg = payoff.positionGreeks(back, 100, 0, env);
// put 1x2: buy 1 100 put, sell 2 95 puts
const p100 = R(100).put, p95 = R(95).put;
const pMid = p100.mid - 2 * p95.mid;
const pFill = fillD(pMid);
const pratio = [
  { kind: 'put', qty: 1, strike: 100, premium: pFill + 2 * p95.mid, dte: 30, iv: p100.iv },
  { kind: 'put', qty: -2, strike: 95, premium: p95.mid, dte: 30, iv: p95.iv },
];
const ps = payoff.summary(pratio);
const bc = [
  { kind: 'call', qty: 1, strike: 100, premium: fillD(c100.mid - c105.mid) + c105.mid },
  { kind: 'call', qty: -1, strike: 105, premium: c105.mid },
];
```

Every spread so far has had one long option for each short one. A [[ratio spread]] sells more options than it buys; a [[backspread]] buys more than it sells. Changing the ratio changes the character of the trade completely: one extra short option leaves a tail of unlimited or very large risk, and one extra long option turns a directional bet into a bet on a large move.

## The 1×2 call ratio spread

:::example Long one December 100 call, short two December 105 calls
ACME is at $100. Buy one December 100 call and sell two December 105 calls, as one order. The mid is {{ usd(ratioMid, 3) }}; you are filled at a debit of **{{ usd(ratioFill) }}**, {{ usd(ratioFill * 100) }}.

At expiration on {{ longDate(exp) }}:

- **Below $100**: everything expires worthless; you lose the {{ usd(ratioFill * 100) }} debit.
- **At $105**: the long call is worth $5 and the short calls nothing. This is the peak: {{ usd(rs.maxProfit) }}. Compare the ordinary 100/105 call spread, whose max profit is {{ usd(payoff.pnlAtExpiry(bc, 105)) }}: the second short call bought you more profit at the target.
- **Above $105**: you are long one call and short two, so you are net short one call. Every dollar above $105 costs $100. The upper break-even is {{ usd(rs.breakevens[1]) }}. At $115 you lose {{ usd(-payoff.pnlAtExpiry(ratio, 115)) }}; at $130, {{ usd(-payoff.pnlAtExpiry(ratio, 130)) }}. The loss has no limit.
:::

That last bullet is the **naked tail**. The second 105 call is not covered by anything: it is a naked short call, with the unlimited risk and the margin requirement that go with one. A 1×2 ratio spread is a bull call spread plus a naked call. It needs naked-call approval at most brokers, and it is the kind of position that turns a takeover rumor into a disaster.

Its Greeks show what you are really trading. At entry: delta {{ num(rg.delta, 1) }} shares, gamma {{ signed(rg.gamma, 2) }} shares per $1, theta {{ signedUsd(rg.theta) }} a day, vega {{ signedUsd(rg.vega) }} per vol point. Despite looking bullish, the position starts with almost no delta (slightly negative, in fact) and is short volatility: it wants ACME to drift up to $105 slowly and stop there.

It also pays its peak only at expiration. Ten days in, with ACME already at $105, the position shows {{ usd(payoff.pnlAt(ratio, 105, 10, env)) }}, not {{ usd(rs.maxProfit) }}; at $110 it shows {{ usd(payoff.pnlAt(ratio, 110, 10, env)) }}. A fast move to the target is not a win; it is a position now short more calls than it owns, with weeks left to go.

The same structure with puts, buying the 100 put and selling two 95 puts for {{ usd(pFill) }}, peaks at {{ usd(ps.maxProfit) }} at $95 and has its tail on the downside, from a lower break-even of {{ usd(ps.breakevens[0]) }}. That tail stops at zero, but zero is far away: the worst case is a loss of {{ usd(-ps.maxLoss) }}. The 95 puts you sell are priced at {{ pct(p95.iv, 1) }} implied volatility, against {{ pct(c105.iv, 1) }} for the 105 calls in the call version: the skew pays put ratio sellers a little extra, for exactly the crash risk their tail represents.

:::warning The extra short option is the whole risk
Ratio spreads are often entered for a small debit or even a credit, and the profit tent at the target looks attractive. The danger is not in the tent; it is beyond it. Size a ratio spread by its loss in a large move (say, a 20% gap), not by the debit.
:::

## The backspread

Reverse the ratio and you get a backspread: sell one option, buy two further out of the money.

:::example Short one December 100 call, long two December 105 calls
Sell one December 100 call and buy two December 105 calls. The mid is a {{ usd(backMid, 3) }} credit; you are filled at a credit of **{{ usd(backFill) }}**.

- **Below $100**: everything expires worthless; you keep the {{ usd(backFill * 100) }} credit.
- **At $105**: the worst outcome. The short 100 call costs $5 and the long calls are worth nothing: you lose {{ usd(-bs2.maxLoss) }}.
- **Above $105**: you are net long one call. The upper break-even is {{ usd(bs2.breakevens[1]) }}, and gains are unlimited: {{ usd(payoff.pnlAtExpiry(back, 115)) }} at $115, {{ usd(payoff.pnlAtExpiry(back, 130)) }} at $130.
:::

A backspread is a bet on a large move up, financed by the short call, with a small gain if ACME falls instead and a loss if it drifts to the long strike. Its Greeks are exactly the ratio spread's with the signs flipped: gamma {{ signed(bg.gamma, 2) }} shares per $1, theta {{ signedUsd(bg.theta) }} a day, vega {{ signedUsd(bg.vega) }} per vol point. It is long volatility: it profits if implied volatility rises (with no move at all, a 10-point rise in implied volatility today would show {{ usd(payoff.pnlAt(back, 100, 0, { ...env, ivShift: 0.10 })) }}), and it bleeds time value while nothing happens.

The typical failure is the slow drift: ACME grinds up to about $105 by expiration, the move you wanted but not enough of it, and the backspread takes its maximum loss.

## When traders use them

- **Ratio spread**: you have a specific target and expect the stock to get there slowly, and you are prepared to manage or close the trade if it overshoots. Common as a cheaper way to buy a call or put toward a target.
- **Backspread**: you expect a large move, possibly from a catalyst, and want to pay little or nothing to own it. Common before events where the direction is fairly clear but the size is not.
- **Early assignment**: in a call ratio spread you are short two calls against one long. If ACME rallies well past $105 before an ex-dividend date, both short calls can be assigned, leaving you short 200 shares against one long call. Watch the dividend calendar as in the [previous assignment Lesson](#core-10-assignment-and-pin-risk).

```tool position-builder
{ title: '1×2 call ratio spread: long December 100 call, short two December 105 calls', legs: ratio, range: [90, 125] }
```

:::key
A ratio spread sells more options than it buys: it pays most at the short strike and carries a naked tail beyond it, unlimited for calls. A backspread buys more than it sells: it loses most at the long strike and profits from a large move. Ratio spreads are short gamma and vega; backspreads are long both. Size them by their tails, not their entry price.
:::

```quiz
- q: >-
    You hold the December 1×2 call ratio spread (long one 100 call, short two 105 calls) entered for {{ usd(ratioFill) }}. ACME finishes at $120. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(ratio, 120)) }}
    - >-
      {{ usd(rs.maxProfit) }}
    - >-
      {{ usd(-ratioFill * 100) }}
  answer: 0
  explain: >-
    Above $105 you are net short one call. The long 100 call is worth $20, each short 105 call costs $15: 20 − 30 = −$10 a share, less the {{ usd(ratioFill) }} debit, {{ usd(payoff.pnlAtExpiry(ratio, 120)) }}. {{ usd(rs.maxProfit) }} is the result at exactly $105; losing only the debit happens below $100.
- q: >-
    Which position is long volatility?
  choices:
    - >-
      The call backspread (short one 100 call, long two 105 calls)
    - >-
      The 1×2 call ratio spread (long one 100 call, short two 105 calls)
    - >-
      Both, because each contains a long call
  answer: 0
  explain: >-
    The backspread owns more options than it sells, so its vega and gamma are positive ({{ signedUsd(bg.vega) }} per vol point). The ratio spread is the mirror image, with vega {{ signedUsd(rg.vega) }}. Containing a long call does not decide the sign; the net number of options does.
- q: >-
    You enter the call backspread for a {{ usd(backFill) }} credit. Where is your worst outcome at expiration?
  choices:
    - >-
      At $105, the strike of the two long calls
    - >-
      Far below $100
    - >-
      Far above $105
  answer: 0
  explain: >-
    At $105 the short 100 call costs $5 and the long calls are worth nothing, a loss of {{ usd(-bs2.maxLoss) }}. Below $100 you keep the credit; far above $105 the extra long call makes money without limit.
- q: >-
    Ten days after entering the 1×2 call ratio spread, ACME is already at $105, your target. What does the position show?
  choices:
    - >-
      About {{ usd(payoff.pnlAt(ratio, 105, 10, env)) }}, because the two short calls still carry time value
    - >-
      The full {{ usd(rs.maxProfit) }}
    - >-
      A loss equal to the debit
  answer: 0
  explain: >-
    The tent at $105 only exists at expiration. With 20 days left, the two short 105 calls are at the money and full of time value, roughly offsetting the long call's gain. Being right early is not rewarded by a ratio spread; being right slowly is.
```
