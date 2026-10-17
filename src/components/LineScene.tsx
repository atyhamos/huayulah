import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { content, getItem } from '../content'
import { sceneFor, type Hotspot } from '../content/scenes'
import { isLineReached } from '../data/actions'
import { speak } from '../lib/tts'
import { useApp } from '../store/app'
import { Icon, unitMeta } from './icons'
import { useBubblePosition } from './useBubblePosition'

/** Scenes the learner has tapped (their "tap me" hints stop pulsing). Cosmetic, so localStorage only. */
const TAPPED = 'huayu-scenes-tapped'
/** Lines whose scene has already coloured in. */
const COLOURED = 'huayu-scenes-coloured'

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
function addTo(key: string, id: string) {
  try {
    localStorage.setItem(key, JSON.stringify([...readSet(key), id]))
  } catch {
    // private mode: the hint just keeps pulsing
  }
}
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A line's illustrated scene on its tinted platform. Tap an object to hear and see its Mandarin word;
 * tap the word to open its page. Locked lines are grey, and colour in the first time they're seen
 * once reached.
 */
export function LineScene({ unitId, reached, className = '' }: { unitId: string; reached: boolean; className?: string }) {
  const scene = sceneFor(unitId)
  const unit = content.units.find((u) => u.id === unitId)
  const settings = useApp((st) => st.s.settings)
  const nav = useNavigate()
  const box = useRef<HTMLDivElement>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const [word, setWord] = useState<{ hotspot: Hotspot; n: number } | null>(null)
  const [fresh, setFresh] = useState(() => !readSet(TAPPED).has(unitId))
  const [phase, setPhase] = useState<'grey' | 'sweep' | 'colour'>(() => (reached && readSet(COLOURED).has(unitId) ? 'colour' : 'grey'))

  // the first time a reached line's scene comes into view, it colours in
  useEffect(() => {
    if (!reached || phase !== 'grey' || !box.current) return
    if (reducedMotion() || typeof IntersectionObserver === 'undefined') {
      addTo(COLOURED, unitId)
      setPhase('colour')
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        addTo(COLOURED, unitId)
        setPhase('sweep')
      },
      { threshold: 0.6 },
    )
    io.observe(box.current)
    return () => io.disconnect()
  }, [reached, phase, unitId])

  // the word bubble closes after a moment, or as soon as the map scrolls
  useEffect(() => {
    if (!word) return
    const close = () => setWord(null)
    const t = setTimeout(close, 3200)
    window.addEventListener('scroll', close, { passive: true, once: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', close)
    }
  }, [word])

  const item = word ? getItem(word.hotspot.itemId) : null
  const pos = useBubblePosition<HTMLButtonElement>(anchor, word ? `${word.hotspot.itemId}-${word.n}` : '', 'top')
  if (!scene || !unit) return null

  const tap = (h: Hotspot, el: HTMLElement) => {
    anchor.current = el
    setWord((w) => ({ hotspot: h, n: (w?.n ?? 0) + 1 }))
    if (phase === 'grey') setPhase('colour')
    if (fresh) {
      setFresh(false)
      addTo(TAPPED, unitId)
    }
    if (settings.sound) speak(getItem(h.itemId).hanzi, { rate: settings.ttsRate, voiceURI: settings.voiceURI })
  }

  const grey = !reached || phase === 'grey'
  const art = (extra: string) => (
    <img
      src={`${import.meta.env.BASE_URL}${scene.src}`}
      width={scene.width}
      height={scene.height}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`block h-auto w-full select-none ${extra}`}
    />
  )
  // small targets above big ones where they overlap
  const hotspots = [...scene.hotspots].sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3])

  return (
    <div
      ref={box}
      className={`scene-platform relative overflow-hidden rounded-3xl px-3 pt-3 ring-1 ${className}`}
      style={{
        background: `color-mix(in srgb, ${unit.color} 12%, var(--color-surface))`,
        ['--tw-ring-color' as string]: `color-mix(in srgb, ${unit.color} 22%, var(--color-slate-200))`,
      }}
      data-testid={`scene-${unitId}`}
      data-state={!reached ? 'locked' : phase}
    >
      <div className={`relative z-[1] mb-2 ${fresh && reached ? 'scene-fresh' : ''}`}>
        {art(grey ? 'scene-grey' : '')}
        {phase === 'sweep' && (
          <span className="absolute inset-0" onAnimationEnd={() => setPhase('colour')}>
            {art('scene-sweep')}
          </span>
        )}
        {reached &&
          !grey &&
          scene.ambient.map((a, i) => (
            <span key={i} className={`scene-${a.kind}`} style={{ left: `${a.at[0]}%`, top: `${a.at[1]}%` }} aria-hidden>
              {a.kind !== 'glow' && (
                <>
                  <i />
                  <i />
                  <i />
                </>
              )}
            </span>
          ))}
        {hotspots.map((h) => {
          const it = getItem(h.itemId)
          const [x, y, w, hh] = h.box
          return (
            <button
              key={h.itemId}
              type="button"
              disabled={!reached}
              aria-label={it.english}
              data-testid="scene-hotspot"
              data-item={h.itemId}
              onClick={(e) => {
                e.stopPropagation()
                tap(h, e.currentTarget)
              }}
              className="absolute rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${hh}%` }}
            >
              <span className="scene-hint" aria-hidden />
            </button>
          )
        })}
      </div>
      {!reached && (
        <span className="absolute left-3 top-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
          <Icon name="lock" className="h-3.5 w-3.5" /> Reach this line to colour it in
        </span>
      )}
      {item &&
        createPortal(
          <button
            ref={pos.ref}
            type="button"
            data-testid="scene-bubble"
            onClick={() => nav(`/words/${item.id}`)}
            style={{ position: 'fixed', left: pos.left, top: pos.top, visibility: pos.ready ? 'visible' : 'hidden' }}
            className="z-[60] w-max max-w-56 animate-pop rounded-2xl border-2 border-slate-200 bg-surface px-3.5 py-2 text-left shadow-lg"
          >
            {settings.pinyinMode !== 'never' && <span className="block text-xs leading-tight text-slate-500">{item.pinyin}</span>}
            <span className="font-han block text-2xl font-bold leading-snug">{item.hanzi}</span>
            <span className="block text-sm leading-tight">{item.english}</span>
            <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-brand-600">
              Open word <Icon name="next" className="h-3 w-3" />
            </span>
          </button>,
          document.body,
        )}
    </div>
  )
}

/** On wide screens, the line nearest the middle of the screen (for the margin scene and the line picker). */
function useCurrentLine() {
  const [unitId, setUnitId] = useState<string | null>(null)
  useEffect(() => {
    const wide = matchMedia('(min-width: 1100px)')
    let raf = 0
    const pick = () => {
      raf = 0
      if (!wide.matches) return
      let best: string | null = null
      let bestD = Infinity
      for (const el of document.querySelectorAll<HTMLElement>('[data-line]')) {
        const r = el.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - window.innerHeight / 2)
        if (d < bestD) {
          bestD = d
          best = el.dataset.line ?? null
        }
      }
      setUnitId(best)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick)
    }
    pick()
    window.addEventListener('scroll', onScroll, { passive: true })
    wide.addEventListener('change', pick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      wide.removeEventListener('change', pick)
    }
  }, [])
  return unitId
}

/** On wide screens, the current line's scene sits large in the right-hand margin and swaps as you scroll. */
export function MarginScene() {
  const s = useApp((st) => st.s)
  const unitId = useCurrentLine()
  const unit = unitId ? content.units.find((u) => u.id === unitId) : null
  return (
    <aside className="margin-scene hidden min-[1100px]:block" data-testid="margin-scene">
      {unit && (
        <div key={unit.id} className="animate-pop">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: unit.color }} />
            {unitMeta(unit.id).code} · {unit.title}
          </p>
          <LineScene unitId={unit.id} reached={isLineReached(s, unit.id, content)} />
        </div>
      )}
    </aside>
  )
}

/** On wide screens, every line in the left-hand margin: click one to jump to it on the map. */
export function LineNav() {
  const s = useApp((st) => st.s)
  const current = useCurrentLine()
  const go = (unitId: string) =>
    document.querySelector(`[data-line="${unitId}"]`)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
  return (
    <nav className="line-nav hidden min-[1100px]:block" aria-label="Lines" data-testid="line-nav">
      <p className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">Lines</p>
      <ul className="flex flex-col gap-0.5">
        {content.units.map((u) => {
          const done = u.lessons.filter((l) => s.lessons[l.id]).length
          const here = u.id === current
          const boarded = isLineReached(s, u.id, content)
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => go(u.id)}
                aria-current={here ? 'location' : undefined}
                data-testid={`line-nav-${u.id}`}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left transition hover:bg-slate-100 ${here ? 'bg-slate-100 ring-1 ring-slate-200' : ''} ${boarded ? '' : 'opacity-60'}`}
              >
                <span
                  className="grid h-7 min-w-9 shrink-0 place-items-center rounded-lg px-1 font-display text-xs font-extrabold text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {unitMeta(u.id).code}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm ${here ? 'font-bold' : 'font-semibold'}`}>{u.title}</span>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {done}/{u.lessons.length}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
