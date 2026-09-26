"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/lib/toast";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function ShareIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block -mt-0.5"
      aria-hidden="true"
    >
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
      <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

export default function AddToHome() {
  const { push } = useToast();
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);
    setIos(/iPhone|iPad|iPod/.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      push("AdForge installed", {
        body: "Find it on your home screen — full-screen, one tap away.",
        kind: "success",
      });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [push]);

  const install = async () => {
    if (!deferred || busy) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        push("AdForge installed", {
          body: "Launching from your home screen from now on.",
          kind: "success",
        });
        setDeferred(null);
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  };

  if (standalone) return null;

  if (deferred) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-molten-wash text-molten">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="7" y="2" width="10" height="20" rx="2.5" />
              <path d="M12 18.5h.01" strokeWidth="2.4" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="h-display text-base">Get the AdForge app</h3>
            <p className="mt-0.5 text-sm leading-snug text-fog">
              Full-screen, faster, one tap from your home screen.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={install}
          disabled={busy}
          className="btn-primary mt-4 w-full"
        >
          {busy ? "Installing…" : "Install AdForge"}
        </button>
      </div>
    );
  }

  // iOS Safari has no beforeinstallprompt — show manual steps, mobile only.
  if (ios) {
    return (
      <div className="card p-5">
        <h3 className="h-display text-base">Add AdForge to your home screen</h3>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed text-fog">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-3 font-display text-[11px] font-bold text-paper">
              1
            </span>
            <span>
              Tap the <ShareIcon /> Share button in Safari&apos;s bottom bar.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-3 font-display text-[11px] font-bold text-paper">
              2
            </span>
            <span>Scroll down and tap <strong className="text-paper">Add to Home Screen</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-3 font-display text-[11px] font-bold text-paper">
              3
            </span>
            <span>Tap <strong className="text-paper">Add</strong> — you&apos;re in.</span>
          </li>
        </ol>
      </div>
    );
  }

  return null;
}
