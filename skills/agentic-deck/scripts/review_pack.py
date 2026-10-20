#!/usr/bin/env python3
"""Build the review pack every reviewer agent reads.

Usage:  python3 review_pack.py deck.pptx outDir [--brief brief.json] [--pdf deck.pdf]
        python3 review_pack.py --html htmlOutDir outDir      (HTML path: uses deck.pdf, text.json, qa_html.json)

Writes to outDir:
  deck.pdf            (LibreOffice export, unless --pdf is given, e.g. from the HTML renderer)
  slides/NN.jpg       one image per slide (110 dpi), the thing reviewers must look at
  contact.jpg         all slides on one sheet (pacing, colour balance, rhythm)
  slides.json         per slide: title, every text run, word count, notes, image path
  qa.json             output of qa.py
  titles.md           the titles in order (the read-aloud test)
"""
import sys, os, json, glob, subprocess, shutil, tempfile
from pptx import Presentation
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def to_pdf(pptx, out):
    soffice = '/mnt/skills/public/pptx/scripts/office/soffice.py'
    cmd = (['python3', soffice] if os.path.exists(soffice) else ['soffice']) + ['--headless', '--convert-to', 'pdf', '--outdir', out, pptx]
    subprocess.run(cmd, capture_output=True)
    pdf = os.path.join(out, os.path.splitext(os.path.basename(pptx))[0] + '.pdf')
    if not os.path.exists(pdf): sys.exit('PDF export failed; is LibreOffice installed?')
    final = os.path.join(out, 'deck.pdf')
    if pdf != final: shutil.move(pdf, final)
    return final


def html_pack(src, out):
    os.makedirs(os.path.join(out, 'slides'), exist_ok=True)
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdftoppm', '-jpeg', '-r', '110', os.path.join(src, 'deck.pdf'), os.path.join(tmp, 'p')], check=True)
    imgs = []
    for i, f in enumerate(sorted(glob.glob(os.path.join(tmp, 'p-*.jpg'))), 1):
        dst = os.path.join(out, 'slides', f'{i:02d}.jpg'); shutil.move(f, dst); imgs.append(dst)
    contact(imgs, out)
    text = json.load(open(os.path.join(src, 'text.json')))
    for s in text: s['image'] = os.path.abspath(imgs[s['n'] - 1])
    json.dump(text, open(os.path.join(out, 'slides.json'), 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(out, 'titles.md'), 'w') as f:
        f.write('# Titles in order (read aloud)\n\n' + '\n'.join(f'{s["n"]}. {s["title"] or "(cover or divider)"}' for s in text) + '\n')
    issues = [{'level': 'WARN' if q['check'] == 'sharp-corner' else 'FAIL', 'slide': q['slide'], 'check': q['check'], 'msg': q['text']}
              for q in json.load(open(os.path.join(src, 'qa_html.json')))]
    sys.path.insert(0, HERE)
    import qa as Q
    for k, gap, y in Q.whitespace(imgs, [s['dark'] for s in text]):
        issues.append({'level': 'WARN', 'slide': k, 'check': 'W', 'msg': f'{gap} in empty band from y {y}'})
    for s in text:
        if not s['dark'] and not s['source']: issues.append({'level': 'WARN', 'slide': s['n'], 'check': 'O', 'msg': 'no source line'})
    json.dump({'titles': [(s['n'], s['title']) for s in text], 'issues': issues}, open(os.path.join(out, 'qa.json'), 'w'), indent=1, ensure_ascii=False)
    for i in issues: print(f"{i['level']:<4} S{i['slide']} {i['check']} {i['msg']}")
    print(f'[pack] {len(imgs)} slides -> {out} (HTML path)')


def contact(imgs, out):
    from PIL import ImageDraw
    th = [Image.open(p).resize((480, 270)) for p in imgs]
    cols = 4; rows = (len(th) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 490 + 10, rows * 300 + 10), 'white'); d = ImageDraw.Draw(sheet)
    for k, im in enumerate(th):
        x, y = 10 + (k % cols) * 490, 10 + (k // cols) * 300
        sheet.paste(im, (x, y)); d.text((x, y + 274), str(k + 1), fill='black')
    sheet.save(os.path.join(out, 'contact.jpg'), quality=85)


def main(a):
    if a[0] == '--html':
        return html_pack(a[1], a[2])
    pptx, out = a[0], a[1]
    os.makedirs(os.path.join(out, 'slides'), exist_ok=True)
    pdf = a[a.index('--pdf') + 1] if '--pdf' in a else to_pdf(pptx, out)
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdftoppm', '-jpeg', '-r', '110', pdf, os.path.join(tmp, 'p')], check=True)
    imgs = []
    for i, f in enumerate(sorted(glob.glob(os.path.join(tmp, 'p-*.jpg'))), 1):
        dst = os.path.join(out, 'slides', f'{i:02d}.jpg'); shutil.move(f, dst); imgs.append(dst)
    contact(imgs, out)
    # text
    prs = Presentation(pptx); slides = []
    for i, s in enumerate(prs.slides, 1):
        title = next((sh.text_frame.text.strip() for sh in s.shapes if sh.name == 'ad-title'), '')
        texts = [sh.text_frame.text.strip() for sh in s.shapes if sh.has_text_frame and sh.text_frame.text.strip()]
        body = [t for sh, t in zip([sh for sh in s.shapes if sh.has_text_frame and sh.text_frame.text.strip()], texts)
                if not sh.name.startswith('ad-')]
        notes = s.notes_slide.notes_text_frame.text if s.has_notes_slide else ''
        slides.append({'n': i, 'title': title, 'text': texts, 'words': sum(len(t.split()) for t in body),
                       'notes': notes, 'image': os.path.abspath(imgs[i - 1]) if i <= len(imgs) else None})
    json.dump(slides, open(os.path.join(out, 'slides.json'), 'w'), indent=1, ensure_ascii=False)
    with open(os.path.join(out, 'titles.md'), 'w') as f:
        f.write('# Titles in order (read aloud)\n\n' + '\n'.join(f'{s["n"]}. {s["title"] or "(no title: cover or divider)"}' for s in slides) + '\n')
    qa = [sys.executable, os.path.join(HERE, 'qa.py'), pptx, '--json', os.path.join(out, 'qa.json')]
    if '--brief' in a: qa += ['--brief', a[a.index('--brief') + 1]]
    r = subprocess.run(qa, capture_output=True, text=True)
    # whitespace scan on the rendered slides (qa.py's W check), appended to qa.json
    sys.path.insert(0, HERE)
    import qa as Q
    gaps = Q.whitespace(imgs, [Q.is_dark(s) for s in prs.slides])
    qj = os.path.join(out, 'qa.json'); data = json.load(open(qj))
    for k, gap, y in gaps:
        data['issues'].append({'level': 'WARN', 'slide': k, 'check': 'W', 'msg': f'{gap} in empty band from y {y}: fill it or tighten the layout'})
        print(f'WARN S{k} W {gap} in empty band from y {y}')
    json.dump(data, open(qj, 'w'), indent=1, ensure_ascii=False)
    print(r.stdout[-3000:])
    print(f'[pack] {len(imgs)} slides -> {out} (slides/, contact.jpg, slides.json, qa.json, titles.md)')


if __name__ == '__main__':
    if len(sys.argv) < 3: print(__doc__); sys.exit(2)
    main(sys.argv[1:])
