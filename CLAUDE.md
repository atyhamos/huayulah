# 华语 Lah! — notes for working on this repo

Gamified PWA for learning Singaporean Mandarin. React + Vite + TS + Tailwind v4, Zustand, Firebase (optional), FSRS via ts-fsrs.

## Commands
- `npm run dev` / `npm run build` — both run `npm run gen` first (pinyin table + stroke data)
- `npm test` — unit tests (Vitest, `tests/`)
- `npm run validate:content` — content schema, ids, pinyin, freshness of `src/content/pinyin.generated.json`
- `npm run e2e` — Playwright on a production build (set `PW_CHROMIUM_PATH` if browsers are preinstalled elsewhere)
- `npm run test:rules` / `npm run e2e:cloud` — Firestore rules and full sign-in/sync flow on Firebase emulators (need Java)
- `npm run build:artifact` — guest-only demo in `dist-artifact/` (published at https://claude.ai/artifact/53HBboawNkMKj6gbiMWyFk)

## Layout
- `src/content/units/uNN.json`, `src/content/stories.json` — course content. After edits: `npm run gen:pinyin`, then validate.
- `src/data/actions.ts` — pure state transitions (lesson/review/story/practice, quests). The store only applies + persists.
- `src/data/{localRepo,firestoreRepo}.ts` — persistence; Firestore: `users/{uid}` + `users/{uid}/cards/*`.
- `src/lib/` — srs, exercises (lesson generator), answer (speech scoring), pinyin (+ lazy `pinyinEngine`), streak, xp, quests, achievements.
- `src/env.ts` — `IS_ARTIFACT` switches for the artifact build.

## Conventions
- Item pinyin: tone marks, one syllable per character, space-separated (validator enforces).
- Example sentences: words separated by spaces — they become sentence-builder tiles.
- pinyin-pro is only loaded lazily in the app; static text uses the generated table. Add polyphone fixes in `PHRASE_FIXES` (src/lib/pinyinEngine.ts).
- Dark mode works by remapping Tailwind colour variables in `src/index.css`; use `bg-surface` (not `bg-white`).
- UI kit: `src/components/ui.tsx` (Button, Tile, KopiCup, TrainTrack, Medal, Stamp, Avatar, BackButton…), icons via `<Icon name=…>` from `components/icons.tsx` (24×24, 1.8 stroke — keep new icons in that style), mascot `<Otter>` / `<OtterSvg>`. No emoji in the UI.
- Exercise answer choices: Chinese → `Tile` (mahjong), English → `OptionRow` (`exercises/parts.tsx`).
- No `alert`/`confirm` — use toasts or inline confirmation (the artifact host blocks dialogs).
