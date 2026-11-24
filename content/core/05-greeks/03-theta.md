---
title: Theta
summary: Read theta as the daily cost of holding an option, see how it accelerates into expiration, and handle the weekend question.
---

```calc
const row = (dte, K) => chain(ACME, { dte }).rows.find((x) => x.strike === K);
const dtes = [121, 58, 30, 9, 2];
const c100 = row(30, 100).call;
const p100 = row(30, 100).put;
const env = { r: RATE, q: ACME.q };
const legs = [{ kind: 'put', qty: -5, strike: 100, premium: p100.theo, dte: 30, iv: p100.iv }];
const pg = payoff.positionGreeks(legs, 100, 0, env);
const wk = payoff.pnlAt(legs, 100, 7, env);
const drop3 = payoff.pnlAt(legs, 97, 0, env);
const deepPut = bs.greeks({ S: 100, K: 160, T: 1, r: RATE, q: 0, sigma: 0.30, type: 'put' });
const thetaPct2 = -row(2, 100).call.theta / row(2, 100).call.theo;
const thetaPct121 = -row(121, 100).call.theta / row(121, 100).call.theo;
```

[[Theta]] is the change in an option's price when one day passes and nothing else changes: same stock price, same volatility, same rate. It is the Greek version of [[time decay]], which [Time value and decay](#core-04-time-value) introduced. Theta is negative for almost every option you own, because time value only shrinks, and positive for almost every option you have sold.

## Reading theta

This Course, like most brokers, quotes theta in dollars per share per **calendar day**. The ACME December 100 call, 30 days out, has a theta of {{ usd(c100.theta, 4) }}. If ACME and its volatility are unchanged tomorrow, the call should be worth about {{ usd(-c100.theta, 3) }} less: {{ usd(-c100.theta * 100) }} per contract. The December 100 put has a theta of {{ usd(p100.theta, 4) }}.

The two differ slightly because theta also contains carry. A call holder will pay the strike at expiration; as that payment gets closer its present value rises, so the call loses a little extra each day. A put holder will *receive* the strike, which works the other way and offsets part of the decay. Dividends push slightly in the opposite direction to rates. For short-dated options the carry part is small. For a deep in-the-money put it can win: a one-year 160-strike put on a stock with no dividend, with the stock at $100, has a *positive* theta of {{ usd(deepPut.theta, 4) }} as a European option, because the strike it will collect gets closer every day. (American puts that deep are usually exercised instead, see [Exercise, assignment and expiration](#core-07).)

:::example Selling five puts and waiting a week
You sell 5 ACME December 100 puts at {{ usd(p100.theo) }} each. Your position theta is the per-share theta times −5 contracts times 100: {{ signedUsd(pg.theta) }} a day. That is what you expect to earn per day if ACME and its volatility do not move.

A week later ACME is still at $100 and nothing else has changed. The puts have 23 days left and you are up {{ usd(wk) }}, a little more than 7 × {{ usd(pg.theta) }} = {{ usd(7 * pg.theta) }}, because theta grows each day as expiration gets closer.

The same position has a delta of {{ signed(pg.delta, 0) }} shares and a gamma of {{ num(pg.gamma, 1) }}. Theta is what you are paid for carrying that risk, not a separate gift.
:::

## Theta accelerates into expiration

Here are the at-the-money 100 call's price and theta at each expiration, from the chain:

| Days left | 100 call | Theta per day | Theta as % of price |
|---|---|---|---|
{{ dtes.map((d) => `| ${d} | ${usd(row(d, 100).call.theo)} | ${usd(row(d, 100).call.theta, 4)} | ${pct(-row(d, 100).call.theta / row(d, 100).call.theo, 1)} |`).join('\n') }}

The dollar decay per day rises steadily as expiration approaches, and the percentage rises much faster. With 121 days left the call loses {{ pct(thetaPct121, 1) }} of its value a day; with 2 days left it loses {{ pct(thetaPct2, 0) }} a day. This is the square-root-of-time curve from Module 4 measured one day at a time.

Away from the money the picture is different. Here is theta for an in-the-money, an at-the-money and an out-of-the-money call:

| Days left | 90 call | 100 call | 110 call |
|---|---|---|---|
{{ dtes.map((d) => `| ${d} | ${usd(row(d, 90).call.theta, 4)} | ${usd(row(d, 100).call.theta, 4)} | ${usd(row(d, 110).call.theta, 4)} |`).join('\n') }}

The at-the-money option's theta keeps climbing to the end. The in-the-money and out-of-the-money options' thetas peak and then *shrink*, because in the last days they have little time value left to lose: the 110 call is nearly worthless and the 90 call is nearly pure intrinsic value. So "theta accelerates near expiration" is true at the money and false away from it. The further an option is from the money, the earlier its theta peaks: weeks or even months before expiration.

```tool greeks-explorer
{ greek: 'theta', type: 'call', K: 100, iv: 0.30, x: 'dte' }
```

## The weekend question

A Black-Scholes model counting calendar days says a Friday-to-Monday weekend costs three days of theta. But the market is closed for two of them, and the stock cannot move while it is closed. Does an option seller really collect three days of decay over a weekend?

Mostly, no, at least not for free. Traders know the weekend is coming, and option prices adjust ahead of it. In practice:

- Many professional models measure time in **trading days**, or give weekend days and holidays a small weight, so the decay is spread across the trading days instead of landing on Monday.
- Market makers lower their quoted volatility through Friday, which lowers prices the same way time decay would. By Friday's close, most of the weekend's decay is already in the price.

So selling an option at Friday's close and buying it back on Monday's open does not, on average, capture three days of theta, and it leaves you exposed to weekend news with the market shut. The theta on your screen is a useful measure of daily cost. Expect the decay to show up spread across the week, not on a calendar.

:::practice How professionals use theta
Traders look at the theta of their whole book each morning: it is the cost (or income) of standing still for a day. They never look at it alone. A large positive theta always comes with negative gamma, because both come from having sold options. Knowing how much you collect per day only matters next to knowing how big a move would wipe it out, which is the gamma–theta trade-off in [Estimating P&L with the Greeks](#core-05-greek-pnl).
:::

:::warning Theta is not income
A short option position with positive theta "earns" that amount only on days when nothing else happens. One ordinary move can cost a week of theta. The five short puts above collect {{ usd(pg.theta) }} a day; a sudden $3 drop in ACME would cost {{ usd(-drop3) }}, about {{ num(-drop3 / pg.theta, 0) }} days of theta.
:::

:::key
Theta is the change in an option's price per calendar day with everything else fixed: negative for long options, positive for short ones. At-the-money theta grows steadily into expiration and as a share of price it explodes; away-from-the-money theta peaks earlier, the earlier the further from the money. Weekend decay is mostly priced in before Monday, so it is not a free three days.
:::

```quiz
- q: >-
    You own 3 ACME December 100 calls with a theta of {{ usd(c100.theta, 4) }}. If nothing else changes, how much do they lose overnight?
  choices:
    - >-
      {{ usd(-c100.theta, 3) }}
    - >-
      {{ usd(-c100.theta * 300) }}
    - >-
      {{ usd(-c100.theta * 3) }}
  answer: 1
  explain: >-
    Theta is per share per day. Three contracts cover 300 shares, so the loss is {{ usd(-c100.theta, 4) }} × 300 = {{ usd(-c100.theta * 300) }}. The other answers forget the contract multiplier (and, in the first case, the number of contracts).
- q: >-
    Which ACME call loses the largest *percentage* of its value per day?
  choices:
    - >-
      The 121-day 100 call
    - >-
      The 30-day 100 call
    - >-
      The 2-day 100 call
  answer: 2
  explain: >-
    At the money, theta as a share of price rises sharply into expiration: about {{ pct(thetaPct2, 0) }} a day at 2 days against {{ pct(thetaPct121, 1) }} at 121 days. The 121-day call has the largest price, and its theta in dollars is not tiny, which makes it tempting, but it gives up only a small slice of that price each day.
- q: >-
    With 2 days left, ACME at $100, which option has the smallest theta in dollars?
  choices:
    - >-
      The 100 call
    - >-
      The 110 call
    - >-
      They are about the same, because theta accelerates for every option near expiration
  answer: 1
  explain: >-
    The 110 call has almost no value left to lose, so its theta is practically zero, while the 100 call's is {{ usd(row(2, 100).call.theta, 4) }}. Acceleration into expiration is an at-the-money effect; out-of-the-money options do most of their decaying earlier.
- q: >-
    It is Friday afternoon. You plan to sell an at-the-money ACME option at the close and buy it back Monday morning to "collect three days of theta." What is the main flaw?
  choices:
    - >-
      Theta does not apply to weekends at all
    - >-
      Prices already reflect most of the weekend's decay by Friday's close, and you carry weekend news risk with the market closed
    - >-
      Theta is only paid on expiration day
  answer: 1
  explain: >-
    Market makers anticipate the weekend by lowering their volatilities through Friday or by counting time in trading days, so Friday's closing price already includes most of the decay. What is left is not free: a short at-the-money option over a weekend is short gamma, with no chance to adjust until Monday. Time does pass over a weekend, so "does not apply" goes too far.
```
