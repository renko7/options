---
title: Trading a product launch with a spread
summary: Choose a structure for a bullish view with a fixed budget, decide what to do when the stock gets there early, and handle expiration day near the short strike.
kind: scenario
---

```calc
const env = { r: RATE, q: ACME.q };
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
const n = 5;
const c100 = R(100).call, c105 = R(105).call, p95 = R(95).put;
const bcFill = fillD(c100.mid - c105.mid);
const bc = [
  { kind: 'call', qty: n, strike: 100, premium: bcFill + c105.mid, dte: 30, iv: c100.iv },
  { kind: 'call', qty: -n, strike: 105, premium: c105.mid, dte: 30, iv: c105.iv },
];
const bcs = payoff.summary(bc);
const callsN = Math.floor(1000 / (c100.ask * 100));
const ratioFill = fillD(c100.mid - 2 * c105.mid);
// step 2: Dec 2, ACME at 106, 16 days left
const mid2 = chain(ACME, { dte: 16, spot: 106 });
const R2 = (k) => mid2.rows.find((r) => r.strike === k).call;
const close2 = fillC(R2(100).mid - R2(105).mid);
const profit2 = (close2 - bcFill) * 100 * n;
const up2 = fillD(R2(105).mid - R2(110).mid);
// step 3: expiration day, 3:30 p.m., ACME at 105.10, about half a trading day left
const S3 = 105.10, T3 = 0.5 / 365;
const v = (K) => bs.price({ S: S3, K, T: T3, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T3), type: 'call' });
const sprd3 = v(100) - v(105);
const close3 = fillC(sprd3);
const short3 = Math.ceil((v(105) + 0.02) * 20) / 20;
```

This exercise puts the Module's spreads to work on one trade, from choosing the structure to expiration day.

```scenario
setup: >-
  It is Wednesday, November 18; ACME is at $100. ACME launches a new product on December 1, and you expect the stock to rise to about $105–$108 by mid-December. You do not expect it to double. You are willing to lose at most $1,000 on the idea, and you do not have approval for naked options.
steps:
  - prompt: >-
      Which trade expresses the view within your limits? All use the December expiration (30 days).
    choices:
      - text: >-
          Buy {{ int(callsN) }} December 100 calls at the ask, {{ usd(c100.ask) }} each.
        grade: acceptable
        feedback: >-
          It fits the budget ({{ usd(callsN * c100.ask * 100) }}) and has unlimited upside, but you are paying for rallies you do not expect. At your $105 target the calls make only {{ usd(callsN * (105 - 100 - c100.ask) * 100) }}, and the break-even is {{ usd(100 + c100.ask) }}.
      - text: >-
          Buy five December 100/105 bull call spreads at {{ usd(bcFill) }}.
        grade: best
        feedback: >-
          The risk is exactly {{ usd(-bcs.maxLoss) }}, the max profit of {{ usd(bcs.maxProfit) }} arrives at your $105 target, and the break-even is {{ usd(bcs.breakevens[0]) }}. You gave up gains above $105, which your view says you do not expect anyway.
      - text: >-
          Enter five 1×2 call ratio spreads (long the 100 call, short two 105 calls) for {{ usd(ratioFill) }} each.
        grade: poor
        feedback: >-
          The tent peaks at your target, but each ratio spread carries a naked short call. Five of them lose $500 for every dollar ACME rises above about {{ usd(105 + 5 - ratioFill) }}, without limit, and you do not have naked-option approval. A launch that goes better than expected becomes your worst case.
      - text: >-
          Enter five bullish risk reversals: sell the December 95 put, buy the December 105 call.
        grade: poor
        feedback: >-
          They cost almost nothing, but five short 95 puts commit you to buying 500 shares at $95 if the launch disappoints. At $85 that is a loss of about {{ usd((95 - 85) * 100 * n) }}, five times your limit, and the short puts are naked.
  - prompt: >-
      You bought the five spreads. The launch goes well. On Wednesday, December 2, with 16 days left, ACME is at $106. The spread can be sold at about {{ usd(close2) }}, a profit of {{ usd(profit2) }}. Its maximum value at expiration is $5.00. What do you do?
    choices:
      - text: >-
          Close all five spreads and take the {{ usd(profit2) }}.
        grade: best
        feedback: >-
          The catalyst you traded has happened. Holding on is a new bet: you would risk the {{ usd(close2 * 100 * n) }} the spreads are worth now to make {{ usd((5 - close2) * 100 * n) }} more, and only if ACME is still above $105 in 16 days. Taking a profit once the thesis has played out is how professionals keep winners.
      - text: >-
          Hold all five to expiration for the full {{ usd(bcs.maxProfit) }}.
        grade: acceptable
        feedback: >-
          It can work, and ACME only needs to stay above $105. But you are now risking {{ usd(close2 * 100 * n) }} of current value to gain {{ usd((5 - close2) * 100 * n) }}, with the news already out. If you hold, do it as a decision, with a level at which you will close, not by default.
      - text: >-
          Roll up: sell the 100/105 spreads and buy five 105/110 call spreads at about {{ usd(up2) }}.
        grade: acceptable
        feedback: >-
          This banks the {{ usd(profit2) }} and places a new bet that ACME reaches $110. The new spreads risk {{ usd(up2 * 100 * n) }}, more than your original $1,000 budget, on a move your view did not include. It is a reasonable trade only if you have a new reason to expect it.
      - text: >-
          Buy five more 100/105 spreads at the current price, since the trade is working.
        grade: poor
        feedback: >-
          New spreads would cost about {{ usd(fillD(R2(100).mid - R2(105).mid)) }} to make at most $5.00: risking {{ usd(fillD(R2(100).mid - R2(105).mid) * 100 * n) }} to make {{ usd((5 - fillD(R2(100).mid - R2(105).mid)) * 100 * n) }}. A trade that worked does not make the next one at a worse price a good idea.
  - prompt: >-
      Suppose you held. It is now Friday, December 18, expiration day, 3:30 p.m. Eastern. ACME is at {{ usd(S3) }}, just above your short strike. The five spreads can be sold at about {{ usd(close3) }} each. What do you do?
    choices:
      - text: >-
          Sell the five spreads now as one order.
        grade: best
        feedback: >-
          You lock in about {{ usd((close3 - bcFill) * 100 * n) }} and walk away flat. Giving up the last {{ usd((5 - close3) * 100 * n) }} of the theoretical maximum removes all uncertainty about exercise and assignment over the weekend.
      - text: >-
          Let them expire. ACME is above $105, so everything will be exercised and assigned and you will be flat.
        grade: poor
        feedback: >-
          Your long 100 calls will be exercised, so you will buy 500 shares. Your short 105 calls are only ten cents in the money: if ACME slips after the close, many holders will not exercise, and you may not be assigned. You could start Monday long 500 ACME, $50,000 of stock, with no hedge. A $3 drop over the weekend would cost $1,500. That is pin risk.
      - text: >-
          Buy back only the five short 105 calls for about {{ usd(short3) }} each, and let the long 100 calls be exercised.
        grade: acceptable
        feedback: >-
          This removes the uncertainty, but by design you will own 500 ACME at $100 on Monday, a $50,000 position. That is fine if you want the shares and can pay for them; if not, it is a needless risk. Selling the spread closes everything in one step.
      - text: >-
          Sell only the five long 100 calls and let the short 105 calls expire.
        grade: poor
        feedback: >-
          This leaves five naked short calls ten cents in the money at the close. If they are assigned, you will be short 500 shares on Monday with nothing to cover them, and your account may not even be approved for that position.
wrap: >-
  The spread did its job because its shape matched the view: a defined risk equal to the budget, and a maximum payoff at the target. The ratio spread and the risk reversal looked cheaper but hid tails far beyond the budget. Once the catalyst had passed, the remaining trade was a new and worse bet. And on expiration day, a stock sitting near the short strike is a reason to close, not to wait.
```

```tool position-builder
{ title: 'Five December 100/105 bull call spreads', legs: bc, range: [92, 115] }
```
