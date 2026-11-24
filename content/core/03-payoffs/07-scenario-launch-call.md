---
title: "Scenario: trading a price target"
summary: Choose a strike for a specific price target, decide what to do when the stock nears the target early, and close a two-leg position safely on expiration day.
kind: scenario
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const n = 2;
const ask = (k) => row(k).call.ask;
const L = (k) => [{ kind: 'call', qty: n, strike: k, premium: ask(k) }];
const ret = (k, s) => payoff.pnlAtExpiry(L(k), s) / (ask(k) * 100 * n);
const pnl = (k, s) => payoff.pnlAtExpiry(L(k), s);
// day 20: ten days left, ACME at $108
const mid = chain(ACME, { dte: 10, spot: 108 });
const m100 = mid.rows.find((r) => r.strike === 100).call;
const m110 = mid.rows.find((r) => r.strike === 110).call;
const sellPx = Number((m100.mid - 0.05).toFixed(2));
const closePnl = (sellPx - ask(100)) * 100 * n;
const spread = [{ kind: 'call', qty: n, strike: 100, premium: ask(100) }, { kind: 'call', qty: -n, strike: 110, premium: m110.bid }];
const ss = payoff.summary(spread);
const netCost = ask(100) - m110.bid;
// expiration day, 3:30 p.m.
const e = chain(ACME, { dte: 0.02, spot: 109.5 });
const e100 = e.rows.find((r) => r.strike === 100).call;
const e110 = e.rows.find((r) => r.strike === 110).call;
const spreadFill = Number((e100.mid - e110.mid - 0.03).toFixed(2));
const finalPnl = (spreadFill - netCost) * 100 * n;
```

This Scenario follows one directional trade from the choice of strike to the final close. Use the payoff tables and the position builder as you go; every decision can be checked against a diagram.

```tool position-builder
{ title: 'ACME December calls: compare strikes', legs: [{ kind: 'call', qty: 2, strike: 100, premium: ask(100), dte: 30, iv: row(100).call.iv }], range: [85, 125] }
```

```scenario
setup: >-
  It is {{ longDate(TODAY) }} and ACME is at $100. ACME holds a product launch on December 3, and you expect the stock to trade up to about $110 by the December expiration on {{ longDate(expiryDate(30)) }}. You want exposure to about 200 shares and are willing to lose the premium if you are wrong. The December calls are offered at: 95 strike {{ usd(ask(95)) }}, 100 strike {{ usd(ask(100)) }}, 105 strike {{ usd(ask(105)) }}, 110 strike {{ usd(ask(110)) }}.
steps:
  - prompt: >-
      Which two calls do you buy?
    choices:
      - text: >-
          Two December 110 calls for {{ usd(ask(110) * 200) }}: the strike matches the target
        grade: poor
        feedback: >-
          A call struck at your target expires worthless if the target is hit exactly. At $110 you lose all {{ usd(ask(110) * 200) }}; you need ACME above {{ usd(110 + ask(110)) }} just to break even. Strikes below a bullish target are the ones that pay when you are right.
      - text: >-
          Two December 105 calls for {{ usd(ask(105) * 200) }}
        grade: acceptable
        feedback: >-
          The highest return if the target is hit: {{ pct(ret(105, 110), 0) }} at $110, {{ signedUsd(pnl(105, 110)) }}. But if ACME gets only to $105, a decent rise, you lose everything. This is a reasonable choice for someone confident about the size of the move, and an unforgiving one if not.
      - text: >-
          Two December 100 calls for {{ usd(ask(100) * 200) }}
        grade: best
        feedback: >-
          A balanced choice. At the $110 target you make {{ signedUsd(pnl(100, 110)) }}, a {{ pct(ret(100, 110), 0) }} return. If ACME gets only to $105 you still make {{ signedUsd(pnl(100, 105)) }}, and the break-even, {{ usd(100 + ask(100)) }}, is only a {{ pct(ask(100) / 100) }} rise away. The worst case is {{ usd(ask(100) * 200) }}.
      - text: >-
          Two December 95 calls for {{ usd(ask(95) * 200) }}
        grade: acceptable
        feedback: >-
          The most forgiving: you profit above {{ usd(95 + ask(95)) }} and make {{ signedUsd(pnl(95, 105)) }} even at $105. But you pay {{ usd(ask(95) * 200) }} and the return at the target is {{ pct(ret(95, 110), 0) }}, so you put more money at risk for less leverage. Fine if you value being partly right over the size of the payoff.
  - prompt: >-
      You bought two December 100 calls at {{ usd(ask(100)) }}. The launch goes well. On day 20, with 10 days left, ACME is at $108. The 100 calls are bid {{ usd(m100.bid) }}, ask {{ usd(m100.ask) }}; the 110 calls are bid {{ usd(m110.bid) }}, ask {{ usd(m110.ask) }}. Your target is $110.
    choices:
      - text: >-
          Sell both 100 calls to close, working a limit near the mid; you are filled at {{ usd(sellPx) }}
        grade: best
        feedback: >-
          You lock in {{ signedUsd(closePnl) }}. With ACME $2 from your target, the remaining reward if you are exactly right is small compared with the {{ usd(sellPx * 200) }} of option value you would be leaving at risk for 10 more days. Taking most of the expected move off the table when the target is nearly reached is a disciplined exit.
      - text: >-
          Sell two December 110 calls at {{ usd(m110.bid) }} against your 100 calls, turning the position into a 100/110 bull call spread
        grade: acceptable
        feedback: >-
          The combined position costs a net {{ usd(netCost) }} a share. At expiration it makes at most {{ usd(ss.maxProfit) }} (ACME at or above $110), breaks even at {{ usd(ss.breakevens[0]) }}, and loses at most {{ usd(-ss.maxLoss) }} if ACME falls back below $100. That caps your upside exactly at your target and lowers the worst case, but you still have {{ usd(-ss.maxLoss) }} at risk where closing would have banked {{ signedUsd(closePnl) }}. A reasonable trade if you are confident ACME holds above about $103.
      - text: >-
          Hold the calls to expiration to get the full move
        grade: acceptable
        feedback: >-
          If ACME finishes at $110 you make {{ signedUsd(pnl(100, 110)) }}, only {{ usd(pnl(100, 110) - closePnl) }} more than closing now, and if it slips back below $100 you lose {{ usd(ask(100) * 200) }}. Holding is not wrong, but you are risking most of a large gain for a small extra amount.
      - text: >-
          Buy four more December 100 calls; the launch is working
        grade: poor
        feedback: >-
          You would be paying {{ usd(m100.ask) }} each, triple your original size, for a target only $2 away, with a break-even on the new calls of {{ usd(100 + m100.ask) }}, above your own target. Adding size after the move has mostly happened is how a winning trade turns into a losing one.
  - prompt: >-
      Suppose instead you had sold the two 110 calls on day 20 and now hold the 100/110 spread. It is expiration day, 3:30 p.m. Eastern, and ACME is at $109.50. The 100 calls are bid {{ usd(e100.bid) }}, ask {{ usd(e100.ask) }}; the 110 calls are bid {{ usd(e110.bid) }}, ask {{ usd(e110.ask) }}. You have {{ usd(5000) }} in cash.
    choices:
      - text: >-
          Do nothing; the 110 calls will expire worthless and the spread pays its value automatically
        grade: poor
        feedback: >-
          The long 100 calls will be exercised automatically, so on Monday you would have bought 200 ACME shares for {{ usd(20000) }} with {{ usd(5000) }} in the account, and carried them over the weekend. And if ACME closes above $110, or news after the close makes the 110 calls worth exercising, you could also be assigned on the short calls without knowing until Monday. Expiration does not settle a spread for you.
      - text: >-
          Sell the 100 calls, and leave the 110 calls to expire worthless
        grade: acceptable
        feedback: >-
          This avoids the share purchase, and the 110 calls are very likely to expire worthless. But for the last half hour, and for the after-hours exercise window, you are short two naked calls: undefined risk. If ACME jumps above $110 before the close, or holders exercise on late news, you would be assigned and short 200 shares. Buying them back costs at most {{ usd(e110.ask * 200) }} here, which is cheap insurance.
      - text: >-
          Close the whole spread with one multi-leg order: sell the 100 calls and buy back the 110 calls at a net {{ usd(spreadFill) }}
        grade: best
        feedback: >-
          Both legs close together, so there is no exercise, no assignment and no naked leg at any moment. You collect {{ usd(spreadFill * 200) }} on a spread that cost a net {{ usd(netCost * 200) }}: a total profit of {{ signedUsd(finalPnl) }}.
wrap: >-
  A price target turns strike selection into arithmetic: buy below a bullish target, check the return at the target and at a partial move, and size so the worst case is acceptable. Once the trade is working, compare what is left to gain with what is now at risk; the expiration diagram alone will not tell you when to leave. And close multi-leg positions as a unit before expiration, so you never end up with stock or a naked short leg you did not choose.
```
