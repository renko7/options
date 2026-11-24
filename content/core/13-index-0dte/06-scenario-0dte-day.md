---
title: "Scenario: one day, one iron condor"
summary: Plan, size, enter and manage a same-day HBR iron condor through a market drop, using the settlement, Greek and sizing lessons of this Module.
kind: scenario
---

```calc
const T0 = 6.5 / 24 / 365;
const T1 = 2.5 / 24 / 365;
const iv = (K, T) => smileIV(HBR, K, T);
const fair = (S, K, T, type) => bs.price({ S, K, T, r: RATE, q: HBR.q, sigma: iv(K, T), type });
const quote = (K, type) => {
  const p = fair(5000, K, T0, type);
  const half = Math.max(0.01, p * 0.02) + 0.2;
  const t = p < 3 ? 0.01 : 0.05;
  return { p, bid: Math.max(0, Math.floor((p - half) / t) * t), ask: Math.ceil((p + half) / t) * t };
};
const p4950 = quote(4950, 'put');
const p4975 = quote(4975, 'put');
const c5025 = quote(5025, 'call');
const c5050 = quote(5050, 'call');
const icMid = p4975.p - p4950.p + c5025.p - c5050.p;
const icNat = p4975.bid - p4950.ask + c5025.bid - c5050.ask;
const credit = Number(icMid.toFixed(2));
const maxLoss = (25 - credit) * 100;
const acct = 250000;
const budget = 0.01 * acct;
const strCredit = p4975.bid + c5025.bid;
const S1 = 4970;
const icLater = fair(S1, 4975, T1, 'put') - fair(S1, 4950, T1, 'put') + fair(S1, 5025, T1, 'call') - fair(S1, 5050, T1, 'call');
const closeLoss = (icLater - credit) * 100;
const lowPnl = (credit - 25) * 100;
const recPnl = (credit - 0) * 100;
const gam = bs.greeks({ S: S1, K: 4975, T: T1, r: RATE, q: HBR.q, sigma: iv(4975, T1), type: 'put' }).gamma;
```

This Scenario Exercise is one trading day with HBR same-day options. You trade a $250,000 account, and your written plan caps the loss on any one day at 1%, {{ usd(budget, 0) }}. You trade only PM-settled, cash-settled HBR options.

```scenario
setup: >-
  It is 9:45 a.m. on a quiet Wednesday with no scheduled economic news. HBR is at 5,000 and you expect a range-bound day. Today's HBR options expire at the close. The 4,975 put is quoted {{ num(p4975.bid) }} by {{ num(p4975.ask) }}, the 4,950 put {{ num(p4950.bid) }} by {{ num(p4950.ask) }}, the 5,025 call {{ num(c5025.bid) }} by {{ num(c5025.ask) }} and the 5,050 call {{ num(c5050.bid) }} by {{ num(c5050.ask) }}.
steps:
  - prompt: >-
      What position do you put on?
    choices:
      - text: >-
          One 4,950/4,975/5,025/5,050 [[iron condor]]: short the 4,975 put and 5,025 call, long the 4,950 put and 5,050 call.
        grade: best
        feedback: >-
          At about {{ num(credit) }} points of credit the condor's maximum loss is (25 − {{ num(credit) }}) × $100 = {{ usd(maxLoss) }}, inside your {{ usd(budget, 0) }} daily cap. Every outcome is known in advance, settlement is in cash at the close, and nothing can be assigned early.
      - text: >-
          Five of the same iron condors, since they will probably all expire worthless.
        grade: poor
        feedback: >-
          Five condors can lose {{ usd(maxLoss * 5) }}, nearly five times your daily cap. A high probability of profit does not change what the losing day costs, and sizing by probability instead of by maximum loss is how 0DTE accounts are wiped out.
      - text: >-
          Sell the 4,975 put and the 5,025 call naked, a strangle, for more credit.
        grade: poor
        feedback: >-
          You collect about {{ num(strCredit) }} points instead of the condor's {{ num(credit) }}, but the loss has no cap: a 1.5% fall to 4,925 would cost about {{ usd(((4975 - 4925) - strCredit) * 100) }}, and a 3% fall far more. A position with no maximum loss cannot be sized against a daily budget.
  - prompt: >-
      You choose one condor. The credit is about {{ num(icMid) }} at the mid and {{ num(icNat) }} at the natural price. How do you enter it?
    choices:
      - text: >-
          One four-leg complex order at a limit near the mid, {{ num(credit) }} credit, lowering it a few cents at a time if needed.
        grade: best
        feedback: >-
          All four legs fill together or not at all, and you start where the trade is fairly priced. On a same-day condor the difference between mid and natural, {{ num(icMid - icNat) }} points, is a large share of the whole credit, so patience here is worth more than any commission saving.
      - text: >-
          Sell the two short options first with limit orders, then buy the wings once those fill.
        grade: poor
        feedback: >-
          Until the wings are bought you hold a naked strangle, with unlimited risk, in options whose delta can change within minutes. Many brokers will not allow it at a spreads approval level anyway. If you must leg, buy protection first; better, use one complex order.
      - text: >-
          One complex order at the natural price, {{ num(icNat) }}, to be sure of a fill.
        grade: acceptable
        feedback: >-
          You avoid legging risk and will be filled at once, but you give up {{ num(icMid - icNat) }} points, {{ usd((icMid - icNat) * 100) }}, of a {{ usd(credit * 100) }} credit at the start. Done every day, that cost alone can turn a reasonable strategy into a losing one.
  - prompt: >-
      You are filled at {{ num(credit) }}. At 1:30 p.m. HBR has dropped to {{ int(S1) }}, five points below your short put, with 2.5 hours left. The condor would cost about {{ num(icLater) }} points to close: a loss of {{ usd(closeLoss) }} if you close now. The short 4,975 put's gamma is {{ num(gam, 4) }} per point. Your plan says to close a same-day spread once its loss exceeds twice the credit. What do you do?
    choices:
      - text: >-
          Close the condor (or at least the put spread) now with a limit order, as the plan says.
        grade: best
        feedback: >-
          You take a {{ usd(closeLoss) }} loss, well inside your {{ usd(budget, 0) }} daily cap, and you are done for the day. With HBR just below the short strike and gamma high, the remaining hours could go either way quickly: a further 25-point fall settles the spread at its maximum loss of {{ usd(-lowPnl) }}; a rebound above 4,975 would have paid the full {{ usd(recPnl) }}. Following the plan means accepting that sometimes the trade you closed would have recovered.
      - text: >-
          Hold to the close. The maximum loss is {{ usd(maxLoss) }}, which is within the daily cap.
        grade: acceptable
        feedback: >-
          Defensible, because the condor was sized so that its worst case fits your budget: that is exactly what defined risk buys you. If HBR settles below 4,950 you lose {{ usd(-lowPnl) }}; if it rebounds above 4,975 you keep {{ usd(recPnl) }}. But it breaks your own written exit rule, and traders who override their plans on losing days rarely do so only once.
      - text: >-
          Sell a second condor centered at {{ int(S1) }} to collect more credit and "average" the position.
        grade: poor
        feedback: >-
          Adding risk to a losing same-day position near the short strike, with gamma at its highest, is the classic 0DTE mistake. The two condors together could lose about {{ usd(maxLoss * 2) }}, almost twice your daily cap, if HBR keeps falling. More credit does not reduce the risk; it doubles it.
wrap: >-
  Every decision today came back to maximum loss. The condor was chosen and sized because its worst case was known and fitted the day's budget; the complex order at the mid protected the small same-day credit from bid-ask costs; and the exit rule existed because same-day gamma turns a small move into a large change in the position within minutes. Cash settlement at the close, European style and PM settlement removed every assignment and overnight question, which is why so much 0DTE trading uses index options. What they cannot remove is the arithmetic of a strategy that wins small most days and loses many times as much on a few.
```
