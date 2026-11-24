---
title: Trading volatility around earnings
summary: Choose a structure for an earnings announcement from the implied move, manage it after the volatility crush, and set up the next trade from the term structure.
kind: scenario
---

```calc
const env = { r: RATE, q: ACME.q };
const earn = ACME_EARNINGS;
// Monday Jan 11, 2027: 4 days to the January 15 expiration; implied vol doubled for the event
const T1 = 4 / 365;
const evIV = (K) => smileIV(ACME, K, 30 / 365) * 2;
const px = (K, type) => bs.price({ S: 100, K, T: T1, r: RATE, q: ACME.q, sigma: evIV(K), type });
const L = (kind, qty, K) => ({ kind, qty, strike: K, premium: px(K, kind), dte: 4, iv: evIV(K) });
const strad = px(100, 'call') + px(100, 'put');
const ic = [L('put', 1, 90), L('put', -1, 95), L('call', -1, 105), L('call', 1, 110)];
const ics = payoff.summary(ic);
const icCredit = -payoff.netPremium(ic);
const ifly = [L('put', 1, 95), L('put', -1, 100), L('call', -1, 100), L('call', 1, 105)];
const ifs = payoff.summary(ifly);
const ls = [L('call', 1, 100), L('put', 1, 100)];
const ss = [L('call', -2, 100), L('put', -2, 100)];
// Wednesday Jan 13: ACME opens at 103.50, implied vol back to normal, 2 days left
const S2 = 103.5;
const post = (legs, S) => legs.reduce((a, l) => a + l.qty * 100 * (bs.price({ S, K: l.strike, T: 2 / 365, r: RATE, q: ACME.q, sigma: smileIV(ACME, l.strike, 30 / 365), type: l.kind }) - l.premium), 0);
const icNow = post(ic, S2);
// Friday Feb 12: March (35 days) at 26% implied vol, June (126 days, contains April earnings) at 30%
const cal = [
  { kind: 'call', qty: -1, strike: 100, premium: bs.price({ S: 100, K: 100, T: 35 / 365, r: RATE, q: ACME.q, sigma: 0.26, type: 'call' }), dte: 35, iv: 0.26 },
  { kind: 'call', qty: 1, strike: 100, premium: bs.price({ S: 100, K: 100, T: 126 / 365, r: RATE, q: ACME.q, sigma: 0.30, type: 'call' }), dte: 126, iv: 0.30 },
];
const calG = payoff.positionGreeks(cal, 100, 0, env);
const strangleMar = bs.price({ S: 100, K: 95, T: 35 / 365, r: RATE, q: ACME.q, sigma: 0.26, type: 'put' }) + bs.price({ S: 100, K: 105, T: 35 / 365, r: RATE, q: ACME.q, sigma: 0.26, type: 'call' });
const strJun = bs.price({ S: 100, K: 100, T: 126 / 365, r: RATE, q: ACME.q, sigma: 0.30, type: 'call' }) + bs.price({ S: 100, K: 100, T: 126 / 365, r: RATE, q: ACME.q, sigma: 0.30, type: 'put' });
const strJunTheta = payoff.positionGreeks([
  { kind: 'call', qty: 1, strike: 100, premium: 0, dte: 126, iv: 0.30 },
  { kind: 'put', qty: 1, strike: 100, premium: 0, dte: 126, iv: 0.30 },
], 100, 0, env).theta;
```

This exercise follows one trader through ACME's earnings announcement on {{ longDate(earn) }} and the month after it. Prices in it are theoretical values at the implied volatilities given; real fills would be a little worse.

```scenario
setup: >-
  It is Monday, January 11, 2027. ACME is at $100 and reports earnings after the close on Tuesday, {{ longDate(earn) }}. The January 15 options have four days left, and their at-the-money implied volatility has risen to {{ pct(evIV(100), 0) }} for the event. The January 100 straddle costs about {{ usd(strad) }}: the market expects a move of about {{ pct(strad / 100, 1) }}. Over its last eight reports ACME moved 4% on average, and 9% at most. You have a $50,000 account, no view on the direction of the news, and a rule of risking no more than $1,000 on any one trade.
steps:
  - prompt: >-
      What do you trade in the January 15 expiration?
    choices:
      - text: >-
          Buy one January 100 straddle for about {{ usd(strad * 100) }}.
        grade: poor
        feedback: >-
          You would pay for a {{ pct(strad / 100, 1) }} move when ACME's typical reaction is 4%. A long straddle needs the move to beat the implied move and survive the volatility crush. By your own history, the odds are against it.
      - text: >-
          Sell two January 100 straddles for about {{ usd(strad * 200) }}.
        grade: poor
        feedback: >-
          The view is right (sell rich volatility), but the structure cannot respect your risk rule, because its loss has no limit. A repeat of ACME's largest 9% move costs about {{ usd(-payoff.pnlAtExpiry(ss, 109)) }}, just inside your limit; a surprise 15% gap costs {{ usd(-payoff.pnlAtExpiry(ss, 115)) }}, about double it. Earnings are exactly when gaps beyond history happen.
      - text: >-
          Sell two January 90/95/105/110 iron condors for about {{ usd(icCredit) }} each.
        grade: best
        feedback: >-
          This sells the rich event volatility with a defined risk: two condors can lose at most {{ usd(-2 * ics.maxLoss) }}, inside your rule. They profit if ACME finishes between {{ usd(ics.breakevens[0]) }} and {{ usd(ics.breakevens[1]) }}, a move of up to about {{ pct(ics.breakevens[1] / 100 - 1, 1) }}, which covers ACME's typical reaction with room to spare. The price of that room is a small credit.
      - text: >-
          Sell six January 95/100/105 iron butterflies for about {{ usd(-payoff.netPremium(ifly)) }} each.
        grade: acceptable
        feedback: >-
          It is defined-risk (six can lose at most {{ usd(-6 * ifs.maxLoss) }}) and collects far more, but it profits only between {{ usd(ifs.breakevens[0]) }} and {{ usd(ifs.breakevens[1]) }}. ACME's average 4% move would land outside that range. The butterfly sells the volatility more aggressively and needs a smaller move than history suggests.
  - prompt: >-
      You sold the two condors. ACME reports a mixed quarter and opens Wednesday at {{ usd(S2) }}, a {{ pct(S2 / 100 - 1, 1) }} move. Implied volatility has collapsed back to normal. With two days left, each condor shows a profit of about {{ usd(icNow) }} out of a possible {{ usd(icCredit) }}, and ACME sits {{ usd(105 - S2) }} below your short 105 call. What do you do?
    choices:
      - text: >-
          Buy back both condors now and take about {{ usd(2 * icNow) }}.
        grade: best
        feedback: >-
          The trade was a bet on the event, and the event is over. You have captured about {{ pct(icNow / icCredit, 0) }} of the maximum. The remaining {{ usd(2 * (icCredit - icNow)) }} would require ACME to stay below $105 for two more days, while the position's gamma is at its highest and the short strike is close. Taking most of the profit once the edge is gone is standard practice.
      - text: >-
          Hold to expiration to collect the last {{ usd(2 * (icCredit - icNow)) }}.
        grade: acceptable
        feedback: >-
          It often works, but you are now risking a loss of up to {{ usd(-2 * ics.maxLoss) }} to make {{ usd(2 * (icCredit - icNow)) }} more, with ACME close to a short strike and two days of large gamma ahead, plus pin risk at $105 on Friday. The volatility you sold has already collapsed; what is left is mostly gamma risk.
      - text: >-
          Close the condors and buy the January 100 straddle, since implied volatility is now cheap.
        grade: poor
        feedback: >-
          Implied volatility is back to normal, not cheap, and there is no catalyst left in the January expiration. A long straddle with two days left pays heavy theta for moves that no event is likely to bring. For comparison, the straddle you could have bought on Monday shows about {{ usd(post(ls, S2)) }} this morning after a {{ pct(S2 / 100 - 1, 1) }} move.
  - prompt: >-
      It is Friday, February 12. ACME is at $100. The March options (35 days) trade at 26% implied volatility, unusually low. The June options (126 days), which contain ACME's April earnings, trade at 30%. You expect ACME to be quiet for the next month, and implied volatility to rise as April earnings approach. Which structure fits?
    choices:
      - text: >-
          A March/June 100 call calendar: sell the March 100 call, buy the June 100 call, for about {{ usd(payoff.netPremium(cal)) }}.
        grade: best
        feedback: >-
          It matches both parts of the view. The calendar is short gamma near term (it wants a quiet month) and long vega (it gains if implied volatility rises): theta {{ signedUsd(calG.theta) }} a day, vega {{ signedUsd(calG.vega) }} per vol point at entry. Its risk is capped at roughly the debit. Plan to close it before the June option sits through April's earnings and its own volatility crush.
      - text: >-
          Sell the March 95/105 strangle for about {{ usd(strangleMar * 100) }}.
        grade: poor
        feedback: >-
          It fits the quiet-month half of the view but fights the other half: it is short vega, so a rise in implied volatility hurts it, and you would be selling volatility at an unusually low price. It also carries undefined risk in both directions.
      - text: >-
          Buy the June 100 straddle for about {{ usd(strJun * 100) }}.
        grade: acceptable
        feedback: >-
          It is long vega and would gain if implied volatility rises into April, but it also pays about {{ usd(-strJunTheta) }} a day in theta and needs movement, while you expect a quiet month. The calendar gets the vega exposure while being paid, rather than charged, for the quiet month.
wrap: >-
  Each decision started from volatility, not direction. Before earnings, implied volatility priced a bigger move than ACME usually makes, so the trade was to sell it, with a structure whose worst case fit the risk rule. After the announcement the edge was gone and only gamma risk remained, so the trade was to close. A month later, cheap near-term volatility and richer event volatility further out called for the one structure that is short gamma and long vega: the calendar.
```

```tool position-builder
{ title: 'January 90/95/105/110 iron condor before earnings', legs: ic, range: [85, 115] }
```
