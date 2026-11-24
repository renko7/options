---
title: Risk reversals and how skew prices them
summary: Combine a short put and a long call into a near-zero-cost directional position, and read the volatility skew from its price.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
const p95 = R(95).put, c105 = R(105).call;
const rrMid = c105.mid - p95.mid;          // + debit
const rrFill = fillD(rrMid);
const rr = [
  { kind: 'put', qty: -1, strike: 95, premium: p95.mid, dte: 30, iv: p95.iv },
  { kind: 'call', qty: 1, strike: 105, premium: p95.mid + rrFill, dte: 30, iv: c105.iv },
];
const s = payoff.summary(rr);
const g = payoff.positionGreeks(rr, 100, 0, env);
const stock = [{ kind: 'stock', qty: 100, price: 100 }];
// flat-volatility comparison
const flat = (K, type) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: 0.30, type });
const flatRR = flat(105, 'call') - flat(95, 'put');
const skewRR = c105.theo - p95.theo;
// bearish version: buy 95 put, sell 105 call
const bearMid = p95.mid - c105.mid; // + debit, − credit
// margin on the short put
const margin = (p95.mid + Math.max(0.20 * 100 - (100 - 95), 0.10 * 95)) * 100;
// 25-delta strikes and the risk-reversal quote
const find25 = (u, T2, type) => {
  let best = null;
  for (let K = u.spot * 0.7; K <= u.spot * 1.3; K += u.spot / 2000) {
    const sig = smileIV(u, K, T2);
    const d = bs.greeks({ S: u.spot, K, T: T2, r: RATE, q: u.q, sigma: sig, type }).delta;
    if (!best || Math.abs(Math.abs(d) - 0.25) < best.err) best = { K, sig, err: Math.abs(Math.abs(d) - 0.25) };
  }
  return best;
};
const a25c = find25(ACME, T, 'call'), a25p = find25(ACME, T, 'put');
```

A [[risk reversal]] sells an out-of-the-money option on one side and buys an out-of-the-money option on the other. The bullish version sells a put and buys a call; the bearish version buys a put and sells a call. Because the premium from one leg pays for the other, a risk reversal often costs close to nothing, and its price tells you exactly how the market charges for downside against upside.

## The bullish risk reversal

:::example Short the December 95 put, long the December 105 call
ACME is at $100. Sell the December 95 put (mid {{ usd(p95.mid, 3) }}) and buy the December 105 call (mid {{ usd(c105.mid, 3) }}) as one order. The mid is a {{ rrMid >= 0 ? usd(rrMid, 3) + ' debit' : usd(-rrMid, 3) + ' credit' }}; you are filled at a debit of **{{ usd(rrFill) }}**, {{ usd(rrFill * 100) }} in total.

At expiration:

- **Above $105**: the call pays and you gain dollar for dollar like a shareholder, from a break-even of {{ usd(s.breakevens[0]) }}. At $115 you make {{ usd(payoff.pnlAtExpiry(rr, 115)) }}.
- **Between $95 and $105**: both options expire worthless. You lose only the {{ usd(rrFill * 100) }} you paid.
- **Below $95**: you are assigned on the put and buy 100 ACME at $95. You lose dollar for dollar like a shareholder. At $85 you lose {{ usd(-payoff.pnlAtExpiry(rr, 85)) }}; the worst case, ACME at zero, is {{ usd(-s.maxLoss) }}.

Position Greeks at entry: delta {{ num(g.delta, 0) }} shares, theta {{ signedUsd(g.theta) }} a day, vega {{ signedUsd(g.vega) }} per vol point.
:::

Think of it as owning ACME with a dead zone between $95 and $105. Outside the zone, the risk reversal behaves like 100 shares; inside it, like nothing. Compared with buying 100 shares for $10,000, it needs almost no cash, gives up the first $5 of gains, and is spared the first $5 of losses. If you sold the put and bought the call at the *same* strike, there would be no dead zone at all: that is a [[synthetic long stock|synthetic position]], covered in [What drives an option's price](#core-04).

The danger is that "almost free" invites oversizing. One risk reversal carries the downside of 100 shares. Ten of them, entered for {{ usd(rrFill * 1000) }}, carry the downside of 1,000 shares, $95,000 of exposure below $95. The failure mode is the same as for any stock position, a sharp fall, but reached with far less cash up front.

:::rule Margin on the short put (as of 2026)
The short put in a risk reversal is a naked put unless you hold cash for the full strike. Under the standard exchange and FINRA formula, the minimum margin for a short equity put is the premium plus the greater of 20% of the stock price less the amount the put is out of the money, or 10% of the strike. For the 95 put that is about {{ usd(margin) }}. Brokers may require more, and the requirement rises as the stock falls. Naked puts need a margin account and a high options approval level.
:::

## How skew prices a risk reversal

If every ACME option traded at 30% implied volatility, the 105 call would be worth {{ usd(flat(105, 'call')) }} and the 95 put {{ usd(flat(95, 'put')) }}: the bullish risk reversal would cost {{ usd(flatRR) }}. (The call is worth a little more because ACME's forward price is slightly above $100.)

The real chain prices the 95 put at {{ pct(p95.iv, 1) }} implied volatility and the 105 call at {{ pct(c105.iv, 1) }}. At those vols, the theoretical values make the same trade cost {{ usd(skewRR) }}. The [[volatility skew]] makes the put you sell richer and the call you buy cheaper, so the bullish risk reversal is cheaper than a flat-volatility model says, and the bearish one is dearer.

That is why the bearish risk reversal, buying the 95 put and selling the 105 call, comes in at about {{ bearMid >= 0 ? usd(bearMid, 2) + ' debit' : usd(-bearMid, 2) + ' credit' }} at the mid instead of the {{ usd(flatRR) }} credit it would bring at a flat 30%. Hedgers pay for the skew; bulls who sell puts collect it.

Traders quote skew directly as a risk-reversal volatility: the implied volatility of the 25-[[delta]] call minus that of the 25-delta put, in the same expiration. For ACME's December expiration the 25-delta call (strike about {{ usd(a25c.K, 0) }}) trades at {{ pct(a25c.sig, 1) }} and the 25-delta put (about {{ usd(a25p.K, 0) }}) at {{ pct(a25p.sig, 1) }}: a risk reversal of {{ signed((a25c.sig - a25p.sig) * 100, 1) }} vol points. A more negative number means downside protection is relatively more expensive. Traders watch it move: in a sell-off, demand for puts usually pushes it further below zero, and a bullish risk reversal that cost nothing yesterday can bring in a credit today. See [Implied volatility](#core-06) for where skew comes from.

## Three uses

- **A directional view with stock-like exposure.** A trader who is bullish and comfortable owning ACME at $95 can use the bullish risk reversal instead of buying shares, accepting the dead zone in exchange for almost no cash outlay.
- **A hedge.** Long stock plus a bearish risk reversal is exactly the [collar](#core-09-collar) from the previous Module. Corporate and fund hedgers think of collars this way: they own the stock and trade the risk reversal against it.
- **A view on skew itself.** A trader who thinks downside puts are overpriced relative to upside calls sells the bullish risk reversal's put leg rich and buys the call cheap, and then hedges the delta with stock. That is a volatility trade, covered in the Advanced Track.

```tool position-builder
{ title: 'Bullish risk reversal: short December 95 put, long December 105 call', legs: rr, range: [80, 120] }
```

:::key
A risk reversal sells an out-of-the-money option on one side to pay for one on the other. The bullish version behaves like long stock with a dead zone between the strikes and carries the full downside of 100 shares below the put strike, for almost no premium. Its price measures the volatility skew: equity skew makes bullish risk reversals cheap and bearish ones (collars) expensive.
:::

```quiz
- q: >-
    You enter the bullish December 95/105 risk reversal for {{ usd(rrFill) }}. ACME finishes at $88. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(rr, 88)) }}
    - >-
      {{ usd(-rrFill * 100) }}
    - >-
      {{ usd(payoff.pnlAtExpiry(stock, 88)) }}
  answer: 0
  explain: >-
    You are assigned on the 95 put and lose $7 a share on it, plus the {{ usd(rrFill * 100) }} you paid: {{ usd(payoff.pnlAtExpiry(rr, 88)) }}. You lose only the debit between $95 and $105, not below $95. The {{ usd(payoff.pnlAtExpiry(stock, 88)) }} is what 100 shares bought at $100 would lose; the risk reversal is spared the first $5.
- q: >-
    At a flat 30% volatility the bullish 95/105 risk reversal would cost {{ usd(flatRR) }}; in the real chain it is close to zero. Why?
  choices:
    - >-
      The skew prices the 95 put at a higher implied volatility than the 105 call, so the put you sell brings in more
    - >-
      The interest rate makes calls cheaper
    - >-
      The chain's bid-ask spreads are narrower for puts
  answer: 0
  explain: >-
    The 95 put trades at {{ pct(p95.iv, 1) }} and the 105 call at {{ pct(c105.iv, 1) }}. The richer put pays for more of the call. The interest rate works the other way here: with the rate above the dividend yield, the forward is above $100, which makes calls slightly more valuable, not less.
- q: >-
    A trader enters ten bullish risk reversals for a total debit of {{ usd(rrFill * 1000) }}. What is the exposure if ACME collapses?
  choices:
    - >-
      At most {{ usd(rrFill * 1000) }}
    - >-
      Like owning 1,000 shares below $95
    - >-
      Like owning 100 shares below $95
  answer: 1
  explain: >-
    Each risk reversal is short one put, which obliges you to buy 100 shares at $95. Ten of them commit you to 1,000 shares, $95,000, however little they cost to enter. The small debit is only the loss in the dead zone between the strikes.
- q: >-
    ACME's December 25-delta risk reversal is {{ signed((a25c.sig - a25p.sig) * 100, 1) }} vol points. After a sharp sell-off it moves to −5.0. What has happened?
  choices:
    - >-
      Downside puts have become more expensive relative to upside calls
    - >-
      The market now expects ACME to rise
    - >-
      All ACME options have become cheaper
  answer: 0
  explain: >-
    The quote is the 25-delta call's implied volatility minus the 25-delta put's. A more negative number means puts are priced richer relative to calls, typically because hedgers are buying them. It says nothing about which way the market expects ACME to go, and nothing about the overall level of implied volatility, which usually rises in a sell-off.
```
