---
title: "Scenario: year-end tax decisions"
summary: Harvest a stock loss without a wash sale, choose a covered call that keeps the straddle rules away, and pick the instrument for next year's index trading.
kind: scenario
---

```calc
const ST = 0.32, LT = 0.15;
const blended = 0.6 * LT + 0.4 * ST;
const jan = chain(ACME, { dte: 58 });
const dec = chain(ACME, { dte: 30 });
const row = (c, k) => c.rows.find((r) => r.strike === k);
const lossShares = 200, lossBasis = 120;
const loss = (lossBasis - 100) * lossShares;
const lossValue = loss * ST;
const callAsk = row(jan, 100).call.ask;
const callBasisEach = callAsk * 100 + loss / 2;
const c105 = row(jan, 105).call.bid;
const c95dec = row(dec, 95).call.bid;
const c90jan = row(jan, 90).call.bid;
const gainPlan = 10000;
const taxIdx = gainPlan * blended;
const taxEtf = gainPlan * ST;
```

This Scenario applies the whole Module. As everywhere in it, the rates are illustrative assumptions ({{ pct(ST, 0) }} short-term, {{ pct(LT, 0) }} long-term), and this is general education, not tax advice.

```scenario
setup: >-
  It is {{ longDate(TODAY) }}. In your taxable account you hold two lots of ACME, now at $100: {{ int(lossShares) }} shares bought in March 2026 at ${{ int(lossBasis) }} (an unrealized short-term loss of {{ usd(loss, 0) }}), and 100 shares bought in 2023 at $70. You have {{ usd(loss, 0) }} of short-term gains from option trades earlier this year. You still like ACME.
steps:
  - prompt: >-
      You want to realize the {{ usd(loss, 0) }} loss on the March lot this year without losing your bullish view. What do you do?
    choices:
      - text: >-
          Sell the {{ int(lossShares) }} March-lot shares and, the next day, buy two ACME January 100 calls at {{ usd(callAsk) }}
        grade: poor
        feedback: >-
          Two calls are options to buy 200 shares of the same stock within 30 days of the loss sale, so the entire {{ usd(loss, 0) }} loss is a wash sale. It moves into the calls' basis (about {{ usd(callBasisEach) }} each) and comes back only when you sell them, most likely in 2027. Your broker probably will not flag it, because the calls are a different security from the shares.
      - text: >-
          Sell the March-lot shares and buy 200 ACME shares in your IRA the same day
        grade: poor
        feedback: >-
          A purchase in your IRA within the window is a wash sale too, and this is the one case where the disallowed loss is not added to any basis: it is lost for good.
      - text: >-
          Sell the March-lot shares and stay out of ACME and ACME options (in every account, including your spouse's) for 31 days, holding a different company or a broad index fund in the meantime if you want market exposure
        grade: best
        feedback: >-
          The {{ usd(loss, 0) }} short-term loss offsets your {{ usd(loss, 0) }} of short-term option gains, worth about {{ usd(lossValue) }} at the assumed {{ pct(ST, 0) }} rate. Stock of a different company is ordinarily not substantially identical. Keeping the 2023 lot is fine: the wash sale rule looks at acquisitions in the 61-day window, not shares you already held.
      - text: >-
          Sell the March-lot shares and write two deep in-the-money ACME puts to get back in
        grade: poor
        feedback: >-
          The IRS has treated writing a put so deep in the money that it is almost certain to be exercised as, in substance, a contract to acquire the stock. That can make the sale a wash sale, and the puts carry the full downside of the shares you just sold.
  - prompt: >-
      On the 2023 lot (100 shares, basis $70, long-term), you want to write one call for income without bringing in the straddle rules. Which call?
    choices:
      - text: >-
          The January 105 call at {{ usd(c105) }}: 58 days to expiration, out of the money
        grade: best
        feedback: >-
          More than 30 days to expiration, not more than 12 months, and above the $95 benchmark: a qualified covered call. The stock and call are outside the straddle loss deferral rules. If the call expires, the {{ usd(c105 * 100) }} is a short-term gain in 2027; if it is assigned, the premium is added to a long-term gain on the shares.
      - text: >-
          The December 95 call at {{ usd(c95dec) }}: more premium, 30 days to expiration
        grade: poor
        feedback: >-
          Thirty days is not more than 30 days, so the call is not qualified and the stock plus call form a tax straddle. A loss on either leg can be deferred while the other shows a gain at year end, and the extra premium is mostly intrinsic value you would hand back on assignment.
      - text: >-
          The January 90 call at {{ usd(c90jan) }}, for downside cushion
        grade: poor
        feedback: >-
          The lowest qualified benchmark for a 58-day ACME call is $95, so a 90 strike is deep in the money and not qualified. The position is a tax straddle, with the loss deferral rules attached.
  - prompt: >-
      For 2027 you plan a short-term strategy of buying index calls for a few days at a time, and you hope for about {{ usd(gainPlan, 0) }} of gains. Should the trades be in SPY options or in broad-based index options such as SPX or XSP?
    choices:
      - text: >-
          Broad-based index options, sized to fit the account (XSP is one tenth the size of SPX)
        grade: best
        feedback: >-
          As Section 1256 contracts, gains are 60% long-term and 40% short-term however briefly held: about {{ usd(taxIdx) }} on {{ usd(gainPlan, 0) }}, against {{ usd(taxEtf) }} if the same gains came from SPY options. Remember that open positions are marked to market at year end, and that losses are 60/40 too.
      - text: >-
          SPY options, since they track the same index and the tax is the same
        grade: poor
        feedback: >-
          SPY options are options on ETF shares, which are stock, so they are equity options with ordinary treatment: a few-day gain is all short-term, about {{ usd(taxEtf) }} on {{ usd(gainPlan, 0) }}. Following the same index does not give them the same tax treatment.
      - text: >-
          SPY options, because you want American-style exercise and contracts small enough for your account
        grade: acceptable
        feedback: >-
          Those are real trading reasons, and size can matter for a small account. But the cost is about {{ usd(taxEtf - taxIdx) }} more tax on {{ usd(gainPlan, 0) }} of gains, and XSP addresses most of the size issue. Make the choice knowing the price of it.
wrap: >-
  Each decision depended on a rule your broker's forms would not have applied for you: wash sales triggered by options or by purchases in other accounts, the qualified covered call test that keeps stock and calls out of the straddle rules, and the Section 1256 status that separates SPX and XSP from SPY. The trading decision always comes first, but knowing the rules lets you choose between trades that are economically similar and taxed very differently.
```
