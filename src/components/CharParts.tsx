import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { charInfo, familyOf, itemsWithChar, partMnemonic, partName, shownParts } from '../content/chars'
import { cardId } from '../data/types'
import { strength } from '../lib/srs'
import { useApp } from '../store/app'
import { Icon } from './icons'
import { Button, StrengthBars } from './ui'

/** How well a character is known: the best strength of any learned word containing it (0–4), or null if unseen. */
export function useCharStrength() {
  const cards = useApp((st) => st.s.cards)
  return (c: string): number | null => {
    let best: number | null = null
    for (const it of itemsWithChar(c)) {
      const card = cards[cardId(it.id, 'read')]
      if (card) best = Math.max(best ?? 0, strength(card))
    }
    return best
  }
}

/** Explains how one character is put together, with tappable parts that open their family. */
export function CharBreakdown({ ch }: { ch: string }) {
  const info = charInfo(ch)
  const [family, setFamily] = useState<string | null>(null)
  if (!info) return null
  const parts = shownParts(ch)
  const e = info.e
  const famSize = familyOf(info.r).length
  return (
    <div className="flex gap-3" data-testid="char-breakdown">
      <span className="tile grid h-16 w-16 shrink-0 place-items-center font-han text-4xl">{ch}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold text-slate-500">{info.py}</span>
          {info.d && <span className="text-slate-600"> · {info.d}</span>}
        </p>
        {parts.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {parts.map((p, i) => {
              const fam = familyOf(p).length >= 2
              return (
                <button
                  key={p + i}
                  type="button"
                  disabled={!fam}
                  onClick={() => setFamily(p)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm ring-1 transition ${
                    fam ? 'bg-brand-50 ring-brand-200 active:scale-95' : 'bg-slate-50 ring-slate-200'
                  }`}
                  data-testid="part-chip"
                >
                  <span className="font-han text-base">{p}</span>
                  <span className="text-slate-600">{partName(p) ?? '—'}</span>
                  {fam && <Icon name="next" className="h-3.5 w-3.5 text-brand-600" />}
                </button>
              )
            })}
          </div>
        )}
        {e?.t === 'pictophonetic' && e.s && e.ph ? (
          <p className="mt-1.5 text-sm text-slate-500">
            <span className="font-han text-ink">{e.s}</span> gives the meaning ({partName(e.s) ?? e.h}),{' '}
            <span className="font-han text-ink">{e.ph}</span> gives the sound ({charInfo(e.ph)?.py ?? '…'}).
          </p>
        ) : e?.h ? (
          <p className="mt-1.5 text-sm text-slate-500">{e.h}</p>
        ) : null}
        {famSize >= 2 && parts.length === 0 && (
          <button type="button" className="mt-1 text-sm font-bold text-sky-600" onClick={() => setFamily(info.r)}>
            Family {info.r} · {famSize} characters
          </button>
        )}
      </div>
      {family && <FamilySheet radical={family} onClose={() => setFamily(null)} />}
    </div>
  )
}

/** Bottom sheet listing every course character that shares a part. */
export function FamilySheet({ radical, onClose }: { radical: string; onClose: () => void }) {
  const known = useCharStrength()
  const members = familyOf(radical)
  const mnemonic = partMnemonic(radical)
  return createPortal(
    <div className="fixed inset-0 z-30 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div
        className="safe-bottom max-h-[80vh] w-full max-w-md animate-slide-up overflow-y-auto rounded-t-[2rem] bg-surface p-5 sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
        data-testid="family-sheet"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 font-han text-3xl text-white">{radical}</span>
          <div className="flex-1">
            <p className="font-display text-xl font-extrabold">{partName(radical) ?? radical} family</p>
            <p className="text-sm text-slate-500">{members.length} characters in the course share this part</p>
          </div>
        </div>
        {mnemonic && <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:text-amber-200">{mnemonic}</p>}
        <div className="grid grid-cols-4 gap-2">
          {members.map((c) => {
            const s = known(c)
            const first = itemsWithChar(c)[0]
            return (
              <Link
                key={c}
                to={first ? `/words/${first.id}` : '#'}
                onClick={onClose}
                className={`flex flex-col items-center rounded-2xl p-2 ring-1 transition active:scale-95 ${s === null ? 'opacity-50 ring-slate-200' : 'bg-brand-50 ring-brand-200'}`}
              >
                <span className="font-han text-3xl">{c}</span>
                <span className="text-xs text-slate-500">{charInfo(c)?.py}</span>
                {s !== null && <StrengthBars value={s} />}
              </Link>
            )
          })}
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>,
    document.body,
  )
}
