export type Aspect = "1:1" | "9:16" | "16:9";
export type PlatformId =
  | "ig-feed"
  | "ig-reel"
  | "ig-story"
  | "tiktok"
  | "shorts"
  | "x";

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  short: string;
  aspect: Aspect;
  captionLimit: number;
  captionHint: string;
  hashtagMin: number;
  hashtagMax: number;
  video: boolean;
}

export interface BrandColors {
  ink: string;
  paper: string;
  accent: string;
  muted: string;
}

export interface Brand {
  id: string;
  name: string;
  tagline: string;
  industry: string;
  colors: BrandColors;
  displayFont: string;
  bodyFont: string;
  tone: string;
  voice: string[];
  banned: string[];
  director?: DirectorPrefs;
}

export interface ScorePart {
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface HookResult {
  score: number;
  grade: string;
  parts: ScorePart[];
}

export interface QCCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  note: string;
}

export interface AdVariant {
  platform: PlatformId;
  caption: string;
  hashtags: string[];
  cta: string;
}

export interface AdConcept {
  id: string;
  brandId: string;
  name: string;
  angle: string;
  headline: string;
  sub: string;
  cta: string;
  visual: {
    bg: string;
    fg: string;
    accent: string;
    motif: string;
    layout: string;
  };
  hook: HookResult;
  slop: QCCheck[];
  slopStatus: "pass" | "warn" | "fail";
  variants: AdVariant[];
  createdAt: string;
}

export type Stage = "ideas" | "producing" | "review" | "scheduled" | "live";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "ideas", label: "Ideas", hint: "Raw sparks" },
  { id: "producing", label: "Producing", hint: "In the studio" },
  { id: "review", label: "In Review", hint: "Gates apply" },
  { id: "scheduled", label: "Scheduled", hint: "Queued to post" },
  { id: "live", label: "Live", hint: "Out in the wild" },
];

export type Gate = "auto-ok" | "awaiting" | "overridden";

export interface PipelineItem {
  id: string;
  title: string;
  brandId: string;
  conceptId?: string;
  stage: Stage;
  gate: Gate;
  hookScore: number;
  platforms: PlatformId[];
  due: string;
  updatedAt: string;
}

export interface ScheduledPost {
  id: string;
  title: string;
  brandId: string;
  platform: PlatformId;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:MM
  status: "queued" | "scheduled" | "posted" | "failed";
}

export interface TrendItem {
  id: string;
  title: string;
  platform: string;
  heat: number;
  format: string;
  hook: string;
  why: string;
  growth: string;
  prefill: {
    product: string;
    audience: string;
    goal: string;
    offer: string;
    angle: string;
  };
}

export interface AnalyticsPost {
  id: string;
  title: string;
  brandId: string;
  platform: PlatformId;
  date: string;
  headlineWords: number;
  hasQuestion: boolean;
  hasCta: boolean;
  hookScore: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  kind: "post" | "qc" | "concept" | "system";
}

export type Autopilot = "manual" | "gates" | "full";

export interface ForgeSettings {
  autopilot: Autopilot;
  slopSensitivity: number; // 0–100
  connections: Record<string, "connected" | "disconnected">;
}

export interface Brief {
  product: string;
  audience: string;
  goal: string;
  offer: string;
  platforms: PlatformId[];
  brandId: string;
  trendAngle?: string;
}

export interface Learning {
  title: string;
  detail: string;
  delta: string;
  tone: "up" | "neutral";
}

export const GOALS = [
  { id: "launch", label: "Launch", hint: "New drop, maximum noise" },
  { id: "sales", label: "Sales", hint: "Move units this week" },
  { id: "awareness", label: "Awareness", hint: "Get the name out" },
  { id: "retention", label: "Retention", hint: "Bring them back" },
];

/* ---------------- profile / account ---------------- */

export interface Profile {
  name: string;
  handle: string;
  workspace: string;
  role: string;
  plan: "Forge Pro" | "Forge Team" | "Forge Free";
  avatarColor: string;
  email: string;
  timezone: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
}

export interface NotificationPrefs {
  product: boolean;
  weekly: boolean;
  mentions: boolean;
  autopilot: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: "info" | "success" | "warn";
  read: boolean;
}

export const AVATAR_COLORS = [
  "#FF5A1F",
  "#D9A441",
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#a78bfa",
  "#fbbf24",
  "#94a3b8",
];

/* ---------------- director's controls ---------------- */

/** Per-brand generation preferences — the human is the director, AI is the crew. */
export interface DirectorPrefs {
  tone: string;
  hookStyle: "auto" | "question" | "bold-claim" | "story" | "stat";
  ctaType: "auto" | "shop" | "learn" | "follow" | "comment";
  captionLength: "short" | "medium" | "long";
  emoji: boolean;
  creativity: number; // 0–100 slider → temperature
  avoid: string; // negative prompt
}
