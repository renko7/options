---
title: LEAPS calls as a stock replacement
summary: Use a long-dated, deep in-the-money call in place of 100 shares, know exactly what it costs you, choose its strike, roll it, and use LEAPS puts as long-term insurance.
---

```calc
const T = 394 / 365;
const exp = expiryDate(394);
const L = chain(ACME, { dte: 394 });
const row = (k) => L.rows.find((r) => r.strike === k);

// the stock replacement: buy the December 2027 80 call at the ask
const c80 = row(80).call;
const prem = c80.ask;
const cost = prem * 100;
const extr = prem - 20;
const be = 80 + prem;
const spread = c80.ask - c80.bid;
const kept = 10000 - cost;
const interest = kept * (Math.exp(RATE * T) - 1);
const nDiv = 5; // Dec 10, 2026 and four more quarterly ex-dates before Dec 17, 2027
const divs = nDiv * ACME.dividend * 100;

// where the time value comes from (put-call parity at the mid)
const midC = c80.mid, midP = row(80).put.mid;
const carry = 80 * (1 - Math.exp(-RATE * T));
const divPV = 100 * (1 - Math.exp(-ACME.q * T));
const parityExtr = midP + carry - divPV;

// outcomes at expiration, both including the cash side
const call = [{ kind: 'call', qty: 1, strike: 80, premium: prem, dte: 394, iv: c80.iv }];
const out = (s) => {
  const stockPL = (s - 100) * 100 + divs;
  const callPL = payoff.pnlAtExpiry(call, s) + interest;
  return { s, stockPL, callPL };
};
const o70 = out(70), o90 = out(90), o100 = out(100), o125 = out(125);

// strike comparison
const strikes = [70, 80, 90, 100].map((k) => {
  const c = row(k).call;
  const intr = Math.max(100 - k, 0);
  return { k, ask: c.ask, delta: c.delta, extr: c.ask - intr, be: k + c.ask, perDelta: (c.ask - intr) / c.delta };
});
const sk = (k) => strikes.find((x) => x.k === k);

// rolling: the same call after 214 days with ACME unchanged (180 days left)
const later = { S: 100, K: 80, T: 180 / 365, r: RATE, q: ACME.q, sigma: c80.iv, type: 'call' };
const val180 = bs.price(later);
const extr180 = val180 - 20;
const d180 = bs.greeks(later).delta;
const theta0 = bs.greeks({ S: 100, K: 80, T, r: RATE, q: ACME.q, sigma: c80.iv, type: 'call' }).theta;
const theta180 = bs.greeks(later).theta;

// LEAPS put as insurance vs rolling March puts
const lp = row(90).put.ask;
const lpYear = lp / T;
const mar = chain(ACME, { dte: 121 }).rows.find((r) => r.strike === 90).put.ask;
const marYear = mar * 365 / 121;
```

You can own ACME's upside without owning ACME. A call deep enough in the money, with enough time left, moves almost dollar for dollar with the stock, costs a fraction of the shares, and cannot lose more than you paid for it. Traders call this a [[stock replacement]], and the options they use for it are [[LEAPS]]: listed options with more than a year to expiration.

It is not a free lunch. This Lesson shows exactly what you pay for the leverage, how to pick the strike, when to roll, and the mirror-image use of LEAPS puts as insurance.

## The trade

:::example Replacing 100 shares with the December 2027 80 call
ACME is at $100. Instead of buying 100 shares for $10,000, you buy one ACME December 2027 80 call, expiring {{ longDate(exp) }}, 394 days away. It is offered at {{ usd(prem) }}, so the call costs **{{ usd(cost) }}**.

- Its [[delta]] is {{ num(c80.delta, 2) }}: it gains about {{ usd(c80.delta * 100, 0) }} for each $1 ACME rises, about {{ int(c80.delta * 100) }} shares' worth.
- Its intrinsic value is $20.00, so you are paying {{ usd(extr) }} a share, {{ usd(extr * 100) }} a contract, in time value.
- The {{ usd(kept) }} you did not spend on shares stays in cash and earns about {{ usd(interest) }} at 4% over the 394 days.
- As a call holder you receive no dividends. ACME should pay {{ int(nDiv) }} of them before {{ longDate(exp) }} ({{ longDate(ACME_EX_DIVIDEND) }} and four more quarters, if the schedule holds): {{ usd(divs) }} that a shareholder would collect.
- At expiration the call breaks even at {{ usd(be) }}.
:::

Compare the two positions at expiration, each with its cash side included (the dividends for the shares, the interest for the call):

| ACME at expiration | 100 shares | December 2027 80 call |
|---|---|---|
| {{ usd(o70.s) }} | {{ signedUsd(o70.stockPL) }} | {{ signedUsd(o70.callPL) }} |
| {{ usd(o90.s) }} | {{ signedUsd(o90.stockPL) }} | {{ signedUsd(o90.callPL) }} |
| {{ usd(o100.s) }} | {{ signedUsd(o100.stockPL) }} | {{ signedUsd(o100.callPL) }} |
| {{ usd(o125.s) }} | {{ signedUsd(o125.stockPL) }} | {{ signedUsd(o125.callPL) }} |

Above the strike the call trails the stock by a fixed amount: the time value you paid plus the dividends you gave up, less the interest you earned. Below $80 the call stops losing, because you cannot lose more than {{ usd(cost) }}, while the shares keep falling. The stock replacement is the stock with a floor, and the floor is what the time value buys.

## What the time value really pays for

Put-call parity says exactly what the {{ usd(extr) }} buys.

:::derivation The deep in-the-money call as stock plus a put
For European options with strike \( K \) and time \( T \), with a dividend yield \( q \), parity gives
\[ C = S e^{-qT} - K e^{-rT} + P. \]
Subtract the intrinsic value \( S - K \) from both sides and rearrange:
\[ C - (S - K) = P + K\left(1 - e^{-rT}\right) - S\left(1 - e^{-qT}\right). \]
The call's time value is a put with the same strike, plus the interest on the strike (you keep that money instead of paying it for shares), minus the dividends you will not receive.
:::

With the mid prices of the December 2027 80 strike, that is {{ usd(midP) }} for the put, plus {{ usd(carry) }} of interest on $80, minus {{ usd(divPV) }} of dividends, which is {{ usd(parityExtr) }}. That matches the call's time value at the mid, {{ usd(midC - 20) }}. (The chain prices ACME's dividend as a 2% yield; see [the dividend note in Module 4](#core-04).)

So a stock replacement is three positions in one: long the stock, a loan of the strike price, and a put. Only the put is a real cost. The interest is money you were going to earn anyway on cash you did not spend, and the dividends are money you were going to receive as a shareholder. A deeper strike means a cheaper put and a smaller real cost, but more capital.

## Choosing the strike

| Strike | Ask | Delta | Time value | Break-even | Time value per unit of delta |
|---|---|---|---|---|---|
| 70 | {{ usd(sk(70).ask) }} | {{ num(sk(70).delta, 2) }} | {{ usd(sk(70).extr) }} | {{ usd(sk(70).be) }} | {{ usd(sk(70).perDelta) }} |
| 80 | {{ usd(sk(80).ask) }} | {{ num(sk(80).delta, 2) }} | {{ usd(sk(80).extr) }} | {{ usd(sk(80).be) }} | {{ usd(sk(80).perDelta) }} |
| 90 | {{ usd(sk(90).ask) }} | {{ num(sk(90).delta, 2) }} | {{ usd(sk(90).extr) }} | {{ usd(sk(90).be) }} | {{ usd(sk(90).perDelta) }} |
| 100 | {{ usd(sk(100).ask) }} | {{ num(sk(100).delta, 2) }} | {{ usd(sk(100).extr) }} | {{ usd(sk(100).be) }} | {{ usd(sk(100).perDelta) }} |

Moving the strike down buys more delta and pays less time value, both in total and per unit of delta, at the cost of more capital and more dollars at risk. The at-the-money 100 call is the cheapest way in, but all {{ usd(sk(100).ask) }} of it is time value: {{ usd(sk(100).perDelta) }} of time value for each unit of delta, against {{ usd(sk(80).perDelta) }} for the 80 call. It behaves less like the stock and more like a bet that the stock rises enough to cover that time value.

:::practice How desks choose
Stock-replacement buyers commonly pick a strike with a delta of roughly 0.75 to 0.85 and the longest expiration with a reasonable market. That is a convention, not a rule: it balances capital (lower strikes cost more) against time value (higher strikes cost more of it). Check the quote before you choose: the December 2027 80 call is {{ usd(c80.bid) }} bid, {{ usd(c80.ask) }} ask, a {{ usd(spread) }} spread, {{ pct(spread / c80.mid) }} of the mid. That is {{ usd(spread * 100, 0) }} a contract to cross the spread on the way in and again on the way out, so use a limit order near the mid.
:::

## What can go wrong

- **Volatility.** A LEAPS has a large [[vega]]: this call gains or loses about {{ usd(c80.vega * 100) }} for each point implied volatility moves. A fall in volatility can leave the call lagging the stock even when the stock rises ([Module 5](#core-05) works through an example).
- **The floor is still a loss.** Below $80 you lose the whole {{ usd(cost) }}. A stock replacement caps the loss in dollars, but as a percentage of what you put in it is total.
- **Time value decays.** With ACME unchanged, the call loses about {{ usd(-theta0 * 100) }} a day at the start, and the losses grow as expiration approaches.
- **No shareholder rights.** No dividends and no votes.

:::rule Margin and taxes for LEAPS (as of 2026)
Under Regulation T a listed option with more than nine months to expiration may be bought with as little as 75% of its cost paid in cash in a margin account; at nine months or less it must be paid in full (see [Accounts and orders](#core-08)). For US federal tax, a LEAPS held more than one year before you sell it produces a long-term capital gain or loss. If you exercise instead, the shares get a new holding period that starts the day after exercise (see [US taxes](#core-14)). This is general information, not tax advice.
:::

## Rolling before the last months

A stock replacement is meant to stay long-dated. Hold it until it has 180 days left with ACME still at $100, and the call is worth about {{ usd(val180) }}: {{ usd(extr180) }} of time value left, losing about {{ usd(-theta180 * 100) }} a day, with a delta of {{ num(d180, 2) }}.

Many traders roll when about six months remain: sell the old call and buy a new LEAPS a year or more out, choosing its strike again by delta. This is a convention rather than a law. Rolling keeps the daily cost of time value low, resets the delta to the level you want after the stock has moved, and keeps the position from turning into a short-dated option with fast-changing [[gamma]]. Each roll is a sale and a new purchase, with two bid-ask spreads and, possibly, a taxable gain or loss ([Managing trades](#core-12) covers rolling in general).

## LEAPS puts as long-term insurance

The same logic works in reverse for someone who owns shares and wants protection for a year. The December 2027 90 put costs {{ usd(lp) }}, about {{ usd(lpYear) }} a year. Buying the March 90 put four months at a time costs {{ usd(mar) }} for 121 days, about {{ usd(marYear) }} a year if you could keep buying it at that price, plus a bid-ask spread each time you roll.

Long-dated puts cost less per day because time value grows only with roughly the square root of time ([Module 4](#core-04)). The trade-offs are a larger payment up front, a larger exposure to changes in implied volatility, and a strike you are stuck with for longer. The [protective put](#core-09-protective-put) Lesson covers choosing the strike and expiration of a hedge in detail.

Once you hold a LEAPS call, you can also sell shorter-dated calls against it, as you would against shares. That position is a diagonal spread, often called the "poor man's covered call", and it is covered in [Neutral and volatility strategies](#core-11).

Move "Days passed" to see the call's value drift toward its expiration line, and try a lower implied volatility to see the vega risk.

```tool position-builder
{ title: 'Stock replacement: long one ACME December 2027 80 call', legs: [{ kind: 'call', qty: 1, strike: 80, premium: prem, dte: 394, iv: c80.iv }], range: [60, 140] }
```

:::key
A deep in-the-money LEAPS call behaves like the stock with a floor under it. Its time value is, by parity, a put plus interest on the strike minus the dividends you forgo; only the put is a real cost. Pick the strike by delta and capital, trade it with limit orders, and roll it before its last months.
:::

```quiz
- q: >-
    Instead of buying 100 ACME shares at $100, you buy one December 2027 80 call at {{ usd(prem) }}. How much capital does the call use?
  choices:
    - >-
      {{ usd(cost) }}
    - >-
      {{ usd(prem) }}
    - >-
      $8,000
    - >-
      $10,000
  answer: 0
  explain: >-
    One contract covers 100 shares, so you pay {{ usd(prem) }} × 100 = {{ usd(cost) }}. $8,000 is what you would pay to exercise at $80, which you are not doing. The capital saved against the shares, {{ usd(kept) }}, stays in cash.
- q: >-
    By put-call parity, the time value of a deep in-the-money call is made of which pieces?
  choices:
    - >-
      A put with the same strike, plus interest on the strike, minus the dividends you give up
    - >-
      Only the dividends the stock will pay before expiration
    - >-
      The bid-ask spread plus commissions
    - >-
      Nothing: deep in-the-money calls have no time value
  answer: 0
  explain: >-
    Rearranging parity gives time value = put + interest on the strike − dividends. For the December 2027 80 strike that is {{ usd(midP) }} + {{ usd(carry) }} − {{ usd(divPV) }} = {{ usd(parityExtr) }}. Only the put is a real cost; the interest and dividends are money you would have earned or received anyway. A deep in-the-money LEAPS still carries {{ usd(extr) }} of time value at the ask, so "no time value" is wrong.
- q: >-
    ACME finishes at $70 at the December 2027 expiration. Including dividends for the shares and interest for the call, which position lost less?
  choices:
    - >-
      The December 2027 80 call ({{ signedUsd(o70.callPL) }} against {{ signedUsd(o70.stockPL) }} for the shares)
    - >-
      The shares ({{ signedUsd(o70.stockPL) }} against {{ signedUsd(o70.callPL) }} for the call)
    - >-
      They lost the same amount
  answer: 0
  explain: >-
    The call cannot lose more than its {{ usd(cost) }} cost, and the interest on the unspent cash reduces the loss further, to {{ signedUsd(o70.callPL) }}. The shares lose $30 a share less the dividends collected, {{ signedUsd(o70.stockPL) }}. Below the strike the call's floor works for you; above it, the time value works against you.
- q: >-
    You want a year of protection on ACME shares. Per year, how does the December 2027 90 put at {{ usd(lp) }} compare with buying March 90 puts at {{ usd(mar) }} every 121 days?
  choices:
    - >-
      The LEAPS put is cheaper per year: about {{ usd(lpYear) }} against about {{ usd(marYear) }}
    - >-
      The March puts are cheaper per year because each costs less
    - >-
      They cost the same per year
  answer: 0
  explain: >-
    Time value grows roughly with the square root of time, so a longer option costs less per day. {{ usd(lp) }} spread over 394 days is about {{ usd(lpYear) }} a year; {{ usd(mar) }} for 121 days, repeated, is about {{ usd(marYear) }} a year before the extra bid-ask spreads. A smaller price per contract is not the same as a lower cost per year.
```
