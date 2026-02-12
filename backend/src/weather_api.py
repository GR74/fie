"""
Weather data integration.

Primary (official): NWS api.weather.gov (National Weather Service / NOAA).
Fallback: Open-Meteo (third-party). Historical: NOAA/NWS 1991-2020 normals.

Columbus, OH coordinates: 39.9612, -82.9988
"""

from __future__ import annotations

import time
import logging
from datetime import date, datetime, timedelta
from typing import Any
from urllib.request import urlopen, Request
from urllib.error import URLError
import json

logger = logging.getLogger(__name__)

# Columbus, OH
COLUMBUS_LAT = 39.9612
COLUMBUS_LON = -82.9988

# Cache
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes for weather


def _cached_get(url: str, headers: dict | None = None) -> Any | None:
    now = time.time()
    if url in _cache:
        ts, data = _cache[url]
        if now - ts < CACHE_TTL_SECONDS:
            return data
    hdr = headers or {}
    if "User-Agent" not in hdr:
        hdr["User-Agent"] = "FanImpactEngine/1.0 (contact: FIE-project)"
    try:
        req = Request(url, headers=hdr)
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            _cache[url] = (now, data)
            return data
    except (URLError, json.JSONDecodeError, TimeoutError) as e:
        logger.warning("Weather API request failed for %s: %s", url, e)
        return None


# NWS requires a descriptive User-Agent (https://www.weather.gov/documentation/services-web-api)
NWS_HEADERS = {"User-Agent": "FanImpactEngine/1.0 (Ohio State game-day simulator; contact: FIE-project)", "Accept": "application/json"}


# --- Historical monthly normals for Columbus OH (NWS/NOAA climatology) ---
# Source: REAL data from NOAA/NWS Columbus OH (CMH) 1991-2020 normals
COLUMBUS_NORMALS: dict[int, dict[str, Any]] = {
    1:  {"avg_high_f": 36, "avg_low_f": 22, "avg_wind_mph": 10.5, "precip_days": 12, "precip_chance_pct": 39},
    2:  {"avg_high_f": 39, "avg_low_f": 24, "avg_wind_mph": 10.2, "precip_days": 10, "precip_chance_pct": 36},
    3:  {"avg_high_f": 51, "avg_low_f": 33, "avg_wind_mph": 10.8, "precip_days": 11, "precip_chance_pct": 35},
    4:  {"avg_high_f": 63, "avg_low_f": 42, "avg_wind_mph": 9.8,  "precip_days": 12, "precip_chance_pct": 40},
    5:  {"avg_high_f": 73, "avg_low_f": 52, "avg_wind_mph": 7.8,  "precip_days": 13, "precip_chance_pct": 42},
    6:  {"avg_high_f": 82, "avg_low_f": 61, "avg_wind_mph": 6.5,  "precip_days": 11, "precip_chance_pct": 37},
    7:  {"avg_high_f": 85, "avg_low_f": 65, "avg_wind_mph": 5.8,  "precip_days": 10, "precip_chance_pct": 32},
    8:  {"avg_high_f": 83, "avg_low_f": 63, "avg_wind_mph": 5.5,  "precip_days": 9,  "precip_chance_pct": 29},
    9:  {"avg_high_f": 78, "avg_low_f": 56, "avg_wind_mph": 6.2,  "precip_days": 8,  "precip_chance_pct": 27},
    10: {"avg_high_f": 65, "avg_low_f": 44, "avg_wind_mph": 7.5,  "precip_days": 9,  "precip_chance_pct": 29},
    11: {"avg_high_f": 51, "avg_low_f": 35, "avg_wind_mph": 9.5,  "precip_days": 10, "precip_chance_pct": 33},
    12: {"avg_high_f": 40, "avg_low_f": 26, "avg_wind_mph": 10.0, "precip_days": 11, "precip_chance_pct": 37},
}


def get_forecast_weather(game_date: str, kickoff_time: str = "12:00") -> dict[str, Any]:
    """
    Get weather forecast for a specific game date in Columbus OH.

    Tries in order: NWS (official, 7-day), Open-Meteo (third-party, 16-day),
    then NOAA/NWS 1991-2020 climate normals.

    Returns dict with:
        temp_f, wind_mph, precip_chance_pct, conditions, source, _api
    """
    try:
        target = date.fromisoformat(game_date)
    except ValueError:
        return _get_normals_fallback(game_date, kickoff_time)

    days_ahead = (target - date.today()).days

    # Official: NWS api.weather.gov (7-day forecast)
    if 0 <= days_ahead <= 7:
        forecast = _fetch_nws_forecast(game_date, kickoff_time)
        if forecast:
            return forecast

    # Third-party fallback: Open-Meteo (up to 16 days)
    if 0 <= days_ahead <= 16:
        forecast = _fetch_open_meteo_forecast(game_date, kickoff_time)
        if forecast:
            return forecast

    return _get_normals_fallback(game_date, kickoff_time)


def _fetch_nws_forecast(game_date: str, kickoff_time: str) -> dict[str, Any] | None:
    """Fetch from NWS api.weather.gov (official US government)."""
    points_url = f"https://api.weather.gov/points/{COLUMBUS_LAT},{COLUMBUS_LON}"
    points = _cached_get(points_url, headers=NWS_HEADERS)
    if not points or "properties" not in points:
        return None
    props = points.get("properties", {})
    forecast_url = props.get("forecast")
    if not forecast_url:
        return None
    data = _cached_get(forecast_url, headers=NWS_HEADERS)
    if not data or "properties" not in data or "periods" not in data.get("properties", {}):
        return None
    periods = data["properties"]["periods"]
    try:
        target = date.fromisoformat(game_date)
        hour = int(kickoff_time.split(":")[0]) if kickoff_time else 12
    except (ValueError, IndexError):
        return None
    # NWS periods are named "Tonight", "Today", "Wednesday", etc. Match by date
    for p in periods:
        start = p.get("start", "")[:10]
        if start == game_date:
            # Use first period that matches game date; NWS doesn't give hour-level for all
            temp = p.get("temperature")
            if temp is None:
                continue
            wind = p.get("windSpeed", "")
            # Parse "10 mph" or "10 to 15 mph"
            wind_mph = 8
            if isinstance(wind, str) and "mph" in wind:
                try:
                    wind_mph = int(wind.split()[0])
                except (ValueError, IndexError):
                    pass
            elif isinstance(wind, (int, float)):
                wind_mph = int(wind)
            return {
                "temp_f": int(temp),
                "wind_mph": min(25, max(0, wind_mph)),
                "precip_chance_pct": 0,  # NWS period doesn't always include probability
                "conditions": p.get("shortForecast", "Forecast"),
                "source": "LIVE",
                "_api": "NWS api.weather.gov (National Weather Service / NOAA)",
                "_retrieved_at": datetime.utcnow().isoformat() + "Z",
            }
    return None


def _fetch_open_meteo_forecast(game_date: str, kickoff_time: str) -> dict[str, Any] | None:
    """Fetch from Open-Meteo forecast API."""
    try:
        hour = int(kickoff_time.split(":")[0])
    except (ValueError, IndexError):
        hour = 12

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={COLUMBUS_LAT}&longitude={COLUMBUS_LON}"
        f"&hourly=temperature_2m,windspeed_10m,precipitation_probability,weathercode"
        f"&temperature_unit=fahrenheit&windspeed_unit=mph"
        f"&start_date={game_date}&end_date={game_date}"
        f"&timezone=America/New_York"
    )

    data = _cached_get(url)
    if not data or "hourly" not in data:
        return None

    hourly = data["hourly"]
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    winds = hourly.get("windspeed_10m", [])
    precips = hourly.get("precipitation_probability", [])
    codes = hourly.get("weathercode", [])

    # Find the hour closest to kickoff
    target_idx = None
    for i, t in enumerate(times):
        try:
            t_hour = int(t.split("T")[1].split(":")[0])
            if t_hour == hour:
                target_idx = i
                break
        except (ValueError, IndexError):
            continue

    if target_idx is None and times:
        target_idx = min(hour, len(times) - 1)

    if target_idx is None:
        return None

    # Also get the 3-hour window around kickoff for game-time conditions
    start_idx = max(0, target_idx - 1)
    end_idx = min(len(times), target_idx + 3)

    avg_temp = sum(temps[start_idx:end_idx]) / max(1, end_idx - start_idx)
    max_wind = max(winds[start_idx:end_idx]) if winds[start_idx:end_idx] else 0
    max_precip = max(precips[start_idx:end_idx]) if precips[start_idx:end_idx] else 0

    weather_code = codes[target_idx] if target_idx < len(codes) else 0
    conditions = _weather_code_to_text(weather_code)

    return {
        "temp_f": round(avg_temp),
        "wind_mph": round(max_wind),
        "precip_chance_pct": round(max_precip),
        "conditions": conditions,
        "weather_code": weather_code,
        "source": "LIVE",
        "_api": "Open-Meteo forecast API (open-meteo.com)",
        "_retrieved_at": datetime.utcnow().isoformat() + "Z",
        "_kickoff_hour": hour,
        "_window": f"{start_idx}h-{end_idx}h local",
    }


def _get_normals_fallback(game_date: str, kickoff_time: str) -> dict[str, Any]:
    """Fall back to historical normals when forecast unavailable."""
    try:
        target = date.fromisoformat(game_date)
        month = target.month
    except ValueError:
        month = 10  # Default to October

    normals = COLUMBUS_NORMALS.get(month, COLUMBUS_NORMALS[10])

    try:
        hour = int(kickoff_time.split(":")[0])
    except (ValueError, IndexError):
        hour = 12

    # Adjust temp for time of day
    avg_high = normals["avg_high_f"]
    avg_low = normals["avg_low_f"]
    if hour >= 19:
        # Evening: closer to low
        temp = avg_low + (avg_high - avg_low) * 0.4
    elif hour >= 15:
        # Afternoon: near high
        temp = avg_high - 2
    else:
        # Midday
        temp = avg_low + (avg_high - avg_low) * 0.75

    return {
        "temp_f": round(temp),
        "wind_mph": round(normals["avg_wind_mph"]),
        "precip_chance_pct": normals["precip_chance_pct"],
        "conditions": "Historical average",
        "source": "HISTORICAL",
        "_api": "NOAA/NWS Columbus OH 1991-2020 climate normals",
        "_month": month,
    }


def _weather_code_to_text(code: int) -> str:
    """Convert WMO weather code to human-readable text."""
    WMO_CODES = {
        0: "Clear sky",
        1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        85: "Slight snow showers", 86: "Heavy snow showers",
        95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
    }
    return WMO_CODES.get(code, f"Code {code}")


def get_game_weather(game_date: str, kickoff_time: str = "12:00", is_indoor: bool = False) -> dict[str, Any]:
    """
    High-level function: get weather for a game, handling indoor venues.

    Indoor venues return neutral weather with a note.
    """
    if is_indoor:
        return {
            "temp_f": 70,
            "wind_mph": 0,
            "precip_chance_pct": 0,
            "conditions": "Indoor venue (climate controlled)",
            "source": "N/A",
            "_note": "Indoor venue; weather has no effect on HFA model",
        }

    return get_forecast_weather(game_date, kickoff_time)
