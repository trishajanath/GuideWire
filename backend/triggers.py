from __future__ import annotations


def _trigger_metadata() -> list[dict[str, object]]:
    return [
        {
            "trigger": "heavy_rainfall",
            "category": "weather",
            "threshold": ">30mm in 3 hours",
            "data_sources": ["OpenWeather", "IMD"],
            "severity_multiplier": 1.2,
            "payout_activation": "Automatic",
        },
        {
            "trigger": "extreme_heat",
            "category": "weather",
            "threshold": ">42C sustained",
            "data_sources": ["OpenWeather", "IMD"],
            "severity_multiplier": 1.15,
            "payout_activation": "Automatic",
        },
        {
            "trigger": "cyclone_alert",
            "category": "weather",
            "threshold": "IMD orange/red alert",
            "data_sources": ["IMD warnings"],
            "severity_multiplier": 1.5,
            "payout_activation": "Automatic",
        },
        {
            "trigger": "urban_flooding",
            "category": "weather",
            "threshold": "road flooding or severe standing water",
            "data_sources": ["IMD warnings", "worker reports"],
            "severity_multiplier": 1.4,
            "payout_activation": "Automatic",
        },
        {
            "trigger": "poor_visibility",
            "category": "weather",
            "threshold": "<100m visibility",
            "data_sources": ["OpenWeather", "IMD", "visibility sensors"],
            "severity_multiplier": 1.1,
            "payout_activation": "Automatic",
        },
    ]


def _build_response(trigger: str, breached: bool, value: float | int) -> dict:
    return {
        "trigger": trigger,
        "breached": breached,
        "value": value,
    }


def check_rainfall_trigger(rainfall_mm_last_3_hours: float) -> dict:
    breached = rainfall_mm_last_3_hours > 30
    return _build_response("heavy_rainfall", breached, rainfall_mm_last_3_hours)


def check_temperature_trigger(temperature_celsius: float) -> dict:
    breached = temperature_celsius > 42
    return _build_response("extreme_heat", breached, temperature_celsius)


def check_cyclone_alert_trigger(imd_alert_level: str) -> dict:
    breached = imd_alert_level.lower() in {"orange", "red"}
    return _build_response("cyclone_alert", breached, imd_alert_level)


def check_urban_flooding_trigger(
    urban_flooding: bool,
    rainfall_mm_last_3_hours: float,
    visibility_meters: float | None,
) -> dict:
    breached = bool(urban_flooding)
    if not breached and rainfall_mm_last_3_hours >= 60 and visibility_meters is not None and visibility_meters < 500:
        breached = True
    return _build_response("urban_flooding", breached, rainfall_mm_last_3_hours)


def check_poor_visibility_trigger(visibility_meters: float | None) -> dict:
    breached = visibility_meters is not None and visibility_meters < 100
    return _build_response("poor_visibility", breached, visibility_meters if visibility_meters is not None else 0)


def check_demand_drop_trigger(current_orders: int, average_orders: float) -> dict:
    if average_orders <= 0:
        return _build_response("demand_drop", False, current_orders)

    breached = current_orders < (0.6 * average_orders)
    return _build_response("demand_drop", breached, current_orders)


def check_order_allocation_pause_trigger(orders_in_3_hours: int) -> dict:
    breached = orders_in_3_hours < 2
    return _build_response("order_allocation_pause", breached, orders_in_3_hours)


def validate_trigger_confirmation(
    primary_source: bool,
    secondary_source: bool,
    platform_impact: bool,
    worker_active: bool,
) -> dict:
    if not primary_source:
        return {"trigger_confirmed": False, "failed_stage": "primary_source"}

    if not secondary_source:
        return {"trigger_confirmed": False, "failed_stage": "secondary_source"}

    if not platform_impact:
        return {"trigger_confirmed": False, "failed_stage": "platform_impact"}

    if not worker_active:
        return {"trigger_confirmed": False, "failed_stage": "worker_active"}

    return {"trigger_confirmed": True, "failed_stage": None}


def evaluate_trigger(
    trigger: str,
    breached: bool,
    primary_source: bool,
    secondary_source: bool,
    platform_impact: bool,
    worker_active: bool,
) -> dict:
    if not breached:
        return {
            "trigger": trigger,
            "status": "NO_TRIGGER",
            "reason": "No threshold breach detected",
        }

    validation = validate_trigger_confirmation(
        primary_source=primary_source,
        secondary_source=secondary_source,
        platform_impact=platform_impact,
        worker_active=worker_active,
    )

    if validation["trigger_confirmed"]:
        return {
            "trigger": trigger,
            "status": "CONFIRMED",
            "reason": "Trigger breached and all validation checks passed",
        }

    return {
        "trigger": trigger,
        "status": "REJECTED",
        "reason": f"Validation failed at {validation['failed_stage']}",
    }


def calculate_payout(
    lost_hours: float,
    hourly_rate: float,
    severity_multiplier: float,
    daily_cap: float,
) -> dict:
    base_amount = lost_hours * hourly_rate * severity_multiplier
    final_payout = min(base_amount, daily_cap)

    return {
        "base_amount": base_amount,
        "final_payout": final_payout,
        "capped": final_payout < base_amount,
    }


def assess_basic_fraud_risk(
    sudden_location_change: bool,
    worker_inactive_but_claiming_active: bool,
    repeated_triggers_within_short_time: bool,
) -> dict:
    risk_points = sum(
        [
            sudden_location_change,
            worker_inactive_but_claiming_active,
            repeated_triggers_within_short_time,
        ]
    )

    if risk_points == 0:
        return {"fraud_risk": "LOW", "allow_payout": True}

    if risk_points == 1:
        return {"fraud_risk": "MEDIUM", "allow_payout": True}

    return {"fraud_risk": "HIGH", "allow_payout": False}


def evaluate_trigger_pipeline(
    *,
    rainfall_mm_last_3_hours: float,
    temperature_celsius: float,
    visibility_meters: float | None = None,
    urban_flooding: bool = False,
    imd_alert_level: str = "none",
    current_orders: int,
    average_orders: float,
    orders_in_3_hours: int,
    worker_logged_in: bool,
    active_hours: float,
    sudden_location_change: bool = False,
    worker_inactive_but_claiming_active: bool = False,
    repeated_triggers_within_short_time: bool = False,
    hourly_rate: float = 100,
    daily_cap: float = 800,
    severity_multiplier: float = 1.2,
    assumed_shift_hours: float = 8.0,
) -> dict:
    rainfall_trigger = check_rainfall_trigger(rainfall_mm_last_3_hours)
    temperature_trigger = check_temperature_trigger(temperature_celsius)
    cyclone_trigger = check_cyclone_alert_trigger(imd_alert_level)
    flooding_trigger = check_urban_flooding_trigger(urban_flooding, rainfall_mm_last_3_hours, visibility_meters)
    visibility_trigger = check_poor_visibility_trigger(visibility_meters)
    demand_drop_trigger = check_demand_drop_trigger(current_orders, average_orders)
    pause_trigger = check_order_allocation_pause_trigger(orders_in_3_hours)

    trigger_candidates = [
        rainfall_trigger,
        temperature_trigger,
        cyclone_trigger,
        flooding_trigger,
        visibility_trigger,
        demand_drop_trigger,
        pause_trigger,
    ]
    detected_trigger = next((item for item in trigger_candidates if item["breached"]), None)

    fraud = assess_basic_fraud_risk(
        sudden_location_change=sudden_location_change,
        worker_inactive_but_claiming_active=worker_inactive_but_claiming_active,
        repeated_triggers_within_short_time=repeated_triggers_within_short_time,
    )

    if detected_trigger is None:
        return {
            "trigger_status": "NO_TRIGGER",
            "validation": "NOT_REQUIRED",
            "fraud_risk": fraud["fraud_risk"],
            "payout": 0,
            "message": "No threshold breach detected",
            "trigger_type": "none",
        }

    worker_active = worker_logged_in and active_hours > 0
    validation = evaluate_trigger(
        trigger=detected_trigger["trigger"],
        breached=True,
        primary_source=bool(
            rainfall_trigger["breached"]
            or temperature_trigger["breached"]
            or cyclone_trigger["breached"]
            or flooding_trigger["breached"]
            or visibility_trigger["breached"]
        ),
        secondary_source=bool(demand_drop_trigger["breached"] or pause_trigger["breached"]),
        platform_impact=bool(demand_drop_trigger["breached"] or pause_trigger["breached"]),
        worker_active=worker_active,
    )

    if validation["status"] != "CONFIRMED":
        return {
            "trigger_status": "REJECTED",
            "validation": validation["reason"],
            "fraud_risk": fraud["fraud_risk"],
            "payout": 0,
            "message": validation["reason"],
            "trigger_type": detected_trigger["trigger"],
        }

    if not fraud["allow_payout"]:
        return {
            "trigger_status": "REJECTED",
            "validation": "PASSED",
            "fraud_risk": fraud["fraud_risk"],
            "payout": 0,
            "message": "Fraud risk too high, payout held for review",
            "trigger_type": detected_trigger["trigger"],
        }

    lost_hours = max(0.0, assumed_shift_hours - active_hours)
    payout_result = calculate_payout(
        lost_hours=lost_hours,
        hourly_rate=hourly_rate,
        severity_multiplier=severity_multiplier,
        daily_cap=daily_cap,
    )
    payout = round(payout_result["final_payout"], 2)

    if payout <= 0:
        return {
            "trigger_status": "CONFIRMED",
            "validation": "PASSED",
            "fraud_risk": fraud["fraud_risk"],
            "payout": 0,
            "message": "Trigger confirmed, but no compensable lost hours were reported",
            "trigger_type": detected_trigger["trigger"],
        }

    return {
        "trigger_status": "CONFIRMED",
        "validation": "PASSED",
        "fraud_risk": fraud["fraud_risk"],
        "payout": payout,
        "message": "Trigger confirmed and payout approved",
        "trigger_type": detected_trigger["trigger"],
    }