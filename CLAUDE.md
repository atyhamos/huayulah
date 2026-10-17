# Huayulah — notes for working on this repo

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
- `src/content/chars.ts` + `chars.generated.json` (from `scripts/gen-chars.ts`, Make Me a Hanzi) + `components.json` (hand-named parts; a mnemonic marks a meaning-bearing part) — building blocks and part families.
- `src/content/custom.ts` — My words: learner-added items live in `AppState.customItems` and are mirrored into `content.items` (unit id `mine`) by a store subscription, so cards/word pages/lessons treat them like course words.
- `src/content/roleplay.ts` — one role-play scenario per unit.
- `src/lib/ai.ts` — optional Claude features on the learner's own key (localStorage only, never synced). `askJson()` = structured output, `claude-opus-5-5`, effort low, `fallbacks: "default"`; check `stop_reason` before parsing. `src/lib/reader.ts` builds on it (photo/text reading + offline segmentation).
- Virtual lessons in `Lesson.tsx`: `weak`, `mine` (My words), `express-uNN` (placement test).

## Conventions
- Item pinyin: tone marks, one syllable per character, space-separated (validator enforces).
- Example sentences: words separated by spaces — they become sentence-builder tiles.
- pinyin-pro is only loaded lazily in the app; static text uses the generated table. Add polyphone fixes in `PHRASE_FIXES` (src/lib/pinyinEngine.ts).
- Dark mode works by remapping Tailwind colour variables in `src/index.css`; use `bg-surface` (not `bg-white`).
- UI kit: `src/components/ui.tsx` (Button, Tile, KopiCup, TrainTrack, Medal, Stamp, Avatar, BackButton…), icons via `<Icon name=…>` from `components/icons.tsx` (24×24, 1.8 stroke — keep new icons in that style), mascot `<Otter>` (tappable, speech bubble) / `<OtterArt>` (just the art). No emoji in the UI.
- Ah Tat is video, not SVG: AI-generated clips (Higgsfield) cut from a green screen into "stacked alpha" videos (colour on top, matte below) that `lib/otterPlayer.ts` recombines on a WebGL canvas, with webp stills for small sizes, reduced motion and no WebGL. Sources and scripts live in `art/otter/` (`tools/build_assets.py` rebuilds `public/otter/`); every clip starts and ends on the master pose so they chain. Moods without a clip are breathing stills from `art/otter/sheet/expressions.png`. New clips cost real credits — ask first.
- Line scenes: one illustration per MRT line (`public/scenes/uNN.webp`, built from the designer's PNGs by `art/scenes/build.py`; originals kept outside git). `src/content/scenes.ts` lists tappable hotspots (percent boxes → a course word: bubble + audio + link to the word page) and ambient steam/glow/shimmer. `LineScene` greys a line until it's boarded (`isLineReached`), then colours it in once; `MarginScene` fills the right gutter on wide screens. No tap animations — the owner preferred just the word.
- Peranakan tiles: designer SVGs in `art/patterns/`, built by `art/patterns/build.py` into `src/assets/patterns/` (transparent, dark and solid variants). `index.css` exposes them as `--pattern-*` (page background, `.peranakan-floral`, `.peranakan-scallop`, `.peranakan-band` on coloured cards).
- Exercise answer choices: Chinese → `Tile` (mahjong), English → `OptionRow` (`exercises/parts.tsx`).
- No `alert`/`confirm` — use toasts or inline confirmation (the artifact host blocks dialogs).
- e2e never calls the real Claude API: mock `https://api.anthropic.com/**` with `page.route` (answer the CORS preflight too). Fake speech recognition with an init script (see `e2e/speaking.spec.ts`).
- AI screens (Reader, Talk) are lazy routes so zod + the SDK stay out of the main bundle; hide AI features when `!aiSupported` (artifact build).
