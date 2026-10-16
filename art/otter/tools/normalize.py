"""Rescale framed pose cut-outs so the character matches the master pose's size, on the same baseline.
usage: python3 normalize.py   (reads framed/*.png, writes framed/<name>-n.png and -n-green.png)"""
from PIL import Image
import numpy as np
hub = Image.open('framed/hub.png')
def bbox(im):
    a = np.asarray(im)[..., 3] > 40
    ys, xs = np.where(a); return xs.min(), ys.min(), xs.max(), ys.max()
hx0, hy0, hx1, hy1 = bbox(hub); hh = hy1 - hy0; hcx = (hx0 + hx1) / 2
targets = {'sad': ('h', 0.86), 'think': ('h', 1.0), 'sleep': ('w', 0.92)}
for name, (dim, r) in targets.items():
    im = Image.open(f'framed/{name}.png'); x0, y0, x1, y1 = bbox(im)
    crop = im.crop((x0, y0, x1 + 1, y1 + 1))
    s = (r * hh / crop.height) if dim == 'h' else (r * (hx1 - hx0) / crop.width)
    crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
    out = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    out.alpha_composite(crop, (round(hcx - crop.width / 2), hy1 + 1 - crop.height))
    out.save(f'framed/{name}-n.png')
    g = Image.new('RGBA', (1024, 1024), (3, 177, 68, 255)); g.alpha_composite(out); g.convert('RGB').save(f'framed/{name}-n-green.png')
    print(name, 'scale', round(s, 2))
