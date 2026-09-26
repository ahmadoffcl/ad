export const runtime = "edge";
export const dynamic = "force-dynamic";

import { getDb, noDbResponse } from "@/lib/db";
import { clearSessionCookie, destroySession, readSessionCookie } from "@/lib/auth";

export async function POST(req: Request): Promise<Response> {
  const db = getDb();
  if (!db) return noDbResponse();
  const token = readSessionCookie(req.headers.get("cookie"));
  if (token) {
    try {
      await destroySession(db, token);
    } catch {
      /* already gone — still clear the cookie */
    }
  }
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookie() } }
  );
}
