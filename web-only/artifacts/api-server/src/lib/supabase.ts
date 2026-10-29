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
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

function requestHeaders(key: string, extra: Record<string, string> = {}) {
  return {
    Accept: "application/json",
    apikey: key,
    ...extra,
  };
}

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const { url, key } = supabaseConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${url}${normalizedPath}`, {
    method: options.method ?? "GET",
    headers: requestHeaders(key, {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    }),
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const body = parseResponseBody(await response.text());
  if (!response.ok) {
    throw new SupabaseRequestError(response.status, body);
  }

  return body as T;
}

export async function supabaseRawRequest(path: string): Promise<Response> {
  const { url, key } = supabaseConfig();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${url}${normalizedPath}`, {
    method: "GET",
    redirect: "manual",
    headers: requestHeaders(key),
  });
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
      message: "Supabase could not be reached with the configured environment.",
    };
  }
}
