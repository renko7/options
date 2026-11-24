---
title: Index options, Section 1256 and reporting
summary: Know which options get 60/40 treatment and year-end mark-to-market, why SPY options do not, how it all reaches your tax return, and what your broker's forms leave for you to do.
---

```calc
const ST = 0.32, LT = 0.15;
const blended = 0.6 * LT + 0.4 * ST;
const hDec = chain(HBR, { dte: 30 });
const c5000 = hDec.rows.find((r) => r.strike === 5000).call;
const cost1 = c5000.ask;
const leg1 = [{ kind: 'call', qty: 1, strike: 5000, premium: cost1, dte: 30, iv: c5000.iv }];
const val1 = bs.price({ S: 5100, K: 5000, T: 18 / 365, r: RATE, q: HBR.q, sigma: c5000.iv, type: 'call' });
const sale1 = Number((Math.round(val1 / 0.05) * 0.05).toFixed(2));
const gain1 = (sale1 - cost1) * 100;
const tax1256 = gain1 * blended;
const taxEq = gain1 * ST;
const hMar = chain(HBR, { dte: 121 });
const m5000 = hMar.rows.find((r) => r.strike === 5000).call;
const cost2 = m5000.ask;
const mark = (S, d) => Number(bs.price({ S, K: 5000, T: (121 - d) / 365, r: RATE, q: HBR.q, sigma: m5000.iv, type: 'call' }).toFixed(2));
const fmvDec31 = mark(5150, 43);
const sale2 = Number((Math.round(mark(5050, 84) / 0.05) * 0.05).toFixed(2));
const y2026 = (fmvDec31 - cost2) * 100;
const y2027 = (sale2 - fmvDec31) * 100;
// carryback
const loss1256 = 12000;
const carryoverNoElection = loss1256 - 3000;
const netLoss = Math.min(loss1256, carryoverNoElection);
const prior = [['2023', 5000], ['2024', 0], ['2025', 9000]];
let left = netLoss;
const used = prior.map(([y, g]) => { const u = Math.min(left, g); left -= u; return [y, g, u]; });
const cbRow = ([y, g, u]) => `| ${y} | ${usd(g, 0)} | ${usd(u, 0)} | ${usd(u * 0.6, 0)} / ${usd(u * 0.4, 0)} |`;
```

Everything in this Module so far applies to options on individual stocks and ETFs. Options on broad-based stock indexes, such as SPX, play by a different and, for most traders, more favorable set of rules. The difference between an SPX option and an SPY option, which track nearly the same thing, can be a third of the tax bill.

## Section 1256 contracts

:::rule Which options are Section 1256 contracts (as of 2026)
A [[Section 1256 contract]] includes any nonequity option. A nonequity option is any listed option (traded on a qualified exchange) that is not an equity option, and it includes options on broad-based stock indexes. An equity option is an option to buy or sell stock, or whose value is determined by reference to any stock or a narrow-based security index. Cash-settled options on a stock index are nonequity options if the SEC has determined that the index is broad-based.
:::

In practice:

- **Broad-based index options** (SPX, XSP, NDX, RUT and their weekly and mini versions) are nonequity options, so Section 1256 contracts. Cboe and Nasdaq describe them that way, and brokers report them as such.
- **ETF options**, including SPY, QQQ and IWM, are options to buy or sell shares, and ETF shares are stock. They are equity options, taxed under the ordinary rules of the earlier Lessons, even though SPY and SPX follow the same index.
- **Options on individual stocks** are equity options.

The Course's [[index option]] examples use HBR, the Harbor 100. For tax purposes, treat HBR options as you would SPX: cash-settled options on a broad-based index, listed on a US exchange. [Index options and 0DTE](#core-13) covers their mechanics.

## The 60/40 rule

:::rule The 60/40 rule (as of 2026)
Any capital gain or loss on a Section 1256 contract is treated as 60% long-term and 40% short-term, regardless of how long you held the contract.
:::

:::example The same trade, two tax bills
On {{ longDate(TODAY) }} you buy one HBR December 5000 call at {{ usd(cost1) }}, or {{ usd(cost1 * 100) }}. Twelve days later HBR is at 5,100 and you sell the call at {{ usd(sale1) }}. Gain: **{{ usd(gain1) }}**.

**As a Section 1256 contract:** {{ usd(gain1 * 0.6) }} long-term and {{ usd(gain1 * 0.4) }} short-term. At the Module's assumed rates ({{ pct(LT, 0) }} and {{ pct(ST, 0) }}), the tax is {{ usd(gain1 * 0.6) }} × {{ pct(LT, 0) }} + {{ usd(gain1 * 0.4) }} × {{ pct(ST, 0) }} = **{{ usd(tax1256) }}**, a blended rate of {{ pct(blended, 1) }}.

**If the same gain came from an equity option**, such as an SPY or ACME call held twelve days, all of it is short-term: {{ usd(taxEq) }}.

The 1256 treatment saves {{ usd(taxEq - tax1256) }}, about {{ pct(1 - blended / ST, 0) }} of the tax, on a twelve-day trade.
:::

The rule cuts both ways. A Section 1256 *loss* is also 60% long-term, so it offsets less valuable long-term gains first. For a trader who expects to lose money on index options, the treatment is less helpful than it looks.

## Mark-to-market at year end

:::rule Year-end mark-to-market (as of 2026)
A Section 1256 contract you hold at the end of the tax year is treated as sold at its fair market value on the last business day of the year, and the gain or loss is taken into account for that year (60/40). When you later close the contract, your gain or loss is adjusted for the amount already taken into account. The same marking applies when a contract is closed during the year by offset, exercise, assignment or expiration. The wash sale rule does not apply to a loss taken into account only because of the year-end marking.
:::

:::example An HBR call held over New Year
On {{ longDate(TODAY) }} you buy one HBR March 5000 call at {{ usd(cost2) }}. On Thursday, December 31, 2026, the last business day of the year, HBR is at 5,150 and the call's fair market value is {{ usd(fmvDec31) }}.

**2026:** you are taxed as if you sold it at {{ usd(fmvDec31) }}: a gain of {{ usd(y2026) }}, 60/40, even though you still hold the call and have no cash from it.

**2027:** on February 10, with HBR at 5,050, you sell at {{ usd(sale2) }}. Your 2027 result is measured from the year-end mark: {{ usd(sale2) }} − {{ usd(fmvDec31) }} = {{ usd(y2027 / 100) }} a share, a {{ y2027 < 0 ? 'loss' : 'gain' }} of {{ usd(Math.abs(y2027)) }}, also 60/40.

Over the two years the total is {{ usd(y2026 + y2027) }}, exactly the trade's real P&L, but you paid tax on the 2026 part in 2026.
:::

[[Mark-to-market]] removes the year-end games that the straddle and wash sale rules exist to police. That is why the straddle loss deferral rules do not apply to a straddle made entirely of Section 1256 contracts: an HBR iron condor's legs are all marked each year end anyway.

:::rule Straddles of Section 1256 contracts only (as of 2026)
If all the offsetting positions making up a straddle are Section 1256 contracts (and the straddle is not part of a larger straddle), the straddle loss deferral rules do not apply to it.
:::

## The loss carryback election

:::rule Section 1256 loss carryback (as of 2026)
An individual with a net Section 1256 contracts loss can elect to carry it back 3 years instead of only forward. The amount carried back to a year cannot exceed that year's net Section 1256 contracts gain, and cannot create or increase a net operating loss. It goes to the earliest year first. In each carryback year it is treated as 60% long-term and 40% short-term. The net Section 1256 contracts loss is the smaller of the year's net capital loss from Section 1256 contracts alone and the capital loss carryover you would have without the election. The election is made by checking box D on Form 6781; the carryback is claimed on an amended return or Form 1045 for the earlier year.
:::

:::example Carrying an index-option loss back
In 2026 your only capital transactions are HBR options, with a net loss of {{ usd(loss1256, 0) }}. Without the election you would deduct $3,000 against other income and carry {{ usd(carryoverNoElection, 0) }} forward, so the net Section 1256 contracts loss available to carry back is {{ usd(netLoss, 0) }}.

| Year | Net 1256 gain that year | Loss carried back | Treated as (long / short) |
|---|---|---|---|
{{ used.map(cbRow).join('\n') }}

The {{ usd(netLoss, 0) }} is absorbed by earlier gains on which you already paid tax, producing refunds for those years. Any part not absorbed would carry forward as usual.
:::

## How it reaches your return

| Option | Broker form | Your form | Character |
|---|---|---|---|
| Stock and ETF options (including SPY) | Form 1099-B, one entry per closed trade | Form 8949, then Schedule D | By holding period; nearly always short-term |
| Broad-based index options (SPX, XSP, NDX, RUT) | Form 1099-B boxes 8–11, one aggregate profit or loss | [[Form 6781]] Part I, then Schedule D | 60/40 |
| Straddle losses subject to deferral | Not computed by the broker | Form 6781 Part II | By the straddle rules |

:::rule Reporting Section 1256 contracts (as of 2026)
Report gains and losses from all Section 1256 contracts open at year end or closed during the year in Part I of Form 6781, including the aggregate amount from box 11 of Form 1099-B. Form 6781 splits the net result 40% short-term (to Schedule D line 4) and 60% long-term (to Schedule D line 11).
:::

## What the 1099-B leaves to you

:::rule Limits of broker reporting (as of 2026)
Brokers must report wash sales only when the sale and the purchase are of covered securities with the same CUSIP number in the same account. In reporting basis and holding period, brokers are not required to consider transactions outside the account, and are not required to apply the constructive sale rules (section 1259), the straddle rules (section 1092) or the short sale holding-period rules for puts (section 1233(b)). You must apply all of these rules whether or not the broker did.
:::

So the checklist from this Module, before you file:

1. **Wash sales across accounts and instruments**: stock sold at a loss and calls bought within 30 days, purchases in another account, your spouse's account or an IRA.
2. **Straddles**: losing legs closed while offsetting legs with gains stayed open over year end, and protective puts or non-qualified covered calls that reset a holding period.
3. **Covered calls**: whether each call written was qualified, and whether in-the-money ones suspended the stock's holding period.
4. **Assignments**: whether the premium appears in the stock's proceeds or basis.
5. **Index versus ETF options**: whether each index option was reported as a Section 1256 contract.

:::key
Broad-based index options such as SPX, XSP, NDX and RUT are Section 1256 contracts: every gain or loss is 60% long-term and 40% short-term regardless of holding period, open positions are marked to market on the last business day of the year, they are reported on Form 6781, and net losses can be carried back three years against earlier 1256 gains. ETF options like SPY are equity options and get none of this. Brokers' forms skip the straddle, constructive sale and most wash sale adjustments; those are yours.
:::

```quiz
- q: >-
    You make the same {{ usd(gain1) }} gain on a twelve-day SPX call and on a twelve-day SPY call. Using the Module's assumed rates, what is the tax on each?
  choices:
    - >-
      {{ usd(tax1256) }} on both
    - >-
      SPX {{ usd(tax1256) }}, SPY {{ usd(taxEq) }}
    - >-
      SPX {{ usd(taxEq) }}, SPY {{ usd(tax1256) }}
  answer: 1
  explain: >-
    SPX options are Section 1256 contracts, so the gain is 60% long-term and 40% short-term, a blended {{ pct(blended, 1) }}. SPY options are options on ETF shares, which are stock, so they are equity options: a twelve-day gain is entirely short-term at {{ pct(ST, 0) }}. Tracking the same index does not make the tax treatment the same.
- q: >-
    You bought an HBR March call for {{ usd(cost2) }}; its fair market value on December 31 is {{ usd(fmvDec31) }} and you still hold it. What goes on your 2026 return?
  choices:
    - >-
      Nothing, because you have not sold it
    - >-
      A {{ usd(y2026) }} gain, 60% long-term and 40% short-term
    - >-
      A {{ usd(y2026) }} short-term gain
  answer: 1
  explain: >-
    Section 1256 contracts held at year end are treated as sold at fair market value on the last business day, so the {{ usd(y2026) }} unrealized gain is taxed for 2026, split 60/40. The "not sold yet" rule applies to equity options, not to Section 1256 contracts. The 60/40 split applies to marked gains just as to closed ones.
- q: >-
    You sell the HBR call in February 2027 for {{ usd(sale2) }}. What is your 2027 result?
  choices:
    - >-
      {{ usd((sale2 - cost2) * 100) }}, measured from what you paid
    - >-
      {{ usd(y2027) }}, measured from the December 31 value
    - >-
      Nothing, because the gain was already taxed
  answer: 1
  explain: >-
    The year-end mark already taxed the gain up to {{ usd(fmvDec31) }}, so 2027 picks up only the change since then: {{ usd(sale2) }} − {{ usd(fmvDec31) }}, or {{ usd(y2027) }} on the contract. Measuring from the purchase price would tax the 2026 gain twice. There is still a 2027 result because the price moved after December 31.
- q: >-
    Which of these will your 1099-B most likely get right without your help?
  choices:
    - >-
      A loss on ACME shares followed within 30 days by buying ACME calls in another account
    - >-
      The aggregate profit or loss on your SPX options for the year
    - >-
      A loss on a protective put deferred because the stock had a larger unrealized gain at year end
  answer: 1
  explain: >-
    Brokers report Section 1256 contracts as one aggregate amount in boxes 8–11, and you carry it to Form 6781. They are not required to look at other accounts for wash sales, and not required to apply the straddle loss deferral rules, so the other two adjustments are yours to make.
```
