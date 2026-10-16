import { dayKey } from '../lib/dates'
import { allQuestsDone, dailyQuests, QUEST_BONUS_XP } from '../lib/quests'
import { useApp } from '../store/app'
import { Icon } from './icons'

/** Daily quests, styled as a kopitiam order chit with an ang bao for finishing all three. */
export function DailyQuests() {
  const s = useApp((st) => st.s)
  const today = dayKey()
  const quests = dailyQuests(s, today)
  const claimed = !!s.days[today]?.questBonus
  const allDone = claimed || allQuestsDone(quests)
  return (
    <div className="relative mt-4 rounded-t-3xl bg-surface px-4 pb-5 pt-4 shadow-[0_10px_28px_-22px_rgb(30_60_45/0.6)] ring-1 ring-slate-200" data-testid="quests">
      <div className="mb-3 flex items-baseline justify-between border-b border-dashed border-slate-300 pb-2">
        <p className="font-display font-extrabold">Today's orders</p>
        <p className="font-han text-sm text-slate-400">今日任务</p>
      </div>
      <ul className="space-y-2.5">
        {quests.map((q) => {
          const done = q.progress >= q.target
          return (
            <li key={q.id} className="flex items-center gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon name={done ? 'check' : q.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`flex justify-between gap-2 text-sm ${done ? 'text-slate-400 line-through' : 'font-semibold'}`}>
                  <span className="truncate">{q.label}</span>
                  <span className="shrink-0 tabular-nums text-slate-400">
                    {q.progress}/{q.target}
                  </span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`block h-full rounded-full transition-all duration-700 ${done ? 'bg-brand-500' : 'bg-amber-400'}`}
                    style={{ width: `${(q.progress / q.target) * 100}%` }}
                  />
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <div className={`mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${allDone ? 'bg-rose-50 font-bold text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
        <Icon name="angbao" className={`h-6 w-6 ${allDone ? 'animate-glow text-rose-500' : 'text-slate-400'}`} />
        {claimed ? `Ang bao opened — +${QUEST_BONUS_XP} XP!` : `Finish all three for an ang bao: +${QUEST_BONUS_XP} XP`}
      </div>
      {/* torn receipt edge */}
      <div
        className="absolute inset-x-0 -bottom-2 h-2"
        style={{
          background: 'radial-gradient(circle at 6px 0, var(--color-surface) 5px, transparent 5.5px) 0 0 / 12px 8px repeat-x',
        }}
      />
    </div>
  )
}
