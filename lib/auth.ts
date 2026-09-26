/**
 * Auth primitives — PBKDF2-SHA256 via WebCrypto (edge-safe, no Node APIs),
 * random session tokens, httpOnly session cookies (30 days).
 */
import type { D1Database } from "@cloudflare/workers-types";

const SESSION_COOKIE = "adforge_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

const te = new TextEncoder();

function b64encode(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      key,
      256
    )
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64encode(salt)}$${b64encode(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iter, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2" || !iter || !saltB64 || !hashB64) return false;
    const salt = b64decode(saltB64);
    const expected = b64decode(hashB64);
    const key = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: salt as BufferSource, iterations: parseInt(iter, 10), hash: "SHA-256" },
        key,
        expected.length * 8
      )
    );
    return timingSafeEqual(bits, expected);
  } catch {
    return false;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expires)
    .run();
  return token;
}

export async function getSessionUser(
  db: D1Database,
  token: string | undefined | null
): Promise<SessionUser | null> {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')`
    )
    .bind(token)
    .first<{ id: string; email: string; name: string }>();
  return row ?? null;
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
}

export function sessionCookie(token: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 86400}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)adforge_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** API-key secret hashing (SHA-256 hex) — only the hash is stored. */
export async function hashApiKey(secret: string): Promise<string> {
  const bits = await crypto.subtle.digest("SHA-256", te.encode(secret));
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function isSecureRequest(req: Request): boolean {
  try {
    const url = new URL(req.url);
    if (url.protocol === "https:") return true;
  } catch {
    /* noop */
  }
  return process.env.NODE_ENV === "production";
}
