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
import { dayKey } from '../lib/dates'
import { QUEST_BONUS_XP } from '../lib/quests'
import { onMissingVoice } from '../lib/tts'
import { customItemId, syncCustomItems } from '../content/custom'
import type { IconName } from '../components/icons'
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
  icon?: IconName
  /** Show an achievement medal with this character instead of an icon. */
  medal?: string
  medalColor?: number
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
  signInForTests(email: string, name: string): Promise<void>
  refresh(): Promise<void>

  finishOnboarding(dailyGoal: number): void
  updateSettings(p: Partial<Settings>): void
  completeLesson(input: LessonInput): LessonSummary
  completePractice(input: Omit<LessonInput, 'lessonId' | 'mode'>): LessonSummary
  completeStory(storyId: string, result: { correct: number; total: number }): LessonSummary
  completeMyWords(input: Omit<LessonInput, 'lessonId' | 'mode'> & { itemIds: string[] }): LessonSummary
  completeExpress(unitId: string, result: { correct: number; total: number }): LessonSummary & { passed: boolean }
  /** Save a word to My words; returns its id (existing id if already saved). */
  addCustomItem(word: { hanzi: string; pinyin: string; english: string; note?: string }): string
  removeCustomItem(id: string): void
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
    const before = get().s
    const bonus = actions.claimQuestBonus(state, new Date())
    if (bonus.claimed) {
      state = bonus.state
      dirty = { ...dirty, root: true }
      setTimeout(() => get().toast({ icon: 'angbao', title: 'Daily quests complete!', body: `+${QUEST_BONUS_XP} bonus XP` }), 1200)
    }
    set({ s: state })
    const today = dayKey()
    const goal = state.settings.dailyGoal
    if ((before.days[today]?.xp ?? 0) < goal && (state.days[today]?.xp ?? 0) >= goal) {
      setTimeout(() => get().toast({ icon: 'kopi', title: 'Daily goal reached!', body: `${goal} XP today — 好棒！` }), 600)
    }
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
    for (const a of list) get().toast({ medal: a.char, medalColor: a.color, title: `Achievement: ${a.title}`, body: a.description })
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
      get().toast({ icon: 'cloud', title: 'Progress synced', body: 'Your guest progress was added to your account.' })
    } else if (guest.stats.onboarded && !state.stats.onboarded) {
      // finished onboarding as a guest but hadn't earned XP yet — don't onboard again
      state = { ...state, settings: guest.settings, stats: { ...state.stats, onboarded: true } }
      await cloud.save(state, { root: true })
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
              // signed out: start a fresh guest session but keep preferences
              repo = guestRepo
              const { settings } = get().s
              let guest = await guestRepo.load()
              if (!hasProgress(guest)) {
                guest = { ...guest, settings, stats: { ...guest.stats, onboarded: true } }
                await guestRepo.save(guest)
              }
              set({ mode: 'guest', user: null, s: guest })
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
          get().toast({ icon: 'warning', title: "Couldn't sign in", body: e instanceof Error ? e.message : String(e) })
        }
      }
    },

    async signInForTests(email: string, name: string) {
      // Only in emulator builds: the Auth emulator accepts an unsigned Google ID token.
      if (import.meta.env.VITE_FIREBASE_EMULATORS !== 'true') throw new Error('emulator only')
      const { auth } = await getFirebase()
      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth')
      const token = JSON.stringify({ sub: email, email, email_verified: true, name })
      await signInWithCredential(auth, GoogleAuthProvider.credential(token))
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
        get().toast({ icon: 'freeze', title: 'Streak freeze earned', body: 'It will protect your streak if you miss a day.' })
      return r.info
    },

    completePractice(input) {
      const r = actions.completePractice(get().s, input, content, new Date())
      commit(r.state, r.dirty)
      return r.info
    },

    completeExpress(unitId, result) {
      const r = actions.completeExpress(get().s, unitId, result, content, new Date())
      commit(r.state, r.dirty)
      return r.info
    },

    completeMyWords(input) {
      const r = actions.completeMyWords(get().s, input, content, new Date())
      commit(r.state, r.dirty)
      return r.info
    },

    addCustomItem(word) {
      const id = customItemId(word.hanzi)
      const s = get().s
      if (!s.customItems[id]) {
        const item = { id, hanzi: word.hanzi, pinyin: word.pinyin, english: word.english, addedAt: Date.now(), ...(word.note ? { note: word.note } : {}) }
        const r = actions.addCustomItem(s, item)
        commit(r.state, r.dirty)
      }
      return id
    },

    removeCustomItem(id) {
      const r = actions.removeCustomItem(get().s, id)
      commit(r.state, r.dirty)
    },

    completeStory(storyId, result) {
      const r = actions.completeStory(get().s, storyId, result, content, new Date())
      commit(r.state, r.dirty)
      return r.info
    },

    reviewCard(cardId, grade) {
      const r = actions.reviewCard(get().s, cardId, grade, content, new Date())
      commit(r.state, r.dirty)
      announce(r.info.achievements)
    },

    async resetProgress() {
      await repo.clear()
      const { settings, friends, friendCode } = get().s
      const fresh = { ...emptyState(), settings, friends, friendCode, stats: { ...emptyState().stats, onboarded: true } }
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

// One hint per session when speech can't play because the browser has no Mandarin voice.
let warnedNoVoice = false
onMissingVoice(() => {
  if (warnedNoVoice) return
  warnedNoVoice = true
  useApp.getState().toast({ icon: 'mute', title: 'No Mandarin voice in this browser', body: 'Settings → Voice shows how to add one.' })
})

// Learner-added words join the shared item map whenever they change (load, sign-in, edits).
useApp.subscribe((st, prev) => {
  if (st.s.customItems !== prev.s.customItems) syncCustomItems(st.s.customItems)
})
