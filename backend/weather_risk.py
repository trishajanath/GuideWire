from __future__ import annotations

import logging

logger = logging.getLogger("guidewire.weather_risk")


def _rule_based_weather_risk(data: dict) -> dict:
    """Fallback rule-based scorer used when ML models are unavailable."""
    # Keep a small baseline so normal conditions are not shown as hard zero.
    risk_score = 8.0
    breached_rules: list[tuple[str, int]] = []

    rainfall = float(data.get("rainfall", 0.0))
    temperature = float(data.get("temperature", 0.0))
    humidity = float(data.get("humidity", 0.0))
    wind_speed = float(data.get("wind_speed", 0.0))

    # Graduated components (normal weather still yields a low non-zero score).
    risk_score += min(rainfall * 1.2, 35.0)
    risk_score += max(0.0, (temperature - 26.0) * 1.6)
    risk_score += max(0.0, (humidity - 45.0) * 0.22)
    risk_score += max(0.0, (wind_speed - 10.0) * 0.55)

    # Sharp boosts for severe threshold breaches.
    if rainfall > 30:
        risk_score += 20
        breached_rules.append(("heavy_rainfall", 40))

    if temperature > 42:
        risk_score += 15
        breached_rules.append(("extreme_heat", 30))

    if humidity > 80:
        risk_score += 8
        breached_rules.append(("high_humidity", 10))

    if wind_speed > 40:
        risk_score += 15
        breached_rules.append(("high_wind", 20))

    normalized_score = max(0, min(int(round(risk_score)), 100))
    trigger_probability = round(normalized_score / 100.0, 2)

    if not breached_rules:
        trigger_type = "none"
    else:
        breached_rules.sort(key=lambda item: item[1], reverse=True)
        trigger_type = breached_rules[0][0]

    return {
        "weather_risk_score": normalized_score,
        "trigger_probability": trigger_probability,
        "trigger_type": trigger_type,
    }


def calculate_weather_risk(data: dict) -> dict:
    """Score weather risk using XGBoost model, falling back to rules."""
    try:
        from ml.weather_model import predict

        result = predict(data)
        if result is not None:
            return result
    except Exception as exc:
        logger.debug("ML weather model unavailable, using rules: %s", exc)

    return _rule_based_weather_risk(data)
