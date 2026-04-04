from __future__ import annotations

from datetime import datetime, timezone

try:
    from .fraud_engine import assess_fraud, GPSPoint, ClaimRecord
except ImportError:
    from fraud_engine import assess_fraud, GPSPoint, ClaimRecord


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


def validate_claim(
    *,
    worker_id: str,
    weather_risk_score: int,
    anomaly_score: float,
    weather_timestamp: datetime | None,
    gps_timestamp: datetime | None,
    mock_eligibility_db: dict[str, bool],
    # New fraud engine inputs
    worker_gps: GPSPoint | None = None,
    claimed_zone_id: str = "",
    claim_history: list[ClaimRecord] | None = None,
    zone_has_active_trigger: bool = False,
    previous_gps: GPSPoint | None = None,
    login_timestamp: datetime | None = None,
    active_hours_today: float = 0.0,
    is_logged_in: bool = True,
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

    # ── Real 5-layer fraud assessment ──────────────────────────────────
    now = datetime.now(timezone.utc)
    fraud_assessment = assess_fraud(
        worker_gps=worker_gps,
        claimed_zone_id=claimed_zone_id,
        claim_history=claim_history or [],
        weather_risk_score=weather_risk_score,
        zone_anomaly_score=anomaly_score,
        zone_has_active_trigger=zone_has_active_trigger,
        previous_gps=previous_gps,
        login_timestamp=login_timestamp,
        claim_timestamp=now,
        active_hours_today=active_hours_today,
        is_logged_in=is_logged_in,
    )
    fraud_score = fraud_assessment.overall_score

    base_result = {
        "fraud_score": round(fraud_score, 3),
        "fraud_risk": fraud_assessment.risk_level,
        "fraud_signals": fraud_assessment.to_dict()["signals"],
        "fraud_explanation": fraud_assessment.explanation,
    }

    if not fresh_data:
        return {**base_result, "approved": False, "payout": 0}

    if not breached:
        return {**base_result, "approved": False, "payout": 0}

    if not source_agreement:
        return {**base_result, "approved": False, "payout": 0}

    if not eligible_worker:
        return {**base_result, "approved": False, "payout": 0}

    if not fraud_assessment.allow_payout:
        return {**base_result, "approved": False, "payout": 0}

    return {**base_result, "approved": True, "payout": 720}
