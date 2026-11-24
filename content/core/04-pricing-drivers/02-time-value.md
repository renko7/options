---
title: Time value and decay
summary: Split an option's price into intrinsic and time value, and predict how fast the time value disappears as expiration approaches.
---

```calc
const px = (K, dte, type = 'call') => bs.price({ S: 100, K, T: dte / 365, r: RATE, q: ACME.q, sigma: 0.30, type });
const c90 = px(90, 30), c100 = px(100, 30), c110 = px(110, 30);
const tv90 = c90 - bs.intrinsic({ S: 100, K: 90, type: 'call' });
const dtes = [394, 212, 121, 58, 30, 9, 2];
const atm = Object.fromEntries(dtes.map((d) => [d, px(100, d)]));
const rule = (d) => 0.4 * 100 * 0.30 * Math.sqrt(d / 365);
const perDay = (d) => atm[d] / d;
const wk30 = px(100, 30) - px(100, 23);
const wk9 = px(100, 9) - px(100, 2);
const wk121 = px(100, 121) - px(100, 114);
const otm9 = px(105, 9), otm2 = px(105, 2);
const dec = Number(px(100, 30).toFixed(2)), decAfter = px(100, 9);
const mar = Number(px(100, 121).toFixed(2)), marAfter = px(100, 100);
```

An option's price has two parts. One part you could collect right now by exercising. The other part is the market's price for whatever might still happen before expiration. The second part shrinks every day, and it shrinks faster the closer you get to the end. Every option buyer is fighting that shrinkage and every option seller is collecting it, so you need a feel for its shape.

## Intrinsic value and time value

[[Intrinsic value]] is what the option would be worth if it expired now: the stock price minus the strike for a call, the strike minus the stock price for a put, and never less than zero. Everything above that is [[extrinsic value]], which traders usually call **time value**.

\[ \text{option price} = \text{intrinsic value} + \text{time value} \]

With ACME at $100 and 30 days to go:

| December call | Price | Intrinsic | Time value |
|---|---|---|---|
| 90 strike | {{ usd(c90) }} | $10.00 | {{ usd(tv90) }} |
| 100 strike | {{ usd(c100) }} | $0.00 | {{ usd(c100) }} |
| 110 strike | {{ usd(c110) }} | $0.00 | {{ usd(c110) }} |

Time value is largest [[at the money]]. That is where the outcome is most uncertain: the option could end anywhere from worthless to well in the money. A deep [[in the money]] call already behaves almost like the stock, so there is little left to pay for beyond its intrinsic value. A far [[out of the money]] call probably expires worthless, so the market pays little for it. At expiration time value is zero for every option.

## Time value grows with the square root of time

Here is the ACME 100 call, with ACME at $100, at each listed expiration. To isolate the effect of time, every row uses the same 30% volatility. (On the real chain, longer expirations carry slightly different volatilities; [Term structure and VIX](#core-06-term-structure-and-vix) explains why.) Because the option is at the money, its whole price is time value.

| Days to expiration | 100 call | \(0.4 \times S \times \sigma \times \sqrt{T}\) | Price per day of life |
|---|---|---|---|
| 394 | {{ usd(atm[394]) }} | {{ usd(rule(394)) }} | {{ usd(perDay(394), 3) }} |
| 212 | {{ usd(atm[212]) }} | {{ usd(rule(212)) }} | {{ usd(perDay(212), 3) }} |
| 121 | {{ usd(atm[121]) }} | {{ usd(rule(121)) }} | {{ usd(perDay(121), 3) }} |
| 58 | {{ usd(atm[58]) }} | {{ usd(rule(58)) }} | {{ usd(perDay(58), 3) }} |
| 30 | {{ usd(atm[30]) }} | {{ usd(rule(30)) }} | {{ usd(perDay(30), 3) }} |
| 9 | {{ usd(atm[9]) }} | {{ usd(rule(9)) }} | {{ usd(perDay(9), 3) }} |
| 2 | {{ usd(atm[2]) }} | {{ usd(rule(2)) }} | {{ usd(perDay(2), 3) }} |

Two things stand out. First, price is far from proportional to time. The 121-day option has about four times as long to run as the 30-day option, and it costs about twice as much: {{ usd(atm[121]) }} against {{ usd(atm[30]) }}. Second, the shortcut in the third column, \(0.4 \times S \times \sigma \times \sqrt{T}\) with \(T\) in years, lands close to the true price for an at-the-money option at every date. It is worth memorizing; at-the-money calls and puts are both close to it.

:::derivation Why the square root of time
Suppose each day's change in the stock is independent of every other day's, and each has the same spread, measured by its variance \(v\) (the square of its standard deviation \(s\)).

For independent changes, variances add. The variance of the total change over \(n\) days is therefore

\[ v + v + \cdots + v = n\,v . \]

The standard deviation is the square root of the variance:

\[ \sqrt{n\,v} = \sqrt{n}\,\sqrt{v} = s\sqrt{n} . \]

So the typical size of the move over \(n\) days grows with \(\sqrt{n}\), not with \(n\). Four times as many days means twice the typical move; nine times as many days means three times the move. An at-the-money option's time value is a payment for the typical size of the move before expiration, so it grows with \(\sqrt{T}\) as well. (The constant 0.4 comes from the bell-curve shape of returns: it is \(1/\sqrt{2\pi}\) rounded. That part needs calculus and is shown in the [Advanced Track](#advanced-02).)
:::

The last column of the table says the same thing as a cost. If you buy time by the day, long-dated options are cheap and short-dated ones are expensive.

## Time decay speeds up near expiration

The loss of time value as days pass, with nothing else changing, is called [[time decay]]. Because value grows with \(\sqrt{T}\), it must also fall away along a \(\sqrt{T}\) curve, which is steepest near zero. With ACME unchanged at $100, one week costs the 100 call:

- from 121 to 114 days: {{ usd(wk121) }}
- from 30 to 23 days: {{ usd(wk30) }}
- from 9 to 2 days: {{ usd(wk9) }}

The same seven days cost about {{ num(wk9 / wk121, 1) }} times as much in the last week as they do four months out.

For out-of-the-money options the end is even more abrupt. The December 105 call is $5 out of the money. With 9 days left it is worth {{ usd(otm9) }}; with 2 days left, if ACME has not moved, it is worth {{ usd(otm2) }}. It lost almost all of its value in one week, because there is too little time left for a $5 move to be likely.

:::example Holding a view for three weeks
You expect ACME to rally over the next three weeks and compare two at-the-money calls:

- the December 100 call, 30 days, at {{ usd(dec) }} ({{ usd(dec * 100) }} per contract);
- the March 100 call, 121 days, at {{ usd(mar) }} ({{ usd(mar * 100) }} per contract).

Both are valued at 30% volatility so that only time differs. Suppose you are wrong about the timing: 21 days later ACME is still at $100 and nothing else has changed.

- The December call has 9 days left and is worth {{ usd(decAfter) }}. You lost {{ usd((dec - decAfter) * 100) }} per contract, {{ pct((dec - decAfter) / dec, 0) }} of what you paid.
- The March call has 100 days left and is worth {{ usd(marAfter) }}. You lost {{ usd((mar - marAfter) * 100) }} per contract, {{ pct((mar - marAfter) / mar, 0) }} of what you paid.

The March call cost more up front, but three weeks of waiting cost it far less, in dollars and as a share of the premium. The December call is the cheaper ticket and the faster-melting one. Neither is "better": the December call gains more per contract if the rally comes quickly, and the March call gives the idea time to work.
:::

:::warning Cheap options are expensive per day
Short-dated, out-of-the-money options cost little per contract, which makes them tempting. Per day of protection or opportunity they are the most expensive options on the board, and their time value can vanish in a few sessions without the stock doing anything. If the move you expect needs time, buy the time.
:::

The explorer below plots the price of an in-the-money, an at-the-money and an out-of-the-money call against days remaining. Watch the at-the-money curve drop steeply in the last few weeks, and the out-of-the-money curve collapse to zero before the end.

```tool greeks-explorer
{ greek: 'price', type: 'call', K: 100, iv: 0.30, x: 'dte' }
```

The daily rate of time decay has its own name, [[theta]], and it is one of the Greeks in [The Greeks in practice](#core-05).

:::key
An option's price is intrinsic value plus time value, and time value is largest at the money. Time value grows with the square root of time (an at-the-money option is worth about \(0.4\,S\,\sigma\sqrt{T}\)), so it decays slowly far from expiration and very fast in the final weeks.
:::

```quiz
- q: >-
    With ACME at $100, the December 90 call is worth {{ usd(c90) }}. How much of that is time value?
  choices:
    - >-
      {{ usd(c90) }}
    - >-
      $10.00
    - >-
      {{ usd(tv90) }}
  answer: 2
  explain: >-
    The call is $10 in the money, so its intrinsic value is $10.00. The rest, {{ usd(c90) }} − $10.00 = {{ usd(tv90) }}, is time value. The whole price would be time value only for an at-the-money or out-of-the-money option.
- q: >-
    An at-the-money option with 30 days left costs about {{ usd(atm[30]) }}. Roughly what would the same option cost with 120 days left, with everything else unchanged?
  choices:
    - >-
      About four times as much, because it has four times the time
    - >-
      About twice as much, because value grows with the square root of time
    - >-
      About the same, because the strike and stock price have not changed
  answer: 1
  explain: >-
    Time value grows with \(\sqrt{T}\), and \(\sqrt{4} = 2\). The 121-day ACME 100 call is {{ usd(atm[121]) }}, close to twice {{ usd(atm[30]) }}. "Four times" assumes value is proportional to time, which is the most common beginner mistake about decay.
- q: >-
    ACME stays at $100 for a week. Which option loses the most value over that week?
  choices:
    - >-
      The 100 call going from 121 to 114 days
    - >-
      The 100 call going from 30 to 23 days
    - >-
      The 100 call going from 9 to 2 days
  answer: 2
  explain: >-
    Time decay accelerates near expiration. The last week costs {{ usd(wk9) }}, against {{ usd(wk30) }} a month out and {{ usd(wk121) }} four months out. The 121-day option has the most time value in total, which makes it tempting, but it gives up only a small slice of it each week.
- q: >-
    Two calls have the same expiration. Which has the most time value?
  choices:
    - >-
      A deep in-the-money call
    - >-
      An at-the-money call
    - >-
      A far out-of-the-money call
  answer: 1
  explain: >-
    Time value is largest where the outcome is most uncertain, at the money. The deep in-the-money call has the highest *price*, but most of that is intrinsic value; with 30 days left the ACME 90 call carries only {{ usd(tv90) }} of time value against {{ usd(c100) }} for the 100 call.
```
