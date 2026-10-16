import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { firebaseEnabled } from '../data/firebase'
import { thisWeekXp, type PublicProfile } from '../data/profile'
import { Icon } from '../components/icons'
import { Otter } from '../components/Otter'
import { Avatar, BackButton, Button, Card, Medal } from '../components/ui'
import { useApp } from '../store/app'

export function FriendsScreen() {
  const user = useApp((st) => st.user)
  const s = useApp((st) => st.s)
  const signIn = useApp((st) => st.signIn)
  const addFriend = useApp((st) => st.addFriendByCode)
  const removeFriend = useApp((st) => st.removeFriend)
  const leaderboard = useApp((st) => st.leaderboard)
  const finishOnboarding = useApp((st) => st.finishOnboarding)
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [board, setBoard] = useState<PublicProfile[] | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setBoard(await leaderboard())
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
      setBoard([])
    }
  }, [user, leaderboard])

  useEffect(() => {
    void load()
  }, [load])

  const add = useCallback(
    async (c: string) => {
      setBusy(true)
      setMsg(null)
      try {
        const p = await addFriend(c)
        setMsg({ ok: true, text: `Added ${p.displayName}!` })
        setCode('')
        await load()
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
      } finally {
        setBusy(false)
      }
    },
    [addFriend, load],
  )

  // Invite links: /friends?add=CODE
  const invite = params.get('add')
  useEffect(() => {
    if (invite && user) {
      if (!s.stats.onboarded) finishOnboarding(s.settings.dailyGoal)
      setParams({}, { replace: true })
      void add(invite)
    }
  }, [invite, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!firebaseEnabled) {
    return (
      <Card>
        <p className="font-bold">Friends need cloud sync</p>
        <p className="text-sm text-slate-500">This copy of the app hasn't been connected to Firebase yet (see the README).</p>
      </Card>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center pt-8 text-center">
        <Otter mood="wave" size={120} interactive />
        <h1 className="mb-2 mt-2 font-display text-2xl font-extrabold">Learn with your kakis</h1>
        <p className="mb-6 text-slate-500">{invite ? 'Sign in to accept the invite and see the weekly leaderboard.' : 'Sign in to add friends and compete on a weekly XP leaderboard.'}</p>
        <Button variant="blue" onClick={() => void signIn()}>
          Sign in with Google
        </Button>
        {invite && !s.stats.onboarded && (
          <button type="button" className="mt-4 text-sm text-slate-400" onClick={() => nav('/')}>
            Not now
          </button>
        )}
      </div>
    )
  }

  const link = s.friendCode ? `${location.origin}/friends?add=${s.friendCode}` : ''
  const share = async () => {
    const text = `Learn Singaporean Mandarin with me on Huayulah! My friend code is ${s.friendCode}`
    if (navigator.share) await navigator.share({ title: 'Huayulah', text, url: link }).catch(() => {})
    else {
      await navigator.clipboard.writeText(`${text}\n${link}`)
      setMsg({ ok: true, text: 'Invite link copied!' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="font-display text-2xl font-extrabold">Kakis</h1>
      </div>

      {/* queue number ticket */}
      <div className="relative overflow-hidden rounded-3xl bg-surface text-center shadow-[0_10px_28px_-20px_rgb(30_60_45/0.6)] ring-1 ring-slate-200">
        <div className="bg-sky-500 py-2 text-xs font-bold uppercase tracking-widest text-white">Your friend code</div>
        <p className="mb-3 mt-4 font-display text-4xl font-extrabold tracking-[0.25em] tabular-nums" data-testid="friend-code">
          {s.friendCode ?? '······'}
        </p>
        <div className="border-t border-dashed border-slate-300 p-4">
          <Button variant="blue" className="w-full" onClick={share} disabled={!s.friendCode}>
            <Icon name="share" className="h-5 w-5" /> Share invite link
          </Button>
        </div>
      </div>

      <Card>
        <p className="mb-2 font-display font-extrabold">Add a kaki</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) void add(code)
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            className="min-w-0 flex-1 rounded-full bg-surface px-4 py-2 font-display font-bold uppercase tracking-widest outline-none ring-2 ring-inset ring-slate-200 focus:ring-sky-400"
          />
          <Button type="submit" disabled={busy || code.trim().length < 6}>
            Add
          </Button>
        </form>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-brand-600' : 'text-rose-600 dark:text-rose-400'}`}>{msg.text}</p>}
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-display text-xl font-extrabold">This week's table</p>
          <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-sky-600" onClick={() => void load()}>
            <Icon name="refresh" className="h-4 w-4" /> Refresh
          </button>
        </div>
        {!board ? (
          <p className="text-slate-400">Loading…</p>
        ) : board.length <= 1 ? (
          <p className="text-slate-500">Add a friend to start competing. Resets every Monday.</p>
        ) : null}
        <ol className="space-y-2">
          {board?.map((p, i) => (
            <li
              key={p.uid}
              className={`flex items-center gap-3 rounded-3xl p-3 ring-1 ${p.uid === user.uid ? 'bg-sky-50 ring-sky-300' : 'bg-surface ring-slate-200'}`}
            >
              <span className="grid w-8 place-items-center">
                {i < 3 ? <Medal char={['一', '二', '三'][i]} earned colorIndex={[3, 1, 5][i]} size={32} /> : <span className="font-display font-extrabold text-slate-400">{i + 1}</span>}
              </span>
              {p.photoURL ? (
                <img src={p.photoURL} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <Avatar label={p.displayName?.[0]?.toUpperCase() ?? '?'} seed={i} size={40} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{p.uid === user.uid ? 'You' : p.displayName}</span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Icon name="lantern" className="h-3.5 w-3.5 text-orange-500" /> {p.streak} · {p.xp} XP total
                </span>
              </span>
              <span className="font-display font-extrabold tabular-nums text-amber-600">{thisWeekXp(p)} XP</span>
              {p.uid !== user.uid && s.friends.includes(p.uid) && (
                <button
                  type="button"
                  className="text-slate-300 hover:text-rose-500"
                  aria-label="Remove friend"
                  onClick={async () => {
                    if (removing !== p.uid) {
                      setRemoving(p.uid)
                      return
                    }
                    setRemoving(null)
                    await removeFriend(p.uid)
                    await load()
                  }}
                >
                  {removing === p.uid ? <span className="text-xs font-bold text-rose-500">Remove?</span> : <Icon name="close" className="h-4 w-4" />}
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
