# AdForge — Ads people don't skip.

AdForge is an end-to-end ad creation and social posting studio. Brief once, get
platform-native campaigns with scored hooks, a deterministic QC shield, and
autopilot posting to every social that matters. Now with **Forge Copilot** — a
conversational AI copilot that drafts, scores, and schedules with you.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000 — offline demo mode (localStorage, deterministic engines)
```

```bash
npm run build        # standard Next.js production build
npm run pages:build  # Cloudflare Pages build (next-on-pages)
npm start            # serve the production build
```

Node ≥ 18.17 required. No environment variables needed for local demo mode.

## Deploy it (Cloudflare)

AdForge is built for **Cloudflare Pages + D1 + Workers AI**. Config lives in
`wrangler.toml` (D1 binding `DB` → database `adforge-db`, Workers AI binding
`AI`). Media stays in `public/` — no object storage involved.

```bash
npm run db:migrate   # apply migrations/ to the remote D1 database
npm run deploy       # pages:build + wrangler pages deploy
```

What the backend gives you:

- **Real auth** — PBKDF2-SHA256 password hashing (WebCrypto, edge-safe),
  30-day HttpOnly session cookies, per-user data isolation on every query.
- **D1 persistence** — users, profiles, brands (with director preferences),
  campaigns, concepts, creatives, scheduled posts, notifications, API keys,
  copilot threads + messages. See `migrations/0001_init.sql` (+ `0002_copilot.sql`).
- **Workers AI** — concept drafting with self-critique, hook second opinions,
  placement-aware captions (`@cf/meta/llama-3.1-8b-instruct`, mistral fallback).
- **Honest badges** — every AI output is labeled `AI-written`, `AI + QC`, or
  `Deterministic`. When the model is unreachable, the deterministic engines
  serve transparently — never a silent downgrade.
- **Offline fallback** — with no bindings (plain `next dev`), the app runs the
  full studio on localStorage. Sign in to switch to cloud sync; the store
  hydrates from the API and syncs writes optimistically.

Demo account (seeded by the migration): `demo@adforge.studio` / `forge-demo`.

## What it does

| Route | What lives there |
|---|---|
| `/` | Marketing landing — hero with live product mock, feature grid, method, proof |
| `/login`, `/signup` | Real auth — dark/light aware, demo one-click, redirects back |
| `/app` | Dashboard — KPIs, drag-and-drop pipeline kanban, activity feed, rate-limit alerts |
| `/app/studio` | The creator — brief form + **Director's chair** → 3 scored concepts → detail with true-preview, layers, editable copy, AI captions, hook second opinion, Slop Shield, approve/schedule |
| `/app/copilot` | **Forge Copilot** — conversational AI copilot with tool calling, rich action cards, and D1-persisted threads (also a floating button everywhere in `/app`; bottom-sheet on mobile) |
| `/app/calendar` | Month scheduler with per-day counts, overload warnings and one-tap auto-spread |
| `/app/analytics` | KPIs, hand-rolled reach chart, top-posts table, Memory learnings derived from real data |
| `/app/radar` | Trend Radar — trending formats with watchlist, filters and "Use this trend" deep-links into the studio |
| `/app/brands` | Brand kit manager — palette, voice, banned words, director defaults, live re-skin preview |
| `/app/settings` | Platform connections, autopilot gates, Slop Shield sensitivity, appearance (theme + density) |
| `/app/profile` | Account area — profile editor, plan & usage, connections, notification prefs, API keys (secret shown once), appearance, danger zone |
| `/app/more` | Mobile hub — quick links to Analytics, Brands, Settings, Profile + install-to-home-screen nudge |

### Killer features (real logic, no random numbers)

- **Forge Copilot** — a chat copilot with tool calling against the app's own
  engines (`get_dashboard_stats`, `list_campaigns`, `create_brief`,
  `generate_concepts`, `score_hook`, `write_caption`, `schedule_post`,
  `get_analytics`, `get_trends`). ReAct-style loop over Workers AI with
  streamed progress, suggestion chips, markdown, rich concept cards with Hook
  Score + Approve right in chat, and confirmation cards before anything
  irreversible. Threads persist in D1. Personality: warm, direct, slightly
  playful co-founder operator — verdicts over options, honest when something's
  off. Its system prompt lives in `lib/ai/prompts.ts`, human-reviewable.
- **Workers AI generation** — draft → self-critique → weakest-concept rewrite →
  deterministic Hook Score + Slop Shield QC. Anything failing QC is replaced
  by the deterministic engine; the UI always says which.
- **Director's chair** — per-brand taste controls (tone, hook style, CTA type,
  caption length, emoji, creativity slider → temperature, negative "avoid"
  prompt) persisted on the brand and injected into every AI prompt.
- **Hook Score (0–100)** — `lib/hookScore.ts`. Deterministic heuristic over six
  weighted parts: hook-word power, brevity, pattern interrupt, curiosity gap,
  CTA presence, emoji discipline. Every point is explained in the UI. The AI
  second opinion blends 60/40 with the engine.
- **One-Brief Campaign** — `lib/campaign.ts`. One brief → 3 concepts × native
  variants per placement (IG Feed/Reel/Story, TikTok, Shorts, X) with
  platform-correct caption limits and hashtag bands.
- **Slop Shield** — `lib/slop.ts`. Seven computed QC checks (text contrast,
  brand-color compliance, hook speed, safe zones, synthetic integrity, hashtag
  load, emoji discipline). Warns promote to fails at high sensitivity.
  Overrides require a note, on the record. Copilot output passes through the
  same gates.
- **Autopilot gates** — every pipeline item carries a gate status
  (`auto-ok` / `awaiting` / `overridden`); Settings → Autopilot decides which
  stages auto-advance.
- **True-Preview** — CSS phone mockups (`components/PhoneMock.tsx`) render the
  creative inside Instagram/TikTok chrome per placement.
- **Memory / Learnings** — `lib/learnings.ts` derives learnings from post
  performance (short hooks vs long, questions vs statements, CTA vs none,
  Hook Score vs reach) with cited sample sizes.

## Architecture

```
app/                 Next.js 14 App Router (edge runtime on API routes)
  page.tsx           marketing landing
  login/ signup/     auth pages
  app/               studio shell (ForgeProvider + AppShell)
    page.tsx         dashboard + kanban
    studio/          brief + director's chair → concepts → detail
    copilot/         Forge Copilot full view
    calendar/        scheduler + rate-limit guard
    analytics/       charts + learnings
    radar/           trends
    brands/          brand kits + director defaults
    settings/        connections + autopilot + shield
  api/
    auth/            signup / login / logout / me (PBKDF2, sessions)
    profile/ brands/ campaigns/ concepts/ creatives/
    scheduled-posts/ notifications/ api-keys/   CRUD, per-user isolated
    ai/              generate-concepts / score-hook / caption (Workers AI + badges)
    copilot/         chat (SSE, tool-calling loop) + threads
middleware.ts        /app/* protection in production (local dev stays open)
migrations/          D1 schema (0001 core, 0002 copilot)
wrangler.toml        Pages + D1 (adforge-db) + Workers AI bindings
components/          ui kit, AppShell, PhoneMock, AdCanvas, ScoreBars, SlopPanel,
                     CommandPalette, Notifications, Onboarding, ThemeToggle,
                     AddToHome, copilot/ (panel, cards, markdown)
lib/
  types.ts           domain model (+ DirectorPrefs)
  seed.ts            fictional demo data (KOVA, Juniper & Co.)
  store.tsx          React context — cloud sync when authed, localStorage fallback
  api.ts             typed client for the D1 API (null-safe offline)
  aiClient.ts        typed client for the Workers AI routes (+ source badges)
  db.ts / auth.ts / api-helpers.ts   edge binding + session + response helpers
  ai.ts              Workers AI execution (draft → critique → QC → badge)
  ai/prompts.ts      reviewable prompt system (concepts, critique, caption, copilot)
  copilot/tools.ts   copilot tool implementations
  theme.tsx          dark/light theme provider + density + pre-paint init script
  toast.tsx          global toast provider
  hookScore.ts       Hook Score engine
  slop.ts            Slop Shield engine
  campaign.ts        One-Brief Campaign generator + platform metadata
  learnings.ts       Memory/Learnings derivation
```

**State:** when signed in, the store hydrates from the D1 API and syncs writes
optimistically (local→server id remap under the hood); signed out or offline,
it runs on `localStorage` (`adforge-v1`) with the full deterministic feature
set. Trends/analytics seed data never persists — always fresh from code.

**Design system:** dual theme (dark premium default + warm paper light), persistent
toggle, `prefers-color-scheme` on first run, pre-paint init script so the theme
never flashes. Ink `#0B0B0C`, paper `#FAFAF7`, molten orange `#FF5A1F` (solid,
never neon), Space Grotesk display + Inter body via `next/font/google`.
Mobile-first: sidebar nav on desktop, five-tab bottom bar on mobile with
safe-area insets, sticky blurred headers, and bottom-sheet modals — the `/app`
shell behaves like an installed app. PWA-ready: `manifest.webmanifest`,
maskable icons, Apple web-app meta, install nudge on the More tab.
Comfortable/compact density toggle included.

**App chrome:** ⌘K command palette (routes + actions), global toast system,
notification center with mark-all-read, three-step first-run onboarding
(`localStorage`), page transitions, press/hover micro-interactions and
focus-visible rings throughout.

## Roadmap

- **P2 — real video pipeline:** script-first gate → AI footage → voiceover →
  the same Shield + autopilot flow video concepts already plug into.
- **Posting adapters:** one per platform behind the connection settings;
  Instagram first (already modeled), then Threads/Facebook (same Meta auth
  family), then TikTok, YouTube Shorts, X after app reviews clear.
- **A/B variants + budget-aware scheduling**, team workspaces, approval chains.

## License

MIT — see [LICENSE](LICENSE).
