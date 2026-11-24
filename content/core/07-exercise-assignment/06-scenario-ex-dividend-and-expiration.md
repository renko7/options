---
title: "Scenario: a dividend, a pin and a Monday surprise"
summary: Manage a covered stock position through an ex-dividend date and an expiration Friday, deciding when to close short options and what to do after an unexpected assignment.
kind: scenario
---

```calc
const D = ACME.dividend;
const exDate = longDate(ACME_EX_DIVIDEND);
const decDay = longDate(expiryDate(21));
const fri = longDate(expiryDate(30));
const mon = longDate(expiryDate(33));
// Wed Dec 9: ACME at $100; January options have 37 days left, December 9.
const qJan = chain(ACME, { dte: 37 });
const c80 = qJan.rows.find((r) => r.strike === 80).call;
const tDiv = 0.5 / 365;
const T80 = 37 / 365 - tDiv;
const extr80 = bs.price({ S: 100 - D, K: 80, T: T80, r: RATE, q: 0, sigma: smileIV(ACME, 80, 37 / 365), type: 'put' }) + 80 * (1 - Math.exp(-RATE * T80));
const buyback = c80.ask * 500;
const aboveIntrinsic = (c80.ask - 20) * 500;
const qDec = chain(ACME, { dte: 9 });
const c100bid = qDec.rows.find((r) => r.strike === 100).call.bid;
const p95 = qDec.rows.find((r) => r.strike === 95).put.bid;
const putIncome = p95 * 500;
const late = bs.price({ S: 100.04, K: 100, T: 0.25 / 24 / 365, r: RATE, q: ACME.q, sigma: ACME.iv, type: 'call' });
const lateAsk = Math.ceil((late + 0.01) * 100) / 100;
const lateCost = lateAsk * 500;
const assigned = 4;
const buyCost = 95 * 100 * assigned;
const openPx = 92.5;
const assignLoss = (openPx - 95) * 100 * assigned + putIncome;
const fridayUp = (103 - 100) * 500;
```

This Scenario Exercise follows one account through ACME's December ex-dividend date and the December expiration. Every decision uses something from this Module: dividend risk, pin risk, after-hours exercise and assignment.

```scenario
setup: >-
  You own 500 ACME shares, bought years ago at $40. You intend to keep them: they pay a dividend you like, and selling would realize a large taxable gain you do not want this year (taxes are covered in [US taxes](#core-14)). Earlier in the autumn, with ACME near $78, you sold 5 ACME January 80 calls against the shares as a [[covered call]]. Today is Wednesday, {{ decDay }}. ACME is at $100 and goes ex-dividend tomorrow, {{ exDate }}, with a {{ usd(D) }} dividend. The January 80 calls are quoted {{ usd(c80.bid) }} bid, {{ usd(c80.ask) }} ask.
steps:
  - prompt: >-
      It is 2:30 p.m. After tomorrow's ex-date, each January 80 call would keep only about {{ usd(extr80) }} of extrinsic value, less than the {{ usd(D) }} dividend. What do you do before the close?
    choices:
      - text: >-
          Nothing. Assignment is random and early exercise is rare.
        grade: poor
        feedback: >-
          Early exercise is rare in general, but not here. Holders of these calls gain by exercising today, because the dividend is worth more than the {{ usd(extr80) }} of extrinsic value they give up, and professional holders check this every time. Expect to be assigned on most or all five contracts tonight. Your 500 shares would be called away at $80, realizing exactly the gain you wanted to defer, and you would not receive the {{ usd(D * 500) }} dividend.
      - text: >-
          Buy back the 5 January 80 calls at {{ usd(c80.ask) }} before the close.
        grade: best
        feedback: >-
          This costs {{ usd(buyback) }}, of which only {{ usd(aboveIntrinsic) }} is above the calls' intrinsic value. In return you keep the shares and collect the {{ usd(D * 500) }} dividend. Economically, being assigned would have cost you about the same; the reason to act is that assignment would have sold shares you are determined to keep. Writers who want to keep the stock close deep in-the-money short calls the day before the ex-date.
      - text: >-
          Wait and buy the calls back tomorrow morning, after seeing whether you were assigned.
        grade: poor
        feedback: >-
          Assignment happens overnight. By tomorrow's open the exercises are done, and any calls assigned have already turned into a sale of your shares at $80. The only time to act on dividend risk is before the close on the day before the ex-date.
  - prompt: >-
      You bought the January calls back and kept the shares through the ex-date. For some income, the same afternoon you also sold 5 ACME December 100 calls at {{ usd(c100bid) }} against the shares, collecting {{ usd(c100bid * 500) }}, and sold 5 December 95 puts at {{ usd(p95) }}, collecting {{ usd(putIncome) }}; you have the cash to buy 500 more shares at $95 if you must. It is now 3:45 p.m. on Friday, {{ fri }}, the December expiration. ACME is at $100.04. The December 100 calls are offered at {{ usd(lateAsk) }}.
    choices:
      - text: >-
          Leave the calls; they are only four cents in the money.
        grade: poor
        feedback: >-
          Four cents is above the $0.01 exercise-by-exception threshold. If ACME closes here, the calls are exercised automatically unless holders opt out, and you may be assigned on some, all or none of the five: you will not know until Monday. Any assignment sells shares you want to keep, at $100, realizing the gain. If ACME jumps to $103 in after-hours trading, holders will certainly exercise and you lose shares worth {{ usd(fridayUp) }} more than the $100 you receive.
      - text: >-
          Buy back the 5 calls at {{ usd(lateAsk) }}, and leave the puts, which are about $5 out of the money.
        grade: best
        feedback: >-
          For {{ usd(lateCost) }} you remove the pin risk on the calls completely. The puts are a judgment call: $5 out of the money with fifteen minutes left, they are very likely to expire, and you are willing to own more ACME at $95. Leaving them keeps the {{ usd(putIncome) }} income but means an after-hours drop could still bring an assignment.
      - text: >-
          File a do-not-exercise instruction on the calls with your broker.
        grade: poor
        feedback: >-
          Do-not-exercise instructions are for holders. You are the writer: you have no say over whether the calls are exercised. The only way a writer controls expiration risk is to close the position before trading ends.
  - prompt: >-
      ACME closes at $100.04. At 4:40 p.m. ACME announces that its chief executive has resigned, and the stock trades at $93 after hours. On Monday morning, {{ mon }}, your broker reports that you were assigned on {{ int(assigned) }} of your 5 December 95 puts: you bought {{ int(assigned * 100) }} shares at $95, a {{ usd(buyCost) }} cash outflow. ACME is indicated to open at {{ usd(openPx) }}. What do you do?
    choices:
      - text: >-
          Call your broker and ask for the assignment to be reversed, since the puts were out of the money at the close.
        grade: poor
        feedback: >-
          The assignment is valid. Holders may exercise out-of-the-money options until their broker's cut-off, no later than 5:30 p.m. ET, and with ACME at $93 after hours, exercising a $95 put was worth $2 a share. Nobody will reverse it. The closing price only sets the automatic default.
      - text: >-
          Sell all 900 shares at the open to get out of ACME after the bad news.
        grade: poor
        feedback: >-
          Selling the 400 new shares may be reasonable, but selling your original 500 realizes the gain you have been working to defer, as a reaction to one headline. The assignment did not create a reason to change your long-term holding; treat the two blocks of shares separately.
      - text: >-
          Confirm the cash and margin position, then decide on the 400 new shares as a fresh trade: keep them if 900 shares fits your plan and account, otherwise sell them.
        grade: best
        feedback: >-
          You sold the puts accepting that you might buy ACME at $95, and the {{ usd(buyCost) }} purchase was covered by cash you had set aside, so there is no margin call. At a {{ usd(openPx) }} open the assigned shares show a loss of {{ usd(-assignLoss) }} after the {{ usd(putIncome) }} premium. Whether to hold them is now a stock decision like any other, made on its own merits rather than in a panic or out of a wish to "get back" to even.
wrap: >-
  Every decision here was about the gap between the default outcome and the outcome you wanted. Short calls deep in the money before an ex-dividend date are exercised by rational holders, so you close them if you want to keep the stock. Short options within a few cents of the strike at the close are a coin toss decided after hours, so you close them for a few cents. Options that are out of the money at 4:00 p.m. can still be exercised against you until the holders' cut-off. And an assignment, once it happens, is final: you are left with an ordinary stock position to manage on its merits, which is why you size short options so that the shares they could deliver fit your account.
```
