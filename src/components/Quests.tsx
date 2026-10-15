import { dayKey } from '../lib/dates'
import { allQuestsDone, dailyQuests, QUEST_BONUS_XP } from '../lib/quests'
import { useApp } from '../store/app'
import { ProgressBar } from './ui'

export function DailyQuests() {
  const s = useApp((st) => st.s)
  const today = dayKey()
  const quests = dailyQuests(s, today)
  const claimed = !!s.days[today]?.questBonus
  return (
    <div className="mb-6 rounded-2xl border-2 border-slate-200 p-4" data-testid="quests">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">Daily quests</p>
        <span className={`text-2xl ${claimed ? '' : 'grayscale'}`} title={claimed ? 'Claimed!' : `Finish all three for +${QUEST_BONUS_XP} XP`}>
          {claimed || allQuestsDone(quests) ? '🎁' : '📦'}
        </span>
      </div>
      <div className="space-y-3">
        {quests.map((q) => (
          <div key={q.id} className="flex items-center gap-3">
            <span className="text-xl">{q.icon}</span>
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-sm">
                <span className={q.progress >= q.target ? 'text-slate-400 line-through' : ''}>{q.label}</span>
                <span className="text-slate-400">
                  {q.progress}/{q.target}
                </span>
              </div>
              <ProgressBar value={q.progress / q.target} className="!h-2.5" color={q.progress >= q.target ? 'bg-brand-500' : 'bg-amber-400'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
