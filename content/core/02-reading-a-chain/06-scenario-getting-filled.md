---
title: "Scenario: from chain to fill"
summary: Choose a contract from a real-looking chain, price and work the opening order, and close the position without giving away the spread.
kind: scenario
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const m = (x) => usd(x, Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? 2 : 3);
const spr = (o) => (o.ask - o.bid) / o.mid;
const c105 = row(105).call;
const c120 = row(120).call;
const w105 = chain(ACME, { dte: 9 }).rows.find((r) => r.strike === 105).call;
const j105 = chain(ACME, { dte: 58 }).rows.find((r) => r.strike === 105).call;
const n = 5;
const start = Math.floor(c105.mid * 100) / 100;
const fill = Number((start + 0.02).toFixed(2));
const moved = chain(ACME, { dte: 30, spot: 100.2 }).rows.find((r) => r.strike === 105).call;
// two weeks later
const ex = chain(ACME, { dte: 16, spot: 104 }).rows.find((r) => r.strike === 105).call;
const exitPx = Number((Math.ceil(ex.mid * 100) / 100 - 0.01).toFixed(2));
const lastPx = Number((ex.ask + 0.35).toFixed(2));
const pnl = (px) => (px - fill) * 100 * n;
```

You know how to read every column of the chain. This Scenario puts it to work on one trade, from choosing the contract to closing it.

```scenario
setup: >-
  It is {{ longDate(TODAY) }} and ACME is at $100. You expect a rise over the next two to three weeks and want exposure to about 500 shares through calls. You have looked at three expirations: the November 27 weekly (9 days), the December monthly (30 days) and the January monthly (58 days).
steps:
  - prompt: >-
      Which contract do you choose? The quotes are: November 27 105 call {{ usd(w105.bid) }} / {{ usd(w105.ask) }}; December 105 call {{ usd(c105.bid) }} / {{ usd(c105.ask) }} (open interest {{ int(c105.oi) }}); December 120 call {{ usd(c120.bid) }} / {{ usd(c120.ask) }} (open interest {{ int(c120.oi) }}); January 105 call {{ usd(j105.bid) }} / {{ usd(j105.ask) }}.
    choices:
      - text: >-
          Five November 27 105 calls; they are the cheapest way to get the move
        grade: poor
        feedback: >-
          They are cheap because they expire in 9 days, well before the two to three weeks your view needs. ACME would have to rise more than $5 by next Friday for them to be worth anything at expiration. A correct view on the wrong timetable loses the whole premium.
      - text: >-
          Five December 105 calls
        grade: best
        feedback: >-
          The expiration covers your horizon with room to spare, the strike is near the money, the spread is {{ pct(spr(c105)) }} of the mid, and open interest is deep. This contract expresses the view and can be traded in and out at fair prices.
      - text: >-
          Five December 120 calls, for maximum leverage
        grade: poor
        feedback: >-
          The spread is {{ pct(spr(c120), 0) }} of the mid: buying at the ask and selling at the bid would cost more than the option is worth. With open interest of {{ int(c120.oi) }}, there may be nobody to sell to later. ACME also needs to rise more than 20% in a month for these to pay at expiration.
      - text: >-
          Five January 105 calls
        grade: acceptable
        feedback: >-
          A reasonable choice: more time, a liquid monthly series and a fair spread. You pay more, {{ usd(j105.ask * 100 * n) }} at the ask against {{ usd(c105.ask * 100 * n) }} for December, for four extra weeks your view does not strictly need. Some traders would choose it precisely for that cushion.
  - prompt: >-
      You choose five December 105 calls, bid {{ usd(c105.bid) }}, ask {{ usd(c105.ask) }}, mid {{ m(c105.mid) }}. How do you enter the order?
    choices:
      - text: >-
          A market order to buy 5
        grade: poor
        feedback: >-
          You will pay at least the ask, {{ usd(c105.ask) }}, and more if the quote moves before the order arrives. That hands over half the spread, {{ usd((c105.ask - c105.mid) * 100 * n) }} on five contracts, before the trade has started.
      - text: >-
          A limit order at {{ usd(start) }}, just under the mid, with a plan to step up a cent or two at a time to a maximum of {{ usd(c105.ask - 0.02) }}
        grade: best
        feedback: >-
          This is how to work an order. Start near the mid, move toward the ask in small steps with a pause between them, and stop at a maximum decided in advance. In a contract this liquid, a fill within a cent or two of the mid is common.
      - text: >-
          A limit order at the ask, {{ usd(c105.ask) }}
        grade: acceptable
        feedback: >-
          You will almost certainly be filled and you are protected from a sudden jump in the quote, so this is far better than a market order. But you give away {{ usd((c105.ask - c105.mid) * 100 * n) }} of spread that a little patience would usually save.
      - text: >-
          A limit order at $1.20, well under the bid, and wait
        grade: poor
        feedback: >-
          Nobody will sell at $1.20 while the bid is {{ usd(c105.bid) }} unless ACME falls, which is the opposite of what you expect. The order will most likely sit unfilled while the move you wanted happens without you.
  - prompt: >-
      Your order is resting at {{ usd(fill) }} after two steps, unfilled. ACME ticks up to $100.20, and the call is now bid {{ usd(moved.bid) }}, ask {{ usd(moved.ask) }}, mid {{ m(moved.mid) }}. Your maximum was {{ usd(c105.ask - 0.02) }}.
    choices:
      - text: >-
          Change to a market order before it runs away
        grade: poor
        feedback: >-
          A market order now fills at {{ usd(moved.ask) }} or worse, {{ usd((moved.ask - fill) * 100 * n) }} more than your resting price on five contracts. Chasing with market orders is how spreads are paid in full.
      - text: >-
          Re-anchor: the new mid is above your maximum, so decide deliberately whether the trade still makes sense at around {{ m(moved.mid) }}, and either reprice there or let it go
        grade: best
        feedback: >-
          The whole market for the option moved with the stock. Your old limit is now near the bid and unlikely to fill, and stepping up from it a cent at a time is pointless. Either the view justifies paying around the new mid, in which case you reprice there knowingly, or it does not, and you cancel.
      - text: >-
          Leave the order where it is
        grade: acceptable
        feedback: >-
          It costs nothing to wait, and if ACME slips back you may well be filled. But you are now bidding near the bid of a market that has moved away from you, so if ACME keeps rising you will miss the trade without having decided to.
  - prompt: >-
      As it happened, ACME dipped back to $100 a few minutes later and your order filled at {{ usd(fill) }}, so you are long five December 105 calls at that price. Two weeks later ACME is at $104, with 16 days left. The calls are bid {{ usd(ex.bid) }}, ask {{ usd(ex.ask) }}, mid {{ m(ex.mid) }}. The chain shows "last {{ usd(lastPx) }}" from a trade yesterday afternoon, when ACME was higher. You want to take the profit.
    choices:
      - text: >-
          Sell to close with a limit order at the last price, {{ usd(lastPx) }}
        grade: poor
        feedback: >-
          The last price is yesterday's trade, made when ACME was higher. It is above today's ask, so nobody will buy from you there. Price against the live bid and ask, not the last trade.
      - text: >-
          Sell to close with a limit at {{ usd(exitPx) }}, near the mid, stepping down toward the bid if needed
        grade: best
        feedback: >-
          Filled at {{ usd(exitPx) }}, you make ({{ usd(exitPx) }} − {{ usd(fill) }}) × 100 × 5 = {{ signedUsd(pnl(exitPx)) }}. Many traders work the entry carefully and then leave money on the table on the exit; working both saves the spread twice.
      - text: >-
          Sell to close at market
        grade: acceptable
        feedback: >-
          You are out immediately at the bid, {{ usd(ex.bid) }}, for a profit of {{ signedUsd(pnl(ex.bid)) }}. That is {{ usd(pnl(exitPx) - pnl(ex.bid)) }} less than a fill near the mid, the cost of impatience. If the market were moving fast against you, speed might be worth it; here it is not.
wrap: >-
  Reading a chain is about turning a view into a specific contract and a fair price. Choose an expiration that fits your timetable, a strike near the money, and a contract with a tight spread and real open interest. Then trade only with limit orders: start near the mid, step in small increments, re-anchor when the stock moves, and treat the last price as history. The spread you save on the way in and on the way out is real money on every trade you make.
```
