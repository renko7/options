---
title: Term structure and VIX
summary: Read how implied volatility changes with time to expiration, compute the volatility the market implies between two expirations, and interpret the VIX index.
---

```calc
const dtes = EXPIRATIONS.map((e) => e.dte);
const atmIv = (u, d) => smileIV(u, u.spot, d / 365);
const s30 = atmIv(ACME, 30), s58 = atmIv(ACME, 58);
const fwd = Math.sqrt((s58 * s58 * 58 - s30 * s30 * 30) / (58 - 30));
const v30 = s30 * s30 * 30 / 365, v58 = s58 * s58 * 58 / 365;
const vixLike = 0.20;
const mv30 = vixLike * Math.sqrt(30 / 365);
const mvDay = vixLike / Math.sqrt(252);
const hbr30 = atmIv(HBR, 30);
```

The [previous Lesson](#core-06-skew-and-smile) looked at implied volatility across strikes for one expiration. This one looks across expirations for one strike, the at-the-money strike. That curve, implied volatility against time to expiration, is the [[term structure]] of volatility. Its shape tells you what the market thinks about the near future compared with the long run, and it is the shape behind the most watched number in options, the VIX.

## ACME's term structure

The at-the-money implied volatility of each listed ACME expiration, with ACME at $100:

| Days to expiration | {{ dtes.join(' | ') }} |
|---|{{ dtes.map(() => '---').join('|') }}|
| ACME | {{ dtes.map((d) => pct(atmIv(ACME, d), 1)) .join(' | ') }} |
| HBR | {{ dtes.map((d) => pct(atmIv(HBR, d), 1)).join(' | ') }} |

Both curves rise with time to expiration: short-dated options carry lower implied volatility than long-dated ones. This upward slope is the normal state in calm markets, and traders often call it contango (a word borrowed from futures markets).

The reason is that volatility tends to revert to a long-run average. When markets have been calm, short-dated implied volatility reflects that calm, while long-dated implied volatility stays nearer the average of calm and turbulent periods, plus a premium for the chance that something changes over a long horizon.

```tool vol-surface
{ underlying: 'ACME', view: 'term' }
```

## When the curve inverts

In a sell-off the curve flips. Short-dated implied volatility jumps, often by many points in a day, while long-dated implied volatility rises only a little, because the market expects the turmoil to fade. The curve then slopes *down*: inverted, or in backwardation. An inverted term structure is one of the clearest signs of market stress, and it usually reverts to upward-sloping as the stress passes.

Two consequences for positions:

- Short-dated implied volatility moves much more than long-dated. A 2-point move in one-year volatility often comes with a much larger move at one month. That is why vega alone overstates the volatility risk of long-dated options relative to short-dated ones, as [Vega and rho](#core-05-vega-and-rho) noted.
- Trades that buy one expiration and sell another, such as [[calendar spreads|calendar spread]], are bets on the shape of this curve, not only on its level.

## The volatility between two expirations

Because variance adds across time, the term structure contains a hidden forecast: the volatility the market implies for the period *between* two expirations.

:::derivation Forward volatility
Write the total implied variance to an expiration as \(\sigma^2 T\): the square of its implied volatility times its time in years. If the period to the first expiration \(T_1\) and the period from \(T_1\) to \(T_2\) are independent, their variances add:

\[ \sigma_2^2\,T_2 = \sigma_1^2\,T_1 + \sigma_{1\to2}^2\,(T_2 - T_1) , \]

where \(\sigma_{1\to2}\) is the volatility implied for the period between them. Solve for it:

\[ \sigma_{1\to2} = \sqrt{\frac{\sigma_2^2\,T_2 - \sigma_1^2\,T_1}{T_2 - T_1} } . \]
:::

:::example December to January
The December expiration (30 days) has an at-the-money implied volatility of {{ pct(s30, 2) }}; the January expiration (58 days) has {{ pct(s58, 2) }}.

- Total variance to December: \({{ num(s30, 4) }}^2 \times 30/365\) = {{ num(v30, 5) }}
- Total variance to January: \({{ num(s58, 4) }}^2 \times 58/365\) = {{ num(v58, 5) }}
- Forward volatility for the 28 days between them:

\[ \sqrt{\frac{ {{ num(v58, 5) }} - {{ num(v30, 5) }} }{28/365} } = {{ pct(fwd, 1) }} . \]

The market is charging {{ pct(fwd, 1) }} for the period from mid-December to mid-January, above both quoted volatilities, because the January number averages a cheaper first month with a dearer second month. Something in that second month is being charged for: ACME reports earnings after the close on {{ longDate(ACME_EARNINGS) }}, three days before the January options expire.
:::

Total variance must not fall as expiration gets further away: a longer option includes all the uncertainty of a shorter one. If a quoted term structure ever implied negative forward variance, a calendar spread would lock in an arbitrage. In practice the check is more useful in the other direction: when one expiration's forward volatility jumps far above its neighbours', that expiration contains an event. The [next Lesson](#core-06-earnings-and-the-crush) uses exactly this to measure what the market charges for an earnings report.

## VIX: an index of implied volatility

The [[VIX]] is an index published by Cboe that measures the 30-day implied volatility of the S&P 500, computed from SPX option prices. It is quoted in volatility points: a VIX of 20 means the SPX options market is pricing about 20% annualized volatility over the next 30 days. Because it is a single number, it has become the market's shorthand for fear.

:::rule How VIX is calculated (as of 2026)
Cboe computes VIX in real time from the prices of out-of-the-money SPX puts and calls across a wide range of strikes, using standard and weekly SPX expirations with more than 23 and fewer than 37 days to expiration, and interpolates between the two expirations used to a constant 30-day horizon. Because it uses a whole strip of strikes rather than only the at-the-money option, it is a measure of 30-day implied *variance* expressed as a volatility, and the skew pushes it above at-the-money SPX implied volatility in most markets. The full methodology is in [Variance swaps and VIX](#advanced-07).
:::

You cannot buy the VIX index itself. Exposure comes through VIX futures and VIX options, which settle to a special value derived from SPX option prices on the settlement morning, and through exchange-traded products that hold VIX futures.

:::rule VIX futures and options (as of 2026)
VIX options are European-style and cash-settled. VIX futures and options settle on a Wednesday, normally 30 days before the following month's standard SPX expiration, to a Special Opening Quotation calculated from the opening prices of the SPX options used in the index that morning. A VIX option is priced off the VIX future for its expiration, not off the spot VIX index.
:::

## Reading a VIX number

Use the same tools as for any implied volatility. Suppose a VIX-style index reads {{ num(vixLike * 100, 0) }}:

- the one-standard-deviation move over the next 30 days is about {{ num(vixLike * 100, 0) }}% × \(\sqrt{30/365}\) = {{ pct(mv30, 1) }};
- a typical daily move is about {{ num(vixLike * 100, 0) }}% ÷ \(\sqrt{252}\) = {{ pct(mvDay, 2) }}. Traders often round \(\sqrt{252}\) to 16 for this ("the rule of 16").

For the Harbor 100, at-the-money 30-day implied volatility is {{ pct(hbr30, 0) }}: a typical daily move of about {{ pct(hbr30 / Math.sqrt(252), 2) }}, or {{ int(5000 * hbr30 / Math.sqrt(252)) }} index points.

:::warning VIX products are not the VIX
VIX futures usually trade above the spot VIX when the term structure slopes upward, and drift down toward it as they approach settlement. Exchange-traded products that hold VIX futures and roll them each month buy the higher-priced longer contract and let it fall, so in calm markets they lose value steadily even if the VIX itself does not move. They are short-term trading tools, not long-term hedges; [Variance swaps and VIX](#advanced-07) explains the mechanics.
:::

:::key
The term structure is at-the-money implied volatility by expiration. It normally slopes up in calm markets and inverts in stress, and short-dated implied volatility moves far more than long-dated. Variance adds across time, so the volatility implied between two expirations is \(\sqrt{(\sigma_2^2T_2 - \sigma_1^2T_1)/(T_2 - T_1)}\). VIX is Cboe's 30-day implied-volatility index for the S&P 500, computed from a strip of SPX options; it is traded only through futures, options and products built on them.
:::

```quiz
- q: >-
    The market sells off hard. What is the most likely change in the shape of ACME's term structure?
  choices:
    - >-
      All expirations rise by the same number of points
    - >-
      Short-dated implied volatility rises much more than long-dated, and the curve may invert
    - >-
      Long-dated implied volatility rises the most, because the uncertainty lasts longer
  answer: 1
  explain: >-
    In stress, near-term uncertainty is what spikes, and the market expects volatility to revert later, so the short end jumps and the long end moves less. That can flip the normal upward slope into an inverted curve. Long-dated volatility does rise, but by less, which is why a uniform shift is a poor assumption.
- q: >-
    A 30-day option has 20% implied volatility and a 60-day option has 25%. What volatility does the market imply for days 30 to 60?
  choices:
    - >-
      {{ pct(Math.sqrt((0.25 * 0.25 * 60 - 0.20 * 0.20 * 30) / 30), 1) }}
    - >-
      22.5%
    - >-
      {{ pct(2 * 0.25 - 0.20, 1) }}
  answer: 0
  explain: >-
    Variances add: \(\sigma_{1\to2} = \sqrt{(0.25^2 \times 60 - 0.20^2 \times 30)/30}\) = {{ pct(Math.sqrt((0.25 * 0.25 * 60 - 0.20 * 0.20 * 30) / 30), 1) }}. Averaging the two volatilities gives 22.5%, which forgets that the 60-day figure already includes the first 30 days. Doubling and subtracting the volatilities themselves ({{ pct(2 * 0.25 - 0.20, 1) }}) treats volatility rather than variance as additive.
- q: >-
    A VIX-style index reads 16. Roughly what typical daily move does that imply for the index?
  choices:
    - >-
      16%
    - >-
      About 1%
    - >-
      About 4.6%
  answer: 1
  explain: >-
    Divide by \(\sqrt{252}\), about 16: a daily standard deviation of about 1%. 16% is the annualized figure. About 4.6% is the 30-day move, \(16\% \times \sqrt{30/365}\), not the daily one.
- q: >-
    Why does VIX usually read above the at-the-money implied volatility of SPX options?
  choices:
    - >-
      Because Cboe adds a fixed premium
    - >-
      Because VIX is computed from a strip of out-of-the-money options, and the skew makes the downside strikes carry higher implied volatility
    - >-
      Because VIX uses a 30-day horizon and SPX options all expire sooner
  answer: 1
  explain: >-
    VIX weights in out-of-the-money puts and calls across many strikes, and the equity skew puts the low strikes well above at-the-money implied volatility, which lifts the result. No fixed premium is added. The 30-day horizon is interpolated between expirations on either side, so it is neither longer nor shorter than the options used.
```
