import { useCallback, useEffect, useState } from 'react'
import { getItem } from '../../content'
import { useApp } from '../../store/app'
import { AudioButton, useSpeak } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { usePinyinVisible } from '../hooks'
import { Tile } from '../ui'
import { CheckBar } from './CheckBar'
import { OptionRow, optionState, Prompt } from './parts'
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

  if (ex.kind === 'zh2en') {
    return (
      <div className="animate-pop">
        <Prompt>What does this mean?</Prompt>
        <div className="mb-8 flex justify-center">
          <div className="tile px-6 pb-4 pt-3">
            <Hanzi text={it.hanzi} pinyin={it.pinyin} showPinyin={showPinyin(it.id)} revealable className="text-6xl" />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {ex.options.map((id, i) => (
            <OptionRow
              key={id}
              letter={'ABCD'[i]}
              state={optionState(id, picked, ex.itemId, locked)}
              disabled={locked}
              data-testid="option"
              data-correct={id === ex.itemId ? 'true' : undefined}
              onClick={() => setPicked(id)}
            >
              {getItem(id).english}
            </OptionRow>
          ))}
        </div>
        {!locked && <CheckBar disabled={!picked} onCheck={check} />}
      </div>
    )
  }

  return (
    <div className="animate-pop">
      {ex.kind === 'en2zh' ? (
        <Prompt>
          Which tile says “<span className="text-brand-600">{it.english}</span>”?
        </Prompt>
      ) : (
        <>
          <Prompt>What do you hear?</Prompt>
          <div className="mb-8 flex justify-center">
            <AudioButton text={it.hanzi} size="lg" />
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {ex.options.map((id) => {
          const o = getItem(id)
          return (
            <Tile
              key={id}
              state={optionState(id, picked, ex.itemId, locked)}
              disabled={locked}
              data-testid="option"
              data-correct={id === ex.itemId ? 'true' : undefined}
              onClick={() => {
                setPicked(id)
                say(o.hanzi)
              }}
              className="flex min-h-24 items-center justify-center px-2 py-3"
            >
              <Hanzi text={o.hanzi} pinyin={o.pinyin} showPinyin={always || locked} className="text-3xl" />
            </Tile>
          )
        })}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
