import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { Dirty } from './actions'
import type { Repo } from './repo'
import { normalizeState, type AppState, type StoredCard } from './types'

/**
 * users/{uid}            settings, stats, lessons, days, achievements, friends, friendCode
 * users/{uid}/cards/{id} one FSRS card each
 */
export class FirestoreRepo implements Repo {
  constructor(
    private db: Firestore,
    private uid: string,
  ) {}

  private userRef() {
    return doc(this.db, 'users', this.uid)
  }

  private cardsRef() {
    return collection(this.db, 'users', this.uid, 'cards')
  }

  async load(): Promise<AppState> {
    const [user, cards] = await Promise.all([getDoc(this.userRef()), getDocs(this.cardsRef())])
    const raw = user.data()
    let root: Partial<AppState> | null = null
    if (raw) {
      const { updatedAt: _updatedAt, ...rest } = raw
      root = rest as Partial<AppState>
    }
    const cardMap: Record<string, StoredCard> = {}
    cards.forEach((d) => (cardMap[d.id] = d.data() as StoredCard))
    return normalizeState(root ? { ...root, cards: cardMap } : Object.keys(cardMap).length ? { cards: cardMap } : null)
  }

  async save(state: AppState, dirty: Dirty): Promise<void> {
    const writes: Promise<unknown>[] = []
    if (dirty.root) {
      const { cards: _cards, ...root } = state
      writes.push(setDoc(this.userRef(), { ...root, updatedAt: Date.now() }))
    }
    const ids = dirty.cards ?? []
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(this.db)
      for (const id of ids.slice(i, i + 450)) {
        const c = state.cards[id]
        if (c) batch.set(doc(this.cardsRef(), id), c)
        else batch.delete(doc(this.cardsRef(), id))
      }
      writes.push(batch.commit())
    }
    await Promise.all(writes)
  }

  async clear(): Promise<void> {
    const cards = await getDocs(this.cardsRef())
    const ids = cards.docs.map((d) => d.id)
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(this.db)
      for (const id of ids.slice(i, i + 450)) batch.delete(doc(this.cardsRef(), id))
      await batch.commit()
    }
    const { cards: _cards, ...root } = normalizeState(null)
    await setDoc(this.userRef(), { ...root, updatedAt: Date.now() })
  }
}
