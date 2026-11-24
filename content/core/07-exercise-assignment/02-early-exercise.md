---
title: When early exercise makes sense
summary: Decide whether to exercise an American option early by comparing what exercise captures with the extrinsic value it throws away, and recognize the two situations where exercising early wins.
---

```calc
const D = ACME.dividend;
const exDate = longDate(ACME_EX_DIVIDEND);
const decDay = longDate(expiryDate(21));
const q30 = chain(ACME, { dte: 30 });
const row = (k) => q30.rows.find((r) => r.strike === k);
const c95q = row(95).call;
const c80q = row(80).call;
const sellGain95 = c95q.bid - 5;
// Decision at the close on Wed Dec 9; ACME opens ex-dividend on Thu Dec 10 (modeled as half a day later).
const tDiv = 0.5 / 365;
const mk = (K, dte) => {
  const T = dte / 365;
  const sigma = smileIV(ACME, K, T);
  const base = { S: 100, K, T, r: RATE, q: 0, sigma, type: 'call', steps: 800, dividends: [{ t: tDiv, amount: D }] };
  const hold = binomial.price({ ...base, american: false }).price;
  const amer = binomial.price({ ...base, american: true }).price;
  const after = { S: 100 - D, K, T: T - tDiv, r: RATE, q: 0, sigma };
  const putAfter = bs.price({ ...after, type: 'put' });
  const carry = K * (1 - Math.exp(-RATE * (T - tDiv)));
  return { K, sigma, hold, amer, ex: 100 - K, putAfter, carry, extrAfter: putAfter + carry };
};
const janDte = 58 - 21;
const c80 = mk(80, janDte);
const c90 = mk(90, janDte);
const d90 = mk(90, 30 - 21);
// Put example: Thu Dec 10, after ACME has gone ex-dividend; no further dividend before Jan 15.
const T37 = janDte / 365;
const sig120 = smileIV(ACME, 120, T37);
const putAt = (r, american) => binomial.price({ S: 100, K: 120, T: T37, r, q: 0, sigma: sig120, type: 'put', american, steps: 800 }).price;
const p4 = putAt(RATE, true);
const p4eu = bs.price({ S: 100, K: 120, T: T37, r: RATE, q: 0, sigma: sig120, type: 'put' });
const p1 = putAt(0.01, true);
const interest120 = 12000 * (Math.exp(RATE * T37) - 1);
// The same put on Nov 18 (58 days), with the $0.50 Dec 10 dividend still ahead.
const T58 = 58 / 365;
const pNov = binomial.price({ S: 100, K: 120, T: T58, r: RATE, q: 0, sigma: smileIV(ACME, 120, T58), type: 'put', american: true, steps: 800, dividends: [{ t: 21.5 / 365, amount: D }] }).price;
const interestToEx = 12000 * (Math.exp(RATE * 21.5 / 365) - 1);
```

An American option gives you the right to exercise any day. Owning a right is never bad, but using it early almost always is. This Lesson shows why, and then the two exceptions every options trader has to know: calls just before a dividend, and deep in-the-money puts when interest rates are high.

## Exercise captures intrinsic value only

An option's price is its [[intrinsic value]] plus its [[extrinsic value]]. Exercise gives you the intrinsic value, in the form of stock bought or sold at the strike. Selling the option gives you both parts. So whenever an option has extrinsic value left, exercising it hands that value back to the market.

:::example Selling versus exercising the December 95 call
ACME is at $100. You hold the December 95 call, which is bid at {{ usd(c95q.bid) }}.

- **Exercise:** you pay $9,500 for 100 shares worth $10,000. You have captured $5.00 per share of intrinsic value, $500.
- **Sell the call:** you receive {{ usd(c95q.bid * 100) }}.

Selling is better by {{ usd(sellGain95 * 100) }}, the extrinsic value still in the bid. If you want to own the stock, you can sell the call and buy 100 shares in the market for the same result as exercising, and keep that {{ usd(sellGain95 * 100) }}.
:::

The same logic says you should not exercise a call because you are bullish (you keep the upside by holding the call, with less money at risk) or a put because you are bearish. Exercise makes sense only when the extrinsic value you give up is smaller than something you gain by exercising. There are two such gains: a dividend, and interest.

## Exception 1: calls just before an ex-dividend date

A company pays its dividend to whoever owns the shares on the record date. The [[ex-dividend date]] is the first day the stock trades *without* the right to that dividend, and on that morning the stock price drops by roughly the dividend amount. A call holder does not receive the dividend; only shareholders do. To be a shareholder in time, the call holder must exercise no later than the business day before the ex-dividend date.

So the holder of a deep in-the-money call faces a trade-off the day before the ex-date:

- **Exercise:** collect the dividend, give up the call's remaining extrinsic value.
- **Hold:** keep the extrinsic value, but watch the stock (and therefore the call) drop by the dividend.

The extrinsic value that matters is what the call will have left *after* the stock goes ex-dividend. Put-call parity tells you what that is.

:::derivation What a deep in-the-money call's extrinsic value is made of
After the last dividend before expiration, put-call parity for European options with the same strike \( K \) and time \( T \) gives
\[ C - P = S - K e^{-rT}. \]
Subtract the call's intrinsic value \( S - K \) from both sides of \( C = P + S - K e^{-rT} \):
\[ C - (S - K) = P + K\left(1 - e^{-rT}\right). \]
The call's extrinsic value is the price of the put with the same strike plus the interest on the strike until expiration. For a deep in-the-money call the put is nearly worthless, so the extrinsic value is little more than that interest. The rule follows: exercise the day before the ex-date when the dividend \( D \) is larger than \( P + K(1 - e^{-rT}) \), both measured just after the stock goes ex.
:::

:::example The day before ACME goes ex-dividend
ACME's next $0.50 dividend goes ex on Thursday, {{ exDate }}. Suppose that on Wednesday, {{ decDay }}, the last day to exercise and collect it, ACME is at $100. Compare two January calls, which have {{ int(janDte) }} days left.

**January 80 call** (deep in the money). After ACME drops to $99.50 tomorrow, the matching put is worth {{ usd(c80.putAfter, 3) }} and the interest on $80 until January's expiration is {{ usd(c80.carry, 3) }}, so the call will have about {{ usd(c80.extrAfter, 3) }} of extrinsic value left. That is less than the {{ usd(D) }} dividend.

- Hold through the ex-date: the call is worth {{ usd(c80.hold, 3) }} today.
- Exercise today: you capture {{ usd(c80.ex) }} of intrinsic value. Because you own the shares before the ex-date, that value survives the drop: tomorrow you hold shares worth $99.50 plus the right to the {{ usd(D) }} dividend.

Exercising is worth {{ usd((c80.ex - c80.hold) * 100) }} more per contract. A binomial tree that allows early exercise values this call at {{ usd(c80.amer, 3) }}, essentially its exercise value: the signature of an option that should be exercised now.

**January 90 call** (less deep). Its put is worth {{ usd(c90.putAfter, 3) }} after the ex-date and the interest on $90 adds {{ usd(c90.carry, 3) }}, so it keeps about {{ usd(c90.extrAfter, 3) }} of extrinsic value, more than the dividend. Holding is worth {{ usd(c90.hold, 3) }} against {{ usd(c90.ex) }} from exercising, and the tree with early exercise agrees at {{ usd(c90.amer, 3) }}. Do not exercise this one.

The **December 90 call** is different. With only {{ int(30 - 21) }} days to the December 18 expiration, its put and the interest on its strike add up to just {{ usd(d90.extrAfter, 3) }} after the ex-date, so the same strike that should be held in January should be exercised in December.
:::

Note the direction: the deeper in the money and the closer to expiration, the smaller the put and the interest, and the more likely the dividend wins. Calls near the money almost never qualify.

:::rule Dividend timing under T+1 settlement (as of 2026)
Since US stocks moved to T+1 settlement on May 28, 2024, the ex-dividend date is normally the same day as the record date. To own the shares on the record date, a call holder must exercise no later than the business day before the ex-dividend date; the exercise settles the next day. Brokers' exercise cut-offs on that day can be earlier than their expiration-day cut-offs, so ask yours in advance. Companies announce dividend dates; exchanges and data vendors publish the ex-date.
:::

## Exception 2: deep in-the-money puts when rates are high

Exercising a put gives you the strike in cash *now* instead of at expiration. Cash earns interest. If the put is so deep in the money that it has almost no chance of finishing out of the money, its remaining extrinsic value (the protection against a rebound above the strike) can be worth less than the interest on the strike.

:::example The January 120 put
It is Thursday, {{ exDate }}. ACME went ex-dividend this morning and is at $100; its next dividend falls after January's expiration. You hold the January 120 put, {{ int(janDte) }} days from expiration, $20 in the money.

- Exercising today pays you $12,000 for 100 shares worth $10,000. Over {{ int(janDte) }} days, $12,000 earns about {{ usd(interest120) }} at the 4% rate.
- A European version of this put is worth only {{ usd(p4eu, 3) }} today, *less* than its $20 intrinsic value, because the holder has to wait {{ int(janDte) }} days for the money.
- The American put, valued with a binomial tree that allows early exercise, is worth {{ usd(p4, 3) }}: exactly its intrinsic value. The best use of the right is to exercise now.

If rates were 1% instead, the same tree values the put at {{ usd(p1, 3) }}, above its intrinsic value, and the holder should wait. Higher rates make early put exercise more common.
:::

Dividends push the other way for puts. On the ex-date the stock drops by the dividend, which helps the put, so a put holder usually waits until after the ex-date before exercising. That is why the example is set on {{ exDate }}. Back on {{ longDate(TODAY) }}, with ACME also at $100, waiting for the ex-date was worth {{ usd(D * 100) }} per contract from the dividend drop, more than the {{ usd(interestToEx) }} of interest that exercising three weeks early would have earned; a tree that includes the dividend values the same put at {{ usd(pNov, 3) }} that day, above its intrinsic value, so the holder should wait.

Try it in the pricer below, which values European options (the dividend yield is set to zero because no dividend remains before January's expiration). With the rate at 4% the January 120 put's extrinsic value is negative: the European put is worth less than intrinsic, which is exactly when an American holder would exercise instead. Drag the interest rate down and watch extrinsic value turn positive, the point at which waiting becomes worth more.

```tool pricer
{ S: 100, K: 120, dte: janDte, iv: sig120, q: 0, type: 'put' }
```

## Selling below intrinsic value

One more case looks like an exercise decision but is really about quotes. Deep in-the-money options often trade with bids *below* intrinsic value, because market makers who buy them must hedge by trading stock and want paying for it. The ACME December 80 call is bid at {{ usd(c80q.bid) }}, below its $20.00 intrinsic value. A holder who wants out may do better by exercising and selling the shares, or by selling stock short against the call and exercising, than by hitting that bid. That needs the cash or margin to carry the stock for a day, and the stock trade has its own bid-ask cost; work out both before deciding.

:::practice What professional desks do
Desks run an early-exercise check every day before each ex-dividend date: for every in-the-money call they hold, compare the dividend with the call's extrinsic value after the ex-date, and exercise the ones where the dividend wins. They run the same check on deep in-the-money puts against interest. Writers run it from the other side, to predict which of their short options will be assigned.
:::

:::key
Exercise captures only intrinsic value, so exercising an option that still has extrinsic value gives money away; sell the option instead. The two exceptions: a deep in-the-money call the day before an ex-dividend date, when the dividend exceeds the call's remaining extrinsic value (about the put price plus interest on the strike); and a deep in-the-money put when the interest on the strike exceeds its remaining extrinsic value.
:::

```quiz
- q: >-
    ACME is at $100 and you are bullish. You hold the December 95 call, bid at {{ usd(c95q.bid) }}. Which is the cheapest way to end up owning 100 shares?
  choices:
    - >-
      Exercise the call
    - >-
      Sell the call at {{ usd(c95q.bid) }} and buy 100 shares at $100
    - >-
      Either; they are identical
  answer: 1
  explain: >-
    Exercising buys the shares at $95, a $5 per share advantage over the market. Selling the call brings in {{ usd(c95q.bid) }} per share, which more than covers the extra $5 you pay for the shares at $100. The difference, {{ usd(sellGain95 * 100) }} per contract, is the extrinsic value that exercise would have thrown away.
- q: >-
    It is {{ decDay }} and ACME goes ex-dividend tomorrow with a {{ usd(D) }} dividend. ACME is at $100. Which January call is the strongest candidate for exercise today?
  choices:
    - >-
      The 80 call, whose extrinsic value after the ex-date is about {{ usd(c80.extrAfter) }}
    - >-
      The 90 call, whose extrinsic value after the ex-date is about {{ usd(c90.extrAfter) }}
    - >-
      The 105 call, because it is cheapest
    - >-
      None; American calls should never be exercised early
  answer: 0
  explain: >-
    Exercise wins when the dividend exceeds the extrinsic value the call will still have after the stock goes ex. For the 80 call, {{ usd(D) }} beats {{ usd(c80.extrAfter) }}; for the 90 call, it does not. The 105 call is out of the money and has no intrinsic value to capture. "Never exercise early" is the right default, but dividends are the standard exception.
- q: >-
    Why does a deep in-the-money call's extrinsic value shrink to roughly the interest on its strike?
  choices:
    - >-
      Because the matching put becomes nearly worthless, and parity says extrinsic value equals the put price plus interest on the strike
    - >-
      Because implied volatility falls to zero for deep in-the-money options
    - >-
      Because market makers stop quoting them
  answer: 0
  explain: >-
    From put-call parity, the call's extrinsic value is \( P + K(1 - e^{-rT}) \). Deep in the money, the put with the same strike is far out of the money and worth almost nothing, leaving roughly the interest on the strike. Implied volatility does not need to fall; even at normal volatility the put is tiny. Quotes still exist, though they may be wide.
- q: >-
    On {{ exDate }}, after ACME has gone ex-dividend, you hold the ACME January 120 put with ACME at $100. With rates at 4% a tree values it at {{ usd(p4, 3) }}; at 1% it values it at {{ usd(p1, 3) }}. What should you conclude at the 4% rate?
  choices:
    - >-
      Exercise now: the put is worth no more than its intrinsic value, and the cash can earn interest
    - >-
      Hold: puts should only be exercised at expiration
    - >-
      Hold until the next ex-dividend date to collect the dividend
  answer: 0
  explain: >-
    When an American option's value equals its intrinsic value, the right to wait is worth nothing, so exercising now (and earning interest on the $12,000) is optimal. At 1% the interest is smaller than the put's remaining extrinsic value, so waiting wins. Dividends do not reward a put holder for waiting to collect them: put holders do not receive dividends, although the ex-date price drop helps the put, which is a reason to wait only while an ex-date is still ahead of you; here it has already passed.
```
