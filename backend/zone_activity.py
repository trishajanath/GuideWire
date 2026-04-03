from __future__ import annotations

import logging

logger = logging.getLogger("guidewire.zone_activity")


def _rule_based_zone_activity(data: dict) -> dict:
    """Fallback rule-based scorer used when ML model is unavailable."""
    active_workers = int(data.get("active_workers", 0))
    idle_workers = int(data.get("idle_workers", 0))

    total_workers = active_workers + idle_workers
    idle_ratio = (idle_workers / total_workers) if total_workers > 0 else 0.0

    if idle_ratio > 0.6:
        anomaly_score = -0.7
    elif idle_ratio > 0.4:
        anomaly_score = -0.4
    else:
        anomaly_score = 0.5

    status = "disruption" if anomaly_score < 0 else "normal"

    return {
        "anomaly_score": anomaly_score,
        "status": status,
        "idle_ratio": idle_ratio,
    }


def calculate_zone_activity_score(data: dict) -> dict:
    """Score zone activity using Isolation Forest, falling back to rules."""
    try:
        from ml.zone_model import predict

        result = predict(data)
        if result is not None:
            return result
    except Exception as exc:
        logger.debug("ML zone model unavailable, using rules: %s", exc)

    return _rule_based_zone_activity(data)
