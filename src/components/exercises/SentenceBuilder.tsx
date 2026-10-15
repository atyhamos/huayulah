import { useCallback, useState } from 'react'
import { getItem } from '../../content'
import { sameTokens } from '../../lib/answer'
import { rubyFor } from '../../lib/pinyin'
import { useApp } from '../../store/app'
import { useSpeak } from '../AudioButton'
import { CheckBar } from './CheckBar'
import type { ExProps } from './types'

export function SentenceBuilder({ ex, locked, onSubmit }: ExProps<'build'>) {
  const it = getItem(ex.itemId)
  // indices into ex.tiles, so duplicate words stay distinct
  const [picked, setPicked] = useState<number[]>([])
  const always = useApp((s) => s.s.settings.pinyinMode === 'always')
  const [hint, setHint] = useState(always)
  const say = useSpeak()

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
        onClick={() => {
          if (inAnswer) setPicked((p) => p.filter((x) => x !== i))
          else {
            setPicked((p) => [...p, i])
            say(word)
          }
        }}
        className="font-han flex flex-col items-center rounded-xl border-2 border-b-4 border-slate-200 bg-white px-3 py-1.5 text-2xl transition active:translate-y-0.5"
      >
        {hint && <span className="font-sans text-xs text-slate-400">{py}</span>}
        {word}
      </button>
    )
  }

  return (
    <div className="animate-pop">
      <h2 className="mb-4 text-2xl font-bold">Write this in Chinese</h2>
      <p className="mb-4 rounded-2xl border-2 border-slate-200 p-4 text-lg">{it.example?.en}</p>
      <div className="mb-6 flex min-h-24 flex-wrap content-start gap-2 border-b-2 border-t-2 border-slate-200 py-3" data-testid="answer-area">
        {picked.map((i) => tile(i, true))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ex.tiles.map((_, i) =>
          picked.includes(i) ? (
            <span key={i} className="rounded-xl bg-slate-200 px-3 py-1.5 text-2xl text-transparent">
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
