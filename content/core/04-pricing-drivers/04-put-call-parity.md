---
title: Put-call parity
summary: Derive the exact link between a call and a put at the same strike, and use it to build any position synthetically from the others.
---

```calc
const T = 30 / 365;
const q30 = chain(ACME, { dte: 30 });
const r100 = q30.rows.find((x) => x.strike === 100);
const r105 = q30.rows.find((x) => x.strike === 105);
const c100 = bs.price({ S: 100, K: 100, T, r: RATE, q: ACME.q, sigma: r100.call.iv, type: 'call' });
const p100 = bs.price({ S: 100, K: 100, T, r: RATE, q: ACME.q, sigma: r100.put.iv, type: 'put' });
const sPv = 100 * Math.exp(-ACME.q * T);
const kPv = 100 * Math.exp(-RATE * T);
const midDiff = r100.call.mid - r100.put.mid;
const c105 = Number(r105.call.theo.toFixed(2));
const p105 = Number(r105.put.theo.toFixed(2));
const cc = [{ kind: 'stock', qty: 100, price: 100 }, { kind: 'call', qty: -1, strike: 105, premium: c105 }];
const sp = [{ kind: 'put', qty: -1, strike: 105, premium: p105 }];
const gap = payoff.pnlAtExpiry(cc, 100) - payoff.pnlAtExpiry(sp, 100);
const intK = 10500 * (1 - Math.exp(-RATE * T));
const divS = 10000 * (1 - Math.exp(-ACME.q * T));
```

Calls and puts look like two separate markets: one for people who expect a rise, one for people who expect a fall. They are not. At the same strike and expiration, a call and a put are tied together by an equation that holds no matter what anyone thinks the stock will do. Once you know the call price, the stock price, the rate and the dividend, you know the put price. This Lesson derives that equation, called [[put-call parity]], and shows its most useful consequence: any option position can be rebuilt from other instruments.

## Two portfolios with the same payoff

The argument uses [[European-style options|European-style option]], which can only be exercised at expiration; the end of the Lesson says what changes for American-style ACME options. Use the same notation as before: \(C\) and \(P\) are today's call and put prices at strike \(K\) with \(T\) years to expiration, \(S\) is the stock price, \(r\) the rate and \(q\) the dividend yield.

:::derivation Put-call parity
Build two portfolios today.

**Portfolio A:** one call, plus cash of \(K\,e^{-rT}\) invested at the risk-free rate. The cash grows to exactly \(K\) by expiration.

**Portfolio B:** one put, plus \(e^{-qT}\) shares with dividends reinvested. As in the [forward price Derivation](#core-04-volatility-and-carry), that holding grows to exactly one share by expiration.

Let \(S_T\) be the stock price at expiration. Look at each portfolio's value then, in the two cases that can happen.

| | Stock finishes at or above the strike, \(S_T \ge K\) | Stock finishes below the strike, \(S_T < K\) |
|---|---|---|
| Portfolio A | Call worth \(S_T - K\), plus cash \(K\): total \(S_T\) | Call worthless, plus cash \(K\): total \(K\) |
| Portfolio B | Put worthless, plus one share: total \(S_T\) | Put worth \(K - S_T\), plus one share: total \(K\) |

In every case the two portfolios are worth the same at expiration: the larger of \(S_T\) and \(K\). Neither can be exercised early, so nothing can make them differ before then.

Two things that are guaranteed to be worth the same at a future date must cost the same today. If they did not, you could buy the cheaper one and sell the dearer one, collect the difference now, and owe nothing at expiration, because the two positions cancel exactly. So

\[ C + K\,e^{-rT} = P + S\,e^{-qT} . \]

Subtract \(P\) and \(K\,e^{-rT}\) from both sides to get the form traders use:

\[ C - P = S\,e^{-qT} - K\,e^{-rT} . \]

Since the forward price is \(F = S\,e^{(r-q)T}\), the right-hand side can also be written \(e^{-rT}(F - K)\): a call minus a put at the same strike is worth today's value of the forward minus the strike.
:::

The step "same future value, same price today" is the most important argument in option pricing. A trade that makes money with no risk and no money put up is called an [[arbitrage]]. Markets full of professionals with computers do not leave arbitrages lying around for long, so prices that would allow one get traded back into line. Parity is what that pressure produces.

## Checking it on ACME

:::example The December 100 call and put
ACME is at $100. The December options expire in 30 days. The right-hand side of parity is

\[ S\,e^{-qT} - K\,e^{-rT} = {{ num(sPv, 3) }} - {{ num(kPv, 3) }} = {{ num(sPv - kPv, 3) }} . \]

So the 100 call should be worth {{ usd(sPv - kPv, 3) }} more than the 100 put. At ACME's 30% volatility the two are worth {{ usd(c100, 3) }} and {{ usd(p100, 3) }}, a difference of {{ usd(c100 - p100, 3) }}, exactly as parity says.

On the chain the 100 call's mid is {{ usd(r100.call.mid, 3) }} and the put's mid is {{ usd(r100.put.mid, 3) }}, a difference of {{ usd(midDiff, 3) }}. That is within a couple of cents of the parity value, which is as close as quotes in five-cent increments and a [[bid-ask spread]] of {{ usd(r100.call.ask - r100.call.bid) }} allow.
:::

Notice what the equation did not need: volatility. Parity is model-free. Whatever volatility the market uses to price the call, it must use the same one for the put at that strike, or parity breaks. This is why a call and a put at the same strike always show nearly the same [[implied volatility]] on a chain.

## Synthetic positions

Parity has four pieces: a call, a put, the stock and cash. Rearrange it and any one piece equals a combination of the other three. A combination that reproduces another instrument's payoff is a [[synthetic position]].

Ignoring the small cash and carry terms, which only shift the profit by a constant, the six synthetics are:

| You want | Build it with | Rearranged parity |
|---|---|---|
| Long stock | long call + short put | \(S \approx C - P\) |
| Short stock | short call + long put | \(-S \approx P - C\) |
| Long call | long stock + long put | \(C \approx S + P\) |
| Long put | short stock + long call | \(P \approx C - S\) |
| Short call | short stock + short put | \(-C \approx -S - P\) |
| Short put | long stock + short call | \(-P \approx S - C\) |

The calls and puts in each line share one strike and one expiration. Two of these lines describe strategies you will meet as named trades. Long stock plus a long put is a [[protective put]], and the table says it is the same position as a long call. Long stock plus a short call is a [[covered call]], and the table says it is a short put.

:::example A covered call and a short put are the same trade
Two Learners want the same thing from ACME over the next 30 days.

- One buys 100 shares at $100 and sells the December 105 call at {{ usd(c105) }}: a covered call.
- The other sells the December 105 put at {{ usd(p105) }} and keeps $10,500 in Treasury bills in case of assignment: a cash-secured put.

Their profit or loss at expiration, counting only the stock and the options:

| ACME at expiration | Covered call | Short put |
|---|---|---|
| $85 | {{ usd(payoff.pnlAtExpiry(cc, 85)) }} | {{ usd(payoff.pnlAtExpiry(sp, 85)) }} |
| $95 | {{ usd(payoff.pnlAtExpiry(cc, 95)) }} | {{ usd(payoff.pnlAtExpiry(sp, 95)) }} |
| $100 | {{ usd(payoff.pnlAtExpiry(cc, 100)) }} | {{ usd(payoff.pnlAtExpiry(sp, 100)) }} |
| $105 | {{ usd(payoff.pnlAtExpiry(cc, 105)) }} | {{ usd(payoff.pnlAtExpiry(sp, 105)) }} |
| $115 | {{ usd(payoff.pnlAtExpiry(cc, 115)) }} | {{ usd(payoff.pnlAtExpiry(sp, 115)) }} |

The two columns differ by the same {{ usd(gap) }} at every price. That gap is carry, which the table leaves out. The put seller earns about {{ usd(intK) }} of interest on the $10,500 in bills; the stock owner collects dividends, which the 2% yield used to price these options values at about {{ usd(divS) }}. The interest minus the dividends is {{ usd(intK - divS) }}, which is the gap to within the rounding of the premiums. Count both and the two Learners have made the same trade.
:::

This is more than a curiosity. When two positions are the same, you choose between them on cost: which has the tighter bid-ask spreads, fewer commissions, lower margin, simpler taxes. Professionals compare synthetics all the time; a beginner who thinks a covered call is "safer" than a short put has not yet seen this table. [Income and hedging strategies](#core-09) uses it again.

Try the synthetic long stock below: long the December 100 call and short the December 100 put. The expiration line is a straight diagonal through the strike, the same shape as owning 100 shares.

```tool position-builder
{ title: 'Synthetic long stock: long 100 call, short 100 put', legs: [{ kind: 'call', qty: 1, strike: 100, dte: 30 }, { kind: 'put', qty: -1, strike: 100, dte: 30 }], range: [80, 120] }
```

## American-style options

The Derivation needed both options to be exercisable only at expiration. ACME options are [[American-style|American-style option]]: the holder can exercise any day. That right can only add value, so an American option is worth at least as much as the matching European one, and parity becomes a pair of bounds rather than an equation. In practice the difference is small for most strikes, and ACME quotes sit within a few cents of the European equation. The exceptions are deep in-the-money puts, where early exercise to collect the strike sooner can be worth something when rates are high, and in-the-money calls just before an ex-dividend date. [Exercise, assignment and expiration](#core-07) works through both.

:::rule Exercise style of US-listed options (as of 2026)
Options on individual US stocks and on ETFs are American-style and settle by delivery of shares. Most broad index options, including SPX and XSP, are European-style and cash-settled, so put-call parity holds for them as an equation, apart from trading costs.
:::

:::key
Put-call parity, \(C - P = S\,e^{-qT} - K\,e^{-rT}\), holds because a call plus cash and a put plus stock pay exactly the same at expiration. It needs no volatility and no forecast. Rearranged, it builds every option position from the others: long call + short put is long stock, a covered call is a short put, a protective put is a long call.
:::

```quiz
- q: >-
    An ACME call and put with the same strike and expiration have both risen in price this morning, and ACME has not moved. What must be true?
  choices:
    - >-
      The market has turned bullish and bearish at the same time
    - >-
      The implied volatility of both has risen, by about the same amount
    - >-
      Parity has broken and there is an arbitrage
  answer: 1
  explain: >-
    Parity fixes the *difference* \(C - P\) at \(S\,e^{-qT} - K\,e^{-rT}\), which has not changed. Both prices can still rise together, and that is what a rise in volatility does; parity forces the call and put at one strike to share the same implied volatility. No arbitrage is needed to explain it, because the difference between them is unchanged.
- q: >-
    Which combination is a synthetic long call (same strike and expiration throughout)?
  choices:
    - >-
      Long stock and short put
    - >-
      Long stock and long put
    - >-
      Short stock and long put
    - >-
      Long put and short call
  answer: 1
  explain: >-
    Rearranging parity gives \(C \approx S + P\): owning the stock with a put under it has the call's shape, limited loss below the strike and unlimited gain above it. Long stock with a short put doubles the downside instead of limiting it. Long put with short call is a synthetic *short* stock.
- q: >-
    With 30 days to go, ACME at $100, a 4% rate and a 2% yield, the parity value of the December 100 call minus the 100 put is {{ usd(sPv - kPv, 3) }}. The chain shows the call's mid {{ usd(midDiff, 3) }} above the put's. What should you conclude?
  choices:
    - >-
      There is an arbitrage of about two cents a share to collect
    - >-
      The quotes are consistent with parity once rounding and spreads are allowed for
    - >-
      The put is overpriced, so it is a good sale
  answer: 1
  explain: >-
    A difference of a cent or two is smaller than the bid-ask spread on either option, so you could not trade it: buying at the ask and selling at the bid would cost far more than the gap. The quotes agree with parity as closely as prices quoted in five-cent steps can. The next Lesson shows what an arbitrage trade would have to earn to be worth doing.
- q: >-
    A colleague says a covered call is safer than a cash-secured put at the same strike because "you own the stock." What is the best reply?
  choices:
    - >-
      Right: the stock protects you on the way down
    - >-
      Wrong: the cash-secured put loses less if the stock falls, because no stock is owned
    - >-
      They are the same position by put-call parity; they differ only by carry and costs
  answer: 2
  explain: >-
    Long stock plus a short call equals a short put. Both lose roughly a dollar for every dollar the stock falls below the strike, minus the premium, and both give up the gain above the strike. In the Worked Example their P&L differs by the same {{ usd(gap) }} at every price, which interest and dividends account for. Owning the stock does not change the downside; it is the same downside in a different wrapper.
```
