# ChattaTutor Mobile — Build Roadmap

> Goal: rebuild the ChattaTutor web app as a native mobile app. Keep the brand
> and the feature catalog, but adapt every surface to mobile-native patterns —
> we are not shrinking the website.

---

## North-star principles

1. **Mobile-native, not mobile web.** Bottom sheets over modals. Tabs over
   sidebars. Stacks over routes. Swipe and long-press are first-class.
2. **Single column, thumb-first.** Primary CTA lives in the bottom third of
   the screen. Nothing important behind a hover or a hamburger.
3. **One screen, one job.** The web dashboard does ten things on one page; on
   mobile each of those becomes its own surface (Home, Lessons, Daily Drill,
   League, Profile). Resist re-creating the kitchen-sink dashboard.
4. **Performance is UX.** FlatList everything. Cache images. Skeletons, not
   spinners. The first time the user opens a course it must feel instant.
5. **Match the brand, not the layout.** Indigo (#4f46e5), violet, cyan, coral.
   Soft glow blobs, rounded-2xl cards, tracking-tight headlines. Frontend's
   visual DNA is the source of truth; the layout is ours to redesign.

## Web → mobile pattern map

| Web pattern                            | Mobile equivalent                               |
|---------------------------------------|-------------------------------------------------|
| Modal dialog                          | Bottom sheet (`@gorhom/bottom-sheet`)           |
| Multi-column dashboard                | Single-column stack of cards on Home tab        |
| Sidebar / floating navbar             | Bottom tab bar (already in place)               |
| Hover affordance                      | Press feedback + haptic                         |
| Drag-and-drop upload                  | Tap → `expo-document-picker`                    |
| Rich text editor (TipTap)             | Read-only `prose-rich` renderer for now         |
| `<Link>` in a sentence                | `<Pressable>` wrapping a `<Text>` segment       |
| Toast (`sonner`)                      | Custom toast queue + haptic                     |
| URL deep link to `/verify-email`      | `chattatutor://verify-email` + Universal Link   |
| Stripe Checkout web                   | Mobile sheet; iOS may require IAP (see "open")  |

---

## Phases

Phasing is by **user value** first, technical dependency second. Each phase
ends in something a real user can do end-to-end.

### Phase 0 — Foundation hardening ✅ DONE

What's done:
- [x] Brand assets (icon/splash/logo) and animated splash
- [x] Landing screen with hero + CTAs
- [x] Auth: email login, signup, forgot, reset, verify
- [x] Google sign-in (web client ID for Expo Go; native IDs for EAS later)
- [x] Tab scaffold (Home / Lessons / Community / Hives / Profile)
- [x] Token storage with SecureStore (native) + AsyncStorage (web fallback)
- [x] Basic dashboard with streak / rank / token cards
- [x] **Toast system** — `useToast()` with success/error/info, haptic on error
- [x] **Root error boundary** with `__DEV__` stack reveal + reset
- [x] **Skeleton primitives** — `Skeleton.Line`, `Skeleton.Circle`, `Skeleton.Card`
- [x] **Pull-to-refresh** on Home / Lessons / Profile (Community + Hives are empty states for now)
- [x] **401 handler** — `apiFetch` wrapper signs the user out + shows a toast
- [x] **Empty states** — gradient icon, primary + secondary CTAs
- [x] **Deep link routes** — verify-email & reset-password reachable from `chattatutor://verify-email?token=…` regardless of auth state
- [x] **EAS profiles** — development / preview / production in `eas.json`
- [x] **`.env` audit** — all public keys prefixed `EXPO_PUBLIC_` and documented

### How to test the Phase 0 plumbing

```bash
# clean dev server
npx expo start -c

# deep link from another terminal
npx uri-scheme open "chattatutor:///verify-email?token=test" --android
npx uri-scheme open "chattatutor:///reset-password?token=test" --ios
```

To force a 401 and watch the auto-logout + toast: hit any authed screen with
an expired token in SecureStore, or revoke the user server-side and pull-to-refresh.

### Phase 1 — Core loop: PDF → Lessons ✅ DONE

The killer feature. A user can now upload a PDF, watch it become a course,
and read every lesson on their phone.

- [x] **Home tab — "Continue learning"**
  - [x] Dark hero card with progress bar for the most recent course
  - [x] Big primary "Upload PDF" + secondary "Start from a topic" CTAs
  - [x] Horizontal scroll strip of other active courses
  - [x] Streak + rank compact cards
  - [x] First-time empty-state nudge
- [x] **Lessons tab — "My library"**
  - [x] All active courses sorted by upload date
  - [x] Progress bar per course
  - [x] Tap → course detail
  - [x] `+` button → upload
  - [ ] Sort / search / long-press archive (deferred to Phase 1.5 if needed)
- [x] **PDF upload screen** (`app/upload.tsx`)
  - [x] `expo-document-picker` → presigned S3 PUT → backend complete
  - [x] Real-time upload % progress bar
  - [x] 50MB cap with user-visible error
  - [x] Animated step indicator (Uploading → Generating → Ready)
  - [x] Polls `getStudyPlan` every 5s until lessons appear, 5min ceiling
  - [x] Failure recovery (cancel + restart, error surface)
- [x] **Topic-based course** (`app/topic-course.tsx`)
  - [x] Multi-line topic input with character min
  - [x] Quick-pick suggestion chips
  - [x] Submits to `/generate-topic-course`, routes straight to course
- [x] **Course detail** (`app/course/[pdfId].tsx`)
  - [x] Gradient cover header with progress bar
  - [x] Lesson rows with current/locked/unlocked states
  - [x] Boss-quiz teaser card
- [x] **Lesson detail** (`app/lesson/[pdfId]/[lessonIndex].tsx`)
  - [x] Rich HTML renderer matching frontend `prose-rich` styling (via `react-native-render-html`)
  - [x] Story hook callout
  - [x] Per-section structure: thesis, lecture, retrieval check
  - [x] Topic chips
  - [x] Bottom-pinned CTAs scaffolded (Flashcards live in Phase 2, Quiz pending, no manual completion button)
  - [ ] Full lesson-reader redesign, audio player, and SVG visuals (deferred to Phase 7 polish — they don't gate the core loop and may change once slider-based reading lands)

### Phase 2 — Practice & retention

Lessons without practice = forgotten lessons.

Scope note: Phase 2 should ship the practice loop first, not lock in the final
lesson-reader chrome. The current lesson screen can stay functional while we
learn how quiz/flashcard behavior wants to sit on top of it.

- [x] **Flashcards v1** — dedicated mobile deck, tap to flip, rate "Hard / Good / Easy", hard-card review pass, progress persistence
- [x] **Quiz** — MCQ flow wired from the lesson screen, progress submitted to the backend, completion stays quiz-driven at 80%+
- [x] **Quiz results** — score state, weakest missed prompts surfaced, review CTA back into lesson practice
- [x] **Boss quiz** — multi-lesson final mastery check, unlocked from the course screen after all lessons are cleared
- [x] **Weak concepts** card on Home that drills into review

### Phase 3 — Engagement loop ✅ DONE (push notifications deferred)

What gets users back tomorrow.

- [x] **Daily Drill** screen (`app/daily-drill.tsx`)
  - [x] Loads `/users/daily-drill`, renders mode banner (speed-run / accuracy-only / dark-mode / double-or-nothing)
  - [x] MCQ flow with per-question feedback, haptics on correct/wrong
  - [x] Final results: score, per-question recap, "Back home" CTA
  - [x] Marks `daily-drill` feature on completion
  - [ ] **Expo push reminder for streaks** — deferred to Phase 7 alongside the rest of the push setup
- [x] **Echo question** (`components/EchoCard.tsx`)
  - [x] Polls `/users/echo` on Home mount, hides if no echo waiting
  - [x] One-tap MCQ with haptic + correct/incorrect reveal
  - [x] Marks `lesson-echo` feature on first answer
- [x] **Streak shield** (`components/StreakShieldCard.tsx`)
  - [x] Shows count from `activity.streakShields`, copy adapts when count is zero
  - [x] Redeem flow → `POST /users/streak-shield`, optimistic count update, success toast + haptic
  - [x] Marks `streak-shield` feature on redeem
- [x] **Quest Board** (`app/quests.tsx`)
  - [x] Static list of 8 mobile-realistic quests with feature-gated completion state
  - [x] Header card showing X / Y cleared
  - [x] Auto-marks `quest-board` feature when screen opens
- [x] **Activity heatmap** (`components/ActivityHeatmap.tsx`) — wired into Profile tab
  - [x] 12-week grid, horizontal scroll, month labels, today outlined
- [x] **Did you know** rotating tip (`components/DidYouKnow.tsx`)
  - [x] Stable day-of-year rotation through tips whose feature keys are still undiscovered
  - [x] Dismissable per-session
- [x] **Feature discovery store** (`lib/feature-discovery.ts`)
  - [x] AsyncStorage cache, backend merge via `/users/discovered-features` GET/POST
  - [x] `useDiscoveredFeatures()` + `useFeatureDiscovery(key)` hooks
  - [x] `markFeatureDiscovered(key)` callable from anywhere
- [x] **Home tab** weave-in
  - [x] Daily-drill nudge card (rose accent)
  - [x] Echo card slot (auto-hides)
  - [x] Streak shield card
  - [x] Quest board link card
  - [x] Did You Know rotating tip card

### How to test the Phase 3 plumbing

```bash
# clean dev server
npx expo start -c
```

1. Tap the rose-tinted **Today's drill** card on Home → run through 5 questions.
2. Pull-to-refresh the Home tab → if an echo is waiting on the backend, the
   cyan **Lesson echo** card appears between hero and drill.
3. The **Streak shield** card always shows; copy adapts to shield count.
4. Tap the violet **Quest board** card → check off any quest that has its
   feature key marked discovered.
5. Visit Profile → 12-week activity heatmap sits below the credentials block.

Feature keys discoverable today: `daily-drill`, `lesson-echo`, `streak-shield`,
`quest-board`. Phase 4–5 will add `passport-visit`, `boss-quiz-cleared`, etc.

### Deferred from Phase 3 (intentional)

- **Push notifications** for daily-drill nudges. Needs Expo Push token
  registration + backend persistence + scheduling. Better paired with Phase 7
  push setup (Universal Links + Sentry + analytics) so we set it up once.
- **Trigger expansion** beyond daily drill. When Phase 7 lands, bundle the
  whole notification layer once: daily review, streak-risk saves, unlocked
  practice, social invites, and weekly competition summaries.

### Phase 4 — Gamification ✅ DONE (timed-quiz session deferred to Phase 4.5)

The reason the web app calls itself a game.

- [x] **League** (`app/league.tsx`)
  - [x] Premium-gated; upgrade card for free users mirrors frontend
  - [x] Tier-tinted hero (Gold/Silver/Bronze) with user rank + member-count rules
  - [x] Promotion / safe / relegation zones with trend icons and user crown
  - [x] Marks `league-visit` feature on open
- [x] **Rank progression** (`components/RankProgressCard.tsx`)
  - [x] Current title, total mastery, points-to-next progress bar
  - [x] Wired into Profile tab between credentials and heatmap
- [x] **Knowledge Passport** (`app/passport.tsx`)
  - [x] Mastered courses as tinted stamps with emoji + tier label
  - [x] Bronze→Silver→Gold→Platinum tiers via `masteryAvg` thresholds (matches frontend exactly)
  - [x] In-progress + archived sections
  - [x] Tier tally chips in the dark hero
  - [x] Marks `passport-visit` feature on open
- [x] **Rival events banner** (`components/RivalEventsBanner.tsx`)
  - [x] Renders on Home for premium users when `activity.rivalEvents` is non-empty
  - [x] Per-event tap → opens linked course; dismiss → `POST /users/rival-event/dismiss`
- [x] **1v1 challenges hub** (`app/challenges.tsx` + `lib/challenge-api.ts`)
  - [x] Invite-code panel — paste code → `POST /challenges/invite/:code/accept`
  - [x] Grouped list (Live / Pending / Completed) with status + won badges
  - [x] Heads-up card explaining the deferred bits
  - [x] Marks `challenge-visit` feature on open
- [x] **Hives tab → Compete hub** (`app/(tabs)/hives.tsx`)
  - [x] Dark rank/mastery card at top
  - [x] Three rows linking out: League (locked for free), Passport, 1v1 Challenges
  - [x] Stamp count badge on Passport row

### How to test the Phase 4 plumbing

```bash
npx expo start -c
```

1. From the bottom tab bar, tap **Hives** — see your rank/mastery hero and the three sub-routes.
2. Tap **Knowledge Passport** → see tier tally + stamps grid. Bronze/Silver/Gold/Platinum stamps render with brand tints.
3. Tap **Weekly League** — free accounts see the premium upsell; premium accounts see the tier hero + zones.
4. **Profile** tab now has a rank progression card above the activity heatmap.
5. From Home: if the backend has `rivalEvents` for a premium account, the rose banner renders between hero and Echo card. Tap to open the related course, or X to dismiss.
6. Challenges: enter an invite code from a friend to accept; pull to refresh the standings list.

### Deferred to Phase 4.5

- **Create new challenge flow** — pdfId / lessonIndex / opponent picker + `POST /challenges`
- **Live timed-quiz session** — `POST /challenges/:id/start` → polled questions, app-state (background/foreground) anti-cheat, complete/results
- **Challenge analytics screen** — post-game stats per participant
- **Auto-mark `challenge-create` and `1v1-completed` feature keys** when those flows ship

Reason: the timed quiz is a multi-screen subflow with backend session state, app-state event handling (RN's equivalent of tab-switches), and anti-cheat counters. Bundling it with Phase 4 would have doubled the phase's scope and delayed gamification wins (Passport + League + Rank) that work today.

### Phase 4.5 — Challenges create + live timed quiz ✅ DONE

- [x] **Tab restructure** — "Hives" tab renamed to **Compete** (Trophy icon); new fresh **Hives** tab placeholder (UsersRound icon) reserved for Phase 5 study groups
- [x] **Challenges folder restructure** — `app/challenges.tsx` → `app/challenges/index.tsx` with nested routes:
  - `create.tsx` — full create flow
  - `[id]/index.tsx` — combined waiting room / live / results view
  - `[id]/play.tsx` — live timed quiz
- [x] **Extended `lib/challenge-api.ts`** with `startChallengeQuiz`, `getNextQuestion`, `submitAnswer`, `completeChallenge`, `reportTabSwitch`, `getChallengeAnalytics`
- [x] **Challenge create screen** (`app/challenges/create.tsx`)
  - [x] Course picker (only courses with `totalDays > 0`)
  - [x] Lesson picker (fetches `getStudyPlan` on course select)
  - [x] Time-per-question chips: 15s / 30s / 60s (Speed / Standard / Thinker)
  - [x] `POST /challenges` then `router.replace` to detail with `code` param
  - [x] Marks `challenge-create` feature
- [x] **Challenge detail screen** (`app/challenges/[id]/index.tsx`)
  - [x] Three-state hero: pending (amber, waiting on opponent), active (rose, time to race), completed (slate/emerald with winner crown)
  - [x] Invite code panel (only when pending + `code` param present) — copy via `expo-clipboard`, native `Share.share()`
  - [x] Per-participant cards with score, accuracy, isYou highlight, winner badge
  - [x] Completed-state per-question breakdown via `getChallengeAnalytics`
  - [x] Bottom CTA switches: Start race / Cancel / Back
- [x] **Live timed-quiz screen** (`app/challenges/[id]/play.tsx`)
  - [x] Dark theme (slate-900) to signal "focus mode" — different from the rest of the app
  - [x] Countdown timer ring (Animated.Value, switches to rose at ≤5s)
  - [x] One-shot answer per question with correct/wrong reveal + haptic
  - [x] Auto-submit on timeout (`selectedIndex: -1` for "no answer")
  - [x] Live correct/answered counter pill at top
  - [x] **Anti-cheat**: `AppState.addEventListener("change", ...)` reports `tab-switch` when app backgrounds during a session
  - [x] **Hardware back blocked** during a live race
  - [x] On finish → `completeChallenge` → routes back to detail (which now shows the completed state with analytics)
  - [x] Marks `1v1-completed` feature
- [x] **Challenges list polish**
  - [x] `+` button in header → create screen
  - [x] Row tap routes to detail (no more "coming in Phase 4.5" toast)
  - [x] Empty state has a "Create a challenge" CTA
  - [x] Removed Phase 4.5 heads-up footer

### Tab restructure details

Bottom bar is now: **Home / Lessons / Compete / Hives / Profile** (Community
removed from the bar via `href: null` — file kept for future use).

| Tab | Icon | Purpose |
|---|---|---|
| Home | Home | Continue learning, drill, echo, streak |
| Lessons | BookOpen | Course library |
| Compete | Trophy | League, Passport, Challenges (formerly "Hives") |
| Hives | UsersRound | Study groups / school cohorts (Phase 5 placeholder) |
| Profile | User | Account + rank progress + activity heatmap |

### How to test Phase 4.5

```bash
npx expo start -c
```

1. Bottom bar shows **Compete** (Trophy) and **Hives** (UsersRound). The old Hives content now lives under Compete.
2. **Compete → 1v1 Challenges → +** → pick a course → pick a lesson → pick time → "Create challenge."
3. You land on the detail screen with an invite code. Tap **Share** or **Copy**.
4. From a second device/account, paste that code into the challenges list invite box.
5. Both sides hit **Start your race** → live timed quiz with countdown ring + haptics.
6. When both finish, the detail screen flips to the completed state with winner crown + per-question breakdown.

### Caveats worth knowing

- **Network polling cadence**: each question is fetched on-demand from `getNextQuestion`. No prefetching; the next-question request happens during the `FEEDBACK_HOLD_MS` (900ms) reveal. On a slow connection this can stutter — a Phase 7 polish item.
- **`AppState` "inactive"** fires briefly on iOS during system dialogs (Face ID, push prompts). It will report a tab-switch even though the user didn't deliberately leave. Backend should weight these lightly until we add a debounce.
- **Hardware back blocked** is intentional during a live race — pressing back shows a toast instead. There's no "quit race" affordance yet; the only exits are finishing or backgrounding (which the server can count against you).

### Phase 5 decisions locked

1. **Community stays folded into Hives.** The hidden `community` file can remain for future sub-routes, but the bottom bar stays stable at five tabs. Community is no longer coming back as a separate tab.
2. **Phase 5 ships from the Hives anchor.** Hives study groups + Teams land first because they plug directly into Compete, League, Challenges, and invite pressure.
3. **Community feed + Suggestions move to Phase 5.5.** They remain important, but they are lower-leverage than group identity, invite loops, and team progression.

### Phase 5 — Social & community

Friction-y to build, retention multiplier.

- [x] **Hives** (study groups / school cohorts) — real tab shell, General Hive entry point, active/archived team state
- [x] **Teams** — create, invite link, leaderboard, archive
- [x] **Pending invitations** card on Home
- [x] **Team challenge leaderboard**

### Phase 5.5 — Social feed expansion

- [x] **Community feed** inside Hives (read-first)
- [x] **Community post detail** (deep link from notification)
- [x] **Suggestions** feed + voting

### Phase 6 — Account & monetization

- [x] **Profile** — view, edit username, avatar (later)
- [x] **Settings** — notifications, voice prefs, change password, theme (later), sign out
- [x] **Token usage** detail with plan benefits
- [x] **Pricing** as a bottom sheet (port `PricingModal`)
- [ ] **Subscription** — Stripe sheet on Android/web, **see "Open decisions" for iOS**
- [x] **Flutterwave** for NGN/USD non-iOS

### Phase 7 — Polish & native

- [x] **Expo Push** registration + token persistence
  - [x] Request permission after a real value moment, not on cold launch
  - [x] Persist Expo Push token server-side per device/session
  - [x] Handle logout, opt-out, reinstall, and token rotation cleanly
  - [x] Open the correct deep link when the user taps a notification
- [x] **Push preferences v1** in Profile
  - [x] Learning reminders toggle
  - [x] Social + competition alerts toggle
  - [x] Account/billing alerts toggle
  - [x] Quiet hours + local-time delivery window
- [ ] **Push trigger pack v1**
  - [ ] **Daily review / daily drill** — morning or early-evening nudge when a drill is ready and the user has not studied yet that day
  - [ ] **Streak at risk** — one save-your-streak nudge near the user's preferred reminder window if they are about to lose an active streak
  - [ ] **Weak-concept / review queue ready** — send when the user has newly surfaced weak concepts or an overdue review pile, but only if they have been inactive for a while
  - [ ] **Next session or boss quiz unlocked** — celebrate progress when a lesson section, next session, or boss quiz becomes available after passing the required threshold
  - [ ] **1v1 challenge alerts** — invite received, opponent played, your turn, and final result
  - [ ] **Hive / team alerts** — invited to a hive, accepted into a team, team challenge result, and important team announcement
  - [ ] **League summary** — weekly reset, promotion/relegation result, or "you are close to promotion/relegation" summary, capped tightly
  - [ ] **Account alerts** — subscription renewal failure, expiring trial, or payment confirmation where applicable
- [ ] **Push guardrails**
  - [ ] Max one learning nudge per day unless the user explicitly opts into more
  - [ ] Batch social alerts where possible instead of sending one push per event
  - [ ] Never push for every quiz result, every lesson completion, every vote, or every community interaction
  - [ ] Suppress nudges shortly after the user was already active in-app
  - [ ] Every push must deep link to one useful destination, not just the home tab
- [ ] **Universal / App Links** for verify-email + reset-password — app config is wired; hosted domain files + EAS rebuild remain (see Phase 7.7)
- [x] **Haptics** — `lib/haptics.ts` semantic helpers wired across taps, transitions, success/error
- [x] **Reanimated** screen transitions + key interactions — flashcard flip, quiz transitions, lesson progress bar, confetti
- [x] **Lesson reader redesign** — slide-based lecture with reveal teaching, soft-lock retrieval checks, 4-tab system
- [x] **Flashcards polish** — 3D flip animation, haptics on flip/rate, confetti on deck complete, animated card transitions
- [x] **Practice surface polish** — flashcards / quiz / lesson reader share one interaction model with haptics + animated progress
- [x] **Audio enhancements** — Tutor Brief player (Phase 7.5). SVG visual enhancements are tracked separately in Phase 8.
- [ ] **MMKV** offline cache for last-read lessons
- [ ] **expo-image** for image cache (also tracked in Phase 7.6 with a concrete checklist)
- [ ] **PostHog** parity with frontend (identify, capture)
- [ ] **Sentry** error reporting
- [ ] **App Store / Play Store** metadata + screenshots
- [ ] **EAS Submit** dry run

### Phase 7.5 — Tutor Brief voice (server-rendered TTS)

> The server pipeline (ElevenLabs + S3) already runs and stores generated audio
> per lesson. Mobile just plays the presigned audio URL with `expo-av` and
> exposes mobile-native controls. V1 scope mirrors the web's
> `LectureAudioPlayer`: one capped brief per lesson.

#### Backend endpoints (already exist, no changes)

- `GET /study-plans/:pdfId/narration` — narration map for the whole course
- `POST /study-plans/:pdfId/lessons/:lessonIndex/brief-narration/retry` — generate or refresh the brief and mint a presigned URL
- Premium gating: 403 if user lacks paid plan; 404 if voice not available for the lesson

#### UI placement

Strip directly below the lesson tab bar on the Lecture tab only:

```
┌──────────────────────────────┐
│ ← Lesson N: Title            │
├──────────────────────────────┤
│ 📖 Lecture │ 🧠 │ 💬 │ 📕   │
├──────────────────────────────┤
│ ▶  Tutor brief · 0:00/1:24 1x … │
├──────────────────────────────┤
│  ◀ Slide 1/5     ▶           │
│  [slide content]             │
```

#### Mobile checklist

- [x] Add `getNarrationMap` and `generateLessonBriefNarration` to `lib/api.ts`
- [x] Add `NarrationMapEntry`, `NarrationResult`, `VoiceUnavailableError` types
- [x] Create `lib/voice-prefs.ts` — AsyncStorage-backed `{ voiceOn, playbackRate, hasEverPlayed }`
- [x] Create `components/LectureAudioPlayer.tsx` using `expo-av` `Audio.Sound`
  - [x] Play / pause toggle with haptic on start
  - [x] Scrub bar — `@react-native-community/slider`
  - [x] Time display `0:32 / 1:24`
  - [x] Speed cycle button (`0.75x → 1x → 1.25x → 1.5x → 2x`)
  - [x] Menu (`⋯`) → voice on/off toggle
  - [x] Loading spinner, unavailable banner, error banner with retry
  - [x] Presigned URL freshness check (≥55min old → call retry endpoint before play)
- [x] Mount the player as a compact strip below the tab bar, visible only when `tab === "lecture"`
- [x] Stop playback when navigating away from the lesson screen and when toggling voice off
- [x] Premium gating: surface "Premium subscription required" on 403 (tap-through to pricing — deferred until pricing screen exists)
- [ ] Pause on incoming call / route change (`expo-av` handles audio focus on iOS; verify Android in QA)
- [ ] Telemetry: `voice_brief_play_started`, `voice_brief_completed`, `voice_brief_skipped`, `voice_brief_unavailable` (deferred — no analytics provider wired yet)

#### Out of scope (V1)

- Section-by-section narration (sections endpoint exists but web V1 doesn't expose it)
- "Explain Aloud" inline (separate feature, deferred)
- Background audio playback while phone is locked (mobile-natural: pauses on lock)
- Auto-play on slide change (manual play only, like web)

---

### Phase 7.6 — Lesson polish quick wins

> Small, mostly-already-on-backend items that lift the lesson surface without
> any heavy lift. Each is sub-1-session of work. Order is the recommended
> sequence (highest value × lowest cost first).

#### Report inaccurate buttons

> Backend endpoint `POST /quality-reports` already exists and writes a
> `QualityReport` row. Web has a flag icon next to each section / visual /
> flashcard / question with a modal form. Mirror that on mobile.

- [ ] Add `createQualityReport(courseId, sectionId, targetType, targetId, kind, anchorText?, userComment?)` to `lib/api.ts`
- [ ] Add `QualityReportTarget` type with `targetType: "section" | "visual" | "flashcard" | "question"`
- [ ] Build `components/ReportInaccurateSheet.tsx` — bottom-sheet modal with anchor text preview + comment field + submit button
- [ ] Wire a small `Flag` icon button into:
  - [ ] Slide section (top-right of the slide card)
  - [ ] Each flashcard (small flag button below the card)
  - [ ] Each quiz question (next to the question text)
- [ ] On submit: `haptics.tap()`, toast "Report saved" on success
- [ ] Surface server's `autoRegen.status === "queued"` response with a different toast ("Repair pass queued")
- [ ] Disable buttons if `courseId` not yet loaded (matches web)

#### "Explain this differently" button

> Backend endpoint `POST /study-plans/:pdfId/lessons/:idx/explain-slide` already
> exists. Returns a re-toned explanation of the current slide. Web shows it as
> a chip under the lecture HTML; mobile mirrors that.

- [ ] Add `explainSlide(pdfId, lessonIndex, slideText, slideIndex)` to `lib/api.ts` — returns `{ explanation, status? }`
- [ ] Add a `Sparkles` chip button below the lecture HTML on each slide
- [ ] On tap: show inline loader → render the response in a violet card below the chip
- [ ] Handle 403 → toast "Premium subscription required" with tap-through to pricing
- [ ] Auto-hide explanation when user advances to next slide
- [ ] Surface the "Want a different explanation?" nudge after two consecutive `skipped` retrieval checks (already wired in lesson page; this hooks the button up)

#### expo-image swap

> Drop-in for `<Image>` with built-in caching, blur placeholder, and faster
> decode on Android. ~30 min total.

- [ ] `npx expo install expo-image`
- [ ] Replace `import { Image } from "react-native"` with `import { Image } from "expo-image"` in every component that loads remote images (lessons, hives, community, profile avatars)
- [ ] Add `cachePolicy="memory-disk"` to remote images
- [ ] Add `placeholder` with a small base64 blur (where useful — avatars, lesson hero)
- [ ] Verify no `tintColor` consumers broke (expo-image doesn't accept `tintColor`; use `tintColor` prop differently)

#### Real-fixes bug sweep

> One session walking every flow as a real user, logging issues, then fixing in
> one batch. Cannot enumerate ahead of time — this is the catch-all.

- [ ] Walk: auth → upload → course detail → lesson lecture → slides → retrieval checks → flashcards → quiz → result → next-lesson nav
- [ ] Walk: home → daily drill → quests → league → passport
- [ ] Walk: hives list → create hive → hive detail → invite flow → general hive
- [ ] Walk: community → suggestions → announcement detail
- [ ] Walk: challenges list → create challenge → invite-code accept → live play → result
- [ ] Walk: profile → settings → change password → sign out
- [ ] Log every regression / dead-end / visual glitch
- [ ] Fix in one batch with separate commits per area

---

### Phase 7.7 — Universal Links (HTTPS deep linking)

> Currently we have custom scheme `chattatutor://` working for verify-email and
> reset-password (Phase 0). Universal Links replace that with HTTPS URLs that
> open the app when installed and fall back to the web page when not. Needs
> hosting two files on the web domain + an Expo config update + a full EAS
> rebuild — Universal Links do **not** work in Expo Go.

#### Why we need it

Verify-email and reset-password emails currently link to `https://chattatutor.com/...`. On a phone with the app installed, those still open in a browser instead of the native screen. Universal Links fix that. Same emails, same links, but they route to the app when possible.

#### iOS — apple-app-site-association

- [ ] Get production Team ID and bundle ID (`com.chattatutor.mobile`)
- [ ] Write `apple-app-site-association` (no extension):
  ```json
  {
    "applinks": {
      "details": [{
        "appID": "TEAM_ID.com.chattatutor.mobile",
        "paths": ["/verify-email*", "/reset-password*"]
      }]
    }
  }
  ```
- [ ] Hand off to web team: serve at `https://chattatutor.com/.well-known/apple-app-site-association` with `Content-Type: application/json`, no redirects, no auth, no gzip wrapper
- [x] Add `ios.associatedDomains: ["applinks:chattatutor.com"]` to `app.json`
- [ ] Verify file is reachable: `curl -i https://chattatutor.com/.well-known/apple-app-site-association` — must be 200 + correct content-type
- [ ] Build via EAS (`eas build --profile production --platform ios`)
- [ ] Install on a real device — Universal Links require a real device, not simulator
- [ ] Test by tapping a verify-email link from Apple Mail; expect the app to open
- [ ] **Buffer 24h** for Apple's AASA CDN cache to settle if the file changes after first install

#### Android — assetlinks.json

- [ ] Get production SHA-256 fingerprint via `eas credentials` (or `keytool -list -keystore` if local)
- [ ] Write `assetlinks.json`:
  ```json
  [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.chattatutor.mobile",
      "sha256_cert_fingerprints": ["AA:BB:CC:..."]
    }
  }]
  ```
- [ ] Hand off to web team: serve at `https://chattatutor.com/.well-known/assetlinks.json` with `Content-Type: application/json`
- [x] Add `android.intentFilters` to `app.json` with `autoVerify: true` and the verify-email + reset-password paths
- [ ] Verify file is reachable + correct format via Google's tool: <https://developers.google.com/digital-asset-links/tools/generator>
- [ ] Build via EAS (`eas build --profile production --platform android`)
- [ ] Install — Android verifies `assetlinks.json` at install time
- [ ] Test by tapping a link from Gmail; expect the app to open
- [ ] If broken: re-deploy file, then **uninstall + reinstall** the app to re-trigger verification

#### Known tripwires

- AASA / assetlinks must be served from the **exact** production domain — `app.chattatutor.com` won't claim `chattatutor.com` URLs
- Apple uses a CDN — file changes can take up to 24h to propagate
- Android verifies on install only — fixing a broken file requires reinstall
- Expo Go cannot test Universal Links; need a TestFlight / preview EAS build
- `apple-app-site-association` has no `.json` extension; web servers sometimes 404 on it

---

### Phase 8 — Visual rendering engine

> Mirror the web's visual-diagram engine on mobile so every lesson slide can
> ship a diagram that's read-interactive, walkthrough-animated, and Build
> Mode-playable. Reference: `chattatutor_frontend/components/visual-diagram.tsx`
> (1552 lines, `@xyflow/react` + `dagre`). Mobile rebuild uses
> Expo Go-safe React Native `View`s for edges and nodes after Android SVG
> marker rendering crashed on lesson entry.

**Visual types to support** (10): `flow`, `tree`, `network`, `comparison`,
`timeline`, `cycle`, `matrix`, `layers`, `equation`, `storymap`.

#### Phase 8.0 — Foundation ✅ DONE

- [x] Port `VisualSpec`, `VisualNode`, `VisualEdge`, `VisualType`, `ConceptType` to `lib/api.ts`
- [x] Port `lib/visual-eligibility.ts` (Build Mode eligibility predicate)
- [x] Port `lib/visual-anchor.ts` (anchor node picker)
- [x] Install `dagre` + `@types/dagre` (pure JS, runs in RN — used for `flow`/`tree`/`network`/`storymap`)
- [x] Confirm `react-native-svg` is installed, then avoid SVG markers in lesson diagrams after Android crash QA

#### Phase 8.1 — Read-mode rendering, simple layouts ✅ DONE

- [x] `components/VisualDiagram.tsx` skeleton with theme map (10 types × color)
- [x] Layout dispatcher that branches by `visual.type`
- [x] `layoutLayers` — vertical stack
- [x] `layoutCycle` — circular arrangement
- [x] `layoutTimeline` — horizontal line (covers `timeline` + `equation`)
- [x] `layoutGrid` — rows × cols (covers `matrix` + `comparison` with 2 cols; also temporary fallback for `flow`/`tree`/`network`/`storymap` until Phase 8.2)
- [x] Node renderers: `DefaultNode`, `LayerNode`, `CycleNode` (3 styles cover all types)
- [x] Theme tokens: per-type hex / highlight border / highlight bg / default bg / canvas bg
- [x] Edge renderer: Expo Go-safe native `View` connectors + endpoint dots + dashed/solid/thick styles + bounding-box clipping
- [x] Wire into `app/lesson/[pdfId]/[lessonIndex].tsx` slide rendering — visual sits between thesis and lecture HTML
- [ ] Verify on a real lesson with each simple layout type (manual QA next time we open a slide that has each shape)

#### Phase 8.2 — Read-mode rendering, hierarchical layouts

- [x] Dagre integration helper (`dagreLayout(nodes, edges, direction)`)
- [x] Wire `flow` → dagre LR/TB from visual orientation
- [x] Wire `tree` → dagre TB
- [x] Wire `network` → dagre + larger node spacing
- [x] Wire `storymap` → dagre LR with wider nodes
- [x] Soft dot-grid-style background for `network` and `flow`
- [x] Per-type visual flourish: cycle rings, layer bands, timeline ticks, comparison divider, tree branch guides
- [x] Per-type node polish: timeline badges, storymap accents, network accent strips, layer/chapter/phase styling
- [ ] Test on a real lesson with each hierarchical layout type

#### Phase 8.3 — Pan / zoom container

- [x] Expo Go-safe pinch-to-zoom via native touch handlers
- [ ] Release-build pinch QA before considering `react-native-gesture-handler` wrappers
- [x] Single-finger pan via nested horizontal/vertical `ScrollView`s
- [x] Clamp zoom to 0.2× – 3× so wide/tall mobile diagrams can truly fit
- [x] Button zoom controls: Zoom out / Fit / Zoom in
- [x] Double-tap to reset to fit-to-screen
- [x] Fit-to-screen on initial mount (compute bounding box of node positions against width + height)
- [x] Smooth JS zoom-to-fit reset (Reanimated intentionally avoided in this renderer)

#### Phase 8.4 — Interactions

- [x] Tap-to-highlight a single node (toggle state, theme highlight ring)
- [x] Auto-walkthrough animation: cascade highlight along `visual.interaction.highlightSequence`
- [x] Walkthrough controls: Play / Pause / Skip / Reset (mirror web layout)
- [x] Auto-step delay = 700ms
- [x] Reading-mode anchor spotlight on first anchor node
- [x] Entrance stagger animation on mount (40ms × node index, cap 480ms total)
- [x] Haptic tick on each highlight change
- [ ] Auto-start walkthrough when the diagram first enters viewport
- [ ] Reduced-motion support for spotlight, entrance, and cascade effects

#### Phase 8.5 — Build Mode

- [x] "Build Mode" toggle on the slide — only shown when `isBuildModeEligible(visual)`
- [x] Anchor selection on enter — call `pickAnchorIds(visual)`, pre-place those nodes, and badge them as Anchor clues
- [x] Empty slot scaffolds with role label (Layer N / Phase N / Slot N), ghost icon, and group hint
- [x] Shuffled card bank below the diagram (unplaced node labels + icons + groups as tappable chips)
- [x] Tap-to-test: tap a card against the highlighted slot, or select a card and tap the slot — place if `cardId === slotId`, shake if wrong
- [x] Learning clues: active-slot description, anchor relation hints, selected-card feedback, and escalating wrong-attempt hints
- [x] Snap-into-place feedback when correct (plain transform, Expo Go-safe)
- [x] Shake feedback when wrong (plain transform, Expo Go-safe)
- [x] Hint button — reveal the active slot when stuck
- [x] Completion celebration when every slot filled correctly (static confetti, Expo Go-safe)
- [x] Completion cascade highlight through solved diagram after Build Mode finishes
- [ ] Backend telemetry: `build_mode_start`, `build_mode_exit`, `build_mode_correct`, `build_mode_wrong_attempt`, `build_mode_complete`, `build_mode_hint` → POST `/api/events/build-mode`

#### Phase 8.6 — Reporting + alternative interactions

- [x] "Report inaccurate diagram" button → `createQualityReport(targetType: "visual")`
- [x] "Report inaccurate content" button → `createQualityReport(targetType: "section")`
- [x] "Explain this differently" inline button → existing `explainSlide` endpoint
- [ ] Drag-and-drop placement as alternative to tap-to-place (PanGestureHandler)
- [x] Accessibility: TalkBack/VoiceOver labels on nodes, slots, card bank, and zoom controls
- [x] Source anchors panel linked from visual section when backend anchors exist
- [ ] Full accessibility QA on Android TalkBack and iOS VoiceOver

#### Visual engine remaining polish

- [ ] Real-device QA pass across all 10 visual types with production lesson payloads
- [ ] Drag-and-drop Build Mode placement using gesture-handler after stability QA
- [ ] Build Mode backend telemetry event coverage
- [ ] Auto-start walkthrough only when a diagram scrolls into view
- [ ] Reduced-motion setting for visual effects
- [ ] Full source-anchor provenance UI when backend sends exact source spans
- [ ] Equation LaTeX renderer decision (still out of scope until math content needs it)

#### Phase 8 — Out of scope

- LaTeX rendering for `equation` (falls back to default layout for now)
- Custom SVG visual specs (only node-graph specs from the LLM are supported)
- Authoring / editing diagrams (consume only)
- Network type's true force-directed layout (dagre approximation is fine)

---

## Open decisions (product, not engineering)

1. **iOS payments.** App Store rejects native Stripe Checkout for digital goods.
   Options: (a) StoreKit IAP + server reconciliation, (b) ship premium on
   Android + web only, (c) "manage subscription on chattatutor.com" link — risky
   but the path many apps use. Pick before Phase 6.
2. **Push provider.** Expo Push works out of the box; FCM/APNs direct gives more
   control and avoids the Expo proxy. Default to Expo Push for v1.
3. **Offline strategy.** Read-only lesson cache (cheap, useful) vs full
   bidirectional sync (expensive, premium-grade). Default to read-only cache.
4. **Universal Links domain.** `chattatutor.com` (web frontend) or a mobile
   subdomain like `app.chattatutor.com`? Recommend reusing chattatutor.com so
   existing email links work — requires `apple-app-site-association` + Android
   `assetlinks.json` hosted there.
5. **Analytics.** Port PostHog from frontend or ship without first?
   Recommendation: ship Phase 1 without; add in Phase 7.

---

## Definition of done for each phase

A phase is done when:
- Every checkbox above is checked
- A real user can complete the phase's user journey on a real device build (not Expo Go)
- The screens render correctly at iPhone SE width (320pt) and Pixel 3 height
- No console errors on cold launch
- Loading and empty states exist for every async surface
- The phase's flows are linked from somewhere reachable on the tab bar

---

## What we are explicitly *not* doing

- **No web-style desktop layouts** in mobile. If a frontend page is two-column,
  we collapse to one and decide which column lives "above the fold."
- **No re-implementing the TipTap editor.** Mobile is read-only for rich
  content in v1. Posting to community can use a simple textarea.
- **No bespoke design system.** NativeWind + the existing component primitives
  (`Button`, `Input`, `GradientIcon`, `Logo`) are the kit. We extend them
  rather than fork them.
- **No Redux / Zustand yet.** React Context (already in place for auth) +
  `useState` / route params get us through Phase 4 at minimum.
- **No code-sharing with the frontend.** Tempting, expensive. The API client
  and types are duplicated deliberately; let them diverge.

---

## Next session

Phase 0 finishing kit, in this order:

1. Toast system + haptics
2. 401 handler + global fetch wrapper
3. Skeleton primitives
4. Pull-to-refresh on Home / Lessons
5. Deep link verification (verify-email + reset-password)

Then **Phase 1, screen 1: Home tab redesign** — that's where the "Upload PDF"
moment lives, and it's the single most important screen in the app.

---

## Outstanding work — do not overlook

> One place that lists everything still open across all phases, in rough
> "lowest cost first" order. Anything checked here is fully shipped. Anything
> unchecked must end up either done or explicitly cut before we submit to
> stores. Detailed checklists live under each phase above; this is the index.

### Quick wins (≤1 session each)

- [ ] **Phase 7.6 — Report inaccurate buttons** — flag icon on section / flashcard / question + bottom-sheet form. Endpoint exists.
- [ ] **Phase 7.6 — "Explain this differently" chip** — under lecture HTML on each slide. Endpoint exists.
- [ ] **Phase 7.6 — expo-image swap** — drop-in replacement for `<Image>`. ~30 min.
- [ ] **Phase 7.6 — Real-fixes bug sweep** — one walkthrough of every flow, batched fixes.

### Lesson surface — bigger lifts

- [ ] **Phase 8 — Visual rendering engine** (whole phase, 8.0 → 8.6). Native rebuild of `visual-diagram.tsx` with Expo Go-safe React Native views. Multi-session: foundation → simple layouts → dagre hierarchical → pan/zoom → walkthrough → Build Mode → polish.

### Push notifications (Phase 7)

- [x] **Expo Push registration** — request permission at a value moment, persist token server-side, handle logout / opt-out / reinstall / rotation, deep-link routing on tap
- [x] **Push preferences** in Profile — learning / social / account toggles + quiet hours
- [ ] **Push trigger pack v1** — daily drill, streak at risk, weak-concept queue, next-session unlock, 1v1 challenge alerts, hive alerts, league summary, account alerts
- [ ] **Push guardrails** — max 1 learning nudge / day, batch social alerts, suppress when user was just active, every push deep-links to one useful destination

### Deep linking (Phase 7.7)

- [ ] **iOS Universal Links** — app config done; host AASA on chattatutor.com, EAS rebuild, real-device test
- [ ] **Android App Links** — app config done; host assetlinks.json, EAS rebuild, real-device test
- [ ] **Buffer 24h** for Apple CDN propagation; reinstall to re-verify Android

### Voice (Phase 7.5)

- [ ] Verify Android audio focus / interruption handling on a real device
- [ ] Telemetry events when an analytics provider is wired

### Performance + infra

- [ ] **MMKV** swap for AsyncStorage on the hot read paths (auth token, voice prefs, lesson progress cache)
- [ ] **Sentry** error reporting — same project as web, with mobile-tagged events
- [ ] **PostHog** parity with web — identify on sign-in, capture key funnel events
- [ ] **Bundle size audit** before submit — `npx expo-bundle-analyzer`

### Monetization (Phase 6)

- [ ] **iOS subscriptions** — decision still open between StoreKit IAP, Android+web only, or "manage on chattatutor.com" link. Resolve before submit.

### Store submission (Phase 7 tail)

- [ ] **App Store** metadata, screenshots (6.5" + 5.5"), privacy nutrition label
- [ ] **Play Store** metadata, screenshots, content rating questionnaire
- [ ] **EAS Submit** dry run on both stores
- [ ] **App Privacy** disclosures matching what we actually collect
- [ ] **Test plan** — TestFlight build + Play internal track before public release

### Phase 5.5 — Mobile parity with web (posting, hive chat, decay loop)

> Surfaces that exist on web but were never built (or only half-built) on
> mobile. Audited 2026-05-24. Mobile must reach feature parity for these
> before we submit to stores.

#### Community feed posting (plain-text) ✅ DONE

> Mobile currently lists announcements and shows replies + reaction counts in
> read-only mode. Backend supports full posting via existing endpoints.

- [x] Add `createAnnouncementReply(announcementId, body)` to `lib/api.ts` — `POST /announcements/:id/replies`
- [x] Add `toggleAnnouncementReaction(announcementId, emoji)` — `POST /announcements/:id/react`
- [x] Add `toggleReplyReaction(announcementId, replyId, emoji)` — `POST /announcements/:id/replies/:replyId/react`
- [x] On `app/community/[id].tsx`, add a sticky bottom composer with `TextInput` + Send button (plain-text only, no TipTap)
- [x] On each announcement + reply, add an emoji bar (8-emoji whitelist matching backend) that toggles the reaction
- [x] Optimistic update on reaction tap, rollback on error
- [x] Toast on reply success, append new reply to the list, bump replyCount
- [x] Out of scope: rich text formatting, image attachments, @mentions

#### Suggestion posting ✅ DONE

> Mobile can list + upvote suggestions. Cannot create new ones. Backend
> endpoint exists.

- [x] Add `createSuggestion({ title, body, category })` to `lib/api.ts` — `POST /suggestions`
- [x] On `app/suggestions/index.tsx`, add a "Post a suggestion" CTA in the hero
- [x] Modal composer with title (200 char cap) + category picker + body (5000 char cap)
- [x] Optimistic insert at the top of the list on submit
- [x] Disable submit while title or body is empty

#### Hive chat (full surface — net new)

> Backend has full chat stack at `/teams/:teamId/chats`, `/chats/:chatId`,
> `/chats/:chatId/messages`. Web has it. Mobile has zero — no API wrappers,
> no screen, no entry point.

- [ ] Add API wrappers in `lib/api.ts`:
  - [ ] `getTeamChats(teamId)` — `GET /teams/:teamId/chats`
  - [ ] `createChat(teamId, ...)` — `POST /teams/:teamId/chats`
  - [ ] `getChatMessages(chatId, cursor?, limit?)` — `GET /chats/:chatId/messages`
  - [ ] `sendChatMessage(chatId, body)` — `POST /chats/:chatId/messages`
  - [ ] `archiveChat(chatId)` — `DELETE /chats/:chatId`
- [ ] Add API types: `TeamChat`, `ChatMessage`
- [ ] New screen `app/hives/[teamId]/chats.tsx` — list of chats in the hive
- [ ] New screen `app/hives/[teamId]/chats/[chatId].tsx` — message thread
- [ ] Wire entry point from hive detail screen (`app/hives/[teamId].tsx`) — "Chat" CTA
- [ ] Composer at the bottom of the chat thread with `KeyboardAvoidingView`
- [ ] Polling or refresh-on-focus for new messages (websockets are out of V1 scope)
- [ ] Add `Stack.Screen` registrations for both routes
- [ ] Out of scope V1: typing indicators, read receipts, push notifications on new message (tied to Phase 7 push)

#### Decay quiz integration (forgetting-curve loop)

> Backend already exposes `GET /study-plans/:pdfId/lessons/:idx/decay-quiz`
> and `POST .../submit`. Web triggers it via `?decay=1` URL param on the
> lesson page. Mobile has zero trigger.

The decay model on the backend is **elapsed-day decay**, not SM-2:
`decayDays = (now - lessonCompletedAt) / day`. Lessons completed today are
skipped; everything older is ranked by `decayDays` descending. Same data
already feeds the Daily Drill (which mobile consumes).

- [ ] Add `getDecayQuiz(pdfId, lessonIndex)` and `submitDecayQuiz(pdfId, lessonIndex, answers)` to `lib/api.ts`
- [ ] Add `getReviewQueue()` to `lib/api.ts` — fetches the ranked list of decayed lessons (reuse the daily-drill ranking or expose a dedicated endpoint if the backend grows one)
- [ ] **Review queue tile on Home tab** — card titled "N lessons are fading" listing the 3 most-decayed lessons with mini CTAs ("Refresh in ~2 min")
- [ ] On tile tap, navigate to the lesson with a `decay=1` param: `/lesson/[pdfId]/[lessonIndex]?decay=1`
- [ ] In the lesson page, when `decay === "1"` is present in params:
  - [ ] Show a full-screen *Knowledge Refresh* overlay BEFORE the lecture content
  - [ ] Render the decay quiz questions (4 multi-choice from `getDecayQuiz`)
  - [ ] On submit ≥80%: success state, "decay clock reset, mastery restored", auto-dismiss into the lecture
  - [ ] On submit <80%: still allow lecture entry but no review bonus
  - [ ] Skip button — bypasses the overlay, no bonus, no penalty
- [ ] Surface the 200-point "review bonus" in the quiz result mastery breakdown when `decay=1` was active for this entry
- [ ] Out of scope: SM-2 algorithm, per-card retention modeling, server-side scheduling

#### What we are NOT building (decisions logged)

- **Certificate feature** — does not exist on web either. The **Passport** screen serves the equivalent role (tiered list of completed courses). Mobile already has parity.
- **Rich text reply / suggestion bodies** — plain text only on mobile. TipTap is web-only per existing roadmap decision.
- **Live websocket chat** — V1 uses polling / focus-refetch. Websockets ship with Phase 7 push notifications or later.

### Already accessible — verified 2026-05-24

These were previously marked as gaps but are actually working. Listed here for the audit trail.

- [x] **Boss quiz** — `app/course/[pdfId]/boss-quiz.tsx`. Reached via the course page hero CTA when `currentDay >= lessons.length` ("Enter boss quiz") or the black bottom card ("Start boss quiz")
- [x] **Hive challenge leaderboard** — rendered on the hive detail screen below the progress leaderboard (`app/hives/[teamId].tsx`)
- [x] **Daily drill** — surfaces decayed lessons as drill questions (`app/daily-drill.tsx`)
- [x] **Passport** — tiered completed-course list (`app/passport.tsx`), parity with web
