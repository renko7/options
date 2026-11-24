---
title: The short call and the short put
summary: Work out the break-even, maximum profit and maximum loss of writing a call or a put, and tell defined-risk positions from undefined-risk ones before you take them on.
---

```calc
const T = 30 / 365;
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const cb = row(105).call.bid;
const pb = row(95).put.bid;
const sc = [{ kind: 'call', qty: -1, strike: 105, premium: cb }];
const sp = [{ kind: 'put', qty: -1, strike: 95, premium: pb }];
const scs = payoff.summary(sc);
const sps = payoff.summary(sp);
const pBelow = (x) => bs.probITM({ S: 100, K: x, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, x, T), type: 'put' });
const pAbove = (x) => bs.probITM({ S: 100, K: x, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, x, T), type: 'call' });
const winPut = 1 - pBelow(sps.breakevens[0]);
const winCall = 1 - pAbove(scs.breakevens[0]);
const reqCall = Math.max(cb * 100 + 0.2 * 100 * 100 - (105 - 100) * 100, cb * 100 + 0.1 * 100 * 100);
const reqPut = Math.max(pb * 100 + 0.2 * 100 * 100 - (100 - 95) * 100, pb * 100 + 0.1 * 95 * 100);
```

Every option you can buy, someone has written. The writer collects the premium up front and takes on the obligation. The payoff diagrams are exact mirror images of the long positions in the previous Lesson: flip the line upside down across the zero axis. What changes completely is how the position feels and where the danger lies. A writer wins often and small, and occasionally loses large.

## The short call

Writing a call means selling to open: you receive the premium and must sell 100 shares at the strike if assigned. You profit if the stock stays below the strike, or rises only a little above it.

:::example Short one ACME December 105 call
ACME is at $100. You sell one December 105 call at the bid, {{ usd(cb) }}, and receive {{ usd(cb * 100) }}.

- **Max profit**: the premium, **{{ usd(scs.maxProfit) }}**, kept in full if ACME finishes at or below $105.
- **Break-even**: strike + premium = **{{ usd(scs.breakevens[0]) }}**.
- **Max loss**: **unlimited** in principle. Above the break-even you lose $100 for every $1 ACME rises, with no ceiling.

At $110 you lose {{ usd(-payoff.pnlAtExpiry(sc, 110)) }}. If ACME jumps to $130 on a takeover bid, you lose {{ usd(-payoff.pnlAtExpiry(sc, 130)) }}, about {{ num(-payoff.pnlAtExpiry(sc, 130) / (cb * 100), 0) }} times what you collected.
:::

For a short call with strike \(K\) sold for \(c\): max profit \(100c\), break-even \(K + c\), max loss unlimited.

These numbers are for expiration, but ACME options are American-style, so a writer can be assigned on any business day before then, most often when the option is deep in the money or, for a call, just before an ex-dividend date. [Exercise, assignment and expiration](#core-07) covers when that happens.

## The short put

Writing a put means you must buy 100 shares at the strike if assigned. You profit if the stock stays above the strike, or falls only a little below it.

:::example Short one ACME December 95 put
You sell one December 95 put at the bid, {{ usd(pb) }}, and receive {{ usd(pb * 100) }}.

- **Max profit**: **{{ usd(sps.maxProfit) }}**, kept if ACME finishes at or above $95.
- **Break-even**: strike − premium = **{{ usd(sps.breakevens[0]) }}**.
- **Max loss**: **{{ usd(-sps.maxLoss) }}**, if ACME goes to zero: you pay {{ usd(95 * 100, 0) }} for worthless shares, less the premium.

A fall to $85 costs {{ usd(-payoff.pnlAtExpiry(sp, 85)) }}. A collapse to $70 after bad news costs {{ usd(-payoff.pnlAtExpiry(sp, 70)) }}, about {{ num(-payoff.pnlAtExpiry(sp, 70) / (pb * 100), 0) }} times the premium.
:::

For a short put with strike \(K\) sold for \(p\): max profit \(100p\), break-even \(K - p\), max loss \(100(K - p)\).

A short put has the same shape of risk as owning the stock below the strike, with the upside capped at the premium. That is why many investors write puts on stocks they would be happy to own at the strike; [Income and hedging strategies](#core-09) develops this as the cash-secured put.

## Winning often, losing big

The market-implied chance that ACME finishes above the short put's break-even of {{ usd(sps.breakevens[0]) }} is about {{ pct(winPut, 0) }}; for the short call, the chance of finishing below {{ usd(scs.breakevens[0]) }} is about {{ pct(winCall, 0) }}. Most of the time, writers of out-of-the-money options keep money.

That high win rate is exactly what makes writing dangerous to do carelessly. The gains are capped at a small premium; the losses, when they come, are many times larger and tend to arrive suddenly, through earnings surprises, takeovers or market crashes, often as overnight gaps that give no chance to get out at the break-even. A writer who collects {{ usd(pb * 100) }} a month for a year can give all of it back, and more, in one bad month.

:::warning Size short options by the loss, not the premium
Before writing an option, look at the loss at a realistic bad outcome (a 20% or 30% gap), not at the premium you will collect. If that loss would be unacceptable, the position is too big, however likely it is to expire worthless.
:::

## Naked, defined and undefined risk

A short option that is not offset by another position is a [[naked option]] (or *uncovered*). A short call is "covered" if you own the shares you would have to deliver, which turns it into a covered call; a short put is "cash-secured" if you hold the cash to buy the shares. Both are covered in [Income and hedging strategies](#core-09).

Traders sort positions into two kinds:

- **[[Defined risk]]**: the maximum loss is capped by options you own, so it is known when you open the trade and small relative to the stock exposure. Every long option is defined risk, and so is any combination in which every short option is protected by a long one, such as the spreads in [Directional spreads](#core-10).
- **[[Undefined risk]]**: no option you own caps the loss. A naked short call is the classic example: its loss has no ceiling at all. A naked short put is undefined risk too. Its worst case is finite, the strike minus the premium, {{ usd(-sps.maxLoss) }} for the December 95 put, but that is about {{ num(-sps.maxLoss / (pb * 100), 0) }} times the premium you collect and about {{ num(-sps.maxLoss / reqPut, 0) }} times the minimum margin below, and nothing in the position limits it.

Brokers treat the two very differently.

:::rule Writing uncovered options (as of 2026)
Under FINRA Rule 2360, a broker must approve each customer's account before it can trade options, and most brokers use tiered approval levels. Writing uncovered (naked) options, especially calls, generally requires the highest level and a margin account, and the broker must give the customer a special written statement describing the risks of uncovered writing. Uncovered short options carry margin requirements. The standard exchange and FINRA minimum for an uncovered equity option is the premium received plus 20% of the underlying's value, minus any out-of-the-money amount, but not less than the premium plus 10% of the underlying's value (for calls) or of the strike (for puts). Brokers often require more, and can raise requirements or close positions without notice when the market moves.
:::

Under that minimum formula, writing the December 95 put would tie up about {{ usd(reqPut, 0) }}, and the December 105 call about {{ usd(reqCall, 0) }}. Both requirements rise as the stock moves against you, which can force you to add cash or close at the worst moment. [Accounts and orders](#core-08) covers margin in detail.

## Try it

The builder below shows the short December 95 put. Read the max profit, max loss and break-even from the summary. Then flip the quantity to +1 and watch the diagram turn upside down into the long put; or change the leg to a call and see the loss on the right side become unlimited.

```tool position-builder
{ title: 'Short one ACME December 95 put', legs: [{ kind: 'put', qty: -1, strike: 95, premium: pb, dte: 30, iv: row(95).put.iv }], range: [65, 125], showToday: false }
```

:::key
A writer's diagram is the holder's turned upside down: maximum profit is the premium, the break-even is the strike plus (call) or minus (put) the premium, and the loss beyond it grows $100 per $1. Naked short options are undefined risk: a naked short call's loss is unlimited, and a naked short put's is finite but many times the premium. Writers win often and lose big, so size by the bad case, not the premium.
:::

```quiz
- q: >-
    You sell one ACME December 105 call at {{ usd(cb) }}. ACME finishes at $108. What is your P&L?
  choices:
    - >-
      {{ signedUsd(cb * 100) }}
    - >-
      {{ signedUsd(payoff.pnlAtExpiry(sc, 108)) }}
    - >-
      {{ signedUsd(-300) }}
  answer: 1
  explain: >-
    The call is $3 in the money, so it costs you $300 to settle (deliver shares worth $108 at $105), offset by the {{ usd(cb * 100) }} you collected: {{ signedUsd(payoff.pnlAtExpiry(sc, 108)) }}. Keeping the full premium needs ACME at or below $105. −$300 forgets the premium you received.
- q: >-
    Which of these positions has unlimited risk?
  choices:
    - >-
      Long one December 100 put
    - >-
      Short one December 95 put
    - >-
      Short one December 105 call with no shares owned
    - >-
      Long one December 105 call
  answer: 2
  explain: >-
    A naked short call obliges you to deliver shares at $105 however high ACME goes, so the loss has no ceiling. The naked short put is also undefined risk, because no option you own caps it, but its loss is finite: at most {{ usd(-sps.maxLoss) }}, because ACME cannot fall below zero. Long options can lose only their premium.
- q: >-
    You sell one ACME December 95 put at {{ usd(pb) }}. Where is your break-even at expiration?
  choices:
    - >-
      {{ usd(95 + pb) }}
    - >-
      {{ usd(sps.breakevens[0]) }}
    - >-
      $95.00
  answer: 1
  explain: >-
    Below $95 you lose $100 for every $1 ACME falls, and the {{ usd(pb * 100) }} premium covers the first {{ usd(pb) }} of that: break-even is $95 − {{ usd(pb) }} = {{ usd(sps.breakevens[0]) }}. Adding the premium is the call writer's formula. At $95 itself you still keep the whole premium.
- q: >-
    A trader has sold out-of-the-money puts every month for a year and kept the premium each time. What does that record tell you about the strategy's risk?
  choices:
    - >-
      Very little: the strategy is designed to win often, and its losses are rare but large
    - >-
      The strategy is safe, because it has never lost
    - >-
      The trader has found options that are always overpriced
  answer: 0
  explain: >-
    A short out-of-the-money put is expected to expire worthless most months; that is how it is built. The risk is in the rare month when the stock gaps far below the strike, which can wipe out a year of premiums at once. A run of wins is what this strategy looks like right up until the loss, so it says little about whether the risk is well sized.
```
