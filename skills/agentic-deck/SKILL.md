---
name: agentic-deck
description: "Agentic Deck: builds consulting-grade slide decks (PPTX, PDF and an HTML viewer) in the navy and blue house style, with an orchestrator that runs eight specialist reviewer agents (Design, Less Text, Minimal, Elements, Integrity, Headlines, Style, Layout) and a council of five MBB Senior Partner judges in a loop until the deck passes. Use whenever the user asks for a deck, presentation, slides, pitch, case competition deck, board or client readout, 'agentic PPT', 'MBB/BCG/McKinsey style deck', 'blue theme deck', or to rebuild, judge, loop on or improve an existing deck. It fetches real brand logos, uses flat icons, writes action titles reverse-engineered from a BCG Senior Partner's feedback, and keeps slides minimal in style but exhaustive in content. Looping is ON by default; the user can opt out ('no loop', 'single pass', 'don't loop')."
---

# Agentic Deck

A deck is built once and then judged, fixed and judged again until it is the best version, not the first one. You are the **Orchestrator**: you run the intake, write the storyline, build, and then manage the reviewer agents and the partner council. You do not grade your own work; the agents do, and you check that the agents did their job.

```
  brief (intake) ──► storyline + titles ──► slide plan ──► logos/icons ──► build (PPTX | HTML | hybrid)
                                                                              │
                ┌────────────────────────── LOOP (default on, max 3 rounds) ──┘
                ▼
   QA gate (qa.py, must be 0 FAIL) ──► 8 specialist reviewers in parallel ──► Orchestrator audits the reviews
                ▲                                                                         │
                │                                                     MBB Senior Partner council (5 judges,
                │                                                     anonymous peer review, chairman verdict)
                │                                                                         │
                └──────────── apply one consolidated fix list ◄── Orchestrator arbitrates ┘
   exit: all reviewers ≥ 8/10, council average ≥ 8.5 with no partner < 8, 0 FAIL  → deliver
```

Read in this order before the first build of a session:
1. This file.
2. `references/partner-playbook.md`: the BCG Zurich Senior Partner's feedback, reverse-engineered into rules. It is the highest authority on content after the user.
3. `references/headlines.md`: how titles are written (formulas, tests, before and after).
4. `references/design-system.md`: tokens, geometry, the minimal-but-exhaustive density standard, logos, icons.
5. `references/patterns.md`: the helper API (PPTX and HTML) and which exemplar each pattern copies.
6. Look at `assets/exemplars/*.jpg`. They are slides from the council deck the user loves: this is the density, rhythm and finish to hit. (Their titles predate the partner's feedback; write titles from `headlines.md`, not from the exemplars.)

If `/mnt/skills/public/pptx/SKILL.md` exists, skim it once for pptxgenjs pitfalls.

## 0. Defaults

| Setting | Default | User can change by saying |
|---|---|---|
| Loop | **On**, max 3 rounds (a round = QA + 8 reviewers + council + fixes) | "no loop", "single pass", "don't loop", "just build it" → one build, QA, one specialist pass, fixes, no council. "loop 5 rounds", "loop until perfect" (cap 6) |
| Judges | 5 MBB Senior Partners via the `llm-council` method (see `agents/mbb-council.md`) | "skip the council", "only BCG judges", "add a client CFO judge" |
| Density | **Exhaustive-minimal**: every region carries evidence, styling stays quiet | "presenter mode / less text" → `presenter`; "balanced" |
| Output | PPTX + PDF + HTML viewer | "HTML only", "PPTX only", "Google Slides-ready" (PPTX) |
| Build path | PPTX with `scripts/deck.js` | "web deck", "React", "animated", "custom visuals" → HTML path (`references/html-react.md`); one complex element → hybrid |
| Theme | Navy/blue, Inter, rounded corners only, council cover backdrop | the user's brand colours and font go into `brief.json` and qa.py reads them |

## 1. Intake: listen to the user first

Follow `references/intake.md`. Extract everything the user already said (audience, purpose, sections, element wishes such as "process chart not table", "logos", "no eyebrows"), then ask only what is missing, at most four questions in one go (use AskUserQuestion when available). Never ask about anything with a sensible default. Write `brief.json` next to the build script. Every agent reads it, and the Orchestrator checks the final deck against it line by line.

User design and element requests outrank this skill's defaults, except the non-negotiables in Section 7.

## 2. Storyline before slides

1. Write the **one-sentence answer** (the governing thought). Test: could a judge repeat it after one read? Example: "Own the second purchase by moving up to $9M from rented to owned channels, with holdouts deciding every dollar."
2. Build the pyramid: Situation, Complication, Question, Answer; then 3 MECE levers (mutually exclusive, together cover the problem) with evidence under each.
3. **Write every title first**, as a list, before any slide exists. Run the read-aloud test (`headlines.md`). If the titles alone don't tell the argument, fix the titles, not the slides.
4. Respect the required structure when there is a rubric (e.g. a case packet's required slide order and sections). Missing a required section scores zero.

## 3. Slide plan

One row per slide, in a markdown table saved as `plan.md`:

| # | Action title | Focal element (the one thing the presenter points at) | Element types (≥ 3) | Evidence and source per number | Logos / icons |

Rules: pick patterns from `patterns.md` before inventing anything; a plan or timeline is a process chart, never a table; comparisons are bars, not paragraphs; any company named gets its real logo.

## 4. Assets: real logos, flat icons

- **Logos:** for every company or brand the deck names, run
  `node scripts/fetch_logos.js <dir>/logos "Amazon=Amazon (company)" "Shein" "Everlane" ...`
  It takes the official mark from the company's Wikipedia infobox (SVG where available), then Simple Icons, then the site icon as a flagged low-res fallback, and logs every source in `sources.json`. Never draw, trace, AI-generate, recolour (beyond the provided white variant) or stretch a logo. If one can't be found, write the name in text. Logos stay small (0.2 to 0.45 in tall) and sit on white or in a white rounded chip.
- **Icons:** flat icons from react-icons, one family per deck: `Lu…` Lucide line (default), `Pi…Fill` Phosphor filled, `Tb…` Tabler, `Hi…` Heroicons. An icon must label something (a step, a channel, a lever); decorative icons are cut.

## 5. Build

```bash
SKILL=<directory containing this SKILL.md>
cd $SKILL/scripts && npm install          # once: pptxgenjs, react, react-dom, react-icons, sharp, jszip (+ playwright for HTML)
```
- **PPTX (default):** `const D = require(SKILL + '/scripts/deck.js')`. Copy the structure of `examples/example_build.js` (cover, executive summary, three-panel evidence slide with strip, logo matrix, journey row, plan with gates, appendix divider). Chain patterns with the returned y values. Read every `[deck]` warning and fix the content, not the helper.
- **HTML / React:** `examples/example_html.js` + `node scripts/html/render.js spec.js out/` gives `deck.html` (arrow-key viewer), `slides/*.png`, `deck.pdf`, image `deck.pptx` and `qa_html.json`. See `references/html-react.md`.
- **Hybrid:** `await D.htmlElement(slide, reactElement, { x, y, w, h })` renders one HTML/React element (donut with a centre label, custom SVG flow) as a crisp PNG inside an editable PPTX.
- Metadata: author and company stay empty unless the user names them. Never put names the user excluded (team, school, client) in files, footers or properties.

## 6. The loop (Orchestrator protocol)

Full protocol and prompts: `agents/orchestrator.md`. In short, each round:

1. **QA gate.** `python3 $SKILL/scripts/review_pack.py deck.pptx review/rN --brief brief.json` (renders, contact sheet, `slides.json`, `qa.json`, `titles.md`, whitespace scan). Also run `validate.py` from the pptx skill when present. Fix every FAIL before any agent sees the deck; agents must not spend effort on what a script can catch.
2. **Specialists, in parallel.** Spawn the eight reviewers in one message with the Agent tool (general-purpose), each with its brief from `agents/<name>.md`, the paths to `review/rN`, `brief.json` and `plan.md`. They return JSON (schema in `agents/README.md`).
   `design` · `less-text` · `minimal` · `elements` · `integrity` · `headlines` · `style` · `layout`
3. **Audit the reviewers.** Reject and re-run once any review that: cites no slide numbers, gives a fix that isn't concrete ("improve clarity"), repeats qa.py findings, contradicts the brief, or scores 9 or 10 with no evidence. Record the audit.
4. **Council.** Run the MBB Senior Partner council (`agents/mbb-council.md`): five partners score independently, review each other anonymously, and a chairman returns the verdict, the ranked fix list and the one change that matters most. If the `llm-council` skill is installed, follow its method with these five partners in place of its generic advisors.
5. **Arbitrate and fix.** Merge everything into one fix list, de-duplicated and ranked by the priority order below. Apply all blocking fixes and every quick win; rebuild; next round.
6. **Exit** when all specialists score ≥ 8, the council averages ≥ 8.5 with no partner below 8, and qa.py shows 0 FAIL; or when the round cap is hit (then deliver the best round, not the last, and list what is still open). Keep `review/scoreboard.md` (round × agent scores, council scores, fixes applied).

**Priority when agents disagree:** Integrity > Storyline and Headlines > the user's brief > Less Text and whitespace > Elements > Design > Minimal > Style polish.
Two standing rulings: *Less Text vs Elements*: convert words into elements (a number into a stat tile, a list into an icon row, a comparison into bars); never delete the evidence. *Minimal vs Exhaustive*: minimal governs styling (colour, decoration, eyebrows, borders, type sizes); exhaustive governs content (no dead space, every region earns its place).

Without a subagent tool (e.g. claude.ai chat), run each reviewer as a separate pass in sequence with its own brief, write its JSON to `review/rN/<name>.json` before starting the next, and run the council as five separate passes plus a chairman pass.

## 7. Non-negotiables (no brief overrides these)

- No invented numbers. Every number on a slide traces to a source in the footer or an appendix; derived numbers show the derivation; judgement is labelled as judgement. Missing values ship as `[TBD]` and are listed at delivery.
- Action titles on every content slide (`headlines.md`).
- Rounded corners only. No sharp-cornered filled or bordered rectangle anywhere (qa.py check K).
- No em or en dashes, no hype words, no decorative ★ ✓ glyphs, no exclamation marks.
- Sources on every content slide; consistent furniture (title, logo, tag, footer, page) on every slide.
- No paragraph over 32 words on a slide; speaker detail goes into the notes.
- Real logos only; flat icons only; no clip art, stock photos or AI imagery on content slides.

## 8. Deliver

Files: `<Name>.pptx`, `<Name>.pdf`, `<Name>.html` (and `review/` if the user wants the trail). Reply with: what was built, the one-sentence answer, the titles in order, the scoreboard (round by round), decisions taken when agents disagreed, and every `[TBD]` or judgement-based number. No filler.

## 9. Editing an existing deck

Read it fully (`python -m markitdown` or python-pptx) and render it before touching it. If the user wants a judgement only, run Section 6 steps 1 to 4 on it without building. If they want it improved, keep what the agents mark as strengths (the partner playbook's "what not to touch" applies), rebuild the rest in this system, and save as a new file; never overwrite the original.
