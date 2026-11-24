---
title: The layout of an options chain
summary: Find any contract on an options chain, read every number in its row, and know what the IV and delta columns are telling you.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const r105 = row(105);
const d = (x) => num(x, 2);
const d100 = Number(row(100).call.delta.toFixed(2));
const ivs = (k, t) => pct(row(k)[t].iv);
const exp = expiryDate(30);
const tabs = EXPIRATIONS.map((e) => `${longDate(e.date)} (${e.dte}d)`).join(' · ');
```

A stock quote is one line: one price to buy, one to sell. An options chain is a grid, because a single stock has dozens of option contracts: every combination of expiration, strike and type. The first time you open one it looks like a spreadsheet exploded. It is in fact laid out very consistently, and once you know where to look, you can find what you need in seconds.

## The grid

An [[options chain]] lists every option on one underlying for one expiration at a time.

- **Expirations** run across the top as tabs or a drop-down, nearest first. Each usually shows its date and its [[days to expiration]] (DTE), the number of calendar days left. Choose one and the grid below fills with that expiration's contracts.
- **Strikes** run down the middle column, lowest at the top.
- **Calls** are on the left of the strike column, **puts** on the right. Each row is one strike, so a row holds the call and the put that share that strike and expiration.
- **The underlying's quote** sits above the grid: last price, change on the day, and often its own bid and ask.

Most platforms shade the in-the-money side. Calls are in the money at strikes *below* the stock price, so the upper left is shaded; puts are in the money at strikes *above* it, so the lower right is shaded. A line or a gap between rows marks where the stock price sits.

For ACME, the expiration tabs read: {{ tabs }}.

Some brokers put calls above puts in a single long list instead of side by side, or let you show only calls or only puts. The information is the same.

## The columns

Each side of the grid repeats the same set of columns for its own option type. The exact selection varies by broker and can usually be customized, but the standard set is:

| Column | What it shows |
|---|---|
| Bid | the highest price someone is currently willing to pay |
| Ask | the lowest price someone is currently willing to sell at |
| Last | the price of the most recent trade, whenever that was |
| Change | the last price compared with the previous day's close |
| Volume | contracts traded so far today |
| Open interest | contracts outstanding as of the previous day's close |
| IV | the implied volatility of the option's price |
| Delta | how much the option's price moves for a $1 move in the stock |

All prices are per share, so multiply by 100 for the dollar amount per contract. The next Lessons take these columns in turn: [bid, ask and last](#core-02-bid-ask-and-spread), then [volume and open interest](#core-02-volume-and-open-interest). The last two columns get a brief introduction here, because you will see them on every chain from now on, and full treatment later.

:::example Reading the ACME December 105 row
ACME is at $100. Choose the {{ longDate(exp) }} tab (30 DTE) and find 105 in the strike column.

On the **call** side (left):

- bid {{ usd(r105.call.bid) }}, ask {{ usd(r105.call.ask) }}: you could buy one now for {{ usd(r105.call.ask * 100) }} or sell one for {{ usd(r105.call.bid * 100) }};
- volume {{ int(r105.call.volume) }} contracts today, open interest {{ int(r105.call.oi) }};
- IV {{ pct(r105.call.iv) }}, delta {{ d(r105.call.delta) }}.

The call is out of the money (the stock is below the strike), so this half of the row is not shaded.

On the **put** side (right):

- bid {{ usd(r105.put.bid) }}, ask {{ usd(r105.put.ask) }};
- volume {{ int(r105.put.volume) }}, open interest {{ int(r105.put.oi) }};
- IV {{ pct(r105.put.iv) }}, delta {{ d(r105.put.delta) }}.

The put is $5 in the money, so this half is shaded. Its price is far higher than the call's because it contains $5 of intrinsic value.
:::

## The IV column

The [[implied volatility]] (IV) column shows, for each option, how much movement in the stock its price implies, expressed as an annualized percentage. Higher IV means a more expensive option, other things equal. You do not need the formula yet; [Implied volatility](#core-06) covers it fully. For now, three uses:

1. **Comparing prices fairly.** A $3.50 option and a $0.55 option cannot be compared on price, but their IVs can. IV is the "price per unit of movement".
2. **Seeing the skew.** On the December chain the 90 put shows an IV of {{ ivs(90, 'put') }}, the 100 strike {{ ivs(100, 'call') }}, and the 110 call {{ ivs(110, 'call') }}. Downside strikes are priced at higher implied volatility than upside strikes. That pattern, the [[volatility skew]], is normal for stocks and indexes.
3. **Spotting events.** IV rises ahead of known events such as earnings and drops afterwards. A strike or an expiration with unusually high IV is often telling you about something on the calendar.

## The delta column

[[Delta]] is the first of the "Greeks", the sensitivities covered in [The Greeks in practice](#core-05). It is the approximate change in the option's price for a $1 rise in the stock. Calls have deltas between 0 and 1; puts between −1 and 0, because they gain when the stock falls.

On the December chain:

- the deep in-the-money 85 call has a delta of {{ d(row(85).call.delta) }}: it moves almost like the stock;
- the at-the-money 100 call has {{ d(row(100).call.delta) }} and the 100 put {{ d(row(100).put.delta) }};
- the far out-of-the-money 120 call has {{ d(row(120).call.delta) }}: it barely moves.

Traders also read delta as a rough guide to the chance an option finishes in the money, and they choose strikes by delta ("sell the 30-delta put") as often as by price. That is why it earns a column.

:::practice Setting up your chain
Most traders keep a compact default view: bid, ask, volume, open interest, IV and delta on each side, with 10 to 20 strikes around the money. Hide columns you do not use; a cluttered chain makes it easier to click the wrong row. Many costly mistakes on a chain are simply buying the put when you meant the call, or the wrong expiration tab. Read the order ticket back before sending it.
:::

## Try it

The chain Tool below shows the ACME chain. Switch expiration tabs and watch how the prices and the range of deltas change: short-dated chains have deltas near 0 or 1 everywhere except right at the money, while long-dated chains spread them out. Switch to the Greeks view to see the mid, delta and the other Greeks.

```tool chain
{ underlying: 'ACME', dte: 30, view: 'quote', highlight: [{ strike: 105, type: 'call' }, { strike: 105, type: 'put' }] }
```

:::key
A chain shows one expiration at a time: strikes down the middle, calls on the left, puts on the right, with the in-the-money side shaded. Every price is per share. The IV column puts options on a common scale of "how much movement is priced in", and the delta column tells you roughly how much each option moves for a $1 move in the stock.
:::

```quiz
- q: >-
    ACME is at $100. On the December chain, which cells are shaded as in the money?
  choices:
    - >-
      Calls at strikes above $100 and puts at strikes below $100
    - >-
      Calls at strikes below $100 and puts at strikes above $100
    - >-
      Every strike near $100
  answer: 1
  explain: >-
    A call is in the money when the strike is below the stock price (you can buy below the market), and a put when the strike is above it (you can sell above the market). So the shading sits on the upper-left calls and the lower-right puts. Strikes above $100 hold out-of-the-money calls, not in-the-money ones.
- q: >-
    You want to buy the ACME December 110 put. On a side-by-side chain with the December tab selected, where do you click?
  choices:
    - >-
      The 110 row, left side
    - >-
      The 110 row, right side
    - >-
      The 90 row, right side
  answer: 1
  explain: >-
    Puts are on the right, and the row is set by the strike, 110. The left side of the 110 row is the 110 call. The 90 row would be a different strike entirely.
- q: >-
    The December 100 call shows a delta of {{ num(d100) }}. ACME rises from $100 to $101 in the next few minutes. Roughly how much does the call's price change?
  choices:
    - >-
      Up about {{ usd(d100) }} a share, {{ usd(d100 * 100) }} per contract
    - >-
      Up $1.00 a share
    - >-
      Up about {{ usd(d100 * 100) }} a share
  answer: 0
  explain: >-
    Delta is the approximate change in the option's per-share price for a $1 move in the stock: about {{ usd(d100) }}, which is {{ usd(d100 * 100) }} on a 100-share contract. A $1.00 change is what the stock does, or a delta-1 option. {{ usd(d100 * 100) }} a share applies the multiplier to a per-share figure.
- q: >-
    On the December chain, the 90 put has an IV of {{ ivs(90, 'put') }} and the 110 call has an IV of {{ ivs(110, 'call') }}. What does that tell you?
  choices:
    - >-
      The 90 put is the better trade
    - >-
      Relative to the movement it needs, the 90 put is priced more richly than the 110 call: the market charges more for downside protection
    - >-
      The 110 call will expire sooner
  answer: 1
  explain: >-
    IV puts options on a common scale. Both strikes are $10 from the stock, but the put is priced at a higher implied volatility, which is the normal skew: investors pay up for protection against falls. A higher IV does not make a trade better or worse by itself, and both options share the December expiration.
```
