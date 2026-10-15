import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { firebaseEnabled } from '../data/firebase'
import { GOAL_OPTIONS } from '../lib/xp'
import { useApp } from '../store/app'

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(20)
  const finish = useApp((s) => s.finishOnboarding)
  const signIn = useApp((s) => s.signIn)
  const user = useApp((s) => s.user)
  const nav = useNavigate()

  const done = () => {
    finish(goal)
    nav('/lesson/u01-l1', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-10">
      {step === 0 && (
        <div className="flex flex-1 animate-pop flex-col items-center justify-center text-center">
          <div className="mb-2 font-han text-7xl font-black text-brand-600">华语</div>
          <div className="mb-8 text-4xl font-black text-sg">Lah!</div>
          <p className="mb-2 text-xl font-bold">Learn the Mandarin Singaporeans actually speak.</p>
          <p className="mb-10 text-slate-500">
            Can talk a bit but can't read? Same. Bite-sized lessons, local words like 德士 and 巴刹, and flashcards that remember what you forget.
          </p>
          <Button className="mb-3 w-full" onClick={() => setStep(1)} data-testid="get-started">
            Get started
          </Button>
          {firebaseEnabled && !user && (
            <Button variant="secondary" className="w-full" onClick={() => signIn().catch((e) => alert(e.message))}>
              I already have an account
            </Button>
          )}
        </div>
      )}
      {step === 1 && (
        <div className="flex flex-1 animate-pop flex-col">
          <h1 className="mb-2 text-2xl font-extrabold">Pick a daily goal</h1>
          <p className="mb-6 text-slate-500">A lesson is about 10–15 XP. You can change this later.</p>
          <div className="mb-8 flex flex-col gap-3">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g.xp}
                type="button"
                onClick={() => setGoal(g.xp)}
                className={`flex justify-between rounded-2xl border-2 border-b-4 px-5 py-4 font-bold ${goal === g.xp ? 'border-sky-400 bg-sky-50 text-sky-700 dark:text-sky-300' : 'border-slate-200'}`}
              >
                <span>{g.label}</span>
                <span className="text-slate-500">{g.xp} XP / day</span>
              </button>
            ))}
          </div>
          <div className="mt-auto">
            <Button className="w-full" onClick={() => (firebaseEnabled && !user ? setStep(2) : done())} data-testid="goal-continue">
              Continue
            </Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="flex flex-1 animate-pop flex-col items-center justify-center text-center">
          <div className="mb-4 text-6xl">☁️</div>
          <h1 className="mb-2 text-2xl font-extrabold">Save your progress?</h1>
          <p className="mb-8 text-slate-500">Sign in with Google to sync across your phone and computer, and to add friends.</p>
          {user ? (
            <Button className="w-full" onClick={done}>
              Signed in as {user.displayName ?? user.email} — let's go!
            </Button>
          ) : (
            <>
              <Button className="mb-3 w-full" onClick={() => signIn().catch((e) => alert(e.message))}>
                Sign in with Google
              </Button>
              <Button variant="ghost" className="w-full" onClick={done}>
                Maybe later
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
