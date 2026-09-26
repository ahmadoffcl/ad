export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/generate-concepts
 * Body: { brief, brand, prefs? }
 * Draft → self-critique → Slop Shield QC. Anything failing QC is replaced
 * by the deterministic engine. Always returns a `source` badge.
 */
import { getDb, getAI, noAiResponse } from "@/lib/db";
import { getSessionUser, readSessionCookie } from "@/lib/auth";
import { generateConceptsAI } from "@/lib/ai";
import { generateConcepts } from "@/lib/campaign";
import type { Brand, Brief, DirectorPrefs } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  const ai = getAI();
  let body: { brief?: Brief; brand?: Brand; director?: DirectorPrefs };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { brief, brand } = body;
  if (!brief?.product || !brand) {
    return Response.json({ error: "brief.product and brand are required." }, { status: 400 });
  }

  // In production (DB present) this is an authenticated endpoint.
  const db = getDb();
  if (db) {
    const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!ai) {
    // Honest fallback: deterministic engines serve transparently.
    return Response.json({
      concepts: generateConcepts(brief, brand),
      source: "deterministic",
      demo: !db,
    });
  }

  try {
    const result = await generateConceptsAI(ai, brief, brand, body.director ?? brand.director);
    return Response.json(result);
  } catch (e) {
    console.error("generate-concepts AI failed:", e);
    return Response.json({
      concepts: generateConcepts(brief, brand),
      source: "deterministic",
    });
  }
}
