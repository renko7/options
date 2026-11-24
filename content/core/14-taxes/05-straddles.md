---
title: Straddles, covered calls and constructive sales
summary: Recognize when stock plus options, or two option legs, form a tax straddle, what that does to losses and holding periods, when a covered call escapes the rules, and when a hedge counts as a sale.
---

```calc
const ST = 0.32, LT = 0.15;
const mar = chain(ACME, { dte: 121 });
const p100 = mar.rows.find((r) => r.strike === 100).put;
const putCost = p100.ask;
const stockBasis = 80;
const putSale = Number((Math.round(bs.price({ S: 112, K: 100, T: 94 / 365, r: RATE, q: ACME.q, sigma: p100.iv, type: 'put' }) / 0.05) * 0.05).toFixed(2));
const putLoss = (putCost - putSale) * 100;
const unrec = (112 - stockBasis) * 100;
const deductible = Math.max(0, putLoss - unrec);
const deferred = putLoss - deductible;
const protLegs = [
  { kind: 'stock', qty: 100, price: 100 },
  { kind: 'put', qty: 1, strike: 100, premium: putCost, dte: 121, iv: p100.iv },
];
// qualified covered call test, applicable stock price $100
const asp = 100;
const strikesBelow = [95, 90, 85, 80];
const lqb = (days, K) => {
  const bench = days > 90 && K > 50 ? strikesBelow[1] : strikesBelow[0];
  return Math.max(bench, asp - 10);
};
const calls = [
  { name: 'December 95', days: 30, K: 95 },
  { name: 'January 105', days: 58, K: 105 },
  { name: 'January 95', days: 58, K: 95 },
  { name: 'January 90', days: 58, K: 90 },
  { name: 'March 90', days: 121, K: 90 },
  { name: 'March 85', days: 121, K: 85 },
  { name: 'December 2027 110', days: 394, K: 110 },
];
const verdict = (c) => {
  if (c.days <= 30) return ['—', 'No: not more than 30 days to expiration'];
  if (c.days > 365) return ['—', 'No: written more than 12 months before expiration'];
  const b = lqb(c.days, c.K);
  if (c.K < b) return [usd(b, 0), 'No: deep in the money (strike below the benchmark)'];
  return [usd(b, 0), c.K < asp ? 'Yes, but in the money' : 'Yes'];
};
const qccRow = (c) => { const [b, v] = verdict(c); return `| ${c.name} | ${c.days} | ${b} | ${v} |`; };
const csBasis = 60, csPx = 100;
const csGain = (csPx - csBasis) * 100;
```

The rules in the previous Lessons treat each position on its own. Active option traders rarely hold positions on their own: they own stock and buy puts against it, write calls against it, or trade spreads whose legs offset each other. The tax code has rules for offsetting positions, written to stop investors from taking the loss leg of a hedge this year while deferring the gain leg. They apply to ordinary investors, not only to sophisticated traders, and brokers do not apply them for you.

## What a tax straddle is

:::rule Tax straddles (as of 2026)
A straddle, for tax purposes, is any set of offsetting positions in personal property. A position is offsetting if it substantially reduces your risk of loss from holding another position. Personal property means actively traded property; it includes stock options and, although stock is normally excluded, it includes actively traded stock when at least one of the offsetting positions is a position on that stock. Positions are presumed offsetting when, for example, their values move inversely, or they are marketed as offsetting positions whether or not they are called a straddle, spread or butterfly. Positions held by your spouse count as yours.
:::

The tax term is much broader than the option strategy called a [[straddle]]. A [[tax straddle]] includes:

- stock plus a [[protective put]] or a [[collar]];
- stock plus a covered call, unless the call is a *qualified* covered call (below);
- the two legs of a [[vertical spread]], an iron condor, or any other multi-leg option position on one underlying;
- the option strategy called a straddle, of course.

## Losses are deferred while gains are open

:::rule Straddle loss deferral (as of 2026)
You can deduct a loss on disposing of one position of a straddle only to the extent it exceeds the unrecognized gain, at the end of the tax year, in the offsetting positions you still hold. The deferred loss carries forward to the next year, where the same test is applied again. Rules similar to the wash sale rule also apply to straddle positions.
:::

## Holding periods are reset

:::rule Straddle holding period and loss character (as of 2026)
The holding period of a position in a straddle generally does not begin until the straddle ends, unless you held the position for more than 1 year before the straddle was established. A loss on a straddle position is treated as long-term if, on the day you entered the loss position, you held an offsetting position whose gain or loss would have been long-term.
:::

Puts carry a closely related rule of their own, because buying a put is economically close to selling the stock short.

:::rule Buying a put on stock held 1 year or less (as of 2026)
Buying a put is generally treated as a short sale. If you have held the stock for 1 year or less when you buy the put (or buy the stock while holding the put), any gain on the put is short-term, and your holding period for the stock starts over on the earliest of: the date you dispose of the stock, or the date you exercise, sell, or let the put expire. Exception: this does not apply to a put bought on the same day as the stock it is identified to protect (a [[married put]]); if that put expires unexercised, its cost is added to the stock's basis.
:::

:::example A protective put closed at a loss
You bought 100 ACME shares at ${{ int(stockBasis) }} on September 15, 2026. On {{ longDate(TODAY) }}, with ACME at $100, you buy one ACME March 100 put at {{ usd(putCost) }} to protect the gain into year end.

By December 15 ACME is at $112 and you no longer want the protection. You sell the put at {{ usd(putSale) }}: a loss of **{{ usd(putLoss) }}**. You keep the shares through December 31, when ACME is still at $112.

**Loss deferral.** The shares, an offsetting position, have an unrecognized gain of ($112 − ${{ int(stockBasis) }}) × 100 = {{ usd(unrec, 0) }} at year end. The put loss is deductible only to the extent it exceeds that: {{ usd(deductible) }} in 2026; the full {{ usd(deferred) }} is deferred.

**Holding period.** You had held the shares for less than a year when you bought the put, so their holding period starts over when you sell the put, on December 15. To sell them for a long-term gain you now have to hold them past December 15, 2027, more than a year after the hedge came off, not September 2027.
:::

```tool position-builder
{ title: '100 ACME shares with a March 100 protective put', legs: protLegs, range: [80, 125] }
```

The same deferral applies to spreads. If you close the losing leg of a [[vertical spread]] in December and keep the winning leg open over year end, the loss waits until the gain is realized. The straightforward fix is to close all legs of a spread together.

## The qualified covered call exception

Covered calls would almost always be straddles, which would make the most common option strategy a tax tangle. The code carves out an exception.

:::rule Qualified covered calls (as of 2026)
Stock and a call you write on it are exempt from the straddle loss deferral rules if every offsetting position is a qualified covered call or the stock, and the straddle is not part of a larger straddle. A call is a [[qualified covered call]] only if it is traded on a national securities exchange; is written more than 30 days before expiration; is written not more than 12 months before expiration (unless it meets additional benchmark requirements the IRS has published); is not deep in the money; is written by someone who is not an options dealer acting as a dealer; and produces capital gain or loss.
:::

"Deep in the money" has a mechanical definition.

:::rule The lowest qualified benchmark (as of 2026)
A call is deep in the money if its strike is below the lowest qualified benchmark (LQB). The LQB is the highest available strike below the applicable stock price (generally the previous day's closing price). For a call with more than 90 days to expiration and a strike above $50, it is the second-highest available strike below that price. If the applicable stock price is $150 or less, the LQB is not less than $10 below it; if it is $25 or less, not less than 85% of it.
:::

:::example Which ACME covered calls qualify
You own ACME, which closed at ${{ int(asp) }} yesterday, and consider writing one of these calls today. ACME strikes are $5 apart.

| Call | Days to expiration | LQB | Qualified? |
|---|---|---|---|
{{ calls.map(qccRow).join('\n') }}

The December monthly fails for a reason that catches many writers: 30 days is not *more than* 30 days. The January 95 call qualifies even though it is in the money, while the January 90 call is deep in the money. The longer March expiration allows one more strike, so the March 90 call qualifies where the January 90 does not.
:::

Qualifying is not the end of it if the call is in the money.

:::rule In-the-money qualified covered calls (as of 2026)
If you write a qualified covered call with a strike below the applicable stock price, the stock's holding period does not include any period during which you are the writer of the call, and any loss on the call is treated as long-term if a gain on the stock would have been long-term at the time the loss was realized. A year-end rule also applies: if the call is closed, or the stock is sold at a loss, in one year, the offsetting gain falls in a later year, and the stock or call was held less than 30 days after that closing or sale, the loss deferral rules apply after all.
:::

## Constructive sales

:::rule Constructive sales (as of 2026)
You are treated as having sold an appreciated financial position (stock, among others, that would show a gain if sold) at its fair market value if you, or a related person, enter into a short sale of the same or substantially identical property, an offsetting notional principal contract, or a futures or forward contract to deliver it. You recognize the gain as of that date, and the position starts a new holding period. The statute lets the Treasury add other transactions with substantially the same effect by regulation. Exception: a transaction closed by the 30th day after year end does not count if you then hold the position for 60 days without reducing its risk.
:::

:::example Shorting against the box
You bought 100 ACME shares at ${{ int(csBasis) }} in 2024. On {{ longDate(TODAY) }}, with ACME at ${{ int(csPx) }}, you sell 100 ACME shares short in your margin account to lock in the price without selling, hoping to defer the gain to 2027.

That is a [[constructive sale]]. You recognize a {{ usd(csGain, 0) }} long-term gain on your 2026 return as if you had sold the shares today, and the shares start a new holding period. Unless the short is closed by January 30, 2027 and the shares are then held unhedged for 60 days, the attempt to defer fails.
:::

Options are not on the statute's list, and no regulations adding them have been issued. But the reason the rule exists is to tax positions that eliminate the risk and reward of owning the stock. A combination of options that does nearly that (for example, a long put and a short call at the same strike and expiration on stock you own, which together behave like a forward sale) is the kind of hedge to discuss with a tax professional before you put it on.

:::key
Offsetting positions (stock with a put or a non-qualified covered call, or the legs of a spread) form a tax straddle: losses are deferred while offsetting gains are open, and holding periods can restart. Buying a put on stock held a year or less resets the stock's holding period unless it is a same-day married put. Covered calls escape the straddle rules only if qualified: more than 30 days to expiration and not deep in the money by the LQB test. Locking in an appreciated stock with a short sale or forward is a constructive sale, taxed now.
:::

```quiz
- q: >-
    You own ACME (closed yesterday at $100) and write the December 95 call with 30 days to expiration. Is it a qualified covered call?
  choices:
    - >-
      Yes, because the 95 strike is not below the $95 benchmark
    - >-
      No, because it is not written more than 30 days before expiration
    - >-
      No, because it is in the money
  answer: 1
  explain: >-
    A qualified covered call must be written more than 30 days before it expires; exactly 30 does not qualify. The strike test alone would pass, which is the trap. Being in the money does not disqualify a call by itself: the January 95 qualifies though it is in the money, while only calls below the benchmark are deep in the money.
- q: >-
    In the protective put example, you sold the put at a {{ usd(putLoss) }} loss in December while holding shares with a {{ usd(unrec, 0) }} unrecognized gain at year end. How much of the loss can you deduct in 2026?
  choices:
    - >-
      All {{ usd(putLoss) }}
    - >-
      {{ usd(deductible) }}
    - >-
      $3,000, the capital loss limit
  answer: 1
  explain: >-
    A straddle loss is deductible only to the extent it exceeds the unrecognized gain in the offsetting position at year end. The {{ usd(unrec, 0) }} gain on the shares exceeds the loss, so none of it is deductible in 2026; it carries forward. The $3,000 limit concerns net capital losses against other income and is not the issue here.
- q: >-
    You bought ACME shares 5 months ago and today buy a protective put on them. What happens to the shares' holding period?
  choices:
    - >-
      Nothing; buying a put is not a sale
    - >-
      It starts over when the put is sold, exercised or expires (or when you sell the stock, if earlier)
    - >-
      It is extended by the time the put is held
  answer: 1
  explain: >-
    Buying a put on stock held a year or less is treated like a short sale: the stock's holding period begins again on the earliest of those dates, so the five months already held are lost. Only a married put, bought the same day as the stock and identified with it, avoids this. Nothing about the rule extends a holding period.
- q: >-
    You own ACME bought at ${{ int(csBasis) }} and sell 100 ACME shares short at ${{ int(csPx) }} on {{ longDate(TODAY) }}, intending to close both positions in March. What is the tax result for 2026?
  choices:
    - >-
      Nothing until March, when both positions close
    - >-
      A constructive sale: a {{ usd(csGain, 0) }} gain recognized in 2026 unless the short is closed by January 30 and the stock then held unhedged for 60 days
    - >-
      A wash sale, disallowing any loss
  answer: 1
  explain: >-
    Shorting the same stock against an appreciated long position is the core case of a constructive sale, so the gain is recognized as of the short sale date. The narrow exception requires closing the short within 30 days after year end and then holding the shares unhedged for 60 days, which a March close does not meet. There is no loss here, so the wash sale rule is not relevant.
```
