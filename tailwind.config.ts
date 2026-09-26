import type { Config } from "tailwindcss";

/**
 * AdForge design tokens.
 * Every color is a CSS variable so the whole UI flips between
 * dark (default, :root) and light (.light on <html>) without
 * touching markup. See app/globals.css for the variable values.
 */
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: v("ink"),
          2: v("ink-2"),
          3: v("ink-3"),
          4: v("ink-4"),
        },
        paper: {
          DEFAULT: v("paper"),
          dim: v("paper-dim"),
        },
        molten: {
          DEFAULT: v("molten"),
          deep: v("molten-deep"),
          soft: v("molten-soft"),
          wash: v("molten-wash"),
        },
        onaccent: v("on-accent"),
        line: v("line"),
        fog: v("fog"),
        mist: v("mist"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 12px 32px -12px rgba(0,0,0,0.6)",
        pop: "0 24px 64px -16px rgba(255,90,31,0.25)",
        lift: "0 8px 24px -8px rgba(0,0,0,0.55)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "sheet-up": {
          "0%": { opacity: "0", transform: "translateY(48px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulsebar: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "tab-pop": {
          "0%": { transform: "scale(0.85)" },
          "55%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "sheet-up": "sheet-up 0.38s cubic-bezier(0.22,1,0.36,1) both",
        "toast-in": "toast-in 0.3s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        marquee: "marquee 28s linear infinite",
        pulsebar: "pulsebar 1.6s ease-in-out infinite",
        "tab-pop": "tab-pop 0.3s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
