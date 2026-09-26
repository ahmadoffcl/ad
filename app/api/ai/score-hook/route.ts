export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/score-hook
 * Body: { headline, caption }
 * Deterministic Hook Score + AI second opinion, blended 60/40.
 */
import { getDb, getAI } from "@/lib/db";
import { getSessionUser, readSessionCookie } from "@/lib/auth";
import { scoreHookAI } from "@/lib/ai";
import { scoreHook } from "@/lib/hookScore";

export async function POST(req: Request): Promise<Response> {
  let body: { headline?: string; caption?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const headline = (body.headline ?? "").trim();
  if (!headline) return Response.json({ error: "headline is required." }, { status: 400 });

  const db = getDb();
  if (db) {
    const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const ai = getAI();
  if (!ai) {
    const d = scoreHook(headline, body.caption ?? "").score;
    return Response.json({
      deterministic: d,
      ai: null,
      blended: d,
      source: "deterministic",
      demo: !db,
    });
  }
  try {
    return Response.json(await scoreHookAI(ai, headline, body.caption ?? ""));
  } catch (e) {
    console.error("score-hook AI failed:", e);
    const d = scoreHook(headline, body.caption ?? "").score;
    return Response.json({ deterministic: d, ai: null, blended: d, source: "deterministic" });
  }
}
