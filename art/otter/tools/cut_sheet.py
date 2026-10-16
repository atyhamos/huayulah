"""Cut the nine expressions out of sheet/expressions.png (3x3 grid on a cream page, labels under each)
and place them in the shared 1024 px frame at the master pose's size, as framed/<name>.png cut-outs.

usage: python3 cut_sheet.py   (needs numpy, Pillow, scipy)
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HF = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = [['welcoming', 'delighted', 'proud'], ['thinking', 'surprised', 'determined'], ['sheepish', 'reassuring', 'sleepy']]
HEIGHT = {'sleepy': 0.84}  # relative to the master pose's height; standing poses match it

sheet = np.asarray(Image.open(f'{HF}/sheet/expressions.png').convert('RGB')).astype(np.float32) / 255
H, W, _ = sheet.shape
hub = np.asarray(Image.open(f'{HF}/framed/hub.png'))[..., 3] > 40
hy, hx = np.where(hub)
hub_h, hub_bottom, hub_cx = hy.max() - hy.min(), hy.max(), (hx.min() + hx.max()) / 2

for r, row in enumerate(NAMES):
    for c, name in enumerate(row):
        cell = sheet[r * H // 3:(r + 1) * H // 3, c * W // 3:(c + 1) * W // 3]
        bg = np.median(np.concatenate([cell[:4].reshape(-1, 3), cell[:, :4].reshape(-1, 3), cell[:, -4:].reshape(-1, 3)]), 0)
        # distance from the page colour, weighting blue: it is what separates the cream belly from the page
        d = np.sqrt((((cell - bg) * np.array([1.0, 1.4, 2.2])) ** 2).sum(-1))
        near = d < 0.07
        lab, _ = ndimage.label(near)
        border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        # page = light pixels connected to the edge; enclosed light patches are eye whites, which stay
        page = np.isin(lab, border[border > 0])
        fg = ~page
        # keep the character, drop the label: the biggest connected blob of foreground
        flab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=3))
        big = np.argmax(ndimage.sum(fg, flab, range(1, n + 1))) + 1
        fg &= flab == big
        # soft edge: a 2 px band around the page takes its alpha from the colour distance
        band = ndimage.binary_dilation(page, iterations=2) & fg
        alpha = fg.astype(np.float32)
        alpha[band] = np.clip((d[band] - 0.05) / 0.3, 0, 1)
        A = alpha[..., None]
        col = np.where(A > 0.02, np.clip((cell - (1 - A) * bg) / np.maximum(A, 1e-3), 0, 1), 0)
        rgba = Image.fromarray((np.dstack([col, alpha]) * 255 + .5).astype(np.uint8), 'RGBA')
        ys, xs = np.where(alpha > 0.15)
        crop = rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        s = HEIGHT.get(name, 1.0) * hub_h / crop.height
        crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
        out = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
        out.alpha_composite(crop, (round(hub_cx - crop.width / 2), hub_bottom + 1 - crop.height))
        out.save(f'{HF}/framed/{name}.png')
        print(name, 'scale', round(s, 2))
