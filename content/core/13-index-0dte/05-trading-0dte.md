---
title: Trading 0DTE options and sizing them
summary: Understand why traders use same-day index options, the specific ways they lose money, and how to size 0DTE positions by their maximum loss.
---

```calc
const T0 = 6.5 / 24 / 365;
const iv = (K, T) => smileIV(HBR, K, T);
const fair = (S, K, T, type) => bs.price({ S, K, T, r: RATE, q: HBR.q, sigma: iv(K, T), type });
const quote = (K, type) => {
  const p = fair(5000, K, T0, type);
  const half = Math.max(0.01, p * 0.02) + 0.2;
  const t = p < 3 ? 0.01 : 0.05;
  return { p, bid: Math.max(0, Math.floor((p - half) / t) * t), ask: Math.ceil((p + half) / t) * t, mid: p };
};
const c5000 = quote(5000, 'call');
const flat2 = fair(5000, 5000, 2 / 24 / 365, 'call');
const up2 = fair(5025, 5000, 2 / 24 / 365, 'call');
const buyLoss = (flat2 - c5000.ask) * 100;
const buyGain = (up2 - c5000.ask) * 100;
const p4975 = quote(4975, 'put');
const c5025 = quote(5025, 'call');
const p4950 = quote(4950, 'put');
const c5050 = quote(5050, 'call');
const strCredit = p4975.bid + c5025.bid;
const strLoss = ((4975 - 4925) - strCredit) * 100;
const strMultiple = strLoss / (strCredit * 100);
const icMid = p4975.mid - p4950.mid + c5025.mid - c5050.mid;
const icNat = p4975.bid - p4950.ask + c5025.bid - c5050.ask;
const icCredit = Number(icMid.toFixed(2));
const icMaxLoss = (25 - icCredit) * 100;
const loBE = 4975 - icCredit;
const hiBE = 5025 + icCredit;
const pLo = bs.probITM({ S: 5000, K: loBE, T: T0, r: RATE, q: HBR.q, sigma: iv(loBE, T0), type: 'put' });
const pHi = bs.probITM({ S: 5000, K: hiBE, T: T0, r: RATE, q: HBR.q, sigma: iv(hiBE, T0), type: 'call' });
const pWin = 1 - pLo - pHi;
const acct = 100000;
const budget = 0.01 * acct;
const miniLoss = icMaxLoss / 10;
const legs = [
  { kind: 'put', qty: 1, strike: 4950, premium: p4950.mid, dte: 1 },
  { kind: 'put', qty: -1, strike: 4975, premium: p4975.mid, dte: 1 },
  { kind: 'call', qty: -1, strike: 5025, premium: c5025.mid, dte: 1 },
  { kind: 'call', qty: 1, strike: 5050, premium: c5050.mid, dte: 1 },
];
```

Same-day index options grew from a curiosity into a large share of SPX volume, at times more than half of it, in just a few years. They are useful tools with a specific risk profile, and they are also the fastest way in the listed market to lose money through a series of small, reasonable-looking decisions. This Lesson covers both sides, and how to size a [[0DTE]] trade so that one bad day cannot do serious damage. All prices are HBR options at the open of their expiration day, with HBR at 5,000 and 6.5 hours to the close.

## Why traders use them

- **Exposure to one day.** A trader with a view on today's move, or on a scheduled event such as an inflation report or a central-bank announcement, can buy exactly one day of exposure, without paying for the days after.
- **Cheap convexity.** An at-the-money HBR call costs {{ num(c5000.ask) }} points at the ask, {{ usd(c5000.ask * 100) }}, for exposure to a {{ usd(HBR.spot * 100) }} notional. If the index moves sharply, the payoff is many times the premium.
- **Fast decay for sellers.** Theta is at its largest on the last day, so short premium earns its whole return within hours.
- **No overnight risk and clean settlement.** PM-settled, cash-settled, European index options end at the close. There is no assignment, no stock position and no after-hours surprise.
- **Hedging a specific day.** A portfolio manager worried about one event can buy same-day puts instead of paying for a month of protection.

## How they lose money

### Buyers: the clock

:::example Buying the at-the-money call at the open
You buy one HBR 5,000 call at {{ num(c5000.ask) }}. By 2:00 p.m., with two hours left:

- If HBR has not moved, the call is worth about {{ num(flat2) }}: a loss of {{ usd(-buyLoss) }}, {{ pct(-buyLoss / (c5000.ask * 100), 0) }} of what you paid, with nothing having happened.
- If HBR is up 25 points, the call is worth about {{ num(up2) }}: a gain of {{ usd(buyGain) }}.

The buyer wins big on a move and loses steadily on a quiet day. Most days are quieter than the moves that make memorable trades, so a buyer who trades every day pays the decay every day.
:::

### Sellers: the rare large day

:::example Selling a same-day strangle
You sell the 4,975 put at {{ num(p4975.bid) }} and the 5,025 call at {{ num(c5025.bid) }}, collecting {{ num(strCredit) }} points, {{ usd(strCredit * 100) }}. Both strikes are 25 points away, beyond the day's one-standard-deviation expected move, and on most days both expire worthless.

On a day when HBR falls 1.5% to 4,925, the put settles 50 points in the money. The loss is {{ usd(strLoss) }}, about {{ num(strMultiple, 0) }} times the credit. One such day erases {{ num(strMultiple, 0) }} quiet days of profit, and nothing in the payoff stops a 3% day from costing more than twice as much.
:::

Writers of naked same-day options are selling insurance against exactly the days that hurt most, and large index moves happen more often than a normal distribution would suggest. If you sell 0DTE premium at all, sell it as a defined-risk spread.

### Everyone: costs and spreads

Same-day options are cheap in points, but their bid-ask spreads are not proportionally smaller. Consider the iron condor: short the 4,975 put and 5,025 call, long the 4,950 put and 5,050 call as protection.

:::example The cost of a same-day iron condor
- Credit at the mid: {{ num(icMid) }} points.
- Credit at the natural price (selling at the bids, buying at the asks): {{ num(icNat) }} points.

Crossing all four spreads would give up {{ pct((icMid - icNat) / icMid, 0) }} of the credit before the trade starts. Even at the mid, the trade risks {{ usd(icMaxLoss) }} to make {{ usd(icCredit * 100) }}: it profits if HBR settles between {{ num(loBE) }} and {{ num(hiBE) }}, which the option prices imply happens about {{ pct(pWin, 0) }} of the time. A high win rate with a loss many times the typical gain is the signature of short premium; the prices are set so that, before costs, it roughly breaks even on average. Costs then decide the result.
:::

### Behaviour

Daily expirations make it possible to trade every day, and many traders do, several times a day. Gamma makes stop-losses slip, because the option can jump past the stop between checks. Losing days invite "making it back" before the close. Most 0DTE losses come from these habits rather than from any single trade.

## Sizing a same-day trade

Size every 0DTE trade by its maximum loss, not by its margin, its premium or its probability.

:::example Fitting the condor to an account
Suppose your trading plan caps the loss on any one day at 1% of a {{ usd(acct, 0) }} account: {{ usd(budget, 0) }}.

- One HBR iron condor can lose {{ usd(icMaxLoss) }}. That is more than the whole day's budget: **zero contracts fit**, however likely the trade is to win.
- A contract one tenth the size (as XSP is to SPX) would lose at most {{ usd(miniLoss) }}, so {{ int(Math.floor(budget / miniLoss)) }} of them fit.
- A naked strangle has no maximum loss to size against; it does not fit any budget.

If you trade several times a day, the budget is for the day, not for each trade.
:::

:::practice How experienced 0DTE traders keep it survivable
They trade only defined-risk structures, size each one so its maximum loss is a small fraction of the account, set a daily loss limit and stop trading for the day when it is hit, and avoid adding to a losing position near the close. Many trade 0DTE only on specific setups or events instead of every day. [Managing trades](#core-12) covers position sizing and loss limits in general.
:::

The position builder holds the iron condor at mid prices. The tool's shortest expiration is one day, so treat its "today" line as a rough guide; the payoff at expiration is exact.

```tool position-builder
{ title: 'HBR same-day iron condor 4,950/4,975/5,025/5,050', underlying: 'HBR', spot: 5000, legs: legs, range: [4875, 5125] }
```

:::key
0DTE options buy or sell one day of index exposure: cheap convexity for buyers, the fastest decay for sellers, and clean PM cash settlement. Buyers lose to the clock on quiet days; sellers lose rarely but heavily, many times the credit; everyone pays bid-ask spreads that are large relative to the premium. Size by maximum loss against a daily loss budget, trade defined-risk structures only, and if even one contract exceeds the budget, use a smaller product or do not trade.
:::

```quiz
- q: >-
    You buy the HBR 5,000 call at {{ num(c5000.ask) }} at the open. HBR is unchanged at 2:00 p.m. Roughly what has happened?
  choices:
    - >-
      Nothing; the index has not moved
    - >-
      You have lost about {{ pct(-buyLoss / (c5000.ask * 100), 0) }} of the premium to time decay
    - >-
      You have lost the whole premium
  answer: 1
  explain: >-
    With two hours left the call is worth about {{ num(flat2) }} points, so about {{ pct(-buyLoss / (c5000.ask * 100), 0) }} of the {{ num(c5000.ask) }} you paid has decayed with HBR unchanged. Same-day options decay by the hour. The whole premium is lost only if HBR is at or below 5,000 at the close.
- q: >-
    You sold a same-day 4,975/5,025 strangle for {{ num(strCredit) }} points. HBR settles at 4,925. What is your loss?
  choices:
    - >-
      {{ usd(strCredit * 100) }}
    - >-
      {{ usd(strLoss) }}
    - >-
      {{ usd(25 * 100) }}
  answer: 1
  explain: >-
    The short 4,975 put settles 50 points in the money, $5,000, offset by the {{ usd(strCredit * 100) }} credit: {{ usd(strLoss) }}. {{ usd(strCredit * 100) }} is what you collected, not what you lose. {{ usd(25 * 100) }} would be the most an iron condor with 25-point wings could lose, but a strangle has no long options to cap the loss.
- q: >-
    Your daily loss budget is {{ usd(budget, 0) }}. One same-day HBR iron condor has a maximum loss of {{ usd(icMaxLoss) }} and a probability of profit of about {{ pct(pWin, 0) }}. How many should you trade?
  choices:
    - >-
      None at full size; the maximum loss exceeds the budget
    - >-
      One, because it will probably win
    - >-
      As many as margin allows
  answer: 0
  explain: >-
    Size by maximum loss: {{ usd(icMaxLoss) }} is above the {{ usd(budget, 0) }} daily budget, so even one contract breaks the plan. A high probability of profit does not change what a losing day costs. Margin tells you what the broker allows, not what you can afford to lose. A one-tenth-size product would fit.
- q: >-
    An iron condor's credit is {{ num(icMid) }} at the mid and {{ num(icNat) }} at the natural price. Why does this matter more for 0DTE trades than for 30-day ones?
  choices:
    - >-
      Spreads are a large fraction of the small same-day premiums, so crossing them gives up a big share of the expected profit
    - >-
      Same-day options cannot be traded at the mid
    - >-
      Commissions are higher on same-day options
  answer: 0
  explain: >-
    Same-day premiums are small in points while bid-ask spreads stay roughly the same size, so crossing four spreads gives up {{ pct((icMid - icNat) / icMid, 0) }} of this condor's credit. Limit orders near the mid are possible and essential. Commissions are generally the same per contract regardless of expiration.
```
