import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { withUserToken } from "../lib/auth";
import { SupabaseRequestError, supabaseRequest } from "../lib/supabase";

const router: IRouter = Router();

type Row = Record<string, unknown>;
type SyncEntity = "task" | "notification" | "diary" | "game" | "memory";
type SyncAction = "upsert" | "delete";

interface SyncOperation {
  id: string;
  entity: SyncEntity;
  action: SyncAction;
  payload: Row;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function tableQuery(table: string, query: string): string {
  return `/rest/v1/${table}?${query}`;
}

function authRequest<T>(accessToken: string, path: string, options: Parameters<typeof supabaseRequest>[1] = {}) {
  return supabaseRequest<T>(path, withUserToken(accessToken, options));
}

function errorStatus(error: unknown): number {
  if (error instanceof SupabaseRequestError) {
    return error.status >= 400 && error.status < 500 ? error.status : 502;
  }
  return 502;
}

function sendDataError(response: Response, error: unknown) {
  response.status(errorStatus(error)).json({
    error: "The patient data could not be read or saved right now.",
  });
}

async function getSnapshot(accessToken: string) {
  const [
    profiles,
    patientProfiles,
    taskRows,
    notificationRows,
    diaryRows,
    gameRows,
    memoryRows,
  ] = await Promise.all([
    authRequest<Row[]>(
      accessToken,
      tableQuery("profiles", `select=id,role,display_name,preferred_language&id=eq.${encoded(accessTokenUserId(accessToken))}&limit=1`),
    ),
    authRequest<Row[]>(
      accessToken,
      tableQuery("patient_profiles", `select=id,age,region,home_address,caregiver_name,caregiver_relationship,caregiver_phone,is_test_data&id=eq.${encoded(accessTokenUserId(accessToken))}&limit=1`),
    ),
    authRequest<Row[]>(
      accessToken,
      tableQuery("care_tasks", "select=id,title,time_text,recurrence,category,icon,status,due_at,updated_at&order=updated_at.desc"),
    ),
    authRequest<Row[]>(
      accessToken,
      tableQuery("notifications", "select=id,title,body,kind,read_at,created_at&order=created_at.desc"),
    ),
    authRequest<Row[]>(
      accessToken,
      tableQuery("voice_diary_entries", "select=id,transcript,language,audio_path,audio_status,possible_task,created_at&order=created_at.desc"),
    ),
    authRequest<Row[]>(
      accessToken,
      tableQuery("game_sessions", "select=id,game_key,score,mistakes,played_at&order=played_at.desc"),
    ),
    authRequest<Row[]>(
      accessToken,
      tableQuery("memory_cues", "select=id,cue_type,title,detail,icon,updated_at&order=updated_at.desc"),
    ),
  ]);

  const profile = profiles[0] ?? null;
  const patientProfile = patientProfiles[0] ?? null;
  const scores = gameRows
    .map((row) => (typeof row.score === "number" ? row.score : null))
    .filter((score): score is number => score !== null);
  const lastGame = gameRows[0] ?? null;

  return {
    patient:
      profile && patientProfile
        ? {
            id: profile.id,
            name: profile.display_name,
            age: patientProfile.age ?? 0,
            region: patientProfile.region ?? "",
            languages: profile.preferred_language ? [profile.preferred_language] : ["English"],
            caregiverName: patientProfile.caregiver_name ?? "",
            caregiverRelationship: patientProfile.caregiver_relationship ?? "",
            caregiverPhone: patientProfile.caregiver_phone ?? "",
            homeAddress: patientProfile.home_address ?? "",
          }
        : null,
    tasks: taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      time: row.time_text ?? "",
      category: row.category,
      icon: row.icon ?? "calendar",
      status: row.status,
      recurrence: row.recurrence ?? null,
      dueAt: row.due_at ?? null,
    })),
    notifications: notificationRows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      time: row.created_at,
      kind: row.kind,
      read: row.read_at !== null,
    })),
    diaryEntries: diaryRows.map((row) => ({
      id: row.id,
      transcript: row.transcript,
      createdAt: row.created_at,
      audioUri: row.audio_path ?? null,
      audioStatus: row.audio_status,
      possibleTask: row.possible_task ?? null,
    })),
    gameProgress: {
      sessions: gameRows.length,
      bestScore: scores.length ? Math.max(...scores) : 0,
      lastScore: typeof lastGame?.score === "number" ? lastGame.score : null,
      lastPlayedAt: lastGame?.played_at ?? null,
    },
    memoryCues: memoryRows.map((row) => ({
      id: row.id,
      type: row.cue_type,
      title: row.title,
      detail: row.detail ?? "",
      icon: row.icon ?? null,
    })),
    syncedAt: new Date().toISOString(),
  };
}

// The user ID is encoded in the access token by Supabase. We only use this
// helper for constructing a query; the actual authorization is still enforced
// by Supabase with the forwarded bearer token.
function accessTokenUserId(_accessToken: string): string {
  // This placeholder is replaced by the authenticated request wrapper below.
  // Keeping the user ID out of token parsing avoids handling JWT contents
  // without signature verification.
  throw new Error("User ID must come from the authenticated request context.");
}

function getUserId(request: Request): string {
  const userId = request.auth?.user.id;
  if (!userId) throw new Error("Authenticated user is missing.");
  return userId;
}

async function getSnapshotForRequest(request: Request) {
  const accessToken = request.auth!.accessToken;
  const userId = getUserId(request);
  const snapshot = await getSnapshotWithUserId(accessToken, userId);
  return snapshot;
}

async function getSnapshotWithUserId(accessToken: string, userId: string) {
  const [
    profiles,
    patientProfiles,
    taskRows,
    notificationRows,
    diaryRows,
    gameRows,
    memoryRows,
  ] = await Promise.all([
    authRequest<Row[]>(accessToken, tableQuery("profiles", `select=id,role,display_name,preferred_language&id=eq.${encoded(userId)}&limit=1`)),
    authRequest<Row[]>(accessToken, tableQuery("patient_profiles", `select=id,age,region,home_address,caregiver_name,caregiver_relationship,caregiver_phone,is_test_data&id=eq.${encoded(userId)}&limit=1`)),
    authRequest<Row[]>(accessToken, tableQuery("care_tasks", `select=id,title,time_text,recurrence,category,icon,status,due_at,updated_at&patient_id=eq.${encoded(userId)}&order=updated_at.desc`)),
    authRequest<Row[]>(accessToken, tableQuery("notifications", `select=id,title,body,kind,read_at,created_at&patient_id=eq.${encoded(userId)}&order=created_at.desc`)),
    authRequest<Row[]>(accessToken, tableQuery("voice_diary_entries", `select=id,transcript,language,audio_path,audio_status,possible_task,created_at&patient_id=eq.${encoded(userId)}&order=created_at.desc`)),
    authRequest<Row[]>(accessToken, tableQuery("game_sessions", `select=id,game_key,score,mistakes,played_at&patient_id=eq.${encoded(userId)}&order=played_at.desc`)),
    authRequest<Row[]>(accessToken, tableQuery("memory_cues", `select=id,cue_type,title,detail,icon,updated_at&patient_id=eq.${encoded(userId)}&order=updated_at.desc`)),
  ]);

  const profile = profiles[0] ?? null;
  const patientProfile = patientProfiles[0] ?? null;
  const scores = gameRows
    .map((row) => (typeof row.score === "number" ? row.score : null))
    .filter((score): score is number => score !== null);
  const lastGame = gameRows[0] ?? null;

  return {
    patient:
      profile && patientProfile
        ? {
            id: profile.id,
            name: profile.display_name,
            age: patientProfile.age ?? 0,
            region: patientProfile.region ?? "",
            languages: profile.preferred_language ? [profile.preferred_language] : ["English"],
            caregiverName: patientProfile.caregiver_name ?? "",
            caregiverRelationship: patientProfile.caregiver_relationship ?? "",
            caregiverPhone: patientProfile.caregiver_phone ?? "",
            homeAddress: patientProfile.home_address ?? "",
          }
        : null,
    tasks: taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      time: row.time_text ?? "",
      category: row.category,
      icon: row.icon ?? "calendar",
      status: row.status,
      recurrence: row.recurrence ?? null,
      dueAt: row.due_at ?? null,
    })),
    notifications: notificationRows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      time: row.created_at,
      kind: row.kind,
      read: row.read_at !== null,
    })),
    diaryEntries: diaryRows.map((row) => ({
      id: row.id,
      transcript: row.transcript,
      createdAt: row.created_at,
      audioUri: row.audio_path ?? null,
      audioStatus: row.audio_status,
      possibleTask: row.possible_task ?? null,
    })),
    gameProgress: {
      sessions: gameRows.length,
      bestScore: scores.length ? Math.max(...scores) : 0,
      lastScore: typeof lastGame?.score === "number" ? lastGame.score : null,
      lastPlayedAt: lastGame?.played_at ?? null,
    },
    memoryCues: memoryRows.map((row) => ({
      id: row.id,
      type: row.cue_type,
      title: row.title,
      detail: row.detail ?? "",
      icon: row.icon ?? null,
    })),
    syncedAt: new Date().toISOString(),
  };
}

function readOperation(value: unknown): SyncOperation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const entity = record.entity;
  const action = record.action;
  if (
    typeof record.id !== "string" ||
    !["task", "notification", "diary", "game", "memory"].includes(String(entity)) ||
    !["upsert", "delete"].includes(String(action)) ||
    !record.payload ||
    typeof record.payload !== "object"
  ) {
    return null;
  }

  return {
    id: record.id,
    entity: entity as SyncEntity,
    action: action as SyncAction,
    payload: record.payload as Row,
  };
}

function operationTable(entity: SyncEntity): string {
  return {
    task: "care_tasks",
    notification: "notifications",
    diary: "voice_diary_entries",
    game: "game_sessions",
    memory: "memory_cues",
  }[entity];
}

function operationRow(operation: SyncOperation, patientId: string): Row {
  const payload = operation.payload;
  if (!isUuid(payload.id)) throw new Error(`Sync operation ${operation.id} has an invalid record ID.`);

  if (operation.entity === "task") {
    const title = readString(payload.title);
    if (!title) throw new Error(`Sync operation ${operation.id} is missing a task title.`);
    return {
      id: payload.id,
      patient_id: patientId,
      title,
      time_text: readString(payload.time),
      recurrence: readString(payload.recurrence),
      category: readString(payload.category) || "routine",
      icon: readString(payload.icon) || "calendar",
      status: readString(payload.status) || "pending",
      due_at: payload.dueAt ?? null,
      updated_at: new Date().toISOString(),
    };
  }

  if (operation.entity === "notification") {
    return {
      id: payload.id,
      patient_id: patientId,
      title: readString(payload.title),
      body: readString(payload.body),
      kind: readString(payload.kind) || "gentle",
      read_at: payload.read ? new Date().toISOString() : null,
      created_at: payload.createdAt ?? new Date().toISOString(),
    };
  }

  if (operation.entity === "diary") {
    const requestedAudioStatus = readString(payload.audioStatus);
    const audioStatus =
      requestedAudioStatus === "uploading" || requestedAudioStatus === "failed"
        ? requestedAudioStatus
        : "ready";
    return {
      id: payload.id,
      patient_id: patientId,
      transcript: readString(payload.transcript),
      language: readString(payload.language) || null,
      audio_path: payload.audioUri ?? null,
      audio_status: audioStatus,
      possible_task: payload.possibleTask ?? null,
      created_at: payload.createdAt ?? new Date().toISOString(),
    };
  }

  if (operation.entity === "game") {
    return {
      id: payload.id,
      patient_id: patientId,
      game_key: readString(payload.gameKey) || "memory-pairs",
      score: typeof payload.score === "number" ? payload.score : 0,
      mistakes: typeof payload.mistakes === "number" ? payload.mistakes : 0,
      played_at: payload.playedAt ?? new Date().toISOString(),
    };
  }

  return {
    id: payload.id,
    patient_id: patientId,
    cue_type: readString(payload.type) || "routine",
    title: readString(payload.title),
    detail: readString(payload.detail),
    icon: readString(payload.icon) || null,
    updated_at: new Date().toISOString(),
  };
}

async function applyOperation(accessToken: string, patientId: string, operation: SyncOperation) {
  const table = operationTable(operation.entity);
  if (operation.action === "delete") {
    if (!isUuid(operation.payload.id)) {
      throw new Error(`Sync operation ${operation.id} has an invalid record ID.`);
    }
    await authRequest<unknown>(
      accessToken,
      tableQuery(table, `id=eq.${encoded(operation.payload.id)}&patient_id=eq.${encoded(patientId)}`),
      { method: "DELETE" },
    );
    return;
  }

  await authRequest<unknown>(
    accessToken,
    `/rest/v1/${table}`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: operationRow(operation, patientId),
    },
  );
}

router.get("/me/snapshot", requireAuth, async (request, response) => {
  try {
    response.json(await getSnapshotForRequest(request));
  } catch (error) {
    sendDataError(response, error);
  }
});

router.put("/me/profile", requireAuth, async (request, response) => {
  const userId = getUserId(request);
  const displayName = readString(request.body?.displayName);
  const preferredLanguage = readString(request.body?.preferredLanguage) || "English";

  if (!displayName) {
    response.status(400).json({ error: "A display name is required." });
    return;
  }

  try {
    await authRequest<unknown>(request.auth!.accessToken, "/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: {
        id: userId,
        role: request.auth!.user.user_metadata?.role === "caregiver" ? "caregiver" : "patient",
        display_name: displayName,
        preferred_language: preferredLanguage,
      },
    });

    await authRequest<unknown>(request.auth!.accessToken, "/rest/v1/patient_profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: {
        id: userId,
        age: typeof request.body?.age === "number" ? request.body.age : null,
        region: readString(request.body?.region) || null,
        home_address: readString(request.body?.homeAddress) || null,
        caregiver_name: readString(request.body?.caregiverName) || null,
        caregiver_relationship: readString(request.body?.caregiverRelationship) || null,
        caregiver_phone: readString(request.body?.caregiverPhone) || null,
        is_test_data: false,
      },
    });

    response.json(await getSnapshotWithUserId(request.auth!.accessToken, userId));
  } catch (error) {
    sendDataError(response, error);
  }
});

router.post("/me/sync", requireAuth, async (request, response) => {
  const rawOperations = Array.isArray(request.body?.operations) ? request.body.operations : null;
  if (!rawOperations || rawOperations.length > 100) {
    response.status(400).json({ error: "Send between 1 and 100 sync operations." });
    return;
  }

  const operations: Array<SyncOperation | null> = rawOperations.map((value: unknown) => readOperation(value));
  if (operations.some((operation) => operation === null)) {
    response.status(400).json({ error: "One or more sync operations are invalid." });
    return;
  }

  try {
    const patientId = getUserId(request);
    for (const operation of operations as SyncOperation[]) {
      await applyOperation(request.auth!.accessToken, patientId, operation);
    }
    response.json({
      acceptedOperationIds: (operations as SyncOperation[]).map((operation) => operation.id),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && !(error instanceof SupabaseRequestError)) {
      response.status(400).json({ error: error.message });
      return;
    }
    sendDataError(response, error);
  }
});

export default router;