"use client";

import { useTheme } from "@/lib/theme";
import type { Density, Theme } from "@/lib/theme";
import { Card } from "@/components/ui";

function Segmented<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div>
      <p className="label !mb-2">{label}</p>
      <div className="inline-flex rounded-xl border border-line bg-ink-3 p-1" role="group" aria-label={label}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick(o.id)}
              aria-pressed={on}
              className={`rounded-lg px-4 py-2 text-sm font-display font-semibold tracking-wide transition-all duration-150 ${
                on ? "bg-molten text-onaccent shadow-pop" : "text-fog hover:text-paper"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AppearanceCard() {
  const { theme, setTheme, density, setDensity } = useTheme();

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="h-display mb-1 text-lg">Appearance</h3>
      <p className="mb-5 text-sm text-fog">Theme and density apply instantly across the whole forge.</p>
      <div className="flex flex-wrap gap-6">
        <Segmented<Theme>
          label="Theme"
          value={theme}
          onPick={(t) => setTheme(t)}
          options={[
            { id: "dark", label: "Dark" },
            { id: "light", label: "Light" },
          ]}
        />
        <Segmented<Density>
          label="Density"
          value={density}
          onPick={(d) => setDensity(d)}
          options={[
            { id: "comfortable", label: "Comfortable" },
            { id: "compact", label: "Compact" },
          ]}
        />
      </div>
    </Card>
  );
}
