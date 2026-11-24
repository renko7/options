---
title: Taxes when you write options
summary: Work out the tax result when an option you wrote expires, is bought back, or is assigned, and see how assignment folds the premium into the stock trade.
---

```calc
const ST = 0.32, LT = 0.15;
const jan = chain(ACME, { dte: 58 });
const mar = chain(ACME, { dte: 121 });
const row = (c, k) => c.rows.find((r) => r.strike === k);
const marCall = row(mar, 110).call.bid;
const nMar = 2;
const marPrem = marCall * 100 * nMar;
const ccPrem = row(jan, 105).call.bid;
const ccBasis = 70;
const ccRealized = 105 + ccPrem;
const ccGain = (ccRealized - ccBasis) * 100;
const btc = 7.20;
const btcLoss = (btc - ccPrem) * 100;
const spPrem = row(jan, 95).put.bid;
const spBasis = 95 - spPrem;
const sellLater = 99;
const spGain = (sellLater - spBasis) * 100;
const leapsW = chain(ACME, { dte: 394 }).rows.find((r) => r.strike === 130).call.bid;
const ccLegs = [
  { kind: 'stock', qty: 100, price: 100 },
  { kind: 'call', qty: -1, strike: 105, premium: ccPrem, dte: 58, iv: row(jan, 105).call.iv },
];
```

Writing an option reverses the cash flow of buying one: you receive the premium first and find out later what it cost you. The tax rules follow the same logic. Nothing is taxed when you receive the premium; the result is settled when the obligation ends. And two of the ways it can end (expiration and buying back) always produce *short-term* results, however long the position was open.

## The premium is not income yet

:::rule Writing a put or call (as of 2026)
If you write (sell to open) a put or call, the premium you receive is not included in income when you receive it. It is held, for tax purposes, in suspense until your obligation expires, you buy or sell the stock because the option is exercised, or you close the position with an offsetting purchase.
:::

:::example Cash this year, income next year
On {{ longDate(TODAY) }} you write {{ int(nMar) }} ACME March 110 calls at {{ usd(marCall) }}, collecting {{ usd(marPrem) }}. The cash is in your account in 2026.

If the calls expire worthless on {{ longDate(expiryDate(121)) }}, the {{ usd(marPrem) }} is a short-term capital gain on your **2027** return. Nothing about this position appears on your 2026 return, even though you had the money all along.
:::

## Expiring and buying back

:::rule When a written option expires or is bought back (as of 2026)
If an option you wrote expires, the premium you received is a short-term capital gain. If you buy it back (buy to close), the difference between the premium received and the amount paid is a short-term capital gain or loss. Both are short-term regardless of how long the option was open.
:::

The "regardless of how long" part matters for anyone who writes long-dated options. If you write an ACME December 2027 130 call for {{ usd(leapsW) }} and it expires worthless 394 days later, the {{ usd(leapsW * 100) }} is still a short-term gain. A writer never gets long-term treatment on the option itself.

## Assignment folds the premium into the stock trade

When a written option is assigned, there is no separate option gain or loss. The premium becomes part of the stock transaction.

:::rule Assignment on a call you wrote (as of 2026)
If a call you wrote is exercised and you sell the stock, add the premium you received to the amount realized on the sale. The gain or loss is short-term or long-term according to how long you held the *stock*.
:::

:::example A covered call assigned
You bought 100 ACME shares at ${{ int(ccBasis) }} in 2023. On {{ longDate(TODAY) }}, with ACME at $100, you write one ACME January 105 call at {{ usd(ccPrem) }}, a [[covered call]]. At January expiration ACME is at $112 and you are assigned: your shares are sold at $105.

Amount realized: $105 + {{ usd(ccPrem) }} = {{ usd(ccRealized) }} a share. Gain: ({{ usd(ccRealized) }} − {{ usd(ccBasis) }}) × 100 = **{{ usd(ccGain) }}**, all of it long-term, because the shares were held for years. At the assumed {{ pct(LT, 0) }} rate, tax {{ usd(ccGain * LT) }}.

Suppose instead you had bought the call back just before expiration at {{ usd(btc) }} to keep the shares. You would have a **short-term** loss of ({{ usd(btc) }} − {{ usd(ccPrem) }}) × 100 = {{ usd(btcLoss) }}, and the stock's gain would stay unrealized. Same position, very different tax results: assignment converts the premium into part of a long-term gain; a buy-back produces a short-term loss now.
:::

```tool position-builder
{ title: 'Covered call: 100 ACME shares and a short January 105 call', legs: ccLegs, range: [85, 120] }
```

Covered calls interact with the stock's holding period in one more way. If the call is written in the money, it can suspend the stock's holding period, and if it does not meet the conditions of a *qualified* covered call, the position falls under the straddle rules. The [straddles Lesson](#core-14-straddles) explains both.

:::rule Assignment on a put you wrote (as of 2026)
If a put you wrote is exercised and you buy the stock, reduce your basis in the stock by the premium you received. Your holding period for the stock begins when you buy it, not when you wrote the put.
:::

:::example A cash-secured put assigned
On {{ longDate(TODAY) }} you write one ACME January 95 put at {{ usd(spPrem) }}, a [[cash-secured put]]. In January ACME is at $90 and you are assigned: you buy 100 shares at $95.

Your basis is $95 − {{ usd(spPrem) }} = **{{ usd(spBasis) }}** a share. The put produces no gain or loss of its own. The shares' holding period starts with the purchase in January 2027. If ACME recovers and you sell the shares in May 2027 at ${{ int(sellLater) }}, the gain is ({{ usd(sellLater) }} − {{ usd(spBasis) }}) × 100 = {{ usd(spGain) }}, short-term.
:::

Traders who run [[the wheel]] (selling puts, taking assignment, then selling calls on the shares) go through both of these rules in a cycle. The premiums are never taxed on their own as long as each option ends in assignment; they adjust the stock's basis and sale price, and the whole result is taxed when the shares are sold. Options that expire or are bought back along the way are separate short-term gains and losses.

## Checking the broker's numbers

When an option you wrote is assigned, the broker should fold the premium into the stock's basis (put) or sale proceeds (call) on your Form 1099-B. It does not always do so.

:::rule Premium missing from the reported proceeds (as of 2026)
If a call you wrote was exercised and the premium you received is not reflected in the sale price shown on Form 1099-B, report the sale on Form 8949 with the premium entered as a positive adjustment in column (g) and code "E" in column (f).
:::

Check every assignment on your statement: if the premium is missing, the reported gain is too small (call) or the basis too high (put), and the corresponding premium may also appear nowhere else.

:::key
Premium you receive is not taxed when you get it. If the option expires, it is a short-term gain; if you buy it back, the difference is a short-term gain or loss; either way short-term, however long the option was open. If you are assigned, the premium becomes part of the stock trade: it raises the sale price of stock called away and lowers the basis of stock put to you, and the stock's own holding period decides the character.
:::

```quiz
- q: >-
    You write an ACME December 2027 130 call for {{ usd(leapsW) }} on {{ longDate(TODAY) }}, and it expires worthless 394 days later. How is the {{ usd(leapsW * 100) }} taxed?
  choices:
    - >-
      As a long-term capital gain, since the position was open more than a year
    - >-
      As a short-term capital gain, in the year it expires
    - >-
      As ordinary income in 2026, when you received it
  answer: 1
  explain: >-
    Premium on a written option that expires is short-term capital gain regardless of how long the option was open, recognized when the option expires (here in 2027). The long-term rules apply to holders, not writers. It is not taxed when received.
- q: >-
    Your covered call on long-held ACME shares (basis ${{ int(ccBasis) }}) is assigned at $105. You received {{ usd(ccPrem) }} for the call. What is your gain per share, and its character?
  choices:
    - >-
      $35.00 long-term on the shares and {{ usd(ccPrem) }} short-term on the call
    - >-
      {{ usd(ccRealized - ccBasis) }} long-term
    - >-
      {{ usd(ccRealized - ccBasis) }} short-term, because the call was open less than a year
  answer: 1
  explain: >-
    On assignment, the premium is added to the amount realized: $105 + {{ usd(ccPrem) }} = {{ usd(ccRealized) }}, minus the {{ usd(ccBasis) }} basis, gives {{ usd(ccRealized - ccBasis) }} a share. The character follows the stock's holding period, years in this case, so it is all long-term. The call does not produce a separate short-term gain when assigned.
- q: >-
    A put you wrote for {{ usd(spPrem) }} is assigned at $95. What basis do the shares have, and when does their holding period start?
  choices:
    - >-
      {{ usd(spBasis) }}, starting when you buy the shares on assignment
    - >-
      $95.00, starting when you wrote the put
    - >-
      {{ usd(spBasis) }}, starting when you wrote the put
  answer: 0
  explain: >-
    The premium reduces the basis to $95 − {{ usd(spPrem) }} = {{ usd(spBasis) }}. The holding period begins when you actually buy the stock, not when you wrote the put; the weeks the put was open do not count toward long-term treatment.
- q: >-
    Instead of letting your in-the-money covered call be assigned, you buy it back for {{ usd(btc) }} after writing it for {{ usd(ccPrem) }}. What does that produce this year?
  choices:
    - >-
      A short-term capital loss of {{ usd(btcLoss) }} on the call, with the stock's gain still unrealized
    - >-
      A long-term loss, because the stock has been held for years
    - >-
      Nothing until you sell the stock
  answer: 0
  explain: >-
    Buying back a written option is a closing transaction, and its result is always short-term: ({{ usd(btc) }} − {{ usd(ccPrem) }}) × 100 = {{ usd(btcLoss) }}. The stock's holding period does not change the character of the option loss here. (If the call had been written in the money, a special rule can make such a loss long-term; that is covered under qualified covered calls.)
```
