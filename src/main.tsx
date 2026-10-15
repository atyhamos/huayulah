import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

registerSW({ immediate: true })

if (import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
  // test hook for e2e-cloud (emulator builds only)
  void import('./store/app').then(({ useApp }) => {
    ;(window as unknown as { __signIn: (e: string, n: string) => Promise<void> }).__signIn = (e, n) =>
      useApp.getState().signInForTests(e, n)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
