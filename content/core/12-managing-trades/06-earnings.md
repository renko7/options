---
title: Trading around earnings
summary: Read the expected move from the options before an earnings announcement, see how volatility crush decides who wins afterwards, and size earnings trades for the gap.
---

```calc
const env = { r: RATE, q: ACME.q };
const ivE = 0.70, ivAfter = 0.30, crush = ivAfter - ivE;
const T3 = 3 / 365;
const P = (K, type, sigma = ivE, t = T3, S = 100) => bs.price({ S, K, T: t, r: RATE, q: ACME.q, sigma, type });
const c100 = Number(P(100, 'call').toFixed(2)), p100 = Number(P(100, 'put').toFixed(2));
const straddle = c100 + p100;
const longStraddle = [
  { kind: 'call', qty: 1, strike: 100, premium: c100, dte: 3, iv: ivE },
  { kind: 'put', qty: 1, strike: 100, premium: p100, dte: 3, iv: ivE },
];
const after = (legs, S) => payoff.pnlAt(legs, S, 1, { ...env, ivShift: crush });
const outcomes = [100, 104, 106, 108, 94, 92];
const moveImplied = Math.sqrt((ivE * ivE - ivAfter * ivAfter) * T3);
const ic = [[95, 'put', -1], [90, 'put', 1], [105, 'call', -1], [110, 'call', 1]]
  .map(([K, type, qty]) => ({ kind: type, qty, strike: K, premium: Number(P(K, type).toFixed(2)), dte: 3, iv: ivE }));
const icS = payoff.summary(ic);
const icCredit = -payoff.netPremium(ic);
const stRow = (S) => `| ${usd(S, 0)} | ${pct(S / 100 - 1, 0)} | ${signedUsd(after(longStraddle, S))} | ${signedUsd(after(ic, S))} |`;
const c105 = Number(P(105, 'call').toFixed(2));
const c105After = P(105, 'call', ivAfter, 2 / 365, 104);
const past = [0.031, -0.068, 0.022, 0.049, -0.015, 0.084, -0.036, 0.027];
const avgAbs = past.reduce((a, x) => a + Math.abs(x), 0) / past.length;
const bigger = past.filter((x) => Math.abs(x) > straddle / 100).length;
const pastList = past.map((x) => (x > 0 ? '+' : '−') + pct(Math.abs(x), 1)).join(', ');
const account = 40000;
const budget = 0.01 * account;
const nIC = Math.floor(budget / -icS.maxLoss);
```

An [[earnings announcement]] is the one large, scheduled piece of news in a stock's quarter. The stock often gaps, up or down, by more than it moves in a normal week, and everyone knows the date in advance. Options prices reflect that, and the way they reflect it creates a pattern that catches almost every beginner once: you can be right about the direction and still lose.

In this Module, ACME reports after the close on Tuesday, {{ longDate('2027-01-12') }}. The January options expire three days later, on Friday the 15th.

## What the options are pricing

In a normal week, ACME's at-the-money options trade near 30% [[implied volatility]]. On the afternoon of the announcement, suppose ACME is at $100 and the January options, with 3 days left, trade at {{ pct(ivE, 0) }}. Nothing is wrong with the prices. Three days of ordinary 30% volatility plus one day carrying a large jump average out to a high annualized number.

:::example Reading the expected move
The January 100 call costs {{ usd(c100) }} and the January 100 put costs {{ usd(p100) }}. The at-the-money straddle costs **{{ usd(straddle) }}**, about {{ pct(straddle / 100) }} of the stock price.

Traders read the straddle price as the market's [[expected move]] for the announcement: roughly how far, in either direction, the options are priced for ACME to travel by expiration. A second way to get the same idea is to strip out the normal volatility: if 30% is ACME's ordinary level, the extra variance in the January options implies a one-day earnings move with a standard deviation of

\[ \sqrt{ \left( {{ num(ivE) }}^2 - {{ num(ivAfter) }}^2 \right) \times \tfrac{3}{365} } = {{ pct(moveImplied) }}. \]

Both numbers say the same thing: the options are priced for a move of about 5%.
:::

The useful comparison is with what ACME has actually done. Its last eight earnings moves were {{ pastList }}. The average size was {{ pct(avgAbs) }}, smaller than the {{ pct(straddle / 100) }} the straddle implies, but {{ int(bigger) }} of the eight were larger. That is the typical shape: options usually price earnings a little above the average move, because the occasional large gap is what sellers must be paid for. Eight observations are a small sample, and the next announcement can be the biggest yet.

## Volatility crush: why direction is not enough

Once the news is out, the uncertainty it carried is gone, and implied volatility collapses back toward its normal level overnight. That is [[volatility crush]]. Every option loses the event premium at once, regardless of which way the stock moved.

:::example The morning after
On Wednesday morning implied volatility is back at {{ pct(ivAfter, 0) }}, with 2 days left. Here is what happened, depending on the stock's open, to a buyer of the {{ usd(straddle) }} straddle and to a seller of the January 90/95/105/110 [[iron condor]] for {{ usd(icCredit / 100) }}:

| ACME opens at | Move | Long straddle | Short iron condor |
|---|---|---|---|
{{ outcomes.map(stRow).join('\n') }}

The straddle buyer needed a move of more than about 5% to make money. A 4% move, a large one by ACME's normal standards, still lost {{ usd(-after(longStraddle, 104)) }}, because the move was smaller than what had been paid for. The iron condor seller made money on any move inside the short strikes and lost on the larger moves, up to a defined maximum of {{ usd(-icS.maxLoss) }}.
:::

```tool position-builder
{ title: 'Long the ACME January 100 straddle into earnings', legs: longStraddle, range: [85, 115], daysPassed: 1, ivShift: crush }
```

The dashed line shows the position the morning after, with implied volatility already crushed. Drag the volatility shift back to zero to see what the same price move would have been worth without the crush: that difference is the event premium the buyer paid.

The same arithmetic applies to directional trades. Buy the January 105 call for {{ usd(c105) }} before the announcement because you expect good news. ACME rises 4% to $104. The next morning the call is worth about {{ usd(c105After) }}: you were right, and you lost. A long option bought just before earnings is a bet that the move will be bigger than the market expects, not just in your direction.

:::warning Earnings inside a position you did not plan for it
The most common earnings loss is not a deliberate earnings trade. It is a 30- or 60-day credit spread or [[covered call]] whose expiration happens to fall after the report, opened without checking the calendar. That is why the [trading plan](#core-12-trading-plan) in this Module closes the January put spreads before the 12th. Check the earnings date for every underlying before you open a position, and write down whether the plan holds through it.
:::

## Choosing a side

There is no structural free lunch on either side.

- **Selling earnings premium** wins most of the time, because the stock usually moves less than the straddle implies, and loses large amounts occasionally. Over many quarters it pays only if the premium collected exceeds the average loss on the big gaps. Use [[defined risk]] structures such as iron condors or [[credit spreads|credit spread]]; a naked short straddle through earnings has a stress loss that only the next gap will reveal.
- **Buying earnings premium** loses most of the time, in small amounts, and wins large when the move exceeds expectations. It pays only if you can identify announcements where the market is underpricing the move, which is a claim about information most traders do not have.
- **Not trading** is a choice. Closing positions before the announcement removes the gap from your results. Many experienced traders do exactly that with everything except their deliberate earnings positions.

## Sizing for the gap

An earnings trade lasts a day or two, but its max loss is as large as a two-month trade with the same strikes. Size it from the max loss like any other position, and expect the max loss to be reached more often than on an ordinary trade, because the gap is the whole point of the event.

:::example Sizing the iron condor
The January iron condor above risks {{ usd(-icS.maxLoss) }} per contract. Treating the earnings gap as a stress event and allowing 1% of a {{ usd(account, 0) }} account, {{ usd(budget, 0) }}, the plan allows {{ int(nIC) }} iron condor{{ nIC === 1 ? '' : 's' }}. A trader who sized it by the {{ usd(icCredit) }} credit, or by the probability of profit, would trade many more and lose many times that amount on the first large gap.
:::

:::practice What professionals do around earnings
They keep a calendar of every report on every underlying they hold. They compare the implied move with the stock's own history of moves and with similar companies. They trade the event with defined risk and small size, close or hedge positions they do not want exposed, and record each earnings trade separately in the journal, because earnings results are noisy and only a long record shows whether there is an edge.
:::

:::key
Before an earnings announcement, the at-the-money straddle prices the expected move; after it, implied volatility collapses and every option loses its event premium at once. Long options bought into earnings need a bigger move than the market expects, not just the right direction. Short premium usually wins and occasionally loses big. Size every earnings trade from its max loss as if the gap will come, and check the calendar before every trade.
:::

```quiz
- q: >-
    Before the announcement, the ACME January 100 call costs {{ usd(c100) }} and the 100 put costs {{ usd(p100) }}. Roughly what move is the market pricing?
  choices:
    - >-
      About {{ usd(c100, 2) }}, the price of the call
    - >-
      About {{ usd(straddle) }} in either direction, the price of the straddle
    - >-
      About {{ usd(100 * ivE, 0) }}, implied volatility times the stock price
  answer: 1
  explain: >-
    The at-the-money straddle pays off on a move either way, so its price is the market's estimate of the size of the move, about {{ pct(straddle / 100) }}. The call alone prices only half of that. Implied volatility is an annualized number; multiplying it by the price without scaling for the 3 days left overstates the move many times over.
- q: >-
    You buy the January 105 call for {{ usd(c105) }} the afternoon before the report. ACME rises to $104 and implied volatility falls back to {{ pct(ivAfter, 0) }}. What is the call worth?
  choices:
    - >-
      More than you paid, because ACME rose 4%
    - >-
      About {{ usd(c105After) }}, less than you paid
    - >-
      Nothing, because it is still out of the money
  answer: 1
  explain: >-
    The rise to $104 helped, but the call lost most of its event premium overnight, and it is still out of the money with 2 days left. The direction was right and the trade still lost {{ usd((c105 - c105After) * 100) }} per contract. It is not worthless yet: it keeps some time value until Friday.
- q: >-
    Over eight past reports ACME moved {{ pct(avgAbs) }} on average, and the straddle now implies about {{ pct(straddle / 100) }}. What does that comparison justify?
  choices:
    - >-
      Selling the straddle with no limit on size, since the market overprices every report
    - >-
      Considering a defined-risk short premium trade, sized for a gap, knowing {{ int(bigger) }} of the eight moves were larger than the implied move
    - >-
      Buying the straddle, since a large move is due
  answer: 1
  explain: >-
    Options often price earnings a little above the average move, which is a reason to consider selling premium, but the larger moves in the history are exactly the losses that eat the premium. Eight data points cannot rule out a bigger gap, so the trade must be defined risk and sized for its max loss. "A large move is due" is not a reason: past moves do not create future ones.
- q: >-
    You allow 1% of a {{ usd(account, 0) }} account on an earnings trade. The iron condor's max loss is {{ usd(-icS.maxLoss) }} per contract. How many can you sell?
  choices:
    - >-
      {{ int(nIC) }}
    - >-
      {{ int(Math.floor(budget / icCredit)) }}
    - >-
      {{ int(Math.floor(account * 0.2 / -icS.maxLoss)) }}
  answer: 0
  explain: >-
    {{ usd(budget, 0) }} divided by the {{ usd(-icS.maxLoss) }} max loss, rounded down, gives {{ int(nIC) }}. Dividing by the credit sizes the trade by what it can make. The third answer risks 20% of the account on one report, which the gap will eventually collect.
```
