from __future__ import annotations


def calculate_zone_activity_score(data: dict) -> dict:
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
