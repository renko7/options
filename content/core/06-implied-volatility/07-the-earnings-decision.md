---
title: The earnings decision
summary: Decide whether and how to trade ACME's earnings report by comparing the implied move with history, then manage the position after the crush.
kind: scenario
---

```calc
const earn = ACME_EARNINGS;
const sb = smileIV(ACME, 100, 30 / 365);
const sj = smileIV(ACME, 100, 58 / 365);
const m2 = sj * sj * 58 / 365 - sb * sb * 57 / 365;
const m = Math.sqrt(m2);
const pre = Math.sqrt((sb * sb * 2 / 365 + m2) / (3 / 365));
const px = (K, type) => Number(bs.price({ S: 100, K, T: 3 / 365, r: RATE, q: ACME.q, sigma: pre, type }).toFixed(2));
const c100 = px(100, 'call'), p100 = px(100, 'put'), c105 = px(105, 'call'), p95 = px(95, 'put');
const strad = c100 + p100;
const moves = [0.021, 0.040, 0.015, 0.033, 0.026, 0.052, 0.018, 0.029];
const avgMove = moves.reduce((a, b) => a + b, 0) / moves.length;
const beyond = moves.filter((x) => x * 100 > strad).length;
const env = { r: RATE, q: ACME.q, ivShift: sb - pre };
const longStrad = [{ kind: 'call', qty: 5, strike: 100, premium: c100, dte: 3, iv: pre }, { kind: 'put', qty: 5, strike: 100, premium: p100, dte: 3, iv: pre }];
const shortStrad = longStrad.map((l) => ({ ...l, qty: -l.qty }));
const fly = [...shortStrad, { kind: 'call', qty: 5, strike: 105, premium: c105, dte: 3, iv: pre }, { kind: 'put', qty: 5, strike: 95, premium: p95, dte: 3, iv: pre }];
const fs = payoff.summary(fly);
const flyCredit = -fs.netPremium;
const S1 = 104.5;
const flyNow = payoff.pnlAt(fly, S1, 1, env);
const flyExp = payoff.pnlAtExpiry(fly, S1);
const longNow = payoff.pnlAt(longStrad, S1, 1, env), longFlat = payoff.pnlAt(longStrad, 100, 1, env);
const shortNow = payoff.pnlAt(shortStrad, S1, 1, env), short110 = payoff.pnlAt(shortStrad, 110, 1, env);
```

This Scenario Exercise brings together implied volatility, the expected move, the event bump and the crush.

```scenario
setup: >-
  It is the afternoon of {{ longDate(earn) }}. ACME reports earnings after the close and is trading at $100. The January options expire in three days and trade at {{ pct(pre, 1) }} implied volatility, against about {{ pct(sb, 0) }} on ordinary days. The January 100 call is {{ usd(c100) }} and the put {{ usd(p100) }}, so the straddle costs {{ usd(strad) }}; the 105 call is {{ usd(c105) }} and the 95 put {{ usd(p95) }}. From the term structure, the market is pricing an earnings move with a standard deviation of {{ pct(m, 1) }}. Over its last eight reports, ACME moved {{ moves.map((x) => pct(x, 1)).join(', ') }} (in either direction): an average of {{ pct(avgMove, 1) }}, or about {{ usd(100 * avgMove) }} on today's price.
steps:
  - prompt: >-
      What do you do for the report?
    choices:
      - text: >-
          Buy 5 January 100 straddles for {{ usd(strad * 500) }}. Earnings always move the stock.
        grade: poor
        feedback: >-
          The stock will move, but the straddle already charges {{ usd(strad) }} for that, slightly more than ACME's average past move of {{ usd(100 * avgMove) }}. Only {{ int(beyond) }} of the last eight reports moved more than the straddle price. If ACME opens unchanged, the crush leaves you down {{ usd(-longFlat) }} on the five straddles. You would be paying full price for an event that, on the evidence, is not underpriced.
      - text: >-
          Sell 5 January 100 straddles for {{ usd(strad * 500) }}. Implied volatility is extreme and will be crushed.
        grade: poor
        feedback: >-
          The crush will happen, but it only helps if the move is small. This position has no limit on its loss in one overnight gap. ACME's {{ pct(0.052, 1) }} report would have cost about {{ usd(-payoff.pnlAt(shortStrad, 105.2, 1, env)) }}; a $10 gap, which single stocks do produce on surprises, would cost {{ usd(-short110) }}. A high implied volatility is a price, not a promise that the seller wins.
      - text: >-
          Sell 5 January 95/100/105 [[iron butterflies|iron butterfly]]: sell the 100 straddle and buy the 95 put and 105 call, for a net credit of {{ usd(flyCredit) }}.
        grade: best
        feedback: >-
          This sells the event premium at a price slightly above ACME's history while capping the damage. Maximum profit is {{ usd(fs.maxProfit) }} if ACME finishes at $100; maximum loss is {{ usd(-fs.maxLoss) }} if it finishes beyond $95 or $105; the break-evens at expiration are {{ usd(fs.breakevens[0]) }} and {{ usd(fs.breakevens[1]) }}. The edge is thin, so the size is set so that the maximum loss is a sum you can take, which is the right way to sell premium into an event.
      - text: >-
          No trade. The implied move is close to the historical average, so there is no clear edge.
        grade: acceptable
        feedback: >-
          A sound decision. The market charges {{ usd(strad) }} for the move and ACME has averaged {{ usd(100 * avgMove) }}; that is a small edge for a seller at best, and eight reports are a small sample. Passing on a trade with no clear edge costs nothing. The defined-risk sale is reasonable only because its loss is capped and sized.
  - prompt: >-
      You sold the iron butterflies. The next morning ACME beats estimates and opens at {{ usd(S1) }}, up {{ pct(S1 / 100 - 1, 1) }}, more than the market priced. Implied volatility has fallen to {{ pct(sb, 0) }}, and two days remain. The position is down {{ usd(-flyNow) }}. If ACME is still at {{ usd(S1) }} at expiration, the loss will be {{ usd(-flyExp) }}; the most it can lose is {{ usd(-fs.maxLoss) }}. What now?
    choices:
      - text: >-
          Close the position and take the {{ usd(-flyNow) }} loss.
        grade: best
        feedback: >-
          The reason for the trade, the earnings night, is over. What remains is a position that is now short the in-the-money 100 call against a long 105 call close to the money: it loses from time decay if ACME stays put (falling from {{ signedUsd(flyNow) }} to {{ signedUsd(flyExp) }} at {{ usd(S1) }}) and loses more if ACME rises further. Closing turns a defined but growing loss into a known one. For comparison, a buyer of the five straddles made {{ usd(longNow) }} on this move: the move beat the implied move, and the crush still took a share of the gain.
      - text: >-
          Hold to expiration. The loss is capped at {{ usd(-fs.maxLoss) }} and ACME might drift back toward $100.
        grade: acceptable
        feedback: >-
          The risk is defined, so this is not reckless, but the odds have turned. With no event left, ACME is as likely to drift up as down, and time decay now works against the position. Holding is a new two-day bet that ACME falls back below {{ usd(fs.breakevens[1]) }}, made without any reason beyond hoping to recover the loss.
      - text: >-
          Roll: buy back the 100 straddle and sell the 105 straddle to collect more premium and recover the loss.
        grade: poor
        feedback: >-
          The event premium is gone; the new straddle is priced at ordinary volatility with two days left, so it collects little, and it reopens an undefined loss if ACME keeps running. Adding risk to win back a loss is how a defined-risk trade becomes an undefined-risk one.
wrap: >-
  Earnings options are priced on an estimate of the move, and the implied move can be read straight from the term structure or the straddle. The volatility crush is certain; the profit from it is not, because it is only half of the trade. The other half is the size of the move against what was charged. Buyers need a bigger move than the market expects, sellers need a smaller one, and the professional habits are the same on both sides: compare the implied move with history, cap the loss before the event, and close positions whose reason has passed.
```

```tool position-builder
{ title: 'Short 5 ACME January 95/100/105 iron butterflies', legs: fly, range: [90, 110], daysPassed: 1, ivShift: sb - pre }
```
