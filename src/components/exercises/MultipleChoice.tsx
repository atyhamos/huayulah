import { useCallback, useEffect, useState } from 'react'
import { getItem } from '../../content'
import { useApp } from '../../store/app'
import { AudioButton, useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { usePinyinVisible } from '../hooks'
import { CheckBar } from './CheckBar'
import type { ExProps } from './types'

type Kind = 'zh2en' | 'en2zh' | 'listen'

export function MultipleChoice({ ex, locked, onSubmit }: ExProps<Kind>) {
  const it = getItem(ex.itemId)
  const [picked, setPicked] = useState<string | null>(null)
  const showPinyin = usePinyinVisible()
  const always = useApp((s) => s.s.settings.pinyinMode === 'always')
  const say = useSpeak()

  useEffect(() => {
    if (ex.kind === 'listen') {
      const t = setTimeout(() => say(it.hanzi), 350)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  useEffect(() => {
    if (locked) return
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= ex.options.length) setPicked(ex.options[n - 1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [ex.options, locked])

  const check = useCallback(() => {
    if (picked) onSubmit({ correct: picked === ex.itemId })
  }, [picked, ex.itemId, onSubmit])

  const prompt =
    ex.kind === 'zh2en' ? (
      <>
        <h2 className="mb-6 text-2xl font-bold">What does this mean?</h2>
        <div className="mb-8 flex justify-center">
          <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={showPinyin(it.id)} revealable className="text-6xl" />
        </div>
      </>
    ) : ex.kind === 'en2zh' ? (
      <h2 className="mb-8 text-2xl font-bold">
        Which one is “<span className="text-brand-600">{it.english}</span>”?
      </h2>
    ) : (
      <>
        <h2 className="mb-6 text-2xl font-bold">What do you hear?</h2>
        <div className="mb-8 flex justify-center">
          <AudioButton text={it.hanzi} size="lg" />
        </div>
      </>
    )

  return (
    <div className="animate-pop">
      {prompt}
      <div className={`grid gap-3 ${ex.kind === 'zh2en' ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {ex.options.map((id, i) => {
          const o = getItem(id)
          const isPicked = picked === id
          const state = locked ? (id === ex.itemId ? 'right' : isPicked ? 'wrong' : 'idle') : isPicked ? 'picked' : 'idle'
          const cls = {
            idle: 'border-slate-200 bg-surface',
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
              onClick={() => {
                setPicked(id)
                if (ex.kind !== 'zh2en') say(o.hanzi)
              }}
              className={`relative flex min-h-16 items-center justify-center rounded-2xl border-2 border-b-4 px-3 py-3 text-center transition ${cls}`}
            >
              <span className="absolute left-2 top-1.5 hidden text-xs text-slate-300 sm:block">{i + 1}</span>
              {ex.kind === 'zh2en' ? (
                <span className="text-lg font-semibold">{o.english}</span>
              ) : (
                <Hanzi text={o.hanzi} pinyin={o.pinyin} showPinyin={always || locked} className="text-3xl" />
              )}
            </button>
          )
        })}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
