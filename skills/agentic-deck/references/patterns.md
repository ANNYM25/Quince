# Patterns: helper API and when to use each

`scripts/deck.js` (PPTX) and `scripts/html/components.js` (HTML) share the same tokens and patterns. Units are inches in PPTX and CSS px (96/in) in HTML. Every PPTX pattern returns the y where it ends; chain them (`y = D.statTiles(s, { y: y + 0.18, ... })`) and never hardcode the second pattern's position. Patterns marked `async` must be awaited (they draw icons or logos).

## Deck and frames

| Call | Notes |
|---|---|
| `await D.newDeck({ title, tag, footer, logo, logoWhite, author })` | LAYOUT_WIDE, Inter, zero-width-line patch, logo sizes cached. `author` stays empty unless asked |
| `D.slide(deck, title, { source, notes })` → `{ s, y0, yMax }` | White content slide: title (`ad-title`), logo + tag pill, footer rule, source line, page. Warns over 70 chars |
| `D.cover(deck, { title, subtitle, lines: [two italic lines], tagText, bg })` | Council cover (`01-cover.jpg`) |
| `D.divider(deck, { title, sub, index: [{ head, items: [[page, label]] }] })` | Appendix opener with page index by topic |
| `D.closing(deck, { title, sub })` | Repeats the governing thought |
| `await D.save(deck, file)` | Writes, fixes chart axis ids and shape ids |

## Primitives

`D.T(s, text, opts)` text box (Inter, zero margin) · `D.runs(s, [{ text, bold, color, size, breakLine }], box)` mixed styling · `D.RR(s, opts)` rounded rect · `D.card(s, x, y, w, h, { fill, border, radius })` · `D.pill(s, text, x, y, { fill, color, h })` returns width · `D.OV` ellipse · `D.LN` line · `D.vline(s, x, y, h)` panel divider · `D.arrow(s, x1, y1, x2, y2)` · `await D.iconCircle(s, x, y, d, 'LuName', fill, fg)` · `D.badge(s, x, y, n)` · `await D.image(deck, s, file, cx, cy, maxW, maxH)` fit-in-box · `D.estLines / D.textH` wrap estimate (same metric as qa.py).

## Content patterns

| Pattern | Call | Use when | Exemplar |
|---|---|---|---|
| SCQ strip | `scqStrip(s, { y, lead, text })` | First block of the exec summary: situation and complication with numbers | 02 |
| Lever cards | `await leverCards(s, { y, h, items: [{ icon, title, body, metric, accent, bars: [{ label, value, display, accent, muted }], barMax, barLabelW }] })` | 2 to 4 levers, each proven with mini labelled bars (use one `barMax` across cards so lengths compare) and a metric pill | 02 |
| Stat tiles | `statTiles(s, { y, h, items: [{ value, label, basis, accent }] })` | 2 to 5 hero numbers with their basis; one accent | 02, 03 |
| Headed panel | `panel(s, { x, y, w, head, sub })` → content y | Each third of a dense evidence slide; separate with `vline` | 04 |
| Labelled bars | `hbars(s, { x, y, w, items: [{ label, value, display, accent, muted, color }], layout: 'stacked' or 'inline', labelW, rowH, max })` | Any comparison; replaces sentences | 04, 21 |
| Native chart | `chart(deck, s, 'bar' or 'line' or 'doughnut', data, { x, y, w, h, colors, hideAxis, horizontal, extra })` | Funnels by step, trends, splits; editable data | 04 |
| Insight callout | `insight(s, text, { x, y, w, h, fill, size, numSize })` | Under each panel: the sentence that reads the chart; numbers auto-bold blue | 04 |
| Full-width strip | `strip(s, { y, h, head, labelW })` → inner box | A fourth fact along the bottom (budget split, scope) | 04 |
| Budget bar | `budgetBar(s, { x, y, w, h, label, segments: [{ label, display, value, fill, short }] })` | A total split to scale; narrow segments get one shared caption | 04, 21 |
| Funnel | `funnel(s, { y, w, stages: [{ label, value, display, drop, accent }] })` | Conversion steps with drop-off chips | |
| Matrix | `await matrix(deck, s, { x, y, w, h, xLabel, yLabel, quadrants: [tl, tr, bl, br], items: [{ logo or label, x, y, accent, to: { x, y, label } }] })` | Positioning with real logos; chips are clamped inside the frame and pushed apart; `to` draws the move (dashed target + arrow), which is how a matrix shows strategy rather than just position | 05 |
| Icon list | `await iconList(s, { x, y, w, rowH, items: [{ icon, title, body, accent }] })` | 3 to 5 reasons, risks, facts | 03 |
| Journey row | `await journey(s, { y, h, steps: [{ icon, title, stat, mech, fix, accent }] })` | Customer journey: stage → evidence → mechanism → our fix | 16 |
| Process chart | `await processChart(s, { y, h, steps: [{ when, icon, title, body, accent }] })` | Any plan or sequence; never a table | 07 |
| Gantt | `gantt(s, { y, weeks, phases: [[label, a, b]], rows: [{ label, bars: [[a, b, 'build' or 'live']], milestones: [[week, label]], kpi }], kpiW })` | Week-level plan with milestones and KPIs | 07 |
| Timeline | `timeline(s, { y, items: [{ when, title, body, accent }] })` | Months or phases on one line | |
| Decision cards | `await decisionCards(s, { y, h, items: [{ head, icon, when, then, color }] })` | Scale / adjust / stop; gates | 07 |
| Logo row | `await logoRow(deck, s, { x, y, w, h, files })` | Channels, competitors, partners | 04 |
| Screenshot | `await screenshot(deck, s, { path, x, y, w, h, callouts: [{ x, y, n }] })` | Tool evidence with numbered callouts (appendix) | |
| Takeaway | `await takeaway(s, text, y)` | The focal sentence; one per slide at most | 05, 16 |
| HTML element | `await htmlElement(s, reactEl, { x, y, w, h })` | Anything pptxgenjs draws poorly | |

## Slide recipes (council density)

- **Executive summary:** `scqStrip` → `leverCards` (3, middle accented) → `statTiles` (result in the case's metrics) → a row of constraint pills ("Same $120M", "No discounts"). ~170 words.
- **Evidence slide (market, customer):** three `panel`s with `vline`s, each panel = chart or `hbars` + `insight`; bottom `strip` with `budgetBar` + `logoRow` + `insight`. 200 to 280 words.
- **Competition:** `panel` + `matrix` with real logos on the left; `panel` + `hbars` ("what a rival can copy, and how fast") + three logo-led lesson cards on the right; `takeaway`.
- **Journey / mechanism:** `journey` (7 stages) + `takeaway`.
- **Plan / next steps:** `processChart` (4 phases, last accented as the gate) → pass marks as `statTiles` → `decisionCards`. Or `gantt` with KPI column + `decisionCards`.
- **Appendix opener:** `divider` with an index of page numbers by topic.

## HTML components (same names)

`Deck`, `Cover`, `Divider`, `Slide`, `Row`, `Col`, `Card` (`variant`: white, accent, ring), `Pill`, `Label`, `SCQ`, `Takeaway`, `StatTiles`, `LeverCards`, `Process`, `Funnel`, `Bars` (SVG columns), `Donut`, `Matrix`, `IconList`, `Timeline`, `Decision`, `LogoRow`, `Quote`, `Icon`, `Backdrop`. Layout is flexbox: `Row`/`Col` with `grow` fill the body so nothing leaves dead space. See `html-react.md`.
