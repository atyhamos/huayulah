import { useEffect } from 'react'
import type { LessonSummary } from '../data/actions'
import { Button } from '../components/ui'

export function celebrate() {
  void import('canvas-confetti').then(({ default: confetti }) => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#22c55e', '#ef3340', '#f59e0b', '#0ea5e9'] })
  })
}

export function LessonComplete({
  summary,
  seconds,
  mode,
  title,
  onDone,
}: {
  summary: LessonSummary
  seconds: number
  mode: 'learn' | 'practice'
  title?: string
  onDone: () => void
}) {
  useEffect(() => {
    celebrate()
  }, [])
  const { xp, accuracy, streak, achievements, newWords } = summary
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-6 pb-32 pt-12 text-center" data-testid="lesson-complete">
      <div className="mb-4 animate-pop text-7xl">{accuracy === 1 ? '🏆' : '🎉'}</div>
      <h1 className="mb-1 text-3xl font-extrabold text-amber-500">{title ?? (mode === 'learn' ? 'Lesson complete!' : 'Practice complete!')}</h1>
      {newWords > 0 && <p className="mb-6 text-slate-500">+{newWords} words added to your flashcards</p>}
      <div className="mb-6 grid w-full grid-cols-3 gap-3">
        <Stat label="Total XP" value={`+${xp.total}`} color="border-amber-400 text-amber-500" />
        <Stat label="Accuracy" value={`${Math.round(accuracy * 100)}%`} color="border-brand-500 text-brand-600" />
        <Stat label="Time" value={time} color="border-sky-400 text-sky-500" />
      </div>
      <div className="mb-6 w-full space-y-1 text-sm text-slate-500">
        {xp.perfect > 0 && <p>💯 Perfect lesson bonus +{xp.perfect}</p>}
        {xp.combo > 0 && <p>🔥 Combo bonus +{xp.combo}</p>}
      </div>
      {streak.extended && (
        <div className="mb-4 w-full rounded-2xl bg-orange-50 p-4 font-bold text-orange-600">🔥 {streak.next.streak}-day streak!</div>
      )}
      {achievements.map((a) => (
        <div key={a.id} className="mb-3 flex w-full animate-pop items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-left">
          <span className="text-3xl">{a.icon}</span>
          <div>
            <p className="font-bold">{a.title}</p>
            <p className="text-sm text-slate-500">{a.description}</p>
          </div>
        </div>
      ))}
      <div className="safe-bottom fixed inset-x-0 bottom-0 bg-white px-4 pt-3">
        <Button className="mx-auto block w-full max-w-md" onClick={onDone} data-testid="done">
          Continue
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border-2 ${color}`}>
      <div className="bg-current py-1 text-xs font-bold uppercase">
        <span className="text-white">{label}</span>
      </div>
      <div className="py-3 text-xl font-extrabold">{value}</div>
    </div>
  )
}
