---
title: Taxes when you buy options
summary: Work out the tax result of every way a long option can end (sold, expired, or exercised) and how exercise moves the premium into the stock's basis or sale price.
---

```calc
const ST = 0.32, LT = 0.15;
const jan = chain(ACME, { dte: 58 });
const row = (k) => jan.rows.find((r) => r.strike === k);
const putAsk = row(95).put.ask;
const nPut = 3;
const expLoss = putAsk * 100 * nPut;
const callAsk = row(95).call.ask;
const callBasis = 95 + callAsk;
const stockSale = 112;
const gainStock = (stockSale - callBasis) * 100;
const gainIfSold = (110 - 95 - callAsk) * 100;
const oldBasis = 70;
const amtRealized = 95 - putAsk;
const putGain = (amtRealized - oldBasis) * 100;
const putTax = putGain * LT;
const callLegs = [{ kind: 'call', qty: 1, strike: 95, premium: callAsk, dte: 58, iv: row(95).call.iv }];
```

A long option can end in three ways: you sell it, it expires, or you exercise it. Each has its own tax treatment, and one of them (exercise) does not produce a gain or loss at all at the time it happens. This Lesson works through all three for calls and puts. Everything here assumes a taxable account and the illustrative rates from [the first Lesson](#core-14-tax-basics): {{ pct(ST, 0) }} short-term and {{ pct(LT, 0) }} long-term.

## The premium is your basis

:::rule Buying a put or call (as of 2026)
The premium you pay for an option, plus commissions, is a capital expenditure. It is not deductible when you pay it; it is your basis in the option.
:::

Nothing is reported when you buy. The tax result appears when the position ends.

## Selling and expiring

:::rule Closing or letting a long option expire (as of 2026)
If you sell an option you hold, the difference between its cost and what you receive is a capital gain or loss, short-term or long-term according to how long you held the option. If the option expires, its cost is a capital loss, treated as if you sold the option on the expiration date; the holding period ends on that date.
:::

The expiration rule has a timing consequence that surprises people at year end: an option that is obviously worthless in December but expires in January produces its loss in January, in the next tax year.

:::example A put that expires worthless
On {{ longDate(TODAY) }} you buy {{ int(nPut) }} ACME January 95 puts at {{ usd(putAsk) }}, for {{ usd(expLoss) }}. ACME stays above $95 and the puts expire worthless on {{ longDate(expiryDate(58)) }}.

You have a short-term capital loss of **{{ usd(expLoss) }}**, dated {{ longDate(expiryDate(58)) }}, so it belongs on your **2027** return, even though you paid the premium in 2026. If you want the loss in 2026, you have to sell the puts no later than December 31 (the trade date is what counts), for whatever small amount they still fetch.
:::

## Exercising a call

:::rule Exercising a call (as of 2026)
If you exercise a call, add its cost to the basis of the stock you buy. Exercise itself produces no gain or loss. Your holding period for the stock begins the day after you exercise; the time you held the call does not count.
:::

:::example Exercise versus sale
On {{ longDate(TODAY) }} you buy one ACME January 95 call at {{ usd(callAsk) }}. At January expiration ACME is at $110. You have two choices.

**Sell the call** for its $15.00 of intrinsic value. Short-term gain: ($15.00 − {{ usd(callAsk) }}) × 100 = {{ usd(gainIfSold) }}, on your 2027 return.

**Exercise it.** You pay $9,500 for 100 shares. Your basis in the shares is $95 + {{ usd(callAsk) }} = **{{ usd(callBasis) }}** a share. No tax arises on exercise. The shares' holding period starts the day after the exercise. If you sell them two months later at ${{ int(stockSale) }}, the gain is ({{ usd(stockSale) }} − {{ usd(callBasis) }}) × 100 = {{ usd(gainStock) }}, short-term, because you held the *shares* for two months.
:::

Two things follow. Exercising defers the tax result until you sell the stock, which can move it into a later year. And it does not let you carry the option's holding period over: a LEAPS call held 18 months and then exercised gives you shares with a brand-new holding period. If you want a long-term result from a profitable LEAPS, sell the LEAPS itself after more than a year.

```tool position-builder
{ title: 'Long one ACME January 95 call', legs: callLegs, range: [85, 120] }
```

The payoff is the same whether you sell the call at expiration or exercise and sell the shares at once; only the tax timing and the holding period differ.

## Exercising a put

:::rule Exercising a put (as of 2026)
If you exercise a put, you sell the underlying stock at the strike, and you reduce the amount realized on that sale by the cost of the put. The gain or loss on the stock is short-term or long-term according to how long you held the *stock*.
:::

:::example A protective put on stock held for years
You bought 100 ACME shares at ${{ int(oldBasis) }} in 2023. On {{ longDate(TODAY) }} you buy one ACME January 95 put at {{ usd(putAsk) }} to protect the gain. In January ACME falls to $88 and you exercise, selling the shares at $95.

Amount realized: $95 − {{ usd(putAsk) }} = {{ usd(amtRealized) }} a share. Gain: ({{ usd(amtRealized) }} − {{ usd(oldBasis) }}) × 100 = **{{ usd(putGain) }}**, long-term because the shares were held for years. At the assumed {{ pct(LT, 0) }} rate, tax {{ usd(putTax) }}.

The put's cost did not become a separate short-term loss; it reduced a long-term gain.
:::

That example works cleanly because the shares had been held for more than a year before the put was bought. Buying a put on stock you have held for a year or less is different: the tax law treats it much like a short sale, and it can wipe out the holding period you had built up. The [straddles Lesson](#core-14-straddles) covers that rule and its exception for puts bought the same day as the stock.

:::warning Automatic exercise has tax consequences too
An in-the-money option is usually exercised automatically at expiration (see [Exercise, assignment and expiration](#core-07)). For a long call that means you now own shares, with a basis that includes the premium and a new holding period, and possibly a margin balance. If you meant to take a gain on the option, sell it before expiration.
:::

:::key
For an option you buy, the premium is basis. Selling it gives a capital gain or loss by the option's holding period; expiring gives a capital loss on the expiration date, in that year. Exercise is not a taxable event: a call's premium is added to the stock's basis and the stock gets a new holding period, and a put's premium reduces the amount realized on the stock you sell.
:::

```quiz
- q: >-
    You exercise an ACME January 95 call you bought for {{ usd(callAsk) }}. What is your basis per share in the stock?
  choices:
    - >-
      $95.00
    - >-
      {{ usd(callBasis) }}
    - >-
      $110.00, the market price on the exercise date
  answer: 1
  explain: >-
    The call's cost is added to the price you pay on exercise: $95 + {{ usd(callAsk) }} = {{ usd(callBasis) }}. Using $95 alone would lose the premium from your tax records, overstating the eventual gain. The market price on the exercise date is irrelevant: exercising is not a sale, and no gain is recognized then.
- q: >-
    You hold puts bought in November 2026 that are worthless but expire on {{ longDate(expiryDate(58)) }}. In which tax year is the loss?
  choices:
    - >-
      2026, because that is when you paid for them
    - >-
      2027, the year they expire, unless you sell them before year end
    - >-
      Neither: an option that expires worthless gives no deductible loss
  answer: 1
  explain: >-
    An expired option is treated as sold on its expiration date, so the loss falls in 2027. Paying the premium is not a deductible event. Selling the puts for a few cents by December 31 would move the loss into 2026. The loss is a genuine capital loss, not disallowed.
- q: >-
    You held a LEAPS call for 18 months, then exercised it and sold the shares a week later at a gain. Is the gain on the shares long-term?
  choices:
    - >-
      Yes, because the call was held more than a year
    - >-
      No, the shares' holding period started the day after exercise, so the gain is short-term
    - >-
      Yes, because exercise is not a taxable event
  answer: 1
  explain: >-
    The holding period of shares bought by exercising a call begins the day after exercise; the option's holding period does not carry over. Exercise is indeed not taxable, but that only means no gain is recognized at exercise; it does not extend the holding period. Selling the LEAPS itself after 18 months would have given a long-term result.
- q: >-
    You own ACME shares bought at ${{ int(oldBasis) }} years ago and exercise a 95 put that cost {{ usd(putAsk) }}. What is your gain per share?
  choices:
    - >-
      {{ usd(95 - oldBasis) }} long-term, plus a {{ usd(putAsk) }} short-term loss on the put
    - >-
      {{ usd(amtRealized - oldBasis) }} long-term
    - >-
      {{ usd(amtRealized - oldBasis) }} short-term, because the put was held less than a year
  answer: 1
  explain: >-
    The put's cost reduces the amount realized to {{ usd(amtRealized) }}, so the gain is {{ usd(amtRealized - oldBasis) }} a share, long-term because the shares were held for years. The put does not produce a separate loss when exercised, and its own holding period does not decide the character of the stock sale.
```
