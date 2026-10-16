import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/icons'
import { Otter } from '../components/Otter'
import { OtterArt } from '../components/OtterArt'
import { Button, KopiCup, Wordmark } from '../components/ui'
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
          <Otter mood="wave" size={150} interactive bubbleSide="top" say={{ zh: '我是阿獭！', en: "Hi, I'm Ah Tat!" }} />
          <Wordmark className="mt-2 text-5xl" />
          <div className="peranakan my-5 h-2 w-40 rounded-full" />
          <p className="mb-2 font-display text-xl font-extrabold">Learn the Mandarin Singaporeans actually speak.</p>
          <p className="mb-10 text-slate-500">
            Can talk a bit but can't read? Same. Bite-sized lessons, local words like 德士 and 巴刹, and flashcards that remember what you forget.
          </p>
          <Button className="mb-3 w-full" onClick={() => setStep(1)} data-testid="get-started">
            Get started
          </Button>
          {firebaseEnabled && !user && (
            <Button variant="secondary" className="w-full" onClick={() => void signIn()}>
              I already have an account
            </Button>
          )}
        </div>
      )}
      {step === 1 && (
        <div className="flex flex-1 animate-pop flex-col">
          <h1 className="mb-1 font-display text-3xl font-extrabold tracking-tight">How strong is your kopi?</h1>
          <p className="mb-6 text-slate-500">Your daily goal. A lesson is about 10–15 XP — you can change this later.</p>
          <div className="mb-8 flex flex-col gap-3">
            {GOAL_OPTIONS.map((g, i) => (
              <button
                key={g.xp}
                type="button"
                onClick={() => setGoal(g.xp)}
                className={`flex items-center gap-4 rounded-3xl px-4 py-3 text-left ring-2 ring-inset transition active:scale-[0.99] ${goal === g.xp ? 'bg-sky-50 text-sky-700 ring-sky-400 dark:text-sky-300' : 'bg-surface ring-slate-200'}`}
              >
                <KopiCup value={(i + 1) / 4} size={44} />
                <span className="flex-1">
                  <span className="block font-display text-lg font-extrabold">{g.label}</span>
                  <span className="text-sm text-slate-500">{g.hint}</span>
                </span>
                <span className="font-bold tabular-nums text-slate-500">{g.xp} XP / day</span>
              </button>
            ))}
          </div>
          <div className="mt-auto">
            <Button className="w-full" onClick={() => (firebaseEnabled && !user ? setStep(2) : done())} data-testid="goal-continue">
              Continue
            </Button>
            <button
              type="button"
              className="mt-3 w-full text-sm font-bold text-sky-600"
              onClick={() => {
                finish(goal)
                nav('/lesson/express-u01', { replace: true })
              }}
              data-testid="onboard-express"
            >
              I can read a bit already — test out of the first line
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="flex flex-1 animate-pop flex-col items-center justify-center text-center">
          <div className="relative mb-4">
            <Icon name="cloud" className="absolute -right-8 -top-4 h-14 w-14 animate-float text-sky-400" />
            <OtterArt mood="think" size={120} />
          </div>
          <h1 className="mb-2 font-display text-3xl font-extrabold">Save your progress?</h1>
          <p className="mb-8 text-slate-500">Sign in with Google to sync across your phone and computer, and to add friends.</p>
          {user ? (
            <Button className="w-full" onClick={done}>
              Signed in as {user.displayName ?? user.email} — let's go!
            </Button>
          ) : (
            <>
              <Button className="mb-3 w-full" onClick={() => void signIn()}>
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
