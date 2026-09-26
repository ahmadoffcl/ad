import Link from "next/link";
import { SEED_TRENDS } from "@/lib/seed";
import { Bar, Card, Pill, SectionHead } from "@/components/ui";

function heatTone(heat: number): "green" | "amber" | "red" {
  if (heat >= 85) return "green";
  if (heat >= 75) return "amber";
  return "red";
}

export default function RadarPage() {
  const [top, ...rest] = [...SEED_TRENDS].sort((a, b) => b.heat - a.heat);

  return (
    <div>
      <SectionHead
        kicker="Trend Radar"
        title="Ride the wave before it breaks."
        sub="Formats, sounds and hooks gaining steam in your niche — each one jumps straight into the studio, prefilled."
      />

      {/* featured */}
      <Card className="relative mb-4 overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-[100px]"
          style={{ background: "#FF5A1F" }}
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="accent">#1 trending</Pill>
              <Pill>{top.platform}</Pill>
              <Pill>{top.format}</Pill>
            </div>
            <h2 className="h-display mt-4 text-3xl sm:text-4xl">{top.title}</h2>
            <p className="mt-3 font-display text-lg font-semibold text-molten-soft">“{top.hook}”</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-fog">{top.why}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={`/app/studio?trend=${top.id}`} className="btn-primary">
                Use this trend →
              </Link>
              <span className="font-display text-sm font-bold text-emerald-300">{top.growth}</span>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-line bg-ink-3 p-5">
            <p className="label">Heat index</p>
            <p className="font-display text-5xl font-bold text-paper">{top.heat}</p>
            <Bar value={top.heat} max={100} tone={heatTone(top.heat)} className="mt-3" />
            <p className="mt-2 text-xs text-mist">Composite of uses, velocity and saves across the niche.</p>
          </div>
        </div>
      </Card>

      {/* grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((t, i) => (
          <Card key={t.id} className="card-hover flex flex-col p-5 animate-fade-up" >
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-mist">#{i + 2}</span>
              <Pill tone="green">{t.growth}</Pill>
            </div>
            <h3 className="h-display mt-2.5 text-xl">{t.title}</h3>
            <p className="mt-1.5 font-display text-sm font-semibold text-molten-soft">“{t.hook}”</p>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-fog">{t.why}</p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] text-mist">
                <span>Heat</span>
                <span className="font-bold text-paper">{t.heat}</span>
              </div>
              <Bar value={t.heat} max={100} tone={heatTone(t.heat)} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <div className="flex gap-1.5">
                <Pill>{t.platform}</Pill>
              </div>
              <Link
                href={`/app/studio?trend=${t.id}`}
                className="font-display text-xs font-bold text-molten-soft transition-colors hover:text-molten"
              >
                Use this trend →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
