# ChattaTutor Mobile — Launch Plan

> Goal: pass Apple App Review and Google Play review on the **first submission**.
> Ordered by dependency: code first, then store assets, then submission, then telemetry.
> Each phase blocks the next.

Anything marked **🔴 blocker** can get the app rejected outright. **🟡 should-fix** is policy-adjacent
or quality work that can slip a v1.1 but adds risk. **🟢 nice-to-have** is post-launch polish.

---

## Phase 1 — Code blockers (must ship in V1 binary)

These are non-negotiable: store review will reject or the app will crash in front of reviewers.

### 1.1 Sign In with Apple — required because Google Sign-In is enabled

Apple guideline **4.8** is hard: any app that offers a third-party social login (Google, Facebook,
Twitter, Apple) MUST also offer Sign In with Apple. We currently have Google OAuth in
[lib/auth.ts](lib/auth.ts) and [app/(auth)/login.tsx](app/(auth)/login.tsx).

- [ ] 🔴 Add `expo-apple-authentication` to dependencies
- [ ] 🔴 Add `apple` to `authProvider` enum in backend [src/types/database.ts](../chattatutor_backend/src/types/database.ts)
- [ ] 🔴 Add `POST /auth/apple` endpoint on backend (mirror `/auth/google`), verifying the identity token via Apple's public keys
- [ ] 🔴 Add "Sign in with Apple" button on iOS sign-in + sign-up screens (above or equal prominence to Google)
- [ ] 🔴 Handle the email-relay address Apple sometimes returns (treat as a real email — do not block on the @privaterelay.appleid.com domain)
- [ ] 🔴 Add capability `com.apple.developer.applesignin` to iOS entitlements (EAS managed)
- [ ] 🟡 On Android + web, hide the Apple button — only show on iOS

### 1.2 Account deletion — required by Apple 5.1.1(v)

If the app supports account creation, it must support **in-app account deletion**. A "contact
support" link is not acceptable. The deletion must happen from inside the app, even if it
schedules a backend deletion job.

- [ ] 🔴 Add `DELETE /auth/account` endpoint on backend that: marks the user soft-deleted, anonymises PII, cancels active Flutterwave / Stripe subscriptions, archives study plans, sends a confirmation email
- [ ] 🔴 Add `deleteAccount()` helper in [lib/auth.ts](lib/auth.ts)
- [ ] 🔴 Settings screen ([app/(tabs)/profile.tsx](app/(tabs)/profile.tsx)) — "Delete account" button with:
  - [ ] Double-confirm modal: "This permanently deletes your account, courses, mastery, and cancels your subscription. This cannot be undone."
  - [ ] Re-authentication step (password or Google/Apple re-confirm)
  - [ ] Clear local auth token + AsyncStorage state on success
  - [ ] Redirect to landing/signup
- [ ] 🟡 If subscription is active, surface "Your subscription will be cancelled and you will not be charged again. Access ends at the current billing period." before delete fires.
- [ ] 🟢 Web equivalent at [chattatutor_frontend/app/settings/page.tsx](../chattatutor_frontend/app/settings/page.tsx) for parity (Apple won't reject for missing web flow, but inconsistency is awkward).

### 1.3 In-App Purchase — decision locked: ship V1 with **RevenueCat IAP on iOS**

**Decision:** V1 ships with real StoreKit subscriptions via **RevenueCat**. iOS users subscribe
inside the app; web and Android users keep Flutterwave for V1. This adds ~3.5 working days to
the V1 timeline but removes Apple guideline 3.1.1 rejection risk entirely.

**Why RevenueCat (vs raw StoreKit):**
- Receipt verification, App Store Server Notifications V2, refund handling, family sharing,
  billing retries — all absorbed by RevenueCat. Saves ~2–3 days of pure-StoreKit plumbing.
- Same SDK handles Google Play Billing — when Google tightens external-payment enforcement,
  we flip a flag in V1.1, no rewrite.
- Free up to $2.5K MRR, then 1% above. Cheaper than our own dev time.

**External setup (you do these; code waits on them):**

- [ ] 🔴 **App Store Connect** — create two auto-renewing subscriptions in the same group:
  - `com.chattatutor.mobile.pro.monthly` — $4.99/mo, "Pro"
  - `com.chattatutor.mobile.premium.monthly` — $9.99/mo, "Premium"
  - Add subscription metadata, review screenshot (one screenshot showing the paywall is fine), localizations for primary language
- [ ] 🔴 **App Store Connect API key** — Settings → Users and Access → Keys → In-App Purchase → generate. Note the Key ID, Issuer ID, and download the `.p8` file. RevenueCat needs all three.
- [ ] 🔴 **Apple Developer** — enable "In-App Purchase" capability on the bundle ID
- [ ] 🔴 **RevenueCat dashboard** (free tier):
  - Create project "ChattaTutor"
  - Add iOS app → paste Apple bundle ID + App Store Connect API key
  - Define **Entitlements**: `pro_access`, `premium_access` (separate entitlements so the backend knows which tier the user has)
  - Sync **Products** from App Store Connect (RevenueCat pulls them via the API key)
  - Attach products to entitlements (Pro product → `pro_access`; Premium product → both `pro_access` AND `premium_access` since Premium is a superset)
  - Define an **Offering** (default) with both products as Packages
  - Note the **Public SDK key** (starts with `appl_...`) — goes into mobile `.env`
  - Generate a **webhook authorization header** (RevenueCat dashboard → Integrations → Webhooks) and set webhook URL to `https://api.chattatutor.com/api/iap/revenuecat-webhook` (in production) or your dev tunnel for testing
- [ ] 🔴 Add `REVENUECAT_WEBHOOK_AUTH_HEADER` to backend `.env`
- [ ] 🔴 Add `EXPO_PUBLIC_REVENUECAT_IOS_KEY` to mobile `.env`

**Code work** (lives in ROADMAP §"Phase 9 — RevenueCat IAP integration" — now V1 scope, not V1.2):

- Backend: webhook handler, reconciliation in `getEffectivePlan`
- Mobile: `lib/iap.ts` wrapper, swap 4 checkout call sites on iOS, Restore Purchases + Manage links in Settings

**App Review notes for V1 submission:**

> ChattaTutor offers in-app subscriptions via Apple's StoreKit (Pro $4.99/mo, Premium $9.99/mo).
> Web and Android users can alternatively purchase subscriptions on our website using
> Flutterwave; this allows feature parity for users without an Apple ID, in line with multi-platform
> educational services. iOS users see only the StoreKit purchase flow.

### 1.4 Production environment configuration

These all currently hold placeholder or `_TEST` values.

- [ ] 🔴 Set `FLUTTERWAVE_WEBHOOK_SECRET_HASH` to the real signing secret from the Flutterwave dashboard
- [ ] 🔴 Swap `FLUTTERWAVE_SECRET_KEY` + `FLUTTERWAVE_PUBLIC_KEY` from `_TEST` to live keys
- [ ] 🔴 Set `FRONTEND_URL=https://chattatutor.com` in production env
- [ ] 🔴 Set `FLUTTERWAVE_REDIRECT_URL` (or rely on `FRONTEND_URL` fallback now that prod is HTTPS)
- [ ] 🔴 Resolve Prisma migration drift: two migrations are applied to Neon but missing from `prisma/migrations/` (`20260524120000_add_push_devices`, `20260526120000_phase_65_rank_unification`). Reconcile by importing them from the deploy pipeline or shadow DB.
- [ ] 🔴 Backend deployed to production URL (verify `NEXT_PUBLIC_API_BASE_URL` in mobile build matches)
- [ ] 🟡 Stripe webhook secret hardened (currently dev-only)
- [ ] 🟡 Rotate any test API keys that appear in `.env` history

### 1.5 Real-device QA sweep — 7 walkthroughs

These flows have **never been hand-walked** since they were built. Each should be tested on a real iOS device AND a real Android device.

- [ ] 🔴 Auth → upload → course detail → lesson lecture → slides → retrieval checks → flashcards → quiz → result → next-lesson nav
- [ ] 🔴 Home → daily drill → quests → league → passport
- [ ] 🔴 Hives list → create hive → hive detail → invite flow → general hive
- [ ] 🔴 Community → suggestions → announcement detail
- [ ] 🔴 Challenges list → create challenge → invite-code accept → live play → result
- [ ] 🔴 Profile → settings → change password → sign out → re-login
- [ ] 🔴 Subscribe (free → trial → upgrade → downgrade → cancel) end-to-end
- [ ] 🔴 Log every regression, dead-end, visual glitch
- [ ] 🔴 Fix in one batch with separate commits per area

### 1.6 Audio assets (or remove dead code)

- [ ] 🟡 Decide: ship SFX in V1 or strip the dead helper?
  - If shipping: source 7 short clips (flip, tap, select, correct, wrong, complete, celebrate), drop into `assets/sounds/`, uncomment require()s in [lib/sfx.ts](lib/sfx.ts)
  - If not shipping V1: remove `lib/sfx.ts` and all `sfx.foo()` call sites OR explicitly comment them as "no-op until V1.1"

### 1.7 TypeScript hygiene

- [ ] 🟡 Fix the ~60 "React UMD global" errors across `app/challenges/index.tsx`, `app/league.tsx`, and other files. Just add `import React from "react"` to each. This isn't a runtime issue but it blinds us to real type errors.

### 1.8 Bundle audit

- [ ] 🔴 Run `npx expo-bundle-analyzer` after `eas build --profile production`
- [ ] 🔴 Confirm iOS IPA < 150 MB (Apple limit; >150 MB requires cellular-download warnings)
- [ ] 🔴 Confirm Android APK/AAB < 200 MB
- [ ] 🟡 If close to limits, audit `node_modules` for duplicated icon libraries, fonts, etc.

---

## Phase 2 — Compliance & policy code

Apple and Google both demand specific UX patterns. Missing any of these is an automatic rejection.

### 2.1 Privacy Policy & Terms of Service surfaces

Both stores require a live, accessible privacy policy URL. Apple additionally wants it linked
from inside the app.

- [ ] 🔴 Privacy Policy lives at `https://chattatutor.com/privacy` (verify already hosted; update for mobile-specific collection: push tokens, device IDs, crash logs, IP)
- [ ] 🔴 Terms of Service lives at `https://chattatutor.com/terms`
- [ ] 🔴 In-app: Settings → "Privacy Policy" and "Terms of Service" rows that open the URLs in `expo-web-browser`
- [ ] 🔴 On signup: Below the "Create account" button, add: "By signing up, you agree to our Terms and Privacy Policy" with both linkified
- [ ] 🟡 GDPR compliance: data export endpoint + data deletion endpoint (we already have delete from §1.2; add a user-facing "Download my data" if you have EU users)
- [ ] 🟡 CCPA: "Do Not Sell My Personal Information" link in settings — even if you don't sell, the link is the safer default

### 2.2 Push notification permission timing

Both stores reject apps that ask for push permission immediately at first launch with no context.

- [ ] 🔴 Defer the system push permission prompt until the user does something that needs it
- [ ] 🟡 Pre-prompt before triggering the system dialog: "Get a nudge when your daily drill is ready?" → on accept, fire the actual `expo-notifications` permission request
- [ ] 🟡 If push notifications aren't shipping in V1, **don't include the iOS push entitlement at all** — claiming the entitlement but never using it can cause additional review scrutiny

### 2.3 App Tracking Transparency (ATT) on iOS

Required by Apple if you do any cross-app/cross-website tracking. PostHog session replay or
identity-linking analytics can trigger this.

- [ ] 🟡 If PostHog (Phase 7) ships with `identify()` + cross-site tracking: include `expo-tracking-transparency`, prompt for ATT before initialising analytics
- [ ] 🟡 Update `Info.plist` `NSUserTrackingUsageDescription` with a clear, honest reason
- [ ] 🟡 If you only do first-party analytics (PostHog without identify, no cross-site): you can declare "Data Not Linked to You" in App Privacy and skip ATT

### 2.4 User-Generated Content moderation

Hives, community feed, suggestions, and announcements are UGC. Apple **4.3** and Google's UGC
policies both require moderation tooling. This is the second-most common rejection reason after IAP.

- [ ] 🔴 In-app **report** action on every user post / comment / hive announcement (we have `QualityReport` for content; need a separate "Report user / post" path)
- [ ] 🔴 In-app **block user** action that hides their content from the reporter going forward
- [ ] 🔴 Backend: store report records, route to a moderation queue (even a Slack channel is fine for V1)
- [ ] 🔴 Documented response SLA in store metadata: "We respond to reports within 24 hours"
- [ ] 🔴 Terms of Service prohibits abuse, harassment, hate speech, NSFW, illegal content
- [ ] 🟡 Profanity filter on hive/community submissions (server-side)
- [ ] 🟡 Auto-suspend after N reports against the same user

### 2.5 Universal Links / App Links

Already partly wired in `app.json`; needs hosted association files + EAS rebuild.

- [ ] 🟡 iOS: serve `apple-app-site-association` at `https://chattatutor.com/.well-known/apple-app-site-association`
  - Production team ID + bundle ID locked in
  - File served with `Content-Type: application/json`, no extension
  - Verified with `curl -i https://chattatutor.com/.well-known/apple-app-site-association`
  - Buffer 24h for Apple AASA CDN propagation
- [ ] 🟡 Android: serve `assetlinks.json` at `https://chattatutor.com/.well-known/assetlinks.json`
  - SHA-256 fingerprint from EAS-managed keystore
  - Verified via Google's [digital asset links tool](https://developers.google.com/digital-asset-links/tools/generator)
- [ ] 🟡 Real-device test: tap verify-email link from Apple Mail / Gmail → app opens directly

### 2.6 Permission usage strings (Info.plist)

If `app.json` declares any system capability, iOS demands a usage string for it. Missing string = rejection.

- [ ] 🔴 Audit `app.json` for declared permissions
- [ ] 🔴 For each, add a clear, user-facing usage string. Examples:
  - `NSCameraUsageDescription` (if using camera for avatar) — "Take a photo for your profile avatar"
  - `NSPhotoLibraryUsageDescription` — "Pick a photo to upload"
  - `NSMicrophoneUsageDescription` (if any voice features) — "Record audio for [feature]"
- [ ] 🟡 If a permission was wired but is unused: remove it from `app.json` to reduce review friction

### 2.7 Network security

- [ ] 🔴 iOS: confirm `NSAppTransportSecurity` does NOT have wildcard exceptions (`NSAllowsArbitraryLoads: true`). All API calls must be HTTPS.
- [ ] 🔴 Android: `usesCleartextTraffic="false"` (default in API 28+). Confirm no `http://` URLs in the production binary.

### 2.8 Premium gate UX (Phase 5.6) — already done

- [x] CourseCustomizationCard wired to `<FeatureLockSheet>`
- [x] League screen routes through `?openPricing=1` channel
- [x] No silent disables remain

If you go with **Path A** (no iOS upsell), the gate sheets also need to be conditionally hidden on iOS — see §1.3.

---

## Phase 3 — Production infrastructure & telemetry

### 3.1 Sentry error reporting

- [ ] 🟡 Create Sentry project for mobile (or use the same project as web with a `platform:mobile` tag)
- [ ] 🟡 `npx expo install sentry-expo @sentry/react-native`
- [ ] 🟡 Initialise in `app/_layout.tsx` with DSN from env (`EXPO_PUBLIC_SENTRY_DSN`)
- [ ] 🟡 Source maps uploaded automatically via `sentry-expo` config
- [ ] 🟡 Test by throwing `new Error("sentry-test")` from a settings debug-only button before stripping
- [ ] 🟡 Set `tracesSampleRate` to a reasonable value (0.1 for V1, raise after launch)

### 3.2 PostHog analytics

- [ ] 🟡 `npx expo install posthog-react-native`
- [ ] 🟡 Initialise on app start, identify after login: `posthog.identify(user.id, { plan, createdAt })`
- [ ] 🟡 Capture the funnel events that already exist on web for parity: `signup_completed`, `onboarding_completed`, `course_generated`, `lesson_completed`, `subscribe_started`, `subscribe_succeeded`
- [ ] 🟡 Add `voice_brief_play_started`, `voice_brief_completed` (the deferred Phase 7.5 telemetry)
- [ ] 🟢 Reverse-proxy PostHog through your domain to avoid ad-blocker / privacy-tool false positives

### 3.3 Push notifications (Firebase + APNs)

Only required if shipping push in V1. Phase 7 in ROADMAP — currently deferred.

- [ ] 🟢 Generate APNs auth key (.p8) in Apple Developer
- [ ] 🟢 Upload to FCM (Firebase Cloud Messaging) console
- [ ] 🟢 `EAS Build` picks up FCM via `google-services.json` (Android) and APNs key (iOS)
- [ ] 🟢 `expo-notifications` already integrated; verify token write to `pushDevices` table

### 3.4 Crash & ANR monitoring (Play Store)

Google Play tracks crash-free rate and ANR rate. Below 99.x% in either category can flag the listing.

- [ ] 🟡 Sentry covers crashes; Android ANRs are also surfaced through Google Play Console once you upload your first signed AAB
- [ ] 🟡 Set up alerting (Slack / email) if crash-free rate drops below 99.5%

---

## Phase 4 — Store metadata & submission assets

This is where most teams spend more time than they expected. Budget 2–3 days of design.

### 4.1 Apple App Store Connect

- [ ] 🔴 **Production team ID** + bundle ID (`com.chattatutor.mobile`) registered, paid Apple Developer membership ($99/year) active
- [ ] 🔴 **App icon**: 1024×1024 PNG, no transparency, no rounded corners (Apple applies them), no alpha
- [ ] 🔴 **Screenshots** (per `appicon.co` or `screenshots.pro`):
  - 6.7" (1290×2796) — iPhone 15 Pro Max — minimum 3, up to 10
  - 6.5" (1242×2688) — iPhone 11 Pro Max — minimum 3 (fallback for older devices)
  - 5.5" (1242×2208) — iPhone 8 Plus — STILL REQUIRED for older device fallback
  - iPad screenshots only if you market for iPad (1920×1080 and 2048×2732)
- [ ] 🔴 **App name** (30 chars max): "ChattaTutor: PDF to Course"
- [ ] 🔴 **Subtitle** (30 chars): "AI tutor for any document"
- [ ] 🔴 **Promotional text** (170 chars, editable post-launch without re-review)
- [ ] 🔴 **Description** (4000 chars): hook, what it does, who it's for, premium features, call to action, support contact
- [ ] 🔴 **Keywords** (100 chars total, comma-separated): "ai tutor,pdf,course,study,quiz,flashcards,learning,knowmad,daily drill"
- [ ] 🔴 **Support URL**: `https://chattatutor.com/support`
- [ ] 🔴 **Marketing URL**: `https://chattatutor.com`
- [ ] 🔴 **Privacy Policy URL**: `https://chattatutor.com/privacy` (live before submission!)
- [ ] 🔴 **Category**: Primary "Education", Secondary "Productivity"
- [ ] 🔴 **Content rating**: probably 12+ (UGC + occasional sarcastic "roast tone" preset)
- [ ] 🔴 **Privacy Nutrition Label** (truthfully declare every data type):
  - Identifiers: User ID, Email
  - Usage Data: Product Interaction (PostHog if shipping)
  - Diagnostics: Crash Data, Performance Data (Sentry if shipping)
  - Linked to user (not Tracking — only ATT if you do cross-site)
- [ ] 🔴 **App Review information**:
  - Demo username + password (active premium account so reviewer can see paid features)
  - Phone number + email for review questions
  - Notes: "ChattaTutor is a multi-platform learning app. Sign in with the test account provided. Premium features include AI coach, weekly leagues, and customization — all visible after sign-in. Subscriptions are managed on the web (see policy decision in §1.3)."
  - If applicable: video demoing premium-only feature
- [ ] 🟡 **Build version** matches binary version (TestFlight will catch mismatches)
- [ ] 🟢 **App Preview videos** (15–30s each, per device size) — significantly bumps conversion in store, not required

### 4.2 Google Play Console

- [ ] 🔴 **Google Play developer account** ($25 one-time) active
- [ ] 🔴 **Production Android keystore** generated, stored in EAS, **uploaded to Play Console** (Play App Signing recommended — Google manages the key)
- [ ] 🔴 **Adaptive icon** (foreground PNG + background color/PNG, 432×432 each layer)
- [ ] 🔴 **Feature graphic**: 1024×500 PNG (top banner on Play listing)
- [ ] 🔴 **Screenshots** (minimum 2, max 8 per device class):
  - Phone: 16:9 or 9:16 (e.g., 1080×1920)
  - 7" tablet, 10" tablet (only if marketing for tablets)
- [ ] 🔴 **Short description** (80 chars)
- [ ] 🔴 **Full description** (4000 chars)
- [ ] 🔴 **Content Rating questionnaire** (IARC):
  - Be truthful about UGC presence (hives, community → "users can interact with each other")
  - User-generated content + ability to share location/contact info = teen rating
- [ ] 🔴 **Data Safety form** (must match Privacy Policy verbatim — inconsistency = rejection):
  - Data collected: Email, User ID, Crash Data, App Activity (PostHog), Approximate Location (IP-based, if Flutterwave logs it)
  - Data shared with third parties: list every analytics / payment / email provider
- [ ] 🔴 **Target audience**: 13+ minimum (if any data collection from users under 13, you need COPPA compliance, which is a separate beast)
- [ ] 🔴 **Privacy Policy URL** (matches what's in the app + on the App Store)
- [ ] 🔴 **App category**: Education
- [ ] 🔴 **Tags** (5 max): "Educational", "AI", "Study", "Quiz", "Learning"
- [ ] 🔴 **Contact email**, **website**, optional phone number for the listing
- [ ] 🔴 **Target API level**: must target Android 14 (API 34) or higher (Play Store policy as of 2024-08-31)
- [ ] 🟡 **Pre-launch report**: Google runs your app through automated tests on real devices and flags crashes; review and fix before promoting to production track
- [ ] 🟢 **Play Store listing experiments** (A/B test icon, screenshots) — for post-launch optimisation

### 4.3 EAS Build configuration

- [ ] 🔴 `eas.json` has separate `preview`, `production`, and `submit` profiles
- [ ] 🔴 `app.json` (or `app.config.js`) has correct production bundle IDs:
  - iOS: `com.chattatutor.mobile`
  - Android: `com.chattatutor.mobile`
- [ ] 🔴 `app.json` version + buildNumber/versionCode bumped consistently for each submission
- [ ] 🔴 `eas submit --profile production --platform all` configured with Apple App Store API key + Google Play service account
- [ ] 🟡 Builds are reproducible: EAS commit SHA matches the git tag for the release

---

## Phase 5 — Testing tracks

Both stores let you run closed testing before public release. Use this aggressively.

### 5.1 TestFlight (iOS)

- [ ] 🔴 Internal testing group (your team): build hits TestFlight 5–15 min after EAS submit
- [ ] 🔴 External testing group (real beta users): **requires Apple beta review** (24–48h first time, then faster). Build is published only after Apple approves the beta build.
- [ ] 🔴 Smoke test on internal track for 2–3 days minimum before promoting
- [ ] 🟡 Crash-free rate target >99.5% before external promotion
- [ ] 🟢 Use TestFlight feedback button to gather screenshots + bug reports from beta users

### 5.2 Play Internal Testing → Closed → Open

Google's progression: Internal (100 testers, instant) → Closed (limited testers, 1–2 day review) → Open (anyone with link) → Production.

- [ ] 🔴 Internal track: AAB uploaded via EAS, ≤100 email-invited testers
- [ ] 🔴 Closed track: graduate after 1 week of internal smoke
- [ ] 🟡 Open track (optional): publicly accessible beta link for power users
- [ ] 🔴 Pre-launch report from each track reviewed for crashes / ANRs / accessibility issues

### 5.3 Device matrix (minimum coverage)

- [ ] 🔴 iPhone (1× modern, e.g., iPhone 15) + iPhone (1× older with smaller screen, e.g., iPhone SE or iPhone 11)
- [ ] 🔴 iPad (only if marketing for iPad — otherwise compile-time disable iPad support)
- [ ] 🔴 Android (1× Pixel running latest Android) + Android (1× Samsung mid-range with One UI skin)
- [ ] 🟡 Older Android (1× device running Android 10/11 for compatibility floor)
- [ ] 🟢 Tablet Android (1× Samsung Tab) if marketing for Android tablets

---

## Phase 6 — Submission

### 6.1 Pre-submission checklist (review the morning of submit)

- [ ] 🔴 Phases 1, 2, 3.1 (Sentry), 4 complete; all 🔴 items checked
- [ ] 🔴 Privacy Policy + Terms live and matching what the app declares
- [ ] 🔴 Demo account credentials verified working — log in once and confirm premium features are visible
- [ ] 🔴 Latest production EAS build installed on a real device — perform a full sign-up → upgrade → use-feature → delete-account flow end-to-end on both iOS and Android
- [ ] 🔴 Build number / version number matches what's set in App Store Connect / Play Console
- [ ] 🔴 No `console.log` of secrets, tokens, or PII in production logs
- [ ] 🔴 No `__DEV__` debug menus or hidden admin paths visible in production binary

### 6.2 Submit Apple

- [ ] 🔴 Final TestFlight build submitted for App Review via App Store Connect (or `eas submit`)
- [ ] 🔴 Confirm App Review notes are visible to reviewer
- [ ] 🔴 If using **Path A** (no iOS upsell): explicitly note "External subscriptions per multi-platform exemption — see [letter to Apple if one exists]"
- [ ] 🟡 Submit on Monday or Tuesday morning Pacific time — gives Apple a full week to review before weekend slowdowns
- [ ] 🟢 If rejected: address every cited reason in the response, then resubmit with a polite, specific reply to the rejection

### 6.3 Submit Google

- [ ] 🔴 Final AAB published to production track via Play Console (or `eas submit`)
- [ ] 🔴 Data Safety + Content Rating + Privacy Policy all consistent
- [ ] 🔴 Target API level meets policy minimum (Android 14 / API 34 as of 2025)
- [ ] 🔴 Pre-launch report green (no crashes, no high-severity accessibility issues)
- [ ] 🟢 Initial rollout at 20% to detect crashes before full distribution

### 6.4 Day-of-launch ops

- [ ] 🔴 Backend production deploy frozen during App Review (no schema changes, no breaking API changes)
- [ ] 🟡 Status page or `/status` health-check endpoint live so reviewers / users see uptime
- [ ] 🟡 Customer support email monitored
- [ ] 🟡 First-day Sentry + Play crash dashboards open; war-room channel ready

---

## Phase 7 — Post-launch monitoring & iteration

### 7.1 First 72 hours

- [ ] 🟡 Watch Sentry crash-free rate every few hours — target >99.5%
- [ ] 🟡 Watch Play Console pre-launch report + crashes/ANR rate
- [ ] 🟡 Watch App Store reviews for systemic issues (look for repeated complaints, not one-offs)
- [ ] 🟡 Watch PostHog funnel: signup → first-course → first-lesson — large drop-offs flag UX bugs
- [ ] 🟡 Watch Flutterwave dashboard for failed charges, especially on the first cycle of real recurring billing

### 7.2 V1.1 — Reactive fixes (week 1–2 after launch)

Hotfix what review surfaces:

- [ ] 🟡 Crashes Sentry surfaces (anything above 0.5% crash rate per device class)
- [ ] 🟡 ANRs from Play Console pre-launch + production crash dashboard
- [ ] 🟡 Top 3 user-reported issues from store reviews
- [ ] 🟡 Any policy clarifications Apple / Google asked for during review
- [ ] 🟡 Crash + funnel anomalies PostHog flags

### 7.3 V1.1 — Phase 7.6 polish (ROADMAP §7.6)

Backend endpoints exist for all of these; only mobile UI is missing. Shipping all four together makes V1 feel like web parity.

#### Report Inaccurate buttons

- [ ] 🟢 Add `createQualityReport(courseId, sectionId, targetType, targetId, kind, anchorText?, userComment?)` to [lib/api.ts](lib/api.ts)
- [ ] 🟢 Add `QualityReportTarget` type with `targetType: "section" | "visual" | "flashcard" | "question"`
- [ ] 🟢 Build [components/ReportInaccurateSheet.tsx](components/ReportInaccurateSheet.tsx) — bottom-sheet modal with anchor text preview + comment field + submit button
- [ ] 🟢 Wire a small `Flag` icon button into:
  - [ ] Section / slide views
  - [ ] Flashcard reveal
  - [ ] Quiz question after answer
- [ ] 🟢 On submit: `haptics.tap()`, toast "Report saved" on success
- [ ] 🟢 Surface server's `autoRegen.status === "queued"` response with a different toast ("Repair pass queued")
- [ ] 🟢 Disable buttons if `courseId` not yet loaded (matches web)

#### "Explain this differently" chip

- [ ] 🟢 Add `explainSlide(pdfId, lessonIndex, slideText, slideIndex)` to [lib/api.ts](lib/api.ts) — returns `{ explanation, status? }`
- [ ] 🟢 Add a `Sparkles` chip button below the lecture HTML on each slide
- [ ] 🟢 On tap: show inline loader → render the response in a violet card below the chip
- [ ] 🟢 Handle 403 → route to `<FeatureLockSheet featureName="Explain Differently" />` (Phase 5.6 pattern)
- [ ] 🟢 Auto-hide explanation when user advances to next slide
- [ ] 🟢 Surface the "Want a different explanation?" nudge after two consecutive `skipped` retrieval checks (already wired in lesson page; this hooks the button up)

#### expo-image swap

- [ ] 🟢 `npx expo install expo-image`
- [ ] 🟢 Replace `import { Image } from "react-native"` with `import { Image } from "expo-image"` in every component that loads remote images (lessons, hives, community, profile avatars)
- [ ] 🟢 Add `cachePolicy="memory-disk"` to remote images
- [ ] 🟢 Add `placeholder` with a small base64 blur (avatars, lesson hero)
- [ ] 🟢 Verify no `tintColor` consumers broke (expo-image has different tintColor semantics)

#### Real-fixes bug sweep

- [ ] 🟢 One walkthrough of every flow (same 7 from §1.5), batched fix commits per area

### 7.4 V1.1 — Phase 7.7 deep linking (ROADMAP §7.7)

If §2.5 Universal Links wasn't shipped in V1, it lands here.

- [ ] 🟢 Apple AASA file hosted at `https://chattatutor.com/.well-known/apple-app-site-association`
- [ ] 🟢 Android assetlinks.json hosted at `https://chattatutor.com/.well-known/assetlinks.json`
- [ ] 🟢 Production team ID + bundle ID + SHA-256 fingerprint locked
- [ ] 🟢 EAS rebuild + real-device test (taps from Apple Mail / Gmail open the app, not the browser)
- [ ] 🟢 Buffer 24h for Apple AASA CDN propagation; reinstall on Android to re-trigger verification

### 7.5 V1.1 — Phase 6.5 celebration UI (ROADMAP §6.5 follow-ups)

Backend already returns `{ leveledUp, newLevel, newTitle }` on every mastery credit. Clients just need to consume.

- [ ] 🟢 Title-up celebration overlay: confetti (`react-native-confetti-cannon` or the existing `Confetti.tsx` component) + insight-token loot animation when a credit triggers a Knowmad level-up
- [ ] 🟢 Web Hive Knowmad-XP tab rebuild (web frontend; not mobile but worth noting): replace legacy XP listing with new lifetime mastery + Knowmad title view

### 7.6 V1.2 — IAP if you went Path A

Triggered by: Apple flagged external-payment concerns during V1 review, OR you simply want to capture iOS conversions you're leaking to web.

- [ ] 🟢 Add StoreKit configuration in App Store Connect (monthly Pro $4.99, monthly Premium $9.99 — match Flutterwave pricing)
- [ ] 🟢 Add `react-native-iap` (or successor) to the binary
- [ ] 🟢 Backend `/iap/verify` endpoint that validates Apple receipts and provisions the same `subscriptionEndsAt` flow Flutterwave uses
- [ ] 🟢 Restore-purchases button on Settings (Apple requirement)
- [ ] 🟢 Cancellation deep-link to user's Apple subscriptions page
- [ ] 🟢 Reconciliation: a user with both a Flutterwave (web) and IAP (iOS) active subscription = "extend, don't double-charge". One source-of-truth rule on backend.
- [ ] 🟢 Promo codes for App Review reviewer if Apple asks
- [ ] 🟢 Equivalent for Google Play Billing on Android — same effort, lower urgency since Google is more permissive on external payment

### 7.7 V1.3 — Phase 8 native visual rendering engine (ROADMAP §8)

Replaces the current `visual-diagram.tsx` SVG webview with Expo Go–safe React Native views. Whole phase is multi-session work.

- [ ] 🟢 Phase 8.0 — foundation: shared layout interfaces, type system, renderer skeleton
- [ ] 🟢 Phase 8.1 — simple layouts (5 types) with real-lesson QA pass
- [ ] 🟢 Phase 8.2 — dagre hierarchical layouts (5 types) with real-lesson QA pass
- [ ] 🟢 Phase 8.3 — pan / zoom with `react-native-gesture-handler` (release-build pinch QA gate)
- [ ] 🟢 Phase 8.4 — walkthrough overlay (auto-start when diagram enters viewport, reduced-motion support)
- [ ] 🟢 Phase 8.5 — Build Mode (tap-to-place, drag-and-drop via PanGestureHandler, full accessibility audit on TalkBack + VoiceOver)
- [ ] 🟢 Phase 8.6 — Build Mode backend telemetry events
- [ ] 🟢 Real-device QA across all 10 visual types with production lesson payloads

### 7.8 V1.3+ — Performance & polish

- [ ] 🟢 MMKV swap for AsyncStorage on hot read paths (auth token, voice prefs, lesson progress cache) — `react-native-mmkv` is ~30× faster
- [ ] 🟢 Bundle size audit run regularly, not just at submit
- [ ] 🟢 First-paint and time-to-interactive instrumented via PostHog
- [ ] 🟢 Source maps / debug symbols uploaded to Sentry on every release

### 7.9 V1.3+ — Hive chat V2 (ROADMAP §5.5)

V1 ships polling + focus-refetch. V2 adds real-time:

- [ ] 🟢 Typing indicators
- [ ] 🟢 Read receipts
- [ ] 🟢 Push notifications on new chat messages (tied to Phase 7 push notifications)
- [ ] 🟢 Pagination beyond the first 50 messages
- [ ] 🟢 Optional: websockets to replace polling

### 7.10 V1.3+ — Decay quiz advanced (ROADMAP §5.5)

V1 uses elapsed-day decay. V2 considerations:

- [ ] 🟢 SM-2 (SuperMemo) spaced-repetition algorithm
- [ ] 🟢 Per-card retention modeling
- [ ] 🟢 Server-side scheduling of next-review timestamps

### 7.11 V1.3+ — Phase 7.5 voice follow-ups (ROADMAP §7.5)

V1 ships Tutor Brief; V2 adds robustness:

- [ ] 🟢 Verify Android audio focus / interruption handling on a real device
- [ ] 🟢 Voice telemetry: `voice_brief_play_started`, `voice_brief_completed`, `voice_brief_skipped`, `voice_brief_unavailable`
- [ ] 🟢 Section-by-section narration (sections endpoint exists on backend but unused)
- [ ] 🟢 Pause on incoming call / route change (verify expo-av handles iOS automatically; explicit Android handling may be needed)

---

## Quick reference — what's still TODO in priority order

| # | Item | Phase | Severity |
|---|---|---|---|
| 1 | Sign In with Apple implementation | 1.1 | 🔴 |
| 2 | Delete-account flow | 1.2 | 🔴 |
| 3 | IAP policy decision (Path A or B) | 1.3 | 🔴 |
| 4 | Production env values + migration drift | 1.4 | 🔴 |
| 5 | Real-device QA sweep × 7 flows | 1.5 | 🔴 |
| 6 | Privacy Policy + Terms in-app | 2.1 | 🔴 |
| 7 | UGC report + block + moderation | 2.4 | 🔴 |
| 8 | Sentry crash reporting | 3.1 | 🟡 |
| 9 | Store metadata + screenshots + assets | 4.1, 4.2 | 🔴 |
| 10 | TestFlight + Play Internal testing | 5.1, 5.2 | 🔴 |
| 11 | Submit both stores | 6.2, 6.3 | 🔴 |
| 12 | PostHog parity | 3.2 | 🟡 |
| 13 | Audio assets decision | 1.6 | 🟡 |
| 14 | Universal Links / App Links | 2.5 | 🟡 |
| 15 | TypeScript hygiene | 1.7 | 🟡 |

---

## Open decisions (lock these before Phase 1 starts)

These are non-technical but block the technical work below them:

- **IAP path A vs B** (§1.3) — affects iOS UI, App Review notes, V1 effort estimate, refund/billing policy
- **Push notifications in V1?** — affects entitlements, Privacy Nutrition Label, FCM/APNs config
- **PostHog full identify or anonymous-only?** — affects ATT prompt, Privacy Nutrition Label
- **SFX in V1 or strip?** — affects asset sourcing budget and bundle size
- **Marketing claims** — anything in the description that's not literally true is grounds for rejection (no "the smartest AI tutor in the world", no "Used by Harvard students" without proof)
- **Initial pricing** — locking $4.99 / $9.99 means cannot change without re-creating products; consider grandfathering early subscribers if you raise prices later

---

## What success looks like

- ✅ Apple approves on first submission (or rejects with a clarification we can fix in <24h)
- ✅ Google approves on first submission (Play is far more forgiving than Apple)
- ✅ Crash-free rate >99.5% within the first week
- ✅ Funnel drop-offs in line with web (signup → first lesson)
- ✅ No P0 bug reports in the first 48 hours
- ✅ At least one organic five-star review by end of week one
