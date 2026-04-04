from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import feedparser


DB_PATH = Path(__file__).with_name("imd_alerts.db")

ALERT_LEVELS = {"green", "yellow", "orange", "red"}
EVENT_TYPES = {"cyclone", "rain", "heatwave"}

# Mock keyword-to-zone mapping for RSS ingestion.
RSS_ZONE_KEYWORDS: dict[str, list[str]] = {
    "chennai": ["chennai", "tamil nadu"],
    "bengaluru": ["bengaluru", "bangalore", "karnataka"],
    "coimbatore": ["coimbatore", "tamil nadu"],
    "mumbai": ["mumbai", "maharashtra"],
    "kochi": ["kochi", "kerala"],
    "kolkata": ["kolkata", "west bengal"],
}


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_imd_alerts_table() -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS imd_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                zone TEXT NOT NULL,
                alert_level TEXT NOT NULL,
                event_type TEXT NOT NULL,
                source TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )


def create_imd_alert(
    *,
    zone: str,
    alert_level: str,
    event_type: str,
    source: str,
    timestamp: datetime | None = None,
    dedup_window_minutes: int = 30,
) -> dict:
    normalized_zone = zone.strip().lower()
    normalized_level = alert_level.strip().lower()
    normalized_event = event_type.strip().lower()
    normalized_source = source.strip().lower()

    if normalized_level not in ALERT_LEVELS:
        raise ValueError("Invalid alert level")
    if normalized_event not in EVENT_TYPES:
        raise ValueError("Invalid event type")
    if normalized_source not in {"admin", "rss"}:
        raise ValueError("Invalid source")

    event_time = timestamp or datetime.now(timezone.utc)
    iso_timestamp = event_time.astimezone(timezone.utc).isoformat()

    if normalized_source == "rss":
        with _get_connection() as conn:
            latest_same = conn.execute(
                """
                SELECT id, timestamp
                FROM imd_alerts
                WHERE zone = ? AND alert_level = ? AND event_type = ? AND source = 'rss'
                ORDER BY datetime(timestamp) DESC, id DESC
                LIMIT 1
                """,
                (normalized_zone, normalized_level, normalized_event),
            ).fetchone()

        if latest_same is not None:
            latest_timestamp_raw = str(latest_same["timestamp"])
            try:
                latest_timestamp = datetime.fromisoformat(latest_timestamp_raw)
                if latest_timestamp.tzinfo is None:
                    latest_timestamp = latest_timestamp.replace(tzinfo=timezone.utc)
                else:
                    latest_timestamp = latest_timestamp.astimezone(timezone.utc)
            except ValueError:
                latest_timestamp = None

            # Skip exact duplicate events and near-duplicate repeats within the dedup window.
            if latest_timestamp_raw == iso_timestamp:
                return {
                    "id": int(latest_same["id"]),
                    "zone": normalized_zone,
                    "alert_level": normalized_level,
                    "event_type": normalized_event,
                    "source": normalized_source,
                    "timestamp": latest_timestamp_raw,
                }

            if latest_timestamp is not None:
                now_utc = datetime.now(timezone.utc)
                if now_utc - latest_timestamp <= timedelta(minutes=max(1, dedup_window_minutes)):
                    return {
                        "id": int(latest_same["id"]),
                        "zone": normalized_zone,
                        "alert_level": normalized_level,
                        "event_type": normalized_event,
                        "source": normalized_source,
                        "timestamp": latest_timestamp_raw,
                    }

    with _get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO imd_alerts (zone, alert_level, event_type, source, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """,
            (normalized_zone, normalized_level, normalized_event, normalized_source, iso_timestamp),
        )
        alert_id = int(cursor.lastrowid)

    return {
        "id": alert_id,
        "zone": normalized_zone,
        "alert_level": normalized_level,
        "event_type": normalized_event,
        "source": normalized_source,
        "timestamp": iso_timestamp,
    }


def get_latest_imd_alert(zone: str) -> dict | None:
    normalized_zone = zone.strip().lower()
    with _get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, zone, alert_level, event_type, source, timestamp
            FROM imd_alerts
            WHERE zone = ?
            ORDER BY datetime(timestamp) DESC, id DESC
            LIMIT 1
            """,
            (normalized_zone,),
        ).fetchone()

    if row is None:
        return None

    return {
        "id": int(row["id"]),
        "zone": row["zone"],
        "alert_level": row["alert_level"],
        "event_type": row["event_type"],
        "source": row["source"],
        "timestamp": row["timestamp"],
    }


def list_recent_imd_alerts(limit: int = 30) -> list[dict]:
    safe_limit = max(1, min(limit, 200))
    with _get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, zone, alert_level, event_type, source, timestamp
            FROM imd_alerts
            ORDER BY datetime(timestamp) DESC, id DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

    return [
        {
            "id": int(row["id"]),
            "zone": row["zone"],
            "alert_level": row["alert_level"],
            "event_type": row["event_type"],
            "source": row["source"],
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]


def _detect_alert_level_and_event(title: str, summary: str) -> tuple[str, str] | None:
    text = f"{title} {summary}".lower()

    if "cyclone" in text:
        return ("red", "cyclone")
    if "very heavy rain" in text:
        return ("red", "rain")
    if "heavy rain" in text:
        return ("orange", "rain")
    if "warning" in text:
        if "heat" in text or "heatwave" in text:
            return ("yellow", "heatwave")
        return ("yellow", "rain")
    if "heatwave" in text:
        return ("orange", "heatwave")

    return None


def _map_zone(title: str, summary: str) -> str:
    text = f"{title} {summary}".lower()
    for zone, keywords in RSS_ZONE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return zone
    return "india"


def _parse_published_date(raw_value: str | None) -> datetime:
    if not raw_value:
        return datetime.now(timezone.utc)

    try:
        parsed = parsedate_to_datetime(raw_value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def fetch_imd_alerts(feed_url: str = "https://mausam.imd.gov.in/backend/dfw/imd_rss/IMD_Weather.xml") -> int:
    parsed_feed = feedparser.parse(feed_url)
    inserted = 0

    for entry in parsed_feed.entries:
        title = str(getattr(entry, "title", "") or "")
        summary = str(getattr(entry, "summary", "") or "")
        published_raw = str(getattr(entry, "published", "") or "")

        detected = _detect_alert_level_and_event(title, summary)
        if detected is None:
            continue

        alert_level, event_type = detected
        zone = _map_zone(title, summary)
        timestamp = _parse_published_date(published_raw)

        create_imd_alert(
            zone=zone,
            alert_level=alert_level,
            event_type=event_type,
            source="rss",
            timestamp=timestamp,
        )
        inserted += 1

    return inserted
