---
title: Volume and open interest
summary: Tell volume from open interest, work out how any trade changes open interest, and use both to judge how liquid a contract is without over-reading them.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const c105 = row(105).call;
const vol = c105.volume;
const A = 400, B = 250;
const C = vol - A - B;
const oiEnd = c105.oi + A - C;
const sum = (side, key) => q.rows.reduce((a, r) => a + r[side][key], 0);
const callOI = sum('call', 'oi'), putOI = sum('put', 'oi');
const callVol = sum('call', 'volume'), putVol = sum('put', 'volume');
const atmOI = (dte) => chain(ACME, { dte }).rows.find((r) => r.strike === 100).call.oi;
const c130 = row(130).call;
```

Two columns on every chain look alike and are constantly confused: volume and open interest. Volume measures today's trading. Open interest measures how many contracts exist. Together they tell you how actively a contract is traded and how many people are already in it, which is most of what you need to know about its liquidity.

## Volume

[[Volume]] is the number of contracts that have traded in that option so far today. Every trade counts once, whoever bought and whoever sold: if you buy 10 contracts from a market maker, volume rises by 10. It resets to zero at the start of each trading day.

## Open interest

[[Open interest]] (OI) is the number of contracts in that option that are still open: bought to open by someone and not yet closed, exercised, assigned or expired. Each open contract has one holder and one writer, so open interest counts contracts, not people or sides.

Open interest is not updated during the day. The OCC calculates it overnight from the day's opening and closing trades, and the chain shows the figure as of the previous close until the next morning.

## How a trade changes open interest

Whether open interest changes depends on whether each side of a trade is **opening** or **closing** a position. Volume goes up by the trade size in every case.

| Buyer | Seller | Effect on open interest |
|---|---|---|
| buy to open | sell to open | rises by the trade size: a new contract is created |
| buy to open | sell to close | unchanged: an existing contract changes hands |
| buy to close | sell to open | unchanged: an existing short changes hands |
| buy to close | sell to close | falls by the trade size: a contract is extinguished |

Opening trades on both sides create contracts; closing trades on both sides destroy them; anything mixed just transfers an existing contract from one trader to another.

:::example A day in the December 105 call
At the start of the day the ACME December 105 call shows open interest of {{ int(c105.oi) }}. During the day {{ int(vol) }} contracts trade, in three groups:

- {{ int(A) }} contracts where both buyer and seller are opening: +{{ int(A) }} to open interest.
- {{ int(B) }} contracts where a new buyer opens and an existing holder sells to close: no change.
- {{ int(C) }} contracts where a writer buys to close from a holder selling to close: −{{ int(C) }}.

Volume for the day is {{ int(A) }} + {{ int(B) }} + {{ int(C) }} = **{{ int(vol) }}**. Tomorrow morning the chain shows open interest of {{ int(c105.oi) }} + {{ int(A) }} − {{ int(C) }} = **{{ int(oiEnd) }}**.

Nobody can see these three groups from the outside. All the chain shows is today's volume and, tomorrow, the new open interest.
:::

At expiration, every contract in the series is closed out one way or another: expired, exercised or assigned. Open interest in that series then drops to zero.

## What they tell you

**Liquidity.** High open interest means many traders hold the contract, so there will be buyers and sellers when you want to close. High volume means it is trading today. On the December ACME chain the at-the-money 100 call has open interest of {{ int(row(100).call.oi) }}; the 130 call has {{ int(c130.oi) }}. Open interest piles up near the money, at round-number strikes and in the standard monthly expirations, and that is where spreads are tightest.

Compare the 100 call's open interest across expirations: {{ int(atmOI(9)) }} for 9 days, {{ int(atmOI(30)) }} for the December monthly, {{ int(atmOI(394)) }} for the December 2027 LEAPS. Traders concentrate in particular expirations, not evenly across all of them.

**Fresh activity.** When today's volume is large relative to open interest, something new is happening in that contract. Some traders watch for it as "unusual options activity".

**Positioning, loosely.** Across the December expiration, calls have total open interest of {{ int(callOI) }} and puts {{ int(putOI) }}, a put-to-call ratio of {{ num(putOI / callOI) }}. Ratios like this are quoted as sentiment gauges, but they are crude: many puts are bought as insurance by people who own the stock and are not bearish at all.

:::warning Do not read direction into volume
Volume does not tell you whether the buyer or the seller started the trade, whether it opened or closed a position, or whether it was one leg of a larger spread or hedged with stock. A big print in a call can be a bullish buyer, a covered-call writer, or a fund closing a position it opened months ago. Treat "unusual activity" as a reason to look, never as a signal to copy.
:::

:::practice Minimums traders use
Many traders will not open a position in a contract with open interest below a few hundred contracts, or with spreads wider than a few percent of the mid, however attractive it looks. The exact thresholds depend on how big the trade is: a one-contract trade can live with thinner markets than a hundred-contract trade, which could be a large fraction of a contract's whole open interest.
:::

## Try it

In the chain below, compare the volume and open interest columns across strikes, then switch expirations. Notice how both cluster near the money, and how far out-of-the-money strikes have little of either.

```tool chain
{ underlying: 'ACME', dte: 30, view: 'quote', highlight: [{ strike: 100, type: 'call' }, { strike: 130, type: 'call' }] }
```

:::key
Volume is contracts traded today and resets daily; open interest is contracts outstanding and updates overnight. Open interest rises only when both sides open, falls only when both sides close, and is unchanged when a contract changes hands. High volume and open interest mean a liquid contract, but neither tells you which way anyone is betting.
:::

```quiz
- q: >-
    You buy to open 20 ACME December 100 calls. The seller is a market maker who already holds 50 of those calls and sells 20 of them to close. What happens to volume and open interest?
  choices:
    - >-
      Volume +20; open interest +20
    - >-
      Volume +20; open interest unchanged
    - >-
      Volume +40; open interest −20
  answer: 1
  explain: >-
    Volume counts each trade once, so it rises by 20. One side opened and the other closed, so 20 existing contracts simply moved from the market maker to you; open interest is unchanged. It would rise by 20 only if the seller had been selling to open. A trade is never counted twice in volume.
- q: >-
    An option shows open interest of 1,000 this morning. Today 600 contracts trade, and every one is a holder selling to close to a writer buying to close. What will open interest be tomorrow?
  choices:
    - >-
      {{ int(1000 + 600) }}
    - >-
      {{ int(1000) }}
    - >-
      {{ int(1000 - 600) }}
  answer: 2
  explain: >-
    When both sides close, the contract is extinguished, so open interest falls by the full 600, to {{ int(1000 - 600) }}. It stays at 1,000 only when contracts change hands with one side opening and the other closing. Volume of 600 does not add to open interest by itself.
- q: >-
    You see 9,000 contracts of volume in a call that had open interest of 500 yesterday. What can you conclude?
  choices:
    - >-
      Someone is very bullish on the stock
    - >-
      Unusual activity is happening in that contract, but you cannot tell from these numbers who initiated it, which way, or why
    - >-
      Open interest is now 9,500
  answer: 1
  explain: >-
    Volume far above open interest means much of today's trading must be opening trades, so something new is going on. But the buyer could be a speculator, the seller could be writing calls against stock, or the trade could be one leg of a spread. And you cannot know tomorrow's open interest until you know how much was opening on both sides; it will be somewhere up to 9,500, not necessarily that.
- q: >-
    You want to trade 50 contracts. Which ACME December call is the more sensible starting point if you care about getting in and out at fair prices?
  choices:
    - >-
      The 100 call, open interest {{ int(row(100).call.oi) }}, spread {{ usd(row(100).call.ask - row(100).call.bid) }}
    - >-
      The 130 call, open interest {{ int(c130.oi) }}, bid {{ usd(c130.bid) }}, ask {{ usd(c130.ask) }}
    - >-
      Either; open interest only matters for trades of hundreds of contracts
  answer: 0
  explain: >-
    The 100 call has deep open interest and a tight spread relative to its price, so 50 contracts will not move the market much. The 130 call has little open interest and no bid at all: you could buy 50, but you might find nobody to buy them back from you at any price. Fifty contracts is a meaningful share of a few hundred contracts of open interest, so liquidity matters well before you reach hundreds. Low price is not the same as good value.
```
