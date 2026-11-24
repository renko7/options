---
title: Contract adjustments and non-standard deliverables
summary: Work out what an option delivers after a split, special dividend, merger or spin-off, and recognize adjusted contracts on a chain before they cost you money.
---

```calc
const T = 30 / 365;
const c = (S, K) => bs.price({ S, K, T, r: RATE, q: ACME.q, sigma: ACME.iv, type: 'call' });
const before = c(100, 100) * 100;
const after2for1 = 2 * c(50, 50) * 100;
const k32 = Number((100 / 1.5).toFixed(2));
const after3for2 = 150 * c(100 / 1.5, 100 / 1.5);
const strikeCash32 = k32 * 150;
const rsShares = 100 / 5;
const rsPrice = 100 * 5;
const rsDeliverValue = rsShares * rsPrice;
const special = 5;
const mergerCash = 10;
const mergerRatio = 0.8;
const bigco = 150;
const mergerValue = mergerRatio * 100 * bigco + mergerCash * 100;
const cashDeal = 120;
const cashCall = (cashDeal - 100) * 100;
const exSpin = 90;
const labs = 40;
const spinValue = 100 * exSpin + 25 * labs;
const stdCall = c(exSpin, 100);
const adjCall = c(spinValue / 100, 100);
```

An option is a promise to deliver something specific: normally 100 shares of the [[underlying]]. When the company does something that changes what a share is, such as splitting it, paying out a large chunk of cash, merging, or spinning off a division, the promise has to be rewritten so that neither the holder nor the writer gains or loses from the event itself. That rewrite is a [[contract adjustment]]. The OCC decides it, publishes it, and every open contract in the affected series changes overnight.

:::rule How contract adjustments work (as of 2026)
- Adjustments are governed by the OCC's By-Laws and Rules and decided case by case by the OCC itself, following general policies set with the exchanges through its Securities Committee. The OCC announces each one in an Information Memo, which brokers and the OCC's website publish before the event takes effect.
- Ordinary cash dividends paid under a company's regular policy are not adjusted for; the market prices them in.
- Special (non-ordinary) cash dividends are generally adjusted for, usually by reducing strike prices by the dividend amount, unless they are less than $0.125 per share.
- Stock splits, reverse splits, stock dividends, mergers, spin-offs and similar events are adjusted for. When a contract's deliverable becomes cash only (for example in an all-cash takeover), the OCC ordinarily accelerates its expiration to shortly after the deal closes.
:::

## Splits

A split multiplies the number of shares and divides the price, so the option is changed to deliver the same total value.

:::example ACME splits 2-for-1
Every ACME share becomes two shares worth $50 each. Your one December 100 call (100 shares at $100) becomes **two** December 50 calls, each for 100 shares at $50.

The value of the position does not change: one 100 call on a $100 stock was worth {{ usd(before) }}; two 50 calls on a $50 stock are worth {{ usd(after2for1) }}. These are standard contracts afterwards, and they trade alongside newly listed strikes as normal.
:::

Splits that do not divide evenly are adjusted differently. In a 3-for-2 split the number of contracts stays the same, but each now delivers 150 shares and the strike is divided by 1.5. The December 100 call becomes one call on **150 shares at {{ usd(k32) }}**. Exercising it costs {{ usd(strikeCash32) }}, the same as the original $10,000 (up to rounding), and the call's value is unchanged at {{ usd(after3for2) }}. That contract is *non-standard*: its deliverable is not 100 shares.

Reverse splits produce the most confusing contracts. In a 1-for-5 reverse split, five shares become one share worth about {{ usd(rsPrice) }}. The December 100 call becomes a call delivering **{{ int(rsShares) }} new shares** for a total of $10,000, still quoted as a "$100 strike" with the usual 100 multiplier applied to the premium. The deliverable is worth {{ int(rsShares) }} × {{ usd(rsPrice) }} = {{ usd(rsDeliverValue) }}, the same as before; the strike and premium have to be read against that, not against the new $500 share price.

## Special dividends

ACME's $0.50 quarterly dividend is ordinary and changes nothing. Suppose ACME instead declares a one-time special dividend of $5 a share.

The OCC would normally reduce every strike by $5. The December 100 call becomes a December 95 call, still on 100 shares. On the ex-date ACME drops by about $5, from $100 to $95, so a call that was at the money stays at the money. Without the adjustment, call holders would lose $5 a share of value overnight and put holders would gain it, purely because of the payout.

## Mergers, acquisitions and spin-offs

When ACME is acquired, its shares turn into whatever the buyer pays, and the options follow.

- **Stock-and-cash merger.** If each ACME share becomes {{ num(mergerRatio, 1) }} shares of BigCo plus {{ usd(mergerCash) }} in cash, each ACME option now delivers {{ int(mergerRatio * 100) }} BigCo shares plus {{ usd(mergerCash * 100) }}. With BigCo at {{ usd(bigco) }}, that deliverable is worth {{ usd(mergerValue) }}, against which the $10,000 aggregate exercise price of a December 100 call is compared.
- **All-cash takeover at {{ usd(cashDeal) }}.** Each option now delivers {{ usd(cashDeal * 100) }} in cash. There is no more uncertainty, so no more extrinsic value: a December 100 call is worth exactly {{ usd(cashCall) }}, and a December 100 put is worth nothing. The expiration is accelerated so these contracts are settled soon after the deal closes rather than in December.
- **Spin-off.** If ACME spins off ACME Labs, one Labs share for every four ACME shares, each existing ACME option is adjusted to deliver 100 ACME shares plus 25 ACME Labs shares.

## Spotting adjusted contracts

Adjusted contracts keep trading until they expire, but new standard strikes are listed next to them, and almost all trading moves to the new standard series. The adjusted ones become thinly traded, with wide bid-ask spreads. They are easy to misread:

- **A changed root symbol.** Brokers and the OCC usually give adjusted series a new root, often the old one with a digit: ACME1 or ACME2. In the [[OCC symbol]] the root changes too.
- **A deliverable that is not 100 shares.** The contract details screen lists the deliverable. Read it whenever the root has a digit or a price looks wrong.
- **Prices that do not fit the chain.** An adjusted call can look absurdly cheap or expensive next to standard strikes because it delivers something else.

:::example The spin-off trap
After the ACME Labs spin-off, ACME trades at {{ usd(exSpin) }} and ACME Labs at {{ usd(labs) }}. Your chain shows two "December 100 calls":

- **ACME December 100 call** (new, standard): 100 shares of a {{ usd(exSpin) }} stock, $10 out of the money. Fair value about {{ usd(stdCall) }}.
- **ACME1 December 100 call** (adjusted): 100 ACME + 25 ACME Labs, a deliverable worth 100 × {{ usd(exSpin) }} + 25 × {{ usd(labs) }} = {{ usd(spinValue) }}, or {{ usd(spinValue / 100) }} per "share". It is at the money. Fair value about {{ usd(adjCall) }}.

A trader who sees ACME at {{ usd(exSpin) }} and sells the ACME1 100 call, thinking it is $10 out of the money, has sold an at-the-money option on a different basket, for what looks like a rich premium. If ACME and Labs rise, the assignment requires delivering both. The fix is to read the deliverable before every trade in a series with an unusual root.
:::

:::warning Avoid opening new positions in adjusted series
There is rarely a reason to open a position in an adjusted contract: liquidity is poor, the deliverable is awkward (fractional shares and cash parts are common), and pricing tools often mishandle them. If you already hold one, it is usually simplest to close it and, if you still want the exposure, reopen it in the standard series.
:::

The pricer below can value an adjusted contract once you know its deliverable: set the stock price to the deliverable's value divided by 100 (for the ACME1 call, {{ usd(spinValue / 100) }}) and compare it with the standard call at {{ usd(exSpin) }}.

```tool pricer
{ S: exSpin, K: 100, dte: 30, iv: ACME.iv, type: 'call' }
```

:::key
After splits, special dividends, mergers and spin-offs, the OCC adjusts open contracts so the event itself neither helps nor hurts either side; ordinary dividends are not adjusted. Adjusted contracts often have a non-standard deliverable and a root with a digit (ACME1). Before trading anything with an odd root or an odd price, read the deliverable in the contract details or the OCC's Information Memo.
:::

```quiz
- q: >-
    ACME splits 2-for-1. You were short three December 100 puts. What are you short afterwards?
  choices:
    - >-
      Three December 50 puts, each on 200 shares
    - >-
      Six December 50 puts, each on 100 shares
    - >-
      Three December 100 puts, each on 100 shares
  answer: 1
  explain: >-
    In an even split the OCC multiplies the number of contracts and divides the strike: three contracts become six, each for 100 shares at $50. Your total obligation is unchanged: 600 shares at $50 is the same $30,000 as 300 shares at $100. Leaving the contracts unchanged would hand a large gain to put holders, since the stock price halves.
- q: >-
    ACME declares a special dividend of $5 a share. What normally happens to the December 100 call?
  choices:
    - >-
      Nothing; dividends never change options
    - >-
      Its strike is reduced to $95
    - >-
      Its holder receives $500 in cash
  answer: 1
  explain: >-
    Special dividends of $0.125 a share or more are normally adjusted for by reducing the strike by the dividend, so the call becomes a 95 call. That keeps the call at the same moneyness when the stock drops by $5 on the ex-date. Ordinary dividends, like ACME's regular $0.50, are not adjusted for. Option holders do not receive dividends.
- q: >-
    You see an "ACME1 December 100 call" quoted far above the standard ACME December 100 call. What should you do first?
  choices:
    - >-
      Sell the ACME1 call, since it is overpriced
    - >-
      Open the contract details and read its deliverable
    - >-
      Buy the standard call, since it is cheaper
  answer: 1
  explain: >-
    A digit in the root signals an adjusted contract whose deliverable is probably not 100 ACME shares. After the spin-off in this Lesson, the ACME1 call delivers a basket worth {{ usd(spinValue / 100) }} per share against ACME's {{ usd(exSpin) }}, so its higher price is fair, not an opportunity. Trading on the price difference without reading the deliverable is how traders get hurt.
- q: >-
    ACME agrees to be acquired for {{ usd(cashDeal) }} a share in cash, and the deal closes. You hold a December 100 call. What is it worth?
  choices:
    - >-
      Its intrinsic value, {{ usd(cashCall) }}, settled soon after the deal closes
    - >-
      More than {{ usd(cashCall) }}, because it still has time until December
    - >-
      Nothing, because the stock no longer trades
  answer: 0
  explain: >-
    The deliverable becomes {{ usd(cashDeal * 100) }} in cash, which can no longer change, so there is no extrinsic value left; the OCC ordinarily accelerates expiration so it settles soon after the deal closes. Time until December is worthless when nothing can move. The call is far from worthless: it still delivers cash worth {{ usd(cashCall) }} more than its exercise price.
```
