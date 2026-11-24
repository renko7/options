---
title: Position Greeks
summary: Add up the Greeks across every leg of a position, express the result in share equivalents, and use it to see what the position really bets on.
---

```calc
const env = { r: RATE, q: ACME.q };
const row = (dte, K) => chain(ACME, { dte }).rows.find((x) => x.strike === K);
const c105 = row(30, 105).call, p90 = row(58, 90).put;
const stock = { kind: 'stock', qty: 300, price: 100 };
const sc = { kind: 'call', qty: -3, strike: 105, premium: c105.bid, dte: 30, iv: c105.iv };
const lp = { kind: 'put', qty: 3, strike: 90, premium: p90.ask, dte: 58, iv: p90.iv };
const book = [stock, sc, lp];
const G = (legs, S = 100) => payoff.positionGreeks(legs, S, 0, env);
const gS = G([stock]), gC = G([sc]), gP = G([lp]), gB = G(book);
const gB95 = G(book, 95), gB108 = G(book, 108);
const p95 = row(30, 95).put, c110 = row(30, 110).call;
const strangle = [{ kind: 'put', qty: -5, strike: 95, premium: p95.bid, dte: 30, iv: p95.iv }, { kind: 'call', qty: -5, strike: 110, premium: c110.bid, dte: 30, iv: c110.iv }];
const gStr = G(strangle), gStr94 = G(strangle, 94);
const hedgeStr = Math.round(gStr94.delta);
```

Real positions rarely have one leg. A covered call has two, a collar three, an iron condor four, and a trading account holds several positions at once. Reading each leg's Greeks separately tells you little; what matters is their sum. Because each Greek measures a change in value, and the value of a position is the sum of the values of its legs, the Greeks of a position are just the Greeks of its legs added up, each multiplied by its size.

## Adding up the legs

For an option leg, the position Greek is

\[ \text{per-share Greek} \times \text{contracts} \times 100 , \]

with contracts positive for long legs and negative for short ones. For a stock leg, delta is the number of shares (positive long, negative short) and the other Greeks are zero.

:::example A collar on ACME
You own 300 ACME shares. To protect them, you have sold 3 December 105 calls at {{ usd(c105.bid) }} and bought 3 January 90 puts at {{ usd(p90.ask) }}: a [[collar]]. With ACME at $100:

| Leg | Delta (shares) | Gamma (shares per $1) | Theta ($ per day) | Vega ($ per vol point) |
|---|---|---|---|---|
| Long 300 shares | {{ signed(gS.delta, 1) }} | {{ signed(gS.gamma, 2) }} | {{ signedUsd(gS.theta) }} | {{ signedUsd(gS.vega) }} |
| Short 3 Dec 105 calls | {{ signed(gC.delta, 1) }} | {{ signed(gC.gamma, 2) }} | {{ signedUsd(gC.theta) }} | {{ signedUsd(gC.vega) }} |
| Long 3 Jan 90 puts | {{ signed(gP.delta, 1) }} | {{ signed(gP.gamma, 2) }} | {{ signedUsd(gP.theta) }} | {{ signedUsd(gP.vega) }} |
| **Position** | **{{ signed(gB.delta, 1) }}** | **{{ signed(gB.gamma, 2) }}** | **{{ signedUsd(gB.theta) }}** | **{{ signedUsd(gB.vega) }}** |

Read the bottom line as a description of the bet:

- **Delta {{ signed(gB.delta, 0) }}.** The collar moves like about {{ int(gB.delta) }} shares, not 300. The options have cut your exposure to ACME's price roughly in half for now.
- **Gamma {{ signed(gB.gamma, 2) }}.** Slightly short gamma: the short calls, nearer the money and shorter-dated, outweigh the long puts.
- **Theta {{ signedUsd(gB.theta) }}.** The calls you sold decay faster than the puts you bought, so the position earns a little each day if nothing happens.
- **Vega {{ signedUsd(gB.vega) }}.** The two options' vegas nearly cancel. A change in ACME's implied volatility barely matters.
:::

The total delta is the [[position delta]]. Expressed as a number of shares, as here, it is the [[share-equivalent delta]]: the stock position that would gain or lose the same for a small move. Multiply by the stock price to get **dollar delta**, {{ usd(gB.delta * 100, 0) }} here: the position behaves like that many dollars of ACME stock.

## Position Greeks move

Position Greeks are a snapshot at today's price. Recompute the collar at other prices:

| ACME at | Position delta (shares) | Gamma | Theta | Vega |
|---|---|---|---|---|
| $95 | {{ signed(gB95.delta, 1) }} | {{ signed(gB95.gamma, 2) }} | {{ signedUsd(gB95.theta) }} | {{ signedUsd(gB95.vega) }} |
| $100 | {{ signed(gB.delta, 1) }} | {{ signed(gB.gamma, 2) }} | {{ signedUsd(gB.theta) }} | {{ signedUsd(gB.vega) }} |
| $108 | {{ signed(gB108.delta, 1) }} | {{ signed(gB108.gamma, 2) }} | {{ signedUsd(gB108.theta) }} | {{ signedUsd(gB108.vega) }} |

As ACME falls from $100, the short call fades first. Because the position is short gamma near $100, its delta actually *rises* a little as the stock falls, which is the wrong way for an owner of the stock. By $95 the long put has taken over: gamma has turned positive, theta negative and vega positive, and from here the put cushions further falls. As ACME rises toward and past the call strike, the short call dominates: delta drops (you are giving up the upside), gamma and vega get more negative. The collar is a different position at every price, which is why professionals recompute risk whenever the stock moves meaningfully.

## A short strangle

:::example Selling 5 ACME December strangles
You sell 5 December 95 puts at {{ usd(p95.bid) }} and 5 December 110 calls at {{ usd(c110.bid) }}: a short [[strangle]]. With ACME at $100 the position Greeks are:

- delta {{ signed(gStr.delta, 1) }} shares
- gamma {{ signed(gStr.gamma, 2) }} shares per $1
- theta {{ signedUsd(gStr.theta) }} per day
- vega {{ signedUsd(gStr.vega) }} per vol point

This is the classic short-premium profile: close to delta-neutral, short gamma, short vega, long theta. You are paid {{ usd(gStr.theta) }} a day to bet that ACME stays in a range and that implied volatility does not rise.

Now ACME drops to $94, through the put strike. The position delta has become {{ signed(gStr94.delta, 1) }} shares: you are effectively long about {{ int(gStr94.delta) }} shares of a falling stock, a position you never chose to buy. That is short gamma in action. To return to delta-neutral you would sell about {{ int(hedgeStr) }} shares, and if ACME then bounced you would have sold low; if it kept falling, you would be glad you did.
:::

Try it yourself. The position builder shows the strangle's Greeks at the current price; drag the spot slider toward either strike and watch delta swing.

```tool position-builder
{ title: 'Short 5 ACME December 95/110 strangles', legs: strangle, range: [80, 125] }
```

## The signs tell you the trade

Before looking at a single number, the signs of a position's Greeks say what kind of trade it is:

| Position | Delta | Gamma | Theta | Vega |
|---|---|---|---|---|
| Long stock | + | 0 | 0 | 0 |
| Long call | + | + | − | + |
| Long put | − | + | − | + |
| Short call | − | − | + | − |
| Short put | + | − | + | − |
| Long straddle or strangle | about 0 | + | − | + |
| Short straddle or strangle | about 0 | − | + | − |

Gamma and theta almost always have opposite signs on a position built from options on one underlying: you cannot be long gamma and collect time decay. That pairing is the subject of the [next Lesson](#core-05-greek-pnl).

:::practice Adding Greeks across different underlyings
You can add ACME deltas to ACME deltas. You cannot add 100 shares of a $100 stock to 100 shares of a $5,000 index and call it 200: they are different exposures. Desks compare across underlyings in dollar delta, and many brokers offer **beta-weighted delta**, which converts every position into share equivalents of one benchmark (such as SPY) using each stock's historical beta. Beta-weighting is an estimate: it assumes each stock moves with the market in its usual proportion, which fails exactly when correlations change in a sell-off.
:::

:::key
Position Greeks are the sum of each leg's Greek times contracts times 100 (shares count as delta only). Position delta in shares is the share-equivalent exposure; times the stock price it is dollar delta. The signs of delta, gamma, theta and vega describe the trade, and all of them change as the stock moves.
:::

```quiz
- q: >-
    You own 200 ACME shares and have sold 2 calls with a delta of 0.30 each. What is your share-equivalent delta?
  choices:
    - >-
      140 shares
    - >-
      199.4 shares
    - >-
      260 shares
  answer: 0
  explain: >-
    The stock contributes +200. The short calls contribute −0.30 × 2 × 100 = −60. The total is 140 shares. 199.4 forgets the multiplier (subtracting only 0.6), and 260 adds the calls' delta as if they were long.
- q: >-
    A position is short gamma and long theta. Which of these could it be?
  choices:
    - >-
      Long a straddle
    - >-
      Short a strangle
    - >-
      Long 100 shares
  answer: 1
  explain: >-
    Selling options makes you short gamma and long theta: the strangle earns time decay and loses on large moves. A long straddle is the opposite, long gamma and short theta. Long stock has no gamma or theta at all.
- q: >-
    In the Worked Example, the short strangle's delta was {{ signed(gStr.delta, 1) }} shares at $100. ACME falls to $94. Why is the delta now {{ signed(gStr94.delta, 1) }}?
  choices:
    - >-
      Because the short calls became more valuable
    - >-
      Because the position is short gamma, so its delta rises as the stock falls
    - >-
      Because theta added delta overnight
  answer: 1
  explain: >-
    Short gamma means delta moves against you: as ACME falls, the short puts' delta grows toward that of owning the shares, and the position gets longer just as the stock goes down. The short calls actually became *less* valuable as ACME fell. Theta changes value over time but is not what moved delta here: the stock moved, with no time passing.
- q: >-
    The collar in this Lesson has a position vega close to zero at $100. What does that mean for you?
  choices:
    - >-
      The position cannot lose money
    - >-
      A change in ACME's implied volatility, with the stock unchanged, barely affects the position's value
    - >-
      The position has no exposure to ACME's price
  answer: 1
  explain: >-
    Vega measures sensitivity to implied volatility only. The long puts' vega and the short calls' vega nearly cancel, so a vol change barely matters. The position still has a delta of about {{ int(gB.delta) }} shares, so it can certainly lose money if ACME falls; near-zero vega says nothing about direction.
```
