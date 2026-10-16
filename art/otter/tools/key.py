"""Green-screen clip -> stacked-alpha video (premultiplied colour on top, alpha below) + cut-out still.

usage: python3 key.py in.mp4 out_basename [--size 480] [--trim START:END] [--still FRAME]
writes out_basename.mp4 (H.264), out_basename.webm (VP9), out_basename.png (still, straight alpha)
"""
import argparse, json, subprocess
import numpy as np
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('src')
p.add_argument('out')
p.add_argument('--size', type=int, default=480)
p.add_argument('--trim', default='')          # seconds "a:b"
p.add_argument('--still', type=int, default=0)
p.add_argument('--crop', default='')          # "x,y,w,h" in source pixels, applied before scaling
p.add_argument('--fps', type=int, default=24)
a = p.parse_args()

info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', a.src]))
W, H = info['streams'][0]['width'], info['streams'][0]['height']
vf = []
if a.crop:
    x, y, w, h = map(int, a.crop.split(','))
    vf.append(f'crop={w}:{h}:{x}:{y}')
    W, H = w, h
S = a.size
vf += [f'scale={S}:{S}:flags=lanczos', f'fps={a.fps}']
cmd = ['ffmpeg', '-v', 'error']
if a.trim:
    s, e = a.trim.split(':')
    cmd += ['-ss', s, '-to', e]
cmd += ['-i', a.src, '-vf', ','.join(vf), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
raw = subprocess.check_output(cmd)
frames = np.frombuffer(raw, np.uint8).reshape(-1, S, S, 3).astype(np.float32) / 255
n = len(frames)

# backdrop colour: median of the outer border over all frames
border = np.concatenate([frames[:, :8].reshape(-1, 3), frames[:, -8:].reshape(-1, 3), frames[:, :, :8].reshape(-1, 3), frames[:, :, -8:].reshape(-1, 3)])
key = np.median(border, 0)


def matte(f):
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    # "greenness" relative to the other channels, normalised by the backdrop's own greenness
    kg = key[1] - max(key[0], key[2])
    spill = g - np.maximum(r, b)
    alpha = 1 - np.clip((spill - 0.08 * kg) / (0.62 * kg), 0, 1)
    # despill: clamp green to the stronger of red/blue where it exceeds them
    g2 = np.minimum(g, np.maximum(r, b) * 1.02)
    out = np.stack([r, g2, b], -1)
    # unmix the backdrop from partially transparent edge pixels
    al = alpha[..., None]
    out = np.where(al > 0.02, np.clip((out - (1 - al) * np.array([key[0], min(key[1], max(key[0], key[2])), key[2]])) / np.maximum(al, 1e-3), 0, 1), 0)
    return out, alpha


enc_in = ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{S}x{2 * S}', '-r', str(a.fps), '-i', '-']
h264 = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', *enc_in, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', a.out + '.mp4'], stdin=subprocess.PIPE)
vp9 = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', *enc_in, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', a.out + '.webm'], stdin=subprocess.PIPE)
for i, f in enumerate(frames):
    col, al = matte(f)
    prem = col * al[..., None]
    stacked = np.concatenate([prem, np.repeat(al[..., None], 3, -1)], 0)
    buf = (np.clip(stacked, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()
    h264.stdin.write(buf)
    vp9.stdin.write(buf)
    if i == a.still:
        Image.fromarray((np.dstack([col, al]) * 255 + 0.5).astype(np.uint8), 'RGBA').save(a.out + '.png')
h264.stdin.close(); vp9.stdin.close(); h264.wait(); vp9.wait()
print(json.dumps({'frames': n, 'key': [round(float(k) * 255) for k in key], 'size': S}))
