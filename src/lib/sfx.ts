/** Tiny synthesized sound effects — no audio files needed. */
let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15) {
  const a = ac()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  const t = a.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export const sfx = {
  correct() {
    tone(660, 0, 0.12, 'triangle')
    tone(990, 0.09, 0.2, 'triangle')
  },
  wrong() {
    tone(200, 0, 0.18, 'sawtooth', 0.08)
    tone(150, 0.12, 0.25, 'sawtooth', 0.08)
  },
  complete() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'triangle'))
  },
  tap() {
    tone(880, 0, 0.05, 'sine', 0.05)
  },
}
