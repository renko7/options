---
title: Assignment and dividend risk
summary: Know how assignments are allocated, what an assignment does to your positions, cash and margin, and how to spot and avoid early assignment before an ex-dividend date.
---

```calc
const q30 = chain(ACME, { dte: 30 });
const row = (k) => q30.rows.find((r) => r.strike === k);
const c105bid = row(105).call.bid;
const p95bid = row(95).put.bid;
const D = ACME.dividend;
// short call assigned
const callLoss = (112 - 105) * 100;
const callNet = callLoss - c105bid * 100;
const shortMaint = Math.max(0.30 * 112 * 100, 5 * 100);
// short put assigned
const startEq = 4000;
const putReq0 = 100 * Math.max(p95bid + 0.20 * 100 - 5, p95bid + 0.10 * 95);
const cashAfter = startEq + p95bid * 100 - 9500;
const eqAfter = cashAfter + 88 * 100;
const halfStock = 0.5 * 9500;
// dividend risk: decision at the close on Wed Dec 9, ACME opens ex-dividend Thu Dec 10
const exDate = longDate(ACME_EX_DIVIDEND);
const decDay = longDate(expiryDate(21));
const tDiv = 0.5 / 365;
const extrAfter = (K, dte) => {
  const T = dte / 365 - tDiv;
  const sigma = smileIV(ACME, K, dte / 365);
  return bs.price({ S: 100 - D, K, T, r: RATE, q: 0, sigma, type: 'put' }) + K * (1 - Math.exp(-RATE * T));
};
const extr85 = extrAfter(85, 9);
const extr100 = extrAfter(100, 9);
const extr80 = extrAfter(80, 37);
const extr90 = extrAfter(90, 37);
const assignCost = (D - extr85) * 100;
const spreads = 20;
```

[[Assignment]] is the other side of exercise. If you have written an option, you can be told, without warning and without any say, that a holder has exercised and you must deliver. This Lesson covers how the writer gets picked, what lands in your account, and the one situation where early assignment is not a surprise at all.

## How the OCC and your broker pick who is assigned

When a holder exercises, the [[Options Clearing Corporation]] does not trace the trade back to the original seller; there is no such link once trades clear. Instead it assigns the exercise at random among all clearing firms with a short position in that series. Each clearing firm then allocates its assignments among its own customers who are short that series.

:::rule Allocation of assignments (as of 2026)
- The OCC assigns exercise notices to clearing members' accounts on a random basis.
- FINRA Rule 2360 requires each broker to have fixed procedures for allocating assignments to its customers, on a first-in-first-out basis, by automated random selection, or by manual random selection, and to tell customers which method it uses. Your broker's options agreement or website describes its method.
:::

Two consequences follow. First, how long you have been short does not protect you; under a random method a position opened this morning can be assigned tonight. Second, assignment can be partial: if you are short ten contracts, you might be assigned on three.

## What assignment does to your account

On an equity option, assignment turns your short option into a stock trade at the strike price.

| You were short | If assigned you | Resulting position (if you held no shares) |
|---|---|---|
| a call | sell 100 shares per contract at the strike | short 100 shares |
| a put | buy 100 shares per contract at the strike | long 100 shares |

If you wrote a [[covered call]], the shares you own are delivered and the position simply closes: your stock is [[called away|call away]] at the strike. If you wrote a naked call, there are no shares to deliver, so the sale creates a short stock position.

:::example A naked call assigned early
You sold one ACME December 105 call at {{ usd(c105bid) }}, collecting {{ usd(c105bid * 100) }}. ACME rallies to $112 and you are assigned overnight.

- Your account now shows **−100 ACME shares**, sold at $105, and {{ usd(105 * 100) }} more cash. The call is gone.
- At $112 the short shares show a loss of {{ usd(callLoss) }} against the $105 sale price. Net of the premium you kept, you are down {{ usd(callNet) }}, exactly what the call would have cost you at expiration with ACME at $112.
- Short stock carries its own margin requirement. Under the FINRA maintenance minimum it is the greater of 30% of the market value or $5 a share: {{ usd(shortMaint) }} at $112, and it rises as ACME rises. You also owe any dividend paid while you are short, and your broker may charge a fee to borrow the shares.

The assignment did not hurt your profit and loss: you lost the call's intrinsic value, exactly as you would have at expiration, and the holder who exercised gave up whatever extrinsic value the call had left. What changed is the *form* of the risk: a short call has a fixed expiration; short stock stays open until you buy it back.
:::

:::example A short put assigned, and the cash it needs
You have $4,000 of equity in a [[margin account]] and sell one ACME December 95 put at {{ usd(p95bid) }}. The margin requirement for the naked put is {{ usd(putReq0) }}, which fits (the formula is in [Accounts and orders](#core-08)).

At expiration ACME closes at $88 and you are assigned: you buy 100 shares at $95.

- Cash: {{ usd(startEq) }} + {{ usd(p95bid * 100) }} premium − {{ usd(9500) }} = **{{ usd(cashAfter) }}**, a margin loan.
- Stock: 100 shares worth {{ usd(88 * 100) }}. Equity: {{ usd(eqAfter) }}.

Your account was sized for a {{ usd(putReq0) }} option requirement and now holds an {{ usd(88 * 100) }} stock position. Reg T expects half of a new stock purchase to be paid for with your own money: half of the {{ usd(9500) }} you just paid, or {{ usd(halfStock) }}, more than your equity. Expect a margin call: deposit cash or sell shares, usually within a few days. The exact amount and deadline depend on your broker.
:::

:::warning Assignment can arrive at the worst moment
Assignment happens overnight and you learn about it the next morning. A short call assigned on a day the stock gapped up leaves you short shares at the open of the next day; a short put assigned after a bad close leaves you long shares into whatever happens next. Size short option positions so that the stock position you could be handed fits your account.
:::

## Assignment inside a spread

If you hold a spread, only the short leg can be assigned. Your long leg is still there and still protects you: the spread's maximum loss at expiration has not changed, apart from any dividend or borrow fee you owe while you are short stock (see dividend risk below). What changes is the cash and margin: for a night you hold stock plus an option instead of two options, and your broker margins it that way.

The usual fixes are to buy (or sell) the shares in the market to flatten the stock, keeping the long option for its remaining value, or to exercise the long option to deliver against the assignment. Compare the long option's extrinsic value with the cost of the stock trade: exercising throws away extrinsic value; buying shares costs a bid-ask spread.

## Dividend risk

The most predictable early assignment is on in-the-money calls the day before an [[ex-dividend date]]. As the previous Lesson showed, a holder should exercise when the dividend is larger than the extrinsic value the call will keep after the stock goes ex. Professional holders run that check every time. If you are short such a call, you should expect to be assigned. This is [[dividend risk]].

:::example Short the December 85 call the day before the ex-date
ACME goes ex-dividend on Thursday, {{ exDate }}, with a {{ usd(D) }} dividend. It is Wednesday, {{ decDay }}, ACME is at $100, and you are short one ACME December 85 call, nine days from expiration. After the stock goes ex, the call would keep only about {{ usd(extr85, 3) }} of extrinsic value, far less than the dividend, so holders will exercise tonight.

If you are assigned, you are short 100 shares when ACME opens ex-dividend, and you owe the {{ usd(D * 100) }} dividend. Compared with staying short the call, assignment costs you the dividend minus the extrinsic value you would have kept: about {{ usd(assignCost) }} per contract.

Now multiply it. A trader short {{ int(spreads) }} of these calls, as the short legs of spreads against long December 100 calls, should expect to be short {{ int(spreads * 100) }} shares at tomorrow's open and to owe {{ usd(D * 100 * spreads) }} in dividends, ending about {{ usd(assignCost * spreads) }} worse off than if the calls had stayed open. And the long 100 calls do not help: they are at the money, with no intrinsic value to capture, so nobody would exercise them for a dividend.
:::

The defence is simple and must happen before the close on the day before the ex-date:

1. List every short call that is in the money.
2. For each, estimate the extrinsic value it will have after the ex-date: the ask of the put with the same strike and expiration, plus the interest on the strike until expiration (the parity result from the previous Lesson).
3. If that is less than the dividend, buy the call back (or roll it to a later or higher strike) before the close.

Covered call writers face the same arithmetic in a gentler form: if assigned, the shares are called away the day before the ex-date and you do not receive the dividend you may have been counting on.

Use the position builder to see why assignment of a deep in-the-money short call barely changes your profit and loss: move ACME to $112 and compare the short call's loss at expiration with short stock sold at $105.

```tool position-builder
{ title: 'Short one ACME December 105 call', legs: [{ kind: 'call', qty: -1, strike: 105, premium: c105bid, dte: 30 }], range: [90, 125] }
```

:::key
Assignment is random: the OCC picks clearing firms at random and your broker allocates by a disclosed random or first-in-first-out method, so any short American option can be assigned any business day. A short call becomes short stock and a short put becomes long stock, with new margin requirements that can trigger a margin call. In-the-money short calls whose extrinsic value is below the coming dividend are likely to be assigned the night before the ex-date; close or roll them first.
:::

```quiz
- q: >-
    You opened a short ACME call this morning. Your colleague's identical short has been open for a month. Who is more likely to be assigned tonight if your broker allocates at random?
  choices:
    - >-
      Your colleague, because older positions are assigned first
    - >-
      Neither is more likely; a random method ignores when the position was opened
    - >-
      You, because new positions are matched to new exercises
  answer: 1
  explain: >-
    Under automated random allocation, every short contract in the series has the same chance regardless of age. Oldest-first would describe a first-in-first-out method, which some brokers use instead; your broker must tell you which. The OCC never matches exercises to the original seller.
- q: >-
    You are short one naked ACME December 105 call and are assigned with ACME at $112. What is in your account the next morning?
  choices:
    - >-
      Nothing changes until expiration
    - >-
      Short 100 ACME shares and {{ usd(105 * 100) }} more cash
    - >-
      Long 100 ACME shares and {{ usd(105 * 100) }} less cash
    - >-
      A cash debit of {{ usd(callLoss) }} and no shares
  answer: 1
  explain: >-
    Assignment on a call means you sell 100 shares at the $105 strike. With no shares to deliver, you are now short 100 shares and have received {{ usd(105 * 100) }}. Long shares result from assignment on a short put. A cash-only debit would be cash settlement, which applies to index options, not to ACME.
- q: >-
    It is {{ decDay }}, ACME is at $100 and it goes ex-dividend tomorrow with a {{ usd(D) }} dividend. Which short call is most likely to be assigned tonight?
  choices:
    - >-
      A January 80 call, with about {{ usd(extr80) }} of extrinsic value after the ex-date
    - >-
      A January 90 call, with about {{ usd(extr90) }} of extrinsic value after the ex-date
    - >-
      A January 105 call, out of the money
  answer: 0
  explain: >-
    A holder exercises when the dividend exceeds the extrinsic value the call will keep after the ex-date. That holds for the 80 call ({{ usd(D) }} against {{ usd(extr80) }}) but not for the 90 call ({{ usd(extr90) }} is more than the dividend). An out-of-the-money call has no intrinsic value to capture, so nobody exercises it.
- q: >-
    On {{ decDay }} you are short 20 ACME December 85 calls as the short legs of spreads, and ACME goes ex-dividend tomorrow. What is the standard defence?
  choices:
    - >-
      Do nothing; the long legs cover any assignment
    - >-
      Buy back (or roll) the short calls before today's close
    - >-
      Exercise all the long calls tomorrow morning
  answer: 1
  explain: >-
    The long calls cap the spread's loss at expiration but do not pay the {{ usd(D * 100 * spreads) }} of dividends you will owe if the short calls are assigned tonight and you open tomorrow short {{ int(spreads * 100) }} shares, about {{ usd(assignCost * spreads) }} worse off than staying short the calls. Closing or rolling the short calls before the close removes the risk. Exercising the longs tomorrow is too late: exercise must happen by the day before the ex-date to collect the dividend.
```
