---
title: The trading plan and the journal
summary: Write a plan before every trade that names the thesis, structure, entry, exits, size and what would prove you wrong, and keep a journal that tells you whether your decisions are any good.
---

```calc
const T = 58 / 365;
const jan = chain(ACME, { dte: 58 });
const r95 = jan.rows.find((r) => r.strike === 95).put;
const r90 = jan.rows.find((r) => r.strike === 90).put;
const credit = Number((Math.round((r95.mid - r90.mid) / 0.05) * 0.05).toFixed(2));
const natural = Number((r95.bid - r90.ask).toFixed(2));
const width = 5;
const maxLoss1 = (width - credit) * 100;
const maxProfit1 = credit * 100;
const account = 40000;
const riskPct = 0.02;
const budget = account * riskPct;
const n = Math.floor(budget / maxLoss1);
const legs1 = [
  { kind: 'put', qty: -1, strike: 95, premium: r95.mid, dte: 58, iv: r95.iv },
  { kind: 'put', qty: 1, strike: 90, premium: r95.mid - credit, dte: 58, iv: r90.iv },
];
const legsN = legs1.map((l) => ({ ...l, qty: l.qty * n }));
const be = payoff.breakevens(legs1)[0];
const target = 0.5 * maxProfit1 * n;
const upDay = 16;
const up = payoff.pnlAt(legsN, 104, upDay, { r: RATE, q: ACME.q });
const downDay = 9;
const down = payoff.pnlAt(legsN, 94.5, downDay, { r: RATE, q: ACME.q });
const earningsDate = longDate('2027-01-12');
const expiry = longDate(expiryDate(58));
// journal review
const wins = 15, losses = 5, avgWin = 62, avgLoss = 210;
const expectancy = (wins * avgWin - losses * avgLoss) / (wins + losses);
const winRate = wins / (wins + losses);
```

A stock trade can survive vague thinking. You buy, the stock drifts, you sell when it feels right, and the cost of the vagueness is usually small. An option trade cannot. It has an expiration date, it loses or gains value from time and volatility as well as price, and some structures can lose several times what they collect. The decisions that matter most (how big, when to take the profit, when to admit the trade is wrong) have to be made before you enter, while you are calm, because the market will ask for them at the moment you least want to answer.

That is what a [[trading plan]] is for. This Module is about managing positions once they exist: sizing them, taking profits, cutting losses, rolling, adjusting, and handling [[earnings|earnings announcement]]. All of it starts here.

## The six parts of a plan

A trading plan for one position is short. It fits on an index card, and it answers six questions.

1. **Thesis.** What do you expect, over what period, and why? "ACME stays above $95 through mid-January" is a thesis. "ACME looks good" is not.
2. **Structure.** Which position expresses that thesis best, and why this one rather than the alternatives? A view that ACME will not fall much is a different trade from a view that it will rise a lot.
3. **Entry.** The price you will pay or collect, as a [[limit order]], and what you will do if it does not fill.
4. **Exits.** Where you take the profit, where you take the loss, and a time exit. All three, in numbers.
5. **Size.** How many contracts, derived from the [[max loss]] you accept, not from how confident you feel. The next Lesson covers how.
6. **What would prove you wrong.** The observation that means the thesis is dead, even if the position's loss is still small.

The sixth part is the one beginners skip, and it is the most useful. A loss limit tells you when the trade hurts; an invalidation tells you when the trade no longer makes sense. They are often different prices, and the invalidation usually comes first.

:::example A plan for an ACME bull put spread
ACME is at $100. Today is {{ longDate(TODAY) }}. You think ACME will hold above $95 through the January expiration ({{ expiry }}, 58 days away), because $95 has held through two sell-offs and implied volatility is a little above what the stock has been realizing.

**Structure.** A [[bull put spread]]: sell the January 95 put, buy the January 90 put. You collect a credit, you profit if ACME stays above $95, and the long 90 put caps the loss. The bid on the 95 put is {{ usd(r95.bid) }} and the ask on the 90 put is {{ usd(r90.ask) }}, so the natural price of the spread is {{ usd(natural) }}. You enter a limit order at the mid and get filled at **{{ usd(credit) }}**.

**Risk per spread.** The [[spread width]] is $5, so the most you can lose is $5.00 − {{ usd(credit) }} = {{ usd(width - credit) }} a share, **{{ usd(maxLoss1) }}** per spread. The most you can make is {{ usd(maxProfit1) }}. At expiration you break even at {{ usd(be) }}.

**Size.** The account holds {{ usd(account, 0) }} and the plan allows {{ pct(riskPct, 0) }} of it, {{ usd(budget, 0) }}, at risk on one trade. {{ usd(budget, 0) }} ÷ {{ usd(maxLoss1) }} = {{ num(budget / maxLoss1) }}, so you sell **{{ int(n) }} spreads**, for a total maximum loss of {{ usd(maxLoss1 * n) }}.

**Exits.**
- Profit: close when the spreads can be bought back for half the credit, a profit of about {{ usd(target) }}.
- Invalidation: close if ACME *closes* below $95. That is the level the thesis depends on.
- Time and events: ACME reports earnings after the close on {{ earningsDate }}, three days before expiration. Close by then whatever the P&L, because this trade was not designed to carry an earnings gap.

**What would prove you wrong.** A daily close below $95.
:::

Over the following weeks the plan does its job in either direction. If ACME has risen to $104 after {{ int(upDay) }} days, the position shows a profit of about {{ usd(up) }}. That is short of the target, and the plan says to keep waiting, which removes the temptation to grab a small gain because it feels good. If instead ACME closes at $94.50 after {{ int(downDay) }} days, the position is down only about {{ usd(-down) }}, far from the {{ usd(maxLoss1 * n) }} maximum, but the thesis has failed. The plan says close. Without a plan, a loss that small feels like a reason to wait.

```tool position-builder
{ title: 'Two ACME January 95/90 bull put spreads', legs: legsN, range: [80, 115], daysPassed: 9 }
```

Drag "Days passed" and the price to see how the position behaves between today and expiration. Notice how little the dashed line moves for a few dollars of ACME in the first weeks: before expiration, the profit and loss are much smaller than the expiration diagram suggests, which is why exit rules are written in terms of the position's value and the stock's price, not only the diagram.

## What makes a plan good

A plan is good if every exit can be checked by someone else. "Close if it looks weak" fails that test; "close if ACME closes below $95" passes. Write prices and dates.

A plan is good if the structure follows from the thesis. If the thesis is "ACME will not fall much," a short put spread, a short put or a [[covered call]] can express it, with different risks; a [[long call]] cannot. If you cannot say why you chose this structure over the obvious alternatives, the plan is not finished.

A plan is good if the size survives being wrong. You will be wrong often. The size has to make each loss boring.

:::practice How professionals use plans
Desk traders rarely write essays, but they always know their exits before they trade, and their risk managers know them too. The useful habit is the same at any scale: write the plan in the journal *before* you send the order, with a timestamp, so you cannot rewrite it after the fact.
:::

## The journal: closing the loop

A plan is a prediction. A journal records whether the prediction, and your handling of it, was any good. For each trade, record:

| At entry | At exit | Afterwards |
|---|---|---|
| Date, underlying, structure, strikes, expiration | Date, exit price, P&L in dollars | Did you follow the plan? |
| Fill price vs. the mid and the natural | Which exit fired: target, stop, invalidation, time | Was the thesis right, separately from the P&L? |
| The six-part plan | Underlying price, implied volatility | What would you do differently? |
| Implied volatility, underlying price, days to expiration | Slippage on the exit | |

The most important column is the last. Separate three different things that all show up as "a loss": a bad plan (the thesis or structure was poor), bad execution (you broke your own plan or paid too much to get in and out), and plain variance (a good plan that lost this time). Only the first two are mistakes. Changing your method after a loss that was pure variance is how traders talk themselves out of good strategies.

## Reviewing a batch of trades

Single trades tell you little. Review in batches, every 20 or 30 trades or every quarter, and look at the numbers that matter:

- win rate and average win;
- average loss, and the largest loss;
- expectancy: the average P&L per trade;
- how often you followed the plan, and the P&L of trades where you did not.

:::example A review that changes the picture
Your last 20 ACME credit spreads produced {{ int(wins) }} winners averaging {{ usd(avgWin, 0) }} and {{ int(losses) }} losers averaging {{ usd(-avgLoss, 0) }}. The win rate is {{ pct(winRate, 0) }}, which feels excellent.

The expectancy is the total P&L divided by the number of trades: ({{ int(wins) }} × {{ usd(avgWin, 0) }} − {{ int(losses) }} × {{ usd(avgLoss, 0) }}) ÷ 20 = **{{ usd(expectancy) }} per trade**.

A strategy that wins three times out of four is losing money. The review then shows where: if the five losers include trades where you ignored the invalidation and waited for a recovery, the fix is discipline, not a new strategy.
:::

A high win rate and a positive expectancy are different things. [Taking profits](#core-12-profit-targets) makes that distinction exact.

:::key
Before you trade, write down the thesis, the structure, the entry, the exits (profit, loss, invalidation and time), the size, and what would prove you wrong, in numbers someone else could check. After you trade, record what happened and judge the decision separately from the outcome. Review batches of trades by expectancy, not by win rate.
:::

```quiz
- q: >-
    In the plan above, ACME closes at $94.50 after nine days and the two spreads show a loss of about {{ usd(-down) }}, far below the {{ usd(maxLoss1 * n) }} maximum. What does the plan say to do?
  choices:
    - >-
      Hold: the loss is small and ACME can recover before January
    - >-
      Close the spreads: the thesis depended on ACME holding $95
    - >-
      Sell two more spreads to lower the average entry price
  answer: 1
  explain: >-
    The plan names a daily close below $95 as the invalidation. The thesis has failed even though the loss is still small, and a small loss is the cheapest moment to exit. "It can recover" is true of every losing trade and is not part of the plan. Adding spreads increases the size of a position whose reason for existing is gone.
- q: >-
    With a {{ usd(account, 0) }} account, a {{ pct(riskPct, 0) }} risk limit per trade, and a maximum loss of {{ usd(maxLoss1) }} per spread, how many spreads does the plan allow?
  choices:
    - >-
      {{ int(n) }}
    - >-
      {{ int(n + 1) }}
    - >-
      {{ int(Math.floor(budget / maxProfit1)) }}
  answer: 0
  explain: >-
    The budget is {{ usd(budget, 0) }}. Dividing by the maximum loss per spread gives {{ num(budget / maxLoss1) }}, and you round down, so {{ int(n) }}. Rounding up to {{ int(n + 1) }} breaks the limit. Dividing by the credit ({{ usd(maxProfit1) }}) sizes by what you can make, which says nothing about what you can lose.
- q: >-
    Your journal shows {{ int(wins) }} winners averaging {{ usd(avgWin, 0) }} and {{ int(losses) }} losers averaging {{ usd(-avgLoss, 0) }}. What is the expectancy per trade?
  choices:
    - >-
      {{ usd((avgWin - avgLoss) / 2) }}
    - >-
      {{ usd(expectancy) }}
    - >-
      {{ usd(avgWin * winRate) }}
  answer: 1
  explain: >-
    Total P&L is {{ int(wins) }} × {{ usd(avgWin, 0) }} − {{ int(losses) }} × {{ usd(avgLoss, 0) }} = {{ usd(wins * avgWin - losses * avgLoss, 0) }} over 20 trades, or {{ usd(expectancy) }} per trade. Averaging the average win and the average loss ignores that winners were three times as frequent. Multiplying the average win by the win rate forgets the losers altogether.
- q: >-
    A trade followed its plan exactly and lost money because ACME gapped down on unexpected news. How should the journal classify it?
  choices:
    - >-
      A planning mistake: change the strategy
    - >-
      An execution mistake: the exits should have been tighter
    - >-
      Variance: a sound decision with a bad outcome, unless the review finds the plan ignored a known risk
  answer: 2
  explain: >-
    A plan that was followed and sized to survive a loss can still lose. Treating every loss as a reason to change the method teaches you to abandon strategies with positive expectancy. The exception is a risk you could have known, such as a scheduled earnings date the plan ignored; that is a planning mistake.
```
