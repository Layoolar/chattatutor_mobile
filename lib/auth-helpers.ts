import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { AUTH_TOKEN_KEY } from "./constants";

let inMemoryToken: string | null = null;

const isWeb = Platform.OS === "web";

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) return AsyncStorage.setItem(key, value);
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) return AsyncStorage.removeItem(key);
  await SecureStore.deleteItemAsync(key);
}

export async function setAuthToken(token: string): Promise<void> {
  inMemoryToken = token;
  await setItem(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  inMemoryToken = null;
  await deleteItem(AUTH_TOKEN_KEY);
}

export async function loadAuthToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  const stored = await getItem(AUTH_TOKEN_KEY);
  inMemoryToken = stored;
  return stored;
}

export function getAuthTokenSync(): string | null {
  return inMemoryToken;
}
