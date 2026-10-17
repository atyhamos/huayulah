# Handoff: a Singaporean Malay version of Huayulah

This is for a new Claude Code session that builds a **Singaporean Malay** sibling of **Huayulah**, the
Singaporean Mandarin app in this repo (`atyhamos/huayulah`, live at https://huayu-lah.web.app).
Read all of it before doing anything. Then confirm the open decisions with the owner (section 4)
and get the plan approved before building.

**Kick-off prompt for the owner to paste:**
> Read `docs/handoff-malay.md` in `atyhamos/huayulah` (attach that repo read-only) and follow it.
> The new app goes in `<owner>/<new-repo>`. Start with the decisions in section 4, then propose a plan.

---

## 1. Working with the owner

- **Plans and mockups first.** The owner approves plans before big work. For anything visual (mascot,
  icon, theme), they want mockups first so they have "full design control". Use plan mode, and use
  claude.ai artifacts for visual mockups.
- **Keep it short.** The owner is token-conscious: answer directly, without recaps.
- **Spending money.** Ask before spending anything. The owner's Higgsfield credits were free-trial
  credits: about **35.5 left, with no more coming**. Image quotes on Higgsfield are per image, not per
  batch.
- **AI features.** These run on the owner's own Claude API key, entered in the app's Settings. Never ask
  for the key. The owner tests AI features live. In e2e tests, always mock the API.
- **Release flow.** Push to `main`, CI tests and deploys, then the owner tests live. Before pushing a
  visual change, send screenshots in light and dark mode.
- **No emoji in the UI.** Use the custom icon set.

## 2. What Huayulah is, and how it is built

**The product:** a gamified PWA (Duolingo-like) for Singaporean adults who can *speak* some Mandarin
but can't read it. It teaches Singapore-specific vocabulary (kopitiam, hawker, MRT, NS…).

**Stack:**
- React 19, Vite (rolldown), TypeScript, Tailwind v4 (tokens and dark-mode remap in `src/index.css`)
- Zustand; FSRS spaced repetition via `ts-fsrs`
- Optional Firebase: Google sign-in and Firestore sync. Guest mode stores everything in IndexedDB.
- `vite-plugin-pwa`
- Tests: Vitest and Playwright
- Optional Claude features on the learner's own key: `@anthropic-ai/sdk` in the browser, structured
  output, model `claude-opus-5-5`.

`CLAUDE.md` (repo root) has the commands, layout and conventions. Read it. The rest of this section
summarises it.

### Engine (language-neutral; reuse almost as-is)
- `src/data/actions.ts`: pure state transitions (lessons, review, stories, practice, quests).
  `store/app.ts` applies and persists them.
- `src/data/{localRepo,firestoreRepo,merge,friends,profile}.ts`: persistence, sync merge,
  friends/leaderboard. Firestore: `users/{uid}` and `users/{uid}/cards/*`.
- `src/lib/`:
  - `srs.ts` (FSRS), `xp.ts`, `streak.ts`, `quests.ts` ("Today's orders"), `achievements.ts`, `dates.ts`
  - `sfx.ts`, `reminder.ts` (.ics daily reminders)
  - `random.ts`, `exercises.ts` (lesson generator)
- **Screens:**
  - Learn (an MRT line map: units are lines, lessons are stops), Lesson, LessonComplete (stamp card)
  - Review (flashcards), Words, WordDetail
  - Story (dialogues with questions), Shadow (speaking practice)
  - Friends, Profile, Settings, Onboarding
- **Virtual lessons:** `weak` (weak words), `mine` (My words), `express-uNN` (a placement test that skips
  a line).
- **AI screens:** Reader (`src/lib/reader.ts`; photo or text, then tap words to save them) and Talk
  (role-play per unit, `src/content/roleplay.ts`). Both are lazy routes and are hidden when
  `!aiSupported`.
- **Artifact demo:** `npm run build:artifact` builds a guest-only build for a claude.ai artifact.

### Mandarin-specific (replace or drop)
- **Characters and pinyin:**
  - Pinyin, tones, the "pinyin fade" setting, ruby text (`Hanzi.tsx`)
  - `pinyin-pro`, `scripts/gen-pinyin.ts`, `pinyin*.ts`
  - Character data: `chars.ts`, `components.json`, `gen-chars.ts`
  - Stroke order: `hanzi-writer`, `StrokeChar.tsx`, `copy-strokes`
  - Character-parts exercise and views: `PartsQuiz`, `CharParts`, `CharactersView`
- **Exercises:** `exercises.ts` kinds are
  `intro zh2en en2zh listen tone build match speak sgpick hear parts write`.
  Drop `tone`, `parts` and `write`; rename `zh2en`/`en2zh`; adapt `sgpick` (section 3).
- **Language codes:**
  - Text-to-speech: `src/lib/tts.ts` (zh-CN voices, a "no Mandarin voice" banner, voice help in
    Settings).
  - Speech recognition: `src/lib/speech.ts` (zh-CN). Answer scoring in `src/lib/answer.ts` compares
    character by character; Malay needs word by word.
- **Theme pieces:**
  - Mahjong-tile answer buttons (`Tile`)
  - Ma Shan Zheng brush font
  - Hanzi achievement medals
  - Lantern streak and ang bao quest bonus
- **Content schema:** `src/content/schema.ts`. An item has `hanzi`, `pinyin`, `english`, `type`, `sg`,
  `standard`, `note`, `example {zh,en}` and `verify`. Example sentences have spaces between words; these
  become sentence-builder tiles. Units are `src/content/units/uNN.json` (14 units). Stories are
  `stories.json`. `scripts/validate-content.ts` checks it all.

### Mascot pipeline (reusable for a new mascot)
Ah Tat is a red cartoon otter, animated with AI video clips. See `art/otter/` and the Ah Tat bullet in
`CLAUDE.md`.

**How it works:**
- Generate a master pose on a flat chroma-green backdrop, at about 74% scale, bottom-aligned.
  Each clip uses that pose as both its first and last frame, so clips chain without a jump.
- `art/otter/tools/key.py` cuts the green out. Each clip becomes a "stacked alpha" WebM and MP4: colour
  on top, matte below.
- `src/lib/otterPlayer.ts` draws it on a WebGL canvas, cross-fading between clips.
- Stills cover small sizes, reduced motion and devices without WebGL.
- `art/otter/tools/cut_sheet.py` cuts expression stills out of a 3×3 sheet drawn on a cream page.
- `art/otter/tools/build_assets.py` rebuilds `public/otter/`.

**Higgsfield lessons:**
- Seedance 2.0 Mini costs 4 credits per 4 s clip; Seedance 2.0 "fast" costs 10.
- Seedance sometimes ignores "static camera" and cuts to a close-up, so check every clip.
- Uploads need the header `If-None-Match: *`.
- The cloud environment's network allowlist needs `upload.higgsfield.ai`,
  `d2ol7oe51mr4n9.cloudfront.net` and `d8j0ntlcm91z4.cloudfront.net`.
- The free "unlimited Wan" offer isn't available on trial accounts.

## 3. Recommended approach for the Malay app

**Make a separate app, not a language switch inside Huayulah.**
- Script, phonology, exercises and theme all differ.
- A fork keeps both apps simple.
- It needs its own repo, Firebase project and name.

To set it up:
1. Copy this repo's code into the new repo with fresh history.
2. Leave out `art/otter/raw` (15 MB) unless the mascot is reused.
3. Strip the Mandarin-specific modules listed above.
4. Keep the engine.

**Adapt:**
- **Schema.** Replace `hanzi`/`pinyin` with the Malay text.
  - Add an optional `root` (kata dasar) and `affixes` for derived words.
  - Add `colloquial` vs `standard` forms where Singapore usage differs.
  - Add an optional `jawi`, for display only, if wanted.
  - Keep `sg`, `note`, `example {ms,en}` and `verify`.
  - Rewrite the validator for the new schema.
- **Exercises:**
  - `ms2en` / `en2ms` (multiple choice), `listen`, `hear`, `match` and `build` all work as-is with
    Latin text.
  - New: **affix builder** (root + affix → word; e.g. *ajar → belajar, mengajar, pelajaran*).
  - New: **type it** (spelling, accent-free).
  - Adapt `sgpick` to "how Singaporeans actually say it": colloquial vs standard.
- **Speech:**
  - Use `ms-MY` (or `ms-SG` if available) for text-to-speech and speech recognition.
  - Score answers word by word, tolerant of colloquial contractions (*tak/tidak*, *dah/sudah*).
  - Keep the "no voice in this browser" banner and help. Malay voices exist on Android, iOS/macOS and
    Windows/Edge, but may be missing in Firefox on Windows. Huayulah hit exactly that.
- **AI features.** Reader (no word segmentation needed, since Malay has spaces) and Talk role-play:
  rewrite the prompts for Singaporean Malay.
- **Singapore theme with Malay touches** (all to be mocked up for the owner first):
  - Keep the MRT map and the kopi daily goal.
  - Lantern streak → **pelita** (Hari Raya oil lamps).
  - Ang bao bonus → **duit raya** (green packet).
  - Hanzi medals → songket/batik-motif medals.
  - Mahjong tiles → tiles with a batik or kuih motif.
  - Brush font → something suitable.

**Content ideas (Singapore-specific, mirroring Huayulah's units):**
1. **Malay you already speak:** Malay words in Singlish (*makan, kampung, jalan-jalan, habis, kacau,
   tahan, kena, boleh, lepak, agak-agak*). The hook, like Huayulah's "Reading Bootcamp".
2. **Greetings and address:** *apa khabar, terima kasih, sama-sama*. Kinship terms used with everyone:
   *abang, kakak, adik, pak cik, mak cik*.
3. **Hawker and kedai kopi:** *teh tarik, kopi O, roti prata, nasi lemak, mee rebus*; *makan sini /
   bungkus*; *kurang manis*; *berapa?*
4. **Numbers, money and time:** *hari Isnin…*; whether *ringgit* means "dollar" in SG speech (verify).
5. **Getting around:** *MRT, bas, kiri, kanan, berhenti, stesen*.
6. **Home and family:** *rumah, keluarga*; HDB life.
7. **National:** the words of *Majulah Singapura*; **NS drill commands** (*Sedia! Senang diri! Ke kanan
   pusing!*).
8. **Hari Raya:** *Selamat Hari Raya, maaf zahir dan batin, ketupat, rendang, balik kampung*.
9. **Signs:** *Awas, Dilarang, Masuk, Keluar, Tandas*.
10. **Grammar:**
    - Question words; negation (*tidak, bukan, belum*)
    - Pronoun register (*saya/aku, awak/kau*; code-mixed *I/you*)
    - Reduplication; the main affixes (*ber-, me-, di-, ter-, -kan, -i, ke-…-an, pe-…-an*)

**Content quality:** Claude-drafted Malay must be checked by a fluent Singaporean speaker. Mark
uncertain items with `verify: true`; the schema already supports it. Don't present guesses about
Singapore usage as fact.

## 4. Decisions to confirm with the owner first

1. **Name.** The pattern "-lah" is a natural choice (e.g. *Melayulah*, *Cakaplah*), but it's the owner's
   call. Check Firebase project-ID and `.web.app` availability.
2. **Target learner.** Non-Malay Singaporeans with Singlish/school/NS Malay, like Huayulah's audience?
   Or heritage speakers improving their standard Malay? This changes the content and its tone.
3. **Pronunciation and spelling norm.** Which norm does Singapore teach today: *Sebutan Baku* or
   Johor-Riau? Check the current MOE practice before recording any audio guidance.
4. **Mascot.** Reuse Ah Tat (otters are shared Singapore wildlife) or a new character? If new: species,
   colour and name, mocked up first. Credit budget: about 35.5 left. Stills only (an expression sheet the
   owner provides) cost nothing.
5. **Jawi.** Not at all, display only, or a later unit?
6. **Sharing with Huayulah.** Fully separate accounts and leaderboards (simplest), or a shared login
   later?
7. **Content source.** A word list the owner provides, or Claude drafts it with review (see above)?

## 5. Setup checklist (owner and Claude)

1. **Repos.** The owner creates an empty GitHub repo for the Malay app. Attach it for push, and attach
   `atyhamos/huayulah` read-only.
2. **Firebase.**
   - Create a new project; enable the Google sign-in provider.
   - Create Firestore in `asia-southeast1`.
   - Add a Web app. Its config (public identifiers) goes in `.env.production`. The keys are listed in
     `.env.example`.
3. **CI and deploy.**
   - Copy `.github/workflows/ci.yml` and change `--project huayu-lah` and the hosting site.
   - Add the repo secret `FIREBASE_SERVICE_ACCOUNT`: a JSON key from a service account in the **new**
     project, with the roles *Firebase Hosting Admin* and *API Keys Viewer*.
   - Deploy Firestore rules once by hand.
4. **Cloud environment.** Playwright's Chromium is at `/opt/pw-browsers/chromium`; set
   `PW_CHROMIUM_PATH`. To check the live site from the container, the network allowlist needs the new
   `*.web.app` domain. To use Higgsfield, it needs the hosts listed in section 2.

## 6. Suggested milestones

- **M0, plan:** the decisions from section 4, the schema and exercise list, theme mockups (artifact) and
  3 sample units of content for review. Wait for approval.
- **M1, working app:**
  - Fork and strip; new schema and validator; adapted exercises; ms text-to-speech and speech
    recognition.
  - About 3–4 units; renamed theme pieces; guest mode plus Firebase; tests green; deployed.
  - Artifact demo published.
- **M2, depth:** more units (around 12), stories, role-play scenarios, the affix builder, the Express
  placement test and the mascot.

## 7. Gotchas learned on Huayulah

- **`scrollIntoView` promise.** Newer Chrome returns a Promise from `scrollIntoView`. Never return it from
  a `useEffect` arrow: use a block body, or React treats the Promise as a cleanup function.
- **e2e server reuse.** Playwright's `reuseExistingServer` reuses *any* server already on port 4173. Stop
  your own `vite preview` first, or e2e runs against a production build that has sign-in turned on.
- **`pkill` in Bash.** Don't put `pkill -f "vite preview"` in the same Bash call as a command containing
  that text: it kills its own shell (exit 144).
- **CI logs.** Logs and artifact downloads from blob storage may be blocked. Use the Playwright `github`
  reporter in CI and read failures with
  `gh api repos/<o>/<r>/check-runs/<job>/annotations`.
- **e2e and IndexedDB.** A full reload can race an IndexedDB save; navigate inside the app instead.
- **Artifact host.** It rejects a literal U+FFFD (`build-artifact.ts` escapes it). Publish files from the
  session scratchpad, and pass `null` for old hashed assets to remove them.
- **Speech bubbles.** Bubbles over cards must be portalled with `position: fixed`, or a card's
  `overflow-hidden` clips them.
- **Mascot hop.** Animate the hop with the Web Animations API on the existing element. Remounting the
  element orphans the canvas the WebGL player draws to.
- **TTS voices.** Always handle the case where there is no voice for the language. Test on a phone and a
  desktop browser.

## 8. Definition of done (each milestone)

- `npx tsc --noEmit -p .`, `npm test`, `npm run validate:content` and
  `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e` all pass.
- Screenshots in light and dark mode are sent to the owner.
- The push to `main` deploys, and the CI run is green.
- The artifact demo is republished.
- `CLAUDE.md` in the new repo is updated with its own commands, layout and conventions.
