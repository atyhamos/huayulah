import { useEffect, useRef, useState } from 'react'
import { OtterPlayer, webglAvailable } from '../lib/otterPlayer'

export type OtterMood =
  | 'idle' | 'wave' | 'happy' | 'cheer' | 'sad' | 'think' | 'sleep'
  // stills only, from the expression sheet
  | 'proud' | 'surprised' | 'determined' | 'sheepish' | 'reassuring' | 'sleepy'

/** Moods with a looping clip, and one-shot clips that start and end on the main pose. Other moods are breathing stills. */
const LOOPS: Partial<Record<OtterMood, string>> = { idle: 'idle', sad: 'sad', think: 'think', sleep: 'sleep' }
const ONE_SHOTS: Partial<Record<OtterMood, string>> = { wave: 'wave', happy: 'happy', cheer: 'cheer' }
/** One-shot moods that come back every so often while on screen (ms range). */
const REPEAT: Partial<Record<OtterMood, [number, number]>> = { wave: [9000, 15000], cheer: [4500, 7000] }

/** Below this size Ah Tat is a still: video would cost more than it shows. */
const VIDEO_MIN = 72
/** The art is drawn larger than the layout box (raised arms and hops overflow it upwards). */
const ART_SCALE = 1.27

/** Squash, stretch, jump and land: played with the Web Animations API so nothing remounts. */
const HOP: Keyframe[] = [
  { transform: 'none' },
  { transform: 'scale(1.1, 0.88)', offset: 0.14 },
  { transform: 'translateY(-18%) scale(0.93, 1.09)', offset: 0.38 },
  { transform: 'translateY(-21%) scale(1, 1)', offset: 0.56 },
  { transform: 'translateY(0) scale(0.96, 1.05)', offset: 0.76 },
  { transform: 'scale(1.08, 0.92)', offset: 0.86 },
  { transform: 'none' },
]

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
let canVideo: boolean | null = null

function still(mood: OtterMood | 'idle', px: number) {
  return `${import.meta.env.BASE_URL}otter/${mood}${px * ART_SCALE * Math.min(2, window.devicePixelRatio || 1) <= 200 ? '-sm' : ''}.webp`
}

/**
 * Ah Tat (阿獭), a young smooth-coated otter: Singapore's most famous urban wildlife.
 * The layout box is `size` wide and 1.1× as tall; `poke` (a changing number) makes him hop.
 */
export function OtterArt({ mood = 'idle', size = 96, className = '', poke = 0 }: { mood?: OtterMood; size?: number; className?: string; poke?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLSpanElement>(null)
  const player = useRef<OtterPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const artEl = useRef<HTMLSpanElement>(null)
  const video = size >= VIDEO_MIN && !reducedMotion() && (canVideo ??= webglAvailable())
  const clipFor = (m: OtterMood) => LOOPS[m] ?? ONE_SHOTS[m]
  const playing = video && !!clipFor(mood)

  // one player per mounted otter
  useEffect(() => {
    if (!playing || !canvas.current) return
    let p: OtterPlayer
    try {
      p = new OtterPlayer(canvas.current)
    } catch {
      return
    }
    player.current = p
    p.onReady = () => setReady(true)
    p.onError = () => setReady(false)
    const io = new IntersectionObserver(([e]) => p.setActive(e.isIntersecting && !document.hidden))
    if (box.current) io.observe(box.current)
    const vis = () => p.setActive(!document.hidden)
    document.addEventListener('visibilitychange', vis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
      p.destroy()
      player.current = null
      setReady(false)
    }
  }, [playing])

  // what to play for the mood: its loop, or its one-shot then idle (repeating for some moods)
  useEffect(() => {
    const p = player.current
    if (!p || !playing) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const idle = () => p.play('idle', { loop: true })
    const shot = ONE_SHOTS[mood]
    if (!shot) {
      p.play(LOOPS[mood]!, { loop: true })
      return
    }
    const run = () =>
      p.play(shot, {
        onEnd: () => {
          idle()
          const r = REPEAT[mood]
          if (r) timer = setTimeout(run, r[0] + Math.random() * (r[1] - r[0]))
        },
      })
    run()
    return () => clearTimeout(timer)
  }, [mood, playing])

  // a poke: hop, plus a happy clip when he's standing (sitting or sleeping poses just hop)
  useEffect(() => {
    if (!poke) return
    if (!reducedMotion()) artEl.current?.animate(HOP, { duration: 700, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' })
    const p = player.current
    if (p && (mood === 'idle' || mood in ONE_SHOTS)) p.play('happy', { onEnd: () => p.play('idle', { loop: true }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poke])

  const art = Math.round(size * ART_SCALE)
  return (
    <span
      ref={box}
      className={`otter relative inline-block align-bottom ${className}`}
      style={{ width: size, height: Math.round(size * 1.1) }}
      data-mood={mood}
      data-testid="otter-art"
      data-ready={ready ? 'video' : 'still'}
      aria-hidden
    >
      <span
        ref={artEl}
        className="pointer-events-none absolute bottom-0 left-1/2"
        style={{ width: art, height: art, marginLeft: -art / 2, transformOrigin: '50% 92%' }}
      >
        <img
          // one-shots start on the main pose, so that is what shows while they load
          src={still(playing && mood in ONE_SHOTS ? 'idle' : mood, size)}
          alt=""
          draggable={false}
          className={`absolute inset-0 h-full w-full transition-opacity duration-200 ${ready ? 'opacity-0' : ''} ${playing ? '' : 'otter-breathe'}`}
        />
        {playing && <canvas ref={canvas} className="absolute inset-0 h-full w-full" />}
      </span>
    </span>
  )
}
