---
title: Conversions, reversals and parity violations
summary: Build the conversion and the reversal, work out what a parity violation would earn after costs, and read what a persistent violation is really telling you.
---

```calc
const T = 30 / 365;
const q30 = chain(ACME, { dte: 30 });
const r100 = q30.rows.find((x) => x.strike === 100);
const sBid = 99.99, sAsk = 100.01;
const kPv = 100 * Math.exp(-RATE * T);
const divPv = 100 * (1 - Math.exp(-ACME.q * T));
const fair = kPv + divPv;
const convCost = sAsk + r100.put.ask - r100.call.bid;
const convEdge = fair - convCost;
const revProceeds = sBid + r100.put.bid - r100.call.ask;
const revEdge = revProceeds - fair;
const stale = 3.80;
const staleCost = sAsk + r100.put.ask - stale;
const staleEdge = fair - staleCost;
const fImplied = 100 + Math.exp(RATE * T) * (r100.call.mid - r100.put.mid);
const fModel = bs.forward({ S: 100, T, r: RATE, q: ACME.q });
const convLegs = [{ kind: 'stock', qty: 100, price: sAsk }, { kind: 'put', qty: 1, strike: 100, premium: r100.put.ask, dte: 30, iv: r100.put.iv }, { kind: 'call', qty: -1, strike: 100, premium: r100.call.bid, dte: 30, iv: r100.call.iv }];
```

[Put-call parity](#core-04-put-call-parity) says what a call and a put must be worth relative to each other. This Lesson is about the trades that enforce it, the conversion and the reversal, and about what happens when you try to do them yourself. The short version: parity is enforced by firms whose costs are a fraction of yours, so by the time a violation is visible to you it is usually not a violation, or not one you can trade.

## The conversion

A [[conversion]] is three legs at one strike and one expiration:

- long 100 shares,
- long one put,
- short one call.

At expiration, exactly one of the options matters. If the stock is above the strike, the short call is assigned and you sell your shares at the strike. If it is below, you exercise the put and sell your shares at the strike. Either way you end up selling 100 shares at \(K\). The stock price at expiration has no effect at all.

So a conversion is a loan in disguise. You pay for the shares and the put, receive the call premium, and in return get a fixed \(K\) at expiration plus any dividends paid while you hold the shares. Its fair cost today is what that fixed money is worth today:

\[ S + P - C = K\,e^{-rT} + \text{(today's value of the dividends)} . \]

This is put-call parity rearranged; nothing new has been assumed. If you could put on a conversion for *less* than the right-hand side, you would have locked in a profit.

## The reversal

A [[reversal]] (also called a reverse conversion) is the mirror image:

- short 100 shares,
- short one put,
- long one call.

At expiration you buy back 100 shares at \(K\), whichever option is in the money, and you owe any dividends paid in the meantime to the lender of the shares. You collect the stock and put proceeds and pay the call premium today. A reversal is profitable if what you collect today is *more* than the fair value above, which happens when calls are cheap relative to puts.

:::derivation Why the conversion's payoff is fixed
At expiration, per share, the conversion holds a share worth \(S_T\), a put worth \(\max(K - S_T, 0)\) and a short call worth \(-\max(S_T - K, 0)\).

If \(S_T \ge K\): \(S_T + 0 - (S_T - K) = K\).

If \(S_T < K\): \(S_T + (K - S_T) - 0 = K\).

The total is \(K\) in both cases. A position worth a certain \(K\) at time \(T\) is worth \(K\,e^{-rT}\) today, plus the dividends it collects on the way. A reversal is the same three legs with every sign flipped, so it is worth \(-K\) at expiration: you pay \(K\) for certain.
:::

## Trying it at the market

:::example A conversion at quoted prices
ACME is quoted $99.99 bid, $100.01 ask. On the December chain, 30 days out, the 100 call is {{ usd(r100.call.bid) }} bid, {{ usd(r100.call.ask) }} ask and the 100 put is {{ usd(r100.put.bid) }} bid, {{ usd(r100.put.ask) }} ask.

**Fair value.** The conversion pays $100 in 30 days, worth \(100\,e^{-rT}\) = {{ usd(kPv, 3) }} today, plus the dividends, which the Course's 2% yield values at about {{ usd(divPv, 3) }} today. Total: {{ usd(fair, 3) }} per share.

**Cost at the market.** You buy the stock at the ask, buy the put at the ask and sell the call at the bid:

\[ {{ num(sAsk) }} + {{ num(r100.put.ask) }} - {{ num(r100.call.bid) }} = {{ num(convCost) }} . \]

You would pay {{ usd(convCost) }} for something worth {{ usd(fair, 3) }}, a loss of {{ usd(-convEdge, 3) }} per share, {{ usd(-convEdge * 100) }} per conversion, before commissions.

**The reversal** fares no better. Selling the stock at the bid and the put at the bid and buying the call at the ask brings in {{ usd(revProceeds) }}, against an obligation worth {{ usd(fair, 3) }}: a loss of {{ usd(-revEdge, 3) }} per share.

The quotes are *consistent* with parity, and the cost of crossing three bid-ask spreads is several times larger than any small gap between them.
:::

Here is the conversion in the position builder. The expiration line is flat: whatever ACME does, you get the same result. The chart counts only the stock and the options, so the line sits at {{ usd(payoff.pnlAtExpiry(convLegs, 100)) }}. Add the dividends you collect and subtract the interest your money would have earned in Treasury bills, and you arrive at the loss of {{ usd(-convEdge * 100) }} worked out above.

```tool position-builder
{ title: 'Conversion at market prices: long stock, long 100 put, short 100 call', legs: convLegs, range: [85, 115], editable: false }
```

## When the quotes really are out of line

Suppose a stale order sits in the book: someone is bidding {{ usd(stale) }} for the December 100 call while everything else is unchanged. Now the conversion costs

\[ {{ num(sAsk) }} + {{ num(r100.put.ask) }} - {{ num(stale) }} = {{ num(staleCost) }} \]

against a fair value of {{ usd(fair, 3) }}: an edge of {{ usd(staleEdge, 3) }} per share, {{ usd(staleEdge * 100) }} per conversion. Before you celebrate, count what stands between that number and a real profit:

- **Commissions and fees** on three legs, and again on the way out if you close early.
- **Execution risk.** A mispriced quote is the first thing every market maker's software hits. If you send the legs separately ([[legging]]) and the call bid vanishes after your stock order fills, you own stock you did not want.
- **Early assignment.** ACME options are American. Your short call can be assigned before expiration, typically just before an [[ex-dividend date]], which takes away the dividend you counted on.
- **[[Pin risk]].** If ACME closes exactly at $100 on expiration day, you do not know whether your short call will be assigned, so you do not know whether you will own shares on Monday.
- **Dividend changes.** The fair value counted a dividend. If ACME cuts it, the conversion is worth less.
- **Capital and margin.** The conversion ties up $10,000 of stock for a month to make {{ usd(staleEdge * 100) }} before costs.

The firms that do conversions and reversals for a living pay a fraction of a cent per share to trade, finance stock at institutional rates and run thousands of these at once. That is why parity violations on liquid options rarely last longer than it takes to type an order.

:::practice What market makers use them for
Market makers do not hunt for conversions as free money. They use them to neutralise inventory. A market maker who has bought calls from customers and sold puts to others is long the call and short the put, which is synthetic long stock; selling 100 shares per contract turns the whole package into a reversal, a position with almost no exposure to ACME's price. They then earn the bid-ask spread they charged customers, not the parity gap.
:::

## What a persistent violation tells you

If a gap between the parity value and the quotes persists on a liquid name, assume the market knows something your formula does not. The usual suspects, in order:

1. **Borrow cost.** A reversal requires selling shares short. When shares are hard to borrow, the fee is a cost the formula left out, so puts trade rich and calls cheap, and the reversal that would "capture" it does not pay. This is the most common reason by far.
2. **Dividend expectations.** The market may expect a special dividend, or a cut, that differs from the one you plugged in.
3. **Early exercise value.** Deep in-the-money American puts, and calls just before an ex-dividend date, are worth more than the European formula says.
4. **Stale or one-sided quotes**, especially in thinly traded strikes.

:::rule Selling short requires a borrow (as of 2026)
Under SEC Regulation SHO, a broker-dealer must have borrowed, arranged to borrow, or have reasonable grounds to believe it can borrow a security before accepting a customer's short sale (the "locate" requirement), and must close out failures to deliver within set deadlines. Brokers charge a borrow fee that can be large for hard-to-borrow stocks, and they can recall borrowed shares, forcing you to buy them back.
:::

:::practice Reading the market's forward from parity
Traders run parity backwards. Solving \(C - P = e^{-rT}(F - K)\) for \(F\) gives \(F = K + e^{rT}(C - P)\). From the December 100 mids, \(F\) = {{ usd(fImplied, 3) }}, against {{ usd(fModel, 3) }} from ACME's 4% rate and 2% yield. When the two agree, the market's carry matches yours. When the implied forward is well below the computed one, the market is pricing a borrow fee or a bigger dividend, and you have just measured it.
:::

:::key
A conversion (long stock, long put, short call) and a reversal (short stock, short put, long call) lock in the strike at expiration, so parity says what they must cost. At retail costs you cannot profit from the small gaps you see, and a large, persistent gap usually means a borrow fee, a dividend surprise or early-exercise value rather than free money.
:::

```quiz
- q: >-
    You hold a conversion on the ACME December 100 strike (long 100 shares, long the put, short the call). At expiration ACME is at $87. What do you end up with?
  choices:
    - >-
      You still own 100 shares, now worth $8,700
    - >-
      You sell 100 shares at $100 by exercising the put, receiving $10,000
    - >-
      Your short call is assigned and you sell 100 shares at $100
  answer: 1
  explain: >-
    Below the strike the call expires worthless and you exercise the put, selling your shares at $100. That is the point of a conversion: you sell at the strike whatever happens. The short call is assigned only when ACME finishes above $100, so the answer about the call being assigned describes the other half of the outcome, not this one.
- q: >-
    A stock is hard to borrow and its puts trade well above parity with its calls. Why does a reversal usually not capture that gap?
  choices:
    - >-
      Because a reversal buys puts, which are the expensive leg
    - >-
      Because a reversal requires shorting the stock, and the borrow fee eats the gap
    - >-
      Because parity does not apply to stocks that are hard to borrow
  answer: 1
  explain: >-
    A reversal is short stock, short put, long call. It sells the rich put and buys the cheap call, which looks attractive, but it also needs a short sale, and the borrow fee is exactly the cost the market priced into the put. Parity still applies; it just needs the borrow fee counted like an extra dividend yield. The answer saying a reversal buys puts has the put leg backwards.
- q: >-
    Using the December 100 quotes in this Lesson, a conversion at market prices costs {{ usd(convCost) }} for a payoff worth {{ usd(fair, 3) }}. What explains most of the loss?
  choices:
    - >-
      Parity is violated in the market's favour
    - >-
      Paying the bid-ask spread on three legs
    - >-
      The dividend you expected was too small
  answer: 1
  explain: >-
    Mid prices satisfy parity to within a cent or two. Buying the stock and put at the ask and selling the call at the bid gives away half a spread on each leg, which adds up to most of the {{ usd(-convEdge, 3) }} per share. Nothing is wrong with the market's pricing; this is simply what it costs a retail trader to cross three spreads.
- q: >-
    A stale bid of {{ usd(stale) }} for the December 100 call gives a conversion an edge of {{ usd(staleEdge * 100) }} per contract on paper. Which risk can remove the dividend you counted on before expiration?
  choices:
    - >-
      Pin risk
    - >-
      Early assignment of the short call before an ex-dividend date
    - >-
      Early exercise of your long put
  answer: 1
  explain: >-
    The holder of an in-the-money American call may exercise the day before the stock goes ex-dividend to collect the dividend. If your short call is assigned, your shares are gone and so is the dividend. Pin risk is real too, but it is about not knowing whether you will be assigned at expiration, not about losing a dividend. Exercising your own put is your choice, so it cannot surprise you.
```
