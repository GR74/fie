# Fan Impact Engine (OSU Scarlet/Gray MVP)

Premium, Ohio State–styled MVP centered on **Michigan @ Ohio State (home), 2026** with a “Game Day Simulator” that outputs:
- Win probability (mock HFA engine)
- Loudness (decibels + crowd energy lever)
- Concessions (revenue + ops: wait times/staffing/utilization)

Everything is **mock + deterministic** right now, but structured like a real engine (see the **Engine** and **Report** pages).

## Quick start (local, Windows)

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

Open `http://localhost:3000` (it will land on the Michigan hero game).

## Run with Docker

```bash
docker compose up
```

Open `http://localhost:3000`.

## Key routes
- **Hero simulator**: `/games/michigan_at_osu_2026`
- **Engine tab**: `/games/michigan_at_osu_2026/engine`
- **Engine report (print/PDF)**: `/games/michigan_at_osu_2026/engine-report`
- **Games list**: `/games`
- **Scenario Lab (global)**: `/scenario`
- **Dashboard**: `/dashboard`

## API
- `GET /health`
- `GET /games`, `GET /games/{id}`
- `POST /games/{id}/simulate` (combined: HFA + noise + concessions + engine assumptions)
- `POST /predict/hfa`, `POST /simulate/what-if`, `POST /recommendations` (global HFA tools)

## Notes
- The frontend calls the backend via a **Next.js proxy** at `/api/...` (see `frontend/src/app/api/[...path]/route.ts`). This avoids CORS issues and works both locally and in Docker.\n


