import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { charInfo } from '../../content/chars'
import { getItem } from '../../content'
import { AudioButton } from '../AudioButton'
import { StrokeChar } from '../StrokeChar'
import { Prompt } from './parts'
import type { ExProps } from './types'

/** Trace a character stroke by stroke (hints appear after two wrong strokes). */
export function WriteIt({ ex, locked, onSubmit }: ExProps<'write'>) {
  const it = getItem(ex.itemId)
  const sent = useRef(false)
  const submit = (r: Parameters<typeof onSubmit>[0]) => {
    if (sent.current) return
    sent.current = true
    onSubmit(r)
  }
  return (
    <div className="animate-pop" data-testid="write-exercise">
      <Prompt sub={`${charInfo(ex.char)?.py ?? ''} — from “${it.english}”`}>Trace it, stroke by stroke</Prompt>
      <div className="flex flex-col items-center gap-3">
        <div className="tile p-2">
          <StrokeChar
            ch={ex.char}
            quiz
            size={220}
            onDone={(mistakes) => setTimeout(() => submit({ correct: mistakes <= 3 }), 500)}
            onFail={() => submit({ correct: true, skipped: true })}
          />
        </div>
        <AudioButton text={ex.char} size="sm" slow={false} />
      </div>
      {!locked &&
        createPortal(
          <div className="safe-bottom fixed inset-x-0 bottom-0 px-4 pt-3 text-center">
            <button
              type="button"
              className="text-sm font-bold uppercase tracking-wide text-slate-400"
              onClick={() => submit({ correct: true, skipped: true })}
              data-testid="skip-write"
            >
              Can't write now
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
