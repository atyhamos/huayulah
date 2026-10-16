"""Put a generated pose (on green) into the shared 1024 frame used by the master pose:
scaled to 74%, bottom-aligned 12 px above the edge, on flat green (for start/end frames)
and as a transparent cut-out (for app stills).

usage: python3 frame_pose.py in.png out_basename   ->  out_basename-green.png, out_basename.png
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB').resize((1024, 1024), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
spill = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
al = 1 - np.clip((spill - 0.04) / 0.22, 0, 1)
a[..., 1] = np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2]) * 1.02)
fg = Image.fromarray((a * 255 + .5).astype(np.uint8))
m = Image.fromarray((al * 255 + .5).astype(np.uint8))
n = int(1024 * 0.74)
x0, y0 = (1024 - n) // 2, 1024 - n - 12
fg, m = fg.resize((n, n), Image.LANCZOS), m.resize((n, n), Image.LANCZOS)
green = Image.new('RGB', (1024, 1024), (3, 177, 68))
green.paste(fg, (x0, y0), m)
green.save(out + '-green.png')
cut = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
cut.paste(Image.merge('RGBA', (*fg.split(), m)), (x0, y0))
cut.save(out + '.png')
print('ok', out)
