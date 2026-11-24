---
title: Margin requirements for options
summary: Calculate the standard (Reg T and FINRA) margin requirement for long options, naked puts and calls, covered calls and spreads, and predict how it changes when the stock moves.
---

```calc
const q30 = chain(ACME, { dte: 30 });
const row = (k) => q30.rows.find((r) => r.strike === k);
const c100ask = row(100).call.ask;
const c105bid = row(105).call.bid;
const p95bid = row(95).put.bid;
const p90ask = row(90).put.ask;
const p80bid = row(80).put.bid;
const leaps = chain(ACME, { dte: 394 }).rows.find((r) => r.strike === 100).call.ask;
const naked = (prem, S, K, type) => {
  const otm = type === 'put' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const std = prem + 0.20 * S - otm;
  const min = prem + 0.10 * (type === 'put' ? K : S);
  return { std: std * 100, min: min * 100, req: Math.max(std, min) * 100, otm };
};
const nPut = naked(p95bid, 100, 95, 'put');
const nCall = naked(c105bid, 100, 105, 'call');
const nFar = naked(p80bid, 100, 80, 'put');
const credit = p95bid - p90ask;
const spreadReq = (95 - 90) * 100;
const spreadNet = spreadReq - credit * 100;
const spreadLegs = [{ kind: 'put', qty: -1, strike: 95, premium: p95bid, dte: 30 }, { kind: 'put', qty: 1, strike: 90, premium: p90ask, dte: 30 }];
const spreadSum = payoff.summary(spreadLegs);
const ccStock = 0.5 * 100 * 100;
const ccCash = ccStock - c105bid * 100;
// ACME falls to $90 with 20 days left
const sig95 = smileIV(ACME, 95, 20 / 365);
const p95later = Number(bs.price({ S: 90, K: 95, T: 20 / 365, r: RATE, q: ACME.q, sigma: sig95, type: 'put' }).toFixed(2));
const nLater = naked(p95later, 90, 95, 'put');
const loss = (p95later - p95bid) * 100;
```

Every option position in a margin account carries a margin requirement: the amount of equity the broker must see in the account to let you hold it. The requirement depends on the strategy, which is why this system is called *strategy-based* margin. The formulas are set by Regulation T and by FINRA and exchange rules; brokers may demand more but not less. This Lesson walks through each strategy with ACME numbers.

:::rule Strategy-based option margin minimums (as of 2026)
These are the regulatory minimums under Regulation T, FINRA Rule 4210 and the options exchanges' margin rules (for example Cboe Rule 10.3). Brokers can and do require more.

- **Long calls and puts** with nine months or less to expiration: pay in full. Listed equity and equity-index options with more than nine months to expiration may be bought on margin with 75% of the cost paid.
- **Naked short equity calls and puts:** 100% of the option's current value plus 20% of the underlying stock's value, minus any out-of-the-money amount, subject to a minimum of the option's value plus 10% of the stock's value (calls) or 10% of the strike price (puts). For broad-based index options the 20% becomes 15%.
- **Covered calls:** no requirement on the short call; the long stock carries its usual margin (50% initial under Reg T, 25% maintenance under FINRA rules).
- **Spreads** (long and short legs of the same type on the same underlying, with the long leg expiring no earlier than the short): a debit spread is paid in full; a credit spread requires the difference between the strikes times the multiplier, and the premium received can be applied to it.
:::

## Long options: pay in full

Buying the ACME December 100 call at {{ usd(c100ask) }} costs {{ usd(c100ask * 100) }}, all of it your own money, in a cash or margin account. You cannot borrow to buy a short-dated option, because it can lose all its value quickly.

Long-dated options are the exception. The December 2027 100 call, a [[LEAPS]] with more than nine months to run, costs {{ usd(leaps * 100) }} at {{ usd(leaps) }}. In a margin account you may pay 75%, {{ usd(leaps * 100 * 0.75) }}, and borrow the rest. Once it has nine months or less left, it has no margin value and must be fully paid.

## Naked puts and calls

A naked short option has open-ended risk, so the formula charges a slice of the underlying's value, reduced when the option is out of the money.

:::example Naked ACME December 95 put
ACME is at $100. You sell one December 95 put at {{ usd(p95bid) }}. The put is $5 out of the money.

\[ \text{Standard} = 100 \times \big(\text{put value} + 20\% \times \text{stock} - \text{OTM amount}\big) \]

- Standard: 100 × ({{ usd(p95bid) }} + $20.00 − $5.00) = **{{ usd(nPut.std) }}**
- Minimum: 100 × ({{ usd(p95bid) }} + 10% × $95) = {{ usd(nPut.min) }}

The requirement is the larger: **{{ usd(nPut.req) }}**. The {{ usd(p95bid * 100) }} premium you received sits in the account and counts toward it, so new equity tied up is {{ usd(nPut.req - p95bid * 100) }}.
:::

:::example Naked ACME December 105 call
You sell one December 105 call at {{ usd(c105bid) }}, $5 out of the money.

- Standard: 100 × ({{ usd(c105bid) }} + $20.00 − $5.00) = **{{ usd(nCall.std) }}**
- Minimum: 100 × ({{ usd(c105bid) }} + 10% × $100) = {{ usd(nCall.min) }}

Requirement: **{{ usd(nCall.req) }}**. For calls the minimum uses 10% of the stock price, for puts 10% of the strike.
:::

The minimum matters for far out-of-the-money options. The December 80 put is bid at {{ usd(p80bid) }} and is $20 out of the money, so the standard formula gives only {{ usd(nFar.std) }}. The minimum, 100 × ({{ usd(p80bid) }} + $8.00) = {{ usd(nFar.req) }}, applies instead. A put worth a few dollars a contract still ties up hundreds in margin, which is one reason selling very cheap options is less attractive than it looks.

## The requirement moves every day

The maintenance requirement is recalculated with current prices. Naked positions that go wrong get more expensive to hold exactly when you are losing money on them.

:::example ACME falls to $90
Twenty days later ACME is at $90 and your December 95 put is worth about {{ usd(p95later) }}. It is now $5 in the money, so there is no out-of-the-money reduction.

- Your loss on the put: ({{ usd(p95later) }} − {{ usd(p95bid) }}) × 100 = {{ usd(loss) }}.
- New requirement: 100 × ({{ usd(p95later) }} + 20% × $90) = **{{ usd(nLater.req) }}**, up from {{ usd(nPut.req) }}.

The loss reduces your equity at the same time as the requirement rises. An account that started with little more than the original {{ usd(nPut.req) }} now gets a margin call (covered in [the next Lesson](#core-08-buying-power-day-trading)).
:::

## Covered calls

If you own 100 ACME shares and sell the December 105 call against them, the call has no requirement: the shares fully cover it. You only margin the stock. Buying the shares on margin needs 50% down under Reg T, {{ usd(ccStock) }}, and the {{ usd(c105bid * 100) }} call premium can be applied, so you put up {{ usd(ccCash) }}. For margin purposes the shares are valued at no more than the call's strike, since you have agreed to sell them there. In a cash account you pay for the shares in full.

## Spreads: the requirement is the width

A spread's long leg limits the loss, and the margin rules recognize that. For a credit spread, the requirement is the [[spread width]] times 100, whatever the stock does.

:::example A December 95/90 put credit spread
Sell the December 95 put at {{ usd(p95bid) }} and buy the December 90 put at {{ usd(p90ask) }} for a net credit of {{ usd(credit) }}.

- Requirement: ($95 − $90) × 100 = **{{ usd(spreadReq) }}**.
- The {{ usd(credit * 100) }} credit is applied, so the net reduction in your buying power is {{ usd(spreadNet) }}.
- That is exactly the spread's maximum loss, {{ usd(-spreadSum.maxLoss) }}: the most the position can lose is fully set aside.

Unlike the naked put, this requirement does not grow if ACME falls to $90 or $50. It is one of the main practical reasons traders use spreads.
:::

A debit spread, such as buying the December 100 call and selling the December 105 call, is simply paid for in full: the net debit is the most you can lose, and there is nothing more to margin.

```tool position-builder
{ title: 'December 95/90 put credit spread', legs: [{ kind: 'put', qty: -1, strike: 95, premium: p95bid, dte: 30 }, { kind: 'put', qty: 1, strike: 90, premium: p90ask, dte: 30 }], range: [80, 110] }
```

Move ACME down in the position builder: below $90 the loss stops growing at {{ usd(-spreadSum.maxLoss) }}, the amount the margin rules made you set aside.

:::practice What brokers actually charge
Many brokers add "house" requirements on top: higher percentages for volatile stocks, larger minimums for naked options, extra charges before earnings, and higher requirements for concentrated positions. Some also check a short option's risk with stress scenarios. Your broker's margin calculator, or the requirement shown on the order ticket before you send it, is the number that counts.
:::

[[Reg T margin]] and the FINRA rules are the floor for strategy-based accounts. [[Portfolio margin]] replaces these formulas with a stress test of the whole portfolio, as described in [the previous Lesson](#core-08-approval-and-accounts).

:::key
Long options (nine months or less) are paid in full. A naked equity option requires its value plus 20% of the stock minus the out-of-the-money amount, with a floor of its value plus 10% of the stock (calls) or strike (puts), and the requirement rises as the trade goes wrong. A covered call adds nothing beyond the stock's margin. A credit spread requires its width times 100, which equals its maximum loss once the credit is applied.
:::

```quiz
- q: >-
    You sell one ACME December 105 call at {{ usd(c105bid) }} with ACME at $100. What is the standard margin requirement?
  choices:
    - >-
      {{ usd(nCall.req) }}
    - >-
      {{ usd(nCall.min) }}
    - >-
      {{ usd(c105bid * 100) }}
    - >-
      {{ usd(10500) }}
  answer: 0
  explain: >-
    100 × ({{ usd(c105bid) }} + 20% × $100 − $5 out of the money) = {{ usd(nCall.std) }}, which is above the {{ usd(nCall.min) }} minimum, so the requirement is {{ usd(nCall.req) }}. The minimum applies only when it is the larger of the two. The premium alone and the full strike value are not how naked call margin is calculated.
- q: >-
    You sell the December 95/90 put credit spread for {{ usd(credit) }}. ACME then falls to $70. What happens to the margin requirement?
  choices:
    - >-
      It stays at {{ usd(spreadReq) }}, the width of the spread
    - >-
      It rises with the naked put formula, to more than $2,000
    - >-
      It falls to zero because the long put is deep in the money
  answer: 0
  explain: >-
    A credit spread's requirement is fixed at the strike difference times 100 because the long 90 put caps the loss there. The naked-put formula applies only when the short put has no long put protecting it. The long put does protect you, but it does not remove the requirement: you still owe up to {{ usd(spreadReq) }} at expiration.
- q: >-
    Why does selling the far out-of-the-money December 80 put (bid {{ usd(p80bid) }}) tie up {{ usd(nFar.req) }} rather than a few dollars?
  choices:
    - >-
      Because the minimum requirement is the option's value plus 10% of the strike
    - >-
      Because brokers charge a flat fee per naked option
    - >-
      Because the put is in the money
  answer: 0
  explain: >-
    The standard formula gives only {{ usd(nFar.std) }} because the $20 out-of-the-money amount nearly cancels the 20% charge, but the rule sets a floor of the option's value plus 10% of the put's strike, {{ usd(nFar.req) }}. The put is out of the money, not in it. Brokers may add house charges, but the floor here is regulatory.
- q: >-
    You want to buy the December 2027 ACME 100 call at {{ usd(leaps) }} in a margin account. What is the least you can pay with your own money under the regulatory minimum?
  choices:
    - >-
      {{ usd(leaps * 100) }}
    - >-
      {{ usd(leaps * 100 * 0.75) }}
    - >-
      {{ usd(leaps * 100 * 0.5) }}
  answer: 1
  explain: >-
    Listed equity options with more than nine months to expiration can be bought on margin with 75% paid: {{ usd(leaps * 100 * 0.75) }}. Paying in full is always allowed but not the minimum. The 50% figure is the Reg T initial requirement for stock, not for options.
```
