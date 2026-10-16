import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { IS_ARTIFACT } from './env'
import { unlockAudio } from './lib/sfx'
import { refreshVoices } from './lib/tts'
import './index.css'

if (!IS_ARTIFACT) registerSW({ immediate: true })

// unlock Web Audio and load the voice list on the first interaction
const unlock = () => {
  window.removeEventListener('pointerdown', unlock, true)
  window.removeEventListener('keydown', unlock, true)
  unlockAudio()
  refreshVoices()
}
window.addEventListener('pointerdown', unlock, true)
window.addEventListener('keydown', unlock, true)

if (import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
  // test hook for e2e-cloud (emulator builds only)
  void import('./store/app').then(({ useApp }) => {
    ;(window as unknown as { __signIn: (e: string, n: string) => Promise<void> }).__signIn = (e, n) =>
      useApp.getState().signInForTests(e, n)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {IS_ARTIFACT ? (
      <MemoryRouter>
        <App />
      </MemoryRouter>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)
