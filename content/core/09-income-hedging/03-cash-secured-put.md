---
title: The cash-secured put
summary: Sell a put with the cash to buy the shares set aside, compute your effective purchase price, and see why it carries the same risk as a covered call.
---

```calc
const env = { r: RATE, q: ACME.q };
const exp = expiryDate(30);
const dec = chain(ACME, { dte: 30 });
const row = (k) => dec.rows.find((r) => r.strike === k);
const p95 = row(95).put;
const c95 = row(95).call;
const prem = p95.bid;
const csp = [{ kind: 'put', qty: -1, strike: 95, premium: prem, dte: 30, iv: p95.iv }];
const s = payoff.summary(csp);
const g = payoff.positionGreeks(csp, 100, 0, env);
const eff = 95 - prem;
const cash = 95 * 100;
const interest = cash * (Math.exp(RATE * 30 / 365) - 1);
const cc95 = [{ kind: 'stock', qty: 100, price: 100 }, { kind: 'call', qty: -1, strike: 95, premium: c95.bid, dte: 30, iv: c95.iv }];
const ccs = payoff.summary(cc95);
const ccg = payoff.positionGreeks(cc95, 100, 0, env);
const p90 = row(90).put;
const p100 = row(100).put;
```

Suppose you would happily buy ACME, but at $95, not at today's $100. You could leave a limit order to buy at $95 and wait. Or you could sell someone the right to sell you ACME at $95, and get paid for waiting. That second choice is a [[cash-secured put]].

## The position

You sell to open one put and keep enough cash in the account to buy the shares if you are assigned: the strike times 100. Because the cash is there, the worst case is that you buy 100 shares at the strike, which you said you were willing to do. That worst case is still large (ACME going to zero costs the strike less the premium), so a cash-secured put counts as [[undefined risk]], like any short option no long option protects; the difference from a naked put is that the cash set aside funds the worst case in full. A put sold without that cash behind it is a naked put, which needs a [[margin account]] and can force you to borrow.

:::example Selling the December 95 put
ACME is at $100. The December 95 put, expiring {{ longDate(exp) }}, is bid at {{ usd(prem) }}. You sell one and receive {{ usd(prem * 100) }}, and you set aside {{ usd(cash) }} of cash.

At expiration:

- **ACME at or above $95.** The put expires worthless. You keep {{ usd(prem * 100) }}, a return of {{ pct(prem * 100 / cash, 2) }} on the {{ usd(cash) }} you set aside, for 30 days. You do not own ACME.
- **ACME below $95.** You are assigned and buy 100 shares at $95, paying {{ usd(cash) }}. Since you already received {{ usd(prem) }} a share, your **effective purchase price** is $95 − {{ usd(prem) }} = **{{ usd(eff) }}**. That is also the [[break-even]].
- **ACME collapses to $80.** You still buy at $95. Your shares are worth $8,000, and your loss including the premium is {{ usd(-payoff.pnlAtExpiry(csp, 80)) }}. The worst case, ACME at zero, is a loss of {{ usd(-s.maxLoss) }}.

Meanwhile the {{ usd(cash) }} need not sit idle. At the Course's 4% rate, it would earn about {{ usd(interest) }} over the 30 days in a money-market fund or Treasury bills, if your broker lets you hold the collateral there.
:::

The effective purchase price is the headline number for this strategy. It answers the question "if this goes wrong, what did I pay for the stock?" If {{ usd(eff) }} is a price at which you would be glad to own ACME, the trade is consistent with your view. If you would not want ACME at {{ usd(eff) }} when it is falling hard, you should not sell the put.

## Compared with a limit order

A good-til-canceled limit order to buy at $95 and a short 95 put both say "I will buy at $95". They behave differently:

- The limit order fills the moment ACME trades at $95, at any time. If ACME dips to $94 on day 5 and recovers to $110, you own the shares and make the rally. The put seller in that path is never assigned and keeps only {{ usd(prem * 100) }}.
- The put is usually assigned only at expiration, and only if ACME is below $95 then. If ACME drifts to $96, the limit order never fills and earns nothing; the put seller keeps the premium.
- If ACME gaps from $100 to $80 overnight, a limit buy at $95 fills at about $80, because a limit order fills at your price *or better*. The put seller must still pay $95.

So the put pays you for accepting a worse outcome in a crash and giving up the rally after a brief dip. That trade-off is the premium.

## The same risk as a covered call

The [covered call](#core-09-covered-call) Lesson showed that long stock plus a short call pays like a short put. The reverse also holds: a cash-secured put is a covered call in different clothes.

:::example The 95 cash-secured put against the 95 covered call
Instead of selling the 95 put, buy 100 ACME at $100 and sell the December 95 call at its bid of {{ usd(c95.bid) }}.

| | Cash-secured 95 put | Covered call on the 95 strike |
|---|---|---|
| Cash committed | {{ usd(cash) }} | {{ usd((100 - c95.bid) * 100) }} |
| Max profit | {{ usd(s.maxProfit) }} | {{ usd(ccs.maxProfit) }} |
| Break-even | {{ usd(s.breakevens[0]) }} | {{ usd(ccs.breakevens[0]) }} |
| P&L if ACME ends at $85 | {{ usd(payoff.pnlAtExpiry(csp, 85)) }} | {{ usd(payoff.pnlAtExpiry(cc95, 85)) }} |
| Position delta today | {{ num(g.delta, 0) }} shares | {{ num(ccg.delta, 0) }} shares |
| Theta today | {{ signedUsd(g.theta) }} a day | {{ signedUsd(ccg.theta) }} a day |
| Vega today | {{ signedUsd(g.vega) }} per vol point | {{ signedUsd(ccg.vega) }} per vol point |

Within a few dollars, they are the same trade.
:::

Choose between them on practical grounds. The put is one order and one commission instead of two legs, and you end up owning stock only if it falls. The covered call keeps you a shareholder (you receive dividends and can vote), and it is the natural choice when you already own the shares. Neither is safer than the other.

## Choosing the strike

The same delta logic as for covered calls applies, mirrored:

| December put sold | Delta | Premium | Effective purchase price | Return if not assigned |
|---|---|---|---|---|
| 90 | {{ num(p90.delta, 2) }} | {{ usd(p90.bid) }} | {{ usd(90 - p90.bid) }} | {{ pct(p90.bid / 90, 2) }} |
| 95 | {{ num(p95.delta, 2) }} | {{ usd(p95.bid) }} | {{ usd(95 - p95.bid) }} | {{ pct(p95.bid / 95, 2) }} |
| 100 | {{ num(p100.delta, 2) }} | {{ usd(p100.bid) }} | {{ usd(100 - p100.bid) }} | {{ pct(p100.bid / 100, 2) }} |

A higher strike pays more and is more likely to be assigned; the at-the-money put is close to a coin flip. A lower strike buys you a lower entry price at the cost of far less income. Notice that the out-of-the-money puts are priced at higher [[implied volatility]] than the calls the same distance away (the [[volatility skew]] from [Implied volatility](#core-06)). Put sellers are paid a little extra for taking crash risk, and crashes are when they pay it back.

## Before expiration and early assignment

Like any short option, the short put gains from time passing (theta {{ signedUsd(g.theta) }} a day today) and loses if implied volatility rises (vega {{ signedUsd(g.vega) }} per point). A sharp fall hurts twice: the put moves into the money and its implied volatility usually jumps. Even with no change in implied volatility, ten days in with ACME at $92 the position shows {{ usd(payoff.pnlAt(csp, 92, 10, env)) }}; at the same price at expiration, {{ usd(payoff.pnlAtExpiry(csp, 92)) }}.

A put that is deep in the money with little time value left can be exercised early, because its holder would rather have the strike price in cash, earning interest, now. If that happens you simply own the shares a little sooner at the same effective price. Dividends work the other way for puts: a put holder has no reason to exercise just before an ex-dividend date.

```tool position-builder
{ title: 'Cash-secured December 95 put', legs: csp, range: [75, 115] }
```

:::rule Approval for selling puts (as of 2026)
FINRA Rule 2360 requires brokers to approve each customer for the kinds of options trades they may make. Brokers set their own approval levels: most allow covered calls and cash-secured puts at their lowest levels and in IRAs, and require a margin account and a higher level for naked puts. The collateral for a cash-secured put is the full strike times 100, net of the premium at some brokers. See [Accounts and orders](#core-08).
:::

:::key
A cash-secured put pays you to wait for a lower entry price; if assigned, your effective purchase price is the strike minus the premium. It has the same payoff, Greeks and risk as a covered call on the same strike. Sell one only at a price where you truly want to own the stock, including after a sharp fall.
:::

```quiz
- q: >-
    You sell the December 90 put at {{ usd(p90.bid) }} and are assigned. What is your effective purchase price?
  choices:
    - >-
      $90.00
    - >-
      {{ usd(90 - p90.bid) }}
    - >-
      {{ usd(90 + p90.bid) }}
  answer: 1
  explain: >-
    You pay $90 for the shares, but you already received {{ usd(p90.bid) }}, so your net cost is {{ usd(90 - p90.bid) }}. Adding the premium gets the direction wrong: the premium is cash you received, not a fee you paid.
- q: >-
    ACME gaps from $100 to $82 overnight. Compare a short December 95 put with a limit order to buy at $95.
  choices:
    - >-
      Both buy the shares at $95
    - >-
      The put seller is obliged to buy at $95; the limit order fills near $82
    - >-
      The limit order buys at $95; the put seller is not affected until expiration
  answer: 1
  explain: >-
    A limit buy order fills at your limit or better, so after a gap it fills near the new price. The short put is an obligation to pay $95 whatever the market price, which is why the put seller is paid a premium and the limit order is free.
- q: >-
    Which position has nearly the same payoff, delta, theta and vega as a cash-secured December 95 put?
  choices:
    - >-
      Long 100 shares plus a long December 95 put
    - >-
      Long 100 shares plus a short December 95 call
    - >-
      A long December 95 call
  answer: 1
  explain: >-
    By put-call parity, stock plus a short call on the same strike pays like a short put plus cash. The table in this Lesson shows their max profit, break-even and Greeks match within a few dollars. Stock plus a long put is a protective put, which is the opposite risk.
- q: >-
    You sold the December 95 put. Ten days later ACME has fallen to $92 and implied volatility has risen. Which statement is right?
  choices:
    - >-
      The higher implied volatility helps you, because you collected the premium
    - >-
      The higher implied volatility makes the put more expensive to buy back, adding to the loss
    - >-
      Implied volatility does not matter for a cash-secured put
  answer: 1
  explain: >-
    You are short an option, so your vega is negative: a rise in implied volatility increases the value of the put you owe. Falling prices and rising volatility often arrive together, which is why short puts lose quickly in sell-offs.
```
