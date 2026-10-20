#!/usr/bin/env node
// Agentic Deck · render an HTML/React deck spec with Playwright.
//
//   node render.js spec.js outDir [--png] [--pdf] [--pptx] [--viewer]   (default: all)
//
// spec.js exports a React element: h(Deck, { title, tag, logo, footer }, h(Cover,...), h(Slide,...), ...)
// Outputs in outDir: deck.html (self-contained viewer, arrow keys), slides/NN.png (2x),
// deck.pdf (vector, 13.333 x 7.5 in), deck.pptx (one image per slide + speaker notes),
// qa_html.json (overflow, off-slide, sharp corners, dashes). Exit 1 if QA finds failures.
//
// Also exported: elementPNG(reactElement, wIn, hIn) -> 'image/png;base64,...' with a transparent
// background, for dropping one HTML-built element into a pptxgenjs slide (hybrid mode).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const K = require('./components.js');

function playwright() {
  try { return require('playwright'); } catch (e) {
    const g = execSync('npm root -g').toString().trim();
    return require(path.join(g, 'playwright'));
  }
}
function dataUri(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' }[ext] || 'application/octet-stream';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}
function inlineImages(html, base) {
  return html.replace(/src="([^"]+)"/g, (m, src) => {
    if (/^(data:|https?:)/.test(src)) return m;
    const f = path.isAbsolute(src) ? src : path.join(base, src);
    return fs.existsSync(f) ? `src="${dataUri(f)}"` : m;
  });
}
function page(body, title, viewer) {
  const nav = viewer ? `
<style>
body.viewer{background:#0B1220;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden}
body.viewer .slide{display:none;transform-origin:center;box-shadow:0 20px 60px rgba(0,0,0,.4);border-radius:12px}
body.viewer .slide.on{display:block}
#bar{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);color:#94A3B8;font:12px Inter,system-ui;background:rgba(15,23,42,.8);padding:6px 14px;border-radius:999px}
@media print{body.viewer{display:block;height:auto;background:#fff}body.viewer .slide{display:block!important;transform:none!important;box-shadow:none;border-radius:0}#bar{display:none}}
</style>
<script>
document.addEventListener('DOMContentLoaded',()=>{
 const S=[...document.querySelectorAll('.slide')];let i=+(location.hash.slice(1)||1)-1;
 const fit=()=>{const k=Math.min(innerWidth/1280,innerHeight/720)*.94;S.forEach(s=>s.style.transform='scale('+k+')')};
 const show=()=>{i=Math.max(0,Math.min(S.length-1,i));S.forEach((s,j)=>s.classList.toggle('on',j===i));document.getElementById('bar').textContent=(i+1)+' / '+S.length+'   ←  →';history.replaceState(null,'','#'+(i+1))};
 addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key))i++;if(['ArrowLeft','PageUp'].includes(e.key))i--;show()});
 addEventListener('click',e=>{i+=e.clientX>innerWidth/2?1:-1;show()});addEventListener('resize',fit);fit();show();});
</script>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${K.STYLE}</style>${nav}</head><body class="${viewer ? 'viewer' : ''}">${body}${viewer ? '<div id="bar"></div>' : ''}</body></html>`;
}
function renderDeck(deckEl) {
  const p = deckEl.props || {};
  const kids = React.Children.toArray(p.children);
  const slides = kids.map((el, i) => React.cloneElement(el, Object.assign({ page: i + 1 }, { logo: el.props.logo || (el.type === K.Cover || el.type === K.Divider ? p.logoWhite || p.logo : p.logo), tag: el.props.tag || p.tag, footer: el.props.footer || p.footer || p.tag })));
  return ReactDOMServer.renderToStaticMarkup(React.createElement(React.Fragment, null, slides));
}

// In-browser QA: every check that needs real layout
const QA_JS = () => {
  const out = [];
  const S = [...document.querySelectorAll('.slide')];
  S.forEach((s, k) => {
    const n = k + 1, sb = s.getBoundingClientRect();
    s.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2) return;
      if (r.right > sb.right + 1 || r.bottom > sb.bottom + 1 || r.left < sb.left - 1) out.push({ slide: n, check: 'off-slide', text: (el.textContent || el.tagName).slice(0, 50) });
      if (el.scrollHeight > el.clientHeight + 2 && cs.overflow !== 'visible' && el.children.length === 0) out.push({ slide: n, check: 'overflow', text: el.textContent.slice(0, 50) });
      const visible = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'rgb(255, 255, 255)') || parseFloat(cs.borderTopWidth) > 0;
      if (visible && !el.classList.contains('slide') && !el.classList.contains('foot') && parseFloat(cs.borderTopLeftRadius) === 0 && r.width > 14 && r.height > 14 && el.tagName !== 'svg')
        out.push({ slide: n, check: 'sharp-corner', text: el.className + ' ' + (el.textContent || '').slice(0, 30) });
    });
    // children overflowing the body area
    const body = s.querySelector('.body');
    if (body && body.scrollHeight > body.clientHeight + 2) out.push({ slide: n, check: 'overflow', text: 'content taller than the slide body by ' + (body.scrollHeight - body.clientHeight) + 'px' });
    const t = s.innerText;
    if (/[—–]/.test(t)) out.push({ slide: n, check: 'dash', text: (t.match(/.{0,30}[—–].{0,30}/) || [''])[0] });
    if (/[★☆✓✔✗]/.test(t)) out.push({ slide: n, check: 'glyph', text: 'decorative glyph' });
    const title = s.querySelector('[data-role=title]');
    if (title && title.scrollHeight > 100) out.push({ slide: n, check: 'title-lines', text: title.textContent });
  });
  return out;
};

// Launch Chromium. If the local Playwright version has no matching browser download, fall back to any
// installed Chromium (PLAYWRIGHT_BROWSERS_PATH, CHROMIUM_PATH, or the system one) before giving up.
function findChromium() {
  const cands = [process.env.CHROMIUM_PATH];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(require('os').homedir(), '.cache', 'ms-playwright');
  try {
    for (const d of fs.readdirSync(root).filter((d) => /^chromium/.test(d)).sort().reverse())
      for (const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'])
        cands.push(path.join(root, d, sub));
  } catch (e) { /* no browsers dir */ }
  cands.push('/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  return cands.filter(Boolean).find((f) => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } });
}
let _browser;
async function browser() {
  if (_browser) return _browser;
  const pw = playwright();
  try { _browser = await pw.chromium.launch(); } catch (e) {
    const exe = findChromium();
    if (!exe) throw new Error('No Chromium found. Run `npx playwright install chromium` in scripts/, or set CHROMIUM_PATH. ' + e.message.split('\n')[0]);
    _browser = await pw.chromium.launch({ executablePath: exe });
  }
  return _browser;
}

async function elementPNG(el, wIn, hIn) {
  const b = await browser();
  const pg = await b.newPage({ viewport: { width: Math.round(wIn * 96), height: Math.round(hIn * 96) }, deviceScaleFactor: 3 });
  const html = page(`<div id="el" style="width:${wIn * 96}px;height:${hIn * 96}px;display:flex;flex-direction:column">${ReactDOMServer.renderToStaticMarkup(el)}</div>`, 'el', false)
    .replace('<body class="">', '<body style="background:transparent">');
  await pg.setContent(inlineImages(html, process.cwd()), { waitUntil: 'networkidle' });
  const buf = await pg.locator('#el').screenshot({ omitBackground: true });
  await pg.close();
  return 'image/png;base64,' + buf.toString('base64');
}
async function close() { if (_browser) await _browser.close(); _browser = null; }

async function main() {
  const [specPath, outDir, ...flags] = process.argv.slice(2);
  if (!specPath || !outDir) { console.log('usage: node render.js spec.js outDir [--png] [--pdf] [--pptx] [--viewer]'); process.exit(2); }
  const all = flags.length === 0, want = (f) => all || flags.includes('--' + f);
  const spec = require(path.resolve(specPath));
  const deckEl = spec.default || spec;
  const title = (deckEl.props && deckEl.props.title) || 'Deck';
  fs.mkdirSync(outDir, { recursive: true });
  const body = inlineImages(renderDeck(deckEl), path.dirname(path.resolve(specPath)));
  fs.writeFileSync(path.join(outDir, 'deck.html'), page(body, title, true));
  const b = await browser();
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  await pg.setContent(page(body, title, false), { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  const qa = await pg.evaluate(QA_JS);
  fs.writeFileSync(path.join(outDir, 'qa_html.json'), JSON.stringify(qa, null, 1));
  const n = await pg.locator('.slide').count();
  const notes = await pg.$$eval('.slide', (S) => S.map((s) => s.dataset.notes || ''));
  const text = await pg.$$eval('.slide', (S) => S.map((s, i) => {
    const t = s.querySelector('[data-role=title]'), src = s.querySelector('[data-role=source]');
    const body = s.querySelector('.body');
    const words = body ? body.innerText.split(/\s+/).filter(Boolean).length : 0;
    return { n: i + 1, title: t ? t.innerText.trim() : '', source: src ? src.innerText.trim() : '', text: s.innerText.split('\n').map((x) => x.trim()).filter(Boolean), words, notes: s.dataset.notes || '', dark: s.classList.contains('dark') };
  }));
  fs.writeFileSync(path.join(outDir, 'text.json'), JSON.stringify(text, null, 1));
  if (want('png') || want('pptx')) {
    fs.mkdirSync(path.join(outDir, 'slides'), { recursive: true });
    for (let i = 0; i < n; i++) await pg.locator('.slide').nth(i).screenshot({ path: path.join(outDir, 'slides', String(i + 1).padStart(2, '0') + '.png') });
  }
  if (want('pdf')) {
    await pg.addStyleTag({ content: '@page{size:13.333in 7.5in;margin:0}body{background:#fff}' });
    await pg.pdf({ path: path.join(outDir, 'deck.pdf'), width: '13.333in', height: '7.5in', printBackground: true, preferCSSPageSize: true });
  }
  if (want('pptx')) {
    const pptxgen = require('pptxgenjs');
    const pres = new pptxgen(); pres.layout = 'LAYOUT_WIDE'; pres.title = title; pres.author = '';
    for (let i = 0; i < n; i++) {
      const s = pres.addSlide();
      s.addImage({ path: path.join(outDir, 'slides', String(i + 1).padStart(2, '0') + '.png'), x: 0, y: 0, w: 13.333, h: 7.5 });
      if (notes[i]) s.addNotes(notes[i]);
    }
    await pres.writeFile({ fileName: path.join(outDir, 'deck.pptx') });
  }
  await close();
  const fails = qa.filter((q) => q.check !== 'sharp-corner');
  qa.forEach((q) => console.log((q.check === 'sharp-corner' ? 'WARN ' : 'FAIL ') + `S${q.slide} ${q.check}: ${q.text}`));
  console.log(`[html] ${n} slides -> ${outDir} · ${fails.length} failures · ${qa.length - fails.length} warnings`);
  process.exit(fails.length ? 1 : 0);
}

module.exports = { elementPNG, close, renderDeck, page };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
