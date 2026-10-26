import type { NextFunction, Request, Response } from "express";
import { getCurrentUser, type SupabaseUser } from "../lib/auth";

export interface AuthContext {
  accessToken: string;
  user: SupabaseUser;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function readBearerToken(request: Request): string | null {
  const value = request.header("authorization");
  if (!value) return null;

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    response.status(401).json({ error: "A bearer access token is required." });
    return;
  }

  try {
    const user = await getCurrentUser(accessToken);
    request.auth = { accessToken, user };
    next();
  } catch {
    response.status(401).json({ error: "The session is missing, expired, or invalid." });
  }
}