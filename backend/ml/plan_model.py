"""XGBoost multi-class plan recommendation model.

Predicts Basic / Standard / Premium shield based on worker profile.

Feature engineering:
  - hours_x_risk     (interaction: high hours + high risk → premium)
  - hours_squared    (captures diminishing returns of extra hours)
  - risk_bucket      (ordinal encoding of risk severity)
  - intensity_score  (combined work intensity metric)
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
import joblib

logger = logging.getLogger("guidewire.ml.plan")

MODEL_DIR = Path(__file__).parent / "models"
CLF_PATH = MODEL_DIR / "plan_recommender.joblib"

PLAN_LABELS = {0: "basic", 1: "standard", 2: "premium"}

FEATURE_COLS = [
    "avg_daily_hours",
    "zone_risk",
    "hours_x_risk",
    "hours_squared",
    "risk_bucket",
    "intensity_score",
]

PLAN_REASONING = {
    "basic": [
        "Lower daily work hours",
        "Suitable for part-time gig workers",
        "Weather-only trigger coverage at ₹49/week",
    ],
    "standard": [
        "Moderate daily work hours",
        "Covers weather + demand drop triggers",
        "Most popular among regular workers at ₹69/week",
    ],
    "premium": [
        "High daily work hours",
        "Full trigger coverage including heat alerts & platform outages",
        "Maximum protection at ₹99/week for full-time workers",
    ],
}


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["hours_x_risk"] = out["avg_daily_hours"] * out["zone_risk"] / 100.0
    out["hours_squared"] = out["avg_daily_hours"] ** 2 / 14.0  # normalise by max ~14h
    out["risk_bucket"] = pd.cut(
        out["zone_risk"],
        bins=[-1, 30, 60, 100],
        labels=[0, 1, 2],
    ).astype(float)
    out["intensity_score"] = (
        out["avg_daily_hours"] / 14.0 * 0.6 + out["zone_risk"] / 100.0 * 0.4
    )
    return out


def train(df: pd.DataFrame) -> dict:
    """Train XGBoost multi-class classifier for plan recommendation."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    df_feat = engineer_features(df)
    X = df_feat[FEATURE_COLS].values
    y = df_feat["label"].values

    clf = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=5,
        reg_alpha=0.05,
        reg_lambda=1.0,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    acc_scores = cross_val_score(clf, X, y, cv=cv, scoring="accuracy")
    clf.fit(X, y)
    joblib.dump(clf, CLF_PATH)
    logger.info(
        "Plan recommender saved — CV accuracy: %.3f ± %.3f",
        acc_scores.mean(),
        acc_scores.std(),
    )

    return {
        "accuracy_mean": round(float(acc_scores.mean()), 4),
        "accuracy_std": round(float(acc_scores.std()), 4),
        "samples": len(df),
    }


# --------------- runtime prediction ---------------

_clf_cache: XGBClassifier | None = None


def _load_model() -> XGBClassifier | None:
    global _clf_cache
    if _clf_cache is not None:
        return _clf_cache

    if CLF_PATH.exists():
        _clf_cache = joblib.load(CLF_PATH)
        logger.info("Plan recommender loaded from disk")
        return _clf_cache

    return None


def predict(avg_daily_hours: float, zone_risk: float) -> dict | None:
    """Recommend a plan using the trained XGBoost model.

    Returns None if the model is not available.
    """
    clf = _load_model()
    if clf is None:
        return None

    row = pd.DataFrame([{"avg_daily_hours": avg_daily_hours, "zone_risk": zone_risk}])
    row = engineer_features(row)
    X = row[FEATURE_COLS].values

    proba = clf.predict_proba(X)[0]
    pred_label = int(np.argmax(proba))
    confidence = round(float(proba[pred_label]), 2)
    plan_name = PLAN_LABELS[pred_label]

    # Build reasoning from the prediction probabilities
    reasoning = list(PLAN_REASONING[plan_name])
    if zone_risk >= 75:
        reasoning.append("High risk zone detected")
    elif zone_risk >= 40:
        reasoning.append("Medium risk zone detected")
    else:
        reasoning.append("Low risk zone")

    return {
        "recommended_plan": plan_name,
        "confidence": max(0.50, min(confidence, 0.95)),
        "reasoning": reasoning,
    }
