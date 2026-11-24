---
title: When a trade goes against you
summary: Choose between a stop, a roll, an adjustment and a plain close when a position is losing, knowing why option-price stops misfire and why a roll is a new trade, not a repair.
---

```calc
const env = { r: RATE, q: ACME.q };
const jan = chain(ACME, { dte: 58 });
const row = (c, k) => c.rows.find((r) => r.strike === k);
// --- premium stop on a naked put
const p90 = row(jan, 90).put;
const prem = p90.bid;
const stopPx = 2 * prem;
const ivJump = 0.12;
const theo3 = bs.price({ S: 96, K: 90, T: 55 / 365, r: RATE, q: ACME.q, sigma: p90.iv + ivJump, type: 'put' });
const wide = 0.40;
const fill = Math.ceil((theo3 + wide / 2) / 0.05) * 0.05;
const stopLoss = (fill - prem) * 100;
const theo10 = bs.price({ S: 99, K: 90, T: 48 / 365, r: RATE, q: ACME.q, sigma: p90.iv, type: 'put' });
const heldPnl = (prem - theo10) * 100;
// --- the plan's put spread, 30 days in, ACME at 94
const r95 = row(jan, 95).put, r90 = row(jan, 90).put;
const credit = Number((Math.round((r95.mid - r90.mid) / 0.05) * 0.05).toFixed(2));
const n = 2;
const S1 = 94;
const dec = chain(ACME, { dte: 28, spot: S1 });
const mar = chain(ACME, { dte: 91, spot: S1 });
const r5 = (x) => Number((Math.round(x / 0.05) * 0.05).toFixed(2));
const closeCost = r5(row(dec, 95).put.mid - row(dec, 90).put.mid);
const realized = (closeCost - credit) * 100 * n;
const mar9590 = r5(row(mar, 95).put.mid - row(mar, 90).put.mid);
const mar9085 = r5(row(mar, 90).put.mid - row(mar, 85).put.mid);
const net1 = mar9590 - closeCost;
const net2 = mar9085 - closeCost;
const newMaxLoss1 = (5 - mar9590) * 100 * n;
const newMaxLoss2 = (5 - mar9085) * 100 * n;
// --- adjustment: add a Jan 100/105 call spread
const cs = r5(row(dec, 100).call.mid - row(dec, 105).call.mid);
const condor = [
  { kind: 'put', qty: -n, strike: 95, premium: credit, dte: 28 },
  { kind: 'put', qty: n, strike: 90, premium: 0, dte: 28 },
  { kind: 'call', qty: -n, strike: 100, premium: cs, dte: 28 },
  { kind: 'call', qty: n, strike: 105, premium: 0, dte: 28 },
];
const putOnly = condor.slice(0, 2);
const sc = payoff.summary(condor);
const sp = payoff.summary(putOnly);
const condorTool = [
  { kind: 'put', qty: -n, strike: 95, dte: 28, iv: row(dec, 95).put.iv },
  { kind: 'put', qty: n, strike: 90, dte: 28, iv: row(dec, 90).put.iv },
  { kind: 'call', qty: -n, strike: 100, dte: 28, iv: row(dec, 100).call.iv },
  { kind: 'call', qty: n, strike: 105, dte: 28, iv: row(dec, 105).call.iv },
];
```

Every plan in this Module has a loss exit, and sooner or later one of them comes into view. At that moment four choices compete: close the trade, let a [[stop-loss]] close it, [[roll|rolling]] it to a later expiration or different strikes, or make an [[adjustment]] by adding legs. They look like four different tools. In fact they are all the same decision, made more or less honestly: *is the position I would hold after this action one I want, at its current price?*

## Three kinds of stop

A stop can be defined on three different things.

1. **The option's price or the position's P&L.** "Buy back the put if it doubles." Simple, and the most common, and the one that misfires most.
2. **The underlying's price.** "Close if ACME closes below $95." This ties the exit to the thesis.
3. **Time or events.** "Close by 21 days to expiration" or "close before earnings."

For a stock, the first two are the same thing. For an option they are not, because an option's price moves with [[implied volatility]], with time, and with the width of its market, not only with the stock.

## Why option-price stops misfire

:::example A stop that fired on a wobble
You sell one ACME January 90 put at the bid, {{ usd(prem) }}, with ACME at $100. Your stop: buy it back if its price reaches twice the premium, {{ usd(stopPx) }}.

Three days later the market sells off. ACME drops to $96, nowhere near $90, but implied volatility jumps {{ int(ivJump * 100) }} points across the board. The put is now worth about {{ usd(theo3) }} even though the stock has barely moved toward the strike. In the rush the put's market widens to {{ usd(wide) }}, so the ask sits near {{ usd(fill) }}.

The stop fires and fills at the ask: you buy back at {{ usd(fill) }}, a loss of **{{ usd(stopLoss) }}**.

A week later ACME is back at $99 and volatility has settled. Had you held, the put would be worth about {{ usd(theo10) }}, a small gain of {{ usd(heldPnl) }} on the position instead of a {{ usd(stopLoss) }} loss. The thesis (ACME stays above $90) was never in danger.
:::

Three things went wrong, and they are the three general reasons option-price stops misfire.

- **Volatility, not direction, moved the price.** A [[vega]] shock can double a short option's price with the underlying barely moving. A stop on the option price treats a volatility spike as a broken thesis.
- **The market widened.** A [[stop order]] becomes a [[market order]] when triggered. In a wide, fast market it fills at the far side of the [[bid-ask spread]], which in options can be many times the normal width. Out-of-the-money options and spreads with several legs suffer most.
- **The trigger was noise.** Option quotes flicker more than stock prices, and a stop that triggers on the quote or last trade can fire on a brief print that disappears a minute later.

:::practice How experienced traders set stops on options
They define the stop on the underlying (a close below a level, not an intraday touch), or on the position's value at the close of the day using the mid price, and they execute it themselves with a [[limit order]] near the mid, stepping toward the far side if needed. Resting stop orders on options are rare on professional desks. For [[defined risk]] positions, the structure's own max loss is often the hard stop, and the plan's invalidation is the soft one.
:::

None of this means ignoring losses. It means measuring them with the right ruler and executing them with care.

## Rolling: two trades in one ticket

[[Rolling]] means closing a position and opening a similar one, usually later in time, sometimes at different strikes, in one order. Brokers quote the roll as a single net price, and that is the source of a dangerous illusion: if the net is a credit, the roll feels like being paid to fix the trade.

:::example Rolling the ACME put spread
Thirty days into the plan's trade, ACME closes at ${{ num(S1, 0) }}. The {{ int(n) }} January 95/90 put spreads, sold for {{ usd(credit) }}, now cost about {{ usd(closeCost) }} to buy back, with 28 days left. The plan's invalidation (a close below $95) has fired.

**Roll out, same strikes, for a credit.** Buy back the January 95/90 at {{ usd(closeCost) }} and sell the March 95/90 (91 days) at {{ usd(mar9590) }}: a net credit of {{ usd(net1) }}.

**Roll down and out, for a debit.** Buy back the January 95/90 and sell the March 90/85 at {{ usd(mar9085) }}: a net debit of {{ usd(-net2) }}.

Now read either roll as the two trades it is.

1. **Closing the January spreads realizes a loss** of ({{ usd(closeCost) }} − {{ usd(credit) }}) × 100 × {{ int(n) }} = **{{ usd(realized) }}**. That loss is real whatever you do next; the roll's net credit does not undo it.
2. **Opening the March spreads is a new trade** with a new max loss: {{ usd(newMaxLoss1) }} for the March 95/90, or {{ usd(newMaxLoss2) }} for the March 90/85, carried for three more months.

The "credit roll" into the March 95/90 is a new bullish bet that ACME, now at ${{ num(S1, 0) }}, will be above $95 in March. Its max loss of {{ usd(newMaxLoss1) }} comes on top of the {{ usd(realized) }} already realized, so the combined result can still be a loss of {{ usd(realized + newMaxLoss1) }}, close to the original {{ usd((5 - credit) * 100 * n) }} maximum, only three months later. If your thesis was that $95 would hold, and it just failed, that is the trade you would be least likely to open from scratch.
:::

The test for any roll is the same as for any new position: **would you open the new leg as a fresh trade today, at this price, with this size?** If yes, the roll is just an efficient way to close one trade and open another. If you would not, the roll is a way of avoiding the word "loss", and it usually makes the eventual loss bigger.

Rolling has legitimate uses. A [[covered call]] writer whose stock has rallied to the strike may want to keep the shares and sell a later call; a put seller who still believes the thesis may want more time. Both are rolls a trader would make fresh. What separates them from repair attempts is that the thesis is intact.

:::warning "Rolling for a credit" is not a free fix
A net credit means the new option is worth more than the old one costs. It does not mean the trade is now profitable, and it usually means you sold more time, or more risk, than before. Track the closing leg's realized loss in your journal as its own line, not hidden inside a "rolled" position.
:::

## Adjusting versus closing

An adjustment adds or removes legs instead of closing. With ACME at ${{ num(S1, 0) }}, a common adjustment to the losing put spreads is to sell the January 100/105 call spread for about {{ usd(cs) }}, turning the position into an [[iron condor]].

| | Put spreads only | After adding the call spreads |
|---|---|---|
| Total credit (per share) | {{ usd(credit) }} | {{ usd(credit + cs) }} |
| Lower break-even at expiration | {{ usd(sp.breakevens[0]) }} | {{ usd(sc.breakevens[0]) }} |
| Upper break-even | none | {{ usd(sc.breakevens[1]) }} |
| Max loss (two of each) | {{ usd(-sp.maxLoss) }} | {{ usd(-sc.maxLoss) }} |

The extra credit lowers the break-even and even reduces the max loss, because only one side can lose at expiration. It looks like pure improvement. But the position is no longer the trade you planned. The original thesis was "ACME holds above $95"; the adjusted position now loses if ACME rallies above {{ usd(sc.breakevens[1]) }} as well, and it wins only if ACME ends in a narrow range. That is a different view, adopted because the first one failed.

```tool position-builder
{ title: 'The adjusted position: two ACME January iron condors', legs: condorTool, spot: 94, range: [82, 112] }
```

Apply the fresh-trade test again. If you would sell this iron condor today with ACME at ${{ num(S1, 0) }}, the adjustment is fine. If the only reason to add the call side is to make the put side's loss look smaller, close instead. Closing has one cost, the bid-ask spread you pay to exit; every adjustment pays that spread on more legs and keeps capital tied to a position whose original reason is gone. [Neutral and volatility strategies](#core-11) covers iron condors as trades in their own right.

:::key
When a trade goes against you, every choice reduces to one question: would you open the resulting position today, at today's prices? Define stops on the underlying or on the day's closing mid, not on intraday option prices, which jump with volatility and wide markets. A roll is a closing trade that realizes the P&L plus an opening trade with new risk; an adjustment changes the thesis. If the honest answer is no, close.
:::

```quiz
- q: >-
    You sold a put for {{ usd(prem) }} with a stop at twice the premium. The stock dips slightly and implied volatility jumps, and the put's price passes {{ usd(stopPx) }}. The stock is still well above the strike. What made the stop fire?
  choices:
    - >-
      Mainly the jump in implied volatility and the wider market, not a move that threatens the strike
    - >-
      Theta, which raises a short option's price every day
    - >-
      The stop was too far away; it should have been at 1.5 times the premium
  answer: 0
  explain: >-
    With the stock barely moved, most of the increase came from vega and from the far side of a widened market. Theta works the other way for a seller: time passing lowers the option's price. A tighter stop on the same option price would fire even more often on the same noise; the fix is to stop on the underlying or on the closing mid.
- q: >-
    You roll your losing January 95/90 put spreads to the March 95/90 for a net credit of {{ usd(net1) }}. What happened to the loss on the January spreads?
  choices:
    - >-
      It was cancelled by the net credit
    - >-
      It was realized: {{ usd(realized) }} on the two spreads, and the March spreads are a new trade
    - >-
      It is deferred until the March spreads expire
  answer: 1
  explain: >-
    Buying back the January spreads at {{ usd(closeCost) }} after selling them at {{ usd(credit) }} realizes a loss of {{ usd(realized) }} in your P&L. The net credit only says the March spreads brought in more than the January spreads cost to close. The roll does not offset or defer that loss; the March spreads are a separate trade with a new max loss of {{ usd(newMaxLoss1) }}. (When the loss is deductible is a separate tax question: wash sale and straddle rules can postpone it, see [US taxes](#core-14).)
- q: >-
    Adding a January 100/105 call spread to the losing put spreads lowered the break-even and the max loss. Why is that not automatically an improvement?
  choices:
    - >-
      Because the call spread adds a second way to lose: a rally above {{ usd(sc.breakevens[1]) }}, which the original bullish thesis never had to worry about
    - >-
      Because iron condors always have unlimited risk
    - >-
      Because adding legs is never allowed in a margin account
  answer: 0
  explain: >-
    The adjusted position wins only if ACME ends in a range. That is a new, neutral view adopted after the bullish one failed; it is fine only if you would open it fresh. An iron condor's risk is defined by its spread widths, not unlimited, and adding legs is allowed but costs another bid-ask spread.
- q: >-
    Which stop definition best fits a short put spread whose thesis is "ACME holds above $95"?
  choices:
    - >-
      A resting stop order to buy the spread if its ask doubles
    - >-
      Close with a limit order if ACME closes below $95
    - >-
      No exit, since the spread's loss is capped
  answer: 1
  explain: >-
    The thesis is about ACME's price, so the exit should be too, measured on the close so an intraday wobble does not trigger it, and executed with a limit order. A stop on the spread's ask can fire on a volatility spike or a wide quote. Defined risk caps the loss but does not make the max loss a good exit plan.
```
