// Example: the house style at council-deck density, using every main pattern.
//   cd <skill>/scripts && npm install          (once)
//   node ../examples/example_build.js /tmp/example.pptx
// Numbers come from the reference deck (Team G27, Quince case). They show the pattern; never reuse them.
const path = require('path');
const D = require('../scripts/deck.js');
const A = (f) => path.join(__dirname, 'assets', f);
const OUT = process.argv[2] || 'example.pptx';
const { C, TYPE } = D;

(async () => {
  const deck = await D.newDeck({ title: 'Own the Second Purchase', tag: 'G27', footer: 'Team G27', logo: A('quince.png'), logoWhite: A('quince_white.png') });

  D.cover(deck, {
    tagText: 'Team G27',
    title: 'Own the Second Purchase',
    subtitle: 'Lifting 90-day repeat from 24% to ~31%, inside the same $120M, with no discounts',
    lines: ['Retargeting and lifecycle strategy, grounded in Adobe Customer Journey Analytics', 'Case Competition World Cup  ·  Graduate Track  ·  October 2026'],
  });

  // 2 · Executive summary: complication strip, three levers with proof, the result
  {
    const { s, y0 } = D.slide(deck, 'Re-aiming $9M to owned channels lifts repeat 24% → ~31%', {
      source: 'Source: case Exhibits B, G, J; Adobe CJA sandbox (A2, A3b, Cohort Table). CAC on Exhibit J’s blended definition; strict new-customer CAC ≈ −8% (appendix 26).',
      notes: 'Open with the one-sentence answer: own the second purchase by moving up to $9M from rented to owned channels, with holdouts deciding every dollar. Point at the navy tile. If asked about Exhibit D (retargeted 22% vs organic 35%): different window and population from CJA A3b (23.0% vs 23.4%); both say retargeting earns no repeat premium.',
    });
    let y = D.scqStrip(s, { y: y0, lead: 'Why now', text: 'Viral growth built first buyers; CAC is up 29% to $62 and 90-day repeat sits at 24% against 30 to 35% at peers.' });
    y = await D.leverCards(s, {
      y: y + 0.18, h: 2.62, items: [
        { icon: 'LuIdCard', title: 'Capture every buyer', body: 'Passport card and app tracking in every box', metric: 'Engaged share 25% → 50%',
          bars: [{ label: 'Engaged buyers', value: 24.5, display: '24.5%', muted: true }, { label: 'Their repeat share', value: 66, display: '66%', accent: true }], barMax: 70, barLabelW: 1.6 },
        { icon: 'LuCalendarHeart', title: 'Win the golden month', body: 'Care guide at delivery, next category by day 21', metric: '30-day repeat +2 pts', accent: true,
          bars: [{ label: 'Engaged repeat', value: 28.1, display: '28.1%', accent: true }, { label: 'Not engaged', value: 4.7, display: '4.7%', muted: true }], barMax: 30, barLabelW: 1.6 },
        { icon: 'LuShieldOff', title: 'Never pay twice', body: 'Suppression stops re-buying our customers', metric: 'Orders per $ beat the holdout',
          bars: [{ label: 'Retargeted', value: 23.0, display: '23.0%', muted: true }, { label: 'Organic', value: 23.4, display: '23.4%', accent: true }], barMax: 25, barLabelW: 1.6 },
      ],
    });
    y = D.statTiles(s, {
      y: y + 0.18, h: 1.2, items: [
        { value: '24% → ~31%', label: '90-day repeat', basis: 'base case; range 29.5 to 33% (appendix 22)', accent: true },
        { value: '−12 to −14%', label: 'Blended CAC', basis: '$62 → ~$54, on Exhibit J’s definition' },
        { value: '$9M · net $0', label: 'Re-aimed from rented lines', basis: 'only when a holdout proves it' },
      ],
    });
    const chips = ['Same $120M', 'No discounts, ever', 'Sized in Adobe CJA, proven by holdout'];
    let cx = D.G.L;
    for (const c of chips) cx += D.pill(s, c, cx, y + 0.12, { fill: C.PALE, color: C.NAVY, h: 0.3 }) + 0.12;
    await D.image(deck, s, A('adobe.png'), cx + 0.4, y + 0.27, 0.7, 0.2);
  }

  // 3 · Customer evidence: three headed panels + a full-width strip (council slide 4)
  {
    const { s, y0 } = D.slide(deck, '77% of carts stall, yet the 25% who engage make up 66% of repeaters', {
      source: 'Source: Adobe CJA, Quince Case Data View, 1 Jan to 30 Apr 2026 (Fallout A1, Segments A2/A5, Flow A4, Cohort Table, A6); case Exhibits A, D, G.',
    });
    const P = [[0.55, 3.9], [4.75, 3.9], [8.95, 3.83]];
    D.vline(s, 4.55, y0, 3.95); D.vline(s, 8.75, y0, 3.95);
    let y = D.panel(s, { x: P[0][0], y: y0, w: P[0][1], head: 'Where the funnel breaks', sub: 'People at each step (Fallout A1)' });
    D.chart(deck, s, 'bar', [{ name: 'People', labels: ['Landing', 'Product', 'Cart', 'Checkout', 'Order'], values: [60000, 36566, 11339, 5818, 2592] }],
      { x: P[0][0] - 0.1, y, w: P[0][1] + 0.1, h: 2.45, hideAxis: true, colors: [C.MID, C.MID, C.BLUE, C.BLUE, C.BLUE], extra: { dataLabelFormatCode: '#,##0' } });
    D.insight(s, '69% never add to cart; 77% of carts stall', { x: P[0][0], y: y + 2.55, w: P[0][1], h: 0.62 });

    y = D.panel(s, { x: P[1][0], y: y0, w: P[1][1], head: 'Who comes back', sub: 'Repeat rate in the CJA window' });
    D.hbars(s, { x: P[1][0], y, w: P[1][1], items: [
      { label: 'Engaged with email, SMS or app (A2)', value: 28.1, display: '28.1%', accent: true },
      { label: 'App after order one (A5, n=265)', value: 21.5, display: '21.5%', accent: true },
      { label: 'SMS after order one (A5, n=315)', value: 11.7, display: '11.7%' },
      { label: 'Not engaged (A2)', value: 4.7, display: '4.7%', muted: true },
    ] });
    D.T(s, 'Engaged buyers self-select, so the plan assumes far less lift for buyers we newly capture (appendix 22)', { x: P[1][0], y: y + 2.1, w: P[1][1], h: 0.4, fontSize: TYPE.caption, italic: true, color: C.MUTE });
    D.insight(s, '24.5% of buyers engage, yet they are 66% of repeat buyers', { x: P[1][0], y: y + 2.55, w: P[1][1], h: 0.62 });

    y = D.panel(s, { x: P[2][0], y: y0, w: P[2][1], head: 'When, and what next', sub: 'Week-2 repeat (Cohort Table; directional, ~48 buyers a week)' });
    const y2 = D.hbars(s, { x: P[2][0], y, w: P[2][1], layout: 'inline', labelW: 1.2, max: 21, items: [
      { label: 'Engaged', value: 5.6, display: '5.6%', accent: true }, { label: 'All buyers', value: 2.1, display: '2.1%', muted: true },
    ] });
    D.T(s, 'Repeat by category touched (A6)', { x: P[2][0], y: y2 + 0.08, w: P[2][1], h: 0.26, fontSize: TYPE.body, bold: true, color: C.NAVY });
    D.hbars(s, { x: P[2][0], y: y2 + 0.36, w: P[2][1], layout: 'inline', labelW: 1.2, rowH: 0.3, max: 21, items: [
      { label: 'Home', value: 20.8, display: '20.8%', accent: true }, { label: 'Jewelry', value: 19.5, display: '19.5%', accent: true },
      { label: 'Beauty', value: 18.5, display: '18.5%', accent: true }, { label: 'Cashmere', value: 13.7, display: '13.7%', muted: true },
    ] });
    D.insight(s, 'Cashmere: touched by 40.7% of buyers, repeats least', { x: P[2][0], y: y + 2.55, w: P[2][1], h: 0.62 });

    const box = D.strip(s, { y: 5.45, h: 1.35, head: 'Where the $120M goes' });
    D.budgetBar(s, { x: box.x, y: box.y + 0.12, w: 6.9, h: 0.46, segments: [
      { label: 'Prospecting', display: '$58M', value: 58, fill: C.MID }, { label: 'Retarg.', display: '$14M', value: 14, fill: C.LT },
      { label: 'Search', display: '$22M', value: 22, fill: C.PALE }, { label: 'Influencer', display: '$16M', value: 16, fill: C.PALE },
      { label: 'Owned', display: '$6M', value: 6, fill: C.BLUE, short: 'Owned $6M' }, { label: 'Brand', display: '$4M', value: 4, fill: C.NAVY, short: 'Brand $4M' },
    ] });
    D.T(s, '60% rented from social', { x: box.x, y: box.y + 0.64, w: 1.6, h: 0.24, fontSize: TYPE.caption, bold: true, color: C.BLUE, valign: 'middle' });
    await D.logoRow(deck, s, { x: box.x + 1.6, w: 1.75, y: box.y + 0.67, h: 0.18, files: [A('meta.png'), A('tiktok.png'), A('pinterest.png')] });
    await D.image(deck, s, A('google.png'), box.x + 6.9 * (58 + 14 + 11) / 120, box.y + 0.76, 0.55, 0.17); // centred under Search $22M
    D.insight(s, '5% owned: $1.43 per active customer. $31 retargeting CAC counts sales that would happen anyway', { x: box.x + 7.05, y: box.y, w: box.w - 7.05, h: box.h, fill: C.WHITE, size: TYPE.caption });
  }

  // 4 · Competition: matrix with REAL logos + what a rival can copy, and how fast
  {
    const { s, y0 } = D.slide(deck, 'Rivals copy a 20% discount overnight, but not factory cost plus owned buyers', {
      source: 'Source: company filings and press (Amazon Q2 2026, Everlane sale 2024, Williams-Sonoma v. Amazon); team judgement on position. Logos from each company’s Wikipedia infobox.',
    });
    let y = D.panel(s, { x: 0.55, y: y0, w: 5.6, head: 'Price vs owned relationship', sub: 'Y: share of buyers reachable via app, email or SMS (team judgement)' });
    await D.matrix(deck, s, { x: 0.95, y, w: 5.2, h: 3.25, xLabel: 'Price position: value → premium', yLabel: 'Owned reach →', quadrants: ['Owned, value', '', 'Rented, value', ''], items: [
      { logo: A('quince.png'), x: 0.18, y: 0.25, accent: true }, { logo: A('shein.png'), x: 0.08, y: 0.9 }, { logo: A('amazon.png'), x: 0.3, y: 0.7 },
      { logo: A('uniqlo.png'), x: 0.45, y: 0.5 }, { logo: A('everlane.png'), x: 0.7, y: 0.55 }, { logo: A('williams_sonoma.png'), x: 0.85, y: 0.82 },
    ] });
    D.vline(s, 6.45, y0, 4.25);
    y = D.panel(s, { x: 6.7, y: y0, w: 6.08, head: 'What a rival can copy, and how fast', sub: 'Time to match each part of the plan' });
    D.hbars(s, { x: 6.7, y, w: 6.08, layout: 'inline', labelW: 2.3, rowH: 0.42, max: 36, items: [
      { label: 'A 20% discount', value: 1, display: 'Overnight', muted: true },
      { label: 'Journeys and suppression', value: 4, display: 'A quarter or two', color: C.MID },
      { label: 'Factory cost + opted-in buyers', value: 30, display: 'Years', accent: true },
    ] });
    const rows = [
      [A('amazon.png'), 'Paid reach is an auction Quince can’t win', 'Amazon ad business $19.8B a quarter, +26%'],
      [A('everlane.png'), 'Owned channels alone aren’t a moat', 'Mature email and SMS, yet still sold'],
      [A('williams_sonoma.png'), 'Trust must come from proof, not comparisons', 'Sued Amazon over “dupes”'],
    ];
    for (let i = 0; i < rows.length; i++) {
      const ry = y + 1.5 + i * 0.84;
      D.card(s, 6.7, ry, 6.08, 0.74, { fill: C.BG });
      await D.image(deck, s, rows[i][0], 7.45, ry + 0.37, 1.25, 0.26);
      D.runs(s, [{ text: rows[i][1], bold: true, color: C.NAVY, breakLine: true }, { text: rows[i][2], color: C.MUTE, size: TYPE.caption }], { x: 8.3, y: ry, w: 4.4, h: 0.74, valign: 'middle', fontSize: TYPE.body });
    }
    await D.takeaway(s, 'Our moat is the combination: keep the factory-direct price, build the owned relationship rivals can’t buy.', 6.2);
  }

  // 5 · Journey row with flat icons (council slide 16)
  {
    const { s, y0 } = D.slide(deck, 'Only 24.5% of buyers engage, so we ask when the box opens', {
      source: 'Source: Adobe CJA panels A1, A2, A4, A5, A6 and Cohort Table; mechanisms are hypotheses the pilot tests.',
    });
    await D.journey(s, { y: y0 + 0.2, h: 4.8, steps: [
      { icon: 'LuSearch', title: 'Discovery', stat: '45.5% via prospecting', mech: 'Social proof', fix: 'Loyalist Lookalikes' },
      { icon: 'LuShirt', title: 'Product page', stat: '25,227 leave here', mech: 'Price signals quality', fix: 'Proof Creators' },
      { icon: 'LuShoppingCart', title: 'Cart', stat: '77% never order', mech: 'Open loop fades', fix: 'Saved Cart' },
      { icon: 'LuSmartphone', title: 'Checkout', stat: 'App 27.1% vs web 22.7%', mech: 'Default effect', fix: 'Track It in the App' },
      { icon: 'LuPackageOpen', title: 'Delivery', stat: '24.5% engage (A2)', mech: 'Peak-end effect', fix: 'Quince Passport', accent: true },
      { icon: 'LuCalendarDays', title: 'Days 0 to 30', stat: 'Week-2 peak 5.6%', mech: 'Habit formation', fix: 'Care Calendar' },
      { icon: 'LuHouse', title: 'Days 30 to 90', stat: 'Cashmere 13.7%', mech: 'Mental accounting', fix: 'Material Journeys' },
    ] });
    await D.takeaway(s, 'Trust peaks when the parcel opens, so the Passport goes in the box, never a discount code', 6.2);
  }

  // 6 · Next steps: process chart + gates (a contract, not a roadmap)
  {
    const { s, y0 } = D.slide(deck, 'We move $4M at day 90 only if the South holdout proves it', {
      source: 'Source: team plan; spend stays inside the $14M retargeting and $6M owned lines (Exhibit I). Pass marks pre-registered before launch.',
    });
    const y = await D.processChart(s, { y: y0, h: 1.6, steps: [
      { when: 'Weeks 1 to 4', icon: 'LuWrench', title: 'Set up', body: 'CJA → Journey Optimizer; consent split; 10% randomised South holdout' },
      { when: 'Weeks 5 to 8', icon: 'LuRocket', title: 'Launch', body: 'Suppression, Saved Cart, checkout SMS, Passport cards in boxes' },
      { when: 'Weeks 9 to 12', icon: 'LuChartLine', title: 'Read weekly', body: 'Every lever against the holdout at the CJA council' },
      { when: 'Day 90', icon: 'LuFlag', title: 'Gate 1: $4M moves', body: 'Retargeting → owned, only if all three pass marks clear', accent: true },
    ] });
    D.T(s, 'Pass marks at Gate 1, by lever', { x: D.G.L, y: y + 0.2, w: 6, h: 0.3, fontSize: TYPE.head, bold: true, color: C.NAVY });
    D.statTiles(s, { y: y + 0.58, h: 1.3, items: [
      { value: '2×', label: 'Engaged share', basis: 'Capture · CRM + app squad' },
      { value: '+2 pts', label: '30-day repeat vs holdout', basis: 'Golden month · lifecycle team', accent: true },
      { value: '> holdout', label: 'Orders per retargeting $', basis: 'Never pay twice · paid media' },
    ] });
    D.decisionCards(s, { y: y + 2.06, h: 0.82, items: [
      { head: 'Scale', when: 'all three clear', then: 'search then prospecting, months 4 to 9' },
      { head: 'Adjust', when: 'mixed by lever', then: 'keep winners, re-test 60 days' },
      { head: 'Stop', when: 'nothing beats holdout', then: 'the $14M stays where it is' },
    ] });
    await D.takeaway(s, 'Up to $9M moves rented → owned, and holdouts decide every dollar', 6.25);
  }

  D.divider(deck, { title: 'Appendix', index: [
    { head: 'Adobe CJA evidence', items: [[9, 'Fallout'], [10, 'Attribution IQ'], [11, 'Cohort Table'], [12, 'Flow'], [13, 'Segments']] },
    { head: 'Backup analysis', items: [[14, 'Why a blend'], [15, 'Issue tree'], [21, 'Budget moves'], [22, 'Path to 31%']] },
    { head: 'Defence', items: [[25, 'Risks'], [26, 'Every number and its source'], [27, 'Sources']] },
  ] });
  await D.save(deck, OUT);
})().catch((e) => { console.error(e); process.exit(1); });
