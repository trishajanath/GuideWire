from __future__ import annotations

import logging

logger = logging.getLogger("guidewire.plan_recommendation")


def _rule_based_recommend(avg_daily_hours: float, zone_risk: float) -> dict:
    """Fallback rule-based recommender used when ML model is unavailable."""
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


def recommend_plan(avg_daily_hours: float, zone_risk: float) -> dict:
    """Recommend a plan using XGBoost model, falling back to rules."""
    try:
        from ml.plan_model import predict

        result = predict(avg_daily_hours, zone_risk)
        if result is not None:
            return result
    except Exception as exc:
        logger.debug("ML plan model unavailable, using rules: %s", exc)

    return _rule_based_recommend(avg_daily_hours, zone_risk)
