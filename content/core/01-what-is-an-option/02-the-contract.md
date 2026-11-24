---
title: The standardized contract
summary: Read every term of a listed option contract (multiplier, strike, expiration, exercise style, settlement) and turn a quoted premium into dollars.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const exp = expiryDate(30);
const c100 = row(100).call;
const prem = c100.ask;
const p105 = row(105).put;
const fives = [90, 95, 100, 105, 110].map((k) => '$' + k).join(', ');
const c105ask = row(105).call.ask;
const expList = EXPIRATIONS.map((e) => longDate(e.date)).join('; ');
```

When you buy a share of ACME, the share is the share. There is nothing to negotiate except the price. A listed option works the same way, and that is deliberate: every term of the contract except the premium is fixed in advance by the exchange that lists it and the [[Options Clearing Corporation]] that issues it. Two traders who have never met can agree on an ACME December 100 call in a fraction of a second because both already know exactly what it is.

This Lesson goes through those terms one by one. You will read them on every order ticket for the rest of your trading life.

## The terms of a listed option

Every listed equity option is defined by six things:

| Term | What it fixes | ACME December 100 call |
|---|---|---|
| Underlying | what can be bought or sold | ACME Corp common stock |
| Type | right to buy (call) or sell (put) | call |
| Strike | the price per share if exercised | $100 |
| Expiration | the last day the right exists | {{ longDate(exp) }} |
| Deliverable | how much underlying one contract covers | 100 shares |
| Exercise style | when the right can be used | American: any business day up to expiration |

The premium is the only thing the market decides. Because the other terms are identical for everyone, every ACME December 100 call is interchangeable with every other one. That is what lets you buy from one trader in the morning and sell to a different one in the afternoon.

## The multiplier: from quote to dollars

Option prices are quoted per share. One standard equity option contract covers 100 shares, so every quoted figure is multiplied by 100 when money changes hands. That 100 is the [[contract multiplier]].

The multiplier applies twice: once to the premium you pay today, and again to the strike if the option is ever exercised.

:::example What one ACME December 100 call commits you to
The ACME December 100 call is offered at {{ usd(prem) }}.

- **Premium.** Buying one contract costs {{ usd(prem) }} × 100 = **{{ usd(prem * 100) }}**, paid in full when the trade settles. Five contracts cost {{ usd(prem * 100 * 5) }}.
- **Exercise.** If you exercise, you pay the strike for 100 shares: $100 × 100 = **{{ usd(100 * 100) }}**, and 100 ACME shares arrive in your account. The premium you already paid is not refunded or credited toward this.
- **Exposure.** The contract moves with 100 shares' worth of stock, {{ usd(ACME.spot * 100) }} at today's price, even though you paid {{ usd(prem * 100) }} for it.

The same arithmetic works for puts. The December 105 put is offered at {{ usd(p105.ask) }}, so one contract costs {{ usd(p105.ask * 100) }}. Exercising it would deliver 100 shares out of your account and pay you $105 × 100 = {{ usd(105 * 100) }}.
:::

Getting the multiplier wrong is the most common beginner error on an order ticket, and it runs in both directions. People see the December 105 call quoted at {{ num(c105ask) }} and think they are risking {{ usd(c105ask) }}; they are risking {{ usd(c105ask * 100) }} per contract. Others think in contracts rather than dollars: 30 contracts of a $1.00 option is {{ usd(30 * 1 * 100) }} of premium controlling {{ int(30 * 100) }} shares.

:::warning Your broker shows the per-share price
Order tickets, chains and fills all show per-share prices. Your account balance shows dollars. Before you send any order, multiply the limit price by 100 and by the number of contracts, and ask whether you are comfortable losing that whole amount.
:::

## Strikes

Exchanges list strikes at standard intervals, centered on the current stock price, and add new ones as the stock moves so there are always strikes above and below it. ACME's strikes are $5 apart ({{ fives }} and so on). Busier stocks often have $1 or $2.50 intervals near the money, and long-dated expirations usually have wider gaps. You cannot choose an arbitrary strike such as $103.17; you pick from the list. [Reading an options chain](#core-02) covers strike intervals in detail.

## Expirations

Each option series expires on a fixed date. The traditional **monthly** expiration is the third Friday of the month. ACME's December monthly expires on {{ longDate(exp) }}, the third Friday of December. On top of the monthlies, many stocks list **weekly** options that expire on other Fridays, and long-dated options called LEAPS that run for more than a year.

ACME currently has these expirations: {{ expList }}.

The option stops trading at the close on its last trading day. An option you still hold after that is either exercised automatically, if it is in the money, or it ceases to exist. [The life of an option](#core-01-life-of-an-option) follows each path.

## Exercise style and settlement

Two more terms decide what happens when an option is used.

**Exercise style.** An [[American-style option]] can be exercised on any business day up to and including expiration. A [[European-style option]] can be exercised only at expiration. Every US single-stock and ETF option is American-style, so ACME options are American. Most cash-settled index options, such as SPX, are European. The difference matters mainly to writers, who can be assigned early on an American option. [Exercise, assignment and expiration](#core-07) covers when early exercise actually happens and why it is rare.

**Settlement.** Stock and ETF options use [[physical settlement]]: exercise moves real shares between accounts. Index options use [[cash settlement]]: no index "shares" exist, so the holder receives the option's value in cash and the contract is finished.

:::example A cash-settled index option
The Harbor 100 Index (HBR) is cash-settled and European-style, with a multiplier of $100 per index point. Suppose you hold an HBR 5,000 call at expiration and the index settles at 5,100.

The call is 100 points in the money. You receive (5,100 − 5,000) × $100 = **{{ usd((5100 - 5000) * 100) }}** in cash, and the writer pays it. No shares change hands. If HBR settles at or below 5,000, nothing is paid.
:::

## When the contract itself changes

Ordinary quarterly dividends, like ACME's $0.50, do **not** change the contract. They are expected, and option prices already allow for them (see [What drives an option's price](#core-04)). Unusual corporate events are different. After a stock split, a merger, a spin-off or a large special dividend, the OCC adjusts the affected contracts so neither side gains or loses from the event itself. A 2-for-1 split, for example, turns one 100-share $100-strike contract into two 100-share $50-strike contracts. Messier events produce a [[contract adjustment]] with an odd deliverable, such as 100 shares plus some cash or shares of a spun-off company, often under a new symbol.

:::rule Standard terms of US equity options (as of 2026)
- Standard US equity and ETF options cover 100 shares, are American-style and are physically settled through the OCC.
- Standard monthly options expire on the third Friday of the month; when that Friday is an exchange holiday, expiration moves to the business day before it. Exchanges also list weekly and long-term (LEAPS) expirations on many underlyings.
- Exchanges set strike intervals and list new series under their listing rules; the OCC issues every contract.
- Contract terms are adjusted for stock splits, mergers, spin-offs and special dividends under OCC rules, but not for ordinary cash dividends. Adjusted contracts can trade under a different symbol and with a non-standard deliverable.
- Regular trading hours for equity options are 9:30 a.m. to 4:00 p.m. Eastern; options on some broad-based ETFs and indexes trade until 4:15 p.m.
:::

:::warning Check the deliverable before trading an adjusted option
An adjusted contract can look cheap on a chain because it delivers less than 100 shares, or something other than shares. Brokers usually mark them (often with a digit after the root, such as "ACME1"). If a quote looks too good to be true, open the contract details and read the deliverable before you trade.
:::

## Seeing it on the chain

The chain below shows every ACME December strike, calls on the left and puts on the right. Switch between expirations to see that each has its own set of strikes and prices, all for the same 100-share contract.

```tool chain
{ underlying: 'ACME', dte: 30, view: 'quote', highlight: [{ strike: 100, type: 'call' }] }
```

:::key
A listed option is fully standardized: underlying, type, strike, expiration, 100-share deliverable, exercise style and settlement are all fixed, and only the premium is traded. Multiply every quoted price by 100 (and by the number of contracts) to get dollars, and remember that exercising involves the strike times 100 as well.
:::

```quiz
- q: >-
    You buy 4 ACME December 100 calls at {{ usd(prem) }}. What leaves your account?
  choices:
    - >-
      {{ usd(prem * 4) }}
    - >-
      {{ usd(prem * 100) }}
    - >-
      {{ usd(prem * 100 * 4) }}
    - >-
      {{ usd(100 * 100 * 4) }}
  answer: 2
  explain: >-
    Each contract costs the quoted premium times the 100-share multiplier, {{ usd(prem * 100) }}, and you bought four: {{ usd(prem * 100 * 4) }}. {{ usd(prem * 4) }} forgets the multiplier. {{ usd(100 * 100 * 4) }} is what exercising all four would cost, which is a separate decision you may never make.
- q: >-
    You hold 2 ACME December 105 puts and exercise them. You own no ACME shares. What happens?
  choices:
    - >-
      You receive {{ usd(105 * 200) }} and are short 200 ACME shares
    - >-
      You receive {{ usd(105 * 2) }} in cash and nothing else
    - >-
      You must pay {{ usd(105 * 200) }} and receive 200 shares
  answer: 0
  explain: >-
    A put is the right to sell 100 shares per contract at the strike. Exercising two puts sells 200 shares at $105, so you receive {{ usd(105 * 200) }}. Since you had no shares to deliver, the sale leaves you short 200 shares, a position you then have to manage. Paying the strike and receiving shares is what a call holder does on exercise.
- q: >-
    ACME announces its usual $0.50 quarterly dividend. What happens to the terms of ACME options?
  choices:
    - >-
      The OCC lowers every strike by $0.50
    - >-
      Nothing; ordinary dividends do not adjust contracts
    - >-
      The contracts are adjusted to deliver 100 shares plus $50
  answer: 1
  explain: >-
    Ordinary, expected cash dividends do not trigger an adjustment; the market prices them into the premiums instead. Strike or deliverable adjustments are for splits, mergers, spin-offs and special dividends, which change what a share represents.
- q: >-
    At expiration the Harbor 100 Index settles at 4,950. What does the holder of one HBR 5,000 put receive?
  choices:
    - >-
      100 index shares
    - >-
      {{ usd((5000 - 4950) * 100) }} in cash
    - >-
      {{ usd(50) }} in cash
    - >-
      Nothing, because index options are European
  answer: 1
  explain: >-
    HBR options are cash-settled with a $100 multiplier. The put is 5,000 − 4,950 = 50 points in the money, worth 50 × $100 = {{ usd((5000 - 4950) * 100) }}. European style only means it can be exercised at expiration, which is exactly when this happens; it does not stop the payout. There is no index to deliver, so no shares change hands.
```
