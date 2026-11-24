---
title: The strangle
summary: Use out-of-the-money calls and puts to buy or sell volatility more cheaply than a straddle, and compare what you give up.
---

```calc
const env = { r: RATE, q: ACME.q };
const T = 30 / 365;
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
const cpx = (K) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T), type: 'call' });
const pAbove = (K) => Math.exp(RATE * T) * (cpx(K - 0.01) - cpx(K + 0.01)) / 0.02;
const mk = (kp, kc, sign) => {
  const p = R(kp).put, c = R(kc).call;
  const mid = p.mid + c.mid;
  const fill = sign > 0 ? fillD(mid) : fillC(mid);
  const legs = [
    { kind: 'put', qty: sign, strike: kp, premium: p.mid, dte: 30, iv: p.iv },
    { kind: 'call', qty: sign, strike: kc, premium: fill - p.mid, dte: 30, iv: c.iv },
  ];
  const s = payoff.summary(legs);
  const g = payoff.positionGreeks(legs, 100, 0, env);
  const be = s.breakevens;
  const pIn = pAbove(be[0]) - pAbove(be[be.length - 1]);
  return { kp, kc, p, c, mid, fill, legs, s, g, pProfit: sign > 0 ? 1 - pIn : pIn };
};
const lstr = mk(100, 100, 1);
const lsg = mk(95, 105, 1);
const ssg = mk(95, 105, -1);
const ssg90 = mk(90, 110, -1);
const sstr = mk(100, 100, -1);
```

A [[straddle]] buys or sells the at-the-money options, the most expensive ones on the chain. A [[strangle]] uses out-of-the-money options instead: a put below the stock price and a call above it, same expiration. It is cheaper to buy, brings in less when sold, and needs a bigger move to matter.

## The long strangle

:::example Buying the December 95/105 strangle
ACME is at $100. Buy the December 95 put (mid {{ usd(lsg.p.mid, 3) }}) and the December 105 call (mid {{ usd(lsg.c.mid, 3) }}) together. You are filled at **{{ usd(lsg.fill) }}**, {{ usd(lsg.fill * 100) }} in total.

At expiration:

- **Anywhere from $95 to $105**: both options expire worthless. You lose {{ usd(-lsg.s.maxLoss) }}, the max loss.
- **Above $105**: the call pays. Break-even {{ usd(lsg.s.breakevens[1]) }}; at $115 you make {{ usd(payoff.pnlAtExpiry(lsg.legs, 115)) }}.
- **Below $95**: the put pays. Break-even {{ usd(lsg.s.breakevens[0]) }}; at $85 you make {{ usd(payoff.pnlAtExpiry(lsg.legs, 85)) }}.
:::

## Straddle or strangle?

The two structures make the same kind of bet. Here they are side by side, both long and filled a little worse than the mid:

| | Long 100 straddle | Long 95/105 strangle |
|---|---|---|
| Cost | {{ usd(lstr.fill * 100) }} | {{ usd(lsg.fill * 100) }} |
| Max loss | {{ usd(-lstr.s.maxLoss) }}, at exactly $100 | {{ usd(-lsg.s.maxLoss) }}, anywhere from $95 to $105 |
| Break-evens | {{ usd(lstr.s.breakevens[0]) }} / {{ usd(lstr.s.breakevens[1]) }} | {{ usd(lsg.s.breakevens[0]) }} / {{ usd(lsg.s.breakevens[1]) }} |
| Market-implied chance of profit | {{ pct(lstr.pProfit, 0) }} | {{ pct(lsg.pProfit, 0) }} |
| P&L if ACME ends at $112 | {{ usd(payoff.pnlAtExpiry(lstr.legs, 112)) }} | {{ usd(payoff.pnlAtExpiry(lsg.legs, 112)) }} |
| Gamma | {{ signed(lstr.g.gamma, 2) }} | {{ signed(lsg.g.gamma, 2) }} |
| Theta | {{ signedUsd(lstr.g.theta) }}/day | {{ signedUsd(lsg.g.theta) }}/day |
| Vega | {{ signedUsd(lstr.g.vega) }} | {{ signedUsd(lsg.g.vega) }} |

The strangle costs less than half as much, so it loses less when nothing happens. But it needs a larger move to pay at all, it wins less often, and on a moderate move such as $112 the straddle makes more. Per dollar of premium the strangle has more gamma and vega, and more theta too: it loses {{ pct(-lsg.g.theta / (lsg.fill * 100), 1) }} of its price a day to time decay at the start, against {{ pct(-lstr.g.theta / (lstr.fill * 100), 1) }} for the straddle.

As a rule: a straddle fits a view that the stock will move a fair amount; a strangle fits a view that a large move is possible and you want to pay less for being wrong. Strangle buyers are buying a cheaper lottery ticket on a big move.

## The short strangle

The short strangle is one of the most widely traded premium-selling structures. It gives the stock room to move before losing anything.

:::example Selling the December 95/105 strangle
Sell the December 95 put and the December 105 call, filled at a credit of **{{ usd(ssg.fill) }}** ({{ usd(ssg.fill * 100) }}).

- **Max profit**: {{ usd(ssg.s.maxProfit) }}, anywhere between $95 and $105.
- **Break-evens**: {{ usd(ssg.s.breakevens[0]) }} and {{ usd(ssg.s.breakevens[1]) }}. The market-implied chance of finishing between them is about {{ pct(ssg.pProfit, 0) }}.
- **Max loss**: unlimited above, and {{ usd(-payoff.pnlAtExpiry(ssg.legs, 0)) }} at zero. A move to $85 costs {{ usd(-payoff.pnlAtExpiry(ssg.legs, 85)) }}; to $120, {{ usd(-payoff.pnlAtExpiry(ssg.legs, 120)) }}.

Position Greeks at entry: delta {{ signed(ssg.g.delta, 1) }} shares, gamma {{ signed(ssg.g.gamma, 2) }} shares per $1, theta {{ signedUsd(ssg.g.theta) }} a day, vega {{ signedUsd(ssg.g.vega) }} per vol point.
:::

Compared with the [short straddle](#core-11-straddle), which brings in {{ usd(sstr.fill * 100) }}, the short strangle collects less but keeps its full credit across a $10 range instead of at a single price. The tail is the same shape: beyond the break-evens, it loses as fast as a naked option, because that is what each leg is.

Before expiration, the short strangle earns its theta slowly and loses quickly on a move or a rise in implied volatility. Ten days in, with ACME unchanged, it shows {{ usd(payoff.pnlAt(ssg.legs, 100, 10, env)) }}. If ACME has jumped to $108 instead, it shows {{ usd(payoff.pnlAt(ssg.legs, 108, 10, env)) }}, and with implied volatility 5 points higher, {{ usd(payoff.pnlAt(ssg.legs, 108, 10, { ...env, ivShift: 0.05 })) }}.

:::practice How premium sellers choose strangle strikes
Professional premium sellers usually choose strikes by delta rather than by dollar distance. A common choice is roughly the 16-delta put and call, about one standard deviation away, or tighter (25 to 30 delta, like the 95/105 here) for more credit and less room. Wider strikes, such as the 90/110 strangle for {{ usd(ssg90.fill) }}, win more often and collect much less. They also size the position by its loss in a large move, not by its credit, and usually close or adjust it well before expiration. Management is covered in [Managing trades](#core-12).
:::

:::warning The tails are real
A short strangle on a stock that gaps 20% on news loses many months of credits in one day. Single stocks gap on earnings, takeovers, lawsuits and regulatory news. Traders who sell strangles systematically tend to avoid earnings dates, keep each position small, or switch to the defined-risk version, the [iron condor](#core-11-iron-condor).
:::

```tool position-builder
{ title: 'Short the December 95/105 strangle', legs: ssg.legs, range: [80, 120] }
```

:::key
A strangle is an out-of-the-money put plus an out-of-the-money call. Long, it is a cheaper, lower-probability bet on a large move than a straddle. Short, it collects less than a straddle but keeps its full credit across a range of prices, with the same unlimited tails. Choose the strikes by delta and size by the loss in a large move.
:::

```quiz
- q: >-
    You buy the December 95/105 strangle for {{ usd(lsg.fill) }}. ACME finishes at $103. What is your P&L?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(lsg.legs, 103)) }}
    - >-
      {{ usd(payoff.pnlAtExpiry(lsg.legs, 103) + 300) }}
    - >-
      {{ usd(payoff.pnlAtExpiry(lstr.legs, 103)) }}
  answer: 0
  explain: >-
    At $103 both options are out of the money, so the strangle is worthless and you lose the full {{ usd(lsg.fill * 100) }}. The second answer treats the $3 gain above $100 as if you owned a call struck at $100; the third is the straddle's result, whose call would be worth $3.
- q: >-
    You expect a moderate move in ACME, about $10 either way, by December expiration. Which long position makes more if you are right?
  choices:
    - >-
      The 100 straddle
    - >-
      The 95/105 strangle
    - >-
      They make the same
  answer: 0
  explain: >-
    At $110 the straddle makes {{ usd(payoff.pnlAtExpiry(lstr.legs, 110)) }} and the strangle {{ usd(payoff.pnlAtExpiry(lsg.legs, 110)) }}. The strangle is cheaper, but its call only starts paying at $105, so a moderate move is worth less to it. It does better only when nothing happens (it loses less) or on very large moves relative to its cost.
- q: >-
    Which is true of the short 95/105 strangle compared with the short 100 straddle?
  choices:
    - >-
      It collects less premium but keeps all of it anywhere between $95 and $105
    - >-
      It has limited risk because both options are out of the money
    - >-
      It collects more premium because it has two strikes
  answer: 0
  explain: >-
    Out-of-the-money options are cheaper, so the strangle brings in {{ usd(ssg.fill * 100) }} against {{ usd(sstr.fill * 100) }} for the straddle, but its full credit is kept across a $10 range. Both legs are still naked, so its risk is unlimited above $105 and large below $95.
- q: >-
    A trader sells the 95/105 strangle and ACME jumps to $108 ten days later while implied volatility rises. Which Greeks explain the loss?
  choices:
    - >-
      Negative gamma (delta turned against the move) and negative vega (higher implied volatility)
    - >-
      Positive theta
    - >-
      Positive vega
  answer: 0
  explain: >-
    A short strangle is short gamma, so as ACME rises its delta becomes more and more negative, and short vega, so the rise in implied volatility adds to the loss: the position shows {{ usd(payoff.pnlAt(ssg.legs, 108, 10, { ...env, ivShift: 0.05 })) }}. Theta is positive and works in its favor, but slowly.
```
