---
title: IV rank, IV percentile and the expected move
summary: Judge whether today's implied volatility is high or low for a given stock, and turn implied volatility into the move the market is pricing.
---

```calc
const ivNow = ACME.iv;
const lo = 0.22, hi = 0.55;
const rank = (ivNow - lo) / (hi - lo);
const daysBelow = 171, daysTotal = 252;
const pctile = daysBelow / daysTotal;
const hiNoSpike = 0.36;
const rankNoSpike = (ivNow - lo) / (hiNoSpike - lo);
const T30 = 30 / 365;
const sd30 = 100 * ivNow * Math.sqrt(T30);
const o = { S: 100, T: T30, r: RATE, q: ACME.q, sigma: ivNow };
const inside = 1 - bs.probITM({ ...o, K: 100 + sd30, type: 'call' }) - bs.probITM({ ...o, K: 100 - sd30, type: 'put' });
const r30 = chain(ACME, { dte: 30 }).rows.find((x) => x.strike === 100);
const strad30 = r30.call.mid + r30.put.mid;
const r9 = chain(ACME, { dte: 9 }).rows.find((x) => x.strike === 100);
const iv9 = r9.call.iv;
const sd9 = 100 * iv9 * Math.sqrt(9 / 365);
const strad9 = r9.call.mid + r9.put.mid;
const sdDay = 100 * ivNow / Math.sqrt(252);
```

"Is 30% implied volatility high?" has no answer on its own. For a utility it would be extreme; for a small biotech company it would be unusually calm. Traders answer the question in two ways: by comparing implied volatility with the stock's own history, and by translating it into a dollar move and asking whether that move seems too big or too small. This Lesson covers both.

## IV rank

[[IV rank]] places today's implied volatility within its range over the past year:

\[ \text{IV rank} = \frac{\text{IV now} - \text{52-week low} }{\text{52-week high} - \text{52-week low} } . \]

It runs from 0% (implied volatility is at its lowest of the year) to 100% (at its highest).

:::example ACME's IV rank
Over the past 52 weeks ACME's 30-day implied volatility has ranged from a low of {{ pct(lo, 0) }} to a high of {{ pct(hi, 0) }}, reached for a few days during a market sell-off in the spring. Today it is {{ pct(ivNow, 0) }}.

\[ \text{IV rank} = \frac{ {{ num(ivNow * 100, 0) }} - {{ num(lo * 100, 0) }} }{ {{ num(hi * 100, 0) }} - {{ num(lo * 100, 0) }} } = {{ pct(rank, 1) }} . \]

By this measure ACME's options are cheap: implied volatility sits in the bottom quarter of its range.
:::

The weakness is visible in the example. IV rank uses only two numbers from the whole year, and one of them came from a few unusual days. If the spring sell-off had never happened and the year's high had been {{ pct(hiNoSpike, 0) }}, the same {{ pct(ivNow, 0) }} would have an IV rank of {{ pct(rankNoSpike, 0) }}. One spike moved the measure by {{ num((rankNoSpike - rank) * 100, 0) }} points without anything changing today.

## IV percentile

[[IV percentile]] uses every day instead of two: it is the share of days in the past year on which implied volatility closed *below* today's level.

:::example ACME's IV percentile
Of the last {{ int(daysTotal) }} trading days, ACME's 30-day implied volatility closed below {{ pct(ivNow, 0) }} on {{ int(daysBelow) }}. Its IV percentile is {{ int(daysBelow) }} / {{ int(daysTotal) }} = **{{ pct(pctile, 1) }}**.

So the same {{ pct(ivNow, 0) }} has an IV rank of {{ pct(rank, 0) }} and an IV percentile of {{ pct(pctile, 0) }}. The percentile says implied volatility today is higher than on about two days in three over the past year, which is a fairer picture of a year that was mostly calm with one short spike.
:::

Brokers use both terms, sometimes loosely, and occasionally swap them. Check the definition on your platform before acting on the number.

:::warning What IV rank does not tell you
High IV rank does not by itself mean options are overpriced, and low IV rank does not mean they are cheap. Both compare implied volatility with *past implied volatility*, not with the volatility the stock will actually deliver. IV rank is always high just before an earnings report, because the market correctly expects a big move; selling options then is a decision about the size of that move, not a free edge. Use IV rank and percentile as context, and compare implied volatility with your own estimate of [realized volatility](#core-06-realized-volatility) before calling options rich or cheap.
:::

## The expected move

The second way to make implied volatility concrete is to turn it into dollars. Over \(T\) years, a typical (one standard deviation) move is about \(\sigma\sqrt{T}\) as a fraction of the price, so the [[expected move]] in dollars is

\[ \text{expected move} \approx S \times \sigma \times \sqrt{T} . \]

For ACME, 30 days out at {{ pct(ivNow, 0) }}: \(100 \times 0.30 \times \sqrt{30/365}\) = **{{ usd(sd30) }}**. The options market is pricing a December range of roughly {{ usd(100 - sd30) }} to {{ usd(100 + sd30) }}. In the model's risk-neutral world, the chance that ACME finishes inside that range is {{ pct(inside, 0) }}, about two in three, as you would expect for one standard deviation.

For a single day, use trading days: \(100 \times 0.30 / \sqrt{252}\) = {{ usd(sdDay) }}. For the weekly expiring November 27 (9 days, implied volatility {{ pct(iv9, 1) }}), the expected move is {{ usd(sd9) }}.

## The straddle shortcut

Traders often read the expected move straight off the chain instead: they add the at-the-money call and put. An at-the-money [[straddle]] pays the distance between the stock and the strike at expiration, in either direction, so its price is the market's price for the size of the move.

:::derivation What the straddle price measures
At expiration a straddle struck at \(K\) is worth

\[ \max(S_T - K, 0) + \max(K - S_T, 0) = |S_T - K| , \]

because exactly one of the two terms is non-zero (or both are zero at \(S_T = K\)). So holding a straddle to expiration pays the absolute distance the stock finished from the strike. Its fair price is that distance averaged over every outcome the market considers possible, discounted to today. For an at-the-money straddle, that is the market's price for the *average* size of the move.
:::

The average size of a move is smaller than one standard deviation. For bell-shaped moves the ratio is close to 0.8 (it is \(\sqrt{2/\pi}\); showing that needs calculus). That matches the rule from [Time value and decay](#core-04-time-value): each at-the-money option is worth about \(0.4\,S\,\sigma\sqrt{T}\), so the pair is worth about \(0.8\,S\,\sigma\sqrt{T}\).

:::example Two ways to read the December move
The December 100 call's mid is {{ usd(r30.call.mid) }} and the put's is {{ usd(r30.put.mid) }}. The straddle costs {{ usd(strad30) }}.

- The straddle price, {{ usd(strad30) }}, is the market's price for the *average* December move.
- The one-standard-deviation move is {{ usd(sd30) }}, and {{ usd(strad30) }} ÷ {{ usd(sd30) }} = {{ num(strad30 / sd30, 2) }}, close to 0.8.

A buyer of the straddle breaks even at expiration if ACME finishes more than {{ usd(strad30) }} from $100, that is, below {{ usd(100 - strad30) }} or above {{ usd(100 + strad30) }}. A seller profits inside that range.

For the 9-day weekly, the straddle costs {{ usd(strad9) }} against a one-standard-deviation move of {{ usd(sd9) }}.
:::

Platforms label different numbers "expected move": some show the straddle price, some a fixed fraction of it, some the \(S\sigma\sqrt{T}\) formula. They differ by about 25%, which matters when you compare a forecast against them. Know which one you are looking at.

Here is the December straddle. The two break-evens at expiration sit one straddle price either side of the strike.

```tool position-builder
{ title: 'Long one ACME December 100 straddle', legs: [{ kind: 'call', qty: 1, strike: 100, premium: r30.call.mid, dte: 30, iv: r30.call.iv }, { kind: 'put', qty: 1, strike: 100, premium: r30.put.mid, dte: 30, iv: r30.put.iv }], range: [80, 120] }
```

:::practice Using the expected move
Traders compare the expected move with what they think will happen. Before an earnings report, the straddle on the expiration just after it shows the move the market is charging for; the stock's past earnings moves show what it has tended to deliver. Sellers of premium often place short strikes outside the one-standard-deviation range; buyers ask whether their target is far enough beyond the straddle price to pay for it.
:::

:::key
IV rank places today's implied volatility in its 52-week high–low range; IV percentile counts the share of past days below today's level and is less distorted by spikes. Neither compares implied with future realized volatility. The expected move is about \(S\sigma\sqrt{T}\) for one standard deviation; the at-the-money straddle prices the average move, about 0.8 times that.
:::

```quiz
- q: >-
    A stock's implied volatility is 40%. Its 52-week low was 25% and high was 85%. What is its IV rank?
  choices:
    - >-
      {{ pct((0.40 - 0.25) / (0.85 - 0.25), 0) }}
    - >-
      {{ pct(0.40 / 0.85, 0) }}
    - >-
      40%
  answer: 0
  explain: >-
    IV rank = (40 − 25) ÷ (85 − 25) = 15 ÷ 60 = {{ pct((0.40 - 0.25) / (0.85 - 0.25), 0) }}. Dividing 40 by the high ignores the low end of the range. The implied volatility itself, 40%, is not a rank at all.
- q: >-
    One stock has an IV rank of 20% and an IV percentile of 70%. What is the most likely explanation?
  choices:
    - >-
      The two measures are calculated from different stocks
    - >-
      A brief spike in the past year set a high 52-week maximum, pulling the rank down while most days were still below today's level
    - >-
      Implied volatility is about to rise
  answer: 1
  explain: >-
    IV rank depends only on the year's high and low, so one short spike stretches the range and makes today look low. IV percentile counts all the days, and finds today higher than 70% of them. Neither measure predicts the next move in implied volatility.
- q: >-
    ACME is at $100 with 30% implied volatility. What is the one-standard-deviation expected move over the 30 days to December?
  choices:
    - >-
      {{ usd(100 * 0.30 * 30 / 365) }}
    - >-
      {{ usd(sd30) }}
    - >-
      $30.00
  answer: 1
  explain: >-
    \(100 \times 0.30 \times \sqrt{30/365}\) = {{ usd(sd30) }}. Multiplying by 30/365 without the square root gives {{ usd(100 * 0.30 * 30 / 365) }}, which treats moves as growing in proportion to time. $30 is the one-year figure.
- q: >-
    The ACME December 100 straddle costs {{ usd(strad30) }}. At expiration, where does a buyer who holds it break even?
  choices:
    - >-
      At {{ usd(100 - sd30) }} and {{ usd(100 + sd30) }}
    - >-
      At {{ usd(100 - strad30) }} and {{ usd(100 + strad30) }}
    - >-
      At $100 only
  answer: 1
  explain: >-
    At expiration the straddle is worth the distance from $100, so the buyer needs ACME more than {{ usd(strad30) }} away from the strike, in either direction. The {{ usd(sd30) }} figure is the one-standard-deviation move, about {{ num(sd30 / strad30, 2) }} times the straddle price, not the break-even. At $100 exactly, both options expire worthless and the buyer loses the whole premium.
```
