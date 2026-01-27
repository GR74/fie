from __future__ import annotations

import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any


@dataclass
class SavedScenario:
    scenario_id: str
    game_id: str
    overrides: dict[str, Any]
    note: str | None
    created_at: str


_STORE: dict[str, SavedScenario] = {}


def create_scenario(*, game_id: str, overrides: dict[str, Any], note: str | None) -> SavedScenario:
    sid = str(uuid.uuid4())
    sc = SavedScenario(
        scenario_id=sid,
        game_id=game_id,
        overrides=overrides,
        note=note,
        created_at=datetime.utcnow().isoformat() + "Z",
    )
    _STORE[sid] = sc
    return sc


def list_scenarios() -> list[SavedScenario]:
    return sorted(_STORE.values(), key=lambda s: s.created_at, reverse=True)


def get_scenario(scenario_id: str) -> SavedScenario | None:
    return _STORE.get(scenario_id)


def delete_scenario(scenario_id: str) -> bool:
    return _STORE.pop(scenario_id, None) is not None


def to_dict(s: SavedScenario) -> dict[str, Any]:
    return asdict(s)


