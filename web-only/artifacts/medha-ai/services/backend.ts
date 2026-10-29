import type {
  AppNotification,
  DailyTask,
  DiaryEntry,
  GameProgress,
} from "@/context/AppContext";
import type { PatientProfile } from "@/data/testPatientData";

const apiOrigin =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "");

export interface AuthUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
}

export interface AuthResponse {
  session: AuthSession | null;
  user: AuthUser | null;
}

export interface RemoteSnapshot {
  patient: PatientProfile | null;
  tasks: DailyTask[];
  notifications: AppNotification[];
  diaryEntries: DiaryEntry[];
  gameProgress: GameProgress;
  memoryCues: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    icon: string | null;
  }>;
  syncedAt: string;
}

export interface SyncOperation {
  id: string;
  entity: "task" | "notification" | "diary" | "game" | "memory";
  action: "upsert" | "delete";
  payload: Record<string, unknown>;
}

export function createRemoteId(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class BackendRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
    accessToken?: string | null;
  } = {},
): Promise<T> {
  if (!apiOrigin) {
    throw new BackendRequestError(
      0,
      "The Medha AI API address is not configured for this build.",
    );
  }

  const response = await fetch(`${apiOrigin}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "The Medha AI server could not complete that request.";
    throw new BackendRequestError(response.status, message);
  }

  return body as T;
}

export function signIn(email: string, password: string) {
  return request<AuthResponse>("/api/auth/signin", {
    method: "POST",
    body: { email, password },
  });
}

export function startGoogleSignIn(redirectTo: string) {
  return request<{ authUrl: string }>("/api/auth/google/start", {
    method: "POST",
    body: { redirectTo },
  });
}

export function getCurrentUser(accessToken: string) {
  return request<{ user: AuthUser }>("/api/auth/me", { accessToken });
}

export function signUp(
  email: string,
  password: string,
  displayName: string,
  role: "patient" | "caregiver",
) {
  return request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: { email, password, displayName, role },
  });
}

export function refreshSession(refreshToken: string) {
  return request<AuthResponse>("/api/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export function signOut(accessToken: string) {
  return request<null>("/api/auth/signout", {
    method: "POST",
    accessToken,
  });
}

export function fetchSnapshot(accessToken: string) {
  return request<RemoteSnapshot>("/api/me/snapshot", { accessToken });
}

export function updatePatientProfile(
  accessToken: string,
  profile: Partial<PatientProfile> & { name: string },
) {
  return request<RemoteSnapshot>("/api/me/profile", {
    method: "PUT",
    accessToken,
    body: {
      displayName: profile.name,
      preferredLanguage: profile.languages?.[0] ?? "English",
      age: profile.age,
      region: profile.region,
      homeAddress: profile.homeAddress,
      caregiverName: profile.caregiverName,
      caregiverRelationship: profile.caregiverRelationship,
      caregiverPhone: profile.caregiverPhone,
    },
  });
}

export function pushSyncOperations(
  accessToken: string,
  operations: SyncOperation[],
) {
  return request<{ acceptedOperationIds: string[]; syncedAt: string }>("/api/me/sync", {
    method: "POST",
    accessToken,
    body: { operations },
  });
}