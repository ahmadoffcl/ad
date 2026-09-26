"use client";

import { useState } from "react";
import { useForge } from "@/lib/store";
import { AVATAR_COLORS } from "@/lib/types";
import { CONNECTIONS } from "@/lib/seed";
import { useToast } from "@/lib/toast";
import { Avatar, Bar, Btn, Card, EmptyState, Field, Pill, SectionHead, Stat, Toggle } from "@/components/ui";
import AppearanceCard from "@/components/AppearanceCard";

/* ---------------- header ---------------- */

function HeaderCard() {
  const { profile, updateProfile } = useForge();
  const { push } = useToast();

  return (
    <Card className="mb-4 p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={profile.name} color={profile.avatarColor} size="lg" />
        <div className="min-w-0 flex-1">
          <Field label="Display name">
            <input
              className="input !min-h-0 max-w-xs !py-2 font-display text-lg font-bold"
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              aria-label="Display name"
            />
          </Field>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Handle">
              <input
                className="input"
                value={profile.handle}
                onChange={(e) => updateProfile({ handle: e.target.value })}
                aria-label="Handle"
              />
            </Field>
            <Field label="Workspace">
              <input
                className="input"
                value={profile.workspace}
                onChange={(e) => updateProfile({ workspace: e.target.value })}
                aria-label="Workspace"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone="accent">{profile.role}</Pill>
            <Pill tone="paper">{profile.plan}</Pill>
            <Pill>{profile.timezone}</Pill>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="label">Avatar color</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => {
            const on = profile.avatarColor === c;
            return (
              <button
                key={c}
                onClick={() => {
                  updateProfile({ avatarColor: c });
                  push("Avatar updated", { kind: "info" });
                }}
                aria-label={`Avatar color ${c}`}
                aria-pressed={on}
                className={`h-9 w-9 rounded-full transition-transform duration-150 hover:scale-110 ${
                  on ? "ring-2 ring-molten ring-offset-2 ring-offset-ink-2" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- overview ---------------- */

const USAGE = [
  { id: "posts", label: "Auto-posts", value: 18, max: 25, unit: "today" },
  { id: "concepts", label: "Concepts", value: 42, max: 100, unit: "this month" },
  { id: "brands", label: "Brands", value: 2, max: 5, unit: "active" },
];

function Overview() {
  const { pipeline, scheduled, profile } = useForge();
  const { push } = useToast();
  const avgHook =
    pipeline.length > 0
      ? Math.round(pipeline.reduce((a, p) => a + p.hookScore, 0) / pipeline.length)
      : 0;

  return (
    <div className="mb-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Campaigns in pipeline" value={String(pipeline.length)} />
        <Stat label="Avg hook score" value={String(avgHook)} delta="Across all pipeline items" tone="up" />
        <Stat label="Posts scheduled" value={String(scheduled.length)} />
      </div>

      <Card className="mt-3 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="h-display text-lg">{profile.plan}</h3>
            <p className="mt-0.5 text-sm text-fog">Usage for this billing cycle.</p>
          </div>
          <Pill tone="accent">Current plan</Pill>
        </div>
        <div className="mt-5 space-y-4">
          {USAGE.map((u) => (
            <div key={u.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-paper">{u.label}</span>
                <span className="text-xs text-fog">
                  {u.value}/{u.max} {u.unit}
                  <button
                    onClick={() =>
                      push("Upgrade is disabled in demo", { body: `${profile.plan} is the top demo tier.`, kind: "info" })
                    }
                    className="ml-2 font-semibold text-molten-soft transition-colors hover:text-molten"
                  >
                    Upgrade
                  </button>
                </span>
              </div>
              <Bar value={u.value} max={u.max} tone={u.value / u.max > 0.85 ? "amber" : "accent"} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- connected accounts ---------------- */

function ConnectedAccounts() {
  const { settings, setConnection, pushActivity } = useForge();
  const { push } = useToast();

  return (
    <Card className="mb-4 p-5 sm:p-6">
      <h3 className="h-display mb-1 text-lg">Connected accounts</h3>
      <p className="mb-5 text-sm text-fog">Where AdForge is allowed to post. Manage full OAuth details in Settings.</p>
      <div className="space-y-2.5">
        {CONNECTIONS.map((c) => {
          const connected = settings.connections[c.id] === "connected";
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-ink-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-paper">{c.label}</p>
                  <Pill tone={connected ? "green" : "default"}>{connected ? "Connected" : "Not connected"}</Pill>
                </div>
                <p className="mt-0.5 truncate text-xs text-mist">{c.note !== "—" ? c.note : c.blurb}</p>
              </div>
              {connected ? (
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConnection(c.id, "disconnected");
                    pushActivity(`${c.label} disconnected`, "system");
                    push(`${c.label} disconnected`, { kind: "info" });
                  }}
                >
                  Disconnect
                </Btn>
              ) : (
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConnection(c.id, "connected");
                    pushActivity(`${c.label} connected`, "system");
                    push(`${c.label} connected`, { body: "Demo connection — no real OAuth flow.", kind: "success" });
                  }}
                >
                  Connect
                </Btn>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------- notifications ---------------- */

const PREF_ROWS = [
  { id: "product" as const, label: "Product updates", description: "New features, improvements, and changelog drops." },
  { id: "weekly" as const, label: "Weekly report", description: "Your Monday briefing: reach, hooks, and wins." },
  { id: "mentions" as const, label: "Trend mentions", description: "Ping me when a tracked trend spikes." },
  { id: "autopilot" as const, label: "Autopilot activity", description: "Posts going live, gate decisions, and overrides." },
];

function NotificationSettings() {
  const { notificationPrefs, updateNotificationPrefs } = useForge();

  return (
    <Card className="mb-4 p-5 sm:p-6">
      <h3 className="h-display mb-1 text-lg">Notifications</h3>
      <p className="mb-3 text-sm text-fog">What lands in your inbox and this panel.</p>
      <div className="divide-y divide-line">
        {PREF_ROWS.map((r) => (
          <Toggle
            key={r.id}
            label={r.label}
            description={r.description}
            checked={notificationPrefs[r.id]}
            onChange={(next) => updateNotificationPrefs({ [r.id]: next })}
          />
        ))}
      </div>
    </Card>
  );
}

/* ---------------- api keys ---------------- */

function ApiKeys() {
  const { apiKeys, generateApiKey, revokeApiKey } = useForge();
  const { push } = useToast();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const submit = async () => {
    const clean = name.trim();
    if (!clean) return;
    const key = await generateApiKey(clean);
    setName("");
    setNaming(false);
    if (key.secret) {
      setFreshSecret(key.secret);
      push("API key generated", { body: "Copy it now — you won't see it again.", kind: "success" });
    } else {
      push("API key generated", { body: `${key.prefix}… — copy it now.`, kind: "success" });
    }
  };

  const copy = async (prefix: string) => {
    try {
      await navigator.clipboard.writeText(prefix);
      push("Copied to clipboard", { body: prefix, kind: "info" });
    } catch {
      push("Copy failed", { body: "Your browser blocked clipboard access.", kind: "error" });
    }
  };

  return (
    <Card className="mb-4 p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="h-display text-lg">API keys</h3>
          <p className="mt-0.5 text-sm text-fog">Keys for pushing briefs into the forge from your own tools.</p>
        </div>
        {!naming && (
          <Btn variant="primary" size="sm" onClick={() => setNaming(true)}>Generate key</Btn>
        )}
      </div>

      {naming && (
        <div className="mb-4 flex gap-2 rounded-2xl border border-molten/40 bg-molten-wash/60 p-3">
          <input
            autoFocus
            className="input !min-h-0 !py-2"
            placeholder="Key name — e.g. Shopify bridge"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setNaming(false); setName(""); }
            }}
            aria-label="New API key name"
          />
          <Btn variant="primary" size="sm" onClick={submit} disabled={!name.trim()}>Create</Btn>
          <Btn variant="ghost" size="sm" onClick={() => { setNaming(false); setName(""); }}>Cancel</Btn>
        </div>
      )}

      {freshSecret && (
        <div className="mb-4 rounded-2xl border border-molten/40 bg-molten-wash/60 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-molten">Copy it now — you won&rsquo;t see it again</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded-xl bg-ink px-3 py-2 font-mono text-xs text-paper">{freshSecret}</code>
            <Btn variant="primary" size="sm" onClick={() => { copy(freshSecret); setFreshSecret(null); }}>Copy &amp; close</Btn>
          </div>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          body="Generate a key to start pushing briefs into the forge from your own stack."
          action={<Btn variant="primary" size="sm" onClick={() => setNaming(true)}>Generate key</Btn>}
        />
      ) : (
        <div className="space-y-2.5">
          {apiKeys.map((k) => (
            <div key={k.id} className="rounded-2xl border border-line bg-ink-3 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-paper">{k.name}</p>
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" size="sm" onClick={() => copy(k.prefix)}>Copy</Btn>
                  {confirmRevoke === k.id ? (
                    <>
                      <span className="text-xs font-semibold text-red-300">Revoke it?</span>
                      <Btn variant="danger" size="sm" onClick={() => { revokeApiKey(k.id); setConfirmRevoke(null); push("API key revoked", { body: k.name, kind: "info" }); }}>
                        Yes, revoke
                      </Btn>
                      <Btn variant="ghost" size="sm" onClick={() => setConfirmRevoke(null)}>Keep</Btn>
                    </>
                  ) : (
                    <Btn variant="ghost" size="sm" onClick={() => setConfirmRevoke(k.id)}>Revoke</Btn>
                  )}
                </div>
              </div>
              <p className="mt-1 font-mono text-xs text-mist">{k.prefix}…</p>
              <p className="mt-1 text-[11px] text-mist">Created {k.created} · Last used {k.lastUsed}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------- danger zone ---------------- */

function DangerZone() {
  const { profile, resetDemo, pushActivity } = useForge();
  const { push } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  return (
    <Card className="mb-4 border-red-500/20 p-5 sm:p-6">
      <h3 className="h-display mb-1 text-lg text-red-300">Danger zone</h3>
      <p className="mb-5 text-sm text-fog">Irreversible things live here. Tread carefully.</p>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-paper">Reset demo data</p>
            <p className="text-xs text-fog">Wipe local changes and restore the original seed data.</p>
          </div>
          {!confirmReset ? (
            <Btn variant="danger" size="sm" onClick={() => setConfirmReset(true)}>Reset demo data</Btn>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-red-200">Sure? This erases your local edits.</span>
              <Btn variant="danger" size="sm" onClick={() => { resetDemo(); setConfirmReset(false); pushActivity("Demo data reset", "system"); push("Demo data reset", { kind: "info" }); }}>
                Yes, reset
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Btn>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-ink-3 px-4 py-3">
          <p className="text-sm font-semibold text-paper">Delete workspace</p>
          <p className="mt-0.5 text-xs text-fog">
            Type <span className="font-mono font-bold text-paper">{profile.workspace}</span> to confirm.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="input !min-h-0 max-w-xs !py-2"
              placeholder={profile.workspace}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              aria-label="Type workspace name to confirm deletion"
            />
            <Btn
              variant="danger"
              size="sm"
              disabled={confirmName !== profile.workspace}
              onClick={() => {
                setConfirmName("");
                push("Workspace deletion is disabled in demo", { kind: "warn" });
              }}
            >
              Delete
            </Btn>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- page ---------------- */

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHead
        kicker="Account"
        title="Your corner of the forge."
        sub="Profile, plan, connections, keys — the boring bits, kept sharp."
      />
      <HeaderCard />
      <Overview />
      <ConnectedAccounts />
      <NotificationSettings />
      <ApiKeys />
      <div className="mb-4">
        <AppearanceCard />
      </div>
      <DangerZone />
    </div>
  );
}
