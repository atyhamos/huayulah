import { create } from 'zustand'
import { content } from '../content'
import * as actions from '../data/actions'
import type { Dirty, LessonInput, LessonSummary } from '../data/actions'
import { firebaseEnabled, getFirebase } from '../data/firebase'
import { LocalRepo } from '../data/localRepo'
import { hasProgress, mergeStates } from '../data/merge'
import type { Repo } from '../data/repo'
import { emptyState, type AppState, type Settings } from '../data/types'
import type { Achievement } from '../lib/achievements'
import type { Grade } from '../lib/srs'
import { thisWeekXp, type PublicProfile } from '../data/profile'

export interface AuthUser {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

interface Toast {
  id: number
  icon: string
  title: string
  body?: string
}

interface AppStore {
  status: 'loading' | 'ready'
  mode: 'guest' | 'cloud'
  user: AuthUser | null
  /** Last persistence error, shown as a banner. */
  syncError: string | null
  s: AppState
  toasts: Toast[]

  init(): Promise<void>
  signIn(): Promise<void>
  signOut(): Promise<void>
  refresh(): Promise<void>

  finishOnboarding(dailyGoal: number): void
  updateSettings(p: Partial<Settings>): void
  completeLesson(input: LessonInput): LessonSummary
  reviewCard(cardId: string, grade: Grade): void
  resetProgress(): Promise<void>
  replaceState(next: AppState): void
  addFriendByCode(code: string): Promise<PublicProfile>
  removeFriend(uid: string): Promise<void>
  leaderboard(): Promise<PublicProfile[]>
  toast(t: Omit<Toast, 'id'>): void
  dismissToast(id: number): void
}

const guestRepo = new LocalRepo()
let repo: Repo = guestRepo
let toastId = 0
let publishTimer: ReturnType<typeof setTimeout> | undefined

export const useApp = create<AppStore>((set, get) => {
  function commit(state: AppState, dirty: Dirty) {
    set({ s: state })
    repo.save(state, dirty).then(
      () => get().syncError && set({ syncError: null }),
      (e: unknown) => {
        console.error('save failed', e)
        set({ syncError: e instanceof Error ? e.message : String(e) })
      },
    )
    if (get().mode === 'cloud') schedulePublish()
  }

  /** Keep the public leaderboard profile roughly in sync (debounced). */
  function schedulePublish(delay = 3000) {
    clearTimeout(publishTimer)
    publishTimer = setTimeout(async () => {
      const { user, s, mode } = get()
      if (mode !== 'cloud' || !user) return
      try {
        const [{ db }, friends] = await Promise.all([getFirebase(), import('../data/friends')])
        await friends.publishProfile(db, user, s)
      } catch (e) {
        console.warn('publish profile failed', e)
      }
    }, delay)
  }

  function announce(list: Achievement[]) {
    for (const a of list) get().toast({ icon: a.icon, title: `Achievement: ${a.title}`, body: a.description })
  }

  async function loadAccount(user: AuthUser) {
    const { db } = await getFirebase()
    const { FirestoreRepo } = await import('../data/firestoreRepo')
    const cloud = new FirestoreRepo(db, user.uid)
    let state = await cloud.load()
    const guest = await guestRepo.load()
    repo = cloud
    if (hasProgress(guest)) {
      state = mergeStates(state, guest)
      await cloud.save(state, { root: true, cards: Object.keys(state.cards) })
      await guestRepo.clear()
      get().toast({ icon: '☁️', title: 'Progress synced', body: 'Your guest progress was added to your account.' })
    }
    if (!state.friendCode) {
      try {
        const { claimFriendCode } = await import('../data/friends')
        state = { ...state, friendCode: await claimFriendCode(db, user.uid) }
        await cloud.save(state, { root: true })
      } catch (e) {
        console.warn('friend code', e)
      }
    }
    set({ s: state, mode: 'cloud', user })
    schedulePublish(500)
  }

  return {
    status: 'loading',
    mode: 'guest',
    user: null,
    syncError: null,
    s: emptyState(),
    toasts: [],

    async init() {
      const guest = await guestRepo.load()
      set({ s: guest })
      if (!firebaseEnabled) {
        set({ status: 'ready' })
        return
      }
      try {
        const { auth } = await getFirebase()
        const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth')
        getRedirectResult(auth).catch((e) => set({ syncError: String(e?.message ?? e) }))
        let first = true
        onAuthStateChanged(auth, async (u) => {
          try {
            if (u) {
              await loadAccount({ uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL })
            } else if (get().mode === 'cloud') {
              repo = guestRepo
              set({ mode: 'guest', user: null, s: await guestRepo.load() })
            }
          } catch (e) {
            console.error(e)
            set({ syncError: e instanceof Error ? e.message : String(e) })
          } finally {
            if (first) {
              first = false
              set({ status: 'ready' })
            }
          }
        })
      } catch (e) {
        console.error(e)
        set({ status: 'ready', syncError: 'Could not reach Firebase — using this device only.' })
      }
    },

    async signIn() {
      const { auth } = await getFirebase()
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth')
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        await signInWithPopup(auth, provider)
      } catch (e: unknown) {
        const code = (e as { code?: string }).code
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, provider)
        } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          throw e
        }
      }
    },

    async signOut() {
      const { auth } = await getFirebase()
      const { signOut } = await import('firebase/auth')
      await signOut(auth)
    },

    async refresh() {
      if (get().mode !== 'cloud') return
      try {
        set({ s: await repo.load() })
      } catch (e) {
        console.warn('refresh failed', e)
      }
    },

    finishOnboarding(dailyGoal) {
      const s = get().s
      commit(
        { ...s, settings: { ...s.settings, dailyGoal }, stats: { ...s.stats, onboarded: true } },
        { root: true },
      )
    },

    updateSettings(p) {
      const s = get().s
      commit({ ...s, settings: { ...s.settings, ...p } }, { root: true })
    },

    completeLesson(input) {
      const r = actions.completeLesson(get().s, input, content, new Date())
      commit(r.state, r.dirty)
      // achievements are shown on the lesson-complete screen
      if (r.info.streak.earnedFreeze)
        get().toast({ icon: '🧊', title: 'Streak freeze earned', body: 'It will protect your streak if you miss a day.' })
      return r.info
    },

    reviewCard(cardId, grade) {
      const r = actions.reviewCard(get().s, cardId, grade, content, new Date())
      commit(r.state, r.dirty)
      announce(r.info.achievements)
    },

    async resetProgress() {
      await repo.clear()
      const fresh = { ...emptyState(), settings: get().s.settings, stats: { ...emptyState().stats, onboarded: true } }
      commit(fresh, { root: true })
    },

    replaceState(next) {
      commit(next, { root: true, cards: Object.keys(next.cards) })
    },

    async addFriendByCode(code) {
      const { user, s } = get()
      if (!user) throw new Error('Sign in to add friends')
      const [{ db }, f] = await Promise.all([getFirebase(), import('../data/friends')])
      const uid = await f.uidForCode(db, code)
      if (!uid) throw new Error('No one has that code')
      if (uid === user.uid) throw new Error("That's your own code!")
      const [profile] = await f.loadProfiles(db, [uid])
      await f.follow(db, user.uid, uid)
      if (!s.friends.includes(uid)) commit({ ...s, friends: [...s.friends, uid] }, { root: true })
      return profile ?? { uid, displayName: 'Friend', photoURL: null, friendCode: code, weeklyXp: 0, weekId: null, streak: 0, xp: 0, updatedAt: 0 }
    },

    async removeFriend(uid) {
      const { user, s } = get()
      if (!user) return
      const [{ db }, f] = await Promise.all([getFirebase(), import('../data/friends')])
      await f.unfollow(db, user.uid, uid).catch(() => {})
      commit({ ...s, friends: s.friends.filter((x) => x !== uid) }, { root: true })
    },

    async leaderboard() {
      const { user, s } = get()
      if (!user) return []
      const [{ db }, f] = await Promise.all([getFirebase(), import('../data/friends')])
      await f.publishProfile(db, user, s)
      const fans = await f.followers(db, user.uid).catch(() => [] as string[])
      const uids = [...new Set([user.uid, ...s.friends, ...fans])]
      const profiles = await f.loadProfiles(db, uids)
      return profiles.sort((a, b) => thisWeekXp(b) - thisWeekXp(a) || b.xp - a.xp)
    },

    toast(t) {
      const id = ++toastId
      set({ toasts: [...get().toasts, { ...t, id }] })
      setTimeout(() => get().dismissToast(id), 4500)
    },

    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) })
    },
  }
})
