---
title: Calls and puts
summary: Know exactly what a call and a put give you, what they cost, and who is on the other side of every trade.
---

```calc
const T = 30 / 365;
const exp = expiryDate(30);
const q = chain(ACME, { dte: 30 });
const c105 = q.rows.find((r) => r.strike === 105).call;
const p95 = q.rows.find((r) => r.strike === 95).put;
const callPrem = c105.ask;
const putPrem = p95.ask;
const callLegs = [{ kind: 'call', qty: 1, strike: 105, premium: callPrem }];
const putLegs = [{ kind: 'put', qty: 1, strike: 95, premium: putPrem }];
```

When you buy 100 shares of ACME at $100, you have committed $10,000 and you own the stock. Every dollar it moves is a dollar per share to you, in either direction, for as long as you hold it.

An [[option]] is a different kind of agreement. It does not give you the stock. It gives you a *right* concerning the stock: the right to buy it, or the right to sell it, at a price fixed today, until a date fixed today. You pay for that right up front, and the price is far smaller than the stock itself. Everything else in this Course follows from those few facts.

## The two kinds of option

A [[call]] gives its owner the right to **buy** 100 shares of the [[underlying]] at a fixed price, the [[strike price]], on or before the [[expiration date]].

A [[put]] gives its owner the right to **sell** 100 shares of the underlying at the strike price, on or before the expiration date.

The owner is never obliged to use the right. If using it would lose money, they simply let the option expire. That one-sided choice is what you pay for, and it is why an option has value at all.

The price you pay for the option is the [[premium]]. Premiums are quoted per share, but one standard contract covers 100 shares (the [[contract multiplier]]), so a quoted premium of $2.00 costs $200 per contract.

:::example A call on ACME
ACME trades at $100. Today is {{ longDate(TODAY) }}. The December option series expires on {{ longDate(exp) }}, 30 days away.

The ACME December 105 call is offered at {{ usd(callPrem) }}. Buying one contract costs {{ usd(callPrem) }} × 100 = **{{ usd(callPrem * 100) }}**.

For that, you have the right to buy 100 ACME shares at $105 each, any time until {{ longDate(exp) }}.

- If ACME is at $120 at expiration, the right to buy at $105 is worth $15 per share, $1,500 per contract. Your profit is {{ usd(payoff.pnlAtExpiry(callLegs, 120)) }} after the premium.
- If ACME is at $105 or below at expiration, nobody would pay $105 for shares they can buy for that or less on the open market. The call expires worthless and you lose the {{ usd(callPrem * 100) }} you paid, and no more.
:::

The call buyer is betting on a rise, but with a twist. Owning the shares would have made money from $100 up. The call only starts paying at $105, and only covers its own cost above {{ usd(payoff.breakevens(callLegs)[0]) }}. In exchange, the most you can lose is {{ usd(callPrem * 100) }}, against $10,000 committed to the shares.

:::example A put on ACME
The ACME December 95 put is offered at {{ usd(putPrem) }}, or {{ usd(putPrem * 100) }} per contract. It gives you the right to sell 100 ACME shares at $95 until {{ longDate(exp) }}.

- If ACME falls to $80, the right to sell at $95 is worth $15 per share. Your profit is {{ usd(payoff.pnlAtExpiry(putLegs, 80)) }}.
- If ACME stays at or above $95, selling at $95 is pointless; the put expires worthless and you lose {{ usd(putPrem * 100) }}.
:::

A put pays when the stock falls. You can use one to profit from a decline, or, if you already own the shares, as insurance: whatever happens, you can sell at $95. Both uses get full Lessons in [Income and hedging strategies](#core-09).

## Every option has two sides

Options are contracts between two parties. For every buyer there is a seller.

- The [[holder]] (also called being *long* the option) paid the premium and owns the right.
- The [[writer]] (being *short* the option) received the premium and took on the **obligation**: if the holder uses the right, the writer must deliver.

When the holder of a call uses it, which is called [[exercise]], a call writer somewhere must sell 100 shares at the strike, even if the stock is far higher. When a put holder exercises, a put writer must buy 100 shares at the strike, even if the stock has collapsed. The writer who is picked to fulfil an exercise receives an [[assignment]].

So the four basic positions are:

| Position | You paid or received | You have | You want ACME to |
|---|---|---|---|
| Long call | paid premium | the right to buy at the strike | rise well above the strike |
| Short call | received premium | the obligation to sell at the strike if assigned | stay below the strike |
| Long put | paid premium | the right to sell at the strike | fall well below the strike |
| Short put | received premium | the obligation to buy at the strike if assigned | stay above the strike |

The holder's risk is limited to the premium. The writer's reward is limited to the premium, and their risk can be large; for a short call, it has no upper limit, because there is no limit to how high a stock can go. [Payoffs at expiration](#core-03) works through all four in detail.

:::warning Writing options is not "free income"
Collecting a premium feels like getting paid. It is payment for accepting a risk. A writer who sells the ACME December 105 call for {{ usd(callPrem) }} keeps {{ usd(callPrem * 100) }} if ACME stays below $105, and owes the difference above $105 if it does not. At $150, that obligation costs $4,500 minus the premium received.
:::

## Who you are really trading with

You will never know the person on the other side of your trade, and you do not need to. Every listed US option is cleared by the [[Options Clearing Corporation]] (OCC), which steps between buyer and seller and guarantees both sides. If the writer of your call disappears, the OCC still delivers. This is why listed options are standardized: every ACME December 105 call is identical and interchangeable, so you can sell yours to anyone, at any time the market is open, instead of waiting for the original writer.

:::rule Who guarantees listed options (as of 2026)
All US exchange-listed equity and index options are issued and cleared by the OCC. Brokers must give new options customers the OCC disclosure document *Characteristics and Risks of Standardized Options* before approving them to trade.
:::

## Opening and closing

Most options are never exercised. Traders buy or sell them, and later reverse the trade in the market, like a stock. Your broker's order ticket asks which of four things you are doing:

- [[Buy to open]]: you become a holder.
- [[Sell to open]]: you become a writer.
- [[Sell to close]]: you sell an option you hold, ending the position.
- [[Buy to close]]: you buy back an option you wrote, ending your obligation.

If you buy the December 105 call at {{ usd(callPrem) }} and ACME rallies next week, you do not need to exercise and come up with $10,500 to buy the shares. You can sell the call to close, at whatever the market now pays for it, and keep the difference.

Try it below. The solid line is your profit or loss at expiration; the dashed line is what the call would be worth earlier. Drag "Days passed" forward to watch the dashed line sink toward the solid one as time runs out.

```tool position-builder
{ title: 'Long one ACME December 105 call', legs: [{ kind: 'call', qty: 1, strike: 105, premium: callPrem, dte: 30, iv: c105.iv }], range: [80, 125] }
```

:::key
A call is the right to buy at the strike; a put is the right to sell at the strike. Holders pay a premium for a right they never have to use, so their loss is capped at that premium. Writers collect the premium and take on the obligation, so their gain is capped at that premium.
:::

```quiz
- q: >-
    You buy one ACME December 105 call at {{ usd(callPrem) }}. How much cash leaves your account?
  choices:
    - >-
      {{ usd(callPrem) }}
    - >-
      {{ usd(callPrem * 100) }}
    - >-
      $10,500
    - >-
      Nothing until you exercise
  answer: 1
  explain: >-
    Premiums are quoted per share and one contract covers 100 shares, so you pay {{ usd(callPrem) }} × 100 = {{ usd(callPrem * 100) }} up front. The $10,500 is what you would pay *if* you exercised and bought the shares at $105, which you never have to do.
- q: >-
    Which position carries an obligation that has no upper limit on its cost?
  choices:
    - >-
      Long call
    - >-
      Long put
    - >-
      Short call
    - >-
      Short put
  answer: 2
  explain: >-
    A short call obliges you to sell shares at the strike if assigned. Since a stock can rise without limit, the cost of delivering shares you must buy at the market price has no ceiling. A short put is also risky, but its worst case is bounded: the stock can only fall to zero, so you would pay at most the strike for worthless shares.
- q: >-
    At expiration ACME is at $97. You hold the December 95 put you bought for {{ usd(putPrem) }}. What happens?
  choices:
    - >-
      You exercise and sell at $95, making $2 a share
    - >-
      The put expires worthless and you lose {{ usd(putPrem * 100) }}
    - >-
      You are assigned and must buy 100 shares at $95
  answer: 1
  explain: >-
    Selling at $95 a stock you could sell for $97 makes no sense, so the put has no value at expiration. As the holder you lose the premium you paid, {{ usd(putPrem * 100) }}, and nothing more. Assignment only happens to writers, never to holders.
- q: >-
    You bought a call last week and it has risen in price. What is the usual way to take the profit?
  choices:
    - >-
      Exercise it, then sell the shares
    - >-
      Sell to close the call
    - >-
      Buy to close the call
  answer: 1
  explain: >-
    You hold the call, so you close by selling it ("sell to close"). Most options are closed this way rather than exercised. Exercising throws away whatever time value the option still has (see [Intrinsic and extrinsic value](#core-01-intrinsic-and-extrinsic)) and needs the cash to buy 100 shares. "Buy to close" is how a *writer* exits.
```
