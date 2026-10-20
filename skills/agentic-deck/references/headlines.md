# Headlines: how the titles are written

Reverse-engineered from the final, partner-approved Team G27 deck and the BCG Zurich partner's rewrites (`partner-playbook.md` §2). A title is the slide's conclusion, written so the titles alone tell the story.

## The four tests (all must pass on every content slide)

1. **Sentence.** It has a subject and a verb. "The 90-day South pilot: 10% holdout" fails (fragment).
2. **Conclusion.** It says what is true or what we will do, not what the slide is about. "Competitive landscape" and "CJA reveals where the funnel leaks" fail (topic, tool).
3. **Number.** It carries the number that proves it (core slides always; appendix slides when one exists).
4. **Arguable.** A smart reader could disagree. "Customers matter" fails; "Rivals can copy a discount overnight, but not factory-direct cost plus opted-in buyers" passes.

Then two deck-level tests:
- **Read-aloud test.** Read all titles in order (`review/rN/titles.md`). They must form the argument with no gaps: situation → complication → answer → proof → plan.
- **One line where possible.** Target ≤ 56 characters (one line of 24pt Inter Bold in the 10.45 in title box). qa.py measures the wrap with the real Inter Bold metrics, so trust its A2 warning over a character count. Two lines are allowed only when the number and the conclusion need it; three lines never (qa.py fails above 110).

## The formulas (from the approved deck)

| Formula | Pattern | Example from the deck |
|---|---|---|
| Answer + metric | We [verb] [object] and lift [metric] [from] → [to] | We win the second purchase and lift repeat 24% → ~31% |
| Cost of the status quo | [Thing] costs [N]% more than [time], and it [worse outcome] | Renting reach costs 29% more than two years ago, and it keeps the fewest customers |
| Number-led finding with a twist | [N]% of [who] [verb], yet the [N]% who [do X] make up [N]% of [outcome] | 77% of carts stall, yet the 25% of buyers who engage make up 66% of repeaters |
| Can / can't contrast | [Rivals] can [copy X] [fast], but not [Y] | Rivals can copy a discount overnight, but not factory-direct cost plus buyers who opted in |
| Ready; action with cost and constraint | [What exists] is ready; we close [N gaps] for [$] inside [budget line] | The customer data is ready; we close three gaps for $4.8M inside the owned line |
| Gated action | We test for [time] in [where], and [$] moves only if [proof] | We test for 90 days in the South, and the first $4M moves only if the holdout proves it |
| Multiplier comparison | [Group A] [verb] [N]× more than [group B] [when] | Engaged buyers repeat 2.7x more in week 2 |
| Triplet of constraints | [N things], [zero X], [no Y] | 14 programs, zero discounts, no new budget |
| Count + structure | [N] [things] we [verb], each with [a, b] | Nine risks we watch, each with a fix and a warning sign |
| Credit gap | [Channel] touches [N]% of [base] but gets credit for ~[N]% | Owned channels touch 15% of revenue but get credit for ~5% |

## Style of the words

- Plain verbs: win, lift, stall, keep, copy, close, move, test, prove, cut, stop, pay, own, ask.
- "We" for our actions; third person for findings. First person reads as a team that owns the plan.
- Connectors that create the argument: **yet**, **but not**, **only if**, **;** (ready; action), **and** (finding and implication).
- Numbers as digits: 24%, $4.8M, 2.7x, ~31%, 90 days. `→` for from/to. `~` for approximations. Ranges as "12 to 14%", never with a dash.
- No hype (unlock, transform, seamless, world-class), no questions, no colons that split a label from a claim, no trailing period.
- Sentence case. Proper nouns keep their capitals.

## Rewrite procedure (what the Headlines agent does)

1. Find the slide's single most important number and who it is about.
2. Ask "so what for the client?"; that clause is the second half.
3. Choose the formula above that fits, write it, count characters.
4. Over 56: cut adjectives, then the qualifier, then move the second number into the slide body.
5. Re-run the read-aloud test with the new title in place.

## Before → after bank

| Before | After |
|---|---|
| Market overview | Rented reach costs 29% more than two years ago and keeps the fewest customers |
| Customer journey analysis | 77% of carts stall, and the 25% of buyers who engage make up 66% of repeaters |
| Why rivals can't copy Quince's model | Rivals can copy a discount overnight, but not factory-direct cost plus opted-in buyers |
| Turning 3PL shipping events into real-time journeys | Identity is ready today; three gaps close for $4.8M inside the owned line |
| The 90-day South pilot: 10% holdout, $4M on the line | A 90-day South pilot gates the first $4M move on holdout proof at month 3 |
| Owning the second purchase lifts repeat 24% → ~31% (wrapped) | Owning the second purchase lifts repeat 24% → ~31% (shortened to one line) |
| Standard attribution analysis | Standard attribution can't tell us what retargeting really adds |

## Exempt slides

Cover (the deck name and a one-line promise), section dividers ("Appendix"), and the sources list. Appendix evidence slides still use action titles ("77% of cart adders never order").
