# Fan Impact Engine

A sports analytics platform that quantifies how fan attendance, composition, and game-day operations drive home-field advantage. Built for athletic directors, operations staff, and sports economists.

The engine combines **SOTA research-backed models** (HFA win probability, physics-based crowd noise, queue-theoretic concessions) with **live ESPN + weather data** and an interactive what-if simulator across multiple sports and venues.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+

### Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

### Docker (alternative)

```bash
docker compose up
```

Both services start automatically at `localhost:3000` (frontend) and `localhost:8000` (backend).

## What It Does

### Game Day Simulator

Pick any game on the schedule, adjust operational levers, and instantly see the impact:

| Lever | Description |
|-------|-------------|
| Attendance | Total fans in the venue |
| Student ratio | % of crowd in student sections |
| Crowd energy | Baseline crowd enthusiasm (0-100) |
| Stands open % | Concession stands operating |
| Staff per stand | Workers per concession window |
| Express lanes | Fast-service checkout lanes |
| Early arrival promo | Pre-game arrival incentive |
| Seats open % | Partial venue configurations |

### Output Metrics

- **Win probability** -- logistic HFA model on the logit scale with Elo-inspired rank compression, quadratic fill premium, and interaction terms
- **Crowd noise (dB)** -- physics-correct logarithmic scaling with student density amplification, enclosure bonus, and cold-weather propagation
- **Concessions revenue** -- per-capita spend modeling with M/M/s queue theory, Erlang-C wait times, and abandonment-driven revenue loss
- **Ops utilization** -- staff utilization, wait time windows across pre-game/halftime/Q3+, worst-case bottleneck identification

### Multi-Sport Support

| Sport | Venues | Features |
|-------|--------|----------|
| Football | Ohio Stadium (102,780) | Horseshoe acoustics, weather effects, student Block O |
| Men's Basketball | Value City Arena (19,500) | Indoor enclosed, no weather, pro attendance mode |
| Women's Basketball | Value City Arena | Same venue, different baseline attendance |
| Hockey | Value City Arena | Ice hockey presets |
| Volleyball | Covelli Center (5,800) | Compact arena, high energy density |
| Baseball | Bill Davis Stadium (4,450) | Diamond park, outdoor weather |
| Soccer | Jesse Owens Memorial (10,000) | Rectangular pitch |
| Professional | Nationwide Arena, Huntington Park | Pro league presets, no student ratio |

### Live Data Enrichment

- **ESPN API** -- real-time schedules, AP/Coaches rankings, team records, scores
- **Weather API** -- Open-Meteo forecasts with NOAA 1991-2020 climate normals fallback
- **Data provenance badges** -- every metric shows whether it's live, cached, or baseline

## Architecture

```
ari_sports/
├── backend/
│   ├── app/main.py              # FastAPI application (25+ endpoints)
│   ├── src/
│   │   ├── mock_model.py        # SOTA v2 HFA, noise, concessions models
│   │   ├── monte_carlo.py       # Uncertainty quantification (500 sims)
│   │   ├── optimizer.py         # Multi-lever game optimization
│   │   ├── sensitivity.py       # 2D parameter sweep surfaces
│   │   ├── calibration.py       # Model backtesting & reliability
│   │   ├── espn_api.py          # ESPN live data integration
│   │   ├── weather_api.py       # Weather forecast + normals
│   │   ├── scenario_store.py    # Saved scenario CRUD
│   │   ├── schemas.py           # Pydantic models
│   │   └── storage.py           # Game/venue data loading
│   └── data/
│       ├── games.json           # Multi-sport schedule (20+ games)
│       ├── venues.json          # 8 venue configurations
│       ├── concessions_menu.json
│       └── presets.json         # Sport/league presets
│
├── frontend/
│   ├── src/app/                 # Next.js 16 App Router
│   │   ├── dashboard/           # Sport-wide dashboard
│   │   ├── games/               # Games list
│   │   ├── games/[id]/          # Game simulator (hero page)
│   │   ├── games/[id]/engine/   # Engine deep-dive
│   │   ├── games/[id]/live/     # Live ESPN enrichment
│   │   ├── games/[id]/sensitivity/
│   │   ├── scenario/            # Global scenario lab
│   │   ├── scenarios/           # Saved scenarios
│   │   ├── compare/             # Side-by-side comparison
│   │   └── calibration/         # Model backtesting view
│   ├── src/components/
│   │   ├── viz/                 # StadiumFillViz, PerformanceGauges,
│   │   │                        # ConcessionStandsViz, Heatmap, etc.
│   │   ├── ui/                  # Glass design system, HUD overlays
│   │   └── cinematic/           # Three.js 3D stadium canvas
│   └── src/lib/                 # API client, sport config, utilities
│
└── docker-compose.yml
```

## API Reference

### Core Simulation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/games/{id}/simulate` | Full simulation (HFA + noise + concessions + assumptions) |
| `POST` | `/games/{id}/optimize` | Find best lever combination |
| `POST` | `/games/{id}/monte-carlo` | 500-iteration uncertainty quantification |
| `GET`  | `/games/{id}/sensitivity` | 2D parameter sweep surface |

### Game Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/games` | All games with sport filtering |
| `GET` | `/games/{id}` | Single game detail |
| `GET` | `/games/{id}/enriched` | Game + live ESPN + weather + provenance |

### Global Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict/hfa` | Standalone HFA prediction |
| `POST` | `/simulate/what-if` | Baseline vs counterfactual comparison |
| `POST` | `/recommendations` | Ranked lever suggestions with impact deltas |

### Live Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/live/schedule/{sport}` | ESPN schedule |
| `GET` | `/live/rankings/{sport}` | AP/Coaches rankings |
| `GET` | `/live/weather/{game_id}` | Forecast or climate normals |

### Scenarios & Calibration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/scenarios` | List / save scenarios |
| `GET/DELETE` | `/scenarios/{id}` | Retrieve / delete scenario |
| `GET` | `/calibration/hfa` | Model backtesting report |
| `GET` | `/health` | Service health check |

## Models (SOTA v2)

All models are research-calibrated with cited coefficients. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for full technical specification.

### HFA Win Probability

Logistic regression on the logit scale with:
- Quadratic fill term for sellout premium (Bryson, Dolton, Reade, Schreyer 2021)
- Fill x energy and fill x rivalry interaction terms
- Elo-inspired tanh rank compression (FiveThirtyEight methodology)
- Indoor venue enclosure bonus
- Hierarchical uncertainty with energy component

### Crowd Noise (dB)

Physics-correct logarithmic scaling:
- `fill_db = 15.0 * (log2(1 + fill*7) / log2(8))` -- proper doubling law
- Student density amplification +3.5 dB (Moskowitz & Wertheim 2011)
- Enclosed stadium reflection bonus +4.0 dB
- Coordinated chant bonus at high energy
- Cold-weather sound propagation correction

### Concessions Revenue & Operations

Queue-theoretic modeling:
- M/M/s Erlang-C wait times per service window
- Arrival rate modeled across pre-game (18%), halftime (22%), Q3+ (60%) windows
- Queue abandonment revenue loss: `loss = min(25%, (wait - 12min) * 1.5%/min)`
- Granular weather elasticity (cold/hot demand shifts)
- Express lane service rate boost

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Home -- sport selector landing |
| `/dashboard` | Sport-wide stats, featured game, insights |
| `/games` | Season schedule with rivalry cards |
| `/games/{id}` | Game day simulator with live controls |
| `/games/{id}/engine` | Engine deep-dive with sensitivity charts |
| `/games/{id}/engine-report` | Print-optimized PDF report |
| `/games/{id}/live` | Live ESPN + weather enrichment |
| `/games/{id}/sensitivity` | 2D heatmap sensitivity surface |
| `/scenario` | Global scenario lab (no specific game) |
| `/scenarios` | Saved scenarios list |
| `/compare` | Side-by-side scenario comparison |
| `/calibration` | Model backtesting dashboard |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, Pydantic 2, Uvicorn |
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, Framer Motion 12 |
| Charts | Recharts 3, Three.js 0.182, React Three Fiber |
| Data fetching | TanStack React Query 5 |
| Deployment | Docker Compose |

## Research References

- McMahon & Quintanar (2024). "Channels of Home Field Advantage." *Southern Economic Journal* 90(4).
- Bryson, Dolton, Reade, Schreyer (2021). "Experimental evidence on the effects of home advantage." Post-COVID Geisterspiele analysis.
- Moskowitz & Wertheim (2011). *Scorecasting.* Referee bias, student section noise amplification.
- Hass & Anagnostopoulos (2010). Elo rating compression methodology.
- Technomic (2023). NASC queue abandonment and halftime arrival research.

## License

Private repository. All rights reserved.
