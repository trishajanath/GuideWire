from __future__ import annotations

import random
from datetime import datetime, timezone


def is_data_fresh(
    weather_timestamp: datetime | None,
    gps_timestamp: datetime | None,
    weather_max_age_minutes: int = 30,
    gps_max_age_minutes: int = 15,
) -> bool:
    now = datetime.now(timezone.utc)
    weather_ts = weather_timestamp or now
    gps_ts = gps_timestamp or now

    if weather_ts.tzinfo is None:
        weather_ts = weather_ts.replace(tzinfo=timezone.utc)

    if gps_ts.tzinfo is None:
        gps_ts = gps_ts.replace(tzinfo=timezone.utc)

    weather_age_minutes = (now - weather_ts).total_seconds() / 60.0
    gps_age_minutes = (now - gps_ts).total_seconds() / 60.0

    return weather_age_minutes <= weather_max_age_minutes and gps_age_minutes <= gps_max_age_minutes


def threshold_breach(weather_risk_score: int, anomaly_score: float) -> bool:
    return weather_risk_score > 60 and anomaly_score < -0.3


def multi_source_agreement(source_signals: list[bool]) -> bool:
    return sum(1 for signal in source_signals if signal) >= 2


def check_worker_eligibility(worker_id: str, mock_eligibility_db: dict[str, bool]) -> bool:
    return mock_eligibility_db.get(worker_id, False)


def generate_fraud_score() -> float:
    return round(random.uniform(0, 1), 2)


def validate_claim(
    *,
    worker_id: str,
    weather_risk_score: int,
    anomaly_score: float,
    weather_timestamp: datetime | None,
    gps_timestamp: datetime | None,
    mock_eligibility_db: dict[str, bool],
) -> dict:
    fresh_data = is_data_fresh(weather_timestamp, gps_timestamp)
    breached = threshold_breach(weather_risk_score, anomaly_score)

    simulated_sources = [
        weather_risk_score > 60,
        anomaly_score < -0.3,
        weather_risk_score > 80,
    ]
    source_agreement = multi_source_agreement(simulated_sources)
    eligible_worker = check_worker_eligibility(worker_id, mock_eligibility_db)

    fraud_score = generate_fraud_score()

    if not fresh_data:
        return {"approved": False, "fraud_score": fraud_score, "payout": 0}

    if not breached:
        return {"approved": False, "fraud_score": fraud_score, "payout": 0}

    if not source_agreement:
        return {"approved": False, "fraud_score": fraud_score, "payout": 0}

    if not eligible_worker:
        return {"approved": False, "fraud_score": fraud_score, "payout": 0}

    if fraud_score > 0.85:
        return {"approved": False, "fraud_score": fraud_score, "payout": 0}

    return {"approved": True, "fraud_score": fraud_score, "payout": 720}
