---
title: Choosing the call, the buy-write and early assignment
summary: Pick a covered call's strike by delta and its expiration by time decay, open it as a buy-write, and recognize when an ex-dividend date will get you assigned early.
---

```calc
const env = { r: RATE, q: ACME.q };
const dec = chain(ACME, { dte: 30 });
const jan = chain(ACME, { dte: 58 });
const mar = chain(ACME, { dte: 121 });
const at = (ch, k) => ch.rows.find((r) => r.strike === k).call;
const T30 = 30 / 365;
const pITM = (k) => bs.probITM({ S: 100, K: k, T: T30, r: RATE, q: ACME.q, sigma: at(dec, k).iv, type: 'call' });
const strikes = [100, 105, 110];
const row = (k) => {
  const c = at(dec, k);
  const legs = [{ kind: 'stock', qty: 100, price: 100 }, { kind: 'call', qty: -1, strike: k, premium: c.bid }];
  const s = payoff.summary(legs);
  return { c, s, stat: c.bid / 100, called: (k - 100 + c.bid) / 100, p: pITM(k) };
};
const R = Object.fromEntries(strikes.map((k) => [k, row(k)]));
// expirations for the 105 call
const tenors = [[30, dec], [58, jan], [121, mar]].map(([d, ch]) => ({ d, atm: at(ch, 100).bid, atmDay: at(ch, 100).bid / d, bid: at(ch, 105).bid, perDay: at(ch, 105).bid / d, delta: at(ch, 105).delta, iv: at(ch, 105).iv }));
// buy-write on the January 105 call
const jc = at(jan, 105);
const net = 100 - jc.bid;
const bw = [{ kind: 'stock', qty: 100, price: 100 }, { kind: 'call', qty: -1, strike: 105, premium: jc.bid, dte: 58, iv: jc.iv }];
const bws = payoff.summary(bw);
const bwStatic = (100 - net) / net;
const bwCalled = (105 - net) / net;
// early assignment before an ex-dividend date
const exS = 112, left = 9;
const exIV = smileIV(ACME, 105, left / 365);
const exCall = bs.price({ S: exS, K: 105, T: left / 365, r: RATE, q: ACME.q, sigma: exIV, type: 'call' });
const exTV = exCall - (exS - 105);
// the call's extrinsic value after the stock goes ex: same-strike put plus interest on the strike (core-07)
const D = ACME.dividend, tDiv = 0.5 / 365;
const exAfter = { S: exS - D, K: 105, T: left / 365 - tDiv, r: RATE, q: 0, sigma: exIV };
const exPut = bs.price({ ...exAfter, type: 'put' });
const exCarry = 105 * (1 - Math.exp(-RATE * (left / 365 - tDiv)));
const exExtr = exPut + exCarry;
```

The [previous Lesson](#core-09-covered-call) fixed the strike at 105 and the expiration at December. In practice those are the two decisions that make or break a covered call, and professionals make them with the Greeks rather than by feel.

## Choosing the strike by delta

A call's [[delta]] is a rough guide to the chance it finishes [[in the money]]. A covered-call writer uses that directly: the delta of the call you sell is roughly the chance your shares get called away.

:::example Three December covered calls on 100 ACME at $100
Each row sells one December call at its bid against 100 shares bought at $100.

| Call sold | Delta | Premium | Static return | Return if called | Break-even | Chance of finishing above the strike |
|---|---|---|---|---|---|---|
| 100 (at the money) | {{ num(R[100].c.delta, 2) }} | {{ usd(R[100].c.bid) }} | {{ pct(R[100].stat, 2) }} | {{ pct(R[100].called, 2) }} | {{ usd(R[100].s.breakevens[0]) }} | {{ pct(R[100].p, 0) }} |
| 105 | {{ num(R[105].c.delta, 2) }} | {{ usd(R[105].c.bid) }} | {{ pct(R[105].stat, 2) }} | {{ pct(R[105].called, 2) }} | {{ usd(R[105].s.breakevens[0]) }} | {{ pct(R[105].p, 0) }} |
| 110 | {{ num(R[110].c.delta, 2) }} | {{ usd(R[110].c.bid) }} | {{ pct(R[110].stat, 2) }} | {{ pct(R[110].called, 2) }} | {{ usd(R[110].s.breakevens[0]) }} | {{ pct(R[110].p, 0) }} |

The pattern is the whole trade-off:

- The **at-the-money** call pays the most premium and the best downside cushion, but you keep none of the stock's upside, and the shares are called away about half the time.
- The **105** call, about a {{ num(R[105].c.delta * 100, 0) }}-delta call, pays less but lets you keep $5 of upside first.
- The **110** call pays very little. You keep most of the upside, but the premium barely cushions a decline.
:::

There is no free choice among these. A lower strike means more income now and more upside surrendered; a higher strike means less income and more stock-like behavior. What you are really choosing is how much of the stock you want to keep owning: the position delta of each covered call is 100 shares minus 100 times the call's delta.

:::practice How writers usually choose
Many systematic covered-call writers sell calls around 0.20 to 0.35 delta, 30 to 45 days out. That keeps the chance of assignment modest and leaves room for the stock to rise, while still collecting meaningful premium. Writers who are happy to sell the shares, or who expect the stock to stall, sell closer to the money. Writers who want to keep the shares at almost any cost sell far out of the money, or do not write calls at all. Always check the [[open interest]] and the [[bid-ask spread]] before choosing: a strike with a wide market costs you on the way in and again on the way out.
:::

## Choosing the expiration

Time value does not drain evenly. An at-the-money or slightly out-of-the-money option loses value faster as expiration approaches (see [[time decay]] in [What drives an option's price](#core-04)). Here are the ACME 100 and 105 calls in three expirations:

| Expiration | Days | 100 call bid | per day | 105 call bid | per day | 105 call delta |
|---|---|---|---|---|---|---|
| December | {{ int(tenors[0].d) }} | {{ usd(tenors[0].atm) }} | {{ usd(tenors[0].atmDay, 3) }} | {{ usd(tenors[0].bid) }} | {{ usd(tenors[0].perDay, 3) }} | {{ num(tenors[0].delta, 2) }} |
| January | {{ int(tenors[1].d) }} | {{ usd(tenors[1].atm) }} | {{ usd(tenors[1].atmDay, 3) }} | {{ usd(tenors[1].bid) }} | {{ usd(tenors[1].perDay, 3) }} | {{ num(tenors[1].delta, 2) }} |
| March | {{ int(tenors[2].d) }} | {{ usd(tenors[2].atm) }} | {{ usd(tenors[2].atmDay, 3) }} | {{ usd(tenors[2].bid) }} | {{ usd(tenors[2].perDay, 3) }} | {{ num(tenors[2].delta, 2) }} |

The at-the-money call shows the pattern clearly: the shorter the call, the more it earns per day. Out-of-the-money calls show it less, because their decay is spread more evenly over their life. Shorter calls earn more per day, but you have to trade more often, pay more spreads and commissions, and you face a fresh decision every month. Longer calls lock in more total premium today, but the same 105 strike now has a higher delta, so you give up more of the stock's behavior, and you are committed for longer if ACME rallies. Monthly expirations 30 to 60 days out are the usual compromise.

## The buy-write

If you do not already own the shares, you can buy them and sell the call in one order. That is a [[buy-write]]: a [[complex order]] for both legs at a single net price, so you never hold the shares unhedged or the call uncovered, even for a moment.

:::example A January 105 buy-write
ACME is at $100 and the January 105 call (58 days) is bid at {{ usd(jc.bid) }}. You enter a buy-write: buy 100 shares, sell one January 105 call, for a net debit of {{ usd(net) }} per share, {{ usd(net * 100) }} in total.

Because you paid {{ usd(net) }}, returns are measured on that amount:

- **Static return** (ACME unchanged at $100): ($100 − {{ usd(net) }}) / {{ usd(net) }} = {{ pct(bwStatic, 2) }} in 58 days.
- **Return if called** (ACME above $105): ($105 − {{ usd(net) }}) / {{ usd(net) }} = {{ pct(bwCalled, 2) }}, a profit of {{ usd(bws.maxProfit) }}.
- **Break-even**: {{ usd(bws.breakevens[0]) }}. Everything below that is a loss, up to {{ usd(-bws.maxLoss) }} if ACME went to zero.
:::

The net price is what matters. If the buy-write fills at {{ usd(net) }}, it makes no difference whether you think of it as "bought the stock at $100 and sold the call at {{ usd(jc.bid) }}" or "bought the stock at $99 and sold the call at {{ usd(jc.bid - 1) }}". Brokers report the legs separately, but your risk is set by the net.

```tool position-builder
{ title: 'January 105 buy-write', legs: bw, range: [80, 125] }
```

## Early assignment near an ex-dividend date

ACME calls are [[American-style|American-style option]]: the holder can exercise any business day, not only at expiration. Holders almost never exercise early, because exercising throws away the call's remaining time value. The main exception is the day before an [[ex-dividend date]].

A call holder does not receive dividends; a shareholder does. If a call is deep in the money, the holder compares the dividend with the time value the call will still have *after* the stock goes ex. By put-call parity that is about the price of the put with the same strike plus the interest on the strike until expiration (the derivation is in [Exercise, assignment and expiration](#core-07)). If the dividend is larger, the holder does better by exercising, owning the shares before the ex-date and collecting the dividend.

:::example Assigned before the dividend
Suppose ACME has rallied to $112 and goes ex-dividend for its $0.50 quarterly dividend on Thursday, December 10. You are short the December 105 call. On Wednesday, December 9, with {{ int(left) }} days to expiration, the call is worth about {{ usd(exCall) }}: {{ usd(exS - 105) }} of intrinsic value and only {{ usd(exTV) }} of time value.

A holder who keeps the call loses about $0.50 of value when the stock drops by the dividend on the ex-date. A holder who exercises collects $0.50 and gives up the time value the call would still have after the ex-date: the 105 put, worth about {{ usd(exPut) }} once ACME trades ex-dividend, plus {{ usd(exCarry) }} of interest on $105 until expiration, about {{ usd(exExtr) }} in all. The dividend is larger by about {{ usd(D - exExtr) }} a share, so many holders will exercise. (Today's quoted time value, {{ usd(exTV) }}, already has the coming price drop priced in, so it is not the number to compare.)

If you are assigned, you find out on Thursday morning: your shares were sold at $105 under Wednesday's exercise. You keep the premium and the $500 gain to the strike, which is your full max profit, just earlier than planned. You do not receive the dividend, because you no longer own the shares on the ex-date.
:::

For a covered call, early assignment is rarely a financial disaster: it hands you the return if called, early. It matters when you did not want to sell the shares (perhaps they carry a large taxable gain, see [US taxes](#core-14)), or when you were counting on the dividend. If you want to keep the shares, buy back the call before the ex-date. The danger is larger for short calls inside spreads, covered in [Directional spreads](#core-10).

:::rule Exercise and dividends (as of 2026)
US stock trades settle one business day after the trade (T+1), so the ex-dividend date and the record date are normally the same day. To receive a dividend you must own the shares before the ex-date; a call holder must therefore exercise no later than the business day before it. The OCC assigns exercise notices to clearing firms at random, and each broker allocates them among its customers by a random or first-in, first-out method disclosed to customers. You learn of an assignment the next morning.
:::

:::key
Choose the strike by delta: the call's delta is roughly the chance of being called away, and 100 shares minus 100 × that delta is how much stock you still effectively own. Shorter expirations earn more per day but need more trading. A deep in-the-money short call is likely to be exercised the day before the ex-date when the dividend is larger than the same-strike put plus the interest on the strike; if in doubt, expect assignment.
:::

```quiz
- q: >-
    You want to collect some premium on your 100 ACME shares but keep as much of the stock's upside as possible. Which December call fits best?
  choices:
    - >-
      The 100 call, delta {{ num(R[100].c.delta, 2) }}
    - >-
      The 110 call, delta {{ num(R[110].c.delta, 2) }}
    - >-
      The 105 call, delta {{ num(R[105].c.delta, 2) }}
  answer: 1
  explain: >-
    The lowest-delta call leaves you with the most effective stock: about {{ num(100 - 100 * R[110].c.delta, 0) }} shares of delta, and $10 of upside before the cap. It pays only {{ usd(R[110].c.bid) }}, which is the price of keeping the upside. The 100 call pays the most but caps the upside at today's price.
- q: >-
    A January 105 buy-write fills at a net {{ usd(net) }}. What is the return if called?
  choices:
    - >-
      {{ pct(bwCalled, 2) }}
    - >-
      {{ pct(0.05, 2) }}
    - >-
      {{ pct(bwStatic, 2) }}
  answer: 0
  explain: >-
    If called, you sell at $105 shares that cost you a net {{ usd(net) }}: ($105 − {{ usd(net) }}) / {{ usd(net) }} = {{ pct(bwCalled, 2) }}. The {{ pct(0.05, 2) }} ignores the premium. {{ pct(bwStatic, 2) }} is the static return, what you make if ACME stays at $100.
- q: >-
    You are short a December 105 covered call. ACME is at $112 and goes ex-dividend ($0.50) tomorrow. After the ex-date the 105 put plus the interest on $105 to expiration will be worth only about {{ usd(exExtr) }}. What is most likely?
  choices:
    - >-
      Nothing happens until expiration, because holders never exercise early
    - >-
      You are likely to be assigned tonight and lose the shares at $105 before the ex-date
    - >-
      You will receive the dividend and then be assigned at expiration
  answer: 1
  explain: >-
    The dividend ($0.50) is worth more than the time value the holder gives up by exercising, about {{ usd(exExtr) }} (the put plus the interest on the strike), so exercising today is the better choice for many holders. You would deliver the shares at $105 and miss the dividend. Early exercise is rare in general, but this is the classic case where it happens.
- q: >-
    Why does a shorter-dated call usually earn more premium per day than a longer-dated call at the same strike?
  choices:
    - >-
      Because its implied volatility is always higher
    - >-
      Because time value decays faster as expiration approaches
    - >-
      Because it has a higher delta
  answer: 1
  explain: >-
    Time value falls slowly at first and faster near expiration, so the 30-day 100 call earns {{ usd(tenors[0].atmDay, 3) }} a day against {{ usd(tenors[2].atmDay, 3) }} for the 121-day call. Higher implied volatility is not the reason: in this chain the longer-dated calls carry slightly *higher* implied volatility ({{ pct(tenors[2].iv, 1) }} for the March 105 call against {{ pct(tenors[0].iv, 1) }} for December), and the shorter call has the lower delta.
```
