from __future__ import annotations


def calculate_weather_risk(data: dict) -> dict:
    risk_score = 0
    breached_rules: list[tuple[str, int]] = []

    rainfall = float(data.get("rainfall", 0.0))
    temperature = float(data.get("temperature", 0.0))
    humidity = float(data.get("humidity", 0.0))
    wind_speed = float(data.get("wind_speed", 0.0))

    if rainfall > 30:
        risk_score += 40
        breached_rules.append(("heavy_rainfall", 40))

    if temperature > 42:
        risk_score += 30
        breached_rules.append(("extreme_heat", 30))

    if humidity > 80:
        risk_score += 10
        breached_rules.append(("high_humidity", 10))

    if wind_speed > 40:
        risk_score += 20
        breached_rules.append(("high_wind", 20))

    normalized_score = max(0, min(risk_score, 100))
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
