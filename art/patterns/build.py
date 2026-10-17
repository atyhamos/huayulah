"""Designer's Peranakan SVGs -> src/assets/patterns/<name>.svg (transparent) and <name>-dark.svg,
plus <name>-solid.svg (the original ivory ground) for the border strips.

Transparent: drop the first full-canvas ivory <rect> (as the designer's README suggests), so the
pattern sits on the page/card colour. Dark: the same, recoloured for the dark theme.
usage: python3 art/patterns/build.py
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'src', 'assets', 'patterns')
os.makedirs(OUT, exist_ok=True)
NAMES = {'01-bloom': 'bloom', '02-quiet-sage': 'quiet-sage', '03a-floral-border': 'floral-border',
         '03b-scallop-border': 'scallop-border', '04-soft-geometry': 'soft-geometry'}
DARK = {  # light palette -> dark theme
    '#F6F6EF': '#10171A',  # ivory details become cut-outs in the page colour
    '#DDE8DD': '#1B282C',  # pale sage: just above the dark page
    '#B9CBB6': '#2C3E37',  # sage
    '#458362': '#3D7558',  # jade
    '#D84B3E': '#C2463B',  # coral
    '#E6B841': '#C9A23D',  # gold
}
for src, name in NAMES.items():
    svg = re.sub(r'<!--.*?-->', '', open(os.path.join(HERE, f'{src}.svg')).read(), flags=re.S)
    if 'border' in name:
        open(os.path.join(OUT, f'{name}-solid.svg'), 'w').write(svg)
    svg = re.sub(r'<rect width="\d+" height="\d+" fill="#F6F6EF"/>', '', svg, count=1)
    open(os.path.join(OUT, f'{name}.svg'), 'w').write(svg)
    dark = re.sub(r'#[0-9A-Fa-f]{6}', lambda m: DARK.get(m.group(0).upper(), m.group(0)), svg)
    open(os.path.join(OUT, f'{name}-dark.svg'), 'w').write(dark)
    print(name, len(svg))
