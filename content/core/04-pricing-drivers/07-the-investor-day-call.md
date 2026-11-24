---
title: The investor-day call
summary: Choose an option to express a short-term bullish view, then decide what to do when the stock rises but the option barely does.
kind: scenario
---

```calc
const c30 = chain(ACME, { dte: 30 }), c58 = chain(ACME, { dte: 58 });
const f = (c, k) => c.rows.find((x) => x.strike === k);
const dec100 = f(c30, 100).call.ask, dec110 = f(c30, 110).call.ask;
const jan100 = f(c58, 100).call.ask, jan100p = f(c58, 100).put.bid;
const env = { r: RATE, q: ACME.q, ivShift: -0.03 };
const A = [{ kind: 'call', qty: 17, strike: 110, premium: dec110, dte: 30, iv: 0.30 }];
const B = [{ kind: 'call', qty: 3, strike: 100, premium: dec100, dte: 30, iv: 0.30 }];
const C = [{ kind: 'call', qty: 2, strike: 100, premium: jan100, dte: 58, iv: 0.30 }];
const D = [{ kind: 'call', qty: 2, strike: 100, premium: jan100, dte: 58, iv: 0.30 }, { kind: 'put', qty: -2, strike: 100, premium: jan100p, dte: 58, iv: 0.30 }];
const at = (legs, S) => payoff.pnlAt(legs, S, 14, env);
const janNow = Number(bs.price({ S: 103, K: 100, T: 44 / 365, r: RATE, q: ACME.q, sigma: 0.27, type: 'call' }).toFixed(2));
const janGain = (janNow - jan100) * 200;
const holdExp = payoff.pnlAtExpiry(C, 103);
const be = payoff.breakevens(C)[0];
```

This Scenario Exercise uses every input from the Module: the stock price, time, volatility, and the link between calls and puts.

```scenario
setup: >-
  It is Wednesday, November 18. ACME is at $100 and its options trade at about 30% implied volatility. ACME holds an investor day on December 1, 13 days from now, and you expect the stock to rally on it. You are willing to risk about $1,000 and no more. The relevant asks are: December 100 call (30 days) {{ usd(dec100) }}, December 110 call {{ usd(dec110) }}, January 100 call (58 days) {{ usd(jan100) }}; the January 100 put is bid {{ usd(jan100p) }}.
steps:
  - prompt: >-
      Which trade do you put on?
    choices:
      - text: >-
          Buy 17 December 110 calls at {{ usd(dec110) }}, for {{ usd(17 * dec110 * 100) }}. Lots of contracts, lots of leverage.
        grade: poor
        feedback: >-
          These calls need ACME above $110 by mid-December, a move of more than one standard deviation, and as out-of-the-money, short-dated options they lose value fastest. Suppose the rally comes but is modest: on December 2 ACME is at $103 and implied volatility has eased to 27% now that the event is over. The calls are worth so little that you are down {{ usd(-at(A, 103)) }}, even though you were right on direction. If ACME is unchanged at $100 you are down {{ usd(-at(A, 100)) }}, almost everything.
      - text: >-
          Buy 3 December 100 calls at {{ usd(dec100) }}, for {{ usd(3 * dec100 * 100) }}.
        grade: acceptable
        feedback: >-
          A reasonable choice. If ACME is at $103 on December 2 with volatility at 27%, you are up {{ usd(at(B, 103)) }}. But these calls have only 16 days left after the event, and time decay is speeding up: if ACME is still at $100 on December 2, you are down {{ usd(-at(B, 100)) }}, and the calls keep melting every day the rally fails to arrive.
      - text: >-
          Buy 2 January 100 calls at {{ usd(jan100) }}, for {{ usd(2 * jan100 * 100) }}.
        grade: best
        feedback: >-
          Fewer contracts, but each one has 58 days of life, so it decays slowly and still has 44 days left after the event. If ACME is at $103 on December 2 with volatility at 27%, you are up {{ usd(janGain) }}; if ACME is unchanged at $100, you are down {{ usd(-at(C, 100)) }}, a smaller loss than the December calls, and you still have time for the idea to work. Your risk is capped at what you paid.
      - text: >-
          Buy 2 January 100 calls and sell 2 January 100 puts at {{ usd(jan100p) }}. The puts pay for most of the calls, so the trade costs only {{ usd(2 * (jan100 - jan100p) * 100) }}.
        grade: poor
        feedback: >-
          By put-call parity, long call plus short put at the same strike is synthetic long stock: this is the same as owning 200 shares. It makes the most if ACME rallies (up {{ usd(at(D, 103)) }} at $103), but if the investor day disappoints and ACME falls to $90, you are down {{ usd(-at(D, 90)) }}, far beyond your $1,000 limit. A small up-front cost is not the same as a small risk.
  - prompt: >-
      You bought the 2 January 100 calls. On December 2, the investor day is over. ACME has risen to $103, but implied volatility has fallen from 30% to 27% and 14 days have passed. Each call is worth {{ usd(janNow) }}, so you are up only {{ usd(janGain) }} on a 3% rally. What now?
    choices:
      - text: >-
          Sell both calls and take the profit.
        grade: best
        feedback: >-
          The reason for the trade, the investor day, has passed, and the calls still hold {{ usd(janNow - 3) }} a share of time value that will decay from here on. Selling locks in {{ usd(janGain) }}. The small gain is not a failure; it is what three inputs moving at once look like. The stock helped, but two weeks of time decay and a three-point drop in volatility took most of it back.
      - text: >-
          Sell one call and keep the other with a clear exit plan.
        grade: acceptable
        feedback: >-
          This takes half the profit and keeps some exposure if you have a new reason to expect more upside. Without a new reason, the remaining call is just paying time decay; write down the price or date at which you will close it.
      - text: >-
          Hold both to January expiration. ACME is above the strike, so the calls are winning.
        grade: poor
        feedback: >-
          Being in the money is not the same as being profitable. At expiration the calls are worth only their intrinsic value. If ACME is still at $103 on January 15, each call is worth $3.00 and you lose {{ usd(-holdExp) }} on the pair. You need ACME above {{ usd(be) }} at expiration just to break even, because you paid {{ usd(jan100) }} for each call.
      - text: >-
          Buy 2 more January calls. The stock is going your way.
        grade: poor
        feedback: >-
          The catalyst is behind you, so this is a new trade without the reason that justified the first one. It doubles your exposure to time decay and to a further fall in volatility, and takes your total risk above the $1,000 you set.
wrap: >-
  You were right about direction and still made little, because an option's price has six inputs and three of them moved: the stock rose, two weeks passed and implied volatility fell once the event was behind it. Choosing a longer expiration protected you against the timing, because time value decays slowly far from expiration and fast near it. Put-call parity showed that "cheap" call-plus-short-put structures are really stock, with stock's risk. Next, [The Greeks in practice](#core-05) gives each of these effects a number you can read off a screen before you trade.
```

```tool position-builder
{ title: 'Two ACME January 100 calls', legs: [{ kind: 'call', qty: 2, strike: 100, premium: jan100, dte: 58, iv: 0.30 }], daysPassed: 14, ivShift: -0.03, range: [85, 120] }
```
