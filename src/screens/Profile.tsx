import { Link } from 'react-router-dom'
import { content } from '../content'
import { firebaseEnabled } from '../data/firebase'
import { Icon, unitMeta, type IconName } from '../components/icons'
import { Avatar, Button, Card, KopiCup, Medal } from '../components/ui'
import { allAchievements } from '../lib/achievements'
import { addDays, dayKey, parseDay } from '../lib/dates'
import { currentStreak } from '../lib/streak'
import { levelInfo } from '../lib/xp'
import { IS_ARTIFACT } from '../env'
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
    <div className="space-y-5">
      {/* EZ-Link style member card */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-600 p-5 text-white shadow-[0_16px_30px_-18px_var(--color-brand-800)]">
        <div className="peranakan-band absolute inset-x-0 bottom-0 opacity-80" />
        <Link
          to="/settings"
          aria-label="Settings"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 transition active:scale-95"
        >
          <Icon name="gear" className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-4 pb-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full ring-4 ring-white/30" referrerPolicy="no-referrer" />
          ) : (
            <span className="rounded-full ring-4 ring-white/30">
              <Avatar otter size={64} />
            </span>
          )}
          <div className="min-w-0 flex-1 pr-10">
            <h1 className="truncate font-display text-2xl font-extrabold">{user?.displayName ?? 'Guest learner'}</h1>
            <p className="truncate text-sm text-white/75">{user ? user.email : 'Progress saved on this device only'}</p>
          </div>
        </div>
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-display font-extrabold">Level {lvl.level}</span>
          <span className="tabular-nums text-white/75">
            {s.stats.xp} / {lvl.next} XP
          </span>
        </div>
        <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-amber-300 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(1, lvl.progress)) * 100}%` }} />
        </div>
      </div>

      {IS_ARTIFACT && (
        <Card className="!border-amber-200 !bg-amber-50">
          <p className="mb-1 font-display font-extrabold">Demo version</p>
          <p className="text-sm text-slate-600">
            Progress is saved in this browser only. The full app adds Google sign-in, sync across devices and a friends leaderboard.
          </p>
        </Card>
      )}

      {!user && firebaseEnabled && (
        <Card className="!border-sky-200 !bg-sky-50">
          <p className="mb-1 flex items-center gap-2 font-display font-extrabold text-sky-800 dark:text-sky-200">
            <Icon name="cloud" className="h-5 w-5" /> Sync across devices
          </p>
          <p className="mb-3 text-sm text-sky-700 dark:text-sky-300">Sign in with Google to back up progress and add friends. Your guest progress comes with you.</p>
          <Button variant="blue" className="w-full" onClick={() => void signIn()}>
            Sign in with Google
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile icon="lantern" tone="text-orange-500 bg-orange-50" value={streak.streak} label="Day streak" />
        <StatTile icon="crown" tone="text-amber-600 bg-amber-50" value={s.stats.longestStreak} label="Longest streak" />
        <StatTile icon="coin" tone="text-amber-500 bg-amber-50" value={s.stats.xp} label="Total XP" testId="xp" />
        <StatTile icon="book" tone="text-sky-500 bg-sky-50" value={learned} label="Words learned" />
      </div>

      <Card>
        <SectionTitle zh="这周的咖啡">This week's kopi</SectionTitle>
        <KopiWeek days={s.days} goal={s.settings.dailyGoal} />
      </Card>

      <Card>
        <SectionTitle zh="打卡">Activity</SectionTitle>
        <Heatmap days={s.days} goal={s.settings.dailyGoal} />
      </Card>

      <Card>
        <SectionTitle zh="路线">Lines</SectionTitle>
        <div className="space-y-3">
          {content.units.map((u) => {
            const done = u.lessons.filter((l) => s.lessons[l.id]).length
            const meta = unitMeta(u.id)
            return (
              <div key={u.id} className="flex items-center gap-3">
                <span className="grid h-8 w-11 shrink-0 place-items-center rounded-lg font-display text-xs font-extrabold text-white" style={{ background: u.color }}>
                  {meta.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{u.title}</span>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {done}/{u.lessons.length}
                    </span>
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full transition-all" style={{ width: `${(done / u.lessons.length) * 100}%`, background: u.color }} />
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-display text-xl font-extrabold">Medals</p>
          <span className="text-sm tabular-nums text-slate-400">
            {earned}/{achievements.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
          {achievements.map((a) => {
            const got = !!s.achievements[a.id]
            return (
              <div key={a.id} className={`flex flex-col items-center text-center ${got ? '' : 'opacity-60'}`} title={a.description}>
                <Medal char={a.char} earned={got} colorIndex={a.color} size={60} />
                <span className="mt-1 text-xs font-bold leading-tight">{a.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      <Link to="/friends" className="flex items-center gap-3 rounded-3xl bg-surface p-4 ring-1 ring-slate-200 transition active:scale-[0.99]">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-nyonya-50 text-nyonya-500">
          <Icon name="users" className="h-6 w-6" />
        </span>
        <span className="flex-1">
          <span className="block font-display font-extrabold">Kakis & leaderboard</span>
          <span className="text-sm text-slate-500">Study with friends</span>
        </span>
        <Icon name="next" className="h-5 w-5 text-slate-400" />
      </Link>
    </div>
  )
}

function SectionTitle({ children, zh }: { children: React.ReactNode; zh: string }) {
  return (
    <p className="mb-3 flex items-baseline justify-between">
      <span className="font-display font-extrabold">{children}</span>
      <span className="font-han text-sm text-slate-400">{zh}</span>
    </p>
  )
}

function StatTile({ icon, tone, value, label, testId }: { icon: IconName; tone: string; value: number; label: string; testId?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-surface p-3 ring-1 ring-slate-200">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span>
        <span className="block font-display text-xl font-extrabold tabular-nums" data-testid={testId}>
          {value}
        </span>
        <span className="text-xs text-slate-500">{label}</span>
      </span>
    </div>
  )
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** The last seven days as a row of kopi cups, filled by XP against the daily goal. */
function KopiWeek({ days, goal }: { days: Record<string, { xp: number }>; goal: number }) {
  const today = dayKey()
  const keys = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {keys.map((k) => {
        const xp = days[k]?.xp ?? 0
        return (
          <div key={k} className="flex flex-col items-center">
            <KopiCup value={xp / goal} size={40} className={xp >= goal ? 'text-brand-600' : 'text-slate-400'} />
            <span className="text-[10px] tabular-nums text-slate-400">{xp || '·'}</span>
            <span className={`text-xs ${k === today ? 'font-extrabold text-ink' : 'text-slate-400'}`}>{DOW[parseDay(k).getDay()]}</span>
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
                  ? 'bg-sky-400'
                  : d.xp >= goal
                    ? 'bg-brand-500'
                    : d.xp > 0
                      ? 'bg-amber-300'
                      : 'bg-slate-100'
            return <div key={k} className={`h-4 w-4 rounded-full ${cls}`} title={`${k}: ${d?.xp ?? 0} XP${d?.frozen ? ' (freeze)' : ''}`} />
          })}
        </div>
      ))}
    </div>
  )
}
