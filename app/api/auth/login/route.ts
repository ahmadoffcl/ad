export const runtime = "edge";
export const dynamic = "force-dynamic";

import { getDb, noDbResponse } from "@/lib/db";
import {
  createSession,
  isSecureRequest,
  sessionCookie,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: Request): Promise<Response> {
  const db = getDb();
  if (!db) return noDbResponse();

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const row = await db
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string; email: string; name: string; password_hash: string }>();

  if (!row || !(await verifyPassword(body.password ?? "", row.password_hash))) {
    // Same message for unknown email vs wrong password — no user enumeration.
    return Response.json({ error: "Wrong email or password." }, { status: 401 });
  }
  const token = await createSession(db, row.id);
  return Response.json(
    { user: { id: row.id, email: row.email, name: row.name } },
    { headers: { "Set-Cookie": sessionCookie(token, isSecureRequest(req)) } }
  );
}
