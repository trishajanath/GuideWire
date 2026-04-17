"""Train all FairRoute ML models.

Usage:
    python -m ml.train          (from backend/)
    python ml/train.py          (from backend/)

Generates synthetic data, trains three models, and saves them under
ml/models/.  Training metrics are printed to stdout.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Ensure the backend directory is on sys.path so relative imports work.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from ml.data_generator import (
    generate_weather_risk_data,
    generate_zone_activity_data,
    generate_plan_recommendation_data,
)
from ml import weather_model, zone_model, plan_model, fraud_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)
logger = logging.getLogger("guidewire.ml.train")


def main() -> None:
    logger.info("=" * 60)
    logger.info("FairRoute ML Pipeline — Training all models")
    logger.info("=" * 60)

    # 1. Weather Risk (XGBoost)
    logger.info("--- Weather Risk Model (XGBoost) ---")
    weather_df = generate_weather_risk_data(n_samples=6000)
    weather_metrics = weather_model.train(weather_df)
    logger.info("Weather metrics: %s", weather_metrics)

    # 2. Zone Activity (Isolation Forest)
    logger.info("--- Zone Activity Model (Isolation Forest) ---")
    zone_df = generate_zone_activity_data(n_samples=3000)
    zone_metrics = zone_model.train(zone_df)
    logger.info("Zone metrics: %s", zone_metrics)

    # 3. Plan Recommendation (XGBoost)
    logger.info("--- Plan Recommender (XGBoost multi-class) ---")
    plan_df = generate_plan_recommendation_data(n_samples=5000)
    plan_metrics = plan_model.train(plan_df)
    logger.info("Plan metrics: %s", plan_metrics)

    # 4. Fraud Ensemble (GradientBoosting meta-learner)
    logger.info("--- Fraud Ensemble (GradientBoosting + calibrated) ---")
    fraud_metrics = fraud_model.train()
    logger.info("Fraud metrics: %s", {k: v for k, v in fraud_metrics.items() if k != "feature_importances"})
    logger.info("Fraud top features: %s",
        sorted(fraud_metrics.get("feature_importances", {}).items(), key=lambda x: x[1], reverse=True)[:5]
    )

    logger.info("=" * 60)
    logger.info("All models trained and saved to ml/models/")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
