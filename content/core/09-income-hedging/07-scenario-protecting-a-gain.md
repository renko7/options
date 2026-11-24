---
title: Protecting a gain you need in January
summary: Choose and manage a hedge on 500 shares through an earnings announcement, an ex-dividend date and expiration.
kind: scenario
---

```calc
const env = { r: RATE, q: ACME.q };
const jan = chain(ACME, { dte: 58 });
const r = (k) => jan.rows.find((x) => x.strike === k);
const p95 = r(95).put, c105 = r(105).call;
const n = 5; // contracts
const sh = 500;
const colNet = p95.ask - c105.bid; // + debit, − credit
const col = [
  { kind: 'stock', qty: sh, price: 100 },
  { kind: 'put', qty: n, strike: 95, premium: p95.ask, dte: 58, iv: p95.iv },
  { kind: 'call', qty: -n, strike: 105, premium: c105.bid, dte: 58, iv: c105.iv },
];
const pp = [{ kind: 'stock', qty: sh, price: 100 }, { kind: 'put', qty: n, strike: 95, premium: p95.ask }];
const cc = [{ kind: 'stock', qty: sh, price: 100 }, { kind: 'call', qty: -n, strike: 105, premium: c105.bid }];
const gap = 84;
// step 2: Dec 9, ACME at 112, 37 days to January expiration
const d2 = 37;
const c2 = bs.price({ S: 112, K: 105, T: d2 / 365, r: RATE, q: ACME.q, sigma: smileIV(ACME, 105, d2 / 365), type: 'call' });
const tv2 = c2 - 7;
// time value left after the ex-date: the January 105 put plus interest on $105 (core-07's test)
const tDiv = 0.5 / 365, T2a = d2 / 365 - tDiv;
const put2 = bs.price({ S: 112 - ACME.dividend, K: 105, T: T2a, r: RATE, q: 0, sigma: smileIV(ACME, 105, d2 / 365), type: 'put' });
const carry2 = 105 * (1 - Math.exp(-RATE * T2a));
const extr2 = put2 + carry2;
// step 3: Jan 14, ACME at 93, one day left
const p3 = bs.price({ S: 93, K: 95, T: 1 / 365, r: RATE, q: ACME.q, sigma: smileIV(ACME, 95, 1 / 365), type: 'put' });
const colAt93 = payoff.pnlAtExpiry(col, 93);
const credit = -colNet;
```

This exercise uses everything in the Module: covered calls, protective puts, collars, and early assignment around an ex-dividend date. The numbers come from the same ACME chain as the Lessons.

```scenario
setup: >-
  It is Wednesday, November 18. You own 500 ACME shares, bought years ago at $60; ACME is at $100, so the position is worth $50,000. You plan to sell all 500 shares in mid-January to fund a purchase, and you cannot afford for the sale to raise less than $45,000. ACME goes ex-dividend for its $0.50 quarterly dividend on Thursday, December 10, and reports earnings after the close on Tuesday, {{ longDate(ACME_EARNINGS) }}, three days before the January expiration. In the January expiration (Jan 15, 58 days), the 95 put is offered at {{ usd(p95.ask) }} and the 105 call is bid at {{ usd(c105.bid) }}.
steps:
  - prompt: >-
      How do you protect the $45,000 you need through mid-January?
    choices:
      - text: >-
          Sell five January 105 calls against the shares for {{ usd(c105.bid * 100 * n) }}.
        grade: poor
        feedback: >-
          Covered calls give income, not protection. The premium cushions only {{ usd(c105.bid) }} a share. If earnings send ACME to ${{ int(gap) }}, the position loses {{ usd(-payoff.pnlAtExpiry(cc, gap)) }} and the shares are worth {{ usd(gap * sh) }}, below the $45,000 you need.
      - text: >-
          Place a stop-loss order to sell the shares at $92.
        grade: poor
        feedback: >-
          A stop becomes a market order once triggered. Earnings are announced after the close, so if ACME opens at ${{ int(gap) }} the stop sells near ${{ int(gap) }}, for about {{ usd(gap * sh) }}. A stop protects against slides, not gaps, and an earnings date is exactly when gaps happen.
      - text: >-
          Buy five January 95 puts for {{ usd(p95.ask * 100 * n) }}.
        grade: acceptable
        feedback: >-
          This works: you can always sell at $95, so the sale raises at least $47,500, less the {{ usd(p95.ask * 100 * n) }} premium. You keep all the upside. The cost is real, though, about {{ pct(p95.ask / 100, 1) }} of the position for two months, and you were planning to sell in January anyway, so the upside you are paying to keep is short-lived.
      - text: >-
          Put on a January 95/105 collar: buy five 95 puts and sell five 105 calls as one order, for a net {{ colNet < 0 ? usd(-colNet) + ' credit' : usd(colNet) + ' debit' }} per share.
        grade: best
        feedback: >-
          The collar guarantees you can sell at $95 or better, so the sale raises at least $47,500, and it costs nothing: the net is a {{ colNet < 0 ? usd(-colNet * sh) + ' credit' : usd(colNet * sh) + ' debit' }} on 500 shares. You give up gains above $105, but you were selling in January in any case. Your worst case is {{ usd(payoff.pnlAtExpiry(col, 50)) }} against today's value; the best is {{ usd(payoff.pnlAtExpiry(col, 130)) }}.
  - prompt: >-
      You put on the collar. In early December ACME rallies on a well-received product launch. On Wednesday, December 9, the day before the ex-dividend date, it is at $112. Your January 105 calls are worth about {{ usd(c2) }}: $7.00 of intrinsic value and {{ usd(tv2) }} of time value. A friend warns that your calls are about to be assigned for the dividend. What do you do?
    choices:
      - text: >-
          Buy back the five calls at once to prevent assignment.
        grade: acceptable
        feedback: >-
          It removes the cap and the assignment risk, but it costs about {{ usd(c2 * 100 * n) }} to buy back calls you sold for {{ usd(c105.bid * 100 * n) }}, and it was unnecessary. Your goal is a floor, not upside; buying back the calls spends money to change something you did not need changed.
      - text: >-
          Do nothing. The time value the calls will keep after the ex-date is larger than the dividend, so early exercise is unlikely; and if it happened, you would simply sell at $105 a little early.
        grade: best
        feedback: >-
          Right. A holder who exercises today collects $0.50 but gives up the time value the call would still have after the ex-date: about the January 105 put ({{ usd(put2) }}) plus the interest on $105 to expiration ({{ usd(carry2) }}), {{ usd(extr2) }} in all. That is a bad trade, so rational holders will not exercise. With 37 days left, early assignment is unlikely. Even if some calls were assigned, you would sell at $105, which is better than the price you need. Compare the dividend with the same-strike put plus the interest on the strike; do not react to the dividend date alone.
      - text: >-
          Sell the 500 shares in the market at $112 and keep the options open.
        grade: poor
        feedback: >-
          That leaves you short five January 105 calls with no shares behind them: naked calls, with unlimited risk if ACME keeps rising, and a margin requirement you may not have approval for. If you want out at $112, close the whole collar and the shares together.
  - prompt: >-
      The rally fades into earnings, and on January 12 ACME reports a disappointing quarter. On Thursday, January 14, the day before expiration, ACME is at $93. Your 105 calls are worthless; your 95 puts are worth about {{ usd(p3) }}. You still need to sell the shares this week. What do you do?
    choices:
      - text: >-
          Hold the puts through expiration; they are in the money and will be exercised automatically, selling your 500 shares at $95.
        grade: best
        feedback: >-
          The puts do what you bought them for. Exercise sells the shares at $95 for $47,500. Measured from $100 in November, the whole position lost {{ usd(-colAt93) }} including the collar's credit, against {{ usd((100 - 93) * sh) }} unhedged. Check that your broker will exercise automatically, and that no instruction tells it not to.
      - text: >-
          Sell the shares at $93 and sell the puts for about {{ usd(p3) }} as one order.
        grade: acceptable
        feedback: >-
          This gets you to about the same place, $93 plus {{ usd(p3) }} a share, and it removes any risk of something going wrong with the automatic exercise. It costs two sets of bid-ask spreads and commissions instead of one exercise.
      - text: >-
          Sell the puts for {{ usd(p3 * 100 * n) }} and keep the shares a little longer in case ACME bounces.
        grade: poor
        feedback: >-
          This removes the floor at the moment you need it. Your shares are worth {{ usd(93 * sh) }} plus the {{ usd(p3 * 100 * n) }} from the puts, and from here every further dollar ACME falls comes out of money you need. Waiting for a bounce turns a hedge into a speculation.
wrap: >-
  A hedge starts from what you need, not from what is cheapest or most popular. Here the need was a floor under a sale already planned, so a zero-cost collar fit: it bought protection with upside you were never going to keep. Covered calls and stop orders looked like protection but would have failed in the earnings gap that the January expiration had to cover. When the stock rallied, the right check was the dividend against the time value the calls would keep after the ex-date (the put plus interest on the strike), not the calendar alone. And at the end, the put was simply the tool for the job it was bought for.
```

```tool position-builder
{ title: 'The January 95/105 collar on 500 ACME', legs: col, range: [80, 120] }
```
