---
title: Intrinsic and extrinsic value
summary: Split any option premium into the part you could collect by exercising today and the part you pay for time and uncertainty, and use that split to decide between exercising and selling.
---

```calc
const S = ACME.spot;
const m = (x) => usd(x, Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? 2 : 3);
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const intr = (K, type) => bs.intrinsic({ S, K, type });
const ext = (K, type) => row(K)[type].mid - intr(K, type);
const tbl = [85, 90, 95, 100, 105, 110].map((K) =>
  `| $${K} | ${m(row(K).call.mid)} | ${usd(intr(K, 'call'))} | ${m(ext(K, 'call'))} | ${m(row(K).put.mid)} | ${usd(intr(K, 'put'))} | ${m(ext(K, 'put'))} |`
).join('\n');
const c95 = row(95).call.mid;
const p105 = row(105).put.mid;
const c90 = row(90).call;
const sig100 = smileIV(ACME, 100, 30 / 365);
const decay = [30, 20, 10, 5, 2, 1].map((d) => ({ d, v: Number(bs.price({ S, K: 100, T: d / 365, r: RATE, q: ACME.q, sigma: sig100, type: 'call' }).toFixed(2)) }));
const decayRows = decay.map((x) => `| ${x.d} | ${usd(x.v)} |`).join('\n') + '\n| 0 (expiration) | $0.00 |';
const lost10 = decay[0].v - decay[2].v;
const last10 = decay[2].v;
```

An option's premium answers one question: what is this right worth today? It helps to break that answer into two pieces. One piece is value you could collect immediately, by exercising. The other is everything else: the price of the time left and the chance that the stock moves in your favor before it runs out. Traders split every premium this way without thinking, and so should you.

## The two pieces

[[Intrinsic value]] is what the option would be worth if it expired right now. It is the amount by which the option is in the money, and zero otherwise:

\[ \text{call intrinsic} = \max(S - K,\ 0) \qquad \text{put intrinsic} = \max(K - S,\ 0) \]

where \(S\) is the stock price and \(K\) is the strike. Intrinsic value can never be negative, because you are never forced to exercise.

[[Extrinsic value]] is the rest of the premium:

\[ \text{extrinsic} = \text{premium} - \text{intrinsic} \]

It is also called *time value*. It is what the market charges for the possibility that the option becomes worth more before it expires. An out-of-the-money option has no intrinsic value, so its whole premium is extrinsic.

:::example Decomposing two December quotes
ACME is at $100. The December 95 call has a midpoint of {{ m(c95) }}.

- Intrinsic: \(\max(100 - 95, 0)\) = {{ usd(intr(95, 'call')) }}. You could exercise, buy at $95 and sell at $100.
- Extrinsic: {{ m(c95) }} − {{ usd(intr(95, 'call')) }} = **{{ m(ext(95, 'call')) }}**.

The December 105 put has a midpoint of {{ m(p105) }}.

- Intrinsic: \(\max(105 - 100, 0)\) = {{ usd(intr(105, 'put')) }}.
- Extrinsic: {{ m(p105) }} − {{ usd(intr(105, 'put')) }} = **{{ m(ext(105, 'put')) }}**.

Per contract, the 95 call buyer pays {{ usd(intr(95, 'call') * 100) }} for value that already exists and {{ usd(ext(95, 'call') * 100) }} for time.
:::

## The pattern across strikes

Here is the same split for the December calls and puts around the money, using midpoints (a midpoint can fall on a half cent, so some are shown to three decimals):

| Strike | Call mid | Intrinsic | Extrinsic | Put mid | Intrinsic | Extrinsic |
|---|---|---|---|---|---|---|
{{ tbl }}

Three things stand out.

1. **Extrinsic value peaks at the money.** The 100 call and 100 put are pure extrinsic value, {{ m(row(100).call.mid) }} and {{ m(row(100).put.mid) }}. Moving away from the money in either direction, extrinsic value shrinks.
2. **Deep in-the-money options are mostly intrinsic.** Of the 85 call's {{ m(row(85).call.mid) }}, only {{ m(ext(85, 'call')) }} is extrinsic. You are paying almost entirely for value that already exists, which is why such an option moves nearly dollar for dollar with the stock.
3. **Far out-of-the-money options are all extrinsic, but there is not much of it.** The 85 put costs {{ m(row(85).put.mid) }}: every cent is a bet on a large move.

Why does the ATM strike carry the most time value? Because it is where the outcome is least settled. A deep ITM call will almost certainly finish in the money, so there is little uncertainty left to pay for. A far OTM call will almost certainly finish worthless. At the money, a small move either way decides everything, and that uncertainty is exactly what extrinsic value prices.

## Extrinsic value runs out

At expiration there is no time left, so extrinsic value is zero and every option is worth exactly its intrinsic value. Between now and then, extrinsic value bleeds away. This is [[time decay]], and it does not happen at an even pace.

:::example The December 100 call if ACME never moves
Suppose ACME sits at exactly $100 until expiration, with nothing else changing. The 100 call has no intrinsic value, so its whole price is extrinsic. Its value with each number of days left:

| Days left | Call value |
|---|---|
{{ decayRows }}

Over the first 20 days the call loses {{ usd(lost10) }} of its {{ usd(decay[0].v) }}. It loses the remaining {{ usd(last10) }} in the last 10. The holder of an option is paying this decay every day; the writer is collecting it. [The Greeks in practice](#core-05) measures it precisely as theta.
:::

The chart below plots the price of the 100 call against the stock price for three expirations. The longest-dated curve sits highest: more time means more extrinsic value. As expiration approaches, the curve sinks toward the "hockey stick" of intrinsic value, flat at zero below $100 and rising dollar for dollar above it.

```tool greeks-explorer
{ greek: 'price', type: 'call', K: 100, iv: sig100, dtes: [58, 30, 2], x: 'spot' }
```

## Why you rarely exercise early

The split explains one of the most useful rules of thumb in options trading. Exercising captures intrinsic value and throws away whatever extrinsic value is left. Selling the option in the market captures both.

:::example Exercise or sell the December 90 call?
You own the December 90 call and want out. ACME is $100.

- **Exercise.** You pay $9,000 for 100 shares worth $10,000, then sell them, collecting the intrinsic value: {{ usd(intr(90, 'call') * 100) }}.
- **Sell to close.** The call's bid is {{ usd(c90.bid) }}, so selling it brings in {{ usd(c90.bid * 100) }}.

Selling is better by {{ usd((c90.bid - intr(90, 'call')) * 100) }}, even though you sell at the bid rather than the midpoint. Exercising would also need $9,000 of cash or margin for the moment you own the shares, and two transactions instead of one.
:::

There are narrow exceptions, such as exercising a call just before a large dividend when its extrinsic value is smaller than the dividend. [Exercise, assignment and expiration](#core-07) covers them. As a default, an option holder who wants out sells the option.

:::practice How traders read a premium
A professional looking at a quote separates the two pieces instantly. Intrinsic value is not really a bet: it is stock exposure paid for in advance. Extrinsic value is the bet. When comparing two options, traders compare their extrinsic value, because that is the part that disappears if the stock does nothing.
:::

:::key
Premium = intrinsic value + extrinsic value. Intrinsic value is what exercising today would be worth; extrinsic value is what you pay for the time left and the uncertainty, it is largest at the money, and it falls to zero at expiration. Selling an option captures both pieces; exercising it throws the extrinsic part away.
:::

```quiz
- q: >-
    ACME is at $100. The December 110 put is quoted at a midpoint of {{ m(row(110).put.mid) }}. How much of that is extrinsic value?
  choices:
    - >-
      {{ m(row(110).put.mid) }}
    - >-
      {{ m(ext(110, 'put')) }}
    - >-
      $10.00
    - >-
      $0.00
  answer: 1
  explain: >-
    The put is in the money by $110 − $100 = $10, so its intrinsic value is $10. The rest, {{ m(row(110).put.mid) }} − $10 = {{ m(ext(110, 'put')) }}, is extrinsic. The whole premium would be extrinsic only for an out-of-the-money option, and $10 is the intrinsic part, not the extrinsic part.
- q: >-
    Which December ACME call carries the most extrinsic value in dollars?
  choices:
    - >-
      The 85 call, because it is the most expensive
    - >-
      The 100 call
    - >-
      The 115 call, because it is all extrinsic
  answer: 1
  explain: >-
    Extrinsic value peaks at the money, where the outcome is least certain: the 100 call carries {{ m(ext(100, 'call')) }} of it. The 85 call costs the most, but almost all of that is intrinsic; only {{ m(ext(85, 'call')) }} is time value. The 115 call is entirely extrinsic, but its whole price is just {{ m(row(115).call.mid) }}.
- q: >-
    At the close on expiration day ACME is at $104. What is the December 100 call worth?
  choices:
    - >-
      $4.00
    - >-
      More than $4.00, because there is still a little time value
    - >-
      Nothing, because it expired
  answer: 0
  explain: >-
    At expiration extrinsic value is zero and an option is worth exactly its intrinsic value: $104 − $100 = $4 a share, or $400 a contract. There is no time left to price. It has not become worthless either; an in-the-money option at expiration still delivers its intrinsic value, usually through automatic exercise.
- q: >-
    You own a December 95 call with ACME at $100 and the call bid at {{ usd(row(95).call.bid) }}. You want to take your profit. Why is selling the call usually better than exercising?
  choices:
    - >-
      Exercising is not allowed before expiration
    - >-
      Selling collects the {{ usd(row(95).call.bid - 5) }} a share of extrinsic value still in the bid; exercising collects only the $5 of intrinsic value
    - >-
      Exercising costs you the premium a second time
  answer: 1
  explain: >-
    ACME options are American, so you may exercise any time; the question is whether it is worth it. Exercising and selling the shares nets $5 a share of intrinsic value. Selling the call at {{ usd(row(95).call.bid) }} nets that plus the remaining time value, {{ usd((row(95).call.bid - 5) * 100) }} more per contract. Exercising does not charge the premium again; that money is already spent either way.
```
