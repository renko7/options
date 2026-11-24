---
title: The six inputs
summary: Name the six things that set an option's price and say which way each one pushes calls and puts.
---

```calc
const T30 = 30 / 365;
const base = { S: 100, K: 100, T: T30, r: RATE, q: ACME.q, sigma: 0.30 };
const px = (o) => ({ c: bs.price({ ...base, ...o, type: 'call' }), p: bs.price({ ...base, ...o, type: 'put' }) });
const b0 = px({});
const bS = px({ S: 105 });
const bK = px({ K: 105 });
const bT = px({ T: 58 / 365 });
const bV = px({ sigma: 0.35 });
const bR = px({ r: 0.05 });
const bQ = px({ q: 0.03 });
const leap = px({ T: 394 / 365 });
const leapR = px({ T: 394 / 365, r: 0.05 });
const deepPut30 = bs.price({ ...base, K: 160, type: 'put' });
const deepPut394 = bs.price({ ...base, K: 160, T: 394 / 365, type: 'put' });
const intr105 = bs.intrinsic({ S: 105, K: 100, type: 'call' });
```

A share of ACME has one price: whatever buyers and sellers agree on right now. An option on ACME also trades at whatever buyers and sellers agree on, but that agreement is anchored. Professionals value an option from six inputs, and if the market price drifts far from that value, someone trades against it. Learn the six inputs and which way each one pushes, and you can explain almost every change in an option's price you will ever see.

## The six inputs

| Symbol | Input | ACME today |
|---|---|---|
| \(S\) | Price of the [[underlying]] (spot) | $100.00 |
| \(K\) | [[Strike price]] | set by the contract you pick |
| \(T\) | Time to expiration, in years | 30 days = 30/365 for the December series |
| \(\sigma\) | [[Volatility]] of the underlying, per year | 30% |
| \(r\) | [[Risk-free rate]] | 4.00% |
| \(q\) | Dividend yield | 2.0% (the $0.50 quarterly dividend) |

Four of these are known exactly the moment you look at a quote. The contract fixes \(K\) and the expiration date, the screen shows \(S\), and the rate and dividend are known closely enough. **Volatility is the odd one out.** It describes how much the stock *will* move between now and expiration, and nobody can observe that in advance. That single unknown is why options markets exist as their own discipline; it gets its own Lesson, [Volatility, rates and dividends](#core-04-volatility-and-carry), and a whole Module, [Implied volatility](#core-06).

The pricing model that turns these six numbers into a price is the [[Black-Scholes model]], which you will meet in [The Black-Scholes formula](#core-04-black-scholes). You do not need the formula to understand the directions. Each one follows from what a call and a put *are*.

## Which way each input pushes

Raise one input and hold the other five fixed:

| Input rises | Call price | Put price | Why |
|---|---|---|---|
| Spot \(S\) | up | down | A call is a right to buy at \(K\); the higher the stock, the more that right is worth. A put is the mirror image. |
| Strike \(K\) | down | up | A higher purchase price makes the right to buy worth less and the right to sell worth more. |
| Time \(T\) | up | up (almost always) | More time gives the stock more room to move in your favour, and your loss is still capped at the premium. |
| Volatility \(\sigma\) | up | up | Bigger swings help an option holder on one side and cost nothing extra on the other, because the option can never be worth less than zero. |
| Rate \(r\) | up | down | Buying a call instead of the stock lets you keep the strike money in the bank until expiration; higher rates make that worth more. A put holder is the one waiting to *receive* the strike, which higher rates make less valuable today. |
| Dividend yield \(q\) | down | up | The stock price drops by the dividend on the [[ex-dividend date]]. A call holder does not receive the dividend, so the drop hurts; a put holder benefits from it. |

Two rows deserve a second look.

**Volatility raises both.** This is the input that surprises stock traders. When you own shares, a stock that swings wildly is riskier, full stop. An option holder sees it differently. If ACME swings hard up, the call gains a lot. If it swings hard down, the call can only go to zero, which it was going to do in a quiet market too. The holder keeps the good tail and is protected from the bad one, so more movement in *either* direction is worth paying for. The same argument applies to a put.

**Time raises both, almost always.** The exception is a deep [[in the money]] put on a stock that pays little or no dividend, when exercise is not allowed early. Its holder is waiting to receive the strike, and waiting longer for a fixed sum is worth less when rates are positive. For a 160-strike put with ACME at $100, a 30-day [[European-style option]] is worth {{ usd(deepPut30) }} but a 394-day one is worth only {{ usd(deepPut394) }}. ACME options are American-style, which lets the holder exercise early and avoid that loss; [Exercise, assignment and expiration](#core-07) explains when that matters.

## The inputs at work on ACME

:::example Moving one input at a time
Start from the ACME December 100 call and 100 put: \(S\) = $100, \(K\) = 100, 30 days, 30% volatility, 4% rate, 2% dividend yield. They are worth {{ usd(b0.c) }} and {{ usd(b0.p) }} per share.

Now change one input at a time, leaving the others at those values:

| Change | Call | Change in call | Put | Change in put |
|---|---|---|---|---|
| Starting point | {{ usd(b0.c) }} | | {{ usd(b0.p) }} | |
| Spot $100 → $105 | {{ usd(bS.c) }} | {{ signedUsd(bS.c - b0.c) }} | {{ usd(bS.p) }} | {{ signedUsd(bS.p - b0.p) }} |
| Strike 100 → 105 | {{ usd(bK.c) }} | {{ signedUsd(bK.c - b0.c) }} | {{ usd(bK.p) }} | {{ signedUsd(bK.p - b0.p) }} |
| Time 30 → 58 days | {{ usd(bT.c) }} | {{ signedUsd(bT.c - b0.c) }} | {{ usd(bT.p) }} | {{ signedUsd(bT.p - b0.p) }} |
| Volatility 30% → 35% | {{ usd(bV.c) }} | {{ signedUsd(bV.c - b0.c) }} | {{ usd(bV.p) }} | {{ signedUsd(bV.p - b0.p) }} |
| Rate 4% → 5% | {{ usd(bR.c) }} | {{ signedUsd(bR.c - b0.c) }} | {{ usd(bR.p) }} | {{ signedUsd(bR.p - b0.p) }} |
| Dividend yield 2% → 3% | {{ usd(bQ.c) }} | {{ signedUsd(bQ.c - b0.c) }} | {{ usd(bQ.p) }} | {{ signedUsd(bQ.p - b0.p) }} |

Read the table for sizes, not just signs:

- A $5 rise in the stock adds {{ usd(bS.c - b0.c) }} to the call. The call is now {{ usd(intr105) }} in the money, so {{ usd(intr105) }} of its {{ usd(bS.c) }} is [[intrinsic value]].
- Five points of volatility moves both options by about the same amount, {{ usd(bV.c - b0.c) }} on the call and {{ usd(bV.p - b0.p) }} on the put. For [[at the money]] options, volatility is as powerful as a several-dollar move in the stock.
- Almost doubling the time to expiration does *not* double the price: the call goes from {{ usd(b0.c) }} to {{ usd(bT.c) }}. Time value grows more slowly than time, a fact the next Lesson, [Time value and decay](#core-04-time-value), builds on.
- A full percentage point on the rate or the dividend yield moves a 30-day option by only a few cents.
:::

The last point changes with time. Rates and dividends act on the option through the whole life of the contract, so their effect grows with \(T\). For the 394-day [[LEAPS]] 100 call, the same move from 4% to 5% lifts the price from {{ usd(leap.c) }} to {{ usd(leapR.c) }}, a change of {{ usd(leapR.c - leap.c) }}. On a one-month option you can ignore rates; on a two-year option you cannot.

## Which inputs matter day to day

On any normal trading day, almost all of the change in an option's price comes from three inputs: the stock moved, a day passed, and the market's estimate of volatility changed. The strike never changes, and rates and dividend forecasts move rarely and slowly. That is why the sensitivities to those three inputs get the most attention. They have names, [[delta]], [[theta]] and [[vega]], and [The Greeks in practice](#core-05) is devoted to them.

:::warning Being right on direction is not enough
A common first trade is buying a call because "the stock will go up." The stock can rise and the call can still lose money, because two other inputs moved against it: a week passed, and volatility fell. Before you buy or sell an option, ask what you expect from all three: the stock, time and volatility.
:::

Use the pricer to check every row of the table yourself. Move one slider at a time and watch which way the call and put go.

```tool pricer
{ S: 100, K: 100, dte: 30, iv: 0.30, r: RATE, q: ACME.q, type: 'call' }
```

:::key
An option's price is set by six inputs: spot, strike, time, volatility, the risk-free rate and the dividend yield. Calls rise with spot, time, volatility and rates and fall with strike and dividends; puts rise with strike, time, volatility and dividends and fall with spot and rates. Volatility is the only input nobody can observe.
:::

```quiz
- q: >-
    ACME stays at $100, nothing else changes, but the market's estimate of ACME's volatility rises from 30% to 35%. What happens to the December 100 call and the December 100 put?
  choices:
    - >-
      The call rises and the put falls
    - >-
      Both rise, by roughly {{ usd(bV.c - b0.c) }} each
    - >-
      Both fall, because the stock is now riskier
    - >-
      Neither changes, because the stock did not move
  answer: 1
  explain: >-
    Higher volatility raises both calls and puts. The holder keeps the benefit of a big move in their direction and loses no more than the premium on a big move against them, so more movement is worth more. At these inputs the call goes to {{ usd(bV.c) }} and the put to {{ usd(bV.p) }}. The idea that a riskier stock is worth less applies to owning the shares, not to holding an option, whose loss is capped.
- q: >-
    Which change would *lower* the price of an ACME call, with everything else held fixed?
  choices:
    - >-
      The risk-free rate rises
    - >-
      ACME raises its dividend
    - >-
      There is more time to expiration
    - >-
      ACME's share price rises
  answer: 1
  explain: >-
    A higher dividend means a larger drop in the share price on the ex-dividend date, and the call holder does not receive the dividend. In the table, raising the yield from 2% to 3% takes the 30-day call from {{ usd(b0.c) }} to {{ usd(bQ.c) }}. A higher rate does the opposite: it *raises* calls, because owning a call instead of the shares lets you keep the strike money earning interest.
- q: >-
    You hold a 394-day ACME call and a 30-day ACME call. The risk-free rate rises one percentage point. Which call is affected more, and why?
  choices:
    - >-
      The 30-day call, because short-dated options react faster to everything
    - >-
      Both equally, because the rate change is the same
    - >-
      The 394-day call, because the rate acts over the whole life of the option
  answer: 2
  explain: >-
    Rates affect an option through the interest earned or paid over its life, so the effect grows with time. The LEAPS call moves by {{ usd(leapR.c - leap.c) }}, the 30-day call by only {{ usd(bR.c - b0.c) }}. Short-dated options do react faster to the *stock* (that is gamma, covered in Module 5), but not to rates.
- q: >-
    Of the six inputs, which one can nobody observe at the time of the trade?
  choices:
    - >-
      The risk-free rate
    - >-
      Time to expiration
    - >-
      The volatility of the stock until expiration
    - >-
      The dividend yield
  answer: 2
  explain: >-
    Volatility describes how much the stock will move between now and expiration, which is in the future. Time is fixed by the contract, and the rate and dividend are known to within a small margin. The dividend can change, which is why it is the tempting answer, but companies rarely change it without warning and its effect on a short-dated option is small.
```
