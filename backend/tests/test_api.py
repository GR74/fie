from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_games_list_and_hero_exists():
    r = client.get("/games")
    assert r.status_code == 200
    games = r.json()["games"]
    assert any(g["game_id"] == "michigan_at_osu_2026" for g in games)


def test_simulate_hero_game_smoke():
    r = client.post("/games/michigan_at_osu_2026/simulate", json={"overrides": {"crowd_energy": 80}})
    assert r.status_code == 200
    body = r.json()
    assert "baseline" in body and "counterfactual" in body
    assert "engine_assumptions" in body
    assert isinstance(body["delta_win_probability"], float)


