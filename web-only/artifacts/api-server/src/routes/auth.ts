import { Router, type IRouter } from "express";
import {
  SupabaseRequestError,
} from "../lib/supabase";
import {
  getCurrentUser,
  getGoogleOAuthAuthorizationUrl,
  refreshSession,
  signIn,
  signOut,
  signUp,
} from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function errorMessage(error: unknown): string {
  if (error instanceof SupabaseRequestError) {
    const details = error.details;
    if (details && typeof details === "object") {
      const message = (details as Record<string, unknown>).message;
      const description = (details as Record<string, unknown>).error_description;
      const providerMessage = (details as Record<string, unknown>).msg;
      const providerError = (details as Record<string, unknown>).error;
      if (typeof message === "string") return message;
      if (typeof description === "string") return description;
      const providerReason =
        typeof providerMessage === "string"
          ? providerMessage
          : typeof providerError === "string"
            ? providerError
            : null;
      if (providerReason) {
        if (providerReason.toLowerCase().includes("provider is not enabled")) {
          return "Google sign-in is not enabled in Supabase Auth. Enable the Google provider and add its OAuth Client ID and Client Secret.";
        }
        return providerReason;
      }
    }
  }

  return "The authentication request could not be completed.";
}

function safeSessionResponse(session: Awaited<ReturnType<typeof signIn>>) {
  return {
    session: session.accessToken
      ? {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresIn: session.expiresIn,
          tokenType: session.tokenType,
        }
      : null,
    user: session.user,
  };
}

router.post("/auth/signup", async (request, response) => {
  const email = readString(request.body?.email).toLowerCase();
  const password = readString(request.body?.password);
  const displayName = readString(request.body?.displayName);
  const role = request.body?.role === "caregiver" ? "caregiver" : "patient";

  if (!email || !email.includes("@") || password.length < 8 || !displayName) {
    response.status(400).json({
      error: "Enter a valid email, a password with at least 8 characters, and your name.",
    });
    return;
  }

  try {
    const session = await signUp({ email, password, displayName, role });
    response.status(session.accessToken ? 201 : 202).json(safeSessionResponse(session));
  } catch (error) {
    response.status(error instanceof SupabaseRequestError ? Math.min(error.status, 502) : 502).json({
      error: errorMessage(error),
    });
  }
});

router.post("/auth/signin", async (request, response) => {
  const email = readString(request.body?.email).toLowerCase();
  const password = readString(request.body?.password);

  if (!email || !email.includes("@") || !password) {
    response.status(400).json({ error: "Enter your email and password." });
    return;
  }

  try {
    const session = await signIn({ email, password });
    response.json(safeSessionResponse(session));
  } catch (error) {
    response.status(error instanceof SupabaseRequestError ? Math.min(error.status, 502) : 502).json({
      error: errorMessage(error),
    });
  }
});

router.post("/auth/google/start", async (request, response) => {
  const redirectTo = readString(request.body?.redirectTo);
  let callbackUrl: URL;

  try {
    callbackUrl = new URL(redirectTo);
  } catch {
    response.status(400).json({ error: "A valid Google sign-in callback URL is required." });
    return;
  }

  if (!["https:", "http:", "medha-ai:"].includes(callbackUrl.protocol)) {
    response.status(400).json({ error: "The Google sign-in callback URL is not supported." });
    return;
  }

  try {
    const authUrl = await getGoogleOAuthAuthorizationUrl(redirectTo);
    response.json({ authUrl });
  } catch (error) {
    response.status(error instanceof SupabaseRequestError ? Math.min(error.status, 502) : 502).json({
      error: errorMessage(error),
    });
  }
});

router.post("/auth/refresh", async (request, response) => {
  const refreshToken = readString(request.body?.refreshToken);
  if (!refreshToken) {
    response.status(400).json({ error: "A refresh token is required." });
    return;
  }

  try {
    const session = await refreshSession(refreshToken);
    response.json(safeSessionResponse(session));
  } catch (error) {
    response.status(error instanceof SupabaseRequestError ? Math.min(error.status, 502) : 502).json({
      error: errorMessage(error),
    });
  }
});

router.post("/auth/signout", requireAuth, async (request, response) => {
  try {
    await signOut(request.auth!.accessToken);
    response.status(204).send();
  } catch {
    response.status(204).send();
  }
});

router.get("/auth/me", requireAuth, async (request, response) => {
  try {
    const user = await getCurrentUser(request.auth!.accessToken);
    response.json({ user });
  } catch {
    response.status(401).json({ error: "The session is missing, expired, or invalid." });
  }
});

export default router;