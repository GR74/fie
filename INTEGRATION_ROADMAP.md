# Integration Roadmap: Email Feedback → Fan Impact Engine

This document maps feedback from your advisor/contact into concrete integration opportunities for the Fan Impact Engine. The email emphasized: **narrow scope into small bites**, **reference prior work** (attached article), **smaller sports**, **venue decisions**, and **non–profit-maximizing objectives** (university mission, fan-base building).

---

## 1. Small Bites: Phased Extensions

Break the roadmap into small, shippable increments instead of one large expansion.

| Phase | Scope | Effort | Delivered Value |
|-------|--------|--------|------------------|
| **1a** | Add `venue_id` + multi-venue config | 1–2 days | Foundation for Covelli vs Schott |
| **1b** | Add "seats open %" lever (Schott partial vs full) | 0.5 day | Directly addresses "open all seats?" decision |
| **2a** | Add 1–2 non-football sports (e.g., basketball, hockey) | 2–3 days | Demonstrates multi-sport applicability |
| **2b** | Venue selector: Covelli vs Schott for same event | 1–2 days | "Where to host?" decision support |
| **3** | Objective mode: Profit vs Fan Growth vs Mission | 2–3 days | Non–profit-maximizing use cases |
| **4** | Minor-league / start-up league presets | 1 day | Fury, Aviators, Clippers, Wizards context |

---

## 2. Prior Work & Article: McMahon & Quintanar (2024)

**Citation:** McMahon, M. J., & Quintanar, S. M. (2024). Separately measuring home-field advantage for offenses and defenses: A panel-data study of constituent channels within collegiate American football. *Southern Economic Journal*, 90(4), 1060–1098. DOI: [10.1002/soej.12682](https://doi.org/10.1002/soej.12682)

**Authors:** Matthew J. McMahon (West Chester University), Sarah Marx Quintanar (Midwestern State University)

**Data:** 12 seasons (2009–2020), all 131 FBS teams, includes COVID-19 2020 season. Uses cfbstats.com, collegefootballdata.com, and stadium metadata.

### Key Findings (Directly Relevant to Fan Impact Engine)

| Factor | Finding | Engine Alignment |
|--------|---------|------------------|
| **Crowd size** | Hurts away-team scores (~1 pt per 38,875 fans); no effect on home. Effect **disappears in 2020** → driven by **noise**, not psychological presence | Your loudness model aligns; document that crowd → noise is the causal channel |
| **Stadium capacity (holding crowd constant)** | More empty seats → home team scores **fewer** points (~1 pt per 21,211 empty seats). "Caution to university administrators that expanding stadiums without considering demand could hurt team performance" | **Directly supports `seats_open_pct` lever** and "open all seats at Schott?" decision |
| **Travel** | Away-team travel → home scores more (defenses tire faster than offenses). Away's own travel doesn't hurt their offense | Consider adding `opponent_travel_miles` for neutral-site or multi-venue games |
| **Stadium familiarity** | Helps offenses; ~0.18 pts per additional game played there. Opponent familiarity doesn't matter | Could add `team_stadium_familiarity` for multi-venue scenarios (Covelli vs Schott) |
| **Team-opponent familiarity** | More familiarity → lower scores (helps defenses) | Optional lever for conference/division games |
| **Weather** | Wind, temp, precipitation matter; heat fatigues defenses more | You already have weather levers; article validates |
| **Overall HFA** | ~4.1 points at median values | Calibration target for your mock model |

### Article's Model Innovation

The article models **points scored by each team** (not point differential), allowing identification of offense vs. defense effects. Your engine outputs win probability (aggregate); the article suggests that decomposing into "home offense effect" vs "away defense effect" could be a future extension.

### References from Article (Works Cited)

The article cites: Wang et al. (2011), Fullagar et al. (2019), Jamieson, Pollard, Carmichael & Thomas, Cross & Uhrig, Fischer & Haucap, Böheim et al., Inan, Schwartz & Barsky, Ehrlich et al., Smith et al., Coates & Humphreys, Depken, and many others. See the full reference list in the PDF (Section 7 / REFERENCES).

**Action items:**
- [x] Review the attached article’s introduction and works cited
- [ ] Add a "Prior Work" subsection to `fan-impact-mvp.md` citing McMahon & Quintanar
- [ ] Search for McMahon/Quintanar online demo or replication code (e.g., GitHub, journal supplement)

---

## 3. Smaller Sports (OSU Non-Revenue)

**Context:** Ohio State sponsors many sports that don’t make money. Only 9 sports require paid tickets. Decisions include:
- **Where to host:** Covelli Center vs Schott (Value City Arena)
- **Capacity:** Open all seats at Schott vs. partial (e.g., lower bowl only)
- **Objective:** University mission (participation, student experience) ≠ profit maximization

### Data Model Extensions

```json
// Example: games.json extension for multi-sport
{
  "game_id": "indiana_bb_at_osu_2026",
  "sport": "basketball",
  "venue_name": "Value City Arena",
  "venue_id": "schott",
  "venue_capacity": 19500,
  "seats_open_pct": 100,
  "alternate_venue_id": "covelli",
  "alternate_venue_capacity": 5800
}
```

### New Levers to Support

| Lever | Description | Use Case |
|-------|-------------|----------|
| `venue_id` | Covelli vs Schott | "Where should we host this event?" |
| `seats_open_pct` | % of venue capacity to open | "Open all seats at Schott or just lower bowl?" |
| `objective_mode` | `profit` \| `fan_growth` \| `mission` | Optimize for different goals |

---

## 4. Venue Decisions: Covelli vs Schott

**Covelli Center:** ~5,800 capacity (volleyball, wrestling, etc.)  
**Value City Arena (Schott):** ~19,500 capacity (basketball, hockey)

**Decision:** Host at Covelli (intimate, sellout feel) vs Schott (more capacity, risk of empty look).

- Add `venues.json` with Covelli and Schott configs (capacity, concessions, default crowd energy)
- Extend simulate/optimize to accept `venue_id` override
- Add a simple "Venue Comparison" view: same game, Covelli vs Schott, side-by-side (attendance, revenue, atmosphere score)

---

## 5. Non–Profit-Maximizing Objectives

**University context:** ADs care about student engagement, alumni relations, and mission alignment, not just revenue.

**Minor league / start-up context (Fury, Aviators, Clippers, Wizards):** Balance **building a fan base** vs **profit maximization**.

### Objective Modes

| Mode | Primary Metric | Secondary |
|------|---------------|-----------|
| `profit` | Concession revenue, margin | Win prob, atmosphere |
| `fan_growth` | Attendance, student ratio, repeat-visit proxy | Revenue, win prob |
| `mission` | Student ratio, crowd energy, "experience" score | Revenue, win prob |

- Add `objective_mode` to optimize request
- Optimizer returns ranked candidates by the selected objective
- UI: Toggle "Optimize for: Profit | Fan Growth | Mission"

---

## 6. Minor League / Start-Up Leagues

**Examples:** Columbus Fury (volleyball), Columbus Aviators (lacrosse?), Columbus Clippers (baseball), Columbus Wizards (?)

**Characteristics:**
- Lower capacity venues
- Fan-base building > short-term profit
- Promotions, family bundles, community events matter more

- Add a "League Preset" or "Organization Type": `college_football` | `college_other` | `minor_league` | `startup_league`
- Presets adjust default levers and objective weights (e.g., startup_league → fan_growth by default)
- Optional: Add 1–2 sample games for a minor-league venue (e.g., Clippers at Huntington Park)

---

## 7. Suggested First Steps (Smallest Bites)

1. **Add `seats_open_pct`** – You already have `stands_open_pct` for concessions; extend to venue capacity. "Open 50% of Schott" = 9,750 effective capacity.
2. **Add `venues.json`** – Define Covelli and Schott; keep Ohio Stadium. Games reference `venue_id`.
3. **Add 1 basketball game** – One Schott game in `games.json` to prove multi-sport.
4. **Add `objective_mode` to optimizer** – Start with `profit` (current) and `fan_growth` (max attendance + student ratio).

---

## 8. References

- **McMahon & Quintanar (2024)** – See Section 2 above for full citation and key findings.
- **Prior work:** Wang et al. (2011), Fullagar et al. (2019), Jamieson, Pollard, Carmichael & Thomas, Cross & Uhrig, Fischer & Haucap, and others (full list in article PDF).
- **Online tool:** Not yet located; consider contacting authors (matthew.mcmahon21@gmail.com) for replication code or demo.

---

**Last updated:** January 27, 2025
