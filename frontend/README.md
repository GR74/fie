# Fan Impact Engine -- Frontend

Next.js 16 application with React 19, TypeScript 5, and Tailwind CSS 4. Provides the interactive UI for the Fan Impact Engine simulation platform.

## Setup

```bash
npm install
npm run dev
```

Opens at **http://localhost:3000**. Requires the backend running at `localhost:8000`.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.5 | App Router, API proxy, SSR |
| React | 19.2.3 | UI framework |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| Framer Motion | 12.29 | Animations and transitions |
| TanStack React Query | 5.90 | Server state management |
| Recharts | 3.7 | 2D charts (bar, line, area) |
| Three.js | 0.182 | 3D stadium visualization |
| React Three Fiber | 9.5 | React renderer for Three.js |
| Lucide React | 0.563 | Icon system |

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Home / sport selector
│   ├── layout.tsx                # Root layout + providers
│   ├── providers.tsx             # React Query + theme context
│   ├── CinematicShell.tsx        # Optional 3D stadium backdrop
│   ├── dashboard/page.tsx        # Sport-wide dashboard
│   ├── games/page.tsx            # Games list
│   ├── games/[id]/page.tsx       # Game day simulator
│   ├── games/[id]/engine/        # Engine deep-dive
│   ├── games/[id]/engine-report/ # Print-optimized report
│   ├── games/[id]/live/          # Live ESPN + weather
│   ├── games/[id]/sensitivity/   # 2D heatmap surface
│   ├── scenario/page.tsx         # Global scenario lab
│   ├── scenarios/page.tsx        # Saved scenarios
│   ├── compare/page.tsx          # Side-by-side comparison
│   ├── calibration/page.tsx      # Model backtesting
│   └── api/[...path]/route.ts    # Backend proxy
│
├── components/
│   ├── viz/                      # Data visualizations
│   │   ├── StadiumFillViz.tsx    # SVG arc-based stadium fill
│   │   ├── PerformanceGauges.tsx # Animated ring gauges
│   │   ├── ConcessionStandsViz.tsx # Queue flow animation
│   │   ├── Stadium3D.tsx         # Three.js 3D stadium
│   │   ├── Heatmap.tsx           # Static heatmap
│   │   ├── InteractiveHeatmap.tsx
│   │   ├── DistributionChart.tsx # Monte Carlo distributions
│   │   └── StaffingTimeline.tsx
│   ├── ui/                       # Design system primitives
│   │   ├── glass.tsx             # GlassCard, GlassButton, Control, Toggle
│   │   ├── hud.tsx               # StatBar with animated fills
│   │   └── data-badge.tsx        # Metric source badges
│   ├── cinematic/                # 3D backdrop
│   │   ├── CinematicCanvas.tsx
│   │   ├── CursorHUD.tsx
│   │   ├── QualityToggle.tsx
│   │   └── Telemetry.tsx
│   ├── NavBar.tsx
│   ├── SportSwitcher.tsx
│   ├── PresetSelector.tsx
│   ├── RecommendationsPanel.tsx
│   └── ...
│
├── hooks/
│   ├── useKeyboardShortcuts.ts   # Global hotkeys
│   └── useUndoRedo.ts            # Undo/redo state machine
│
└── lib/
    ├── api.ts                    # API client (fetch wrappers)
    ├── cn.ts                     # tailwind-merge utility
    ├── sports.ts                 # Sport config, presets, ranges
    └── scenarioUrl.ts            # URL-based scenario sharing
```

## Design System

Dark glassmorphic theme with Ohio State scarlet accent:

- **Background**: `hsl(220 18% 7%)` to `hsl(224 16% 10%)` gradients
- **Card borders**: `border-white/[0.06]`
- **Accent (scarlet)**: `hsl(354 78% 55%)` for rivalry games, sellout badges, student sections
- **Accent (amber)**: `#f59e0b` for high-stakes games
- **Text hierarchy**: white/90 (primary), white/60 (secondary), white/30 (tertiary)

### Glass Components (`ui/glass.tsx`)

- `GlassCard` -- bordered card with gradient background
- `GlassButton` -- button with primary/default variants
- `GlassSectionTitle` -- section header with subtitle
- `Control` -- labeled slider with value display and format function
- `Toggle` -- animated switch with spring physics
- `Chip` -- small label badge

### HUD Components (`ui/hud.tsx`)

- `StatBar` -- horizontal stat bar with animated fill, gradient accent, and tone variants (scarlet/neutral/good/bad)

## API Proxy

All backend calls go through the Next.js catch-all route at `app/api/[...path]/route.ts`, which forwards to `BACKEND_URL` (defaults to `http://localhost:8000`). This avoids CORS issues and works in both local dev and Docker.

## Key Patterns

- **React Query** for all server state with automatic caching and deduplication
- **Sport scoping** via `?sport=` query parameter, filtered through `getSportScope()`
- **Undo/redo** on game simulator sliders via `useUndoRedo` hook (Ctrl+Z / Ctrl+Shift+Z)
- **Framer Motion** for page transitions, staggered card reveals, and layout animations

## Build

```bash
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```
