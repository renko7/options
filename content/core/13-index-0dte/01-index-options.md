---
title: Index options and cash settlement
summary: Explain what an index option is, calculate its cash settlement and notional value, and see how its size and European style change the way you trade it.
---

```calc
const q = chain(HBR, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const c5000 = row(5000).call;
const p5000 = row(5000).put;
const p4950 = row(4950).put;
const p4850 = row(4850).put;
const notional = HBR.spot * HBR.multiplier;
const acmeNotional = ACME.spot * ACME.multiplier;
const callCost = c5000.ask * 100;
const settleUp = 5180;
const callPay = (settleUp - 5000) * 100;
const callPnl = callPay - callCost;
const debit = p5000.ask - p4950.bid;
const settleDown = 4930;
const spreadPay = (Math.min(5000 - settleDown, 50)) * 100;
const spreadPnl = spreadPay - debit * 100;
const perPoint = c5000.delta * 100;
const deltaNotional = c5000.delta * notional;
const otm = 5000 - 4850;
const nakedStd = 100 * (p4850.bid + 0.15 * 5000 - otm);
const nakedMin = 100 * (p4850.bid + 0.10 * 4850);
const nakedReq = Math.max(nakedStd, nakedMin);
const spreadLegs = [{ kind: 'put', qty: 1, strike: 5000, premium: p5000.ask, dte: 30, iv: p5000.iv }, { kind: 'put', qty: -1, strike: 4950, premium: p4950.bid, dte: 30, iv: p4950.iv }];
```

An ACME option is a claim on 100 shares of one company. An [[index option]] is a claim on the *level* of a stock index: a number calculated from the prices of many stocks, which nobody can deliver. So index options are settled in cash, they are usually European-style, and they are large. Those three facts shape everything about how they are traded. This Module uses the Fictional Index, the Harbor 100 (HBR), at 5,000.

## How an index option pays

An index option's strike is an index level, and its premium is quoted in index points. The [[index multiplier]], $100 for HBR, turns points into dollars: both the premium and the settlement are points × $100.

At expiration there is no stock to deliver. The OCC calculates an official [[settlement value]] for the index, and every in-the-money option is settled by [[cash settlement]]:

\[ \text{Call pays} = \max(\text{settlement value} - K,\ 0) \times \$100 \qquad \text{Put pays} = \max(K - \text{settlement value},\ 0) \times \$100 \]

:::example An HBR call held to expiration
HBR is at 5,000. The HBR December 5,000 call (30 days) is offered at {{ num(c5000.ask) }} points. One contract costs {{ num(c5000.ask) }} × $100 = **{{ usd(callCost) }}**.

At expiration HBR's settlement value is 5,180. The call is 180 points in the money and the account is credited 180 × $100 = {{ usd(callPay) }}. Your profit is {{ usd(callPnl) }}. Nothing else happens: no shares arrive, no cash is needed to "exercise", and the position is gone.

If the settlement value is 5,000 or below, the call expires and you lose the {{ usd(callCost) }} premium.
:::

:::example A put spread settled in cash
Buy the HBR December 5,000 put at {{ num(p5000.ask) }} and sell the December 4,950 put at {{ num(p4950.bid) }}, a net debit of {{ num(debit) }} points, {{ usd(debit * 100) }}.

HBR settles at 4,930. The 5,000 put pays 70 points and the short 4,950 put costs you 20, so the spread pays 50 points, its full width: {{ usd(spreadPay) }}. Your profit is {{ usd(spreadPnl) }}.

Both legs settle in cash on the same number, so there is never a stock position left over and no question of one leg being assigned without the other. That is a real advantage over the same spread on ACME.
:::

:::rule Index option settlement (as of 2026)
- Index options listed in the US, such as SPX and XSP, are settled in cash through the OCC. The settlement amount is the difference between the settlement value and the strike, times the multiplier; it is credited or debited on the next business day.
- Expiring index options that are in the money by $0.01 or more are exercised automatically under the OCC's exercise-by-exception procedure, as for equity options.
- Most US index options, including SPX and XSP, are European-style. A few are American-style (S&P 100 options under the symbol OEX are an example), so check each product's specifications.
:::

## European style: no early assignment

Because SPX-style index options are European, they can be exercised only at expiration. A writer of an HBR put cannot be assigned early, however deep in the money it goes. That removes the two early-assignment problems of [Exercise, assignment and expiration](#core-07): there is no [[dividend risk]] on short calls, and no early exercise of deep in-the-money puts. You know, on the day you open a short index option, that the only settlement date is expiration.

The trade-off is that a European option can be worth *less* than its intrinsic value before expiration (a deep in-the-money put, when interest rates are positive, for example), and you cannot fix that by exercising. You can only sell it.

## Notional value: index options are big

The [[notional value]] of an option is the value of what it controls: the underlying price times the multiplier.

:::example How big is one HBR contract?
- One HBR contract controls 5,000 × $100 = **{{ usd(notional) }}** of index.
- One ACME contract controls $100 × 100 = {{ usd(acmeNotional) }} of stock.

One HBR option has the same exposure to its index as {{ int(notional / acmeNotional) }} ACME contracts have to ACME. The at-the-money December call's delta is about {{ num(c5000.delta) }}, so it moves about {{ usd(perPoint) }} for each one-point move in HBR, like holding roughly {{ usd(deltaNotional, 0) }} of the index.
:::

Size matters most for writers. The margin formula for a naked broad-based index option uses 15% of the index value, rather than the 20% used for stocks (see [Accounts and orders](#core-08)):

- Selling one HBR December 4,850 put at {{ num(p4850.bid) }}: 100 × ({{ num(p4850.bid) }} + 15% × 5,000 − {{ int(otm) }}) = **{{ usd(nakedReq) }}** of margin, against {{ usd(p4850.bid * 100) }} of premium.

A single naked HBR put needs more margin than many Learners' whole accounts, and a fall in the index to 4,000 would cost (4,850 − 4,000) × $100 = {{ usd((4850 - 4000) * 100) }} minus the premium. That is why most individual traders who use index options trade them as spreads, or trade the smaller versions compared in the [next Lesson](#core-13-spx-spy-xsp).

The position builder holds the 5,000/4,950 put spread. Move HBR below 4,950 to see the payoff flatten at the spread's width, and drag Days passed to see how its value changes before expiration.

```tool position-builder
{ title: 'HBR December 5,000/4,950 put spread', underlying: 'HBR', spot: 5000, legs: spreadLegs, range: [4800, 5200] }
```

:::key
An index option is a claim on an index level, settled in cash: the in-the-money points times the $100 multiplier, calculated from an official settlement value. Most, like SPX and HBR, are European, so writers cannot be assigned early and dividend risk disappears. They are large: one HBR contract has a notional value of {{ usd(notional) }}, which is why naked index options carry large margin and are usually traded as spreads.
:::

```quiz
- q: >-
    You hold one HBR 4,950 put. HBR's settlement value at expiration is 4,912.50. What happens?
  choices:
    - >-
      You must deliver 100 units of the index
    - >-
      Your account is credited {{ usd((4950 - 4912.5) * 100) }}
    - >-
      Your account is credited {{ usd(4950 - 4912.5) }}
    - >-
      Nothing, because European options are never exercised
  answer: 1
  explain: >-
    The put is 37.5 points in the money and each point is worth $100: {{ usd((4950 - 4912.5) * 100) }}, paid in cash. There is nothing to deliver for an index. Forgetting the multiplier gives {{ usd(4950 - 4912.5) }}. European options are exercised, automatically, at expiration; they just cannot be exercised before it.
- q: >-
    What is the notional value of one HBR option with HBR at 5,000?
  choices:
    - >-
      {{ usd(5000) }}
    - >-
      {{ usd(notional) }}
    - >-
      The premium times 100
  answer: 1
  explain: >-
    Notional value is the index level times the multiplier: 5,000 × $100 = {{ usd(notional) }}. {{ usd(5000) }} forgets the multiplier. The premium times 100 is the option's cost, not the amount of index it controls.
- q: >-
    You are short an HBR December 5,050 call that is deep in the money one week before expiration. Can you be assigned tonight?
  choices:
    - >-
      Yes, like any short option
    - >-
      No; HBR options are European-style and can be exercised only at expiration
    - >-
      Only if HBR pays a dividend tomorrow
  answer: 1
  explain: >-
    European-style options cannot be exercised before expiration, so no early assignment is possible, dividends or not. That is a key difference from ACME and other stock or ETF options, which are American-style and can be assigned any business day.
- q: >-
    Why do most individual traders use HBR-type index options in spreads rather than selling them naked?
  choices:
    - >-
      Naked index options are not allowed
    - >-
      A single naked contract needs margin of about {{ usd(nakedReq) }} and carries losses sized to a {{ usd(notional) }} notional
    - >-
      Spreads on index options are taxed differently
  answer: 1
  explain: >-
    Naked index options are allowed at the highest approval levels, but each one controls {{ usd(notional) }} of index and needs roughly {{ usd(nakedReq) }} of margin, so even one can be too large for a typical account. A spread caps both the margin and the loss at its width. Tax treatment depends on the product, not on whether it is a spread.
```
