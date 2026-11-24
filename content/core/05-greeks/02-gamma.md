---
title: Gamma
summary: Use gamma to predict how delta changes, explain why option holders gain from big moves in either direction, and know where gamma is largest and most dangerous.
---

```calc
const row = (dte, K) => chain(ACME, { dte }).rows.find((x) => x.strike === K);
const T = 30 / 365;
const o = { K: 100, T, r: RATE, q: ACME.q, sigma: row(30, 100).call.iv, type: 'call' };
const g = bs.greeks({ S: 100, ...o });
const p = (S) => bs.price({ S, ...o });
const dUp = p(105) - g.price, dDn = p(95) - g.price;
const lin = g.delta * 5;
const quadUp = g.delta * 5 + 0.5 * g.gamma * 25, quadDn = -g.delta * 5 + 0.5 * g.gamma * 25;
const d101 = bs.greeks({ S: 101, ...o }).delta;
const strikes = [90, 95, 100, 105, 110];
const dtes = [121, 58, 30, 9, 2];
const hedgeSh = Math.round(g.delta * 1000);
const shortHedged = (S) => -1000 * (p(S) - g.price) + hedgeSh * (S - 100);
const posGamma = g.gamma * 1000;
const dollarGamma = posGamma * 100 * 100 / 100;
const gammaPnl1 = 0.5 * posGamma * 1 * 1;
```

Delta tells you how an option moves for the next small step in the stock. It does not stay put. As the stock moves, delta changes, and the rate at which it changes is [[gamma]]. Gamma is what makes options different from stock: a share always has a delta of exactly 1, so it has no gamma at all.

## Gamma is the change in delta

Gamma is the change in delta for a $1 move in the underlying. The ACME December 100 call has a delta of {{ num(g.delta, 3) }} and a gamma of {{ num(g.gamma, 4) }}. If ACME rises to $101, delta should rise by about {{ num(g.gamma, 3) }} to {{ num(g.delta + g.gamma, 3) }}; recomputing at $101 gives {{ num(d101, 3) }}. If ACME falls to $99, delta falls by about the same amount.

Calls and puts at the same strike and expiration have the same gamma. You can see why from the last Lesson: call delta minus put delta is a fixed number, \(e^{-qT}\), so when the stock moves, the two deltas must change by the same amount. Both calls and puts have *positive* gamma. Their deltas both rise as the stock rises (a put's delta goes from, say, −0.5 toward 0).

## Convexity: why big moves favour the holder

:::example A $5 move each way
Hold one December 100 call, worth {{ usd(g.price) }} with ACME at $100. Delta alone predicts a gain of {{ usd(lin) }} for a $5 rise and a loss of {{ usd(lin) }} for a $5 fall. Repricing the call says otherwise:

| ACME moves to | Delta-only estimate | Actual change |
|---|---|---|
| $105 | {{ signedUsd(lin) }} | {{ signedUsd(dUp) }} |
| $95 | {{ signedUsd(-lin) }} | {{ signedUsd(dDn) }} |

The call gains more on the way up than delta predicts, and loses less on the way down. As ACME rises the call gets longer (its delta grows), so each further dollar earns more; as ACME falls the call gets shorter, so each further dollar costs less. That asymmetry is called convexity, and gamma measures it.
:::

You can fix the estimate with one extra term.

:::derivation The gamma correction
Over a move of \(dS\) dollars, delta starts at \(\Delta\) and ends at about \(\Delta + \Gamma\,dS\). If it changes steadily along the way, its average over the move is the midpoint:

\[ \Delta_{\text{avg} } = \frac{\Delta + (\Delta + \Gamma\,dS)}{2} = \Delta + \tfrac12\Gamma\,dS . \]

The price change is the average delta times the size of the move:

\[ \text{change in price} \approx \left(\Delta + \tfrac12\Gamma\,dS\right) dS = \Delta\,dS + \tfrac12\,\Gamma\,dS^2 . \]

The second term is always positive for an option holder, because \(dS^2\) is positive whichever way the stock moves and \(\Gamma\) is positive.
:::

For the December 100 call, \(\tfrac12\Gamma\,dS^2\) for a $5 move is \(\tfrac12 \times {{ num(g.gamma, 4) }} \times 25\) = {{ usd(0.5 * g.gamma * 25) }}. Adding it gives {{ signedUsd(quadUp) }} for the rise and {{ signedUsd(quadDn) }} for the fall, both within a few cents of the repriced values. For moves much larger than this, gamma itself changes and the estimate drifts again; [Estimating P&L with the Greeks](#core-05-greek-pnl) shows where it breaks.

## Where gamma is large

From the chain, here is the gamma of ACME calls at five strikes and five expirations, with ACME at $100:

| Days left | 90 | 95 | 100 | 105 | 110 |
|---|---|---|---|---|---|
{{ dtes.map((d) => `| ${d} | ${strikes.map((k) => num(row(d, k).call.gamma, 4)).join(' | ')} |`).join('\n') }}

Two patterns:

- **Gamma peaks at the money.** Delta changes fastest where it is crossing from "probably expires worthless" to "probably expires in the money", which is around the strike.
- **At-the-money gamma grows as expiration nears**, and away-from-the-money gamma shrinks. With two days left the at-the-money 100 call has a gamma of {{ num(row(2, 100).call.gamma, 3) }}: a $1 move swings its delta by about {{ num(row(2, 100).call.gamma, 2) }}, or {{ int(row(2, 100).call.gamma * 100) }} shares per contract. Four months out the same strike's gamma is only {{ num(row(121, 100).call.gamma, 3) }}.

This is the delta "cliff" from the previous Lesson seen from another angle. A short-dated at-the-money option is the most explosive thing on the board.

```tool greeks-explorer
{ greek: 'gamma', type: 'call', K: 100, iv: 0.30, dtes: [2, 9, 30], x: 'spot' }
```

## Long gamma and short gamma

Anyone who owns options is **long gamma**: their delta moves in their favour, getting longer as the stock rises and shorter as it falls. Anyone who has sold options is **short gamma**: their delta moves against them, getting shorter as the stock rises and longer as it falls. Moves hurt them in both directions.

:::example A market maker who is short gamma
A market maker sold 10 December 100 calls and bought {{ int(hedgeSh) }} shares to be delta-neutral, as in the [Delta](#core-05-delta) Lesson. At $100 the position has no delta. Now ACME jumps before the market maker can adjust the hedge:

- ACME to $105: the calls cost {{ usd(1000 * dUp) }} more to buy back, the shares gain {{ usd(hedgeSh * 5) }}. Net {{ signedUsd(shortHedged(105)) }}.
- ACME to $95: the calls are worth {{ usd(-1000 * dDn) }} less, the shares lose {{ usd(hedgeSh * 5) }}. Net {{ signedUsd(shortHedged(95)) }}.

The hedge was right at $100 and wrong everywhere else. A delta-neutral short-gamma position loses on a big move in either direction; a long-gamma position (the customer who bought the calls and sold shares against them) would have made those amounts instead.
:::

Short gamma is not a mistake; it is a trade. The seller is paid for it through time decay, which the next Lesson covers, and [Estimating P&L with the Greeks](#core-05-greek-pnl) shows exactly how large a move it takes for gamma to beat time decay.

:::warning Short gamma near expiration
Selling at-the-money options in the last few days collects the fastest time decay, and it is also where gamma is largest. A short option that was a modest risk on Monday can behave like 100 shares by Thursday afternoon, and if the stock sits right at the strike at the close on expiration day you may not know whether you will be assigned. That is [[pin risk]], covered in [Exercise, assignment and expiration](#core-07).
:::

## Dollar gamma

A gamma of 0.05 on a $20 stock and on a $500 stock are very different risks, because a $1 move is 5% of one and 0.2% of the other. To compare, desks convert gamma to [[dollar gamma]]: the change in the position's dollar delta for a 1% move in the underlying,

\[ \text{dollar gamma} = \Gamma_{\text{position} } \times S \times (1\% \times S) = \frac{\Gamma_{\text{position} }\,S^2}{100} , \]

where \(\Gamma_{\text{position} }\) is gamma in shares (per-share gamma × contracts × 100).

For 10 December 100 calls, position gamma is {{ num(posGamma, 1) }} shares per $1. A 1% move in ACME is $1, so the position's delta changes by {{ num(posGamma, 1) }} shares, worth {{ usd(dollarGamma, 0) }} of stock: that is the dollar gamma. Some desks quote instead the profit from gamma on a 1% move, \(\tfrac12\Gamma_{\text{position} }(0.01S)^2\), which here is {{ usd(gammaPnl1) }}. Check which convention a risk report uses before comparing numbers.

:::key
Gamma is the change in delta per $1 move. It is positive for every long option, call or put, which is why holders gain more on big moves than delta predicts and sellers lose more. Gamma is largest at the money and near expiration. The price change for a move \(dS\) is about \(\Delta\,dS + \tfrac12\Gamma\,dS^2\).
:::

```quiz
- q: >-
    An ACME call has a delta of 0.40 and a gamma of 0.05. ACME rises $2. What is the call's new delta, approximately?
  choices:
    - >-
      0.40
    - >-
      0.50
    - >-
      0.45
  answer: 1
  explain: >-
    Gamma is the change in delta per $1, so a $2 rise adds 2 × 0.05 = 0.10, taking delta to 0.50. Leaving delta at 0.40 ignores gamma; 0.45 adds only one dollar's worth of gamma for a two-dollar move.
- q: >-
    You own an ACME put. ACME rises sharply. What happens to the put's delta?
  choices:
    - >-
      It becomes more negative, because puts have negative gamma
    - >-
      It moves toward zero, because the put has positive gamma
    - >-
      It stays the same, because delta only changes with time
  answer: 1
  explain: >-
    Every long option has positive gamma, puts included. A rising stock adds gamma times the move to the put's delta, so a delta of −0.50 moves toward 0 as the put goes out of the money. The tempting mistake is to think a put's negative delta means negative gamma; the sign of delta and the sign of gamma are separate.
- q: >-
    Which ACME option has the largest gamma?
  choices:
    - >-
      The 121-day 100 call
    - >-
      The 2-day 100 call
    - >-
      The 2-day 110 call
  answer: 1
  explain: >-
    Gamma is largest at the money and grows as expiration approaches: the 2-day 100 call's gamma is {{ num(row(2, 100).call.gamma, 3) }}, against {{ num(row(121, 100).call.gamma, 3) }} for the 121-day 100 call. The 2-day 110 call is also short-dated, which makes it tempting, but it is $10 out of the money with almost no chance of reaching the strike, so its gamma is practically zero.
- q: >-
    You are short 10 ACME December 100 calls, delta-hedged with {{ int(hedgeSh) }} shares at $100. Overnight ACME falls to $95. Before any time passes, how did you do?
  choices:
    - >-
      You made money, because short calls profit when the stock falls
    - >-
      You lost about {{ usd(-shortHedged(95)) }}, because short gamma loses on a large move either way
    - >-
      Nothing, because the position was delta-neutral
  answer: 1
  explain: >-
    The calls fell by {{ usd(-1000 * dDn) }} in total, but the {{ int(hedgeSh) }} shares lost {{ usd(hedgeSh * 5) }}, so you are down {{ usd(-shortHedged(95)) }}. Delta-neutral protects you only against *small* moves; as ACME fell, the calls' delta shrank and your shares became too many. A short call alone would have profited, which is the tempting answer, but the hedge changed the bet into one on the size of the move.
```
