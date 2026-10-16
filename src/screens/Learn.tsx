import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { content, getItem, storyByUnit } from '../content'
import type { Lesson, Unit } from '../content/schema'
import { dueCardIds, isLessonUnlocked, isStoryUnlocked, nextLessonId, STORY_UNLOCK_LESSONS } from '../data/actions'
import { Icon, unitMeta } from '../components/icons'
import { scenarioFor } from '../content/roleplay'
import { Otter, type OtterMood } from '../components/Otter'
import { OtterArt } from '../components/OtterArt'
import { DailyQuests } from '../components/Quests'
import { Button, KopiCup, StatChip, Wordmark } from '../components/ui'
import { dayKey } from '../lib/dates'
import { currentStreak } from '../lib/streak'
import { levelInfo } from '../lib/xp'
import { useApp } from '../store/app'

function greeting(hour: number): { zh: string; en: string; mood: OtterMood } {
  if (hour >= 23 || hour < 5) return { zh: '夜深了', en: "It's late!", mood: 'sleepy' }
  if (hour < 11) return { zh: '早安！', en: 'Good morning!', mood: 'wave' }
  if (hour < 14) return { zh: '吃饱了吗？', en: 'Eaten yet?', mood: 'wave' }
  if (hour < 18) return { zh: '下午好！', en: 'Good afternoon!', mood: 'wave' }
  return { zh: '晚上好！', en: 'Good evening!', mood: 'wave' }
}

export function LearnScreen() {
  const s = useApp((st) => st.s)
  const due = dueCardIds(s, new Date(), content)
  const dueCount = due.review.length + due.fresh.length
  const next = nextLessonId(s, content)
  const [open, setOpen] = useState<string | null>(null)
  const nextRef = useRef<HTMLLIElement>(null)
  const started = Object.keys(s.lessons).length > 0

  useEffect(() => {
    if (started) nextRef.current?.scrollIntoView({ block: 'center' })
    // only on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div onClick={() => setOpen(null)}>
      <TodayCard nextLessonId={next} />

      {dueCount > 0 && (
        <Link
          to="/review"
          className="mt-4 flex items-center gap-3 rounded-3xl bg-sky-500 p-4 text-white shadow-[0_12px_24px_-14px_var(--color-sky-700)] transition active:scale-[0.99]"
          data-testid="review-cta"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15">
            <Icon name="cards" className="h-7 w-7" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg font-bold">{dueCount} flashcards due</span>
            <span className="text-sm text-white/80">About {Math.max(1, Math.round(dueCount * 0.15))} min to keep them fresh</span>
          </span>
          <Icon name="next" className="h-6 w-6" />
        </Link>
      )}

      {started && <DailyQuests />}

      <h2 className="mb-1 mt-8 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-slate-400">
        <Icon name="map" className="h-5 w-5" /> Line map
      </h2>
      {content.units.map((u) => (
        <Line key={u.id} unit={u} next={next} open={open} setOpen={setOpen} nextRef={nextRef} />
      ))}
      <div className="mt-10 flex flex-col items-center gap-2 text-center text-sm text-slate-400">
        <OtterArt mood="sleep" size={64} />
        End of the line — for now. Keep your flashcards fresh!
      </div>
    </div>
  )
}

function TodayCard({ nextLessonId }: { nextLessonId: string | null }) {
  const s = useApp((st) => st.s)
  const today = dayKey()
  const st = currentStreak(s.stats, today)
  const todayXp = s.days[today]?.xp ?? 0
  const goal = s.settings.dailyGoal
  const lvl = levelInfo(s.stats.xp)
  const g = greeting(new Date().getHours())
  const goalDone = todayXp >= goal
  const nextLesson = nextLessonId ? content.lessons.get(nextLessonId) : null
  const meta = nextLesson ? unitMeta(nextLesson.unitId) : null

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-surface shadow-[0_18px_40px_-28px_rgb(20_50_35/0.6)] ring-1 ring-slate-200">
      <div className="flex items-start gap-2 p-5 pb-3">
        <div className="min-w-0 flex-1">
          <p className="leading-none">
            <Wordmark className="text-3xl" />
          </p>
          <p className="mt-4 font-han text-2xl font-bold">{g.zh}</p>
          <p className="text-slate-500">{goalDone ? 'Daily goal done — 好棒！' : g.en}</p>
          {nextLesson && meta && (
            <p className="mt-2 text-sm text-slate-500">
              Next stop:{' '}
              <span className="font-bold text-ink">
                {meta.code}
                {nextLesson.index + 1} · {nextLesson.title}
              </span>
            </p>
          )}
        </div>
        <Otter mood={goalDone ? 'happy' : g.mood} size={104} bubbleSide="left" className="-mr-1 -mt-1" />
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200">
        <div className="flex flex-col items-center gap-0.5 py-3">
          <StatChip
            icon="lantern"
            value={st.streak}
            label={st.atRisk ? 'Do a lesson today to keep your streak!' : 'Day streak'}
            tone={st.doneToday ? 'text-orange-500' : 'text-slate-400'}
            glow={st.doneToday}
            testId="streak"
          />
          <span className="text-[11px] font-semibold text-slate-500">
            day streak
            {s.stats.freezes > 0 && (
              <span className="ml-1 inline-flex items-center text-sky-500" title="Streak freezes (ice kacang)">
                <Icon name="freeze" className="h-3.5 w-3.5" />×{s.stats.freezes}
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 border-x border-slate-200 py-2" title="Daily goal">
          <KopiCup value={todayXp / goal} size={40} className={goalDone ? 'text-brand-600' : 'text-slate-500'} />
          <span className="text-[11px] font-semibold tabular-nums text-slate-500">
            {Math.min(todayXp, goal)}/{goal} XP today
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-3">
          <StatChip icon="coin" value={s.stats.xp} label={`Level ${lvl.level}`} tone="text-amber-500" testId="xp" />
          <span className="text-[11px] font-semibold text-slate-500">XP · level {lvl.level}</span>
        </div>
      </div>
      <div className="peranakan h-3" />
    </section>
  )
}

function Line({
  unit,
  next,
  open,
  setOpen,
  nextRef,
}: {
  unit: Unit
  next: string | null
  open: string | null
  setOpen: (id: string | null) => void
  nextRef: React.RefObject<HTMLLIElement | null>
}) {
  const s = useApp((st) => st.s)
  const meta = unitMeta(unit.id)
  const done = unit.lessons.filter((l) => s.lessons[l.id]).length
  return (
    <section className="mt-6" data-testid={`unit-${unit.id}`}>
      <header className="flex items-center gap-3">
        <span
          className="grid h-11 min-w-11 place-items-center rounded-2xl px-2 font-display text-lg font-extrabold text-white"
          style={{ backgroundColor: unit.color }}
        >
          {meta.code}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-extrabold leading-tight">{unit.title}</h3>
          <p className="font-brush text-lg leading-tight text-slate-500">{unit.titleZh}</p>
        </div>
        <span className="text-right text-xs font-bold tabular-nums text-slate-400">
          <Icon name={meta.icon} className="ml-auto h-7 w-7" />
          {done}/{unit.lessons.length}
        </span>
      </header>
      <p className="mb-1 mt-2 text-sm text-slate-500">{unit.description}</p>
      {done < unit.lessons.length && (
        <Link
          to={`/lesson/express-${unit.id}`}
          className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200"
          data-testid={`express-${unit.id}`}
        >
          <Icon name="train" className="h-4 w-4" /> Know this already? Take the express test
        </Link>
      )}
      <ol>
        {unit.lessons.map((l, i) => (
          <Station
            key={l.id}
            lesson={l}
            unit={unit}
            code={`${meta.code}${i + 1}`}
            first={i === 0}
            isNext={l.id === next}
            expanded={open === l.id}
            onToggle={() => setOpen(open === l.id ? null : l.id)}
            liRef={l.id === next ? nextRef : undefined}
          />
        ))}
        <StoryStop unit={unit} expanded={open === `story-${unit.id}`} onToggle={() => setOpen(open === `story-${unit.id}` ? null : `story-${unit.id}`)} />
      </ol>
    </section>
  )
}

function Rail({ color, faded, first, last }: { color: string; faded: boolean; first?: boolean; last?: boolean }) {
  return (
    <span
      className={`absolute left-1/2 w-2 -translate-x-1/2 ${first ? 'top-6' : 'top-0'} ${last ? 'h-6' : 'bottom-0'}`}
      style={{ backgroundColor: color, opacity: faded ? 0.25 : 1 }}
    />
  )
}

function Station({
  lesson,
  unit,
  code,
  first,
  isNext,
  expanded,
  onToggle,
  liRef,
}: {
  lesson: Lesson
  unit: Unit
  code: string
  first: boolean
  isNext: boolean
  expanded: boolean
  onToggle: () => void
  liRef?: React.RefObject<HTMLLIElement | null>
}) {
  const s = useApp((st) => st.s)
  const nav = useNavigate()
  const progress = s.lessons[lesson.id]
  const unlocked = isLessonUnlocked(s, lesson.id, content)
  const status = progress ? 'done' : unlocked ? 'open' : 'locked'
  const color = unit.color

  return (
    <li className="relative flex gap-3" ref={liRef}>
      <div className="relative w-12 shrink-0">
        <Rail color={color} faded={status === 'locked'} first={first} />
        <span className="absolute left-1/2 top-6 -translate-x-1/2 -translate-y-1/2">
          {isNext ? (
            <span className="relative grid h-12 w-12 place-items-end overflow-hidden rounded-full bg-surface ring-[5px]" style={{ ['--tw-ring-color' as string]: color }}>
              <span className="absolute inset-0 animate-ping-slow rounded-full" style={{ boxShadow: `0 0 0 4px ${color}` }} />
              <OtterArt size={48} className="-mb-3" />
            </span>
          ) : (
            <span
              className={`grid h-7 w-7 place-items-center rounded-full ring-[5px] ${status === 'done' ? '' : 'bg-surface'}`}
              style={{
                ['--tw-ring-color' as string]: status === 'locked' ? 'var(--color-slate-300)' : color,
                backgroundColor: status === 'done' ? color : undefined,
              }}
            >
              {status === 'done' && <Icon name="check" className="h-4 w-4 text-white" strokeWidth={3} />}
            </span>
          )}
        </span>
      </div>

      <div className={`my-1.5 min-w-0 flex-1 rounded-2xl transition ${expanded ? 'bg-surface shadow-sm ring-1 ring-slate-200' : ''}`}>
        <button
          type="button"
          data-testid={`lesson-${lesson.id}`}
          data-status={status}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left hover:bg-surface/70"
          aria-expanded={expanded}
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span
                className="rounded-md px-1.5 py-0.5 font-display text-[11px] font-extrabold tabular-nums"
                style={{ color: status === 'locked' ? 'var(--color-slate-400)' : color, backgroundColor: 'var(--color-slate-100)' }}
              >
                {code}
              </span>
              <span className={`truncate font-display font-bold ${status === 'locked' ? 'text-slate-400' : ''}`}>{lesson.title}</span>
              {progress && progress.timesCompleted > 1 && <Icon name="crown" className="h-4 w-4 shrink-0 text-amber-500" />}
            </span>
            <span className={`mt-0.5 block text-xs ${isNext ? 'font-bold text-brand-600' : 'text-slate-500'}`}>
              {isNext
                ? 'You are here · tap to board'
                : status === 'done'
                  ? progress!.tested && !progress!.timesCompleted
                    ? 'Cleared by express train'
                    : `Done ${progress!.timesCompleted}× · best ${Math.round(progress!.bestAccuracy * 100)}%`
                  : status === 'open'
                    ? `${lesson.items.length} new words`
                    : 'Finish the stop before this one'}
            </span>
          </span>
          {status === 'locked' ? (
            <Icon name="lock" className="h-5 w-5 shrink-0 text-slate-300" />
          ) : (
            <Icon name="next" className={`h-5 w-5 shrink-0 text-slate-400 transition ${expanded ? 'rotate-90' : ''}`} />
          )}
        </button>
        {expanded && (
          <div className="animate-pop px-3 pb-3" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {lesson.items.map((id) => (
                <span key={id} className="tile font-han px-2 py-1 text-lg leading-tight">
                  {getItem(id).hanzi}
                </span>
              ))}
            </div>
            {status !== 'locked' ? (
              <Button
                className="w-full"
                data-testid="start-lesson"
                onClick={() => nav(`/lesson/${lesson.id}${status === 'done' ? '?mode=practice' : ''}`)}
              >
                <Icon name="train" className="h-5 w-5" />
                {status === 'done' ? 'Ride again · +5 XP' : 'Board · +10 XP'}
              </Button>
            ) : (
              <p className="text-sm text-slate-500">Finish the stop before this one to unlock it.</p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function StoryStop({ unit, expanded, onToggle }: { unit: Unit; expanded: boolean; onToggle: () => void }) {
  const s = useApp((st) => st.s)
  const nav = useNavigate()
  const story = storyByUnit.get(unit.id)
  if (!story) return null
  const unlocked = isStoryUnlocked(s, unit.id, content)
  const done = !!s.lessons[story.id]
  return (
    <li className="relative flex gap-3">
      <div className="relative w-12 shrink-0">
        <Rail color={unit.color} faded={!unlocked} last />
        <span
          className="absolute left-1/2 top-6 grid h-8 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] bg-surface"
          style={{ borderColor: unlocked ? 'var(--color-ink)' : 'var(--color-slate-300)' }}
          title="Interchange"
        >
          <Icon name="chat" className={`h-5 w-5 ${unlocked ? 'text-ink' : 'text-slate-300'}`} />
        </span>
      </div>
      <div className="my-1.5 min-w-0 flex-1">
        <button
          type="button"
          data-testid={`story-${unit.id}`}
          data-status={done ? 'done' : unlocked ? 'open' : 'locked'}
          onClick={(e) => {
            e.stopPropagation()
            if (unlocked) nav(`/story/${story.id}`)
            else onToggle()
          }}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 ${
            unlocked ? 'bg-amber-50 ring-amber-200' : 'ring-slate-200'
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-widest text-amber-600">
              Interchange · story {done && '✓'}
            </span>
            <span className={`block font-display font-bold ${unlocked ? '' : 'text-slate-400'}`}>{story.title}</span>
            <span className="font-han text-sm text-slate-500">{story.titleZh}</span>
          </span>
          {unlocked ? <Icon name="play" className="h-6 w-6 text-amber-600" /> : <Icon name="lock" className="h-5 w-5 text-slate-300" />}
        </button>
        {expanded && !unlocked && (
          <p className="mt-1 animate-pop px-3 text-sm text-slate-500">
            Finish {STORY_UNLOCK_LESSONS} stops on this line to unlock the story.
          </p>
        )}
        {done && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              to={`/shadow/${story.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-sky-600 ring-1 ring-slate-200"
              data-testid={`shadow-${unit.id}`}
            >
              <Icon name="mic" className="h-4 w-4" /> Shadow it
            </Link>
            {scenarioFor(unit.id) && (
              <Link
                to={`/talk/${unit.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-nyonya-500 ring-1 ring-slate-200"
                data-testid={`talk-${unit.id}`}
              >
                <Icon name="chat" className="h-4 w-4" /> Role-play: {scenarioFor(unit.id)!.title}
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
