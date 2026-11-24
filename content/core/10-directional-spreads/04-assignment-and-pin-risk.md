---
title: Early assignment and pin risk on spreads
summary: Know what happens when a spread's short leg is assigned early or when expiration leaves one leg in the money, and how to avoid both.
---

```calc
const env = { r: RATE, q: ACME.q };
const dec = chain(ACME, { dte: 30 });
const R = (k) => dec.rows.find((r) => r.strike === k);
const fillD = (m) => Math.ceil((m + 0.02) * 20 - 1e-9) / 20;
const fillC = (m) => Math.floor((m - 0.02) * 20 + 1e-9) / 20;
// A. bull put 95/100, ACME falls to 88 with 10 days left
const p100 = R(100).put, p95 = R(95).put;
const bupFill = fillC(p100.mid - p95.mid);
const bup = [
  { kind: 'put', qty: -1, strike: 100, premium: bupFill + p95.mid, dte: 30, iv: p100.iv },
  { kind: 'put', qty: 1, strike: 95, premium: p95.mid, dte: 30, iv: p95.iv },
];
const bups = payoff.summary(bup);
const a = { S: 88, left: 10 };
const ivA = smileIV(ACME, 100, a.left / 365);
const euro = bs.price({ S: a.S, K: 100, T: a.left / 365, r: RATE, q: ACME.q, sigma: ivA, type: 'put' });
const amer = binomial.price({ S: a.S, K: 100, T: a.left / 365, r: RATE, q: ACME.q, sigma: ivA, type: 'put', american: true, steps: 500 }).price;
const interest = 10000 * (Math.exp(RATE * a.left / 365) - 1);
// after assignment: long 100 shares at 100, still long the 95 put, credit kept
const afterA = [
  { kind: 'stock', qty: 100, price: 100 },
  { kind: 'put', qty: 1, strike: 95, premium: p95.mid, dte: 30, iv: p95.iv },
];
const creditA = (bupFill + p95.mid) * 100; // premium received on the short put
// B. bear call 100/105 before an ex-dividend date
const c100 = R(100).call, c105 = R(105).call;
const becFill = fillC(c100.mid - c105.mid);
const b = { S: 108, left: 9 };
const ivB = smileIV(ACME, 100, b.left / 365);
const cB = bs.price({ S: b.S, K: 100, T: b.left / 365, r: RATE, q: ACME.q, sigma: ivB, type: 'call' });
const tvB = cB - (b.S - 100);
// C. bull call 100/105 at expiration
const bcFill = fillD(c100.mid - c105.mid);
const bc = [
  { kind: 'call', qty: 1, strike: 100, premium: bcFill + c105.mid, dte: 30, iv: c100.iv },
  { kind: 'call', qty: -1, strike: 105, premium: c105.mid, dte: 30, iv: c105.iv },
];
const bcs = payoff.summary(bc);
const pinClose = 105.05, monday = 101;
const unassigned = (monday - 100) * 100 - bcFill * 100;
```

A vertical spread is defined-risk on paper: the long leg covers the short leg. But the two legs are separate contracts. The short leg can be assigned while the long one is still open, and at expiration one leg can end up exercised while the other is not. Neither changes the spread's theoretical max loss much, but both can leave you with a stock position you did not plan for, a margin call, or a weekend of unhedged risk. This Lesson covers the three situations that cause most of the trouble. The mechanics of exercise and assignment are in [Exercise, assignment and expiration](#core-07).

## 1. A deep in-the-money short put

:::example Assigned on a bull put spread
You sold the December 95/100 bull put spread for {{ usd(bupFill) }} (max loss {{ usd(-bups.maxLoss) }}). ACME falls to ${{ int(a.S) }} with {{ int(a.left) }} days left. Your short 100 put is $12 in the money.

A European-style 100 put would be worth only {{ usd(euro, 3) }} here, *less* than its $12 of intrinsic value, because its owner must wait {{ int(a.left) }} days to receive $100 a share. The American-style put is worth exactly {{ usd(amer, 3) }}, its intrinsic value: its owner does better to exercise now, sell the shares at $100 and earn interest on the $10,000, about {{ usd(interest) }} over {{ int(a.left) }} days. So you may well be assigned.

If you are, you buy 100 ACME at $100, paying $10,000, and you still hold the long 95 put. Stock plus a long put is a [protective put](#core-09-protective-put), so your risk is still capped: counting the credit you kept, at expiration below $95 you lose {{ usd(-(payoff.pnlAtExpiry(afterA, 90) + creditA)) }}, exactly the spread's max loss. What changed is the cash: $10,000 has left your account for shares.
:::

The trouble is practical. A trader running a {{ usd(-bups.maxLoss) }}-risk spread in a small account may not have $10,000. The broker then issues a margin call or sells the position for you, at its prices and its timing. The fix is simple: once your short put is deep in the money with little time value left, close the spread, or at least expect assignment. If you are assigned, sell the shares and the 95 put together the next morning (selling the put keeps any time value it has; exercising it throws that away).

## 2. A short call before an ex-dividend date

:::example Assigned on a bear call spread
You sold the December 100/105 bear call spread for {{ usd(becFill) }}. ACME rallies to ${{ int(b.S) }}, and its ex-dividend date ($0.50) is tomorrow, with {{ int(b.left) }} days to expiration. Your short 100 call is worth {{ usd(cB) }}: $8 of intrinsic value and only {{ usd(tvB) }} of time value.

As in [the covered call Lesson](#core-09-choosing-the-call), the dividend is worth more than the time value, so the call's holders are likely to exercise tonight. If you are assigned, you are **short 100 ACME** at $100 the next morning, plus long the 105 call. Your upside risk is still capped by the 105 call. But you are short the stock on the ex-date, so you owe the $0.50 dividend: {{ usd(50) }} added to the loss.
:::

On a covered call, early assignment just ends the trade at max profit. On a spread it creates a short stock position, a dividend debit and borrowing costs. Before every ex-dividend date, check any short call that is in the money: if its time value is less than the dividend, close or roll the spread the day before.

## 3. Expiration with one leg in the money

At expiration the [[OCC|Options Clearing Corporation]] exercises every equity option that is in the money by $0.01 or more, unless its owner says otherwise. Your long leg is exercised automatically. Your short leg is exercised against you only if some holder exercises it, which is likely but not certain when it is barely in the money.

**When the stock finishes between the strikes**, say ACME closes at $103 on your 100/105 bull call spread, the long 100 call is exercised and the short 105 call expires. On Monday you own 100 ACME at $100: a $10,000 position from a spread that risked {{ usd(-bcs.maxLoss) }}, now carrying the weekend's news with no hedge. If you did not want the shares, sell the spread, or at least the long call, before Friday's close.

**When the stock finishes right at the short strike**, you face [[pin risk]]: you cannot know whether you will be assigned.

:::example Pinned at $105
ACME closes Friday at ${{ num(pinClose, 2) }}. Your December 100/105 bull call spread, bought for {{ usd(bcFill) }}, looks like a full winner: {{ usd(payoff.pnlAtExpiry(bc, pinClose)) }}.

Your long 100 call is exercised automatically: you will buy 100 shares at $100. Your short 105 call is five cents in the money. Most holders will exercise it, and if one of them is assigned to you, your shares are delivered at $105 and you are flat with the full profit.

But holders have until the exercise cutoff on Friday evening to decide. Suppose ACME drops to $103 in after-hours trading on news. Holders of the 105 call now instruct their brokers *not* to exercise, and you are not assigned. On Monday you own 100 ACME, which opens at ${{ int(monday) }}. Your result: you bought shares at $100 that are worth ${{ int(monday) }}, less the {{ usd(bcFill * 100) }} the spread cost, {{ usd(unassigned) }} instead of {{ usd(bcs.maxProfit) }}.
:::

The reverse can happen too: a stock that closes just below your short strike can jump after hours, and the "worthless" short call gets exercised against you. You cannot control any of this after the close. You can avoid it before.

:::practice How professionals handle expiration
Close spreads before the final day whenever the stock is near the short strike, or anywhere between the strikes if you do not want a stock position. Buying back a short option for a few cents to remove the uncertainty is cheap insurance. Never leave a spread open into expiration in an account that could not hold the resulting shares.
:::

:::rule Exercise at expiration (as of 2026)
The OCC automatically exercises equity options that are in the money by $0.01 or more at expiration (exercise by exception) unless the holder's broker instructs otherwise. FINRA Rule 2360 sets a 5:30 p.m. Eastern cutoff on expiration day for holders to submit exercise decisions, and many brokers set an earlier cutoff for their customers. Because decisions can follow after-hours news, a short option near the money at the close may or may not be assigned. Brokers may also close positions they judge risky on expiration day.
:::

Drag "Days passed" to 30 in the builder and look at the payoff near $105: one cent either side of the strike changes the share position you end up with.

```tool position-builder
{ title: 'December 100/105 bull call spread on the last day', legs: bc, daysPassed: 29, range: [96, 112] }
```

:::key
A spread's legs live separate lives. Deep in-the-money short puts and in-the-money short calls before an ex-dividend date can be assigned early, leaving you with stock and a cash or margin problem. At expiration, a stock between the strikes leaves you with shares, and a stock near the short strike leaves you not knowing. Close or adjust before it happens.
:::

```quiz
- q: >-
    You are assigned early on the short 100 put of your 95/100 bull put spread. What is your position now?
  choices:
    - >-
      Long 100 ACME at $100 plus the long 95 put; your maximum loss is unchanged
    - >-
      Flat: the long 95 put is exercised automatically to offset the assignment
    - >-
      Short 100 ACME at $100, with unlimited risk
  answer: 0
  explain: >-
    Assignment on a short put makes you buy 100 shares at the strike. The 95 put is not exercised automatically before expiration, so you now hold stock plus a put: a protective put, still capped at the same {{ usd(-bups.maxLoss) }} loss. Short stock comes from assignment on a short call, not a short put.
- q: >-
    You are short the 100 call in a 100/105 bear call spread. ACME is at ${{ int(b.S) }}, ex-dividend ($0.50) tomorrow, and the call's time value is {{ usd(tvB) }}. What should you expect, and what is the usual fix?
  choices:
    - >-
      Likely assignment tonight, leaving you short stock that owes the dividend; close or roll the spread today
    - >-
      Nothing, because short calls are only assigned at expiration
    - >-
      Assignment, which you fix by exercising the 105 call tomorrow after the ex-date
  answer: 0
  explain: >-
    The dividend exceeds the remaining time value, so holders gain by exercising before the ex-date. You would be short 100 shares on the ex-date and owe the $0.50 dividend. Closing the spread today avoids it. Waiting until after the ex-date is too late: you would already owe the dividend.
- q: >-
    ACME closes at $103 on expiration day. You hold a December 100/105 bull call spread and do nothing. What do you have on Monday?
  choices:
    - >-
      Long 100 ACME bought at $100
    - >-
      Nothing; the spread settles in cash
    - >-
      Short 100 ACME at $105
  answer: 0
  explain: >-
    The long 100 call is in the money and is exercised automatically, so you buy 100 shares at $100. The 105 call is out of the money and expires. Equity options settle in shares, not cash, so you now carry a $10,000 stock position over the weekend.
- q: >-
    Why is a stock closing at ${{ num(pinClose, 2) }} a problem for a spread that is short the 105 call?
  choices:
    - >-
      You cannot know whether the 105 call will be exercised, so you do not know your share position on Monday
    - >-
      The OCC never exercises options that are only five cents in the money
    - >-
      Your long call will not be exercised
  answer: 0
  explain: >-
    The OCC exercises options in the money by $0.01 or more unless told otherwise, but holders can instruct their brokers not to exercise until the evening cutoff, for example after after-hours news. Your long 100 call will be exercised; whether you are assigned on the 105 call is uncertain. That uncertainty is pin risk.
```
