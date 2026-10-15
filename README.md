# 华语 Lah! — Singaporean Mandarin practice

A Duolingo-style PWA for Singaporeans who can *speak* a bit of Mandarin but struggle to *read* it.
It teaches the Mandarin people actually use here — 德士, 巴刹, 组屋, 咖啡乌, 霸位 — with bite-sized
lessons, spaced-repetition flashcards, speaking practice, streaks and a friends leaderboard.

- **Works without an account** (progress saved in the browser), **Google sign-in** syncs across devices.
- **Installable** on Android/iOS home screens and works offline.
- **Free to run**: Firebase Spark (free) tier — Auth + Firestore + Hosting.

See [SPEC.md](SPEC.md) for the full product spec.

## Features

| | |
|---|---|
| 🛤️ Learn path | Units → lessons → ~15 exercises each, unlock in order (every unit's first lesson is open) |
| ✍️ Exercises | New-word cards, 汉字→English, English→汉字, listen→汉字, pick-the-tones, sentence builder, match pairs, "which would a Singaporean say?", read-aloud with speech recognition |
| 💬 Stories | One Singapore-life dialogue per unit (kopitiam order, CNY relatives, MC day…) with audio and comprehension questions |
| 🃏 Flashcards | FSRS spaced repetition (`ts-fsrs`). Every word gets a **📖 read** card and a **🗣️ say** card |
| 🙈 Pinyin fade | Pinyin hides on words you know well, so you actually learn the characters (tap to peek) |
| 🇸🇬 SG flavour | Local terms flagged with mainland equivalents, origin notes and links to the [Singaporean Mandarin Database](https://www.languagecouncils.sg/mandarin/en/learning-resources/singaporean-mandarin-database) |
| 🔥 Gamification | XP, levels, daily goal ring, streaks + streak freezes, achievements, confetti |
| 👫 Friends | Friend codes / invite links and a weekly XP leaderboard |
| 📚 Word bank | Search by 汉字 / pinyin / English, strength meters, stroke-order animations (`hanzi-writer`) |
| 💪 Weak words | A practice lesson built from the words you're most likely to have forgotten |

## Quick start (local)

```bash
npm install
npm run dev          # http://localhost:5173 — guest mode, no setup needed
```

Other scripts:

```bash
npm test                  # unit tests (Vitest)
npm run validate:content  # check lesson JSON (schema, ids, pinyin)
npm run build             # production build → dist/
npm run e2e               # Playwright end-to-end tests (builds + previews first)
npm run test:rules        # Firestore security rules + sync tests on the emulator (needs Java)
npm run e2e:cloud         # sign-in → merge → second device → friends, on the Auth + Firestore emulators
```

## Turning on Google login + cloud sync (Firebase)

1. Go to <https://console.firebase.google.com> → **Add project** (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**.
3. **Build → Firestore Database → Create database** → production mode → location **asia-southeast1 (Singapore)**.
4. **Project settings (⚙️) → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values.
5. Copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` values.
6. Put your project id in `.firebaserc` (replace `your-firebase-project-id`).
7. Deploy the security rules and the site once from your computer:

   ```bash
   npx firebase-tools login
   npm run build
   npx firebase-tools deploy        # hosting + firestore rules
   ```

   Your app is now live at `https://<project-id>.web.app`. That domain is automatically allowed for Google sign-in;
   if you host elsewhere, add the domain under **Authentication → Settings → Authorized domains**.

   Tip: set `VITE_FIREBASE_AUTH_DOMAIN=<project-id>.web.app` (instead of `…firebaseapp.com`) so sign-in stays on
   the same domain as the app — this avoids redirect-login problems in browsers that block third-party storage
   (notably Safari / iOS home-screen apps).

### Auto-deploy from GitHub (optional)

The workflow in `.github/workflows/ci.yml` tests every push and deploys `main` to Firebase Hosting once you add:

- **Repository variables** (Settings → Secrets and variables → Actions → Variables): `VITE_FIREBASE_API_KEY`,
  `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- **Repository secret** `FIREBASE_SERVICE_ACCOUNT` — easiest way: run `npx firebase-tools init hosting:github`,
  which creates the service account and secret for you.

Firestore rules changes still need `npx firebase-tools deploy --only firestore:rules`.

## Adding / editing content

Lessons live in `src/content/units/uNN.json` and are registered in `src/content/index.ts`.

```jsonc
{
  "id": "kafeiwu",                    // unique, lowercase
  "hanzi": "咖啡乌",
  "pinyin": "kā fēi wū",              // tone marks, ONE syllable per character, space-separated
  "english": "kopi-O (black coffee with sugar)",
  "sg": true,                         // uniquely Singaporean usage
  "standard": { "hanzi": "黑咖啡", "pinyin": "hēi kā fēi" },
  "note": "乌 (wū, black) is the \"O\" in kopi-O…",
  "smd": "market",                    // optional Singaporean Mandarin Database slug
  "example": { "zh": "老板， 一杯 咖啡乌。", "en": "Boss, one kopi-O." },  // spaces = word tiles
  "verify": true                      // flag for a native-speaker check
}
```

Each lesson lists 3–8 item ids. Stories live in `src/content/stories.json` (lines + questions; `after` is the line
index a question follows). After editing content run `npm run gen:pinyin` (also runs automatically before
`dev`/`build`) to refresh the precomputed pinyin, then `npm run validate:content` — it fails on structural problems and warns when
pinyin differs from the `pinyin-pro` dictionary (expected for some SG readings like 巴刹 *bā shā*).

## Project layout

```
src/content/      unit JSON, zod schema, content loader
src/lib/          srs (FSRS), exercises (lesson generator), answer (speech scoring), pinyin,
                  streak, xp, achievements, tts, speech, sfx
src/data/         state types, pure actions, LocalRepo (IndexedDB), FirestoreRepo, merge, friends
src/store/        Zustand store (auth, persistence, actions)
src/components/   UI kit, Hanzi (ruby pinyin), exercises/*
src/screens/      Learn, Lesson, Review, Words, WordDetail, Profile, Settings, Friends, Onboarding
firestore.rules   security rules
tests/            Vitest unit tests      e2e/  Playwright tests
```

## Notes

- Audio uses the browser's built-in text-to-speech. On Android make sure **Google Speech Services** has a
  Chinese (Mandarin) voice installed. You can pick a voice and speed in Settings.
- Speaking exercises use the Web Speech API (Chrome / Edge / Android / Safari). Elsewhere they fall back to
  "say it, then compare with the audio".
- Stroke-order data loads from jsDelivr on first view and is cached for offline use.
