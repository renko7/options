---
title: SPX, XSP and SPY compared
summary: Choose between the three main ways to trade options on the S&P 500 by comparing their size, exercise style, settlement, trading hours and tax treatment.
---

```calc
const q = chain(HBR, { dte: 30 });
const c = q.rows.find((r) => r.strike === 5000).call;
const full = HBR.spot * 100;
const mini = (HBR.spot / 10) * 100;
const etf = (HBR.spot / 10) * 100;
const fullCost = c.mid * 100;
const miniCost = (c.mid / 10) * 100;
const comm = 0.65;
```

The S&P 500 has three option products that most US traders choose between: SPX options on the index itself, XSP options on a one-tenth-size version of the index, and SPY options on the largest ETF that tracks it. They give similar market exposure, but they differ in almost every mechanical detail this Course has covered: size, exercise style, settlement, expirations, trading hours and taxes. The numbers below use HBR, the Fictional Index, as a stand-in; the rules are the real products' rules.

## The three products

[[SPX]] options are the standard [[index option]] on the S&P 500: cash-settled, European-style, $100 times the index. [[XSP]] (Mini-SPX) options are the same design on an index set at one tenth of the S&P 500, so each contract is one tenth the size. [[SPY]] options are ordinary ETF options: American-style and physically settled in 100 shares of an ETF whose price is roughly one tenth of the index level.

:::rule SPX, XSP and SPY option specifications (as of 2026)
| | SPX | XSP | SPY |
|---|---|---|---|
| Underlying | S&P 500 Index | Mini-SPX Index (1/10 of the S&P 500) | SPDR S&P 500 ETF shares |
| Contract size | $100 × index | $100 × Mini-SPX index | 100 shares |
| Exercise style | European | European | American |
| Settlement | Cash | Cash | Physical (shares) |
| Expirations | Every weekday (SPXW), plus standard monthlies, end-of-month and LEAPS | Every weekday, plus end-of-month and others | Every weekday, plus standard monthlies and LEAPS |
| Settlement time | Standard third-Friday (monthly) options: AM, from the special opening quotation. SPXW series (weeklies, dailies, end-of-month): PM, from the closing index value | PM, from the closing value | Not applicable: exercise delivers shares, judged against the ETF's closing price |
| Early assignment | No | No | Yes, including around the ETF's quarterly dividends |
| Trading hours (ET) | Regular 9:30 a.m.–4:15 p.m.; curb session 4:15–5:00 p.m.; Global Trading Hours 8:15 p.m.–9:25 a.m. | Same sessions as SPX | Regular session (the exact close for ETF options varies by class; check your broker). Since October 19, 2026 Cboe has also offered a 7:30–9:25 a.m. pre-market session for SPY options on one of its exchanges |
| Last trading on expiration day | Expiring SPXW and XSP stop at 4:00 p.m. ET; AM-settled SPX stop trading on the business day before (usually Thursday) | 4:00 p.m. ET | Generally 4:00 p.m. ET; check your broker |
| US tax treatment | Generally Section 1256 contracts | Generally Section 1256 contracts | Ordinary equity option rules |

Exchange specifications change; check Cboe's product pages for the current version. Brokers decide which of the extended sessions (curb, Global Trading Hours, pre-market) their customers can use. Since November 2026 Cboe has also listed AM-settled SPX options outside the standard monthly, under the symbol SPXO, so always check the settlement type of the series you trade.
:::

## Size

Size is the first practical difference.

:::example The same exposure three ways
With HBR at 5,000, one full-size HBR option has a notional value of {{ usd(full) }}. A mini version at one tenth of the index, as XSP is to SPX, would have a notional value of {{ usd(mini) }} per contract. An ETF tracking HBR at about one tenth of its level would trade near $500, and 100 shares would also be about {{ usd(etf) }}.

The at-the-money 30-day HBR call has a mid price of {{ num(c.mid) }} points: {{ usd(fullCost) }} per contract. The mini version would cost about {{ usd(miniCost) }} per contract, so ten of them match one full-size contract.

Ten contracts mean ten commissions: at an assumed {{ usd(comm) }} per contract, {{ usd(comm * 10) }} instead of {{ usd(comm) }} each way, and ten sets of per-contract fees. But the small contract lets you trade in steps of {{ usd(mini) }} instead of {{ usd(full) }}, which is the only way a smaller account can size an index position sensibly.
:::

Full-size SPX is the professional benchmark, with the deepest liquidity in the listed options market and the tightest spreads relative to its size. XSP suits accounts too small for SPX but which want its cash settlement and European style. SPY options have enormous liquidity too, and their smaller size made them the traditional choice for individual traders.

## Exercise, settlement and what can go wrong

The mechanical differences decide which risks you carry.

- **SPY can be assigned early and settles in shares.** A short in-the-money SPY call can be assigned the day before SPY goes ex-dividend ([[dividend risk]]), and a short put deep in the money can be assigned early. At expiration, an SPY option near the money carries [[pin risk]] and after-hours risk, and an assigned spread can leave you with thousands of dollars of ETF shares over a weekend. Everything in [Exercise, assignment and expiration](#core-07) applies.
- **SPX and XSP cannot be assigned early and settle in cash.** No stock position can appear. For PM-settled series, the settlement value is fixed at the close, so after-hours news cannot change the result.
- **AM-settled SPX is the exception.** Standard monthly SPX options stop trading the day before expiration and settle on a value calculated from the next morning's opening prices, as the [next Lesson](#core-13-am-pm-settlement) explains. You can be exposed to an overnight gap with no way to trade out of it.

## Taxes

Broad-based index options such as SPX and XSP are generally treated as Section 1256 contracts for US federal tax: gains and losses are marked to market at year-end and taxed as 60% long-term and 40% short-term capital gains, however long you held them. SPY options are equity options taxed under the ordinary rules, where a position held for a year or less produces short-term gains. For an active trader in a high tax bracket the difference can be large. [US taxes](#core-14) covers this in detail; nothing in this Course is tax advice.

## Trading hours

SPX and XSP trade almost around the clock on weekdays: the regular session, a curb session after the close, and an overnight session (Global Trading Hours) that opens Sunday evening. That lets a trader adjust an index hedge in response to overnight news, if their broker supports those sessions. Liquidity outside the regular session is much thinner, and spreads wider. SPY options trade mainly in the regular session.

The chain below shows HBR options 30 days out. Notice that quotes are in index points; multiply by $100 for dollars.

```tool chain
{ underlying: 'HBR', dte: 30, view: 'quote', highlight: [{ strike: 5000, type: 'call' }] }
```

:::key
SPX: full-size, European, cash-settled, AM settlement for standard monthlies and PM for SPXW series, nearly 24-hour trading, generally Section 1256 tax treatment. XSP: the same at one tenth the size, PM-settled. SPY: ETF options, American and physically settled, so early assignment, dividend risk and pin risk all apply, taxed as ordinary equity options. Choose by size first, then by which settlement risks and tax treatment you want.
:::

```quiz
- q: >-
    You are short an in-the-money SPY call the day before SPY goes ex-dividend. Which risk applies that would not apply to a short SPX call?
  choices:
    - >-
      Early assignment and owing the dividend
    - >-
      Cash settlement at an AM settlement value
    - >-
      Section 1256 tax treatment
  answer: 0
  explain: >-
    SPY options are American-style and physically settled, so a holder can exercise the night before the ex-date to collect the dividend, leaving you short shares and owing it. SPX is European and cash-settled: no early assignment is possible. AM settlement and Section 1256 treatment belong to SPX, not SPY.
- q: >-
    With HBR at 5,000, roughly how many one-tenth-size contracts (like XSP) give the same exposure as one full-size contract?
  choices:
    - >-
      1
    - >-
      10
    - >-
      100
  answer: 1
  explain: >-
    Each mini contract has a notional of {{ usd(mini) }}, one tenth of the {{ usd(full) }} full-size contract, so ten are needed. Both use a $100 multiplier; the difference is the index level they are based on.
- q: >-
    Which SPX options stop trading the business day before expiration?
  choices:
    - >-
      The AM-settled standard monthly options
    - >-
      SPXW daily options
    - >-
      All SPX options
  answer: 0
  explain: >-
    AM-settled SPX options settle on a value calculated from the opening prices on expiration morning, so their trading ends the business day before, usually Thursday. PM-settled SPXW series, including the dailies, trade until 4:00 p.m. ET on their expiration day.
- q: >-
    A trader in a high tax bracket makes most of their short-term options profits in index options. Why might SPX be preferred to SPY for the same trades?
  choices:
    - >-
      SPX gains are tax-free
    - >-
      SPX options are generally Section 1256 contracts, taxed 60% long-term and 40% short-term regardless of holding period
    - >-
      SPY options cannot produce capital gains
  answer: 1
  explain: >-
    Broad-based index options like SPX generally get the 60/40 treatment, so even a one-day trade is taxed partly at long-term rates. SPY options follow the ordinary rules, so short holding periods mean short-term gains. Neither is tax-free. Check with a tax professional; this is not tax advice.
```
