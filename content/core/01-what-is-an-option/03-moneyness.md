---
title: In, at and out of the money
summary: Classify any call or put as in, at or out of the money, and explain why that one fact shapes its price, its behavior and what happens at expiration.
---

```calc
const T = 30 / 365;
const S = ACME.spot;
const m = (x) => usd(x, Math.abs(x * 100 - Math.round(x * 100)) < 1e-6 ? 2 : 3);
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const pITM = (K, type) => bs.probITM({ S, K, T, r: RATE, q: ACME.q, sigma: smileIV(ACME, K, T), type });
const status = (K, type, s = S) => {
  const itm = type === 'call' ? s > K : s < K;
  if (K === s) return 'at the money';
  return itm ? 'in the money' : 'out of the money';
};
const tableRows = [85, 90, 95, 100, 105, 110, 115].map((K) =>
  `| ${status(K, 'call')} | ${m(row(K).call.mid)} | **$${K}** | ${m(row(K).put.mid)} | ${status(K, 'put')} |`
).join('\n');
const S2 = 107;
```

Every option is either worth exercising right now or it is not. That single distinction, called [[moneyness]], tells you a great deal about an option before you look at anything else: roughly what it costs, how much it moves when the stock moves, and what will happen to it at expiration if nothing changes. Traders use the vocabulary constantly, so it is worth getting exact.

## The three states

Compare the strike with the current stock price.

A **call** is:

- [[In the money]] (ITM) when the stock is **above** the strike. The right to buy below the market price is worth something today.
- [[At the money]] (ATM) when the stock is at the strike.
- [[Out of the money]] (OTM) when the stock is **below** the strike. Nobody would exercise a right to pay more than the market price.

A **put** is the mirror image:

- In the money when the stock is **below** the strike: the right to sell above the market price is worth something.
- At the money when the stock is at the strike.
- Out of the money when the stock is **above** the strike.

The rule that never fails: an option is in the money when exercising it right now would be better than trading the stock in the market.

In practice "at the money" is loose. The stock is rarely exactly at a strike, so traders call the strike *nearest* the stock price the ATM strike, and options a strike or two either side of it "near the money". Options far from the stock price are "deep" in or out of the money.

:::example Classifying the ACME December chain
ACME is at $100. Here are the December midpoint prices (the average of the bid and the ask) around the money:

| Call | Call mid | Strike | Put mid | Put |
|---|---|---|---|---|
{{ tableRows }}

Read across any row. At the 90 strike the call is in the money (the right to buy at $90 a stock worth $100) and the put is out of the money (the right to sell at $90 a stock you could sell for $100). At 110 it is the other way round. At 100 both are at the money.

Now look at the prices. The ITM 90 call costs {{ m(row(90).call.mid) }}; the OTM 110 call costs {{ m(row(110).call.mid) }}. Puts run the other way: the OTM 90 put is {{ m(row(90).put.mid) }} and the ITM 110 put is {{ m(row(110).put.mid) }}. In-the-money options are expensive because they already contain value you could take by exercising. Out-of-the-money options are cheap because they hold nothing but the chance that the stock gets there.
:::

Notice that at any one strike, the call and the put are always on opposite sides. If the call is in the money, the put at the same strike is out of the money, and the other way round. Only at the money are both in the same state.

## Moneyness moves with the stock

Moneyness is not a property of the contract; it is a relationship between the strike and today's stock price, so it changes every time the stock ticks. An option you bought out of the money can be in the money by lunchtime.

:::example ACME rallies to $107
Suppose ACME rises from $100 to ${{ num(S2, 0) }}.

- The December 105 call, out of the money when ACME was $100, is now {{ status(105, 'call', S2) }} by {{ usd(S2 - 105) }}.
- The December 105 put, in the money by $5 before, is now {{ status(105, 'put', S2) }}.
- The 110 call is still {{ status(110, 'call', S2) }}, but by {{ usd(110 - S2) }} instead of $10.
- The ATM strike, the one nearest the stock, is now 105, not 100.
:::

Only one moment makes moneyness final: the close on expiration day. An option that is in the money then has value and is normally exercised; one that is out of the money expires worthless. Everything before that is a snapshot.

## Measuring how far

"Out of the money" covers both an option one dollar away and one forty dollars away, which behave nothing alike. Traders measure the distance in three ways:

- **In dollars.** The 110 call is $10 out of the money.
- **In percent of the stock price.** The 110 call is {{ pct((110 - S) / S, 0) }} out of the money; the 90 put is also {{ pct((S - 90) / S, 0) }} out of the money. Percent lets you compare a $20 stock with a $2,000 one.
- **By [[delta]].** A number between 0 and 1 for calls (0 and −1 for puts) that every chain shows. Deep ITM options have deltas near 1, ATM near 0.5, far OTM near 0. Traders say "the 30-delta call" instead of naming a strike. [Reading an options chain](#core-02) introduces the column and [The Greeks in practice](#core-05) explains it fully.

Distance matters because it decides how likely the option is to finish in the money. Option prices themselves imply a rough probability for this. For the December options, they put the chance of the 90 call finishing in the money at about {{ pct(pITM(90, 'call'), 0) }}, the 100 call at about {{ pct(pITM(100, 'call'), 0) }}, and the 110 call at about {{ pct(pITM(110, 'call'), 0) }}. These are market-implied figures, not forecasts, and [What drives an option's price](#core-04) explains where they come from. The pattern is what matters here: the further out of the money, the less likely, and the cheaper.

## Why it matters for what you trade

Moneyness is the first dial you turn when choosing an option.

- **Deep in the money** options behave most like the stock. They cost the most, move nearly dollar for dollar with the shares and are the least likely to expire worthless.
- **At the money** options are the middle ground. They have the most time value of any strike (the next Lesson explains this) and respond most to changes in volatility.
- **Out of the money** options are cheap and need the stock to move before they are worth anything at expiration. Most of them expire worthless. When they do pay, the percentage return can be very large, which is why they attract beginners and why beginners lose money on them.

[Payoffs at expiration](#core-03) works through the trade-off between strikes in detail.

In the pricer below, drag the stock price across the 105 strike and watch the call go from out of the money to in the money. Then drag the days to expiration down toward zero: below $105 the price collapses toward nothing, and above it the price settles at the stock price minus $105.

```tool pricer
{ S: 100, K: 105, dte: 30, iv: smileIV(ACME, 105, 30 / 365), type: 'call' }
```

:::key
A call is in the money when the stock is above the strike; a put is in the money when the stock is below it. At any one strike, the call and put are on opposite sides. Moneyness changes as the stock moves and becomes final only at the close on expiration day.
:::

```quiz
- q: >-
    ACME is at $103. Which of these December options is in the money?
  choices:
    - >-
      The 105 call
    - >-
      The 100 put
    - >-
      The 105 put
    - >-
      The 110 call
  answer: 2
  explain: >-
    A put is in the money when the stock is below the strike: $103 is below $105, so the right to sell at $105 is worth $2 today. The 105 call is the tempting choice because 105 is close, but a call needs the stock above the strike, and $103 is not. The 100 put is out of the money (stock above strike) and the 110 call is $7 out of the money.
- q: >-
    ACME is at $100. The 95 call is in the money. What is the 95 put?
  choices:
    - >-
      In the money
    - >-
      At the money
    - >-
      Out of the money
  answer: 2
  explain: >-
    At any one strike the call and the put sit on opposite sides. Selling at $95 a stock worth $100 is worse than selling in the market, so the 95 put is out of the money. Both are at the money only when the stock is at the strike.
- q: >-
    You bought an ACME December 105 call when ACME was at $100. With a week left, ACME is at {{ usd(S2) }}. How would a trader describe your call now?
  choices:
    - >-
      Still out of the money, because it was bought out of the money
    - >-
      In the money by {{ usd(S2 - 105) }}
    - >-
      At the money
  answer: 1
  explain: >-
    Moneyness compares the strike with the stock price now, not when you traded. With ACME at {{ usd(S2) }}, the right to buy at $105 is worth {{ usd(S2 - 105) }} a share today, so the call is in the money by that amount. The option's terms never changed; the stock did.
- q: >-
    Why does the December 110 call cost so much less than the December 90 call?
  choices:
    - >-
      The 110 call has less time until expiration
    - >-
      The 90 call is in the money and already holds value you could take by exercising; the 110 call needs ACME to rise $10 before it is worth anything at expiration
    - >-
      Calls with higher strikes always have higher implied volatility
  answer: 1
  explain: >-
    Both expire on the same day, so time is not the difference. The 90 call contains $10 a share of value right now plus some time value; the 110 call is only a bet that ACME rises above $110, which the market prices at roughly a {{ pct(pITM(110, 'call'), 0) }} chance. Implied volatility does vary by strike, but on ACME it is actually lower at 110 than at 90, so it cannot explain the gap.
```
