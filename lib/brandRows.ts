import type { Brand } from "./types";

/** Map a D1 brands row to the client Brand shape (director prefs live in `prefs`). */
export function rowToBrand(row: Record<string, unknown>): Brand {
  const fonts = safeJson(row.fonts);
  return {
    id: row.id as string,
    name: row.name as string,
    tagline: (row.tagline as string) ?? "",
    industry: (row.industry as string) ?? "",
    colors: safeJson(row.colors) as Brand["colors"],
    displayFont: (fonts.display as string) ?? "Space Grotesk",
    bodyFont: (fonts.body as string) ?? "Inter",
    tone: (row.tone as string) ?? "",
    voice: safeJson(row.voice) as string[],
    banned: safeJson(row.banned) as string[],
    director: safeJson(row.prefs) as Brand["director"],
  };
}

function safeJson(s: unknown): any {
  try {
    if (typeof s !== "string" || !s) return {};
    return JSON.parse(s);
  } catch {
    return {};
  }
}
