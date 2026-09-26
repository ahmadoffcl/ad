import type { Aspect, Brand } from "@/lib/types";

/**
 * AdCanvas — renders the designed creative from the brand kit.
 * Pure CSS/SVG, three layout engines, scales via the `scale` prop.
 */

export interface VisualSpec {
  bg: string;
  fg: string;
  accent: string;
  motif: string;
  layout: string;
}

export default function AdCanvas({
  brand,
  headline,
  sub,
  cta,
  visual,
  aspect,
  scale = 1,
  showMeta = true,
  hiddenLayers = [],
}: {
  brand: Brand;
  headline: string;
  sub: string;
  cta: string;
  visual: VisualSpec;
  aspect: Aspect;
  scale?: number;
  showMeta?: boolean;
  hiddenLayers?: string[];
}) {
  const hidden = (l: string) => hiddenLayers.includes(l);
  const aspectCls =
    aspect === "9:16" ? "aspect-[9/16]" : aspect === "1:1" ? "aspect-square" : "aspect-video";

  const baseHead = aspect === "9:16" ? 34 : aspect === "1:1" ? 30 : 27;
  const baseSub = aspect === "9:16" ? 15 : 14;

  const u = (n: number) => `${(n * scale).toFixed(1)}px`;

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${aspectCls}`}
      style={{ background: visual.bg, color: visual.fg }}
    >
      {/* molten ribbon */}
      {!hidden("ribbon") && (
        <div
          className="absolute -right-10 -top-10 h-40 w-16 rotate-[24deg]"
          style={{ background: visual.accent, opacity: 0.9 }}
        />
      )}
      <div
        className="absolute -bottom-14 -left-14 h-44 w-44 rounded-full"
        style={{ border: `${u(3)} solid ${visual.accent}`, opacity: 0.35 }}
      />
      {/* ghost numeral */}
      <span
        className="pointer-events-none absolute bottom-2 right-3 select-none font-display font-bold leading-none"
        style={{ fontSize: u(64), color: visual.fg, opacity: 0.07 }}
      >
        01
      </span>

      {/* top meta row */}
      {showMeta && !hidden("brand-mark") && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between" style={{ padding: u(14) }}>
          <span className="flex items-center gap-2">
            <svg width={u(18)} height={u(18)} viewBox="0 0 36 36" fill="none">
              <path d="M9 27 L18 9 L27 27" stroke={visual.accent} strokeWidth="4" strokeLinecap="square" />
              <path d="M13.2 21.5 H22.8" stroke={visual.fg} strokeWidth="3" strokeLinecap="square" />
            </svg>
            <span className="font-display font-bold tracking-tight" style={{ fontSize: u(13) }}>
              {brand.name}
            </span>
          </span>
          <span
            className="rounded-full border font-display font-semibold uppercase"
            style={{
              fontSize: u(9),
              letterSpacing: "0.18em",
              padding: `${u(3)} ${u(8)}`,
              borderColor: visual.fg,
              opacity: 0.7,
            }}
          >
            Ad
          </span>
        </div>
      )}

      {visual.layout === "Split frame" ? (
        <div className="absolute inset-0 flex" style={{ paddingTop: u(52) }}>
          <div className="flex w-[58%] flex-col justify-center" style={{ padding: u(18) }}>
            {!hidden("headline") && (
              <p className="font-display font-bold leading-[1.02] tracking-tight" style={{ fontSize: u(baseHead) }}>
                {headline}
              </p>
            )}
            {!hidden("sub") && (
              <p className="mt-3 leading-snug opacity-80" style={{ fontSize: u(baseSub) }}>
                {sub}
              </p>
            )}
            {!hidden("cta") && <CtaPill cta={cta} visual={visual} u={u} />}
          </div>
          <div
            className="relative flex w-[42%] items-center justify-center overflow-hidden"
            style={{ background: visual.accent }}
          >
            <span
              className="font-display font-bold text-center leading-none"
              style={{ fontSize: u(20), color: visual.bg, opacity: 0.9, transform: "rotate(-90deg)", whiteSpace: "nowrap" }}
            >
              {brand.tagline.toUpperCase()}
            </span>
          </div>
        </div>
      ) : visual.layout === "Type-dominant" ? (
        <div className="absolute inset-0 flex flex-col justify-end" style={{ padding: u(20), paddingTop: u(52) }}>
          {!hidden("headline") && (
            <p
              className="font-display font-bold uppercase leading-[0.95] tracking-tight"
              style={{ fontSize: u(baseHead * 1.35) }}
            >
              {headline}
            </p>
          )}
          <div className="mt-3 h-1 w-16" style={{ background: visual.accent }} />
          {!hidden("sub") && (
            <p className="mt-3 leading-snug opacity-80" style={{ fontSize: u(baseSub) }}>
              {sub}
            </p>
          )}
          {!hidden("cta") && <CtaPill cta={cta} visual={visual} u={u} />}
        </div>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ padding: u(24), paddingTop: u(56) }}
        >
          {!hidden("headline") && (
            <p className="font-display font-bold leading-[1.04] tracking-tight" style={{ fontSize: u(baseHead) }}>
              {headline}
            </p>
          )}
          {!hidden("sub") && (
            <p className="mt-3 max-w-[90%] leading-snug opacity-80" style={{ fontSize: u(baseSub) }}>
              {sub}
            </p>
          )}
          {!hidden("cta") && <CtaPill cta={cta} visual={visual} u={u} centered />}
        </div>
      )}

      {/* motif footnote */}
      {showMeta && !hidden("motif-note") && (
        <p
          className="absolute bottom-2 left-3 font-display uppercase"
          style={{ fontSize: u(8.5), letterSpacing: "0.16em", opacity: 0.45 }}
        >
          {visual.motif}
        </p>
      )}
    </div>
  );
}

function CtaPill({
  cta,
  visual,
  u,
  centered,
}: {
  cta: string;
  visual: VisualSpec;
  u: (n: number) => string;
  centered?: boolean;
}) {
  return (
    <span
      className={`mt-4 inline-flex items-center gap-2 self-start rounded-full font-display font-semibold ${centered ? "self-center" : ""}`}
      style={{
        background: visual.accent,
        color: visual.bg,
        fontSize: u(13),
        padding: `${u(9)} ${u(18)}`,
      }}
    >
      {cta}
      <svg width={u(13)} height={u(13)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}
