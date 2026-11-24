---
title: Expirations, strikes and the OCC symbol
summary: Tell weekly, monthly and LEAPS expirations apart, understand how strikes are spaced, and read any contract's 21-character OCC symbol.
---

```calc
const isThirdFriday = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return d.getUTCDay() === 5 && d.getUTCDate() >= 15 && d.getUTCDate() <= 21; };
const kind = (e) => e.dte > 365 ? 'LEAPS' : isThirdFriday(e.date) ? 'Monthly (third Friday)' : 'Weekly';
const atm = (dte) => chain(ACME, { dte }).rows.find((r) => r.strike === 100).call.mid;
const m = (x) => usd(x, Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? 2 : 3);
const expRows = EXPIRATIONS.map((e) => `| ${longDate(e.date)} | ${e.dte} | ${kind(e)} | ${m(atm(e.dte))} | ${usd(atm(e.dte) / e.dte, 3)} |`).join('\n');
const sym = occSymbol('ACME', expiryDate(30), 'call', 105);
const symHalf = occSymbol('ACME', expiryDate(30), 'call', 102.5);
const symP = occSymbol('ACME', '2027-01-15', 'put', 95);
const symH = occSymbol('HBR', expiryDate(30), 'put', 4975);
const vis = (s) => s.replace(/ /g, '·');
const a2 = atm(2), a30 = atm(30), a121 = atm(121), a394 = atm(394);
```

Every option on a chain is pinned down by three things besides its type: the underlying, the expiration and the strike. This Lesson covers the menu of expirations and strikes you will find on a typical stock, how to choose between them at a basic level, and the standard symbol that identifies every listed contract.

## Three families of expiration

**[[Monthly options|Monthly option]]** are the original, standard expirations: the third Friday of each month. They are where open interest traditionally concentrates, and on most underlyings they remain the most liquid series further out in time.

**[[Weekly options|Weekly option]]** ("weeklies") are short-dated series that expire on other days, most often the other Fridays of the month. They were introduced so traders could hold options for days instead of weeks. On the most heavily traded ETFs and indexes there is now an expiration every trading day.

**[[LEAPS]]** (Long-term Equity AnticiPation Securities) are long-dated options, with more than a year and up to roughly three years to run. They are traditionally listed with January expirations, though many underlyings also carry long-dated June or December series. Traders loosely call any option more than a year out a LEAPS.

ACME's listed expirations as of {{ longDate(TODAY) }}, with the price of the at-the-money 100 call in each:

| Expiration | Days to expiration | Type | 100 call mid | Cost per day |
|---|---|---|---|---|
{{ expRows }}

Notice the November 20 series. It is the November *monthly*, the third Friday, now in its final two days. On expiration week a monthly behaves exactly like a weekly; the label tells you how it was originally listed, not how much time it has.

:::example Price versus time
The 100 call costs {{ m(a2) }} for 2 days, {{ m(a30) }} for 30 days, {{ m(a121) }} for 121 days and {{ m(a394) }} for 394 days.

Quadrupling the time from 30 to 121 days does not quadruple the price: it goes from {{ m(a30) }} to {{ m(a121) }}, a factor of {{ num(a121 / a30) }}. The cost per day of holding the option falls the longer you buy: about {{ usd(a30 / 30, 3) }} a day for the December option against {{ usd(a394 / 394, 3) }} a day for the LEAPS. Short-dated options are cheap in dollars and expensive per day. [What drives an option's price](#core-04) explains why value grows roughly with the square root of time.
:::

The choice of expiration is a trade-off you will make on every trade. Short-dated options are cheap and react sharply to the stock, but they decay fast and leave no room for being early. Long-dated options cost more up front but give a thesis time to work. Experienced directional option buyers usually give themselves more time than they think they need.

:::rule Expiration cycles (as of 2026)
- Standard monthly equity options expire on the third Friday of the month; if that Friday is an exchange holiday, they expire on the preceding business day.
- Under the exchanges' short-term option series programs, weekly expirations are listed on many stocks and ETFs, normally on Fridays. The most active index products and ETFs list expirations for every trading day, and exchanges have been extending additional weekday expirations to a limited set of very active underlyings.
- Long-term options (LEAPS) are listed with expirations of up to about three years.
- Expiring standard equity options stop trading at the 4:00 p.m. Eastern close on their last trading day.
:::

## Strike intervals

Strikes are listed at fixed spacings called the [[strike interval]]. ACME strikes are $5 apart; the Harbor 100 Index's are 25 points apart. On real underlyings the interval depends on the share price and on how actively the name trades:

- Intervals generally widen as the share price rises, so a $20 stock and a $600 stock do not share the same spacing.
- Actively traded names often get narrower intervals ($1, or even less for low-priced shares) near the money and in short-dated series.
- Far from the money and in long-dated series, intervals are usually wider.
- Exchanges add new strikes as the stock moves, so there are always strikes on both sides of the price.

Narrow strike intervals give you more choice but spread open interest across more contracts. Round-number strikes (100, 150, 200) tend to have the most open interest and the tightest markets.

:::rule Strike listing (as of 2026)
Exchanges set the strikes they list under their own rules, which tie the minimum interval to the share price and to special programs for actively traded or low-priced underlyings, and which limit how many strikes may be added in short-term series. All listed strikes are standardized and cleared by the OCC.
:::

## The OCC symbol

Every listed US option has a standardized [[OCC symbol]], 21 characters long, used by brokers, exchanges and the OCC to identify it exactly. Your broker may show a friendlier format ("ACME Dec 18 '26 105 Call"), but under the hood this is the identifier, and you will see it on confirmations, statements and tax forms.

:::example Decoding the ACME December 105 call
The OCC symbol is `{{ sym }}`. Written with each space shown as a dot: `{{ vis(sym) }}`.

| Characters | Value | Meaning |
|---|---|---|
| 1–6 | `{{ vis(sym.slice(0, 6)) }}` | root symbol, padded with spaces to six characters |
| 7–12 | `{{ sym.slice(6, 12) }}` | expiration date as YYMMDD: {{ longDate(expiryDate(30)) }} |
| 13 | `{{ sym.slice(12, 13) }}` | C for call, P for put |
| 14–21 | `{{ sym.slice(13) }}` | strike × 1,000, padded to eight digits: $105.000 |

The strike field holds five digits of dollars and three of decimals, so it can express strikes like $102.50: `{{ symHalf.slice(13) }}`.
:::

A few more:

- `{{ symP }}` is the ACME January 15, 2027 95 put.
- `{{ symH }}` is the Harbor 100 December 4,975 put.

When the OCC adjusts a contract after a corporate action, the root usually changes, often by appending a digit (ACME1). If the root in a symbol does not match the stock's ticker, check the deliverable before you trade.

:::rule OCC option symbology (as of 2026)
US-listed options use the OCC's standard symbology, in place since 2010: a root of up to six characters, a six-digit expiration date (YYMMDD), a call/put indicator, and an eight-digit strike price with three implied decimals.
:::

## Try it

The chain below opens on the 9-day weekly. Switch to the December monthly and to the 394-day LEAPS and compare the price of the same 100 strike, the spacing of strikes, and where volume and open interest sit.

```tool chain
{ underlying: 'ACME', dte: 9, view: 'quote', highlight: [{ strike: 100, type: 'call' }] }
```

:::key
Monthly options expire on the third Friday, weeklies on other days, and LEAPS a year or more out. Longer options cost more in total and less per day. Strikes come at standard intervals that depend on the stock. The 21-character OCC symbol (root, YYMMDD, C or P, strike × 1,000) identifies every contract exactly.
:::

```quiz
- q: >-
    What contract is `{{ occSymbol('ACME', '2027-03-19', 'put', 110) }}`?
  choices:
    - >-
      ACME March 19, 2027 110 put
    - >-
      ACME March 19, 2027 11 put
    - >-
      ACME 110 call expiring in 2027
    - >-
      ACME March 19, 2027 1,100 put
  answer: 0
  explain: >-
    After the padded root comes 270319, March 19, 2027; then P for a put; then 00110000, which is the strike times 1,000: $110.000. Misplacing the three implied decimals gives strikes off by a factor of ten, such as 11 or 1,100.
- q: >-
    Which ACME expiration is a standard monthly?
  choices:
    - >-
      {{ longDate('2026-11-27') }}
    - >-
      {{ longDate('2027-01-15') }}
    - >-
      None of them; monthly options expire on the last Friday of the month
  answer: 1
  explain: >-
    January 15, 2027 is the third Friday of January, the standard monthly expiration. November 27 is the fourth (and last) Friday of November, so it is a weekly. Monthlies expire on the third Friday, not the last one, so "none of them" is wrong.
- q: >-
    The ACME 100 call costs {{ m(a30) }} for 30 days and {{ m(a121) }} for 121 days. Which statement is right?
  choices:
    - >-
      The 121-day option is overpriced, since it should cost four times as much as the 30-day option
    - >-
      The 121-day option costs more in total but less per day: about {{ usd(a121 / 121, 3) }} a day against {{ usd(a30 / 30, 3) }}
    - >-
      They cost the same per day
  answer: 1
  explain: >-
    Option value grows more slowly than time, roughly with its square root, so four times the time costs about twice as much, not four times. Per day, the longer option is cheaper: {{ usd(a121 / 121, 3) }} against {{ usd(a30 / 30, 3) }}. Expecting a price proportional to time is the tempting mistake.
- q: >-
    On Monday you see an ACME call quoted far below the other calls at the same strike and expiration, with the root ACME1 in its symbol. What should you do first?
  choices:
    - >-
      Buy it; it is mispriced
    - >-
      Check its deliverable; it is probably an adjusted contract that does not deliver a standard 100 shares
    - >-
      Report it to the OCC
  answer: 1
  explain: >-
    A changed root usually marks a contract adjusted after a corporate action. Its deliverable may be fewer shares, cash, or shares of another company, which is why its price differs. It is almost never a free lunch, and there is nothing to report: adjusted contracts are a normal part of the market.
```
