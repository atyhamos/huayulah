"""Build the app's otter assets from the raw Higgsfield clips and pose stills.

clips  -> public/otter/<name>.webm|.mp4   (stacked alpha, cropped square, 400 px)
stills -> public/otter/<mood>.webp (400 px) and <mood>-sm.webp (200 px), cut-out with alpha
avatar -> public/otter/avatar.webp (head and shoulders, 160 px)

All frames share one coordinate system: the 1024 px master frame (the clips are 960 px renders of it).
CROP is the square of that frame that holds every pose, cheer arms included.
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

HF = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HF, '..', '..', 'public', 'otter')
os.makedirs(OUT, exist_ok=True)
CROP = (0.11, 0.14, 0.78)  # x, y, side as fractions of the frame

CLIPS = {  # name: (raw file, trim "a:b" or '')
    'idle': ('raw/idle-mini.mp4', ''),
    'wave': ('raw/wave-fast.mp4', ''),
    'cheer': ('raw/cheer-fast.mp4', ''),
    'happy': ('raw/happy-fast.mp4', ''),
}
for extra in ['talk', 'sad', 'think', 'sleep']:  # added once their clips exist
    if os.path.exists(f'{HF}/raw/{extra}.mp4'):
        CLIPS[extra] = (f'raw/{extra}.mp4', '')

STILLS = {  # mood: framed pose png, or (clip, seconds) to take a frame from
    'idle': 'framed/hub.png', 'sad': 'framed/sad-n.png', 'think': 'framed/think-n.png', 'sleep': 'framed/sleep-n.png',
    'happy': ('raw/happy-fast.mp4', 1.5),
    # from the expression sheet (sheet/expressions.png, cut by cut_sheet.py)
    'wave': 'framed/welcoming.png', 'cheer': 'framed/delighted.png', 'proud': 'framed/proud.png',
    'surprised': 'framed/surprised.png', 'determined': 'framed/determined.png', 'sheepish': 'framed/sheepish.png',
    'reassuring': 'framed/reassuring.png', 'sleepy': 'framed/sleepy.png',
}


def crop_box(w):
    x, y, s = CROP
    return round(x * w), round(y * w), round(s * w)


def key_frame(rgb):
    """Same matte as key.py, for a single frame (float 0-1 RGB) -> RGBA float."""
    a = rgb
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    k = np.median(border, 0)
    kg = k[1] - max(k[0], k[2])
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    al = 1 - np.clip((g - np.maximum(r, b) - 0.08 * kg) / (0.62 * kg), 0, 1)
    g2 = np.minimum(g, np.maximum(r, b) * 1.02)
    col = np.stack([r, g2, b], -1)
    kd = np.array([k[0], min(k[1], max(k[0], k[2])), k[2]])
    A = al[..., None]
    col = np.where(A > 0.02, np.clip((col - (1 - A) * kd) / np.maximum(A, 1e-3), 0, 1), 0)
    return np.dstack([col, al])


def save_still(rgba_img, mood):
    w = rgba_img.width
    x, y, s = crop_box(w)
    sq = rgba_img.crop((x, y, x + s, y + s))
    sq.resize((400, 400), Image.LANCZOS).save(f'{OUT}/{mood}.webp', quality=88, method=6)
    sq.resize((200, 200), Image.LANCZOS).save(f'{OUT}/{mood}-sm.webp', quality=88, method=6)
    return sq


for name, (src, trim) in CLIPS.items():
    w = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', f'{HF}/{src}']))
    x, y, s = crop_box(w)
    args = ['python3', f'{HF}/tools/key.py', f'{HF}/{src}', f'{OUT}/{name}', '--size', '400', '--crop', f'{x},{y},{s},{s}']
    if trim:
        args += ['--trim', trim]
    subprocess.run(args, check=True)
    os.remove(f'{OUT}/{name}.png')  # key.py's own still; the app uses the ones below

for mood, src in STILLS.items():
    if isinstance(src, str):
        im = Image.open(f'{HF}/{src}').convert('RGBA')
    else:
        clip, t = src
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', f'{HF}/{clip}', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
        n = int(round((len(raw) / 3) ** 0.5))
        f = np.frombuffer(raw, np.uint8).reshape(n, n, 3).astype(np.float32) / 255
        im = Image.fromarray((key_frame(f) * 255 + .5).astype(np.uint8), 'RGBA')
    sq = save_still(im, mood)
    if mood == 'idle':
        # head and shoulders for round avatars: centre of the face, ~45% of the crop
        S = sq.width
        sq.crop((round(.24 * S), round(.20 * S), round(.76 * S), round(.72 * S))).resize((160, 160), Image.LANCZOS).save(f'{OUT}/avatar.webp', quality=88, method=6)

total = sum(os.path.getsize(f'{OUT}/{f}') for f in os.listdir(OUT))
print('built', sorted(os.listdir(OUT)), f'{total / 1024:.0f} KB')
