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
import {
  api,
  campaignToPipeline,
  scheduledRowToPost,
  type AuthUser,
} from "./api";

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
  createBrand: (input: { name: string; tagline?: string; industry?: string }) => Promise<string>;
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
  generateApiKey: (name: string) => Promise<ApiKey & { secret?: string }>;
  revokeApiKey: (id: string) => void;
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "read">) => void;
  unreadCount: number;
  /* auth + backend sync ("cloud" = D1 session, "local" = offline localStorage) */
  user: AuthUser | null;
  authLoading: boolean;
  authError: string | null;
  mode: "local" | "cloud";
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

  /* ---- auth + cloud sync ---- */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<"local" | "cloud">("local");
  const modeRef = useRef<"local" | "cloud">("local");
  /** local id -> server id, for rows created optimistically before the POST resolves */
  const serverIds = useRef(new Map<string, string>());
  const sid = (id: string) => serverIds.current.get(id) ?? id;
  const setModeBoth = (m: "local" | "cloud") => {
    modeRef.current = m;
    setMode(m);
  };

  const hydrateFromCloud = useCallback(async () => {
    const [p, b, c, s, n, k] = await Promise.all([
      api.getProfile(),
      api.listBrands(),
      api.listCampaigns(),
      api.listScheduled(),
      api.listNotifications(),
      api.listApiKeys(),
    ]);
    setState((prev) => {
      const brands = b && b.brands.length ? b.brands : prev.brands;
      return {
        ...prev,
        profile: p?.profile ?? prev.profile,
        brands,
        activeBrandId: brands.some((x) => x.id === prev.activeBrandId)
          ? prev.activeBrandId
          : brands[0].id,
        pipeline: c ? c.campaigns.map(campaignToPipeline) : prev.pipeline,
        scheduled: s ? s.posts.map(scheduledRowToPost) : prev.scheduled,
        notifications: n ? n.notifications : prev.notifications,
        apiKeys: k ? k.keys : prev.apiKeys,
      };
    });
  }, []);

  const pushActivity = useCallback((text: string, kind: ActivityItem["kind"]) => {
    setState((s) => ({
      ...s,
      activity: [{ id: uid("ac"), text, time: "Just now", kind }, ...s.activity].slice(0, 40),
    }));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const r = await api.login(email, password);
        setUser(r.user);
        setModeBoth("cloud");
        serverIds.current.clear();
        await hydrateFromCloud();
        return true;
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : "Sign in failed.");
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [hydrateFromCloud]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const r = await api.signup(name, email, password);
        setUser(r.user);
        setModeBoth("cloud");
        serverIds.current.clear();
        await hydrateFromCloud();
        pushActivity(`Welcome to the forge, ${r.user.name}`, "system");
        return true;
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : "Sign up failed.");
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [hydrateFromCloud, pushActivity]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* already out */
    }
    setUser(null);
    setModeBoth("local");
    setAuthError(null);
    serverIds.current.clear();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
    setState(seedState());
    pushActivity("Signed out", "system");
  }, [pushActivity]);

  // init: try a session first; fall back to localStorage demo mode
  useEffect(() => {
    (async () => {
      const me = await api.me();
      if (me?.user) {
        setUser(me.user);
        setModeBoth("cloud");
        await hydrateFromCloud();
      } else {
        setModeBoth("local");
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
      }
      loaded.current = true;
      setAuthLoading(false);
    })();
  }, [hydrateFromCloud]);

  // persist (local cache; harmless in cloud mode too)
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

  const value = useMemo<ForgeContextValue>(() => {
    const activeBrand =
      state.brands.find((b) => b.id === state.activeBrandId) ?? state.brands[0];

    return {
      ...state,
      activeBrand,

      setActiveBrand: (id) =>
        setState((s) => ({ ...s, activeBrandId: id })),

      updateBrand: (id, patch) => {
        setState((s) => ({
          ...s,
          brands: s.brands.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }));
        if (modeRef.current === "cloud") void api.putBrand(id, patch);
      },

      updateBrandColors: (id, colors) =>
        setState((s) => ({
          ...s,
          brands: s.brands.map((b) =>
            b.id === id ? { ...b, colors: { ...b.colors, ...colors } } : b
          ),
        })),

      createBrand: async (input) => {
        const draft: Brand = {
          id: uid("brand"),
          name: input.name.trim(),
          tagline: input.tagline?.trim() ?? "",
          industry: input.industry?.trim() ?? "",
          colors: { ink: "#101014", paper: "#FAFAF7", accent: "#FF5A1F", muted: "#8B8B93" },
          displayFont: "Space Grotesk",
          bodyFont: "Inter",
          tone: "",
          voice: [],
          banned: [],
        };
        setState((s) => ({
          ...s,
          brands: [...s.brands, draft],
          activeBrandId: draft.id,
        }));
        if (modeRef.current === "cloud") {
          try {
            const r = await api.createBrand(draft);
            if (r?.brand) {
              setState((s) => ({
                ...s,
                brands: s.brands.map((b) => (b.id === draft.id ? r.brand : b)),
                activeBrandId: s.activeBrandId === draft.id ? r.brand.id : s.activeBrandId,
              }));
              return r.brand.id;
            }
          } catch {
            /* offline — the local draft stays */
          }
        }
        return draft.id;
      },

      addPipelineItem: (item) => {
        const full: PipelineItem = {
          ...item,
          id: uid("p"),
          updatedAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, pipeline: [full, ...s.pipeline] }));
        if (modeRef.current === "cloud") {
          void api.createCampaign(full).then((r) => {
            const serverId = r?.campaign.id;
            if (!serverId) return;
            serverIds.current.set(full.id, serverId);
            setState((s) => ({
              ...s,
              pipeline: s.pipeline.map((p) =>
                p.id === full.id ? { ...p, id: serverId } : p
              ),
            }));
          });
        }
        return full;
      },

      setPipelineStage: (id, stage) => {
        setState((s) => ({
          ...s,
          pipeline: s.pipeline.map((p) =>
            p.id === id ? { ...p, stage, updatedAt: new Date().toISOString() } : p
          ),
        }));
        if (modeRef.current === "cloud") void api.patchCampaign(sid(id), { stage });
      },

      advancePipeline: (id) => {
        let next: Stage = "ideas";
        setState((s) => ({
          ...s,
          pipeline: s.pipeline.map((p) => {
            if (p.id !== id) return p;
            next =
              STAGE_ORDER[Math.min(STAGE_ORDER.indexOf(p.stage) + 1, STAGE_ORDER.length - 1)];
            return { ...p, stage: next, updatedAt: new Date().toISOString() };
          }),
        }));
        if (modeRef.current === "cloud")
          setTimeout(() => void api.patchCampaign(sid(id), { stage: next }), 0);
      },

      setGate: (id, gate) => {
        setState((s) => ({
          ...s,
          pipeline: s.pipeline.map((p) => (p.id === id ? { ...p, gate } : p)),
        }));
        if (modeRef.current === "cloud") void api.patchCampaign(sid(id), { gate });
      },

      schedulePosts: (posts) => {
        const full = posts.map((p) => ({ ...p, id: uid("s") }));
        setState((s) => ({ ...s, scheduled: [...s.scheduled, ...full] }));
        if (modeRef.current === "cloud") {
          void Promise.all(
            full.map((p) =>
              api.createScheduled(p).then((r) => ({ local: p.id, server: r?.post.id }))
            )
          ).then((pairs) => {
            const map = new Map(pairs.filter((x) => x.server).map((x) => [x.local, x.server as string]));
            if (!map.size) return;
            map.forEach((sv, lv) => serverIds.current.set(lv, sv));
            setState((s) => ({
              ...s,
              scheduled: s.scheduled.map((p) =>
                map.has(p.id) ? { ...p, id: map.get(p.id) as string } : p
              ),
            }));
          });
        }
      },

      movePost: (id, date) => {
        setState((s) => ({
          ...s,
          scheduled: s.scheduled.map((p) => (p.id === id ? { ...p, date } : p)),
        }));
        if (modeRef.current === "cloud") void api.patchScheduled(sid(id), { date });
      },

      removePost: (id) => {
        setState((s) => ({
          ...s,
          scheduled: s.scheduled.filter((p) => p.id !== id),
        }));
        if (modeRef.current === "cloud") void api.deleteScheduled(sid(id));
      },

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

      updateProfile: (patch) => {
        setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
        if (modeRef.current === "cloud") void api.putProfile(patch);
      },

      generateApiKey: async (name) => {
        if (modeRef.current === "cloud") {
          const r = await api.createApiKey(name);
          const rec = r.record;
          setState((s) => ({ ...s, apiKeys: [rec, ...s.apiKeys] }));
          return { ...rec, secret: r.key };
        }
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

      revokeApiKey: (id) => {
        setState((s) => ({ ...s, apiKeys: s.apiKeys.filter((k) => k.id !== id) }));
        if (modeRef.current === "cloud") void api.deleteApiKey(sid(id));
      },

      updateNotificationPrefs: (patch) =>
        setState((s) => ({
          ...s,
          notificationPrefs: { ...s.notificationPrefs, ...patch },
        })),

      markNotificationRead: (id) => {
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
        if (modeRef.current === "cloud") void api.patchNotification(sid(id), true);
      },

      markAllNotificationsRead: () => {
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
        if (modeRef.current === "cloud") void api.markAllNotificationsRead();
      },

      pushNotification: (n) => {
        const full = { ...n, id: uid("n"), read: false };
        setState((s) => ({
          ...s,
          notifications: [full, ...s.notifications].slice(0, 30),
        }));
        if (modeRef.current === "cloud") {
          void api
            .createNotification({ title: n.title, body: n.body, kind: n.kind })
            .then((r) => {
              const serverId = r?.notification.id;
              if (!serverId) return;
              serverIds.current.set(full.id, serverId);
              setState((s) => ({
                ...s,
                notifications: s.notifications.map((x) =>
                  x.id === full.id ? { ...x, id: serverId } : x
                ),
              }));
            });
        }
      },

      unreadCount: state.notifications.filter((n) => !n.read).length,

      /* auth */
      user,
      authLoading,
      authError,
      mode,
      login,
      signup,
      logout,
    };
  }, [state, pushActivity, mode, user, authLoading, authError, login, signup, logout]);

  return <ForgeContext.Provider value={value}>{children}</ForgeContext.Provider>;
}

export function useForge(): ForgeContextValue {
  const ctx = useContext(ForgeContext);
  if (!ctx) throw new Error("useForge must be used inside ForgeProvider");
  return ctx;
}

export type { Autopilot };
