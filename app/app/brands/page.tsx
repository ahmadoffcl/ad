"use client";

import { useState } from "react";
import { useForge } from "@/lib/store";
import AdCanvas from "@/components/AdCanvas";
import { Btn, Card, Field, Pill, SectionHead, EmptyState } from "@/components/ui";

const DISPLAY_FONTS = ["Space Grotesk", "Sora", "Fraunces", "Archivo"];
const BODY_FONTS = ["Inter", "Space Grotesk", "System"];

const SAMPLE = {
  kova: {
    headline: "Stop scrolling. The drop is live.",
    sub: "Launch-week pricing on the Court Low. Nothing extra.",
    cta: "Shop the drop",
  },
  juniper: {
    headline: "Slow light for fast lives.",
    sub: "No. 04 — smoked cedar, hand-poured in small batches.",
    cta: "Shop the scent",
  },
};

export default function BrandsPage() {
  const { brands, activeBrandId, setActiveBrand, updateBrand, updateBrandColors } = useForge();
  const [editingId, setEditingId] = useState<string>(activeBrandId);
  const brand = brands.find((b) => b.id === editingId) ?? brands[0];
  const sample = SAMPLE[brand.id as keyof typeof SAMPLE] ?? SAMPLE.kova;

  const set = (patch: Partial<typeof brand>) => updateBrand(brand.id, patch);

  return (
    <div>
      <SectionHead
        kicker="Brand kits"
        title="One kit. Every render obeys it."
        sub="Colors, voice and rules live here. Switch the active brand and the whole studio re-skins instantly."
      />

      <div className="grid gap-4 xl:grid-cols-[300px_1fr_340px]">
        {/* brand list */}
        <Card className="h-fit p-3">
          <p className="label px-2 pt-1">Brands</p>
          <div className="space-y-2">
            {brands.map((b) => {
              const active = b.id === activeBrandId;
              const editing = b.id === editingId;
              return (
                <button
                  key={b.id}
                  onClick={() => { setEditingId(b.id); }}
                  className={`w-full rounded-xl border p-3.5 text-left transition-all duration-150 ${
                    editing ? "border-molten/60 bg-molten-wash" : "border-line bg-ink-3 hover:border-mist/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-bold" style={{ background: b.colors.ink, color: b.colors.paper, border: `1px solid ${b.colors.accent}` }}>
                      {b.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-paper">{b.name}</p>
                      <p className="truncate text-[11px] text-mist">{b.industry}</p>
                    </div>
                    {active && <Pill tone="accent">Active</Pill>}
                  </div>
                  {!active && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setActiveBrand(b.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setActiveBrand(b.id); } }}
                      className="mt-2.5 inline-block font-display text-[11px] font-bold text-molten-soft hover:text-molten"
                    >
                      Set active →
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="px-2 pb-1 pt-3 text-[11px] leading-relaxed text-mist">
            The active brand feeds the studio, scheduler and analytics labels.
          </p>
        </Card>

        {/* editor */}
        <Card className="h-fit space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="h-display text-lg">Editing · {brand.name}</h3>
            {brand.id !== activeBrandId && (
              <Btn size="sm" variant="ghost" onClick={() => setActiveBrand(brand.id)}>Set active</Btn>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand name">
              <input className="input" value={brand.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Industry">
              <input className="input" value={brand.industry} onChange={(e) => set({ industry: e.target.value })} />
            </Field>
          </div>
          <Field label="Tagline">
            <input className="input" value={brand.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          <Field label="Tone" hint="One line. The generator writes in this voice.">
            <input className="input" value={brand.tone} onChange={(e) => set({ tone: e.target.value })} />
          </Field>

          <div>
            <p className="label">Palette</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["ink", "Ink"],
                  ["paper", "Paper"],
                  ["accent", "Accent"],
                  ["muted", "Muted"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded-xl border border-line bg-ink-3 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-fog">{label}</span>
                    <input
                      type="color"
                      className="forge-color !h-9 !w-9"
                      value={brand.colors[key]}
                      onChange={(e) => updateBrandColors(brand.id, { [key]: e.target.value })}
                      aria-label={`${label} color`}
                    />
                  </div>
                  <p className="font-mono text-[11px] uppercase text-mist">{brand.colors[key]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display font">
              <select className="input" value={brand.displayFont} onChange={(e) => set({ displayFont: e.target.value })}>
                {DISPLAY_FONTS.map((f) => <option key={f} className="bg-ink-2">{f}</option>)}
              </select>
            </Field>
            <Field label="Body font">
              <select className="input" value={brand.bodyFont} onChange={(e) => set({ bodyFont: e.target.value })}>
                {BODY_FONTS.map((f) => <option key={f} className="bg-ink-2">{f}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Voice rules" hint="One rule per line.">
            <textarea
              className="input min-h-[96px] resize-y"
              value={brand.voice.join("\n")}
              onChange={(e) => set({ voice: e.target.value.split("\n").filter((l) => l.trim()) })}
            />
          </Field>
          <Field label="Banned words" hint="Comma-separated. The generator avoids these.">
            <input
              className="input"
              value={brand.banned.join(", ")}
              onChange={(e) => set({ banned: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
        </Card>

        {/* live preview */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <p className="label px-4 pt-4">Live preview</p>
            <AdCanvas
              brand={brand}
              headline={sample.headline}
              sub={sample.sub}
              cta={sample.cta}
              visual={{ bg: brand.colors.ink, fg: brand.colors.paper, accent: brand.colors.accent, motif: "Live brand preview", layout: "Stacked type" }}
              aspect="1:1"
              scale={0.5}
            />
          </Card>
          <Card className="p-4">
            <p className="label">Voice</p>
            <ul className="space-y-1.5">
              {brand.voice.length === 0 && <li className="text-xs text-mist">No rules yet.</li>}
              {brand.voice.map((v, i) => (
                <li key={i} className="text-[13px] text-fog">— {v}</li>
              ))}
            </ul>
            {brand.banned.length > 0 && (
              <div className="mt-3">
                <p className="label">Banned</p>
                <div className="flex flex-wrap gap-1.5">
                  {brand.banned.map((b) => (
                    <Pill key={b} tone="red">{b}</Pill>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
