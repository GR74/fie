# Integration Roadmap

Tracks completed milestones and planned extensions for the Fan Impact Engine. Rooted in advisor feedback emphasizing **small iterative bites**, **research grounding** (McMahon & Quintanar 2024), **multi-sport applicability**, and **non-profit-maximizing objectives**.

## Completed

### Phase 1: Foundation

- [x] **Multi-venue configuration** -- `venues.json` with 8 venues (Ohio Stadium, Schott, Covelli, Bill Davis, Jesse Owens, Huntington Park, Nationwide Arena, Historic Crew Stadium)
- [x] **Seats open % lever** -- partial venue configurations (e.g., lower bowl only at Schott)
- [x] **Multi-sport support** -- football, basketball, hockey, volleyball, baseball, soccer with sport-specific slider ranges and venue defaults
- [x] **Sport presets** -- `presets.json` with college_football, college_basketball, professional_hockey, etc.
- [x] **Professional sport mode** -- hides student ratio controls for pro teams, adjusts attendance ranges

### Phase 2: Models & Research

- [x] **SOTA v2 HFA model** -- logistic regression on logit scale with quadratic fill, Elo rank compression, interaction terms (Bryson 2021, McMahon 2024, Moskowitz 2011)
- [x] **Physics-based noise model** -- logarithmic crowd noise with student density amplification, enclosure bonus, cold-weather propagation, coordinated chant detection
- [x] **Queue-theoretic concessions** -- M/M/s Erlang-C wait times, three service windows (pre-game/halftime/Q3+), abandonment revenue loss, granular weather elasticity
- [x] **Monte Carlo simulation** -- 500-iteration uncertainty quantification with configurable parameter variation
- [x] **Sensitivity surfaces** -- 2D parameter sweep (attendance x student ratio) with win probability heatmap
- [x] **Calibration & backtesting** -- reliability diagram, prediction-vs-actual, model diagnostics

### Phase 3: Live Data

- [x] **ESPN API integration** -- real-time schedules, rankings, team records, attendance
- [x] **Weather API integration** -- Open-Meteo forecasts with NOAA 1991-2020 climate normals fallback
- [x] **Data provenance** -- badges showing live/cached/baseline source for every metric
- [x] **Enriched game endpoint** -- `/games/{id}/enriched` combining static + ESPN + weather data

### Phase 4: Frontend

- [x] **Game day simulator** -- interactive controls with instant simulation feedback
- [x] **Engine deep-dive** -- sensitivity charts, contribution breakdowns, optimization
- [x] **Print-optimized report** -- PDF-ready engine report with recommendations
- [x] **Stadium fill visualization** -- SVG arc-based top-down stadium rendering (football horseshoe, basketball arena, baseball diamond, soccer pitch, volleyball court) with hover tooltips and section-level fill
- [x] **Performance gauges** -- animated ring gauges for win prob, noise, energy, ops utilization
- [x] **Concessions visualization** -- animated queue flow with utilization color-coding
- [x] **Glass design system** -- dark glassmorphic UI with scarlet accent, Framer Motion animations
- [x] **Scenario management** -- save, load, compare, and delete scenarios
- [x] **Sport switcher** -- global sport filter affecting all pages
- [x] **3D cinematic mode** -- Three.js stadium backdrop (optional)

## In Progress

### Phase 5: Decision Intelligence

- [x] **Objective modes** -- profit / fan_growth / mission toggle on optimizer
  - Profit: maximize concession revenue and ops efficiency
  - Fan growth: maximize attendance and student ratio
  - Mission: maximize student ratio, crowd energy, and "experience" score
  - Implemented in `backend/src/optimizer.py` (_score_candidate) and game page Optimize tab.
- [x] **Venue comparison view** -- same game simulated at two venues side-by-side (Covelli vs Schott)
  - Route: `/games/{id}/compare-venues`. Renders when game has `alternate_venue_id`.
- [x] **Opponent scouting integration** -- auto-pull opponent records and recent form from ESPN
  - Enriched endpoint and ESPN schedule now include `live_opponent_record`, `live_home_record`, `live_result` when ESPN match found.

### Phase 6: Advanced Analytics

- [ ] **Causal inference** -- instrumental variable strategy using weather shocks and COVID-era natural experiments
- [ ] **Temporal modeling** -- week-to-week momentum and carryover effects
- [ ] **Score-state noise model** -- real-time dB prediction based on current score differential and game clock
- [ ] **Player-level effects** -- star player presence impact on attendance and energy

### Phase 7: Platform

- [ ] **Authentication** -- user accounts for saved scenarios and preferences
- [ ] **Multi-institution** -- support for multiple schools/organizations
- [ ] **PostgreSQL** -- replace JSON file store with persistent database
- [ ] **Webhook notifications** -- alerts for weather changes or ranking updates before game day
- [ ] **Mobile-optimized UI** -- responsive design for sideline/press box use

### Phase 8: Research & Publication

- [ ] **Real data integration** -- replace mock baselines with actual OSU attendance, scores, and weather from 2015-2025
- [ ] **Field experiments** -- A/B tests on student promotions, kickoff times, or themed games with athletic department
- [ ] **Academic paper** -- "Quantifying the Marginal Impact of Fan Composition on Home-Field Advantage" with published data and replication code
- [ ] **Conference presentation** -- target SABR, Sloan Sports Analytics, or sports economics venues

## Research Foundation

### McMahon & Quintanar (2024)

*"Separately measuring home-field advantage for offenses and defenses: A panel-data study of constituent channels within collegiate American football."* Southern Economic Journal 90(4), 1060-1098.

Key findings directly integrated into the engine:

| Finding | Engine Feature |
|---------|---------------|
| Crowd size hurts away offense (~1 pt / 38,875 fans) | `predict_hfa()` fill coefficient |
| Empty seats hurt home team (~1 pt / 21,211 empty) | `seats_open_pct` lever |
| Effect disappears without fans (COVID 2020) | Validates noise as causal channel |
| Weather (wind, temp, precip) affects scoring | Weather levers + indoor zero-wind logic |
| Travel distance fatigues away defense | Future: `opponent_travel_miles` |
| Stadium familiarity helps home offense | Future: `team_stadium_familiarity` |
| Overall HFA ~4.1 points at median values | Calibration target |

### Additional Sources

| Citation | Contribution |
|----------|-------------|
| Bryson et al. (2021) | Geisterspiele natural experiments: quadratic fill premium, sellout effects |
| Moskowitz & Wertheim (2011) | Referee bias as HFA mechanism, student section 1.5-2.5x noise ratio |
| Snyder & Lopez (2015) | 15% increase in visiting pre-snap penalties per 5 dB noise |
| Garicano et al. (2005) | Social pressure on referee decision-making |
| Wunderlich et al. (2021) | COVID empty stadiums reduced visiting team false starts 30-40% |
| NASC / Technomic (2023) | Halftime arrival %, queue abandonment thresholds |
