import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getCurrentUser,
  loadAuthToken,
  logout as logoutHelper,
  type User,
} from "./auth";
import { onUnauthorized } from "./fetch";
import { unregisterStoredPushDeviceAsync } from "./push-notifications";
import { configureIAP, loginIAP, logoutIAP } from "./iap";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    await loadAuthToken();
    const current = await getCurrentUser();
    setUser(current);
    // Keep RevenueCat's app_user_id in sync with our backend user id so the
    // RC webhook's payload.event.app_user_id maps cleanly to our User.id.
    if (current?.id) {
      await loginIAP(current.id).catch(() => {});
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Configure RC once at app start; userId may be unknown here (cold start
      // before token loads). `refresh` will follow up with loginIAP once we
      // have an authenticated user.
      await configureIAP().catch(() => {});
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await unregisterStoredPushDeviceAsync().catch(() => {});
    await logoutIAP().catch(() => {});
    await logoutHelper();
    setUser(null);
  }, []);

  useEffect(() => {
    return onUnauthorized(() => {
      void signOut();
    });
  }, [signOut]);

  const value = useMemo(
    () => ({ user, loading, refresh, signOut }),
    [user, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
