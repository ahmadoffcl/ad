"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/lib/toast";
import { Btn } from "@/components/ui";

export const ONBOARDED_KEY = "adforge-onboarded";

const STEPS = [
  {
    title: "Welcome to the forge",
    body: "AdForge turns a one-line brief into platform-ready ad creative — concepts, hooks, captions, and scheduled posts for KOVA and Juniper & Co., all in one place.",
    bullets: ["Briefs become scored concepts", "Every channel, one queue", "You stay the final approver"],
  },
  {
    title: "Brief → Live in six steps",
    body: "The pipeline is the product. Nothing ships by accident.",
    bullets: [
      "1 · Write the brief in Studio",
      "2 · Concepts get generated",
      "3 · Hook scores rank the winners",
      "4 · Slop Shield kills the weak ones",
      "5 · Gates hold anything risky for you",
      "6 · Approve and it schedules itself",
    ],
  },
  {
    title: "Gates keep you in control",
    body: "Autopilot is a leash, not a cliff. Green shields auto-pass, amber and red wait for your call — and Slop Shield's sensitivity dial decides how ruthless the machine gets.",
    bullets: ["Manual, Gates, or Full auto", "Override any gate with a note", "Reset the whole demo anytime"],
  },
];

export default function Onboarding() {
  const pathname = usePathname();
  const { push } = useToast();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (pathname !== "/app") {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(ONBOARDED_KEY) !== "1") {
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked — stay hidden */
    }
  }, [pathname]);

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      /* noop */
    }
    setVisible(false);
    push("Welcome aboard", { body: "Hit ⌘K anytime to jump anywhere.", kind: "success" });
  };

  if (!visible) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Welcome to AdForge">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full max-w-md card animate-fade-up p-6 rounded-b-none sm:rounded-2xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-molten" : i < step ? "w-4 bg-molten/50" : "w-4 bg-ink-4"
                }`}
              />
            ))}
          </div>
          <button
            onClick={dismiss}
            className="text-xs font-semibold text-mist transition-colors hover:text-paper"
          >
            Skip
          </button>
        </div>

        <p className="kicker mb-2">Step {step + 1} of {STEPS.length}</p>
        <h2 className="h-display text-xl sm:text-2xl">{s.title}</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-fog">{s.body}</p>
        <ul className="mt-4 space-y-2">
          {s.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-paper/90">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5A1F" strokeWidth="3" strokeLinecap="round" className="mt-0.5 shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex items-center justify-between gap-3">
          <div>
            {step > 0 ? (
              <Btn variant="ghost" onClick={() => setStep((s2) => s2 - 1)}>Back</Btn>
            ) : (
              <span />
            )}
          </div>
          {last ? (
            <Btn variant="primary" onClick={dismiss}>Start forging</Btn>
          ) : (
            <Btn variant="primary" onClick={() => setStep((s2) => s2 + 1)}>Next</Btn>
          )}
        </div>
      </div>
    </div>
  );
}
