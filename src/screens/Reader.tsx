import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { content } from '../content'
import { loadPinyinEngine } from '../content/pinyinLoader'
import { isCustomItem } from '../content/custom'
import { AudioButton } from '../components/AudioButton'
import { Hanzi } from '../components/Hanzi'
import { useAiKey } from '../components/hooks'
import { Icon } from '../components/icons'
import { OtterArt } from '../components/OtterArt'
import { Button, Card, SgBadge } from '../components/ui'
import { AiError, aiSupported } from '../lib/ai'
import { explainText, readPhoto, readText, type ReaderResult, type ReaderWord } from '../lib/reader'
import { useApp } from '../store/app'

const SAMPLES = ['请勿在此吸烟', '本店星期一休息', '鸡饭 四块半，叉烧饭 五块', '电梯维修中，请走楼梯']

export function ReaderScreen() {
  const key = useAiKey()
  const canAi = aiSupported && !!key
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<null | 'photo' | 'text'>(null)
  const [result, setResult] = useState<ReaderResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const run = async (kind: 'photo' | 'text', job: () => Promise<ReaderResult>) => {
    setBusy(kind)
    setError(null)
    try {
      await loadPinyinEngine()
      setResult(await job())
    } catch (e) {
      setError(e instanceof AiError ? e.message : e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const onPhoto = (f: File) => {
    setPhoto(URL.createObjectURL(f))
    void run('photo', () => readPhoto(f))
  }

  const reset = () => {
    setResult(null)
    setError(null)
    if (photo) URL.revokeObjectURL(photo)
    setPhoto(null)
  }

  if (busy) {
    return (
      <div className="flex flex-col items-center pt-16 text-center" data-testid="reader-busy">
        {photo && <img src={photo} alt="" className="mb-4 max-h-48 rounded-2xl object-cover shadow" />}
        <OtterArt mood="think" size={110} />
        <p className="mt-3 font-display text-xl font-extrabold">{busy === 'photo' ? 'Reading your photo…' : 'Reading…'}</p>
        <p className="text-slate-500">{busy === 'photo' ? 'This takes a few seconds.' : ''}</p>
      </div>
    )
  }

  if (result) return <ResultView result={result} photo={photo} onBack={reset} />

  return (
    <div className="pt-2">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Reader</h1>
      <p className="mb-5 font-han text-slate-400">读一读</p>
      <p className="mb-5 text-slate-500">Menus, signs, notices, WhatsApp messages — see the pinyin and meaning, and save new words to your flashcards.</p>

      {error && (
        <p className="mb-4 flex gap-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:text-rose-300" data-testid="reader-error">
          <Icon name="warning" className="h-5 w-5 shrink-0" /> {error}
        </p>
      )}

      {aiSupported && (
        <Card className="mb-4">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
              <Icon name="camera" className="h-7 w-7" />
            </span>
            <div className="flex-1">
              <p className="font-display font-extrabold">Snap a sign or menu</p>
              <p className="mb-3 text-sm text-slate-500">
                {canAi ? 'Claude reads the photo for you.' : 'Photo reading uses your own Claude API key.'}
              </p>
              {canAi ? (
                <Button variant="blue" className="w-full" onClick={() => fileRef.current?.click()} data-testid="reader-photo">
                  <Icon name="camera" className="h-5 w-5" /> Take or choose a photo
                </Button>
              ) : (
                <Link to="/settings" className="text-sm font-bold text-sky-600">
                  Add a key in Settings → AI features
                </Link>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                data-testid="reader-file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) onPhoto(f)
                }}
              />
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <Icon name="paste" className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-extrabold">Paste Chinese text</p>
            <p className="mb-3 text-sm text-slate-500">Works offline. Words from the course come with meanings.</p>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="e.g. 本店星期一休息"
          className="mb-2 w-full resize-none rounded-2xl bg-surface p-3 font-han text-lg outline-none ring-2 ring-inset ring-slate-200 focus:ring-sky-400"
          data-testid="reader-text"
        />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <button key={s} type="button" onClick={() => setText(s)} className="rounded-full bg-slate-100 px-2.5 py-1 font-han text-sm text-slate-600">
              {s}
            </button>
          ))}
        </div>
        <div className={`grid gap-2 ${canAi ? 'grid-cols-2' : ''}`}>
          <Button disabled={!text.trim()} onClick={() => void run('text', async () => readText(text))} data-testid="reader-read">
            Read it
          </Button>
          {canAi && (
            <Button variant="secondary" disabled={!text.trim()} onClick={() => void run('text', () => explainText(text))} data-testid="reader-explain">
              <Icon name="sparkle" className="h-5 w-5" /> Ask Claude
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

function ResultView({ result, photo, onBack }: { result: ReaderResult; photo: string | null; onBack: () => void }) {
  const [open, setOpen] = useState<ReaderWord | null>(null)
  return (
    <div className="pt-2" data-testid="reader-result">
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-slate-500">
        <Icon name="back" className="h-4 w-4" /> Read something else
      </button>
      <div className="mb-4 flex items-center gap-3">
        {photo && <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />}
        <div>
          <h1 className="font-display text-2xl font-extrabold">{result.title ?? 'Your text'}</h1>
          <p className="text-sm text-slate-500">
            {result.source === 'claude' ? 'Read by Claude' : 'Read offline'} · tap a word to save it
          </p>
        </div>
      </div>
      {result.lines.length === 0 && <p className="py-8 text-center text-slate-500">No Chinese text found.</p>}
      <div className="space-y-3">
        {result.lines.map((line, i) => (
          <Card key={i} data-testid="reader-line">
            <div className="flex items-start gap-2">
              <Hanzi text={line.zh} pinyin={line.pinyin} showPinyin className="min-w-0 flex-1 text-2xl leading-loose" />
              <AudioButton text={line.zh} size="sm" />
            </div>
            {line.en && <p className="mb-2 text-slate-600">{line.en}</p>}
            <div className="flex flex-wrap gap-1.5">
              {line.words.map((w, j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setOpen(w)}
                  className={`rounded-2xl px-2.5 py-1 text-left ring-1 transition active:scale-95 ${w.itemId ? 'bg-brand-50 ring-brand-200' : 'bg-surface ring-slate-200'}`}
                  data-testid="reader-word"
                >
                  <span className="block font-han text-lg leading-tight">{w.hanzi}</span>
                  <span className="block max-w-32 truncate text-xs text-slate-500">{w.english || w.pinyin}</span>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {open && <WordSheet word={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function WordSheet({ word, onClose }: { word: ReaderWord; onClose: () => void }) {
  const add = useApp((st) => st.addCustomItem)
  const custom = useApp((st) => st.s.customItems)
  const toast = useApp((st) => st.toast)
  const [meaning, setMeaning] = useState(word.english)
  const item = word.itemId ? content.items.get(word.itemId) : undefined
  const saved = Object.values(custom).find((c) => c.hanzi === word.hanzi)
  const inCourse = item && !isCustomItem(item)
  return createPortal(
    <div className="fixed inset-0 z-30 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="safe-bottom w-full max-w-md animate-slide-up rounded-t-[2rem] bg-surface p-5 sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()} data-testid="word-sheet">
        <div className="mb-3 flex items-center gap-4">
          <span className="tile px-4 pb-2 pt-1">
            <Hanzi text={word.hanzi} pinyin={word.pinyin} showPinyin className="text-4xl" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold">{word.english || 'Meaning unknown'}</p>
            <p className="text-slate-500">{word.pinyin}</p>
            {item?.sg && <SgBadge className="mt-1" />}
          </div>
          <AudioButton text={word.hanzi} size="sm" />
        </div>
        {word.note && (
          <p className="mb-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:text-amber-200">
            <Icon name="bulb" className="h-5 w-5 shrink-0 text-amber-500" /> {word.note}
          </p>
        )}
        {inCourse ? (
          <Link to={`/words/${item.id}`} onClick={onClose} className="block">
            <Button className="w-full">Open word page</Button>
          </Link>
        ) : saved ? (
          <p className="flex items-center justify-center gap-2 rounded-full bg-brand-50 py-3 font-bold text-brand-700 dark:text-brand-300">
            <Icon name="check" className="h-5 w-5" /> In My words
          </p>
        ) : (
          <>
            {!word.english && (
              <input
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="What does it mean? (in English)"
                className="mb-2 w-full rounded-full bg-surface px-4 py-2.5 outline-none ring-2 ring-inset ring-slate-200 focus:ring-sky-400"
                data-testid="word-meaning"
              />
            )}
            <Button
              className="w-full"
              disabled={!meaning.trim()}
              data-testid="add-word"
              onClick={() => {
                add({ hanzi: word.hanzi, pinyin: word.pinyin, english: meaning.trim(), note: word.note })
                toast({ icon: 'plus', title: 'Added to My words', body: `${word.hanzi} joins your flashcards after you practise it.` })
                onClose()
              }}
            >
              <Icon name="plus" className="h-5 w-5" /> Add to My words
            </Button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
