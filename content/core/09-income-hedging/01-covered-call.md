---
title: The covered call
summary: Sell a call against shares you own, and know exactly what you earn, what you give up and what risk you keep.
---

```calc
const env = { r: RATE, q: ACME.q };
const exp = expiryDate(30);
const dec = chain(ACME, { dte: 30 });
const row = (k) => dec.rows.find((r) => r.strike === k);
const c105 = row(105).call;
const p105 = row(105).put;
const prem = c105.bid;
const cc = [
  { kind: 'stock', qty: 100, price: 100 },
  { kind: 'call', qty: -1, strike: 105, premium: prem, dte: 30, iv: c105.iv },
];
const stock = [{ kind: 'stock', qty: 100, price: 100 }];
const s = payoff.summary(cc);
const g = payoff.positionGreeks(cc, 100, 0, env);
const sp = [{ kind: 'put', qty: -1, strike: 105, premium: p105.bid, dte: 30, iv: p105.iv }];
const sps = payoff.summary(sp);
const staticRet = prem / 100;
const calledRet = (105 - 100 + prem) / 100;
```

You own 100 shares of ACME at $100. You like the company, you plan to hold it, and you would not mind selling it at $105. Right now that willingness earns you nothing. A [[covered call]] turns it into cash: you sell a call against the shares and keep the premium, whatever happens.

The call is "covered" because you already own the shares you might have to deliver. If the call is exercised against you, your broker hands over your 100 shares at the strike; you never have to buy stock in the market at a higher price. That is what separates it from the [[naked|naked option]] short call in [Payoffs at expiration](#core-03), whose loss has no limit.

## The position

A covered call is two legs: long 100 shares, short one call. You choose the strike and the expiration. Selling the call is a [[sell to open]] order; the premium lands in your account the next business day and is yours to keep.

:::example Selling the December 105 call against 100 shares
You own 100 ACME at $100. The December 105 call, expiring {{ longDate(exp) }}, is bid at {{ usd(prem) }}. You sell one contract and receive {{ usd(prem * 100) }}.

At expiration:

- **ACME at or below $105.** The call expires worthless. You keep your shares and the {{ usd(prem * 100) }}. At exactly $100, your profit is {{ usd(payoff.pnlAtExpiry(cc, 100)) }}: the premium.
- **ACME above $105.** The call is exercised and your shares are [[called away|call away]] at $105. You collect $500 of gain on the stock plus the premium: {{ usd(s.maxProfit) }}, the [[max profit]]. It is the same at $106 as at $160.
- **ACME falls.** The premium offsets the first {{ usd(prem) }} of the decline, so you [[break even|break-even]] at {{ usd(s.breakevens[0]) }}. Below that you lose dollar for dollar, like any shareholder. If ACME went to zero you would lose {{ usd(-s.maxLoss) }}.
:::

Written as a formula, with \(S_T\) the stock price at expiration, \(S_0\) what you paid for the shares and \(c\) the premium:

\[ \text{P\&L per share} = (S_T - S_0) + c - \max(S_T - K,\ 0) \]

The last term is the call you owe. Below the strike it is zero; above the strike it cancels every further dollar the stock gains.

## Two returns to know before you sell

Covered-call writers judge a trade by two numbers.

The **static return** (also called the return if unchanged) is what you make if the stock does not move: the premium divided by the stock's value. Here that is {{ usd(prem) }} / $100 = {{ pct(staticRet, 2) }} for 30 days.

The **return if called** is what you make if the stock finishes above the strike and is called away: the premium plus the gain up to the strike, divided by the stock's value: ({{ usd(105 - 100) }} + {{ usd(prem) }}) / $100 = {{ pct(calledRet, 2) }} for 30 days.

Both are capped. The return if called is the best you can do. Brokers often show these figures annualized ({{ pct(staticRet * 365 / 30, 1) }} a year for the static return here), which assumes you could repeat the same trade twelve times a year with no losing months. Treat the annualized figure as a unit conversion, not a forecast.

## The upside you give up

The premium is not a gift. It is what the call buyer pays you for every dollar ACME rises above $105 before {{ longDate(exp) }}. Compare the covered call with simply holding the shares:

| ACME at expiration | Shares only | Covered call | Difference |
|---|---|---|---|
| $80 | {{ usd(payoff.pnlAtExpiry(stock, 80)) }} | {{ usd(payoff.pnlAtExpiry(cc, 80)) }} | {{ signedUsd(payoff.pnlAtExpiry(cc, 80) - payoff.pnlAtExpiry(stock, 80)) }} |
| $95 | {{ usd(payoff.pnlAtExpiry(stock, 95)) }} | {{ usd(payoff.pnlAtExpiry(cc, 95)) }} | {{ signedUsd(payoff.pnlAtExpiry(cc, 95) - payoff.pnlAtExpiry(stock, 95)) }} |
| $100 | {{ usd(payoff.pnlAtExpiry(stock, 100)) }} | {{ usd(payoff.pnlAtExpiry(cc, 100)) }} | {{ signedUsd(payoff.pnlAtExpiry(cc, 100) - payoff.pnlAtExpiry(stock, 100)) }} |
| $105 | {{ usd(payoff.pnlAtExpiry(stock, 105)) }} | {{ usd(payoff.pnlAtExpiry(cc, 105)) }} | {{ signedUsd(payoff.pnlAtExpiry(cc, 105) - payoff.pnlAtExpiry(stock, 105)) }} |
| $110 | {{ usd(payoff.pnlAtExpiry(stock, 110)) }} | {{ usd(payoff.pnlAtExpiry(cc, 110)) }} | {{ signedUsd(payoff.pnlAtExpiry(cc, 110) - payoff.pnlAtExpiry(stock, 110)) }} |
| $125 | {{ usd(payoff.pnlAtExpiry(stock, 125)) }} | {{ usd(payoff.pnlAtExpiry(cc, 125)) }} | {{ signedUsd(payoff.pnlAtExpiry(cc, 125) - payoff.pnlAtExpiry(stock, 125)) }} |

The covered call wins by exactly the premium anywhere at or below $105, and it falls further and further behind above $105 + {{ usd(prem) }} = {{ usd(105 + prem) }}. In a quiet or slowly falling market it is the better position. In a sharp rally it is much worse. In a crash it barely helps.

:::warning The premium is not a dividend
Covered-call income is sometimes sold as "extra yield" on shares you own. It is payment for a specific risk you take on: missing large rallies. Over many months, the trader who writes calls collects small, steady premiums and occasionally gives up a large gain. Whether that trade pays depends on whether the calls were sold for more than they turned out to be worth, not on how regular the income felt.
:::

## A covered call is a short put

Look at the payoff again. Below $105 it rises one-for-one with the stock; above $105 it is flat. That is the shape of a [[short put]]. This is not a coincidence. At expiration, for any \(S_T\):

\[ S_T - \max(S_T - K,\ 0) = \min(S_T,\ K) = K - \max(K - S_T,\ 0) \]

The left side is a share plus a short call. The right side is \(K\) in cash minus a put. So "long stock + short call" and "cash equal to the strike + short put" pay exactly the same at expiration. This is [[put-call parity]] from [What drives an option's price](#core-04), rearranged.

:::example The December 105 covered call against the December 105 short put
Selling the December 105 put at its bid of {{ usd(p105.bid) }} brings in {{ usd(p105.bid * 100) }}, with $10,500 of cash set aside to buy the shares if assigned.

| | Covered call (105) | Short put (105) |
|---|---|---|
| Max profit | {{ usd(s.maxProfit) }} | {{ usd(sps.maxProfit) }} |
| Break-even | {{ usd(s.breakevens[0]) }} | {{ usd(sps.breakevens[0]) }} |
| Loss if ACME goes to $90 | {{ usd(payoff.pnlAtExpiry(cc, 90)) }} | {{ usd(payoff.pnlAtExpiry(sp, 90)) }} |

The numbers differ by a few tens of dollars. That gap is made of the interest the put seller earns on the cash it sets aside, the dividends the shareholder collects, and the bid-ask spread on each option. The risk is identical.
:::

This matters for two reasons. First, it removes the idea that a covered call is "conservative" and a short put is "risky": they are the same position. Second, it lets you choose whichever version is cheaper to trade, easier to fund or better for your account type. The [cash-secured put](#core-09-cash-secured-put) Lesson uses this directly.

## Position Greeks

At the moment you open the trade, with ACME at $100:

| Greek | Value | What it means |
|---|---|---|
| [[Position delta]] | {{ num(g.delta, 0) }} shares | You now behave like {{ num(g.delta, 0) }} shares, not 100. The short call took away about {{ num(100 - g.delta, 0) }}. |
| [[Theta]] | {{ signedUsd(g.theta) }} a day | Time passing pays you. |
| [[Vega]] | {{ signedUsd(g.vega) }} per vol point | A rise in implied volatility costs you, because you are short an option. |
| [[Gamma]] | {{ signed(g.gamma, 2) }} shares per $1 | As ACME rises, your delta falls toward zero; as it falls, delta rises toward 100. |

That last line is the covered call in one sentence: the position gets less long as the stock goes up and more long as it goes down. See [The Greeks in practice](#core-05) if any of these are unfamiliar.

## Before expiration

The max profit of {{ usd(s.maxProfit) }} arrives only at expiration. If ACME jumps to $105 ten days after you sell the call, the call still has time value, and your position shows {{ usd(payoff.pnlAt(cc, 105, 10, env)) }}, not {{ usd(s.maxProfit) }}. At $110 after ten days it shows {{ usd(payoff.pnlAt(cc, 110, 10, env)) }}. The rest comes from time decay over the remaining 20 days, provided ACME stays above $105. This is why writers whose stock rallies early often face a choice between waiting and [[rolling]], covered in [Managing trades](#core-12).

Drag "Days passed" in the builder to see the dashed line climb toward the expiration payoff.

```tool position-builder
{ title: 'Covered call: long 100 ACME, short the December 105 call', legs: cc, range: [80, 125] }
```

:::key
A covered call is long stock plus a short call. You keep the premium, you keep almost all of the downside, and you give up everything above the strike. By put-call parity it has the same payoff as a short put at the same strike, so treat it as a short-volatility position, not as a safer way to own stock.
:::

```quiz
- q: >-
    You own 100 ACME at $100 and sell the December 105 call for {{ usd(prem) }}. ACME finishes at $118. What is your total profit on the position?
  choices:
    - >-
      {{ usd(payoff.pnlAtExpiry(stock, 118)) }}
    - >-
      {{ usd(payoff.pnlAtExpiry(cc, 118)) }}
    - >-
      {{ usd(prem * 100) }}
  answer: 1
  explain: >-
    Your shares are called away at $105, so you keep $500 of stock gain plus the {{ usd(prem * 100) }} premium, {{ usd(payoff.pnlAtExpiry(cc, 118)) }}. The {{ usd(payoff.pnlAtExpiry(stock, 118)) }} is what the shares alone would have made: the difference is the upside you sold. The premium alone is your profit only if ACME finishes at exactly $100.
- q: >-
    What is the break-even at expiration for the December 105 covered call sold at {{ usd(prem) }} against shares bought at $100?
  choices:
    - >-
      {{ usd(105 + prem) }}
    - >-
      {{ usd(100 - prem) }}
    - >-
      $100.00
  answer: 1
  explain: >-
    The premium cushions the first {{ usd(prem) }} of a decline, so you break even at $100 − {{ usd(prem) }} = {{ usd(100 - prem) }}. {{ usd(105 + prem) }} is the price above which the covered call does worse than the shares alone; it is not a break-even, because the position is already profitable there.
- q: >-
    Which single option position has the same payoff shape at expiration as a covered call on the 105 strike?
  choices:
    - >-
      A long 105 put
    - >-
      A short 105 put
    - >-
      A long 105 call
    - >-
      A short 105 call
  answer: 1
  explain: >-
    At expiration, a share minus a call struck at K is worth min(S, K), which equals K in cash minus a put struck at K. So the covered call pays like a short 105 put plus cash. A short 105 call on its own has unlimited loss on the upside; the shares are what cover it and turn the shape into a short put.
- q: >-
    You sell the covered call with ACME at $100. Which statement about the position right after the trade is true?
  choices:
    - >-
      Its delta is about {{ num(g.delta, 0) }} shares, and it gains when implied volatility falls
    - >-
      Its delta is still 100 shares, because you own 100 shares
    - >-
      Its delta is about {{ num(g.delta, 0) }} shares, and it gains when implied volatility rises
  answer: 0
  explain: >-
    The short call has a delta of about −{{ num(100 - g.delta, 0) }} shares, which offsets part of your 100 shares, leaving about {{ num(g.delta, 0) }}. Because you are short an option, your vega is negative ({{ signedUsd(g.vega) }} per vol point), so a fall in implied volatility helps you. Owning 100 shares does not keep delta at 100 once you sell the call against them.
```
