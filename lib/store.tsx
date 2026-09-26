"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ActivityItem,
  ApiKey,
  AppNotification,
  Autopilot,
  Brand,
  ForgeSettings,
  Gate,
  NotificationPrefs,
  PipelineItem,
  Profile,
  ScheduledPost,
  Stage,
} from "./types";
import {
  SEED_ACTIVITY,
  SEED_ANALYTICS,
  SEED_API_KEYS,
  SEED_BRANDS,
  SEED_NOTIFICATIONS,
  SEED_PIPELINE,
  SEED_PROFILE,
  SEED_SCHEDULED,
  SEED_TRENDS,
} from "./seed";
import type { AnalyticsPost, TrendItem } from "./types";

const KEY = "adforge-v1";
export const IG_DAILY_LIMIT = 25;

const STAGE_ORDER: Stage[] = ["ideas", "producing", "review", "scheduled", "live"];

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

interface ForgeState {
  brands: Brand[];
  activeBrandId: string;
  pipeline: PipelineItem[];
  scheduled: ScheduledPost[];
  settings: ForgeSettings;
  activity: ActivityItem[];
  trends: TrendItem[];
  analytics: AnalyticsPost[];
  profile: Profile;
  apiKeys: ApiKey[];
  notificationPrefs: NotificationPrefs;
  notifications: AppNotification[];
}

interface ForgeContextValue extends ForgeState {
  activeBrand: Brand;
  setActiveBrand: (id: string) => void;
  updateBrand: (id: string, patch: Partial<Brand>) => void;
  updateBrandColors: (id: string, colors: Partial<Brand["colors"]>) => void;
  addPipelineItem: (item: Omit<PipelineItem, "id" | "updatedAt">) => PipelineItem;
  setPipelineStage: (id: string, stage: Stage) => void;
  advancePipeline: (id: string) => void;
  setGate: (id: string, gate: Gate) => void;
  schedulePosts: (posts: Omit<ScheduledPost, "id">[]) => void;
  movePost: (id: string, date: string) => void;
  removePost: (id: string) => void;
  autoSpread: (dateISO: string) => number;
  countForDay: (dateISO: string) => number;
  updateSettings: (patch: Partial<ForgeSettings>) => void;
  setConnection: (id: string, status: "connected" | "disconnected") => void;
  pushActivity: (text: string, kind: ActivityItem["kind"]) => void;
  resetDemo: () => void;
  /* profile / account */
  updateProfile: (patch: Partial<Profile>) => void;
  generateApiKey: (name: string) => ApiKey;
  revokeApiKey: (id: string) => void;
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "read">) => void;
  unreadCount: number;
}

const ForgeContext = createContext<ForgeContextValue | null>(null);

function seedState(): ForgeState {
  return {
    brands: SEED_BRANDS,
    activeBrandId: "kova",
    pipeline: SEED_PIPELINE,
    scheduled: SEED_SCHEDULED,
    settings: {
      autopilot: "gates",
      slopSensitivity: 60,
      connections: { instagram: "connected" },
    },
    activity: SEED_ACTIVITY,
    trends: SEED_TRENDS,
    analytics: SEED_ANALYTICS,
    profile: { ...SEED_PROFILE, plan: SEED_PROFILE.plan as Profile["plan"] },
    apiKeys: SEED_API_KEYS.map((k) => ({ ...k })),
    notificationPrefs: { product: true, weekly: true, mentions: true, autopilot: true },
    notifications: SEED_NOTIFICATIONS.map((n) => ({
      ...n,
      kind: n.kind as AppNotification["kind"],
    })),
  };
}

export function ForgeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ForgeState>(seedState);
  const loaded = useRef(false);

  // hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ForgeState>;
        setState((s) => ({
          ...s,
          ...parsed,
          trends: SEED_TRENDS,
          analytics: SEED_ANALYTICS,
        }));
      }
    } catch {
      /* corrupted storage — fall back to seed */
    }
    loaded.current = true;
  }, []);

  // persist
  useEffect(() => {
    if (!loaded.current) return;
    try {
      const { trends, analytics, ...persist } = state;
      void trends;
      void analytics;
      localStorage.setItem(KEY, JSON.stringify(persist));
    } catch {
      /* storage full/blocked — non-fatal */
    }
  }, [state]);

  const pushActivity = useCallback((text: string, kind: ActivityItem["kind"]) => {
    setState((s) => ({
      ...s,
      activity: [{ id: uid("ac"), text, time: "Just now", kind }, ...s.activity].slice(0, 40),
    }));
  }, []);

  const value = useMemo<ForgeContextValue>(() => {
    const activeBrand =
      state.brands.find((b) => b.id === state.activeBrandId) ?? state.brands[0];

    return {
      ...state,
      activeBrand,

      setActiveBrand: (id) =>
        setState((s) => ({ ...s, activeBrandId: id })),

      updateBrand: (id, patch) =>
        setState((s) => ({
          ...s,
          brands: s.brands.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      updateBrandColors: (id, colors) =>
        setState((s) => ({
          ...s,
          brands: s.brands.map((b) =>
            b.id === id ? { ...b, colors: { ...b.colors, ...colors } } : b
          ),
        })),

      addPipelineItem: (item) => {
        const full: PipelineItem = {
          ...item,
          id: uid("p"),
          updatedAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, pipeline: [full, ...s.pipeline] }));
        return full;
      },

      setPipelineStage: (id, stage) =>
        setState((s) => ({
          ...s,
          pipeline: s.pipeline.map((p) =>
            p.id === id ? { ...p, stage, updatedAt: new Date().toISOString() } : p
          ),
        })),

      advancePipeline: (id) =>
        setState((s) => ({
          ...s,
          pipeline: s.pipeline.map((p) => {
            if (p.id !== id) return p;
            const next = STAGE_ORDER[Math.min(STAGE_ORDER.indexOf(p.stage) + 1, STAGE_ORDER.length - 1)];
            return { ...p, stage: next, updatedAt: new Date().toISOString() };
          }),
        })),

      setGate: (id, gate) =>
        setState((s) => ({
          ...s,
          pipeline: s.pipeline.map((p) => (p.id === id ? { ...p, gate } : p)),
        })),

      schedulePosts: (posts) =>
        setState((s) => ({
          ...s,
          scheduled: [
            ...s.scheduled,
            ...posts.map((p) => ({ ...p, id: uid("s") })),
          ],
        })),

      movePost: (id, date) =>
        setState((s) => ({
          ...s,
          scheduled: s.scheduled.map((p) => (p.id === id ? { ...p, date } : p)),
        })),

      removePost: (id) =>
        setState((s) => ({
          ...s,
          scheduled: s.scheduled.filter((p) => p.id !== id),
        })),

      countForDay: (dateISO) =>
        state.scheduled.filter(
          (p) => p.date === dateISO && p.status !== "posted" && p.status !== "failed"
        ).length,

      /**
       * Auto-spread: cap each day at IG_DAILY_LIMIT active posts.
       * Overflow rolls to the next day with headroom, preserving time order.
       * Returns the number of posts moved.
       */
      autoSpread: (dateISO) => {
        const dayActive = state.scheduled
          .filter((p) => p.date === dateISO && p.status !== "posted" && p.status !== "failed")
          .sort((a, b) => a.time.localeCompare(b.time));
        if (dayActive.length <= IG_DAILY_LIMIT) return 0;
        const overflow = dayActive.slice(IG_DAILY_LIMIT);
        const counts = new Map<string, number>();
        state.scheduled.forEach((p) => {
          if (p.status !== "posted" && p.status !== "failed") {
            counts.set(p.date, (counts.get(p.date) ?? 0) + 1);
          }
        });
        const moves = new Map<string, string>();
        overflow.forEach((post) => {
          const d = new Date(`${dateISO}T12:00:00`);
          for (;;) {
            d.setDate(d.getDate() + 1);
            const iso = d.toISOString().slice(0, 10);
            const c = counts.get(iso) ?? 0;
            if (c < IG_DAILY_LIMIT) {
              moves.set(post.id, iso);
              counts.set(iso, c + 1);
              counts.set(dateISO, (counts.get(dateISO) ?? 1) - 1);
              break;
            }
          }
        });
        setState((s) => ({
          ...s,
          scheduled: s.scheduled.map((p) =>
            moves.has(p.id) ? { ...p, date: moves.get(p.id) as string } : p
          ),
        }));
        return moves.size;
      },

      updateSettings: (patch) =>
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      setConnection: (id, status) =>
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            connections: { ...s.settings.connections, [id]: status },
          },
        })),

      pushActivity,

      resetDemo: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* noop */
        }
        setState(seedState());
      },

      updateProfile: (patch) =>
        setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),

      generateApiKey: (name) => {
        const rand = () =>
          Array.from({ length: 4 }, () =>
            Math.floor(Math.random() * 36).toString(36)
          ).join("");
        const key: ApiKey = {
          id: uid("k"),
          name,
          prefix: `af_live_${rand()}`,
          created: "Just now",
          lastUsed: "Never",
        };
        setState((s) => ({ ...s, apiKeys: [key, ...s.apiKeys] }));
        return key;
      },

      revokeApiKey: (id) =>
        setState((s) => ({ ...s, apiKeys: s.apiKeys.filter((k) => k.id !== id) })),

      updateNotificationPrefs: (patch) =>
        setState((s) => ({
          ...s,
          notificationPrefs: { ...s.notificationPrefs, ...patch },
        })),

      markNotificationRead: (id) =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllNotificationsRead: () =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      pushNotification: (n) =>
        setState((s) => ({
          ...s,
          notifications: [{ ...n, id: uid("n"), read: false }, ...s.notifications].slice(0, 30),
        })),

      unreadCount: state.notifications.filter((n) => !n.read).length,
    };
  }, [state, pushActivity]);

  return <ForgeContext.Provider value={value}>{children}</ForgeContext.Provider>;
}

export function useForge(): ForgeContextValue {
  const ctx = useContext(ForgeContext);
  if (!ctx) throw new Error("useForge must be used inside ForgeProvider");
  return ctx;
}

export type { Autopilot };
