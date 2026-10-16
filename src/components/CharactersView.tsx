import { useState } from 'react'
import { charInfo, families, partName } from '../content/chars'
import { FamilySheet, useCharStrength } from './CharParts'

/** Course characters grouped into families by their shared part. */
export function CharactersView() {
  const known = useCharStrength()
  const [open, setOpen] = useState<string | null>(null)
  const fams = [...families()]
  const total = new Set(fams.flatMap(([, cs]) => cs))
  const seen = [...total].filter((c) => known(c) !== null).length
  return (
    <div data-testid="characters-view">
      <p className="mb-4 text-sm text-slate-500">
        Characters that share a part often share a meaning. You’ve met <b className="text-ink">{seen}</b> of {total.size} — tap a family to explore.
      </p>
      <div className="space-y-3">
        {fams.map(([radical, members]) => {
          const met = members.filter((c) => known(c) !== null).length
          return (
            <button
              key={radical}
              type="button"
              onClick={() => setOpen(radical)}
              className="flex w-full items-center gap-3 rounded-3xl bg-surface p-3 text-left ring-1 ring-slate-200 transition active:scale-[0.99]"
              data-testid="family-row"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 font-han text-2xl text-white">{radical}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-display font-extrabold">{partName(radical) ?? radical}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {met}/{members.length}
                  </span>
                </span>
                <span className="mt-0.5 block truncate font-han text-xl tracking-wide">
                  {members.map((c) => (
                    <span key={c} className={known(c) === null ? 'text-slate-300' : 'text-ink'} title={charInfo(c)?.py}>
                      {c}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {open && <FamilySheet radical={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
