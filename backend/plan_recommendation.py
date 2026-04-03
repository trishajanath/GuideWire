from __future__ import annotations


def recommend_plan(avg_daily_hours: float, zone_risk: float) -> dict:
    reasoning: list[str] = []

    if avg_daily_hours > 8:
        recommended_plan = "premium"
        confidence = 0.82
        reasoning.append("High work hours")
    elif avg_daily_hours >= 5:
        recommended_plan = "standard"
        confidence = 0.72
        reasoning.append("Moderate work hours")
    else:
        recommended_plan = "basic"
        confidence = 0.74
        reasoning.append("Lower work hours")

    if zone_risk >= 75:
        confidence += 0.1
        reasoning.append("High risk zone")
    elif zone_risk >= 40:
        confidence += 0.06
        reasoning.append("Medium risk zone")
    else:
        confidence -= 0.04
        reasoning.append("Low risk zone")

    confidence = round(max(0.5, min(confidence, 0.95)), 2)

    return {
        "recommended_plan": recommended_plan,
        "confidence": confidence,
        "reasoning": reasoning,
    }
