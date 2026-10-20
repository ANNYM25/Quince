#!/usr/bin/env python3
"""Agentic Deck QA scanner (the deterministic gate before any reviewer agent runs).

Usage:  python3 qa.py deck.pptx [--brief brief.json] [--render] [--json out.json]

FAIL checks (exit 1):
  A  Title: present (shape 'ad-title'), at most two lines (measured with the real Inter Bold metrics), no trailing period/colon/question mark,
     not ALL CAPS, not a 1 to 4 word topic label
  B  Text: em/en dashes, hype or AI-filler words, decorative glyphs, exclamation marks, 'So what'
  C  Fonts: brief font only (default Inter)
  D  Palette: approved blue tokens only
  E  Safe area: content inside 0.5 in margins, below the title band, above the footer
  F  Overlap: text boxes partially overlapping
  G  Fit: estimated wrapped text taller than its box
  H  Contrast: WCAG ratio >= 3.0 for text on its fill
  K  Rounded: no sharp-cornered filled or bordered rectangle
  L  Words: over the density cap (brief.density: presenter 110 / balanced 190 / exhaustive 320, default
     exhaustive) or any single text block over 32 words (exhaustive = many short facts, never paragraphs)
WARN checks:
  A2 title wraps to two lines (measured) · core slide title with no number · no verb-like word
  M  more than four distinct font sizes on a slide (aim for three: title, body, source)
  N  fewer than three visual elements on a content slide (text-only slide)
  O  no source line on a content slide
  P  more than three small caps eyebrow labels on one slide
  Q  more than two status colours (green / amber / red) on one slide
  J  (--render) pixels drawn outside the safe area
  W  (--render) an empty horizontal band of 0.7 in or more inside the content area (dead whitespace)
"""
import sys, re, math, json, subprocess, os, glob, tempfile
from pptx import Presentation
from lxml import etree

E = 914400
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'}
APPROVED = {'0A1F44', '1D4ED8', '2563EB', '60A5FA', 'BFDBFE', 'DBEAFE', 'EFF6FF', '0F172A', '334155', '64748B',
            '94A3B8', 'E2E8F0', 'F8FAFC', 'FFFFFF', 'CBD5E1', 'EEF2F7', '8FB2EE', '000000', '3B82F6', 'C7D7F5', 'AFC4EE',
            '16A34A', 'D97706', 'DC2626'}
STATUS = {'16A34A', 'D97706', 'DC2626'}
HYPE = ['revolutionary', 'game-changing', 'game changing', 'world-class', 'cutting-edge', 'cutting edge',
        'best-in-class', 'unparalleled', 'seamless', 'supercharge', 'unlock the power', 'next-generation',
        'transformative', 'disruptive', 'unleash', 'synergy', 'synergies', 'holistic', 'delve', 'leverage our',
        'robust solution', 'paradigm', 'empower', 'elevate', 'in today\'s', 'ever-evolving', 'tapestry of',
        'it\'s not just', 'not just', 'like never before', 'ultimate', 'state-of-the-art', 'groundbreaking']
GLYPHS = '★☆✓✔✗✘•►▶'
VERBS = re.compile(r"\b(we|is|are|was|were|be|can|can't|cannot|will|won't|do|does|did|has|have|had|must|should|"
                   r"win|lift|cut|move|stop|keep|make|close|test|prove|grow|lose|pay|own|beat|need|drive|"
                   r"\w+(s|ed|es))\b", re.I)
CAPS = {'presenter': 110, 'balanced': 190, 'exhaustive': 320, 'low': 110, 'medium': 190, 'high': 320}
PARA_CAP = 32  # words in any single text block: exhaustive means many short facts, never a paragraph


def lum(h):
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def box(sh): return (sh.left / E, sh.top / E, sh.width / E, sh.height / E)


def inter(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[0] + a[2], b[0] + b[2]), min(a[1] + a[3], b[1] + b[3])
    return max(0, x2 - x1) * max(0, y2 - y1)


def contains(o, i, tol=0.02):
    return i[0] >= o[0] - tol and i[1] >= o[1] - tol and i[0] + i[2] <= o[0] + o[2] + tol and i[1] + i[3] <= o[1] + o[3] + tol


def geom(sh):
    g = sh._element.find('.//a:prstGeom', NS)
    return g.get('prst') if g is not None else None


def solid_fill(sh):
    sp = sh._element.find('.//p:spPr', NS)
    if sp is None: return None
    f = sp.find('a:solidFill/a:srgbClr', NS)
    return f.get('val').upper() if f is not None else None


def has_line(sh):
    sp = sh._element.find('.//p:spPr', NS)
    if sp is None: return False
    ln = sp.find('a:ln', NS)
    return ln is not None and ln.find('a:solidFill', NS) is not None and ln.find('a:noFill', NS) is None


def is_dark(slide):
    bg = slide._element.find('.//p:bg', NS)
    return bg is not None and (bg.find('.//a:blip', NS) is not None or
                               (bg.find('.//a:srgbClr', NS) is not None and lum(bg.find('.//a:srgbClr', NS).get('val')) < 0.2))


def run_colors(sh):
    return [c.get('val').upper() for r in sh._element.iter('{%s}rPr' % NS['a']) for c in r.findall('.//a:srgbClr', NS)]


def sizes(sh):
    return [int(r.get('sz')) / 100 for r in sh._element.iter('{%s}rPr' % NS['a']) if r.get('sz')]


def est_height(sh):
    w = sh.width / E
    if w <= 0.05: return 0
    total = 0.0
    for p in sh.text_frame.paragraphs:
        text = ''.join(r.text for r in p.runs)
        sz = [r.font.size.pt for r in p.runs if r.font.size] or [12]
        size = max(sz)
        per = max(1, math.floor(w * 72 / (size * 0.53)))
        lines = max(1, math.ceil(len(text) / per)) if text else 1
        total += lines * size * 1.2 / 72
    return total


def whitespace(images, dark_flags, min_gap_in=0.7):
    """Largest empty horizontal band inside the content area (y 1.35 to 6.9 in) of each rendered slide.
    'Empty' = no ink darker than light grey across the band. Returns [(slide, gap_in, y_from)]."""
    from PIL import Image
    res = []
    for k, f in enumerate(images, 1):
        if dark_flags[k - 1]: continue
        im = Image.open(f).convert('L'); W, H = im.size; px = im.load(); sy = H / 7.5
        x0, x1 = int(W * 0.55 / 13.333), int(W * 12.78 / 13.333)
        y0, y1 = int(1.35 * sy), int(6.9 * sy)
        best, cur, start, bstart = 0, 0, y0, y0
        for yy in range(y0, y1):
            row_ink = any(px[xx, yy] < 215 for xx in range(x0, x1, 2))
            if row_ink: cur = 0; start = yy + 1
            else:
                cur += 1
                if cur > best: best, bstart = cur, start
        gap = best / sy
        if gap >= min_gap_in: res.append((k, round(gap, 2), round(bstart / sy, 2)))
    return res


_FONTS = {}


def font_path(family='Inter', bold=True):
    key = (family, bold)
    if key not in _FONTS:
        try:
            out = subprocess.run(['fc-match', '-f', '%{file}', f'{family}:{"bold" if bold else "regular"}'], capture_output=True, text=True).stdout.strip()
            _FONTS[key] = out if out and family.lower() in os.path.basename(out).lower() else None
        except Exception:
            _FONTS[key] = None
    return _FONTS[key]


def measured_lines(text, width_in, size_pt, family='Inter', bold=True):
    """Wrap text with the real font metrics (PIL); None when the font file isn't available."""
    fp = font_path(family, bold)
    if not fp: return None
    from PIL import ImageFont
    f = ImageFont.truetype(fp, int(size_pt * 10))          # 10 px per pt: length in pt*10
    limit = width_in * 72 * 10
    lines, cur = 1, ''
    for w in text.split():
        trial = (cur + ' ' + w).strip()
        if f.getlength(trial) <= limit or not cur: cur = trial
        else: lines += 1; cur = w
    return lines


def furniture(sh): return sh.name.startswith('ad-furn') or sh.name in ('ad-title', 'ad-source')


def main(path, brief=None, render=False, jpath=None):
    brief = brief or {}
    font = brief.get('font', 'Inter')
    dens = brief.get('density', 'exhaustive')
    cap = CAPS.get(dens, 320)
    core = set(brief.get('core_slides', []))
    approved = APPROVED | {c.upper() for c in brief.get('extra_colours', [])}
    prs = Presentation(path)
    out = []
    add = lambda lvl, n, chk, msg: out.append({'level': lvl, 'slide': n, 'check': chk, 'msg': msg})
    titles = []
    for n, slide in enumerate(prs.slides, 1):
        dark = is_dark(slide)
        shapes = list(slide.shapes)
        texts = [s for s in shapes if s.has_text_frame and s.text_frame.text.strip()]
        xml = etree.tostring(slide._element).decode()
        # A titles
        if not dark:
            ts = [s for s in shapes if s.name == 'ad-title']
            if not ts:
                add('FAIL', n, 'A', 'no ad-title shape (build content slides with D.slide)')
            else:
                t = ts[0].text_frame.text.strip(); titles.append((n, t))
                words = len(t.split())
                ml = measured_lines(t, ts[0].width / E, 24, font, True)
                if ml is None: ml = 1 if len(t) <= 56 else 2 if len(t) <= 110 else 3
                if ml >= 3: add('FAIL', n, 'A', f'title runs to {ml} lines: "{t}"')
                elif ml == 2: add('WARN', n, 'A2', f'title wraps to two lines ({len(t)} chars); one line is stronger: "{t}"')
                if t[-1] in '.:?': add('FAIL', n, 'A', f'title ends with "{t[-1]}": "{t}"')
                if t.isupper() and len(t) > 6: add('FAIL', n, 'A', f'title in caps: "{t}"')
                if words <= 4 and not re.search(r'\d', t) and t.lower() not in ('appendix', 'sources', 'agenda'):
                    add('FAIL', n, 'A', f'topic label, not an action title: "{t}"')
                if (not core or n in core) and not re.search(r'\d', t) and words > 4:
                    add('WARN', n, 'A2', f'title carries no number: "{t}"')
                if words > 4 and not VERBS.search(t):
                    add('WARN', n, 'A2', f'title may lack a verb (fragment): "{t}"')
        # B banned text
        for s in texts:
            t = s.text_frame.text; low = t.lower()
            if '—' in t or '–' in t: add('FAIL', n, 'B', f'em/en dash: "{t[:70]}"')
            for hw in HYPE:
                if re.search(r'(?<![a-z])' + re.escape(hw) + r'(?![a-z])', low): add('FAIL', n, 'B', f'hype/filler "{hw}": "{t[:60]}"')
            if any(g in t for g in GLYPHS): add('FAIL', n, 'B', f'decorative glyph: "{t[:60]}"')
            if '!' in t: add('FAIL', n, 'B', f'exclamation mark: "{t[:60]}"')
            if re.search(r'\bso what\b', low): add('FAIL', n, 'B', f'"So what" label: "{t[:60]}"')
        # C fonts
        for f in set(re.findall(r'<a:latin typeface="([^"]+)"', xml)):
            if f != font and not f.startswith('+'): add('FAIL', n, 'C', f'font "{f}" ({font} only)')
        # D palette + Q status colours
        cols = set(c.upper() for c in re.findall(r'srgbClr val="([0-9A-Fa-f]{6})"', xml))
        for c in cols - approved: add('FAIL', n, 'D', f'off-palette colour {c}')
        if len(cols & STATUS) > 2: add('WARN', n, 'Q', 'three status colours on one slide (too colourful)')
        if not dark:
            # E safe area
            for s in shapes:
                if furniture(s) or s.name.startswith('ad-furn'): continue
                x, y, w, h = box(s)
                if w == 0 and h == 0: continue
                if x < 0.45 or x + w > 12.88 or y < 1.2 or y + h > 6.98:
                    if not (y > 6.95 and s.shape_type == 9):  # footer rule
                        add('FAIL', n, 'E', f'outside safe area: x{x:.2f} y{y:.2f} w{w:.2f} h{h:.2f} "{s.text_frame.text[:30] if s.has_text_frame else s.name}"')
        # F overlap
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                a, b = box(texts[i]), box(texts[j])
                ov = inter(a, b)
                if ov > 0.03 and not contains(a, b) and not contains(b, a):
                    add('FAIL', n, 'F', f'overlap {ov:.2f} in2: "{texts[i].text_frame.text[:25]}" x "{texts[j].text_frame.text[:25]}"')
        # G fit
        for s in texts:
            need, have = est_height(s), s.height / E
            if need > have + 0.08: add('FAIL', n, 'G', f'text may overflow (needs ~{need:.2f} in, box {have:.2f} in): "{s.text_frame.text[:40]}"')
        # H contrast
        filled = [(box(s), solid_fill(s)) for s in shapes if solid_fill(s)]
        for s in texts:
            bg = solid_fill(s)
            if not bg:
                cands = [(bb[2] * bb[3], f) for bb, f in filled if contains(bb, box(s), 0.05)]
                bg = min(cands)[1] if cands else ('0A1F44' if dark else 'FFFFFF')
            for c in set(run_colors(s)):
                if contrast(c, bg) < 3.0: add('FAIL', n, 'H', f'low contrast {c} on {bg} ({contrast(c, bg):.2f}): "{s.text_frame.text[:30]}"')
        # K rounded corners
        for s in shapes:
            if geom(s) == 'rect' and (solid_fill(s) or has_line(s)):
                x, y, w, h = box(s)
                if w > 0.12 and h > 0.12:
                    add('FAIL', n, 'K', f'sharp-cornered rectangle w{w:.2f} h{h:.2f} at x{x:.2f} y{y:.2f} (use RR / card)')
        if dark: continue
        # L words
        body = [s for s in texts if not furniture(s)]
        wc = sum(len(s.text_frame.text.split()) for s in body)
        if wc > cap: add('FAIL', n, 'L', f'{wc} words (cap {cap} for density "{dens}"): cut or move to notes/appendix')
        for s in body:
            if len(s.text_frame.text.split()) > PARA_CAP:
                add('FAIL', n, 'L', f'{len(s.text_frame.text.split())}-word block (max {PARA_CAP}): split into labelled facts or a chart: "{s.text_frame.text[:50]}"')
        if cap * 0.85 < wc <= cap: add('WARN', n, 'L', f'{wc} words, close to the cap of {cap}')
        # M type sizes
        sz = sorted({x for s in body for x in sizes(s) if 8.5 < x < 20})  # titles, hero numbers and source lines excluded
        if len(sz) > 3: add('WARN', n, 'M', f'{len(sz)} working type sizes {sz}: use three (head, body, caption)')
        # N elements
        visual = [s for s in shapes if not furniture(s) and (s.shape_type in (3, 13) or getattr(s, 'has_chart', False) or
                  geom(s) in ('roundRect', 'ellipse', 'rightArrow', 'diamond', 'chevron', 'homePlate', 'line'))]
        if len(visual) < 3: add('WARN', n, 'N', f'only {len(visual)} visual elements: this reads as a text slide')
        # O source
        if not any(s.name == 'ad-source' or s.text_frame.text.strip().lower().startswith('source') for s in texts):
            add('WARN', n, 'O', 'no source line')
        # P eyebrows
        eb = [s for s in body if s.text_frame.text.strip().isupper() and 1 <= len(s.text_frame.text.split()) <= 6 and len(s.text_frame.text.strip()) > 3]
        if len(eb) > 3: add('WARN', n, 'P', f'{len(eb)} caps eyebrow labels: keep three or fewer')
    # J render scan
    if render:
        tmp = tempfile.mkdtemp()
        soffice = next((p for p in ['/mnt/skills/public/pptx/scripts/office/soffice.py'] if os.path.exists(p)), None)
        cmd = ['python3', soffice, '--headless'] if soffice else ['soffice', '--headless']
        subprocess.run(cmd + ['--convert-to', 'pdf', '--outdir', tmp, path], capture_output=True)
        pdf = glob.glob(os.path.join(tmp, '*.pdf'))
        if pdf:
            from PIL import Image
            subprocess.run(['pdftoppm', '-png', '-r', '40', pdf[0], os.path.join(tmp, 'p')])
            for k, png in enumerate(sorted(glob.glob(os.path.join(tmp, 'p-*.png'))), 1):
                if is_dark(prs.slides[k - 1]): continue
                im = Image.open(png).convert('L'); W, H = im.size; px = im.load(); sx, sy = W / 13.333, H / 7.5; bad = 0
                for yy in range(H):
                    for xx in range(W):
                        xi, yi = xx / sx, yy / sy
                        if not (0.4 <= xi <= 12.93 and 0.25 <= yi <= 7.4) and px[xx, yy] < 235: bad += 1
                if bad > 3: add('FAIL', k, 'J', f'{bad} pixels drawn outside the safe area')
            pngs = sorted(glob.glob(os.path.join(tmp, 'p-*.png')))
            for k, gap, y in whitespace(pngs, [is_dark(s) for s in prs.slides]):
                add('WARN', k, 'W', f'{gap} in empty band from y {y}: fill it with evidence, a chart or a strip, or tighten the layout')
        else:
            add('WARN', 0, 'J', 'render skipped: PDF conversion failed')
    # titles read-aloud print
    print('TITLES (read them aloud in order; they must tell the story on their own):')
    for n, t in titles: print(f'  {n:>2}  {t}')
    for o in sorted(out, key=lambda o: (o['level'] != 'FAIL', o['slide'])):
        print(f"{o['level']:<4} S{o['slide']} {o['check']} {o['msg']}")
    nf = sum(o['level'] == 'FAIL' for o in out)
    print(f"\n{len(prs.slides)} slides · {nf} failures · {len(out) - nf} warnings")
    if jpath:
        json.dump({'titles': titles, 'issues': out}, open(jpath, 'w'), indent=1, ensure_ascii=False)
    return 1 if nf else 0


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(2)
    brief = json.load(open(a[a.index('--brief') + 1])) if '--brief' in a else None
    jp = a[a.index('--json') + 1] if '--json' in a else None
    sys.exit(main(a[0], brief, '--render' in a, jp))
