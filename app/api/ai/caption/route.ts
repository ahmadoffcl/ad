export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/caption
 * Body: { platform, headline, sub, cta, brand }
 * AI-written placement-aware caption, validated by the Slop Shield —
 * failures fall back to the deterministic caption builder.
 */
import { getDb, getAI } from "@/lib/db";
import { getSessionUser, readSessionCookie } from "@/lib/auth";
import { captionAI } from "@/lib/ai";
import { buildCaption } from "@/lib/campaign";
import type { Brand, PlatformId } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { platform?: PlatformId; headline?: string; sub?: string; cta?: string; brand?: Brand };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { platform, headline, brand } = body;
  if (!platform || !headline?.trim() || !brand) {
    return Response.json({ error: "platform, headline and brand are required." }, { status: 400 });
  }

  const db = getDb();
  if (db) {
    const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const ai = getAI();
  if (!ai) {
    return Response.json({
      caption: buildCaption(platform, headline, body.sub ?? "", body.cta ?? "Shop now", brand, body.sub ?? ""),
      hashtags: [],
      source: "deterministic",
      demo: !db,
    });
  }
  try {
    return Response.json(
      await captionAI(ai, platform, headline, body.sub ?? "", body.cta ?? "Shop now", brand, brand.director)
    );
  } catch (e) {
    console.error("caption AI failed:", e);
    return Response.json({
      caption: buildCaption(platform, headline, body.sub ?? "", body.cta ?? "Shop now", brand, body.sub ?? ""),
      hashtags: [],
      source: "deterministic",
    });
  }
}
