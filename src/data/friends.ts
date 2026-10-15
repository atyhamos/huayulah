import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, type Firestore } from 'firebase/firestore'
import { weekId } from '../lib/dates'
import type { PublicProfile } from './profile'

export type { PublicProfile }
import type { AppState } from './types'

/**
 * publicProfiles/{uid}                 what friends can see (name, photo, weekly XP, streak)
 * publicProfiles/{uid}/followers/{fid} people who added {uid} — so friendships show up on both sides
 * friendCodes/{code}                   { uid } lookup for invite codes
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomCode(rng: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => ALPHABET[Math.floor(rng() * ALPHABET.length)]).join('')
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

/** Reserve a friend code for this user (first time only). */
export async function claimFriendCode(db: Firestore, uid: string): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomCode()
    const ref = doc(db, 'friendCodes', code)
    const existing = await getDoc(ref)
    if (existing.exists()) continue
    await setDoc(ref, { uid })
    return code
  }
  throw new Error('Could not create a friend code, try again')
}

export async function publishProfile(
  db: Firestore,
  user: { uid: string; displayName: string | null; photoURL: string | null },
  s: AppState,
) {
  if (!s.friendCode) return
  const wk = weekId()
  const profile: PublicProfile = {
    uid: user.uid,
    displayName: user.displayName ?? 'Learner',
    photoURL: user.photoURL,
    friendCode: s.friendCode,
    weeklyXp: s.stats.weekId === wk ? s.stats.weeklyXp : 0,
    weekId: wk,
    streak: s.stats.streak,
    xp: s.stats.xp,
    updatedAt: Date.now(),
  }
  await setDoc(doc(db, 'publicProfiles', user.uid), profile)
}

export async function uidForCode(db: Firestore, code: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'friendCodes', normalizeCode(code)))
  return snap.exists() ? (snap.data().uid as string) : null
}

export async function follow(db: Firestore, me: string, friend: string) {
  await setDoc(doc(db, 'publicProfiles', friend, 'followers', me), { at: Date.now() })
}

export async function unfollow(db: Firestore, me: string, friend: string) {
  await deleteDoc(doc(db, 'publicProfiles', friend, 'followers', me))
}

export async function followers(db: Firestore, me: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'publicProfiles', me, 'followers'))
  return snap.docs.map((d) => d.id)
}

export async function loadProfiles(db: Firestore, uids: string[]): Promise<PublicProfile[]> {
  const snaps = await Promise.all(uids.map((u) => getDoc(doc(db, 'publicProfiles', u)).catch(() => null)))
  return snaps.filter((s) => s?.exists()).map((s) => s!.data() as PublicProfile)
}
