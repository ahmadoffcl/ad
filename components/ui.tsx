import React from "react";

/* ---------- buttons ---------- */

export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "sm";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
  const sizes = size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2.5 text-sm";
  const variants = {
    primary: "bg-molten text-ink hover:bg-molten-soft hover:shadow-pop disabled:hover:shadow-none",
    ghost: "border border-line bg-ink-3 text-paper hover:border-mist/70 hover:bg-ink-4",
    danger: "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  } as const;
  return <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest} />;
}

/* ---------- cards & layout ---------- */

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionHead({
  kicker,
  title,
  sub,
  action,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="kicker mb-1.5">{kicker}</p>}
        <h1 className="h-display text-2xl sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 max-w-xl text-sm text-fog">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- pills / tags ---------- */

const pillTones: Record<string, string> = {
  default: "border-line bg-ink-3 text-fog",
  accent: "border-molten/40 bg-molten-wash text-molten-soft",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  paper: "border-transparent bg-paper text-ink",
};

export function Pill({
  tone = "default",
  children,
  className = "",
}: {
  tone?: keyof typeof pillTones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${pillTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ---------- stats ---------- */

export function Stat({
  label,
  value,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down" | "neutral";
}) {
  const tones = {
    up: "text-emerald-300",
    down: "text-red-300",
    neutral: "text-fog",
  } as const;
  return (
    <Card className="card-hover p-4 sm:p-5">
      <p className="label !mb-1">{label}</p>
      <p className="font-display text-2xl font-bold tracking-tight text-paper sm:text-[28px]">{value}</p>
      {delta && <p className={`mt-1 text-xs font-medium ${tones[tone]}`}>{delta}</p>}
    </Card>
  );
}

/* ---------- score ring ---------- */

export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "#34d399" : score >= 70 ? "#a3e635" : score >= 55 ? "#fbbf24" : score >= 40 ? "#fb923c" : "#f87171";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--c-track)" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, Math.max(0, score))) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute font-display text-lg font-bold text-paper">{score}</span>
    </div>
  );
}

/* ---------- progress bar ---------- */

export function Bar({
  value,
  max,
  tone = "accent",
  className = "",
}: {
  value: number;
  max: number;
  tone?: "accent" | "green" | "amber" | "red" | "muted";
  className?: string;
}) {
  const tones = {
    accent: "bg-molten",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
    muted: "bg-mist",
  } as const;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink-4 ${className}`}>
      <div className={`h-full rounded-full ${tones[tone]} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- empty state ---------- */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-ink-2/60 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5A1F" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <h3 className="h-display text-lg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-fog">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} card animate-fade-up max-h-[88vh] overflow-y-auto rounded-b-none p-6 sm:rounded-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="h-display text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fog transition-colors hover:bg-ink-3 hover:text-paper"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- form bits ---------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-mist">{hint}</p>}
    </div>
  );
}

/* ---------- skeleton ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/* ---------- spinner ---------- */

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-line border-t-molten"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

/* ---------- toggle ---------- */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-paper">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-fog">{description}</span>}
      </span>
      <span className="toggle" data-on={checked}>
        <span className="toggle-knob" />
      </span>
    </button>
  );
}

/* ---------- avatar ---------- */

const AVATAR_SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-2xl",
} as const;

export function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: keyof typeof AVATAR_SIZES;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold text-white ${AVATAR_SIZES[size]}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}
