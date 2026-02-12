# Architecture & Technical Specification

Detailed technical documentation for the Fan Impact Engine. For quick start and overview, see [`README.md`](./README.md).

## System Design

```
┌─────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                               │
│  Next.js 16 App Router + React 19                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │  /api/[...path] proxy → http://localhost:8000       ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP/JSON
┌──────────────────────────▼──────────────────────────────┐
│  FastAPI Backend (localhost:8000)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Simulate │ │ Optimize │ │ Monte    │ │ Sensitivity│ │
│  │ Engine   │ │ Engine   │ │ Carlo    │ │ Surface    │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       └─────────────┴────────────┴─────────────┘        │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │  mock_model.py (SOTA v2)                         │   │
│  │  predict_hfa() │ predict_loudness_db()           │   │
│  │  simulate_concessions()                          │   │
│  └──────────────────────────────────────────────────┘   │
│                      │                                   │
│  ┌──────────┐ ┌──────┴──────┐ ┌──────────────────────┐  │
│  │ ESPN API │ │ Weather API │ │ JSON Data Store      │  │
│  │ (live)   │ │ (forecast)  │ │ games/venues/presets │  │
│  └──────────┘ └─────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The frontend calls the backend exclusively through a Next.js API proxy at `/api/[...path]`, which forwards requests to `http://localhost:8000`. This avoids CORS issues and works identically in local dev and Docker.

## Data Layer

### games.json

Each game record contains:

```
game_id             string    Unique identifier (e.g., "michigan_at_osu_2026")
date                string    ISO date
home_team           string    Home team name
away_team           string    Away team name
sport               string    "football" | "mens_basketball" | "hockey" | etc.
venue_id            string    References venues.json
venue_name          string    Display name
venue_capacity      int       Effective capacity
kickoff_time_local  string    "12:00 PM" | "7:30 PM" | etc.
rivalry_flag        bool      Is this a rivalry game?
game_stakes         string    "high" | "medium" | "low"
opponent_rank       int|null  AP ranking (null = unranked)
home_team_rank      int|null  AP ranking
baseline_attendance         int      Expected attendance
baseline_student_ratio      float    Expected student %
baseline_weather_temp_f     int      Expected temperature
baseline_weather_wind_mph   int      Expected wind
baseline_weather_precip_chance int   Expected precipitation %
baseline_promotion_type     string   "none" | "student_push" | "rivalry_hype" | etc.
```

### venues.json

Each venue includes:

```
venue_id            string    Unique key
venue_name          string    Full name
nickname            string    Common name
capacity            int       Max capacity
sport               string    Primary sport
is_indoor           bool      Enclosed venue flag
concessions         object    stands_total, stands_fixed, stands_portable,
                              default_stands_open_pct, default_staff_per_stand,
                              service_rate_customers_per_staff_per_min,
                              express_lane_service_boost_pct
crowd               object    default_crowd_energy
```

### presets.json

Sport/league presets that configure slider ranges and defaults:

```
college_football    Attendance 60k-110k, student ratio 10-25%, weather enabled
college_basketball  Attendance 5k-20k, student ratio 10-25%, indoor, no weather
professional_hockey Attendance 10k-20k, no student ratio, indoor
minor_league        Attendance 2k-12k, fan growth focus
```

## Model Specification (SOTA v2)

### 1. HFA Win Probability

The model operates on the **logit scale** and converts to probability via the sigmoid function.

#### Coefficients

| Coefficient | Value | Description | Source |
|-------------|-------|-------------|--------|
| `INTERCEPT` | -0.20 | Slight away advantage at empty venue | Baseline |
| `FILL` | 1.20 | Linear fill contribution | MQ24 |
| `FILL_SQ` | 0.45 | Quadratic fill (sellout premium) | BCS21 |
| `STUDENT` | 0.60 | Student ratio effect | MQ24 |
| `RIVALRY` | 0.35 | Rivalry flag bonus | MW11 |
| `WIND` | -0.004 | Wind penalty per mph | MQ24 |
| `NIGHT` | 0.10 | Night game atmosphere bonus | Estimated |
| `PROMO` | 0.08 | Promotion boost | Estimated |
| `ENERGY` | 0.012 | Per-point crowd energy | Estimated |
| `FILL_ENERGY` | 0.25 | Fill x energy interaction | BCS21 |
| `FILL_RIVALRY` | 0.15 | Fill x rivalry interaction | MQ24 |
| `RANK_COMPRESS` | 0.85 | Elo-inspired tanh compression | FTE, HA10 |
| `ENCLOSURE` | 0.08 | Indoor venue acoustics bonus | Estimated |

#### Formula

```python
logit = INTERCEPT
      + FILL * fill + FILL_SQ * fill^2
      + STUDENT * student_ratio
      + RIVALRY * rivalry_flag
      + WIND * wind_mph * (0 if indoor)
      + NIGHT * is_night
      + PROMO * has_promotion
      + ENERGY * crowd_energy
      + FILL_ENERGY * fill * energy_norm
      + FILL_RIVALRY * fill * rivalry_flag
      + RANK_COMPRESS * tanh(rank_diff / 10)
      + ENCLOSURE * is_indoor

win_probability = sigmoid(logit) + uncertainty_noise
```

Team strength (opponent_rank vs home_team_rank) is the **dominant** predictor; HCA (fill, crowd, rivalry) is a smaller additive effect (~3–4 pp). The rank term uses `rank_edge = (opponent_rank - home_team_rank) / 20` and a coefficient ~2.0 so that when the opponent is elite (#1) and the home team is unranked (#25), home win probability is ~35–42%, not a majority. Unranked teams use rank 25 when null. The `tanh` compression avoids extreme predictions (Elo-style).

#### Uncertainty

Hierarchical noise: `N(0, 0.03 + energy_uncertainty)` where `energy_uncertainty = 0.015 * (1 - crowd_energy/100)`. Higher crowd energy = more predictable outcomes.

### 2. Crowd Noise (dB)

Physics-based logarithmic scaling following the incoherent superposition principle.

#### Coefficients

| Coefficient | Value | Description |
|-------------|-------|-------------|
| `BASE` | 88.0 | Empty venue ambient dB |
| `FILL_COEFF` | 15.0 | Fill contribution range |
| `RIVALRY` | 3.0 | Rivalry atmosphere bonus |
| `NIGHT` | 1.5 | Night game bonus |
| `ENERGY_SCALE` | 10.0 | Max crowd energy contribution |
| `STUDENT_AMP` | 3.5 | Student section density amplification |
| `ENCLOSURE` | 4.0 | Indoor sound reflection bonus |
| `COORDINATION` | 2.0 | Coordinated chant bonus (high energy) |
| `COLD_BONUS` | 0.8 | Cold air propagation bonus |

#### Formula

```python
fill_db = FILL_COEFF * (log2(1 + fill * 7) / log2(8))
energy_db = ENERGY_SCALE * ((energy / 100) ^ 1.3)
student_db = STUDENT_AMP * student_ratio * fill * (energy / 80)
enclosure_db = ENCLOSURE if is_indoor
coordination_db = COORDINATION * max(0, (energy - 70) / 30) * fill
cold_db = COLD_BONUS if temp_f < 45 and not is_indoor

projected_dB = BASE + fill_db + energy_db + student_db
             + rivalry_bonus + night_bonus
             + enclosure_db + coordination_db + cold_db
```

The `log2(1 + fill*7) / log2(8)` maps fill 0-1 to a logarithmic curve that correctly models the 3 dB per doubling acoustic law.

### 3. Concessions Revenue & Operations

#### Revenue Model

```python
base_spend = 11.50 (general) vs 7.25 (student)
per_cap = student_ratio * 7.25 + (1 - student_ratio) * 11.50

# Weather elasticity
if temp < 35:  per_cap *= 1.30   # hot drinks/food surge
if temp 45-55: per_cap *= 1.04   # moderate cold bump
if temp > 90:  per_cap *= 1.05   # cold beverages surge

# Promotion discount
if promotion != "none": per_cap *= 0.94

gross_revenue = attendance * per_cap
```

#### Queue Theory (M/M/s Erlang-C)

For each time window (pre-game 18%, halftime 22%, Q3+ 60% of attendance):

```python
arrival_rate = window_attendance / window_minutes
service_rate = staff * service_rate_per_staff * stands_open
utilization = arrival_rate / service_rate

# Erlang-C formula for P(wait > 0)
avg_wait = erlang_c_wait(arrival_rate, service_rate, servers=stands_open)
```

#### Abandonment Loss

```python
for each window:
    if avg_wait > 12 minutes:
        loss_pct = min(0.25, (avg_wait - 12) * 0.015)
        window_loss = window_revenue * loss_pct

effective_revenue = gross_revenue - total_abandonment_loss
```

## Frontend Architecture

### Design System

The UI uses a dark glassmorphic design language:

- **Background**: `linear-gradient(145deg, hsl(220 18% 7%), hsl(224 16% 10%))`
- **Cards**: `border-white/[0.06]` with subtle gradient backgrounds
- **Accent**: `hsl(354 78% 55%)` (Ohio State scarlet) for rivalry/high-impact elements
- **Animations**: Framer Motion for page transitions, layout animations, and staggered reveals

### Component Hierarchy

```
CinematicShell (optional 3D backdrop)
└── NavBar + SportSwitcher
    └── Page Content
        ├── SportHeader (title + subtitle per sport track)
        ├── Controls (glass sliders, toggles)
        ├── KPI Cards (accent variants: scarlet/positive/negative)
        ├── Visualizations
        │   ├── StadiumFillViz (SVG arc-based, multi-sport)
        │   ├── PerformanceGauges (animated ring gauges)
        │   ├── ConcessionStandsViz (queue flow animation)
        │   ├── Heatmap / InteractiveHeatmap
        │   └── DistributionChart
        └── OptimizeResultCard / RecommendationsPanel
```

### Data Flow

```
User adjusts slider
  → React state update (overrides object)
  → TanStack Query POST /games/{id}/simulate
  → Backend computes HFA + noise + concessions
  → Response cached & rendered
  → Visualizations animate to new values
```

Undo/redo is managed by `useUndoRedo` hook. Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z) are handled by `useKeyboardShortcuts`.

### Visualization Components

**StadiumFillViz**: Top-down SVG with proper arc geometry (`sectorPath` using SVG arc commands). Supports football horseshoe (open south end, 3 tiers), basketball/volleyball (full 360 enclosed), baseball (fan-shaped), and soccer (rectangular four-sided). Hover tooltips show section fill % and type.

**PerformanceGauges**: Animated ring gauges for win probability, crowd noise, energy, and ops utilization. Color-coded thresholds with animated number counters.

**ConcessionStandsViz**: Animated queue flow showing stands open/total, staff levels, utilization color-coding, wait time windows, and revenue breakdown.

## API Proxy

The Next.js frontend proxies all API calls through a catch-all route:

```typescript
// frontend/src/app/api/[...path]/route.ts
// GET/POST/PUT/DELETE → http://localhost:8000/{path}
```

This avoids CORS configuration and makes the backend URL configurable via `BACKEND_URL` environment variable (defaults to `http://localhost:8000`).

## Docker

```yaml
services:
  backend:
    image: python:3.11-slim
    volumes: ./backend:/app
    ports: 8000:8000
    command: pip install && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    image: node:20-alpine
    volumes: ./frontend:/app
    ports: 3000:3000
    environment:
      BACKEND_URL: http://backend:8000
    command: npm install && npm run dev
    depends_on: [backend]
```

## Testing

```bash
# Backend
cd backend
python -m pytest tests/

# Frontend type checking
cd frontend
npx tsc --noEmit
```

## Research Citations

| Short Key | Full Citation |
|-----------|--------------|
| MQ24 | McMahon & Quintanar (2024). "Separately measuring home-field advantage for offenses and defenses." *Southern Economic Journal* 90(4), 1060-1098. |
| BCS21 | Bryson, Dolton, Reade, Schreyer (2021). "Experimental evidence on the effects of home advantage from COVID Geisterspiele." |
| MW11 | Moskowitz & Wertheim (2011). *Scorecasting: The Hidden Influences Behind How Sports Are Played and Games Are Won.* |
| FTE | FiveThirtyEight Elo rating methodology for team strength compression. |
| HA10 | Hass & Anagnostopoulos (2010). Elo-based rank compression approach. |
| NASC23 | Technomic / NASC (2023). Stadium concessions queue abandonment and halftime arrival research. |
| SL15 | Snyder & Lopez (2015). "Revisiting the 12th Man: crowd noise and pre-snap penalties." |
| GPP05 | Garicano, Palacios-Huerta, Prendergast (2005). "Favoritism Under Social Pressure." *Review of Economics and Statistics.* |
