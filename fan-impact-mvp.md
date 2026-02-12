# Fan Impact Engine -- Original MVP Specification (Archived)

> **Note:** This document is the original MVP planning spec from January 2025. The project has since evolved significantly beyond the initial scope. For current documentation, see:
>
> - **[README.md](./README.md)** -- Quick start, features, API reference
> - **[ARCHITECTURE.md](./ARCHITECTURE.md)** -- Technical specification, model coefficients, system design
> - **[INTEGRATION_ROADMAP.md](./INTEGRATION_ROADMAP.md)** -- Completed milestones and planned extensions

## Original Goal

Build an MVP that quantifies the marginal impact of fan attendance and composition on home-field advantage (win probability delta) for a single sport at a single institution over one season.

## What Was Built (vs. Original Plan)

| Original Plan | What Was Actually Built |
|--------------|------------------------|
| Single sport (football) | 7 sports: football, basketball (M/W), hockey, volleyball, baseball, soccer |
| Single venue (Ohio Stadium) | 8 venues with full concessions configs |
| Streamlit frontend | Next.js 16 + React 19 with glassmorphic design system |
| Pickle-serialized sklearn models | Research-calibrated SOTA v2 models (logistic HFA, physics noise, queue theory) |
| 10 mock games | 20+ games across all sports with real venues |
| No live data | ESPN API + Weather API with data provenance |
| Basic bar charts | SVG stadium viz, animated gauges, interactive heatmaps, 3D Three.js |
| No scenario management | Full CRUD scenario save/load/compare |
| No optimization | Multi-lever optimizer with ranked alternatives |
| No uncertainty | 500-iteration Monte Carlo with distribution charts |
| No calibration | Backtesting dashboard with reliability diagrams |

## Prior Work

**McMahon & Quintanar (2024).** *"Separately measuring home-field advantage for offenses and defenses: A panel-data study of constituent channels within collegiate American football."* Southern Economic Journal, 90(4), 1060-1098.

Key findings that shaped the engine:

- Crowd size hurts away-team scores (~1 pt per 38,875 fans)
- Empty seats hurt home team (~1 pt per 21,211 empty seats)
- Effect disappears in COVID 2020 -- noise is the causal channel
- Weather (wind, temp, precip) affects scoring
- Overall HFA ~4.1 points at median values

Additional research integrated in SOTA v2:

- Bryson, Dolton, Reade, Schreyer (2021) -- Geisterspiele natural experiments, sellout premium
- Moskowitz & Wertheim (2011) -- Scorecasting, referee bias, student section noise
- Snyder & Lopez (2015) -- Crowd noise and pre-snap penalty rates
- Garicano, Palacios-Huerta, Prendergast (2005) -- Social pressure on officials
- Wunderlich et al. (2021) -- COVID empty stadium false start reduction
- Technomic / NASC (2023) -- Queue abandonment thresholds, halftime arrival patterns

## Original Data Schema

The original spec defined a `games` table with fields like `home_score`, `away_score`, `student_count`, `days_rest_home`, etc. The current implementation uses a simplified schema focused on simulation inputs rather than historical outcomes. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the current data model.

## Original Model Formulas

### Attendance Demand (OLS)

```
log(attendance) = B0 + B1*opponent_rank + B2*rivalry_flag + B3*promotion_flag
                + B4*weather_temp + B5*kickoff_evening + B6*days_rest + e
```

*Status: Not implemented as a standalone model. Attendance is a user-controlled lever in the simulator.*

### HFA Win Probability (Logistic)

```
logit(P(home_win)) = B0 + B1*log(attendance) + B2*student_ratio
                   + B3*rivalry + B4*opponent_rank + B5*home_rank + B6*wind + e
```

*Status: Evolved into SOTA v2 with 13 coefficients including quadratic fill, interaction terms, and Elo compression. See [ARCHITECTURE.md](./ARCHITECTURE.md#1-hfa-win-probability).*

### Revenue (Linear)

```
revenue_per_capita = B0 + B1*student_ratio + B2*promotion + B3*fill_pct + B4*opponent_rank + e
```

*Status: Evolved into queue-theoretic concessions model with M/M/s Erlang-C wait times, three service windows, and abandonment-driven revenue loss. See [ARCHITECTURE.md](./ARCHITECTURE.md#3-concessions-revenue--operations).*

---

*Last updated: January 26, 2025 (original). Archived February 2026.*
