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

### Phase 1 — Core loop: PDF → Lessons **(MVP — nothing ships without this)**

This is the killer feature. Until a user can upload a PDF and read its lessons
on the phone, the app is brochureware.

- [ ] **Home tab — "Continue learning"**
  - Active courses (horizontal swipe cards) with progress ring
  - Big primary "Upload PDF" CTA
  - Streak + daily-drill nudge (compact)
  - Recently opened lesson tap-to-resume
- [ ] **Lessons tab — "My library"**
  - All courses (active + archived filter)
  - Sort: recent / progress / title
  - Search bar
  - Long-press → archive / delete
- [ ] **PDF upload screen** (modal or full screen)
  - `expo-document-picker` → multipart upload with progress
  - Validation: size, page count (free vs premium limits)
  - Inline error states (network, too large, unsupported)
- [ ] **Course generation status**
  - Poll backend for status (or open WebSocket if backend supports)
  - Animated step indicator: Extracting → Structuring → Generating lessons
  - Allow background continue ("we'll notify you")
  - Failure recovery (retry, contact support)
- [ ] **Topic-based course** (port `TopicCourseModal`)
  - Text input → backend topic generator
  - Same generation status screen
- [ ] **Course detail (lessons list per pdfId)**
  - Cover, title, day/total, mastery summary
  - Lesson rows with completion state
  - "Boss quiz" button when all lessons complete
- [ ] **Lesson detail**
  - Rich content renderer (existing `prose-rich` CSS mapped to RN)
  - Inline images with `expo-image` + caching
  - Optional audio player (port `lecture-audio-player`)
  - Optional SVG visual diagram (port `visual-diagram`)
  - Bottom-pinned CTAs: "Flashcards", "Quiz", "Mark complete"

### Phase 2 — Practice & retention

Lessons without practice = forgotten lessons.

- [ ] **Flashcards** — swipe deck, tap to flip, rate "Hard / Good / Easy"
- [ ] **Quiz** — MCQ, immediate feedback, streak indicator, animated reveal
- [ ] **Quiz results** — score, weak concepts, "review weakest" CTA
- [ ] **Boss quiz** — multi-lesson final, gates the course completion
- [ ] **Weak concepts** card on Home that drills into review

### Phase 3 — Engagement loop

What gets users back tomorrow.

- [ ] **Daily Drill** screen + Expo push reminder
- [ ] **Echo question** (recall) — appears on Home, one-tap answer
- [ ] **Streak shield** UI + redeem flow
- [ ] **Quest Board** — daily/weekly quests with rewards
- [ ] **Activity heatmap** (Profile)
- [ ] **"Did you know" / spotlight tip** rotating card

### Phase 4 — Gamification

The reason the web app calls itself a game.

- [ ] **League** — weekly board, promotion/relegation visuals, current position
- [ ] **Rank** progression with title milestones
- [ ] **Passport** — mastered courses as stamps; Bronze→Silver→Gold→Platinum tiers
- [ ] **1v1 challenges** — pick a friend, pick a lesson, race the quiz
- [ ] **Rival events** — banner on Home for current rival activity

### Phase 5 — Social & community

Friction-y to build, retention multiplier.

- [ ] **Community feed** (read-first)
- [ ] **Community post detail** (deep link from notification)
- [ ] **Teams** — create, invite link, leaderboard, archive
- [ ] **Team challenge leaderboard**
- [ ] **Hives** (study groups / school cohorts)
- [ ] **Suggestions** feed + voting
- [ ] **Pending invitations** card on Home

### Phase 6 — Account & monetization

- [ ] **Profile** — view, edit username, avatar (later)
- [ ] **Settings** — notifications, voice prefs, change password, theme (later), sign out
- [ ] **Token usage** detail with plan benefits
- [ ] **Pricing** as a bottom sheet (port `PricingModal`)
- [ ] **Subscription** — Stripe sheet on Android/web, **see "Open decisions" for iOS**
- [ ] **Flutterwave** for NGN/USD non-iOS

### Phase 7 — Polish & native

- [ ] **Expo Push** registration + token persistence
- [ ] **Universal / App Links** for verify-email + reset-password
- [ ] **Haptics** — streak gain, correct quiz, level up
- [ ] **Reanimated** screen transitions + key interactions
- [ ] **MMKV** offline cache for last-read lessons
- [ ] **expo-image** for image cache
- [ ] **PostHog** parity with frontend (identify, capture)
- [ ] **Sentry** error reporting
- [ ] **App Store / Play Store** metadata + screenshots
- [ ] **EAS Submit** dry run

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
