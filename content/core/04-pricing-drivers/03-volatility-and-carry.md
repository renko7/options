---
title: Volatility, rates and dividends
summary: Explain what a volatility number means in dollars, why nobody can observe it, and how interest rates and dividends set the forward price that options are priced around.
---

```calc
const T30 = 30 / 365;
const oneSd = 0.30 * Math.sqrt(T30);
const daily = 0.30 / Math.sqrt(252);
const call = (o) => bs.price({ S: 100, K: 100, T: T30, r: RATE, q: ACME.q, sigma: 0.30, type: 'call', ...o });
const vols = [0.20, 0.25, 0.30, 0.35, 0.40];
const atmV = Object.fromEntries(vols.map((v) => [v, call({ sigma: v })]));
const otmV = Object.fromEntries(vols.map((v) => [v, call({ sigma: v, K: 110 })]));
const F30 = bs.forward({ S: 100, T: T30, r: RATE, q: ACME.q });
const T394 = 394 / 365;
const F394 = bs.forward({ S: 100, T: T394, r: RATE, q: ACME.q });
const L = (o) => bs.price({ S: 100, K: 100, T: T394, r: RATE, q: ACME.q, sigma: 0.30, ...o });
const lc = L({ type: 'call' }), lp = L({ type: 'put' });
const hc = L({ type: 'call', q: ACME.q + 0.03 }), hp = L({ type: 'put', q: ACME.q + 0.03 });
const Fhtb = bs.forward({ S: 100, T: T394, r: RATE, q: ACME.q + 0.03 });
```

Of the six inputs, three are about the stock's future and the contract (spot, strike, time) and are easy to read off a screen. This Lesson covers the other three. Volatility is the input that makes options difficult. Rates and dividends are the inputs that make options on the same stock differ from one expiration to the next, through a single number called the forward price.

## What a volatility number means

[[Volatility]] measures how widely a stock's price swings. Precisely, it is the standard deviation of the stock's returns, scaled to one year. When traders say ACME's volatility is 30%, they mean that over a year, a typical move (one standard deviation) is about 30% of the price.

You rarely care about a whole year. Scale it to the time you do care about with the square root of time from the [previous Lesson](#core-04-time-value):

\[ \text{typical move over } T \text{ years} \approx \sigma \sqrt{T} . \]

For ACME over the 30 days to the December expiration, that is \(0.30 \times \sqrt{30/365}\) = {{ pct(oneSd) }}, or about {{ usd(100 * oneSd) }} on a $100 stock. Roughly two times in three, ACME should finish December within that distance of where it started; the rest of the time it moves further. Scaled to a single trading day (there are about 252 in a year), 30% volatility means a typical daily move of about {{ pct(daily) }}.

That gives you a feel for any volatility number. A utility at 15% moves about 1% on a typical day; a speculative biotech at 90% moves about 6%.

## The input nobody can observe

Every other input is known when you trade. Volatility is not, because the volatility that decides whether your option pays is the volatility of the stock *from now until expiration*. You can measure how much ACME moved last month, but last month is not what you are buying.

So the market does the reverse. It agrees on a price for the option, and traders work out which volatility number would produce that price. That number is the [[implied volatility]], and quoting options in volatility instead of dollars is so standard that a trader will say "I paid 30 for the December calls" and mean 30% volatility, not $30. [Implied volatility](#core-06) is the Module about this; for now, notice how much the price depends on it.

:::example The same option at five volatilities
ACME at $100, 30 days, the December 100 and 110 calls, with everything except volatility fixed:

| Volatility | 100 call (at the money) | 110 call (out of the money) |
|---|---|---|
| 20% | {{ usd(atmV[0.20]) }} | {{ usd(otmV[0.20]) }} |
| 25% | {{ usd(atmV[0.25]) }} | {{ usd(otmV[0.25]) }} |
| 30% | {{ usd(atmV[0.30]) }} | {{ usd(otmV[0.30]) }} |
| 35% | {{ usd(atmV[0.35]) }} | {{ usd(otmV[0.35]) }} |
| 40% | {{ usd(atmV[0.40]) }} | {{ usd(otmV[0.40]) }} |

The at-the-money call rises by about the same amount, {{ usd(atmV[0.35] - atmV[0.30]) }}, for each 5 points of volatility: its price is close to proportional to volatility, just as the shortcut \(0.4\,S\,\sigma\sqrt{T}\) says.

The out-of-the-money call behaves differently. In dollars it moves less, but in proportion it moves far more: from 20% to 40% volatility its price grows {{ num(otmV[0.40] / otmV[0.20], 0) }}-fold, while the at-the-money call's price only doubles. An out-of-the-money option needs a big move to pay, so it is a leveraged bet on volatility.
:::

## Rates and dividends: carry

Owning a stock for a period has costs and benefits beyond the price change. You tie up money that could be earning the [[risk-free rate]] (in practice, the yield on short-term US Treasury bills), and you collect any dividends. The net of the two is the [[carry]] of the position. For ACME, money costs 4% a year and the dividend returns 2%, so holding the stock costs a net 2% a year.

An option lets you have the stock's price exposure without paying its carry, or while paying it differently, which is why carry shows up in option prices. The cleanest way to see it is through the forward price.

A [[forward price]] is the price, agreed today, at which you would buy the stock on a future date with no option involved: both sides are committed. It is not a forecast. It is pinned down by what it costs to buy the stock today and hold it.

:::derivation The forward price
Assume the stock pays a continuous dividend yield \(q\) that you reinvest in more shares, and that you can borrow and lend at the rate \(r\), both compounded continuously. Then a holding of \(n\) shares grows to \(n\,e^{qT}\) shares after \(T\) years, and a loan of \(B\) dollars grows to \(B\,e^{rT}\).

Suppose you have agreed to deliver one share at time \(T\) for the forward price \(F\). Here is how to do that with no risk:

1. Today, buy \(e^{-qT}\) shares. With dividends reinvested, they grow to \(e^{-qT} \times e^{qT} = 1\) share at time \(T\).
2. Pay for them by borrowing \(S\,e^{-qT}\) dollars.
3. At time \(T\), deliver the share and receive \(F\). Repay the loan, which has grown to \(S\,e^{-qT}\,e^{rT} = S\,e^{(r-q)T}\).

You put up no money today and took no risk, so your profit at time \(T\), \(F - S\,e^{(r-q)T}\), must be zero. If it were positive, everyone would sell forwards and do this; if negative, everyone would do the reverse (short the stock and buy forwards). Therefore

\[ F = S\,e^{(r-q)T} . \]

The forward is above spot when rates exceed the dividend yield (carry is a cost) and below spot when the dividend yield is higher.
:::

For ACME, 30 days out the forward is {{ usd(F30) }}; for the 394-day expiration it is {{ usd(F394) }}. Over one month the forward is only {{ usd(F30 - 100) }} above spot. Over a year the gap is a couple of dollars, and option prices reflect it.

## Options are priced around the forward

Here is the 394-day [[LEAPS]] 100 call and 100 put with ACME at $100 and 30% volatility:

- the call is worth {{ usd(lc) }};
- the put is worth {{ usd(lp) }}.

The strike is the same distance from spot for both, so why is the call worth more? Because the strike is not the same distance from the *forward*. Measured against the forward of {{ usd(F394) }}, the 100 call is already about {{ usd(F394 - 100) }} in the money and the 100 put is that much out of the money. A call holder is effectively someone who gets to buy at the forward later, without paying carry now. The next Lesson, [Put-call parity](#core-04-put-call-parity), turns this into an exact equation.

This is also why the direction table in [The six inputs](#core-04-six-inputs) says what it does. Higher rates raise the forward, lifting calls and lowering puts. Higher dividends lower the forward, lowering calls and lifting puts.

:::practice Borrow cost acts like an extra dividend
Short sellers must borrow the shares they sell, and for most large stocks the fee is tiny. For a stock that is hard to borrow, the fee can be several percent a year, and the option market prices it in exactly like an additional dividend yield. If borrowing ACME cost an extra 3% a year, the 394-day forward would fall to {{ usd(Fhtb) }}, the 100 call would drop to {{ usd(hc) }} and the 100 put would rise to {{ usd(hp) }}. When you see puts priced above calls at the same strike on a stock that pays no large dividend, check the borrow before concluding that puts are expensive.
:::

## Real dividends are discrete

ACME actually pays $0.50 a share four times a year. This Course prices that as a 2% continuous yield, which is accurate enough for most purposes. Professional pricing models use the actual dividend dates and amounts, because what matters is whether an [[ex-dividend date]] falls before expiration. If one does, the stock is expected to drop by the dividend on that day, so calls are cheaper and puts dearer: by nearly the full dividend for deep in-the-money options, by less for the others. If no ex-dividend date falls before expiration, the dividend does not affect the option at all. A dividend just before expiration can also make it worth exercising an in-the-money call early, which [Exercise, assignment and expiration](#core-07) covers.

:::rule How listed options treat dividends (as of 2026)
The OCC does not change the terms of a listed equity option for ordinary, regular cash dividends; holders of calls simply do not receive them, and the expected dividends are reflected in the premium. For special or non-ordinary cash dividends above a minimum size, the OCC generally adjusts the contract (typically by reducing the strike by the dividend amount). Whether a given distribution counts as ordinary is decided by the OCC case by case and announced in an information memo.
:::

Index options carry a dividend yield too: an index like HBR collects dividends from many components on many dates, which is why a continuous yield (1.5% for HBR) is a good description.

Try it in the pricer. It starts on the 394-day 100 call; move the rate and the dividend yield and watch how much more they matter here than on a 30-day option.

```tool pricer
{ S: 100, K: 100, dte: 394, iv: 0.30, r: RATE, q: ACME.q, type: 'call' }
```

:::key
Volatility is the annualized standard deviation of returns; over \(T\) years a typical move is about \(\sigma\sqrt{T}\), and since the future value is unknowable, the market quotes options in volatility. Rates and dividends enter through carry: the forward price \(F = S\,e^{(r-q)T}\), and calls and puts are priced around the forward, not around spot.
:::

```quiz
- q: >-
    ACME's volatility is 30%. About how large is a typical (one standard deviation) move in ACME over the 30 days to the December expiration?
  choices:
    - >-
      About $30
    - >-
      About {{ usd(100 * oneSd) }}
    - >-
      About $2.50, which is 30% divided by 12 months
  answer: 1
  explain: >-
    Scale volatility by the square root of time: \(30\% \times \sqrt{30/365}\) = {{ pct(oneSd) }} of $100, about {{ usd(100 * oneSd) }}. $30 is the one-year figure. Dividing by 12 treats the move as growing in proportion to time, but moves add up in variance, so they grow with the square root of time.
- q: >-
    With rates at 4% and ACME's yield at 2%, the 394-day forward price is {{ usd(F394) }}. If ACME cut its dividend to zero, what would happen to the forward and to the 394-day 100 put?
  choices:
    - >-
      The forward rises and the put falls
    - >-
      The forward falls and the put rises
    - >-
      Neither changes, because the stock price has not moved
  answer: 0
  explain: >-
    \(F = S\,e^{(r-q)T}\): a lower \(q\) means a higher forward. The put is priced around the forward, so with the forward further above the strike the put is further out of the money and worth less. The stock price staying where it is does not protect the put: with nothing paid out along the way, the forward, which is what the put is measured against, is higher.
- q: >-
    Which option's price changes by the largest *percentage* when volatility rises from 30% to 40%?
  choices:
    - >-
      The December 100 call (at the money)
    - >-
      The December 110 call (out of the money)
    - >-
      They change by the same percentage
  answer: 1
  explain: >-
    The 110 call goes from {{ usd(otmV[0.30]) }} to {{ usd(otmV[0.40]) }}, a gain of {{ pct(otmV[0.40] / otmV[0.30] - 1, 0) }}; the 100 call goes from {{ usd(atmV[0.30]) }} to {{ usd(atmV[0.40]) }}, a gain of {{ pct(atmV[0.40] / atmV[0.30] - 1, 0) }}. The at-the-money call gains more dollars, which makes it the tempting answer, but the out-of-the-money call depends on a large move happening at all, so its value is far more sensitive to volatility in proportion.
- q: >-
    A stock pays no dividend, yet its one-year at-the-money puts trade well above its calls. What is the most likely explanation?
  choices:
    - >-
      The market expects the stock to fall
    - >-
      The stock is expensive to borrow, which lowers its forward price
    - >-
      Interest rates are higher than usual
  answer: 1
  explain: >-
    A borrow fee acts like a dividend yield: it lowers the forward, and calls and puts are priced around the forward, so puts rise and calls fall. Higher rates would do the opposite. A bearish forecast is tempting, but option prices relative to each other are set by carry and arbitrage, not by anyone's view of direction; if puts were rich relative to calls without a carry reason, traders would sell puts, buy calls and short the stock to lock in the difference.
```
