---
title: The collar
summary: Pay for a protective put by selling a call, build a zero-cost collar, and understand exactly what you give up for free protection.
---

```calc
const env = { r: RATE, q: ACME.q };
const expJ = expiryDate(58);
const jan = chain(ACME, { dte: 58 });
const dec = chain(ACME, { dte: 30 });
const r = (ch, k) => ch.rows.find((x) => x.strike === k);
const p95 = r(jan, 95).put, c105 = r(jan, 105).call;
const net = p95.ask - c105.bid; // + debit, − credit
const col = [
  { kind: 'stock', qty: 100, price: 100 },
  { kind: 'put', qty: 1, strike: 95, premium: p95.ask, dte: 58, iv: p95.iv },
  { kind: 'call', qty: -1, strike: 105, premium: c105.bid, dte: 58, iv: c105.iv },
];
const s = payoff.summary(col);
const g = payoff.positionGreeks(col, 100, 0, env);
const pp = [{ kind: 'stock', qty: 100, price: 100 }, { kind: 'put', qty: 1, strike: 95, premium: p95.ask, dte: 58, iv: p95.iv }];
const pps = payoff.summary(pp);
const cost = (ch, kp, kc) => r(ch, kp).put.ask - r(ch, kc).call.bid;
const netTxt = (x) => (x > 0.005 ? `${usd(x)} debit` : x < -0.005 ? `${usd(-x)} credit` : 'even');
const T = 58 / 365;
const atmJ = smileIV(ACME, 100, T);
const flatPut = bs.price({ S: 100, K: 95, T, r: RATE, q: ACME.q, sigma: atmJ, type: 'put' });
const flatCall = bs.price({ S: 100, K: 105, T, r: RATE, q: ACME.q, sigma: atmJ, type: 'call' });
```

The [protective put](#core-09-protective-put) Lesson ended with a problem: insurance is expensive if you keep buying it. A [[collar]] pays for the put by selling a call. You give up the stock's upside above one strike in exchange for protection below another. If the call brings in as much as the put costs, the protection is "free", and the structure is called a zero-cost collar.

## The position

Long 100 shares, long one put below the stock price, short one call above it, both in the same expiration. Below the put strike you are protected; above the call strike you are capped; in between, you own the stock.

:::example A January 95/105 collar on 100 ACME
You own 100 ACME at $100. In the January expiration ({{ longDate(expJ) }}, 58 days), the 95 put is offered at {{ usd(p95.ask) }} and the 105 call is bid at {{ usd(c105.bid) }}. You enter both as one order and the net is {{ netTxt(net) }} per share.

At expiration:

- **Below $95**: the put lets you sell at $95. Your loss is capped at {{ usd(-s.maxLoss) }}.
- **Between $95 and $105**: both options expire worthless and you have the stock's gain or loss, adjusted by the small net premium. The break-even is {{ usd(s.breakevens[0]) }}.
- **Above $105**: your shares are called away at $105. Your gain is capped at {{ usd(s.maxProfit) }}.

Compare the protective put on its own (the same January 95 put, no call): its max loss is {{ usd(-pps.maxLoss) }} and its break-even {{ usd(pps.breakevens[0]) }}, with unlimited upside. The collar improved both the worst case and the break-even by {{ usd(c105.bid) }} a share, the premium of the call you sold, and paid for that with everything above $105.
:::

The collar's payoff has a shape you will meet again in [Directional spreads](#core-10): flat, a rising slope between two strikes, flat again. That is a bull call spread. By [[put-call parity]], stock plus a long put plus a short call has the same payoff as a long 95 call plus a short 105 call plus cash. A collared stock is no longer really a stock position; it is a limited-risk, limited-reward bet that ACME finishes higher within a $10 band.

## Choosing the strikes

The two strikes trade off against each other. A tighter floor costs more; a lower cap pays more. Here are some January and December collars on 100 ACME at $100 (put bought at the ask, call sold at the bid):

| Put / call strikes | December (30 days) | January (58 days) |
|---|---|---|
| 95 / 105 | {{ netTxt(cost(dec, 95, 105)) }} | {{ netTxt(cost(jan, 95, 105)) }} |
| 90 / 110 | {{ netTxt(cost(dec, 90, 110)) }} | {{ netTxt(cost(jan, 90, 110)) }} |
| 95 / 110 | {{ netTxt(cost(dec, 95, 110)) }} | {{ netTxt(cost(jan, 95, 110)) }} |
| 95 / 115 | {{ netTxt(cost(dec, 95, 115)) }} | {{ netTxt(cost(jan, 95, 115)) }} |

The symmetric collars, $5 or $10 either side, are close to zero cost. Keeping more upside with the same floor (95/110, 95/115) costs real money, because the call you sell is further out of the money and worth less.

## How skew prices a collar

Equity puts trade at higher implied volatility than calls the same distance away (the [[volatility skew]]). In January, the 95 put is priced at {{ pct(p95.iv, 1) }} implied volatility and the 105 call at {{ pct(c105.iv, 1) }}. If both were priced at the January at-the-money volatility of {{ pct(atmJ, 1) }}, the put would be worth {{ usd(flatPut) }} and the call {{ usd(flatCall) }}; with the skew, their theoretical values are {{ usd(p95.theo) }} and {{ usd(c105.theo) }}. The skew makes the protection you buy dearer and the upside you sell cheaper, so a zero-cost collar has to give up more upside than it would in a market without skew. The call still comes out slightly ahead here because ACME's forward price sits above $100 (the interest rate is higher than the dividend yield), which makes calls a little more valuable than puts equally far from spot.

:::warning "Zero cost" is not free
A zero-cost collar costs no cash, but it is paid for: you have sold every dollar of ACME above $105 until January. If ACME rallies to $125, the collar makes {{ usd(payoff.pnlAtExpiry(col, 125)) }} where the shares alone would make $2,500. Whether that is a good trade depends on how much you value the protection, not on the cash price of zero.
:::

## Greeks and behavior before expiration

With ACME at $100 the collar's [[position delta]] is {{ num(g.delta, 0) }} shares, against 100 for the shares alone: the put and the call each take away part of it. Its theta ({{ signedUsd(g.theta) }} a day) and vega ({{ signedUsd(g.vega) }} per vol point) are close to zero, because the long put and the short call largely cancel. You are neither long nor short volatility to any meaningful degree; you have simply traded a range of outcomes for certainty at the ends.

That has a practical consequence: a collar responds slowly before expiration. Ten days in, at $110 the position shows {{ usd(payoff.pnlAt(col, 110, 10, env)) }} (not the full {{ usd(s.maxProfit) }}), and at $85 it shows {{ usd(payoff.pnlAt(col, 85, 10, env)) }} (not the full {{ usd(s.maxLoss) }}). The edges of the payoff are only reached at expiration.

## Early assignment and expiration

The short call can be assigned early, most likely the day before an [[ex-dividend date]] if ACME has rallied well above $105 (see [Choosing the call](#core-09-choosing-the-call)). If that happens your shares are delivered at $105 and you are left holding a put on stock you no longer own. Sell it; leaving it open turns a hedge into a speculative bet that ACME falls.

At expiration, exactly one of the three outcomes occurs: the put is exercised (shares sold at $95), the call is assigned (shares sold at $105), or both expire and you keep the shares. To keep the hedge in place, roll the collar to a later expiration before it expires, usually as one order that closes the old options and opens new ones.

:::practice Who uses collars
Collars are the standard hedge for concentrated stock positions: an executive whose wealth is mostly company stock, or an investor sitting on a large unrealized gain who does not want to sell yet. They are typically placed 3 to 12 months out, often zero-cost, with the put strike chosen from the loss the holder can tolerate and the call strike from whatever makes the cost zero. Company insiders face additional trading restrictions and should check them before hedging.
:::

```tool position-builder
{ title: 'Zero-cost collar: 100 ACME, long January 95 put, short January 105 call', legs: col, range: [80, 120] }
```

:::rule Collars and taxes (as of 2026)
A collar with a very narrow band between the strikes can be treated as a constructive sale of appreciated stock under section 1259 of the Internal Revenue Code, triggering the tax on the gain as if you had sold. The IRS has not issued final regulations saying how narrow is too narrow. Stock held with a long put is a tax straddle whatever the call, so losses can be deferred, and the put can restart the holding period of shares held one year or less (see [The protective put](#core-09-protective-put)); the qualified covered call exception does not cover a collar. This is not tax advice; see [US taxes](#core-14).
:::

:::key
A collar is stock plus a protective put paid for by a short call: losses capped below the put strike, gains capped above the call strike. Its payoff equals a bull call spread plus cash. A zero-cost collar costs no cash but is paid for with upside, and skew makes that protection cost more upside than it would at a flat volatility.
:::

```quiz
- q: >-
    You hold the January 95/105 collar on 100 ACME bought at $100, entered at {{ netTxt(net) }} per share. ACME is at $88 at expiration. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(col, 88)) }}
    - >-
      −$1,200.00
    - >-
      {{ usd(payoff.pnlAtExpiry(col, 95)) }} plus the put's value
  answer: 0
  explain: >-
    The put lets you sell at $95, so you lose $5 a share on the stock, adjusted by the small net premium: {{ usd(payoff.pnlAtExpiry(col, 88)) }}. −$1,200 is the unhedged stock loss, which the put prevents. The put's value at expiration is already counted when you exercise it to sell at $95.
- q: >-
    What is the main cost of a zero-cost collar?
  choices:
    - >-
      None: the call pays for the put
    - >-
      The upside above the call strike that you have sold
    - >-
      The time decay of the put
  answer: 1
  explain: >-
    No cash changes hands, but you have sold the stock's gains above the call strike. In a strong rally that is a large cost: at $125 the collar makes {{ usd(payoff.pnlAtExpiry(col, 125)) }} against $2,500 for the shares alone. The put's time decay is roughly offset by the short call's, which is why the collar's theta is close to zero.
- q: >-
    Which position has the same payoff at expiration as a collared stock (long stock, long 95 put, short 105 call)?
  choices:
    - >-
      A long 95/105 bull call spread plus cash
    - >-
      A short 95/105 strangle
    - >-
      A covered call on the 105 strike
  answer: 0
  explain: >-
    Stock plus a long put equals a long call plus cash (put-call parity), so stock + long 95 put + short 105 call equals long 95 call + short 105 call + cash, a bull call spread. A covered call has no floor, and a short strangle has losses on both sides.
- q: >-
    Why does equity volatility skew make zero-cost collars less generous?
  choices:
    - >-
      It makes the put you buy more expensive and the call you sell cheaper
    - >-
      It makes the call you sell more expensive
    - >-
      It only affects index options
  answer: 0
  explain: >-
    Downside puts carry higher implied volatility than upside calls, so the protection costs more than it would at a flat volatility and the call you sell brings in relatively less. To make the cost zero, you must sell a call closer to the money, giving up more upside. Skew is strongest in index options but present in most single stocks too.
```
