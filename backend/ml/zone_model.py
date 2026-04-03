"""Isolation Forest zone-activity anomaly detection.

The model learns "normal" zone activity distributions and flags
deviations that suggest disruption (demand collapse, weather impact).

Features:
  - active_workers, idle_workers, total_workers
  - idle_ratio, active_ratio
  - avg_distance
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger("guidewire.ml.zone")

MODEL_DIR = Path(__file__).parent / "models"
ISO_PATH = MODEL_DIR / "zone_isolation_forest.joblib"
SCALER_PATH = MODEL_DIR / "zone_scaler.joblib"

FEATURE_COLS = [
    "active_workers",
    "idle_workers",
    "total_workers",
    "idle_ratio",
    "active_ratio",
    "avg_distance",
]


def _prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if "total_workers" not in out.columns:
        out["total_workers"] = out["active_workers"] + out["idle_workers"]
    if "idle_ratio" not in out.columns:
        out["idle_ratio"] = out["idle_workers"] / out["total_workers"].replace(0, 1)
    if "active_ratio" not in out.columns:
        out["active_ratio"] = out["active_workers"] / out["total_workers"].replace(0, 1)
    return out


def train(df: pd.DataFrame) -> dict:
    """Train Isolation Forest on zone activity data."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    df_feat = _prepare_features(df)
    X = df_feat[FEATURE_COLS].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=0.20,  # ~20 % expected disruption rate (matches training data)
        max_features=1.0,
        bootstrap=False,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X_scaled)

    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(iso, ISO_PATH)

    scores = iso.decision_function(X_scaled)
    n_anomalies = int((scores < 0).sum())
    logger.info(
        "Zone Isolation Forest saved — %d anomalies detected in %d samples",
        n_anomalies,
        len(df),
    )

    return {
        "samples": len(df),
        "anomalies_detected": n_anomalies,
        "anomaly_rate": round(n_anomalies / len(df), 3),
    }


# --------------- runtime prediction ---------------

_iso_cache: IsolationForest | None = None
_scaler_cache: StandardScaler | None = None


def _load_models() -> tuple[IsolationForest | None, StandardScaler | None]:
    global _iso_cache, _scaler_cache
    if _iso_cache is not None and _scaler_cache is not None:
        return _iso_cache, _scaler_cache

    if ISO_PATH.exists() and SCALER_PATH.exists():
        _scaler_cache = joblib.load(SCALER_PATH)
        _iso_cache = joblib.load(ISO_PATH)
        logger.info("Zone Isolation Forest loaded from disk")
        return _iso_cache, _scaler_cache

    return None, None


def predict(data: dict) -> dict | None:
    """Score zone activity through Isolation Forest.

    Returns None if model is not available.
    anomaly_score < 0 → disruption / anomaly
    anomaly_score > 0 → normal
    """
    iso, scaler = _load_models()
    if iso is None or scaler is None:
        return None

    row = pd.DataFrame([data])
    row = _prepare_features(row)
    X = row[FEATURE_COLS].values
    X_scaled = scaler.transform(X)

    raw_score = float(iso.decision_function(X_scaled)[0])
    idle_ratio = float(row["idle_ratio"].iloc[0])

    # Use idle_ratio-aware thresholding: high idle ratio zones with low
    # Isolation Forest scores are disruptions even if the forest is unsure.
    if raw_score < 0:
        status = "disruption"
    elif idle_ratio > 0.5 and raw_score < 0.08:
        status = "disruption"
        raw_score = -abs(raw_score)  # flip sign to indicate anomaly
    else:
        status = "normal"

    return {
        "anomaly_score": round(raw_score, 4),
        "status": status,
        "idle_ratio": round(idle_ratio, 4),
    }
