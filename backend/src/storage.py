from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .schemas import Game


@lru_cache(maxsize=1)
def load_games() -> list[Game]:
    data_path = Path(__file__).resolve().parents[1] / "data" / "games.json"
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    return [Game.model_validate(item) for item in raw]


@lru_cache(maxsize=1)
def load_venue() -> dict:
    data_path = Path(__file__).resolve().parents[1] / "data" / "venue.json"
    return json.loads(data_path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_concessions_menu() -> dict:
    data_path = Path(__file__).resolve().parents[1] / "data" / "concessions_menu.json"
    return json.loads(data_path.read_text(encoding="utf-8"))


def get_game(game_id: str) -> Game | None:
    for g in load_games():
        if g.game_id == game_id:
            return g
    return None


