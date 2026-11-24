---
title: Spread orders, fills and the real cost of a trade
summary: Enter multi-leg trades as a single order at a net price, measure every fill against the mid, and add up the full round-trip cost of an options trade before you place it.
---

```calc
const q30 = chain(ACME, { dte: 30 });
const row = (k) => q30.rows.find((r) => r.strike === k);
const c100 = row(100).call;
const c105 = row(105).call;
const natural = c100.ask - c105.bid;
const midDebit = c100.mid - c105.mid;
const limit = Number((Math.ceil(midDebit * 100) / 100).toFixed(2));
const q99 = chain(ACME, { dte: 30, spot: 99 });
const c105at99 = q99.rows.find((r) => r.strike === 105).call;
const legged = c100.ask - c105at99.bid;
const legCost = (legged - limit) * 100;
const n = 10;
const spreadRT = (c100.ask - c100.bid) * 100 * n;
const comm = 0.65;
const fee = 0.05;
const commRT = comm * n * 2;
const feeRT = fee * n * 2;
const allIn = spreadRT + commRT + feeRT;
const premium = c100.mid * 100 * n;
const beMove = allIn / (c100.delta * 100 * n);
const midRT = commRT + feeRT;
const improve = 0.02;
const piFill = Number((c105.ask - improve).toFixed(2));
const piSlip = piFill - c105.mid;
```

Two traders can make the same trade on the same day and end up with results that differ by several percent, purely because of how they entered it. This Lesson covers multi-leg orders, how to judge a fill, and every cost between your idea and your account statement.

## Spreads go in as one order

A spread has two or more legs, but you should almost never trade them separately. Brokers and exchanges accept a [[complex order]]: all the legs together, at a single net price (a net debit you pay or a net credit you receive). Either every leg fills at a combination that meets your net price, or nothing fills.

:::example Entering the December 100/105 call spread
You want to buy the ACME December 100 call ({{ usd(c100.bid) }} by {{ usd(c100.ask) }}) and sell the December 105 call ({{ usd(c105.bid) }} by {{ usd(c105.ask) }}), a [[bull call spread]].

- **Natural price:** pay the ask on the 100 call and receive the bid on the 105: {{ usd(c100.ask) }} − {{ usd(c105.bid) }} = **{{ usd(natural) }}** debit. This is what two market orders would cost.
- **Mid price:** {{ usd(c100.mid) }} − {{ usd(c105.mid, 3) }} = **{{ usd(midDebit, 3) }}**.

Enter one order: buy 1 December 100/105 call spread, limit {{ usd(limit) }} debit. If it does not fill, raise it in small steps toward the natural price. Complex orders often fill between the mid and the natural, because market makers can hedge the combined position more cheaply than the legs alone.
:::

Exchanges run separate books and auctions for complex orders, so your spread order can trade against another spread order or against the individual legs' quotes. Brokers display a net bid and ask for the spread; use it the same way as a single option's quote.

## Legging and legging risk

[[Legging]] means entering the legs as separate orders, for example buying the call first and selling the other call later. Traders leg in hoping to get a better net price by timing each leg. The risk is that the market moves between the legs.

:::example Legging into the call spread goes wrong
You buy the December 100 call at {{ usd(c100.ask) }}, planning to sell the 105 call a few minutes later. Before you do, ACME drops to $99. The December 105 call is now bid only {{ usd(c105at99.bid) }}.

Selling it there completes the spread at a net debit of {{ usd(c100.ask) }} − {{ usd(c105at99.bid) }} = **{{ usd(legged) }}**, against the {{ usd(limit) }} you could have entered as one order: {{ usd(legCost) }} worse per spread. If ACME had risen instead, legging would have helped. That is the point: legging turns a spread trade into a short-term bet on direction, made with the wrong tool.
:::

Legging is sometimes necessary: a broker that does not support a particular combination, or closing one leg of a spread that has become nearly worthless (buying back a short option at $0.05 to remove its risk, while keeping the long). When you leg, do the risk-reducing leg first: buy back the short before selling the long, never the other way round, so that at no moment do you hold an unprotected short option.

## Fills, price improvement and slippage

A [[fill]] is an execution: the price and quantity you actually got. Judge every fill against the mid price at the moment you sent the order, not against the ask.

- **[[Slippage]]** is the difference between your fill and the mid (for a buy, fill minus mid; for a sell, mid minus fill). Paying the ask on the December 100 call is {{ usd(c100.ask - c100.mid) }} of slippage per share, {{ usd((c100.ask - c100.mid) * 100) }} per contract.
- **Price improvement** is a fill better than the quoted bid or ask. Many retail option orders are routed to market makers or to exchange auctions that can fill inside the quote, in penny increments. If you buy the December 105 call at {{ usd(piFill) }} with the quote at {{ usd(c105.bid) }} by {{ usd(c105.ask) }}, you received {{ usd(improve) }} of price improvement, but still paid {{ usd(piSlip, 3) }} above the {{ usd(c105.mid, 3) }} mid.

Brokers advertise price improvement. Slippage against the mid is the more honest measure: it tells you what you paid to trade. Keep a record of both for your own trades; it is the only way to know whether your order handling is good.

:::rule Execution quality and fees (as of 2026)
- Brokers must seek the best execution reasonably available for customer orders (FINRA Rule 5310), and publish quarterly reports on where they route customer orders, including any payment for order flow they receive from market makers (SEC Rule 606).
- Beyond the broker's commission, option trades carry small per-trade charges that brokers typically pass through: an Options Regulatory Fee charged by the options exchanges per contract, an OCC clearing fee per contract, and on sales the SEC's Section 31 transaction fee (a rate on the dollar value sold, reset by the SEC at least once a year) and FINRA's Trading Activity Fee. Each is usually a few cents or less per contract; the rates change, and your trade confirmation lists the amounts actually charged.
- Commissions are set by each broker: some charge per contract, some per order, some nothing on the commission line. Some charge fees for exercise and assignment.
:::

## The real cost of a round trip

Add it all up before trading. A round trip means opening and later closing the position.

:::example Ten December 100 calls, in and out
You buy {{ int(n) }} ACME December 100 calls and later sell them. Assume the quote is unchanged at {{ usd(c100.bid) }} by {{ usd(c100.ask) }}, so you can see the costs on their own. For illustration, assume {{ usd(comm) }} commission per contract and {{ usd(fee) }} per contract of pass-through fees, on each side; check your broker's actual schedule.

With market orders (buy at the ask, sell at the bid):

| Cost | Amount |
|---|---|
| Bid-ask spread, both ways | {{ usd(spreadRT) }} |
| Commissions, {{ int(n * 2) }} contracts | {{ usd(commRT) }} |
| Fees, {{ int(n * 2) }} contracts | {{ usd(feeRT) }} |
| **Total** | **{{ usd(allIn) }}** |

That is {{ pct(allIn / premium) }} of the {{ usd(premium) }} position. With a delta of about {{ num(c100.delta) }}, ACME has to rise about {{ usd(beMove) }} just to pay for the round trip.

If both orders fill at the mid, the total falls to {{ usd(midRT) }}. The spread, not the commission, is the cost that matters, and order handling is the only way to cut it.
:::

A spread doubles the legs, so it doubles commissions and crosses two bid-ask spreads each way. An iron condor has four legs, so a round trip is eight option executions. This is why multi-leg strategies on illiquid options can cost more to trade than they can reasonably earn, and why traders prefer to let spreads expire worthless, when that is safe, rather than pay to close them.

The chain below highlights the two legs of the December 100/105 call spread. Read the bid and ask of each and work out the natural and mid prices yourself.

```tool chain
{ underlying: 'ACME', dte: 30, view: 'quote', highlight: [{ strike: 100, type: 'call' }, { strike: 105, type: 'call' }] }
```

:::key
Enter spreads as one complex order at a net limit price, starting near the mid; legging adds directional risk, and if you must leg, close the short leg first. Measure fills as slippage against the mid. A round trip's real cost is the bid-ask spread both ways plus commissions and small pass-through fees per contract; on most trades the spread is the largest part, so limit orders near the mid save more than any commission discount.
:::

```quiz
- q: >-
    The December 100 call is {{ usd(c100.bid) }} by {{ usd(c100.ask) }} and the December 105 call is {{ usd(c105.bid) }} by {{ usd(c105.ask) }}. What is the natural debit for the 100/105 call spread?
  choices:
    - >-
      {{ usd(natural) }}
    - >-
      {{ usd(midDebit, 3) }}
    - >-
      {{ usd(c100.ask - c105.ask) }}
  answer: 0
  explain: >-
    The natural price crosses both spreads: pay the ask on the call you buy ({{ usd(c100.ask) }}) and receive the bid on the call you sell ({{ usd(c105.bid) }}), a {{ usd(natural) }} debit. {{ usd(midDebit, 3) }} is the mid, where you would start your limit order. Using the ask on the leg you sell assumes you receive more than anyone is bidding.
- q: >-
    You buy the December 100 call at {{ usd(c100.ask) }} and plan to sell the 105 call next. ACME drops to $99 and the 105 call is bid {{ usd(c105at99.bid) }}. What has legging cost you compared with a single order at {{ usd(limit) }}?
  choices:
    - >-
      Nothing; the spread is the same
    - >-
      {{ usd(legCost) }} per spread
    - >-
      {{ usd(c105.bid * 100) }} per spread
  answer: 1
  explain: >-
    Completing now gives a net debit of {{ usd(legged) }}, {{ usd(legCost) }} worse per spread than the single order. The strikes are the same, but the price is not: the move between the legs is a directional bet you did not intend. {{ usd(c105.bid * 100) }} is the 105 call's original bid value, not the cost of legging.
- q: >-
    You buy the December 105 call at {{ usd(piFill) }} while it is quoted {{ usd(c105.bid) }} by {{ usd(c105.ask) }}. Your confirmation says you received price improvement. What was your slippage against the mid?
  choices:
    - >-
      None, because you were price-improved
    - >-
      {{ usd(piSlip, 3) }} per share
    - >-
      {{ usd(improve) }} per share
  answer: 1
  explain: >-
    Price improvement is measured against the ask: {{ usd(improve) }} better. Slippage is measured against the mid of {{ usd(c105.mid, 3) }}, and you still paid {{ usd(piSlip, 3) }} above it. Price improvement and zero slippage are not the same thing.
- q: >-
    In the round-trip example, which part of the {{ usd(allIn) }} total could you most reduce?
  choices:
    - >-
      The commissions, by switching brokers
    - >-
      The {{ usd(spreadRT) }} paid crossing the bid-ask spread, by using limit orders near the mid
    - >-
      The regulatory fees, by trading fewer contracts at a time
  answer: 1
  explain: >-
    The bid-ask spread is {{ usd(spreadRT) }} of the {{ usd(allIn) }}; filling at or near the mid both ways cuts the total to about {{ usd(midRT) }}. Commissions here total {{ usd(commRT) }}, so even a free broker saves far less. Regulatory fees are charged per contract and do not shrink by splitting orders.
```
