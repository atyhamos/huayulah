"""Line scenes: the designer's PNGs (one per MRT line) -> public/scenes/uNN.webp, trimmed and resized.

usage: python3 art/scenes/build.py <folder with the original PNGs>
The originals (~20 MB) are kept out of git; hotspot boxes in src/content/scenes.ts are percentages
of the trimmed images written here, so re-running on the same originals keeps them valid.
"""
import json, os, sys
from PIL import Image

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'public', 'scenes')
os.makedirs(OUT, exist_ok=True)
WIDTH = 960  # 2x a ~480 px column

SCENES = {  # unit id: original file name (the designer numbered them in a different order)
    'u01': 'Singapore Shophouse Reading Nook-1.png',
    'u02': 'Singapore provision shop checkout-3.png',
    'u03': 'Cozy Singapore kopitiam corner-2.png',
    'u04': 'Singapore Bus Stop Scene-6.png',
    'u05': 'Cozy HDB Home Entrance-4.png',
    'u06': 'Cozy Singapore Family Dining Corner-5.png',
    'u07': 'Singapore desk with kopi and errands-11.png',
    'u08': 'School and field gear shelf-12.png',
    'u09': 'Singapore festive lantern and ketupat display-7.png',
    'u10': 'Singapore chat corner with jade benches-8.png',
    'u11': 'Singapore hawker table spread-9.png',
    'u12': 'Heartland HDB with Dragon Playground-10.png',
    'u13': 'Kopitiam Conversation Corner-13.png',
    'u14': 'Merlion, Marina Bay Sands, and Supertree-14.png',
}

sizes = {}
for unit, name in SCENES.items():
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    x0, y0, x1, y1 = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    pad = 12
    im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    h = round(im.height * WIDTH / im.width)
    im = im.resize((WIDTH, h), Image.LANCZOS)
    path = os.path.join(OUT, f'{unit}.webp')
    im.save(path, quality=84, method=6)
    sizes[unit] = [WIDTH, h]
    print(unit, im.size, f'{os.path.getsize(path) / 1024:.0f} KB')

with open(os.path.join(ROOT, 'src', 'content', 'scenes.sizes.json'), 'w') as f:
    json.dump(sizes, f, indent=1)
