// Example: the same house style built as HTML/React slides.
//   node ../scripts/html/render.js example_html.js /tmp/out      -> deck.html, slides/*.png, deck.pdf, deck.pptx
// Numbers are from the reference deck and are illustrative here: never reuse them in a new deck.
const K = require('../scripts/html/components.js');
const { h, Deck, Cover, Slide, Row, Col, Card, SCQ, LeverCards, StatTiles, Bars, IconList, Takeaway, Funnel, Donut, Process, Decision, Timeline } = K;

module.exports = h(Deck, { title: 'Own the Second Purchase', tag: 'G27', logo: 'assets/quince.png', logoWhite: 'assets/quince_white.png' },
  h(Cover, { tagText: 'Team G27', title: 'Own the Second Purchase', subtitle: 'Lifting 90-day repeat from 24% to ~31%, inside the same $120M, with no discounts', lines: ['Retargeting and lifecycle strategy, grounded in Adobe Customer Journey Analytics', 'Case Competition World Cup  ·  Graduate Track  ·  October 2026'] }),

  h(Slide, { title: 'We win the second purchase and lift repeat 24% → ~31%', source: 'Source: case Exhibits B, G, J; Adobe CJA sandbox (A1 to A6).', notes: 'Open with the one-sentence answer.' },
    h(SCQ, { lead: 'The problem' }, 'Viral growth built first buyers; CAC is up 29% to $62 and 90-day repeat sits at 24% against 30 to 35% at peers.'),
    h(LeverCards, { items: [
      { icon: 'LuIdCard', title: 'Capture every buyer', body: 'A Passport card and app tracking in every box: the 25% who engage make up 66% of repeaters.', metric: 'Engaged share 25% → 50%' },
      { icon: 'LuCalendarHeart', title: 'Win the golden month', body: 'Material Journeys on shipping events, the next category by day 21.', metric: '30-day repeat +2 pts', accent: true },
      { icon: 'LuShieldOff', title: 'Never pay twice', body: 'CJA suppression stops us re-buying customers we already own.', metric: 'Orders per $ beat the holdout' },
    ] }),
    h(StatTiles, { items: [
      { value: '~31%', label: '90-day repeat', basis: 'from 24% (case Exhibit B)', accent: true },
      { value: '−12 to −14%', label: 'Blended CAC', basis: 'on Exhibit J’s definition' },
      { value: '$9M', label: 'Re-aimed, net zero', basis: 'gated on holdouts' },
    ] })),

  h(Slide, { title: '77% of carts stall, yet the 25% of buyers who engage make up 66% of repeaters', source: 'Source: Adobe CJA sandbox, Fallout (A1) and Segments (A2). Order share derived: 31% × 23%.' },
    h(Row, { grow: true },
      h(Col, { grow: true },
        h(Card, { variant: 'white', grow: true, style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 } },
          h('div', { className: 'label', style: { marginBottom: 14 } }, 'Share of product viewers at each step'),
          h(Funnel, { width: 700, stages: [
            { label: 'Viewed a product', value: 100, display: '100%' },
            { label: 'Added to cart', value: 31, display: '31%', drop: '69% never add' },
            { label: 'Ordered', value: 7.1, display: '7%', drop: '77% of carts stall', accent: true },
          ] }),
          h(StatTiles, { items: [
            { value: '1 in 5,500', label: 'Stalled carts that get an email', basis: 'Flow (A4)' },
            { value: '5.6%', label: 'Week-2 repeat, engaged', basis: 'vs 2.1% all buyers (Cohort)' },
            { value: '13.7%', label: 'Cashmere repeat', basis: 'lowest category (A6)' },
          ] }))),
      h(Col, { w: 380 },
        h(Card, { variant: 'accent', style: { display: 'flex', gap: 18, alignItems: 'center' } },
          h(Donut, { value: 28, size: 120, color: '#60A5FA' }),
          h('div', null, h('div', { className: 'h' }, 'Engaged buyers repeat 28.1%'), h('div', { className: 'small' }, 'vs 4.7% for the rest (A2)'))),
        h(Card, { grow: true, style: { display: 'flex', flexDirection: 'column', justifyContent: 'center' } }, h('div', { className: 'label' }, 'Repeat in the CJA window (A2)'), h(Bars, { height: 200, data: [{ label: 'Engaged', value: 28.1, display: '28.1%' }, { label: 'Not engaged', value: 4.7, display: '4.7%' }], accentIndex: 0 })))),
    h(Takeaway, null, 'A reminder within hours wins back the cart; proof, not discounts, closes the trust gap.')),

  h(Slide, { title: 'We test for 90 days in the South, and the first $4M moves only if the holdout proves it', source: 'Source: team plan. Spend stays inside the $14M retargeting and $6M owned lines (Exhibit I).' },
    h(Process, { grow: true, steps: [
      { when: 'Weeks 1 to 4', icon: 'LuWrench', title: 'Set up', body: 'Connect CJA to Journey Optimizer; 10% South holdout' },
      { when: 'Weeks 5 to 8', icon: 'LuRocket', title: 'Launch', body: 'Suppression, Saved Cart, Passport cards' },
      { when: 'Weeks 9 to 12', icon: 'LuChartLine', title: 'Read weekly', body: 'Every lever against the holdout' },
      { when: 'Day 90', icon: 'LuFlag', title: 'Gate 1', body: '$4M moves only on proof', accent: true },
    ] }),
    h(Decision, { items: [
      { head: 'Scale', when: 'beats the holdout on 30-day repeat', then: 'roll out region by region' },
      { head: 'Adjust', when: 'mixed results by lever', then: 'keep winners, re-test 60 days' },
      { head: 'Stop', when: 'nothing beats the holdout', then: 'no budget moves', color: '#64748B' },
    ] }),
    h(Takeaway, null, 'Most teams present a roadmap; this is a contract with pass marks, owners and funding.')),
);
