export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

/** Marketing / auth / billing site (Next.js frontend). */
export const WEB_APP_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, "") ||
  "https://chattatutor.com";

export const API_URL = `${API_BASE_URL}/api`;
export const AUTH_URL = `${API_BASE_URL}/auth`;

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "";
export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";

export const GOOGLE_SIGN_IN_ENABLED = Boolean(
  GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID,
);

export const AUTH_TOKEN_KEY = "auth_token";

export const MAX_PDF_FREE = 1;
export const MAX_PDF_PREMIUM = 10;
export const MAX_PAGES_FREE = 100;
export const MAX_PAGES_PREMIUM = 1000;
export const COURSE_GENERATION_COOLDOWN_HOURS_FREE = 24;
