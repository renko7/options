---
title: Choosing strikes, widths and expirations
summary: Pick a vertical spread's strikes, width and expiration from your view, and see why reward-to-risk and probability always trade off.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const dec = chain(ACME, { dte: 30 });
const jan = chain(ACME, { dte: 58 });
const R = (ch, k) => ch.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
// market-implied probability of finishing above K, from the chain's own prices (includes skew)
const callPx = (K) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T), type: 'call' });
const pAbove = (K) => Math.exp(RATE * T) * (callPx(K - 0.01) - callPx(K + 0.01)) / 0.02;
const spread = (ch, a, b, dte) => {
  const ca = R(ch, a).call, cb = R(ch, b).call;
  const mid = ca.mid - cb.mid, fill = fillD(mid);
  const legs = [
    { kind: 'call', qty: 1, strike: a, premium: fill + cb.mid, dte, iv: ca.iv },
    { kind: 'call', qty: -1, strike: b, premium: cb.mid, dte, iv: cb.iv },
  ];
  const s = payoff.summary(legs);
  const g = payoff.positionGreeks(legs, 100, 0, env);
  let ev = 0; // expected payoff at the market's odds: integral of P(S_T > x) from a to b
  for (let x = a + 0.025; x < b; x += 0.05) ev += pAbove(x) * 0.05;
  return { a, b, mid, fill, legs, s, g, pMax: pAbove(b), pProfit: pAbove(s.breakevens[0]), ratio: s.maxProfit / -s.maxLoss, ev: (ev - fill) * 100 };
};
const rows = [[95, 100], [95, 105], [100, 105], [100, 110], [105, 110]].map(([a, b]) => spread(dec, a, b, 30));
const S = Object.fromEntries(rows.map((x) => [`${x.a}/${x.b}`, x]));
const decS = S['100/105'];
const janS = spread(jan, 100, 105, 58);
const p105 = pAbove(105);
```

A vertical spread has three settings: which strikes, how far apart, and which expiration. Each one changes what the trade pays, how likely it is to pay, and how it behaves along the way. There is no combination that is better on every count; the skill is matching the settings to your view.

## Reward-to-risk against probability

Here are five December bull call spreads, all filled a little worse than the mid. The probabilities are the market's: they are read from the chain's own prices, including the [[volatility skew]].

:::example Five December bull call spreads, ACME at $100
| Spread | Debit | Max profit | Max loss | Reward : risk | Chance of max profit | Chance of any profit | Expected P&L at the market's odds |
|---|---|---|---|---|---|---|---|
{{ rows.map((x) => `| ${x.a}/${x.b} | ${usd(x.fill)} | ${usd(x.s.maxProfit)} | ${usd(-x.s.maxLoss)} | ${num(x.ratio, 2)} : 1 | ${pct(x.pMax, 0)} | ${pct(x.pProfit, 0)} | ${signedUsd(x.ev)} |`).join('\n') }}

Read across the rows. The out-of-the-money 105/110 spread offers almost {{ num(S['105/110'].ratio, 1) }} to 1, but makes any money only {{ pct(S['105/110'].pProfit, 0) }} of the time. The in-the-money 95/100 spread makes money {{ pct(S['95/100'].pProfit, 0) }} of the time, but risks {{ usd(-S['95/100'].s.maxLoss) }} to make {{ usd(S['95/100'].s.maxProfit) }}.

The last column is the point. At the market's own odds, every spread's expected P&L is a few dollars below zero: the slippage from the mid, and nothing else.
:::

This is not a coincidence. A spread's price is, roughly, the width times the chance of finishing above the strikes, plus a share of the width for finishing between them. The market prices the trade so that high payoffs come with low probabilities. A trade that "wins 70% of the time" and a trade that "pays 4 to 1" are both fairly priced bets; neither is an edge.

So where does a spread make money? Only where your view differs from the market's. If you have a reason to believe ACME will be above $105 at December expiration with a probability well above the market's {{ pct(p105, 0) }}, the 100/105 spread, which pays {{ usd(decS.s.maxProfit) }} against {{ usd(-decS.s.maxLoss) }}, has a positive expected value *at your odds*. Choose the strikes that pay most where you think the market is most wrong.

:::warning Probability of profit is not a reason to trade
Platforms show "probability of profit" prominently, and high numbers feel safe. A spread with a high probability of profit simply has a small win and a large loss. Without a view that differs from the market's, a higher probability is bought with a worse payoff, one for one, minus costs.
:::

## Where to put the strikes

- **Short strike at your target.** A vertical pays its maximum at the short strike and beyond. If you think ACME goes to $105, a 100/105 call spread pays fully there; a 100/110 spread would leave {{ usd(5 * 100) }} of its width unused at $105.
- **Long strike at or near the money for a directional view.** Then the spread starts gaining as soon as ACME moves your way.
- **Both strikes out of the money for a cheap, low-probability bet** (105/110): a lottery ticket with a cap.
- **Both strikes in the money for a high-probability, low-payoff trade** (95/100): equivalent, by the previous Lesson, to selling the out-of-the-money 95/100 put spread.

## How wide

Width scales everything. Wider spreads cost more, risk more, and behave more like the outright long option; narrower ones behave more like an all-or-nothing bet on one price.

| Spread | Max loss | Delta | Theta | Vega |
|---|---|---|---|---|
| 100/105 | {{ usd(-S['100/105'].s.maxLoss) }} | {{ num(S['100/105'].g.delta, 1) }} shares | {{ signedUsd(S['100/105'].g.theta) }}/day | {{ signedUsd(S['100/105'].g.vega) }} |
| 100/110 | {{ usd(-S['100/110'].s.maxLoss) }} | {{ num(S['100/110'].g.delta, 1) }} shares | {{ signedUsd(S['100/110'].g.theta) }}/day | {{ signedUsd(S['100/110'].g.vega) }} |

Two practical points. First, narrow spreads have more legs per dollar at risk, so commissions and the bid-ask spread take a larger share of the profit. Second, choose the width from the loss you can accept on the trade: two 100/110 spreads risk {{ usd(-2 * S['100/110'].s.maxLoss) }} and three 100/105 spreads risk {{ usd(-3 * S['100/105'].s.maxLoss) }}: the same loss, but different bets on where ACME ends up. See [Managing trades](#core-12) for sizing.

## Which expiration

Time matters twice: the move must happen before expiration, and the spread reaches full value only near expiration.

:::example December against January, same strikes
The December 100/105 call spread costs {{ usd(decS.fill) }}; the January 100/105 spread, 58 days out, costs {{ usd(janS.fill) }}. Suppose ACME is at $105 on December expiration day.

- The December spread is worth the full $5: a profit of {{ usd(payoff.pnlAt(decS.legs, 105, 30, env)) }}.
- The January spread still has 28 days to go, and both of its calls carry time value. It shows {{ usd(payoff.pnlAt(janS.legs, 105, 30, env)) }}.

If ACME had instead dipped to $97 by mid-December and recovered to $105 by mid-January, only the January spread would have paid.
:::

The longer spread gives your view more time and moves less with every daily wiggle (lower gamma), but it pays less for being right early. Match the expiration to *when* you expect the move: a catalyst date, a seasonal pattern, or simply how long your thesis needs.

:::practice How traders set up credit spreads
For bull put and bear call spreads sold as income, a common recipe is: short strike around 0.20 to 0.30 delta, 30 to 45 days to expiration, width chosen from the maximum loss the account can take, and a plan to buy the spread back at about half of the credit rather than wait for the last few cents. The recipe is a habit, not an edge; it works when realized volatility comes in below implied, and it fails in fast markets. Management rules are covered in [Managing trades](#core-12).
:::

```tool position-builder
{ title: 'December 100/110 bull call spread', legs: S['100/110'].legs, range: [88, 120] }
```

:::key
Strikes, width and expiration set a spread's payoff, probability and Greeks, and the market prices them so that reward-to-risk and probability trade off one for one. Put the short strike at your target, size the width from the loss you accept, and choose the expiration from when you expect the move. A spread has an edge only where your view differs from the market's.
:::

```quiz
- q: >-
    The December 105/110 call spread pays about {{ num(S['105/110'].ratio, 1) }} to 1; the 95/100 pays about {{ num(S['95/100'].ratio, 2) }} to 1. Which is the better trade?
  choices:
    - >-
      The 105/110, because its reward-to-risk is higher
    - >-
      The 95/100, because it wins more often
    - >-
      Neither, on those numbers alone: both are priced so that their expected P&L at the market's odds is close to zero
  answer: 2
  explain: >-
    The higher payoff of the 105/110 comes with a {{ pct(S['105/110'].pProfit, 0) }} chance of profit; the 95/100 wins {{ pct(S['95/100'].pProfit, 0) }} of the time but risks far more than it makes. At the market's probabilities both have an expected P&L of a few dollars below zero. Which is better depends on your own view of where ACME will be.
- q: >-
    You expect ACME to reach about $105 by December expiration. Which spread puts its maximum payoff at your target at the lowest cost?
  choices:
    - >-
      The 100/105 call spread for {{ usd(S['100/105'].fill) }}
    - >-
      The 100/110 call spread for {{ usd(S['100/110'].fill) }}
    - >-
      The 105/110 call spread for {{ usd(S['105/110'].fill) }}
  answer: 0
  explain: >-
    A vertical pays its maximum at and beyond the short strike, so the 100/105 is fully paid at $105. The 100/110 costs more and would be worth only $5 of its $10 width at $105. The 105/110 is worth nothing at exactly $105.
- q: >-
    ACME is at $105 on December expiration day. Why does the January 100/105 spread show less profit than the December one?
  choices:
    - >-
      Its calls still have time value, and the short 105 call's time value offsets the long call's gain
    - >-
      January options have lower implied volatility
    - >-
      Its max profit is lower
  answer: 0
  explain: >-
    Both spreads have the same $5 width and nearly the same max profit at their own expiration. On December expiration day the January spread still has 28 days left; the 105 call it is short is at the money and full of time value, so the spread is worth well under $5. In this chain January implied volatility is slightly higher, not lower.
- q: >-
    A platform shows that a bull put spread has an 80% probability of profit. What does that tell you?
  choices:
    - >-
      That it is a good trade
    - >-
      That its maximum loss is probably several times its maximum profit
    - >-
      That it has positive expected value
  answer: 1
  explain: >-
    A high probability of profit is bought with a small credit and a large maximum loss; the market's pricing makes the two offset. It says nothing about expected value, which depends on whether your view differs from the market's, and on costs.
```
