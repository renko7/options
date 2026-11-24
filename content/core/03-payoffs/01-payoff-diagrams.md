---
title: Reading and drawing a payoff diagram
summary: Draw the profit-and-loss diagram at expiration of any option position by hand, and read its break-even, best case and worst case off the picture.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const prem = row(105).call.ask;
const callLegs = [{ kind: 'call', qty: 1, strike: 105, premium: prem }];
const stockLegs = [{ kind: 'stock', qty: 100, price: 100 }];
const be = payoff.breakevens(callLegs)[0];
const pts = [90, 100, 105, 110, 120];
const tbl = pts.map((s) => `| $${s} | ${usd(Math.max(s - 105, 0) * 100)} | ${usd(-prem * 100)} | **${signedUsd(payoff.pnlAtExpiry(callLegs, s))}** | ${signedUsd(payoff.pnlAtExpiry(stockLegs, s), 0)} |`).join('\n');
const pp = row(95).put.ask;
const putLegs = [{ kind: 'put', qty: 1, strike: 95, premium: pp }];
const pbe = payoff.breakevens(putLegs)[0];
const ps = payoff.summary(putLegs);
```

Every options position, however complicated, can be summed up in one picture: how much you make or lose for every possible price of the stock on expiration day. That picture is the [[payoff diagram]]. Professionals sketch one before almost every trade, because it answers the three questions that matter most: where do I start making money, what is the most I can make, and what is the most I can lose?

This Module is built around these diagrams. This Lesson shows how to read one and how to draw one yourself, with nothing more than a few multiplications.

## The axes

- The **horizontal axis** is the price of the underlying at expiration. Every point on it is one possible outcome.
- The **vertical axis** is your [[profit and loss]] (P&L) on the whole position at that price, in dollars, after everything you paid or received to open it.
- The **zero line** separates profit (above) from loss (below). Where the P&L line crosses zero is a [[break-even]] price.

Strictly, a *payoff* is what the position is worth at expiration, and P&L is payoff minus what it cost. Most traders, platforms and this Course draw P&L, because that is the number you care about, and still call the picture a payoff diagram.

## The simplest diagram: owning the stock

If you buy 100 ACME shares at $100, your P&L at any price \(S\) is \((S - 100) \times 100\). That is a straight line through $100 with a slope of $100 per dollar: at $110 you make {{ usd(payoff.pnlAtExpiry(stockLegs, 110), 0) }}, at $90 you lose {{ usd(-payoff.pnlAtExpiry(stockLegs, 90), 0) }}. There is no kink and no cap in either direction (down to zero, where the loss is the full {{ usd(10000, 0) }}).

Options bend that line. An option's value at expiration is its intrinsic value, and intrinsic value is zero on one side of the strike and grows dollar for dollar on the other. So every option contributes a line with one kink, at its strike. That kink is the whole point.

## Drawing a long call, step by step

:::example The ACME December 105 call at {{ usd(prem) }}
You buy one December 105 call at the ask, {{ usd(prem) }}, paying {{ usd(prem * 100) }}.

**Step 1: mark the strike.** The only kink is at $105.

**Step 2: compute P&L at a few prices**: one below the strike, the strike itself, and a couple above. At each, the call is worth its intrinsic value, \(\max(S - 105, 0) \times 100\), and you subtract the {{ usd(prem * 100) }} you paid.

| ACME at expiration | Call worth | Premium paid | P&L | 100 shares, for comparison |
|---|---|---|---|---|
{{ tbl }}

**Step 3: join the points with straight lines.** Below $105 the line is flat at {{ signedUsd(-prem * 100) }}: the call is worthless however far ACME falls. Above $105 it rises $100 for every $1 ACME rises, parallel to the stock line.

**Step 4: find the break-even.** The rising part crosses zero where the call's value equals the premium: \(105 + {{ num(prem) }} = {{ num(be) }}\). Above **{{ usd(be) }}** you profit.

**Step 5: read the extremes.** The worst case is the flat part, a loss of {{ usd(prem * 100) }}. The best case is unlimited, because the line keeps rising.
:::

That is the "hockey stick" shape you will see constantly: flat, then a kink at the strike, then a straight slope.

## The rules that make any diagram easy

These hold for every position made of options and stock, at expiration:

1. **Lines are straight between strikes.** Intrinsic value is linear except at the strike, so the P&L of any combination can only bend at a strike. Compute the P&L at each strike, then at one price below the lowest strike and one above the highest, and connect the dots.
2. **Slopes come from the legs.** Above its strike, each long call adds +$100 of slope per $1 move (per contract); each short call adds −$100. Below its strike, each long put adds −$100 (it gains as the stock falls) and each short put adds +$100. Each share adds +$1. Elsewhere an option adds nothing.
3. **Quantities scale everything.** Two contracts double every P&L number on the vertical axis but leave the break-even where it is.
4. **The ends tell you the risk.** If the line still slopes upward on the far right, profit is unlimited; if it slopes downward there, loss is unlimited. On the far left the stock can only fall to zero, so losses there are always finite.

:::example Drawing a long put
You buy one December 95 put at {{ usd(pp) }}, paying {{ usd(pp * 100) }}.

- At or above $95 the put expires worthless: P&L {{ signedUsd(payoff.pnlAtExpiry(putLegs, 100)) }}, flat.
- Below $95 the line slopes *down to the right*, or equivalently rises $100 for every $1 ACME falls. At $85 the put is worth {{ usd(1000) }} and the P&L is {{ signedUsd(payoff.pnlAtExpiry(putLegs, 85)) }}.
- It crosses zero at \(95 - {{ num(pp) }} = {{ num(pbe) }}\): below **{{ usd(pbe) }}** you profit.
- The best case is ACME at zero: {{ usd(ps.maxProfit) }}. The worst case is the flat part, {{ usd(-ps.maxLoss) }}.
:::

## Try it

The position builder below draws the December 105 call. The solid line is the P&L at expiration. Move the ACME price slider to read off the P&L at any price, and check the break-even against the one computed above. [A later Lesson](#core-03-before-expiration) adds the value before expiration to the same chart. Then change the strike, switch the leg to a put, or add a second leg, and predict the shape before you look.

```tool position-builder
{ title: 'Long one ACME December 105 call', legs: [{ kind: 'call', qty: 1, strike: 105, premium: prem, dte: 30, iv: row(105).call.iv }], range: [85, 125], showToday: false }
```

:::warning A diagram is only as good as its premium
The diagram depends on what you actually paid. If you buy at the ask instead of the mid, the whole line shifts down by the difference and the break-even moves away from you. Always draw with the price you will really get, and remember the diagram shows expiration only: before then the position is worth something different.
:::

:::key
A payoff diagram plots your profit or loss at expiration against the stock price. Option P&L lines are straight except for a kink at each strike, so you can draw any position by computing P&L at the strikes and one point beyond them on each side. Read off the break-even where the line crosses zero, and the best and worst cases from the flat parts and the far ends.
:::

```quiz
- q: >-
    You buy one ACME December 105 call at {{ usd(prem) }}. What is your P&L if ACME is at $108 at expiration?
  choices:
    - >-
      {{ signedUsd(300) }}
    - >-
      {{ signedUsd(payoff.pnlAtExpiry(callLegs, 108)) }}
    - >-
      {{ signedUsd(-prem * 100) }}
    - >-
      {{ signedUsd(800) }}
  answer: 1
  explain: >-
    The call is worth $108 − $105 = $3 a share, $300 a contract, and you paid {{ usd(prem * 100) }}, so the P&L is {{ signedUsd(payoff.pnlAtExpiry(callLegs, 108)) }}. {{ signedUsd(300) }} is the call's value, forgetting the premium; {{ signedUsd(800) }} measures the gain from $100 as if you owned the stock.
- q: >-
    A position contains only options with strikes at 95, 100 and 110. Where can its expiration P&L line change slope?
  choices:
    - >-
      Anywhere; option lines are curved
    - >-
      Only at 95, 100 and 110
    - >-
      Only at the break-even
  answer: 1
  explain: >-
    At expiration each option is worth its intrinsic value, which is linear except at its strike, so the combined line can bend only at the strikes. Option values before expiration are curved, which is the tempting confusion. The break-even is simply where a straight segment crosses zero; nothing bends there.
- q: >-
    You hold two long calls and one short call (all on ACME, 100 shares each), and ACME is above every strike. What is the slope of the P&L line there?
  choices:
    - >-
      +$300 per $1
    - >-
      +$100 per $1
    - >-
      $0 per $1
  answer: 1
  explain: >-
    Above its strike each long call adds +$100 per $1 and each short call −$100: 2 × $100 − $100 = +$100. The line keeps rising, so profit is unlimited. +$300 counts the short call as if it were long; $0 would need equal numbers of long and short calls.
- q: >-
    You buy one ACME December 95 put at {{ usd(pp) }}. Where is the break-even at expiration?
  choices:
    - >-
      {{ usd(95 + pp) }}
    - >-
      {{ usd(pbe) }}
    - >-
      $95.00
  answer: 1
  explain: >-
    A put gains as the stock falls, so ACME must finish below the strike by enough to repay the premium: $95 − {{ usd(pp) }} = {{ usd(pbe) }}. Adding the premium to the strike is the call formula. At $95 the put is worth nothing and you have lost the whole premium.
```
