---
title: Combining positions
summary: Add up the P&L of several legs at each stock price to get the payoff of any combination, and predict its shape from the slopes of its parts.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const stock = { kind: 'stock', qty: 100, price: 100 };
const put95 = { kind: 'put', qty: 1, strike: 95, premium: row(95).put.ask };
const pp = [stock, put95];
const pps = payoff.summary(pp);
const one = (leg, s) => payoff.pnlAtExpiry([leg], s);
const ppTbl = [80, 90, 95, 100, 110, 120].map((s) => `| $${s} | ${signedUsd(one(stock, s), 0)} | ${signedUsd(one(put95, s))} | **${signedUsd(payoff.pnlAtExpiry(pp, s))}** |`).join('\n');
const longC = { kind: 'call', qty: 1, strike: 100, premium: row(100).call.ask };
const shortC = { kind: 'call', qty: -1, strike: 110, premium: row(110).call.bid };
const bcs = [longC, shortC];
const bs_ = payoff.summary(bcs);
const bcTbl = [90, 100, 105, 110, 120].map((s) => `| $${s} | ${signedUsd(one(longC, s))} | ${signedUsd(one(shortC, s))} | **${signedUsd(payoff.pnlAtExpiry(bcs, s))}** |`).join('\n');
const shortP = { kind: 'put', qty: -1, strike: 100, premium: row(100).put.bid };
const syn = [longC, shortP];
const syns = payoff.summary(syn);
```

Real positions often have more than one part: shares plus an option, or two or more options together. Each part is a leg. The good news is that you never need a new formula for a combination. At expiration, the P&L of the whole position at any stock price is simply the sum of the P&L of each leg at that price. If you can draw one leg, you can draw anything.

## Adding legs, price by price

:::example Shares plus a put: the protective put
You own 100 ACME shares bought at $100 and buy one December 95 put at {{ usd(put95.premium) }} as insurance. Here is each leg's P&L at expiration, and the total:

| ACME at expiration | 100 shares | Long 95 put | Total |
|---|---|---|---|
{{ ppTbl }}

Below $95, each dollar the shares lose is made back by the put, so the total stops falling: the worst case is **{{ usd(pps.maxLoss) }}**, the $5 between $100 and the strike plus the {{ usd(put95.premium) }} premium, times 100. Above $95 the put is worthless and the total is just the shares minus the premium. Profit is unlimited, and the position breaks even at **{{ usd(pps.breakevens[0]) }}**, the purchase price plus the premium.
:::

That combination, the protective put, turns open-ended stock risk into a defined maximum loss. It gets a full Lesson in [Income and hedging strategies](#core-09).

## Predicting the shape from slopes

Rather than computing a whole table, you can sketch the shape first using the slope rules from [Reading and drawing a payoff diagram](#core-03-payoff-diagrams). In each region between strikes, the slope of the total is the sum of the slopes of the legs.

For the protective put:

- **Below $95**: shares +$100 per $1, long put −$100 per $1. Total: **0**. Flat.
- **Above $95**: shares +$100, put 0. Total: **+$100**. Rising like the stock.

Then you need just one number to pin the line in place, such as the P&L at the strike, and the picture is complete.

:::example Two calls: the bull call spread
You buy the December 100 call at {{ usd(longC.premium) }} and sell the December 110 call at {{ usd(shortC.premium) }}. You pay {{ usd(longC.premium) }} and collect {{ usd(shortC.premium) }}, a net cost of **{{ usd(bs_.netPremium) }}**.

Slopes first:

- below $100: neither call is in the money, slope **0**;
- between $100 and $110: the long call adds +$100, slope **+$100**;
- above $110: +$100 from the long call, −$100 from the short call, slope **0**.

So the shape is flat, rising, flat. Now the numbers:

| ACME at expiration | Long 100 call | Short 110 call | Total |
|---|---|---|---|
{{ bcTbl }}

Maximum loss is the net cost, **{{ usd(-bs_.maxLoss) }}**, at or below $100. Maximum profit is the $10 between the strikes less the net cost, times 100: **{{ usd(bs_.maxProfit) }}**, at or above $110. Break-even is **{{ usd(bs_.breakevens[0]) }}**, the lower strike plus the net cost.
:::

Compared with the 100 call alone, selling the 110 call cut the cost from {{ usd(longC.premium * 100) }} to {{ usd(bs_.netPremium) }} and moved the break-even from {{ usd(100 + longC.premium) }} down to {{ usd(bs_.breakevens[0]) }}. The price was giving up everything above $110. This is a vertical spread, the subject of [Directional spreads](#core-10), and the short call in it is not naked: the long 100 call covers it at every price.

## A surprising combination

:::example Long a call, short a put, same strike
Buy the December 100 call at {{ usd(longC.premium) }} and sell the December 100 put at {{ usd(shortP.premium) }}. Net cost: {{ usd(syns.netPremium) }}.

Slopes: below $100, the short put contributes +$100 and the call nothing; above $100, the long call contributes +$100 and the put nothing. The slope is **+$100 everywhere**, a straight line with no kink, exactly like 100 shares of stock.

The line crosses zero at **{{ usd(syns.breakevens[0]) }}**. At $110 it makes {{ signedUsd(payoff.pnlAtExpiry(syn, 110)) }}; at $90 it loses {{ usd(-payoff.pnlAtExpiry(syn, 90)) }}. It behaves like owning 100 shares bought at {{ usd(syns.breakevens[0]) }}, for a small net premium instead of {{ usd(10000) }}.
:::

That is a synthetic long stock, a [[synthetic position]]. The fact that a call, a put and the stock can be combined to replicate each other is called [[put-call parity]], and it is the backbone of option pricing; [What drives an option's price](#core-04) explains it. The synthetic is not free stock: the short put still carries all the downside risk of owning shares, and it needs margin.

## Rules for combinations

- **P&L adds, at every price.** Value each leg at expiration, subtract or add its premium, multiply by its quantity and 100, and sum.
- **Premiums net.** Pay for some legs, collect for others; the net is a debit (you pay) or a credit (you receive). Your maximum profit and loss both include it.
- **Slopes add.** Sum each leg's slope region by region to get the shape before you compute anything.
- **Short legs can be covered by long ones.** A short call's unlimited risk is capped by owning the shares or by a long call that expires no earlier: at a lower strike the long call covers it completely, at a higher strike it limits the loss to the gap between the strikes. Check every short leg: if any region slopes downward without limit, the position has undefined risk.

:::practice Trade combinations as one order
Legs that belong together should be entered as a single multi-leg order with a net limit price. Entering them one at a time ("legging in") exposes you to the stock moving between fills, and can leave you holding a naked short leg if the second order never fills. [Accounts and orders](#core-08) shows how complex orders work.
:::

## Try it

The builder below holds the 100/110 bull call spread. Change the short strike to 105 or 115 and watch the trade-off between the cost and the maximum profit. Then delete the short call and add a short put at 100 to recreate the synthetic stock.

```tool position-builder
{ title: 'ACME December 100/110 bull call spread', legs: [{ kind: 'call', qty: 1, strike: 100, premium: longC.premium, dte: 30, iv: row(100).call.iv }, { kind: 'call', qty: -1, strike: 110, premium: shortC.premium, dte: 30, iv: row(110).call.iv }], range: [85, 125], showToday: false }
```

:::key
The P&L of a combination at expiration is the sum of its legs' P&L at each price, and the slope of its diagram in each region is the sum of the legs' slopes. Sketch the shape from slopes, then pin it with one or two computed values. Check every short leg for cover: a region that slopes down without limit means undefined risk.
:::

```quiz
- q: >-
    You own 100 ACME shares at $100 and the protective December 95 put bought at {{ usd(put95.premium) }}. What is the total P&L if ACME finishes at $85?
  choices:
    - >-
      {{ signedUsd(-1500) }}
    - >-
      {{ signedUsd(payoff.pnlAtExpiry(pp, 85)) }}
    - >-
      {{ signedUsd(-put95.premium * 100) }}
  answer: 1
  explain: >-
    The shares lose $1,500, and the put is worth $95 − $85 = $10 a share, $1,000, against its {{ usd(put95.premium * 100) }} cost, a gain of {{ usd(one(put95, 85)) }}. Together: {{ signedUsd(payoff.pnlAtExpiry(pp, 85)) }}, the same as at any price below $95. −$1,500 ignores the put; losing only the premium would mean the put also covered the $5 between $100 and $95, which it does not.
- q: >-
    A position is long one 100 call and short two 110 calls. What is the slope of its P&L above $110?
  choices:
    - >-
      +$100 per $1
    - >-
      $0 per $1
    - >-
      −$100 per $1
  answer: 2
  explain: >-
    Above $110: +$100 from the long call and 2 × −$100 from the short calls, −$100 in total. The line falls without limit as ACME rises, so the position has undefined risk: one of the short calls is uncovered. $0 would be the result with only one short call.
- q: >-
    You buy the December 100 call at {{ usd(longC.premium) }} and sell the December 110 call at {{ usd(shortC.premium) }}. What is the maximum profit at expiration?
  choices:
    - >-
      {{ usd(1000) }}
    - >-
      {{ usd(bs_.maxProfit) }}
    - >-
      Unlimited
  answer: 1
  explain: >-
    At or above $110 the spread is worth the $10 between the strikes, {{ usd(1000) }}, and you paid a net {{ usd(bs_.netPremium) }}, so the most you make is {{ usd(bs_.maxProfit) }}. Above $110 the short call's losses cancel the long call's gains, so profit is not unlimited.
- q: >-
    Which combination behaves at expiration like 100 shares of ACME?
  choices:
    - >-
      Long the 100 call and long the 100 put
    - >-
      Long the 100 call and short the 100 put
    - >-
      Short the 100 call and long the 100 put
  answer: 1
  explain: >-
    Long call plus short put has a slope of +$100 on both sides of the strike, a straight line like stock, crossing zero near $100 plus the small net premium. Long call plus long put gains as ACME moves away from the strike in either direction, a V shape: that is a [[straddle]], which profits from a big move either way. Short call plus long put is the mirror image, a synthetic short stock.
```
