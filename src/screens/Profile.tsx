import { Link } from 'react-router-dom'
import { content } from '../content'
import { firebaseEnabled } from '../data/firebase'
import { Button, Card, ProgressBar } from '../components/ui'
import { allAchievements } from '../lib/achievements'
import { addDays, dayKey, parseDay } from '../lib/dates'
import { currentStreak } from '../lib/streak'
import { levelInfo } from '../lib/xp'
import { useApp } from '../store/app'

export function ProfileScreen() {
  const s = useApp((st) => st.s)
  const user = useApp((st) => st.user)
  const signIn = useApp((st) => st.signIn)
  const today = dayKey()
  const lvl = levelInfo(s.stats.xp)
  const streak = currentStreak(s.stats, today)
  const learned = Object.keys(s.cards).filter((k) => k.endsWith('__read')).length
  const achievements = allAchievements(content.units)
  const earned = achievements.filter((a) => s.achievements[a.id]).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-3xl">🧑</div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-extrabold">{user?.displayName ?? 'Guest learner'}</h1>
          <p className="text-sm text-slate-500">{user ? user.email : 'Progress saved on this device only'}</p>
        </div>
        <Link to="/settings" className="text-2xl" aria-label="Settings">
          ⚙️
        </Link>
      </div>

      {!user && firebaseEnabled && (
        <Card className="border-sky-200 bg-sky-50">
          <p className="mb-1 font-bold text-sky-800">Sync across devices</p>
          <p className="mb-3 text-sm text-sky-700">Sign in with Google to back up progress and add friends. Your guest progress comes with you.</p>
          <Button variant="blue" className="w-full" onClick={() => signIn().catch((e) => alert(e.message))}>
            Sign in with Google
          </Button>
        </Card>
      )}

      <div>
        <div className="mb-1 flex justify-between text-sm font-bold">
          <span>Level {lvl.level}</span>
          <span className="text-slate-400">
            {s.stats.xp} / {lvl.next} XP
          </span>
        </div>
        <ProgressBar value={lvl.progress} color="bg-amber-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile icon="🔥" value={streak.streak} label="Day streak" />
        <StatTile icon="🏅" value={s.stats.longestStreak} label="Longest streak" />
        <StatTile icon="⚡" value={s.stats.xp} label="Total XP" />
        <StatTile icon="📚" value={learned} label="Words learned" />
      </div>

      <Card>
        <p className="mb-3 font-bold">Last 7 days</p>
        <XpChart days={s.days} goal={s.settings.dailyGoal} />
      </Card>

      <Card>
        <p className="mb-3 font-bold">Activity</p>
        <Heatmap days={s.days} goal={s.settings.dailyGoal} />
      </Card>

      <Card>
        <p className="mb-3 font-bold">Units</p>
        <div className="space-y-3">
          {content.units.map((u) => {
            const done = u.lessons.filter((l) => s.lessons[l.id]).length
            return (
              <div key={u.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>
                    {u.emoji} {u.title}
                  </span>
                  <span className="text-slate-400">
                    {done}/{u.lessons.length}
                  </span>
                </div>
                <ProgressBar value={done / u.lessons.length} className="!h-2.5" />
              </div>
            )
          })}
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-lg font-bold">Achievements</p>
          <span className="text-sm text-slate-400">
            {earned}/{achievements.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {achievements.map((a) => {
            const got = !!s.achievements[a.id]
            return (
              <div
                key={a.id}
                className={`flex flex-col items-center rounded-2xl border-2 p-3 text-center ${got ? 'border-amber-300 bg-amber-50' : 'border-slate-100 opacity-50 grayscale'}`}
                title={a.description}
              >
                <span className="text-3xl">{a.icon}</span>
                <span className="mt-1 text-xs font-bold leading-tight">{a.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      <Link to="/friends" className="flex items-center gap-3 rounded-2xl border-2 border-b-4 border-slate-200 p-4">
        <span className="text-3xl">👫</span>
        <span className="flex-1 font-bold">Friends & leaderboard</span>
        <span className="text-slate-400">→</span>
      </Link>
    </div>
  )
}

function StatTile({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 p-3">
      <span className="text-2xl">{icon}</span>
      <span>
        <span className="block text-lg font-extrabold">{value}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </span>
    </div>
  )
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function XpChart({ days, goal }: { days: Record<string, { xp: number }>; goal: number }) {
  const today = dayKey()
  const keys = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const max = Math.max(goal, ...keys.map((k) => days[k]?.xp ?? 0))
  return (
    <div className="flex h-32 items-end gap-2">
      {keys.map((k) => {
        const xp = days[k]?.xp ?? 0
        return (
          <div key={k} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-slate-400">{xp || ''}</span>
            <div className="w-full rounded-t-md bg-slate-100" style={{ height: 80 }}>
              <div
                className={`w-full rounded-t-md ${xp >= goal ? 'bg-brand-500' : 'bg-amber-400'}`}
                style={{ height: `${(xp / max) * 100}%`, marginTop: `${80 - (xp / max) * 80}px` }}
              />
            </div>
            <span className={`text-xs ${k === today ? 'font-bold text-slate-700' : 'text-slate-400'}`}>{DOW[parseDay(k).getDay()]}</span>
          </div>
        )
      })}
    </div>
  )
}

function Heatmap({ days, goal }: { days: Record<string, { xp: number; frozen?: boolean }>; goal: number }) {
  const today = dayKey()
  const weeks = 15
  const end = parseDay(today)
  // start on a Sunday so columns are weeks
  const start = addDays(today, -(weeks - 1) * 7 - end.getDay())
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  return (
    <div className="flex gap-1 overflow-x-auto">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-1">
          {col.map((k) => {
            const d = days[k]
            const future = k > today
            const cls = future
              ? 'bg-transparent'
              : !d
                ? 'bg-slate-100'
                : d.frozen && !d.xp
                  ? 'bg-sky-300'
                  : d.xp >= goal
                    ? 'bg-brand-500'
                    : d.xp > 0
                      ? 'bg-brand-200'
                      : 'bg-slate-100'
            return <div key={k} className={`h-4 w-4 rounded-sm ${cls}`} title={`${k}: ${d?.xp ?? 0} XP${d?.frozen ? ' (freeze)' : ''}`} />
          })}
        </div>
      ))}
    </div>
  )
}
