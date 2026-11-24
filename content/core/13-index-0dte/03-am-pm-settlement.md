---
title: AM and PM settlement
summary: Tell AM-settled from PM-settled index options, know how the special opening quotation is calculated, and manage the overnight gap risk it creates.
---

```calc
const q1 = chain(HBR, { dte: 1 });
const row = (k) => q1.rows.find((r) => r.strike === k);
const p4950 = row(4950).put;
const p4925 = row(4925).put;
const credit = p4950.bid - p4925.ask;
const legs = [{ kind: 'put', qty: -1, strike: 4950, premium: p4950.bid, dte: 1, iv: p4950.iv }, { kind: 'put', qty: 1, strike: 4925, premium: p4925.ask, dte: 1, iv: p4925.iv }];
const soq = 4910;
const pmClose = 4960;
const amPnl = payoff.pnlAtExpiry(legs, soq);
const pmPnl = payoff.pnlAtExpiry(legs, pmClose);
const n = 10;
const sumMax = payoff.summary(legs).maxLoss;
```

Two index options with the same strike and the same expiration date can settle on different numbers, hours apart. The difference is whether the option is AM-settled or PM-settled, and it decides when you can last trade, what number you are paid on, and whether you can be caught by an overnight move with no way out.

## PM settlement: the closing value

[[PM settlement]] uses the index's official closing value on the expiration day. Options keep trading until the close (4:00 p.m. ET for expiring SPXW and XSP), and the settlement value is essentially the last index level you watched. If you are still holding at the close, you know your result.

All SPX weekly and daily options (the SPXW series), end-of-month options and XSP options are PM-settled.

## AM settlement: the special opening quotation

[[AM settlement]] uses a number calculated from the *opening* prices of the index's components on the expiration morning. For the standard monthly SPX options, which expire on the third Friday, this is the [[special opening quotation]] (SOQ).

:::rule AM settlement of SPX options (as of 2026)
- Standard monthly SPX options are AM-settled. Their last trading day is the business day before expiration (usually a Thursday); trading in them ends that day.
- The exercise settlement value (published under the symbol SET) is calculated from the opening price of each S&P 500 component on the expiration morning. Each component enters at its first trade of the day, whenever that occurs, so the value can include stocks that opened late.
- Because each stock's opening trade happens at a slightly different time, the SOQ is not a level the index ever printed in real time, and it can differ noticeably from both the prior close and the index level shortly after the open.
- SPXW series and XSP options are PM-settled, using the closing index value on expiration day. Cboe has at times listed AM-settled series in other expirations as well; check the settlement type in the contract details.
:::

AM settlement is a historical convention that remains because large institutions value a settlement price that is set by opening auctions across hundreds of stocks, rather than by the closing minutes of one trading day, and because futures and other products settle the same way. For the individual trader it has one large consequence: between Thursday's close and Friday's opening prices, the option cannot be traded, but its value can change completely.

## The gap risk

:::example A put spread on the AM-settled monthly
It is Thursday afternoon, the last trading day for the AM-settled HBR monthly options. HBR is at 5,000. Suppose HBR, like SPX, lists AM-settled monthlies alongside PM-settled series.

You are short the 4,950/4,925 put spread: short the 4,950 put at {{ num(p4950.bid) }}, long the 4,925 put at {{ num(p4925.ask) }}, for a credit of {{ num(credit) }} points, {{ usd(credit * 100) }}. With HBR 50 points above your short strike and one session left, the spread looks almost certain to expire worthless, so you leave it.

Overnight, a major economic report surprises badly. Friday's opening prices produce a special opening quotation of 4,910. The spread settles at its full width:

- AM-settled result: {{ usd(amPnl) }}, the maximum loss.

By the afternoon the market has recovered, and HBR closes Friday at 4,960. A PM-settled spread with the same strikes, expiring the same day, would have expired worthless:

- PM-settled result: {{ usd(pmPnl) }}, the full credit.

Same strikes, same date: a {{ usd(pmPnl - amPnl) }} difference per spread, decided only by which prices went into the settlement value. Ten spreads would have lost {{ usd(-amPnl * n) }}.
:::

There was nothing you could do on Friday morning. The options stopped trading Thursday; their fate was set by opening prints you did not control. That is the core rule of AM-settled options: **once you hold one past its last trading day, you are holding an overnight gap bet with no exit.**

:::warning Close AM-settled positions you are not willing to hold through the open
If a short AM-settled position is near the money on Thursday afternoon, decide before the close whether you can live with any opening print. If not, close it, even if it looks almost certain to expire worthless. "Almost certain" is how AM settlement catches people.
:::

## Which one should you trade?

- **For short-dated trades and anything you might manage on expiration day**, PM settlement lets you trade until the end and settle on a number you can watch.
- **AM-settled monthlies** are mainly used by institutions and in strategies linked to futures and volatility products that settle the same way. If you trade them, plan to be flat or fully hedged by Thursday's close, or accept the gap.
- **Check the symbol.** On most platforms the AM-settled monthly SPX options trade under SPX and the PM-settled series under SPXW. The expiration date alone does not tell you which you are looking at, because both can expire on the same third Friday.

Both kinds are cash-settled and European. Neither can be assigned early or leave you with a stock position. The question is only *when* the settlement value is fixed.

Move HBR in the position builder to see where the spread's payoff changes. The AM-settled and PM-settled versions have exactly the same payoff diagram; what differs is which index number is plugged into it.

```tool position-builder
{ title: 'Short HBR 4,950/4,925 put spread, one day left', underlying: 'HBR', spot: 5000, legs: legs, range: [4850, 5050] }
```

:::key
PM-settled index options (SPXW, XSP) settle on the closing value and trade until 4:00 p.m. ET on expiration day. AM-settled standard monthly SPX options stop trading the day before and settle on the special opening quotation, built from each component's opening price on expiration morning. That leaves an overnight gap you cannot trade out of, so close AM-settled positions you would not hold through any opening print.
:::

```quiz
- q: >-
    Your short HBR put spread is AM-settled and HBR closes at 5,000 on its last trading day. Overnight news knocks the market down and the special opening quotation is 4,910. HBR then recovers to close at 4,960. What is your result?
  choices:
    - >-
      {{ usd(amPnl) }}, settled on the 4,910 opening quotation
    - >-
      {{ usd(pmPnl) }}, settled on the 4,960 close
    - >-
      You can choose the better of the two
  answer: 0
  explain: >-
    AM-settled options settle on the special opening quotation, 4,910, which puts the spread at its maximum loss. The 4,960 close is used only for PM-settled series. Holders and writers have no choice of settlement value; it is fixed by the contract.
- q: >-
    On Friday morning, before the open, you want to close an AM-settled SPX option that expires that day. What can you do?
  choices:
    - >-
      Sell it at the open
    - >-
      Nothing; its last trading day was Thursday
    - >-
      Trade it in the Global Trading Hours session
  answer: 1
  explain: >-
    AM-settled SPX options stop trading on the business day before expiration. On Friday morning they are waiting for the settlement value; no session, regular or overnight, trades them. That is exactly why the gap risk cannot be managed after Thursday.
- q: >-
    Why can the special opening quotation differ from the index level shown at 9:35 a.m.?
  choices:
    - >-
      It uses each component's first trade of the day, whenever it happens, rather than prices at one moment
    - >-
      It is the previous day's close
    - >-
      It is set by the OCC to reduce volatility
  answer: 0
  explain: >-
    The SOQ combines every component's opening price, and components open at slightly different times (some late), so it is not a level the index ever showed in real time. It is not the previous close, and the OCC does not set or adjust it; the OCC uses the published value to settle exercises.
- q: >-
    You want to trade an HBR-style index put spread expiring this Friday and expect to manage it during Friday's session. Which series is the better fit?
  choices:
    - >-
      The PM-settled series
    - >-
      The AM-settled monthly series
    - >-
      Either; they settle on the same number
  answer: 0
  explain: >-
    PM-settled series trade until 4:00 p.m. ET on expiration day and settle on the closing value, so you can manage the position all day. AM-settled monthlies stop trading on Thursday and settle on Friday's opening prices. They often settle on different numbers, as the worked example showed.
```
