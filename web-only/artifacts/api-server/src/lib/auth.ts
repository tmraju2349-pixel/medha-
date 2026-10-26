import {
  SupabaseRequestError,
  supabaseRawRequest,
  supabaseRequest,
  type SupabaseRequestOptions,
} from "./supabase";

export interface SupabaseUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
  user: SupabaseUser | null;
}

interface RawAuthResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  user?: SupabaseUser | null;
}

function normalizeAuthResponse(response: RawAuthResponse): AuthSession {
  return {
    accessToken: typeof response.access_token === "string" ? response.access_token : null,
    refreshToken: typeof response.refresh_token === "string" ? response.refresh_token : null,
    expiresIn: typeof response.expires_in === "number" ? response.expires_in : null,
    tokenType: typeof response.token_type === "string" ? response.token_type : null,
    user: response.user ?? null,
  };
}

export async function getGoogleOAuthAuthorizationUrl(redirectTo: string): Promise<string> {
  const query = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo,
    flow_type: "implicit",
  });
  const response = await supabaseRawRequest(`/auth/v1/authorize?${query.toString()}`);
  const authorizationUrl = response.headers.get("location");

  if (response.status >= 300 && response.status < 400 && authorizationUrl) {
    return authorizationUrl;
  }

  const text = await response.text();
  let details: unknown = text;
  if (text) {
    try {
      details = JSON.parse(text) as unknown;
    } catch {
      // Preserve the provider's plain-text error for the route handler.
    }
  }

  if (!response.ok) {
    throw new SupabaseRequestError(response.status, details);
  }

  throw new Error("Supabase did not return a Google authorization URL.");
}

export async function signUp(input: {
  email: string;
  password: string;
  displayName: string;
  role: "patient" | "caregiver";
}): Promise<AuthSession> {
  const response = await supabaseRequest<RawAuthResponse>("/auth/v1/signup", {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      data: {
        display_name: input.displayName,
        role: input.role,
      },
    },
  });

  return normalizeAuthResponse(response);
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await supabaseRequest<RawAuthResponse>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
    },
  });

  return normalizeAuthResponse(response);
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const response = await supabaseRequest<RawAuthResponse>("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: {
      refresh_token: refreshToken,
    },
  });

  return normalizeAuthResponse(response);
}

export async function signOut(accessToken: string): Promise<void> {
  await supabaseRequest<unknown>("/auth/v1/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getCurrentUser(accessToken: string): Promise<SupabaseUser> {
  return supabaseRequest<SupabaseUser>("/auth/v1/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function withUserToken(accessToken: string, options: SupabaseRequestOptions = {}): SupabaseRequestOptions {
  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };
}