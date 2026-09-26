"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForge } from "@/lib/store";

function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const { signup, authLoading, authError } = useForge();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim() || !email.trim() || password.length < 8) {
      setLocalError("Give us your name, a valid email, and a password of 8+ characters.");
      return;
    }
    const ok = await signup(name.trim(), email.trim(), password);
    if (ok) router.push(next);
  };

  const err = localError || authError;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 70% 20%, rgba(255,92,26,0.28), transparent 70%), radial-gradient(50% 40% at 30% 80%, rgba(255,176,32,0.18), transparent 70%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-molten font-display text-lg font-black text-onaccent">F</span>
            <span className="font-display text-lg font-bold tracking-tight text-paper">AdForge</span>
          </Link>
          <div>
            <p className="eyebrow mb-4 text-molten">Set up in a minute</p>
            <h1 className="h-display max-w-md text-5xl leading-[1.02] text-paper">
              Your studio is waiting.
            </h1>
            <ul className="mt-6 space-y-3 text-[15px] text-fog">
              {[
                "Two brand kits pre-loaded — KOVA and Juniper & Co.",
                "Forge Copilot drafts concepts, scores hooks, writes captions.",
                "Every line passes the Slop Shield before it ships.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-molten/20 text-[11px] font-bold text-molten">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-mist">Free to start. Cancel anytime.</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-molten font-display text-lg font-black text-onaccent">F</span>
            <span className="font-display text-lg font-bold tracking-tight text-ink">AdForge</span>
          </Link>
          <p className="eyebrow mb-2">Get started</p>
          <h1 className="h-display text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-fog">
            Already have one?{" "}
            <Link href="/login" className="font-semibold text-molten hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="lbl" htmlFor="name">Your name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ava Stone"
                className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-sm text-paper outline-none transition placeholder:text-mist focus:border-molten"
              />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-sm text-paper outline-none transition placeholder:text-mist focus:border-molten"
              />
            </div>

            {err && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {err}
              </p>
            )}

            <button type="submit" disabled={authLoading} className="btn-forge w-full">
              {authLoading ? "Creating…" : "Create account"}
            </button>
            <p className="text-center text-xs text-mist">
              By continuing you agree to the terms. We&rsquo;ll never sell your data.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
