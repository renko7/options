---
title: The Black-Scholes formula
summary: Read the Black-Scholes formula term by term, compute a price with it, interpret N(d1) and N(d2), and know where its assumptions break.
---

```calc
const T = 30 / 365;
const row = chain(ACME, { dte: 30 }).rows.find((x) => x.strike === 105);
const sig = row.call.iv;
const o = { S: 100, K: 105, T, r: RATE, q: ACME.q, sigma: sig };
const lnSK = Math.log(100 / 105);
const drift = (RATE - ACME.q + sig * sig / 2) * T;
const volT = sig * Math.sqrt(T);
const g = bs.greeks({ ...o, type: 'call' });
const Nd1 = normal.cdf(g.d1), Nd2 = normal.cdf(g.d2);
const sTerm = 100 * Math.exp(-ACME.q * T) * Nd1;
const kTerm = 105 * Math.exp(-RATE * T) * Nd2;
const put = bs.price({ ...o, type: 'put' });
const pRN = bs.probITM({ ...o, type: 'call' });
const pRW = bs.probITM({ ...o, r: 0.10, type: 'call' });
const iv120 = smileIV(ACME, 120, 394 / 365);
const o120 = { S: 100, K: 120, T: 394 / 365, r: RATE, q: ACME.q, sigma: iv120, type: 'call' };
const lRN = bs.probITM(o120), lRW = bs.probITM({ ...o120, r: 0.10 });
const iv130 = smileIV(ACME, 130, 394 / 365);
const amer = binomial.price({ S: 100, K: 130, T: 394 / 365, r: RATE, q: ACME.q, sigma: iv130, type: 'put', american: true, steps: 500 }).price;
const euro = bs.price({ S: 100, K: 130, T: 394 / 365, r: RATE, q: ACME.q, sigma: iv130, type: 'put' });
const iv95 = smileIV(ACME, 95, T);
const amer95 = binomial.price({ S: 100, K: 95, T, r: RATE, q: ACME.q, sigma: iv95, type: 'put', american: true, steps: 500 }).price;
const euro95 = bs.price({ S: 100, K: 95, T, r: RATE, q: ACME.q, sigma: iv95, type: 'put' });
```

In 1973 Fischer Black and Myron Scholes, with a key extension by Robert Merton, published a formula that turns the six inputs into a price. The [[Black-Scholes model]] is the reason a modern options chain can show thousands of consistent quotes, and it is the language every options desk speaks, even though every trader on that desk knows its assumptions are wrong. This Lesson states the formula, computes one price with it by hand, explains what its pieces mean, and lists where it breaks. The Derivation needs calculus, so it is in the [Advanced Track](#advanced-02); here you use it.

## The formula

For a stock with a continuous dividend yield (the version this Course uses), the price of a European call and put are

\[ C = S\,e^{-qT}\,N(d_1) - K\,e^{-rT}\,N(d_2) \]

\[ P = K\,e^{-rT}\,N(-d_2) - S\,e^{-qT}\,N(-d_1) \]

where

\[ d_1 = \frac{\ln(S/K) + \left(r - q + \tfrac{1}{2}\sigma^2\right)T}{\sigma\sqrt{T} }, \qquad d_2 = d_1 - \sigma\sqrt{T} . \]

The inputs are the six you already know: \(S\) the stock price, \(K\) the strike, \(T\) the time to expiration in years, \(\sigma\) the volatility per year, \(r\) the continuously compounded risk-free rate and \(q\) the continuous dividend yield, all as decimals. Two pieces are new:

- \(\ln\) is the natural logarithm. \(\ln(S/K)\) measures how far the stock is from the strike in percentage terms: zero at the money, positive when \(S > K\).
- \(N(x)\) is the standard normal cumulative distribution: the probability that a bell-curve random number with mean 0 and standard deviation 1 comes out below \(x\). \(N(0) = 0.5\), \(N\) of a large positive number is close to 1, and \(N(-x) = 1 - N(x)\). Any spreadsheet computes it (NORM.S.DIST(x, TRUE) in Excel or Google Sheets).

The \(d_1\) and \(d_2\) look intimidating but measure one thing: how many standard deviations the strike is from where the stock is expected to be, adjusted slightly for the shape of the distribution.

## One price by hand

:::example Pricing the December 105 call
ACME is at $100. The December 105 call has 30 days to run (\(T = 30/365\)), and the chain prices it at a volatility of {{ pct(sig, 2) }}. The rate is 4% and the yield 2%.

**Step 1: the pieces of \(d_1\).**

- \(\ln(100/105)\) = {{ num(lnSK, 4) }}
- \(\left(r - q + \tfrac12\sigma^2\right)T\) = {{ num(drift, 4) }}
- \(\sigma\sqrt{T}\) = {{ num(volT, 4) }}

**Step 2: \(d_1\) and \(d_2\).**

\[ d_1 = \frac{ {{ num(lnSK, 4) }} + {{ num(drift, 4) }} }{ {{ num(volT, 4) }} } = {{ num(g.d1, 4) }}, \qquad d_2 = {{ num(g.d1, 4) }} - {{ num(volT, 4) }} = {{ num(g.d2, 4) }} \]

**Step 3: the normal probabilities.** \(N(d_1)\) = {{ num(Nd1, 4) }} and \(N(d_2)\) = {{ num(Nd2, 4) }}.

**Step 4: the two terms.**

- Stock term: \(100 \times e^{-0.02 \times 30/365} \times {{ num(Nd1, 4) }}\) = {{ usd(sTerm, 4) }}
- Strike term: \(105 \times e^{-0.04 \times 30/365} \times {{ num(Nd2, 4) }}\) = {{ usd(kTerm, 4) }}

**Step 5: the price.** \(C\) = {{ usd(sTerm, 4) }} − {{ usd(kTerm, 4) }} = **{{ usd(sTerm - kTerm, 2) }}**.

That matches the chain's theoretical value for the call, {{ usd(row.call.theo) }}, which sits between its bid of {{ usd(row.call.bid) }} and ask of {{ usd(row.call.ask) }}. The same inputs give the December 105 put at {{ usd(put) }}, and you can check that the two satisfy [put-call parity](#core-04-put-call-parity).
:::

## What N(d1) and N(d2) mean

The formula reads like a sentence: *the call is worth some shares of stock, minus some borrowed cash.*

**\(N(d_2)\) is a probability.** In the model, it is the probability that the call finishes in the money, \(S_T > K\). The second term, \(K\,e^{-rT}N(d_2)\), is the strike you will have to pay at expiration, times the probability you will pay it, discounted to today. For the 105 call that probability is {{ pct(Nd2, 1) }}. For a put, the probability of finishing in the money is \(N(-d_2)\).

**\(e^{-qT}N(d_1)\) is a hedge ratio.** It is the number of shares that move like one call for small changes in the stock price: the option's [[delta]]. For the 105 call it is {{ num(g.delta, 3) }}, so one contract moves like about {{ int(g.delta * 100) }} shares. The first term, \(S\,e^{-qT}N(d_1)\), is the value of that many shares. Delta gets a full Lesson in [The Greeks in practice](#core-05).

So \(N(d_1)\) and \(N(d_2)\) are not the same thing, and the gap between them, \(\sigma\sqrt{T}\), grows with volatility and time. For a call, delta is usually a little above the model's probability of finishing in the money. Traders often use delta as a quick probability estimate; it is a rough one, and roughest for long-dated, high-volatility options.

## Risk-neutral probability and real-world probability

Look closely at \(d_2\) and you will see the stock's expected return is missing. The formula grows the stock at the risk-free rate, \(r\), not at whatever return investors expect. This is not a forecast that ACME will earn 4%. It is a consequence of how the formula is derived: an option's payoff can be copied by trading the stock and cash, and the cost of that copy does not depend on how fast the stock is expected to grow. Probabilities computed in this artificial world are called **risk-neutral**.

The real-world probability uses the stock's actual expected return, which nobody knows. If you believed ACME would return 10% a year:

| | Risk-neutral (grows at 4%) | Real-world (grows at 10%) |
|---|---|---|
| December 105 call, 30 days | {{ pct(pRN, 1) }} | {{ pct(pRW, 1) }} |
| 394-day 120 call | {{ pct(lRN, 1) }} | {{ pct(lRW, 1) }} |

Over 30 days the difference is small, because the stock's drift barely matters next to its volatility over a month. Over a year it is large. Two lessons follow. First, a probability shown on a broker's screen is the risk-neutral one, and for long-dated options it understates the chance of finishing in the money for a stock you expect to rise. Second, finishing in the money is not the same as making money: a call buyer also needs the stock to cover the premium. [Managing trades](#core-12) treats probability of profit properly.

## The assumptions, and where they fail

Black-Scholes is exact only in a world where:

1. **Volatility is constant and known.** In reality it changes daily and nobody knows its future value. Markets respond by using a *different* volatility for each strike and expiration, which is the subject of [Implied volatility](#core-06).
2. **Prices move continuously, with bell-shaped log returns.** Real stocks jump on earnings and news, and large moves happen far more often than a bell curve allows. This is a main reason out-of-the-money puts trade at higher volatilities than the model's single number.
3. **You can trade continuously, without costs.** The formula's logic relies on rebalancing a stock hedge constantly. Real hedging happens in discrete steps and pays spreads; [Delta hedging and gamma scalping](#advanced-05) measures what that costs.
4. **Rates and dividend yield are constant.** Real dividends are discrete, and rates change.
5. **Exercise only at expiration.** ACME options are American. For most strikes this barely matters: the December 95 put is worth {{ usd(amer95, 3) }} American against {{ usd(euro95, 3) }} European. For a deep in-the-money put with a long life it can: the 394-day 130 put is worth {{ usd(amer) }} American against {{ usd(euro) }} European. Desks price American options with a tree model instead (the Advanced Track builds one).
6. **Shares can be borrowed and shorted freely.** Hard-to-borrow stocks break this, as the [previous Lesson](#core-04-conversions-and-reversals) showed.

:::practice Why everyone still uses it
Professionals do not use Black-Scholes because they believe it. They use it as a translator between dollar prices and volatilities. A dollar price is hard to compare across strikes, expirations and stocks; a volatility is easy to compare. The model's flaws do not disappear, they show up as volatilities that differ by strike and expiration, and traders read those differences as information.
:::

Move the sliders and watch the price respond. Set the strike to 105 and the volatility near {{ pct(sig, 1) }} to reproduce the Worked Example.

```tool pricer
{ S: 100, K: 105, dte: 30, iv: sig, r: RATE, q: ACME.q, type: 'call' }
```

:::key
Black-Scholes prices a call as \(S\,e^{-qT}N(d_1) - K\,e^{-rT}N(d_2)\): shares worth of stock minus probable strike payment. \(N(d_2)\) is the risk-neutral probability of finishing in the money and \(e^{-qT}N(d_1)\) is delta. The model assumes constant volatility, no jumps, frictionless trading and European exercise; the market keeps the formula and corrects for those flaws through the volatility it plugs in.
:::

```quiz
- q: >-
    In the Worked Example, \(N(d_2)\) = {{ num(Nd2, 4) }} for the December 105 call. What does that number mean?
  choices:
    - >-
      The call moves {{ num(Nd2, 2) }} dollars for each dollar ACME moves
    - >-
      In the model's risk-neutral world, the call has a {{ pct(Nd2, 1) }} chance of finishing in the money
    - >-
      There is a {{ pct(Nd2, 1) }} chance that buying the call makes a profit
  answer: 1
  explain: >-
    \(N(d_2)\) is the risk-neutral probability that ACME finishes above $105. The call's sensitivity to the stock is delta, \(e^{-qT}N(d_1)\) = {{ num(g.delta, 3) }}, a different number. And finishing in the money is not the same as making a profit: you also need ACME above $105 plus the premium.
- q: >-
    Which input does *not* appear in the Black-Scholes formula?
  choices:
    - >-
      The dividend yield
    - >-
      The expected return of the stock
    - >-
      The risk-free rate
    - >-
      The volatility
  answer: 1
  explain: >-
    The formula grows the stock at the risk-free rate, not at its expected return, because an option can be copied with stock and cash at a cost that does not depend on that return. This is why two traders with opposite forecasts can agree on an option's price. The other three are all inputs.
- q: >-
    Your broker shows a {{ pct(lRN, 0) }} chance that a 394-day call finishes in the money. You expect the stock to return well above the risk-free rate. How should you read the number?
  choices:
    - >-
      As the real probability; the model already knows the expected return
    - >-
      As a risk-neutral probability, which understates the chance for a stock that grows faster than the risk-free rate
    - >-
      As an overstatement, because risk-neutral probabilities are always too high
  answer: 1
  explain: >-
    Displayed probabilities use the risk-free rate as the stock's growth. Over a year that matters: for the ACME 394-day 120 call, the risk-neutral probability is {{ pct(lRN, 1) }}, against {{ pct(lRW, 1) }} if ACME is expected to return 10%. The model does not know the expected return at all, and the direction of the error depends on whether your expected return is above or below the rate.
- q: >-
    For which ACME option does the European Black-Scholes price differ most from the American price?
  choices:
    - >-
      A 30-day put slightly out of the money
    - >-
      A 394-day put deep in the money
    - >-
      A 30-day call at the money, with no dividend before expiration
  answer: 1
  explain: >-
    Early exercise is valuable for deep in-the-money puts with a long life, because exercising collects the strike early and earns interest on it. The ACME 394-day 130 put is worth {{ usd(amer) }} American against {{ usd(euro) }} European. For the 30-day 95 put the gap is a fraction of a cent, and a call with no dividend ahead is never worth exercising early, so its American and European values agree.
```
