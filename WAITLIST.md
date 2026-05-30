# What's left before ChattaTutor hits the stores

You've already done the hard part — the app works, Sign in with Apple works,
account deletion works, the iOS app is policy-compliant. What's left is mostly
**paperwork, screenshots, and waiting**. This guide assumes you've never shipped
a mobile app before, walks you through it in order, and tells you how long each
piece actually takes.

If you want the comprehensive reference for any single step, see
[OUT_OF_APP_STEPS.md](OUT_OF_APP_STEPS.md). This file is the "do this next"
sibling — short and ordered.

---

## The shape of the next ~2 weeks

| # | What | Hands-on time | Wall-clock time |
|---|------|---------------|-----------------|
| 1 | Open Apple + Google developer accounts | 1–2 hours each | Apple 1–3 days, Google up to 1 week |
| 2 | Flip production switches (DB migrations + live keys) | ~1 hour | Same day |
| 3 | Enable Sign In with Apple on Apple's side | 5 minutes | Same day |
| 4 | Make icons, screenshots, copy | 1–2 days | Spread over a few days |
| 5 | Build the binaries with EAS | 30 min per platform | ~1 hour |
| 6 | Test on a real iPhone and real Android | A few hours | 1–2 days |
| 7 | Submit | 1 hour each | Apple 1–3 days, Google 1–7 days |

The fastest realistic timeline is **about 2 weeks**, most of it spent waiting on
Apple. Plan for 3 weeks to be safe. Most steps below can run in parallel, so
start the accounts today.

---

## Step 1 — Open the developer accounts (start today)

These are gates. Nothing else ships until they're approved. They take days, not
minutes, so begin them and let them run in the background.

### Apple Developer Program — **$99/year**

1. Go to <https://developer.apple.com/enroll>
2. Sign in with your Apple ID (or make one)
3. Choose **Individual** (simpler) or **Organization** (needs a free D-U-N-S
   number — takes 1–2 extra business days)
4. Pay $99 with a card. Apple emails approval in 1–3 days.

When approved you get a **Team ID** (looks like `AB12CD34EF`). Save it somewhere.

### Google Play Console — **$25 one-time**

1. Go to <https://play.google.com/console/signup>
2. Sign in with a Gmail (use a real, durable one — this is forever)
3. Pay $25
4. **Identity verification** — Google asks for a government ID + selfie. This
   step takes 1–7 days. There's no way to skip it; just submit early.

While both are processing, do steps 2, 3, and 4 below.

---

## Step 2 — Flip the production switches (~1 hour)

You've been running on test keys. Now's the time to go live.

### 2a. Apply two database migrations to production

Two columns were added during the recent work that don't exist on your production
database yet. Open your Neon dashboard's SQL editor and run:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleUserId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_appleUserId_key" ON "User"("appleUserId");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TEXT;
```

That's it. The app won't deploy successfully without these columns — Apple Sign-In
and account deletion both depend on them.

### 2b. Get live Flutterwave keys

1. Flutterwave dashboard → toggle **Live mode** (top-right corner)
2. Settings → API Keys → copy three values
3. Paste into your backend production `.env`:
   ```
   FLUTTERWAVE_SECRET_KEY=FLWSECK-...-X         (NOT FLWSECK_TEST-)
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...-X
   FLUTTERWAVE_ENCRYPTION_KEY=<24-char hex>
   ```
4. Settings → Webhooks → set URL to `https://api.chattatutor.com/api/payments/webhooks/flutterwave` and generate a long random secret. Paste the same secret into your `.env`:
   ```
   FLUTTERWAVE_WEBHOOK_SECRET_HASH=<32+ char random>
   ```
5. Verify your business account is fully KYC'd (Flutterwave won't let you charge real money until this is done — see [OUT_OF_APP_STEPS.md §4.1](OUT_OF_APP_STEPS.md)).

### 2c. Backend env: production URLs

```
FRONTEND_URL=https://chattatutor.com
```

This is what makes emails (verify-email, password reset, account deletion
confirmation) point to your real website instead of localhost.

### 2d. Mobile env: production API

In `chattatutor_mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=https://api.chattatutor.com
```

(Replace with whatever URL your backend lives at in production.)

### 2e. Deploy the backend

Whatever you normally use — Render, Railway, Fly, etc. Make sure the new env
vars are set there too, not just in your local file. Test that
`https://api.chattatutor.com/health` returns 200.

---

## Step 3 — Turn on Sign In with Apple (5 minutes)

The code is already there. You just need to flip the capability on Apple's
developer portal so the certificate signs it.

1. <https://developer.apple.com> → **Certificates, Identifiers & Profiles** → **Identifiers**
2. Find `com.chattatutor.mobile` (or create it if you haven't)
3. Click it → tick the box for **Sign In with Apple**
4. Save

EAS will pick this up automatically on the next build. Don't forget this — if
you skip it, users will see Sign In with Apple in the app but it will fail
silently, which Apple's reviewers absolutely notice.

---

## Step 4 — Make the store assets (1–2 days)

This is the part most first-time shippers underestimate. Budget two days. None
of it is technical, but the cumulative time adds up fast.

### What you need

**1024×1024 app icon** — one PNG, no transparency, no rounded corners. Apple
adds the corners. Save the source file in case you want to tweak it later.

**Screenshots** — at minimum 3 each (you can submit up to 10):
- **iPhone**: 1290×2796 (this is the size for the latest iPhone 15/16 Pro Max
  and is what Apple requires)
- **Android**: 1080×1920 or similar 9:16

The easiest way: take real screenshots on a real device, then use
[previewed.app](https://previewed.app) or Figma to drop them inside a phone
frame with a headline above. **The first two screenshots get the most eyeballs**
— make those count.

**Listing copy**:
- App name (30 chars): e.g. `ChattaTutor: AI Tutor`
- Subtitle (30 chars, iOS only): e.g. `Turn any PDF into a course`
- Description (up to 4000 chars): start with what it does in one sentence.
  Then who it's for. Then why it's different. Don't oversell.
- Keywords (100 chars total, iOS only): comma-separated.
  e.g. `ai tutor,pdf,course,study,quiz,flashcards,learning`

**Demo account for Apple reviewer**: create a real account, give it Premium,
remember the email + password. Apple's reviewer **will** sign in and tap
around. Make sure premium features actually work for this account.

**Privacy Policy + Terms** must be live on `chattatutor.com/privacy` and
`/terms`. Both stores require them and Apple's reviewer reads them.

### Time-saving tips

- Don't design from scratch — copy patterns from apps you respect
- "Used by Harvard students" or "World's smartest AI" without proof = rejection
- Pick a category in App Store Connect: Primary **Education**, Secondary **Productivity**

---

## Step 5 — Build the binaries (~1 hour)

You're using EAS (Expo Application Services). One command per platform.

In the mobile project:

```bash
# iOS — produces an .ipa, uploads to your EAS account
eas build --profile production --platform ios

# Android — produces an .aab
eas build --profile production --platform android
```

Each build takes 20–40 minutes on EAS's servers. You'll get an email when each
one finishes. You can do other things while it runs.

### First-time gotchas

The very first production build will ask you for:
- Your Apple ID + password (one-time — EAS caches it)
- Permission to generate signing certificates and provisioning profiles
- Permission to generate an Android keystore (Google manages the actual key)

Say yes to all of it. EAS handles the cryptography correctly so you don't have to
think about it. If something fails, the error message usually tells you exactly
what to do.

---

## Step 6 — Test on a real device (a few hours)

**Do not skip this.** The simulator and emulator are not the same as a real
device. Several things have broken in production builds even when they worked
in dev.

### iOS — TestFlight

1. After the build succeeds: `eas submit --profile production --platform ios`
2. The build appears in App Store Connect → TestFlight within 5–15 minutes
3. Install **TestFlight** on your iPhone (from the App Store)
4. Sign in with your Apple ID → your app appears in TestFlight → install
5. Walk through every flow that matters:
   - Sign up with email → verify email → log in
   - **Sign in with Apple** (this is the big one — test it actually works)
   - Sign in with Google
   - Upload a PDF → wait for course generation → open a lesson → finish a quiz
   - Tap a locked feature → see the "manage on web" prompt → tap it → land on
     chattatutor.com **already signed in** (the magic-link bridge)
   - Profile → Delete account → confirm the deletion completes and signs you
     out cleanly

If anything's broken, fix it locally, rebuild, retest. Don't submit a broken
build hoping the reviewer won't notice — they will.

### Android — Play Console internal testing

1. `eas submit --profile production --platform android`
2. Play Console → your app → **Testing** → **Internal testing**
3. Create a tester list (your own Gmail is fine for now)
4. Promote the uploaded AAB to the internal track → review and roll out
5. Within an hour your tester Gmail can install via a Play Store link
6. Walk through the same flows on a real Android phone

---

## Step 7 — Submit (1 hour each, then wait)

### Apple

1. App Store Connect → your app → **Distribution**
2. Click the TestFlight build → **Add to submission**
3. Fill in:
   - App name, subtitle, description, keywords (from step 4)
   - Screenshots (from step 4)
   - Privacy Policy URL (`https://chattatutor.com/privacy`)
   - Support URL (`https://chattatutor.com/support`)
   - Privacy Nutrition Label — declare every data type honestly
     (see [OUT_OF_APP_STEPS.md §1.9](OUT_OF_APP_STEPS.md) for the exact answers)
   - Demo account credentials (from step 4)
   - Reviewer notes — paste the boilerplate from
     [OUT_OF_APP_STEPS.md §1.10](OUT_OF_APP_STEPS.md)
4. Hit **Submit for Review**
5. Wait 1–3 days

### Google

1. Play Console → Production → **Create new release**
2. Promote the internal-track AAB to production
3. Fill in:
   - Store listing copy + screenshots + feature graphic (1024×500)
   - Content rating questionnaire (be honest about UGC = "users can interact")
   - Data Safety form — **must match Privacy Policy verbatim**
   - Target audience: **13+** (anything younger triggers COPPA compliance,
     which is a much bigger undertaking)
4. Start the rollout at **20%** — this lets Google catch crashes before they
   hit everyone
5. Wait 1–7 days

---

## What might happen after you submit

You'll get one of three outcomes from each store:

- ✅ **Approved** — your app appears in the store within hours
- ⚠️ **Metadata rejection** — they ask you to change a sentence or a screenshot.
  Fix it inline, resubmit. Turnaround is fast.
- ❌ **Policy rejection** — they cite a specific guideline. Read it, fix the
  underlying issue, reply with a short polite explanation of what you did, then
  resubmit. This adds 1–3 days.

### What we've already mitigated

These are the most common reasons new apps get rejected. The recent work covers
all three:

- **3.1.1 (external payments)** — iOS app has zero pricing, no "Subscribe"
  buttons, no plan comparison. All billing happens on the web. ✅
- **4.8 (Sign In with Apple)** — implemented and shown above the Google button. ✅
- **5.1.1(v) (in-app account deletion)** — danger zone in Profile, re-auth
  required, subscription auto-cancel. ✅

### What might still trip you up

- Privacy Policy URL doesn't load → fix the website page, resubmit
- Demo account doesn't show premium features when reviewer logs in →
  re-activate Premium on that account
- Screenshots show a feature that's missing from the build → re-take
- Description claims something untrue → reword
- Push permission prompt fires immediately on first launch with no context →
  Apple has rejected for this; defer the prompt until the user does something
  that needs it (we already do this for daily-drill but verify on a real device)

---

## If you get stuck

- **"My production build crashes but the dev build works"** — 9 times out of 10
  it's a missing env var on the production server. Check the backend logs
  before anything else.
- **"Apple says they can't sign in"** — your demo account password is wrong, OR
  Sign In with Apple capability isn't enabled (Step 3), OR your backend can't
  reach the database. Test the demo account yourself in TestFlight first.
- **"What goes in the Privacy Nutrition Label?"** — be conservative, declare
  more than less. The full mapping is in
  [OUT_OF_APP_STEPS.md §1.9](OUT_OF_APP_STEPS.md).
- **"My bundle is too big"** — iOS limit is 150MB, Android 200MB. If you're
  close, look for duplicated icon libraries or unnecessary fonts in
  `node_modules`.
- **"Should I respond to the rejection right away?"** — yes, but read carefully
  and address every specific point. Don't argue. Don't ask Apple to reconsider
  the rule. Just fix the thing they flagged.

---

## One last thing

**You don't need to get it right on the first submission.** Both stores let
you fix issues and resubmit, and most apps go through 1–2 rounds before
approval. That's normal. Plan for it.

The goal of this guide is to get you to **submitted**, not "approved on first
try." The latter is the result of the work you've already done plus a bit of
luck.

Now go open the developer accounts. Today. They're the long pole.
