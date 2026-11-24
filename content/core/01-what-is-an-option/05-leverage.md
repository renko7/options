---
title: Leverage versus owning the stock
summary: Compare the dollars at risk and the percentage returns of a call with those of the shares in up, flat and down markets, and size an option position so that losing all of it is survivable.
---

```calc
const q = chain(ACME, { dte: 30 });
const row = (k) => q.rows.find((r) => r.strike === k);
const prem = row(100).call.ask;
const cost = prem * 100;
const stockCost = 100 * 100;
const callLegs = [{ kind: 'call', qty: 1, strike: 100, premium: prem }];
const stockLegs = [{ kind: 'stock', qty: 100, price: 100 }];
const ends = [120, 110, 105, 100, 95, 90, 80];
const tbl = ends.map((s) => {
  const sp = payoff.pnlAtExpiry(stockLegs, s), cp = payoff.pnlAtExpiry(callLegs, s);
  return `| $${s} | ${signedUsd(sp, 0)} | ${pct(sp / stockCost)} | ${signedUsd(cp, 0)} | ${pct(cp / cost)} |`;
}).join('\n');
const be = payoff.breakevens(callLegs)[0];
const n = Math.floor(stockCost / cost);
const bigLegs = [{ kind: 'call', qty: n, strike: 100, premium: prem }];
const cashLeft = stockCost - cost;
const delta = Number(row(100).call.delta.toFixed(2));
```

Options are often sold to new traders as "leverage": control 100 shares for a fraction of the price. That is true, and it is also the most common way people lose money with them. This Lesson puts the two approaches side by side with real numbers so you can see exactly what you gain and what you give up.

## Same view, two trades

You think ACME, now $100, will rise over the next month. You can buy the shares or buy a call.

- **100 shares** cost {{ usd(stockCost) }}.
- **One December 100 call**, offered at {{ usd(prem) }}, costs {{ usd(cost) }} and moves with the same 100 shares.

The call costs {{ pct(cost / stockCost) }} of the stock position. That ratio is the leverage: every dollar of call premium gives you the upside of about {{ num(stockCost / cost, 0) }} dollars of stock.

:::example Outcomes at December expiration
Here is the profit or loss of each position at expiration, in dollars and as a percentage of the money put in.

| ACME at expiration | 100 shares P&L | Return | One 100 call P&L | Return |
|---|---|---|---|---|
{{ tbl }}

Read the three regions:

- **Up.** At $110 the shares make 10% and the call makes {{ pct(payoff.pnlAtExpiry(callLegs, 110) / cost, 0) }}. The call earns fewer dollars ({{ usd(payoff.pnlAtExpiry(callLegs, 110)) }} against {{ usd(1000) }}) because its premium has to be paid back first, but on far less money.
- **Flat.** At $100 the shares make nothing and lose nothing. The call loses **everything**: {{ usd(cost) }}, or 100%. The stock did not go against you; it just did not go up fast enough.
- **Down.** At $90 the shares lose {{ usd(1000) }} and the call loses {{ usd(cost) }}. At $80 the shares lose {{ usd(2000) }}, while the call still loses only {{ usd(cost) }}. In dollars, the call's downside is capped. In percent, it is total.
:::

The call breaks even at {{ usd(be) }}, the strike plus the premium. ACME has to rise {{ pct((be - 100) / 100) }} in a month just for you to get your money back. The shares break even at $100 and have no deadline.

## Percent and dollars tell different stories

Both of the following statements are true, and you need to keep both in mind:

1. **In dollars, the call risks less.** The most you can lose is {{ usd(cost) }}. The shares can lose thousands in a crash.
2. **In percent, the call is far riskier.** A plain lack of movement costs you 100% of what you paid. A stock almost never goes to zero in a month; an at-the-money option does so routinely.

Which statement matters depends entirely on **how much money you put into options**. That is the part beginners get wrong.

:::example Spending the same $10,000 on calls
A trader who would have bought 100 shares decides instead to put the whole {{ usd(stockCost) }} into December 100 calls: {{ int(n) }} contracts at {{ usd(prem) }}, or {{ usd(n * cost) }}.

- At $110 at expiration, the position makes {{ usd(payoff.pnlAtExpiry(bigLegs, 110)) }}, against {{ usd(1000) }} for the shares.
- At $100, flat, it loses **{{ usd(-payoff.pnlAtExpiry(bigLegs, 100)) }}**, the entire stake, where the shares lost nothing.
- At $103, a gain that would have made the stockholder {{ usd(300) }}, the calls still lose {{ usd(-payoff.pnlAtExpiry(bigLegs, 103)) }}.

Compare a second trader who buys **one** call and leaves the other {{ usd(cashLeft) }} in cash. Their worst case is losing {{ usd(cost) }}, {{ pct(cost / stockCost) }} of the money. Above $100 their call gains dollar for dollar with the shares, so they give up only the {{ usd(cost) }} premium relative to the stockholder.
:::

These are the same option. The difference is the size. Options do not have to increase your risk; they let you choose a risk profile. Buying the number of contracts that matches the shares you would otherwise have bought, and holding the rest in cash, usually *reduces* your worst case. Spending the same dollars on options multiplies your exposure many times over and makes a total loss of the stake a likely outcome.

:::warning Count shares, not dollars
Before buying calls, ask how many shares' worth of exposure you want and buy that many contracts (one per 100 shares). If the premium you are about to pay would hurt to lose in full, the position is too large; losing it in full is a normal outcome, not a disaster scenario.
:::

## Leverage before expiration

The table above is at expiration. Before then, the call's price responds to the stock immediately, but by less than a dollar for each dollar the stock moves. The chain shows the December 100 call's delta as {{ num(delta) }}, meaning a $1 rise in ACME adds roughly {{ usd(delta) }} a share, {{ usd(delta * 100) }} per contract. On a {{ usd(prem) }} option that is a {{ pct(delta / prem) }} gain for a 1% move in the stock. The same $1 move is a 1% gain on the shares. [The Greeks in practice](#core-05) works through this properly; the point here is that the percentage swings in an option are many times those of the stock, in both directions, every day you hold it.

Leverage also works against you through time. The shares cost nothing to hold (and pay you ACME's dividend). The call loses extrinsic value every day, as the previous Lesson showed. A stockholder can wait a year for a thesis to work. An option holder is paying for each day of waiting.

:::rule Paying for options (as of 2026)
Under the Federal Reserve's Regulation T and FINRA's margin rule, options that expire in nine months or less must be paid for in full; they have no loan value in a margin account. Listed options with more than nine months to run can be bought partly on margin, with an initial requirement of 75% of their cost, so at most a quarter can be borrowed. Brokers may set stricter requirements of their own, and the loan value disappears once nine months remain. Being approved to buy options at all requires options approval from your broker, covered in [Accounts and orders](#core-08).
:::

Use the builder below to compare. It starts with one December 100 call. Add a stock leg of 100 shares bought at $100 (or swap the call out for it) and compare the two lines: the stock is a straight diagonal through $100; the call is flat below $100, at a loss equal to its premium, and climbs parallel to the stock above it.

```tool position-builder
{ title: 'One ACME December 100 call', legs: [{ kind: 'call', qty: 1, strike: 100, premium: prem, dte: 30, iv: row(100).call.iv }], range: [80, 120] }
```

:::key
A call gives the upside of 100 shares for a small fraction of their cost, and caps your dollar loss at the premium. But it must beat the break-even before a deadline, and if it does not, you lose 100% of what you paid. Size options by the number of shares you want exposure to, not by the dollars you would have spent on stock.
:::

```quiz
- q: >-
    You buy one ACME December 100 call at {{ usd(prem) }}. ACME is at $105 at expiration. What is your percentage return on the premium?
  choices:
    - >-
      {{ pct(0.05) }}
    - >-
      {{ pct(payoff.pnlAtExpiry(callLegs, 105) / cost) }}
    - >-
      {{ pct(500 / cost) }}
  answer: 1
  explain: >-
    The call is worth $5 a share at expiration, so you make $5 − {{ usd(prem) }} = {{ usd(5 - prem) }} a share, {{ usd(payoff.pnlAtExpiry(callLegs, 105)) }} per contract, on {{ usd(cost) }} paid: {{ pct(payoff.pnlAtExpiry(callLegs, 105) / cost) }}. {{ pct(500 / cost) }} forgets to subtract the premium you paid. 5% is the stock's return, not the option's.
- q: >-
    ACME is still at $100 when the December options expire. What happened to the 100-share holder and to the call holder?
  choices:
    - >-
      Both broke even
    - >-
      The shareholder broke even; the call holder lost 100% of the premium
    - >-
      Both lost the call premium
  answer: 1
  explain: >-
    The shares are worth what was paid for them. The 100 call is at the money at expiration, so it has no intrinsic value and expires worthless: the call holder loses all {{ usd(cost) }}. This is the key asymmetry: an option can lose everything without the stock moving against you at all.
- q: >-
    You would normally buy 200 shares of ACME. Which options position gives you about the same upside exposure with a smaller worst-case loss?
  choices:
    - >-
      Two December 100 calls, keeping the rest of the money in cash
    - >-
      {{ int(Math.floor(20000 / cost)) }} December 100 calls, using all {{ usd(20000) }}
    - >-
      One December 100 call
  answer: 0
  explain: >-
    Two calls control 200 shares, matching the exposure you wanted, and cost {{ usd(2 * cost) }}, which is the most you can lose. Spending all {{ usd(20000) }} on calls buys exposure to {{ int(Math.floor(20000 / cost) * 100) }} shares and puts {{ usd(Math.floor(20000 / cost) * cost) }} at risk of a total loss if ACME just sits still. One call gives only half the exposure you wanted.
- q: >-
    ACME rises $1 the day after you buy the December 100 call. Roughly what happens to the call's price, and why?
  choices:
    - >-
      It rises about $1.00, like the stock
    - >-
      It rises about {{ usd(delta) }}, a gain of roughly {{ pct(delta / prem, 0) }} on the premium
    - >-
      Nothing until expiration
  answer: 1
  explain: >-
    Before expiration an at-the-money call moves by about its delta, here {{ num(delta) }}, for each $1 in the stock. That is less than a dollar, but on a {{ usd(prem) }} option it is roughly a {{ pct(delta / prem, 0) }} gain, against 1% on the shares. The option is not frozen until expiration; it reprices every second the market is open.
```
