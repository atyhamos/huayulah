import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { firebaseEnabled } from '../data/firebase'
import { thisWeekXp, type PublicProfile } from '../data/profile'
import { Button, Card, Icon } from '../components/ui'
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
        setMsg({ ok: true, text: `Added ${p.displayName}! 🎉` })
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
        <div className="mb-4 text-6xl">👫</div>
        <h1 className="mb-2 text-2xl font-extrabold">Learn with friends</h1>
        <p className="mb-6 text-slate-500">{invite ? 'Sign in to accept the invite and see the weekly leaderboard.' : 'Sign in to add friends and compete on a weekly XP leaderboard.'}</p>
        <Button variant="blue" onClick={() => signIn().catch((e) => alert(e.message))}>
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
    const text = `Learn Singaporean Mandarin with me on 华语 Lah! My friend code is ${s.friendCode}`
    if (navigator.share) await navigator.share({ title: '华语 Lah!', text, url: link }).catch(() => {})
    else {
      await navigator.clipboard.writeText(`${text}\n${link}`)
      setMsg({ ok: true, text: 'Invite link copied!' })
    }
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => nav(-1)} className="flex items-center gap-1 font-bold text-slate-400">
        {Icon.back('h-5 w-5')} Back
      </button>
      <h1 className="text-2xl font-extrabold">Friends</h1>

      <Card className="text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your friend code</p>
        <p className="my-2 font-mono text-3xl font-black tracking-[0.3em]" data-testid="friend-code">
          {s.friendCode ?? '······'}
        </p>
        <Button variant="blue" className="w-full" onClick={share} disabled={!s.friendCode}>
          Share invite link
        </Button>
      </Card>

      <Card>
        <p className="mb-2 font-bold">Add a friend</p>
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
            className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 font-mono uppercase tracking-widest outline-none focus:border-sky-400"
          />
          <Button type="submit" disabled={busy || code.trim().length < 6}>
            Add
          </Button>
        </form>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-brand-600' : 'text-rose-600'}`}>{msg.text}</p>}
      </Card>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-lg font-bold">This week's leaderboard</p>
          <button type="button" className="text-sm font-bold text-sky-600" onClick={() => void load()}>
            Refresh
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
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${p.uid === user.uid ? 'border-sky-300 bg-sky-50' : 'border-slate-200'}`}
            >
              <span className="w-6 text-center font-extrabold text-slate-400">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
              {p.photoURL ? (
                <img src={p.photoURL} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100">🧑</span>
              )}
              <span className="flex-1">
                <span className="block font-bold">{p.uid === user.uid ? 'You' : p.displayName}</span>
                <span className="text-xs text-slate-500">🔥 {p.streak} · {p.xp} XP total</span>
              </span>
              <span className="font-extrabold text-amber-500">{thisWeekXp(p)} XP</span>
              {p.uid !== user.uid && s.friends.includes(p.uid) && (
                <button
                  type="button"
                  className="text-slate-300 hover:text-rose-500"
                  aria-label="Remove friend"
                  onClick={async () => {
                    if (confirm(`Remove ${p.displayName}?`)) {
                      await removeFriend(p.uid)
                      await load()
                    }
                  }}
                >
                  {Icon.close('h-4 w-4')}
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
