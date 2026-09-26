"use client";

import { useState } from "react";
import { useForge } from "@/lib/store";
import { CONNECTIONS } from "@/lib/seed";
import type { Autopilot } from "@/lib/types";
import { Btn, Card, Modal, Pill, SectionHead } from "@/components/ui";

const OAUTH_DOCS: Record<string, string> = {
  instagram: "https://developers.facebook.com/docs/instagram-platform",
  threads: "https://developers.facebook.com/docs/threads",
  facebook: "https://developers.facebook.com/docs/pages-api",
  tiktok: "https://developers.tiktok.com/",
  youtube: "https://developers.google.com/youtube/v3",
  x: "https://docs.x.com/",
};

const AUTOPILOT: { id: Autopilot; title: string; body: string }[] = [
  {
    id: "manual",
    title: "Manual",
    body: "Nothing moves without you. Every concept waits in In Review until you approve it by hand.",
  },
  {
    id: "gates",
    title: "Gates",
    body: "Green shields auto-pass review; anything amber or red stops and waits for your call. The default.",
  },
  {
    id: "full",
    title: "Full auto",
    body: "Approve once and the machine schedules everything immediately. For brands you trust blindly.",
  },
];

function sensitivityLabel(v: number): string {
  if (v >= 75) return "Ruthless";
  if (v >= 40) return "Standard";
  return "Lenient";
}

export default function SettingsPage() {
  const { settings, updateSettings, setConnection, pushActivity, resetDemo } = useForge();
  const [oauthFor, setOauthFor] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const oauthConn = CONNECTIONS.find((c) => c.id === oauthFor);

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHead
        kicker="Settings"
        title="The control room."
        sub="Connections, autopilot leash length, and how strict the Slop Shield gets to be."
      />

      {/* connections */}
      <Card className="mb-4 p-5 sm:p-6">
        <h3 className="h-display mb-1 text-lg">Connections</h3>
        <p className="mb-5 text-sm text-fog">Each platform connects over OAuth — AdForge never sees your password.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONNECTIONS.map((c) => {
            const connected = settings.connections[c.id] === "connected";
            const isDemo = c.id === "instagram";
            return (
              <div key={c.id} className="rounded-2xl border border-line bg-ink-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-[15px] font-bold text-paper">{c.label}</p>
                  <Pill tone={connected ? "green" : "default"}>
                    {connected ? (isDemo ? "Connected · demo" : "Connected") : "Not connected"}
                  </Pill>
                </div>
                <p className="mt-1 text-xs text-mist">{c.note !== "—" ? c.note : c.blurb}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-fog">{c.blurb}</p>
                <div className="mt-3">
                  {connected ? (
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConnection(c.id, "disconnected");
                        pushActivity(`${c.label} disconnected`, "system");
                      }}
                    >
                      Disconnect
                    </Btn>
                  ) : (
                    <Btn variant="ghost" size="sm" onClick={() => setOauthFor(c.id)}>
                      Connect →
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* autopilot */}
      <Card className="mb-4 p-5 sm:p-6">
        <h3 className="h-display mb-1 text-lg">Autopilot</h3>
        <p className="mb-5 text-sm text-fog">How much leash the machine gets after you hit approve.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {AUTOPILOT.map((a) => {
            const on = settings.autopilot === a.id;
            return (
              <button
                key={a.id}
                onClick={() => {
                  updateSettings({ autopilot: a.id });
                  pushActivity(`Autopilot set to ${a.title}`, "system");
                }}
                className={`rounded-2xl border p-4 text-left transition-all duration-150 ${
                  on ? "border-molten/60 bg-molten-wash" : "border-line bg-ink-3 hover:border-mist/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`font-display text-[15px] font-bold ${on ? "text-molten-soft" : "text-paper"}`}>{a.title}</p>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-molten bg-molten" : "border-mist"}`}>
                    {on && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="4" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-fog">{a.body}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* slop sensitivity */}
      <Card className="mb-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="h-display text-lg">Slop Shield sensitivity</h3>
          <Pill tone={settings.slopSensitivity >= 75 ? "red" : settings.slopSensitivity >= 40 ? "amber" : "green"}>
            {sensitivityLabel(settings.slopSensitivity)}
          </Pill>
        </div>
        <p className="mb-4 mt-1 text-sm text-fog">
          Higher sensitivity means fewer warnings survive. At <span className="font-bold text-paper">Ruthless (75+)</span>,
          any warning fails the shield outright.
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.slopSensitivity}
          onChange={(e) => updateSettings({ slopSensitivity: Number(e.target.value) })}
          className="forge-range w-full"
          style={{ ["--fill" as string]: `${settings.slopSensitivity}%` }}
          aria-label="Slop Shield sensitivity"
        />
        <div className="mt-2 flex justify-between text-[11px] text-mist">
          <span>Lenient</span>
          <span>Standard</span>
          <span>Ruthless</span>
        </div>
      </Card>

      {/* danger zone */}
      <Card className="border-red-500/20 p-5 sm:p-6">
        <h3 className="h-display mb-1 text-lg text-red-300">Danger zone</h3>
        <p className="mb-4 text-sm text-fog">Wipe local changes and restore the original demo data.</p>
        {!confirmReset ? (
          <Btn variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Btn>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-red-200">Sure? This erases your local edits.</p>
            <Btn
              variant="danger"
              size="sm"
              onClick={() => { resetDemo(); setConfirmReset(false); pushActivity("Demo data reset", "system"); }}
            >
              Yes, reset
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Btn>
          </div>
        )}
      </Card>

      {/* OAuth explainer modal */}
      <Modal open={!!oauthConn} onClose={() => setOauthFor(null)} title={`Connect ${oauthConn?.label ?? ""}`}>
        {oauthConn && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-fog">
              AdForge connects to {oauthConn.label} with <span className="font-bold text-paper">OAuth 2.0</span> —
              you authorize the app on {oauthConn.label}&apos;s own site, and AdForge only ever holds a scoped token.
              No passwords, no scraping, revocable anytime.
            </p>
            <ol className="space-y-2.5">
              {[
                "Open the platform's developer portal and create an app.",
                "Add AdForge as an authorized redirect: app.adforge.studio/oauth/callback.",
                "Request the posting scopes (content publishing + basic profile).",
                "Paste the issued client ID here once the app review clears.",
              ].map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-paper/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-molten font-display text-[11px] font-bold text-ink">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs leading-relaxed text-amber-200">
                {oauthConn.label} requires an app review before posting goes live — that part happens on their side
                and can't be skipped. Nothing here will fake a connection.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={OAUTH_DOCS[oauthConn.id]}
                target="_blank"
                rel="noreferrer"
                className="btn-primary btn-sm"
              >
                Open developer docs ↗
              </a>
              <Btn variant="ghost" size="sm" onClick={() => setOauthFor(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
