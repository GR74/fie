# Fan Impact Engine – MVP Technical Documentation

## 1. Project Overview

**Goal:** Build an MVP that quantifies the marginal impact of fan attendance and composition on home-field advantage (win probability delta) for a single sport at a single institution over one season.

**Scope:** Data ingestion → Model training → Scenario simulation → Minimal web dashboard for ADs/coaches.

**Timeline:** 8–12 weeks for MVP prototype.

**Tech Stack:**
- Data: Python (pandas, numpy, scikit-learn)
- Modeling: Econometric models (statsmodels) + gradient boosting (xgboost, lightgbm)
- Backend: FastAPI or Flask
- Frontend: React or Streamlit (rapid prototyping)
- Deployment: Docker + GitHub Actions

---

## 2. Data Schema & Mock Dataset

### 2.1 Core Data Model

**Table: games**

```
game_id (primary key)
date (YYYY-MM-DD)
home_team
away_team
home_score
away_score
home_win (boolean)
attendance (int)
student_count (int, subset of attendance)
nonstudent_count (int)
student_ratio (float, 0–1)
kickoff_time (HH:MM, 24-hr)
weather_temp_f (int)
weather_precip_chance (0–100)
weather_wind_mph (int)
rivalry_flag (boolean, is this a rivalry game?)
game_stakes (str: 'conference', 'non_conf', 'bowl_eligible')
opponent_rank (int or null, if ranked)
home_team_rank (int or null)
opponent_win_pct_pregame (float, 0–1)
home_win_pct_pregame (float, 0–1)
promotion_flag (boolean, any special promo?)
promotion_type (str: null, 'student_discount', 'family_bundle', 'alumni_night', 'themed_game')
kickoff_change (boolean, was there a last-minute change?)
days_rest_home (int)
days_rest_away (int)
```

### 2.2 Mock Data Example (10 games)

```json
[
  {
    "game_id": 1,
    "date": "2025-09-06",
    "home_team": "OSU_FB",
    "away_team": "Marshall",
    "home_score": 52,
    "away_score": 6,
    "home_win": true,
    "attendance": 102000,
    "student_count": 18500,
    "nonstudent_count": 83500,
    "student_ratio": 0.181,
    "kickoff_time": "12:00",
    "weather_temp_f": 78,
    "weather_precip_chance": 5,
    "weather_wind_mph": 8,
    "rivalry_flag": false,
    "game_stakes": "non_conf",
    "opponent_rank": null,
    "home_team_rank": 2,
    "opponent_win_pct_pregame": 0.45,
    "home_win_pct_pregame": 0.95,
    "promotion_flag": false,
    "promotion_type": null,
    "kickoff_change": false,
    "days_rest_home": 7,
    "days_rest_away": 10
  },
  {
    "game_id": 2,
    "date": "2025-09-13",
    "home_team": "OSU_FB",
    "away_team": "Texas_Tech",
    "home_score": 38,
    "away_score": 24,
    "home_win": true,
    "attendance": 98500,
    "student_count": 16200,
    "nonstudent_count": 82300,
    "student_ratio": 0.165,
    "kickoff_time": "15:30",
    "weather_temp_f": 74,
    "weather_precip_chance": 15,
    "weather_wind_mph": 12,
    "rivalry_flag": false,
    "game_stakes": "non_conf",
    "opponent_rank": 18,
    "home_team_rank": 2,
    "opponent_win_pct_pregame": 0.62,
    "home_win_pct_pregame": 0.88,
    "promotion_flag": true,
    "promotion_type": "student_discount",
    "kickoff_change": false,
    "days_rest_home": 7,
    "days_rest_away": 7
  },
  {
    "game_id": 3,
    "date": "2025-09-27",
    "home_team": "OSU_FB",
    "away_team": "Michigan",
    "home_score": 31,
    "away_score": 26,
    "home_win": true,
    "attendance": 110000,
    "student_count": 21000,
    "nonstudent_count": 89000,
    "student_ratio": 0.191,
    "kickoff_time": "12:00",
    "weather_temp_f": 65,
    "weather_precip_chance": 20,
    "weather_wind_mph": 10,
    "rivalry_flag": true,
    "game_stakes": "conference",
    "opponent_rank": 5,
    "home_team_rank": 3,
    "opponent_win_pct_pregame": 0.76,
    "home_win_pct_pregame": 0.82,
    "promotion_flag": true,
    "promotion_type": "rivalry_promo",
    "kickoff_change": false,
    "days_rest_home": 14,
    "days_rest_away": 7
  },
  {
    "game_id": 4,
    "date": "2025-10-04",
    "home_team": "OSU_FB",
    "away_team": "Penn_State",
    "home_score": 20,
    "away_score": 24,
    "home_win": false,
    "attendance": 105000,
    "student_count": 19500,
    "nonstudent_count": 85500,
    "student_ratio": 0.186,
    "kickoff_time": "19:30",
    "weather_temp_f": 58,
    "weather_precip_chance": 40,
    "weather_wind_mph": 16,
    "rivalry_flag": false,
    "game_stakes": "conference",
    "opponent_rank": 8,
    "home_team_rank": 3,
    "opponent_win_pct_pregame": 0.72,
    "home_win_pct_pregame": 0.79,
    "promotion_flag": false,
    "promotion_type": null,
    "kickoff_change": true,
    "days_rest_home": 7,
    "days_rest_away": 7
  },
  {
    "game_id": 5,
    "date": "2025-10-11",
    "home_team": "OSU_FB",
    "away_team": "Purdue",
    "home_score": 45,
    "away_score": 13,
    "home_win": true,
    "attendance": 92000,
    "student_count": 14500,
    "nonstudent_count": 77500,
    "student_ratio": 0.158,
    "kickoff_time": "12:00",
    "weather_temp_f": 62,
    "weather_precip_chance": 10,
    "weather_wind_mph": 7,
    "rivalry_flag": false,
    "game_stakes": "conference",
    "opponent_rank": null,
    "home_team_rank": 2,
    "opponent_win_pct_pregame": 0.35,
    "home_win_pct_pregame": 0.91,
    "promotion_flag": true,
    "promotion_type": "family_bundle",
    "kickoff_change": false,
    "days_rest_home": 7,
    "days_rest_away": 7
  },
  {
    "game_id": 6,
    "date": "2025-10-25",
    "home_team": "OSU_FB",
    "away_team": "Iowa",
    "home_score": 35,
    "away_score": 10,
    "home_win": true,
    "attendance": 96500,
    "student_count": 17200,
    "nonstudent_count": 79300,
    "student_ratio": 0.178,
    "kickoff_time": "15:30",
    "weather_temp_f": 52,
    "weather_precip_chance": 25,
    "weather_wind_mph": 13,
    "rivalry_flag": false,
    "game_stakes": "conference",
    "opponent_rank": null,
    "home_team_rank": 2,
    "opponent_win_pct_pregame": 0.58,
    "home_win_pct_pregame": 0.85,
    "promotion_flag": false,
    "promotion_type": null,
    "kickoff_change": false,
    "days_rest_home": 14,
    "days_rest_away": 7
  },
  {
    "game_id": 7,
    "date": "2025-11-01",
    "home_team": "OSU_FB",
    "away_team": "Nebraska",
    "home_score": 28,
    "away_score": 14,
    "home_win": true,
    "attendance": 100500,
    "student_count": 18800,
    "nonstudent_count": 81700,
    "student_ratio": 0.187,
    "kickoff_time": "12:00",
    "weather_temp_f": 48,
    "weather_precip_chance": 35,
    "weather_wind_mph": 11,
    "rivalry_flag": false,
    "game_stakes": "conference",
    "opponent_rank": null,
    "home_team_rank": 2,
    "opponent_win_pct_pregame": 0.42,
    "home_win_pct_pregame": 0.88,
    "promotion_flag": true,
    "promotion_type": "alumni_night",
    "kickoff_change": false,
    "days_rest_home": 7,
    "days_rest_away": 7
  },
  {
    "game_id": 8,
    "date": "2025-11-08",
    "home_team": "OSU_FB",
    "away_team": "Wisconsin",
    "home_score": 24,
    "away_score": 20,
    "home_win": true,
    "attendance": 98000,
    "student_count": 16900,
    "nonstudent_count": 81100,
    "student_ratio": 0.172,
    "kickoff_time": "15:30",
    "weather_temp_f": 45,
    "weather_precip_chance": 45,
    "weather_wind_mph": 14,
    "rivalry_flag": false,
    "game_stakes": "conference",
    "opponent_rank": 12,
    "home_team_rank": 2,
    "opponent_win_pct_pregame": 0.68,
    "home_win_pct_pregame": 0.76,
    "promotion_flag": false,
    "promotion_type": null,
    "kickoff_change": false,
    "days_rest_home": 7,
    "days_rest_away": 7
  },
  {
    "game_id": 9,
    "date": "2025-11-15",
    "home_team": "OSU_FB",
    "away_team": "Northwestern",
    "home_score": 55,
    "away_score": 7,
    "home_win": true,
    "attendance": 89000,
    "student_count": 13500,
    "nonstudent_count": 75500,
    "student_ratio": 0.152,
    "kickoff_time": "12:00",
    "weather_temp_f": 42,
    "weather_precip_chance": 15,
    "weather_wind_mph": 8,
    "rivalry_flag": false,
    "game_stakes": "non_conf",
    "opponent_rank": null,
    "home_team_rank": 1,
    "opponent_win_pct_pregame": 0.15,
    "home_win_pct_pregame": 0.98,
    "promotion_flag": false,
    "promotion_type": null,
    "kickoff_change": false,
    "days_rest_home": 7,
    "days_rest_away": 7
  },
  {
    "game_id": 10,
    "date": "2025-11-29",
    "home_team": "OSU_FB",
    "away_team": "Michigan",
    "home_score": 37,
    "away_score": 20,
    "home_win": true,
    "attendance": 110500,
    "student_count": 20500,
    "nonstudent_count": 90000,
    "student_ratio": 0.185,
    "kickoff_time": "12:00",
    "weather_temp_f": 38,
    "weather_precip_chance": 30,
    "weather_wind_mph": 12,
    "rivalry_flag": true,
    "game_stakes": "conference",
    "opponent_rank": 4,
    "home_team_rank": 1,
    "opponent_win_pct_pregame": 0.74,
    "home_win_pct_pregame": 0.87,
    "promotion_flag": false,
    "promotion_type": null,
    "kickoff_change": false,
    "days_rest_home": 14,
    "days_rest_away": 14
  }
]
```

---

## 3. Core Models

### 3.1 Attendance Demand Model

**Objective:** Predict expected attendance based on game contextual factors (opponent, promotion, weather, etc.).

**Formula (log-linear OLS):**

```
log(attendance) = β₀ + β₁·opponent_rank + β₂·rivalry_flag + β₃·promotion_flag 
                + β₄·weather_temp + β₅·kickoff_time_evening 
                + β₆·days_rest_home + ε
```

**Implementation (Python / statsmodels):**

```python
import pandas as pd
import statsmodels.api as sm
from sklearn.preprocessing import StandardScaler

# Load mock data
games = pd.read_json('mock_games.json')

# Feature engineering
games['kickoff_is_evening'] = (games['kickoff_time'] >= '19:00').astype(int)
games['log_attendance'] = np.log(games['attendance'])

# Prepare X and y
X = games[['opponent_rank', 'rivalry_flag', 'promotion_flag', 'weather_temp_f', 
           'kickoff_is_evening', 'days_rest_home']]
X = X.fillna(X.mean())  # Handle missing opponent_rank for unranked teams
X = sm.add_constant(X)

y = games['log_attendance']

# Fit OLS model
model_demand = sm.OLS(y, X).fit()
print(model_demand.summary())
```

**Interpretation:**
- Coefficients tell you: "X unit increase in rival flag → Y% increase in attendance"
- Use fitted model to generate "baseline expected attendance" for counterfactual scenarios

---

### 3.2 Home-Field Advantage Model (Win Probability)

**Objective:** Quantify how attendance and student ratio affect win probability, controlling for team quality.

**Formula (logistic regression):**

```
logit(P(home_win)) = β₀ + β₁·log(attendance) + β₂·student_ratio 
                   + β₃·rivalry_flag + β₄·opponent_rank 
                   + β₅·home_team_rank + β₆·weather_wind + ε
```

**Implementation (Python / statsmodels + sklearn):**

```python
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

# Prepare features
games['log_attendance'] = np.log(games['attendance'])
games['opponent_rank'] = games['opponent_rank'].fillna(25)  # Unranked = 25
games['home_team_rank'] = games['home_team_rank'].fillna(25)

X = games[['log_attendance', 'student_ratio', 'rivalry_flag', 
           'opponent_rank', 'home_team_rank', 'weather_wind_mph']]

y = games['home_win'].astype(int)

# Standardize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Fit logistic model
model_hfa = LogisticRegression(random_state=42, max_iter=1000)
model_hfa.fit(X_scaled, y)

# Extract coefficients for interpretation
coef_df = pd.DataFrame({
    'feature': X.columns,
    'coefficient': model_hfa.coef_[0],
    'odds_ratio': np.exp(model_hfa.coef_[0])
})
print(coef_df)

# Save for later use
import pickle
pickle.dump((model_hfa, scaler), open('hfa_model.pkl', 'wb'))
```

**Interpretation:**
- Coefficient on `log(attendance)`: "1% increase in attendance → X percentage-point increase in win probability"
- Coefficient on `student_ratio`: "Increase student share from 16% to 19% → Y percentage-point increase in win probability"

---

### 3.3 Revenue Impact Model (Optional for MVP)

**Objective:** Model per-capita concession/merchandise spend as a function of attendance, student mix, and promotion type.

**Formula (simple linear):**

```
revenue_per_capita = β₀ + β₁·student_ratio + β₂·promotion_type + β₃·attendance_pct_capacity 
                   + β₄·opponent_rank + ε
```

**Note:** For MVP, you can mock this with assumptions (e.g., "non-students spend $12 per game, students spend $6, promotions reduce per-capita by 15%").

---

## 4. Feature Engineering & Preprocessing

**Location:** `src/preprocessing.py`

```python
import pandas as pd
import numpy as np

def prepare_game_data(df):
    """
    Cleans and engineers features from raw game data.
    """
    df = df.copy()
    
    # Ensure numeric types
    df['attendance'] = pd.to_numeric(df['attendance'])
    df['student_count'] = pd.to_numeric(df['student_count'])
    df['home_score'] = pd.to_numeric(df['home_score'])
    df['away_score'] = pd.to_numeric(df['away_score'])
    
    # Derived features
    df['student_ratio'] = df['student_count'] / df['attendance']
    df['log_attendance'] = np.log(df['attendance'])
    df['home_win'] = (df['home_score'] > df['away_score']).astype(int)
    df['point_differential'] = df['home_score'] - df['away_score']
    df['kickoff_is_evening'] = (df['kickoff_time'] >= '19:00').astype(int)
    df['kickoff_is_early'] = (df['kickoff_time'] < '12:00').astype(int)
    df['opponent_rank'] = df['opponent_rank'].fillna(25)  # Unranked
    df['home_team_rank'] = df['home_team_rank'].fillna(25)
    
    # Interaction terms
    df['rivalry_x_student_ratio'] = df['rivalry_flag'] * df['student_ratio']
    df['promotion_x_attendance'] = df['promotion_flag'] * df['log_attendance']
    
    return df
```

---

## 5. API Specification

### 5.1 Backend (FastAPI)

**File:** `app/main.py`

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle
import numpy as np
import pandas as pd

app = FastAPI()

# Load models on startup
with open('models/hfa_model.pkl', 'rb') as f:
    model_hfa, scaler = pickle.load(f)

class ScenarioRequest(BaseModel):
    """Request body for scenario simulation."""
    attendance: int
    student_ratio: float  # 0–1
    rival_game: bool
    opponent_rank: int
    home_rank: int
    weather_wind: int
    promotion: str  # 'none', 'student_discount', 'family_bundle', 'alumni_night'

@app.post("/predict/hfa")
def predict_hfa(scenario: ScenarioRequest):
    """
    Predict home-field advantage (win probability) given game context.
    """
    # Prepare feature vector
    X_scenario = np.array([
        [
            np.log(scenario.attendance),
            scenario.student_ratio,
            int(scenario.rival_game),
            scenario.opponent_rank,
            scenario.home_rank,
            scenario.weather_wind
        ]
    ])
    
    # Scale
    X_scaled = scaler.transform(X_scenario)
    
    # Predict
    win_prob = model_hfa.predict_proba(X_scaled)[0][1]
    
    return {
        "scenario": scenario.dict(),
        "predicted_win_probability": float(win_prob),
        "confidence": float(model_hfa.predict_proba(X_scaled).max())
    }

@app.post("/simulate/what-if")
def simulate_what_if(base_scenario: ScenarioRequest, changes: dict):
    """
    Compare baseline vs. counterfactual (e.g., "increase student ratio from 16% to 20%").
    """
    # Predict baseline
    baseline_prob = predict_hfa(base_scenario)['predicted_win_probability']
    
    # Apply changes
    modified_scenario = base_scenario.copy()
    for key, value in changes.items():
        setattr(modified_scenario, key, value)
    
    # Predict counterfactual
    counterfactual_prob = predict_hfa(modified_scenario)['predicted_win_probability']
    
    return {
        "baseline_win_prob": baseline_prob,
        "counterfactual_win_prob": counterfactual_prob,
        "delta_win_prob": counterfactual_prob - baseline_prob,
        "changes_applied": changes
    }

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## 6. Frontend Specification (Streamlit MVP)

**File:** `app/dashboard.py`

```python
import streamlit as st
import requests
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Fan Impact Engine", layout="wide")

st.title("🏟️ Fan Impact Engine – MVP Dashboard")
st.subheader("Quantify how fans drive home-field advantage")

# Sidebar for input
st.sidebar.header("Game Scenario")

attendance = st.sidebar.slider("Attendance", min_value=80000, max_value=110000, value=100000)
student_ratio = st.sidebar.slider("Student Ratio", min_value=0.10, max_value=0.25, value=0.18)
rival_game = st.sidebar.checkbox("Rivalry Game?", value=False)
opponent_rank = st.sidebar.number_input("Opponent Rank (25 = unranked)", min_value=1, max_value=25, value=15)
home_rank = st.sidebar.number_input("Home Team Rank", min_value=1, max_value=25, value=2)
weather_wind = st.sidebar.slider("Wind Speed (mph)", min_value=0, max_value=20, value=10)
promotion = st.sidebar.selectbox("Promotion Type", ["none", "student_discount", "family_bundle", "alumni_night"])

# Make API call
scenario = {
    "attendance": int(attendance),
    "student_ratio": float(student_ratio),
    "rival_game": rival_game,
    "opponent_rank": int(opponent_rank),
    "home_rank": int(home_rank),
    "weather_wind": int(weather_wind),
    "promotion": promotion
}

try:
    response = requests.post("http://localhost:8000/predict/hfa", json=scenario)
    result = response.json()
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Predicted Win Probability", f"{result['predicted_win_probability']:.1%}")
    with col2:
        st.metric("Attendance", f"{attendance:,}")
    with col3:
        st.metric("Student Ratio", f"{student_ratio:.1%}")
    
    # What-if scenario
    st.header("🔄 What-If Simulator")
    st.write("Adjust a lever and see the impact on win probability:")
    
    what_if_lever = st.selectbox("Which lever do you want to change?", 
                                  ["student_ratio", "attendance", "opponent_rank"])
    
    if what_if_lever == "student_ratio":
        new_value = st.slider("New Student Ratio", 0.10, 0.25, student_ratio)
        changes = {"student_ratio": new_value}
    elif what_if_lever == "attendance":
        new_value = st.slider("New Attendance", 80000, 110000, attendance)
        changes = {"attendance": new_value}
    else:
        new_value = st.slider("New Opponent Rank", 1, 25, opponent_rank)
        changes = {"opponent_rank": new_value}
    
    what_if_response = requests.post("http://localhost:8000/simulate/what-if", 
                                     json={"base_scenario": scenario, "changes": changes})
    what_if_result = what_if_response.json()
    
    delta = what_if_result['delta_win_prob']
    st.success(f"**Impact:** {delta:+.1%} change in win probability")
    
    # Simple bar chart
    chart_data = pd.DataFrame({
        "Scenario": ["Baseline", "Counterfactual"],
        "Win Probability": [what_if_result['baseline_win_prob'], what_if_result['counterfactual_win_prob']]
    })
    st.bar_chart(chart_data.set_index("Scenario"))
    
except Exception as e:
    st.error(f"API Error: {e}")
```

**To run:**
```bash
streamlit run app/dashboard.py
```

---

## 7. Project Structure

```
fan-impact-engine/
├── README.md
├── requirements.txt
├── data/
│   ├── mock_games.json              # Mock 10-game dataset
│   └── processed_games.csv           # After preprocessing
├── src/
│   ├── __init__.py
│   ├── preprocessing.py              # Feature engineering
│   ├── models.py                     # Model training
│   └── utils.py                      # Helpers
├── models/
│   ├── hfa_model.pkl                 # Serialized logistic regression
│   └── demand_model.pkl              # Serialized OLS demand model
├── app/
│   ├── main.py                       # FastAPI backend
│   └── dashboard.py                  # Streamlit frontend
├── notebooks/
│   ├── 01_eda.ipynb                  # Exploratory data analysis
│   └── 02_model_training.ipynb       # Model fitting & diagnostics
├── tests/
│   ├── test_preprocessing.py
│   └── test_models.py
├── Dockerfile
├── docker-compose.yml
└── .github/
    └── workflows/
        └── ci.yml                    # GitHub Actions CI
```

---

## 8. Development Roadmap

### Week 1–2: Setup & EDA
- [ ] Clone repo, set up Python environment
- [ ] Load mock data, run exploratory data analysis (histograms, correlations, seasonality)
- [ ] Document data quality issues, missing values

### Week 3–4: Data Preprocessing & Feature Engineering
- [ ] Implement `preprocessing.py` with feature engineering (log-transforms, interactions, etc.)
- [ ] Create test cases for edge cases (zero attendance, missing opponent ranks)
- [ ] Export cleaned dataset to CSV

### Week 5–6: Model Training
- [ ] Fit attendance demand model (OLS), document coefficients, interpret
- [ ] Fit home-field advantage model (logistic), validate with cross-validation
- [ ] Check for multicollinearity, residual diagnostics
- [ ] Serialize models to pickle

### Week 7–8: API Backend
- [ ] Set up FastAPI server with `/predict/hfa` and `/simulate/what-if` endpoints
- [ ] Unit test both endpoints with example scenarios
- [ ] Document API in Swagger (auto-generated by FastAPI)

### Week 9–10: Frontend Dashboard
- [ ] Build Streamlit UI with sidebar inputs and scenario simulator
- [ ] Wire up frontend to backend API
- [ ] Add visualizations (bar charts, tables, trends)

### Week 11–12: Polish & Documentation
- [ ] Dockerize app (Dockerfile, docker-compose)
- [ ] Write README with setup instructions
- [ ] Create GitHub Actions CI pipeline
- [ ] Record demo walkthrough

---

## 9. Success Criteria for MVP

- [ ] Attendance demand model: R² > 0.65, all coefficients make intuitive sense
- [ ] Home-field advantage model: AUC > 0.75, significant coefficient on `log(attendance)` (p < 0.05)
- [ ] API correctly predicts win probability and handles scenario input
- [ ] Dashboard loads without errors, what-if simulator generates reasonable counterfactuals
- [ ] Code is documented, tested, and reproducible (easy to run locally)
- [ ] One-page findings summary: "1,000 extra fans → +X% win probability" (with 95% CI)

---

## 10. Next Steps (Beyond MVP)

1. **Real data integration:** Replace mock data with actual OSU or partner school attendance, scores, promotions
2. **Temporal modeling:** Add autoregressive terms or state-space models to capture week-to-week momentum
3. **Student-section deep dive:** Separate models for student vs. non-student fan effects on momentum (early-game scoring, penalties, etc.)
4. **Field experiments:** Design and run A/B tests on student promotions, kickoff times, or themed games (with athletic department)
5. **Productization:** Refactor dashboard for high-volume multi-team use, add authentication, persistent data storage (PostgreSQL)
6. **Publishing:** Write academic paper on "Marginal Impact of Fans on Home-Field Advantage" with published data/code
7. **Scaling:** Expand to multiple sports (basketball, soccer) and multiple institutions

---

## 11. Tech Debt & Known Limitations

- **Sample size:** MVP has only ~10 mock games; real analysis needs 50+ observations per model
- **Confounding:** No causal IV strategy yet (quasi-experiments with COVID/weather shocks would be next)
- **Student ratio proxy:** Using `student_count` may be noisy; ideally validate with ticket category data
- **Temporal:** No treatment of week-to-week carryover or momentum; assumes IID observations
- **Generalization:** Models trained on one team/sport may not transfer; need cross-validation across years/conferences

---

## 12. File Templates for Quick Start

**requirements.txt:**
```
pandas==2.0.0
numpy==1.24.0
statsmodels==0.14.0
scikit-learn==1.3.0
xgboost==2.0.0
fastapi==0.104.0
uvicorn==0.24.0
streamlit==1.28.0
requests==2.31.0
plotly==5.17.0
python-dotenv==1.0.0
pytest==7.4.0
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
  frontend:
    build: .
    ports:
      - "8501:8501"
    command: streamlit run app/dashboard.py --server.port=8501 --server.address=0.0.0.0
```

---

## 13. Cursor AI / Agent Instructions

When using **Cursor IDE** or agent-based tools (e.g., Claude Projects, GitHub Copilot), you can structure prompts like:

```
"I'm building the Fan Impact Engine MVP. I have mock game data and need to:

1. Fit an OLS demand model with the following features: [list them]
2. Fit a logistic HFA model and extract interpretable coefficients
3. Serialize both models to pickle
4. Build a FastAPI endpoint that takes a scenario dict and returns win probability

The data is at data/mock_games.json and has columns: [list them]. 

Use statsmodels for OLS and sklearn for logistic. Generate docstrings and unit tests. Keep code modular (src/preprocessing.py, src/models.py, etc.)."
```

Agents like **Claude** or **Cursor** can then scaffold out entire modules, generate test cases, and refactor for clarity.

---

**Last Updated:** January 26, 2025  
**Author:** [Your Name]  
**Status:** MVP Draft – Ready for Implementation
