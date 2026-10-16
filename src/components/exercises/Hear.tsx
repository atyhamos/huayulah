import { useCallback, useEffect, useState } from 'react'
import { getItem } from '../../content'
import { AudioButton, useSpeak } from '../AudioButton'
import { CheckBar } from './CheckBar'
import { OptionRow, optionState, Prompt } from './parts'
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
      <Prompt sub="Overheard at the kopitiam">What did they say?</Prompt>
      <div className="mb-8 flex justify-center">
        <AudioButton text={sentence} size="lg" />
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
            {getItem(id).example!.en}
          </OptionRow>
        ))}
      </div>
      {!locked && <CheckBar disabled={!picked} onCheck={check} />}
    </div>
  )
}
