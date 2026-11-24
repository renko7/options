---
title: The strangle under pressure
summary: Manage a short strangle through a sell-off and a rebound by reading its position Greeks at each step.
kind: scenario
---

```calc
const env = { r: RATE, q: ACME.q };
const row = (dte, K) => chain(ACME, { dte }).rows.find((x) => x.strike === K);
const p95 = row(30, 95).put, c110 = row(30, 110).call;
const P = { kind: 'put', qty: -5, strike: 95, premium: p95.bid, dte: 30, iv: p95.iv };
const C = { kind: 'call', qty: -5, strike: 110, premium: c110.bid, dte: 30, iv: c110.iv };
const st = [P, C];
const credit = -payoff.netPremium(st);
const g0 = payoff.positionGreeks(st, 100, 0, env);
const e1 = { ...env, ivShift: 0.04 };
const pnl1 = payoff.pnlAt(st, 94, 10, e1);
const g1 = payoff.positionGreeks(st, 94, 10, e1);
const putNow = bs.price({ S: 94, K: 95, T: 20 / 365, r: RATE, q: ACME.q, sigma: p95.iv + 0.04, type: 'put' });
const putsPnl = payoff.pnlAt([P], 94, 10, e1), callsPnl = payoff.pnlAt([C], 94, 10, e1);
const crash = payoff.pnlAt(st, 88, 11, { ...env, ivShift: 0.08 });
const hedgeSh = Math.round(g1.delta);
const callNow = bs.price({ S: 107, K: 110, T: 6 / 365, r: RATE, q: ACME.q, sigma: c110.iv, type: 'call' });
const g2 = payoff.positionGreeks([C], 107, 24, env);
const callsClose = payoff.pnlAt([C], 107, 24, env);
const at112 = payoff.pnlAtExpiry([C], 112), at115 = payoff.pnlAtExpiry([C], 115), below = payoff.pnlAtExpiry([C], 107);
```

This Scenario Exercise follows a short-premium trade from a quiet start through a sell-off and a rebound. At each step, the position Greeks tell you what the trade has become.

```scenario
setup: >-
  On November 18, with ACME at $100 and 30 days to the December expiration, you sold 5 December 95 puts at {{ usd(p95.bid) }} and 5 December 110 calls at {{ usd(c110.bid) }}, collecting {{ usd(credit) }}. At entry the position had a delta of {{ signed(g0.delta, 0) }} shares, gamma {{ signed(g0.gamma, 1) }}, theta {{ signedUsd(g0.theta) }} a day and vega {{ signedUsd(g0.vega) }} per vol point: a bet that ACME stays between the strikes and implied volatility stays put.
steps:
  - prompt: >-
      Ten days later ACME has fallen to $94 on sector news, and implied volatility on ACME's options is up 4 points. The 95 puts are now in the money at {{ usd(putNow) }}. The position is down {{ usd(-pnl1) }}, and its Greeks are now: delta {{ signed(g1.delta, 0) }} shares, gamma {{ signed(g1.gamma, 1) }}, theta {{ signedUsd(g1.theta) }} a day, vega {{ signedUsd(g1.vega) }}. What do you do?
    choices:
      - text: >-
          Nothing. Theta is now even higher, {{ signedUsd(g1.theta) }} a day, so time is on your side.
        grade: poor
        feedback: >-
          The theta is real but tiny next to the other Greeks. You are effectively long {{ int(g1.delta) }} shares of a falling stock and short gamma, so every further dollar down costs more than the last. If ACME drops another $6 tomorrow and volatility rises another 4 points, the position is down {{ usd(-crash) }}, about {{ num(-crash / g1.theta, 0) }} days of that theta.
      - text: >-
          Buy back the 5 December 95 puts at about {{ usd(putNow) }} and keep the short calls.
        grade: best
        feedback: >-
          This removes the leg that created almost all of the risk: the put side accounts for nearly all of the {{ int(g1.delta) }}-share delta, the short gamma and the short vega. You realize a loss of {{ usd(-putsPnl) }} on the puts, partly offset by the {{ usd(callsPnl) }} the calls have earned so far. Taking a defined loss now, while the remaining risk is small, is what experienced premium sellers do when a short strike is breached.
      - text: >-
          Sell {{ int(hedgeSh) }} ACME shares to bring the position back to delta-neutral.
        grade: acceptable
        feedback: >-
          This removes the directional exposure for now and is what a market maker would do. But the position is still short {{ num(-g1.gamma, 1) }} gamma and short vega with the put in the money, so you will have to keep re-hedging, selling more after further falls and buying back after bounces, and those trades lock in losses. It also adds a short stock position to manage. For a single trader, closing the problem leg is simpler.
      - text: >-
          Sell 5 more December 90 puts to collect extra premium and lower the break-even.
        grade: poor
        feedback: >-
          This adds more short gamma and short vega in the direction the stock is already moving. It improves the break-even on paper and roughly doubles your exposure to a continued sell-off; the Greeks would show the delta and short gamma growing, not shrinking.
  - prompt: >-
      You bought back the puts. Fourteen days later, with 6 days left to expiration, ACME has rebounded to $107, three dollars below your short 110 calls, and implied volatility is back to where it started. The 5 calls are worth {{ usd(callNow) }} each, almost exactly what you sold them for. Their Greeks: delta {{ signed(g2.delta, 0) }} shares, gamma {{ signed(g2.gamma, 1) }}, theta {{ signedUsd(g2.theta) }} a day. What now?
    choices:
      - text: >-
          Hold to expiration and collect the last {{ usd(callNow * 500) }} of premium. Theta is {{ signedUsd(g2.theta) }} a day.
        grade: poor
        feedback: >-
          If ACME stays below $110 you do keep it, ending {{ usd(below) }} up on the calls. But you are short {{ num(-g2.gamma, 1) }} gamma, close to the strike, in the final week, where gamma is largest. A move to $112 at expiration costs {{ usd(-at112) }} on the calls and $115 costs {{ usd(-at115) }}. You would be risking several times the remaining premium to collect it.
      - text: >-
          Buy back the 5 calls for about {{ usd(callNow * 500) }} and close the trade.
        grade: best
        feedback: >-
          Closing costs {{ usd(-callsClose) }} relative to what you sold the calls for and leaves you with no position in the last week, which is when short gamma near the strike is most dangerous. The remaining reward was small and the risk was not. Once the reward left in a short option is small compared with what a normal move could cost, professionals buy it back.
      - text: >-
          Buy back the December 110 calls and sell January 115 calls for a similar credit.
        grade: acceptable
        feedback: >-
          Rolling up and out removes this week's gamma risk and starts a new trade with more time and a strike further away. That can be reasonable, but it is a new position and should be judged on its own merits, not as a way to recover the loss on the puts.
wrap: >-
  The strangle started as a small, nearly delta-neutral position that earned {{ signedUsd(g0.theta) }} a day. Short gamma turned it into a large long-stock position as ACME fell, and short vega added to the loss as volatility rose. Theta never came close to paying for either. At each step the position Greeks described what the trade had become before the P&L did: a delta of {{ int(g1.delta) }} shares on a falling stock, then heavy gamma near the strike in the final week. Reading them, and acting when the risk they show is out of proportion to the premium left, is the core skill of managing option positions. [Managing trades](#core-12) develops it further.
```

```tool position-builder
{ title: 'Short 5 ACME December 95/110 strangles', legs: st, range: [80, 125], daysPassed: 10, ivShift: 0.04 }
```
