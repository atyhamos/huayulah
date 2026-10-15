import { useCallback, useEffect, useState } from 'react'
import { getItem } from '../../content'
import { AudioButton, useSpeak } from '../AudioButton'
import { CheckBar } from './CheckBar'
import type { ExProps } from './types'

/** Listening comprehension: hear a whole sentence, choose what it means. */
export function Hear({ ex, locked, onSubmit }: ExProps<'hear'>) {
  const it = getItem(ex.itemId)
  const sentence = it.example!.zh.replace(/ /g, '')
  const [picked, setPicked] = useState<string | null>(null)
  const say = useSpeak()

  useEffect(() => {
    const t = setTimeout(() => say(sentence), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  const check = useCallback(() => picked && onSubmit({ correct: picked === ex.itemId }), [picked, ex.itemId, onSubmit])

  return (
    <div className="animate-pop">
      <h2 className="mb-6 text-2xl font-bold">What did they say?</h2>
      <div className="mb-8 flex justify-center">
        <AudioButton text={sentence} size="lg" />
      </div>
      <div className="grid gap-3">
        {ex.options.map((id) => {
          const state = locked ? (id === ex.itemId ? 'right' : id === picked ? 'wrong' : 'idle') : id === picked ? 'picked' : 'idle'
          const cls = {
            idle: 'border-slate-200',
            picked: 'border-sky-400 bg-sky-50',
            right: 'border-brand-500 bg-brand-50',
            wrong: 'border-rose-400 bg-rose-50 animate-shake',
          }[state]
          return (
            <button
              key={id}
              type="button"
              disabled={locked}
              data-testid="option"
              data-correct={id === ex.itemId ? 'true' : undefined}
              onClick={() => setPicked(id)}
              className={`rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-semibold transition ${cls}`}
            >
              {getItem(id).example!.en}
            </button>
          )
        })}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
