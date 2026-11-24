---
title: Position sizing
summary: Size every trade from the loss you can accept, by maximum loss for defined-risk positions and by a stress loss for undefined-risk short premium, never by margin.
---

```calc
const jan = chain(ACME, { dte: 58 });
const row = (k) => jan.rows.find((r) => r.strike === k);
const account = 40000;
const riskPct = 0.02;
const budget = account * riskPct;
// long call
const callPrem = row(105).call.ask;
const callRisk = callPrem * 100;
const nCall = Math.floor(budget / callRisk);
// put spread (same fill as the plan Lesson)
const credit = Number((Math.round((row(95).put.mid - row(90).put.mid) / 0.05) * 0.05).toFixed(2));
const spreadRisk = (5 - credit) * 100;
const nSpread = Math.floor(budget / spreadRisk);
// naked put
const p90 = row(90).put;
const putPrem = p90.bid;
const otm = 100 - 90;
const marginA = (putPrem + 0.20 * 100 - otm) * 100;
const marginB = (putPrem + 0.10 * 90) * 100;
const margin = Math.max(marginA, marginB);
const nakedLeg = [{ kind: 'put', qty: -1, strike: 90, premium: putPrem, dte: 58, iv: p90.iv }];
const stress = (gap, ivUp) => -payoff.pnlAt(nakedLeg, 100 * (1 - gap), 1, { r: RATE, q: ACME.q, ivShift: ivUp });
const s10 = stress(0.10, 0.10), s20 = stress(0.20, 0.20), s30 = stress(0.30, 0.30), s50 = stress(0.50, 0.40);
const marginBudget = account / 2;
const nByMargin = Math.floor(marginBudget / margin);
const stressLimitPct = 0.05;
const stressBudget = account * stressLimitPct;
const nByStress = Math.max(0, Math.floor(stressBudget / s30));
const p90at70 = bs.price({ S: 70, K: 90, T: 57 / 365, r: RATE, q: ACME.q, sigma: p90.iv + 0.30, type: 'put' });
const marginNew70 = Math.max((p90at70 + 0.20 * 70) * 100, (p90at70 + 0.10 * 90) * 100);
```

Most accounts that blow up do not blow up because the trader picked the wrong direction. They blow up because one trade, or several trades that turned out to be the same trade, was too big. [[Position sizing]] is the part of the [[trading plan]] that decides whether being wrong is an inconvenience or a disaster, and it is the part you control completely.

## Size from the loss, not from the price

A share of ACME costs $100 and an option on it might cost $3, so "how many contracts can I afford?" is the wrong question: you can afford a lot of them. The right question is "what do I lose if this goes badly, and is that a small enough fraction of the account?"

The usual method has two steps:

1. Set a **risk budget per trade** as a percentage of the account. Many experienced traders use 1% to 2% for a single position; few go above 5%.
2. Divide the budget by the [[max loss]] of one contract (or one spread) and round **down**.

For a [[defined risk]] position the max loss is known before you trade, so this is arithmetic.

:::example Same budget, two structures
The account holds {{ usd(account, 0) }} and the risk budget is {{ pct(riskPct, 0) }}, {{ usd(budget, 0) }} per trade.

| Structure | Max loss per contract | Contracts | Total max loss |
|---|---|---|---|
| Long January 105 call at {{ usd(callPrem) }} | {{ usd(callRisk) }} | {{ int(nCall) }} | {{ usd(callRisk * nCall) }} |
| January 95/90 bull put spread at {{ usd(credit) }} credit | {{ usd(spreadRisk) }} | {{ int(nSpread) }} | {{ usd(spreadRisk * nSpread) }} |

The long call's max loss is the premium. The spread's is the [[spread width]] minus the credit. In both cases the worst outcome is a known number below the budget.
:::

Two refinements matter as soon as you hold more than one position.

**Total open risk.** Ten positions that each risk 2% put 20% of the account at risk at once. Set a second limit for the sum of max losses across everything open.

**Correlation.** Five bullish put spreads on five technology stocks are not five independent trades. In a sell-off they lose together. Count positions that depend on the same move as one position when you check the limits.

## Undefined risk: margin is not your risk

A [[naked|naked option]] short put or a short [[strangle]] has [[undefined risk]]. There is no max loss to divide by, and beginners reach for the next available number: the margin the broker requires. That is a mistake, and an expensive one.

:::rule Margin on a short equity option (as of 2026)
Under FINRA Rule 4210 and the exchanges' rules, the minimum initial and maintenance margin for an uncovered equity option in a [[margin account]] is the premium received plus 20% of the underlying's value, minus any amount by which the option is out of the money, but not less than the premium plus 10% of the underlying's value (for a call) or 10% of the strike (for a put). Brokers may require more. Details are in [Accounts and orders](#core-08).
:::

:::example Margin versus stress loss on a naked ACME put
You sell one January 90 put at the bid, {{ usd(putPrem) }}. ACME is at $100, so the put is $10 out of the money.

**Margin.** {{ usd(putPrem) }} + 20% × $100 − $10 = {{ usd(marginA / 100) }} a share, which is above the 10% minimum of {{ usd(marginB / 100) }}. The requirement is **{{ usd(margin) }}** per put.

**Stress loss.** What would the position lose the day after a gap down? A stock that gaps also sees implied volatility jump, so the table raises the put's implied volatility with the size of the gap.

| ACME the next day | Loss per put |
|---|---|
| $90 (−10%) | {{ usd(s10) }} |
| $80 (−20%) | {{ usd(s20) }} |
| $70 (−30%) | {{ usd(s30) }} |
| $50 (−50%) | {{ usd(s50) }} |

A −30% gap costs {{ usd(s30) }}, more than the {{ usd(margin) }} margin. The margin is the broker's estimate of a normal bad day, not the loss you can take.

**Sizing by margin.** A trader who decides to "use half the account" puts {{ usd(marginBudget, 0) }} of margin to work: {{ usd(marginBudget, 0) }} ÷ {{ usd(margin) }} = {{ int(nByMargin) }} puts, collecting {{ usd(putPrem * 100 * nByMargin) }}. After a −30% gap the loss is {{ usd(s30 * nByMargin, 0) }}, or **{{ pct(s30 * nByMargin / account, 0) }} of the account**.

**Sizing by stress.** A trader who allows a {{ pct(stressLimitPct, 0) }} loss ({{ usd(stressBudget, 0) }}) in a −30% gap can sell {{ usd(stressBudget, 0) }} ÷ {{ usd(s30) }} → **{{ int(nByStress) }}** put{{ nByStress === 1 ? '' : 's' }}.
:::

The gap between {{ int(nByMargin) }} and {{ int(nByStress) }} is the whole story of how short-premium accounts fail. Margin also gets worse exactly when you can least afford it: at $70, with the put's implied volatility up, the requirement on that one put rises to about {{ usd(marginNew70) }}, so the trader sized by margin gets a margin call in the middle of the crash and is forced to buy back at the worst prices.

```tool position-builder
{ title: 'One naked ACME January 90 put', legs: nakedLeg, range: [50, 115], ivShift: 0.3 }
```

Move the price slider down to $70 and below, and drag the implied volatility shift, to see how quickly the loss outruns the premium you collected.

## Choosing the stress move

The stress move should be a move the underlying can actually make, not one you think is likely.

- **Single stocks** gap 20% to 40% on earnings misses, fraud, failed drug trials and takeovers that fall apart. A −30% overnight move is a reasonable floor for a stress test on one name; some traders use −50%.
- **Broad indexes** move less, but not little: the S&P 500 fell about 20% on October 19, 1987.
- **Upside** matters for short calls. A takeover can add 30% to 50% overnight.

Then apply the same percentage rule you use for defined-risk trades, usually with a somewhat higher limit, since the stress move is rarer than an ordinary max loss: 3% to 5% of the account per position is a common range. If the answer is "less than one contract", the honest conclusion is that the account is too small for that naked position, and a spread with a defined max loss is the trade that fits. [Neutral and volatility strategies](#core-11) builds those spreads.

:::warning Portfolio margin makes this more important, not less
[[Portfolio margin]] sets requirements from a stress test of the whole account, and for hedged books it can be far lower than [[Reg T margin]]. Lower margin means more contracts are possible, so the gap between what you can trade and what you should trade gets wider. The stress-loss limit has to come from you.
:::

:::key
Size every trade so that a bad outcome costs a small, preset fraction of the account: divide the risk budget by the max loss and round down. Undefined-risk short premium has no max loss, so size it by the loss in a severe but possible move, not by margin, which measures the broker's comfort and grows exactly when the stock gaps against you.
:::

```quiz
- q: >-
    Your account is {{ usd(account, 0) }} and you risk {{ pct(riskPct, 0) }} per trade. How many ACME January 105 calls at {{ usd(callPrem) }} can you buy?
  choices:
    - >-
      {{ int(nCall) }}
    - >-
      {{ int(Math.floor(account / (callPrem * 100))) }}
    - >-
      {{ int(Math.floor(budget / 100)) }}
  answer: 0
  explain: >-
    Each call can lose its whole premium, {{ usd(callRisk) }}. The budget of {{ usd(budget, 0) }} divided by {{ usd(callRisk) }}, rounded down, is {{ int(nCall) }}. The second answer is how many calls the whole account could buy, which is sizing by affordability. The third divides by $100 per contract, which has nothing to do with the loss.
- q: >-
    Why is broker margin a poor basis for sizing naked short puts?
  choices:
    - >-
      Because margin is always larger than the possible loss, so you would trade too little
    - >-
      Because margin reflects a normal adverse move, while the loss in a gap can be several times larger, and the requirement rises as the stock falls
    - >-
      Because margin only applies to short calls
  answer: 1
  explain: >-
    On the January 90 put, margin was {{ usd(margin) }} but a −30% gap costs about {{ usd(s30) }}. Sizing to margin let {{ int(nByMargin) }} puts lose {{ pct(s30 * nByMargin / account, 0) }} of the account. Margin is usually smaller than the stress loss, not larger, and it applies to naked puts as well as calls.
- q: >-
    You hold five bullish put spreads, each risking 2% of the account, on five semiconductor companies. What is the most realistic description of your risk?
  choices:
    - >-
      Five independent 2% risks: the chance of losing all five at once is tiny
    - >-
      Close to one 10% bet on the semiconductor sector
    - >-
      2%, because spreads are defined risk
  answer: 1
  explain: >-
    Stocks in one sector fall together in a sector sell-off, so the five spreads behave like one position of five times the size. Treating them as independent understates the risk, and "defined risk" only means each loss is capped, not that the caps cannot all be hit on the same day.
- q: >-
    Using a −30% stress move and a 5% stress limit, your account can carry less than one naked put on a stock. What does that tell you?
  choices:
    - >-
      Sell one put anyway, since you cannot trade a fraction
    - >-
      Use a smaller stress move so the numbers work
    - >-
      The naked put is too big for this account; a defined-risk spread fits instead
  answer: 2
  explain: >-
    Rounding up to one contract, or shrinking the stress move until the trade fits, both mean accepting a loss larger than your own limit. The stress move should describe what the stock can do, not what makes the trade possible. A put spread caps the loss at a number the account can carry.
```
