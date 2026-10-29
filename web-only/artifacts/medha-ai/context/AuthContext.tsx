import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  getCurrentUser as getCurrentUserRemote,
  refreshSession as refreshRemoteSession,
  signIn as signInRemote,
  signOut as signOutRemote,
  signUp as signUpRemote,
  startGoogleSignIn as startGoogleSignInRemote,
  type AuthSession,
  type AuthUser,
} from "@/services/backend";

const AUTH_STORAGE_KEY = "@medha-ai/auth-session";
WebBrowser.maybeCompleteAuthSession();

interface StoredAuth {
  session: AuthSession;
  user: AuthUser | null;
}

interface AuthContextValue {
  isHydrated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  session: AuthSession | null;
  user: AuthUser | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: "patient" | "caregiver",
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(AUTH_STORAGE_KEY)
      .then(async (stored) => {
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored) as StoredAuth;
          if (!parsed.session?.refreshToken) return;
          const refreshed = await refreshRemoteSession(parsed.session.refreshToken);
          const nextUser =
            refreshed.user ??
            parsed.user ??
            (refreshed.session?.accessToken
              ? (await getCurrentUserRemote(refreshed.session.accessToken)).user
              : null);
          if (mounted && refreshed.session) {
            setSession(refreshed.session);
            setUser(nextUser);
            await AsyncStorage.setItem(
              AUTH_STORAGE_KEY,
              JSON.stringify({ session: refreshed.session, user: nextUser }),
            );
          }
        } catch {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
      })
      .finally(() => {
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => (!isDemo ? session?.accessToken : null) ?? null);
    return () => setAuthTokenGetter(null);
  }, [isDemo, session]);

  const persist = async (nextSession: AuthSession, nextUser: AuthUser | null) => {
    setIsDemo(false);
    setSession(nextSession);
    setUser(nextUser);
    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ session: nextSession, user: nextUser } satisfies StoredAuth),
    );
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isLoading,
      isDemo,
      session: isDemo ? null : session,
      user: isDemo ? null : user,
      error,
      clearError: () => setError(null),
      signIn: async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await signInRemote(email.trim(), password);
          if (!result.session || !result.user?.id) {
            throw new Error("The server did not return a valid account session.");
          }
          await persist(result.session, result.user);
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Sign in failed.";
          setError(message);
          throw caught;
        } finally {
          setIsLoading(false);
        }
      },
      signInWithGoogle: async () => {
        setIsLoading(true);
        setError(null);
        try {
          const redirectTo = Linking.createURL("auth/callback");
          const { authUrl } = await startGoogleSignInRemote(redirectTo);
          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
          if (result.type !== "success" || !result.url) return false;

          const callbackUrl = new URL(result.url);
          const callbackParams = new URLSearchParams(
            callbackUrl.hash.replace(/^#/, "") || callbackUrl.search.replace(/^\?/, ""),
          );
          const oauthError =
            callbackParams.get("error_description") ?? callbackParams.get("error");
          if (oauthError) throw new Error(oauthError);

          const accessToken = callbackParams.get("access_token");
          const refreshToken = callbackParams.get("refresh_token");
          if (!accessToken || !refreshToken) {
            throw new Error("Google sign-in did not return a complete Medha session.");
          }

          const currentUser = await getCurrentUserRemote(accessToken);
          const expiresInValue = Number(callbackParams.get("expires_in"));
          await persist(
            {
              accessToken,
              refreshToken,
              expiresIn: Number.isFinite(expiresInValue) ? expiresInValue : null,
              tokenType: callbackParams.get("token_type"),
            },
            currentUser.user,
          );
          return true;
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Google sign-in failed.";
          setError(message);
          throw caught;
        } finally {
          setIsLoading(false);
        }
      },
      signUp: async (email, password, displayName, role) => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await signUpRemote(email.trim(), password, displayName.trim(), role);
          if (result.session) {
            if (!result.user?.id) {
              throw new Error("The server did not return a valid account session.");
            }
            await persist(result.session, result.user);
            return { needsEmailConfirmation: false };
          }
          return { needsEmailConfirmation: true };
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Account creation failed.";
          setError(message);
          throw caught;
        } finally {
          setIsLoading(false);
        }
      },
      enterDemo: () => {
        setError(null);
        setIsDemo(true);
      },
      signOut: async () => {
        const currentSession = session;
        setIsLoading(true);
        setError(null);
        try {
          if (currentSession) await signOutRemote(currentSession.accessToken);
        } finally {
          setIsDemo(false);
          setSession(null);
          setUser(null);
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          setIsLoading(false);
        }
      },
    }),
    [error, isDemo, isHydrated, isLoading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}