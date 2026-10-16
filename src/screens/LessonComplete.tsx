import { useEffect } from 'react'
import type { LessonSummary } from '../data/actions'
import { Icon } from '../components/icons'
import { OtterArt, type OtterMood } from '../components/OtterArt'
import { Button, Medal, Stamp } from '../components/ui'

export function celebrate() {
  void import('canvas-confetti').then(({ default: confetti }) => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#52976f', '#cf5145', '#d5a32b', '#4669ad', '#d8708f'] })
  })
}

export function LessonComplete({
  summary,
  seconds,
  mode,
  title,
  note,
  mood,
  onDone,
}: {
  summary: LessonSummary
  seconds: number
  mode: 'learn' | 'practice'
  title?: string
  /** Extra line under the title (e.g. the Express train result). */
  note?: string
  /** Ah Tat's mood; by default he cheers a lesson and is proud of a practice session. */
  mood?: OtterMood
  onDone: () => void
}) {
  useEffect(() => {
    celebrate()
  }, [])
  const { xp, accuracy, streak, achievements, newWords } = summary
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-5 pb-32 pt-8 text-center" data-testid="lesson-complete">
      <OtterArt mood={mood ?? (mode === 'learn' ? 'cheer' : 'proud')} size={132} className="animate-pop" />
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{title ?? (mode === 'learn' ? 'Lesson complete!' : 'Practice complete!')}</h1>
      <p className="mb-6 mt-1 font-brush text-2xl text-brand-600">{accuracy === 1 ? '满分！' : '做得好！'}</p>
      {note && (
        <p className="-mt-3 mb-5 text-slate-500" data-testid="complete-note">
          {note}
        </p>
      )}

      {/* loyalty card */}
      <div className="relative mb-5 w-full overflow-hidden rounded-3xl bg-surface p-4 shadow-[0_10px_28px_-20px_rgb(30_60_45/0.6)] ring-1 ring-slate-200">
        <div className="mb-3 flex items-baseline justify-between border-b border-dashed border-slate-300 pb-2 text-left">
          <p className="font-display font-extrabold">Stamp card</p>
          <p className="font-han text-sm text-slate-400">印章卡</p>
        </div>
        <div className="grid grid-cols-3 place-items-center gap-3">
          <Stamp value={`+${xp.total}`} label="XP" tone="border-amber-500 text-amber-600" rotate={-9} delay={150} />
          <Stamp value={`${Math.round(accuracy * 100)}%`} label="Accuracy" tone="border-brand-500 text-brand-600" rotate={6} delay={450} />
          <Stamp value={time} label="Time" tone="border-sky-500 text-sky-600" rotate={-4} delay={750} />
        </div>
        {(xp.perfect > 0 || xp.combo > 0 || newWords > 0) && (
          <div className="mt-4 space-y-1.5 text-left text-sm text-slate-500">
            {newWords > 0 && (
              <p className="flex items-center gap-2">
                <Icon name="cards" className="h-4 w-4 text-sky-500" /> +{newWords} words added to your flashcards
              </p>
            )}
            {xp.perfect > 0 && (
              <p className="flex items-center gap-2">
                <Icon name="star" className="h-4 w-4 text-amber-500" /> Perfect run bonus +{xp.perfect}
              </p>
            )}
            {xp.combo > 0 && (
              <p className="flex items-center gap-2">
                <Icon name="lantern" className="h-4 w-4 text-orange-500" /> Combo bonus +{xp.combo}
              </p>
            )}
          </div>
        )}
      </div>

      {streak.extended && (
        <div className="mb-4 flex w-full items-center gap-3 rounded-3xl bg-orange-50 p-4 text-left font-bold text-orange-600">
          <Icon name="lantern" className="h-8 w-8 animate-glow" />
          {streak.next.streak}-day streak — the lantern stays lit!
        </div>
      )}
      {achievements.map((a) => (
        <div key={a.id} className="mb-3 flex w-full animate-pop items-center gap-3 rounded-3xl bg-amber-50 p-3 text-left ring-1 ring-amber-200">
          <Medal char={a.char} earned colorIndex={a.color} size={52} />
          <div>
            <p className="font-display font-extrabold">{a.title}</p>
            <p className="text-sm text-slate-500">{a.description}</p>
          </div>
        </div>
      ))}
      <div className="safe-bottom fixed inset-x-0 bottom-0 bg-gradient-to-t from-page via-page to-transparent px-4 pt-6">
        <Button className="mx-auto flex w-full max-w-md" onClick={onDone} data-testid="done">
          Continue
        </Button>
      </div>
    </div>
  )
}
