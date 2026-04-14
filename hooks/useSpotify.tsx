import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  startLoginInteractive,
  logout as doLogout,
  isLoggedIn as hasTokens,
} from "@/lib/spotifyAuth";
import { getMe, type SpotifyUser } from "@/lib/spotifyApi";

interface SpotifyContextValue {
  loggedIn: boolean;
  user: SpotifyUser | null;
  isPremium: boolean;
  loading: boolean;
  connect: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const has = await hasTokens();
      if (!has) {
        setUser(null);
        setLoggedIn(false);
        return;
      }
      const me = await getMe();
      setUser(me);
      setLoggedIn(true);
    } catch {
      setUser(null);
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await startLoginInteractive();
      if (ok) {
        await refreshUser();
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await doLogout();
    setUser(null);
    setLoggedIn(false);
  }, []);

  return (
    <SpotifyContext.Provider
      value={{
        loggedIn,
        user,
        isPremium: user?.product === "premium",
        loading,
        connect,
        logout,
        refreshUser,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify(): SpotifyContextValue {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
}
