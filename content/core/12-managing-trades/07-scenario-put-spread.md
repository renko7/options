---
title: "Scenario: managing the January put spread"
summary: Size, hold through a scare, and take profit on an ACME credit spread, deciding each step from a written plan.
kind: scenario
---

```calc
const env = { r: RATE, q: ACME.q };
const jan = chain(ACME, { dte: 58 });
const row = (k) => jan.rows.find((r) => r.strike === k).put;
const r95 = row(95), r90 = row(90);
const credit = Number((Math.round((r95.mid - r90.mid) / 0.05) * 0.05).toFixed(2));
const legsN = (n) => [
  { kind: 'put', qty: -n, strike: 95, premium: r95.mid, dte: 58, iv: r95.iv },
  { kind: 'put', qty: n, strike: 90, premium: r95.mid - credit, dte: 58, iv: r90.iv },
];
const account = 40000, budget = 0.02 * account;
const maxLoss1 = (5 - credit) * 100;
const n = Math.floor(budget / maxLoss1);
const legs = legsN(n);
const big = 6;
const nakedPut = jan.rows.find((r) => r.strike === 95).put;
const s2 = payoff.pnlAt(legs, 96.5, 9, { ...env, ivShift: 0.08 });
const s2big = payoff.pnlAt(legsN(2 * n), 96.5, 9, { ...env, ivShift: 0.08 });
const s3 = payoff.pnlAt(legs, 103, 30, env);
const maxP = credit * 100 * n;
const target = 0.5 * maxP;
const gap = payoff.pnlAt(legs, 85, 56, env);
const s3late = payoff.pnlAt(legs, 103, 54, env);
const nakedStress = -payoff.pnlAt([{ kind: 'put', qty: -10, strike: 95, premium: nakedPut.bid, dte: 58, iv: nakedPut.iv }], 70, 1, { ...env, ivShift: 0.3 });
```

You have a {{ usd(account, 0) }} account and a written rule: no single trade may lose more than 2% of it. Today is {{ longDate(TODAY) }}, ACME is at $100, and you want to sell the ACME January 95/90 bull put spread, which you can get filled at {{ usd(credit) }}. ACME reports earnings after the close on {{ longDate('2027-01-12') }}, three days before the January expiration.

```tool position-builder
{ title: 'ACME January 95/90 bull put spreads', legs, range: [82, 112] }
```

```scenario
setup: >-
  Your plan: thesis "ACME holds above $95 through mid-January". Exits: take profit at half the max profit; close if ACME *closes* below $95; close before the January 12 earnings report in any case. Each spread has a max loss of {{ usd(maxLoss1) }} and a max profit of {{ usd(credit * 100) }}.
steps:
  - prompt: >-
      How many spreads do you sell?
    choices:
      - text: >-
          {{ int(n) }} spreads: the 2% budget of {{ usd(budget, 0) }} divided by {{ usd(maxLoss1) }}, rounded down
        grade: best
        feedback: >-
          Total max loss {{ usd(maxLoss1 * n) }}, inside the {{ usd(budget, 0) }} limit. This is the size the rest of the scenario follows.
      - text: >-
          {{ int(big) }} spreads, since the platform shows about a 75% probability of profit
        grade: poor
        feedback: >-
          The probability of profit says nothing about the size of a loss. {{ int(big) }} spreads can lose {{ usd(maxLoss1 * big) }}, {{ pct(maxLoss1 * big / account, 1) }} of the account, almost three times your limit, and a single gap through $90 delivers all of it.
      - text: >-
          1 spread, to be extra careful
        grade: acceptable
        feedback: >-
          Safe, and never wrong as a choice, but it uses less than half the risk your own rule allows for a trade you have planned carefully. If you consistently size below your rule, the rule should change, not the individual trade.
      - text: >-
          10 naked January 95 puts instead, since the margin is affordable and the credit is much larger
        grade: poor
        feedback: >-
          Sizing by margin is how short-premium accounts blow up. If ACME gapped to $70 the next day, ten naked 95 puts would lose about {{ usd(nakedStress, 0) }}, {{ pct(nakedStress / account, 0) }} of the account.
  - prompt: >-
      Nine days later the market sells off. ACME closes at $96.50 and implied volatility is up 8 points. Your {{ int(n) }} spreads show a loss of about {{ usd(-s2) }}. ACME has not closed below $95.
    choices:
      - text: >-
          Hold. The invalidation is a close below $95, and the loss is within plan
        grade: best
        feedback: >-
          Most of the paper loss is the volatility jump, not a broken thesis, and the worst case is still the {{ usd(maxLoss1 * n) }} you accepted at entry. The plan was written for exactly this moment.
      - text: >-
          Close now; a loss of {{ usd(-s2) }} is already almost half of the {{ usd(maxP) }} you could make
        grade: acceptable
        feedback: >-
          Closing is never a disaster, and the loss is small. But comparing the loss with the max profit is the wrong ruler: the plan's loss exit is the thesis, and the thesis is intact. Exiting on volatility noise turns many eventual winners into small losers and lowers the strategy's expected value.
      - text: >-
          Sell {{ int(n) }} more spreads, since the credit is better now
        grade: poor
        feedback: >-
          Doubling up takes the trade to {{ usd(maxLoss1 * 2 * n) }} of max loss, twice your limit, and it would show {{ usd(-s2big) }} of loss right now. If a new spread is a good trade on its own, it still has to fit inside the per-trade budget, and this one does not.
      - text: >-
          Roll down and out to the March 90/85 spreads for a small debit
        grade: poor
        feedback: >-
          A roll is a close plus a new trade. You would realize a loss on the January spreads and open a three-month position, all while the original thesis is still working. Rolling a position that has not hit its exit is a repair with nothing to repair.
  - prompt: >-
      On {{ longDate(expiryDate(30)) }}, 30 days in, ACME has recovered to $103 and volatility has settled. The spreads show a profit of about {{ usd(s3) }}, against a max profit of {{ usd(maxP) }}. Earnings are 25 days away.
    choices:
      - text: >-
          Close: the profit target of {{ usd(target) }} has been reached
        grade: best
        feedback: >-
          You keep {{ usd(s3) }} and free the capital. Holding would add at most {{ usd(maxP - s3) }} while leaving {{ usd(s3 + maxLoss1 * n) }} of swing exposed for four weeks, with the plan requiring an exit before earnings anyway.
      - text: >-
          Hold until January 11, the day before earnings, then close
        grade: acceptable
        feedback: >-
          If ACME stayed at $103, the spreads would be worth a profit of about {{ usd(s3late) }} by then, so the extra wait buys about {{ usd(s3late - s3) }} for three more weeks of gap risk. It respects the earnings rule but ignores the profit target you set; do it only if you change the plan before, not during, the trade.
      - text: >-
          Hold to expiration to collect the full {{ usd(maxP) }}
        grade: poor
        feedback: >-
          This breaks two rules of the plan and carries the spreads through the earnings report. A gap to $85 the morning after would turn a {{ usd(s3) }} profit into a loss of about {{ usd(-gap) }}.
      - text: >-
          Roll up to the January 100/95 for a fresh credit
        grade: poor
        feedback: >-
          That closes a winner and opens a new, more aggressive position (short strike just $3 below the stock) that runs straight through earnings. If you would not open the January 100/95 from scratch with earnings inside it, do not open it as a roll.
wrap: >-
  Every decision here was made by the plan, not in the moment: size from the max loss, exit on the thesis rather than on option-price noise, take the profit at the target, and keep the position away from an earnings gap it was not designed for. The trade made money, but the reason to follow the plan is the hundreds of trades after this one: across many trades, sizing and exits decide the outcome far more than any single entry.
```
