# HTML / React path

Use it when the user wants a web deck, animations, custom visuals (SVG flows, donuts with centre labels, rich layouts), or when flexbox makes a dense layout easier than absolute coordinates. Same tokens and patterns as the PPTX path; output can still be a PDF and a (picture) PPTX.

## How it works

1. A spec file exports one React element: `h(Deck, { title, tag, footer, logo, logoWhite }, h(Cover, ...), h(Slide, ...), ...)`. Components are server-rendered with `react-dom/server`, so there is no bundler and no JSX build step (`h = React.createElement`).
2. `node scripts/html/render.js spec.js out/` renders every slide at 1280 × 720 CSS px with Playwright Chromium and writes:
   - `deck.html`: self-contained viewer (images inlined; ← → keys, click halves, `#n` deep links, print to PDF).
   - `slides/NN.png` (2×), `deck.pdf` (vector, 13.333 × 7.5 in), `deck.pptx` (one image per slide plus speaker notes from `notes`).
   - `qa_html.json`: real-layout QA: overflow, off-slide elements, sharp corners, em/en dashes, decorative glyphs, titles over two lines. Exit code 1 on failures.
   Flags `--png --pdf --pptx --viewer` limit the outputs.
3. Build the review pack from the HTML output: `python3 scripts/review_pack.py --html out/ review/rN` (slide images from `deck.pdf`, text and titles from `text.json`, issues from `qa_html.json` plus the whitespace scan).

## Writing slides

```js
const { h, Deck, Cover, Slide, Row, Col, Card, SCQ, LeverCards, StatTiles, Process, Decision, Takeaway, Bars, Donut, Funnel, Matrix } = require(SKILL + '/scripts/html/components.js');
module.exports = h(Deck, { title: 'Deck', tag: 'G27', logo: 'logos/quince.png', logoWhite: 'logos/quince_white.png' },
  h(Cover, { title, subtitle, lines: ['context line', 'event · track · month'] }),
  h(Slide, { title: 'Action title with the number', source: 'Source: ...', notes: 'What to say' },
    h(SCQ, { lead: 'Why now' }, 'Situation and complication with numbers.'),
    h(LeverCards, { items: [...] }),
    h(StatTiles, { items: [...] })));
```
- `.body` is a flex column with 18px gaps; wrap groups in `Row`/`Col` and give the main group `grow: true` so the slide fills without dead bands.
- Custom elements: write a small component with inline styles that use the CSS variables (`var(--navy)`, `var(--blue)`, `var(--ice)`, `var(--r)` for radius). Every box needs a border-radius.
- Images (logos, screenshots) use relative paths from the spec file; render.js inlines them.
- Icons: `h(Icon, { name: 'LuRocket' })` or any `Pi…`, `Tb…`, `Hi…`, `Md…` name.
- Animations for a live web deck: CSS transitions on `.slide.on` children are fine in `deck.html`; they do not appear in PNG, PDF or PPTX.

## Hybrid (best of both)

Keep the deck in PPTX (editable text, native charts) and render only the hard element in HTML:
```js
const { h, Donut } = require(SKILL + '/scripts/html/components.js');
await D.htmlElement(s, h(Donut, { value: 28, label: 'engaged repeat' }), { x: 9, y: 2, w: 2.2, h: 2.2 });
```
The element is screenshotted with a transparent background at 3× and placed as a picture.

## Limits

The image PPTX from the HTML path is not editable; say so at delivery, and prefer the PPTX path when the user will edit in PowerPoint or Google Slides. Fonts: Inter must be installed locally or reachable on Google Fonts at render time.
