
const CONNECTOR_NAME = "supabase";
const PROFILES_TABLE = "/rest/v1/profiles?select=id&limit=1";

export interface SupabaseRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}

export class SupabaseRequestError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, details: unknown) {
    super(`Supabase request failed with status ${status}`);
    this.name = "SupabaseRequestError";
    this.status = status;
    this.details = details;
  }
}

function parseResponseBody(text: string): unknown {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  if (!url || !key) throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return { url, key };
}

async function request(path: string, options: SupabaseRequestOptions = {}): Promise<Response> {
  const { url, key } = supabaseConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${url}${normalizedPath}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      apikey: key,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.body === undefined ? {} : { Prefer: "return=minimal" }),
      Authorization: options.headers?.Authorization ?? `Bearer ${key}`,
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

export async function supabaseRequest<T>(path: string, options: SupabaseRequestOptions = {}): Promise<T> {
  const response = await request(path, options);
  const body = parseResponseBody(await response.text());
  if (!response.ok) throw new SupabaseRequestError(response.status, body);
  return body as T;
}

export async function supabaseRawRequest(path: string): Promise<Response> {
  return request(path);
}
export async function getSupabaseStatus() {
  try {
    await supabaseRequest<unknown[]>(PROFILES_TABLE);
    return {
      connected: true,
      schemaReady: true,
      message: "Supabase is connected and the Medha AI schema is available.",
    };
  } catch (error) {
    if (error instanceof SupabaseRequestError && error.status === 404) {
      return {
        connected: true,
        schemaReady: false,
        message:
          "Supabase is connected, but the Medha AI schema has not been applied yet.",
      };
    }

    return {
      connected: false,
      schemaReady: false,
      message: "Supabase could not be reached through the connected connector.",
    };
  }
}