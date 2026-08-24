import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import * as Linking from "expo-linking";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import * as AuthSession from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";

/** Where Supabase should send confirmation / recovery links so they reopen the app. */
const authRedirectUri = () =>
  AuthSession.makeRedirectUri({ scheme: "workouttimer", path: "auth-callback" });

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  /** True after a recovery link is opened, until the user sets a new password. */
  pendingPasswordReset: boolean;
  clearPendingPasswordReset: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);

  // Email confirmation and password-recovery links arrive as
  // workouttimer://auth-callback#access_token=…&type=recovery. detectSessionInUrl
  // is off on native, so establish the session by hand.
  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;
      const { params } = QueryParams.getQueryParams(url);
      const { access_token: accessToken, refresh_token: refreshToken } = params;
      if (!accessToken || !refreshToken) return;
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error && params.type === "recovery") setPendingPasswordReset(true);
    }

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // Without this the confirmation link lands on the Supabase Site URL
      // (a website) instead of coming back into the app.
      options: { emailRedirectTo: authRedirectUri() },
    });
    return error?.message ?? null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error?.message ?? null;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectUri = authRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUri },
    });
    if (error || !data.url) return;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type !== "success") return;

    // React Native's URL polyfill is not spec-compliant (its `hash` getter
    // stops at the first slash), so parse with expo-auth-session instead.
    const { params } = QueryParams.getQueryParams(result.url);
    const { access_token: accessToken, refresh_token: refreshToken } = params;
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUri(),
    });
    return error?.message ?? null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setPendingPasswordReset(false);
    return error?.message ?? null;
  }, []);

  const clearPendingPasswordReset = useCallback(
    () => setPendingPasswordReset(false),
    []
  );

  // Apple Guideline 5.1.1(v) requires in-app deletion. The client can't remove
  // an auth user, so this calls a service-role Edge Function.
  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.functions.invoke("delete-account", {
      method: "POST",
    });
    if (error) {
      throw new Error("Couldn't delete your account. Please try again.");
    }
    await supabase.auth.signOut();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        deleteAccount,
        signOut,
        pendingPasswordReset,
        clearPendingPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
