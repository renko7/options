---
title: "Scenario: your first put spread, from ticket to expiration"
summary: Take a bullish idea from approval limits and margin through order entry, a day-trading decision and the final days before expiration.
kind: scenario
---

```calc
const q30 = chain(ACME, { dte: 30 });
const p95 = q30.rows.find((r) => r.strike === 95).put;
const p90 = q30.rows.find((r) => r.strike === 90).put;
const n = 5;
const nakedReq = 100 * Math.max(p95.bid + 20 - 5, p95.bid + 9.5);
const cashSecured = 9500 - p95.bid * 100;
const natural = p95.bid - p90.ask;
const mid = p95.mid - p90.mid;
const lim = Math.floor(mid * 100) / 100;
const fillCr = Number((lim - 0.03).toFixed(2));
const req = (95 - 90) * 100 * n;
const maxLoss = req - fillCr * 100 * n;
const extra = (fillCr - natural) * 100 * n;
const late = chain(ACME, { dte: 2, spot: 106 });
const p95late = late.rows.find((r) => r.strike === 95).put;
const p90late = late.rows.find((r) => r.strike === 90).put;
const comm = 0.65;
const closeShort = p95late.ask * 100 * n + comm * n;
const legsBP = [{ kind: 'put', qty: -n, strike: 95, premium: p90.ask + fillCr, dte: 30, iv: p95.iv }, { kind: 'put', qty: n, strike: 90, premium: p90.ask, dte: 30, iv: p90.iv }];
```

This Scenario Exercise follows one trade from the order ticket to expiration. You have $12,000 in a new margin account. Your broker approved you for spreads (its third tier) but not for naked options, and it has told you it is still applying the pattern-day-trader rule while it phases in the 2026 intraday margin standards.

```scenario
setup: >-
  Today is {{ longDate(TODAY) }}. ACME is at $100 and you are moderately bullish for the next month: you would be happy if ACME simply stays above $95. The December 95 put is quoted {{ usd(p95.bid) }} by {{ usd(p95.ask) }}; the December 90 put {{ usd(p90.bid) }} by {{ usd(p90.ask) }}. You want to risk no more than about $2,500.
steps:
  - prompt: >-
      How do you express the idea?
    choices:
      - text: >-
          Sell 5 naked December 95 puts for about {{ usd(p95.bid * 100 * n) }} of premium.
        grade: poor
        feedback: >-
          Your approval level does not include naked options, so the broker will reject the order. Even if it did not, each naked put would require about {{ usd(nakedReq) }} of margin and could lose up to {{ usd(cashSecured) }} if ACME collapsed: five of them risk far more than your $2,500 limit.
      - text: >-
          Sell 5 December 95/90 put spreads.
        grade: best
        feedback: >-
          A [[bull put spread]] makes money if ACME stays above $95 and fits your approval. Its margin requirement is the width, $5 × 100 × 5 = {{ usd(req) }}, and once the credit is applied the most you can lose is less than that, so the trade stays inside your $2,500 limit whatever ACME does. The requirement will not grow if ACME falls.
      - text: >-
          Sell 1 cash-secured December 95 put.
        grade: acceptable
        feedback: >-
          Your approval covers it, and the risk is that of owning 100 ACME shares at $95. But it ties up {{ usd(cashSecured) }} of your $12,000, and its worst case (ACME to zero) is a loss of about {{ usd(cashSecured) }}, well beyond your $2,500 limit. The spread gives you the same view with a hard cap on the loss.
  - prompt: >-
      You choose the 5 spreads. The natural credit is {{ usd(natural) }} ({{ usd(p95.bid) }} − {{ usd(p90.ask) }}) and the mid is about {{ usd(mid) }}. How do you enter the order?
    choices:
      - text: >-
          Two market orders: sell the 95 puts, then buy the 90 puts.
        grade: poor
        feedback: >-
          You would receive the bid and pay the ask on each leg, the full natural price of {{ usd(natural) }} or worse, and for a moment you would hold naked short puts, which your approval does not allow. Brokers will typically reject the first order for that reason. Never leg into a spread by selling the short leg first.
      - text: >-
          One complex order: sell 5 December 95/90 put spreads at a limit of {{ usd(lim) }} credit, then lower it a few cents at a time if it does not fill.
        grade: best
        feedback: >-
          Both legs fill together or not at all, and you start near the mid. Suppose it fills after one adjustment at {{ usd(fillCr) }}: you collect {{ usd(fillCr * 100 * n) }}, {{ usd(extra) }} more than the natural price. Your buying power falls by {{ usd(maxLoss) }}, which is exactly the trade's maximum loss.
      - text: >-
          One complex order at the natural credit of {{ usd(natural) }}, to be sure of a fill.
        grade: acceptable
        feedback: >-
          The complex order avoids legging risk and will almost certainly fill, but you give up the difference between the natural price and what a patient limit near the mid would likely get, about {{ usd(extra) }} on this trade. On a spread you may hold for a month that is not a disaster; repeated on every trade, it is a large part of your returns.
  - prompt: >-
      Two days later ACME jumps to $104 by 10:30 a.m. on news. You have already made three day trades this week, in ACME calls. You are tempted to buy some December 105 calls now and sell them before the close. Your account is below $25,000 and your broker still applies the pattern-day-trader rule.
    choices:
      - text: >-
          Buy the calls and sell them before the close.
        grade: poor
        feedback: >-
          That would be your fourth day trade in five business days, which under the old rule designates you a pattern day trader. With less than $25,000 of equity, your broker would then block day trading, and repeated breaches lead to restrictions. Until your broker moves to the new intraday margin standards, the old count still binds you.
      - text: >-
          Skip it. The put spread already benefits from the rally.
        grade: acceptable
        feedback: >-
          Reasonable: your put spread is already making money as ACME rises, and you avoid the pattern-day-trader problem. The only cost is the trade you did not make, which was a short-term bet added on impulse.
      - text: >-
          If you want the calls, buy a size you are willing to hold overnight, and do not sell them today.
        grade: best
        feedback: >-
          Holding overnight means it is not a day trade, so it does not count. The discipline is in the sizing: if the position is only acceptable as an intraday trade, it is too big. Ask your broker when it will switch to the intraday margin standards, after which the day-trade count no longer applies.
  - prompt: >-
      It is now Wednesday, {{ longDate(expiryDate(28)) }}, two days before expiration. ACME is at $106. The December 95 put is quoted {{ usd(p95late.bid) }} by {{ usd(p95late.ask) }} and the December 90 put {{ usd(p90late.bid) }} by {{ usd(p90late.ask) }}. What do you do with the 5 spreads?
    choices:
      - text: >-
          Close the whole spread with market orders.
        grade: poor
        feedback: >-
          The 90 puts are bid {{ usd(p90late.bid) }}, so a market order to sell them has nothing to receive and may not fill at all, while you pay commissions on ten contracts. Market orders on near-worthless options buy at the ask and sell at nothing. If you close, close the risky leg with a limit order.
      - text: >-
          Buy back only the 5 short 95 puts with a limit order at {{ usd(p95late.ask) }} or less, and let the long 90 puts expire.
        grade: best
        feedback: >-
          For at most about {{ usd(closeShort) }} including an assumed {{ usd(comm) }} per contract commission (some brokers waive it on very cheap closing orders), you remove every remaining risk, including a surprise collapse before Friday, and the long 90 puts, now worthless, can simply expire. Closing the short leg first is the safe order of operations.
      - text: >-
          Do nothing and let both legs expire worthless.
        grade: acceptable
        feedback: >-
          With ACME $11 above the short strike and two days left, the spread is very likely to expire worthless and you save a few dollars. The risk is a large drop on news before Friday's close; if ACME were near $95 this would be a poor choice because of pin risk and possible assignment. Many traders accept this risk when the short strike is far away.
wrap: >-
  The trade's outcome was decided by choices that had nothing to do with forecasting ACME. Your approval level and the margin rules pushed you toward a defined-risk spread whose requirement equals its maximum loss. A single complex limit order near the mid earned more than the natural price and avoided legging risk. The day-trading rule your broker applies changed what you could sensibly do mid-week. And near expiration, closing only the risky leg with a limit order removed the last of the risk for a few dollars.
```

The position builder shows the five spreads at the net credit received in this exercise. Move ACME to see the loss stop at the spread's width minus the credit.

```tool position-builder
{ title: 'Short 5 December 95/90 put spreads', legs: legsBP, range: [80, 110], editable: false }
```
