"""Fraud ML Ensemble — GradientBoosting meta-learner over 7-layer signals.

Instead of using static weights to combine fraud layer scores, this model
learns non-linear interactions between layers. For example:
  - GPS outside zone + velocity spike = much worse than either alone
  - Low claim frequency + good behavior = strong clean signal
  - Historical weather mismatch + no GPS = compound suspicion

Architecture:
  1. Data generator creates synthetic signal vectors with realistic fraud patterns
  2. GradientBoostingClassifier learns signal interactions
  3. At inference, the 7-layer scores are fed through the ensemble
  4. Output: fraud probability (0-1) + feature importances for explainability

The rule-engine remains the primary system; the ML ensemble runs in parallel
and provides a "second opinion" that captures interaction effects the linear
weighted sum misses.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.calibration import CalibratedClassifierCV
import joblib

logger = logging.getLogger("guidewire.ml.fraud")

MODEL_DIR = Path(__file__).parent / "models"
FRAUD_CLF_PATH = MODEL_DIR / "fraud_ensemble.joblib"

# The 7 signal layers in order
SIGNAL_COLS = [
    "gps_consistency",
    "claim_frequency",
    "location_disruption",
    "velocity_check",
    "behavioral",
    "historical_weather",
    "gps_spoofing_advanced",
]

# Confidence columns (each signal's self-reported confidence)
CONFIDENCE_COLS = [f"{s}_conf" for s in SIGNAL_COLS]

# Engineered interaction features
INTERACTION_COLS = [
    "gps_x_velocity",          # GPS mismatch × velocity → spoofing amplifier
    "frequency_x_behavioral",  # High frequency + bad behavior → gaming
    "weather_x_location",      # Weather mismatch × no disruption → fake weather claim
    "max_signal",              # Highest single layer score
    "mean_signal",             # Average across all layers
    "signal_variance",         # How spread out signals are
    "high_signal_count",       # Number of layers flagging > 0.5
    "confidence_weighted_mean", # Mean weighted by confidence
]

ALL_FEATURES = SIGNAL_COLS + CONFIDENCE_COLS + INTERACTION_COLS


def generate_fraud_training_data(n_samples: int = 8000, seed: int = 42) -> pd.DataFrame:
    """Generate synthetic fraud signal vectors with realistic patterns.

    Creates 5 fraud archetypes + legitimate claims with various risk profiles.
    """
    rng = np.random.default_rng(seed)
    rows = []

    # --- 55% legitimate claims (label=0) ---
    n_legit = int(n_samples * 0.55)
    for _ in range(n_legit):
        profile = rng.choice(["clean", "minor_flags", "edge_case"], p=[0.6, 0.25, 0.15])
        if profile == "clean":
            signals = {s: rng.uniform(0, 0.15) for s in SIGNAL_COLS}
            confs = {f"{s}_conf": rng.uniform(0.7, 0.95) for s in SIGNAL_COLS}
        elif profile == "minor_flags":
            signals = {s: rng.uniform(0, 0.25) for s in SIGNAL_COLS}
            # One layer slightly elevated
            noisy_layer = rng.choice(SIGNAL_COLS)
            signals[noisy_layer] = rng.uniform(0.25, 0.45)
            confs = {f"{s}_conf": rng.uniform(0.5, 0.9) for s in SIGNAL_COLS}
        else:  # edge_case
            signals = {s: rng.uniform(0.1, 0.35) for s in SIGNAL_COLS}
            confs = {f"{s}_conf": rng.uniform(0.3, 0.7) for s in SIGNAL_COLS}

        rows.append({**signals, **confs, "is_fraud": 0})

    # --- 10% GPS spoofing fraud ---
    n_spoof = int(n_samples * 0.10)
    for _ in range(n_spoof):
        signals = {s: rng.uniform(0, 0.3) for s in SIGNAL_COLS}
        signals["gps_consistency"] = rng.uniform(0.7, 1.0)
        signals["velocity_check"] = rng.uniform(0.6, 1.0)
        signals["gps_spoofing_advanced"] = rng.uniform(0.7, 1.0)
        confs = {f"{s}_conf": rng.uniform(0.7, 0.95) for s in SIGNAL_COLS}
        rows.append({**signals, **confs, "is_fraud": 1})

    # --- 10% claim frequency abuse ---
    n_freq = int(n_samples * 0.10)
    for _ in range(n_freq):
        signals = {s: rng.uniform(0, 0.25) for s in SIGNAL_COLS}
        signals["claim_frequency"] = rng.uniform(0.65, 1.0)
        signals["behavioral"] = rng.uniform(0.4, 0.8)
        confs = {f"{s}_conf": rng.uniform(0.6, 0.9) for s in SIGNAL_COLS}
        rows.append({**signals, **confs, "is_fraud": 1})

    # --- 8% fake weather claims ---
    n_weather = int(n_samples * 0.08)
    for _ in range(n_weather):
        signals = {s: rng.uniform(0, 0.3) for s in SIGNAL_COLS}
        signals["historical_weather"] = rng.uniform(0.6, 1.0)
        signals["location_disruption"] = rng.uniform(0.6, 0.95)
        confs = {f"{s}_conf": rng.uniform(0.6, 0.95) for s in SIGNAL_COLS}
        rows.append({**signals, **confs, "is_fraud": 1})

    # --- 7% coordinated multi-signal fraud ---
    n_multi = int(n_samples * 0.07)
    for _ in range(n_multi):
        signals = {s: rng.uniform(0.3, 0.7) for s in SIGNAL_COLS}
        # At least 3 layers are high
        hot_layers = rng.choice(SIGNAL_COLS, size=3, replace=False)
        for layer in hot_layers:
            signals[layer] = rng.uniform(0.7, 1.0)
        confs = {f"{s}_conf": rng.uniform(0.5, 0.9) for s in SIGNAL_COLS}
        rows.append({**signals, **confs, "is_fraud": 1})

    # --- 5% behavioral gaming (bot-like) ---
    n_bot = int(n_samples * 0.05)
    for _ in range(n_bot):
        signals = {s: rng.uniform(0.05, 0.25) for s in SIGNAL_COLS}
        signals["behavioral"] = rng.uniform(0.7, 1.0)
        signals["claim_frequency"] = rng.uniform(0.4, 0.7)
        confs = {f"{s}_conf": rng.uniform(0.5, 0.85) for s in SIGNAL_COLS}
        rows.append({**signals, **confs, "is_fraud": 1})

    # --- 5% subtle fraud (hard to catch — low signals but suspicious combo) ---
    n_subtle = n_samples - n_legit - n_spoof - n_freq - n_weather - n_multi - n_bot
    for _ in range(n_subtle):
        signals = {s: rng.uniform(0.2, 0.5) for s in SIGNAL_COLS}
        # Moderate on most, slight elevation on 2
        elevated = rng.choice(SIGNAL_COLS, size=2, replace=False)
        for layer in elevated:
            signals[layer] = rng.uniform(0.5, 0.7)
        confs = {f"{s}_conf": rng.uniform(0.4, 0.8) for s in SIGNAL_COLS}
        rows.append({**signals, **confs, "is_fraud": 1})

    df = pd.DataFrame(rows)
    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


def engineer_interactions(df: pd.DataFrame) -> pd.DataFrame:
    """Add interaction features that capture cross-layer signal patterns."""
    out = df.copy()
    out["gps_x_velocity"] = out["gps_consistency"] * out["velocity_check"]
    out["frequency_x_behavioral"] = out["claim_frequency"] * out["behavioral"]
    out["weather_x_location"] = out["historical_weather"] * out["location_disruption"]

    signal_matrix = out[SIGNAL_COLS].values
    out["max_signal"] = signal_matrix.max(axis=1)
    out["mean_signal"] = signal_matrix.mean(axis=1)
    out["signal_variance"] = signal_matrix.var(axis=1)
    out["high_signal_count"] = (signal_matrix > 0.5).sum(axis=1).astype(float)

    # Confidence-weighted mean
    conf_matrix = out[CONFIDENCE_COLS].values
    out["confidence_weighted_mean"] = (signal_matrix * conf_matrix).sum(axis=1) / conf_matrix.sum(axis=1).clip(min=0.01)

    return out


def train(df: pd.DataFrame | None = None) -> dict:
    """Train GradientBoosting fraud ensemble with calibrated probabilities."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    if df is None:
        df = generate_fraud_training_data()

    df_feat = engineer_interactions(df)
    X = df_feat[ALL_FEATURES].values
    y = df_feat["is_fraud"].values

    base_clf = GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        min_samples_split=10,
        min_samples_leaf=5,
        max_features="sqrt",
        random_state=42,
    )

    # Calibrated probabilities for reliable confidence scores
    clf = CalibratedClassifierCV(base_clf, cv=3, method="isotonic")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    # Score the base estimator for CV metrics
    f1_scores = cross_val_score(base_clf, X, y, cv=cv, scoring="f1")
    auc_scores = cross_val_score(base_clf, X, y, cv=cv, scoring="roc_auc")
    precision_scores = cross_val_score(base_clf, X, y, cv=cv, scoring="precision")
    recall_scores = cross_val_score(base_clf, X, y, cv=cv, scoring="recall")

    clf.fit(X, y)
    joblib.dump(clf, FRAUD_CLF_PATH)

    # Feature importances from the base estimator
    base_clf.fit(X, y)
    importances = dict(zip(ALL_FEATURES, [round(float(x), 4) for x in base_clf.feature_importances_]))

    logger.info(
        "Fraud ensemble saved — CV F1: %.3f ± %.3f, AUC: %.3f ± %.3f",
        f1_scores.mean(), f1_scores.std(),
        auc_scores.mean(), auc_scores.std(),
    )

    return {
        "f1_mean": round(float(f1_scores.mean()), 4),
        "f1_std": round(float(f1_scores.std()), 4),
        "auc_mean": round(float(auc_scores.mean()), 4),
        "auc_std": round(float(auc_scores.std()), 4),
        "precision_mean": round(float(precision_scores.mean()), 4),
        "recall_mean": round(float(recall_scores.mean()), 4),
        "samples": len(df),
        "fraud_rate": round(float(y.mean()), 3),
        "feature_importances": importances,
    }


# --------------- runtime prediction ---------------

_clf_cache = None


def _load_model():
    global _clf_cache
    if _clf_cache is not None:
        return _clf_cache
    if FRAUD_CLF_PATH.exists():
        _clf_cache = joblib.load(FRAUD_CLF_PATH)
        logger.info("Fraud ensemble loaded from disk")
        return _clf_cache
    return None


def predict(signal_scores: dict[str, float], signal_confidences: dict[str, float]) -> dict | None:
    """Run the fraud ensemble on a set of 7-layer signal scores.

    Args:
        signal_scores: {layer_name: score} for each of the 7 layers
        signal_confidences: {layer_name: confidence} for each layer

    Returns:
        dict with fraud_probability, risk_level, feature_contributions, or None if model unavailable
    """
    clf = _load_model()
    if clf is None:
        return None

    row = {}
    for col in SIGNAL_COLS:
        row[col] = signal_scores.get(col, 0.0)
    for col in SIGNAL_COLS:
        row[f"{col}_conf"] = signal_confidences.get(col, 0.5)

    df = pd.DataFrame([row])
    df = engineer_interactions(df)
    X = df[ALL_FEATURES].values

    fraud_prob = float(clf.predict_proba(X)[0, 1])

    # Feature contributions via marginal effect approximation
    contributions = {}
    baseline_prob = fraud_prob
    for feat in SIGNAL_COLS:
        modified = df.copy()
        modified[feat] = 0.0
        modified = engineer_interactions(pd.DataFrame([{**row, feat: 0.0}]))
        X_mod = modified[ALL_FEATURES].values
        prob_without = float(clf.predict_proba(X_mod)[0, 1])
        contributions[feat] = round(baseline_prob - prob_without, 4)

    if fraud_prob < 0.3:
        risk = "LOW"
    elif fraud_prob < 0.6:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    return {
        "fraud_probability": round(fraud_prob, 4),
        "risk_level": risk,
        "allow_payout": fraud_prob < 0.7,
        "feature_contributions": contributions,
        "top_drivers": sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)[:3],
    }
