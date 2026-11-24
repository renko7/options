---
title: Earnings and the volatility crush
summary: Measure the move the market is pricing for an earnings report, watch implied volatility build into the event, and price what happens to options when it collapses afterwards.
---

```calc
const earn = ACME_EARNINGS;
const sb = smileIV(ACME, 100, 30 / 365);
const sj = smileIV(ACME, 100, 58 / 365);
const m2 = sj * sj * 58 / 365 - sb * sb * 57 / 365;
const m = Math.sqrt(m2);
const ivWith = (d) => Math.sqrt((sb * sb * (d - 1) / 365 + m2) / (d / 365));
const steps = [58, 30, 10, 3];
const dateAt = (d) => longDate(expiryDate(58 - d));
const pre = ivWith(3);
const o = { K: 100, r: RATE, q: ACME.q };
const cPre = Number(bs.price({ ...o, S: 100, T: 3 / 365, sigma: pre, type: 'call' }).toFixed(2));
const pPre = Number(bs.price({ ...o, S: 100, T: 3 / 365, sigma: pre, type: 'put' }).toFixed(2));
const strad = cPre + pPre;
const after = (S, type) => Number(bs.price({ ...o, S, T: 2 / 365, sigma: sb, type }).toFixed(2));
const outcomes = [94, 97, 100, 102, 104, 106];
const vegaPre = bs.greeks({ ...o, S: 100, T: 3 / 365, sigma: pre, type: 'call' }).vega;
const marPre = Math.sqrt((sb * sb * 65 / 365 + m2) / (66 / 365));
const marC = (s, d) => bs.price({ ...o, S: 100, T: d / 365, sigma: s, type: 'call' });
const marLoss = marC(marPre, 66) - marC(sb, 65);
const janLoss = cPre - after(100, 'call');
const legs = [{ kind: 'call', qty: 1, strike: 100, premium: cPre, dte: 3, iv: pre }, { kind: 'put', qty: 1, strike: 100, premium: pPre, dte: 3, iv: pre }];
```

Most of the time a stock's volatility changes gradually. An [[earnings announcement]] is different: on one known night the company publishes results, and the next morning the stock can open several percent higher or lower. Options markets know the date in advance and price the jump into every expiration that includes it. Afterwards that extra value disappears all at once. Understanding that cycle is essential, because it is where many first-time option buyers lose money while being right about the stock.

## Finding the event in the term structure

ACME reports after the close on {{ longDate(earn) }}. The December options (expiring {{ longDate(expiryDate(30)) }}) end before the report; the January options (expiring {{ longDate(expiryDate(58)) }}) end three days after it. Today the December at-the-money implied volatility is {{ pct(sb, 2) }} and the January is {{ pct(sj, 2) }}. In [Term structure and VIX](#core-06-term-structure-and-vix) the gap between them showed up as a high forward volatility. Treat the December number as ACME's ordinary volatility and the gap becomes a measurement of the earnings move.

:::derivation The move implied by the term structure
Split the January option's total variance into ordinary days and the earnings night. The earnings night replaces one ordinary day with a single jump whose size, as a fraction of the price, has standard deviation \(m\). With \(\sigma_b\) the ordinary volatility and \(N\) days to expiration:

\[ \sigma_N^2\,\frac{N}{365} = \sigma_b^2\,\frac{N-1}{365} + m^2 . \]

Solve for the event move:

\[ m = \sqrt{\sigma_N^2\,\frac{N}{365} - \sigma_b^2\,\frac{N-1}{365} } . \]

Reading the same equation the other way gives the implied volatility of any expiration that contains the event:

\[ \sigma_N = \sqrt{\frac{\sigma_b^2\,(N-1)/365 + m^2}{N/365} } . \]
:::

With \(\sigma_N\) = {{ pct(sj, 2) }}, \(N\) = 58 and \(\sigma_b\) = {{ pct(sb, 2) }}, the market is pricing an earnings move with a standard deviation of **{{ pct(m, 2) }}**, about {{ usd(100 * m) }} on a $100 stock. That is what ACME's options say the report is worth.

## Implied volatility builds into the event

The event move stays the same size as the date approaches, but it is spread over fewer and fewer days. So the January options' implied volatility rises as earnings get closer, even if nothing about ACME changes. Holding ACME at $100 and ordinary volatility at {{ pct(sb, 0) }}:

| Date | Days left in the January options | January implied volatility |
|---|---|---|
{{ steps.map((d) => `| ${dateAt(d)} | ${d} | ${pct(ivWith(d), 1)} |`).join('\n') }}

On the afternoon of the report, with three days left, {{ pct(m2 / (sb * sb * 2 / 365 + m2), 0) }} of the January options' remaining variance is the earnings night. This rise in front-month implied volatility before a known event is the **event bump**, and it is why IV rank is almost always high just before earnings. An expiration further out that also contains the report, such as March, carries the same event spread over many more days, so its bump is far smaller.

## The crush

After the report, the event is over. The stock has moved, by a lot or a little, and the options left have no earnings night in them. Implied volatility falls back to the ordinary level overnight. That collapse is the [[volatility crush]].

:::example Buying the January 100 straddle before the report
It is {{ longDate(earn) }}, the afternoon before the report, and ACME is still at $100. The January options have three days left and trade at {{ pct(pre, 1) }} implied volatility. You buy the January 100 call at {{ usd(cPre) }} and the January 100 put at {{ usd(pPre) }}: a [[straddle]] for {{ usd(strad) }}, {{ usd(strad * 100) }} per contract.

The next morning the report is out, two days remain, and implied volatility has dropped to {{ pct(sb, 0) }}. Here is what each piece is worth, by where ACME opens:

| ACME opens at | Call | Put | Straddle | Straddle P&L per contract |
|---|---|---|---|---|
{{ outcomes.map((S) => `| ${usd(S)} | ${usd(after(S, 'call'))} | ${usd(after(S, 'put'))} | ${usd(after(S, 'call') + after(S, 'put'))} | ${signedUsd((after(S, 'call') + after(S, 'put') - strad) * 100)} |`).join('\n') }}

If ACME does not move, the straddle loses most of its value overnight: the crush took the event premium out of both options at once. It takes a move of roughly the straddle price, {{ usd(strad) }}, in either direction just to break even. The straddle buyer is not betting that ACME will move. They are betting it will move *more than the {{ pct(m, 1) }} the market already charged for*.

Look at the call alone. If ACME opens at $102, up 2%, the call is worth {{ usd(after(102, 'call')) }} against the {{ usd(cPre) }} you paid. A call buyer who was right about direction but not about size made only {{ usd((after(102, 'call') - cPre) * 100) }} per contract, and with ACME unchanged would have lost {{ usd(janLoss * 100) }}.
:::

The crush is a vega effect. Before the report the January 100 call had a vega of {{ usd(vegaPre, 3) }}; a drop of {{ num((pre - sb) * 100, 1) }} vol points times that vega accounts for most of the overnight loss with the stock unchanged. The March 100 call, with the same event spread over 66 days, trades at only {{ pct(marPre, 1) }} before the report and loses {{ usd(marLoss) }} a share overnight, against {{ usd(janLoss) }} for the January call. The closer the expiration to the event, the harder the crush.

Try it below. The position starts on the afternoon of the report with one day passed and implied volatility dropped to the ordinary level. Move the spot slider to see how far ACME has to go before the straddle pays.

```tool position-builder
{ title: 'Long one ACME January 100 straddle into earnings', legs: legs, range: [88, 112], daysPassed: 1, ivShift: sb - pre }
```

## Trading around earnings

The crush is not a trick that makes sellers rich. A seller of the straddle above collects {{ usd(strad * 100) }} per contract and loses if ACME moves more than about {{ usd(strad) }}. Whether buying or selling is the better side depends entirely on how the actual move compares with the implied one, and the market's implied move is usually a reasonable estimate. Practitioners therefore:

- **Compare the implied move with the stock's history.** If ACME has moved 7% on most past reports and the market charges {{ pct(m, 1) }}, the straddle looks cheap; if it has moved 2%, it looks expensive. Past moves are evidence, not a guarantee.
- **Choose the expiration deliberately.** The first expiration after the report has the biggest bump and the biggest crush. Later expirations carry the event more cheaply but also gain less from a large move.
- **Size for the gap.** Selling premium into earnings is a short position in a single night's move. A surprise of two or three times the implied move happens on a regular basis across the market. Defined-risk structures, such as selling an [[iron condor]] instead of a naked straddle, cap that loss at a cost.
- **Do not buy options for direction just before the report** unless you expect a move clearly larger than the implied one. Otherwise even a correct call on direction can lose to the crush, as the Worked Example shows.

:::warning Holding a long option through earnings by accident
A Learner who buys a call in late December for a January rally, and forgets the report on {{ longDate(earn) }}, owns an option whose price includes the earnings premium. If the report is uneventful, the crush can wipe out weeks of gains overnight. Check the earnings date of every underlying before you choose an expiration.
:::

:::key
An earnings report adds a one-night jump to every expiration that includes it. The jump size can be read from the term structure: \(m = \sqrt{\sigma_N^2 N/365 - \sigma_b^2 (N-1)/365}\). As the report approaches, that variance is concentrated into fewer days, so front-month implied volatility rises; after the report it collapses to the ordinary level. Long options bought before the report need a move larger than the implied move to make money.
:::

```quiz
- q: >-
    Why does the January implied volatility rise from {{ pct(ivWith(58), 1) }} today to {{ pct(ivWith(3), 1) }} on the afternoon of the report, even if ACME's ordinary volatility never changes?
  choices:
    - >-
      Because traders become more nervous every day
    - >-
      Because the same earnings variance is spread over fewer remaining days, raising the annualized number
    - >-
      Because time decay raises implied volatility
  answer: 1
  explain: >-
    Implied volatility is annualized. The earnings night contributes a fixed amount of variance, \(m^2\), and as the days left fall from 58 to 3 it becomes a much larger share of the total, so the annualized volatility rises. Nervousness can add to it, but the rise happens even without any change in sentiment. Time decay lowers option *prices*; it does not raise implied volatility.
- q: >-
    You buy the January 100 call for {{ usd(cPre) }} the afternoon before the report. ACME opens at $102 the next morning and implied volatility falls to {{ pct(sb, 0) }}. What happened?
  choices:
    - >-
      You made about $200 per contract, because ACME rose $2
    - >-
      You made about {{ usd((after(102, 'call') - cPre) * 100) }} per contract, because the volatility crush took back a large part of what the move earned
    - >-
      You lost the whole premium, because the call is not yet in the money
  answer: 1
  explain: >-
    The call is worth {{ usd(after(102, 'call')) }}, so the gain is {{ usd((after(102, 'call') - cPre) * 100) }}. Delta alone would suggest roughly half of $200, and the drop in implied volatility took a large slice of that. A gain of $200 would require the call to move dollar for dollar like stock. The call *is* in the money at $102, so it has not lost the whole premium.
- q: >-
    Using the formula from this Lesson, a stock's ordinary volatility is 30% and an expiration 10 days away that contains earnings shows 45% implied volatility. What earnings move is the market pricing?
  choices:
    - >-
      {{ pct(Math.sqrt(0.45 * 0.45 * 10 / 365 - 0.30 * 0.30 * 9 / 365), 1) }}
    - >-
      15%
    - >-
      {{ pct(0.45 * Math.sqrt(10 / 365), 1) }}
  answer: 0
  explain: >-
    \(m = \sqrt{0.45^2 \times 10/365 - 0.30^2 \times 9/365}\) = {{ pct(Math.sqrt(0.45 * 0.45 * 10 / 365 - 0.30 * 0.30 * 9 / 365), 1) }}. The difference between the volatilities, 15 points, is not a move size. {{ pct(0.45 * Math.sqrt(10 / 365), 1) }} is the whole 10-day expected move at 45%, which includes the nine ordinary days as well as the earnings night.
- q: >-
    You want to own ACME calls through the January 12 report but suffer less from the crush. Which choice does that?
  choices:
    - >-
      Buy January calls, because they expire soonest after the report
    - >-
      Buy March calls, because the event is spread over more days and their implied volatility rises less before it and falls less after
    - >-
      Buy December calls, because they are cheapest
  answer: 1
  explain: >-
    The March options contain the same event, but spread over 66 days instead of 3, so before the report they trade at {{ pct(marPre, 1) }} rather than {{ pct(pre, 1) }}, and the overnight loss with ACME unchanged is {{ usd(marLoss) }} a share against {{ usd(janLoss) }}. The January calls take the full crush. December calls expire before the report, so they do not give you exposure to it at all.
```
