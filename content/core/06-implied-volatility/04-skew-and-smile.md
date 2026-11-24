---
title: Skew and the smile
summary: Read the pattern of implied volatility across strikes, explain why equity puts carry higher volatility than calls, and see what that does to the prices of common trades.
---

```calc
const T = 30 / 365;
const q30 = chain(ACME, { dte: 30 });
const row = (K) => q30.rows.find((x) => x.strike === K);
const ks = [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130];
const atm = row(100).call.iv;
const flat = (K, type) => bs.price({ S: 100, K, T, r: RATE, q: ACME.q, sigma: atm, type });
const put90 = row(90).put, call110 = row(110).call;
const rr = Number((row(105).call.iv * 100).toFixed(1)) - Number((row(95).put.iv * 100).toFixed(1));
const hk = [4500, 4750, 5000, 5250, 5500];
const hIv = (K) => smileIV(HBR, K, T);
const dtes = [9, 30, 121, 394];
const d90 = (d) => bs.greeks({ S: 100, K: 90, T: d / 365, r: RATE, q: ACME.q, sigma: smileIV(ACME, 90, d / 365), type: 'put' }).delta;
const skewPts = (d) => (smileIV(ACME, 90, d / 365) - smileIV(ACME, 100, d / 365)) * 100;
```

If the Black-Scholes model were exactly right, every option on ACME with the same expiration would have the same implied volatility, because the stock has only one volatility. Look at a real chain and that is never what you see. Implied volatility varies by strike, in a shape that is remarkably consistent from stock to stock and year to year. Reading that shape is a basic skill, because it changes the price of almost every trade you will make.

## The December skew

Here is the implied volatility of each December strike on the ACME chain, 30 days out, with ACME at $100:

| Strike | {{ ks.join(' | ') }} |
|---|{{ ks.map(() => '---').join('|') }}|
| Implied volatility | {{ ks.map((k) => pct(row(k).call.iv, 1)).join(' | ') }} |

Implied volatility is highest at the low strikes, falls through the money, and flattens out (and even turns up slightly) at the high strikes. A curve that slopes down from low strikes to high strikes is a [[volatility skew]]; this downward tilt is the normal shape for stocks and stock indexes. When both ends are higher than the middle, the curve is called a [[volatility smile]]. ACME's chain is mostly skew, with the faint beginning of a smile on the far upside; traders sometimes call that shape a smirk.

Remember that a call and a put at the same strike share one implied volatility, by [put-call parity](#core-04-put-call-parity). So "puts are expensive" really means "low strikes are expensive", and the low-strike options people actually trade are out-of-the-money puts.

```tool vol-surface
{ underlying: 'ACME', view: 'smile' }
```

## Why the downside costs more

Three forces push up the implied volatility of low strikes:

1. **Stocks fall faster than they rise.** Large down moves (crashes, profit warnings, failed trials) happen more often and more abruptly than a bell curve allows, and more often than equally large up moves. Black-Scholes assumes smooth, bell-shaped moves; the market corrects for that by charging more volatility where the model is most wrong.
2. **Volatility rises when prices fall.** When a stock drops, its volatility usually goes up, so a put that is in the money after a fall is worth more than a constant-volatility model would say. Options whose value comes from falling prices get priced for that.
3. **Everyone wants protection.** Investors who own stock buy puts to insure it, much more than they buy calls. Option sellers who supply that insurance take crash risk and charge for it, which is the [volatility risk premium](#core-06-realized-volatility) concentrated in the downside.

:::example What the skew does to prices
The December 90 put and the December 110 call are each $10 out of the money. If ACME's whole chain were priced at the at-the-money volatility of {{ pct(atm, 1) }}:

- the 90 put would be worth {{ usd(flat(90, 'put')) }};
- the 110 call would be worth {{ usd(flat(110, 'call')) }}.

The call would be worth more. Mostly that is because the model works in percentage moves: a $10 rise from $100 is a slightly smaller percentage move than a $10 fall, measured the way the model measures them (in logarithms, +{{ pct(Math.log(110 / 100), 1) }} against {{ pct(Math.log(90 / 100), 1) }}). A little of it is carry: the forward is above spot ([Volatility, rates and dividends](#core-04-volatility-and-carry)). On the actual chain the 90 put carries {{ pct(put90.iv, 1) }} and the 110 call {{ pct(call110.iv, 1) }}, so their mids are {{ usd(put90.mid, 3) }} and {{ usd(call110.mid, 3) }}. The skew adds {{ usd(put90.theo - flat(90, 'put')) }} to the put, {{ pct(put90.theo / flat(90, 'put') - 1, 0) }} of its flat-volatility value, and takes {{ usd(flat(110, 'call') - call110.theo) }} off the call. The two now cost almost the same.
:::

That has direct consequences for the trades in later Modules:

- **Protective puts cost more** than a flat-volatility model suggests, and **covered calls collect less**. A [[collar]], which buys a put and sells a call, pays the skew on both legs.
- **Selling out-of-the-money puts** collects the highest implied volatility on the chain. That is part of why it is popular, and the reason is that it is the most crash-exposed position on the chain.
- **Put spreads** (buy one put, sell a lower one) recover part of the skew, because the put you sell carries even higher volatility than the one you buy.

## Measuring skew

Traders summarise the slope in a single number so they can track it over time and compare stocks. Two common measures:

- **A fixed-moneyness spread**: implied volatility of the 90% strike minus the at-the-money implied volatility. For ACME in December: {{ pct(row(90).put.iv, 1) }} − {{ pct(atm, 1) }} = {{ num((row(90).put.iv - atm) * 100, 1) }} points.
- **The 25-delta risk reversal**: the implied volatility of the call with a delta of about 0.25 minus that of the put with a delta of about −0.25. On ACME's $5 strikes the closest are the 105 call (delta {{ num(row(105).call.delta, 2) }}) and the 95 put (delta {{ num(row(95).put.delta, 2) }}): {{ pct(row(105).call.iv, 1) }} − {{ pct(row(95).put.iv, 1) }} = {{ signed(rr, 1) }} points. Negative means puts are richer, the normal state for equities.

When the risk reversal becomes more negative, the market is paying up for downside protection; when it moves toward zero or turns positive, it is paying up for upside, as happens in a stock that is the subject of takeover rumours or a frenzy of call buying.

## Index skew is steeper in relative terms

The Harbor 100 index, HBR, shows the same pattern, more strongly. Its December implied volatilities, 30 days out with HBR at 5,000:

| Strike | {{ hk.map((k) => int(k)).join(' | ') }} |
|---|{{ hk.map(() => '---').join('|') }}|
| Implied volatility | {{ hk.map((k) => pct(hIv(k), 1)).join(' | ') }} |

The 4,500 strike, 10% below the index, carries {{ num((hIv(4500) - hIv(5000)) * 100, 1) }} more points than the at-the-money strike, {{ pct(hIv(4500) / hIv(5000) - 1, 0) }} more in relative terms. ACME's 90 strike, also 10% down, carries {{ pct(row(90).put.iv / atm - 1, 0) }} more. Index puts are the main tool for hedging whole portfolios, so demand is concentrated there, and in a sell-off the stocks in an index tend to fall together, which makes large index declines more likely than the components' own volatilities suggest.

## Skew changes with time to expiration

Skew in vol points is steepest for short-dated options and flattens for long ones. For ACME, the 90 strike's premium over the at-the-money implied volatility at each expiration:

| Days to expiration | {{ dtes.join(' | ') }} |
|---|{{ dtes.map(() => '---').join('|') }}|
| 90 strike minus 100 strike | {{ dtes.map((d) => num(skewPts(d), 1) + ' pts').join(' | ') }} |

A $10 drop is a huge move in 9 days and a routine one over a year, so the extra charge for it is concentrated at short expirations. The full picture, implied volatility by strike *and* expiration, is the volatility surface, studied in depth in [The volatility surface](#advanced-04).

:::practice Quoting by delta
Because skew is tied to how far out of the money an option is, desks compare skews in delta terms ("the 25-delta put is 3 points over at-the-money") rather than by strike. The ACME 90 put, 10% out of the money, has a delta of {{ num(d90(9), 2) }} in the 9-day series and {{ num(d90(394), 2) }} in the 394-day series: the same strike is a lottery ticket in one and a mainstream hedge in the other. Delta puts them on a common scale.
:::

:::key
Implied volatility differs by strike. For stocks and indexes the normal shape is a skew: low strikes, and so out-of-the-money puts, carry higher implied volatility than high strikes, because markets crash down rather than up, volatility rises as prices fall, and investors pay for protection. Skew is steeper for indexes and for short expirations, and it makes protective puts dearer and covered calls cheaper than a flat-volatility model suggests.
:::

```quiz
- q: >-
    On the December chain the 90 strike shows {{ pct(row(90).put.iv, 1) }} implied volatility and the 110 strike {{ pct(row(110).call.iv, 1) }}. Which statement is correct?
  choices:
    - >-
      The 90 call also carries {{ pct(row(90).put.iv, 1) }}, because a call and put at one strike share an implied volatility
    - >-
      Only the 90 put carries the higher volatility; the 90 call is priced at the at-the-money volatility
    - >-
      The market expects ACME to fall to $90
  answer: 0
  explain: >-
    Put-call parity forces the call and put at the same strike to share one implied volatility, so the skew is a property of the strike, not of puts. Traders say "puts are expensive" because the low-strike options people trade are out-of-the-money puts. Skew is a price for downside risk, not a forecast that the stock will fall.
- q: >-
    Which of these is *not* a reason equity skew slopes down?
  choices:
    - >-
      Large down moves are more common and abrupt than large up moves
    - >-
      Volatility tends to rise when prices fall
    - >-
      Investors buy puts to protect their portfolios
    - >-
      The risk-free rate is higher than the dividend yield
  answer: 3
  explain: >-
    Rates and dividends set the forward price and make calls and puts at the same strike differ in price, but they shift no volatility between strikes. The other three are the main causes of skew: jump risk on the downside, volatility that rises as prices fall, and demand for protection.
- q: >-
    You want to protect 100 ACME shares through December with the 90 put. Compared with what a flat {{ pct(atm, 0) }}-volatility model would charge, how does the skew affect your cost?
  choices:
    - >-
      It lowers the cost, because out-of-the-money options are cheap
    - >-
      It raises the cost, by about {{ usd((put90.theo - flat(90, 'put')) * 100) }} per contract
    - >-
      No effect: skew only matters for calls
  answer: 1
  explain: >-
    The 90 strike carries {{ pct(put90.iv, 1) }} instead of {{ pct(atm, 1) }}, which adds {{ usd(put90.theo - flat(90, 'put'), 3) }} a share, {{ usd((put90.theo - flat(90, 'put')) * 100) }} per contract. Out-of-the-money options are cheap in dollars, which is what makes "it lowers the cost" tempting, but in volatility terms the downside strikes are the most expensive on the chain.
- q: >-
    The 25-delta risk reversal on a stock moves from −4 points to +1 point over a week. What does that suggest?
  choices:
    - >-
      Demand has shifted toward upside calls, for example on takeover talk
    - >-
      Puts have become more expensive relative to calls
    - >-
      Overall implied volatility must have fallen
  answer: 0
  explain: >-
    The risk reversal is call implied volatility minus put implied volatility. Moving from negative to positive means calls have become richer relative to puts, which happens when the market pays up for upside, such as on takeover speculation. More expensive puts would push it *more* negative. The risk reversal measures the tilt, not the level, so it says nothing by itself about overall implied volatility.
```
