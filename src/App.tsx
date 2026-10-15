import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell, Toasts } from './components/Shell'
import { useApp } from './store/app'
import { FriendsScreen } from './screens/Friends'
import { LearnScreen } from './screens/Learn'
import { LessonScreen } from './screens/Lesson'
import { Onboarding } from './screens/Onboarding'
import { ProfileScreen } from './screens/Profile'
import { ReviewScreen } from './screens/Review'
import { SettingsScreen } from './screens/Settings'
import { StoryScreen } from './screens/Story'
import { WordDetailScreen } from './screens/WordDetail'
import { WordsScreen } from './screens/Words'

export default function App() {
  const status = useApp((s) => s.status)
  const onboarded = useApp((s) => s.s.stats.onboarded)
  const init = useApp((s) => s.init)
  const refresh = useApp((s) => s.refresh)
  const loc = useLocation()

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
        <div className="animate-pulse text-center">
          <div className="font-han text-5xl font-black text-brand-600">华语</div>
          <div className="text-2xl font-black text-sg">Lah!</div>
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
        <Route element={<Shell />}>
          <Route path="/" element={<LearnScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/words" element={<WordsScreen />} />
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
