import { db } from "./db";
import type { User, Session } from "./db/types";
import { sha256 } from "./sha";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "./encoding";
import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
} from "./constants";

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession(
  token: string,
  userId: number,
): Promise<Session> {
  const sessionId = encodeHexLowerCase(
    await sha256(new TextEncoder().encode(token)),
  );

  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session: Session = {
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  };

  await db.query(
    "INSERT INTO orange_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [session.id, session.user_id, session.expires_at],
  );

  return session;
}

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  "use cache";
  const sessionId = encodeHexLowerCase(
    await sha256(new TextEncoder().encode(token)),
  );

  const sessionResult = await db.query<{ user_id: number; expires_at: Date }>(
    `SELECT user_id, expires_at FROM orange_sessions WHERE id = $1 LIMIT 1`,
    [sessionId],
  );

  if (sessionResult.rowCount === 0) {
    return { session: null, user: null };
  }

  const { user_id, expires_at } = sessionResult.rows[0];
  const now = Date.now();
  const expiresAtMs = expires_at.getTime();

  if (now >= expiresAtMs) {
    db.query("DELETE FROM orange_sessions WHERE id = $1", [sessionId]);
    return { session: null, user: null };
  }

  const userResult = await db.query<User>(
    `SELECT id, google_id, email, name, picture FROM orange_users WHERE id = $1 LIMIT 1`,
    [user_id],
  );

  if (userResult.rowCount === 0) {
    db.query("DELETE FROM orange_sessions WHERE id = $1", [sessionId]);
    return { session: null, user: null };
  }

  const user = userResult.rows[0];
  const session: Session = {
    id: sessionId,
    user_id: user.id,
    expires_at,
  };

  const refreshThresholdMs = SESSION_REFRESH_THRESHOLD_SECONDS * 1000;
  if (now >= expiresAtMs - refreshThresholdMs) {
    const newExpiresAt = new Date(now + 1000 * 60 * 60 * 24 * 30);
    await db.query("UPDATE orange_sessions SET expires_at = $1 WHERE id = $2", [
      newExpiresAt,
      session.id,
    ]);
    session.expires_at = newExpiresAt;
  }

  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.query("DELETE FROM orange_sessions WHERE id = $1", [sessionId]);
}
