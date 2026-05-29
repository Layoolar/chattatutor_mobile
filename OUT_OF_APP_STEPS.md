# ChattaTutor — Out-of-App Setup Steps

> Every action that lives **outside the codebase**: dashboards, consoles, DNS records, signed legal forms,
> physical certificates, payment provider verifications. The code is ready or nearly ready for each of these
> — what's listed below is what a human has to click through, paste, sign, or pay for before V1 can ship.
>
> **Legend**
> - 🔴 **V1 blocker** — store will reject or feature is broken without it. Must be done before submission.
> - 🟡 **V1 should-have** — adds risk if missing; can sometimes slip into V1.1.
> - 🟢 **V1.1 / V2** — post-launch or future iteration.
>
> **Key-shape conventions** (so you can recognize secrets at a glance):
> - Stripe secret: `sk_live_...` / test: `sk_test_...`
> - Stripe publishable: `pk_live_...`
> - Stripe price: `price_...`
> - Stripe webhook: `whsec_...`
> - RevenueCat iOS SDK key (public): **`appl_...`**
> - RevenueCat secret key (server, optional): `sk_...`
> - Apple App Store Connect API key: `.p8` file + 10-char Key ID + UUID Issuer ID
> - Apple Push (APNs) auth key: `.p8` file + 10-char Key ID + 10-char Team ID
> - Flutterwave secret: `FLWSECK-...-X` (live) / `FLWSECK_TEST-...-X` (sandbox)
> - Flutterwave public: `FLWPUBK-...-X` / `FLWPUBK_TEST-...-X`
> - Flutterwave encryption: short hex (24 chars, no prefix)
> - SendGrid: `SG.xxxx.yyyy`
> - OpenAI: `sk-proj-...` or `sk-...`
> - Groq: `gsk_...`
> - Google API / Gemini: `AIza...`
> - Google OAuth client ID: ends in `.apps.googleusercontent.com`
> - Google OAuth client secret: `GOCSPX-...`
> - PostHog project key: `phc_...`
> - Sentry DSN: `https://<hash>@<org>.ingest.sentry.io/<project_id>`
> - Firebase service account: `<project>-firebase-adminsdk-*.json`
> - Dodo Payments: API key (no fixed prefix) + webhook secret `whsec_...`
> - ElevenLabs: `sk_...` (32-char hex after underscore)

---

## Table of contents

1. [Apple — Developer Program & App Store Connect](#1-apple--developer-program--app-store-connect)
2. [Google Play Console](#2-google-play-console)
3. [RevenueCat (iOS IAP)](#3-revenuecat-ios-iap)
4. [Flutterwave (web & Android billing)](#4-flutterwave-web--android-billing)
5. [Dodo Payments (alternate provider, currently live)](#5-dodo-payments-alternate-provider-currently-live)
6. [Stripe (web subscription rail)](#6-stripe-web-subscription-rail)
7. [Domain, DNS & web hosting](#7-domain-dns--web-hosting)
8. [Email — SMTP / SendGrid / Postmark](#8-email--smtp--sendgrid--postmark)
9. [Google Cloud (OAuth + Gemini)](#9-google-cloud-oauth--gemini)
10. [Firebase / APNs (push notifications)](#10-firebase--apns-push-notifications)
11. [Sentry (error reporting)](#11-sentry-error-reporting)
12. [PostHog (analytics)](#12-posthog-analytics)
13. [Neon (Postgres) & MongoDB Atlas](#13-neon-postgres--mongodb-atlas)
14. [AWS S3 + IAM](#14-aws-s3--iam)
15. [Redis (Upstash / Redis Cloud)](#15-redis-upstash--redis-cloud)
16. [ElevenLabs (TTS)](#16-elevenlabs-tts)
17. [OpenAI / Groq / Gemini (LLMs)](#17-openai--groq--gemini-llms)
18. [Legal & policy documents](#18-legal--policy-documents)
19. [EAS Build & EAS Submit](#19-eas-build--eas-submit)
20. [Production hosting (backend & frontend)](#20-production-hosting-backend--frontend)
21. [Day-of-submission checklist](#21-day-of-submission-checklist)

---

## 1. Apple — Developer Program & App Store Connect

> **V1 cost:** $99/year (Apple Developer Program enrollment)
> **Dashboard:** <https://developer.apple.com/account> · <https://appstoreconnect.apple.com>

### 1.1 Developer Program enrollment 🔴 V1

- [ ] Pay **$99 USD/year** for Apple Developer Program (individual or organization).
- [ ] If enrolling as **organization**, you also need a **D-U-N-S Number** (free, ~1–2 business days to obtain): <https://developer.apple.com/enroll/duns-lookup/>
- [ ] After payment, Apple reviews the application (1–3 days for individual, up to 2 weeks for org).
- [ ] **Output:** Active Apple Developer membership. Note the **Team ID** (10 chars, e.g. `AB12CD34EF`) — you'll need it everywhere.

### 1.2 App Store Connect — create the app record 🔴 V1

- [ ] App Store Connect → My Apps → **+** → New App.
- [ ] **Platforms:** iOS.
- [ ] **Bundle ID:** must match `app.json` → `ios.bundleIdentifier` = `com.chattatutor.mobile`. If not registered yet, first create it at developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → **+**.
- [ ] **Name:** `ChattaTutor` (must be globally unique on App Store — verify availability).
- [ ] **Primary language:** English (U.S.).
- [ ] **SKU:** `chattatutor-mobile-001` (internal, never shown).
- [ ] **User access:** Full Access (unless you want to limit it for a teammate).

### 1.3 Bundle ID capabilities 🔴 V1

In developer.apple.com → Identifiers → tap `com.chattatutor.mobile` → enable these capabilities:

- [ ] 🔴 **Sign In with Apple** — required because Google OAuth is enabled (Apple guideline 4.8).
- [ ] 🔴 **In-App Purchase** — required for RevenueCat IAP.
- [ ] 🟡 **Push Notifications** — only enable if shipping push in V1 (currently planned). Otherwise leave off to reduce review scrutiny.
- [ ] 🟢 **Associated Domains** — needed for Universal Links (Phase 7.7, V1.1).

### 1.4 App Store Connect API key — for RevenueCat 🔴 V1

This key lets RevenueCat pull product / pricing info from your App Store Connect account.

- [ ] App Store Connect → **Users and Access** → **Keys** tab → **In-App Purchase** sub-tab → **+**.
- [ ] **Name:** `RevenueCat`.
- [ ] **Access:** In-App Purchase.
- [ ] Click Generate.
- [ ] **Download the `.p8` file immediately** — Apple will NOT let you download it again.
- [ ] **Output:** record three values somewhere safe (and into RevenueCat dashboard, see §3):
  - **Key ID** (10 chars, e.g. `K7AB1CD234`)
  - **Issuer ID** (UUID, e.g. `69a6de89-1234-47e3-e053-5b8c7c11a4d1`)
  - **`.p8` file contents** (PEM-style RSA private key)

### 1.5 Subscription products 🔴 V1

App Store Connect → your app → **Monetization** → **Subscriptions** → create a **Subscription Group** named `ChattaTutor Plans`, then add two auto-renewing subscriptions inside it:

- [ ] **Pro** — Product ID **MUST** be exactly `com.chattatutor.mobile.pro.monthly` (matches `lib/iap.ts:113`).
  - Reference Name: `ChattaTutor Pro Monthly`
  - Duration: 1 Month
  - Price: $4.99 USD (Apple auto-converts to other currencies)
  - Localizations (at least English): Display Name `Pro`, Description `AI tutor for any document. Unlimited courses, faster generation, weekly leagues.`
  - Review screenshot: one screenshot of the paywall (1024×1536 or similar)
- [ ] **Premium** — Product ID **MUST** be exactly `com.chattatutor.mobile.premium.monthly` (matches `lib/iap.ts:113`).
  - Reference Name: `ChattaTutor Premium Monthly`
  - Duration: 1 Month
  - Price: $9.99 USD
  - Localizations: Display Name `Premium`, Description `Everything in Pro + Tutor Brief voice, advanced customization, priority models.`
  - Review screenshot: paywall image
- [ ] **Status of both products:** "Ready to Submit" (Apple reviews them in-line with the binary; they don't ship until the binary ships).
- [ ] **Tax category:** "App Store Software" (default).
- [ ] **App Store availability:** All territories.

### 1.6 Paid Apps Agreement, banking, tax 🔴 V1

You cannot ship paid subscriptions until all three are signed/active.

- [ ] App Store Connect → **Business** → **Paid Apps Agreement** → sign.
- [ ] **Banking:** add a USD-accepting bank account (or local currency for your region) with SWIFT/IBAN. Apple deposits monthly.
- [ ] **Tax forms:**
  - W-8BEN (non-US individuals / orgs) — fill country, tax ID, no permanent establishment in US.
  - W-9 (US tax residents) — SSN or EIN.
  - Apple's wizard walks you through it; expect 1–3 days for tax form approval.
- [ ] **Output:** Bank icon green, tax forms "Active," agreement "Active" in Business tab.

### 1.7 App icon & screenshots 🔴 V1

- [ ] **App icon:** 1024×1024 PNG, NO transparency, NO rounded corners (Apple applies them), NO alpha channel. Upload in App Store Connect → App Information → App Icon.
- [ ] **Screenshots** — at minimum 3, max 10 per size:
  - **6.7" / 6.9" iPhone** (1290×2796) — REQUIRED for current submissions (iPhone 15/16 Pro Max).
  - **6.5" iPhone** (1242×2688 or 1284×2778) — REQUIRED (fallback for iPhone XS Max / 11 Pro Max).
  - **5.5" iPhone** (1242×2208) — STILL REQUIRED by Apple as of 2025 (fallback for iPhone 8 Plus). Yes, even though no one buys an iPhone 8 anymore.
  - **iPad Pro 12.9"** (2048×2732) — only if `app.json` → `ios.supportsTablet: true` (yours is). Either submit iPad screenshots or set `supportsTablet: false` before submission.
- [ ] **Optional:** App Preview videos (15–30s, .mov H.264, max 500MB). Boosts conversion ~15% but not required.

### 1.8 Store listing copy 🔴 V1

- [ ] **App Name** (30 chars): e.g. `ChattaTutor: AI Tutor`
- [ ] **Subtitle** (30 chars): e.g. `Turn any PDF into a course`
- [ ] **Promotional Text** (170 chars, editable post-launch without re-review)
- [ ] **Description** (4000 chars max): hook → what it does → who it's for → premium features → CTA → support contact
- [ ] **Keywords** (100 chars total, comma-separated, e.g.): `ai tutor,pdf,course,study,quiz,flashcards,knowmad,learning,daily drill,school`
- [ ] **Support URL:** `https://chattatutor.com/support`
- [ ] **Marketing URL:** `https://chattatutor.com`
- [ ] **Privacy Policy URL:** `https://chattatutor.com/privacy` (must be live before submission)
- [ ] **Category:** Primary `Education`, Secondary `Productivity`
- [ ] **Content Rating** (4+, 9+, 12+, 17+): probably **12+** (occasional sarcastic "roast" tone preset + UGC in hives / community feed).

### 1.9 Privacy Nutrition Label 🔴 V1

App Store Connect → App Privacy → declare every data type honestly. Be conservative: declare more rather than less.

- [ ] **Identifiers:** User ID (your `User.id`), Email Address.
- [ ] **Contact Info:** Email (if you ask for one in profile).
- [ ] **User Content:** Uploaded documents (PDFs), photos (avatars if any), user-typed messages (hives/community), in-app actions (course progress).
- [ ] **Usage Data:** Product Interaction (if PostHog ships).
- [ ] **Diagnostics:** Crash Data, Performance Data (if Sentry ships).
- [ ] **All declared as "Linked to user"** (because you authenticate). NOT "Used for tracking" unless you do cross-app/cross-website tracking (you don't, currently).

### 1.10 App Review information 🔴 V1

App Store Connect → App Review Information:

- [ ] **Demo account:** create a Premium-tier account specifically for Apple reviewer. Username + password. Email yourself the credentials to confirm they work. Keep this account permanently active.
- [ ] **Contact:** First name, last name, **phone** (Apple sometimes calls), email.
- [ ] **Notes for reviewer:**
  ```
  ChattaTutor is a multi-platform learning app. Sign in with the test account
  provided. The home screen shows your active courses and daily practice. Premium
  features (Tutor Brief voice, advanced customization, weekly leagues) are unlocked
  via the in-app subscription paywall (Profile → Subscribe). Two subscription tiers
  exist: Pro ($4.99/mo) and Premium ($9.99/mo). All subscriptions on iOS are
  processed via Apple StoreKit (RevenueCat SDK). Web and Android users may
  alternatively subscribe at chattatutor.com using Flutterwave. iOS users see only
  the StoreKit purchase flow.
  ```
- [ ] **Sign In with Apple:** Apple's reviewers WILL test SIWA. Confirm it works end-to-end on the demo build before submission.

---

## 2. Google Play Console

> **V1 cost:** $25 USD one-time (lifetime account)
> **Dashboard:** <https://play.google.com/console>

### 2.1 Developer account 🔴 V1

- [ ] Sign up at <https://play.google.com/console/signup> with `support@chattatutor.com` (or a dedicated google account).
- [ ] Pay $25 USD one-time registration fee.
- [ ] **Identity verification:** Google requires a government ID + selfie now (mandatory since 2023). Expect 1–7 days for verification.
- [ ] **Phone verification** via SMS.
- [ ] If signing up as an org: provide D-U-N-S number (or business registration document).

### 2.2 Create the app record 🔴 V1

- [ ] Play Console → **All apps** → **Create app**.
- [ ] **App name:** `ChattaTutor`.
- [ ] **Default language:** English (United States).
- [ ] **App or game:** App.
- [ ] **Free or paid:** Free (subscriptions are in-app purchases).
- [ ] Accept Developer Program Policies + US Export laws declarations.

### 2.3 App Signing 🔴 V1

- [ ] **Use Google Play App Signing** (default, recommended) — Google manages your release signing key in their HSM, you upload AAB signed with an upload key.
- [ ] EAS handles the upload key automatically. To get the signing fingerprint for `assetlinks.json` (Universal Links, V1.1):
  ```
  eas credentials --platform android
  ```
  → choose "App-signing key" → "Show credentials" → copy the **SHA-256 certificate fingerprint** (`AA:BB:CC:DD:...`).

### 2.4 Subscription products 🟡 V1 (Android stays on Flutterwave for V1)

> **Decision locked:** Android V1 uses Flutterwave (mobile redirects to web checkout). You can skip §2.4 entirely
> for V1 and move it to V1.1 when you bring Google Play Billing online via RevenueCat. Listed for completeness.

- [ ] 🟢 V1.1: Play Console → Monetize → Products → Subscriptions → Create subscription with product ID `com.chattatutor.mobile.pro.monthly` and `com.chattatutor.mobile.premium.monthly`.
- [ ] 🟢 V1.1: Match pricing to App Store ($4.99 / $9.99).
- [ ] 🟢 V1.1: Generate a Google Play service account JSON for RevenueCat (Play Console → API Access → grant RevenueCat's service account "View financial data, orders, and cancellation survey responses" + "Manage orders and subscriptions").

### 2.5 Adaptive icon & feature graphic 🔴 V1

- [ ] **Adaptive icon:**
  - **Foreground PNG** 432×432, transparent background, content within 264×264 safe zone.
  - **Background** PNG 432×432 OR a solid hex color.
- [ ] **Feature graphic** 1024×500 PNG, no transparency. Shown at top of Play Store listing.

### 2.6 Screenshots 🔴 V1

- [ ] **Phone:** min 2, max 8. 16:9 or 9:16 ratios. Recommended **1080×1920** or **1440×2560**.
- [ ] **7" tablet:** min 1, max 8. Recommended **1200×1920**. (Only if marketing for tablets.)
- [ ] **10" tablet:** min 1, max 8. Recommended **1920×1200** or **2560×1600**. (Only if marketing for tablets.)

### 2.7 Store listing 🔴 V1

- [ ] **Short description** (80 chars): e.g. `Turn any PDF into an AI-tutored course with quizzes, flashcards, and leagues.`
- [ ] **Full description** (4000 chars): same content as App Store description, lightly re-flowed for Play format.
- [ ] **Category:** Education.
- [ ] **Tags** (max 5): `Educational`, `AI`, `Study`, `Quiz`, `Learning`.
- [ ] **Email** (visible on listing): `support@chattatutor.com`.
- [ ] **Website:** `https://chattatutor.com`.
- [ ] **Phone** (optional): only if you want to publish it.
- [ ] **Privacy Policy URL:** `https://chattatutor.com/privacy`.

### 2.8 Content Rating questionnaire (IARC) 🔴 V1

- [ ] App Content → Content rating → fill IARC questionnaire honestly.
- [ ] Flag: "Users can interact with other users" = yes (hives, community, challenges).
- [ ] Flag: "Users can share location" = no.
- [ ] Flag: "Users can share contact info" = no.
- [ ] Expected rating: **Teen** (13+).

### 2.9 Data safety form 🔴 V1

> Must match your Privacy Policy **verbatim**. Inconsistencies are the #1 Play rejection reason.

- [ ] **Data collected:** Email, User ID, App activity (PostHog), Crash logs (Sentry), Approximate location (IP-only, via Flutterwave if applicable).
- [ ] **Data shared with third parties:** list **every** vendor name — Flutterwave, RevenueCat, Apple, OpenAI, Google AI (Gemini), Groq, SendGrid, AWS, Neon, Sentry, PostHog (if shipping), ElevenLabs.
- [ ] **Data encrypted in transit:** Yes (HTTPS).
- [ ] **Users can request deletion:** Yes — see §1.2 in-app delete-account flow.

### 2.10 Target audience 🔴 V1

- [ ] App Content → Target audience → "13 and older" (NOT 12 and under; COPPA compliance is a separate, expensive process).

### 2.11 Target API level 🔴 V1

- [ ] Confirm `eas build --profile production` produces an AAB targeting **Android 14 (API 34)** or higher (Play policy as of 2024-08-31).
- [ ] Verify in build output: `targetSdkVersion 34`.

---

## 3. RevenueCat (iOS IAP)

> **V1 cost:** Free up to $2.5K MRR, then 1% above.
> **Dashboard:** <https://app.revenuecat.com>
> **Code references:** `chattatutor_mobile/lib/iap.ts`, `chattatutor_backend/src/controllers/revenuecatController.ts`

### 3.1 Create project 🔴 V1

- [ ] Dashboard → Projects → **+ New** → name: `ChattaTutor`.
- [ ] Add **iOS app** under the project:
  - **App name:** `ChattaTutor iOS`
  - **App Store bundle ID:** `com.chattatutor.mobile` (must match `app.json`)
  - **App Store Connect API key** — upload the `.p8` from §1.4, paste Key ID + Issuer ID.

### 3.2 Entitlements 🔴 V1

Entitlements are RevenueCat's abstraction over "which tier did this user pay for?". The backend reads
these names from the webhook payload.

- [ ] Create entitlement **`pro_access`**.
- [ ] Create entitlement **`premium_access`**.

### 3.3 Products — sync from App Store Connect 🔴 V1

- [ ] Dashboard → Products → **Sync from App Store Connect**. RevenueCat will pull both subscription products via the API key.
- [ ] Confirm both products appear:
  - `com.chattatutor.mobile.pro.monthly`
  - `com.chattatutor.mobile.premium.monthly`

### 3.4 Attach products to entitlements 🔴 V1

- [ ] Click product `com.chattatutor.mobile.pro.monthly` → Entitlements → attach **`pro_access`**.
- [ ] Click product `com.chattatutor.mobile.premium.monthly` → Entitlements → attach **BOTH** `pro_access` AND `premium_access` (Premium is a superset of Pro, so the backend can short-circuit access checks by reading `pro_access`).

### 3.5 Offering 🔴 V1

- [ ] Dashboard → Offerings → create offering **`default`** (this is the identifier the SDK pulls).
- [ ] Add **2 packages** to it:
  - Package identifier `$rc_monthly` → product `com.chattatutor.mobile.pro.monthly`
  - Custom identifier (e.g. `premium_monthly`) → product `com.chattatutor.mobile.premium.monthly`
- [ ] **Make `default` the current offering** (toggle).

### 3.6 Public SDK key → mobile env 🔴 V1

- [ ] Dashboard → Project → API Keys → **Public app-specific API keys** → iOS → copy the value.
- [ ] **Key shape:** starts with **`appl_`** followed by ~32 lowercase alphanumerics. Example: `appl_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456`.
- [ ] Paste into `chattatutor_mobile/.env`:
  ```
  EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

### 3.7 Webhook — backend reconciliation 🔴 V1

- [ ] Dashboard → Project → Integrations → Webhooks → **+ New webhook**.
- [ ] **URL:** `https://api.chattatutor.com/api/payments/webhooks/revenuecat` (production) — or your ngrok / dev tunnel for testing.
- [ ] **Authorization header:** generate a long random string (e.g. `openssl rand -hex 32`). Paste it into the dashboard field labeled "Authorization header value".
- [ ] **Events:** enable ALL event types (Initial Purchase, Renewal, Cancellation, Uncancellation, Non Renewing Purchase, Expiration, Billing Issue, Product Change, Subscriber Alias, Transfer, Refund).
- [ ] Paste the same Authorization header value into `chattatutor_backend/.env`:
  ```
  REVENUECAT_WEBHOOK_AUTH_HEADER=<the same long random string>
  ```
- [ ] **Test:** dashboard → Send Test Event. Backend logs should show `[revenuecat] webhook received: TEST`.

### 3.8 Sandbox testers (App Store Connect side) 🔴 V1

- [ ] App Store Connect → Users and Access → **Sandbox Testers** → **+**.
- [ ] Create at least 2 sandbox testers (one for normal flow, one for restore-purchases). Use any non-real email like `tester1@chattatutor.com`.
- [ ] **On your test device:** Settings → App Store → Sandbox Account → sign in with the sandbox tester. Sandbox purchases never charge real money.

### 3.9 RevenueCat audit log 🟡 V1

- [ ] After your first sandbox purchase: Dashboard → Customers → find your sandbox user → confirm entitlement `pro_access` or `premium_access` is active.
- [ ] Backend logs should show webhook event types and the user's plan being updated.

---

## 4. Flutterwave (web & Android billing)

> **V1 cost:** No flat fee. Transaction fees: 1.4% local cards, 3.8% international, capped at NGN 2000.
> **Dashboard:** <https://dashboard.flutterwave.com>
> **Note:** Account is currently in **test mode** (keys prefixed `_TEST`). Live keys require KYC.

### 4.1 Account verification & KYC 🔴 V1

- [ ] Dashboard → Settings → **Compliance** → submit:
  - Business registration (or personal ID for sole proprietorship)
  - Proof of address (utility bill, < 3 months old)
  - Director/owner ID
  - **NIN** (Nigerian National Identification Number) if Nigerian account holder
  - Bank statement (last 3 months) — for payout account
- [ ] Verification: 2–10 business days.
- [ ] Output: account moves from "Sandbox" to "Approved Live."

### 4.2 Live API keys 🔴 V1

- [ ] Dashboard → Settings → **API Keys** → toggle **Live mode** (top-right).
- [ ] Copy three values:
  - **Public key** — `FLWPUBK-...-X` (≈ 41 chars between prefix and suffix). Used client-side for hosted checkout.
  - **Secret key** — `FLWSECK-...-X`. Used server-side for charges. **NEVER expose to mobile binary.**
  - **Encryption key** — short hex (~24 chars, no prefix). Used for AES card-encryption on raw-card endpoints.
- [ ] Paste into `chattatutor_backend/.env`:
  ```
  FLUTTERWAVE_SECRET_KEY=FLWSECK-<live>-X
  FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-<live>-X
  FLUTTERWAVE_ENCRYPTION_KEY=<live hex>
  ```
- [ ] Comment out the `_TEST` variants in `.env` (already done — uncomment live, comment test).

### 4.3 Webhook secret 🔴 V1

- [ ] Dashboard → Settings → **Webhooks** → set URL: `https://api.chattatutor.com/api/payments/webhooks/flutterwave`.
- [ ] **Secret hash:** generate a 32+ char random string. Paste into dashboard AND into backend:
  ```
  FLUTTERWAVE_WEBHOOK_SECRET_HASH=<32+ char random>
  ```
- [ ] The backend handler at `flutterwaveController.ts` compares incoming `verif-hash` header against this exact value.

### 4.4 Redirect URL 🔴 V1

- [ ] Backend `.env`:
  ```
  FLUTTERWAVE_REDIRECT_URL=https://chattatutor.com/subscription-callback
  ```
- [ ] Verify the page exists (it does — `chattatutor_frontend/app/subscription-callback/page.tsx`).

### 4.5 Payment options + currency 🔴 V1

- [ ] Confirm dashboard → Settings → **Payment methods** → enable: Card, Bank Transfer (optional), Mobile Money (optional).
- [ ] Backend `.env`:
  ```
  FLUTTERWAVE_CURRENCY=USD
  FLUTTERWAVE_COUNTRY=US
  FLUTTERWAVE_HOSTED_PAYMENT_OPTIONS=card
  ```

### 4.6 Payout account 🔴 V1

- [ ] Dashboard → Settings → **Banking** → add USD-accepting bank account (or NGN if Nigeria-based with NGN payouts).
- [ ] Confirm payout schedule (weekly is typical).

### 4.7 Production sanity check 🔴 V1

- [ ] After switching to live keys: do **one real $4.99 charge** on a test card (use your own card; refund immediately via dashboard) to confirm:
  - Charge succeeds
  - Webhook fires
  - User upgrades to Pro
  - Refund webhook fires
  - User downgrades back to free

---

## 5. Dodo Payments (alternate provider, currently live)

> **Currently configured in `.env`.** Not clear if active in V1. If not used, remove the env vars to reduce surface area.
> **Dashboard:** <https://dashboard.dodopayments.com>

### 5.1 Decide: keep or remove? 🟡 V1

- [ ] If Dodo is the primary payment rail (rather than Flutterwave): treat it as the production payment provider and verify keys live.
- [ ] If Dodo is unused: comment out `DODO_*` in backend `.env` to avoid confusion and reduce attack surface.

---

## 6. Stripe (web subscription rail)

> **V1 cost:** No flat fee. 2.9% + $0.30 per transaction (US).
> **Dashboard:** <https://dashboard.stripe.com>
> **Currently using test keys** (`sk_test_...`).

### 6.1 Activate live mode 🔴 V1 (if Stripe is in the V1 critical path)

- [ ] Dashboard → Activate Account → submit business details, banking, identity.
- [ ] Verification: 1–3 days.
- [ ] Once live: Dashboard → Developers → API keys → reveal **live secret key** (`sk_live_...`).

### 6.2 Live keys → backend env 🔴 V1

```
STRIPE_SECRET_KEY=sk_live_<live key>
STRIPE_WEBHOOK_SECRET=whsec_<live webhook secret>
STRIPE_PREMIUM_PRICE_ID=price_<live premium price>
```

### 6.3 Live products & prices 🔴 V1

- [ ] Dashboard → Products → create `ChattaTutor Pro` and `ChattaTutor Premium` products.
- [ ] Create recurring prices: $4.99/mo and $9.99/mo respectively.
- [ ] **Note:** product/price IDs differ between test and live mode — `price_*` in test does NOT match `price_*` in live.
- [ ] Copy live `price_id` (starts `price_`) into `STRIPE_PREMIUM_PRICE_ID` and any other env var that references a Stripe price.

### 6.4 Webhook endpoint 🔴 V1

- [ ] Dashboard → Developers → Webhooks → **+ Add endpoint**.
- [ ] URL: `https://api.chattatutor.com/api/payments/webhooks/stripe`
- [ ] Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
- [ ] Copy the signing secret (`whsec_...`) → backend `.env` as `STRIPE_WEBHOOK_SECRET`.

---

## 7. Domain, DNS & web hosting

> **V1 cost:** Domain ~$12/year, hosting depends on provider.

### 7.1 Domain ownership confirmed 🔴 V1

- [ ] Confirm `chattatutor.com` is owned, registrar access available, expiration > 6 months out.
- [ ] WHOIS privacy enabled.

### 7.2 DNS records 🔴 V1

Required records:

- [ ] `chattatutor.com` → A or CNAME to web hosting (Vercel/Netlify/Render).
- [ ] `www.chattatutor.com` → CNAME to `chattatutor.com`.
- [ ] `api.chattatutor.com` → A or CNAME to backend hosting (Render/Railway/Fly.io).
- [ ] MX records for `support@chattatutor.com` email (PrivateEmail / Google Workspace / Microsoft 365).
- [ ] SPF, DKIM, DMARC records for SendGrid OR your SMTP host — required for deliverability:
  - SPF: `v=spf1 include:sendgrid.net ~all` (or equivalent for your provider)
  - DKIM: SendGrid dashboard → Settings → Sender Authentication → set up domain → CNAME records
  - DMARC: `v=DMARC1; p=quarantine; rua=mailto:support@chattatutor.com`

### 7.3 SSL certificate 🔴 V1

- [ ] Verify `https://chattatutor.com` and `https://api.chattatutor.com` both serve valid certs (Let's Encrypt auto-renews on most hosts; verify).
- [ ] No mixed content warnings.

### 7.4 `.well-known` files for Universal Links 🟢 V1.1 (Phase 7.7)

> Deferred to V1.1. Listed here so the web team knows what's coming.

- [ ] Serve `https://chattatutor.com/.well-known/apple-app-site-association` with `Content-Type: application/json`, NO extension, NO redirect, NO auth:
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
- [ ] Serve `https://chattatutor.com/.well-known/assetlinks.json`:
  ```json
  [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.chattatutor.mobile",
      "sha256_cert_fingerprints": ["<SHA-256 from §2.3>"]
    }
  }]
  ```
- [ ] Verify with `curl -i https://chattatutor.com/.well-known/apple-app-site-association` (must return 200, correct content-type).
- [ ] Verify with Google's tool: <https://developers.google.com/digital-asset-links/tools/generator>.

---

## 8. Email — SMTP / SendGrid / Postmark

> **Current setup:** SendGrid + Namecheap PrivateEmail SMTP (`support@chattatutor.com`).
> **Dashboard (SendGrid):** <https://app.sendgrid.com>

### 8.1 SendGrid account 🔴 V1

- [ ] Account active, in good standing (no spam complaints in last 30 days).
- [ ] **Sender verification** — Settings → Sender Authentication → verify `support@chattatutor.com` as a single sender, OR authenticate the whole `chattatutor.com` domain (recommended — needed for >2000 emails/day).
- [ ] Domain authentication adds 3 DNS CNAME records to `chattatutor.com` (already partly done if MX works).

### 8.2 API key 🔴 V1

- [ ] Dashboard → Settings → API Keys → **Create API Key** → Full Access (or restricted to Mail Send).
- [ ] **Key shape:** `SG.xxxxx.yyyyy` (SendGrid prefix `SG.`, then 22-char ID, then 43-char secret).
- [ ] Backend `.env`:
  ```
  SENDGRID_API_KEY=SG.<id>.<secret>
  EMAIL_PROVIDER=sendgrid
  SENDGRID_FROM=support@chattatutor.com
  ```

### 8.3 Deliverability sanity 🟡 V1

- [ ] Send test emails to Gmail, Outlook, Yahoo addresses → confirm they hit inbox, not spam.
- [ ] Check with <https://www.mail-tester.com> — score >9/10 expected.

---

## 9. Google Cloud (OAuth + Gemini)

> **Dashboard:** <https://console.cloud.google.com>

### 9.1 OAuth Client IDs 🔴 V1

For Google Sign In on web + mobile. Currently using one shared client ID across all three platforms — **must split for production**.

- [ ] Console → APIs & Services → Credentials.
- [ ] **OAuth 2.0 Client IDs** — create THREE separate clients in the same project:
  - **Web client** — type "Web application", authorized origins `https://chattatutor.com`, `https://www.chattatutor.com`, `http://localhost:3000`, redirect URIs `https://chattatutor.com/auth/callback/google`. Used by frontend + as fallback in Expo Go.
  - **iOS client** — type "iOS", bundle ID `com.chattatutor.mobile`. Used by EAS standalone iOS builds.
  - **Android client** — type "Android", package `com.chattatutor.mobile`, SHA-1 cert fingerprint from `eas credentials --platform android` → Upload Key.
- [ ] Mobile `.env`:
  ```
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>.apps.googleusercontent.com
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id>.apps.googleusercontent.com
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android client id>.apps.googleusercontent.com
  ```
- [ ] Backend `.env` (for token verification — use web client ID):
  ```
  GOOGLE_CLIENT_ID=<web client id>.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-<secret>
  ```

### 9.2 OAuth consent screen 🔴 V1

- [ ] Console → OAuth consent screen → **Publish** (move from Testing to Production).
- [ ] If only requesting basic scopes (email, profile): no Google verification needed.
- [ ] If requesting sensitive scopes (Gmail, Drive, etc.): Google verification takes 4–6 weeks. Avoid.

### 9.3 Gemini API key 🟡 V1

- [ ] AI Studio → <https://aistudio.google.com/app/apikey> → Create API key.
- [ ] **Key shape:** `AIza...` followed by ~35 chars.
- [ ] Backend `.env`:
  ```
  GEMINI_API_KEY=AIza<35 chars>
  ```
- [ ] Set quota & billing alerts in Cloud Console → Billing → Budgets & alerts.

---

## 10. Firebase / APNs (push notifications)

> **V1 cost:** Free (Firebase Cloud Messaging is free; APNs is included in Apple Developer Program).
> **Dashboards:** <https://console.firebase.google.com> + <https://developer.apple.com/account>

### 10.1 Firebase project 🔴 V1 (if push ships in V1)

- [ ] Firebase Console → Add project → name `chattatutor` (or use existing if you have one).
- [ ] Add Android app:
  - **Package name:** `com.chattatutor.mobile`
  - **SHA-1 fingerprint** (from `eas credentials --platform android` → Upload Key) — REQUIRED for Google Sign-In to work too.
  - Download `google-services.json` → place at `chattatutor_mobile/google-services.json`.
- [ ] `app.json` → add `"android": { "googleServicesFile": "./google-services.json" }`.

### 10.2 APNs auth key 🔴 V1 (if push ships in V1)

- [ ] developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → **+** → enable "Apple Push Notifications service (APNs)".
- [ ] **Name:** `ChattaTutor APNs`.
- [ ] Download the `.p8` file (only once).
- [ ] Note the **Key ID** (10 chars).
- [ ] Note the **Team ID** (10 chars, top-right of developer.apple.com).
- [ ] Upload `.p8` + Key ID + Team ID to **Firebase Console → Project Settings → Cloud Messaging → APNs Authentication Key**. This lets FCM relay pushes to iOS via Apple.
- [ ] EAS will pick up the APNs config automatically when building iOS production binaries.

### 10.3 Expo Push setup 🔴 V1 (if push ships in V1)

- [ ] Expo handles the FCM ↔ APNs bridge via EAS-managed push credentials. To check / refresh:
  ```
  eas credentials --platform ios  → Push Notifications (P8) → Configure
  eas credentials --platform android  → FCM Server Key → Configure
  ```
- [ ] No additional environment variables needed in mobile binary; tokens are issued at runtime via `expo-notifications`.

---

## 11. Sentry (error reporting)

> **V1 cost:** Free up to 5K events/month. ~$29/mo for Team plan.
> **Dashboard:** <https://sentry.io>

### 11.1 Project setup 🟡 V1

- [ ] Sentry → New Project → Platform "React Native" → name `chattatutor-mobile`.
- [ ] (If you also want backend errors): create a second project `chattatutor-backend` (Node.js).
- [ ] Copy the DSN (URL).
- [ ] **DSN shape:** `https://<32-char hash>@<org-slug>.ingest.sentry.io/<project-id>`.
- [ ] Mobile `.env`:
  ```
  EXPO_PUBLIC_SENTRY_DSN=https://...@...ingest.sentry.io/...
  ```

### 11.2 Source map upload 🟡 V1

- [ ] Sentry → Project Settings → Auth Tokens → create token with `project:releases` scope.
- [ ] Configure `sentry.properties` for EAS build (sentry-expo handles this in CI).

### 11.3 Alerting 🟡 V1

- [ ] Sentry → Alerts → create rule: "Alert when crash-free rate < 99.5% for 1h" → send to Slack / email.

---

## 12. PostHog (analytics)

> **V1 cost:** Free up to 1M events/month (cloud).
> **Dashboard:** <https://app.posthog.com>

### 12.1 Project setup 🟡 V1

- [ ] PostHog → New project → name `chattatutor`.
- [ ] Copy the **Project API Key**.
- [ ] **Key shape:** `phc_...` followed by ~40 chars.
- [ ] Mobile `.env`:
  ```
  EXPO_PUBLIC_POSTHOG_KEY=phc_...
  EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # or eu.i.posthog.com
  ```

### 12.2 ATT consideration 🟡 V1

- [ ] If PostHog calls `identify()` linking user IDs across sessions, you may need ATT prompt on iOS. Simpler V1 alternative: anonymous-only events (`posthog.capture()` without `identify`), which means no ATT prompt.

### 12.3 Reverse proxy 🟢 V1.1

- [ ] Set up `https://analytics.chattatutor.com` as a reverse proxy to PostHog Cloud → avoids ad-blocker false positives. <https://posthog.com/docs/advanced/proxy>.

---

## 13. Neon (Postgres) & MongoDB Atlas

> **Currently:** Neon for relational data, Mongo for some auxiliary data (whiteboard engine).

### 13.1 Neon (Postgres) 🔴 V1

- [ ] **Dashboard:** <https://console.neon.tech>
- [ ] Production project active.
- [ ] **Production branch protected** (no `prisma migrate dev` allowed against it — use `prisma migrate deploy`).
- [ ] **Connection string** in `DATABASE_URL` of production env (with `sslmode=require&pgbouncer=true`).
- [ ] **Backups** enabled (Neon has 7-day point-in-time recovery on paid plans).
- [ ] **Compute autoscaling** sized appropriately. Free tier suspends after 5 min of inactivity — fine for dev, painful for production.
- [ ] **Migration drift resolved** — there are two migrations applied to Neon that are missing from `prisma/migrations/`: `20260524120000_add_push_devices` and `20260526120000_phase_65_rank_unification`. Either pull them down from Neon's history or apply via shadow DB.

### 13.2 MongoDB Atlas 🟡 V1

- [ ] **Dashboard:** <https://cloud.mongodb.com>
- [ ] Production cluster active.
- [ ] **IP whitelist** includes production backend host (or `0.0.0.0/0` if backend host has rotating IPs).
- [ ] **Backups** enabled (Atlas free tier doesn't include backups; upgrade to M10+ if critical).
- [ ] Confirm if `MONGODB_URI` is still in use; if WHITEBOARD_ENGINE=v3 doesn't need Mongo, remove the env var.

---

## 14. AWS S3 + IAM

> **V1 cost:** Pay-as-you-go. Expect <$5/mo for V1 traffic.
> **Dashboard:** <https://console.aws.amazon.com>

### 14.1 S3 bucket 🔴 V1

- [ ] Bucket `chattatutor-s3` exists in `us-east-1`.
- [ ] **Public access:** all four block-public-access toggles ON (the bucket is accessed only via presigned URLs).
- [ ] **CORS** configured to allow PUT from web + mobile origins:
  ```json
  [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["https://chattatutor.com", "https://www.chattatutor.com", "*"],
    "ExposeHeaders": ["ETag"]
  }]
  ```
- [ ] **Lifecycle rule:** delete uploads older than 30 days from `tmp/` prefix (cost control).

### 14.2 IAM user / access keys 🔴 V1

- [ ] IAM → Users → user has policy granting `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::chattatutor-s3/*` only — NOT bucket-level admin.
- [ ] **Key rotation:** rotate access keys every 90 days. Current keys (in `.env`) should be rotated before public launch.
- [ ] **Key shape:** Access Key ID `AKIA...` (20 chars), Secret `<40 chars>`.

---

## 15. Redis (Upstash / Redis Cloud)

> **Currently:** Both Redis Cloud and Upstash configured. Pick one for production.

### 15.1 Decide which 🟡 V1

- [ ] Upstash is serverless (REST API, pay-per-request). Good for sporadic background jobs.
- [ ] Redis Cloud is dedicated instance (TCP, predictable latency). Good if you run BullMQ or heavy queues.
- [ ] Decide which is V1 production. Comment out the other's env vars to reduce surface area.

---

## 16. ElevenLabs (TTS)

> **V1 cost:** Starter $5/mo for 30K characters, Creator $22/mo for 100K characters.
> **Dashboard:** <https://elevenlabs.io>

### 16.1 API key 🔴 V1 (if Tutor Brief voice ships in V1)

- [ ] Profile → API Keys → copy key.
- [ ] **Key shape:** `sk_<32-char hex>`.
- [ ] Backend `.env`:
  ```
  ELEVENLABS_API_KEY=sk_<32 chars>
  ```
- [ ] Set monthly character usage alerts in ElevenLabs dashboard (avoid surprise overage).

---

## 17. OpenAI / Groq / Gemini (LLMs)

### 17.1 OpenAI 🔴 V1

- [ ] **Dashboard:** <https://platform.openai.com>
- [ ] API key active.
- [ ] **Key shape:** `sk-proj-<long string>` (project-scoped) or legacy `sk-<long string>`.
- [ ] **Usage limits** set on the key (e.g. $100/mo cap to prevent runaway costs).
- [ ] **Billing** account active, payment method on file.

### 17.2 Groq 🟡 V1

- [ ] **Dashboard:** <https://console.groq.com>
- [ ] API key active.
- [ ] **Key shape:** `gsk_<long string>`.
- [ ] Free tier exists but rate-limited; consider paid plan for V1.

### 17.3 Gemini — see §9.3.

---

## 18. Legal & policy documents

> Apple and Google both require hosted, accessible documents. Apple will read them during review.

### 18.1 Privacy Policy 🔴 V1

- [ ] Hosted at `https://chattatutor.com/privacy`.
- [ ] **Must declare:** every data type collected (matches Apple Privacy Nutrition + Play Data Safety verbatim).
- [ ] **Must declare:** every third-party processor (RevenueCat, Apple, Flutterwave, Stripe, OpenAI, Google AI, Groq, AWS, Neon, MongoDB, SendGrid, Sentry, PostHog, ElevenLabs).
- [ ] **Must declare:** how to request data deletion (in-app + email).
- [ ] **Must declare:** how children under 13 are handled ("we do not knowingly collect data from users under 13" + delete on discovery).
- [ ] **Last updated** date present and current.

### 18.2 Terms of Service 🔴 V1

- [ ] Hosted at `https://chattatutor.com/terms`.
- [ ] **Must prohibit:** abuse, harassment, hate speech, NSFW content, illegal content, scraping, automation.
- [ ] **Must specify:** subscription terms (auto-renewal, cancellation, refund policy).
- [ ] **Must specify:** AI-generated content disclaimer (outputs may be wrong, do not rely as legal/medical/financial advice).
- [ ] **Must specify:** governing law / jurisdiction.

### 18.3 EULA (optional for App Store) 🟡 V1

- [ ] If you provide a custom EULA, link from App Store Connect → App Information → License Agreement. Otherwise Apple's default applies.

### 18.4 UGC moderation policy 🔴 V1

- [ ] Document publicly (in Terms or a separate page) that you accept reports of UGC violations and respond within 24 hours.
- [ ] Set up internal moderation queue (a Slack channel + a backend table is enough for V1).

---

## 19. EAS Build & EAS Submit

> **V1 cost:** Free tier: 30 builds/month. Production plan: $99/mo for unlimited.
> **Dashboard:** <https://expo.dev>

### 19.1 EAS project linked 🔴 V1

- [ ] `app.json` → `extra.eas.projectId` = `2ca93a66-2e97-488c-9564-989ef8388cdd` ✅ (already set).
- [ ] Logged into the right Expo account (`expo whoami` → should be `layoolar`).

### 19.2 EAS credentials 🔴 V1

- [ ] iOS Distribution Certificate generated (`eas credentials --platform ios`).
- [ ] iOS Provisioning Profile generated.
- [ ] iOS Push Notification Key uploaded (see §10.2).
- [ ] Android Upload Keystore generated.
- [ ] Android FCM Server Key uploaded (see §10.1).

### 19.3 EAS Submit credentials 🔴 V1

- [ ] **iOS:** App Store Connect API key for `eas submit`. Different from the RevenueCat one — create another at App Store Connect → Users and Access → Keys → **App Manager** role.
- [ ] **Android:** Google Play service account JSON. Create at <https://console.cloud.google.com> → IAM → Service accounts → grant access in Play Console → API access.
- [ ] `eas.json` → `submit.production.ios.ascApiKeyPath` and `submit.production.android.serviceAccountKeyPath`.

### 19.4 Build profiles 🔴 V1

- [ ] `eas.json` has `development`, `preview`, `production` profiles configured correctly.
- [ ] Production profile bumps `versionCode` (Android) and `buildNumber` (iOS) automatically OR by manual increment before each build.

---

## 20. Production hosting (backend & frontend)

### 20.1 Backend host 🔴 V1

- [ ] Pick a host: Render / Railway / Fly.io / AWS App Runner.
- [ ] Deploy `chattatutor_backend` to `api.chattatutor.com`.
- [ ] Production env vars set (everything from `.env`, with live keys).
- [ ] Health-check endpoint `/health` returns 200.
- [ ] Auto-deploy on push to `main`.
- [ ] `prisma migrate deploy` runs on deploy (NOT `migrate dev` — that drops the schema).

### 20.2 Frontend host 🔴 V1

- [ ] Vercel / Netlify deploy of `chattatutor_frontend` to `chattatutor.com`.
- [ ] `NEXT_PUBLIC_API_BASE_URL=https://api.chattatutor.com` in production env.
- [ ] Auto-deploy on push to `main`.
- [ ] Subscription-callback page reachable at `https://chattatutor.com/subscription-callback`.

### 20.3 Mobile binary points at production API 🔴 V1

- [ ] Mobile `.env`:
  ```
  EXPO_PUBLIC_API_BASE_URL=https://api.chattatutor.com
  ```
- [ ] Verified before `eas build --profile production`.

### 20.4 Status / uptime monitoring 🟡 V1

- [ ] Set up UptimeRobot / BetterStack ping for `https://api.chattatutor.com/health` every 5 minutes.
- [ ] Page yourself on outage.

---

## 21. Day-of-submission checklist

Run through this the morning of submission. Everything must be ✅ before you tap "Submit for Review."

### Apple

- [ ] All §1.* items checked.
- [ ] §3.* RevenueCat live, sandbox purchases tested on a TestFlight build.
- [ ] §10.* push works on a TestFlight build (or push is intentionally disabled).
- [ ] §18.* Privacy + Terms live at `https://chattatutor.com/privacy` + `/terms`.
- [ ] Demo account works — log in once and confirm Premium features are visible.
- [ ] Sign In with Apple works end-to-end on a TestFlight build.
- [ ] No `console.log` of secrets / tokens / PII in production binary.
- [ ] No `__DEV__` debug menus visible in production binary.
- [ ] Build number > previously submitted build number.
- [ ] App Review notes pasted (see §1.10).

### Google

- [ ] All §2.* items checked.
- [ ] §18.* Privacy + Terms live + match Data Safety form verbatim.
- [ ] Pre-launch report green (no crashes, no accessibility errors above warning level).
- [ ] AAB targets API 34+.
- [ ] Internal testing track build smoke-tested for ≥2 days.
- [ ] versionCode > previously submitted versionCode.

---

## Quick reference — total external costs for V1

| Item | Cost | Frequency |
|---|---|---|
| Apple Developer Program | $99 | annual |
| Google Play Developer | $25 | one-time |
| Domain (chattatutor.com) | ~$12 | annual |
| SendGrid (Essentials 50K/mo) | $19.95 | monthly |
| ElevenLabs Creator | $22 | monthly |
| OpenAI / Groq / Gemini | usage-based | usage |
| Sentry (Team) | $29 | monthly |
| PostHog | free up to 1M events | monthly |
| RevenueCat | free up to $2.5K MRR | monthly |
| Flutterwave | 1.4–3.8% transaction fees | per transaction |
| Stripe | 2.9% + $0.30 | per transaction |
| AWS S3 | ~$5 | monthly |
| Neon Postgres | $19 (Scale plan) | monthly |
| EAS (Production) | $99 | monthly (free tier may suffice initially) |
| **Total fixed costs V1 (excl. usage)** | **~$215/month + $124 setup** | — |

---

## V2 / post-launch additions

- 🟢 RevenueCat Android (Play Billing) — get Google Play service account JSON; add `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_...` prefix); enable Android branch in `lib/iap.ts`.
- 🟢 Universal Links / App Links — see §7.4.
- 🟢 ATT prompt on iOS if PostHog gains cross-app tracking — see §12.2.
- 🟢 GDPR data export endpoint (currently only delete exists).
- 🟢 CCPA "Do Not Sell" link (defensive — even if not selling).
- 🟢 Play Pre-launch report fixes (Google's automated testing surfaces accessibility / crash issues).
- 🟢 App Store / Play Store A/B listing experiments (post-launch optimization).
- 🟢 EU DMA disclosures if launching in EU under DMA-regulated terms.
- 🟢 SOC 2 / ISO 27001 readiness if pursuing enterprise sales.

---

## Recovery — secrets to rotate if leaked

If any of these end up in a public repo or screenshot, rotate **immediately**:

- `STRIPE_SECRET_KEY` — Stripe dashboard → Reveal → Roll key.
- `FLUTTERWAVE_SECRET_KEY` — Flutterwave dashboard → Settings → API Keys → regenerate.
- `JWT_SECRET` — rotate, but **invalidates all active sessions**.
- `OPENAI_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY` — provider dashboards → revoke + new.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — IAM → user → Security credentials → deactivate old + create new.
- `SENDGRID_API_KEY` — SendGrid → API Keys → delete + recreate.
- `REVENUECAT_WEBHOOK_AUTH_HEADER` — RevenueCat dashboard → Integrations → Webhooks → regenerate.
- `DATABASE_URL` — Neon → reset password on production branch.
- `STRIPE_WEBHOOK_SECRET` / `FLUTTERWAVE_WEBHOOK_SECRET_HASH` / `DODO_WEBHOOK_SECRET` — provider dashboards.

---

> When in doubt: **paste a redacted version of the env var into a teammate's eyes-only doc, not a chat log**.
> Many of these accounts have org-level audit logs; a leaked key usually means "rotate + check audit log" rather than "panic."
