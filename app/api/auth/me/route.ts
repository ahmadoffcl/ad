export const runtime = "edge";
export const dynamic = "force-dynamic";

import { getDb, noDbResponse } from "@/lib/db";
import { getSessionUser, readSessionCookie } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  const db = getDb();
  if (!db) return noDbResponse();
  const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user });
}
