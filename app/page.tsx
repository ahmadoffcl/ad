import Link from "next/link";
import Logo from "@/components/Logo";
import AdCanvas from "@/components/AdCanvas";
import PhoneMock from "@/components/PhoneMock";
import { Bar, Pill, ScoreRing } from "@/components/ui";
import { SEED_BRANDS } from "@/lib/seed";
import { scoreHook } from "@/lib/hookScore";

const kova = SEED_BRANDS[0];

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#method", label: "Method" },
  { href: "#proof", label: "Proof" },
];

const MARQUEE_BRANDS = [
  "KOVA", "Juniper & Co.", "Fieldstone", "Nomad Supply", "Lumen Labs", "Arbor & Oak", "Halcyon", "Vanta Goods",
];

const FEATURES = [
  {
    title: "Hook Score",
    body: "Every opening line graded 0–100 on hook-word power, brevity, pattern interrupt, curiosity gap, CTA and emoji discipline. No vibes — arithmetic.",
    visual: <ScoreRing score={88} size={72} />,
  },
  {
    title: "One-Brief Campaign",
    body: "One brief becomes three concepts, each rendered natively for Feed, Reel, Story, TikTok, Shorts and X. Eighteen assets, zero copy-paste.",
    visual: (
      <div className="flex flex-wrap gap-1.5">
        {["IG Feed", "IG Reel", "IG Story", "TikTok", "Shorts", "X"].map((p) => (
          <Pill key={p} tone="accent">{p}</Pill>
        ))}
      </div>
    ),
  },
  {
    title: "Slop Shield",
    body: "Seven deterministic QC checks — contrast, brand compliance, hook speed, safe zones, hashtag load — before anything is allowed near your audience.",
    visual: (
      <div className="w-full space-y-1.5">
        {["Text legibility", "Brand compliance", "Hook in 2s"].map((c) => (
          <div key={c} className="flex items-center gap-2 text-xs text-fog">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.6" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            {c}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Autopilot Gates",
    body: "You decide how much leash the machine gets: manual approval, gated auto-advance on green shields, or full autopilot. Every gate is on the record.",
    visual: (
      <div className="flex items-center gap-1 text-[10px] font-semibold">
        {["Ideas", "Review", "Live"].map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`rounded-full px-2 py-1 ${i === 2 ? "bg-molten text-ink" : "bg-ink-4 text-fog"}`}>{s}</span>
            {i < 2 && <span className="text-mist">→</span>}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: "True-Preview",
    body: "See the creative inside real Instagram and TikTok chrome — not a blank canvas. What you approve is what the thumb sees.",
    visual: (
      <div className="flex gap-1.5">
        <div className="h-16 w-9 rounded-md border border-line bg-ink-4" />
        <div className="h-16 w-9 rounded-md border border-molten/50 bg-ink-4" />
        <div className="h-16 w-9 rounded-md border border-line bg-ink-4" />
      </div>
    ),
  },
  {
    title: "Memory",
    body: "AdForge studies what actually performed and writes it down: “Hooks under 8 words earn +22% saves.” Learnings feed the next brief automatically.",
    visual: (
      <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
        <p className="text-[11px] font-semibold text-emerald-300">+22% saves</p>
        <p className="text-[11px] text-fog">hooks under 8 words</p>
      </div>
    ),
  },
];

const STEPS = [
  { n: "01", title: "Brief", body: "Product, audience, goal, offer. Sixty seconds, one form." },
  { n: "02", title: "Concepts", body: "Three scored directions. Pick the killer, kill the rest." },
  { n: "03", title: "Create", body: "Platform-native variants render from your brand kit." },
  { n: "04", title: "Approve", body: "True-preview in real app chrome. Slop Shield must pass." },
  { n: "05", title: "Schedule", body: "Rate-limit-aware queue spreads posts across the week." },
  { n: "06", title: "Learn", body: "Performance becomes Memory. The next brief starts smarter." },
];

const PROOF = [
  {
    quote: "We went from brief to a scheduled week of content in eleven minutes. Our old workflow took three days and a freelancer.",
    name: "Mara Ellison", role: "Founder, Fieldstone",
    metric: "11 min", metricLabel: "brief → scheduled",
  },
  {
    quote: "The Hook Score called out our lazy headlines before our audience could. Average score shipped went from 61 to 88.",
    name: "Devon Park", role: "Growth, Nomad Supply",
    metric: "+44%", metricLabel: "avg hook score",
  },
  {
    quote: "Slop Shield killed six renders that would have embarrassed us. That's the feature. That's the whole pitch.",
    name: "Priya Nair", role: "Brand lead, Lumen Labs",
    metric: "0", metricLabel: "slop shipped",
  },
];

export default function Landing() {
  const demo = scoreHook("Stop scrolling. The drop is live.", "Launch-week pricing. Shop the drop — link in bio.");
  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-fog transition-colors hover:text-paper">
                {l.label}
              </a>
            ))}
          </nav>
          <Link href="/app" className="btn-primary btn-sm !px-4 !py-2">
            Open the studio
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          src="/media/hero-forge.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-ink/70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink to-transparent" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="stagger">
            <p className="kicker">The end-to-end ad studio</p>
            <h1 className="h-display mt-4 text-[44px] leading-[0.98] sm:text-[72px]">
              Ads people
              <br />
              don&apos;t <span className="text-molten">skip.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-fog sm:text-lg">
              Brief once. Get platform-native campaigns with scored hooks, a QC shield that
              kills slop before it ships, and autopilot posting to every social that matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app/studio" className="btn-primary !px-7 !py-3.5 !text-base">
                Forge your first ad
              </Link>
              <a href="#method" className="btn-ghost !px-7 !py-3.5 !text-base">
                See the method
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {[
                ["2,400+", "campaigns forged"],
                ["38M", "impressions tracked"],
                ["92", "avg hook score shipped"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-display text-2xl font-bold text-paper">{v}</p>
                  <p className="text-xs text-mist">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* hero product mock */}
          <div className="relative mx-auto w-full max-w-[520px] animate-fade-up">
            <div className="card overflow-hidden shadow-pop">
              <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-ink-4" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink-4" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink-4" />
                <span className="ml-3 rounded-md bg-ink-3 px-2.5 py-1 font-display text-[10px] text-fog">
                  app.adforge.studio
                </span>
                <Pill tone="accent" className="ml-auto">Slop Shield · PASS</Pill>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.2fr]">
                <div>
                  <p className="label">Hook score</p>
                  <div className="flex items-center gap-3">
                    <ScoreRing score={demo.score} size={64} />
                    <div>
                      <p className="font-display text-sm font-bold text-paper">{demo.grade}</p>
                      <p className="text-[11px] text-mist">6 checks · deterministic</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {demo.parts.slice(0, 3).map((p) => (
                      <div key={p.label}>
                        <div className="mb-1 flex justify-between text-[10px] text-fog">
                          <span>{p.label}</span>
                          <span className="font-bold">{p.points}/{p.max}</span>
                        </div>
                        <Bar value={p.points} max={p.max} tone={p.points / p.max >= 0.7 ? "green" : "amber"} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-line">
                  <AdCanvas
                    brand={kova}
                    headline="Stop scrolling. The drop is live."
                    sub="Launch-week pricing on the Court Low. Nothing extra."
                    cta="Shop the drop"
                    visual={{ bg: kova.colors.ink, fg: kova.colors.paper, accent: kova.colors.accent, motif: "Oversized type over silhouette", layout: "Stacked type" }}
                    aspect="1:1"
                    scale={0.52}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <div className="flex gap-1.5">
                  {["IG Reel", "TikTok", "Shorts"].map((p) => (
                    <Pill key={p}>{p}</Pill>
                  ))}
                </div>
                <span className="font-display text-xs font-bold text-molten">→ Scheduled · Tue 18:00</span>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-2 hidden w-44 rotate-3 sm:block lg:-right-8">
              <PhoneMock
                chrome="tiktok"
                handle="kova.studio"
                aspect="9:16"
                caption="Stop scrolling. The drop is live. #dropalert"
                creative={
                  <AdCanvas
                    brand={kova}
                    headline="Stop scrolling."
                    sub="The drop is live."
                    cta="Shop now"
                    visual={{ bg: kova.colors.ink, fg: kova.colors.paper, accent: kova.colors.accent, motif: "Type-dominant", layout: "Type-dominant" }}
                    aspect="9:16"
                    scale={0.42}
                    showMeta={false}
                  />
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* marquee */}
      <section className="border-y border-line/60 bg-ink-2/50 py-5">
        <p className="mb-4 text-center font-display text-[10px] font-bold uppercase tracking-[0.24em] text-mist">
          Forging launches for
        </p>
        <div className="overflow-hidden">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...MARQUEE_BRANDS, ...MARQUEE_BRANDS].map((b, i) => (
              <span key={i} className="whitespace-nowrap font-display text-xl font-bold text-fog/70">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
        <p className="kicker">Killer features</p>
        <h2 className="h-display mt-3 max-w-2xl text-3xl sm:text-5xl">
          Everything between the idea and the impression.
        </h2>
        <p className="mt-4 max-w-xl text-fog">
          Six systems, one pipeline. Each one does a job no one else bothered to automate properly.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover stagger p-6">
              <div className="mb-5 flex h-24 items-center justify-start">{f.visual}</div>
              <h3 className="h-display text-lg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* showcase */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
        <p className="kicker">Fresh from the forge</p>
        <h2 className="h-display mt-3 max-w-2xl text-3xl sm:text-5xl">
          Creative that looks like it cost $50k.
        </h2>
        <p className="mt-4 max-w-xl text-fog">
          Real output from real briefs. Every frame below started as sixty seconds of input.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="group relative min-h-[340px] overflow-hidden rounded-2xl border border-line lg:col-span-2">
            <img
              src="/media/forge-phone.jpg"
              alt="A phone showing an AdForge sneaker ad creative surrounded by molten sparks"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
            <div className="absolute bottom-0 p-6 sm:p-8">
              <Pill tone="accent">Slop Shield · PASS</Pill>
              <h3 className="h-display mt-3 text-2xl sm:text-3xl">Forged, not generated.</h3>
              <p className="mt-2 max-w-md text-sm text-fog">
                Every creative passes seven QC checks before it earns the right to exist. This one ships with a 94 Hook Score.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            <figure className="group overflow-hidden rounded-2xl border border-line bg-coal">
              <div className="overflow-hidden">
                <img
                  src="/media/kova-sneaker.jpg"
                  alt="KOVA Court Low sneaker launch creative"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-display text-sm font-bold text-paper">KOVA — “Stop scrolling.”</p>
                  <p className="mt-0.5 text-xs text-mist">Launch creative · IG Reel + TikTok</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-molten">91</p>
                  <p className="text-[10px] uppercase tracking-wider text-mist">Hook Score</p>
                </div>
              </figcaption>
            </figure>
            <figure className="group overflow-hidden rounded-2xl border border-line bg-coal">
              <div className="overflow-hidden">
                <img
                  src="/media/juniper-candle.jpg"
                  alt="Juniper & Co. amber candle creative"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-display text-sm font-bold text-paper">Juniper &amp; Co. — “Pour day.”</p>
                  <p className="mt-0.5 text-xs text-mist">Seasonal creative · IG Story + Reels</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-molten">84</p>
                  <p className="text-[10px] uppercase tracking-wider text-mist">Hook Score</p>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* method */}
      <section id="method" className="border-y border-line/60 bg-ink-2/40">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
          <p className="kicker">The method</p>
          <h2 className="h-display mt-3 text-3xl sm:text-5xl">Brief → Learn. Nothing in between is manual.</h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="group rounded-2xl border border-line bg-ink p-6 transition-all duration-200 hover:-translate-y-1 hover:border-molten/40">
                <p className="font-display text-sm font-bold text-molten">{s.n}</p>
                <h3 className="h-display mt-2 text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/app/studio" className="btn-primary !px-8 !py-3.5 !text-base">
              Run the method on your product
            </Link>
          </div>
        </div>
      </section>

      {/* proof */}
      <section id="proof" className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
        <p className="kicker">Proof</p>
        <h2 className="h-display mt-3 text-3xl sm:text-5xl">Founders don&apos;t flatter. Numbers do.</h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PROOF.map((t) => (
            <figure key={t.name} className="card card-hover flex flex-col p-6">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-molten">{t.metric}</span>
                <span className="text-xs text-mist">{t.metricLabel}</span>
              </div>
              <blockquote className="flex-1 text-[15px] leading-relaxed text-paper/90">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 border-t border-line pt-4">
                <p className="font-display text-sm font-bold text-paper">{t.name}</p>
                <p className="text-xs text-mist">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:py-32">
          <p className="kicker">Stop posting. Start forging.</p>
          <h2 className="h-display mt-4 text-4xl sm:text-6xl">
            Your next campaign is<br />one brief away.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-fog">
            Free to start. No credit card. Your first scored, shielded, scheduled campaign in under fifteen minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="btn-primary !px-8 !py-4 !text-base">
              Enter the studio
            </Link>
            <Link href="/app/radar" className="btn-ghost !px-8 !py-4 !text-base">
              Browse the Trend Radar
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo size={28} />
          <p className="text-xs text-mist">© 2026 AdForge. Ads people don&apos;t skip.</p>
          <div className="flex gap-6 text-xs text-fog">
            <Link href="/app" className="transition-colors hover:text-paper">Studio</Link>
            <Link href="/app/settings" className="transition-colors hover:text-paper">Connections</Link>
            <a href="#features" className="transition-colors hover:text-paper">Features</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
