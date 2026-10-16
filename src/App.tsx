import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { OtterSvg } from './components/OtterSvg'
import { Shell, Toasts } from './components/Shell'
import { HOST_THEME } from './env'
import { useApp } from './store/app'
import { FriendsScreen } from './screens/Friends'
import { LearnScreen } from './screens/Learn'
import { LessonScreen } from './screens/Lesson'
import { Onboarding } from './screens/Onboarding'
import { ProfileScreen } from './screens/Profile'
import { ReviewScreen } from './screens/Review'
import { SettingsScreen } from './screens/Settings'
import { ShadowScreen } from './screens/Shadow'
import { StoryScreen } from './screens/Story'
import { WordDetailScreen } from './screens/WordDetail'
import { WordsScreen } from './screens/Words'

// the Reader pulls in zod + the Claude client, so it loads on first visit
const ReaderScreen = lazy(() => import('./screens/Reader').then((m) => ({ default: m.ReaderScreen })))
const TalkScreen = lazy(() => import('./screens/Talk').then((m) => ({ default: m.TalkScreen })))

export default function App() {
  const status = useApp((s) => s.status)
  const onboarded = useApp((s) => s.s.stats.onboarded)
  const init = useApp((s) => s.init)
  const refresh = useApp((s) => s.refresh)
  const loc = useLocation()
  const theme = useApp((s) => s.s.settings.theme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const system = HOST_THEME === 'dark' || HOST_THEME === 'light' ? HOST_THEME === 'dark' : mq.matches
      const dark = theme === 'dark' || (theme === 'system' && system)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    void init()
  }, [init])

  // Pick up progress made on another device when coming back to the app.
  useEffect(() => {
    let hiddenAt = 0
    const h = () => {
      if (document.hidden) hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 60_000 && !location.pathname.startsWith('/lesson')) void refresh()
    }
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [refresh])

  if (status === 'loading') {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center">
          <OtterSvg mood="sleep" size={110} />
          <div className="mt-1 flex animate-pulse items-baseline gap-1.5">
            <span className="font-brush text-4xl text-brand-600">华语</span>
            <span className="font-display text-2xl font-extrabold text-sg">Lah!</span>
          </div>
        </div>
      </div>
    )
  }

  const inviteLink = loc.pathname === '/friends' && loc.search.includes('add=')
  if (!onboarded && !inviteLink) return <Onboarding />

  return (
    <>
      <Toasts />
      <Routes>
        <Route path="/lesson/:lessonId" element={<LessonScreen />} />
        <Route path="/story/:storyId" element={<StoryScreen />} />
        <Route path="/shadow/:storyId" element={<ShadowScreen />} />
        <Route
          path="/talk/:unitId"
          element={
            <Suspense fallback={null}>
              <TalkScreen />
            </Suspense>
          }
        />
        <Route element={<Shell />}>
          <Route path="/" element={<LearnScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/words" element={<WordsScreen />} />
          <Route
            path="/reader"
            element={
              <Suspense fallback={null}>
                <ReaderScreen />
              </Suspense>
            }
          />
          <Route path="/words/:itemId" element={<WordDetailScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/friends" element={<FriendsScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
