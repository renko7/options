---
title: Buying power, margin calls and day-trading rules
summary: Read your buying power correctly for option trades, work out when a margin call will arrive, and know how the 2026 replacement of the pattern-day-trader rule affects you.
---

```calc
const q30 = chain(ACME, { dte: 30 });
const p95bid = q30.rows.find((r) => r.strike === 95).put.bid;
const req1 = 100 * Math.max(p95bid + 20 - 5, p95bid + 9.5);
const cash = 10000;
const stockBP = 2 * cash;
const optBPafter = cash - 2 * (req1 - p95bid * 100);
const startEq = 5000;
const sig95 = smileIV(ACME, 95, 20 / 365);
const p95later = Number(bs.price({ S: 90, K: 95, T: 20 / 365, r: RATE, q: ACME.q, sigma: sig95, type: 'put' }).toFixed(2));
const loss2 = 2 * (p95later - p95bid) * 100;
const eqLater = startEq - loss2;
const req2later = 2 * 100 * Math.max(p95later + 0.2 * 90, p95later + 9.5);
const call = req2later - eqLater;
```

Your broker's screen shows a number called [[buying power]]. New option traders often treat it as "how much I can trade". It is more specific than that, and it behaves differently for options than for stock. This Lesson explains what the number means, how a margin call arises when a position moves against you, and the rules on day trading, which changed in 2026.

## What buying power means

Buying power is the dollar value of new positions your broker will let you open right now, given your cash, your positions and the margin they already use. Brokers usually show several versions:

- **Stock buying power.** In a margin account Reg T lets you buy stock with 50% down, so each dollar of excess equity buys two dollars of stock.
- **Option buying power.** Options with nine months or less to expiration cannot be bought on margin, so each dollar of excess equity buys one dollar of options. Selling options uses buying power equal to their margin requirement, less the premium received.
- **Cash or settled cash.** In a cash account, what you can spend without using unsettled proceeds.

:::example Buying power in a $10,000 margin account
You deposit $10,000 cash in a margin account.

- Stock buying power: up to {{ usd(stockBP) }} of ACME shares, half of it borrowed.
- Option buying power: {{ usd(cash) }}. You could buy {{ usd(cash) }} of calls, not {{ usd(stockBP) }}.

Now you sell two naked ACME December 95 puts at {{ usd(p95bid) }}. Each requires {{ usd(req1) }}, and each brings in {{ usd(p95bid * 100) }} of premium, so your option buying power falls to about {{ usd(optBPafter) }}.

The order ticket's preview shows this before you send. Brokers' exact calculations differ (house requirements, how premium is credited), so treat the ticket's number as the real one.
:::

The danger is reading buying power as safety. Option buying power after the two puts is still about {{ usd(optBPafter) }}, so the ticket would let you sell several more. The number tells you what the broker will *permit* today, not what you can *afford to lose*. Sizing is covered in [Managing trades](#core-12).

## How a margin call happens

A margin call is a demand for more equity. There are two kinds:

- A **Reg T call** (also called a Fed call) when a new position is opened without enough initial margin. It usually has to be met within a few business days.
- A **maintenance call** (or house call) when losses push your equity below the maintenance requirement on positions you already hold. Brokers often give little time, and can liquidate positions without waiting at all.

:::example The two puts go wrong
Start with {{ usd(startEq) }} of equity and two naked ACME December 95 puts sold at {{ usd(p95bid) }}, requiring {{ usd(req1 * 2) }} in total. Twenty days later ACME has fallen to $90 and each put is worth about {{ usd(p95later) }}.

- Loss on the puts: 2 × ({{ usd(p95later) }} − {{ usd(p95bid) }}) × 100 = {{ usd(loss2) }}. Equity falls to {{ usd(eqLater) }}.
- New requirement: 2 × 100 × ({{ usd(p95later) }} + 20% × $90) = {{ usd(req2later) }}.
- Shortfall: **{{ usd(call) }}**. You receive a maintenance call.

You can deposit cash, close one or both puts, or let the broker close positions for you. Closing the puts at {{ usd(p95later) }} locks in the {{ usd(loss2) }} loss. If ACME keeps falling before you act, the shortfall grows; if the broker acts first, it chooses what to sell and at what price.
:::

The position builder shows the two puts. Move ACME down and Days passed forward and watch the loss grow; the margin requirement grows alongside it.

```tool position-builder
{ title: 'Two naked ACME December 95 puts', legs: [{ kind: 'put', qty: -2, strike: 95, premium: p95bid, dte: 30 }], range: [75, 110], daysPassed: 20 }
```

:::warning Liquidation happens at the worst prices
Brokers liquidate when your account is under water, which is when the stock has gapped, volatility has jumped and option spreads are wide. Margin agreements let the broker choose what to sell and when. Do not let your broker manage your risk for you; keep enough spare equity that a normal bad week does not trigger a call.
:::

## Day trading: the old rule and its replacement

A day trade is opening and closing the same position on the same day in a margin account: buying an ACME call at 10:00 and selling it at 14:00, for example. For more than twenty years US margin accounts were governed by the pattern-day-trader rule. In 2026 FINRA replaced it, but brokers are allowed to phase in the new rule, so you may still meet the old one.

:::rule The pattern-day-trader rule and its replacement (as of 2026)
**The old rule (FINRA Rule 4210 day-trading provisions).** A customer who made four or more day trades within five business days in a margin account (where those were more than 6% of the account's trades in the period) was designated a [[pattern day trader]]. A pattern day trader needed at least $25,000 of equity in the account on any day they day traded; below that, day trading was blocked until equity was restored, and unmet day-trading margin calls led to restrictions.

**The replacement.** The SEC approved FINRA's amendments on April 14, 2026 (FINRA Regulatory Notice 26-10). They remove the pattern-day-trader designation, the day-trade count and the $25,000 minimum entirely and replace them with *intraday margin* standards:

- For every margin account (other than portfolio margin and certain other account types) on any day with a transaction that reduces its margin cushion, the broker must determine the account's intraday margin deficit: broadly, the largest amount by which the margin required exceeded the account's equity after such a transaction during the day. Brokers may enforce it in real time, blocking trades that would create a deficit.
- A deficit must be met as promptly as possible, by deposits or by changes that increase the account's margin cushion. It stays outstanding until met, or until the close on the 15th business day after it arose.
- If a customer makes a practice of failing to meet deficits promptly and leaves one unmet by the close of the fifth business day, the account is frozen for 90 days against new short positions or new borrowing (closing trades are allowed) unless the deficit is met. Small deficits (no more than the lesser of 5% of the account's equity or $1,000) do not count toward that practice.
- Regular maintenance margin requirements, and the $2,000 minimum equity for a margin account, are unchanged.

**Timing.** The amendments took effect on June 4, 2026, but brokers may phase in implementation until October 20, 2027. Until your broker switches over, it may still apply the old pattern-day-trader rule. Ask your broker which regime applies to your account, and check its own house rules, which can be stricter than either.
:::

Two consequences matter for option traders:

1. **Under the old rule, small accounts were limited to three day trades in five business days.** Closing a losing option the same day you opened it counted. Many traders held positions overnight they would rather have closed, just to avoid the count.
2. **Under the new rule, there is no count, but there is a cost to running a deficit.** If during the day your positions require more margin than your equity covers, even briefly, you must make it good. Brokers will likely block orders that would create a deficit, so in practice the order ticket enforces it.

Cash accounts were never subject to the pattern-day-trader rule, and they are not subject to the intraday margin rule. They are limited instead by settlement: you can trade only with settled funds, and option sale proceeds settle the next business day.

:::key
Option buying power is one dollar per dollar of excess equity, because short-dated options cannot be bought on margin; selling options uses buying power equal to their requirement less the premium. Losses on naked positions cut equity while raising the requirement, which produces maintenance calls the broker can enforce by liquidating. The pattern-day-trader rule ($25,000, four day trades in five days) was replaced in 2026 by intraday margin standards, effective June 4, 2026, with brokers allowed to phase in until October 20, 2027.
:::

```quiz
- q: >-
    You have $10,000 of cash in a margin account and nothing else. What is the most you can spend buying ACME December calls?
  choices:
    - >-
      {{ usd(cash) }}
    - >-
      {{ usd(stockBP) }}
    - >-
      {{ usd(cash * 4) }}
  answer: 0
  explain: >-
    Options with nine months or less to expiration must be paid in full, so option buying power is one dollar per dollar of equity: {{ usd(cash) }}. {{ usd(stockBP) }} is stock buying power, which uses Reg T's 50% initial margin. Four times the account's excess maintenance margin was the old intraday buying power for pattern day traders trading stock, not a limit for buying options.
- q: >-
    You hold two naked ACME December 95 puts in a {{ usd(startEq) }} account. ACME falls to $90 and each put is worth {{ usd(p95later) }}. Why do you get a margin call?
  choices:
    - >-
      Your equity has fallen to {{ usd(eqLater) }} while the requirement has risen to {{ usd(req2later) }}
    - >-
      Because any loss on a naked option triggers a call
    - >-
      Because the puts are now in the money and must be closed
  answer: 0
  explain: >-
    The loss cuts your equity and the higher put price and lost out-of-the-money reduction raise the requirement at the same time, leaving a {{ usd(call) }} shortfall. A loss alone does not trigger a call if enough excess equity remains. Being in the money does not force you to close; the shortfall does.
- q: >-
    It is November 2026. Your broker still tells you that you are limited to three day trades in five days because your margin account has less than $25,000. Is that allowed?
  choices:
    - >-
      No; the rule was abolished on June 4, 2026
    - >-
      Yes; brokers may phase in the new intraday margin standards until October 20, 2027, and may keep stricter house rules
    - >-
      Only for cash accounts
  answer: 1
  explain: >-
    The replacement took effect June 4, 2026, but FINRA allowed members to phase in implementation over 18 months, until October 20, 2027, so a broker that has not switched may still apply the old pattern-day-trader rule. Brokers may also impose stricter house rules. Cash accounts were never subject to the pattern-day-trader rule.
- q: >-
    Under the new intraday margin standards, which statement is accurate?
  choices:
    - >-
      Any account below $25,000 is barred from day trading
    - >-
      There is no day-trade count; instead an intraday margin deficit must be met promptly, with a 90-day freeze for customers who make a practice of not meeting them
    - >-
      Maintenance margin requirements were abolished
  answer: 1
  explain: >-
    The amendments replaced the count and the $25,000 minimum with a requirement to measure and satisfy intraday margin deficits, backed by a 90-day freeze for repeated failures. The $25,000 minimum belonged to the old rule. Regular maintenance requirements were left in place; the new standard supplements them.
```
