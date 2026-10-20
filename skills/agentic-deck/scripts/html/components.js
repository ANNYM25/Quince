// Agentic Deck · HTML/React slide components (server-rendered, no build step).
// Slides are 1280 x 720 CSS px (13.333 x 7.5 in at 96 dpi), same grid as deck.js.
//
//   const { h, Deck, Cover, Slide, StatTiles, ... } = require('<skill>/scripts/html/components.js');
//   module.exports = h(Deck, { title: 'Own the Second Purchase', tag: 'G27' },
//     h(Cover, { title: '...', subtitle: '...' }),
//     h(Slide, { title: 'Action title with a number', source: 'Source: ...' },
//       h(StatTiles, { items: [...] })));
//
// Every component uses the CSS tokens in STYLE. Everything has rounded corners.

const React = require('react');
const h = React.createElement;
let lu = {};
try { lu = require('react-icons/lu'); } catch (e) { /* icons optional */ }
const SETS = { Lu: 'react-icons/lu', Pi: 'react-icons/pi', Tb: 'react-icons/tb', Hi: 'react-icons/hi2', Md: 'react-icons/md' };
function iconOf(name) { try { return require(SETS[name.slice(0, 2)])[name]; } catch (e) { return null; } }

const C = {
  NAVY: '#0A1F44', BLUE: '#1D4ED8', BLUE2: '#2563EB', MID: '#60A5FA', LT: '#BFDBFE', PALE: '#DBEAFE', ICE: '#EFF6FF',
  INK: '#0F172A', BODY: '#334155', MUTE: '#64748B', GREY: '#94A3B8', LINE: '#E2E8F0', BG: '#F8FAFC', WHITE: '#FFFFFF',
  GREEN: '#16A34A', AMBER: '#D97706', RED: '#DC2626',
};

const STYLE = `
:root{--navy:${C.NAVY};--blue:${C.BLUE};--mid:${C.MID};--lt:${C.LT};--pale:${C.PALE};--ice:${C.ICE};--ink:${C.INK};--body:${C.BODY};--mute:${C.MUTE};--grey:${C.GREY};--line:${C.LINE};--bg:${C.BG};--r:14px;--r-sm:10px}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,"Inter Variable",system-ui,sans-serif;color:var(--body);background:#E5E7EB;-webkit-font-smoothing:antialiased}
.slide{position:relative;width:1280px;height:720px;overflow:hidden;background:#fff;page-break-after:always;break-after:page}
.slide.dark{background:linear-gradient(135deg,#0A1F44 0%,#132E66 55%,#1D4ED8 130%);color:#fff}
.title{position:absolute;left:53px;top:33px;width:980px;height:88px;display:flex;align-items:center;font-size:30px;line-height:1.2;font-weight:700;color:var(--navy);letter-spacing:-.01em}
.furn{position:absolute;top:63px;right:48px;display:flex;align-items:center;gap:14px}
.furn img{max-height:25px;max-width:82px}
.tag{height:27px;padding:0 13px;border-radius:999px;background:var(--navy);color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center}
.dark .tag{background:#fff;color:var(--navy)}
.body{position:absolute;left:53px;right:53px;top:136px;bottom:62px;display:flex;flex-direction:column;gap:18px}
.foot{position:absolute;left:53px;right:53px;bottom:0;height:52px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:var(--mute)}
.row{display:flex;gap:20px;min-height:0}.col{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0}
.grow{flex:1}
.card{background:var(--bg);border-radius:var(--r);padding:18px 20px;min-width:0}
.card.white{background:#fff;border:1px solid var(--line)}.card.accent{background:var(--navy);color:#fff}.card.ring{background:#fff;border:2px solid var(--blue)}
.h{font-weight:700;color:var(--navy);font-size:17px;line-height:1.25}.accent .h{color:#fff}
.p{font-size:14px;line-height:1.45}.small{font-size:12px;line-height:1.4;color:var(--mute)}.accent .small{color:var(--lt)}
.label{font-size:12px;font-weight:700;color:var(--mute)}
.stat{font-size:42px;font-weight:800;color:var(--navy);letter-spacing:-.02em;line-height:1}.accent .stat{color:#fff}
.pill{display:inline-flex;align-items:center;height:26px;padding:0 12px;border-radius:999px;font-size:11.5px;font-weight:700;background:var(--pale);color:var(--navy);white-space:nowrap}
.pill.blue{background:var(--blue);color:#fff}.pill.ice{background:var(--ice);color:var(--blue)}
.ic{display:flex;align-items:center;justify-content:center;border-radius:999px;flex:none}
.take{display:flex;align-items:center;gap:14px;background:var(--ice);border-radius:16px;padding:12px 18px;font-size:17px;font-weight:700;color:var(--navy)}
.scq{background:var(--ice);border-radius:16px;padding:14px 20px;font-size:15.5px;color:var(--ink)}.scq b{color:var(--blue);margin-right:8px}
.arrow{flex:none;align-self:center;width:22px;height:22px;border-radius:999px;background:var(--lt);display:flex;align-items:center;justify-content:center;color:var(--blue)}
svg text{font-family:Inter,system-ui,sans-serif}
`;

const cls = (...a) => a.filter(Boolean).join(' ');
function Icon({ name, size = 22, color = C.WHITE, bg = C.BLUE, d = 44 }) {
  const I = iconOf(name);
  return h('div', { className: 'ic', style: { width: d, height: d, background: bg } }, I ? h(I, { size, color, strokeWidth: 2 }) : null);
}

// ---------------------------------------------------------------- frames
function Deck(props) { return h(React.Fragment, null, props.children); }
function Furniture({ logo, tag }) {
  return h('div', { className: 'furn' }, logo ? h('img', { src: logo }) : null, tag ? h('div', { className: 'tag' }, tag) : null);
}
function Slide({ title, source, page, footer, logo, tag, notes, children }) {
  return h('section', { className: 'slide', 'data-notes': notes || '' },
    h('div', { className: 'title', 'data-role': 'title' }, title),
    h(Furniture, { logo, tag }),
    h('div', { className: 'body' }, children),
    h('div', { className: 'foot' }, h('span', { 'data-role': 'source' }, source || ''), h('span', null, [footer, page].filter(Boolean).join('  ·  '))));
}
const BG = (f) => require('path').join(__dirname, '..', '..', 'assets', 'bg', f);
const Backdrop = ({ src }) => h('img', { src, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } });
// Cover (council deck): navy backdrop with fine arcs, white logo top left, tag top right, 50pt-equivalent title,
// blue rule, subtitle, two italic context lines
function Cover({ title, subtitle, lines, footer, logo, tag, tagText, bg, notes }) {
  const L = lines || (footer ? [footer] : []);
  return h('section', { className: 'slide dark', 'data-notes': notes || '' },
    h(Backdrop, { src: bg || BG('cover.png') }),
    logo ? h('img', { src: logo, style: { position: 'absolute', left: 58, top: 60, maxHeight: 37, maxWidth: 125 } }) : null,
    h('div', { style: { position: 'absolute', right: 51, top: 60, height: 38, display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 17 } }, tagText || tag || ''),
    h('div', { style: { position: 'absolute', left: 67, top: 245, width: 1100 } },
      h('div', { 'data-role': 'title', style: { fontSize: 66, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-.015em' } }, title),
      h('div', { style: { width: 642, height: 5, borderRadius: 3, background: '#3B82F6', margin: '10px 0 14px' } }),
      subtitle ? h('div', { style: { fontSize: 26, color: '#C7D7F5', lineHeight: 1.35 } }, subtitle) : null),
    h('div', { style: { position: 'absolute', left: 67, bottom: 48, display: 'flex', flexDirection: 'column', gap: 10 } },
      L.slice(0, 2).map((l, i) => h('div', { key: i, style: { fontSize: 14.5, fontStyle: 'italic', color: '#AFC4EE' } }, l))));
}
function Divider({ title, sub, logo, tag, bg }) {
  return h('section', { className: 'slide dark' }, h(Backdrop, { src: bg || BG('divider.png') }), h(Furniture, { logo, tag }),
    h('div', { style: { position: 'absolute', left: 77, top: 270 } },
      h('div', { 'data-role': 'title', style: { fontSize: 52, fontWeight: 800 } }, title),
      sub ? h('div', { style: { fontSize: 22, color: C.LT, marginTop: 12 } }, sub) : null));
}

// ---------------------------------------------------------------- layout
const Row = ({ children, gap, style, grow }) => h('div', { className: cls('row', grow && 'grow'), style: Object.assign({ gap }, style) }, children);
const Col = ({ children, gap, style, grow, w }) => h('div', { className: cls('col', grow && 'grow'), style: Object.assign({ gap, width: w, flex: w ? 'none' : undefined }, style) }, children);
const Card = ({ children, variant, style, grow }) => h('div', { className: cls('card', variant, grow && 'grow'), style }, children);
const Pill = ({ children, variant }) => h('span', { className: cls('pill', variant) }, children);
const Label = ({ children }) => h('div', { className: 'label' }, children);

// ---------------------------------------------------------------- elements
function SCQ({ lead = 'Situation', children }) { return h('div', { className: 'scq' }, h('b', null, lead), children); }
function Takeaway({ children }) {
  return h('div', { className: 'take' }, h(Icon, { name: 'LuArrowRight', d: 34, size: 18 }), h('div', null, children));
}
function StatTiles({ items }) {
  return h(Row, null, items.map((it, i) => h(Card, { key: i, variant: it.accent ? 'accent' : null, grow: true },
    h('div', { className: 'stat', style: { fontSize: it.value.length > 9 ? 28 : it.value.length > 6 ? 34 : 42, whiteSpace: 'nowrap' } }, it.value),
    h('div', { className: 'h', style: { fontSize: 15, marginTop: 10 } }, it.label),
    it.basis ? h('div', { className: 'small', style: { marginTop: 4 } }, it.basis) : null)));
}
function LeverCards({ items }) {
  return h(Row, { grow: true }, items.map((it, i) => h(Card, { key: i, variant: it.accent ? 'ring' : 'white', grow: true, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
    h('div', { style: { display: 'flex', gap: 12, alignItems: 'center' } }, h(Icon, { name: it.icon || 'LuCircleDot', bg: it.accent ? C.BLUE : C.NAVY }), h('div', { className: 'h' }, it.title)),
    h('div', { className: 'p grow' }, it.body),
    it.metric ? h(Pill, { variant: it.accent ? 'ice' : null }, it.metric) : null)));
}
function Process({ steps, grow }) {
  const out = [];
  steps.forEach((st, i) => {
    out.push(h(Card, { key: 's' + i, variant: st.accent ? 'accent' : null, grow: true, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        st.when ? h(Pill, { variant: st.accent ? 'blue' : null }, st.when) : h('span'),
        st.icon ? h(Icon, { name: st.icon, d: 38, size: 19, bg: st.accent ? C.BLUE : C.WHITE, color: st.accent ? C.WHITE : C.BLUE }) : null),
      h('div', { className: 'h' }, st.title),
      st.body ? h('div', { className: 'small', style: { color: st.accent ? C.LT : C.BODY } }, st.body) : null));
    if (i < steps.length - 1) out.push(h('div', { key: 'a' + i, className: 'arrow' }, lu.LuChevronRight ? h(lu.LuChevronRight, { size: 16 }) : '›'));
  });
  return h(Row, { gap: 10, grow }, out);
}
function Funnel({ stages, width = 640 }) {
  const max = stages[0].value;
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, stages.map((st, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 14 } },
    h('div', { className: 'h', style: { width: 170, fontSize: 14 } }, st.label),
    h('div', { style: { width: Math.max(70, (width - 300) * st.value / max), height: 40, borderRadius: 999, background: st.accent ? C.BLUE : i === 0 ? C.NAVY : C.LT, color: st.accent || i === 0 ? '#fff' : C.NAVY, display: 'flex', alignItems: 'center', padding: '0 16px', fontWeight: 700, fontSize: 14 } }, st.display || st.value.toLocaleString('en-US')),
    st.drop ? h(Pill, { variant: 'ice' }, st.drop) : null)));
}
function Bars({ data, max, height = 240, unit = '', accentIndex }) {
  const m = max || Math.max(...data.map((d) => d.value)), bw = 100 / data.length;
  return h('svg', { viewBox: `0 0 600 ${height}`, width: '100%', height },
    data.map((d, i) => {
      const bh = (height - 50) * d.value / m, x = i * 600 / data.length + 600 / data.length * 0.2, w = 600 / data.length * 0.6, y = height - 26 - bh;
      const acc = accentIndex === undefined ? i === data.length - 1 : i === accentIndex;
      return h('g', { key: i },
        h('rect', { x, y, width: w, height: bh, rx: 8, fill: acc ? C.BLUE : C.LT }),
        h('text', { x: x + w / 2, y: y - 8, textAnchor: 'middle', fontSize: 15, fontWeight: 700, fill: C.NAVY }, d.display || d.value + unit),
        h('text', { x: x + w / 2, y: height - 6, textAnchor: 'middle', fontSize: 12, fill: C.MUTE }, d.label));
    }));
}
function Donut({ value, label, size = 170, color = C.BLUE }) {
  const r = 70, c = 2 * Math.PI * r;
  return h('div', { style: { position: 'relative', width: size, height: size } },
    h('svg', { viewBox: '0 0 180 180', width: size, height: size },
      h('circle', { cx: 90, cy: 90, r, fill: 'none', stroke: C.PALE, strokeWidth: 20 }),
      h('circle', { cx: 90, cy: 90, r, fill: 'none', stroke: color, strokeWidth: 20, strokeLinecap: 'round', strokeDasharray: `${c * value / 100} ${c}`, transform: 'rotate(-90 90 90)' })),
    h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
      h('div', { className: 'stat', style: { fontSize: Math.round(size * 0.2) } }, value + '%'), label && size >= 150 ? h('div', { className: 'small' }, label) : null));
}
function Matrix({ items, xLabel, yLabel, w = 520, hgt = 330 }) {
  return h('div', { style: { position: 'relative', width: w, height: hgt + 26 } },
    h('div', { style: { position: 'absolute', left: 26, top: 0, width: w - 26, height: hgt, border: `1px solid ${C.LINE}`, borderRadius: 14, background: `linear-gradient(${C.LINE},${C.LINE}) center/1px 100% no-repeat, linear-gradient(${C.LINE},${C.LINE}) center/100% 1px no-repeat` } },
      items.map((it, i) => h('div', { key: i, style: { position: 'absolute', left: `${8 + it.x * 84}%`, bottom: `${8 + it.y * 84}%`, transform: 'translate(-50%,50%)', display: 'flex', alignItems: 'center', gap: 6 } },
        it.logo ? h('img', { src: it.logo, style: { maxHeight: 22, maxWidth: 80, background: '#fff', padding: '4px 8px', borderRadius: 999, border: `${it.accent ? 2 : 1}px solid ${it.accent ? C.BLUE : C.LINE}` } })
          : h('div', { style: { width: 16, height: 16, borderRadius: 999, background: it.accent ? C.BLUE : C.GREY } }),
        it.logo ? null : h('span', { style: { fontSize: 12.5, fontWeight: it.accent ? 700 : 500, color: it.accent ? C.BLUE : C.BODY } }, it.label)))),
    h('div', { className: 'small', style: { position: 'absolute', left: 26, right: 0, bottom: 0, textAlign: 'center' } }, xLabel),
    h('div', { className: 'small', style: { position: 'absolute', left: -hgt / 2 + 10, top: hgt / 2 - 10, width: hgt, textAlign: 'center', transform: 'rotate(-90deg)' } }, yLabel));
}
function IconList({ items }) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, items.map((it, i) => h('div', { key: i, style: { display: 'flex', gap: 14, alignItems: 'center' } },
    h(Icon, { name: it.icon || 'LuCheck', bg: it.accent ? C.BLUE : C.ICE, color: it.accent ? C.WHITE : C.BLUE }),
    h('div', null, h('div', { className: 'h', style: { fontSize: 15.5 } }, it.title), it.body ? h('div', { className: 'small', style: { color: C.BODY } }, it.body) : null))));
}
function Timeline({ items }) {
  return h('div', { style: { position: 'relative', display: 'flex' } },
    h('div', { style: { position: 'absolute', left: `${50 / items.length}%`, right: `${50 / items.length}%`, top: 15, height: 3, borderRadius: 2, background: C.LT } }),
    items.map((it, i) => h('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, position: 'relative', padding: '0 8px' } },
      h('div', { style: { width: 32, height: 32, borderRadius: 999, background: it.accent ? C.BLUE : C.NAVY, border: '4px solid #fff' } }),
      h('div', { style: { color: C.BLUE, fontWeight: 700, fontSize: 13 } }, it.when),
      h('div', { className: 'h', style: { fontSize: 15 } }, it.title),
      it.body ? h('div', { className: 'small', style: { color: C.BODY } }, it.body) : null)));
}
function Decision({ items }) {
  const cols = [C.BLUE, C.NAVY, C.GREY];
  return h(Row, null, items.map((it, i) => h('div', { key: i, className: 'card white grow', style: { border: `2px solid ${it.color || cols[i % 3]}` } },
    h('span', { style: { fontWeight: 800, color: it.color || cols[i % 3], marginRight: 8 } }, it.head), h('span', { className: 'p' }, it.when),
    h('div', { className: 'p', style: { fontWeight: 700, color: C.NAVY, marginTop: 6 } }, it.then))));
}
function LogoRow({ files, height = 26 }) {
  return h('div', { style: { display: 'flex', justifyContent: 'space-around', alignItems: 'center' } }, files.map((f, i) => h('img', { key: i, src: f, style: { maxHeight: height, maxWidth: 120 } })));
}
function Quote({ text, who }) {
  return h(Card, { variant: 'white', style: { borderLeft: 'none' } },
    h('div', { style: { fontSize: 19, fontWeight: 600, color: C.NAVY, lineHeight: 1.35 } }, '“' + text + '”'),
    who ? h('div', { className: 'small', style: { marginTop: 8 } }, who) : null);
}

module.exports = {
  h, React, C, STYLE, Icon, Backdrop, Deck, Slide, Cover, Divider, Row, Col, Card, Pill, Label, SCQ, Takeaway, StatTiles, LeverCards,
  Process, Funnel, Bars, Donut, Matrix, IconList, Timeline, Decision, LogoRow, Quote,
};
