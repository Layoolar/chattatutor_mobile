import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "./constants";

let inMemoryToken: string | null = null;

export async function setAuthToken(token: string): Promise<void> {
  inMemoryToken = token;
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  inMemoryToken = null;
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function loadAuthToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  const stored = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  inMemoryToken = stored;
  return stored;
}

export function getAuthTokenSync(): string | null {
  return inMemoryToken;
}
