---
title: Bid, ask, mid and last
summary: Read the bid, ask, midpoint and last price correctly, measure the bid-ask spread as a percentage of the option's value, and count it as a real cost of every trade.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const m = (x) => usd(x, Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? 2 : 3);
const spr = (o) => o.ask - o.bid;
const sprPct = (o) => (o.ask - o.bid) / o.mid;
const c105 = row(105).call;
const c115 = row(115).call;
const tbl = [70, 85, 95, 100, 105, 110, 115, 120, 125].map((k) => {
  const o = row(k).call;
  return `| $${k} | ${usd(o.bid)} | ${usd(o.ask)} | ${m(o.mid)} | ${usd(spr(o))} | ${pct(sprPct(o))} |`;
}).join('\n');
// an earlier trade in the 110 call, printed when ACME was at $101
const lastPx = Number(bs.price({ S: 101, K: 110, T: 30 / 365, r: RATE, q: ACME.q, sigma: smileIV(ACME, 110, 30 / 365), type: 'call' }).toFixed(2));
const c110 = row(110).call;
const last105 = Number(bs.price({ S: 101, K: 105, T: 30 / 365, r: RATE, q: ACME.q, sigma: smileIV(ACME, 105, 30 / 365), type: 'call' }).toFixed(2));
const n = 10;
const rt105 = spr(c105) * 100 * n;
const rt115 = spr(c115) * 100 * n;
```

On a stock like ACME the gap between what buyers pay and what sellers receive is usually a cent on a $100 share, so small that most stock traders never think about it. On options it is often the biggest cost you pay, bigger than commissions, and it varies enormously from one contract to the next. This Lesson is about seeing that cost before you trade.

## Four prices for one option

Every row of a chain shows several prices for the same contract. They mean different things.

- **[[Bid]]**: the highest price anyone is currently willing to pay. If you sell right now, at market, this is what you get.
- **[[Ask]]** (or *offer*): the lowest price anyone is currently willing to sell at. If you buy right now, this is what you pay.
- **[[Mid price]]** (the *mid* or *midpoint*): halfway between the bid and the ask. Nobody is quoting it; it is a reference point, the best simple estimate of what the option is worth right now.
- **[[Last price]]**: the price of the most recent trade, which may have happened seconds ago or yesterday.

The gap between bid and ask is the [[bid-ask spread]]. The bids and asks on a listed option come mostly from market makers, firms that quote both sides all day and earn the spread in exchange for taking the other side of whatever customers want to do.

:::rule Where the quote comes from (as of 2026)
The bid and ask your broker shows are normally the national best bid and offer: the best prices across all US options exchanges, which list the same OCC-cleared contracts. Under the industry's options order protection plan, an exchange generally may not execute an order at a price worse than a better price displayed on another exchange. Brokers owe customers best execution under FINRA rules, which means seeking the most favorable terms reasonably available, not just the displayed quote.
:::

## The last price can mislead you

Volume in any single option can be thin, so the last trade is often stale. Never use it as the price of the option.

:::example A stale last price
Early in the morning, when ACME was at $101, someone bought the December 110 call at {{ usd(lastPx) }}. ACME has since slipped back to $100. The chain still shows "Last {{ usd(lastPx) }}" because nobody has traded the 110 call since.

The live market is bid {{ usd(c110.bid) }}, ask {{ usd(c110.ask) }}. A seller who expects {{ usd(lastPx) }} because that is the "price" is {{ usd(lastPx - c110.bid) }} a share, {{ usd((lastPx - c110.bid) * 100) }} a contract, away from any buyer. Only the bid and ask tell you what you can trade at now.
:::

The same trap affects the "change" column, which compares the last price with yesterday's close: an option that has not traded today can show a large change, or none, that has nothing to do with where it is quoted.

## The spread is a cost

If you buy at the ask and immediately sell at the bid, you lose the spread. That round trip is the cost of getting in and out quickly, and you pay part of it on every trade you do not work patiently.

:::example The round-trip cost of ten contracts
ACME is at $100. You buy ten December 105 calls at the ask, {{ usd(c105.ask) }}, and a minute later change your mind and sell them at the bid, {{ usd(c105.bid) }}. Nothing has moved.

Your loss: ({{ usd(c105.ask) }} − {{ usd(c105.bid) }}) × 100 × 10 = **{{ usd(rt105) }}**.

Do the same with ten December 115 calls (bid {{ usd(c115.bid) }}, ask {{ usd(c115.ask) }}) and you lose {{ usd(rt115) }}. That is a smaller dollar figure, but you spent only {{ usd(c115.ask * 1000) }} to begin with, so you lost {{ pct(rt115 / (c115.ask * 1000), 0) }} of your money.

For comparison, buying and selling 1,000 ACME shares across a one-cent spread would cost {{ usd(0.01 * 1000) }}.
:::

This is why the useful measure is the spread **as a percentage of the mid**:

\[ \text{spread \%} = \frac{\text{ask} - \text{bid} }{ \text{mid} } \]

It tells you how much of the option's value you give up by crossing the full spread. Here are the December ACME calls:

| Strike | Bid | Ask | Mid | Spread | Spread % of mid |
|---|---|---|---|---|---|
{{ tbl }}

Two patterns:

- **In dollars**, the deep in-the-money 70 call has the widest spread, {{ usd(spr(row(70).call)) }}. Expensive options carry more dollars of risk per contract, so market makers quote them wider.
- **In percent**, the cheap out-of-the-money options are far worse. The 100 call's spread is {{ pct(sprPct(row(100).call)) }} of its value; the 115 call's is {{ pct(sprPct(c115)) }}; the 125 call has no bid at all, so you could buy it but could not sell it back to anyone. Prices move in minimum increments (a cent for low-priced options in most active names), so a spread cannot shrink below a tick or two however cheap the option gets.

A useful rule of thumb: if the spread is more than a few percent of the mid, you need the option to move that much in your favor just to get back to even after a round trip.

## Why some strikes are wide

A market maker who sells you an option takes on risk and usually hedges it with stock right away. Their spread pays for that risk and for the chance that you know something they do not. It widens when:

- **Little trades there.** Few buyers and sellers mean the market maker may hold the position a long time before laying it off. Strikes far from the money and expirations far in the future trade least.
- **The underlying itself is illiquid** or has a wide stock spread, which makes hedging costly.
- **Uncertainty is high**: right after the open, ahead of earnings, or during a fast market, quotes widen everywhere.
- **The option is expensive in dollars**, as with the deep in-the-money strikes.

All of this comes down to [[liquidity]]: how easily and cheaply you can trade a contract in reasonable size without moving its price. Tight spreads, steady volume and high open interest go together. [Choosing a contract and pricing the order](#core-02-choosing-and-ordering) turns this into a checklist.

:::warning Your position starts in the red
Brokers usually value your options at the mid (some use the last price). Buy at the ask and your account immediately shows a loss of about half the spread, before anything has moved. That is not a glitch; it is the cost you paid to trade, made visible. On wide-spread options it can be a large share of the premium.
:::

```tool chain
{ underlying: 'ACME', dte: 30, view: 'quote', highlight: [{ strike: 105, type: 'call' }, { strike: 115, type: 'call' }] }
```

Use the chain above to compare spreads. Switch to the 2-day and 394-day expirations and see how the spreads change as a percentage of each option's price.

:::key
Buy at the ask, sell at the bid; the mid is a reference, and the last price is history. The bid-ask spread is a real cost on every trade, best measured as a percentage of the mid. Cheap, far out-of-the-money and rarely traded options carry the highest percentage spreads.
:::

```quiz
- q: >-
    The ACME December 105 call is bid {{ usd(c105.bid) }}, ask {{ usd(c105.ask) }}, last {{ usd(last105) }} (a trade from earlier, when ACME was at $101). You want to sell one immediately. What do you get?
  choices:
    - >-
      {{ usd(c105.ask * 100) }}
    - >-
      {{ usd(c105.bid * 100) }}
    - >-
      {{ usd(last105 * 100) }}
    - >-
      {{ usd(c105.mid * 100) }}
  answer: 1
  explain: >-
    A sale at market fills at the best bid, {{ usd(c105.bid) }}, or {{ usd(c105.bid * 100) }} per contract. The ask is what buyers pay. The last price is an old trade and guarantees nothing. The mid is a fair-value reference you might get with a patient limit order, but not with an immediate sale.
- q: >-
    An option is bid $0.40, ask $0.50. What is its spread as a percentage of the mid?
  choices:
    - >-
      {{ pct(0.10 / 0.50) }}
    - >-
      {{ pct(0.10 / 0.45) }}
    - >-
      {{ pct(0.10 / 0.40) }}
    - >-
      {{ pct(0.10) }}
  answer: 1
  explain: >-
    The mid is ($0.40 + $0.50) / 2 = $0.45 and the spread is $0.10, so the spread is $0.10 / $0.45 = {{ pct(0.10 / 0.45) }} of the mid. Dividing by the ask or the bid gives a different, less standard figure. {{ pct(0.10) }} confuses the spread in dollars with a percentage.
- q: >-
    Which December ACME call has the largest spread as a percentage of its mid?
  choices:
    - >-
      The 70 call, with a {{ usd(spr(row(70).call)) }} spread
    - >-
      The 100 call
    - >-
      The 120 call
  answer: 2
  explain: >-
    The 120 call's spread is {{ usd(spr(row(120).call)) }} on a mid of {{ m(row(120).call.mid) }}, {{ pct(sprPct(row(120).call), 0) }}. The 70 call has the biggest spread in dollars, but on a {{ m(row(70).call.mid) }} option that is only {{ pct(sprPct(row(70).call)) }}. Cheap out-of-the-money options cannot be quoted tighter than a tick or two, so their percentage spreads are the largest.
- q: >-
    You buy one December 100 call at the ask, {{ usd(row(100).call.ask) }}. A second later your broker shows the position at {{ signedUsd((row(100).call.mid - row(100).call.ask) * 100) }}. What happened?
  choices:
    - >-
      ACME fell
    - >-
      The broker marks the position at the mid, and you paid half the spread above it
    - >-
      You were charged a fee equal to the spread
  answer: 1
  explain: >-
    You paid {{ usd(row(100).call.ask) }}; the broker values the call at the mid, {{ m(row(100).call.mid) }}. The difference, half the {{ usd(spr(row(100).call)) }} spread, times 100, is the {{ usd((row(100).call.ask - row(100).call.mid) * 100) }} shown. Nothing moved and no fee was charged; it is the cost of buying at the ask, made visible.
```
