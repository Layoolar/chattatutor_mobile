import { AUTH_URL } from "./constants";
import { throwApiError } from "./api-error";
import {
  setAuthToken,
  clearAuthToken,
  loadAuthToken,
  getAuthTokenSync,
} from "./auth-helpers";
import { apiFetch } from "./fetch";

export interface User {
  id: string;
  email: string;
  username: string;
  plan?: string;
  emailVerified?: boolean;
  paymentProvider?: "stripe" | "flutterwave" | null;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | "expired" | null;
  subscriptionEndsAt?: string | null;
  pendingPlan?: "pro" | "premium" | null;
  authProvider?: "local" | "google" | "apple" | string;
  appleUserId?: string | null;
  lastCourseGeneratedAt?: string | null;
  createdAt?: string;
  trialGenerationsRemaining?: number;
  isAdmin?: boolean;
}

export interface AuthResponse {
  user: User;
  token?: string;
  requiresVerification?: boolean;
}

export interface GoogleSignInResponse {
  user: User;
  token?: string;
  isNewUser?: boolean;
}

export interface AppleSignInResponse {
  user: User;
  token?: string;
  isNewUser?: boolean;
}

export interface AppleSignInInput {
  identityToken: string;
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
}

export { setAuthToken, clearAuthToken, loadAuthToken, getAuthTokenSync };

/** Tells the API to add `from=app` on links in auth emails (web shows Open app banner). */
export const AUTH_EMAIL_SOURCE_MOBILE = "mobile" as const;

export async function signup(
  email: string,
  username: string,
  password: string,
): Promise<AuthResponse> {
  const response = await apiFetch(`${AUTH_URL}/signup`, {
    method: "POST",
    body: JSON.stringify({
      email,
      username,
      password,
      source: AUTH_EMAIL_SOURCE_MOBILE,
    }),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Signup failed");

  const data: AuthResponse = await response.json();
  if (data.token && !data.requiresVerification) await setAuthToken(data.token);
  return data;
}

export async function login(emailOrUsername: string, password: string): Promise<AuthResponse> {
  const response = await apiFetch(`${AUTH_URL}/login`, {
    method: "POST",
    body: JSON.stringify({ emailOrUsername, password }),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Login failed");

  const data: AuthResponse = await response.json();
  if (data.token && !data.requiresVerification) await setAuthToken(data.token);
  return data;
}

export interface VerifyEmailResponse {
  message?: string;
  token?: string;
  user?: User;
}

export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  const response = await apiFetch(`${AUTH_URL}/verify-email`, {
    method: "POST",
    body: JSON.stringify({ token }),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Verification failed");

  const data: VerifyEmailResponse = await response.json();
  if (data.token) await setAuthToken(data.token);
  return data;
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const response = await apiFetch(`${AUTH_URL}/resend-verification`, {
    method: "POST",
    body: JSON.stringify({ email, source: AUTH_EMAIL_SOURCE_MOBILE }),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Resend failed");
  return response.json();
}

export async function googleSignIn(idToken: string): Promise<GoogleSignInResponse> {
  const response = await apiFetch(`${AUTH_URL}/google`, {
    method: "POST",
    body: JSON.stringify({ idToken }),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Google sign-in failed");

  const data: GoogleSignInResponse = await response.json();
  if (data.token) await setAuthToken(data.token);
  return data;
}

/**
 * Sign in with Apple. The native SDK gives us a signed identity token (JWT) and
 * — only on first authorization — a `fullName` object. Both get forwarded to
 * the backend, which verifies the JWT against Apple's JWKS before issuing our
 * own session token.
 *
 * Apple guideline 4.8 requires SIWA when any other third-party social login is
 * offered, which is why this flow exists alongside `googleSignIn`.
 */
export async function appleSignIn(input: AppleSignInInput): Promise<AppleSignInResponse> {
  const response = await apiFetch(`${AUTH_URL}/apple`, {
    method: "POST",
    body: JSON.stringify(input),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Apple sign-in failed");

  const data: AppleSignInResponse = await response.json();
  if (data.token) await setAuthToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await loadAuthToken();
  if (!token) return null;

  try {
    const response = await apiFetch(`${AUTH_URL}/me`);

    if (!response.ok) {
      await clearAuthToken();
      return null;
    }

    return response.json();
  } catch {
    await clearAuthToken();
    return null;
  }
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}

/**
 * Permanently delete the signed-in account (Apple guideline 5.1.1(v)).
 *
 * `password` is required for local/password accounts (server-side re-auth). For
 * OAuth users (Google, Apple) pass nothing — the JWT is sufficient proof.
 *
 * Resolves on success. The caller should clear local auth state immediately
 * after — the JWT is still technically valid until expiry but the row is gone,
 * so any subsequent authed call will 401.
 */
export async function deleteAccount(password?: string): Promise<void> {
  const response = await apiFetch(`${AUTH_URL}/account`, {
    method: "DELETE",
    body: JSON.stringify(password ? { password } : {}),
  });

  if (!response.ok && response.status !== 204) {
    await throwApiError(response, "Couldn't delete account");
  }
}

/**
 * Mint a single-use web bridge URL for the current user. The mobile app opens this
 * URL in the system browser to land the user pre-authenticated on chattatutor.com
 * — important for Apple Sign-In users (no password + private-relay email).
 *
 * `path` is the destination route on the web (e.g. "/pricing", "/dashboard"). The
 * backend whitelists it to in-domain paths.
 */
export async function getWebBridgeUrl(path?: string): Promise<string> {
  const response = await apiFetch(`${AUTH_URL}/web-bridge`, {
    method: "POST",
    body: JSON.stringify(path ? { to: path } : {}),
  });

  if (!response.ok) await throwApiError(response, "Couldn't open chattatutor.com");
  const data = (await response.json()) as { url?: string };
  if (!data?.url) throw new Error("Bridge response missing URL");
  return data.url;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await apiFetch(`${AUTH_URL}/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email, source: AUTH_EMAIL_SOURCE_MOBILE }),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Failed to send password reset email");
  return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await apiFetch(`${AUTH_URL}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
    skipAuth: true,
  });

  if (!response.ok) await throwApiError(response, "Failed to reset password");
  return response.json();
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
  const token = getAuthTokenSync() ?? (await loadAuthToken());
  if (!token) throw new Error("Not authenticated");

  const response = await apiFetch(`${AUTH_URL}/change-password`, {
    method: "POST",
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  if (!response.ok) await throwApiError(response, "Failed to change password");
  return response.json();
}

export async function updateUsername(username: string): Promise<{ username: string }> {
  const token = getAuthTokenSync() ?? (await loadAuthToken());
  if (!token) throw new Error("Not authenticated");

  const response = await apiFetch(`${AUTH_URL}/profile`, {
    method: "PUT",
    body: JSON.stringify({ username }),
  });

  if (!response.ok) await throwApiError(response, "Failed to update username");
  return response.json();
}
