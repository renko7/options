---
title: "0DTE: the Greeks on the last day"
summary: Measure time in hours to see what gamma and theta do to an option on its expiration day, and why same-day options behave unlike anything else on the chain.
---

```calc
const hrs = (h) => h / 24 / 365;
const g = (S, K, T, type) => bs.greeks({ S, K, T, r: RATE, q: HBR.q, sigma: smileIV(HBR, K, T), type });
const T0 = hrs(6.5);
const T7 = 7 / 365;
const iv0 = smileIV(HBR, 5000, T0);
const iv7 = smileIV(HBR, 5000, T7);
const a0 = g(5000, 5000, T0, 'call');
const a7 = g(5000, 5000, T7, 'call');
const perHour = (x) => x.annual.theta / 365 / 24;
const a3 = g(5000, 5000, hrs(3), 'call');
const a1 = g(5000, 5000, hrs(1), 'call');
const up0 = g(5025, 5000, T0, 'call');
const up7 = g(5025, 5000, T7, 'call');
const em0 = 5000 * iv0 * Math.sqrt(T0);
const em7 = 5000 * iv7 * Math.sqrt(T7);
const gammaRatio = a0.gamma / a7.gamma;
const tradingT = bs.price({ S: 5000, K: 5000, T: 1 / 252, r: RATE, q: HBR.q, sigma: iv0, type: 'call' });
```

For most of an option's life, the Greeks change slowly enough that "delta about one half, losing a few dollars a day" is a useful description for a day or a week. On the last day, that stops being true. The same at-the-money option that barely moved a week ago can go from a coin flip to a certainty in a few points of the index, and lose a large part of its value in an hour. This Lesson measures that, using time in hours.

## Measuring time in hours

The pricing formulas use time in years. For an option with a week left, \( T = 7/365 \). For an option on its last day, with the 6.5-hour session ahead of it, a natural choice is to count those hours as calendar time:

\[ T = \frac{6.5}{24 \times 365} \approx {{ num(T0, 6) }} \text{ years.} \]

That is about {{ num(T7 / T0, 0) }} times shorter than a week. Because an option's time value scales roughly with \( \sqrt{T} \), and gamma with \( 1/\sqrt{T} \), the last day magnifies both.

## Gamma: delta becomes a switch

:::example HBR at-the-money call: one week left versus the last morning
HBR is at 5,000. Compare the 5,000 call with 7 days left and on the morning of its expiration day, 6.5 hours before the close. The chain's implied volatility is {{ pct(iv7) }} for the week and {{ pct(iv0) }} for the last day.

| | 7 days left | 6.5 hours left |
|---|---|---|
| Price (points) | {{ num(a7.price) }} | {{ num(a0.price) }} |
| Delta | {{ num(a7.delta) }} | {{ num(a0.delta) }} |
| Gamma (delta per point) | {{ num(a7.gamma, 4) }} | {{ num(a0.gamma, 4) }} |
| Delta if HBR rises 25 points to 5,025 | {{ num(up7.delta) }} | {{ num(up0.delta) }} |
| Expected one-standard-deviation move to expiration | about {{ num(em7, 0) }} points | about {{ num(em0, 0) }} points |

Gamma is about {{ num(gammaRatio, 0) }} times larger on the last morning. A 25-point move, half a percent, barely changes the weekly option's delta, but takes the same-day option from a coin flip to about {{ num(up0.delta) }}: nearly the full exposure of the index. In dollars, the same-day call went from {{ usd(a0.price * 100) }} to {{ usd(up0.price * 100) }} on that move; the weekly call from {{ usd(a7.price * 100) }} to {{ usd(up7.price * 100) }}.
:::

That is what traders mean when they say [[0DTE]] options have "explosive gamma". Near the strike, a same-day option behaves like a switch: small index moves flip it between nearly worthless and nearly all intrinsic value. For a holder that is cheap, fast leverage. For a writer it means the position's delta can change sign and size within minutes, so a hedge set at 10:00 can be wrong by 10:15.

Move the sliders below. Set Expiration 1 to 1 day and compare the gamma curve with the 7- and 30-day curves: the same strike, but a far taller and narrower spike. The tool's shortest setting is one day; the last hours of an expiration day are more extreme still.

```tool greeks-explorer
{ greek: 'gamma', type: 'call', K: 5000, S: 5000, iv: iv0, q: HBR.q, dtes: [1, 7, 30] }
```

## Theta: decay by the hour

A per-day theta is meaningless for an option that has less than a day to live. Measure it per hour instead.

:::example How the at-the-money call decays through its last day
If HBR stays exactly at 5,000, the 5,000 call is worth:

- {{ num(a0.price) }} points at the open (6.5 hours left), decaying at about {{ num(-perHour(a0)) }} points an hour;
- {{ num(a3.price) }} points with 3 hours left, decaying at about {{ num(-perHour(a3)) }} points an hour;
- {{ num(a1.price) }} points with 1 hour left, decaying at about {{ num(-perHour(a1)) }} points an hour;
- zero at the close.

Its "theta per day" at the open is {{ num(a0.theta) }} points, more than the whole option is worth: the per-day number assumes a full day of decay the option does not have. The weekly call's theta, by comparison, is {{ num(a7.theta) }} points a day, about {{ num(-perHour(a7)) }} an hour.
:::

The decay accelerates as the close approaches, because theta for an at-the-money option grows like \( 1/\sqrt{T} \). For a buyer, every hour without a move costs more than the hour before. For a seller, the last hours pay the most, in exchange for carrying the largest gamma.

## Vega: small on the last day

Vega scales with \( \sqrt{T} \), so it shrinks as expiration approaches, the opposite of gamma and theta. The at-the-money HBR call's vega is {{ num(a7.vega) }} points per volatility point with a week left, but only {{ num(a0.vega) }} on the last morning. A five-point jump in implied volatility would add about {{ num(5 * a0.vega) }} points to the same-day option, against the {{ num(up0.price - a0.price) }} points a 25-point index move adds.

So a same-day option is mostly a bet on how far the index actually moves in the next few hours (realized volatility) against how much decay you pay for it. Implied volatility still matters, because it sets the price you pay or receive at entry, but once you hold the position, changes in it move your profit and loss far less than moves in the index do. That is very different from a 30-day option, whose value can swing on a change in implied volatility with the index standing still, as [Implied volatility](#core-06) showed.

## A caveat on the clock

Counting the session's 6.5 hours as calendar time is one convention. Many desks instead measure options in *trading time*, treating each trading day as an equal share of the year's volatility (\( 1/252 \) of a year for a full session) because most price movement happens while markets are open. On that convention, the same call at the same {{ pct(iv0) }} volatility is worth {{ num(tradingT) }} points at the open instead of {{ num(a0.price) }}. Neither is "right"; what matters is that you compare implied volatilities measured the same way. Quoted 0DTE implied volatilities depend heavily on the time convention a platform uses, which is why the same option can show very different implied volatilities on two platforms.

:::rule Daily expirations (as of 2026)
SPX and XSP options have expirations every weekday, Monday to Friday, so a same-day (0DTE) option exists on every trading day. Options on SPY and a few other large ETFs also expire every weekday. Single-stock options generally have fewer expirations: standard monthlies and, for many actively traded stocks, Friday weeklies. Exchanges add and change expirations; check the chain.
:::

:::key
On its last day an option's time is measured in hours, and that magnifies gamma and theta. An at-the-money HBR call with 6.5 hours left has about {{ num(gammaRatio, 0) }} times the gamma of a one-week call, so a half-percent move nearly turns it into the index itself, and it decays by the hour, faster toward the close. Per-day theta is meaningless for a same-day option, and implied volatility depends on the time convention used.
:::

```quiz
- q: >-
    HBR is at 5,000. The 5,000 call has 6.5 hours left and a delta of {{ num(a0.delta) }}. HBR rises 25 points. Roughly what is the call's delta now?
  choices:
    - >-
      About {{ num(a0.delta) }}; 25 points is a small move
    - >-
      About {{ num(up0.delta) }}
    - >-
      Exactly 1.00
  answer: 1
  explain: >-
    With gamma of {{ num(a0.gamma, 4) }} per point at this stage, a 25-point move shifts delta to about {{ num(up0.delta) }}. For a weekly option the same move would barely change delta ({{ num(up7.delta) }}), which is why the "small move" intuition fails on the last day. Delta reaches exactly 1.00 only at expiration once the call is in the money.
- q: >-
    At the open, the at-the-money HBR call is worth {{ num(a0.price) }} points and its per-day theta is {{ num(a0.theta) }}. What is the right reading?
  choices:
    - >-
      It will lose {{ num(-a0.theta) }} points today
    - >-
      Per-day theta assumes a full day the option does not have; measure decay per hour, about {{ num(-perHour(a0)) }} points now and faster later
    - >-
      Theta is positive for long options on their last day
  answer: 1
  explain: >-
    The option can lose at most its {{ num(a0.price) }} points of value, so a per-day theta larger than that is an artifact of the units. Hourly theta is the useful measure, and it rises toward the close. Theta is negative for a long option on every day, including the last.
- q: >-
    Why do short 0DTE positions need closer watching than the same strikes one week out?
  choices:
    - >-
      Their gamma is much larger, so their delta can swing sharply on a modest index move
    - >-
      Same-day options cannot be closed before expiration
    - >-
      They are American-style
  answer: 0
  explain: >-
    Gamma for the same-day at-the-money option is about {{ num(gammaRatio, 0) }} times the weekly option's, so a short position's exposure can grow from small to large within minutes. Same-day options trade until 4:00 p.m. ET and can be closed any time before then, and SPX-style index options are European.
- q: >-
    Two platforms show very different implied volatilities for the same 0DTE option at the same price. What is the most likely reason?
  choices:
    - >-
      One platform has stale prices
    - >-
      They measure the time remaining differently (calendar hours versus trading time, for example)
    - >-
      Implied volatility cannot be calculated on expiration day
  answer: 1
  explain: >-
    With so little time left, the time convention dominates the calculation: the same price implies a much lower volatility if more time is assumed to remain. Stale data is possible but is not the usual cause. Implied volatility can be calculated on the last day; it just needs a stated clock.
```
