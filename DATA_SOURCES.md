# Fan Impact Engine — Data Sources

This document lists **every data source** used in FIE, whether it is **official** (primary/government/institution) or **third-party**, and where it is used. All official sources are cited for reliability.

---

## Official sources (100% reliable, primary)

### 1. National Weather Service (NWS) / NOAA — Forecasts

| Field | Description | Where used |
|-------|-------------|------------|
| **API** | `https://api.weather.gov` (National Weather Service, U.S. Department of Commerce / NOAA) | `backend/src/weather_api.py` |
| **Data** | 7-day forecast for Columbus, OH (temp, wind, conditions) | Primary source for `get_forecast_weather()` when game is 0-7 days ahead |
| **Reliability** | Official U.S. government API. No key required. User-Agent required per NWS policy. | |

**Reference:** [NWS API Documentation](https://www.weather.gov/documentation/services-web-api), [api.weather.gov](https://api.weather.gov/).

---

### 2. NOAA / NWS — Climate normals (historical)

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | NOAA/NWS Columbus OH (CMH) 1991–2020 climate normals | `backend/src/weather_api.py` — `COLUMBUS_NORMALS` |
| **Data** | Monthly averages: high/low temp (°F), wind (mph), precip days, precip chance | Fallback when forecast not available (e.g. game > 7 days out) or when NWS/Open-Meteo fail |
| **Reliability** | Official climatology; values derived from NWS/NOAA normals. | |

**Reference:** NOAA Climate Normals (1991–2020), NWS Columbus.

---

### 3. NCAA — Attendance and schedule context

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | NCAA published statistics (e.g. announced attendance, rankings) | `backend/data/games.json` — `_attendance_source`, `_source` on game objects |
| **Data** | Baseline attendance figures where marked "REAL: … (NCAA)" (e.g. OSU 2024 avg 104,944). Schedule/stakes context. | Static game baselines; no live NCAA API (NCAA does not provide a public API). |
| **Reliability** | Official where cited; numbers manually sourced from NCAA reports. | |

**Reference:** NCAA.org statistics and official reports; individual game `_attendance_source` and `_source` in `games.json`.

---

### 4. NWS — Weather context in game baselines

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | NWS climatology / Columbus OH norms | `backend/data/games.json` — `_weather_source` on game objects |
| **Data** | Monthly averages (e.g. "Columbus late-November avg high 42°F, wind 10–13 mph") used to set `baseline_weather_*` | Static baselines for simulator |
| **Reliability** | Official NWS data. | |

**Reference:** NWS climate data for Columbus, OH; per-game `_weather_source` in `games.json`.

---

### 5. Ohio State Athletics / Venue operators — Venue capacities and metadata

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | OSU Athletics; official venue operators (e.g. Columbus Crew, Blue Jackets, Clippers) | `backend/data/venues.json` — `_data_sources`, capacities, names |
| **Data** | Ohio Stadium 102,780; Schott 18,809; Covelli 3,393; Bill Davis 4,450; Jesse Owens 9,600; Huntington Park 10,100; Nationwide 18,500; Historic Crew Stadium 20,145 | All venue lookups, capacity checks, simulator |
| **Reliability** | Official capacities and venue names from institution/operators. | |

**Reference:** OSU Athletics official figures; `venues.json` `_data_sources` object.

---

### 6. Big Ten — Schedule and opponent context

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | Big Ten Conference (schedule and opponent confirmation) | `backend/data/games.json` — `_source` (e.g. "2025 OSU football schedule (confirmed opponents via Big Ten)") |
| **Data** | Which opponents are on the schedule; dates/patterns | Static game list and baselines |
| **Reliability** | Official conference source for schedule context. | |

**Reference:** Big Ten Conference; game `_source` fields in `games.json`.

---

## Third-party sources (reliable, not primary/official)

### 7. ESPN public API — Live schedules, rankings, attendance, records

| Field | Description | Where used |
|-------|-------------|------------|
| **API** | `https://site.api.espn.com/apis/site/v2/sports/...` (ESPN public, no key) | `backend/src/espn_api.py` |
| **Data** | Schedules, AP/Coaches rankings, live attendance, scores, broadcast, team records (e.g. "10-2") | `/games/{id}/enriched`, `/live/schedule`, `/live/rankings`, `/live/team`; frontend badges and live metrics |
| **Reliability** | Widely used; data is editorial/operational. Not NCAA or school-official. | |

**Reference:** ESPN public API (site.api.espn.com). Used for live enrichment and opponent scouting only; baselines remain NCAA/OSU where cited.

---

### 8. Open-Meteo — Weather forecast fallback

| Field | Description | Where used |
|-------|-------------|------------|
| **API** | `https://api.open-meteo.com` (free, no key) | `backend/src/weather_api.py` — `_fetch_open_meteo_forecast()` |
| **Data** | Hourly forecast up to 16 days (temp, wind, precip probability, WMO codes) | Used when NWS forecast not available (e.g. game 8–16 days out) |
| **Reliability** | Third-party; used only as fallback after NWS. | |

**Reference:** [Open-Meteo](https://open-meteo.com/). Documented in `weather_api.py` as fallback.

---

## Model and research-based (no direct “data source” API)

### 9. Crowd decibel level (dB) — Model output, not live data

The **crowd decibel level** shown in the UI (e.g. "Loudness" on the game page and KPI cards) is **not** from a live microphone or external API. It is **computed** by the engine from your inputs.

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | `backend/src/mock_model.py` — `predict_loudness_db()`. Physics-based formula (logarithmic scaling, 3 dB per doubling of crowd). | All simulate, optimize, Monte Carlo; "Loudness" KPI and gauges |
| **Inputs** | Attendance, venue capacity (fill), student ratio, crowd energy, rivalry, kickoff time, indoor/outdoor, temperature | Same as simulator levers |
| **Calibration** | Moskowitz & Wertheim (2011): student noise 1.5–2.5× general. Husky Stadium 133.6 dB (2013), Arrowhead 142.2 dB (2014). Ohio Stadium 110–115 dB (estimated). | Docstrings in `mock_model.py` |
| **Reliability** | Deterministic model output; no live dB feed. Use for relative comparison only. | |

**Reference:** `ARCHITECTURE.md` (Crowd Noise), `mock_model.py` (`predict_loudness_db`).

---

### 10. HFA / noise / concessions models — Research and benchmarks

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | Published research and industry benchmarks (McMahon & Quintanar 2024, Bryson et al. 2021, Moskowitz & Wertheim 2011, NASC/Technomic, etc.) | `backend/src/mock_model.py` |
| **Data** | Coefficients and formulas for win probability, crowd noise (dB), concessions revenue and queue theory | All simulate, optimize, Monte Carlo, sensitivity endpoints |
| **Reliability** | Transparent, citation-based; model is deterministic “mock” (not trained on FIE outcome data). | |

**Reference:** `ARCHITECTURE.md`, `INTEGRATION_ROADMAP.md` (Research Foundation), and docstrings in `mock_model.py`.

---

### 11. Venue concessions parameters — Industry benchmarks

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | NASC, ALSD, Levy Restaurants, arena/minor-league benchmarks | `backend/data/venues.json` — `concessions` (service rates, express boost, stands) |
| **Data** | Stands counts, default staffing, service rate (customers/staff/min), express-lane boost | Concessions simulation in `mock_model.simulate_concessions()` |
| **Reliability** | Industry benchmarks; cited in `venues.json` (e.g. `_source_service_rate`, `_source_express_boost`). | |

**Reference:** NASC/Technomic (2023); Levy “Express Eats”; per-venue `_source_*` in `venues.json`.

---

### 12. Calibration — Synthetic (mock) until real outcomes

| Field | Description | Where used |
|-------|-------------|------------|
| **Source** | Generated scenarios (no historical game outcomes) | `backend/src/calibration.py` — `generate_mock_calibration_points()` |
| **Data** | Random but plausible (attendance, student ratio, weather, etc.) run through HFA model; binary outcome sampled from predicted prob | `/calibration/hfa` and calibration UI |
| **Reliability** | For model diagnostics only; not real outcome data. Documented in code. | |

**Reference:** `backend/src/calibration.py`; Phase 8 in `INTEGRATION_ROADMAP.md` (real data integration).

---

## Summary table

| # | Source | Type | Used for |
|---|--------|------|----------|
| 1 | NWS api.weather.gov | **Official** | 7-day weather forecast (primary) |
| 2 | NOAA/NWS 1991–2020 normals | **Official** | Columbus OH climate fallback |
| 3 | NCAA (published) | **Official** | Baseline attendance where cited in games.json |
| 4 | NWS climatology | **Official** | Game baseline weather in games.json |
| 5 | OSU Athletics / venue operators | **Official** | Venue capacities and names (venues.json) |
| 6 | Big Ten | **Official** | Schedule/opponent context (games.json) |
| 7 | ESPN public API | Third-party | Live schedule, rankings, attendance, opponent record |
| 8 | Open-Meteo | Third-party | Weather forecast fallback (8–16 days) |
| 9 | Crowd decibel (dB) | **Model output** | Physics-based formula; calibrated to Husky/Arrowhead/MW11 (see §9). Not live data. |
| 10 | Research (MQ24, BCS21, etc.) | Research | HFA, noise, concessions model coefficients |
| 11 | NASC / Levy / industry | Benchmarks | Concessions service rates and venue ops |
| 12 | Synthetic calibration | Mock | Calibration UX until historical outcomes exist |

---

## Where each piece of data is implemented

- **Weather (official first):** `backend/src/weather_api.py` — NWS first, then Open-Meteo, then NOAA normals.
- **ESPN (third-party):** `backend/src/espn_api.py`; consumed by `app/main.py` (`/games/{id}/enriched`, `/live/*`).
- **Games baselines:** `backend/data/games.json` (with `_source`, `_attendance_source`, `_weather_source`).
- **Venues:** `backend/data/venues.json` (with `_data_sources`, `_source_*` in concessions).
- **Models:** `backend/src/mock_model.py` (HFA, noise, concessions); research refs in `ARCHITECTURE.md` and `INTEGRATION_ROADMAP.md`.
- **Calibration:** `backend/src/calibration.py`; explicitly mock until real outcomes are integrated.

All official sources above are primary (government, NCAA, conference, or institution). Third-party sources (ESPN, Open-Meteo) are used for live enrichment or fallback only and are clearly separated in code and in this document.

---

## Data level, trust, and NIL

**What level of data is driving the project?**  
A mix. **Official** data: NWS weather, NOAA normals, NCAA-published attendance where cited, OSU/venue capacities, Big Ten schedule context. **Third-party**: ESPN (schedules, rankings, records) for live enrichment. **Model/research**: win probability, crowd dB, and concessions use published research and industry benchmarks; they are not trained on FIE outcome data. Calibration is synthetic until real historical outcomes are integrated (see Phase 8 in INTEGRATION_ROADMAP).

**Can we trust data schools have held for years?**  
When we use it, we use only what is already public or shared (e.g. NCAA stats, official capacities). We do not ingest proprietary internal datasets. Where baselines come from school or NCAA figures, we cite them (e.g. `_attendance_source`, `_source` in games.json) so you can see the provenance. For higher-stakes decisions, the roadmap plans real data integration and field validation.

**Could NIL impact historical data used here?**  
Yes. NIL has changed roster quality, recruiting, and fan interest. Historical attendance and win rates from pre-NIL years may not transfer cleanly to post-NIL seasons. FIE does not yet use historical outcome data for model training; when it does (Phase 8), we should treat pre- vs post-NIL as different regimes (e.g. separate calibration or time-period dummies) so NIL does not distort the estimates.
