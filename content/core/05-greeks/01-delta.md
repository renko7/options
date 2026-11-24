---
title: Delta
summary: Read an option's delta three ways (as price sensitivity, as a hedge ratio and as a rough probability) and predict how it changes with the stock price and with time.
---

```calc
const row = (dte, K) => chain(ACME, { dte }).rows.find((x) => x.strike === K);
const T = 30 / 365;
const c100 = row(30, 100).call;
const g0 = bs.greeks({ S: 100, K: 100, T, r: RATE, q: ACME.q, sigma: c100.iv, type: 'call' });
const up1 = bs.price({ S: 101, K: 100, T, r: RATE, q: ACME.q, sigma: c100.iv, type: 'call' });
const strikes = [85, 90, 95, 100, 105, 110, 115];
const dtes = [121, 30, 9, 2];
const hedge = Math.round(c100.delta * 10 * 100);
const c105 = row(30, 105).call;
const p105 = bs.probITM({ S: 100, K: 105, T, r: RATE, q: ACME.q, sigma: c105.iv, type: 'call' });
const iv120 = smileIV(ACME, 120, 394 / 365);
const l120 = bs.greeks({ S: 100, K: 120, T: 394 / 365, r: RATE, q: ACME.q, sigma: iv120, type: 'call' });
const pl120 = bs.probITM({ S: 100, K: 120, T: 394 / 365, r: RATE, q: ACME.q, sigma: iv120, type: 'call' });
const p100 = row(30, 100).put;
const eq = Math.exp(-ACME.q * T);
const p95 = row(30, 95).put;
```

Every option price depends on six inputs, and [What drives an option's price](#core-04) showed which way each one pushes. The [[Greeks]] put a number on each push: how much the option's price changes when one input changes by a standard amount and the others stay put. Traders run positions by their Greeks the way a pilot flies by instruments, so the rest of this Module teaches each one in turn and then how to combine them.

| Greek | Measures the change in price when … | Units used on a chain |
|---|---|---|
| Delta | the underlying rises $1 | dollars per $1 |
| Gamma | the underlying rises $1 (change in *delta*) | delta per $1 |
| Theta | one calendar day passes | dollars per day |
| Vega | implied volatility rises 1 point | dollars per vol point |
| Rho | the risk-free rate rises 1 point | dollars per rate point |

All of them are quoted per share, like premiums. Multiply by 100 for one contract.

## Delta as price sensitivity

[[Delta]] is the change in an option's price for a $1 change in the underlying. Calls have deltas between 0 and 1: they gain when the stock rises. Puts have deltas between −1 and 0: they lose when the stock rises.

:::example The December 100 call
ACME is at $100. The December 100 call, 30 days out, is worth {{ usd(g0.price) }} and has a delta of {{ num(g0.delta, 3) }}.

If ACME rises to $101, delta predicts the call gains about {{ usd(g0.delta) }}, to {{ usd(g0.price + g0.delta) }}. Repricing at $101 gives {{ usd(up1) }}, a gain of {{ usd(up1 - g0.price) }}. The prediction is close but a little low, because delta itself grew as the stock rose. That growth is gamma, the subject of the [next Lesson](#core-05-gamma).

Per contract, a delta of {{ num(g0.delta, 3) }} means one call gains or loses about {{ usd(g0.delta * 100) }} per $1 move in ACME, the same as holding {{ int(g0.delta * 100) }} shares.
:::

That last line is how professionals talk about delta. "I'm long 50 deltas" means "my position moves like 50 shares." It lets you compare an option position to a stock position directly.

## Delta as a hedge ratio

Because one December 100 call moves like {{ int(c100.delta * 100) }} shares for small moves, selling that many shares against it cancels its exposure to small moves in ACME. A position whose total delta is zero is [[delta-neutral]]: for the next small move in the stock, it neither makes nor loses money.

:::example Hedging 10 calls
A market maker has sold 10 December 100 calls to a customer and wants no view on ACME's direction. The calls have a delta of {{ num(c100.delta, 3) }} each, so the short position is like being short {{ num(c100.delta, 3) }} × 10 × 100 = {{ int(hedge) }} shares. Buying {{ int(hedge) }} shares makes the position delta-neutral.

The hedge does not stay right. If ACME rises, the calls' delta rises and the market maker needs more shares; if ACME falls, fewer. Keeping the hedge right as the stock moves is the job of delta hedging, and its cost is measured by gamma.
:::

## Delta as a rough probability

Traders often read a call's delta as the chance it finishes in the money: a 30-delta call is "about a 30% shot". This works because delta is \(e^{-qT}N(d_1)\) and the model's probability is \(N(d_2)\), two numbers that are close for short-dated options ([The Black-Scholes formula](#core-04-black-scholes) explains both).

- The December 105 call has a delta of {{ num(c105.delta, 3) }}; the model's probability of finishing in the money is {{ pct(p105) }}. Close.
- The 394-day 120 call has a delta of {{ num(l120.delta, 3) }}; the model's probability is {{ pct(pl120) }}. Not close.

The gap grows with volatility and time, so the shortcut is rough for long-dated options. Two more caveats: both numbers are *risk-neutral* probabilities, not forecasts, and finishing in the money is not the same as making money, because the premium must be covered too.

## How delta changes with moneyness

Here are the December (30-day) call and put deltas across strikes, from the chain:

| Strike | Call delta | Put delta |
|---|---|---|
{{ strikes.map((k) => `| ${k} | ${num(row(30, k).call.delta, 3)} | ${num(row(30, k).put.delta, 3)} |`).join('\n') }}

Deep [[in the money]] calls have deltas near 1: they move almost dollar for dollar with the stock. Far [[out of the money]] calls have deltas near 0: a $1 move barely changes their small value. [[At the money]], the delta is close to 0.5.

Notice that at each strike the call delta minus the put delta is the same number, {{ num(c100.delta - p100.delta, 3) }}. That is not a coincidence.

:::derivation Call delta minus put delta
Put-call parity says, for the same strike and expiration,

\[ C - P = S\,e^{-qT} - K\,e^{-rT} . \]

Let the stock rise by $1 while nothing else changes. The right-hand side rises by exactly \(e^{-qT}\), because \(K\,e^{-rT}\) does not depend on \(S\). So the left-hand side, \(C - P\), must rise by the same amount: the call's change minus the put's change is \(e^{-qT}\). Since delta is the change for a $1 move (for small moves, scaled to $1),

\[ \Delta_{\text{call} } - \Delta_{\text{put} } = e^{-qT} . \]

For ACME with 30 days left, \(e^{-0.02 \times 30/365}\) = {{ num(eq, 4) }}. The difference is just under 1 because the call holder misses the dividend that the stock holder collects.
:::

So a 30-delta call and a 70-delta put at the same strike are the same bet seen from two sides, which is why traders name options by delta ("the 25-delta put") as often as by strike.

## How delta changes with time

Here is the delta of four ACME calls at four expirations, with ACME at $100:

| Days left | 90 call | 100 call | 105 call | 110 call |
|---|---|---|---|---|
{{ dtes.map((d) => `| ${d} | ${num(row(d, 90).call.delta, 3)} | ${num(row(d, 100).call.delta, 3)} | ${num(row(d, 105).call.delta, 3)} | ${num(row(d, 110).call.delta, 3)} |`).join('\n') }}

As expiration approaches, in-the-money deltas climb toward 1 and out-of-the-money deltas fall toward 0. With little time left, there is little chance of crossing the strike, so the option becomes either "almost stock" or "almost nothing". Only the at-the-money option stays near 0.5 to the end. A delta that starts out gentle turns into a cliff at the strike, and that is the root of the risks in the next two Lessons.

The explorer below plots delta against the stock price for three expirations. The 2-day curve is nearly a step; the 121-day curve is a gentle slope.

```tool greeks-explorer
{ greek: 'delta', type: 'call', K: 100, iv: 0.30, dtes: [2, 30, 121], x: 'spot' }
```

:::warning Delta is a snapshot
Delta tells you what happens for the *next* small move. A position that is delta-neutral at $100 is not neutral at $95. A short out-of-the-money put with a delta of {{ num(p95.delta, 2) }} feels like a small position, until ACME drops through the strike and its delta heads toward −1, at which point it behaves like 100 shares you did not plan to own.
:::

:::key
Delta is the change in an option's price per $1 move in the underlying: between 0 and 1 for calls, between −1 and 0 for puts, about ±0.5 at the money. Multiplied by 100 it is the number of shares the contract behaves like, which makes it the hedge ratio. It is only a rough proxy for the probability of finishing in the money, and it moves toward 0 or 1 as expiration approaches.
:::

```quiz
- q: >-
    You own 4 ACME December 100 calls, each with a delta of {{ num(c100.delta, 3) }}. ACME rises 50 cents. About how much does your position gain?
  choices:
    - >-
      {{ usd(c100.delta * 0.5) }}
    - >-
      {{ usd(c100.delta * 0.5 * 400) }}
    - >-
      $200
  answer: 1
  explain: >-
    Each call gains about delta × move = {{ num(c100.delta, 3) }} × $0.50 = {{ usd(c100.delta * 0.5, 3) }} per share. Four contracts cover 400 shares, so the position gains about {{ usd(c100.delta * 0.5 * 400) }}. The first answer forgets the contracts and multiplier. $200 would be the gain on 400 *shares*; the calls move only about half as much.
- q: >-
    You are short 5 ACME December 100 calls with a delta of {{ num(c100.delta, 3) }}. How many shares do you buy to be delta-neutral?
  choices:
    - >-
      500
    - >-
      {{ int(c100.delta * 500) }}
    - >-
      {{ int((1 - c100.delta) * 500) }}
  answer: 1
  explain: >-
    Short 5 calls is like being short {{ num(c100.delta, 3) }} × 5 × 100 = {{ int(c100.delta * 500) }} shares, so buying that many cancels the exposure. 500 shares would fully cover the calls only at expiration if they finish in the money; today it would leave you net long about {{ int((1 - c100.delta) * 500) }} shares' worth of exposure.
- q: >-
    An ACME call at some strike has a delta of 0.30. What is the delta of the put at the same strike and expiration, 30 days out?
  choices:
    - >-
      −0.30
    - >-
      About −0.70
    - >-
      +0.70
  answer: 1
  explain: >-
    Put-call parity gives \(\Delta_{\text{call} } - \Delta_{\text{put} } = e^{-qT}\), which is {{ num(eq, 4) }} here, so the put delta is about 0.30 − {{ num(eq, 3) }} = {{ num(0.30 - eq, 3) }}. A put delta is always negative, which rules out +0.70, and −0.30 would be the put at a *different* strike, one equally far out of the money on the other side.
- q: >-
    It is two days before expiration. Which ACME call's delta is closest to 0.5?
  choices:
    - >-
      The 90 call
    - >-
      The 100 call
    - >-
      The 105 call
  answer: 1
  explain: >-
    With two days left, the 100 call is still at the money and its delta is {{ num(row(2, 100).call.delta, 3) }}. The 90 call is deep in the money, delta {{ num(row(2, 90).call.delta, 3) }}, and the 105 call has almost no chance of being in the money, delta {{ num(row(2, 105).call.delta, 3) }}. A month earlier the 105 call's delta was {{ num(row(30, 105).call.delta, 3) }}; near expiration, deltas run to 0 or 1 unless the option is at the money.
```
