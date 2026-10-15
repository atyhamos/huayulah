import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { content, storyByUnit } from '../content'
import { dueCardIds, isLessonUnlocked, isStoryUnlocked, nextLessonId, STORY_UNLOCK_LESSONS } from '../data/actions'
import type { Lesson, Unit } from '../content/schema'
import { Button } from '../components/ui'
import { useApp } from '../store/app'

const OFFSETS = [0, 44, 66, 44, 0, -44, -66, -44]

export function LearnScreen() {
  const s = useApp((st) => st.s)
  const due = dueCardIds(s, new Date(), content)
  const dueCount = due.review.length + due.fresh.length
  const next = nextLessonId(s, content)
  const [open, setOpen] = useState<string | null>(null)
  const nextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    nextRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div onClick={() => setOpen(null)}>
      {dueCount > 0 && (
        <Link
          to="/review"
          className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-b-4 border-sky-200 bg-sky-50 p-4"
          data-testid="review-cta"
        >
          <span className="text-3xl">🃏</span>
          <span className="flex-1">
            <span className="block font-bold text-sky-700">{dueCount} flashcards to review</span>
            <span className="text-sm text-sky-600">A few minutes keeps the words fresh</span>
          </span>
          <span className="font-bold text-sky-600">Go →</span>
        </Link>
      )}

      {content.units.map((u, ui) => (
        <UnitSection
          key={u.id}
          unit={u}
          number={ui + 1}
          next={next}
          open={open}
          setOpen={setOpen}
          nextRef={nextRef}
        />
      ))}
      <p className="py-8 text-center text-slate-400">That's the whole course for now — keep your flashcards fresh! 🇸🇬</p>
    </div>
  )
}

function UnitSection({
  unit,
  number,
  next,
  open,
  setOpen,
  nextRef,
}: {
  unit: Unit
  number: number
  next: string | null
  open: string | null
  setOpen: (id: string | null) => void
  nextRef: React.RefObject<HTMLDivElement | null>
}) {
  const s = useApp((st) => st.s)
  const done = unit.lessons.filter((l) => s.lessons[l.id]).length
  return (
    <section className="mb-10" data-testid={`unit-${unit.id}`}>
      <div className="mb-8 rounded-2xl border-b-4 p-4 text-white" style={{ backgroundColor: unit.color, borderColor: '#0002' }}>
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">
          Unit {number} · {done}/{unit.lessons.length}
        </p>
        <h2 className="text-xl font-extrabold">
          {unit.emoji} {unit.title}
        </h2>
        <p className="font-han text-lg opacity-90">{unit.titleZh}</p>
        <p className="mt-1 text-sm opacity-90">{unit.description}</p>
      </div>
      <div className="flex flex-col items-center gap-5">
        {unit.lessons.map((l, i) => (
          <LessonNode
            key={l.id}
            lesson={l}
            unit={unit}
            offset={OFFSETS[i % OFFSETS.length]}
            isNext={l.id === next}
            open={open === l.id}
            onToggle={() => setOpen(open === l.id ? null : l.id)}
            nodeRef={l.id === next ? nextRef : undefined}
          />
        ))}
        <StoryNode unit={unit} open={open === `story-${unit.id}`} onToggle={() => setOpen(open === `story-${unit.id}` ? null : `story-${unit.id}`)} />
      </div>
    </section>
  )
}

function LessonNode({
  lesson,
  unit,
  offset,
  isNext,
  open,
  onToggle,
  nodeRef,
}: {
  lesson: Lesson
  unit: Unit
  offset: number
  isNext: boolean
  open: boolean
  onToggle: () => void
  nodeRef?: React.RefObject<HTMLDivElement | null>
}) {
  const s = useApp((st) => st.s)
  const nav = useNavigate()
  const progress = s.lessons[lesson.id]
  const unlocked = isLessonUnlocked(s, lesson.id, content)
  const status = progress ? 'done' : unlocked ? 'open' : 'locked'
  return (
    <div className="relative" style={{ transform: `translateX(${offset}px)` }} ref={nodeRef}>
      {isNext && !open && (
        <div className="absolute -top-9 left-1/2 z-[1] -translate-x-1/2 animate-bounce whitespace-nowrap rounded-xl border-2 border-slate-200 bg-white px-3 py-1 text-sm font-extrabold uppercase" style={{ color: unit.color }}>
          Start
        </div>
      )}
      <button
        type="button"
        data-testid={`lesson-${lesson.id}`}
        data-status={status}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className="grid h-[72px] w-[72px] place-items-center rounded-full border-b-[6px] text-3xl font-black text-white transition active:translate-y-1 active:border-b-2"
        style={
          status === 'locked'
            ? { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' }
            : { backgroundColor: unit.color, borderColor: '#0003' }
        }
        aria-label={lesson.title}
      >
        {status === 'done' ? (progress!.timesCompleted > 1 ? '👑' : '✓') : status === 'open' ? '⭐' : '🔒'}
      </button>
      {open && (
        <div
          className="absolute left-1/2 top-[84px] z-20 w-64"
          style={{ transform: `translateX(calc(-50% - ${offset}px))` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="animate-pop rounded-2xl p-4 text-white shadow-lg" style={{ backgroundColor: status === 'locked' ? '#94a3b8' : unit.color }}>
            <p className="font-extrabold">{lesson.title}</p>
            <p className="mb-3 text-sm opacity-90">
              {status === 'done'
                ? `Completed ${progress!.timesCompleted}× · best ${Math.round(progress!.bestAccuracy * 100)}%`
                : status === 'open'
                  ? `Lesson ${lesson.index + 1} of ${unit.lessons.length} · ${lesson.items.length} new words`
                  : 'Finish the previous lesson to unlock this one.'}
            </p>
            {status !== 'locked' && (
              <Button
                variant="secondary"
                className="w-full !border-white/40 !text-slate-700"
                data-testid="start-lesson"
                onClick={() => nav(`/lesson/${lesson.id}${status === 'done' ? '?mode=practice' : ''}`)}
              >
                {status === 'done' ? 'Practice +5 XP' : 'Start +10 XP'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StoryNode({ unit, open, onToggle }: { unit: Unit; open: boolean; onToggle: () => void }) {
  const s = useApp((st) => st.s)
  const nav = useNavigate()
  const story = storyByUnit.get(unit.id)
  if (!story) return null
  const unlocked = isStoryUnlocked(s, unit.id, content)
  const done = !!s.lessons[story.id]
  return (
    <div className="relative mt-2">
      <button
        type="button"
        data-testid={`story-${unit.id}`}
        data-status={done ? 'done' : unlocked ? 'open' : 'locked'}
        onClick={(e) => {
          e.stopPropagation()
          if (unlocked) nav(`/story/${story.id}`)
          else onToggle()
        }}
        className={`flex items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3 text-left transition active:translate-y-0.5 ${
          unlocked ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50 opacity-70'
        }`}
      >
        <span className="text-3xl">{unlocked ? story.emoji : '🔒'}</span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-wider text-amber-600">Story {done && '✓'}</span>
          <span className="block font-bold">{story.title}</span>
          <span className="font-han text-sm text-slate-500">{story.titleZh}</span>
        </span>
      </button>
      {open && !unlocked && (
        <p className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 animate-pop rounded-xl bg-slate-700 p-3 text-center text-sm text-white">
          Finish {STORY_UNLOCK_LESSONS} lessons in this unit to unlock the story.
        </p>
      )}
    </div>
  )
}
