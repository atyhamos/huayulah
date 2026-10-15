import { items } from './index'

let loading: Promise<void> | null = null

/** Load pinyin-pro on demand (speech scoring, unexpected text). */
export function loadPinyinEngine(): Promise<void> {
  loading ??= import('../lib/pinyinEngine').then((m) => m.installPinyinEngine([...items.values()]))
  return loading
}
