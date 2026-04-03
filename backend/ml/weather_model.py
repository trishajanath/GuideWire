"""XGBoost weather risk scoring model.

Two-head architecture:
  1. Binary classifier  → trigger_breach probability (0-1)
  2. Regression model   → risk_score (0-100)

Feature engineering adds derived signals that help the tree splits:
  - heat_index          (temperature × humidity interaction)
  - rain_intensity      (rainfall squared — captures non-linear severity)
  - wind_rain_combo     (wind × rainfall interaction)
  - extreme_heat_flag   (temperature near/above 42 °C)
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBClassifier, XGBRegressor
from sklearn.model_selection import StratifiedKFold, cross_val_score
import joblib

logger = logging.getLogger("guidewire.ml.weather")

MODEL_DIR = Path(__file__).parent / "models"
CLF_PATH = MODEL_DIR / "weather_trigger_clf.joblib"
REG_PATH = MODEL_DIR / "weather_risk_reg.joblib"

FEATURE_COLS = [
    "rainfall",
    "temperature",
    "humidity",
    "wind_speed",
    "heat_index",
    "rain_intensity",
    "wind_rain_combo",
    "extreme_heat_flag",
]

# Trigger type thresholds (matching README)
_TRIGGER_MAP = {
    "heavy_rainfall": lambda r, t, w: r > 30,
    "extreme_heat": lambda r, t, w: t > 42,
    "high_wind": lambda r, t, w: w > 40,
}


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns to a raw weather DataFrame."""
    out = df.copy()
    out["heat_index"] = out["temperature"] * out["humidity"] / 100.0
    out["rain_intensity"] = out["rainfall"] ** 2 / 100.0
    out["wind_rain_combo"] = out["wind_speed"] * out["rainfall"] / 100.0
    out["extreme_heat_flag"] = (out["temperature"] >= 40).astype(float)
    return out


def train(df: pd.DataFrame) -> dict:
    """Train both XGBoost heads and persist to disk.

    Returns a dict with cross-validated metrics.
    """
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    df_feat = engineer_features(df)
    X = df_feat[FEATURE_COLS].values
    y_clf = df_feat["trigger_breach"].values
    y_reg = df_feat["risk_score"].values

    # ---- Classifier (trigger breach) ----
    clf = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        scale_pos_weight=(y_clf == 0).sum() / max((y_clf == 1).sum(), 1),
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    clf_scores = cross_val_score(clf, X, y_clf, cv=cv, scoring="f1")
    clf.fit(X, y_clf)
    joblib.dump(clf, CLF_PATH)
    logger.info("Weather trigger classifier saved  — CV F1: %.3f ± %.3f", clf_scores.mean(), clf_scores.std())

    # ---- Regressor (risk score 0-100) ----
    reg = XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        eval_metric="rmse",
        random_state=42,
        n_jobs=-1,
    )
    reg.fit(X, y_reg)
    joblib.dump(reg, REG_PATH)
    logger.info("Weather risk regressor saved")

    return {
        "clf_f1_mean": round(float(clf_scores.mean()), 4),
        "clf_f1_std": round(float(clf_scores.std()), 4),
        "samples": len(df),
    }


# --------------- runtime prediction ---------------

_clf_cache: XGBClassifier | None = None
_reg_cache: XGBRegressor | None = None


def _load_models() -> tuple[XGBClassifier | None, XGBRegressor | None]:
    global _clf_cache, _reg_cache
    if _clf_cache is not None and _reg_cache is not None:
        return _clf_cache, _reg_cache

    if CLF_PATH.exists() and REG_PATH.exists():
        _clf_cache = joblib.load(CLF_PATH)
        _reg_cache = joblib.load(REG_PATH)
        logger.info("Weather ML models loaded from disk")
        return _clf_cache, _reg_cache

    return None, None


def predict(data: dict) -> dict | None:
    """Predict weather risk using the trained XGBoost models.

    Returns None if models are not available (caller should fall back).
    """
    clf, reg = _load_models()
    if clf is None or reg is None:
        return None

    row = pd.DataFrame([data])
    row = engineer_features(row)
    X = row[FEATURE_COLS].values

    breach_prob = float(clf.predict_proba(X)[0, 1])
    risk_score = int(np.clip(reg.predict(X)[0], 0, 100))

    # Determine trigger type
    r = data.get("rainfall", 0)
    t = data.get("temperature", 0)
    w = data.get("wind_speed", 0)

    trigger_type = "none"
    for ttype, check_fn in _TRIGGER_MAP.items():
        if check_fn(r, t, w):
            trigger_type = ttype
            break

    return {
        "weather_risk_score": risk_score,
        "trigger_probability": round(breach_prob, 2),
        "trigger_type": trigger_type,
    }
