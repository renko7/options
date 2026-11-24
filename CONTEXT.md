# Options Course

An interactive course, published as a Claude artifact, that takes someone who has traded stocks to a practitioner's command of US-listed equity, ETF and index options.

## Language

### People

**Learner**:
The person taking the course; assumed to have bought and sold stocks through a broker but never traded an option.
_Avoid_: User, student, reader, trader

### Course structure

**Course**:
The whole artifact: every Track, Module, Lesson and Tool together.
_Avoid_: Guide, tutorial, site

**Track**:
An ordered path through Modules aimed at one level of mastery. There are exactly two: Core and Advanced.
_Avoid_: Level, tier, section

**Core Track**:
The Track that takes a Learner from no options knowledge to trading and managing positions on their own.
_Avoid_: Basics, beginner track

**Advanced Track**:
The Track covering practitioner material: pricing derivations, volatility surfaces, hedging, volatility and correlation trading, and portfolio risk. It requires the Core Track.
_Avoid_: Expert track, pro track

**Module**:
A group of Lessons covering one topic area, such as "The Greeks" or "Volatility".
_Avoid_: Chapter, unit

**Lesson**:
The smallest navigable piece of teaching; one idea, finished in one sitting.
_Avoid_: Page, article, step

**Glossary**:
The searchable list of options terms available from every Lesson; it is the Course's reference mode.
_Avoid_: Dictionary, index

### Teaching material

**Fictional Underlying**:
The made-up stock or index that all Worked Examples use, with fixed, hand-chosen prices, so no example depends on live market data.
_Avoid_: Sample stock, demo ticker, real ticker

**Fictional Index**:
The made-up cash-settled index (the Harbor 100, HBR) used for index-option and dispersion examples. Its components are also fictional.
_Avoid_: Sample index, using SPX for the numbers

**Rule Note**:
A dated statement ("as of 2026") of a regulatory, exchange or tax rule. Rule Notes are the only part of the Course that can go out of date.
_Avoid_: Disclaimer, footnote

**Worked Example**:
A fixed, step-by-step calculation on the Fictional Underlying whose numbers never change.
_Avoid_: Sample, demo, case study

**Derivation**:
A complete mathematical proof of a result, written inline in the Lesson text rather than hidden or summarized.
_Avoid_: Proof sketch, math box

**Tool**:
An interactive calculator or visualizer built into the Course (for example the position builder or the Black-Scholes pricer), embedded in Lessons and also available on its own.
_Avoid_: Widget, calculator, simulator (as a general term)

**Quiz**:
The 3–5 questions at the end of a Lesson, each with its answer explained.
_Avoid_: Test, check, exercise

**Scenario Exercise**:
A realistic trading situation at the end of a Module in which the Learner decides what to do with a position.
_Avoid_: Case study, quiz, challenge

**Progress**:
The record of which Lessons a Learner has completed. It is stored only in that Learner's browser.
_Avoid_: Score, account, profile

### Scope

**In-scope Instrument**:
A US-listed equity option, ETF option, or cash-settled index option (such as SPX). Futures options, FX options and non-US listings are out of scope.
_Avoid_: Derivative (too broad), contract (ambiguous)

**Exotic Option**:
An over-the-counter option with a non-standard payoff (barrier, Asian, digital and so on). Taught for understanding in one closing Module, never as something the Learner trades.
_Avoid_: Structured product, OTC option

**Jurisdiction**:
The United States. All regulatory, margin, account-approval and tax material assumes US rules and is not tax advice.
