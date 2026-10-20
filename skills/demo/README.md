# Agentic Deck: example run

`Agentic Deck Example.pptx/.pdf/.html` is the skill's example build (`skills/agentic-deck/examples/example_build.js`) after a live review loop. `Agentic Deck HTML-React Example.html` is the same style built through the HTML/React path (open it and use the arrow keys).

## Scoreboard (real agent runs, not simulated)

| Round | Headlines | Layout | Elements | BCG Zurich partner | qa.py |
|---|---|---|---|---|---|
| 1 | 6.5 | 6.5 | 7.5 | 7.7 ("close") | 0 FAIL, 5 WARN |
| 2 | 7.0 | 7.5 | 8.5 (pass) | 7.9 ("close") | 0 FAIL, 2 WARN |
| 3 | not re-judged | not re-judged | not re-judged | not re-judged | 0 FAIL, 0 WARN |

Round 3 applies the round-2 findings (one-line titles measured with real font metrics, a today → target arrow on the matrix, the correct TikTok mark, colour-keyed budget captions); it was gate-checked but not re-scored. This test ran four of the eight specialists plus one of the five partners, to prove the loop. A full run uses all eight and the whole council.

What the loop caught that a single pass missed:
- the headline said ~31% while the tile under it said "target 30%";
- the hero 28.1% vs 4.7% gap was self-selected and unlabelled;
- titles wrapped, because the 70-character rule was wrong (fixed in the skill: qa.py now measures with Inter Bold);
- the matrix contradicted the title (Quince lowest on owned reach), fixed by showing the move;
- logo chips overlapped and broke the frame (fixed in the helper);
- "TikTok" fetched a joint venture's logo (fixed in the fetcher);
- seven repeated "Mechanism" eyebrows (removed in the helper).

`round1_contact.jpg` and `round3_contact.jpg` show the before and after.
