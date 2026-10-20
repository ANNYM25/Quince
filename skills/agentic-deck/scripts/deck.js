// Agentic Deck helpers (pptxgenjs, LAYOUT_WIDE 13.333 x 7.5 in)
// Blue consulting theme: Inter, navy titles, one blue accent, rounded corners only,
// sources on every slide, elements instead of paragraphs.
//
//   const D = require('./deck.js');
//   const deck = await D.newDeck({ title: 'Own the Second Purchase', tag: 'G27', logo: 'logo.png' });
//   D.cover(deck, { title, subtitle });
//   const { s, y0 } = D.slide(deck, 'Action title with a number', { source: 'Source: ...' });
//   let y = await D.statTiles(s, { y: y0, items: [...] });
//   await D.save(deck, 'out.pptx');
//
// Every pattern takes the slide and an options object and returns the y where it ends.
// Units are inches. Shapes are rounded by construction: there is no sharp-rect helper.

const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const JSZip = require('jszip');
let React, ReactDOMServer, sharp, lu;
try { React = require('react'); ReactDOMServer = require('react-dom/server'); sharp = require('sharp'); lu = require('react-icons/lu'); } catch (e) { /* icons optional */ }
// Flat icon sets by name prefix: Lu = Lucide line (default), Pi = Phosphor (PiXxxFill = filled), Tb = Tabler,
// Hi = Heroicons 2, Md = Material. One set per deck; filled and line icons never mix on a slide.
const ICON_SETS = { Lu: 'react-icons/lu', Pi: 'react-icons/pi', Tb: 'react-icons/tb', Hi: 'react-icons/hi2', Md: 'react-icons/md' };
function iconComponent(name) {
  const pkg = ICON_SETS[name.slice(0, 2)];
  if (!pkg) throw new Error(`icon ${name}: use a Lu, Pi, Tb, Hi or Md name from https://react-icons.github.io/react-icons/`);
  const set = require(pkg);
  if (!set[name]) throw new Error(`unknown icon ${name} in ${pkg}`);
  return set[name];
}

const ASSETS = path.join(__dirname, '..', 'assets');

// ---------------------------------------------------------------- tokens
const C = {
  NAVY: '0A1F44',   // titles, hero numbers, dark panels
  BLUE: '1D4ED8',   // THE accent: one number, one card, one bar per slide
  BLUE2: '2563EB',  // secondary accent (charts only)
  MID: '60A5FA',    // chart series 2, on-dark kicker
  LT: 'BFDBFE',     // light bars, arrows, "not yet" segments
  PALE: 'DBEAFE',   // chips, hover fills
  ICE: 'EFF6FF',    // takeaway bar, highlighted panel
  INK: '0F172A',    // body emphasis
  BODY: '334155',   // body text
  MUTE: '64748B',   // captions, sources, labels
  GREY: '94A3B8',   // neutral segments, enabler tags
  LINE: 'E2E8F0',   // hairlines, card borders
  BG: 'F8FAFC',     // card fill
  WHITE: 'FFFFFF',
  GREEN: '16A34A', AMBER: 'D97706', RED: 'DC2626', // status only, max two per slide
  RULE: '3B82F6', ON_DARK: 'C7D7F5', ON_DARK2: 'AFC4EE', // cover rule, subtitle, footer lines
};
const FONT = 'Inter';
// Three working sizes (head, body, caption) plus title, hero numbers and the source line. qa.py counts the middle band.
const TYPE = { title: 24, stat: 30, head: 13, body: 11, caption: 9.5, source: 8 };
const G = {
  W: 13.333, H: 7.5, L: 0.55, R: 12.78, CW: 12.23,
  titleY: 0.34, titleH: 0.92, titleW: 10.45, // ends 0.2 in left of the logo; 24pt Inter Bold fits ~56 chars a line (arrows, % and digits are wide)
  y0: 1.42, yMax: 6.88, footY: 7.0,
  radius: 0.08,
};

// ---------------------------------------------------------------- text metrics (same as qa.py)
const CHAR_W = 0.53; // average Inter glyph width as a fraction of the point size
function estLines(text, w, size) {
  const perLine = Math.max(1, Math.floor((w * 72) / (size * CHAR_W)));
  return String(text).split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
}
function textH(text, w, size, lead = 1.25) { return (estLines(text, w, size) * size * lead) / 72; }
function warn(msg) { console.warn('[deck] ' + msg); }

// ---------------------------------------------------------------- icons
const iconCache = {};
async function icon(name, color = C.WHITE) {
  if (!lu) throw new Error('icons need react, react-dom, react-icons and sharp (npm i in scripts/)');
  const k = name + color;
  if (iconCache[k]) return iconCache[k];
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(iconComponent(name), { color: '#' + color, size: 256, strokeWidth: 2 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return (iconCache[k] = 'image/png;base64,' + buf.toString('base64'));
}

// ---------------------------------------------------------------- deck
async function newDeck(o = {}) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = o.author || '';          // keep empty or neutral: metadata is read by judges
  pres.company = o.company || '';
  pres.title = o.title || 'Deck';
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  // zero-width lines must not draw a default border
  const _add = pres.addSlide.bind(pres);
  pres.addSlide = function (...a) {
    const s = _add(...a);
    const _shape = s.addShape.bind(s);
    s.addShape = function (type, opt) {
      if (opt && opt.line && opt.line.width === 0) {
        const c = opt.fill && opt.fill.color ? opt.fill.color : C.WHITE;
        opt = Object.assign({}, opt, { line: { color: c, width: 0.5 } });
      }
      return _shape(type, opt);
    };
    return s;
  };
  const deck = { pres, page: 0, tag: o.tag || '', footer: o.footer || o.tag || '', logo: o.logo || null, logoWhite: o.logoWhite || o.logo || null, sizes: {} };
  for (const f of [deck.logo, deck.logoWhite].filter(Boolean)) await imgSize(deck, f);
  return deck;
}
async function imgSize(deck, file) {
  if (deck.sizes[file]) return deck.sizes[file];
  if (!sharp) return (deck.sizes[file] = [4, 1]);
  const m = await sharp(file).metadata();
  return (deck.sizes[file] = [m.width, m.height]);
}
// Fit an image inside a box, centred. Use for logos (keep them small: maxH 0.26 to 0.45).
async function image(deck, s, file, cx, cy, maxW, maxH, o = {}) {
  const [w, h] = await imgSize(deck, file);
  const r = Math.min(maxW / w, maxH / h), W = w * r, H = h * r;
  const opt = { path: file, x: cx - W / 2, y: cy - H / 2, w: W, h: H };
  if (o.rounding) opt.rounding = true;
  if (o.name) opt.objectName = o.name;
  s.addImage(opt);
  return { x: opt.x, y: opt.y, w: W, h: H };
}

// ---------------------------------------------------------------- primitives
function T(s, text, o = {}) {
  s.addText(text, Object.assign({ fontFace: FONT, fontSize: TYPE.body, color: C.BODY, margin: 0, isTextBox: true, valign: 'top', fit: 'none' }, o));
}
// Rich runs: [{ text, bold, color, size, italic, breakLine }]
function runs(s, parts, o = {}) {
  const arr = parts.map((p) => ({ text: p.text, options: { bold: !!p.bold, italic: !!p.italic, color: p.color || o.color || C.BODY, fontSize: p.size || o.fontSize || TYPE.body, fontFace: FONT, breakLine: !!p.breakLine } }));
  s.addText(arr, Object.assign({ fontFace: FONT, margin: 0, isTextBox: true, valign: 'top', fit: 'none' }, o));
}
function RR(s, o) {
  const r = o.rectRadius !== undefined ? o.rectRadius : G.radius;
  s.addShape('roundRect', Object.assign({ line: { color: o.fill ? o.fill.color : C.WHITE, width: 0 } }, o, { rectRadius: Math.min(r, (o.h || 1) / 2, (o.w || 1) / 2) }));
}
function OV(s, o) { s.addShape('ellipse', Object.assign({ line: { color: o.fill ? o.fill.color : C.WHITE, width: 0 } }, o)); }
function LN(s, x, y, w, h, color = C.LINE, width = 0.75, extra = {}) {
  s.addShape('line', { x, y, w, h, line: Object.assign({ color, width }, extra) });
}
function arrow(s, x1, y1, x2, y2, color = C.LT, width = 1.5) {
  s.addShape('line', { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, line: { color, width, endArrowType: 'triangle' } });
}
// Pill: fully rounded chip ("G27", "PILOT", "Gate 1")
function pill(s, text, x, y, o = {}) {
  const size = o.size || TYPE.caption;
  const w = o.w || Math.max(0.5, (text.length * size * CHAR_W) / 72 + 0.3), h = o.h || 0.28;
  RR(s, { x, y, w, h, fill: { color: o.fill || C.NAVY }, rectRadius: h / 2 });
  T(s, text, { x, y, w, h, fontSize: size, bold: true, color: o.color || C.WHITE, align: 'center', valign: 'middle' });
  return w;
}
async function iconCircle(s, x, y, d, name, fill = C.BLUE, fg = C.WHITE) {
  OV(s, { x, y, w: d, h: d, fill: { color: fill } });
  const p = d * 0.24;
  s.addImage({ data: await icon(name, fg), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
}
function badge(s, x, y, n, fill = C.BLUE, d = 0.36) {
  OV(s, { x, y, w: d, h: d, fill: { color: fill } });
  T(s, String(n), { x, y, w: d, h: d, fontSize: d < 0.45 ? TYPE.body : TYPE.head, bold: true, color: C.WHITE, align: 'center', valign: 'middle' });
}
// Card: rounded panel with optional border; the default container for any group of content
function card(s, x, y, w, h, o = {}) {
  RR(s, { x, y, w, h, fill: { color: o.fill || C.BG }, line: o.border ? { color: o.border, width: o.borderW || 1 } : undefined, rectRadius: o.radius || 0.1 });
}

// ---------------------------------------------------------------- frames
function slide(deck, title, o = {}) {
  const s = deck.pres.addSlide();
  deck.page++;
  s.background = { color: C.WHITE };
  if (title.length > 110) warn(`S${deck.page} title is ${title.length} chars and will run to three lines: "${title}"`);
  else if (title.length > 58) warn(`S${deck.page} title is ${title.length} chars and probably wraps (qa.py measures it exactly): "${title}"`);
  T(s, title, { x: G.L, y: G.titleY, w: G.titleW, h: G.titleH, fontSize: TYPE.title, bold: true, color: C.NAVY, valign: 'middle', objectName: 'ad-title' });
  furniture(deck, s, false);
  s.addShape('line', { x: G.L, y: G.footY, w: G.CW, h: 0, line: { color: C.LINE, width: 0.75 }, objectName: 'ad-furn-rule' });
  if (o.source) T(s, o.source, { x: G.L, y: 7.07, w: 10.3, h: 0.28, fontSize: TYPE.source, color: C.MUTE, valign: 'middle', objectName: 'ad-source' });
  T(s, (deck.footer ? deck.footer + '  ·  ' : '') + deck.page, { x: 10.9, y: 7.07, w: 1.88, h: 0.28, fontSize: TYPE.source, color: C.MUTE, align: 'right', valign: 'middle', objectName: 'ad-furn-page' });
  if (o.notes) s.addNotes(o.notes);
  return { s, y0: G.y0, yMax: G.yMax };
}
function furniture(deck, s, dark) {
  const lg = dark ? deck.logoWhite : deck.logo;
  if (lg) {
    const [w, h] = deck.sizes[lg] || [4, 1];
    const r = Math.min(0.85 / w, 0.26 / h), W = w * r, H = h * r;
    s.addImage({ path: lg, x: (deck.tag ? 11.62 : 12.36) - W / 2, y: 0.8 - H / 2, w: W, h: H, objectName: 'ad-furn-logo' });
  }
  if (deck.tag) {
    RR(s, { x: 12.2, y: 0.66, w: 0.58, h: 0.28, fill: { color: dark ? C.WHITE : C.NAVY }, rectRadius: 0.14, objectName: 'ad-furn-pill' });
    T(s, deck.tag, { x: 12.2, y: 0.66, w: 0.58, h: 0.28, fontSize: 9.5, bold: true, color: dark ? C.NAVY : C.WHITE, align: 'center', valign: 'middle', objectName: 'ad-furn-tag' });
  }
}
function darkSlide(deck, bg) {
  const s = deck.pres.addSlide();
  deck.page++;
  const f = bg && fs.existsSync(bg) ? bg : path.join(ASSETS, 'bg', bg || 'cover.png');
  s.background = fs.existsSync(f) ? { path: f } : { color: C.NAVY };
  return s;
}
// Cover (from the council deck): deep-navy backdrop with fine arcs, white logo top left, tag top right,
// 50pt title with a blue rule under it, one subtitle line, two small italic context lines at the bottom.
function cover(deck, o) {
  const s = darkSlide(deck, o.bg || 'cover.png');
  if (deck.logoWhite) {
    const [w, h] = deck.sizes[deck.logoWhite] || [4, 1];
    const r = Math.min(1.3 / w, 0.39 / h);
    s.addImage({ path: deck.logoWhite, x: 0.6, y: 0.63, w: w * r, h: h * r, objectName: 'ad-furn-logo' });
  }
  if (o.tagText || deck.tag) T(s, o.tagText || deck.tag, { x: 10.8, y: 0.62, w: 2.0, h: 0.4, fontSize: 13, bold: true, color: C.WHITE, align: 'right', valign: 'middle' });
  T(s, o.title, { x: 0.7, y: 2.55, w: 11.5, h: 1.1, fontSize: o.titleSize || 50, bold: true, color: C.WHITE, valign: 'middle', objectName: 'ad-cover-title' });
  RR(s, { x: 0.72, y: 3.58, w: o.ruleW || 6.69, h: 0.05, fill: { color: C.RULE }, rectRadius: 0.025 });
  if (o.subtitle) T(s, o.subtitle, { x: 0.7, y: 3.75, w: 11.0, h: 0.95, fontSize: 20, color: C.ON_DARK });
  (o.lines || (o.footer ? [o.footer] : [])).slice(0, 2).forEach((l, i) => T(s, l, { x: 0.7, y: 6.35 + i * 0.33, w: 9.0, h: 0.3, fontSize: 11, italic: true, color: C.ON_DARK2 }));
  if (o.notes) s.addNotes(o.notes);
  return s;
}
// Divider / appendix opener: same backdrop family, big title, optional index of what follows
function divider(deck, o) {
  const s = darkSlide(deck, o.bg || 'divider.png');
  T(s, o.title, { x: 0.7, y: 0.9, w: 11, h: 1.0, fontSize: 40, bold: true, color: C.WHITE });
  if (o.sub) T(s, o.sub, { x: 0.7, y: 1.9, w: 11, h: 0.5, fontSize: 16, color: C.ON_DARK });
  (o.index || []).forEach((col, c) => {
    const cx = 0.7 + c * 3.25;
    T(s, col.head, { x: cx, y: 2.7, w: 3.0, h: 0.34, fontSize: 14, bold: true, color: C.WHITE });
    col.items.forEach(([n, t], k) => {
      T(s, String(n), { x: cx, y: 3.15 + k * 0.36, w: 0.32, h: 0.32, fontSize: 12, color: C.ON_DARK2, align: 'right', valign: 'middle' });
      T(s, t, { x: cx + 0.45, y: 3.15 + k * 0.36, w: 2.55, h: 0.32, fontSize: 12, color: C.WHITE, valign: 'middle' });
    });
  });
  return s;
}
function closing(deck, o) {
  const s = darkSlide(deck, o.bg || 'cover.png');
  T(s, o.title, { x: 0.7, y: 2.4, w: 11.5, h: 1.3, fontSize: 36, bold: true, color: C.WHITE, valign: 'bottom' });
  RR(s, { x: 0.72, y: 3.85, w: 4.5, h: 0.05, fill: { color: C.RULE }, rectRadius: 0.025 });
  if (o.sub) T(s, o.sub, { x: 0.7, y: 4.05, w: 11.5, h: 0.6, fontSize: 18, color: C.ON_DARK });
  return s;
}

// ---------------------------------------------------------------- patterns
// Situation / complication strip: the first thing on an executive summary
function scqStrip(s, o) {
  const x = o.x || G.L, w = o.w || G.CW, h = o.h || 0.62;
  RR(s, { x, y: o.y, w, h, fill: { color: C.ICE }, rectRadius: 0.1 });
  runs(s, [{ text: (o.lead || 'Situation') + '  ', bold: true, color: C.BLUE }, { text: o.text, color: C.INK }], { x: x + 0.22, y: o.y, w: w - 0.44, h, valign: 'middle', fontSize: o.size || TYPE.head });
  return o.y + h;
}

// Stat tiles: 2 to 5 hero numbers, each with a label and its basis. One accent.
function statTiles(s, o) {
  const items = o.items, n = items.length, gap = o.gap || 0.22, x0 = o.x || G.L, W = o.w || G.CW;
  const w = (W - gap * (n - 1)) / n, h = o.h || 1.45;
  items.forEach((it, i) => {
    const x = x0 + i * (w + gap), acc = !!it.accent;
    card(s, x, o.y, w, h, { fill: acc ? C.NAVY : C.BG });
    const vh = Math.min(0.62, h * 0.42), ly = o.y + 0.12 + vh, by = ly + 0.28, bh = o.y + h - by - 0.08;
    T(s, it.value, { x: x + 0.22, y: o.y + 0.12, w: w - 0.44, h: vh, fontSize: o.valueSize || TYPE.stat, bold: true, color: acc ? C.WHITE : C.NAVY, valign: 'middle' });
    T(s, it.label, { x: x + 0.22, y: ly, w: w - 0.44, h: 0.28, fontSize: TYPE.body, bold: true, color: acc ? C.WHITE : C.INK, valign: 'middle' });
    if (it.basis) T(s, it.basis, { x: x + 0.22, y: by, w: w - 0.44, h: Math.max(bh, 0.18), fontSize: TYPE.caption, color: acc ? C.LT : C.MUTE });
    if (it.basis && textH(it.basis, w - 0.44, TYPE.caption) > bh + 0.05) warn(`stat "${it.value}" basis too long for its tile`);
  });
  return o.y + h;
}

// Lever / option cards: icon, numbered title, two-line body, metric footer
async function leverCards(s, o) {
  const items = o.items, n = items.length, gap = o.gap || 0.25, x0 = o.x || G.L, W = o.w || G.CW;
  const w = (W - gap * (n - 1)) / n, h = o.h || 2.6;
  for (let i = 0; i < n; i++) {
    const it = items[i], x = x0 + i * (w + gap), acc = !!it.accent;
    card(s, x, o.y, w, h, { fill: C.WHITE, border: acc ? C.BLUE : C.LINE, borderW: acc ? 1.5 : 1 });
    if (it.icon) await iconCircle(s, x + 0.22, o.y + 0.22, 0.5, it.icon, acc ? C.BLUE : C.NAVY);
    else badge(s, x + 0.22, o.y + 0.22, i + 1, acc ? C.BLUE : C.NAVY, 0.5);
    T(s, it.title, { x: x + 0.86, y: o.y + 0.2, w: w - 1.06, h: 0.56, fontSize: TYPE.head, bold: true, color: C.NAVY, valign: 'middle' });
    const bodyH = it.bars ? 0.42 : h - 1.55;
    T(s, it.body, { x: x + 0.22, y: o.y + 0.9, w: w - 0.44, h: bodyH, fontSize: TYPE.body, color: C.BODY });
    if (textH(it.body, w - 0.44, TYPE.body) > bodyH + 0.05) warn(`card "${it.title}" body overflows; cut words`);
    if (it.bars) hbars(s, { x: x + 0.22, y: o.y + 1.36, w: w - 0.44, layout: 'inline', labelW: it.barLabelW || 1.35, rowH: 0.3, barH: 0.18, max: it.barMax, items: it.bars });
    if (it.metric) {
      RR(s, { x: x + 0.22, y: o.y + h - 0.56, w: w - 0.44, h: 0.38, fill: { color: acc ? C.ICE : C.BG }, rectRadius: 0.19 });
      T(s, it.metric, { x: x + 0.34, y: o.y + h - 0.56, w: w - 0.68, h: 0.38, fontSize: TYPE.body, bold: true, color: acc ? C.BLUE : C.NAVY, valign: 'middle' });
    }
  }
  return o.y + h;
}

// Process chart: rounded steps joined by arrows. Use instead of a table for any plan.
async function processChart(s, o) {
  const steps = o.steps, n = steps.length, gap = o.gap || 0.38, x0 = o.x || G.L, W = o.w || G.CW;
  const w = (W - gap * (n - 1)) / n, h = o.h || 1.9;
  for (let i = 0; i < n; i++) {
    const st = steps[i], x = x0 + i * (w + gap), acc = !!st.accent;
    card(s, x, o.y, w, h, { fill: acc ? C.NAVY : C.BG });
    if (st.when) pill(s, st.when, x + 0.18, o.y + 0.18, { fill: acc ? C.BLUE : C.PALE, color: acc ? C.WHITE : C.NAVY, h: 0.26 });
    if (st.icon) await iconCircle(s, x + w - 0.62, o.y + 0.14, 0.44, st.icon, acc ? C.BLUE : C.WHITE, acc ? C.WHITE : C.BLUE);
    T(s, st.title, { x: x + 0.18, y: o.y + 0.56, w: w - 0.36, h: 0.5, fontSize: TYPE.head, bold: true, color: acc ? C.WHITE : C.NAVY, valign: 'middle' });
    if (st.body) T(s, st.body, { x: x + 0.18, y: o.y + 1.06, w: w - 0.36, h: h - 1.14, fontSize: TYPE.caption, color: acc ? C.LT : C.BODY });
    if (st.body && textH(st.body, w - 0.36, TYPE.caption) > h - 1.14) warn(`step "${st.title}" body overflows`);
    if (i < n - 1) {
      const ax = x + w + 0.06, ay = o.y + h / 2;
      s.addShape('rightArrow', { x: ax, y: ay - 0.12, w: gap - 0.12, h: 0.24, fill: { color: C.LT }, line: { color: C.LT, width: 0 } });
    }
  }
  return o.y + h;
}

// Gantt: weeks across, rows down, rounded bars and diamond milestones
function gantt(s, o) {
  const x0 = o.x || G.L, labelW = o.labelW || 3.2, W = o.w || G.CW, weeks = o.weeks || 13;
  const gx0 = x0 + labelW, gw = W - labelW - (o.kpiW || 0), wk = gw / weeks, gx = (k) => gx0 + k * wk;
  const rh = o.rowH || 0.46, y0 = o.y;
  (o.phases || []).forEach(([label, a, b], i) => {
    RR(s, { x: gx(a) + 0.02, y: y0, w: gx(b) - gx(a) - 0.04, h: 0.28, fill: { color: [C.NAVY, C.BLUE, C.MID][i % 3] }, rectRadius: 0.14 });
    T(s, label, { x: gx(a), y: y0, w: gx(b) - gx(a), h: 0.28, fontSize: TYPE.caption, bold: true, color: C.WHITE, align: 'center', valign: 'middle' });
  });
  const ry = y0 + 0.42;
  for (let k = 0; k <= weeks; k++) LN(s, gx(k), ry, 0, o.rows.length * rh, k % 4 === 0 || k === weeks ? 'CBD5E1' : 'EEF2F7', 0.5);
  o.rows.forEach((r, i) => {
    const y = ry + i * rh;
    if (i % 2 === 0) RR(s, { x: x0, y, w: W, h: rh - 0.04, fill: { color: C.BG }, rectRadius: 0.06 });
    T(s, r.label, { x: x0 + 0.14, y, w: labelW - 0.24, h: rh - 0.04, fontSize: TYPE.caption, bold: true, color: C.NAVY, valign: 'middle' });
    (r.bars || []).forEach(([a, b, kind]) => RR(s, { x: gx(a) + 0.03, y: y + rh / 2 - 0.1, w: gx(b) - gx(a) - 0.06, h: 0.2, fill: { color: kind === 'live' ? C.LT : C.NAVY }, rectRadius: 0.1 }));
    (r.milestones || []).forEach(([k, label]) => {
      s.addShape('diamond', { x: gx(k) - 0.1, y: y + rh / 2 - 0.13, w: 0.2, h: 0.26, fill: { color: C.BLUE }, line: { color: C.WHITE, width: 0.75 } });
      if (label) T(s, label, { x: gx(k) + 0.12, y: y + 0.01, w: 1.6, h: 0.16, fontSize: TYPE.source, bold: true, color: C.BLUE });
    });
    if (r.kpi && o.kpiW) T(s, r.kpi, { x: gx(weeks) + 0.12, y, w: o.kpiW - 0.14, h: rh - 0.04, fontSize: TYPE.caption, bold: true, color: C.NAVY, valign: 'middle' });
  });
  return ry + o.rows.length * rh;
}

// Funnel: horizontal stages narrowing to scale, drop-off chips between them
function funnel(s, o) {
  const x0 = o.x || G.L, W = o.w || 7.5, max = o.stages[0].value, bh = o.barH || 0.5, gap = o.gap || 0.22;
  o.stages.forEach((st, i) => {
    const y = o.y + i * (bh + gap), w = Math.max(0.5, (W - 4.2) * (st.value / max)), acc = !!st.accent;
    const lab = st.display || st.value.toLocaleString('en-US'), lw = (lab.length * TYPE.body * CHAR_W) / 72 + 0.3;
    T(s, st.label, { x: x0, y, w: 2.2, h: bh, fontSize: TYPE.body, bold: true, color: C.INK, valign: 'middle' });
    RR(s, { x: x0 + 2.3, y, w, h: bh, fill: { color: acc ? C.BLUE : i === 0 ? C.NAVY : C.LT }, rectRadius: bh / 2 });
    const inside = w >= lw;
    T(s, lab, { x: inside ? x0 + 2.42 : x0 + 2.3 + w + 0.1, y, w: inside ? w - 0.2 : lw, h: bh, fontSize: TYPE.body, bold: true, color: inside && (acc || i === 0) ? C.WHITE : acc ? C.BLUE : C.NAVY, valign: 'middle' });
    if (st.drop) pill(s, st.drop, x0 + 2.3 + w + (inside ? 0.12 : lw + 0.15), y + bh / 2 - 0.13, { fill: C.ICE, color: C.BLUE, h: 0.26 });
  });
  return o.y + o.stages.length * (bh + gap) - gap;
}

// Budget bar: a total split into rounded segments to scale (e.g. rented vs owned)
function budgetBar(s, o) {
  const x0 = o.x || G.L, W = o.w || G.CW, h = o.h || 0.5, total = o.segments.reduce((a, b) => a + b.value, 0);
  if (o.label) T(s, o.label, { x: x0, y: o.y, w: W, h: 0.26, fontSize: TYPE.caption, bold: true, color: C.MUTE });
  const y = o.y + (o.label ? 0.32 : 0);
  let x = x0;
  const shorts = [];
  o.segments.forEach((sg) => {
    const w = (W * sg.value) / total;
    RR(s, { x: x + 0.02, y, w: w - 0.04, h, fill: { color: sg.fill || C.LT }, rectRadius: 0.1 });
    const dark = [C.NAVY, C.BLUE, C.BLUE2].includes(sg.fill);
    const lab = sg.label + (sg.display ? '  ' + sg.display : '');
    const fits = (t) => w > (t.length * TYPE.caption * CHAR_W) / 72 + 0.16;
    const col = dark ? C.WHITE : C.NAVY;
    if (fits(lab)) T(s, lab, { x: x + 0.08, y, w: w - 0.16, h, fontSize: TYPE.caption, bold: true, color: col, valign: 'middle', align: 'center' });
    else if (sg.display && h >= 0.42 && fits(sg.label) && fits(sg.display)) T(s, [{ text: sg.label, options: { breakLine: true } }, { text: sg.display }], { x: x + 0.04, y, w: w - 0.08, h, fontSize: TYPE.caption - 1, bold: true, color: col, valign: 'middle', align: 'center' });
    else shorts.push({ x, text: sg.short || (sg.label + ' ' + (sg.display || '')).trim() });
    x += w;
  });
  const cap = shorts.map((t) => t.text).join('  ·  '), need = (cap.length * TYPE.source * CHAR_W) / 72 + 0.2;
  const from = shorts.length ? shorts[0].x : x0 + W, room = x0 + W - from;
  const stack = need > room + 0.3, cw = stack ? Math.max(room, Math.max(...shorts.map((t) => t.text.length)) * TYPE.source * CHAR_W / 72 + 0.2) : Math.max(room, need);
  if (shorts.length) T(s, stack ? shorts.map((t) => t.text).join('\n') : cap, { x: x0 + W - cw, y: y + h + 0.04, w: cw, h: stack ? 0.36 : 0.22, fontSize: TYPE.source, bold: true, color: C.BLUE, align: 'right' });
  return y + h + 0.3;
}

// 2x2 / positioning matrix with labelled dots or logos. Axis labels must carry a unit.
async function matrix(deck, s, o) {
  const x0 = o.x, y0 = o.y, w = o.w, h = o.h;
  card(s, x0, y0, w, h, { fill: C.WHITE, border: C.LINE });
  LN(s, x0 + w / 2, y0 + 0.1, 0, h - 0.2, C.LINE, 0.75, { dashType: 'dash' });
  LN(s, x0 + 0.1, y0 + h / 2, w - 0.2, 0, C.LINE, 0.75, { dashType: 'dash' });
  T(s, o.xLabel, { x: x0, y: y0 + h + 0.06, w, h: 0.24, fontSize: TYPE.caption, color: C.MUTE, align: 'center' });
  T(s, o.yLabel, { x: x0 - 0.34, y: y0, w: 0.28, h, fontSize: TYPE.caption, color: C.MUTE, align: 'center', valign: 'middle', vert: 'vert270' });
  // place chips, clamp them inside the frame, then push apart any that overlap (logo matrices get crowded)
  const placed = [];
  for (const it of o.items) {
    let cw = 0.3, ih = 0.22, iw = 0.22;
    if (it.logo) {
      const [lw, lh] = await imgSize(deck, it.logo), ar = lw / lh;
      ih = ar > 6 ? 0.16 : ar > 3.5 ? 0.2 : 0.26; iw = Math.min(1.4, ih * ar); cw = iw + 0.3;
    } else cw = 0.3 + (it.label.length * TYPE.caption * CHAR_W) / 72;
    const cx = x0 + 0.2 + it.x * (w - 0.4), cy = y0 + h - 0.2 - it.y * (h - 0.4);
    placed.push({ it, cw, iw, ih, cx, cy });
  }
  const pad = 0.1;
  const clamp = (p) => { p.cx = Math.min(Math.max(p.cx, x0 + pad + p.cw / 2), x0 + w - pad - p.cw / 2); p.cy = Math.min(Math.max(p.cy, y0 + pad + 0.21), y0 + h - pad - 0.21); };
  placed.forEach(clamp);
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) {
      const A = placed[a], B = placed[b];
      const ox = (A.cw + B.cw) / 2 + 0.12 - Math.abs(A.cx - B.cx), oy = 0.42 + 0.06 - Math.abs(A.cy - B.cy);
      if (ox > 0 && oy > 0) {
        const dir = A.cx <= B.cx ? -1 : 1;
        A.cx += (dir * ox) / 2; B.cx -= (dir * ox) / 2; clamp(A); clamp(B); moved = true;
      }
    }
    if (!moved) break;
  }
  if (o.quadrants) {
    const q = o.quadrants, qs = { fontSize: TYPE.caption, color: C.MUTE, italic: true };
    if (q[0]) T(s, q[0], Object.assign({ x: x0 + 0.12, y: y0 + 0.08, w: w / 2 - 0.2, h: 0.22 }, qs));
    if (q[1]) T(s, q[1], Object.assign({ x: x0 + w / 2 + 0.08, y: y0 + 0.08, w: w / 2 - 0.2, h: 0.22, align: 'right' }, qs));
    if (q[2]) T(s, q[2], Object.assign({ x: x0 + 0.12, y: y0 + h - 0.3, w: w / 2 - 0.2, h: 0.22 }, qs));
    if (q[3]) T(s, q[3], Object.assign({ x: x0 + w / 2 + 0.08, y: y0 + h - 0.3, w: w / 2 - 0.2, h: 0.22, align: 'right' }, qs));
  }
  // the move: item.to = { x, y, label } draws a dashed target ring and an arrow from today to target
  for (const p of placed) {
    const to = p.it.to;
    if (!to) continue;
    const tx = x0 + 0.2 + to.x * (w - 0.4), ty = y0 + h - 0.2 - to.y * (h - 0.4);
    RR(s, { x: tx - p.cw / 2, y: ty - 0.21, w: p.cw, h: 0.42, fill: { color: C.ICE }, line: { color: C.BLUE, width: 1, dashType: 'dash' }, rectRadius: 0.21 });
    if (to.label) T(s, to.label, { x: tx - p.cw / 2, y: ty - 0.21, w: p.cw, h: 0.42, fontSize: TYPE.caption, bold: true, color: C.BLUE, align: 'center', valign: 'middle' });
    const dy = ty > p.cy ? -0.21 : 0.21;
    arrow(s, p.cx, p.cy - dy, tx, ty + dy, C.BLUE, 1.5);
  }
  for (const p of placed) {
    const it = p.it;
    if (it.logo) {
      card(s, p.cx - p.cw / 2, p.cy - 0.21, p.cw, 0.42, { fill: C.WHITE, border: it.accent ? C.BLUE : C.LINE, borderW: it.accent ? 1.5 : 0.75, radius: 0.21 });
      await image(deck, s, it.logo, p.cx, p.cy, p.iw, p.ih);
    } else {
      OV(s, { x: p.cx - 0.11, y: p.cy - 0.11, w: 0.22, h: 0.22, fill: { color: it.accent ? C.BLUE : C.GREY } });
      T(s, it.label, { x: p.cx + 0.16, y: p.cy - 0.12, w: p.cw, h: 0.24, fontSize: TYPE.caption, bold: !!it.accent, color: it.accent ? C.BLUE : C.BODY, valign: 'middle' });
    }
  }
  return y0 + h + 0.32;
}

// Icon list: icon circle, bold lead, one line of detail. 3 to 5 rows.
async function iconList(s, o) {
  const x = o.x || G.L, w = o.w || 6, rh = o.rowH || 0.78;
  for (let i = 0; i < o.items.length; i++) {
    const it = o.items[i], y = o.y + i * rh;
    await iconCircle(s, x, y + 0.06, 0.46, it.icon || 'LuCheck', it.accent ? C.BLUE : C.ICE, it.accent ? C.WHITE : C.BLUE);
    runs(s, [{ text: it.title, bold: true, color: C.NAVY, size: TYPE.head, breakLine: true }, { text: it.body || '', color: C.BODY, size: TYPE.body }], { x: x + 0.62, y, w: w - 0.62, h: rh - 0.06, valign: 'middle' });
  }
  return o.y + o.items.length * rh;
}

// Timeline: dots on a line, when / what / detail under each
function timeline(s, o) {
  const x0 = o.x || G.L, W = o.w || G.CW, n = o.items.length, step = W / n;
  LN(s, x0 + step / 2, o.y + 0.17, W - step, 0, C.LT, 2);
  o.items.forEach((it, i) => {
    const cx = x0 + step * (i + 0.5);
    OV(s, { x: cx - 0.17, y: o.y, w: 0.34, h: 0.34, fill: { color: it.accent ? C.BLUE : C.NAVY } });
    T(s, it.when, { x: cx - step / 2 + 0.05, y: o.y + 0.44, w: step - 0.1, h: 0.26, fontSize: TYPE.caption, bold: true, color: C.BLUE, align: 'center' });
    T(s, it.title, { x: cx - step / 2 + 0.05, y: o.y + 0.72, w: step - 0.1, h: 0.5, fontSize: TYPE.head, bold: true, color: C.NAVY, align: 'center' });
    if (it.body) T(s, it.body, { x: cx - step / 2 + 0.1, y: o.y + 1.22, w: step - 0.2, h: 0.7, fontSize: TYPE.caption, color: C.BODY, align: 'center' });
  });
  return o.y + (o.items.some((i) => i.body) ? 1.95 : 1.25);
}

// Decision cards (scale / adjust / stop, or gates): coloured border, optional icon, condition, action. Returns a Promise of y.
function decisionCards(s, o) {
  const pending = [];
  const n = o.items.length, gap = 0.2, x0 = o.x || G.L, W = o.w || G.CW, w = (W - gap * (n - 1)) / n, h = o.h || 1.1;
  o.items.forEach((it, i) => {
    const x = x0 + i * (w + gap), col = it.color || [C.BLUE, C.NAVY, C.MUTE][i % 3];
    card(s, x, o.y, w, h, { fill: C.WHITE, border: col, borderW: 1.25 });
    const ix = it.icon ? 0.52 : 0;
    runs(s, [{ text: it.head + '  ', bold: true, color: col, size: TYPE.body }, { text: it.when, color: C.INK, size: TYPE.body, breakLine: true }, { text: it.then, bold: true, color: C.NAVY, size: TYPE.body }], { x: x + 0.16 + ix, y: o.y, w: w - 0.3 - ix, h, valign: 'middle' });
    if (it.icon) pending.push(iconCircle(s, x + 0.16, o.y + h / 2 - 0.19, 0.38, it.icon, col));
  });
  return Promise.all(pending).then(() => o.y + h);
}

// Logo row: small, evenly spaced, greyscale-neutral
async function logoRow(deck, s, o) {
  const x0 = o.x || G.L, W = o.w || G.CW, n = o.files.length, step = W / n, h = o.h || 0.32;
  for (let i = 0; i < n; i++) await image(deck, s, o.files[i], x0 + step * (i + 0.5), o.y + h / 2, Math.max(0.3, Math.min(step - 0.12, 1.3)), h);
  return o.y + h;
}

// Screenshot with numbered callouts (for evidence / appendix slides)
async function screenshot(deck, s, o) {
  card(s, o.x - 0.06, o.y - 0.06, o.w + 0.12, o.h + 0.12, { fill: C.WHITE, border: C.LINE });
  const r = await image(deck, s, o.path, o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
  (o.callouts || []).forEach((c, i) => badge(s, r.x + c.x * r.w - 0.15, r.y + c.y * r.h - 0.15, c.n || i + 1, C.BLUE, 0.3));
  return o.y + o.h + 0.06;
}

// ---------------------------------------------------------------- dense patterns (council deck)
// Headed panel: bold head + grey sub (what it shows and the source), no box. Returns the content y.
// Separate side-by-side panels with vline(); put a box only around a bottom strip or a callout.
function panel(s, o) {
  T(s, o.head, { x: o.x, y: o.y, w: o.w, h: 0.3, fontSize: TYPE.head, bold: true, color: C.NAVY, valign: 'middle' });
  if (o.sub) T(s, o.sub, { x: o.x, y: o.y + 0.32, w: o.w, h: 0.24, fontSize: TYPE.caption, color: C.MUTE, valign: 'middle' });
  return o.y + (o.sub ? 0.66 : 0.4);
}
function vline(s, x, y, h, color = C.LINE) { LN(s, x, y, 0, h, color, 0.75); }

// Labelled horizontal bars: label above (or left), rounded bar to scale, bold value at the end.
// items: [{ label, value, display, accent, muted }]. layout: 'stacked' (label above) | 'inline' (label left)
function hbars(s, o) {
  const max = o.max || Math.max(...o.items.map((i) => i.value)), inline = o.layout === 'inline';
  const lw = inline ? (o.labelW || 1.3) : 0;
  const vw = o.valueW || Math.max(0.6, ...o.items.map((i) => (String(i.display || i.value).length * TYPE.body * CHAR_W) / 72 + 0.12));
  const bw = o.w - lw - vw - 0.08, rowH = o.rowH || (inline ? 0.34 : 0.52), bh = o.barH || 0.22;
  o.items.forEach((it, i) => {
    const y = o.y + i * rowH, by = inline ? y + (rowH - bh) / 2 : y + rowH - bh - 0.06;
    T(s, it.label, inline ? { x: o.x, y, w: lw - 0.1, h: rowH, fontSize: TYPE.body, color: C.INK, valign: 'middle' } : { x: o.x, y, w: o.w, h: rowH - bh - 0.1, fontSize: TYPE.body, color: C.INK, valign: 'bottom' });
    const w = Math.max(0.15, (bw * it.value) / max);
    RR(s, { x: o.x + lw, y: by, w, h: bh, fill: { color: it.color || (it.accent ? C.BLUE : it.muted ? C.GREY : C.MID) }, rectRadius: 0.04 });
    T(s, it.display || String(it.value), { x: o.x + lw + w + 0.08, y: by - 0.02, w: vw, h: bh + 0.04, fontSize: TYPE.body, bold: true, color: C.NAVY, valign: 'middle' });
  });
  return o.y + o.items.length * rowH;
}

// Insight callout: ICE box, one or two sentences; numbers are auto-bolded in blue at a larger size.
function insight(s, text, o) {
  RR(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: { color: o.fill || C.ICE }, rectRadius: 0.08 });
  const parts = String(text).split(/((?:[~$≈+−-]?\d[\d,.]*\s?(?:%|x|×|M|B|K|pts?)?(?:\s?(?:→|to)\s?[~$]?\d[\d,.]*\s?(?:%|x|M|B|K)?)?))/);
  const big = o.numSize || TYPE.head;
  runs(s, parts.filter((p) => p !== '').map((p) => /\d/.test(p) && /^[~$≈+−-]?\d/.test(p) ? { text: p, bold: true, color: C.BLUE, size: big } : { text: p, color: C.INK, size: o.size || TYPE.body }),
    { x: o.x + 0.16, y: o.y, w: o.w - 0.32, h: o.h, valign: 'middle' });
  return o.y + o.h;
}

// Journey row (council slide 16): icon circles on a line, stat chip, mechanism, arrow, the fix as a navy pill
async function journey(s, o) {
  const n = o.steps.length, x0 = o.x || G.L, W = o.w || G.CW, step = W / n, cw = step - 0.18, y = o.y;
  const mech = o.steps.some((st) => st.mech), natural = mech ? 3.38 : 2.76;
  const e = Math.max(0, ((o.h || natural) - natural) / 4); // extra height spread over four gaps
  const chipH = 0.6 + e * 0.5, pillH = 0.5 + e * 0.5;
  const yT = y + 0.76, yC = yT + 0.42 + e * 0.5, yM = yC + chipH + 0.12 + e * 0.25, yA = (mech ? yM + 0.62 : yC + chipH + 0.12) + e * 0.25;
  LN(s, x0 + step / 2, y + 0.34, W - step, 0, C.LT, 2);
  for (let i = 0; i < n; i++) {
    const st = o.steps[i], cx = x0 + step * (i + 0.5), x = cx - cw / 2;
    await iconCircle(s, cx - 0.34, y, 0.68, st.icon, st.accent ? C.BLUE : C.NAVY);
    T(s, st.title, { x, y: yT, w: cw, h: 0.3, fontSize: TYPE.head, bold: true, color: C.INK, align: 'center', valign: 'middle' });
    RR(s, { x, y: yC, w: cw, h: chipH, fill: { color: C.ICE }, rectRadius: 0.08 });
    T(s, st.stat, { x: x + 0.06, y: yC, w: cw - 0.12, h: chipH, fontSize: TYPE.body, bold: true, color: C.BLUE, align: 'center', valign: 'middle' });
    if (st.mech) T(s, st.mech, { x, y: yM, w: cw, h: 0.5, fontSize: TYPE.body, color: C.BODY, align: 'center', valign: 'middle' });
    s.addShape('downArrow', { x: cx - 0.1, y: yA, w: 0.2, h: 0.26, fill: { color: C.LT }, line: { color: C.LT, width: 0 } });
    RR(s, { x, y: yA + 0.36, w: cw, h: pillH, fill: { color: C.NAVY }, rectRadius: 0.08 });
    T(s, st.fix, { x: x + 0.05, y: yA + 0.36, w: cw - 0.1, h: pillH, fontSize: TYPE.body, bold: true, color: C.WHITE, align: 'center', valign: 'middle' });
  }
  return yA + 0.36 + pillH;
}

// Full-width strip (council slide 4 bottom): a boxed band with a label on the left and any content to its right
function strip(s, o) {
  card(s, G.L, o.y, G.CW, o.h, { fill: C.BG, border: C.LINE, radius: 0.12 });
  T(s, o.head, { x: G.L + 0.2, y: o.y, w: (o.labelW || 1.9) - 0.2, h: o.h, fontSize: TYPE.head, bold: true, color: C.NAVY, valign: 'middle' });
  return { x: G.L + (o.labelW || 1.9) + 0.1, y: o.y + 0.12, w: G.CW - (o.labelW || 1.9) - 0.3, h: o.h - 0.24 };
}

// Takeaway bar: one sentence the presenter points at. Optional, one per slide.
async function takeaway(s, text, y = 6.3) {
  RR(s, { x: G.L, y, w: G.CW, h: 0.56, fill: { color: C.ICE }, rectRadius: 0.12 });
  if (lu) await iconCircle(s, G.L + 0.14, y + 0.1, 0.36, 'LuArrowRight', C.BLUE);
  T(s, text, { x: G.L + 0.66, y, w: G.CW - 0.86, h: 0.56, fontSize: TYPE.head, bold: true, color: C.NAVY, valign: 'middle' });
  return y + 0.56;
}

// Native chart styled for the theme. type: 'bar' | 'line' | 'doughnut' | 'pie'
function chart(deck, s, type, data, o) {
  const base = {
    x: o.x, y: o.y, w: o.w, h: o.h,
    chartColors: o.colors || [C.BLUE, C.LT, C.NAVY, C.MID, C.GREY],
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT, dataLabelFontFace: FONT, legendFontFace: FONT, titleFontFace: FONT,
    catAxisLabelColor: C.MUTE, valAxisLabelColor: C.MUTE, catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
    valGridLine: o.hideAxis ? { style: 'none' } : { color: 'EEF2F7', size: 0.5 }, catGridLine: { style: 'none' },
    catAxisLineShow: false, valAxisLineShow: false, valAxisHidden: !!o.hideAxis,
    showValue: o.showValue !== false, dataLabelColor: C.NAVY, dataLabelFontSize: 10, dataLabelFontBold: true,
    showLegend: !!o.legend, legendPos: 'b', legendFontSize: 9, legendColor: C.MUTE,
    barGapWidthPct: 60, barDir: o.horizontal ? 'bar' : 'col',
  };
  if (type === 'doughnut') Object.assign(base, { holeSize: 62, showPercent: false, showValue: false, showLegend: o.legend !== false, dataLabelColor: C.WHITE });
  s.addChart(deck.pres.charts[type.toUpperCase()], data, Object.assign(base, o.extra || {}));
  return o.y + o.h;
}

// Hybrid: build one element with the HTML/React components and place it as a crisp PNG.
// Use for elements pptxgenjs draws poorly (donuts with centre labels, custom SVG charts, dense flows).
async function htmlElement(s, el, o) {
  const R = require('./html/render.js');
  s.addImage({ data: await R.elementPNG(el, o.w, o.h), x: o.x, y: o.y, w: o.w, h: o.h, objectName: 'ad-html-' + (o.name || 'element') });
  return o.y + o.h;
}

// ---------------------------------------------------------------- save + post-process
async function save(deck, file) {
  try { require.resolve('./html/render.js'); await require('./html/render.js').close(); } catch (e) { /* no html */ }
  await deck.pres.writeFile({ fileName: file });
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const n of Object.keys(zip.files).filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n))) {
    const xml = await zip.file(n).async('string');
    const declared = new Set([...xml.matchAll(/<c:(?:catAx|valAx|dateAx|serAx)>\s*<c:axId val="(\d+)"\/>/g)].map((m) => m[1]));
    zip.file(n, xml.replace(/<c:axId val="(\d+)"\/>/g, (w, id, off) => {
      const b = xml.lastIndexOf('<c:', off);
      if (/^<c:(catAx|valAx|dateAx|serAx)>/.test(xml.slice(b, off))) return w;
      return declared.has(id) ? w : '';
    }));
  }
  for (const n of Object.keys(zip.files).filter((n) => /^ppt\/(slides|slideLayouts|slideMasters|notesSlides|notesMasters)\/[^/]+\.xml$/.test(n))) {
    const xml = await zip.file(n).async('string');
    let i = 1;
    zip.file(n, xml.replace(/(<p:cNvPr id=")(\d+)(")/g, (w, a, id, b) => a + i++ + b));
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('[deck] wrote', file, deck.page, 'slides');
}

module.exports = {
  C, FONT, TYPE, G, estLines, textH, icon, newDeck, image, T, runs, RR, OV, LN, arrow, pill, iconCircle, badge, card,
  slide, cover, divider, closing, scqStrip, statTiles, leverCards, processChart, gantt, funnel, budgetBar, matrix,
  iconList, timeline, decisionCards, logoRow, screenshot, takeaway, chart, htmlElement, save,
  panel, vline, hbars, insight, journey, strip,
};
