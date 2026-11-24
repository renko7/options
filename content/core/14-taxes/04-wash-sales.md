---
title: Wash sales and options
summary: Recognize when buying an option, or rebuying one, turns a loss into a wash sale, and work out where the disallowed loss goes.
---

```calc
const ST = 0.32;
const jan = chain(ACME, { dte: 58 });
const row = (k) => jan.rows.find((r) => r.strike === k);
const sharesSold = 200, buyPx = 120, sellPx = 100;
const lossTotal = (buyPx - sellPx) * sharesSold;
const callPx = row(100).call.ask;
const covered = 100;
const disallowed = (buyPx - sellPx) * covered;
const allowed = lossTotal - disallowed;
const callBasis = callPx * 100 + disallowed;
const callSale = 6.50;
const laterResult = callSale * 100 - callBasis;
const c105 = row(105).call.ask;
const optSale = 1.20, optRebuy = 1.50;
const optLoss = (c105 - optSale) * 100;
const optNewBasis = optRebuy * 100 + optLoss;
const taxShift = allowed * ST;
```

Selling a losing position before year end to bank the tax loss is a standard practice, called tax-loss harvesting. The [[wash sale]] rule stops you from doing it while keeping the position. For stock traders the rule is familiar: sell at a loss, buy the same stock back within 30 days, and the loss is disallowed. Options widen the rule in both directions. Buying a call can trigger it on a stock loss, and losses on options themselves are covered.

## The rule

:::rule Wash sales (as of 2026)
You cannot deduct a loss from selling or trading stock or securities if, within 30 days before or after the sale (a 61-day window), you:

1. buy substantially identical stock or securities,
2. acquire substantially identical stock or securities in a fully taxable trade,
3. acquire a contract or option to buy substantially identical stock or securities, or
4. acquire substantially identical stock for your IRA or Roth IRA.

It is also a wash sale if your spouse or a corporation you control makes the purchase. The rule covers losses on contracts and options to buy or sell stock or securities, as well as on the stock itself.
:::

Three features of the rule surprise people.

- **The window runs both ways.** Buying first and then selling the older shares at a loss within 30 days is a wash sale just as much as selling first and buying back.
- **A call option counts as a purchase.** Item 3 means you cannot sell ACME at a loss and buy ACME calls within the window to keep the upside.
- **It reaches across accounts and people.** A purchase in your other brokerage account, your spouse's account or your IRA counts.

## Where the disallowed loss goes

A wash sale does not destroy the loss in most cases. It postpones it.

:::rule Basis and holding period after a wash sale (as of 2026)
The disallowed loss is added to the cost of the new stock or securities, which becomes their basis, and the holding period of the shares you sold is added to the holding period of the new ones. If the replacement was bought in an IRA or Roth IRA, the loss is not added to any basis.
:::

The IRA case is the one where the loss is effectively lost for good: the replacement is inside an account that is not taxed this way, so there is nothing for the basis adjustment to attach to.

:::example Harvesting a stock loss and buying a call
You bought {{ int(sharesSold) }} ACME shares at ${{ int(buyPx) }} in March 2026. On {{ longDate(TODAY) }}, with ACME at ${{ int(sellPx) }}, you sell them all to realize a loss of {{ usd(lossTotal, 0) }}. You still like ACME, so a week later you buy one ACME January 100 call at {{ usd(callPx) }}.

**What is disallowed.** One call is an option to buy 100 shares, so it replaces {{ int(covered) }} of the {{ int(sharesSold) }} shares you sold. The loss on those {{ int(covered) }} shares, {{ usd(disallowed, 0) }}, is disallowed. The loss on the other 100 shares, {{ usd(allowed, 0) }}, is deductible in 2026.

**Where it goes.** The {{ usd(disallowed, 0) }} is added to the call's basis: {{ usd(callPx * 100) }} + {{ usd(disallowed, 0) }} = **{{ usd(callBasis) }}**.

**When it comes back.** In January 2027 you sell the call for {{ usd(callSale) }}, or {{ usd(callSale * 100) }}. Your result is {{ usd(callSale * 100) }} − {{ usd(callBasis) }} = {{ usd(laterResult) }}: the postponed loss reappears on the 2027 return, less the call's own gain. Had you waited 31 days to buy the call, the full {{ usd(lossTotal, 0) }} would have been a 2026 loss.
:::

When the replacement is smaller than the sale, as here, only the matched part of the loss is disallowed. When it is larger (three calls against 200 shares sold), the whole loss is disallowed and allocated to the replacement contracts in the order you bought them.

## Losses on options themselves

The same rule applies when the losing position is an option.

:::example Selling a losing call and buying it back
You bought one ACME January 105 call at {{ usd(c105) }}. On December 1, ACME has fallen and you sell the call at {{ usd(optSale) }}, a loss of {{ usd(optLoss) }}. On December 10 you buy the same January 105 call back at {{ usd(optRebuy) }}.

The {{ usd(optLoss) }} loss is disallowed, and the new call's basis is {{ usd(optRebuy * 100) }} + {{ usd(optLoss) }} = **{{ usd(optNewBasis) }}**. If it expires worthless in January, the whole {{ usd(optNewBasis) }} becomes a loss then, in 2027.
:::

## What counts as substantially identical

:::rule Substantially identical (as of 2026)
Whether stock or securities are substantially identical depends on all the facts and circumstances. Ordinarily, stocks or securities of one corporation are not considered substantially identical to those of another corporation.
:::

For options, the IRS has not published a test for when two options on the same stock with different strikes or expirations are substantially identical to each other. Rebuying the identical contract (same underlying, type, strike and expiration) is clearly a wash sale. A call on the same stock at a nearby strike or in the next month is a gray area, and conservative traders treat it as one. Calls on a *different* company, even a close competitor, ordinarily do not trigger the rule.

Writing puts is a related gray area. Writing a put is not buying an option, but the IRS has ruled (Revenue Ruling 85-87) that writing a put so deep in the money that there is no substantial likelihood it will go unexercised is in substance a contract to acquire the stock, so it can trigger a wash sale on a recent stock loss. Writing an out-of-the-money put is not addressed by that ruling.

:::warning Your 1099-B will not catch most of this
Brokers are required to report a wash sale on Form 1099-B (box 1g) only when the sale and the purchase are of the same security, identified by the same CUSIP number, in the same account. A call bought after a stock sale, a purchase in another account or in an IRA, or your spouse's purchase will usually not be reported. You are still required to apply the rule; report the adjustment on Form 8949 with code "W" and the disallowed loss in column (g).
:::

:::rule Reporting a wash sale yourself (as of 2026)
You cannot deduct a loss from a wash sale even if it is not reported on Form 1099-B. Report the sale on Form 8949 with code "W" in column (f) and the disallowed loss as a positive number in column (g).
:::

## Harvesting losses without a wash sale

The ways around the rule all follow from its text.

- **Wait.** Repurchase on day 31 or later, accepting the market risk of being out for a month.
- **Replace with something not substantially identical.** A different company in the same industry, or a broad index fund, keeps market exposure without repurchasing the same stock.
- **Watch both sides of the window.** Check that you did not buy shares or calls in the 30 days *before* the sale, including dividend reinvestment and purchases in other accounts.
- **Year end.** A loss realized in late December and "washed" by a purchase in early January moves the loss into the next year at best. In this Lesson's first example, waiting would have kept {{ usd(disallowed, 0) }} of loss in 2026; at the assumed {{ pct(ST, 0) }} rate, that is {{ usd(disallowed * ST) }} of 2026 tax postponed.

:::key
A loss on stock or an option is disallowed if you buy substantially identical stock or securities, or an option to buy them, within 30 days before or after the sale, in any of your accounts, your spouse's, or your IRA. The disallowed loss moves into the replacement's basis and comes back when that is sold, except in an IRA, where it is lost. Brokers report only same-security, same-account wash sales; the rest are yours to find.
:::

```quiz
- q: >-
    You sell 200 ACME shares at a {{ usd(lossTotal, 0) }} loss and, 10 days later, buy two ACME January 100 calls. How much of the loss is disallowed?
  choices:
    - >-
      None: calls are not shares
    - >-
      {{ usd(disallowed, 0) }}, the loss on 100 shares
    - >-
      All {{ usd(lossTotal, 0) }}
  answer: 2
  explain: >-
    Each call is an option to buy 100 shares, so two calls replace all 200 shares sold within the window, and the whole loss is disallowed. With one call, only the loss on 100 shares would be. Options to buy substantially identical stock are explicitly covered by the rule.
- q: >-
    After the wash sale in this Lesson's example, what is the basis of the January 100 call bought for {{ usd(callPx) }}?
  choices:
    - >-
      {{ usd(callPx * 100) }}
    - >-
      {{ usd(callBasis) }}
    - >-
      {{ usd(callPx * 100 + lossTotal) }}
  answer: 1
  explain: >-
    The disallowed {{ usd(disallowed, 0) }} (the loss on the 100 shares the call replaced) is added to the call's cost of {{ usd(callPx * 100) }}. Adding the full {{ usd(lossTotal, 0) }} would count the deductible half twice. Leaving the basis at cost would lose the postponed loss altogether.
- q: >-
    You sell ACME at a loss in your taxable account and buy ACME the next day in your IRA. What happens to the loss?
  choices:
    - >-
      It is disallowed, and it is not added to any basis
    - >-
      Nothing: the IRA is a separate account
    - >-
      It is disallowed and added to the basis of the IRA shares
  answer: 0
  explain: >-
    A purchase for your IRA within the window is a wash sale, and the basis adjustment does not apply to it, so the loss is effectively lost. The rule looks at all your purchases, not one account. Your broker will almost certainly not report this one.
- q: >-
    Which of these, done within 30 days after selling ACME shares at a loss, is least likely to create a wash sale?
  choices:
    - >-
      Buying ACME calls in another brokerage account
    - >-
      Buying shares of a different company in the same industry
    - >-
      Writing a deep in-the-money ACME put that is almost certain to be exercised
  answer: 1
  explain: >-
    Ordinarily, stock of one corporation is not substantially identical to stock of another, so a competitor's shares do not trigger the rule. Calls on ACME are options to acquire the same stock, in any of your accounts. A deep in-the-money put you write has been treated by the IRS as, in substance, a contract to acquire the stock.
```
