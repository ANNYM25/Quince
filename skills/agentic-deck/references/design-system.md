# Design system: navy and blue, rounded, minimal but exhaustive

Derived from the user's council deck (`assets/exemplars/`) and the final Team G27 deck. Tokens live in `scripts/deck.js` (`C`, `TYPE`, `G`) and `scripts/html/components.js` (CSS variables). qa.py enforces the palette, font, rounded corners, type sizes and density.

## 1. The standard: minimal style, exhaustive content

The user's words: "minimalist but exhaustive, not too much whitespace." The council deck shows what that means in numbers:

| Measure | Council deck (core slides) | Target |
|---|---|---|
| Words per content slide | 160 to 310 | 150 to 300 (`exhaustive`), cap 320 |
| Longest text block | ~25 words | ≤ 32 words (qa.py fails above) |
| Shapes per slide | 45 to 100 | ≥ 30 on evidence slides |
| Distinct element types per slide | 3 to 5 (chart, bars, callout, logos, strip) | ≥ 3 |
| Empty horizontal band inside the content area | < 0.5 in | < 0.7 in (qa.py W check) |
| Accent colours | navy + one blue, grey for "the rest" | same |

**Minimal** governs styling: two colours plus grey, no gradients on content slides, no shadows, no eyebrow labels above titles, no decorative icons or glyphs, borders only to separate groups, three working type sizes.
**Exhaustive** governs content: every region of the slide carries evidence (a number, a chart, a logo, a source). If a region is empty, fill it with the next most useful evidence or tighten the layout; never pad with adjectives.

How the council deck does it (copy these moves):
- **Three headed panels** side by side, separated by thin vertical hairlines, not boxes. Each panel: bold head, grey sub saying what is shown and its source, then a chart or bars, then an insight callout at the bottom (`04-three-panel-charts-strip.jpg`).
- **A full-width strip** along the bottom carrying a fourth fact (budget split with brand logos and an insight).
- **Labelled bars instead of sentences**: label, bar to scale, bold value.
- **Insight callouts** in ice blue where the numbers are bold and blue; the sentence explains them.
- **Rows of real logos** where companies are named; a logo plus a one-line lesson replaces a paragraph about a competitor.
- **Journey and process rows** with icon circles joined by a line, stat chips, mechanism, arrow, and the fix (`16-journey-row-icons.jpg`).

## 2. Colour tokens

| Token | Hex | Use |
|---|---|---|
| NAVY | 0A1F44 | titles, hero numbers, dark panels, the "fix" pills |
| BLUE | 1D4ED8 | THE accent: the focal number, card, bar or segment |
| BLUE2 | 2563EB | chart series only |
| MID | 60A5FA | secondary bars, on-dark kicker |
| LT | BFDBFE | light bars, arrows, connector lines |
| PALE | DBEAFE | chips, light segments |
| ICE | EFF6FF | insight callouts, takeaway bar, SCQ strip |
| INK / BODY / MUTE | 0F172A / 334155 / 64748B | emphasis / body / captions and sources |
| GREY | 94A3B8 | "the rest" bars (never text on white: contrast fails) |
| LINE / BG | E2E8F0 / F8FAFC | hairlines and card borders / card fill |
| GREEN / AMBER / RED | 16A34A / D97706 / DC2626 | status only (pass / watch / fail), at most two per slide |
| RULE / ON_DARK / ON_DARK2 | 3B82F6 / C7D7F5 / AFC4EE | cover rule, cover subtitle, cover small lines |

User brand colours: add them to `brief.json` → `extra_colours`, and swap BLUE/NAVY in a copy of `deck.js` if the brand requires it.

## 3. Type

Inter only (install from the OS or fonts.google.com; LibreOffice renders it exactly). Sizes: title 24 bold navy · hero numbers 28 to 32 bold · head 13 bold · body 11 · caption 9.5 · source 8. qa.py counts the working sizes between 8.5 and 20pt and warns above three, as the partner asked.

## 4. Geometry (inches, 13.333 × 7.5)

| Element | Position |
|---|---|
| Content margins | x 0.55 to 12.78 (width 12.23) |
| Title | x 0.55, y 0.34, w 10.45, h 0.92, valign middle (≈ 56 chars a line, two lines max) |
| Logo / tag pill | logo centred x 11.62, y 0.8, max 0.85 × 0.26; pill x 12.2, y 0.66, 0.58 × 0.28 |
| Content band | y 1.42 to 6.88 |
| Footer | hairline y 7.0; source x 0.55, y 7.07, 8pt; "Team · page" right-aligned |
| Corner radius | 0.08 in default, 0.1 to 0.12 on large cards, fully round (h/2) on pills and bars |
| Gaps | 0.18 to 0.25 between stacked blocks, 0.2 between columns, panels 4.2 wide in thirds |

## 5. Cover and dark slides

The cover uses `assets/bg/cover.png` (from the council deck: deep navy, fine concentric arcs bottom right). Layout: white logo top left (x 0.6, y 0.63), tag text top right, title 50pt white at y 2.55, a 0.05 in blue rule (3B82F6) under it, subtitle 20pt in C7D7F5, two small italic lines at the bottom in AFC4EE. Dividers and the appendix opener use `assets/bg/divider.png` with an index of page numbers by topic. Content slides are always white.

## 6. Shapes: rounded only

Every filled or bordered rectangle uses `RR` / `card` / `pill` (roundRect). Bars are rounded. Lines, arrows and diamonds (milestones) are fine. qa.py check K fails any sharp-cornered filled or bordered rectangle larger than 0.12 in. In HTML every element with a background or border has a border-radius (render.js flags `sharp-corner`).

## 7. Logos

Real marks only, fetched by `scripts/fetch_logos.js` (Wikipedia infobox → Simple Icons → site icon) with the source logged. Sizes: in furniture 0.26 in tall; in rows and matrices 0.16 to 0.26 in tall depending on aspect ratio, inside a white rounded chip with a LINE border (the focal company gets a BLUE border). On dark slides use the `_white.png` variant. Never recolour, outline, stretch or redraw.

## 8. Icons

Flat, single-weight, one family per deck (default Lucide line, `Lu…`). Icons sit in circles: NAVY or BLUE fill with a white glyph for steps and levers; ICE fill with a BLUE glyph for list rows. Size 0.36 to 0.68 in. An icon labels something real; if removing it loses no information, it was decoration.

## 9. Charts

Native pptxgenjs charts styled with `D.chart` (Inter, no gridlines when axes are hidden, direct data labels, BLUE for the focal series, LT/MID for the rest). Horizontal comparisons use `hbars`. A plan is a process chart or a Gantt, never a table. Every axis has a unit or a definition. Ranges show as ranges (whisker or "29.5 to 33%"), not as a single point crowded by a target label.
