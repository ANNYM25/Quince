#!/usr/bin/env node
// Agentic Deck · fetch REAL brand logos for every company the deck mentions.
//
//   node fetch_logos.js <outDir> "Amazon" "Shein" "Everlane" "Quince=Quince (company)" "Uniqlo"
//   (Name=Wikipedia title pins the article when the name is ambiguous)
//
// Order of sources (first hit wins, every hit is logged to <outDir>/sources.json):
//   1. The logo file named in the company's Wikipedia infobox (the official mark, SVG when available)
//   2. Simple Icons (flat single-colour brand mark, recoloured to the brand hex)
//   3. The company's own site icon (Google favicon service, 256 px): last resort, flagged LOW-RES
// Writes <slug>.png (trimmed, 240 px tall) and, when the file has transparency, <slug>_white.png for
// dark slides. If nothing is found it says so: write the company name as text. Never draw, recolour
// (beyond the white variant), stretch or AI-generate a logo.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const UA = { headers: { 'User-Agent': 'AgenticDeckLogoFetcher/1.0 (https://claude.ai; deck builder)' } };
const slug = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = 'json') {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, UA);
    if (r.status === 429) { await sleep(1500 * (i + 1)); continue; }
    if (!r.ok) return null;
    return as === 'json' ? r.json() : Buffer.from(await r.arrayBuffer());
  }
  return null;
}

async function wikiTitle(name) {
  const j = await get(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(name + ' company')}&limit=5`);
  const pages = (j && j.pages) || [];
  const exact = pages.find((p) => p.title.toLowerCase().startsWith(name.toLowerCase()));
  return (exact || pages[0] || {}).key;
}

function commonsUrl(file, wiki) {
  const f = file.replace(/ /g, '_'), h = crypto.createHash('md5').update(f).digest('hex');
  return `https://upload.wikimedia.org/wikipedia/${wiki}/${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(f)}`;
}

async function pageSource(title) {
  const page = await get(`https://en.wikipedia.org/w/rest.php/v1/page/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!page || !page.source) return null;
  const redirect = page.source.match(/^#REDIRECT\s*\[\[([^\]|#]+)/i);
  return redirect ? pageSource(redirect[1]) : page.source;
}

async function fromWikipedia(name, title) {
  // 1) the pinned title, 2) the exact brand article (so "TikTok" is the app, not a joint venture), 3) search
  let source = title ? await pageSource(title) : null;
  if (!source && !title) { source = await pageSource(name); if (source && !/\|\s*logo\s*=/i.test(source)) source = null; if (source) title = name; }
  if (!source && !title) { title = await wikiTitle(name); source = title ? await pageSource(title) : null; }
  if (!source) return null;
  const page = { source };
  const m = page.source.match(/\|\s*logo\s*=\s*([^\n]+)/i);
  if (!m) return null;
  const raw = m[1].replace(/^\s*\[\[\s*(File|Image):/i, '').split('|')[0].replace(/\]\]/g, '').replace(/<!--.*?-->/g, '').trim();
  const fm = raw.match(/[^/]*\.(svg|png|jpe?g|gif|webp)/i);
  if (!fm) return null;
  const file = fm[0].trim();
  for (const wiki of ['commons', 'en']) {
    const url = commonsUrl(file, wiki);
    const buf = await get(url, 'buf');
    if (buf) return { buf, url, source: `Wikipedia infobox (${title})`, svg: /\.svg$/i.test(file) };
  }
  return null;
}

async function fromSimpleIcons(name) {
  const s = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const svg = await get(`https://cdn.jsdelivr.net/npm/simple-icons@13.0.0/icons/${s}.svg`, 'buf');
  if (!svg) return null;
  let hex = '0A1F44';
  const data = await get('https://cdn.jsdelivr.net/npm/simple-icons@13.0.0/_data/simple-icons.json');
  const icons = data && (data.icons || data);
  if (Array.isArray(icons)) {
    const hit = icons.find((i) => i.title.toLowerCase().replace(/[^a-z0-9]/g, '') === s);
    if (hit) hex = hit.hex;
  }
  const coloured = Buffer.from(svg.toString().replace('<svg ', `<svg fill="#${hex}" `));
  return { buf: coloured, url: `simple-icons:${s}`, source: 'Simple Icons (flat brand mark)', svg: true };
}

async function fromFavicon(name, domain) {
  if (!domain) return null;
  const buf = await get(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`, 'buf');
  if (!buf || buf.length < 1500) return null;
  return { buf, url: `favicon:${domain}`, source: 'Site icon (LOW-RES, replace if possible)', svg: false };
}

async function save(hit, out, key) {
  let img = sharp(hit.buf, { limitInputPixels: false });
  if (hit.svg) {
    const m = await sharp(hit.buf, { limitInputPixels: false }).metadata();
    const density = Math.max(36, Math.min(2400, (72 * 480) / Math.max(1, m.height || 240)));
    img = sharp(hit.buf, { density, limitInputPixels: false });
  }
  const png = await img.resize({ height: 240, withoutEnlargement: !hit.svg }).png().toBuffer();
  const trimmed = await sharp(png).trim({ threshold: 10 }).png().toBuffer().catch(() => png);
  const file = path.join(out, key + '.png');
  fs.writeFileSync(file, trimmed);
  const meta = await sharp(trimmed).metadata();
  if (meta.hasAlpha) {
    const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
    await sharp(data, { raw: info }).png().toFile(path.join(out, key + '_white.png'));
  }
  return { file, w: meta.width, h: meta.height, white: !!meta.hasAlpha };
}

(async () => {
  const [out, ...args] = process.argv.slice(2);
  if (!out || !args.length) { console.log('usage: node fetch_logos.js outDir "Name" "Name=Wikipedia title" [--domain name=site.com]'); process.exit(2); }
  fs.mkdirSync(out, { recursive: true });
  const domains = {};
  const names = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--domain') { const [n, d] = args[++i].split('='); domains[n.toLowerCase()] = d; } else names.push(args[i]);
  }
  const logPath = path.join(out, 'sources.json');
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : {};
  for (const arg of names) {
    const [name, title] = arg.split('=');
    const key = slug(name);
    let hit = null;
    try { hit = await fromWikipedia(name, title); } catch (e) { /* next source */ }
    if (!hit) try { hit = await fromSimpleIcons(name); } catch (e) { /* next */ }
    if (!hit) try { hit = await fromFavicon(name, domains[name.toLowerCase()]); } catch (e) { /* next */ }
    if (!hit) { console.log(`MISS  ${name}: no logo found. Use the name as text; never draw a substitute.`); log[key] = { name, found: false }; continue; }
    const r = await save(hit, out, key);
    log[key] = { name, found: true, source: hit.source, url: hit.url, file: path.basename(r.file), size: [r.w, r.h], white: r.white };
    console.log(`OK    ${name} -> ${r.file} (${r.w}x${r.h}) from ${hit.source}${r.white ? ' + white variant' : ''}`);
    await sleep(400);
  }
  fs.writeFileSync(logPath, JSON.stringify(log, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
