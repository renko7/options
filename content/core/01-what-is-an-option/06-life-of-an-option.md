---
title: The life of an option
summary: Follow an option from the opening trade to its three possible endings (closed, expired worthless, or exercised and assigned) and know what each one does to your account.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const buy = row(100).call.ask;
const sell = row(100).call.bid;
const legs = [{ kind: 'call', qty: 1, strike: 100, premium: buy }];
const later = chain(ACME, { dte: 18, spot: 105 });
const anaBid = later.rows.find((r) => r.strike === 100).call.bid;
const anaPnl = (anaBid - buy) * 100;
const benPnl = payoff.pnlAtExpiry(legs, 98);
const caraPnl = payoff.pnlAtExpiry(legs, 106);
const danLegs = [{ kind: 'call', qty: -1, strike: 100, premium: sell }];
const danPnl = payoff.pnlAtExpiry(danLegs, 106);
```

Buying an option starts a clock. From the moment you open the position until the close on expiration day, you can end it whenever you like by trading it away. If you are still holding it when the clock runs out, one of two things happens automatically, depending only on where the stock closed. This Lesson walks through every path so that nothing at expiration surprises you.

## Opening a position

When you [[buy to open]] or [[sell to open]], you create an [[open position]]: a contract you hold, or an obligation you owe, that has not yet been closed, exercised, assigned or expired. Your broker shows it under positions with its current market value and your unrealized profit or loss, updated as the price moves.

Every open position is matched by an opposite open position somewhere else: your long call is someone's short call, with the OCC in the middle. Across the whole market, the number of contracts still open in each series is the [[open interest]], which [Reading an options chain](#core-02) explains.

From here, there are three ways out.

## Ending 1: close it in the market

You do the opposite trade: [[sell to close]] an option you hold, or [[buy to close]] one you wrote. The position disappears, and your profit or loss is the difference between the two prices, times 100. This works on any day the market is open, including expiration day up to the close.

This is how most options positions end, for both holders and writers, because it is simple and keeps whatever extrinsic value the option still has.

## Ending 2: expire worthless

If an option is out of the money at the close on expiration day, it is not exercised automatically, and normally nobody exercises it. It simply ceases to exist. The holder loses the premium they paid; the writer keeps the premium they received and has no further obligation. No trade, no commission, no action needed.

One caveat for writers: holders may still exercise until the evening cut-off in the Rule Note below, so if news moves the stock after the close, an option that closed barely out of the money can still be exercised, and its writer assigned. [Exercise, assignment and expiration](#core-07) covers this pin risk.

## Ending 3: exercise and assignment

If an option is in the money at expiration, it has value, and it is normally exercised. You do not usually have to do anything: the OCC automatically exercises expiring options that are in the money by at least a cent, a procedure called [[exercise by exception]]. A holder who does not want that can file a [[do-not-exercise instruction]] through their broker before the cut-off.

When an option is exercised, the OCC assigns the obligation to a writer of the same series, chosen at random among clearing firms, and the firm passes it to one of its customers who is short that option. That writer receives an [[assignment]] notice, usually the next morning, and the stock moves:

| | Holder exercises | Writer is assigned |
|---|---|---|
| Call | buys 100 shares at the strike | sells 100 shares at the strike |
| Put | sells 100 shares at the strike | buys 100 shares at the strike |

A writer who is assigned on a call without owning the shares ends up short 100 shares. A put holder who exercises without owning shares does too. Assigned put writers must pay for 100 shares at the strike.

Because ACME options are American-style, a holder can also exercise early, on any business day, and a writer can be assigned early. In practice early exercise is uncommon, for the reason in [Intrinsic and extrinsic value](#core-01-intrinsic-and-extrinsic): it throws away extrinsic value. [Exercise, assignment and expiration](#core-07) covers when it does happen.

:::rule Expiration, exercise and assignment (as of 2026)
- At expiration the OCC automatically exercises equity options that are in the money by $0.01 or more, unless the holder's broker submits contrary instructions. Options that are less in the money can still be exercised on request.
- Holders who want to exercise an option that is not auto-exercised, or to stop an automatic exercise, must give instructions by the cut-off on expiration day, which under FINRA and exchange rules is 5:30 p.m. Eastern for standard equity options. Brokers usually set earlier internal deadlines.
- Assignments are allocated by the OCC to clearing firms at random; firms allocate them to customers by a random or other fair method disclosed to customers.
- Stock delivered on exercise or assignment settles on the regular stock settlement cycle, one business day later (T+1).
:::

:::example Four traders, one December 100 call
On {{ longDate(TODAY) }}, with ACME at $100, three traders each buy one ACME December 100 call at the ask, {{ usd(buy) }}, paying {{ usd(buy * 100) }}. A fourth, Dan, sells one to open at the bid, {{ usd(sell) }}, collecting {{ usd(sell * 100) }}.

**Ana closes early.** Twelve days later, on Monday {{ longDate(expiryDate(12)) }}, ACME is at $105. The call now bids {{ usd(anaBid) }}. Ana sells to close and makes ({{ usd(anaBid) }} − {{ usd(buy) }}) × 100 = **{{ signedUsd(anaPnl) }}**. The trade is over; nothing happens to her at expiration.

**Ben lets it expire.** ACME closes at $98 on expiration day. The call is out of the money and expires worthless. Ben loses **{{ usd(-benPnl) }}**, the whole premium.

**Cara is exercised automatically.** ACME closes at $106. Cara's call is $6 in the money, so it is exercised by exception. The next business day she has paid {{ usd(100 * 100) }} and owns 100 ACME shares worth {{ usd(106 * 100) }}. Counting the premium, she is up {{ usd(caraPnl) }}, but she is now holding {{ usd(106 * 100) }} of stock over the weekend, which she may not have the cash for.

**Dan is assigned.** Suppose ACME closes at $106 and Dan's short call is assigned. Dan must sell 100 shares at $100. He owns none, so he is now short 100 ACME shares at $100 while they trade at $106. Counting the premium he collected, he is at {{ signedUsd(danPnl) }} and still holds a short stock position.
:::

Notice that Cara and Dan each ended up with a stock position they did not plan for. That is the main practical risk of letting in-the-money options reach expiration.

:::warning Expiration can put stock in your account that you cannot pay for
An in-the-money long call that reaches expiration becomes a stock purchase of 100 shares times the strike, per contract. Five ACME 100 calls become a {{ usd(5 * 100 * 100) }} purchase. If you do not have the cash or margin, you face a margin call, and many brokers will close the position for you before the bell at whatever price they get. If you do not want shares, sell the option to close before expiration day ends.
:::

:::practice What most traders do
Holders and writers alike usually close positions before expiration, often several days before, rather than dealing with exercise, assignment and the weekend risk of a stock position. Letting an option expire worthless is fine when it is clearly out of the money. Letting one be exercised or assigned is a choice you should make deliberately, never by default.
:::

Move the "Days passed" slider in the builder below to see the call's value on any day of its life (the dashed line) and its value at expiration (the solid line). On any day before the end, selling to close gets you the dashed line, which is always at or above the solid one.

```tool position-builder
{ title: 'Long one ACME December 100 call', legs: [{ kind: 'call', qty: 1, strike: 100, premium: buy, dte: 30, iv: row(100).call.iv }], range: [85, 115], daysPassed: 10 }
```

:::key
An open option ends in one of three ways: you close it in the market, it expires worthless out of the money, or, in the money, it is exercised (automatically if it is at least a cent in the money) and a writer is assigned. Closing is the common path; exercise and assignment turn your option into a stock position, so let them happen only on purpose.
:::

```quiz
- q: >-
    At the close on expiration day ACME is at $100.40. You hold one December 100 call and have given your broker no instructions. What happens?
  choices:
    - >-
      It expires worthless because it is less than $1 in the money
    - >-
      It is exercised automatically; you buy 100 shares for {{ usd(100 * 100) }}
    - >-
      Your broker sells it for you at $0.40
  answer: 1
  explain: >-
    The OCC exercises expiring equity options that are in the money by $0.01 or more, and $0.40 qualifies. You will own 100 shares bought at $100, so you need {{ usd(100 * 100) }} of cash or margin. There is no $1 threshold. If you did not want the shares, you should have sold the call before the close or filed a do-not-exercise instruction.
- q: >-
    You sold one ACME December 95 put to open. At expiration ACME closes at $91 and you are assigned. What happens?
  choices:
    - >-
      You must sell 100 shares at $95
    - >-
      You must buy 100 shares at $95, paying {{ usd(95 * 100) }}
    - >-
      Nothing; only holders can be assigned
  answer: 1
  explain: >-
    A put writer's obligation is to buy shares at the strike when the holder exercises. You pay {{ usd(95 * 100) }} for 100 shares now worth {{ usd(91 * 100) }}; the premium you collected offsets part of that. Selling at the strike is what an assigned *call* writer does. Assignment only ever goes to writers.
- q: >-
    You hold a call that is $3 in the money with two weeks to expiration and you want to take the profit. What is usually the better way out?
  choices:
    - >-
      Exercise it, then sell the shares
    - >-
      Sell to close the call
    - >-
      Wait for automatic exercise at expiration
  answer: 1
  explain: >-
    Selling the call collects both its $3 of intrinsic value and whatever extrinsic value is left with two weeks to go. Exercising collects only the $3 and needs cash to buy the shares first. Waiting for expiration gives up control: the stock can move against you in the meantime, and you end up holding shares.
- q: >-
    Which of these does NOT close or end an open long call position?
  choices:
    - >-
      Selling it to close
    - >-
      The call expiring out of the money
    - >-
      Buying another call to open in the same series
    - >-
      Exercising it
  answer: 2
  explain: >-
    Buying another call to open adds a second contract to your position; it does not offset the first. To close a long option you sell it to close. Expiring out of the money ends the position with a loss of the premium, and exercising ends it by turning it into 100 shares.
```
