from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .schemas import Game


@lru_cache(maxsize=1)
def load_games() -> list[Game]:
    data_path = Path(__file__).resolve().parents[1] / "data" / "games.json"
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    result = []
    for item in raw:
        venue = get_venue(item.get("venue_id"))
        item = {**item, "is_indoor": bool(venue.get("is_indoor", False))}
        # Normalize capacities from venue configs to prevent mismatches (e.g., Covelli vs Schott).
        item["venue_capacity"] = int(venue.get("capacity", item.get("venue_capacity", 0)))
        alt_id = item.get("alternate_venue_id")
        if alt_id:
            alt_venue = get_venue(alt_id)
            item["alternate_venue_capacity"] = int(
                alt_venue.get("capacity", item.get("alternate_venue_capacity", 0))
            )
        result.append(Game.model_validate(item))
    return result


@lru_cache(maxsize=1)
def load_venue() -> dict:
    data_path = Path(__file__).resolve().parents[1] / "data" / "venue.json"
    return json.loads(data_path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_venues() -> dict:
    data_path = Path(__file__).resolve().parents[1] / "data" / "venues.json"
    return json.loads(data_path.read_text(encoding="utf-8"))


def get_venue(venue_id: str | None) -> dict:
    """Return venue config. If venue_id is None, use default venue.json."""
    if not venue_id:
        return load_venue()
    venues = load_venues()
    if venue_id in venues:
        v = dict(venues[venue_id])
        v["capacity"] = v.get("capacity", 102780)
        v["concessions"] = v.get("concessions", load_venue().get("concessions", {}))
        v["crowd"] = v.get("crowd", load_venue().get("crowd", {}))
        return v
    return load_venue()


@lru_cache(maxsize=1)
def load_concessions_menu() -> dict:
    data_path = Path(__file__).resolve().parents[1] / "data" / "concessions_menu.json"
    return json.loads(data_path.read_text(encoding="utf-8"))


def get_game(game_id: str) -> Game | None:
    for g in load_games():
        if g.game_id == game_id:
            return g
    return None

