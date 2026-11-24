---
title: Vega and rho
summary: Measure how much a change in implied volatility or interest rates moves an option, and know which positions carry most of each risk.
---

```calc
const row = (dte, K) => chain(ACME, { dte }).rows.find((x) => x.strike === K);
const greeksAt = (dte, K, type) => { const r = row(dte, K); return bs.greeks({ S: 100, K, T: dte / 365, r: RATE, q: ACME.q, sigma: r[type].iv, type }); };
const dtes = [9, 30, 58, 121, 212, 394];
const c100 = row(30, 100).call;
const up2 = bs.price({ S: 100, K: 100, T: 30 / 365, r: RATE, q: ACME.q, sigma: c100.iv + 0.02, type: 'call' });
const strikes = [80, 90, 95, 100, 105, 110, 120];
const dec = row(30, 100).call, mar = row(121, 100).call;
const env = { r: RATE, q: ACME.q };
const decLegs = [{ kind: 'call', qty: 5, strike: 100, premium: dec.theo, dte: 30, iv: dec.iv }];
const marLegs = [{ kind: 'call', qty: 5, strike: 100, premium: mar.theo, dte: 121, iv: mar.iv }];
const decCrush = payoff.pnlAt(decLegs, 100, 0, { ...env, ivShift: -0.03 });
const marCrush = payoff.pnlAt(marLegs, 100, 0, { ...env, ivShift: -0.03 });
const leapC = greeksAt(394, 100, 'call'), leapP = greeksAt(394, 100, 'put'), decC = greeksAt(30, 100, 'call');
const leapCut = bs.price({ S: 100, K: 100, T: 394 / 365, r: RATE - 0.0025, q: ACME.q, sigma: row(394, 100).call.iv, type: 'call' }) - leapC.price;
```

Delta, gamma and theta describe what happens as the stock moves and the clock runs. Two inputs remain that can change on their own: the volatility the market uses to price options, and interest rates. Their Greeks are vega and rho. Vega matters on every trade. Rho matters mainly for long-dated options.

## Vega

[[Vega]] is the change in an option's price when its [[implied volatility]] rises by one percentage point (one "vol point"), for example from 30% to 31%. (Vega is not actually a Greek letter; the name stuck anyway.)

The ACME December 100 call has a vega of {{ usd(c100.vega, 4) }}. If implied volatility rises from {{ pct(c100.iv, 0) }} to {{ pct(c100.iv + 0.02, 0) }}, with the stock and time unchanged, vega predicts a gain of 2 × {{ usd(c100.vega, 4) }} = {{ usd(2 * c100.vega, 3) }}; repricing gives {{ usd(up2 - c100.theo, 3) }}. For at-the-money options the price is close to linear in volatility, so vega estimates are good over several points.

Vega is positive for every long option, call or put, and the same for a call and a put at the same strike and expiration. That follows from [put-call parity](#core-04-put-call-parity): volatility does not appear in parity, so a change in volatility must move the call and the put by the same amount. Owning options makes you **long vega** (you gain when implied volatility rises); selling them makes you **short vega**.

Implied volatility changes for reasons that have nothing to do with the stock price: an earnings date approaching, a market-wide scare, the scare passing. So vega is a risk you carry even when the stock sits still. [Implied volatility](#core-06) is the Module about why it moves.

## Vega is largest for long-dated, at-the-money options

Across strikes, at 30 days, from the chain:

| Strike | {{ strikes.join(' | ') }} |
|---|{{ strikes.map(() => '---').join('|') }}|
| Vega | {{ strikes.map((k) => usd(row(30, k).call.vega, 4)).join(' | ') }} |

Vega peaks at the money and falls off on both sides: deep in-the-money and far out-of-the-money options have little time value, and volatility only affects time value.

Across expirations, at the money:

| Days left | {{ dtes.join(' | ') }} |
|---|{{ dtes.map(() => '---').join('|') }}|
| Vega of the 100 call | {{ dtes.map((d) => usd(row(d, 100).call.vega, 4)).join(' | ') }} |

Vega grows with time to expiration, roughly with \(\sqrt{T}\), just as at-the-money time value does (an at-the-money option is worth about \(0.4\,S\,\sigma\sqrt{T}\), so one vol point is worth about \(0.4\,S\sqrt{T}/100\)). The [[LEAPS]] call has about {{ num(row(394, 100).call.vega / row(9, 100).call.vega, 1) }} times the vega of the 9-day call.

```tool greeks-explorer
{ greek: 'vega', type: 'call', K: 100, iv: 0.30, dtes: [30, 121, 394], x: 'spot' }
```

:::example The same view, two expirations
You buy 5 at-the-money ACME calls, either the December 100s (30 days) at {{ usd(dec.theo) }} or the March 100s (121 days) at {{ usd(mar.theo) }}. That evening implied volatility across ACME falls 3 points while the stock stays at $100.

- The December position has a vega of {{ usd(dec.vega * 500) }} per point and loses {{ usd(-decCrush) }}.
- The March position has a vega of {{ usd(mar.vega * 500) }} per point and loses {{ usd(-marCrush) }}.

If your view is about the *stock*, longer-dated options expose you to more volatility risk per contract. If your view is about *volatility* itself, longer-dated options are the cleaner way to express it, because they have more vega relative to their gamma and theta.
:::

:::practice Not all vol points are equal
A 3-point move across every expiration, as in the example, is a simplification. In practice short-dated implied volatility moves much more than long-dated implied volatility: a scare can lift short-dated volatility several times as far as one-year volatility. So the LEAPS position's larger vega overstates its everyday volatility risk somewhat. Desks handle this by weighting vega by expiration; [Term structure and VIX](#core-06-term-structure-and-vix) shows the shape they work with.
:::

## Rho

[[Rho]] is the change in an option's price when the risk-free rate rises by one percentage point. Calls have positive rho (a higher rate raises the forward and the value of delaying payment of the strike) and puts have negative rho.

| ACME 100 strike, ACME at $100 | Call rho | Put rho |
|---|---|---|
{{ dtes.map((d) => `| ${d} days | ${usd(greeksAt(d, 100, 'call').rho, 4)} | ${usd(greeksAt(d, 100, 'put').rho, 4)} |`).join('\n') }}

For a 30-day option, rho is a few cents per full percentage point, and rates rarely move a full point in a month. You can ignore it. For the 394-day LEAPS call, a quarter-point cut by the Federal Reserve (holding everything else equal) changes the price by {{ usd(leapCut, 3) }} per share, {{ usd(leapCut * 100) }} per contract. Small next to vega, but no longer negligible, and it grows with size: a fund holding 1,000 such contracts has {{ usd(leapC.rho * 100000, 0) }} of exposure per rate point.

Rho grows roughly in proportion to time (not its square root), because the rate acts on the strike payment over the whole life of the option. That is why it matters only far out.

:::warning Long-dated options are a volatility trade too
A Learner who buys LEAPS calls "as a stock replacement" often watches the stock rise and the calls lag. The reason is usually vega: if implied volatility falls a few points, a long-dated option's large vega takes back much of what delta earned. Before buying long-dated options, check vega × a plausible change in implied volatility alongside delta × a plausible move in the stock.
:::

:::key
Vega is the change in price per one-point rise in implied volatility. It is positive for long calls and puts, equal for a call and put at the same strike, largest at the money and grows with the square root of time. Rho is the change per one-point rise in rates: positive for calls, negative for puts, grows in proportion to time, and is negligible except for long-dated options.
:::

```quiz
- q: >-
    You own 10 ACME December 100 puts with a vega of {{ usd(row(30, 100).put.vega, 4) }}. Implied volatility rises 4 points and nothing else changes. About how much do you make?
  choices:
    - >-
      {{ usd(row(30, 100).put.vega * 4, 2) }}
    - >-
      {{ usd(row(30, 100).put.vega * 4 * 1000) }}
    - >-
      Nothing: puts lose value when volatility rises because the stock is less likely to fall
  answer: 1
  explain: >-
    Vega is per share per vol point: {{ usd(row(30, 100).put.vega, 4) }} × 4 points × 1,000 shares = {{ usd(row(30, 100).put.vega * 4000) }}. Long puts are long vega just like long calls, because higher volatility makes large moves in either direction more likely and the put holder's loss is capped. The first answer forgets the 10 contracts and the multiplier.
- q: >-
    Which ACME option has the largest vega?
  choices:
    - >-
      The 9-day 100 call
    - >-
      The 394-day 100 call
    - >-
      The 30-day 80 call
  answer: 1
  explain: >-
    Vega is largest for long-dated, at-the-money options: the 394-day 100 call's vega is {{ usd(row(394, 100).call.vega, 4) }}, against {{ usd(row(9, 100).call.vega, 4) }} for the 9-day 100 call. The 30-day 80 call is deep in the money, mostly intrinsic value, so its vega is only {{ usd(row(30, 80).call.vega, 4) }}.
- q: >-
    Rates are cut by a quarter point. Which position is affected most?
  choices:
    - >-
      Long 10 ACME December 100 calls
    - >-
      Long 10 ACME 394-day 100 calls
    - >-
      Long 10 ACME 394-day 100 puts, which lose value
  answer: 1
  explain: >-
    Rho grows roughly in proportion to time, so the LEAPS call is hit hardest: about {{ usd(-leapC.rho * 0.25 * 1000) }} for 10 contracts, against {{ usd(-decC.rho * 0.25 * 1000) }} for the December calls. The LEAPS puts are affected too, but they *gain* from a rate cut (put rho is negative), by about {{ usd(-leapP.rho * 0.25 * 1000) }}, so "lose value" is the wrong direction.
- q: >-
    ACME's stock is unchanged, but its implied volatility falls 3 points overnight. You own 5 March 100 calls. What explains your loss?
  choices:
    - >-
      Theta
    - >-
      Vega
    - >-
      Delta
  answer: 1
  explain: >-
    A change in implied volatility with the stock unchanged works through vega: 5 contracts × 100 × {{ usd(mar.vega, 4) }} × 3 ≈ {{ usd(mar.vega * 1500) }}. One night's theta is part of the loss too, but at {{ usd(-mar.theta * 500) }} for the position it is a small part. Delta does nothing when the stock does not move.
```
