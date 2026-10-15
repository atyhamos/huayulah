import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getItem } from '../../content'
import { loadPinyinEngine } from '../../content/pinyinLoader'
import { bestSpeechScore, SPEECH_PASS } from '../../lib/answer'
import { listen, recognitionSupported } from '../../lib/speech'
import { AudioButton } from '../AudioButton'
import { Hanzi } from '../Hanzi'
import { usePinyinVisible } from '../hooks'
import { Button, Icon } from '../ui'
import type { ExProps } from './types'

export function Speak({ ex, locked, onSubmit }: ExProps<'speak'>) {
  const it = getItem(ex.itemId)
  const showPinyin = usePinyinVisible()
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selfCheck, setSelfCheck] = useState(!recognitionSupported)
  const [revealed, setRevealed] = useState(false)
  const stopRef = useRef<() => void>(() => {})

  useEffect(() => {
    void loadPinyinEngine() // needed to compare what you said by sound, not just characters
    return () => stopRef.current()
  }, [])

  const start = useCallback(() => {
    setError(null)
    setInterim('')
    setListening(true)
    const h = listen({
      onInterim: setInterim,
      onFinal: (alts) => {
        setListening(false)
        if (!alts.length) {
          setError("Didn't catch that — try again.")
          return
        }
        const { score, heard } = bestSpeechScore(alts, ex.text)
        onSubmit({ correct: score >= SPEECH_PASS, heard, score })
      },
      onError: (e) => {
        setListening(false)
        if (e === 'not-allowed' || e === 'service-not-allowed') {
          setError('Microphone blocked. You can still practise by checking yourself.')
          setSelfCheck(true)
        } else if (e === 'network') {
          setError('Speech recognition needs internet. Check yourself instead.')
          setSelfCheck(true)
        } else if (e !== 'no-speech' && e !== 'aborted') setError(`Mic error: ${e}`)
        else setError("Didn't catch that — try again.")
      },
    })
    stopRef.current = h.stop
  }, [ex.text, onSubmit])

  return (
    <div className="animate-pop">
      <h2 className="mb-6 text-2xl font-bold">Read this out loud</h2>
      <div className="mb-2 flex items-start gap-3">
        <AudioButton text={ex.text} size="sm" />
        <Hanzi text={ex.text} pinyin={ex.text === it.hanzi ? it.pinyin : undefined} showPinyin={showPinyin(it.id)} revealable className="text-3xl leading-loose" />
      </div>
      <p className="mb-10 text-slate-500">{ex.en}</p>

      {!locked && !selfCheck && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            data-testid="mic"
            onClick={() => (listening ? stopRef.current() : start())}
            className={`grid h-24 w-24 place-items-center rounded-full border-b-4 text-white transition active:translate-y-0.5 ${
              listening ? 'animate-pulse border-rose-700 bg-rose-500' : 'border-sky-700 bg-sky-500'
            }`}
            aria-label={listening ? 'Stop' : 'Start speaking'}
          >
            {Icon.mic('h-10 w-10')}
          </button>
          <p className="h-6 text-slate-500">{listening ? interim || 'Listening…' : 'Tap and speak'}</p>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      )}

      {!locked && selfCheck && (
        <div className="flex flex-col items-center gap-4 text-center">
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {!revealed ? (
            <Button variant="blue" onClick={() => setRevealed(true)}>
              I said it — compare
            </Button>
          ) : (
            <>
              <p className="text-slate-600">Listen and compare with what you said:</p>
              <AudioButton text={ex.text} size="lg" />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => onSubmit({ correct: false })}>
                  Not quite
                </Button>
                <Button onClick={() => onSubmit({ correct: true })}>I got it</Button>
              </div>
            </>
          )}
        </div>
      )}

      {!locked &&
        createPortal(
          <div className="safe-bottom fixed inset-x-0 bottom-0 px-4 pt-3 text-center">
            <button type="button" className="text-sm font-bold uppercase tracking-wide text-slate-400" onClick={() => onSubmit({ correct: true, skipped: true })}>
              Can't speak now
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
