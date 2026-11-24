---
title: "Scenario: your first call"
summary: Choose how to express a bullish view with options, decide between exercising and selling, and handle an in-the-money option on expiration day.
kind: scenario
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const prem = row(100).call.ask;
const cost = prem * 100;
const n = Math.floor(10000 / cost);
const c115 = row(115).call.ask;
const legs = [{ kind: 'call', qty: 1, strike: 100, premium: prem }];
const bigLegs = [{ kind: 'call', qty: n, strike: 100, premium: prem }];
const otmLegs = [{ kind: 'call', qty: 10, strike: 115, premium: c115 }];
const be115 = payoff.breakevens(otmLegs)[0];
// twelve days later (Monday, 18 days left)
const later = chain(ACME, { dte: 18, spot: 105 });
const lrow = later.rows.find((r) => r.strike === 100).call;
const bid = lrow.bid;
const extr = bid - 5;
const sellBuyCash = 105 * 100 - bid * 100;
// expiration day, a quarter of an hour before the close
const s3 = 105.25;
const last = chain(ACME, { dte: 0.01, spot: s3 });
const l105 = last.rows.find((r) => r.strike === 105).call;
const c105prem = row(105).call.ask;
```

This Scenario follows one trader through the life of a first options trade. Each decision uses something from this Module: the multiplier, moneyness, intrinsic and extrinsic value, leverage and the ways an option can end.

```scenario
setup: >-
  It is {{ longDate(TODAY) }}. ACME is at $100. You have {{ usd(12000) }} in a margin account approved for buying options, and you expect ACME to rise over the next few weeks on a product launch. Normally you would buy 100 shares. The December options expire on {{ longDate(expiryDate(30)) }}, in 30 days. The December 100 call is offered at {{ usd(prem) }} and the December 115 call at {{ usd(c115) }}.
steps:
  - prompt: >-
      How do you express the view?
    choices:
      - text: >-
          Buy 100 shares for {{ usd(10000) }}
        grade: acceptable
        feedback: >-
          A perfectly sound trade. You profit from the first dollar ACME rises, there is no deadline and you collect the dividend. The cost is {{ usd(10000) }} tied up and the full downside of the stock: a fall to $85 would cost {{ usd(1500) }}. It is not wrong, but it ignores what this Module was about.
      - text: >-
          Buy one December 100 call for {{ usd(cost) }} and keep the rest in cash
        grade: best
        feedback: >-
          This matches the exposure you wanted, 100 shares, and caps your loss at {{ usd(cost) }} however far ACME falls. In exchange, ACME must be above {{ usd(payoff.breakevens(legs)[0]) }} at expiration for you to profit, and the call loses value every day it does not move. Sized like this, a total loss is survivable.
      - text: >-
          Put the {{ usd(10000) }} into December 100 calls: {{ int(n) }} contracts
        grade: poor
        feedback: >-
          That is exposure to {{ int(n * 100) }} shares, {{ int(n) }} times what you normally hold. If ACME is still at $100 at expiration you lose {{ usd(-payoff.pnlAtExpiry(bigLegs, 100)) }}, the whole stake, without the stock having moved against you at all. Even at $103 you would lose {{ usd(-payoff.pnlAtExpiry(bigLegs, 103)) }}.
      - text: >-
          Buy ten December 115 calls at {{ usd(c115) }} because they are cheap
        grade: poor
        feedback: >-
          Ten contracts is 1,000 shares of exposure for {{ usd(c115 * 1000) }}, and every one of those calls is $15 out of the money. ACME has to rise above {{ usd(be115) }}, more than {{ pct((be115 - 100) / 100, 0) }}, in a month just to break even. A "cheap" option is cheap because it usually expires worthless.
  - prompt: >-
      You bought one December 100 call at {{ usd(prem) }}. Twelve days later, on Monday {{ longDate(expiryDate(12)) }}, ACME is at $105, with 18 days left. The call is bid at {{ usd(bid) }}. You like ACME even more now and decide you would rather own 100 shares outright than hold the call. ACME shares cost $105.
    choices:
      - text: >-
          Exercise the call: pay {{ usd(10000) }} and receive 100 shares
        grade: poor
        feedback: >-
          You get the shares, but exercising captures only the $5 of intrinsic value. The call's bid of {{ usd(bid) }} also contains {{ usd(extr) }} a share of extrinsic value, {{ usd(extr * 100) }} a contract, and exercising throws it away.
      - text: >-
          Sell the call to close at {{ usd(bid) }} and buy 100 shares at $105
        grade: best
        feedback: >-
          You collect {{ usd(bid * 100) }} for the call and pay {{ usd(10500) }} for the shares, a net outlay of {{ usd(sellBuyCash) }}. Exercising would have cost {{ usd(10000) }} for the same 100 shares, so selling and buying leaves you {{ usd(10000 - sellBuyCash) }} better off: exactly the extrinsic value that exercise would have discarded. Your total profit on the call trade is {{ signedUsd((bid - prem) * 100) }}.
      - text: >-
          Keep the call and let it be exercised at expiration
        grade: acceptable
        feedback: >-
          This keeps the call's extrinsic value working for you for now, but you do not own the shares you said you want, you are paying time decay every day, and if ACME falls back below $100 by expiration the call expires worthless and you get no shares at all. It is a different trade from the one you decided on.
  - prompt: >-
      Some weeks later, a different trade. You hold one December 105 call that you bought at {{ usd(c105prem) }}. It is expiration day, {{ longDate(expiryDate(30)) }}, 3:45 p.m. Eastern. ACME is at {{ usd(s3) }}. Your account has {{ usd(2000) }} in cash. The call is bid {{ usd(l105.bid) }}, ask {{ usd(l105.ask) }}.
    choices:
      - text: >-
          Do nothing; it will expire
        grade: poor
        feedback: >-
          If ACME closes where it is now, the call will not expire: it is {{ usd(s3 - 105) }} in the money, and the OCC auto-exercises anything a cent or more in the money. On Monday you would own 100 ACME shares bought for {{ usd(10500) }} with {{ usd(2000) }} in the account, which means a margin call, and you would carry the weekend risk of {{ usd(s3 * 100) }} of stock to collect {{ usd((s3 - 105) * 100) }} of intrinsic value.
      - text: >-
          Sell the call to close at {{ usd(l105.bid) }}
        grade: best
        feedback: >-
          You collect {{ usd(l105.bid * 100) }}, most of the {{ usd((s3 - 105) * 100) }} of intrinsic value (the bid sits a little below it), and the position is finished. No shares, no margin call, no weekend risk. Your loss on the trade is {{ usd((c105prem - l105.bid) * 100) }}, the premium you paid less what you recovered.
      - text: >-
          Tell your broker not to exercise it
        grade: acceptable
        feedback: >-
          This avoids buying shares you cannot afford, so it solves the dangerous problem. But the call then expires unexercised and you give up the {{ usd(l105.bid * 100) }} you could have collected by selling it. A do-not-exercise instruction makes sense when the option cannot be sold for anything, not when it has a bid.
wrap: >-
  A call is a right on 100 shares with a deadline. Size it by the shares you want exposure to, so that losing the whole premium is survivable. While the option has time left, sell it rather than exercise it, because the market pays you for its extrinsic value and exercise does not. And never let an in-the-money option reach the close on expiration day by accident: it turns into a stock position, whether or not you can pay for it.
```
