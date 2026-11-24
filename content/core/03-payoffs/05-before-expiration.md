---
title: Before expiration
summary: Explain why an option position's value before expiration is a curve that differs from the expiration diagram, and estimate what you could close a position for on any day.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const c = row(100).call;
const legs = [{ kind: 'call', qty: 1, strike: 100, premium: c.ask, dte: 30, iv: c.iv }];
const env = { r: RATE, q: ACME.q };
const at = (s, d, x = {}) => payoff.pnlAt(legs, s, d, { ...env, ...x });
const prices = [90, 95, 100, 105, 110];
const days = [0, 10, 20, 30];
const head = '| Days passed (days left) | ' + prices.map((s) => `ACME $${s}`).join(' | ') + ' |';
const sep = '|---|' + prices.map(() => '---').join('|') + '|';
const body = days.map((d) => `| ${d} (${30 - d}) | ` + prices.map((s) => signedUsd(at(s, d), 0)).join(' | ') + ' |').join('\n');
const tbl = [head, sep, body].join('\n');
const p = row(95).put;
const sp = [{ kind: 'put', qty: -1, strike: 95, premium: p.bid, dte: 30, iv: p.iv }];
const spAt = (s, d) => payoff.pnlAt(sp, s, d, env);
```

A payoff diagram shows what happens on expiration day. But you will close most positions before then, and on every day until expiration the market values your options at more than (or, for writers, differently from) their intrinsic value. The value before expiration is a smooth curve that sits on or above the hockey stick for a long option, and it sinks toward the hockey stick as time passes. Knowing roughly where that curve is tells you what you could close the position for today.

## The curve above the hockey stick

Before expiration, an option is worth its intrinsic value plus its extrinsic value, as [Intrinsic and extrinsic value](#core-01-intrinsic-and-extrinsic) showed. The expiration diagram draws only the intrinsic part. The extrinsic part lifts the line into a curve:

- **Far below the strike** (for a call), the curve hugs the flat part of the hockey stick: an option far out of the money has little extrinsic value.
- **Near the strike**, the gap is largest, because that is where extrinsic value peaks.
- **Far above the strike**, the curve rejoins the rising part: deep in the money, the option is almost all intrinsic value.

As expiration approaches, extrinsic value drains away and the curve flattens onto the hockey stick. On expiration day they are the same line.

:::example The December 100 call, day by day
You buy one December 100 call at the ask, {{ usd(c.ask) }}. Here is your P&L if you closed the position at the option's fair value on different days and at different ACME prices, with implied volatility unchanged:

{{ tbl }}

Read down the columns:

- At $100, unchanged, the position loses value every day: {{ signedUsd(at(100, 10), 0) }} after 10 days, {{ signedUsd(at(100, 20), 0) }} after 20, and the full {{ signedUsd(at(100, 30), 0) }} at expiration. That is time decay.
- At $110 you are well in profit on every day, and less so as time passes ({{ signedUsd(at(110, 0), 0) }} if it happened today, {{ signedUsd(at(110, 30), 0) }} at expiration), because the extrinsic value on top of the $10 of intrinsic value shrinks.
- At $95, today, the call is still worth a good deal and the loss is only {{ usd(-at(95, 0), 0) }}. Leave it there for the whole month and the loss is total.

Look at the first row, at $100. Even with nothing changed, the position shows {{ signedUsd(at(100, 0), 0) }} the moment you buy it. That is the difference between the {{ usd(c.ask) }} ask you paid and the option's fair value of {{ usd(c.theo) }}: half the bid-ask spread, from [Bid, ask, mid and last](#core-02-bid-ask-and-spread).
:::

## What moves the curve

Three things shift the curve, and each gets its own Module later:

- **The stock price** moves you along the curve. Its slope at any point is the option's delta: shallow far out of the money, steep in the money. [The Greeks in practice](#core-05) builds on this.
- **Time** lowers the curve toward the hockey stick, slowly at first and fastest in the last weeks. That rate is theta.
- **Implied volatility** raises or lowers the whole curve at once. If the market starts pricing more movement, every option gets more extrinsic value. With ACME unchanged at $100 and implied volatility five points higher, your call would show {{ signedUsd(at(100, 0, { ivShift: 0.05 }), 0) }} today instead of {{ signedUsd(at(100, 0), 0) }}. [Implied volatility](#core-06) explains why this happens and why it can also go sharply the other way.

For a long option, the curve before expiration always sits at or above the expiration line, because extrinsic value is never negative for the holder of an American option. For a short option it is the mirror image: the curve sits at or below the expiration line, and the writer's profit grows as time passes and the curve rises to meet the hockey stick.

:::example The short December 95 put over time
You sell the December 95 put at {{ usd(p.bid) }}. If ACME stays at $100, your P&L is {{ signedUsd(spAt(100, 0), 0) }} today (half the spread again, since you sold at the bid), {{ signedUsd(spAt(100, 15), 0) }} after 15 days and {{ signedUsd(spAt(100, 30), 0) }} at expiration. The writer is paid for waiting, a little at a time.

If ACME drops to $92 tomorrow, the put's P&L is {{ signedUsd(spAt(92, 1), 0) }}, much worse than the expiration diagram's {{ signedUsd(spAt(92, 30), 0) }} at the same price, because the put now has both intrinsic value and plenty of extrinsic value left. A writer feels a sharp move immediately, before time has had a chance to help.
:::

:::warning Do not manage a position with the expiration diagram alone
The expiration diagram tells you where you end up if you hold to the last day. It does not tell you what the position is worth now. A long option that looks "safe until the break-even" is losing value every day the stock does not move, and a short option that looks "fine until the strike" can show a large loss well before the strike is reached. Check the current value, not just the hockey stick.
:::

## Try it

The builder below shows the December 100 call with both lines: solid for expiration, dashed for the chosen day. Drag "Days passed" from 0 to 30 and watch the dashed curve sink onto the solid one. Then move the "Implied vol change" slider up and down and watch the whole dashed curve rise and fall while the solid line stays put.

```tool position-builder
{ title: 'Long one ACME December 100 call', legs: [{ kind: 'call', qty: 1, strike: 100, premium: c.ask, dte: 30, iv: c.iv }], range: [85, 115], daysPassed: 0, showToday: true }
```

:::key
Before expiration, an option position's value is a smooth curve: above the hockey stick for long options, below it for short ones, with the gap (extrinsic value) largest near the strike. Time pulls the curve onto the expiration line; the stock price moves you along it; implied volatility lifts or lowers it. Close or manage positions using the curve, not just the expiration diagram.
:::

```quiz
- q: >-
    Ten days after you buy the December 100 call at {{ usd(c.ask) }}, ACME is still at $100. Roughly what is your P&L if you close at fair value?
  choices:
    - >-
      $0, since the stock has not moved
    - >-
      About {{ signedUsd(at(100, 10), 0) }}
    - >-
      {{ signedUsd(-c.ask * 100) }}, the whole premium
  answer: 1
  explain: >-
    The call has lost part of its extrinsic value to time decay, plus the half-spread you paid on entry, so it shows about {{ signedUsd(at(100, 10), 0) }}. It is not zero, because an option is a wasting asset; and it is not yet the full premium, because there are still 20 days of extrinsic value left. The total loss happens only at expiration.
- q: >-
    For a long call, where is the gap between the value before expiration and the expiration line largest?
  choices:
    - >-
      Far below the strike
    - >-
      Near the strike
    - >-
      Far above the strike
  answer: 1
  explain: >-
    The gap is the option's extrinsic value, which peaks at the money. Far below the strike the option is nearly worthless either way, and far above it is almost all intrinsic value, so in both places the curve hugs the expiration line.
- q: >-
    You sold the December 95 put at {{ usd(p.bid) }}. The day after, ACME drops to $92. Why is your loss larger than the expiration diagram shows at $92?
  choices:
    - >-
      Because the diagram is wrong
    - >-
      Because the put still has a lot of extrinsic value with 29 days left, so buying it back costs more than its $3 of intrinsic value
    - >-
      Because you will be assigned immediately
  answer: 1
  explain: >-
    The expiration diagram values the put at intrinsic only, $3. With 29 days left the put also carries extrinsic value, so closing it costs more and the loss today, {{ signedUsd(spAt(92, 1), 0) }}, is bigger than the {{ signedUsd(spAt(92, 30), 0) }} at expiration. Assignment is possible but unlikely while the put has that much time value: a holder would rather sell it.
- q: >-
    Implied volatility on ACME options rises five points overnight with the stock unchanged. What happens to the value of your long December 100 call?
  choices:
    - >-
      Nothing; only the stock price matters
    - >-
      It rises, because higher implied volatility adds extrinsic value
    - >-
      It falls, because higher volatility means more risk
  answer: 1
  explain: >-
    Higher implied volatility means the market prices more potential movement, and more potential movement is worth more to an option holder, whose loss is capped. Your P&L would go from about {{ signedUsd(at(100, 0), 0) }} to {{ signedUsd(at(100, 0, { ivShift: 0.05 }), 0) }}. The expiration diagram does not change at all, which is why it cannot show this.
```
