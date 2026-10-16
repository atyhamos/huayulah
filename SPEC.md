# Huayulah — Product Spec

## Context
You're a Singaporean Chinese native English speaker. You can speak basic Mandarin, but your reading is weak (and your speaking is weaker than your peers'). You want something like Duolingo, made for you and shareable with friends. It should teach the Mandarin actually used in Singapore (德士, 巴刹, 组屋, 咖啡乌…), have flashcards/SRS, keep progress, and use Google login. There's no monetisation.

Decisions made: **PWA web app** (installs to the Android home screen, friends join via a link), **Firebase** (Google Auth + Firestore + Hosting, free tier), **level: speaks basics but can't read**. That makes **character recognition** the top priority, followed by speaking more fluently with local vocabulary. Code goes to a **new GitHub repo**. This spec is committed as `SPEC.md`.

## 1. Learning design
- **Script:** Simplified, since that's what Singapore uses. Pinyin uses tone marks.
- **Pinyin fade (key feature):** above each character, pinyin shows `always | auto | never`. In *auto*, pinyin hides once the word's SRS stability is ≥ 7 days, and you can tap to reveal it. This moves you from "I know the sound" to "I can read it".
- **SG flavour:** each item has an `sg` flag. Where one exists, it also has the standard mainland term (德士 ↔ 出租车) plus an origin note (Malay/Hokkien/English) and a link to the Singaporean Mandarin Database (SMD) entry.
- **Content units** (~30–40 items each, ~350 total; words, phrases and short sentences). The units follow the SMD categories and everyday life:
  1. Reading bootcamp: high-frequency characters you already *say* (我你他 是 不 要 有 去…)
  2. Numbers, money & time (块/毛/角, 点, 几号)
  3. Hawker centre & kopitiam (咖啡乌, 咖啡C, 打包, 小贩中心, 鸡饭, 粿条)
  4. Getting around (地铁, 德士, 巴士, EZ-Link, 电召车)
  5. Home & HDB (组屋, 楼下, 走廊, 巴刹, 湿巴刹)
  6. Family & people (安娣, 安哥, 阿嬷, 乐龄)
  7. Work & adulting (公积金, 拥车证, 准证)
  8. School & NS (国民服役, 补习, 华文)
  9. Festivals & culture (红包, 捞鱼生, 中元节, 歌台)
  10. Talk like a local: particles and colloquial phrases (啦/咯/酱, 怕输, 一般上)
- **Content sourcing:** I write it by hand into JSON, using SMD categories and terms, the SCCC Culturepaedia, and HSK 1–3 frequency for unit 1. A validator checks pinyin with `pinyin-pro`, and anything I'm unsure of is flagged `verify: true` in the content. *Note: languagecouncils.sg is blocked by this cloud environment's network policy. To cross-check against it directly, add that domain under Network access → Allowed domains in the environment settings. Otherwise I'll rely on other reachable sources.*

## 2. Features
**Learn path (redesigned as an MRT line map):** Each unit is a line with its own code and colour; lessons are stations and the unit story is an interchange. Each lesson brings 5–7 new items through about 12 exercises. Lessons unlock in order.

**Exercise types**
1. New-word card: large character, pinyin, English, audio, example sentence, SG note
2. 汉字 → English (multiple choice), for reading
3. English → 汉字 (multiple choice), for reading
4. Listen → pick the 汉字, for listening
5. Pick the correct pinyin/tones for a character
6. Sentence builder: arrange word tiles to match an English sentence (tokens come from the content, plus distractors)
7. Match pairs: 5 汉字 ↔ English
8. Speak it: say the phrase; the Web Speech API transcript is fuzzy-matched on characters and toneless pinyin, and ≥ 0.8 passes. If the browser doesn't support it, you grade yourself.
9. Which would a Singaporean say? — SG term vs. the mainland term (e.g. 德士 vs 出租车), with the origin note as feedback.

**Stories (added during build):** one dialogue per unit (8–9 lines, 3 comprehension questions), unlocked after 3 lessons in the unit. Lines play with per-speaker voice pitch; pinyin and English can be toggled.

**Weak-word practice (added during build):** a practice lesson from the 6 learned words with the lowest recall probability.
- Feedback sheet (green/red) with the correct answer and audio. Wrong answers come back again at the end of the lesson.

**SRS / flashcards:** `ts-fsrs` (FSRS algorithm).
- Each learned item gets two cards: **read** (汉字 → meaning/sound) and **say** (English → recall it aloud, then reveal).
- Exercise results feed FSRS: correct counts as Good, wrong as Again.
- The Review tab holds due cards in sessions of 20, rated Again/Hard/Good/Easy, with daily limits for new and review cards.

**Word bank:** search and filter by unit or SG-only, with a strength meter per word. Word detail shows a stroke-order animation (`hanzi-writer`), audio, an example, SG vs standard usage, and the SMD link.

**Gamification**
- XP per exercise, with perfect-lesson and combo bonuses, and a daily goal (20/50/100 XP) shown as a ring
- Streaks with freezes: earn one per 7-day streak, hold at most 2. Days run on the device's local date.
- Levels from total XP; achievements such as "Kopi Master", "100 words" and "30-day streak"
- Confetti and sound effects, with a toggle
- No hearts, since that's frustrating for personal use
- **Friends:** a friend code or invite link, plus a weekly XP leaderboard
- **Stats page:** streak calendar heatmap, XP over time, words learned per unit

**Audio:** browser TTS (`speechSynthesis`), preferring zh-SG/zh-CN Google voices, with normal and slow speeds. It's free and works offline on Android. Pre-generated MP3s are a possible future upgrade.

**Accounts & state:**
- Google sign-in (popup on desktop, redirect on mobile).
- **Guest mode** works without login (stored in IndexedDB). Signing in merges guest progress into the account.
- Firestore offline persistence keeps the app usable offline and syncs across devices.

**Settings:** daily goal, pinyin mode, TTS voice and speed, new cards per day, sound, export/reset data, sign out.

**Visual identity (redesign):** Ah Tat 阿獭 the otter mascot (a red, emotive young otter: video clips for idle, wave, cheer, happy, sad, think and sleep, plus still expressions; tap him to hop and hear a line); custom icon set; mahjong-tile answers; kopi-cup daily goal (Kopi po → Kopi di lo); lantern streak; ang bao quest bonus; hanzi medals for achievements; a floating dock instead of a tab bar; fonts Bricolage Grotesque, Figtree and Ma Shan Zheng (brush).

**Milestone 2 (Oct 2026):**
- *Building blocks* — part breakdowns on word pages, part families (Words → Characters), `parts` and `write` lesson exercises.
- *Reader + My words* — offline paste-and-read with longest-match segmentation; photo/text reading via Claude (bring-your-own key); saved words get flashcards after a My words session.
- *Speaking* — shadowing story lines with per-character feedback; role-play chats per line via Claude.
- *Habit* — Express train placement test per line (85% clears it); daily reminder as a calendar event (no push server, free tier).

## 3. Tech stack
Vite + React + TypeScript, Tailwind CSS, React Router, Zustand, `vite-plugin-pwa`, Firebase JS SDK (Auth, Firestore), `ts-fsrs`, `pinyin-pro`, `hanzi-writer`, `canvas-confetti`, `zod` (content schema), Vitest, and Playwright (using the preinstalled Chromium).

## 4. Data model (Firestore)
As built — small per-user maps live on the user document (one read), cards are a subcollection:
```
users/{uid}                          settings, stats{xp, streak, longestStreak, lastActiveDate, freezes, weekId, weeklyXp},
                                     lessons{id: {completedAt, timesCompleted, bestAccuracy}},
                                     days{YYYY-MM-DD: {xp, lessons, reviews, newCards, frozen?}},
                                     achievements{id: unlockedAt}, friends[uid], friendCode
users/{uid}/cards/{itemId}__{read|say}   FSRS card (due, stability, difficulty, reps, lapses, state, last_review…)
publicProfiles/{uid}                 displayName, photoURL, friendCode, weeklyXp, weekId, streak, xp
publicProfiles/{uid}/followers/{fid} who added {uid} (makes friendships two-way)
friendCodes/{CODE}                   { uid }
```
Guest mode stores the same `AppState` object in IndexedDB.
Security rules: users read and write only their own `users/{uid}/**`. Any signed-in user can read `publicProfiles`, but only the owner can write their own.

## 5. Project layout
```
SPEC.md, README.md (setup + Firebase steps)
content/units/*.json            hand-written items, lessons, sentences
scripts/validate-content.ts     zod schema, unique ids, pinyin check against pinyin-pro
src/lib/  srs.ts (ts-fsrs wrapper), exercises.ts (generate lesson + distractors),
          answer.ts (fuzzy/pinyin match), tts.ts, speech.ts, streak.ts, xp.ts, achievements.ts
src/data/ repo.ts (one interface: LocalRepo for IndexedDB, FirestoreRepo), firebase.ts, merge.ts
src/store/ Zustand stores (user, progress, session)
src/screens/ Login, Learn(path), Lesson, LessonComplete, Review, WordBank, WordDetail, Profile/Stats, Friends, Settings
src/components/exercises/*      one component per exercise type
firestore.rules, firebase.json, .github/workflows/deploy.yml (Firebase Hosting action)
```

## 6. Build order

Status: all six steps are built and tested (unit, emulator and end-to-end tests). Later additions: units 11–14 built from the Singaporean Mandarin Database term list (504 items in total, 175 of them checked against SMD entries), stories, listening and "which would a Singaporean say?" exercises, weak-word practice, daily quests, writing practice, dark mode.

1. **Scaffold:** content schema and validator, units 1–3, lesson player with exercise types 1–7, TTS, guest persistence, learn path. You can use it locally from here.
2. **SRS:** Review tab, word bank, word detail with stroke order, pinyin fade.
3. **Firebase:** auth, FirestoreRepo with offline cache, guest → account merge, security rules, PWA install and offline support, deploy workflow.
4. **Gamification:** streaks and freezes, achievements, stats page, speak-it exercise, confetti and sound.
5. **Friends:** friend codes and weekly leaderboard.
6. **Content:** units 4–10 (~350 items total) plus a validation pass.

## 7. Setup needed from the owner
1. **Create an empty GitHub repo** (e.g. `sg-mandarin`) and tell me `owner/name`. I'll attach it and push there.
2. **Firebase project** (free; needed before step 3). Steps 1–2 don't depend on it:
   - Create the project at console.firebase.google.com
   - Authentication: enable the **Google** provider
   - Firestore: create the database in region **asia-southeast1 (Singapore)**
   - Project settings: add a **Web app** and paste me its `firebaseConfig` (these are public identifiers and safe to share)
3. **Deploying:** either run `npx firebase deploy` once yourself, or add a `FIREBASE_SERVICE_ACCOUNT` secret to the repo so the GitHub Action deploys on every push. Afterwards, add the hosting domain under Auth → Authorized domains (it's usually added automatically).

## 8. Verification
- `npm run validate:content`: schema, unique ids and pinyin consistency all pass.
- `npm test` (Vitest): FSRS scheduling wrapper, answer matching (characters + toneless pinyin), lesson and distractor generation, streak rollover and freezes, XP and achievements, guest → account merge.
- `npm run build`, then Playwright end-to-end on `vite preview` (Chromium):
  - Guest flow: finish a lesson, check XP and streak go up, the Review tab shows due cards, and a reload keeps the state
  - Screenshots of the main screens on a phone-sized viewport
- With Firebase connected: sign in on the deployed URL, finish a lesson, and check the progress appears on a second device or browser.
