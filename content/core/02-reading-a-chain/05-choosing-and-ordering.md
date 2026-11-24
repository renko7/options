---
title: Choosing a contract and pricing the order
summary: Pick a liquid contract from the chain, price a limit order around the mid, and work it toward a fill without overpaying.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const m = (x) => usd(x, Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? 2 : 3);
const c = row(105).call;
const start = Math.floor(c.mid * 100) / 100;
const fill = Number((start + 0.02).toFixed(2));
const n = 10;
const saved = (c.ask - fill) * 100 * n;
const moved = chain(ACME, { dte: 30, spot: 100.2 }).rows.find((r) => r.strike === 105).call;
const c100 = row(100).call;
const spr = (o) => (o.ask - o.bid) / o.mid;
const c120 = row(120).call;
const p100 = row(100).put;
```

You have a view on ACME and a rough idea of the option you want. Two practical problems are left: choosing the specific contract, and getting it at a fair price. Both are where beginners lose money that experienced traders keep, and neither needs anything more advanced than the chain columns from the previous Lessons.

## Choosing the contract

Work through four questions, in this order.

1. **Which expiration?** Give the trade enough time. If you expect a move over the next month, an option that expires in a week forces you to be right fast as well as right. A common practice is to buy more time than the thesis needs and close early. Prefer the standard monthly or a busy weekly over a thinly traded in-between date.
2. **Which strike?** Decide how far in or out of the money you want to be. [Payoffs at expiration](#core-03) works through this trade-off; for now, near-the-money strikes are the usual starting point.
3. **Is it liquid?** Check the spread as a percentage of the mid, the open interest and today's volume. If the contract fails, look at the neighboring strike or expiration, which is often nearly as good for your view and much cheaper to trade.
4. **How many?** Size by the number of shares you want exposure to, and make sure losing the whole premium is acceptable.

:::example Screening two December calls
You are bullish on ACME over the next month and are deciding between the December 100 call and the December 120 call.

| | December 100 call | December 120 call |
|---|---|---|
| Bid / ask | {{ usd(c100.bid) }} / {{ usd(c100.ask) }} | {{ usd(c120.bid) }} / {{ usd(c120.ask) }} |
| Spread % of mid | {{ pct(spr(c100)) }} | {{ pct(spr(c120)) }} |
| Open interest | {{ int(c100.oi) }} | {{ int(c120.oi) }} |
| Volume today | {{ int(c100.volume) }} | {{ int(c120.volume) }} |

The 100 call passes easily. The 120 call fails: the spread is larger than the option's value at the mid, so a round trip would cost you more than the option is worth. If you want a cheaper, more aggressive call, the 105 or 110 strike is a better place to look.
:::

## Always use a limit order

A market order to buy an option fills at the ask, or worse if the quote changes before your order arrives. On a stock with a one-cent spread that hardly matters; on an option with a spread of several percent, it hands that spread to the market maker every time. A [[limit order]] names the worst price you will accept and fills only at that price or better.

:::warning Never send a market order for an option
Market orders on options fill at whatever price is available when they arrive. In a fast market, at the open, or in a thin contract, that can be far from the quote you saw. Use a limit order for every options trade, opening and closing; [Accounts and orders](#core-08) covers order types in detail.
:::

## Pricing around the mid

The mid is the natural starting point for a limit price. In liquid contracts, orders at or near the mid are often filled, because market makers would rather trade there than not at all, and because other customers' orders may meet yours.

Two practical details:

- **Tick size.** Option prices move in fixed increments. The ACME December 105 call's mid is {{ m(c.mid) }}, but you cannot enter half a cent; you choose {{ usd(start) }} or {{ usd(start + 0.01) }}.
- **The mid moves.** Every time the stock ticks, the bid, ask and mid of every option move with it. A limit price that was at the mid a minute ago can be far from it now.

:::rule Minimum price increments (as of 2026)
Option prices trade in fixed minimum increments. For option classes in the exchanges' Penny Interval Program, which includes most actively traded names, the increment is $0.01 for prices below $3.00 and $0.05 at $3.00 and above; a few of the most active ETFs trade in $0.01 at every price. Classes outside the program trade in $0.05 below $3.00 and $0.10 at $3.00 and above. Multi-leg (complex) orders may be priced in finer increments.
:::

## Working the order

"Working" an order means starting at a good price and moving toward the market in small steps until you are filled or reach a price you have decided in advance not to cross.

:::example Buying ten December 105 calls
ACME is at $100. The December 105 call is bid {{ usd(c.bid) }}, ask {{ usd(c.ask) }}, mid {{ m(c.mid) }}. You want ten contracts. Before you start, you decide you will pay no more than {{ usd(c.ask - 0.02) }}.

1. Enter a limit order to buy 10 at {{ usd(start) }}, just under the mid. Wait a minute or so.
2. No fill. Cancel and replace at {{ usd(start + 0.01) }}. Wait again.
3. No fill. Replace at {{ usd(fill) }}. You are filled.

You paid {{ usd(fill) }} instead of the {{ usd(c.ask) }} ask: {{ usd(c.ask - fill) }} a share on 1,000 shares' worth of options, **{{ usd(saved) }}** saved on one trade.

Now suppose instead that while you were waiting, ACME ticked up to $100.20. The 105 call is now bid {{ usd(moved.bid) }}, ask {{ usd(moved.ask) }}, mid {{ m(moved.mid) }}. Your order at {{ usd(fill) }} is now near the bid, not the mid, and will probably never fill. Stepping it up a cent at a time from the old mid is pointless. Re-anchor to the new mid, and if that is above the maximum you set, decide deliberately whether the trade is still worth it rather than chasing.
:::

Selling works the same way in reverse: start at or just above the mid and step down toward the bid, with a minimum you will accept.

How fast to step, and how far, depends on the contract. In a liquid near-the-money option, fills at the mid or a tick from it are common. In a thin contract, you may have to give up most of the spread to trade at all, which is the strongest argument for choosing a liquid contract in the first place.

:::practice Habits that save money
- Avoid trading in the first few minutes after the open and in the minutes around major news, when spreads are widest.
- Look at the theoretical value if your broker shows one; a mid far from it can mean a stale or lopsided quote.
- Close positions with limit orders too. Many beginners work their entry patiently and then dump the position at market on exit.
- For two or more options traded together, enter them as one multi-leg order priced on the net amount, not one leg at a time. [Accounts and orders](#core-08) shows how.
:::

## Try it

Use the chain below to repeat the screening yourself. Pick a strike and expiration, compute its spread as a percentage of the mid, check the open interest, and decide where you would place your first limit price.

```tool chain
{ underlying: 'ACME', dte: 30, view: 'quote', highlight: [{ strike: 100, type: 'call' }, { strike: 105, type: 'call' }, { strike: 120, type: 'call' }] }
```

:::key
Choose an expiration with enough time, a strike that fits the view, and a contract with a tight spread and real open interest. Then buy and sell with limit orders only: start near the mid, step toward the market in small increments, re-anchor when the stock moves, and decide your maximum price before you start.
:::

```quiz
- q: >-
    The ACME December 100 put is bid {{ usd(p100.bid) }}, ask {{ usd(p100.ask) }}. Where would a patient trader place a first limit order to buy it?
  choices:
    - >-
      {{ usd(p100.ask) }}, to make sure of a fill
    - >-
      {{ usd(p100.mid) }}, the mid
    - >-
      {{ usd(p100.bid - 0.20) }}, well below the bid
  answer: 1
  explain: >-
    The mid, {{ usd(p100.mid) }}, is a legal price here (at $3.00 and above the increment is $0.05) and the natural starting point; you can step toward the ask if it does not fill. Paying the ask gives away half the spread, {{ usd((p100.ask - p100.mid) * 100) }} a contract, for no reason. An order far below the bid will simply sit unfilled while the market moves on.
- q: >-
    You have a limit order to buy at {{ usd(fill) }} resting while ACME rises 20 cents. The option is now bid {{ usd(moved.bid) }}, ask {{ usd(moved.ask) }}. What is the sensible next step?
  choices:
    - >-
      Keep the order as it is; it will fill eventually
    - >-
      Re-anchor to the new mid of {{ m(moved.mid) }} and decide whether that is still within the maximum you set
    - >-
      Switch to a market order so you do not miss the move
  answer: 1
  explain: >-
    The whole market for the option moved up with the stock, so your old price is now near the bid and unlikely to fill. The right move is to reprice relative to the new mid and check it against your plan. A market order would fill at the ask, {{ usd(moved.ask) }}, or worse, which is precisely the cost a limit order exists to avoid.
- q: >-
    The December 105 call's mid is {{ m(c.mid) }}. Why can you not enter a limit price of exactly {{ m(c.mid) }}?
  choices:
    - >-
      Limit orders must be at the bid or ask
    - >-
      Options below $3.00 in this class trade in $0.01 increments, so the price must be a whole cent
    - >-
      Brokers do not allow limit orders between the bid and ask
  answer: 1
  explain: >-
    Prices must land on the minimum increment: a whole cent for this option. You choose {{ usd(start) }} or {{ usd(start + 0.01) }}. Limit orders can, and usually should, sit between the bid and the ask; that is how you get filled better than the quote.
- q: >-
    A call you like is bid $0.05, ask $0.25, open interest 40. What is the best response?
  choices:
    - >-
      Buy it at the ask; it is only {{ usd(25) }} a contract
    - >-
      Bid at the mid, $0.15, and if filled you are fine
    - >-
      Look at a nearby strike or expiration with a tight spread and real open interest
  answer: 2
  explain: >-
    The spread is {{ pct(0.20 / 0.15, 0) }} of the mid. Even a fill at the mid leaves you needing a large move just to sell back at a profit, and with open interest of 40 there may be no buyer when you want out. The small dollar amount hides a huge percentage cost. A neighboring contract that expresses almost the same view in a liquid market is nearly always better.
```
