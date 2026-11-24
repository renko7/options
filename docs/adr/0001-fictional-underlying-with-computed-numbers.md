# Worked Examples use a Fictional Underlying, and every number is computed

Every Worked Example uses the Fictional Underlying (the stock ACME and the Harbor 100 Index) rather than real tickers or live quotes. Every number in a Lesson is produced at build time by the tested pricing library, never typed by hand. Live data would go stale, can break, and raises licensing questions. Hand-typed numbers drift out of agreement with each other across 100+ Lessons. Real products (SPX, VIX, Cboe, OCC) are still named wherever the Course explains their rules.

## Consequences

- A Lesson cannot quote "today's" market. Anything that depends on the current market is shown with a Tool that uses numbers the Learner enters.
- Changing a market parameter of the Fictional Underlying (spot, volatility, rate) changes every Worked Example at once. This is intended, but it should be done on purpose.
