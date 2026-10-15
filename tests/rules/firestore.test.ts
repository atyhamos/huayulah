import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, type Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { content } from '../../src/content'
import { completeLesson } from '../../src/data/actions'
import { FirestoreRepo } from '../../src/data/firestoreRepo'
import { claimFriendCode, follow, followers, loadProfiles, publishProfile, uidForCode } from '../../src/data/friends'
import { emptyState } from '../../src/data/types'

let env: RulesTestEnvironment
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':')

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-huayu',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  })
})
afterAll(() => env?.cleanup())
beforeEach(() => env.clearFirestore())

const db = (uid?: string) =>
  (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore()) as unknown as Firestore

describe('security rules', () => {
  it('keeps progress private', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'users/alice'), { a: 1 }))
    await assertSucceeds(setDoc(doc(db('alice'), 'users/alice/cards/x__read'), { due: 1 }))
    await assertFails(getDoc(doc(db('bob'), 'users/alice')))
    await assertFails(getDocs(collection(db('bob'), 'users/alice/cards')))
    await assertFails(setDoc(doc(db('bob'), 'users/alice'), { hacked: true }))
    await assertFails(getDoc(doc(db(), 'users/alice')))
  })

  it('lets signed-in users read but not forge public profiles', async () => {
    const profile = { uid: 'alice', displayName: 'Alice', weeklyXp: 5, xp: 10 }
    await assertSucceeds(setDoc(doc(db('alice'), 'publicProfiles/alice'), profile))
    await assertSucceeds(getDoc(doc(db('bob'), 'publicProfiles/alice')))
    await assertFails(getDoc(doc(db(), 'publicProfiles/alice')))
    await assertFails(setDoc(doc(db('bob'), 'publicProfiles/alice'), { ...profile, weeklyXp: 9999 }))
    await assertFails(setDoc(doc(db('alice'), 'publicProfiles/alice'), { ...profile, uid: 'bob' }))
  })

  it('only lets you add yourself as a follower', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'publicProfiles/alice/followers/bob'), { at: 1 }))
    await assertFails(setDoc(doc(db('bob'), 'publicProfiles/alice/followers/carol'), { at: 1 }))
    await assertSucceeds(getDocs(collection(db('alice'), 'publicProfiles/alice/followers')))
    await assertFails(getDocs(collection(db('bob'), 'publicProfiles/alice/followers')))
  })

  it('protects friend codes', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'friendCodes/ABC234'), { uid: 'alice' }))
    await assertFails(setDoc(doc(db('bob'), 'friendCodes/ZZZ999'), { uid: 'alice' }))
    await assertFails(setDoc(doc(db('alice'), 'friendCodes/ABC234'), { uid: 'alice' })) // no overwrite
    await assertFails(setDoc(doc(db('alice'), 'friendCodes/TOOLONG1'), { uid: 'alice' }))
    await assertSucceeds(getDoc(doc(db('bob'), 'friendCodes/ABC234')))
    await assertFails(getDocs(collection(db('bob'), 'friendCodes')))
  })
})

describe('FirestoreRepo', () => {
  it('round-trips progress and clears it', async () => {
    const repo = new FirestoreRepo(db('alice'), 'alice')
    const s = completeLesson(
      emptyState(),
      { lessonId: content.lessonOrder[0].id, mode: 'learn', mistakesByItem: {}, maxCombo: 3, answered: 12, correct: 12 },
      content,
      new Date(2026, 4, 1),
    ).state
    await repo.save(s, { root: true, cards: Object.keys(s.cards) })
    const loaded = await repo.load()
    expect(loaded).toEqual(s)

    await repo.clear()
    const cleared = await repo.load()
    expect(cleared.stats.xp).toBe(0)
    expect(cleared.cards).toEqual({})
  })

  it('loads an empty state for a new user', async () => {
    const s = await new FirestoreRepo(db('newbie'), 'newbie').load()
    expect(s).toEqual(emptyState())
  })
})

describe('friends', () => {
  it('claims codes, publishes profiles and links followers', async () => {
    const a = db('alice')
    const b = db('bob')
    const code = await claimFriendCode(a, 'alice')
    expect(code).toMatch(/^[A-Z2-9]{6}$/)
    const s = { ...emptyState(), friendCode: code }
    await publishProfile(a, { uid: 'alice', displayName: 'Alice', photoURL: null }, s)
    expect(await uidForCode(b, code.toLowerCase())).toBe('alice')
    await follow(b, 'bob', 'alice')
    expect(await followers(a, 'alice')).toEqual(['bob'])
    const [p] = await loadProfiles(b, ['alice', 'ghost'])
    expect(p.displayName).toBe('Alice')
  })
})
