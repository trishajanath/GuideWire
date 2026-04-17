from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split, cross_val_score, KFold
import joblib

logger = logging.getLogger("guidewire.premium_engine")

BASE_PREMIUMS: dict[str, float] = {
    "Basic": 49.0,
    "Standard": 69.0,
    "Premium": 99.0,
}

ZONE_PROFILES: list[dict[str, object]] = [
    {
        "zone": "Bengaluru - Whitefield",
        "city": "Bengaluru",
        "flood_score": 0.26,
        "annual_rainfall_mm": 970,
        "heat_days_gt_40c": 14,
    },
    {
        "zone": "Bengaluru - Koramangala",
        "city": "Bengaluru",
        "flood_score": 0.19,
        "annual_rainfall_mm": 940,
        "heat_days_gt_40c": 12,
    },
    {
        "zone": "Mumbai - Andheri",
        "city": "Mumbai",
        "flood_score": 0.82,
        "annual_rainfall_mm": 2350,
        "heat_days_gt_40c": 21,
    },
    {
        "zone": "Chennai - T Nagar",
        "city": "Chennai",
        "flood_score": 0.73,
        "annual_rainfall_mm": 1390,
        "heat_days_gt_40c": 31,
    },
    {
        "zone": "Kochi - Ernakulam",
        "city": "Kochi",
        "flood_score": 0.68,
        "annual_rainfall_mm": 3100,
        "heat_days_gt_40c": 9,
    },
    {
        "zone": "Kolkata - Salt Lake",
        "city": "Kolkata",
        "flood_score": 0.64,
        "annual_rainfall_mm": 1600,
        "heat_days_gt_40c": 22,
    },
    {
        "zone": "Hyderabad - Gachibowli",
        "city": "Hyderabad",
        "flood_score": 0.34,
        "annual_rainfall_mm": 820,
        "heat_days_gt_40c": 26,
    },
    {
        "zone": "Delhi - South Delhi",
        "city": "Delhi",
        "flood_score": 0.28,
        "annual_rainfall_mm": 760,
        "heat_days_gt_40c": 34,
    },
]

FEATURE_COLUMNS = [
    "flood_score",
    "rainfall_norm",
    "heat_days_norm",
    "monsoon_flag",
    "tenure_norm",
    "claim_ratio",
    "hours_norm",
    "flood_x_monsoon",      # interaction: flood risk amplified during monsoon
    "hours_x_claim_ratio",  # interaction: high hours + high claims = risky
]

MONTHS_IN_MONSOON = {6, 7, 8, 9}

_PREMIUM_MODEL_PATH = Path(__file__).parent / "ml" / "models" / "premium_gbr.joblib"

_model: GradientBoostingRegressor | None = None
_model_r2: float | None = None
_model_mae: float | None = None
_model_coefficients: dict[str, float] = {}
_model_intercept: float | None = None
_trained_at: str | None = None


@dataclass(frozen=True)
class PremiumRequestInput:
    zone: str
    plan: Literal["Basic", "Standard", "Premium"]
    month: int
    tenure_months: float
    claims_paid: float
    premium_paid: float
    avg_daily_hours: float


def _normalize_zone(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _zone_profile_lookup(zone: str) -> dict[str, object]:
    normalized = _normalize_zone(zone)
    for profile in ZONE_PROFILES:
        zone_name = str(profile["zone"]).lower()
        city_name = str(profile["city"]).lower()
        if normalized == zone_name or normalized == city_name or normalized in zone_name or normalized in city_name:
            return profile
    # Use the average historical profile if the zone is unknown.
    flood_score = float(np.mean([float(item["flood_score"]) for item in ZONE_PROFILES]))
    return {
        "zone": zone.title().strip() or "Unknown Zone",
        "city": zone.title().strip() or "Unknown City",
        "flood_score": flood_score,
        "annual_rainfall_mm": float(np.mean([float(item["annual_rainfall_mm"]) for item in ZONE_PROFILES])),
        "heat_days_gt_40c": float(np.mean([float(item["heat_days_gt_40c"]) for item in ZONE_PROFILES])),
    }


def get_premium_zones() -> list[dict[str, object]]:
    return [
        {
            "zone": str(item["zone"]),
            "city": str(item["city"]),
            "flood_score": float(item["flood_score"]),
            "annual_rainfall_mm": float(item["annual_rainfall_mm"]),
            "heat_days_gt_40c": float(item["heat_days_gt_40c"]),
        }
        for item in ZONE_PROFILES
    ]


def _build_training_frame(n_samples: int = 2000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    profiles = ZONE_PROFILES.copy()
    rows: list[dict[str, float]] = []

    for index in range(n_samples):
        profile = profiles[index % len(profiles)]
        month = int(rng.integers(1, 13))
        tenure_months = float(rng.uniform(0, 24))
        claims_paid = float(rng.uniform(0, 1800))
        premium_paid = float(rng.uniform(800, 5000))
        avg_daily_hours = float(rng.uniform(2, 12))
        flood_score = float(np.clip(float(profile["flood_score"]) + rng.normal(0, 0.04), 0, 1))
        rainfall_norm = float(np.clip(float(profile["annual_rainfall_mm"]) / 1500.0 + rng.normal(0, 0.05), 0, 2))
        heat_days_norm = float(np.clip(float(profile["heat_days_gt_40c"]) / 40.0 + rng.normal(0, 0.04), 0, 2))
        monsoon_flag = 1 if month in MONTHS_IN_MONSOON else 0
        tenure_norm = float(min(1.0, tenure_months / 24.0))
        claim_ratio = float(np.clip(claims_paid / max(premium_paid, 1.0), 0, 2))
        hours_norm = float(min(1.0, avg_daily_hours / 12.0))

        # Interaction features
        flood_x_monsoon = flood_score * monsoon_flag
        hours_x_claim_ratio = hours_norm * claim_ratio

        # Synthetic target: non-linear to benefit from GBR
        raw_adjustment = (
            -7.5
            + flood_score * 16.0
            + rainfall_norm * 7.2
            + heat_days_norm * 5.4
            + monsoon_flag * 4.5
            - tenure_norm * 8.0
            + claim_ratio * 5.8
            + hours_norm * 6.5
            + flood_x_monsoon * 6.0    # flood during monsoon = much worse
            + hours_x_claim_ratio * 3.5  # high hours + high claims = risky combo
            + (flood_score ** 2) * 4.0   # non-linear flood impact
            + rng.normal(0, 1.5)
        )
        premium_adjustment = float(np.clip(raw_adjustment, -15, 25))

        rows.append(
            {
                "flood_score": flood_score,
                "rainfall_norm": rainfall_norm,
                "heat_days_norm": heat_days_norm,
                "monsoon_flag": float(monsoon_flag),
                "tenure_norm": tenure_norm,
                "claim_ratio": claim_ratio,
                "hours_norm": hours_norm,
                "flood_x_monsoon": flood_x_monsoon,
                "hours_x_claim_ratio": hours_x_claim_ratio,
                "premium_adjustment": premium_adjustment,
            }
        )

    return pd.DataFrame(rows)


def _ensure_model_trained() -> GradientBoostingRegressor:
    global _model, _model_r2, _model_coefficients, _model_intercept, _trained_at, _model_mae
    if _model is not None:
        return _model

    # Try loading persisted model first
    if _PREMIUM_MODEL_PATH.exists():
        try:
            saved = joblib.load(_PREMIUM_MODEL_PATH)
            _model = saved["model"]
            _model_r2 = saved.get("r2", 0.0)
            _model_mae = saved.get("mae", 0.0)
            _model_coefficients = saved.get("importances", {})
            _model_intercept = 0.0
            _trained_at = saved.get("trained_at", "loaded")
            logger.info("Premium GBR loaded from disk (R2=%.3f)", _model_r2)
            return _model
        except Exception as e:
            logger.warning("Failed to load premium model: %s", e)

    train_premium_model()
    if _model is None:
        raise RuntimeError("Premium model could not be trained")
    return _model


def train_premium_model(n_samples: int = 2000, seed: int = 42) -> dict[str, object]:
    global _model, _model_r2, _model_coefficients, _model_intercept, _trained_at, _model_mae

    frame = _build_training_frame(n_samples=n_samples, seed=seed)
    X = frame[FEATURE_COLUMNS]
    y = frame["premium_adjustment"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=seed)

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        min_samples_split=10,
        min_samples_leaf=5,
        max_features="sqrt",
        random_state=42,
    )

    # Cross-validation
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X, y, cv=cv, scoring="r2")
    cv_mae = cross_val_score(model, X, y, cv=cv, scoring="neg_mean_absolute_error")

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    r2 = float(r2_score(y_test, predictions))
    mae = float(mean_absolute_error(y_test, predictions))

    _model = model
    _model_r2 = r2
    _model_mae = mae
    _model_intercept = 0.0  # GBR doesn't have a simple intercept
    _model_coefficients = {
        feature: float(importance)
        for feature, importance in zip(FEATURE_COLUMNS, model.feature_importances_)
    }
    _trained_at = datetime.now().isoformat(timespec="seconds")

    # Persist to disk
    _PREMIUM_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "model": model,
        "r2": r2,
        "mae": mae,
        "importances": _model_coefficients,
        "trained_at": _trained_at,
    }, _PREMIUM_MODEL_PATH)

    logger.info(
        "Premium GBR trained on %d rows (R2=%.3f, MAE=%.2f, CV-R2=%.3f±%.3f)",
        n_samples, r2, mae, cv_r2.mean(), cv_r2.std(),
    )

    return {
        "trained_rows": n_samples,
        "r2": round(r2, 4),
        "mae": round(mae, 3),
        "cv_r2_mean": round(float(cv_r2.mean()), 4),
        "cv_r2_std": round(float(cv_r2.std()), 4),
        "cv_mae_mean": round(float(-cv_mae.mean()), 3),
        "feature_importances": _model_coefficients,
        "trained_at": _trained_at,
    }


def get_premium_model_info() -> dict[str, object]:
    _ensure_model_trained()
    return {
        "algorithm": "GradientBoostingRegressor",
        "trained_rows": 2000,
        "r2": round(float(_model_r2 or 0.0), 4),
        "mae": round(float(_model_mae or 0.0), 3),
        "intercept": float(_model_intercept or 0.0),
        "feature_importances": _model_coefficients,
        "features": FEATURE_COLUMNS,
        "trained_at": _trained_at,
    }


def _feature_vector_from_request(payload: PremiumRequestInput) -> tuple[dict[str, float], dict[str, object]]:
    profile = _zone_profile_lookup(payload.zone)
    month = payload.month if 1 <= payload.month <= 12 else datetime.now().month

    features = {
        "flood_score": float(profile["flood_score"]),
        "rainfall_norm": float(profile["annual_rainfall_mm"]) / 1500.0,
        "heat_days_norm": float(profile["heat_days_gt_40c"]) / 40.0,
        "monsoon_flag": 1.0 if month in MONTHS_IN_MONSOON else 0.0,
        "tenure_norm": float(min(1.0, max(0.0, payload.tenure_months / 24.0))),
        "claim_ratio": float(min(2.0, max(0.0, payload.claims_paid / max(payload.premium_paid, 1.0)))),
        "hours_norm": float(min(1.0, max(0.0, payload.avg_daily_hours / 12.0))),
        "flood_x_monsoon": 0.0,  # computed below
        "hours_x_claim_ratio": 0.0,  # computed below
    }
    features["flood_x_monsoon"] = features["flood_score"] * features["monsoon_flag"]
    features["hours_x_claim_ratio"] = features["hours_norm"] * features["claim_ratio"]
    return features, profile


def calculate_premium(payload: PremiumRequestInput) -> dict[str, object]:
    model = _ensure_model_trained()
    features, profile = _feature_vector_from_request(payload)
    feature_frame = pd.DataFrame([features], columns=FEATURE_COLUMNS)

    raw_adjustment = float(model.predict(feature_frame)[0])
    clipped_adjustment = float(np.clip(raw_adjustment, -15, 25))

    # For GBR, use feature importance × feature value as contribution proxy
    importances = _model_coefficients or {}
    itemised_adjustments: list[dict[str, object]] = []
    for feature_name in FEATURE_COLUMNS:
        importance = float(importances.get(feature_name, 0.0))
        feat_val = float(features[feature_name])
        # Contribution estimate: importance × feature value × adjustment magnitude
        contribution = importance * feat_val * clipped_adjustment
        if abs(contribution) < 0.05:
            continue

        label_map = {
            "flood_score": "Flood exposure",
            "rainfall_norm": "Rainfall load",
            "heat_days_norm": "Extreme heat days",
            "monsoon_flag": "Monsoon season",
            "tenure_norm": "Platform tenure",
            "claim_ratio": "Claims ratio",
            "hours_norm": "Work intensity",
            "flood_x_monsoon": "Flood × monsoon risk",
            "hours_x_claim_ratio": "Work × claims combo",
        }
        itemised_adjustments.append(
            {
                "label": label_map[feature_name],
                "amount": round(abs(contribution), 2),
                "direction": "up" if contribution >= 0 else "down",
            }
        )

    explained_sum = sum(
        item["amount"] if item["direction"] == "up" else -item["amount"]
        for item in itemised_adjustments
    )
    remainder = round(clipped_adjustment - explained_sum, 2)
    if abs(remainder) >= 0.1:
        itemised_adjustments.append(
            {
                "label": "Model baseline",
                "amount": abs(remainder),
                "direction": "up" if remainder >= 0 else "down",
            }
        )

    final_adjustment = round(
        sum(
            item["amount"] if item["direction"] == "up" else -item["amount"]
            for item in itemised_adjustments
        ),
        2,
    )

    base_premium = float(BASE_PREMIUMS[payload.plan])
    final_premium = round(base_premium + final_adjustment, 2)
    risk_score = int(np.clip(round(((final_adjustment + 15.0) / 40.0) * 100.0), 0, 100))

    top_items = sorted(
        itemised_adjustments,
        key=lambda item: item["amount"],
        reverse=True,
    )[:2]
    if top_items:
        dominant = ", ".join(f"{item['label'].lower()}" for item in top_items)
        explanation = (
            f"{payload.zone} is assessed using flood and weather exposure signals. "
            f"The premium moved mainly due to {dominant}."
        )
    else:
        explanation = f"{payload.zone} is near baseline risk, so the premium adjustment is minimal."

    return {
        "plan": payload.plan,
        "zone": payload.zone,
        "base": base_premium,
        "final_premium": final_premium,
        "premium_adjustment": final_adjustment,
        "itemised_adjustments": itemised_adjustments,
        "risk_score": risk_score,
        "explanation": explanation,
        "zone_profile": {
            "flood_score": float(profile["flood_score"]),
            "annual_rainfall_mm": float(profile["annual_rainfall_mm"]),
            "heat_days_gt_40c": float(profile["heat_days_gt_40c"]),
        },
    }
