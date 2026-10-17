import { useLayoutEffect, useRef, useState } from 'react'

const MARGIN = 8

/**
 * Where to put a speech bubble that is portalled with position: fixed (so no card can clip it): the
 * preferred side of its anchor if it fits on screen, otherwise the first side that does, then nudged
 * inside the viewport. Used by Ah Tat and the line scenes.
 */
export function useBubblePosition<T extends HTMLElement = HTMLDivElement>(
  anchor: React.RefObject<HTMLElement | null>,
  key: string,
  prefer: 'right' | 'left' | 'top',
) {
  const ref = useRef<T>(null)
  const [pos, setPos] = useState({ left: 0, top: 0, ready: false })
  useLayoutEffect(() => {
    if (!key) {
      setPos((p) => (p.ready ? { ...p, ready: false } : p))
      return
    }
    const place = () => {
      const a = anchor.current?.getBoundingClientRect()
      const el = ref.current
      if (!a || !el) return
      // layout size, not the (pop-animated, scaled) visual box
      const b = { width: el.offsetWidth, height: el.offsetHeight }
      const vw = window.innerWidth
      const vh = window.innerHeight
      const spots = {
        right: { left: a.right - a.width * 0.15, top: a.top + 4 },
        left: { left: a.left + a.width * 0.2 - b.width, top: a.top },
        top: { left: a.left + a.width / 2 - b.width / 2, top: a.top - b.height - 4 },
      }
      const fits = (s: { left: number; top: number }) =>
        s.left >= MARGIN && s.left + b.width <= vw - MARGIN && s.top >= MARGIN && s.top + b.height <= vh - MARGIN
      const order = [prefer, ...(['right', 'left', 'top'] as const).filter((x) => x !== prefer)]
      const spot = order.map((k) => spots[k]).find(fits) ?? spots[prefer]
      setPos({
        left: Math.min(Math.max(spot.left, MARGIN), vw - b.width - MARGIN),
        top: Math.min(Math.max(spot.top, MARGIN), vh - b.height - MARGIN),
        ready: true,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor, key, prefer])
  return { ...pos, ref }
}
