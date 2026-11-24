---
title: What implied volatility is
summary: Back out implied volatility from an option's market price, read it off a chain, and use it to compare options that have nothing else in common.
---

```calc
const T = 30 / 365;
const q30 = chain(ACME, { dte: 30 });
const row = (K) => q30.rows.find((x) => x.strike === K);
const iv = (price, K, type) => bs.impliedVol({ price, S: 100, K, T, r: RATE, q: ACME.q, type });
const ks = [90, 95, 100, 105, 110];
const r100 = row(100);
const ivMidC = iv(r100.call.mid, 100, 'call');
const ivMidP = iv(r100.put.mid, 100, 'put');
const ivBid = iv(r100.call.bid, 100, 'call'), ivAsk = iv(r100.call.ask, 100, 'call');
const ivAt4 = iv(4.00, 100, 'call');
const p = (s) => bs.price({ S: 100, K: 100, T, r: RATE, q: ACME.q, sigma: s, type: 'call' });
const g100 = bs.greeks({ S: 100, K: 100, T, r: RATE, q: ACME.q, sigma: 0.30, type: 'call' });
const extra4 = Number((4 - g100.price).toFixed(2)), vega4 = Number(g100.vega.toFixed(3)), pts4 = Number((extra4 / vega4).toFixed(1));
const hbrRow = chain(HBR, { dte: 30 }).rows.find((x) => x.strike === 5000);
```

[What drives an option's price](#core-04) ended with a problem: five of the six inputs to an option's price can be looked up, and the sixth, the volatility of the stock until expiration, cannot. The market's answer is to run the pricing model backwards. Instead of plugging in a volatility to get a price, traders take the price the market is paying and ask what volatility would produce it. That number is the option's [[implied volatility]], and it is the most important number on an options screen after the price itself.

## Running the model backwards

The Black-Scholes formula takes six inputs and returns a price. Fix five of them at their known values (stock price, strike, time, rate, dividend yield) and the price depends only on volatility. Because a higher volatility always means a higher price, there is exactly one volatility that matches any sensible market price. Finding it is a matter of trial and error: guess a volatility, price the option, raise the guess if the model price is too low, lower it if too high, and repeat until the two match. Every broker's platform does this for every option, continuously.

:::example Backing out the December 100 call's implied volatility
ACME is at $100. The December 100 call, 30 days out, is quoted {{ usd(r100.call.bid) }} bid, {{ usd(r100.call.ask) }} ask, so its [[mid price]] is {{ usd(r100.call.mid) }}. With the rate at 4% and the yield at 2%:

| Volatility tried | Model price | Compared with {{ usd(r100.call.mid) }} |
|---|---|---|
| 25% | {{ usd(p(0.25)) }} | too low: raise the guess |
| 35% | {{ usd(p(0.35)) }} | too high: lower the guess |
| 29% | {{ usd(p(0.29)) }} | still low |
| 30% | {{ usd(p(0.30)) }} | within a cent |

Narrowing further, the price {{ usd(r100.call.mid) }} corresponds to a volatility of **{{ pct(ivMidC, 2) }}**. That is the call's implied volatility. Doing the same for the December 100 put at its mid of {{ usd(r100.put.mid) }} gives {{ pct(ivMidP, 2) }}: the same number to within rounding, as [put-call parity](#core-04-put-call-parity) requires.
:::

A quick way to do it in your head: near the money, each vol point is worth one [[vega]]. The December 100 call has a vega of {{ usd(g100.vega, 3) }}, so if someone pays $4.00 for it, about {{ usd(extra4) }} above its value at 30%, they are paying roughly {{ num(pts4, 1) }} vol points more: an implied volatility near {{ pct(0.30 + pts4 / 100, 1) }}. The exact answer is {{ pct(ivAt4, 2) }}.

## A volatility for every price on the screen

Because a quote has a bid and an ask, an option really has three implied volatilities. For the December 100 call:

- at the bid, {{ usd(r100.call.bid) }}: {{ pct(ivBid, 2) }}
- at the mid, {{ usd(r100.call.mid) }}: {{ pct(ivMidC, 2) }}
- at the ask, {{ usd(r100.call.ask) }}: {{ pct(ivAsk, 2) }}

So buying at the ask means paying about {{ num((ivAsk - ivMidC) * 100, 1) }} vol points more than the mid. Traders think of the [[bid-ask spread]] in exactly these terms: a spread of "a point wide" is a quote whose bid and ask are one vol point apart. When a platform shows a single implied volatility per option, it is usually computed from the mid.

Here are the December implied volatilities across strikes, computed from each mid:

| Strike | Call mid | Call IV | Put mid | Put IV |
|---|---|---|---|---|
{{ ks.map((k) => `| ${k} | ${usd(row(k).call.mid)} | ${pct(iv(row(k).call.mid, k, 'call'), 1)} | ${usd(row(k).put.mid)} | ${pct(iv(row(k).put.mid, k, 'put'), 1)} |`).join('\n') }}

Two things to notice. Calls and puts at the same strike agree, again because of parity. And the implied volatility is not the same at every strike: it is higher for the low strikes than for the high ones. If Black-Scholes were literally true, every strike would show the same volatility. That pattern, the [[volatility skew]], gets its own Lesson, [Skew and the smile](#core-06-skew-and-smile).

The chain Tool below shows the December series with Greeks and implied volatility for every strike. Compare the IV column across strikes and between calls and puts.

```tool chain
{ underlying: 'ACME', dte: 30, view: 'greeks', highlight: [{ strike: 100, type: 'call' }, { strike: 100, type: 'put' }] }
```

## Why traders quote in volatility

A dollar price mixes everything together. The December 100 call at {{ usd(r100.call.mid) }} and the HBR December 5000 call at {{ usd(hbrRow.call.mid) }} cannot be compared as prices: different stocks, different price levels. Their implied volatilities, {{ pct(r100.call.iv, 1) }} and {{ pct(hbrRow.call.iv, 1) }}, can. They say that the market is charging for ACME to move about two thirds more than HBR, in percentage terms, over the next month.

Implied volatility does the same job across strikes and expirations of one stock. A 30-day option and a 394-day option have very different prices, but their implied volatilities say directly whether the market is charging more per unit of time for one than the other. For that reason professionals think about options as trades in volatility first and in dollars second. "Puts are expensive" means their implied volatility is high relative to some benchmark, not that their price is a large number.

:::warning Implied volatility is a price, not a forecast
It is tempting to read 30% implied volatility as "the market predicts ACME will move 30% a year." It is closer to "the market charges 30% for options on ACME." The price includes what option sellers demand for taking risk, the demand for protection, and supply and demand around events. Over long periods implied volatility has tended to sit *above* the volatility stocks actually deliver, as [Realized volatility](#core-06-realized-volatility) shows. Treat it as what you pay, and compare it with what you expect to get.
:::

## What makes implied volatility move

Implied volatility changes whenever the price of an option changes for any reason other than the stock price, time, rates or dividends. In practice:

- **Events approaching.** Options that expire after an earnings report or a court ruling carry extra implied volatility until the event, then lose it. See [Earnings and the volatility crush](#core-06-earnings-and-the-crush).
- **Market stress.** When stocks fall sharply, implied volatility usually rises, across the whole market at once. Demand for puts jumps, and market makers who are short options widen their prices.
- **Calm.** After long quiet stretches implied volatility drifts down as sellers compete to collect premium.
- **Supply and demand.** A large buyer of calls, a fund overwriting its stock with covered calls, or a wave of retail call buying can push implied volatility at particular strikes up or down for reasons unrelated to any forecast.

:::key
Implied volatility is the volatility that makes the Black-Scholes price equal the market price; you find it by running the model backwards. It is the market's price for an option expressed in a form that can be compared across strikes, expirations and stocks. It is a price that includes a risk premium, not a pure forecast.
:::

```quiz
- q: >-
    The ACME December 100 call trades at {{ usd(r100.call.mid) }} with ACME at $100 and its vega is {{ usd(g100.vega, 3) }}. A buyer pays {{ usd(r100.call.mid + 2 * g100.vega) }} instead. Roughly what implied volatility is that buyer paying?
  choices:
    - >-
      About 30%, because the stock has not moved
    - >-
      About 32%
    - >-
      About 31%
  answer: 1
  explain: >-
    The buyer is paying {{ usd(2 * g100.vega) }}, which is 2 × vega, above the price at 30% volatility. Each vega is one vol point, so about 32%. Implied volatility moves with the option's price whether or not the stock moves, which rules out 30%; 31% counts only one vega's worth of the extra premium.
- q: >-
    Why does the ACME December 100 put show almost exactly the same implied volatility as the December 100 call?
  choices:
    - >-
      Because the market expects ACME to be equally likely to rise or fall
    - >-
      Because put-call parity ties the call and put prices together without using volatility, so both must imply the same one
    - >-
      Because brokers copy the call's volatility to the put
  answer: 1
  explain: >-
    Parity fixes the difference between the call and put at the same strike from the stock price, strike, rate and dividend alone. If the two implied different volatilities, their prices would break parity and an arbitrage would appear. It has nothing to do with a forecast of up versus down; parity holds whatever anyone expects.
- q: >-
    You buy the December 100 call at its ask of {{ usd(r100.call.ask) }}. In volatility terms, what did you pay?
  choices:
    - >-
      {{ pct(ivMidC, 1) }}, the mid volatility
    - >-
      {{ pct(ivAsk, 1) }}, about {{ num((ivAsk - ivMidC) * 100, 1) }} points over the mid
    - >-
      {{ pct(ivBid, 1) }}, because buyers pay the bid
  answer: 1
  explain: >-
    The ask price corresponds to an implied volatility of {{ pct(ivAsk, 1) }}. The mid volatility is a fair-value reference, but you did not trade there. Buyers pay the ask, not the bid; the bid is what you would receive if you sold.
- q: >-
    ACME's options show 30% implied volatility and HBR's show 18%. What is the best reading?
  choices:
    - >-
      ACME options are overpriced compared with HBR options
    - >-
      The market is charging for ACME to move about two thirds more than HBR in percentage terms
    - >-
      ACME will move 30% over the next year
  answer: 1
  explain: >-
    Implied volatility makes the two comparable: 30% against 18% says the market prices ACME as the more volatile of the two, about 30/18 times as much. That alone does not make ACME options overpriced, since a single stock is naturally more volatile than a broad index. And implied volatility is a price that includes a risk premium, not a promise about the coming year.
```
