# ChattaTutor Mobile

React Native (Expo) port of the ChattaTutor web frontend. This is a **scaffold** — auth flow and dashboard shell are wired end-to-end, the rest of the features are stubs that need to be ported screen-by-screen.

## What's here

- **Expo Router** file-based routing (`app/`)
- **NativeWind** (Tailwind-like styling)
- **expo-secure-store** for auth token persistence (replaces `localStorage` from the web)
- Shared infra ported from `chattatutor_frontend`:
  - `lib/auth.ts` — login / signup / forgot / reset / verify / resend / google / me / logout
  - `lib/api.ts` — slimmed-down client (PDFs, activity, rank, tokens, study plans)
  - `lib/api-error.ts` — identical parser
  - `lib/auth-context.tsx` — `AuthProvider` + `useAuth()`
- Auth screens: login, signup, forgot-password, reset-password, verify-email, check-email
- Authenticated tab navigation with 5 tabs: Home / Lessons / Community / Hives / Profile
- Home pulls real data (streak, rank, token usage); other tabs are placeholders

## Setup

```bash
cd chattatutor_mobile
npm install              # or: pnpm install / yarn
cp .env.example .env     # then edit the values
npx expo start
```

Then press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with the Expo Go app.

## Environment variables

All client-readable env vars must start with `EXPO_PUBLIC_`. See [.env.example](.env.example):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend base URL (no trailing `/api`). E.g. `http://api.chattatutor.com` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Optional, for future Google sign-in via `expo-auth-session` |

Note: the API client appends `/api` and `/auth` itself, matching the web app's convention.

## Project structure

```
chattatutor_mobile/
├── app/
│   ├── _layout.tsx          # Root provider + auth gate redirect
│   ├── index.tsx            # Loading splash (auth gate decides where to go)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   ├── verify-email.tsx
│   │   └── check-email.tsx
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar
│       ├── index.tsx        # Home / dashboard
│       ├── lessons.tsx
│       ├── community.tsx
│       ├── hives.tsx
│       └── profile.tsx
├── components/              # Reusable primitives
├── lib/                     # API client, auth, context, constants
├── theme/colors.ts          # Design tokens (also mirrored in tailwind.config.js)
├── app.json                 # Expo config
├── babel.config.js          # NativeWind + Reanimated
├── metro.config.js          # NativeWind metro
├── tailwind.config.js
├── global.css               # @tailwind base/components/utilities
└── package.json
```

## How auth works

- Token is stored in `expo-secure-store` (hardware-backed on iOS Keychain / Android Keystore), keyed `auth_token`.
- `AuthProvider` (in `app/_layout.tsx`) loads the token on mount, calls `/auth/me`, and exposes `user`, `loading`, `refresh()`, `signOut()`.
- `AuthGate` watches the route segments and redirects: unauthenticated users hitting `(tabs)` get bounced to `/(auth)/login`; authenticated users hitting `(auth)` or the splash get bounced to `/(tabs)`.
- Each auth API call that returns a `token` automatically persists it via `setAuthToken`.

## Deep linking

`scheme: "chattatutor"` is set in `app.json`, so password-reset and verify-email links from the backend can be opened with URLs like:

```
chattatutor:///(auth)/reset-password?token=abc123
chattatutor:///(auth)/verify-email?token=abc123&email=foo@bar.com
```

If you also want universal links (`https://chattatutor.com/reset-password?...`) to open the app, configure Apple Universal Links / Android App Links in `app.json` and have the backend mint links accordingly.

## What's not ported yet (and why)

The web app has ~25 routes and ~40+ components, most of which depend on web-only libraries with no React Native equivalent:

| Web dep | RN replacement needed |
|---|---|
| `@radix-ui/*` | Native primitives or libraries like `@gorhom/bottom-sheet`, `react-native-modal` |
| `@xyflow/react` (visual diagrams) | No direct port. Likely `react-native-svg` + custom layout, or `react-native-skia` |
| `recharts` | `victory-native` or `react-native-gifted-charts` |
| `react-day-picker` | `react-native-calendars` |
| `react-markdown` | `react-native-markdown-display` |
| `cmdk`, `vaul`, `embla-carousel-react`, `sonner` | Custom or RN-specific libs |
| `@react-oauth/google` | `expo-auth-session/providers/google` |
| `next/image`, `next/link`, `next/navigation` | `expo-image`, `expo-router` `<Link>`, router hooks |
| `localStorage`, `document.cookie` | `expo-secure-store` (already done for auth) |
| HTML file inputs, drag-drop | `expo-document-picker` + direct-to-S3 PUT |

## Suggested next PRs

1. **Daily Drill screen** — backend already returns the question list, build the quiz UI.
2. **PDF upload from mobile** — use `expo-document-picker` to get a file URI, then the existing presigned-URL flow on the backend.
3. **Announcements feed** — port `components/announcement-card.tsx` and the suggestions board.
4. **Lesson runner** — the chunked-PDF + flashcard/quiz flow. Big screen, port last.
5. **Visual diagrams** — replace `@xyflow/react` with a Skia/SVG renderer (this is the largest unknown — may need a spike first).

## Known gotchas

- **NativeWind v4 + Tailwind v3**: pinned to Tailwind 3.x because NativeWind v4 doesn't fully support Tailwind v4 yet.
- **Reanimated babel plugin must be last** in `babel.config.js` — already correct.
- **Don't import `getAuthToken` synchronously before `AuthProvider` has loaded** — use `useAuth()` or `loadAuthToken()` instead. The sync getter (`getAuthTokenSync`) exists for the API client only because it's called *after* auth-gate ensures the token is loaded.
- **Splash screen** referenced in `app.json` (`./assets/splash.png`, `./assets/icon.png`, `./assets/adaptive-icon.png`, `./assets/favicon.png`) — add the actual image files to `assets/` before building.
