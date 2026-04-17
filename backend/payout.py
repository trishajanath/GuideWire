from __future__ import annotations


def adjust_coverage_hours(
    lost_hours: float,
    weather_risk_score: int | None = None,
    trigger_probability: float | None = None,
    trigger_name: str | None = None,
    trigger_value: float | None = None,
    trigger_threshold: float | None = None,
    severity_multiplier: float | None = None,
) -> dict[str, float | str]:
    """Adjust payable coverage hours using forecast risk signals.

    High forecast risk grants bonus coverage hours, while low risk can reduce
    payable hours slightly. This keeps payouts responsive to predictive weather
    output while bounded by business guardrails.
    """
    submitted_hours = max(0.0, float(lost_hours))
    adjustment = 0.0
    reason_parts: list[str] = []

    risk = None if weather_risk_score is None else max(0, min(int(weather_risk_score), 100))
    probability = None if trigger_probability is None else max(0.0, min(float(trigger_probability), 1.0))

    if risk is not None:
        if risk >= 85:
            adjustment += 1.5
            reason_parts.append("high forecast risk")
        elif risk >= 70:
            adjustment += 1.0
            reason_parts.append("elevated forecast risk")
        elif risk >= 55:
            adjustment += 0.5
            reason_parts.append("moderate forecast risk")
        elif risk <= 20:
            adjustment -= 0.75
            reason_parts.append("very low forecast risk")
        elif risk <= 35:
            adjustment -= 0.25
            reason_parts.append("low forecast risk")

    if probability is not None:
        if probability >= 0.9:
            adjustment += 0.5
            reason_parts.append("very high trigger probability")
        elif probability >= 0.75:
            adjustment += 0.25
            reason_parts.append("high trigger probability")
        elif probability <= 0.15:
            adjustment -= 0.25
            reason_parts.append("very low trigger probability")

    # Trigger-specific future-duration uplift.
    # This models expected continuation of an ongoing disruption beyond
    # currently reported lost hours.
    trigger = (trigger_name or "").strip().lower()
    relevant_triggers = {
        "heavy_rain",
        "extreme_heat",
        "cyclone_alert",
        "urban_flooding",
        "poor_visibility",
        "demand_collapse",
        "order_pause",
        "zone_shutdown",
        "platform_outage",
        "curfew",
        "public_health_emergency",
        "civil_disturbance",
        "infrastructure_failure",
    }
    if trigger in relevant_triggers:
        sev = max(1.0, float(severity_multiplier or 1.0))
        exceed_ratio = 0.0
        if trigger_threshold is not None and trigger_threshold > 0 and trigger_value is not None:
            tv = float(trigger_value)
            tt = float(trigger_threshold)
            if trigger == "poor_visibility":
                exceed_ratio = max(0.0, (tt - tv) / tt)
            else:
                exceed_ratio = max(0.0, (tv - tt) / tt)

        # Base continuation for active disruptions, increased by severity and
        # threshold overshoot. This creates intuitive outcomes like
        # 1h heavy rain -> ~2-3h payable when the event is forecast to persist.
        continuation_hours = (0.55 * sev) + (1.35 * exceed_ratio * sev)
        continuation_hours = max(0.0, min(3.0, continuation_hours))

        # External declarations (curfew, health emergency, etc.) tend to persist
        # longer than weather spikes.
        if trigger in {"curfew", "public_health_emergency", "civil_disturbance", "infrastructure_failure"}:
            continuation_hours = max(continuation_hours, 1.5)

        if continuation_hours > 0:
            uplift = round(continuation_hours, 2)
            adjustment += uplift
            reason_parts.append("ml duration forecast")

    min_hours = 1.0 if submitted_hours >= 1.0 else max(0.5, submitted_hours)
    adjusted_hours = submitted_hours + adjustment
    # Prevent over-crediting on very short base claims while still allowing
    # larger events to receive meaningful continuation uplift.
    if submitted_hours <= 2.0:
        adjusted_hours = min(adjusted_hours, submitted_hours + 2.0)
    elif submitted_hours <= 4.0:
        adjusted_hours = min(adjusted_hours, submitted_hours + 3.0)
    else:
        adjusted_hours = min(adjusted_hours, submitted_hours + 4.0)
    adjusted_hours = max(min_hours, min(adjusted_hours, 12.0))
    adjusted_hours = round(adjusted_hours, 2)
    effective_adjustment = round(adjusted_hours - submitted_hours, 2)

    if not reason_parts:
        reason = "No forecast-risk adjustment"
    else:
        reason = " + ".join(reason_parts)

    return {
        "submitted_hours": round(submitted_hours, 2),
        "adjusted_hours": adjusted_hours,
        "coverage_hour_adjustment": effective_adjustment,
        "adjustment_reason": reason,
    }


def calculate_payout_amount(
    lost_hours: float,
    hourly_rate: float,
    multiplier: float,
    daily_cap: float,
) -> float:
    payout = lost_hours * hourly_rate * multiplier
    return round(min(payout, daily_cap), 2)
