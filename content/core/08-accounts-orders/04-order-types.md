---
title: Order types for options
summary: Choose between market, limit, stop and stop-limit orders and between day and good-til-canceled orders, and know why a market order on an option is almost always a mistake.
---

```calc
const q30 = chain(ACME, { dte: 30 });
const row = (k) => q30.rows.find((r) => r.strike === k);
const c100 = row(100).call;
const c120 = row(120).call;
const q2 = chain(ACME, { dte: 2 });
const c70 = q2.rows.find((r) => r.strike === 70).call;
const overMid120 = (c120.ask - c120.mid) / c120.mid;
const overMid70 = (c70.ask - c70.mid) * 100;
const n = 10;
const saved = (c100.ask - c100.mid) * 100 * n;
const step = Number((c100.mid + 0.05).toFixed(2));
const credit = row(95).put.bid - row(90).put.ask;
const target = Math.floor((credit / 2) * 100) / 100;
```

When you trade stock in a large company, the bid and ask are usually a penny apart and a market order costs you almost nothing extra. Options are different. Each stock has hundreds of option series, liquidity is spread across them, and the quotes are wider, sometimes much wider. The order type you choose decides how much of that spread you pay. This Lesson covers the basic order types and how professionals use them on options.

## Market orders

A [[market order]] says "fill me now at whatever price is available". It buys at the [[ask]] and sells at the [[bid]], and if your order is larger than the size quoted, the rest fills at the next price, which is worse.

:::example What a market order costs
The ACME December 100 call is quoted {{ usd(c100.bid) }} bid, {{ usd(c100.ask) }} ask. A market order to buy fills at {{ usd(c100.ask) }}, {{ usd(c100.ask - c100.mid) }} above the [[mid price]] of {{ usd(c100.mid) }}. That is a few percent of the option's value: acceptable for a liquid at-the-money option, if you must trade instantly.

Further from the money it gets worse. The December 120 call is quoted {{ usd(c120.bid) }} bid, {{ usd(c120.ask) }} ask. A market buy fills at {{ usd(c120.ask) }}, {{ pct(overMid120, 0) }} above the {{ usd(c120.mid, 3) }} mid: you start the trade far behind.

Deep in-the-money options can have spreads of a dollar or more. The ACME November 20 70 call, two days from expiration, is quoted {{ usd(c70.bid) }} bid, {{ usd(c70.ask) }} ask. A market buy pays {{ usd(overMid70) }} per contract more than the mid.
:::

The displayed quote is also only valid for its displayed size and only at that instant. In a fast market, at the open, around news, or in thin series, quotes move or widen while your order travels, and a market order accepts whatever it meets. Some brokers convert option market orders into limit orders with a protective price band, but you should not rely on that.

:::warning Do not use market orders on options
A market order hands the price decision to whoever is quoting. On options, with wide and fast-moving quotes, that routinely costs far more than the commission. Use a limit order for every option trade. The rare exception is an emergency exit where getting out matters more than the price, and even then a limit at or through the bid or ask (a *marketable limit*) caps the damage.
:::

## Limit orders

A [[limit order]] sets the worst price you accept: a maximum to buy, a minimum to sell. It may fill at your price or better, partly, or not at all.

The standard way to trade an option is to start at or near the mid and move toward the far side of the quote in small steps.

:::example Working a limit order
You want to buy {{ int(n) }} ACME December 100 calls, quoted {{ usd(c100.bid) }} by {{ usd(c100.ask) }}.

1. Enter a limit to buy at the mid, {{ usd(c100.mid) }}. Wait a minute or two.
2. If not filled, raise it to {{ usd(step) }}. Wait again.
3. Decide in advance the most you will pay; for a quote this tight, usually no more than the ask.

If the first order fills at the mid, you have saved {{ usd(saved) }} against a market order on {{ int(n) }} contracts. Market makers often fill orders at or near the mid in liquid series, because the quoted spread is the most they want to earn, not the least.
:::

A partial fill is normal: you might buy 6 of 10 at your price. Decide whether you want the rest at a worse price or are content with 6. If the underlying moves while you wait, re-think the price; the mid you started from has moved too.

:::rule Minimum price increments for options (as of 2026)
Exchanges set the price increments in which options can be quoted. Option classes in the Penny Interval Program quote in $0.01 increments below $3.00 and $0.05 at $3.00 and above, and a few of the most active ETF classes quote in $0.01 at every price. Classes outside the program quote in $0.05 below $3.00 and $0.10 at $3.00 and above. Your limit price must respect the increment or the order is rejected or rounded.
:::

## Stop and stop-limit orders

A [[stop order]] sits inactive until a trigger price is reached, then becomes a market order. A *stop-limit* order becomes a limit order instead, so you control the price but may not get filled.

Stops are popular on stock to cap a loss. On options they are much less reliable:

- **What triggers them varies by broker.** Some trigger on the last trade, some on the bid (for sell stops) or the ask, some on the national best quote. An option may not trade for long stretches, or a single odd trade may print far from fair value.
- **Quotes widen momentarily.** At the open, around news, or when a market maker pulls its quote, the bid can drop sharply with no change in the stock. A sell stop triggers, becomes a market order, and sells into that bid.
- **Stop-limits may never fill.** If the option gaps through your limit, you keep the position you wanted to exit.

:::example A stop that fires on a quote, not on the stock
You own an ACME December 100 call bought at {{ usd(c100.mid) }} and place a sell stop at $2.50. One morning at the open, with ACME unchanged, the quote briefly shows $2.40 bid, $3.80 ask while market makers update their quotes. If your broker triggers sell stops on the bid, the stop fires and sells at $2.40, more than a dollar below the option's fair value, and the quote returns to normal a minute later.
:::

:::practice How professionals set exits on options
Traders usually base exits on the *underlying*, not the option's quote: "close the call if ACME trades below $96". Many brokers offer conditional orders that send an option order when the stock reaches a price; otherwise traders set an alert and act manually with a limit order. Either way the trigger is the stock's price, which is liquid and hard to push around, and the execution is a limit order.
:::

## Time in force: day and good-til-canceled

Every order also has a duration.

- A **day order** expires at the end of today's session if not filled. This is the default at most brokers.
- A [[good-til-canceled order]] (GTC) stays working across days until it fills, you cancel it, or the broker's maximum duration passes (brokers set limits such as 60, 90 or 180 days). It also ends when the option expires.

GTC orders are useful for profit targets: after selling the December 95/90 put spread for {{ usd(credit) }}, you might leave a GTC order to buy it back at {{ usd(target) }}, about half the credit. But they are easy to forget. A GTC buy order placed weeks ago can fill after news has changed the situation completely. Review open orders regularly, and especially after any earnings announcement or large move. Most options trade only during the regular session; orders entered outside it wait for the open.

Use the chain below to compare spreads across strikes: the at-the-money options have the tightest quotes in dollars, and the far out-of-the-money ones have the widest relative to their value.

```tool chain
{ underlying: 'ACME', dte: 30, view: 'quote', highlight: [{ strike: 100, type: 'call' }, { strike: 120, type: 'call' }] }
```

:::key
Always trade options with limit orders: start near the mid and step toward the far side, and decide your worst price in advance. Market orders pay the full spread and more in fast or thin markets. Stops on option prices can fire on a momentary quote; base exits on the underlying's price and execute with a limit. Day orders expire tonight; good-til-canceled orders keep working until filled, canceled or expired, so review them.
:::

```quiz
- q: >-
    The ACME December 120 call is quoted {{ usd(c120.bid) }} by {{ usd(c120.ask) }}. You send a market order to buy one. Roughly how far above the mid do you pay?
  choices:
    - >-
      Nothing; market orders fill at the mid
    - >-
      {{ pct(overMid120, 0) }}
    - >-
      One cent
  answer: 1
  explain: >-
    A market buy fills at the ask, {{ usd(c120.ask) }}, against a mid of {{ usd(c120.mid, 3) }}: {{ pct(overMid120, 0) }} above fair value before the trade has started. Market orders never target the mid; that is what a limit order at the mid does. A one-cent cost applies to very liquid stock, not to cheap out-of-the-money options.
- q: >-
    You want to buy ten ACME December 100 calls quoted {{ usd(c100.bid) }} by {{ usd(c100.ask) }}. What is the usual professional approach?
  choices:
    - >-
      A market order, to be sure of a fill
    - >-
      A limit order at {{ usd(c100.mid) }}, then step up toward {{ usd(c100.ask) }} if it does not fill
    - >-
      A limit order at {{ usd(c100.bid) }} and wait all day
  answer: 1
  explain: >-
    Starting at the mid often gets filled in liquid series and saves up to {{ usd(saved) }} on ten contracts; stepping up in small increments gets you filled without paying the full spread. A market order pays the ask or worse. Bidding at the bid can work, but you are now just another bidder, and the market may move away while you wait.
- q: >-
    You own an ACME call and want to exit if ACME falls below $96. Which is most reliable?
  choices:
    - >-
      A sell stop on the option at a price you estimate for ACME at $96
    - >-
      A conditional order (or alert) triggered by ACME trading below $96, executed with a limit order on the call
    - >-
      A good-til-canceled market order
  answer: 1
  explain: >-
    The stock's price is liquid and is what you actually care about; triggering on it avoids stops fired by a momentary wide option quote. A stop on the option's own price can trigger with the stock unchanged and then sells at market. A GTC market order would execute immediately, not on a condition.
- q: >-
    Three weeks ago you placed a GTC order to sell to close your ACME puts at $4.00. Since then ACME has reported earnings and the situation has changed. What should you do?
  choices:
    - >-
      Nothing; GTC orders cancel themselves after news
    - >-
      Review the order and cancel or change it if your plan has changed
    - >-
      Convert it to a market order to get out faster
  answer: 1
  explain: >-
    GTC orders keep working until filled, cancelled, expired or past the broker's maximum duration; news does not cancel them. An old order can fill at a price that made sense weeks ago and no longer does. Converting to a market order adds a second problem: paying the spread.
```
