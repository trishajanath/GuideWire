from __future__ import annotations


def detect_trigger(weather_risk_score: int, anomaly_score: float, trigger_type: str) -> dict:
    if weather_risk_score > 60 and anomaly_score < -0.3:
        return {
            "trigger": True,
            "type": trigger_type if trigger_type != "none" else "heavy_rainfall",
            "severity": 1.2,
        }

    if weather_risk_score > 80:
        return {
            "trigger": False,
            "type": "pre_alert",
            "severity": 0.8,
        }

    return {
        "trigger": False,
        "type": "none",
        "severity": 0.0,
    }
