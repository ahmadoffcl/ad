"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";
export type Density = "comfortable" | "compact";

const THEME_KEY = "adforge-theme";
const DENSITY_KEY = "adforge-density";

/** Runs in <head> before first paint — no flash of the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='light'){document.documentElement.classList.add('light');}var d=localStorage.getItem('${DENSITY_KEY}');if(d==='compact'){document.documentElement.classList.add('density-compact');}}catch(e){}})();`;

interface ThemeContextValue {
  theme: Theme;
  density: Density;
  ready: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setDensity: (d: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  density: "comfortable",
  ready: false,
  setTheme: () => {},
  toggleTheme: () => {},
  setDensity: () => {},
});

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("light", t === "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "light" ? "#FAFAF7" : "#0B0B0C");
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage blocked */
  }
}

function applyDensity(d: Density) {
  document.documentElement.classList.toggle("density-compact", d === "compact");
  try {
    localStorage.setItem(DENSITY_KEY, d);
  } catch {
    /* storage blocked */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [density, setDensityState] = useState<Density>("comfortable");
  const [ready, setReady] = useState(false);

  // Reconcile with what the inline head script already applied (pre-paint),
  // so React state matches the DOM on first render.
  useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem(THEME_KEY) as Theme | null;
      } catch {
        return null;
      }
    })();
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setThemeState(initial);
    applyTheme(initial);
    try {
      const d = localStorage.getItem(DENSITY_KEY) as Density | null;
      if (d === "compact") {
        setDensityState("compact");
        applyDensity("compact");
      }
    } catch {
      /* noop */
    }
    setReady(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    applyDensity(d);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, density, ready, setTheme, toggleTheme, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
