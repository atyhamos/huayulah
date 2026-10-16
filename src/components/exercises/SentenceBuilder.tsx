import { useCallback, useMemo, useState } from 'react'
import { getItem } from '../../content'
import { sameTokens } from '../../lib/answer'
import { rubyFor } from '../../lib/pinyin'
import { useApp } from '../../store/app'
import { useSpeak } from '../AudioButton'
import { Icon } from '../icons'
import { CheckBar } from './CheckBar'
import { Prompt } from './parts'
import type { ExProps } from './types'

export function SentenceBuilder({ ex, locked, onSubmit }: ExProps<'build'>) {
  const it = getItem(ex.itemId)
  // indices into ex.tiles, so duplicate words stay distinct
  const [picked, setPicked] = useState<number[]>([])
  const always = useApp((s) => s.s.settings.pinyinMode === 'always')
  const [hint, setHint] = useState(always)
  const say = useSpeak()
  // position of each tile in the answer (-1 for distractors); used by end-to-end tests
  const pos = useMemo(() => {
    const used = new Set<number>()
    return ex.tiles.map((t) => {
      const i = ex.answer.findIndex((a, k) => a === t && !used.has(k))
      if (i >= 0) used.add(i)
      return i
    })
  }, [ex])

  const check = useCallback(
    () => onSubmit({ correct: sameTokens(picked.map((i) => ex.tiles[i]), ex.answer) }),
    [picked, ex, onSubmit],
  )

  const tile = (i: number, inAnswer: boolean) => {
    const word = ex.tiles[i]
    const py = rubyFor(word)
      .map((r) => r.py)
      .filter(Boolean)
      .join(' ')
    return (
      <button
        key={i}
        type="button"
        disabled={locked}
        data-testid={inAnswer ? 'answer-tile' : 'tile'}
        data-pos={pos[i]}
        onClick={() => {
          if (inAnswer) setPicked((p) => p.filter((x) => x !== i))
          else {
            setPicked((p) => [...p, i])
            say(word)
          }
        }}
        className="tile font-han flex flex-col items-center px-3 py-1.5 text-2xl"
      >
        {hint && <span className="font-sans text-xs text-[#6f7d75]">{py}</span>}
        {word}
      </button>
    )
  }

  return (
    <div className="animate-pop">
      <Prompt>Build it in Chinese</Prompt>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-600">
          <Icon name="chat" className="h-6 w-6" />
        </span>
        <p className="relative rounded-2xl rounded-tl-sm bg-surface px-4 py-3 text-lg ring-1 ring-slate-200">{it.example?.en}</p>
      </div>
      {/* the mahjong table: picked tiles are laid out on the jade felt */}
      <div
        className="mb-6 flex min-h-24 flex-wrap content-start gap-x-2 gap-y-3 rounded-3xl bg-brand-700 p-3 pb-4 shadow-[inset_0_2px_10px_rgb(0_0_0/0.25)]"
        data-testid="answer-area"
      >
        {picked.length === 0 && <span className="m-auto text-sm font-semibold text-white/60">Tap tiles to place them here</span>}
        {picked.map((i) => tile(i, true))}
      </div>
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
        {ex.tiles.map((_, i) =>
          picked.includes(i) ? (
            <span key={i} className="font-han rounded-xl bg-slate-200 px-3 py-1.5 text-2xl text-transparent">
              {ex.tiles[i]}
            </span>
          ) : (
            tile(i, false)
          ),
        )}
      </div>
      {!always && !locked && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setHint((h) => !h)} className="text-sm font-semibold text-sky-600">
            {hint ? 'Hide pinyin' : 'Show pinyin hints'}
          </button>
        </div>
      )}
      {!locked && <CheckBar disabled={picked.length === 0} onCheck={check} />}
    </div>
  )
}
