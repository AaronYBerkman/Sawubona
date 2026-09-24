# App icons and the link preview card, from the ink sprig (assets/art/sprig.svg).
#
#   python scripts/make-brand.py      # needs resvg-py and pillow; fonts: Georgia
#
# -> assets/brand/icon.svg, icon-{180,192,512}.png, card.svg, card.png
import io
import re
from pathlib import Path

import resvg_py
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'brand'
INK, PAPER, FOREST = '#1f2a1e', '#f4efe3', '#4a5e3f'
FONT_DIRS = ['/System/Library/Fonts/Supplemental', '/Library/Fonts', '/usr/share/fonts']

sprig = re.search(r'-->\s*(.*)</svg>', (ROOT / 'assets/art/sprig.svg').read_text(), re.S).group(1)

# The sprig spans about x 3-30, y 4-39 of its 40-unit box: centred at scale 8 it
# stays inside the 80% circle a maskable icon may be cut to.
ICON = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<!-- Sawubona app icon: the ink sprig on paper, inside the maskable safe zone. Made by scripts/make-brand.py. -->
<rect width="512" height="512" fill="{PAPER}"/>
<g transform="translate(124 84) scale(8)" color="{INK}">{sprig}</g>
</svg>'''

CARD = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<!-- Link preview card. Made by scripts/make-brand.py. -->
<rect width="1200" height="630" fill="{PAPER}"/>
<rect x="28" y="28" width="1144" height="574" fill="none" stroke="{INK}" stroke-opacity=".25" stroke-width="2"/>
<g transform="translate(70 95) scale(11)" color="{INK}">{sprig}</g>
<text x="520" y="250" font-family="Georgia" font-weight="bold" font-size="112" fill="{INK}">Sawubona</text>
<text x="524" y="300" font-family="Georgia" font-style="italic" font-size="30" fill="{FOREST}">“we see you”</text>
<text x="524" y="385" font-family="Georgia" font-size="38" fill="{INK}">Practise South African Sign</text>
<text x="524" y="433" font-family="Georgia" font-size="38" fill="{INK}">Language with your camera.</text>
<text x="524" y="505" font-family="Georgia" font-size="25" fill="{INK}" fill-opacity=".75">1,858 signs · fingerspelling · sentences</text>
<text x="524" y="545" font-family="Georgia" font-size="25" fill="{FOREST}">aaronyberkman.github.io/Sawubona</text>
</svg>'''


def render(svg, w, h, out):
    png = resvg_py.svg_to_bytes(svg_string=svg, width=w, height=h, font_dirs=FONT_DIRS)
    Image.open(io.BytesIO(bytes(png))).convert('RGB').save(out, optimize=True)


OUT.mkdir(exist_ok=True)
(OUT / 'icon.svg').write_text(ICON)
(OUT / 'card.svg').write_text(CARD)
for size in (180, 192, 512):
    render(ICON, size, size, OUT / f'icon-{size}.png')
render(CARD, 1200, 630, OUT / 'card.png')
