---
title: Taking profits
summary: Decide when to close a winning credit trade, understand what the 50%-of-max-profit convention buys and costs, and tell probability of profit apart from expected value.
---

```calc
const jan = chain(ACME, { dte: 58 });
const row = (k) => jan.rows.find((r) => r.strike === k).put;
const r95 = row(95), r90 = row(90);
const credit = Number((Math.round((r95.mid - r90.mid) / 0.05) * 0.05).toFixed(2));
const legs = [
  { kind: 'put', qty: -1, strike: 95, premium: r95.mid, dte: 58, iv: r95.iv },
  { kind: 'put', qty: 1, strike: 90, premium: r95.mid - credit, dte: 58, iv: r90.iv },
];
const maxP = credit * 100;
const maxL = (5 - credit) * 100;
const env = { r: RATE, q: ACME.q };
const at = (d) => payoff.pnlAt(legs, 100, d, env);
const decayDays = [15, 30, 44, 51];
const decayRow = (d) => `| ${d} | ${58 - d} | ${usd(at(d))} | ${pct(at(d) / maxP, 0)} |`;
const first50 = (() => { for (let d = 1; d < 58; d++) if (at(d) >= 0.5 * maxP) return d; return 58; })();
const remainGain = maxP - at(first50);
const remainLoss = maxL + at(first50);

// simulation: the same spread priced at a flat 30% volatility
const iv = 0.30, dte = 58, T = dte / 365;
const sp95 = bs.price({ S: 100, K: 95, T, r: RATE, q: ACME.q, sigma: iv, type: 'put' });
const sp90 = bs.price({ S: 100, K: 90, T, r: RATE, q: ACME.q, sigma: iv, type: 'put' });
const simLegs = [
  { kind: 'put', qty: -1, strike: 95, premium: sp95, dte, iv },
  { kind: 'put', qty: 1, strike: 90, premium: sp90, dte, iv },
];
const simCredit = (sp95 - sp90) * 100;
function run(realized, rule) {
  const paths = 6000;
  let wins = 0, total = 0, sumW = 0, sumL = 0, nW = 0, nL = 0, days = 0;
  for (let i = 0; i < paths; i++) {
    const path = sim.gbmPath({ S0: 100, mu: RATE - ACME.q, sigma: realized, T, steps: dte, seed: 300000 + i });
    let pnl = 0, d;
    for (d = 1; d <= dte; d++) {
      const v = d === dte ? payoff.pnlAtExpiry(simLegs, path[d]) : payoff.pnlAt(simLegs, path[d], d, env);
      pnl = v;
      if (d < dte && rule.target && v >= rule.target * simCredit) break;
      if (d < dte && rule.stop && v <= -rule.stop * simCredit) break;
    }
    days += Math.min(d, dte);
    total += pnl;
    if (pnl > 0) { wins++; sumW += pnl; nW++; } else { sumL += pnl; nL++; }
  }
  return { pop: wins / paths, ev: total / paths, avgW: sumW / nW, avgL: sumL / nL, days: days / paths };
}
const rules = [['Hold to expiration', {}], ['Close at 50% of max profit', { target: 0.5 }], ['50% target, stop at 2× the credit', { target: 0.5, stop: 2 }]];
const fair = rules.map(([name, rl]) => ({ name, ...run(0.30, rl) }));
const edge = rules.map(([name, rl]) => ({ name, ...run(0.25, rl) }));
const simRow = (x) => `| ${x.name} | ${pct(x.pop, 0)} | ${usd(x.avgW)} | ${usd(x.avgL)} | ${signedUsd(x.ev)} | ${num(x.days, 0)} |`;
const beWin = (x) => -x.avgL / (x.avgW - x.avgL);
```

A [[credit spread]] reaches its [[max profit]] only at expiration, and only if the underlying finishes beyond the short strike. Well before that, a large part of the credit has usually been earned, while most of the risk is still there. When to take that profit is the question this Lesson answers, and the honest answer depends on a distinction beginners almost always blur: the difference between how often a trade wins and how much it makes.

## How a credit spread earns its money

Go back to the ACME January 95/90 bull put spread from [the trading plan](#core-12-trading-plan), sold for {{ usd(credit) }}: max profit {{ usd(maxP) }}, max loss {{ usd(maxL) }}. Suppose ACME simply sits at $100.

| Days passed | Days left | P&L | Share of max profit |
|---|---|---|---|
{{ decayDays.map(decayRow).join('\n') }}
| 58 | 0 | {{ usd(payoff.pnlAtExpiry(legs, 100)) }} | 100% |

With ACME unchanged, the spread crosses half its max profit after {{ int(first50) }} days. At that point, holding to expiration can add at most another {{ usd(remainGain) }}, while the position can still lose {{ usd(remainLoss) }} from here if ACME falls through $90. That lopsided remainder is the argument for a [[profit target]].

```tool position-builder
{ title: 'ACME January 95/90 bull put spread', legs, range: [82, 112], daysPassed: 30 }
```

Drag "Days passed": the dashed line climbs toward the flat top of the payoff, but near the short strike it stays steep until the very end. The last weeks are when a small move in ACME swings the result most.

## The 50% convention

A common convention among short-premium traders is to buy back a credit trade once it has earned half its max profit, often combined with a time exit around 21 days to expiration. It is a convention, not a law, and it trades one thing for another.

**What it buys.**
- Less time exposed. The position is closed long before the final weeks, when [[gamma]] is highest and a single gap can turn a winner into a max loss.
- A higher [[probability of profit]]. Many trades that would have been winners at the 50% mark and then reversed into losers are closed as winners.
- Freed capital and attention, which can go into a new position.

**What it costs.**
- Smaller wins. Every winner is capped near half the credit, so the average win falls sharply.
- More trades for the same total profit, so more commissions and more [[bid-ask spread]] paid. A spread that costs a few cents to cross takes a larger bite from a $0.65 profit than from a $1.30 one.
- A higher win rate needed to break even, because the losers are not smaller.

Whether the trade is worth it depends on where your edge comes from, and that requires separating two numbers.

## Probability of profit is not expected value

[[Probability of profit]] (POP) is the chance a trade ends with any profit at all. Expected value (EV) is the average P&L per trade, wins and losses together. A rule can raise one without touching the other.

:::example Same spread, three exit rules, two worlds
Price the January 95/90 put spread at a flat 30% implied volatility, so the credit is {{ usd(simCredit / 100) }} a share ({{ usd(simCredit) }} per spread), and follow 6,000 random price paths for ACME over the 58 days, checking the position's value at each day's close.

**World 1: the price is fair.** ACME moves with 30% volatility, exactly what the options priced.

| Exit rule | POP | Average win | Average loss | EV per trade | Average days held |
|---|---|---|---|---|---|
{{ fair.map(simRow).join('\n') }}

Taking profits at 50% raised the probability of profit from {{ pct(fair[0].pop, 0) }} to {{ pct(fair[1].pop, 0) }}. The expected value stayed within a few dollars of zero under every rule, on a trade that risks {{ usd(5 * 100 - simCredit) }}. When the price is fair, an exit rule reshapes the outcomes but cannot create profit.

**World 2: the seller has an edge.** Same credit, but ACME actually moves with only 25% volatility, so the options were overpriced.

| Exit rule | POP | Average win | Average loss | EV per trade | Average days held |
|---|---|---|---|---|---|
{{ edge.map(simRow).join('\n') }}

All three rules now make money, but not equally. Holding to expiration earned {{ signedUsd(edge[0].ev) }} per trade over {{ num(edge[0].days, 0) }} days; the 50% target earned {{ signedUsd(edge[1].ev) }} per trade over about {{ num(edge[1].days, 0) }} days. In this test the target gave up most of the edge: even per day held, it earned {{ usd(edge[1].ev / edge[1].days) }} against {{ usd(edge[0].ev / edge[0].days) }} for holding. What it bought was a higher win rate and fewer days exposed to gaps near expiration.
:::

Two lessons come out of this. First, a high POP is not evidence of a good strategy; it is often the result of taking small wins and leaving large losses alone. With the 50% rule's average win of {{ usd(edge[1].avgW) }} and average loss of {{ usd(edge[1].avgL) }}, the trade needs to win {{ pct(beWin(edge[1]), 0) }} of the time just to break even; it won {{ pct(edge[1].pop, 0) }}, which is why its profit per trade was thin. Second, the edge lives in the entry price. Selling premium that is rich, or buying it when it is cheap, is where money is made; exit rules decide how much of that edge you keep and how bumpy the ride is.

:::warning The broker's "probability of profit" is a model number
Many platforms show a POP next to every order. It comes from the option prices themselves, treated as if they were a forecast. A short spread will always show a high POP because it profits in a wide range of outcomes; that number says nothing about whether the premium you collected is enough to pay for the losses.
:::

## Choosing a target

The convention is a reasonable default, and there are good reasons to move it:

- **Gap risk.** If the position carries an [[earnings|earnings announcement]] or other scheduled event before expiration, the final days are riskier than a smooth model suggests, and taking profit earlier is worth more.
- **Where the edge came from.** If you sold because [[implied volatility]] spiked and you expected it to fall back, most of the edge arrives when it falls, often early; a quick 50% profit may be most of what the trade had to offer.
- **Costs.** With wide markets or high commissions, frequent small exits become expensive.
- **Debit trades** need targets too. A [[long call]] bought for a move has no theta on its side; targets there are usually tied to the underlying reaching the price the thesis predicted, not to a fixed percentage.

Whatever you choose, write it in the plan before entry and record in the journal how often it fired. Over a few dozen trades, your own average win, average loss and win rate tell you whether the rule is paying for itself.

:::key
A profit target is a choice about the shape of your results, not a source of profit. Closing credit trades at 50% of max profit raises the probability of profit and shortens the time at risk, but it caps every win, so it needs a higher win rate and can give up much of a genuine edge. Judge any exit rule by expected value per trade (and per day of risk), never by win rate alone.
:::

```quiz
- q: >-
    With ACME unchanged, the January 95/90 spread reaches half its max profit after {{ int(first50) }} days. What does holding it to expiration offer from that point?
  choices:
    - >-
      At most another {{ usd(remainGain) }}, with up to {{ usd(remainLoss) }} still at risk
    - >-
      Another {{ usd(maxP) }}, since max profit is only reached at expiration
    - >-
      No further risk, because the spread is already profitable
  answer: 0
  explain: >-
    Max profit is {{ usd(maxP) }} in total, and {{ usd(at(first50)) }} has already been earned, so only {{ usd(remainGain) }} remains. The risk has not shrunk the same way: if ACME falls below $90, the position goes from its current profit to the {{ usd(maxL) }} max loss, a swing of {{ usd(remainLoss) }}. Being profitable now says nothing about the risk still open.
- q: >-
    In the fair-price world, the 50% rule raised the probability of profit from {{ pct(fair[0].pop, 0) }} to {{ pct(fair[1].pop, 0) }}. What happened to expected value?
  choices:
    - >-
      It rose in proportion to the win rate
    - >-
      It stayed close to zero
    - >-
      It became strongly negative
  answer: 1
  explain: >-
    When the options are fairly priced, no exit rule can make the average trade profitable; it can only move outcomes around. The rule turned some would-be large wins into small wins and left the losers in place, so win rate rose while expected value stayed near zero. A higher win rate does not imply a higher expected value.
- q: >-
    Under the 50% rule, winners average {{ usd(edge[1].avgW) }} and losers average {{ usd(edge[1].avgL) }}. What win rate is needed to break even?
  choices:
    - >-
      50%
    - >-
      {{ pct(beWin(edge[1]), 0) }}
    - >-
      {{ pct(edge[1].avgW / -edge[1].avgL, 0) }}
  answer: 1
  explain: >-
    Break-even requires \( p \times \text{win} = (1 - p) \times \text{loss} \), so \( p = \text{loss} / (\text{win} + \text{loss}) \) = {{ usd(-edge[1].avgL) }} ÷ {{ usd(edge[1].avgW - edge[1].avgL) }} = {{ pct(beWin(edge[1]), 0) }}. 50% would only be right if wins and losses were the same size. The ratio of win to loss, {{ pct(edge[1].avgW / -edge[1].avgL, 0) }}, is not a probability.
- q: >-
    Your platform shows a 78% probability of profit on a short put spread. What does that number tell you?
  choices:
    - >-
      That the spread is a good trade, since it wins more than three times in four
    - >-
      Roughly how often the market's prices imply the spread will finish profitable, and nothing about whether the credit pays for the losses
    - >-
      That the expected value of the trade is 78% of the credit
  answer: 1
  explain: >-
    A short spread profits across a wide range of prices, so its POP is high by construction. Whether the trade is good depends on expected value: the size of the average loss against the credit and the true odds. The POP is a probability, not a fraction of the credit.
```
