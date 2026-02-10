"""
ESPN public API client for live schedule, rankings, and attendance data.

Data source: ESPN public API (site.api.espn.com)
These are unofficial but widely-used public endpoints. No API key required.
Data is cached for 15 minutes to avoid excessive requests.

ESPN Team IDs:
  Ohio State Football: 194
  Ohio State Men's Basketball: 194
"""

from __future__ import annotations

import time
import logging
from typing import Any
from urllib.request import urlopen, Request
from urllib.error import URLError
import json

logger = logging.getLogger(__name__)

# --- Cache ---
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


def _cached_get(url: str) -> Any | None:
    """Fetch JSON from URL with simple TTL cache. Returns None on failure."""
    now = time.time()
    if url in _cache:
        ts, data = _cache[url]
        if now - ts < CACHE_TTL_SECONDS:
            return data

    try:
        req = Request(url, headers={"User-Agent": "FanImpactEngine/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            _cache[url] = (now, data)
            return data
    except (URLError, json.JSONDecodeError, TimeoutError) as e:
        logger.warning("ESPN API request failed for %s: %s", url, e)
        return None


# --- ESPN Sport Endpoints ---

ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports"

SPORT_PATHS = {
    "football": "football/college-football",
    "basketball": "basketball/mens-college-basketball",
    "volleyball": "volleyball/college-volleyball",  # May not exist
    "baseball": "baseball/college-baseball",  # May not exist
}

OSU_TEAM_ID = "194"  # Ohio State across ESPN


def get_espn_schedule(sport: str = "football", season: int | None = None) -> list[dict[str, Any]]:
    """
    Fetch Ohio State's schedule for a given sport and season from ESPN.

    Returns a list of game dicts with:
      - id, date, name, short_name
      - home_team, away_team, home_score, away_score
      - venue_name, venue_capacity, attendance
      - completed, status_text
      - broadcast, odds_spread
    """
    sport_path = SPORT_PATHS.get(sport)
    if not sport_path:
        return []

    url = f"{ESPN_BASE}/{sport_path}/teams/{OSU_TEAM_ID}/schedule"
    if season:
        url += f"?season={season}"

    data = _cached_get(url)
    if not data:
        return []

    events = data.get("events", [])
    results = []

    for ev in events:
        try:
            comp = ev.get("competitions", [{}])[0]
            competitors = comp.get("competitors", [])
            home = next((c for c in competitors if c.get("homeAway") == "home"), {})
            away = next((c for c in competitors if c.get("homeAway") == "away"), {})

            venue_info = comp.get("venue", {})
            status = comp.get("status", {}).get("type", {})

            game = {
                "espn_id": ev.get("id"),
                "date": ev.get("date", ""),
                "name": ev.get("name", ""),
                "short_name": ev.get("shortName", ""),
                "home_team": home.get("team", {}).get("displayName", ""),
                "away_team": away.get("team", {}).get("displayName", ""),
                "home_score": int(home.get("score", {}).get("value", 0)) if status.get("completed") else None,
                "away_score": int(away.get("score", {}).get("value", 0)) if status.get("completed") else None,
                "home_rank": home.get("curatedRank", {}).get("current", 99),
                "away_rank": away.get("curatedRank", {}).get("current", 99),
                "venue_name": venue_info.get("fullName", ""),
                "venue_city": venue_info.get("address", {}).get("city", ""),
                "venue_capacity": venue_info.get("capacity"),
                "attendance": comp.get("attendance"),
                "completed": bool(status.get("completed")),
                "status_text": status.get("shortDetail", ""),
                "is_home_game": home.get("team", {}).get("id") == OSU_TEAM_ID,
                "broadcast": "",
                "_source": "ESPN public API (site.api.espn.com)",
            }

            # Extract broadcast info
            broadcasts = comp.get("broadcasts", [])
            if broadcasts:
                names = []
                for b in broadcasts:
                    names.extend(n.get("shortName", "") for n in b.get("names", []) if n.get("shortName"))
                game["broadcast"] = ", ".join(names) if names else ""

            # Extract odds/spread if available
            odds = comp.get("odds", [{}])
            if odds:
                game["odds_spread"] = odds[0].get("details", "")

            results.append(game)
        except (KeyError, StopIteration, TypeError):
            continue

    return results


def get_espn_rankings(sport: str = "football") -> list[dict[str, Any]]:
    """
    Fetch current AP/Coaches poll rankings from ESPN.

    Returns a list of ranked teams with:
      - rank, team_name, team_id, record, points, previous_rank
    """
    sport_path = SPORT_PATHS.get(sport)
    if not sport_path:
        return []

    url = f"{ESPN_BASE}/{sport_path}/rankings"
    data = _cached_get(url)
    if not data:
        return []

    rankings_list = data.get("rankings", [])
    if not rankings_list:
        return []

    # Use first poll (usually AP)
    poll = rankings_list[0]
    poll_name = poll.get("name", "Unknown Poll")

    results = []
    for entry in poll.get("ranks", []):
        team_info = entry.get("team", {})
        results.append({
            "rank": entry.get("current", 0),
            "previous_rank": entry.get("previous", 0),
            "team_name": team_info.get("name", ""),
            "team_id": team_info.get("id", ""),
            "team_abbreviation": team_info.get("abbreviation", ""),
            "record": entry.get("recordSummary", ""),
            "points": entry.get("points", 0),
            "poll_name": poll_name,
            "_source": "ESPN public API",
        })

    return results


def get_espn_team_info(sport: str = "football") -> dict[str, Any] | None:
    """Fetch Ohio State team info (record, stats, etc.)."""
    sport_path = SPORT_PATHS.get(sport)
    if not sport_path:
        return None

    url = f"{ESPN_BASE}/{sport_path}/teams/{OSU_TEAM_ID}"
    data = _cached_get(url)
    if not data:
        return None

    team = data.get("team", {})
    return {
        "id": team.get("id"),
        "name": team.get("displayName", "Ohio State Buckeyes"),
        "abbreviation": team.get("abbreviation", "OSU"),
        "record": team.get("record", {}).get("items", [{}])[0].get("summary", "") if team.get("record") else "",
        "rank": team.get("rank", None),
        "logo": team.get("logos", [{}])[0].get("href", "") if team.get("logos") else "",
        "color": team.get("color", "bb0000"),
        "conference": "Big Ten",
        "_source": "ESPN public API",
    }


def get_osu_rank(sport: str = "football") -> int | None:
    """Get Ohio State's current ranking. Returns None if unranked."""
    rankings = get_espn_rankings(sport)
    for r in rankings:
        if r.get("team_id") == OSU_TEAM_ID or "Ohio St" in r.get("team_name", ""):
            return r["rank"]
    return None


def get_espn_scoreboard(sport: str = "football") -> list[dict[str, Any]]:
    """Fetch today's/current week's scoreboard."""
    sport_path = SPORT_PATHS.get(sport)
    if not sport_path:
        return []

    url = f"{ESPN_BASE}/{sport_path}/scoreboard"
    data = _cached_get(url)
    if not data:
        return []

    events = data.get("events", [])
    results = []
    for ev in events:
        results.append({
            "id": ev.get("id"),
            "name": ev.get("name", ""),
            "date": ev.get("date", ""),
            "status": ev.get("status", {}).get("type", {}).get("shortDetail", ""),
            "completed": ev.get("status", {}).get("type", {}).get("completed", False),
        })
    return results


def enrich_game_with_espn(game_dict: dict[str, Any], sport: str = "football") -> dict[str, Any]:
    """
    Try to match a game from our database with ESPN live data.
    Enriches with attendance, scores, broadcast, and ranking updates.

    Returns dict of live fields to merge (empty dict if no match found).
    """
    schedule = get_espn_schedule(sport)
    if not schedule:
        return {}

    game_date = str(game_dict.get("date", ""))
    away_team = str(game_dict.get("away_team", "")).lower()

    for espn_game in schedule:
        espn_date = espn_game.get("date", "")[:10]  # YYYY-MM-DD
        espn_name = espn_game.get("name", "").lower()

        if game_date == espn_date or away_team in espn_name:
            live_data: dict[str, Any] = {"_espn_matched": True}

            if espn_game.get("attendance"):
                live_data["live_attendance"] = espn_game["attendance"]
            if espn_game.get("completed"):
                live_data["live_home_score"] = espn_game.get("home_score")
                live_data["live_away_score"] = espn_game.get("away_score")
                live_data["live_completed"] = True
            if espn_game.get("broadcast"):
                live_data["live_broadcast"] = espn_game["broadcast"]
            if espn_game.get("venue_capacity"):
                live_data["live_venue_capacity"] = espn_game["venue_capacity"]

            # Update rankings
            home_rank = espn_game.get("home_rank", 99)
            away_rank = espn_game.get("away_rank", 99)
            if home_rank and home_rank < 26:
                live_data["live_home_rank"] = home_rank
            if away_rank and away_rank < 26:
                live_data["live_away_rank"] = away_rank

            live_data["_source"] = "ESPN public API (site.api.espn.com)"
            return live_data

    return {}
