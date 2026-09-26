import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0B0C",
          2: "#121214",
          3: "#1A1A1E",
          4: "#232328",
        },
        paper: {
          DEFAULT: "#FAFAF7",
          dim: "#EFEEE8",
        },
        molten: {
          DEFAULT: "#FF5A1F",
          deep: "#D9480F",
          soft: "#FF8A5C",
          wash: "#2A1408",
        },
        line: "#26262C",
        fog: "#A6A6AD",
        mist: "#6E6E76",
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
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulsebar: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease both",
        marquee: "marquee 28s linear infinite",
        pulsebar: "pulsebar 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
