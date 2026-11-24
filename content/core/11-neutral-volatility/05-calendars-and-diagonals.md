---
title: Calendar and diagonal spreads
summary: Sell a near-term option against a longer-dated one, see the P&L at the front expiration, and understand the theta and vega profile that makes calendars different from every other spread.
---

```calc
const env = { r: RATE, q: ACME.q };
const dec = chain(ACME, { dte: 30 });
const jan = chain(ACME, { dte: 58 });
const mar = chain(ACME, { dte: 121 });
const D = (k) => dec.rows.find((r) => r.strike === k);
const J = (k) => jan.rows.find((r) => r.strike === k);
const M = (k) => mar.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const front = expiryDate(30), back = expiryDate(58);
// call calendar: short Dec 100 call, long Jan 100 call
const calMid = J(100).call.mid - D(100).call.mid;
const calNat = J(100).call.ask - D(100).call.bid;
const calFill = fillD(calMid);
const cal = [
  { kind: 'call', qty: -1, strike: 100, premium: D(100).call.mid, dte: 30, iv: D(100).call.iv },
  { kind: 'call', qty: 1, strike: 100, premium: D(100).call.mid + calFill, dte: 58, iv: J(100).call.iv },
];
const at30 = (legs, S, shift = 0) => payoff.pnlAt(legs, S, 30, { ...env, ivShift: shift });
const root = (f, a, b) => { for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; } return (a + b) / 2; };
const be = [root((S) => at30(cal, S), 80, 100), root((S) => at30(cal, S), 100, 125)];
const G = (d) => payoff.positionGreeks(cal, 100, d, env);
// diagonal: short Dec 105 call, long Jan 100 call
const dgMid = J(100).call.mid - D(105).call.mid;
const dgFill = fillD(dgMid);
const dg = [
  { kind: 'call', qty: -1, strike: 105, premium: D(105).call.mid, dte: 30, iv: D(105).call.iv },
  { kind: 'call', qty: 1, strike: 100, premium: D(105).call.mid + dgFill, dte: 58, iv: J(100).call.iv },
];
const dgG = payoff.positionGreeks(dg, 100, 0, env);
// "poor man's covered call": long Mar 85 call, short Dec 105 call
const pmMid = M(85).call.mid - D(105).call.mid;
const pmFill = fillD(pmMid);
const pmG = payoff.positionGreeks([
  { kind: 'call', qty: -1, strike: 105, premium: D(105).call.mid, dte: 30, iv: D(105).call.iv },
  { kind: 'call', qty: 1, strike: 85, premium: D(105).call.mid + pmFill, dte: 121, iv: M(85).call.iv },
], 100, 0, env);
const ccDelta = 100 - 100 * D(105).call.delta;
const prices = [85, 90, 95, 100, 105, 110, 115];
```

Every spread so far has used one expiration. A [[calendar spread]] uses two: it sells a near-term option and buys a longer-dated option at the same strike. Because the two legs decay at different speeds and respond differently to implied volatility, a calendar has a profile no single-expiration trade can produce: it earns time decay *and* gains when implied volatility rises.

## The call calendar

:::example The December/January 100 call calendar
ACME is at $100. Sell the December 100 call (30 days, mid {{ usd(D(100).call.mid, 3) }}) and buy the January 100 call (58 days, mid {{ usd(J(100).call.mid, 3) }}). The natural debit is {{ usd(calNat) }}, the mid {{ usd(calMid, 3) }}; you are filled at **{{ usd(calFill) }}**, {{ usd(calFill * 100) }}.

The trade is judged at the front expiration, {{ longDate(front) }}. On that day the December call is worth its intrinsic value and the January call still has 28 days of life. The P&L depends on where ACME is:

| ACME on {{ longDate(front) }} | P&L | P&L if implied vol is 5 points higher | 5 points lower |
|---|---|---|---|
{{ prices.map((S) => `| $${S} | ${usd(at30(cal, S))} | ${usd(at30(cal, S, 0.05))} | ${usd(at30(cal, S, -0.05))} |`).join('\n') }}

- **At the strike** the December call expires worthless and the January call is at the money with the most time value it can have. This is the best case, about {{ usd(at30(cal, 100)) }}.
- **Far from the strike in either direction**, both calls are worth about the same (both nearly worthless, or both nearly pure intrinsic value), and the spread collapses toward zero. The loss approaches the {{ usd(calFill * 100) }} debit.
- **Break-evens at the front expiration**, with implied volatility unchanged: about {{ usd(be[0]) }} and {{ usd(be[1]) }}.
:::

The shape is a rounded tent, like a butterfly's, but it is not fixed: it depends on what the January call is worth on that day, and that depends on implied volatility. There is no exact max profit or break-even until the long option is closed, which is why calendars are always analyzed with a model rather than a payoff formula. The builder below does exactly that: drag "Days passed" to 30 and move the volatility shift.

## The Greeks: positive theta and positive vega

At entry, with ACME at $100, the calendar has delta {{ signed(G(0).delta, 1) }} shares, gamma {{ signed(G(0).gamma, 2) }} shares per $1, theta {{ signedUsd(G(0).theta) }} a day and vega {{ signedUsd(G(0).vega) }} per vol point.

- **Theta is positive** because the short 30-day option decays faster than the long 58-day option. That gap widens as the front month approaches expiration.
- **Vega is positive** because the longer option has more vega than the shorter one. A rise in implied volatility helps; a fall hurts, as the table's last two columns show.
- **Gamma is negative**: a large move in either direction hurts.

| Days passed | Theta ($/day) | Vega ($/vol pt) | Gamma |
|---|---|---|---|
{{ [0, 10, 20, 25, 29].map((d) => `| ${d} | ${signedUsd(G(d).theta)} | ${signedUsd(G(d).vega)} | ${signed(G(d).gamma, 2)} |`).join('\n') }}

All three grow as the front month runs down: in the last week the calendar becomes a large bet that ACME sits near $100, plus a growing bet that implied volatility holds up. That combination, short gamma but long vega, is the calendar's signature. It is a bet that the stock stays put while the market keeps *expecting* movement.

## Term structure and events

A calendar buys one expiration's implied volatility and sells another's. In the ACME chain the January 100 call trades at {{ pct(J(100).call.iv, 1) }} implied volatility and the December at {{ pct(D(100).call.iv, 1) }}: you are buying the slightly richer month. The shape of the [[term structure]] matters to every calendar.

Events change that shape. ACME reports earnings on {{ longDate(ACME_EARNINGS) }}, inside the January expiration but after December's. In a real market, January options would carry extra implied volatility for that event, making this calendar more expensive. The trade then wins if January's implied volatility stays high until you close it, and loses badly if you hold the January call through the announcement and the [[volatility crush]] arrives. Calendar traders who buy an event month usually plan to exit before the event.

:::warning A calendar is not "free" time decay
The positive theta comes with negative gamma and a dependence on implied volatility. A sharp move, or a fall in the back month's implied volatility, can turn the trade into a loss of most of the debit even with time passing in your favor.
:::

## Diagonal spreads

A [[diagonal spread]] is a calendar whose two legs have different strikes. The common version sells a near-term out-of-the-money call against a longer-dated call at or below the money, which adds a directional tilt.

:::example The December 105 / January 100 call diagonal
Sell the December 105 call and buy the January 100 call, filled at a debit of **{{ usd(dgFill) }}**. At entry: delta {{ signed(dgG.delta, 1) }} shares, theta {{ signedUsd(dgG.theta) }} a day, vega {{ signedUsd(dgG.vega) }}.

On {{ longDate(front) }}, with implied volatility unchanged:

| ACME | {{ prices.map((S) => `$${S}`).join(' | ') }} |
|---|{{ prices.map(() => '---').join('|') }}|
| P&L | {{ prices.map((S) => usd(at30(dg, S))).join(' | ') }} |

The diagonal is mildly bullish: it does best if ACME rises to the short strike, $105, by December expiration, and it still has a long January call afterward, which can be kept, sold, or written against again.
:::

The best-known diagonal replaces the shares in a [covered call](#core-09-covered-call) with a deep in-the-money long-dated call, sometimes called a "poor man's covered call". For example, buy the March 85 call and sell the December 105 call, for a debit of about {{ usd(pmFill) }}, {{ usd(pmFill * 100) }}, instead of the $10,000 that 100 shares cost. Its delta is {{ num(pmG.delta, 0) }} shares against the covered call's {{ num(ccDelta, 0) }}, because even a deep in-the-money call does not move fully with the stock; it behaves like a smaller covered call. The trade-offs: no dividends, the long call's own time decay and vega, the risk that a large rally leaves the short call deep in the money (and exposed to early assignment before the ex-dividend date) while the long call has lost its time value, and the fact that a cheaper position makes it easy to take on far more exposure than 100 shares.

:::practice How traders run calendars
Calendars are usually opened 30 to 60 days before the front expiration, at or near the strike where the trader expects the stock to be, preferably when the back month's implied volatility looks cheap. Most are closed on or before the front expiration rather than held as a naked long option. If the stock moves away, traders either close the trade or roll the short option to a new strike, turning the calendar into a diagonal.
:::

```tool position-builder
{ title: 'December/January 100 call calendar', legs: cal, range: [85, 115], daysPassed: 20 }
```

:::key
A calendar sells a near-term option and buys a longer-dated one at the same strike. Judged at the front expiration, it pays most if the stock is at the strike, and loses up to its debit if the stock moves far away. It is positive theta and positive vega but negative gamma: a bet that the stock stays put while implied volatility holds up. A diagonal uses different strikes to add a directional tilt.
:::

```quiz
- q: >-
    You hold the December/January 100 call calendar. On December expiration ACME is at $100. Why is this the best case?
  choices:
    - >-
      The December call expires worthless while the January call, now at the money, has the most time value it can have
    - >-
      Both calls expire worthless and you keep the premium
    - >-
      The January call is worth its intrinsic value
  answer: 0
  explain: >-
    At the strike, the option you sold is worth nothing and the option you own is worth the most it can be as an at-the-money call with 28 days left: the calendar shows about {{ usd(at30(cal, 100)) }}. The January call does not expire in December, and at $100 it has no intrinsic value at all; its whole value is time value.
- q: >-
    How does a 5-point rise in implied volatility affect the calendar?
  choices:
    - >-
      It helps, because the long January call has more vega than the short December call
    - >-
      It hurts, because the calendar is a short-premium position
    - >-
      It has no effect, because the two calls offset
  answer: 0
  explain: >-
    The longer-dated option has more vega, so the calendar's vega is positive ({{ signedUsd(G(0).vega) }} per point at entry). At the front expiration with ACME at $100, the table shows {{ usd(at30(cal, 100, 0.05)) }} instead of {{ usd(at30(cal, 100)) }}. The calendar collects theta like a short-premium trade, but unlike one it is long vega.
- q: >-
    ACME gaps to $115 two weeks into the calendar. What happens?
  choices:
    - >-
      The calendar loses: far from the strike both calls behave alike and the spread shrinks toward zero
    - >-
      The calendar gains, because it contains a long call
    - >-
      Nothing, because a calendar is delta-neutral
  answer: 0
  explain: >-
    Deep in the money, both calls are mostly intrinsic value and their difference shrinks, so the spread loses most of the {{ usd(calFill * 100) }} debit (about {{ usd(at30(cal, 115)) }} at the front expiration). The calendar's near-zero delta holds only near the strike; its negative gamma means large moves in either direction hurt.
- q: >-
    You sell the December 105 call against a long January 100 call. What is this position, and what is its bias?
  choices:
    - >-
      A diagonal spread with a mildly bullish bias
    - >-
      A calendar spread with no directional bias
    - >-
      A bear call spread
  answer: 0
  explain: >-
    Different strikes and different expirations make it a diagonal. Its delta is {{ signed(dgG.delta, 1) }} shares at entry, and it does best if ACME rises to the short 105 strike by December expiration. A calendar uses the same strike in both expirations; a bear call spread uses one expiration and is short the lower strike.
```
