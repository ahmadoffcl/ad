"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForge } from "@/lib/store";
import { GOALS, type AdConcept, type Aspect, type DirectorPrefs, type PlatformId } from "@/lib/types";
import { PLATFORMS, generateConcepts, platformMeta } from "@/lib/campaign";
import {
  generateConcepts as generateConceptsRemote,
  scoreHook as scoreHookRemote,
  writeCaption as writeCaptionRemote,
  type AISource,
} from "@/lib/aiClient";
import AdCanvas from "@/components/AdCanvas";
import PhoneMock from "@/components/PhoneMock";
import ScoreBars from "@/components/ScoreBars";
import SlopPanel from "@/components/SlopPanel";
import { Btn, Card, Field, Pill, ScoreRing, SectionHead } from "@/components/ui";

/** Honest badge: where did these words come from? */
function SourceBadge({ source }: { source: AISource | null }) {
  if (!source) return null;
  const tone = source === "ai" ? "accent" : source === "mixed" ? "amber" : undefined;
  const label =
    source === "ai" ? "AI-written" : source === "mixed" ? "AI + QC" : "Deterministic";
  const hint =
    source === "ai"
      ? "Drafted by Workers AI, shielded before you saw it"
      : source === "mixed"
        ? "AI draft rescued by deterministic QC"
        : "Same brief, same campaign — no model involved";
  return (
    <span title={hint}>
      <Pill tone={tone}>{label}</Pill>
    </span>
  );
}

function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === o.id
              ? "border-molten/60 bg-molten-wash text-molten-soft"
              : "border-line bg-ink-3 text-fog hover:border-mist/60 hover:text-paper"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type Step = "brief" | "concepts" | "detail";

const LAYERS = [
  { id: "brand-mark", label: "Brand mark + AD tag" },
  { id: "headline", label: "Headline" },
  { id: "sub", label: "Subhead" },
  { id: "cta", label: "CTA button" },
  { id: "ribbon", label: "Accent ribbon" },
  { id: "motif-note", label: "Motif footnote" },
];

const ASPECTS: Aspect[] = ["9:16", "1:1", "16:9"];

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function StudioInner() {
  const forge = useForge();
  const {
    activeBrand, trends, settings, addPipelineItem, setPipelineStage,
    setGate, schedulePosts, pushActivity, updateBrand,
  } = forge;
  const searchParams = useSearchParams();
  const trendParam = searchParams.get("trend");
  const prefilled = useRef(false);

  const [step, setStep] = useState<Step>("brief");
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("launch");
  const [offer, setOffer] = useState("");
  const [platforms, setPlatforms] = useState<PlatformId[]>(["ig-reel", "ig-feed", "tiktok"]);
  const [trendAngle, setTrendAngle] = useState("");
  const [trendTitle, setTrendTitle] = useState("");

  const [concepts, setConcepts] = useState<AdConcept[]>([]);
  const [selIdx, setSelIdx] = useState(0);
  const [aspect, setAspect] = useState<Aspect>("9:16");

  /* ---- director's chair (persisted per brand) ---- */
  const d0 = activeBrand.director;
  const [tone, setTone] = useState(d0?.tone ?? "bold, minimal");
  const [hookStyle, setHookStyle] = useState<DirectorPrefs["hookStyle"]>(d0?.hookStyle ?? "auto");
  const [ctaType, setCtaType] = useState<DirectorPrefs["ctaType"]>(d0?.ctaType ?? "auto");
  const [captionLength, setCaptionLength] = useState<DirectorPrefs["captionLength"]>(d0?.captionLength ?? "short");
  const [emoji, setEmoji] = useState(d0?.emoji ?? true);
  const [creativity, setCreativity] = useState(d0?.creativity ?? 55);
  const [avoid, setAvoid] = useState(d0?.avoid ?? "");

  /* ---- AI generation state ---- */
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [source, setSource] = useState<AISource | null>(null);
  const [aiCaptioning, setAiCaptioning] = useState(false);
  const [secondOpinion, setSecondOpinion] = useState<{
    deterministic: number;
    ai: number | null;
    reason: string;
    blended: number;
    source: AISource;
  } | null>(null);
  const [scoring, setScoring] = useState(false);
  const [editingCopy, setEditingCopy] = useState(false);
  const [tab, setTab] = useState<PlatformId>("ig-reel");
  const [edits, setEdits] = useState<Record<string, { caption: string; hashtags: string }>>({});
  const [hiddenLayers, setHiddenLayers] = useState<string[]>([]);
  const [overridden, setOverridden] = useState(false);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState(tomorrowISO());

  // trend prefill (?trend=t1)
  useEffect(() => {
    if (prefilled.current || !trendParam) return;
    const t = trends.find((x) => x.id === trendParam);
    if (t) {
      setProduct(t.prefill.product);
      setAudience(t.prefill.audience);
      setGoal(t.prefill.goal);
      setOffer(t.prefill.offer);
      setTrendAngle(t.prefill.angle);
      setTrendTitle(t.title);
      prefilled.current = true;
    }
  }, [trendParam, trends]);

  const togglePlatform = (p: PlatformId) =>
    setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));

  const canGenerate = product.trim().length > 1 && platforms.length > 0;

  const directorPrefs = (): DirectorPrefs => ({
    tone: tone.trim() || "bold, minimal",
    hookStyle,
    ctaType,
    captionLength,
    emoji,
    creativity,
    avoid: avoid.trim(),
  });

  const resetAfterGenerate = (out: AdConcept[]) => {
    setConcepts(out);
    setSelIdx(0);
    setTab(out[0].variants[0]?.platform ?? "ig-feed");
    setEdits({});
    setHiddenLayers([]);
    setOverridden(false);
    setPipelineId(null);
    setSecondOpinion(null);
    setEditingCopy(false);
    setAspect("9:16");
    setStep("concepts");
  };

  const doGenerate = async () => {
    const prefs = directorPrefs();
    // Director's chair persists per brand — the AI reads it on every run.
    updateBrand(activeBrand.id, { director: prefs });
    const brief = {
      product: product.trim(),
      audience: audience.trim() || "everyone",
      goal,
      offer: offer.trim() || "Available now",
      platforms,
      brandId: activeBrand.id,
      trendAngle: trendAngle || undefined,
    };
    setGenerating(true);
    setGenError(null);
    try {
      const r = await generateConceptsRemote(activeBrand, brief, prefs);
      const out = r.concepts.length ? r.concepts : generateConcepts(brief, activeBrand);
      setSource(r.concepts.length ? r.source : "deterministic");
      resetAfterGenerate(out);
      pushActivity(
        `3 concepts forged from brief “${brief.product.slice(0, 40)}” · ${r.concepts.length ? r.source : "deterministic"}`,
        "concept"
      );
    } catch (e) {
      const out = generateConcepts(brief, activeBrand);
      setSource("deterministic");
      resetAfterGenerate(out);
      setGenError(
        e instanceof Error
          ? e.message
          : "The AI engine didn't answer — deterministic concepts instead. Nothing was lost."
      );
    } finally {
      setGenerating(false);
    }
  };

  /** Edit headline / sub / CTA before approval — the director's final say. */
  const patchConcept = (patch: Partial<Pick<AdConcept, "headline" | "sub" | "cta">>) => {
    setConcepts((cs) => cs.map((c, i) => (i === selIdx ? { ...c, ...patch } : c)));
  };

  const doAiCaption = async () => {
    if (!concept || !variant) return;
    setAiCaptioning(true);
    try {
      const r = await writeCaptionRemote(
        activeBrand,
        concept.headline,
        concept.sub,
        concept.cta,
        variant.platform
      );
      setEdit({ caption: r.caption, hashtags: r.hashtags.join(" ") });
      pushActivity(`AI caption written for ${platformMeta(variant.platform).short} · ${r.source}`, "concept");
    } catch (e) {
      pushActivity(
        `AI caption failed — ${e instanceof Error ? e.message : "engine offline"}`,
        "system"
      );
    } finally {
      setAiCaptioning(false);
    }
  };

  const doSecondOpinion = async () => {
    if (!concept) return;
    setScoring(true);
    try {
      const r = await scoreHookRemote(concept.headline, concept.sub);
      setSecondOpinion({
        deterministic: r.deterministic,
        ai: r.ai ? r.ai.score : null,
        reason: r.ai?.reason ?? "",
        blended: r.blended,
        source: r.source,
      });
    } finally {
      setScoring(false);
    }
  };

  const openConcept = (i: number) => {
    const c = concepts[i];
    setSelIdx(i);
    setTab(c.variants[0]?.platform ?? "ig-feed");
    setEdits({});
    setHiddenLayers([]);
    setOverridden(false);
    setPipelineId(null);
    setStep("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const concept = concepts[selIdx];
  const variant = concept?.variants.find((v) => v.platform === tab) ?? concept?.variants[0];
  const edit = variant ? edits[variant.platform] ?? { caption: variant.caption, hashtags: variant.hashtags.join(" ") } : { caption: "", hashtags: "" };
  const meta = variant ? platformMeta(variant.platform) : platformMeta("ig-feed");
  const combinedLen = edit.caption.length + (edit.hashtags.trim() ? edit.hashtags.trim().length + 1 : 0);
  const overLimit = combinedLen > meta.captionLimit;

  const setEdit = (patch: Partial<{ caption: string; hashtags: string }>) => {
    if (!variant) return;
    setEdits((e) => ({
      ...e,
      [variant.platform]: {
        caption: edit.caption,
        hashtags: edit.hashtags,
        ...patch,
      },
    }));
  };

  const ensureItem = (): string => {
    if (pipelineId) return pipelineId;
    const c = concept!;
    const gate = overridden ? "overridden" : c.slopStatus === "pass" ? "auto-ok" : "awaiting";
    const title = `${activeBrand.name} — ${c.name}: ${c.headline.length > 42 ? c.headline.slice(0, 42) + "…" : c.headline}`;
    const item = addPipelineItem({
      title,
      brandId: activeBrand.id,
      stage: settings.autopilot === "full" ? "scheduled" : "review",
      gate,
      hookScore: c.hook.score,
      platforms,
      due: schedDate,
    });
    setPipelineId(item.id);
    return item.id;
  };

  const doApprove = () => {
    const c = concept!;
    const pid = ensureItem();
    const full = settings.autopilot === "full";
    setPipelineStage(pid, full ? "scheduled" : "review");
    const gate = overridden ? "overridden" : c.slopStatus === "pass" ? "auto-ok" : "awaiting";
    setGate(pid, gate);
    if (full) {
      const times = ["10:00", "12:30", "15:00", "17:30", "19:00", "20:30"];
      schedulePosts(
        platforms.map((p, i) => ({
          title: `${activeBrand.name} — ${c.name} · ${platformMeta(p).short}`,
          brandId: activeBrand.id,
          platform: p,
          date: schedDate,
          time: times[i % times.length],
          status: "queued" as const,
        }))
      );
      pushActivity(`Autopilot scheduled “${c.name}” — ${platforms.length} placements on ${schedDate}`, "system");
    } else {
      pushActivity(`“${c.name}” approved → In Review (gate: ${gate})`, "qc");
    }
  };

  const doSchedule = () => {
    const c = concept!;
    const pid = ensureItem();
    const times = ["10:00", "12:30", "15:00", "17:30", "19:00", "20:30"];
    schedulePosts(
      platforms.map((p, i) => ({
        title: `${activeBrand.name} — ${c.name} · ${platformMeta(p).short}`,
        brandId: activeBrand.id,
        platform: p,
        date: schedDate,
        time: times[i % times.length],
        status: "queued" as const,
      }))
    );
    setPipelineStage(pid, "scheduled");
    pushActivity(`Scheduled “${c.name}” — ${platforms.length} placements on ${schedDate}`, "post");
  };

  /* ---------------- brief ---------------- */
  if (step === "brief") {
    return (
      <div className="mx-auto max-w-3xl">
        <SectionHead
          kicker="Studio"
          title="One brief. A whole campaign."
          sub="Sixty seconds of input. Three scored concepts out — each rendered natively for every platform you pick."
        />
        {trendTitle && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-molten/40 bg-molten-wash px-4 py-3 animate-fade-in">
            <Pill tone="accent">Trend fuel</Pill>
            <p className="text-sm text-paper">
              <span className="font-bold">{trendTitle}</span>
              <span className="text-fog"> — {trendAngle}</span>
            </p>
            <button
              onClick={() => { setTrendTitle(""); setTrendAngle(""); }}
              className="ml-auto text-xs font-bold text-mist hover:text-paper"
            >
              Clear
            </button>
          </div>
        )}
        <Card className="space-y-5 p-5 sm:p-7">
          <Field label="Product" hint="Be specific — the generator writes from this.">
            <input className="input" placeholder="KOVA Court Low in bone white" value={product} onChange={(e) => setProduct(e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Audience">
              <input className="input" placeholder="design-obsessed 25–34s" value={audience} onChange={(e) => setAudience(e.target.value)} />
            </Field>
            <Field label="Offer">
              <input className="input" placeholder="Launch-week pricing" value={offer} onChange={(e) => setOffer(e.target.value)} />
            </Field>
          </div>
          <Field label="Goal">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all duration-150 ${
                    goal === g.id ? "border-molten/60 bg-molten-wash" : "border-line bg-ink-3 hover:border-mist/60"
                  }`}
                >
                  <p className={`font-display text-sm font-bold ${goal === g.id ? "text-molten-soft" : "text-paper"}`}>{g.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-mist">{g.hint}</p>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Placements" hint="Each concept gets a native variant per placement.">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                      on ? "border-molten/60 bg-molten text-ink" : "border-line bg-ink-3 text-fog hover:border-mist/60 hover:text-paper"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="h-display text-base">Director&rsquo;s chair</h3>
                <p className="text-xs text-mist">Your taste, saved to {activeBrand.name} — the AI directs from this.</p>
              </div>
              <Pill tone="accent">per brand</Pill>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tone" hint="How the copy should sound.">
                <input
                  className="input"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="bold, minimal"
                />
              </Field>
              <Field label="Never say" hint="Words and vibes to ban, on top of the brand kit.">
                <input
                  className="input"
                  value={avoid}
                  onChange={(e) => setAvoid(e.target.value)}
                  placeholder="luxury, elevate, game-changer…"
                />
              </Field>
              <Field label="Hook style">
                <Seg
                  value={hookStyle}
                  onChange={setHookStyle}
                  options={[
                    { id: "auto", label: "Auto" },
                    { id: "question", label: "Question" },
                    { id: "bold-claim", label: "Bold claim" },
                    { id: "story", label: "Story" },
                    { id: "stat", label: "Stat" },
                  ]}
                />
              </Field>
              <Field label="Call to action">
                <Seg
                  value={ctaType}
                  onChange={setCtaType}
                  options={[
                    { id: "auto", label: "Auto" },
                    { id: "shop", label: "Shop" },
                    { id: "learn", label: "Learn" },
                    { id: "follow", label: "Follow" },
                    { id: "comment", label: "Comment" },
                  ]}
                />
              </Field>
              <Field label="Caption length">
                <Seg
                  value={captionLength}
                  onChange={setCaptionLength}
                  options={[
                    { id: "short", label: "Short" },
                    { id: "medium", label: "Medium" },
                    { id: "long", label: "Long" },
                  ]}
                />
              </Field>
              <div className="flex items-end justify-between gap-4">
                <Field label="Emoji">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={emoji}
                    onClick={() => setEmoji((v) => !v)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${emoji ? "bg-molten" : "bg-ink-4"}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${emoji ? "left-6" : "left-1"}`}
                    />
                  </button>
                </Field>
                <div className="flex-1">
                  <Field
                    label={`Creativity · ${creativity}`}
                    hint={creativity < 35 ? "Safe, on-brief" : creativity < 70 ? "Balanced" : "Wild, surprising"}
                  >
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={creativity}
                      onChange={(e) => setCreativity(Number(e.target.value))}
                      className="w-full accent-[#FF5A1F]"
                      aria-label="Creativity"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-xs text-mist">
              Brand: <span className="font-bold text-paper">{activeBrand.name}</span> · AI-drafted, shield-checked
            </p>
            <Btn disabled={!canGenerate || generating} onClick={doGenerate} className="!px-7 !py-3">
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                  Forging…
                </span>
              ) : (
                "Generate 3 concepts →"
              )}
            </Btn>
          </div>
          {genError && (
            <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {genError}
            </p>
          )}
        </Card>
      </div>
    );
  }

  /* ---------------- concepts ---------------- */
  if (step === "concepts") {
    return (
      <div>
        <SectionHead
          kicker="Studio · Concepts"
          title="Pick your killer."
          sub={`Three directions for “${product}” — scored, shielded, ready to open.`}
          action={
            <div className="flex items-center gap-2">
              <SourceBadge source={source} />
              <Btn variant="ghost" size="sm" onClick={() => setStep("brief")}>← Tweak brief</Btn>
              <Btn variant="ghost" size="sm" onClick={doGenerate} disabled={generating}>
                {generating ? "Forging…" : "↻ Regenerate"}
              </Btn>
            </div>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {concepts.map((c, i) => (
            <Card key={c.id} className="card-hover flex flex-col overflow-hidden animate-fade-up" >
              <div className="border-b border-line">
                <AdCanvas
                  brand={activeBrand}
                  headline={c.headline}
                  sub={c.sub}
                  cta={c.cta}
                  visual={c.visual}
                  aspect="1:1"
                  scale={0.42}
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between">
                  <Pill tone="accent">{c.name}</Pill>
                  <Pill tone={c.slopStatus === "pass" ? "green" : c.slopStatus === "warn" ? "amber" : "red"}>
                    Shield · {c.slopStatus.toUpperCase()}
                  </Pill>
                </div>
                <p className="mt-2.5 font-display text-[15px] font-bold leading-snug text-paper">“{c.headline}”</p>
                <p className="mt-1.5 text-xs leading-relaxed text-fog">{c.angle}</p>
                <div className="mt-3 flex items-center gap-3">
                  <ScoreRing score={c.hook.score} size={46} />
                  <div>
                    <p className="font-display text-sm font-bold text-paper">{c.hook.grade}</p>
                    <p className="text-[11px] text-mist">{c.variants.length} platform variants</p>
                  </div>
                </div>
                <Btn className="mt-4 w-full" size="sm" onClick={() => openConcept(i)}>
                  Open in studio →
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- detail ---------------- */
  if (!concept || !variant) return null;
  const isVideoPlacement = meta.video;
  const chrome: "ig" | "tiktok" = variant.platform.startsWith("ig") ? "ig" : "tiktok";

  return (
    <div>
      <SectionHead
        kicker={`Studio · ${concept.name}`}
        title={concept.headline}
        sub={concept.angle}
        action={
          <div className="flex items-center gap-2">
            <SourceBadge source={source} />
            <Btn variant="ghost" size="sm" onClick={() => setEditingCopy((v) => !v)}>
              {editingCopy ? "Done editing" : "✎ Edit copy"}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setStep("concepts")}>← All concepts</Btn>
          </div>
        }
      />

      {editingCopy && (
        <Card className="mb-4 space-y-4 p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="h-display text-base">Edit the words</h3>
            <Pill tone="accent">director&rsquo;s cut</Pill>
          </div>
          <Field label="Headline" hint="First two seconds. Under 8 words wins.">
            <input
              className="input font-display text-[15px] font-bold"
              value={concept.headline}
              onChange={(e) => patchConcept({ headline: e.target.value })}
            />
          </Field>
          <Field label="Subhead">
            <input
              className="input"
              value={concept.sub}
              onChange={(e) => patchConcept({ sub: e.target.value })}
            />
          </Field>
          <Field label="CTA">
            <input
              className="input"
              value={concept.cta}
              onChange={(e) => patchConcept({ cta: e.target.value })}
            />
          </Field>
          <p className="text-xs text-mist">
            Edited copy is re-scored below — the shield never sleeps.
          </p>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        {/* left: preview + layers */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5 rounded-xl border border-line bg-ink-3 p-1">
                {ASPECTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAspect(a)}
                    className={`rounded-lg px-3 py-1.5 font-display text-xs font-bold transition-colors ${
                      aspect === a ? "bg-molten text-ink" : "text-fog hover:text-paper"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <Pill tone="accent">True-preview · {meta.label}</Pill>
            </div>

            {isVideoPlacement ? (
              <PhoneMock
                chrome={chrome}
                handle={`${activeBrand.name.toLowerCase().replace(/[^a-z]/g, "")}.studio`}
                aspect={aspect}
                caption={edit.caption}
                creative={
                  <AdCanvas
                    brand={activeBrand}
                    headline={concept.headline}
                    sub={concept.sub}
                    cta={concept.cta}
                    visual={concept.visual}
                    aspect={aspect}
                    scale={aspect === "9:16" ? 0.62 : 0.5}
                    hiddenLayers={hiddenLayers}
                  />
                }
              />
            ) : (
              <div className="mx-auto max-w-[560px] overflow-hidden rounded-2xl border border-line">
                <AdCanvas
                  brand={activeBrand}
                  headline={concept.headline}
                  sub={concept.sub}
                  cta={concept.cta}
                  visual={concept.visual}
                  aspect={aspect}
                  scale={0.85}
                  hiddenLayers={hiddenLayers}
                />
              </div>
            )}
            <p className="mt-3 text-center text-xs text-mist">
              Rendered live from the {activeBrand.name} kit — switch the brand and watch it re-skin.
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="h-display mb-3 text-base">Layers</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {LAYERS.map((l) => {
                const off = hiddenLayers.includes(l.id);
                return (
                  <li key={l.id}>
                    <button
                      onClick={() =>
                        setHiddenLayers((h) => (off ? h.filter((x) => x !== l.id) : [...h, l.id]))
                      }
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${
                        off ? "border-line bg-ink text-mist opacity-60" : "border-line bg-ink-3 text-paper hover:border-mist/60"
                      }`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        {off ? (
                          <path d="M17.94 17.94A10.5 10.5 0 0112 19c-5 0-9.3-3-11-7a11.6 11.6 0 014.1-4.9M9.9 4.24A10.4 10.4 0 0112 5c5 0 9.3 3 11 7a11.7 11.7 0 01-2.2 3.1M14.1 14.1a3 3 0 11-4.2-4.2M1 1l22 22" />
                        ) : (
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z" />
                        )}
                      </svg>
                      {l.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* right: variants, score, shield, actions */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="h-display text-base">Platform variant</h3>
              <Btn variant="ghost" size="sm" onClick={doAiCaption} disabled={aiCaptioning}>
                {aiCaptioning ? "Writing…" : "✨ AI caption"}
              </Btn>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {concept.variants.map((v) => (
                <button
                  key={v.platform}
                  onClick={() => setTab(v.platform)}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    tab === v.platform ? "border-molten/60 bg-molten-wash text-molten-soft" : "border-line bg-ink-3 text-fog hover:text-paper"
                  }`}
                >
                  {platformMeta(v.platform).short}
                </button>
              ))}
            </div>
            <Field label={`Caption · ${meta.label}`} hint={meta.captionHint}>
              <textarea
                className="input min-h-[110px] resize-y leading-relaxed"
                value={edit.caption}
                onChange={(e) => setEdit({ caption: e.target.value })}
              />
            </Field>
            <div className="mt-3">
              <Field label="Hashtags">
                <input
                  className="input font-mono !text-[13px]"
                  value={edit.hashtags}
                  onChange={(e) => setEdit({ hashtags: e.target.value })}
                  placeholder="#dropalert #newarrival"
                />
              </Field>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={overLimit ? "font-bold text-red-300" : "text-fog"}>
                {combinedLen}/{meta.captionLimit} chars{overLimit ? " — over limit, trim it" : ""}
              </span>
              <span className="text-mist">
                {edit.hashtags.trim().split(/\s+/).filter(Boolean).length} tags · healthy {meta.hashtagMin}–{meta.hashtagMax}
              </span>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="h-display text-base">Hook Score</h3>
              <Btn variant="ghost" size="sm" onClick={doSecondOpinion} disabled={scoring}>
                {scoring ? "Asking…" : "AI second opinion"}
              </Btn>
            </div>
            <ScoreBars hook={concept.hook} />
            {secondOpinion && (
              <div className="mt-3 rounded-xl border border-line bg-ink-2 p-3 animate-fade-in">
                <div className="flex items-center gap-3">
                  <ScoreRing score={secondOpinion.blended} size={40} />
                  <div>
                    <p className="text-sm font-bold text-paper">
                      AI second opinion: {secondOpinion.blended}
                      <span className="ml-2 font-normal text-mist">
                        (engine {secondOpinion.deterministic}
                        {secondOpinion.ai !== null && ` · model ${secondOpinion.ai}`})
                      </span>
                    </p>
                    {secondOpinion.reason && (
                      <p className="mt-0.5 text-xs text-fog">“{secondOpinion.reason}”</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-mist">
                  Blended 60/40 deterministic/AI · <SourceBadge source={secondOpinion.source} />
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="h-display mb-3 text-base">Slop Shield</h3>
            <SlopPanel
              checks={concept.slop}
              status={concept.slopStatus}
              overridden={overridden}
              onOverride={() => setOverridden(true)}
            />
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="h-display mb-1 text-base">Ship it</h3>
            <p className="mb-3 text-xs text-mist">
              Autopilot: <span className="font-bold text-paper">{settings.autopilot}</span>
              {settings.autopilot === "full" && " — approving schedules immediately"}
              {settings.autopilot === "gates" && " — green shields auto-pass review"}
              {settings.autopilot === "manual" && " — nothing moves without you"}
            </p>
            <Field label="Post date">
              <input type="date" className="input" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
            </Field>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Btn onClick={doApprove} disabled={overLimit}>
                {settings.autopilot === "full" ? "Approve & schedule" : "Approve → Review"}
              </Btn>
              <Btn variant="ghost" onClick={doSchedule} disabled={overLimit}>
                Send to scheduler
              </Btn>
            </div>
            {overLimit && (
              <p className="mt-2 text-xs font-semibold text-red-300">
                Caption exceeds the {meta.label} limit — trim before shipping.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-fog">Loading studio…</div>}>
      <StudioInner />
    </Suspense>
  );
}
