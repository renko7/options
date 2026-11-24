---
title: Choosing a strike
summary: Compare in-the-money, at-the-money and out-of-the-money options on cost, break-even, percentage return and likelihood, and choose a strike that matches how far and how fast you expect the stock to move.
---

```calc
const T = 30 / 365;
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const ks = [90, 95, 100, 105, 110];
const legs = (k) => [{ kind: 'call', qty: 1, strike: k, premium: row(k).call.ask }];
const cost = (k) => row(k).call.ask * 100;
const be = (k) => payoff.breakevens(legs(k))[0];
const ret = (k, s) => payoff.pnlAtExpiry(legs(k), s) / cost(k);
const pAbove = (x) => bs.probITM({ S: 100, K: x, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, x, T), type: 'call' });
const tbl1 = ks.map((k) => `| ${k} | ${usd(row(k).call.ask)} | ${usd(cost(k), 0)} | ${usd(be(k))} | ${pct((be(k) - 100) / 100)} | ${pct(pAbove(be(k)), 0)} | ${num(row(k).call.delta)} |`).join('\n');
const outs = [95, 100, 105, 110, 120];
const tbl2 = ks.map((k) => `| ${k} | ` + outs.map((s) => pct(ret(k, s), 0)).join(' | ') + ' |').join('\n');
const pk = [90, 95, 100];
const pLegs = (k) => [{ kind: 'put', qty: 1, strike: k, premium: row(k).put.ask }];
const pret = (k, s) => payoff.pnlAtExpiry(pLegs(k), s) / (row(k).put.ask * 100);
```

Once you know the direction and the expiration, the strike is the last and most consequential choice. The same view on ACME can be expressed with a call that costs ten dollars or one that costs twenty cents, and those two trades behave nothing alike. There is no best strike in general. There is only the strike that best fits how far you expect the stock to move, how soon, and how much you can afford to be wrong.

## Five calls, one view

You expect ACME, now $100, to rise over the next month. Here are the December calls you might buy, at the ask:

| Strike | Price | Cost | Break-even | Rise needed | Implied chance above break-even | Delta |
|---|---|---|---|---|---|---|
{{ tbl1 }}

The "implied chance" column is the probability, implied by option prices, that ACME finishes above each break-even at expiration. It is not a forecast, but it is the market's consensus, and it is the right yardstick for comparing strikes.

The pattern is clear. Moving from in the money to out of the money:

- **cost** falls steeply, from {{ usd(cost(90), 0) }} to {{ usd(cost(110), 0) }};
- **break-even** rises, from {{ usd(be(90)) }} to {{ usd(be(110)) }};
- **the chance of profit** falls, from about {{ pct(pAbove(be(90)), 0) }} to about {{ pct(pAbove(be(110)), 0) }};
- **delta** falls: the in-the-money call moves almost like the stock, the out-of-the-money call barely moves until ACME gets close.

## Returns at expiration

The other side of the trade-off appears in the percentage returns. Each column is ACME's price at expiration; each cell is the return on the premium paid:

| Strike | ACME $95 | $100 | $105 | $110 | $120 |
|---|---|---|---|---|---|
{{ tbl2 }}

:::example What the table says
- **If ACME barely moves**, only the in-the-money calls hold up. At $100 the 90 call loses {{ pct(-ret(90, 100), 0) }} of its cost; the 100, 105 and 110 calls lose everything.
- **If ACME rises moderately**, to $105, the 90 and 95 calls make {{ pct(ret(90, 105), 0) }} and {{ pct(ret(95, 105), 0) }}, the 100 call {{ pct(ret(100, 105), 0) }}, and the 105 and 110 calls still lose everything.
- **If ACME rises to $110**, the 105 call has the best return, {{ pct(ret(105, 110), 0) }}, and the 110 call, struck exactly at that price, **loses everything**.
- **If ACME rises to $120**, the 110 call returns {{ pct(ret(110, 120), 0) }}, far more than any other strike, and the 90 call only {{ pct(ret(90, 120), 0) }}.
:::

Out-of-the-money calls pay the most when they pay at all, and pay nothing in most outcomes. In-the-money calls pay something in many more outcomes but never spectacularly. Every strike is the right choice for some outcome and the wrong one for others.

## Choosing: start from the move you expect

The practical method is to name the move you expect, then look across the strikes at that price.

1. **Set a target and a timeframe.** "ACME to about $110 by December expiration" is a view you can test; "ACME goes up" is not.
2. **Do not buy the strike at your target.** A call struck at your target is worth nothing if the target is hit exactly. The 110 call needs ACME *above* $110 by more than its premium. The best returns at a target come from strikes somewhat below it.
3. **Check the miss.** Look at the column for a smaller move than you expect. If ACME gets only halfway, to $105, the 105 call loses its whole premium while the 95 call still makes {{ pct(ret(95, 105), 0) }}. How much do you want to be paid for being right versus protected for being partly right?
4. **Check liquidity and size.** Cheap strikes have wider spreads in percentage terms. And because a cheap option makes it easy to buy many contracts, size by shares of exposure, not by dollars.

:::practice How traders think about strikes
Many traders choose by delta rather than by price. A call with a delta around 0.70 to 0.80 is a stock substitute: most of the move, much less capital, and a modest amount of time value at risk. A delta near 0.50 is a balanced directional bet. Deltas of 0.20 to 0.30 and below are bets on a large move, sized small because most of them expire worthless. [The Greeks in practice](#core-05) explains why delta works as a shorthand for all of this.
:::

## The same logic for puts

Puts mirror calls. For a bearish view, an in-the-money put (strike above the stock) behaves most like a short stock position and is the most likely to pay; an out-of-the-money put (strike below) is cheap and needs a large fall.

:::example Three December puts on a fall to $90
If ACME falls to $90 by expiration: the 100 put, bought at {{ usd(row(100).put.ask) }}, returns {{ pct(pret(100, 90), 0) }}; the 95 put, at {{ usd(row(95).put.ask) }}, returns {{ pct(pret(95, 90), 0) }}; the 90 put, at {{ usd(row(90).put.ask) }}, **loses everything**, because $90 is exactly its strike. On a fall to $85, the 90 put returns {{ pct(pret(90, 85), 0) }} and the 100 put {{ pct(pret(100, 85), 0) }}.
:::

## Try it

The builder below shows the December 100 call. Change the strike to 90, then 110, and watch three things in the summary: the cost, the break-even, and the P&L at your own target price. Then change the quantity to keep roughly the same total cost and see how the risk changes.

```tool position-builder
{ title: 'Choose a strike: ACME December calls', legs: [{ kind: 'call', qty: 1, strike: 100, premium: row(100).call.ask, dte: 30, iv: row(100).call.iv }], range: [85, 125], showToday: false }
```

:::key
In-the-money options cost more, break even closer to today's price, pay off in more outcomes and behave like the stock. Out-of-the-money options cost less, need a bigger move, usually expire worthless and pay the most when they do pay. Choose by naming your target and timeframe, look for strikes below a bullish target (above a bearish one), and check what happens if you are only half right.
:::

```quiz
- q: >-
    You expect ACME to rise to about $110 by December expiration. Which December call gives the best return if exactly that happens?
  choices:
    - >-
      The 110 call, because it matches the target
    - >-
      The 105 call
    - >-
      The 90 call, because it is deepest in the money
  answer: 1
  explain: >-
    At $110 the 105 call returns {{ pct(ret(105, 110), 0) }}, the highest of the strikes listed. The 110 call is struck at the target, so it expires worthless if ACME finishes exactly there: the return is −100%. The 90 call makes money too, but only {{ pct(ret(90, 110), 0) }}, because you paid for $10 of intrinsic value that earns no leverage.
- q: >-
    Which December call has the highest implied chance of finishing above its break-even?
  choices:
    - >-
      The 90 call
    - >-
      The 100 call
    - >-
      The 110 call
  answer: 0
  explain: >-
    The 90 call breaks even at {{ usd(be(90)) }}, just {{ pct((be(90) - 100) / 100) }} above today's price, so its implied chance of finishing above that is roughly {{ pct(pAbove(be(90)), 0) }}. The 110 call needs ACME above {{ usd(be(110)) }}, with an implied chance of about {{ pct(pAbove(be(110)), 0) }}. Cheaper options are cheaper precisely because they pay off less often.
- q: >-
    You bought the December 105 call expecting a big rally, but ACME rises only to $104 by expiration. What happened?
  choices:
    - >-
      A small profit, because ACME rose
    - >-
      A loss of the whole premium, because ACME finished below the strike
    - >-
      A loss of about $1 a share
  answer: 1
  explain: >-
    At $104 the 105 call is out of the money and expires worthless, so you lose the full {{ usd(cost(105)) }}. Being right about direction is not enough with an out-of-the-money option; the move must also be big enough. A 95 call would have made {{ pct(ret(95, 104), 0) }} on the same move.
- q: >-
    You want a call that behaves most like owning 100 shares, at a fraction of the cost. Which strike fits best?
  choices:
    - >-
      The 90 call, delta {{ num(row(90).call.delta) }}
    - >-
      The 100 call, delta {{ num(row(100).call.delta) }}
    - >-
      The 110 call, delta {{ num(row(110).call.delta) }}
  answer: 0
  explain: >-
    A deep in-the-money call is mostly intrinsic value and moves almost dollar for dollar with the stock: its delta of {{ num(row(90).call.delta) }} means about {{ usd(row(90).call.delta * 100, 0) }} per contract for a $1 move, against {{ usd(100) }} for 100 shares. It costs {{ usd(cost(90), 0) }} instead of {{ usd(10000, 0) }}. The 110 call is cheap but responds to only a small part of each move until ACME approaches $110.
```
