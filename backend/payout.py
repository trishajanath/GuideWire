from __future__ import annotations


def calculate_payout_amount(
    lost_hours: float,
    hourly_rate: float,
    multiplier: float,
    daily_cap: float,
) -> float:
    payout = lost_hours * hourly_rate * multiplier
    return round(min(payout, daily_cap), 2)
