---
title: Realized volatility and the volatility risk premium
summary: Compute a stock's realized volatility from daily closes, compare it with implied volatility, and explain why option sellers are paid on average and pay in the tails.
---

```calc
const closes = [100.00, 101.60, 100.50, 98.60, 99.50, 101.40, 103.00, 101.90, 100.30, 101.20, 99.20, 97.70, 98.80, 100.80, 102.30, 101.30, 103.10, 101.70, 100.20, 99.30, 100.00];
const rets = closes.slice(1).map((x, i) => Math.log(x / closes[i]));
const n = rets.length;
const mean = rets.reduce((a, b) => a + b, 0) / n;
const ss = rets.reduce((a, b) => a + (b - mean) ** 2, 0);
const dailySd = Math.sqrt(ss / (n - 1));
const rv = dailySd * Math.sqrt(252);
const rvZero = Math.sqrt(rets.reduce((a, b) => a + b * b, 0) / n * 252);
const env = { r: RATE, q: ACME.q };
const row = chain(ACME, { dte: 30 }).rows.find((x) => x.strike === 100);
const strad = [{ kind: 'call', qty: -10, strike: 100, premium: row.call.theo, dte: 30, iv: row.call.iv }, { kind: 'put', qty: -10, strike: 100, premium: row.put.theo, dte: 30, iv: row.put.iv }];
const g = payoff.positionGreeks(strad, 100, 0, env);
const iv = row.call.iv;
const edge = 0.5 * -g.gamma * 100 * 100 * (iv * iv - rv * rv) / 365;
const gap = 8;
const gapLoss = 0.5 * -g.gamma * gap * gap - g.theta;
```

Implied volatility is what the market charges. [[Realized volatility]] is what the stock actually delivers: the volatility you measure, after the fact, from its price moves. An option trader's long-run result depends on the gap between the two. This Lesson shows how to compute realized volatility, how it compares with implied volatility on average, and why the comparison favours option sellers most of the time and punishes them some of the time.

## Computing realized volatility

The recipe has three steps.

1. **Daily returns.** For each day, take the closing price divided by the previous close and take the natural logarithm: \(R_t = \ln(P_t / P_{t-1})\). For small moves this is almost the same as the percentage change; logs are used because they add up neatly across days.
2. **Standard deviation.** Compute the sample standard deviation of those returns: subtract their average from each, square, add up, divide by one less than the number of returns, and take the square root.
3. **Annualize.** Multiply by \(\sqrt{252}\), the square root of the number of trading days in a year. This is the square-root-of-time rule from [Time value and decay](#core-04-time-value): daily variances add, so a year's standard deviation is the daily one times the square root of the number of days.

\[ \sigma_{\text{realized} } = \sqrt{252} \times \sqrt{\frac{1}{n-1}\sum_{t=1}^{n} (R_t - \bar R)^2} \]

:::example ACME's last 21 closes
Here are ACME's closing prices over the last 21 trading days, ending today at $100.00, and the daily log returns:

| Day | Close | Daily return |
|---|---|---|
{{ closes.map((c, i) => `| ${i} | ${usd(c)} | ${i === 0 ? '' : pct(rets[i - 1], 2)} |`).join('\n') }}

- Number of returns: {{ int(n) }}
- Average return: {{ pct(mean, 3) }} (ACME ended where it started)
- Sum of squared deviations: {{ num(ss, 6) }}
- Daily standard deviation: \(\sqrt{ {{ num(ss, 6) }} / {{ int(n - 1) }} }\) = {{ pct(dailySd, 2) }}
- Annualized: {{ pct(dailySd, 2) }} × \(\sqrt{252}\) = **{{ pct(rv, 1) }}**

So over the last month ACME has moved like a stock with {{ pct(rv, 1) }} volatility. Its options are priced at {{ pct(iv, 0) }}.
:::

:::note Choices that change the number
Realized volatility is a measurement, and the way you measure changes it.

- **Window.** Ten days reacts fast and is noisy; 60 or 90 days is smoother and slower. Traders usually look at several at once.
- **Mean.** Many desks assume the average daily return is zero and skip subtracting it, because over short windows the average is noise. Here that gives {{ pct(rvZero, 1) }}.
- **Close to close.** Using only closing prices ignores what happened during the day. Measures that also use the open, high and low exist and are more precise.
- **252 versus 365.** Realized volatility is annualized over trading days. The option formulas in this Course count time in calendar days. Both end up as an annual volatility, so they can be compared, but a weekend counts as one trading-day return in the first and three days of time in the second.
:::

Realized volatility is also called historical volatility, and broker platforms often show it beside implied volatility. The comparison is useful, with one caution: the realized volatility that matters for an option you hold is the volatility *from now until expiration*, which is not yet known. The past month is evidence, not the answer.

## Implied versus realized: the volatility risk premium

If implied volatility were a fair forecast, it would be too high about half the time and too low about half the time. Decades of data on US index options say otherwise. Implied volatility has been, on average, a few points *above* the realized volatility that followed, most of the time. The gap is called the **volatility risk premium**.

It exists for the same reason insurance premiums exceed the average claim. Investors want protection against crashes and pay for it, mostly by buying index puts. Whoever sells that protection takes on a risk that is small most days and enormous on a few, and demands to be paid for it. The premium is larger for index options than for single stocks, and it is not guaranteed: in a crash, realized volatility can exceed the implied volatility sold weeks earlier many times over.

How does that turn into profit or loss? [Estimating P&L with the Greeks](#core-05-greek-pnl) showed that a delta-hedged option position breaks even when the stock moves one day's standard deviation at the implied volatility. Put the two volatilities in and you get the daily edge.

:::derivation The daily edge of a hedged option
Use the per-day gamma–theta relationship from Module 5 for a delta-hedged long option position with gamma \(\Gamma\) (in shares):

\[ \text{P\&L for one day} \approx \tfrac12\,\Gamma\,dS^2 + \Theta , \qquad \Theta \approx -\tfrac12\,\sigma_{\text{implied} }^2\,S^2\,\Gamma / 365 . \]

If the stock moves at the realized volatility, the typical squared daily move is

\[ dS^2 \approx \sigma_{\text{realized} }^2\,S^2 / 365 . \]

Substitute both:

\[ \text{P\&L for one day} \approx \tfrac12\,\Gamma\,\frac{\sigma_{\text{realized} }^2 S^2}{365} - \tfrac12\,\Gamma\,\frac{\sigma_{\text{implied} }^2 S^2}{365} = \frac{\Gamma\,S^2}{2 \times 365}\left(\sigma_{\text{realized} }^2 - \sigma_{\text{implied} }^2\right) . \]

The option holder makes money on average when realized volatility exceeds implied volatility; the seller (whose \(\Gamma\) is negative) when it falls short. The edge depends on the difference of the *squares* of the volatilities, and it is scaled by the position's gamma.
:::

:::example Selling the premium, and paying for it
You sell 10 ACME December 100 straddles at {{ pct(iv, 0) }} implied volatility and delta-hedge them daily. The position's gamma is {{ num(g.gamma, 1) }} shares per $1 and its theta is {{ signedUsd(g.theta) }} a day.

**An ordinary day.** If ACME keeps moving the way it has over the last month, at {{ pct(rv, 1) }} realized volatility, the formula above gives an expected edge of about

\[ \frac{ {{ num(-g.gamma, 1) }} \times 100^2}{2 \times 365} \times \left({{ num(iv, 2) }}^2 - {{ num(rv, 3) }}^2\right) = {{ num(edge) }} \]

That is about {{ usd(edge) }} a day in the seller's favour.

**A bad day.** Now suppose ACME gaps {{ usd(gap) }} overnight on unexpected news, before you can re-hedge. The gamma loss is \(\tfrac12 \times {{ num(-g.gamma, 1) }} \times {{ int(gap) }}^2\) = {{ usd(0.5 * -g.gamma * gap * gap) }}, offset by one day's theta, for a net loss of about {{ usd(gapLoss) }}. That one day wipes out roughly {{ num(gapLoss / edge, 0) }} ordinary days of edge.

This is the shape of selling volatility: many small gains and occasional large losses. Over a long record it has paid on average, and the average hides the days that decide whether a seller survives.
:::

The simulator below delta-hedges a short option along a simulated price path. Set the realized volatility below the implied and run several paths: the short position usually makes money. Set it above, or keep running until a path with a big jump appears, and watch how quickly the gains reverse.

```tool hedge-sim
{ K: 100, dte: 30, iv: 0.30, realized: 0.24, hedge: 'daily', side: 'short', seed: 7 }
```

:::warning The premium is not a free lunch
"Implied volatility is usually too high, so selling options wins" is true on average and dangerous as a plan. The losses arrive in clusters, when markets fall and volatility jumps everywhere at once, and they are largest exactly when you would most like to reduce risk. Size short-volatility positions for the bad day, not the average day; [Managing trades](#core-12) covers sizing.
:::

:::key
Realized volatility is the annualized standard deviation of daily log returns: daily standard deviation × \(\sqrt{252}\). Implied volatility has historically sat above the realized volatility that followed, a volatility risk premium that option sellers earn on average. A delta-hedged position earns about \(\tfrac{\Gamma S^2}{730}(\sigma_{\text{realized} }^2 - \sigma_{\text{implied} }^2)\) a day, and rare large moves can erase months of that edge.
:::

```quiz
- q: >-
    A stock's daily returns over the last month have a standard deviation of 2.0%. What is its annualized realized volatility?
  choices:
    - >-
      About {{ pct(0.02 * 12, 0) }}
    - >-
      About {{ pct(0.02 * Math.sqrt(252), 0) }}
    - >-
      About {{ pct(0.02 * 252, 0) }}
  answer: 1
  explain: >-
    Annualize with the square root of trading days: 2.0% × \(\sqrt{252}\) = 2.0% × {{ num(Math.sqrt(252), 2) }} = {{ pct(0.02 * Math.sqrt(252), 1) }}. {{ pct(0.02 * 252, 0) }} multiplies by 252 instead of its square root, as if moves added up in proportion to time. {{ pct(0.02 * 12, 0) }} is 2.0% × 12, which scales by the number of months in a year; a daily standard deviation scales by the square root of the number of trading days.
- q: >-
    ACME's options trade at {{ pct(iv, 0) }} implied volatility and its realized volatility over the past month is {{ pct(rv, 1) }}. Which statement is correct?
  choices:
    - >-
      ACME's options are guaranteed to be overpriced
    - >-
      If ACME keeps moving as it has, a delta-hedged seller of its options would tend to make money
    - >-
      Implied volatility will fall to {{ pct(rv, 1) }} by expiration
  answer: 1
  explain: >-
    With realized volatility below implied, the gamma a hedged seller gives up each day is smaller than the theta collected, so the seller tends to profit. Nothing is guaranteed, though: the realized volatility that matters is the one *until expiration*, and one large move can change the result. Implied volatility is not required to converge to past realized volatility.
- q: >-
    Why has implied volatility on index options tended to exceed the volatility that followed?
  choices:
    - >-
      Because the Black-Scholes model overprices every option
    - >-
      Because investors pay up for crash protection and sellers demand compensation for tail risk
    - >-
      Because realized volatility is computed with 252 days and implied volatility with 365
  answer: 1
  explain: >-
    The volatility risk premium is a price for bearing crash risk, much like the margin built into insurance premiums. The model is only the translator between prices and volatilities; it is the market price that is high. The 252 versus 365 convention changes how each is annualized, not the systematic gap.
- q: >-
    A delta-hedged short straddle earns about {{ usd(edge) }} a day on average. Which event would hurt it most?
  choices:
    - >-
      Twenty quiet trading days in a row
    - >-
      A single overnight gap of {{ usd(gap) }} in the stock
    - >-
      A small rise in interest rates
  answer: 1
  explain: >-
    Short gamma loses \(\tfrac12\Gamma\,dS^2\), which grows with the *square* of the move. One {{ usd(gap) }} gap costs about {{ usd(gapLoss) }}, many weeks of average edge. Quiet days are what the seller hopes for. Interest rates barely affect a 30-day position.
```
