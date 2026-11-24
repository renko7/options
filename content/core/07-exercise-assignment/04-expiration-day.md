---
title: Expiration day, auto-exercise and pin risk
summary: Predict what will happen to every expiring position you hold, use or override automatic exercise, and protect short options from pin risk and after-hours moves.
---

```calc
const fri = longDate(expiryDate(2));
const halfDay = longDate(expiryDate(9));
const mon = longDate(expiryDate(5));
const q2 = chain(ACME, { dte: 2 });
const c100 = q2.rows.find((r) => r.strike === 100).call;
const p100 = q2.rows.find((r) => r.strike === 100).put;
const shortCall = [{ kind: 'call', qty: -1, strike: 100, premium: c100.bid }];
// pin example: assigned short at 100, Monday open scenarios
const pinUp = (100 - 103) * 100;
const pinDown = (100 - 97) * 100;
const unwanted = (97 - 100) * 100;
// after-hours put
const putAH = (100 - 97) * 100;
// penny ITM call
const pennyCost = 100 * 100;
```

Expiration day compresses everything in this Module into a few hours. Options that are in the money by a penny turn into stock automatically, holders get a window after the close to change their minds, and writers find out what they own only the next business day. Traders who understand the timetable treat it as routine. Traders who do not can wake up on Monday with a stock position they never chose.

## The timetable

Take the ACME November 20 options, the November monthly series, which expire on Friday, {{ fri }}. All times are Eastern.

| When | What happens |
|---|---|
| During the day | Expiring options trade normally. Some brokers stop letting you *open* positions in expiring options in the last hour or so, and may start closing positions they think you cannot fund. |
| 4:00 p.m. | Trading in expiring ACME options ends. ACME's official closing price decides which options are in the money. |
| 4:00 to 5:30 p.m. | Holders may still tell their broker to exercise an out-of-the-money option or not to exercise an in-the-money one, up to the broker's cut-off. The stock keeps trading after hours. |
| Overnight | The OCC processes every exercise and assigns them at random. |
| Monday, {{ mon }} | Holders and assigned writers see the stock positions. The stock trades created by Friday's exercises settle today, one business day later (T+1). |

The ACME November 27 weekly expires on {{ halfDay }}, the day after Thanksgiving, when the exchanges close at 1:00 p.m. The whole timetable moves up: trading ends at 1:00 p.m. and the final exercise deadline is 2:30 p.m.

## Exercise by exception

You do not have to do anything to exercise an in-the-money option at expiration. Under the OCC's [[exercise by exception]] procedure, every expiring option that is in the money by at least the threshold amount is exercised automatically, unless the holder's broker submits an instruction not to. Everything else expires.

:::rule Exercise by exception and the expiration cut-off (as of 2026)
- Under OCC Rule 805, expiring equity, ETF and index options that are in the money by **$0.01 or more** per share at expiration are exercised automatically, in customer, firm and market-maker accounts alike, unless a contrary instruction is submitted. For stock and ETF options, in the money is measured against the underlying's closing price.
- Holders can override in either direction by submitting a *contrary exercise advice* through their broker: a [[do-not-exercise instruction]] for an in-the-money option, or an exercise instruction for an out-of-the-money one.
- FINRA Rule 2360 sets 5:30 p.m. ET on expiration day as the latest time a holder can make that decision, or 90 minutes after an early close. Brokers may set earlier cut-offs, and their own thresholds or practices for customers can differ from the OCC's; check your broker's expiration policy.
:::

So the default outcome is easy to predict: in the money by a penny or more, it becomes stock; otherwise, nothing. The two dangers are the cases where the default is not what you want.

:::example The penny-in-the-money long call
You hold one ACME November 20 100 call and forget about it. ACME closes Friday at $100.01. The call is in the money by a penny, so it is exercised automatically: on Monday you own 100 ACME shares and owe {{ usd(pennyCost) }}.

If that is not what you want, you had three better choices: sell the call before 4:00 p.m., submit a do-not-exercise instruction before your broker's cut-off, or make sure you have the cash or margin to own the shares. If you have neither the funds nor an instruction on file, many brokers will sell the call for you before the close, or exercise it and then liquidate the shares on Monday, at prices you do not control.
:::

## After-hours moves

Trading in the option stops at 4:00 p.m., but the holder's decision window stays open until the cut-off, and the stock keeps trading after hours. News in that gap changes which options are worth exercising, and only holders get to act on it.

:::example A put that was out of the money at the close
You hold one ACME November 20 100 put. ACME closes at $100.10, so the put is out of the money and will expire. At 4:45 p.m. ACME reports bad news and trades at $97 after hours.

Before your broker's cut-off you submit an instruction to exercise. You sell 100 shares at $100. If you did not own shares, you are now short 100 shares; if ACME opens Monday near $97 and you buy them back there, you have made about {{ usd(putAH) }}, from an option that expired "worthless".

Somewhere a writer of that put, who saw it expire out of the money at the close, wakes up on Monday long 100 shares bought at $100, in a stock now trading at $97.
:::

The holder's choice is free; the writer's risk is real. That asymmetry is the reason short options near the money should not be left to expire.

## Pin risk

When the stock closes very near a strike, the short side cannot know whether it will be assigned. This is [[pin risk]].

:::example Pinned at $100
You sold one ACME November 20 100 call for {{ usd(c100.bid) }}. On Friday ACME closes at $100.03, three cents in the money.

- By default the call is exercised and you are assigned, which would leave you short 100 shares sold at $100.
- But some holders will submit do-not-exercise instructions (a few cents is not worth owning shares over), especially if ACME drifts lower after hours. You may be assigned, partly assigned, or not assigned at all, and you will not know until Monday.

Suppose you do nothing and are assigned. If ACME opens Monday at $103, buying back the shares loses {{ usd(-pinUp) }}. If it opens at $97, you make {{ usd(pinDown) }}. Suppose instead you guessed you would be assigned and bought 100 shares after hours to cover, but were not assigned: you start Monday long 100 shares you did not want, and an open at $97 costs {{ usd(-unwanted) }}.

The clean solution is to buy the call back before 4:00 p.m. With ACME at the strike in the final minutes, the call's remaining value is a few cents; paying it removes the uncertainty.
:::

Market makers with large positions at a strike carry pin risk on thousands of contracts, which is why trading near heavily traded strikes can get busy in the final hour of expiration day.

Cash-settled, PM-settled index options are much simpler at expiration: the settlement value is fixed at the close, so after-hours news cannot change which options pay, and nobody ends up with a stock position. [Index options and 0DTE](#core-13) covers them, including the AM-settled exception.

The position builder below holds the short November 20 100 call. Drag "Days passed" to 2 and move the ACME price across $100 to see how sharply the outcome changes within a few cents of the strike.

```tool position-builder
{ title: 'Short one ACME November 20 100 call', legs: [{ kind: 'call', qty: -1, strike: 100, premium: c100.bid, dte: 2 }], range: [95, 105] }
```

## An expiration-day checklist

Run this by early afternoon on every expiration day (late morning on a half day):

1. **List every position expiring today**, including legs of spreads.
2. **Long options in the money:** do you want the stock? If not, sell to close, or file a do-not-exercise instruction before your broker's cut-off. If yes, make sure the cash or margin is there.
3. **Long options near the money:** decide in advance what you will do if after-hours news moves the stock, and know your broker's cut-off time.
4. **Short options in the money:** expect assignment. Make sure the resulting stock position fits your account, or buy them back.
5. **Short options near the money (within about a dollar on ACME):** close them before the close. Pin risk and after-hours moves only cost the writer.
6. **Spreads with the stock between the strikes:** close the whole spread. Otherwise one leg is exercised or assigned and the other expires, and you start Monday with 100 shares per contract, a stock position the spread was supposed to rule out.
7. **Check the day:** a half-day session moves every deadline earlier.
8. **Monday morning:** confirm what was exercised and assigned and deal with any stock positions or margin calls at the open.

:::key
At expiration, options in the money by $0.01 or more are exercised automatically unless the holder files a do-not-exercise instruction; holders can override either way until their broker's cut-off, no later than 5:30 p.m. ET. Writers cannot override and learn their fate the next business day, so after-hours moves and stocks pinned at a strike are writers' risks. Close short options near the money before the close, and decide in advance about every in-the-money long.
:::

```quiz
- q: >-
    ACME closes at $100.02 on expiration Friday. You hold one November 20 100 call and do nothing. What happens?
  choices:
    - >-
      It expires worthless, because two cents is too small to exercise
    - >-
      It is exercised automatically and you buy 100 shares for {{ usd(pennyCost) }}
    - >-
      Your broker pays you $2 in cash
  answer: 1
  explain: >-
    The OCC's exercise-by-exception threshold is $0.01, so a call two cents in the money is exercised unless you instruct otherwise. You buy 100 shares at $100. Cash settlement applies to index options, not ACME. Expiring worthless would require a do-not-exercise instruction or a close at or below $100.
- q: >-
    You are short the ACME November 20 100 put. ACME closes at $100.40, and after hours falls to $97 on news. What risk do you face?
  choices:
    - >-
      None; the put closed out of the money, so it expires
    - >-
      Holders may still exercise before the cut-off, so you could be assigned and own 100 shares at $100
    - >-
      The OCC will cancel the expiration because of the news
  answer: 1
  explain: >-
    Holders can submit an exercise instruction for an out-of-the-money option until their broker's cut-off, no later than 5:30 p.m. ET. With ACME at $97, exercising a $100 put is worth $3 a share, so many will. You would be assigned and buy shares at $100. Closing price only sets the automatic default; it does not end the holders' right.
- q: >-
    It is 3:50 p.m. on expiration Friday and ACME is at $100.05. You are short ten November 20 100 calls. What is the cleanest way to remove pin risk?
  choices:
    - >-
      Buy 1,000 shares now in case you are assigned
    - >-
      Buy back the ten calls before 4:00 p.m.
    - >-
      Do nothing; assignment is random, so you will probably not be assigned
  answer: 1
  explain: >-
    Buying back the calls costs only their remaining few cents of value and leaves nothing to chance. Buying 1,000 shares works only if you are assigned on all ten; any contract not assigned leaves you long shares you did not want. Random allocation decides which writers are assigned, not whether in-the-money exercises happen, so "probably not" is a guess, not a plan.
- q: >-
    The ACME November 27 weekly expires on the day after Thanksgiving, when the options exchanges close at 1:00 p.m. ET. What is the latest any broker can accept your exercise decision?
  choices:
    - >-
      5:30 p.m. ET, as on any expiration day
    - >-
      2:30 p.m. ET, 90 minutes after the early close
    - >-
      1:00 p.m. ET, the close of trading
  answer: 1
  explain: >-
    FINRA's rule moves the deadline to 90 minutes after an announced early close, which makes it 2:30 p.m. ET on that day. 5:30 p.m. applies to normal 4:00 p.m. closes. The 1:00 p.m. close ends trading, but holders still have the window after it, and your broker may set its own cut-off earlier than 2:30.
```
