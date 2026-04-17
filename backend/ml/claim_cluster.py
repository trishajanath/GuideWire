"""DBSCAN Claim Pattern Clustering — spatiotemporal fraud ring detection.

Detects suspicious claim clusters that could indicate:
  - Coordinated fraud rings (multiple workers, same zone, same time)
  - Temporal gaming (bursts of claims during trigger windows)
  - Geographic collusion (claims in tight geographic area from unrelated workers)

Architecture:
  1. Each claim is represented as a 4D point: (lat, lon, time_hours, payout_normalized)
  2. DBSCAN finds dense clusters without requiring # of clusters upfront
  3. Clusters are scored by suspicion metrics (size, payout concentration, worker diversity)
  4. Results feed into admin anomaly dashboard and fraud assessment

Why DBSCAN over K-Means:
  - No need to specify cluster count (we don't know how many fraud rings exist)
  - Can find irregularly shaped clusters (real fraud patterns aren't spherical)
  - Labels outliers as noise (-1), which are individual legitimate claims
  - Robust to noise in GPS coordinates
"""

from __future__ import annotations

import logging
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger("guidewire.ml.claim_cluster")

MODEL_DIR = Path(__file__).parent / "models"
CLUSTER_SCALER_PATH = MODEL_DIR / "claim_cluster_scaler.joblib"


@dataclass
class ClaimCluster:
    """A detected cluster of suspicious claims."""
    cluster_id: int
    size: int
    unique_workers: int
    total_payout: float
    avg_fraud_score: float
    center_lat: float
    center_lon: float
    time_span_hours: float
    zone: str
    suspicion_score: float
    claims: list[dict]
    reason: str


def claims_to_features(claims: list[dict], zone_centers: dict | None = None) -> pd.DataFrame:
    """Convert raw claim dicts to feature vectors for DBSCAN.

    Features:
      - lat, lon: Geographic coordinates (from zone center if no GPS)
      - time_hours: Hours since epoch (scaled)
      - payout_norm: Normalized payout amount
      - fraud_score: From fraud engine assessment
    """
    if not claims:
        return pd.DataFrame()

    rows = []
    for c in claims:
        lat = c.get("lat", 0.0)
        lon = c.get("lon", 0.0)

        # If no GPS, use zone center
        if (lat == 0 and lon == 0) and zone_centers and c.get("zone_id"):
            zc = zone_centers.get(c["zone_id"])
            if zc:
                lat = zc.lat if hasattr(zc, "lat") else zc.get("lat", 0)
                lon = zc.lon if hasattr(zc, "lon") else zc.get("lon", 0)

        ts = c.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                ts = datetime.now(timezone.utc)
        elif not isinstance(ts, datetime):
            ts = datetime.now(timezone.utc)

        time_hours = ts.timestamp() / 3600.0  # hours since epoch

        rows.append({
            "claim_id": c.get("id", 0),
            "worker_id": c.get("worker_id", 0),
            "zone_id": c.get("zone_id", ""),
            "lat": lat,
            "lon": lon,
            "time_hours": time_hours,
            "payout": c.get("payout_amount", 0.0),
            "fraud_score": c.get("fraud_score", 0.0),
        })

    return pd.DataFrame(rows)


def detect_clusters(
    claims: list[dict],
    zone_centers: dict | None = None,
    eps: float = 0.8,
    min_samples: int = 3,
) -> list[ClaimCluster]:
    """Run DBSCAN on claim data to find suspicious clusters.

    Args:
        claims: List of claim dicts with lat, lon, timestamp, payout, worker_id
        zone_centers: Optional zone center lookup for GPS fallback
        eps: DBSCAN neighborhood radius (in scaled space)
        min_samples: Minimum points to form a cluster

    Returns:
        List of ClaimCluster objects, sorted by suspicion score (highest first)
    """
    df = claims_to_features(claims, zone_centers)
    if len(df) < min_samples:
        return []

    # Feature matrix for clustering
    feature_cols = ["lat", "lon", "time_hours", "payout"]
    X = df[feature_cols].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Save scaler for consistent scaling of new claims
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(scaler, CLUSTER_SCALER_PATH)

    dbscan = DBSCAN(eps=eps, min_samples=min_samples, metric="euclidean")
    labels = dbscan.fit_predict(X_scaled)
    df["cluster"] = labels

    clusters = []
    unique_labels = set(labels)
    unique_labels.discard(-1)  # Remove noise label

    for cluster_id in sorted(unique_labels):
        mask = df["cluster"] == cluster_id
        cluster_df = df[mask]

        size = len(cluster_df)
        unique_workers = cluster_df["worker_id"].nunique()
        total_payout = cluster_df["payout"].sum()
        avg_fraud = cluster_df["fraud_score"].mean()
        center_lat = cluster_df["lat"].mean()
        center_lon = cluster_df["lon"].mean()

        time_min = cluster_df["time_hours"].min()
        time_max = cluster_df["time_hours"].max()
        time_span = time_max - time_min

        # Most common zone
        zone = cluster_df["zone_id"].mode().iloc[0] if not cluster_df["zone_id"].mode().empty else "unknown"

        # Suspicion scoring
        suspicion = 0.0
        reasons = []

        # High claim density in short time
        if time_span < 2.0 and size >= 5:
            suspicion += 0.3
            reasons.append(f"{size} claims in {time_span:.1f}h window")
        elif time_span < 6.0 and size >= 8:
            suspicion += 0.2
            reasons.append(f"{size} claims clustered in {time_span:.1f}h")

        # Few workers, many claims → likely gaming
        if unique_workers == 1 and size >= 4:
            suspicion += 0.35
            reasons.append(f"Single worker filed {size} claims")
        elif unique_workers <= 2 and size >= 6:
            suspicion += 0.25
            reasons.append(f"Only {unique_workers} workers for {size} claims")

        # High average fraud score in cluster
        if avg_fraud > 0.5:
            suspicion += 0.25
            reasons.append(f"Avg fraud score {avg_fraud:.2f}")
        elif avg_fraud > 0.3:
            suspicion += 0.1
            reasons.append(f"Elevated avg fraud {avg_fraud:.2f}")

        # High payout concentration
        avg_payout = total_payout / size if size > 0 else 0
        if avg_payout > 500:
            suspicion += 0.1
            reasons.append(f"High avg payout ₹{avg_payout:.0f}")

        # Tight geographic area (claims very close together)
        lat_spread = cluster_df["lat"].std()
        lon_spread = cluster_df["lon"].std()
        if lat_spread < 0.005 and lon_spread < 0.005 and size >= 4:
            suspicion += 0.15
            reasons.append("Extremely tight geographic cluster")

        suspicion = min(suspicion, 1.0)
        reason = "; ".join(reasons) if reasons else "Moderate density cluster"

        cluster_claims = cluster_df[["claim_id", "worker_id", "zone_id", "payout", "fraud_score"]].to_dict("records")

        clusters.append(ClaimCluster(
            cluster_id=int(cluster_id),
            size=size,
            unique_workers=unique_workers,
            total_payout=round(total_payout, 2),
            avg_fraud_score=round(avg_fraud, 4),
            center_lat=round(center_lat, 6),
            center_lon=round(center_lon, 6),
            time_span_hours=round(time_span, 2),
            zone=zone,
            suspicion_score=round(suspicion, 3),
            claims=cluster_claims,
            reason=reason,
        ))

    clusters.sort(key=lambda c: c.suspicion_score, reverse=True)
    return clusters


def cluster_summary(clusters: list[ClaimCluster]) -> dict:
    """Generate summary statistics from detected clusters."""
    if not clusters:
        return {
            "total_clusters": 0,
            "total_claims_in_clusters": 0,
            "high_suspicion_clusters": 0,
            "avg_suspicion": 0.0,
            "total_payout_at_risk": 0.0,
        }

    return {
        "total_clusters": len(clusters),
        "total_claims_in_clusters": sum(c.size for c in clusters),
        "high_suspicion_clusters": sum(1 for c in clusters if c.suspicion_score > 0.5),
        "avg_suspicion": round(sum(c.suspicion_score for c in clusters) / len(clusters), 3),
        "total_payout_at_risk": round(sum(c.total_payout for c in clusters if c.suspicion_score > 0.3), 2),
    }
