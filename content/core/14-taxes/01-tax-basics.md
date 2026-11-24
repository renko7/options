---
title: How option gains are taxed
summary: Know how US federal tax treats option gains and losses in a taxable account, how the holding period decides short-term versus long-term, and how gains and losses are netted.
---

```calc
const ST = 0.32, LT = 0.15;
const jan = chain(ACME, { dte: 58 });
const c105 = jan.rows.find((r) => r.strike === 105).call;
const buy = c105.ask;
const sellPx = Number((Math.round(bs.price({ S: 108, K: 105, T: 37 / 365, r: RATE, q: ACME.q, sigma: c105.iv, type: 'call' }) / 0.05) * 0.05).toFixed(2));
const gain1 = (sellPx - buy) * 100 * 2;
const tax1 = gain1 * ST;
const leaps = chain(ACME, { dte: 394 }).rows.find((r) => r.strike === 100).call;
const lBuy = leaps.ask;
const lIv = leaps.iv;
const pxOn = (days) => Number((Math.round(bs.price({ S: 125, K: 100, T: days / 365, r: RATE, q: ACME.q, sigma: lIv, type: 'call' }) / 0.05) * 0.05).toFixed(2));
const lSell18 = pxOn(29), lSell19 = pxOn(28);
const lGain18 = (lSell18 - lBuy) * 100, lGain19 = (lSell19 - lBuy) * 100;
const lTax18 = lGain18 * ST, lTax19 = lGain19 * LT;
// netting
const stGain = 6000, stLoss = 12500, ltGain = 2000;
const stNet = stGain - stLoss;
const total = stNet + ltGain;
const deduct = Math.min(3000, -total);
const carry = -total - deduct;
```

Options are taxed by rules written mostly for stocks, with a few additions that matter a great deal to anyone who trades them actively. This Module covers those rules: how buying and writing options are taxed, how options interact with the stock you own, the wash sale and straddle rules that catch active traders, and the very different treatment of broad-based index options.

:::note Not tax advice
This Module is general education on US federal income tax rules as of 2026 for individuals trading in an ordinary taxable brokerage account. It is not tax advice. It leaves out state and local taxes and other federal surtaxes, and it does not cover traders who qualify for trader tax status, dealers, or tax-advantaged accounts such as IRAs, which follow different rules. Tax law changes, and applying it to a specific situation needs a qualified tax professional. Every rule here is stated in a Rule Note so you can see exactly what is being claimed and check it against the IRS's current Publication 550 and form instructions.
:::

## Options produce capital gains and losses

When you buy an option and later sell it, the difference between what you received and what you paid is a [[capital gain]] or capital loss, exactly as with a stock.

:::rule Options on capital assets (as of 2026)
Gain or loss from selling or trading an option to buy or sell property that is a capital asset in your hands (or would be if you acquired it) is capital gain or loss. For an investor, listed options on stocks, ETFs and indexes are in this category. Commissions and fees are part of the cost: they add to your basis when you buy and reduce your proceeds when you sell.
:::

The amount you paid, including commissions, is your **basis**. The amount you received when you closed is your **amount realized**. Gain or loss is the difference, recognized in the tax year in which the position is closed (by sale, expiration, exercise or assignment, each covered in the next two Lessons), not when the market value changes.

## Short-term and long-term: the holding period

:::rule Holding period (as of 2026)
If you hold a capital asset for more than 1 year, the gain or loss is long-term; for 1 year or less, it is short-term. You start counting on the day after you acquired the asset, and the day you dispose of it counts. For securities traded on an exchange, the [[holding period]] runs from the day after the trade date of the purchase to the trade date of the sale, not the settlement dates.
:::

:::rule Rates (as of 2026)
Net short-term capital gains are taxed at your ordinary income tax rates. Net long-term capital gains are taxed at lower maximum rates, which for most investment gains are 0%, 15% or 20% depending on income.
:::

Real rates depend on income, filing status and the year. To make the arithmetic concrete, this Module uses two **illustrative assumptions**: a short-term rate of **{{ pct(ST, 0) }}** and a long-term rate of **{{ pct(LT, 0) }}**. They are round numbers for teaching, not your rates.

:::example A short-term gain on a call
On {{ longDate(TODAY) }} you buy two ACME January 105 calls at {{ usd(buy) }}. On {{ longDate('2026-12-09') }}, with ACME at $108, you sell them at {{ usd(sellPx) }}.

Gain: ({{ usd(sellPx) }} − {{ usd(buy) }}) × 100 × 2 = **{{ usd(gain1) }}**, held 21 days, so short-term. At the assumed {{ pct(ST, 0) }} rate, the tax is {{ usd(tax1) }}, and it belongs on your 2026 return because the trade closed in 2026.
:::

Since most options are held for weeks or months, nearly all gains from trading listed equity options are short-term. The exception is [[LEAPS]], which last long enough to cross the one-year line, and there the counting rule decides real money.

:::example One day, two tax rates
On {{ longDate(TODAY) }} you buy one ACME December 2027 100 call (a LEAPS) at {{ usd(lBuy) }}. A year later ACME is at $125.

- Sell on **{{ longDate('2027-11-18') }}** at {{ usd(lSell18) }}: you have held it exactly one year, which is not *more* than one year. Gain {{ usd(lGain18) }}, short-term, tax {{ usd(lTax18) }} at {{ pct(ST, 0) }}.
- Sell on **{{ longDate('2027-11-19') }}** at {{ usd(lSell19) }}: held more than one year. Gain {{ usd(lGain19) }}, long-term, tax {{ usd(lTax19) }} at {{ pct(LT, 0) }}.

Waiting one day, with ACME unchanged, costs almost nothing in time value and saves {{ usd(lTax18 - lTax19) }} of tax. The market can move a lot in a day, so the trade-off is a real one, but you can only weigh it if you know the dates.
:::

## Netting gains and losses

You do not pay tax on each trade separately. At year end, all your capital gains and losses are combined.

:::rule Netting and the capital loss limit (as of 2026)
Short-term gains and losses are netted against each other, and long-term gains and losses against each other; the two net results are then combined. If the overall result is a net capital loss, you can deduct up to $3,000 of it against other income ($1,500 if married filing separately). The rest carries over to later years, keeping its short-term or long-term character, until it is used up.
:::

:::example A year of option trading
Over the year you have {{ usd(stGain, 0) }} of short-term gains and {{ usd(stLoss, 0) }} of short-term losses from options, plus a {{ usd(ltGain, 0) }} long-term gain on a stock.

- Net short-term: {{ usd(stGain, 0) }} − {{ usd(stLoss, 0) }} = {{ usd(stNet, 0) }}.
- Combined with the long-term gain: {{ usd(stNet, 0) }} + {{ usd(ltGain, 0) }} = {{ usd(total, 0) }}.
- You deduct {{ usd(deduct, 0) }} against other income this year and carry {{ usd(carry, 0) }} forward.

The short-term losses also absorbed the long-term gain, which would otherwise have been taxed at the lower long-term rate. Losses are most valuable against short-term gains, and it pays to know the character of what you have before year end.
:::

## Where it gets reported

Your broker sends a **Form 1099-B** after the year ends, listing each closed equity or ETF option trade with dates, proceeds and, for most options bought or written since 2014, the basis. You (or your software) carry those trades to **Form 8949** and the totals to **Schedule D** of Form 1040. Broad-based index options are reported differently, on [[Form 6781]]. The [last Lesson](#core-14-section-1256) shows the forms together and lists what the 1099-B does not do for you.

The figures on the 1099-B are a starting point, not the answer. The rest of this Module covers the situations, common among active option traders, where the correct tax result differs from the broker's numbers: wash sales across accounts, straddles, constructive sales and qualified covered calls.

:::key
In a taxable account, closing an option produces a capital gain or loss in the year it closes. More than one year of holding makes it long-term, counted from the day after purchase; almost all option trades are short-term and taxed at ordinary rates. Gains and losses are netted within each class and then together, with only $3,000 of net loss deductible a year and the rest carried forward.
:::

```quiz
- q: >-
    You bought an ACME LEAPS call on {{ longDate(TODAY) }}. What is the first date you can sell it for a long-term gain?
  choices:
    - >-
      {{ longDate('2027-11-18') }}
    - >-
      {{ longDate('2027-11-19') }}
    - >-
      {{ longDate('2027-11-17') }}
  answer: 1
  explain: >-
    The holding period starts the day after the purchase, {{ longDate('2026-11-19') }}, and must exceed one year. On {{ longDate('2027-11-18') }} you have held it exactly one year, which is still short-term; {{ longDate('2027-11-19') }} is the first day that is more than one year.
- q: >-
    You sold two ACME calls for a {{ usd(gain1) }} gain after 21 days. Using this Module's assumed rates, what is the tax?
  choices:
    - >-
      {{ usd(gain1 * LT) }}
    - >-
      {{ usd(tax1) }}
    - >-
      Nothing until you withdraw the money from the account
  answer: 1
  explain: >-
    Held 21 days, the gain is short-term and taxed at the assumed ordinary rate of {{ pct(ST, 0) }}: {{ usd(tax1) }}. The {{ pct(LT, 0) }} long-term rate needs a holding period of more than one year. In a taxable account the gain is taxed in the year the trade closes, whether or not you withdraw anything.
- q: >-
    Your year ends with a net capital loss of {{ usd(-total, 0) }}. How much can you deduct against your salary this year?
  choices:
    - >-
      {{ usd(-total, 0) }}
    - >-
      $3,000, with the rest carried forward
    - >-
      Nothing; capital losses only offset capital gains
  answer: 1
  explain: >-
    Net capital losses reduce other income by up to $3,000 a year ($1,500 if married filing separately). The remaining {{ usd(carry, 0) }} is not lost; it carries forward to later years. Capital losses do first offset capital gains, but the $3,000 allowance against other income exists in addition.
- q: >-
    You have a large short-term loss from options and a long-term gain from a stock in the same year. What happens?
  choices:
    - >-
      The loss reduces the long-term gain after netting, so it saves tax at the lower long-term rate
    - >-
      They are taxed separately: the gain at the long-term rate, the loss deducted at the ordinary rate
    - >-
      Short-term losses cannot offset long-term gains
  answer: 0
  explain: >-
    After each class is netted, the net short-term and net long-term results are combined, so the short-term loss absorbs the long-term gain. That is allowed, but it uses the loss against income that would have been taxed at the lower rate. There is no rule keeping the two classes separate once each has been netted.
```
