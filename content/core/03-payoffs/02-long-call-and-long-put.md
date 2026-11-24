---
title: The long call and the long put
summary: Work out the break-even, maximum profit and maximum loss of a long call and a long put, and compare them with buying or shorting the stock.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const cp = row(100).call.ask;
const pp = row(100).put.ask;
const call = [{ kind: 'call', qty: 1, strike: 100, premium: cp }];
const put = [{ kind: 'put', qty: 1, strike: 100, premium: pp }];
const cs = payoff.summary(call);
const ps = payoff.summary(put);
const short = [{ kind: 'stock', qty: -100, price: 100 }];
const call3 = [{ kind: 'call', qty: 3, strike: 100, premium: cp }];
const s3 = payoff.summary(call3);
const tbl = [80, 90, 100, 110, 120].map((s) => `| $${s} | ${signedUsd(payoff.pnlAtExpiry(put, s))} | ${signedUsd(payoff.pnlAtExpiry(short, s), 0)} |`).join('\n');
```

Buying an option is the simplest options trade there is, and the one most people start with. You pay a premium, you have a right, and you know your worst case before you begin. This Lesson pins down the four numbers that describe any position (cost, break-even, maximum profit and maximum loss) for the [[long call]] and the [[long put]], using the at-the-money December options.

## The long call

You buy a call when you expect the stock to rise, and want a known, limited loss if it does not.

:::example Long one ACME December 100 call
ACME is at $100. You buy one December 100 call at the ask, {{ usd(cp) }}, for {{ usd(cp * 100) }}.

- **Break-even** at expiration: strike + premium = $100 + {{ usd(cp) }} = **{{ usd(cs.breakevens[0]) }}**.
- **[[Max loss]]**: the premium, **{{ usd(-cs.maxLoss) }}**, if ACME finishes at or below $100.
- **[[Max profit]]**: **{{ usd(cs.maxProfit) }}**. Above the break-even, every $1 ACME rises adds $100.

At $110 the call makes {{ signedUsd(payoff.pnlAtExpiry(call, 110)) }}; at $120, {{ signedUsd(payoff.pnlAtExpiry(call, 120)) }}.
:::

In general, for a call with strike \(K\) bought for premium \(c\) per share:

\[ \text{break-even} = K + c \qquad \text{max loss} = 100c \qquad \text{max profit unlimited} \]

Buying more contracts scales the dollars but not the break-even. Three of these calls cost {{ usd(cp * 300) }}, lose at most {{ usd(-s3.maxLoss) }}, and still break even at {{ usd(s3.breakevens[0]) }}.

The trade-off against owning the shares is the one from [Leverage versus owning the stock](#core-01-leverage): you risk {{ usd(cp * 100) }} instead of {{ usd(10000) }}, but ACME must clear {{ usd(cs.breakevens[0]) }} by {{ longDate(expiryDate(30)) }} rather than just finish above $100 at some point.

## The long put

You buy a put when you expect the stock to fall, or when you own the stock and want insurance against a fall.

:::example Long one ACME December 100 put
You buy one December 100 put at the ask, {{ usd(pp) }}, for {{ usd(pp * 100) }}.

- **Break-even**: strike − premium = $100 − {{ usd(pp) }} = **{{ usd(ps.breakevens[0]) }}**.
- **Max loss**: the premium, **{{ usd(-ps.maxLoss) }}**, if ACME finishes at or above $100.
- **Max profit**: **{{ usd(ps.maxProfit) }}**, if ACME goes to zero. The stock cannot fall below zero, so the put's profit has a ceiling: the strike minus the premium, times 100.

At $90 the put makes {{ signedUsd(payoff.pnlAtExpiry(put, 90)) }}; at $80, {{ signedUsd(payoff.pnlAtExpiry(put, 80)) }}.
:::

For a put with strike \(K\) bought for premium \(p\):

\[ \text{break-even} = K - p \qquad \text{max loss} = 100p \qquad \text{max profit} = 100(K - p) \]

The put's maximum profit is technically limited, but in practice it is large: {{ usd(ps.maxProfit) }} against a {{ usd(pp * 100) }} risk here. Like the call, it is a position whose risk is entirely known in advance.

## The put versus shorting the stock

The stock trader's way to bet on a fall is to sell short: borrow shares, sell them, and buy them back later. The long put does a similar job with a very different risk profile.

:::example Bearish on ACME: long put or short 100 shares?
P&L at expiration of the December 100 put bought at {{ usd(pp) }}, and of 100 shares sold short at $100:

| ACME at expiration | Long 100 put | Short 100 shares |
|---|---|---|
{{ tbl }}

On a fall to $90 the short stock makes more, {{ usd(1000) }} against {{ usd(payoff.pnlAtExpiry(put, 90)) }}, because the put has to recover its premium first. On a rise the picture flips: at $120 the short loses {{ usd(2000) }} and keeps losing as ACME climbs, without limit, while the put never loses more than {{ usd(pp * 100) }}.
:::

The short seller also has to borrow the shares (paying a fee that can be high for hard-to-borrow stocks), pays the dividend to the lender, needs a margin account, and can be forced to buy back at a bad moment. The put holder has none of these problems. The price is the premium and the deadline.

:::rule Short selling stock (as of 2026)
Selling stock short requires a margin account. Under the SEC's Regulation SHO, your broker must have located shares that can be borrowed before it accepts a short sale, and the short seller owes the lender any dividends paid while the position is open. Buying a put involves none of this; an account approved for buying options is enough.
:::

## The four basic numbers, compared

| | Long call | Long put |
|---|---|---|
| You want ACME to | rise above the break-even | fall below the break-even |
| Cost | premium × 100 | premium × 100 |
| Break-even | strike + premium | strike − premium |
| Max loss | the premium | the premium |
| Max profit | unlimited | (strike − premium) × 100 |
| December 100 example | {{ usd(cp * 100) }}, breaks even at {{ usd(cs.breakevens[0]) }} | {{ usd(pp * 100) }}, breaks even at {{ usd(ps.breakevens[0]) }} |

Both are limited-risk positions: the worst case is losing what you paid. Both need the stock to move, in the right direction, by more than the premium, before expiration. More often than not, they do not: an at-the-money option needs a move of several percent in a month just to break even.

:::warning Limited risk is not low risk
"You can only lose the premium" is true and often misleading. Losing 100% of the premium is a common outcome for long options, not a rare one. The limit protects you only if the premium is a small part of your account.
:::

## Try it

The builder below starts with the December 100 put. Read the break-even and the max profit and loss from the summary, then switch the leg to a call and compare. Try changing the quantity and confirm that the break-even does not move.

```tool position-builder
{ title: 'Long one ACME December 100 put', legs: [{ kind: 'put', qty: 1, strike: 100, premium: pp, dte: 30, iv: row(100).put.iv }], range: [75, 125], showToday: false }
```

:::key
A long call breaks even at strike + premium, with unlimited upside; a long put breaks even at strike − premium, with upside capped at (strike − premium) × 100. For both, the maximum loss is the premium paid. The put is a limited-risk alternative to shorting the stock; both options need a move larger than their premium before expiration.
:::

```quiz
- q: >-
    You buy two ACME December 100 calls at {{ usd(cp) }}. What are your break-even and maximum loss at expiration?
  choices:
    - >-
      Break-even {{ usd(100 + cp) }}; max loss {{ usd(cp * 200) }}
    - >-
      Break-even {{ usd(100 + 2 * cp) }}; max loss {{ usd(cp * 200) }}
    - >-
      Break-even {{ usd(100 + cp) }}; max loss unlimited
  answer: 0
  explain: >-
    Each call needs ACME above $100 + {{ usd(cp) }} to repay its own premium, and buying two does not change that: the break-even stays at {{ usd(100 + cp) }}. The loss doubles, to {{ usd(cp * 200) }}. Adding both premiums to the strike double-counts, and a long option's loss is never unlimited.
- q: >-
    What is the most you can make with one ACME December 100 put bought at {{ usd(pp) }}?
  choices:
    - >-
      Unlimited
    - >-
      {{ usd(ps.maxProfit) }}
    - >-
      {{ usd(10000) }}
  answer: 1
  explain: >-
    The best case is ACME at zero: the right to sell at $100 is worth {{ usd(10000) }}, minus the {{ usd(pp * 100) }} premium, for {{ usd(ps.maxProfit) }}. {{ usd(10000) }} forgets the premium. Only the upside of a long call is unlimited, because a stock has no ceiling but does have a floor.
- q: >-
    You are bearish on ACME but worried it could jump on takeover news. Which position fits?
  choices:
    - >-
      Short 100 shares, because it makes more on a fall to $90
    - >-
      Long one December 100 put, because the loss is capped at the premium if ACME jumps
    - >-
      Long one December 100 call
  answer: 1
  explain: >-
    The put profits from a fall and loses at most {{ usd(pp * 100) }} however far ACME jumps. The short stock does make more on a moderate fall, but a takeover jump to $130 would cost it {{ usd(3000) }}, with no limit beyond. A call is a bet on a rise, the opposite of your view.
- q: >-
    ACME is at $97 at expiration. What is the P&L on one December 100 put bought at {{ usd(pp) }}?
  choices:
    - >-
      {{ signedUsd(300) }}
    - >-
      {{ signedUsd(payoff.pnlAtExpiry(put, 97)) }}
    - >-
      {{ signedUsd(-pp * 100) }}
  answer: 1
  explain: >-
    The put is worth $100 − $97 = $3 a share, $300 a contract, and cost {{ usd(pp * 100) }}, so the P&L is {{ signedUsd(payoff.pnlAtExpiry(put, 97)) }}. The put is in the money but has not yet reached its break-even of {{ usd(ps.breakevens[0]) }}, so it is a smaller loss, not a profit and not a total loss.
```
