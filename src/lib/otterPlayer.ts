// Plays Ah Tat's "stacked alpha" clips on a WebGL canvas. Each clip is an ordinary video whose top
// half is premultiplied colour and bottom half the alpha matte (see art/otter/tools/key.py), so it
// works in every browser without alpha-channel video. Two video slots let clips cross-fade.

const VS = `attribute vec2 p; varying vec2 uv;
void main() { uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`
const FS = `precision mediump float; varying vec2 uv; uniform sampler2D a; uniform sampler2D b; uniform float t;
vec4 px(sampler2D s) {
  vec3 c = texture2D(s, vec2(uv.x, uv.y * .5)).rgb;
  float al = texture2D(s, vec2(uv.x, .5 + uv.y * .5)).r;
  return vec4(min(c, vec3(al)), al);
}
void main() { gl_FragColor = mix(px(a), px(b), t); }`

const FADE_MS = 220

let format: 'webm' | 'mp4' | null = null
function pickFormat(): 'webm' | 'mp4' {
  if (!format) {
    const v = document.createElement('video')
    format = v.canPlayType('video/webm; codecs="vp9"') === 'probably' ? 'webm' : 'mp4'
  }
  return format
}

/**
 * Clip downloads are shared by every otter on the page and fetched whole, so the service worker can
 * cache them for offline use (a <video> src would make range requests). The artifact demo's sandbox
 * may refuse blob: media, so it plays the files directly.
 */
const blobs = new Map<string, Promise<string>>()
function clipUrl(name: string): Promise<string> {
  const key = `${name}.${pickFormat()}`
  const url = `${import.meta.env.BASE_URL}otter/${key}`
  if (import.meta.env.MODE === 'artifact') return Promise.resolve(url)
  let p = blobs.get(key)
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`otter clip ${key}: ${r.status}`)
        return r.blob()
      })
      .then((b) => URL.createObjectURL(b))
    p.catch(() => blobs.delete(key))
    blobs.set(key, p)
  }
  return p
}

export function webglAvailable() {
  try {
    return !!document.createElement('canvas').getContext('webgl')
  } catch {
    return false
  }
}

export class OtterPlayer {
  private gl: WebGLRenderingContext
  private tex: WebGLTexture[]
  private uT: WebGLUniformLocation | null
  private videos: HTMLVideoElement[]
  private front = 0
  private fadeFrom = 0
  private fadeStart = 0
  private raf = 0
  private active = true
  private drawn = false
  /** Whether each slot's texture holds a frame of its current clip (kept while the video seeks or stalls). */
  private hasFrame = [false, false]
  /** The new clip is loaded; the cross-fade starts once its first frame is on the GPU. */
  private pendingFade = false
  private token = 0
  current = ''
  onReady: (() => void) | null = null
  onError: (() => void) | null = null

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!gl) throw new Error('webgl unavailable')
    this.gl = gl
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1i(gl.getUniformLocation(prog, 'a'), 0)
    gl.uniform1i(gl.getUniformLocation(prog, 'b'), 1)
    this.uT = gl.getUniformLocation(prog, 't')
    this.tex = [0, 1].map((i) => {
      const t = gl.createTexture()!
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
      return t
    })
    this.videos = [0, 1].map(() => {
      const v = document.createElement('video')
      v.muted = true
      v.playsInline = true
      v.setAttribute('playsinline', '')
      v.preload = 'auto'
      return v
    })
    this.tick()
  }

  /** Switch to a clip, cross-fading from the current one. `onEnd` fires when a non-looping clip finishes. */
  play(name: string, { loop = false, onEnd }: { loop?: boolean; onEnd?: () => void } = {}) {
    const token = ++this.token
    this.current = name
    clipUrl(name)
      .then((url) => {
        if (token !== this.token) return
        const next = this.drawn ? 1 - this.front : this.front
        const v = this.videos[next]
        v.loop = loop
        v.onended = loop ? null : () => token === this.token && onEnd?.()
        this.hasFrame[next] = false
        v.src = url
        v.addEventListener(
          'loadeddata',
          () => {
            if (token !== this.token) return
            if (this.active) void v.play().catch(() => {})
            if (next !== this.front) {
              this.fadeFrom = this.front
              this.front = next
              this.fadeStart = 0
              this.pendingFade = true
            }
          },
          { once: true },
        )
      })
      .catch(() => this.onError?.())
  }

  /** Pause while off-screen or in a background tab. */
  setActive(on: boolean) {
    if (on === this.active) return
    this.active = on
    const v = this.videos[this.front]
    if (on) {
      if (v.src && (v.loop || !v.ended)) void v.play().catch(() => {})
      this.tick()
    } else {
      for (const x of this.videos) x.pause()
      cancelAnimationFrame(this.raf)
    }
  }

  /**
   * Copy the video's current frame to its texture. While it has no frame to give (seeking back to the
   * start of a loop, or stalled), keep the last one: on phones that gap is a frame or two, and drawing
   * nothing then made every loop flicker.
   */
  private upload(i: number) {
    const v = this.videos[i]
    if (v.readyState >= 2 && !v.seeking) {
      const gl = this.gl
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, this.tex[i])
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v)
      this.hasFrame[i] = true
    }
    return this.hasFrame[i]
  }

  private tick = () => {
    if (!this.active) return
    const gl = this.gl
    const w = Math.round(this.canvas.clientWidth * Math.min(2, window.devicePixelRatio || 1))
    if (w && this.canvas.width !== w) this.canvas.width = this.canvas.height = w
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    const frontReady = this.upload(this.front)
    if (this.pendingFade && frontReady) {
      this.pendingFade = false
      this.fadeStart = performance.now()
    }
    // until the new clip has a frame, keep showing the old one
    const t = this.pendingFade ? 0 : this.fadeStart ? Math.min(1, (performance.now() - this.fadeStart) / FADE_MS) : 1
    if (t < 1) this.upload(this.fadeFrom)
    const shown = frontReady || (t < 1 && this.hasFrame[this.fadeFrom])
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex[t < 1 ? this.fadeFrom : this.front])
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.tex[this.front])
    gl.uniform1f(this.uT, t)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (shown) {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (!this.drawn) {
        this.drawn = true
        this.onReady?.()
      }
    }
    if (t >= 1 && this.fadeStart && !this.pendingFade) {
      this.fadeStart = 0
      this.videos[1 - this.front].pause()
    }
    this.raf = requestAnimationFrame(this.tick)
  }

  destroy() {
    this.active = false
    this.token++
    cancelAnimationFrame(this.raf)
    for (const v of this.videos) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
