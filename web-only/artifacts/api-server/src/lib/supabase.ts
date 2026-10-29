import { ReplitConnectors } from "@replit/connectors-sdk";

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

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {},
): Promise<T> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy(CONNECTOR_NAME, path, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const body = parseResponseBody(await response.text());
  if (!response.ok) {
    throw new SupabaseRequestError(response.status, body);
  }

  return body as T;
}

export async function supabaseRawRequest(path: string): Promise<Response> {
  const connectors = new ReplitConnectors();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${connectors.getProxyUrl()}${normalizedPath}`;
  const headers = await connectors.getProxyHeaders(CONNECTOR_NAME);
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { ...headers, Accept: "application/json" },
  });

  if (response.status === 401) {
    const refreshedHeaders = await connectors.getProxyHeaders(CONNECTOR_NAME);
    return fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { ...refreshedHeaders, Accept: "application/json" },
    });
  }

  return response;
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