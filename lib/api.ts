/**
 * AdForge API client — talks to the Cloudflare D1-backed routes when they
 * exist, and degrades gracefully (returns null) when offline or unauthenticated
 * so the store can fall back to localStorage demo mode.
 */
import type {
  ApiKey,
  AppNotification,
  Brand,
  PipelineItem,
  Profile,
  ScheduledPost,
  Stage,
} from "./types";

async function req<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // offline / unreachable — caller falls back locally
  }
}

async function reqThrow<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return body as T;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: string;
}

/* ---------------- auth ---------------- */

export const api = {
  me: () => req<{ user: AuthUser }>("/api/auth/me"),
  login: (email: string, password: string) =>
    reqThrow<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (name: string, email: string, password: string) =>
    reqThrow<{ user: AuthUser }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  logout: () => req("/api/auth/logout", { method: "POST" }),

  /* ---------------- profile ---------------- */
  getProfile: () => req<{ profile: Profile }>("/api/profile"),
  putProfile: (profile: Partial<Profile>) =>
    req<{ profile: Profile }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),

  /* ---------------- brands ---------------- */
  listBrands: () => req<{ brands: Brand[] }>("/api/brands"),
  createBrand: (brand: Omit<Brand, "id">) =>
    reqThrow<{ brand: Brand }>("/api/brands", {
      method: "POST",
      body: JSON.stringify(brand),
    }),
  putBrand: (id: string, patch: Partial<Brand>) =>
    req(`/api/brands/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  /* ---------------- campaigns (pipeline) ---------------- */
  listCampaigns: () => req<{ campaigns: CampaignRow[] }>("/api/campaigns"),
  createCampaign: (item: PipelineItem) =>
    req<{ campaign: CampaignRow }>(
      "/api/campaigns",
      {
        method: "POST",
        body: JSON.stringify({
          name: item.title,
          status: stageToStatus(item.stage),
          stage: item.stage,
          payload: {
            brandId: item.brandId,
            conceptId: item.conceptId,
            gate: item.gate,
            hookScore: item.hookScore,
            platforms: item.platforms,
            due: item.due,
          },
        }),
      }
    ),
  patchCampaign: (id: string, patch: Partial<PipelineItem>) =>
    req(`/api/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(patch.title ? { name: patch.title } : {}),
        ...(patch.stage ? { status: stageToStatus(patch.stage), stage: patch.stage } : {}),
        payload: {
          ...(patch.brandId ? { brandId: patch.brandId } : {}),
          ...(patch.gate ? { gate: patch.gate } : {}),
          ...(patch.hookScore !== undefined ? { hookScore: patch.hookScore } : {}),
        },
      }),
    }),
  deleteCampaign: (id: string) => req(`/api/campaigns/${id}`, { method: "DELETE" }),

  /* ---------------- scheduled posts ---------------- */
  listScheduled: () => req<{ posts: ScheduledRow[] }>("/api/scheduled-posts"),
  createScheduled: (p: Omit<ScheduledPost, "id">) =>
    req<{ post: ScheduledRow }>(
      "/api/scheduled-posts",
      {
        method: "POST",
        body: JSON.stringify({
          brand_id: p.brandId,
          title: p.title,
          platform: p.platform,
          date: p.date,
          time: p.time,
          status: p.status,
        }),
      }
    ),
  patchScheduled: (id: string, patch: Partial<ScheduledPost>) =>
    req(`/api/scheduled-posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(patch.date ? { date: patch.date } : {}),
        ...(patch.status ? { status: patch.status } : {}),
      }),
    }),
  deleteScheduled: (id: string) => req(`/api/scheduled-posts/${id}`, { method: "DELETE" }),

  /* ---------------- notifications ---------------- */
  listNotifications: () => req<{ notifications: AppNotification[] }>("/api/notifications"),
  createNotification: (n: { title: string; body?: string; kind?: string }) =>
    req<{ notification: { id: string } }>("/api/notifications", {
      method: "POST",
      body: JSON.stringify(n),
    }),
  patchNotification: (id: string, read: boolean) =>
    req(`/api/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ read }) }),
  markAllNotificationsRead: () =>
    req("/api/notifications", { method: "POST", body: JSON.stringify({ markAll: true }) }),

  /* ---------------- api keys ---------------- */
  listApiKeys: () => req<{ keys: ApiKey[] }>("/api/api-keys"),
  createApiKey: (name: string) =>
    reqThrow<{ key: string; record: ApiKey }>("/api/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteApiKey: (id: string) => req(`/api/api-keys/${id}`, { method: "DELETE" }),
};

/* ---------------- row shapes + mappers ---------------- */

export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  stage: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScheduledRow {
  id: string;
  brand_id: string;
  title: string;
  platform: ScheduledPost["platform"];
  date: string;
  time: string;
  status: ScheduledPost["status"];
}

function stageToStatus(stage: Stage): string {
  if (stage === "scheduled") return "scheduled";
  if (stage === "live") return "live";
  return "active";
}

function statusToStage(status: string, stage: string): Stage {
  const s = stage as Stage;
  if (s === "ideas" || s === "producing" || s === "review" || s === "scheduled" || s === "live")
    return s;
  if (status === "scheduled") return "scheduled";
  if (status === "live") return "live";
  return "ideas";
}

export function campaignToPipeline(c: CampaignRow): PipelineItem {
  const p = c.payload || {};
  return {
    id: c.id,
    title: c.name,
    brandId: (p.brandId as string) || "kova",
    conceptId: p.conceptId as string | undefined,
    stage: statusToStage(c.status, c.stage),
    gate: (p.gate as PipelineItem["gate"]) || "ok",
    hookScore: (p.hookScore as number) ?? 0,
    platforms: (p.platforms as PipelineItem["platforms"]) || [],
    due: (p.due as string) || "",
    updatedAt: c.updated_at,
  };
}

export function scheduledRowToPost(r: ScheduledRow): ScheduledPost {
  return {
    id: r.id,
    title: r.title,
    brandId: r.brand_id,
    platform: r.platform,
    date: r.date,
    time: r.time,
    status: r.status,
  };
}
