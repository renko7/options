---
title: Options approval and account types
summary: Know what your broker's options approval levels allow, choose between a cash and a margin account, and see how the same trade needs very different collateral in each.
---

```calc
const q30 = chain(ACME, { dte: 30 });
const p95 = q30.rows.find((r) => r.strike === 95).put;
const prem = p95.bid;
const cashSecured = 95 * 100 - prem * 100;
const nakedReq = 100 * Math.max(prem + 0.20 * 100 - 5, prem + 0.10 * 95);
const legs = [{ kind: 'put', qty: -1, strike: 95, premium: prem, dte: 30, iv: p95.iv }];
const s = payoff.summary(legs);
```

Before you place your first option order, your broker has to decide what you are allowed to do, and you have to decide what kind of account to do it in. Both choices set hard limits. A Learner approved only for covered calls cannot buy a call; a Learner with a cash account cannot sell a naked put however much money is in it. This Lesson explains the approval process and the two main account types, and shows the same trade under each.

## Options approval

Opening a brokerage account does not let you trade options. You have to apply separately, and the broker approves you for a particular [[options approval level]] based on your answers.

:::rule Options account approval (as of 2026)
- FINRA Rule 2360 requires a broker to approve a customer's account for options trading before the first options order, after exercising due diligence on the customer's investment objectives, financial situation, trading experience and knowledge. The approval, and any limits on it, must be recorded in writing.
- Before or at approval, the broker must give you the OCC's disclosure document *Characteristics and Risks of Standardized Options*.
- The number of levels, what each allows, and what each requires are set by each broker; they are not standardized across the industry.
:::

Most brokers use four or five tiers, built roughly like this:

| Typical tier | Usually allows | Why it is grouped there |
|---|---|---|
| Lowest | Covered calls; often cash-secured puts | Risk no greater than owning the stock |
| Second | Buying calls and puts | Loss limited to the premium paid |
| Third | Spreads (vertical, calendar, iron condors and so on) | Defined risk, but needs a margin account at most brokers |
| Highest | Naked calls and puts; sometimes naked index options as a separate top tier | Large or unlimited risk |

Names and boundaries differ. Some brokers let cash-secured puts in at the lowest tier, others put them with spreads; some require higher equity, experience or income for each tier. You can ask for a higher level later, and the broker can lower yours.

The application questions (experience, income, net worth, liquid assets, objectives) are not a formality. They decide your level, and answering inaccurately to get a higher one removes protections the process is designed to give you. A broker that approves you for spreads is also telling you it believes you can understand the risks of spreads; if you cannot yet explain the max loss of a [[vertical spread]], wait.

## Cash accounts

In a cash account you pay for everything in full with your own money. For options that means:

- **Long calls and puts:** pay the full premium.
- **Covered calls:** own the shares, fully paid.
- **Cash-secured puts:** hold cash equal to the strike times 100 for each put, so you can always pay for the shares if assigned.
- **Spreads:** some brokers allow defined-risk spreads in cash accounts (including IRAs) if the maximum loss is fully held in cash; many do not.
- **Naked options:** never.

Cash accounts have settlement rules. Option trades settle on T+1, so proceeds from a sale today are settled tomorrow. Buying with unsettled proceeds and then selling before they settle can break the rules below.

:::rule Cash account settlement (as of 2026)
- Under the Federal Reserve's Regulation T, a customer in a cash account must pay for purchases in full. If a customer sells a security before paying for it (sometimes called freeriding), the broker must restrict the account for 90 days so that purchases need cash in the account up front.
- Many brokers also apply their own "good faith violation" policies to trades made with unsettled funds, with restrictions after repeated violations. The details are broker-specific.
- US stock and option trades settle on T+1.
:::

## Margin accounts

A [[margin account]] lets you borrow from your broker against the securities in the account, and, for options, lets you carry positions secured by a margin requirement rather than by the full cash amount at risk. You sign a margin agreement, which gives the broker the right to sell your positions without asking you if your equity falls below its requirements.

:::rule Margin account minimums (as of 2026)
- FINRA Rule 4210 requires at least $2,000 of equity to open a margin account and borrow, and brokers may set higher minimums. Many require far more for naked option writing.
- Brokers can and often do set "house" requirements above the regulatory minimums, and can raise them at any time, including for a single stock.
:::

Margin accounts are needed for most spreads and for any naked short option. The detailed requirements are in [the next Lesson](#core-08-option-margin).

[[Portfolio margin]] is a separate kind of margin account for experienced traders with large balances. Instead of a fixed formula for each position, the requirement is set by the worst loss across a range of price moves for the portfolio as a whole, which is often much lower for hedged positions and can be higher for concentrated ones. FINRA's minimum equity for a portfolio margin account is $100,000 where the broker monitors it in real time intraday, and brokers commonly require more, along with a higher options approval level.

:::example One ACME put, three ways to carry it
You want to sell one ACME December 95 put at {{ usd(prem) }}, collecting {{ usd(prem * 100) }}. You are willing to own 100 ACME shares at $95.

- **Cash account (cash-secured put):** you must hold $95 × 100 = $9,500 in cash. The premium counts toward it, so {{ usd(cashSecured) }} of your own cash is tied up until the put expires or you close it.
- **Margin account, approved for naked puts:** the regulatory minimum requirement is {{ usd(nakedReq) }} (the next Lesson shows the formula), and it moves every day with ACME and the put's price. Your broker may ask for more.
- **Margin account, approved only for spreads:** you cannot sell the put on its own. You could sell it as part of a put spread, with a requirement equal to the spread's width.

The economic risk is identical in the first two cases: the most you can lose is {{ usd(s.maxLoss * -1) }}, if ACME goes to zero and you are assigned. The difference is how much cash the broker makes you set aside against that risk. Using the lower margin requirement to sell five puts instead of one does not make each put safer; it multiplies the same risk by five.
:::

The position builder shows that short put. Move ACME down and notice that the loss at $80 or $70 is far larger than the {{ usd(nakedReq) }} margin requirement: margin is a deposit, not a cap on what you can lose.

```tool position-builder
{ title: 'Short one ACME December 95 put', legs: [{ kind: 'put', qty: -1, strike: 95, premium: prem, dte: 30, iv: p95.iv }], range: [60, 115] }
```

:::warning Margin is not a loss limit
The margin requirement on a naked option is the minimum your broker holds, not the most you can lose. If the position moves against you, the requirement rises, the broker asks for more money (a margin call), and if you cannot pay, it closes positions for you, at the worst moment, at whatever price the market offers.
:::

:::key
Your broker approves you for an options level (typically covered calls, then long options, then spreads, then naked options) under FINRA rules; the tiers are broker-specific. A cash account requires full payment and full collateral, so no naked options. A margin account carries positions against a requirement, needs at least $2,000 of equity, and lets the broker liquidate you if you fall short. A lower requirement never means lower risk.
:::

```quiz
- q: >-
    You are approved for the second typical tier (long calls and puts) in a margin account. Which order will your broker most likely reject?
  choices:
    - >-
      Buy one ACME December 105 call
    - >-
      Buy one ACME December 95 put
    - >-
      Sell one ACME December 100/105 call spread
  answer: 2
  explain: >-
    Spreads usually sit one tier higher than long options, because they involve a short leg, even though their risk is defined. Buying calls and puts is exactly what the second tier allows. Exact tiers are broker-specific, so check your broker's table, but spreads almost always need more than long-option approval.
- q: >-
    In a cash account you want to sell one ACME December 95 put for {{ usd(prem) }}. How much of your own cash will be tied up?
  choices:
    - >-
      {{ usd(nakedReq) }}
    - >-
      {{ usd(cashSecured) }}
    - >-
      {{ usd(prem * 100) }}
    - >-
      Nothing; the premium covers it
  answer: 1
  explain: >-
    A cash account requires the put to be fully cash-secured: $9,500, the cost of buying the shares if assigned. The {{ usd(prem * 100) }} premium counts toward it, leaving {{ usd(cashSecured) }} of your own cash. {{ usd(nakedReq) }} is the margin-account requirement for a naked put, which a cash account cannot use.
- q: >-
    A friend says a margin account makes selling puts safer because "the broker only needs {{ usd(nakedReq) }}". What is wrong with this?
  choices:
    - >-
      Nothing; the margin requirement is the maximum loss
    - >-
      The requirement is a minimum deposit, not a loss limit; the loss can reach {{ usd(s.maxLoss * -1) }} per put, and the requirement rises as the trade goes wrong
    - >-
      Margin accounts cannot sell puts
  answer: 1
  explain: >-
    The margin requirement is what the broker holds today. A put's loss is limited only by the stock going to zero: {{ usd(s.maxLoss * -1) }} here. As ACME falls, the requirement grows and the broker issues margin calls. The lower requirement lets you sell more puts with the same cash, which increases risk, not safety.
- q: >-
    In a cash account you sell an ACME call you held, then use the proceeds the same day to buy a different call, and sell that one before the first sale has settled. What might happen?
  choices:
    - >-
      Nothing; option trades settle instantly
    - >-
      Your broker may flag a violation and restrict the account
    - >-
      The second trade is automatically cancelled
  answer: 1
  explain: >-
    Option trades settle T+1, so the first sale's proceeds are not settled until the next business day. Selling a position bought with unsettled funds before those funds settle can be a good-faith violation under broker policy, and paying for a purchase with the proceeds of selling it is the kind of freeriding Regulation T punishes with a 90-day restriction. Trades are not cancelled; the account is restricted afterwards.
```
