"use client";

import React, { useState } from "react";
import { useForge } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Btn, Pill } from "../ui";

export interface ConceptCardItem {
  headline: string;
  sub: string;
  cta: string;
  placement: string;
  hookScore: number;
  verdict: string;
  source: string;
}

/** Hook Score ring — 0-100 gauge, honest colors, no neon. */
function ScoreRing({ score }: { score: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const tone =
    score >= 75 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-red-400";
  const track = "text-ink-3";
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center" title={`${score}/100`}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className={`stroke-current ${track}`} />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, Math.max(0, score))) / 100}
          className={`stroke-current ${tone}`}
        />
      </svg>
      <span className={`absolute font-display text-xs font-bold ${tone}`}>{score}</span>
    </span>
  );
}

export default function ConceptCard({ item }: { item: ConceptCardItem }) {
  const { activeBrand, addPipelineItem, pushActivity } = useForge();
  const { push } = useToast();
  const [state, setState] = useState<"idle" | "added" | "dismissed">("idle");

  if (state === "dismissed") return null;

  const approve = () => {
    addPipelineItem({
      title: item.headline,
      brandId: activeBrand.id,
      stage: "ideas",
      gate: "auto-ok",
      hookScore: item.hookScore,
      platforms: [],
      due: "",
    });
    pushActivity(`Copilot concept approved: "${item.headline.slice(0, 50)}"`, "concept");
    push("Added to pipeline", { kind: "success" });
    setState("added");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="flex gap-3 p-3.5">
        <ScoreRing score={item.hookScore} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-snug text-paper">
            &ldquo;{item.headline}&rdquo;
          </p>
          <p className="mt-1 text-xs leading-relaxed text-fog">{item.sub}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone="accent">{item.cta}</Pill>
            <Pill>{item.placement}</Pill>
            <Pill tone={item.source === "ai" ? "green" : "default"}>{item.source}</Pill>
            <span className="text-[11px] text-mist">{item.verdict}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-t border-line bg-ink-3/40 px-3.5 py-2.5">
        {state === "added" ? (
          <span className="text-xs font-semibold text-emerald-400">✓ In your pipeline</span>
        ) : (
          <>
            <Btn size="sm" onClick={approve}>
              Approve → Pipeline
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setState("dismissed")}>
              Dismiss
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
