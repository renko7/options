---
title: How exercise and settlement work
summary: Follow an exercise from your instruction to the shares or cash landing in your account, and know which deadlines and settlement rules apply along the way.
---

```calc
const exp = expiryDate(30);
const q30 = chain(ACME, { dte: 30 });
const r95 = q30.rows.find((r) => r.strike === 95);
const c95 = r95.call;
const strikeCash = 95 * 100;
const nextDay = longDate(expiryDate(1));
const hbrSettle = 4962.4;
const hbrPut = (5000 - hbrSettle) * 100;
const hbrCall = Math.max(hbrSettle - 4950, 0) * 100;
```

Most options are closed in the market, never exercised. But every option you hold carries the right to exercise, and every option you write carries the matching obligation, so you need to know exactly what happens when that right is used: who does what, by when, and what ends up in your account. This Lesson walks through the machinery. The next Lesson covers the harder question of *when* exercising makes sense.

## Two exercise styles

An [[American-style option]] can be exercised on any business day from the day you buy it up to and including its expiration date. Every US-listed option on a single stock or an ETF is American-style, so every ACME option is.

A [[European-style option]] can be exercised only at expiration. Most cash-settled index options, including SPX and the Fictional Index HBR, are European.

The difference matters mostly to the [[writer]]. If you are short an American option, you can be assigned on any business day, with no warning. If you are short a European option, nothing can happen until expiration. For the [[holder]], the extra right in an American option is rarely worth using early; the next Lesson shows why.

## What exercise delivers: physical or cash

ACME options use [[physical settlement]]: exercising a call buys 100 real shares at the [[strike price]]; exercising a put sells 100 real shares at the strike. Stock moves between accounts.

Index options use [[cash settlement]]: there are no index "shares" to deliver, so exercise pays the holder the option's intrinsic value in cash, calculated from an official [[settlement value]] of the index, and the contract ends.

:::example Exercising an ACME call
You hold one ACME December 95 call. ACME is at $100 and you decide to exercise today, {{ longDate(TODAY) }}.

- You pay the strike for 100 shares: $95 × 100 = **{{ usd(strikeCash) }}**. This cash must be in your account (or available on margin) when the exercise settles. The premium you paid for the call is not refunded or credited against it.
- You receive 100 ACME shares. Your call is gone.
- The exercise settles on the next business day, {{ nextDay }}. From then on you simply own stock, with every risk of owning stock.

At $100, those shares are worth $10,000, so you have converted an option into stock worth $500 more than you paid at the strike. Whether that was smart depends on what the call itself would have sold for: the December 95 call is bid at {{ usd(c95.bid) }}, more than the $5.00 you captured by exercising. Lesson two returns to this.
:::

:::example Cash settlement of an HBR option
You hold one HBR December 5,000 put. At expiration the official settlement value of the index is 4,962.40.

The put is 5,000 − 4,962.40 = 37.6 points in the money. With the $100 [[index multiplier]], you receive **{{ usd(hbrPut) }}** in cash, and the assigned writer pays it. No shares change hands and you hold nothing afterwards.

On the same settlement value, a December 4,950 call is 12.4 points in the money and pays its holder {{ usd(hbrCall) }}. A December 5,000 call finished out of the money and simply expires; its holder receives nothing.
:::

Physical settlement can leave you with a large stock position you did not plan for; cash settlement cannot. That is one reason index traders like cash settlement. It is covered in depth in [Index options and 0DTE](#core-13).

## The path of an exercise, step by step

Behind a single click there is a chain of firms and deadlines. Here is what happens when you exercise an ACME call early, on a normal business day.

1. **You instruct your broker.** Most brokers let you exercise from the position screen; some require a phone call. The broker has its own cut-off time for accepting instructions, which is earlier than the industry deadline so it has time to process them.
2. **Your broker's clearing firm tells the OCC.** The [[Options Clearing Corporation]] is the counterparty to every listed option. It receives exercise notices from clearing firms up to its own deadline that evening.
3. **The OCC assigns the exercise.** Overnight, the OCC picks, at random, one or more clearing firms whose customer or firm accounts are short that exact series (ACME December 95 calls) and hands them an [[assignment]].
4. **The clearing firm allocates it to a customer.** Each firm assigns its notices to individual short accounts, either at random or first-in-first-out, using a method it has to disclose to you. The writer usually learns about it from the broker before the next morning's open.
5. **The stock settles.** The exercise creates a stock trade at the strike price, which settles one business day later through the clearing system, like any other stock purchase.

For a cash-settled index option the path is the same except that step 5 moves cash, not shares.

:::rule Exercise deadlines and settlement (as of 2026)
- Under FINRA Rule 2360, the final deadline for a holder to decide whether to exercise an *expiring* equity option is 5:30 p.m. Eastern Time on expiration day. Brokers may set an earlier cut-off for their customers, and many do, but may not accept instructions after the deadline. When the exchanges close early (for example 1:00 p.m. ET on the day after Thanksgiving), the deadline moves to 90 minutes after the announced close.
- On days before expiration, exercising an American option early depends on your broker's cut-off for that day; ask your broker what it is.
- US stock trades, including the stock trades created by exercise and assignment, settle on T+1 (one business day after the trade date) since May 28, 2024.
- Brokers set their own fees for exercise and assignment; some charge nothing, some charge a flat fee per event. Check your broker's fee schedule.
:::

## What you need before you exercise

Exercising a call means buying stock. If you hold five ACME December 95 calls and exercise them all, you are buying 500 shares for {{ usd(strikeCash * 5) }}. In a cash account you need that cash; in a [[margin account]] you need enough equity to meet the margin requirement on 500 shares (see [Accounts and orders](#core-08)). Exercising a put means selling stock: if you do not own the shares, you end up short them, which needs a margin account and carries its own requirement.

Brokers check this. If you try to exercise without the funds, the broker may reject the instruction. At expiration, when exercise can happen automatically, the broker may sell your in-the-money options before the close rather than let them turn into stock you cannot pay for. Lesson four covers that case.

:::warning The premium is gone either way
New option traders sometimes think exercising "recovers" the premium. It does not. The premium was paid when you bought the option. When you exercise the December 95 call, your total cost for the shares is the $95 strike *plus* whatever you paid for the call. Judge an exercise only by what you get now (stock at $95) against what you give up now (the call's market value).
:::

## Who can be assigned, and when

Because ACME options are American, a writer can be assigned on any business day, not only at expiration. In practice early assignment is uncommon, because exercising early is usually a mistake for the holder. But it is never impossible, and it concentrates around two situations covered in this Module: in-the-money calls just before an [[ex-dividend date]], and deep in-the-money puts. Writers of European options, such as HBR, face assignment only at expiration.

The pricer below shows how much of an option's price is intrinsic value, which exercise captures, and how much is extrinsic value, which exercise throws away. Start with the December 95 call, then drag the stock price up and watch the extrinsic part shrink.

```tool pricer
{ S: 100, K: 95, dte: 30, iv: c95.iv, type: 'call' }
```

:::key
Exercise turns an option into its deliverable: 100 shares at the strike for ACME (physical settlement, T+1), or the in-the-money amount in cash for an index such as HBR (cash settlement). Instructions go from you to your broker to the OCC, which assigns at random to clearing firms, which allocate to their short customers. American options can be exercised and assigned on any business day; European options only at expiration.
:::

```quiz
- q: >-
    You exercise three ACME December 95 calls. What happens in your account?
  choices:
    - >-
      You receive 300 shares and pay {{ usd(strikeCash * 3) }}, settling one business day later
    - >-
      You receive 300 shares and pay {{ usd(strikeCash * 3) }} minus the premium you paid
    - >-
      You receive the in-the-money amount in cash
    - >-
      You receive 100 shares, because exercise is per position, not per contract
  answer: 0
  explain: >-
    Each contract delivers 100 shares at the $95 strike, so three contracts buy 300 shares for $95 × 300 = {{ usd(strikeCash * 3) }}, and the stock trade settles T+1. The premium is not credited back: it was the price of the right and is already spent. Cash settlement applies to index options such as HBR, not to stock options.
- q: >-
    HBR settles at 5,041.25 at expiration. You hold one HBR 5,000 call. What do you receive?
  choices:
    - >-
      100 HBR shares at 5,000
    - >-
      {{ usd((5041.25 - 5000) * 100) }} in cash
    - >-
      {{ usd(41.25) }} in cash
    - >-
      Nothing, because European options cannot be exercised
  answer: 1
  explain: >-
    HBR is cash-settled with a $100 multiplier: (5,041.25 − 5,000) × $100 = {{ usd((5041.25 - 5000) * 100) }}. There is nothing to deliver, so no shares change hands. {{ usd(41.25) }} forgets the multiplier. European style means exercise happens only at expiration, which is exactly when this payment is made.
- q: >-
    You are short one ACME December 95 call. On a Tuesday in early December, with ACME at $103, a holder exercises. When do you normally find out?
  choices:
    - >-
      Only at expiration, because assignments are batched
    - >-
      Immediately, while the market is open
    - >-
      From your broker, usually before the next morning's open
    - >-
      Never; the OCC delivers the shares for you
  answer: 2
  explain: >-
    The OCC processes exercises overnight and assigns them at random to clearing firms, which allocate them to customers. Brokers normally notify assigned writers before the next open. Assignments are not held until expiration on American options; that is exactly the early-assignment risk a writer carries. The OCC guarantees the trade but your account still has to deliver the shares.
- q: >-
    On a normal expiration Friday your broker's exercise cut-off is 4:30 p.m. ET. A friend says you have until 5:30 p.m. ET. Who is right for you?
  choices:
    - >-
      Your friend, because FINRA's deadline is 5:30 p.m. ET
    - >-
      Your broker, because a broker may set an earlier cut-off than the industry deadline
    - >-
      Neither; exercise decisions must be made before the 4:00 p.m. close
  answer: 1
  explain: >-
    5:30 p.m. ET is the latest any broker may accept a final exercise decision on an expiring equity option, but brokers may (and often do) set earlier cut-offs for their own customers. Your broker's time is the one that binds you. Decisions are not limited to the 4:00 p.m. close: the window after the close is what lets holders react to after-hours news.
```
