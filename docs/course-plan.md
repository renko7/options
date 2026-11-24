# Course plan

Settled during the design interview. Terms are defined in [CONTEXT.md](../CONTEXT.md).

## Decisions

| Area | Decision |
|---|---|
| Learner | Has traded stocks, has never traded options |
| Ceiling | Practitioner and beyond: everything that can be done with In-scope Instruments; Exotic Options taught for understanding only |
| Instruments | US-listed equity, ETF and cash-settled index options |
| Jurisdiction | US only; not tax advice; rule-based Lessons carry an "as of 2026" note |
| Shape | Two Tracks (Core, Advanced) → Modules → Lessons, plus a searchable Glossary |
| Data | Fictional Underlying with fixed numbers; real products named for rules ([ADR 0001](adr/0001-fictional-underlying-with-computed-numbers.md)) |
| Math | Full Derivations inline, gated by Track ([ADR 0002](adr/0002-derivations-gated-by-track.md)) |
| Tools | Position builder, Black-Scholes pricer, Greeks explorer, chain reader, hedging simulator, vol surface viewer, variance-swap replicator |
| Assessment | 3–5 question Quiz per Lesson, one Scenario Exercise per Module |
| Progress | Stored only in the Learner's browser |
| Delivery | Phase 1: shell + Tools + Core Track. Then Advanced Modules in batches, to the same artifact URL |

## Fictional Underlying

- **ACME Corp (ACME)**: spot $100.00, implied volatility 30%, quarterly dividend $0.50.
- **Harbor 100 Index (HBR)**: level 5,000, cash-settled, European-style; made of fictional components.
- Risk-free rate 4.00%.

## Core Track

1. What an option is
2. Reading an options chain
3. Payoffs at expiration
4. What drives an option's price
5. The Greeks in practice
6. Implied volatility
7. Exercise, assignment and expiration
8. Accounts and orders
9. Income and hedging strategies
10. Directional spreads
11. Neutral and volatility strategies
12. Managing trades
13. Index options and 0DTE
14. US taxes

## Advanced Track

1. Math Foundations
2. Pricing from first principles
3. Higher-order Greeks
4. The volatility surface
5. Delta hedging and gamma scalping
6. Volatility trading
7. Variance swaps and VIX
8. Dispersion and correlation trading
9. Portfolio risk
10. Market structure
11. Beyond listed options
