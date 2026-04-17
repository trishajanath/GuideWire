"""Synthetic data generators for FairRoute ML models.

Generates domain-realistic training data based on:
- IMD weather thresholds (rainfall >30mm/3h, temp >42°C)
- Indian monsoon seasonal patterns
- Gig worker zone activity patterns
- Plan recommendation heuristics from README
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def generate_weather_risk_data(n_samples: int = 6000, seed: int = 42) -> pd.DataFrame:
    """Generate labelled weather data for XGBoost trigger-breach classifier.

    Features mirror real OpenWeather API outputs.  Labels are derived from
    IMD-aligned thresholds with added noise and overlap to force the model
    to learn non-trivial decision boundaries.
    """
    rng = np.random.default_rng(seed)

    # --- 60 % normal conditions ---
    n_normal = int(n_samples * 0.60)
    normal = pd.DataFrame(
        {
            "rainfall": rng.exponential(scale=5.0, size=n_normal).clip(0, 28),
            "temperature": rng.normal(loc=32, scale=4, size=n_normal).clip(18, 40),
            "humidity": rng.normal(loc=55, scale=15, size=n_normal).clip(20, 95),
            "wind_speed": rng.exponential(scale=8, size=n_normal).clip(0, 35),
        }
    )
    normal["trigger_breach"] = 0
    normal["risk_score"] = (
        (normal["rainfall"] / 30 * 15)
        + (normal["temperature"] / 42 * 10)
        + (normal["humidity"] / 100 * 5)
        + (normal["wind_speed"] / 40 * 5)
        + rng.normal(0, 3, n_normal)
    ).clip(0, 45).astype(int)

    # --- 15 % heavy rainfall triggers ---
    n_rain = int(n_samples * 0.15)
    rain = pd.DataFrame(
        {
            "rainfall": rng.normal(loc=55, scale=18, size=n_rain).clip(25, 120),
            "temperature": rng.normal(loc=28, scale=4, size=n_rain).clip(18, 38),
            "humidity": rng.normal(loc=82, scale=8, size=n_rain).clip(60, 100),
            "wind_speed": rng.normal(loc=25, scale=12, size=n_rain).clip(0, 60),
        }
    )
    rain["trigger_breach"] = (rain["rainfall"] > 30).astype(int)
    rain["risk_score"] = (
        40 + (rain["rainfall"] - 30).clip(0) * 0.5
        + rain["humidity"] / 100 * 10
        + rain["wind_speed"] / 40 * 10
        + rng.normal(0, 5, n_rain)
    ).clip(40, 100).astype(int)

    # --- 10 % extreme heat triggers ---
    n_heat = int(n_samples * 0.10)
    heat = pd.DataFrame(
        {
            "rainfall": rng.exponential(scale=2.0, size=n_heat).clip(0, 10),
            "temperature": rng.normal(loc=45, scale=3, size=n_heat).clip(39, 52),
            "humidity": rng.normal(loc=35, scale=10, size=n_heat).clip(10, 60),
            "wind_speed": rng.normal(loc=15, scale=8, size=n_heat).clip(0, 40),
        }
    )
    heat["trigger_breach"] = (heat["temperature"] > 42).astype(int)
    heat["risk_score"] = (
        30 + (heat["temperature"] - 42).clip(0) * 4
        + rng.normal(0, 5, n_heat)
    ).clip(30, 100).astype(int)

    # --- 8 % high wind ---
    n_wind = int(n_samples * 0.08)
    wind = pd.DataFrame(
        {
            "rainfall": rng.exponential(scale=4.0, size=n_wind).clip(0, 20),
            "temperature": rng.normal(loc=30, scale=5, size=n_wind).clip(18, 42),
            "humidity": rng.normal(loc=50, scale=15, size=n_wind).clip(15, 90),
            "wind_speed": rng.normal(loc=55, scale=12, size=n_wind).clip(35, 90),
        }
    )
    wind["trigger_breach"] = (wind["wind_speed"] > 40).astype(int)
    wind["risk_score"] = (
        20 + wind["wind_speed"] / 90 * 50
        + rng.normal(0, 5, n_wind)
    ).clip(20, 100).astype(int)

    # --- 7 % edge cases (near thresholds — hardest to classify) ---
    n_edge = n_samples - n_normal - n_rain - n_heat - n_wind
    edge = pd.DataFrame(
        {
            "rainfall": rng.normal(loc=30, scale=5, size=n_edge).clip(20, 40),
            "temperature": rng.normal(loc=42, scale=2, size=n_edge).clip(38, 46),
            "humidity": rng.normal(loc=70, scale=10, size=n_edge).clip(40, 95),
            "wind_speed": rng.normal(loc=40, scale=8, size=n_edge).clip(25, 55),
        }
    )
    # Probabilistic labelling for edge cases
    breach_prob = (
        (edge["rainfall"] - 30).clip(0) / 10 * 0.4
        + (edge["temperature"] - 42).clip(0) / 4 * 0.35
        + (edge["wind_speed"] - 40).clip(0) / 15 * 0.25
    ).clip(0, 1)
    edge["trigger_breach"] = (rng.random(n_edge) < breach_prob).astype(int)
    edge["risk_score"] = (
        35 + breach_prob * 50 + rng.normal(0, 6, n_edge)
    ).clip(25, 100).astype(int)

    df = pd.concat([normal, rain, heat, wind, edge], ignore_index=True)
    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


def generate_zone_activity_data(n_samples: int = 3000, seed: int = 42) -> pd.DataFrame:
    """Generate zone activity data for Isolation Forest anomaly detection.

    ~80 % normal operations, ~20 % disruptions to let the forest learn the
    boundary.
    """
    rng = np.random.default_rng(seed)

    n_normal = int(n_samples * 0.80)
    n_disrupted = n_samples - n_normal

    # Normal: most workers active, reasonable idle ratios
    normal_active = rng.integers(18, 50, size=n_normal)
    normal_idle = rng.integers(3, 15, size=n_normal)
    normal_dist = rng.normal(loc=4.5, scale=1.0, size=n_normal).clip(2.0, 8.0)

    # Disrupted: low active count, high idle, shorter distances
    disr_active = rng.integers(2, 15, size=n_disrupted)
    disr_idle = rng.integers(15, 45, size=n_disrupted)
    disr_dist = rng.normal(loc=2.0, scale=0.8, size=n_disrupted).clip(0.5, 4.0)

    df = pd.DataFrame(
        {
            "active_workers": np.concatenate([normal_active, disr_active]),
            "idle_workers": np.concatenate([normal_idle, disr_idle]),
            "avg_distance": np.concatenate([normal_dist, disr_dist]),
        }
    )
    df["total_workers"] = df["active_workers"] + df["idle_workers"]
    df["idle_ratio"] = df["idle_workers"] / df["total_workers"]
    df["active_ratio"] = df["active_workers"] / df["total_workers"]

    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


def generate_plan_recommendation_data(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generate labelled data for XGBoost plan recommendation.

    Labels: 0 = basic, 1 = standard, 2 = premium
    Features aligned with README: avg_daily_hours, zone_risk, plus
    engineered interaction features and worker profile features.
    """
    rng = np.random.default_rng(seed)

    hours = rng.uniform(1, 14, size=n_samples)
    zone_risk = rng.uniform(0, 100, size=n_samples)
    income_bracket = rng.choice([0, 1, 2], size=n_samples, p=[0.3, 0.5, 0.2]).astype(float)
    claim_history = rng.poisson(lam=2, size=n_samples).clip(0, 10).astype(float) / 10.0
    family_size_norm = rng.uniform(0.2, 1.0, size=n_samples)
    tenure_norm = rng.uniform(0, 1.0, size=n_samples)

    # Derive noisy labels consistent with README logic + new features
    labels = np.zeros(n_samples, dtype=int)

    for i in range(n_samples):
        h, z = hours[i], zone_risk[i]
        inc, cl, fam, ten = income_bracket[i], claim_history[i], family_size_norm[i], tenure_norm[i]
        score = (
            h * 0.4
            + z * 0.03
            + inc * 0.8
            + cl * 2.0       # more past claims → need better plan
            + fam * 1.5      # bigger family → premium
            + ten * 0.5      # tenure nudges up
            + rng.normal(0, 0.8)
        )

        if score > 6.5:
            labels[i] = 2  # premium
        elif score > 4.0:
            labels[i] = 1  # standard
        else:
            labels[i] = 0  # basic

        # High risk zones nudge towards higher plans
        if z > 75 and labels[i] < 2:
            if rng.random() < 0.35:
                labels[i] += 1

        # Very low hours should rarely be premium
        if h < 3 and labels[i] == 2:
            if rng.random() < 0.7:
                labels[i] = 1

        # Low income bracket shouldn't be pushed to premium
        if inc == 0 and labels[i] == 2:
            if rng.random() < 0.5:
                labels[i] = 1

    df = pd.DataFrame(
        {
            "avg_daily_hours": np.round(hours, 1),
            "zone_risk": np.round(zone_risk, 1),
            "income_bracket": income_bracket,
            "claim_history": np.round(claim_history, 2),
            "family_size_norm": np.round(family_size_norm, 2),
            "tenure_norm": np.round(tenure_norm, 2),
            "label": labels,
        }
    )
    return df.sample(frac=1, random_state=seed).reset_index(drop=True)
