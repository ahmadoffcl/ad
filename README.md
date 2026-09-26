# AdForge — Ads people don't skip.

AdForge is an end-to-end ad creation and social posting studio. Brief once, get
platform-native campaigns with scored hooks, a deterministic QC shield, and
autopilot posting to every social that matters.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm start        # serve the production build
```

Node ≥ 18.17 required. No environment variables needed for the MVP.

## What it does

| Route | What lives there |
|---|---|
| `/` | Marketing landing — hero with live product mock, feature grid, method, proof |
| `/app` | Dashboard — KPIs, drag-and-drop pipeline kanban, activity feed, rate-limit alerts |
| `/app/studio` | The creator — brief form → 3 scored concepts → detail with true-preview, layers, caption editor, Hook Score breakdown, Slop Shield, approve/schedule |
| `/app/calendar` | Month scheduler with per-day counts, overload warnings and one-tap auto-spread |
| `/app/analytics` | KPIs, hand-rolled reach chart, top-posts table, Memory learnings derived from real data |
| `/app/radar` | Trend Radar — trending formats with "Use this trend" deep-links into the studio |
| `/app/brands` | Brand kit manager — palette, voice, banned words, live re-skin preview |
| `/app/settings` | Platform connections (OAuth explained, never faked), autopilot gates, Slop Shield sensitivity |

### Killer features (real logic, no random numbers)

- **Hook Score (0–100)** — `lib/hookScore.ts`. Deterministic heuristic over six
  weighted parts: hook-word power, brevity, pattern interrupt, curiosity gap,
  CTA presence, emoji discipline. Every point is explained in the UI.
- **One-Brief Campaign** — `lib/campaign.ts`. One brief → 3 concepts × native
  variants per placement (IG Feed/Reel/Story, TikTok, Shorts, X) with
  platform-correct caption limits and hashtag bands. Same brief always
  produces the same campaign.
- **Slop Shield** — `lib/slop.ts`. Seven computed QC checks (text contrast,
  brand-color compliance, hook speed, safe zones, synthetic integrity, hashtag
  load, emoji discipline). Warns promote to fails at high sensitivity.
  Overrides require a note, on the record.
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
app/                 Next.js 14 App Router
  page.tsx           marketing landing
  app/               studio shell (ForgeProvider + AppShell)
    page.tsx         dashboard + kanban
    studio/          brief → concepts → detail
    calendar/        scheduler + rate-limit guard
    analytics/       charts + learnings
    radar/           trends
    brands/          brand kits
    settings/        connections + autopilot + shield
components/          Logo, ui kit, AppShell, PhoneMock, AdCanvas, ScoreBars, SlopPanel
lib/
  types.ts           domain model
  seed.ts            fictional demo data (KOVA, Juniper & Co.)
  store.tsx          React context + localStorage persistence ("adforge-v1")
  hookScore.ts       Hook Score engine
  slop.ts            Slop Shield engine
  campaign.ts        One-Brief Campaign generator + platform metadata
  learnings.ts       Memory/Learnings derivation
```

**State:** TypeScript seed data hydrated into a React context, persisted to
`localStorage`. No backend in the MVP — deliberate, so the whole thing runs
with `npm install && npm run dev`.

**Design system:** dark premium. Ink `#0B0B0C`, paper `#FAFAF7`, molten orange
`#FF5A1F` (solid, never neon), Space Grotesk display + Inter body via
`next/font/google`. Mobile-first: sidebar nav on desktop, bottom tab bar on
mobile.

## Roadmap

- **P2 — real video pipeline:** script-first gate → AI footage → voiceover →
  the same Shield + autopilot flow video concepts already plug into.
- **Backend:** replace `localStorage` with Postgres (campaigns, brand kits,
  scheduled posts, OAuth tokens in a vault) + queue workers for generation and
  posting.
- **Posting adapters:** one per platform behind the connection settings;
  Instagram first (already modeled), then Threads/Facebook (same Meta auth
  family), then TikTok, YouTube Shorts, X after app reviews clear.
- **A/B variants + budget-aware scheduling**, team workspaces, approval chains.

## License

MIT — see [LICENSE](LICENSE).
