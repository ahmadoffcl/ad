"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForge } from "@/lib/store";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const { login, signup, authLoading, authError, mode } = useForge();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const go = (fn: () => Promise<boolean>) => async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError("Enter your email and password.");
      return;
    }
    const ok = await fn();
    if (ok) router.push(next);
  };

  const demo = async () => {
    setLocalError(null);
    // Demo account is seeded by migrations/0001_init.sql on deployed D1.
    const ok = await login("demo@adforge.studio", "forge-demo").catch(() => false);
    router.push(next);
    if (!ok) setLocalError("No account backend here — you're in the offline studio. Your work stays in this browser.");
  };

  const err = localError || authError;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 30% 20%, rgba(255,92,26,0.28), transparent 70%), radial-gradient(50% 40% at 70% 80%, rgba(255,176,32,0.18), transparent 70%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-molten font-display text-lg font-black text-onaccent">F</span>
            <span className="font-display text-lg font-bold tracking-tight text-paper">AdForge</span>
          </Link>
          <div>
            <p className="eyebrow mb-4 text-molten">The ad studio</p>
            <h1 className="h-display max-w-md text-5xl leading-[1.02] text-paper">
              Ads people don&rsquo;t skip.
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-fog">
              Brief it in the morning. Concepts by lunch. Scheduled everywhere
              by dinner — every line through the Slop Shield.
            </p>
            <div className="mt-8 flex gap-6">
              {[
                ["91", "avg Hook Score"],
                ["6", "QC checks per concept"],
                ["0", "slop shipped"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-display text-3xl font-black text-paper">{v}</p>
                  <p className="text-xs text-fog">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-mist">Your work saves to your account — pick up on any device.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-molten font-display text-lg font-black text-onaccent">F</span>
            <span className="font-display text-lg font-bold tracking-tight text-ink">AdForge</span>
          </Link>
          <p className="eyebrow mb-2">Welcome back</p>
          <h1 className="h-display text-3xl">Sign in to your studio</h1>
          <p className="mt-2 text-sm text-fog">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-molten hover:underline">
              Create an account
            </Link>
          </p>

          <form onSubmit={go(() => login(email.trim(), password))} className="mt-8 space-y-4">
            <div>
              <label className="lbl" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-sm text-paper outline-none transition placeholder:text-mist focus:border-molten"
              />
            </div>
            <div>
              <label className="lbl" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-sm text-paper outline-none transition placeholder:text-mist focus:border-molten"
              />
            </div>

            {err && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {err}
              </p>
            )}

            <button type="submit" disabled={authLoading} className="btn-forge w-full">
              {authLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-mist">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <button onClick={demo} disabled={authLoading} className="btn-ghost w-full">
            Try the demo — one click
          </button>
          {mode === "local" && (
            <p className="mt-4 text-center text-xs text-mist">
              Offline preview: the studio works fully without an account. Your work stays in this browser.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
