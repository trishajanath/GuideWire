"""Worker Risk Profiler — EMA-based dynamic risk scoring per worker.

Builds a running risk profile for each worker using Exponential Moving Average
of their fraud scores, claim patterns, and behavioral signals. Unlike static
fraud scoring (which evaluates a single claim), this tracks worker behavior
over time to identify gradual pattern shifts.

Key innovations:
  1. EMA Risk Score — smoothed fraud score that adapts to recent behavior
     while remembering history (α=0.3, so recent claims matter more)
  2. Behavioral Momentum — tracks if a worker's risk is trending up or down
  3. Claim Velocity — claims per day with exponential decay
  4. Trust Score — inverse of risk, rewards consistent clean behavior
  5. Risk Category — auto-classified: trusted / normal / watch / flagged / blocked

This runs entirely in-memory (no ML model needed), but the scoring function
is designed to be used as features for future ML models.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Literal

logger = logging.getLogger("guidewire.ml.risk_profiler")

# EMA smoothing factor (0-1): higher = more responsive to recent claims
ALPHA = 0.3

# Claim velocity decay factor (per hour)
VELOCITY_DECAY = 0.95

# Category thresholds
CATEGORY_THRESHOLDS = {
    "trusted": 0.15,    # risk < 0.15
    "normal": 0.30,     # risk < 0.30
    "watch": 0.50,      # risk < 0.50
    "flagged": 0.70,    # risk < 0.70
    # >= 0.70 → "blocked"
}

RiskCategory = Literal["trusted", "normal", "watch", "flagged", "blocked"]


@dataclass
class WorkerProfile:
    """Dynamic risk profile for a single worker."""
    worker_id: int
    ema_risk: float = 0.0           # Exponential moving average of fraud scores
    peak_risk: float = 0.0          # Highest single-claim fraud score ever
    claim_count: int = 0            # Total claims processed
    clean_streak: int = 0           # Consecutive low-risk claims
    flag_count: int = 0             # Number of times risk exceeded 0.5
    total_payout: float = 0.0       # Cumulative payout
    avg_payout: float = 0.0         # Running average payout per claim
    velocity: float = 0.0           # Claims per hour (decayed)
    last_claim_time: datetime | None = None
    last_fraud_score: float = 0.0
    momentum: float = 0.0           # Rate of change of ema_risk
    trust_score: float = 1.0        # Inverse of risk (rewards clean behavior)
    category: RiskCategory = "normal"
    history: list[dict] = field(default_factory=list)  # Last N claim summaries


def _classify(risk: float) -> RiskCategory:
    if risk < CATEGORY_THRESHOLDS["trusted"]:
        return "trusted"
    elif risk < CATEGORY_THRESHOLDS["normal"]:
        return "normal"
    elif risk < CATEGORY_THRESHOLDS["watch"]:
        return "watch"
    elif risk < CATEGORY_THRESHOLDS["flagged"]:
        return "flagged"
    else:
        return "blocked"


class WorkerRiskProfiler:
    """Maintains running risk profiles for all workers."""

    def __init__(self, alpha: float = ALPHA):
        self.alpha = alpha
        self.profiles: dict[int, WorkerProfile] = {}

    def get_profile(self, worker_id: int) -> WorkerProfile:
        if worker_id not in self.profiles:
            self.profiles[worker_id] = WorkerProfile(worker_id=worker_id)
        return self.profiles[worker_id]

    def update(
        self,
        worker_id: int,
        fraud_score: float,
        payout_amount: float = 0.0,
        claim_zone: str = "",
        claim_type: str = "",
    ) -> WorkerProfile:
        """Update a worker's risk profile with a new claim result.

        Args:
            worker_id: Worker identifier
            fraud_score: Fraud assessment score (0-1) for this claim
            payout_amount: Amount paid out (0 if rejected)
            claim_zone: Zone ID of the claim
            claim_type: Type of trigger claimed

        Returns:
            Updated WorkerProfile
        """
        profile = self.get_profile(worker_id)
        now = datetime.now(timezone.utc)

        # 1. Update EMA risk score
        old_ema = profile.ema_risk
        if profile.claim_count == 0:
            profile.ema_risk = fraud_score
        else:
            profile.ema_risk = self.alpha * fraud_score + (1 - self.alpha) * profile.ema_risk

        # 2. Momentum (rate of change)
        profile.momentum = profile.ema_risk - old_ema

        # 3. Peak risk
        if fraud_score > profile.peak_risk:
            profile.peak_risk = fraud_score

        # 4. Clean streak / flag count
        if fraud_score < 0.3:
            profile.clean_streak += 1
        else:
            profile.clean_streak = 0
        if fraud_score > 0.5:
            profile.flag_count += 1

        # 5. Claim velocity with exponential decay
        if profile.last_claim_time:
            hours_since = max((now - profile.last_claim_time).total_seconds() / 3600.0, 0.01)
            profile.velocity = profile.velocity * (VELOCITY_DECAY ** hours_since) + 1.0
        else:
            profile.velocity = 1.0

        # 6. Payout tracking
        profile.total_payout += payout_amount
        profile.claim_count += 1
        profile.avg_payout = profile.total_payout / profile.claim_count

        # 7. Trust score (inverse of risk, boosted by clean streaks)
        clean_bonus = min(profile.clean_streak * 0.02, 0.2)  # up to +0.2 for clean history
        profile.trust_score = max(0.0, min(1.0, 1.0 - profile.ema_risk + clean_bonus))

        # 8. Category
        profile.category = _classify(profile.ema_risk)

        # 9. History (keep last 20)
        profile.last_claim_time = now
        profile.last_fraud_score = fraud_score
        profile.history.append({
            "timestamp": now.isoformat(),
            "fraud_score": round(fraud_score, 4),
            "payout": round(payout_amount, 2),
            "zone": claim_zone,
            "type": claim_type,
            "ema_after": round(profile.ema_risk, 4),
        })
        if len(profile.history) > 20:
            profile.history = profile.history[-20:]

        return profile

    def get_all_profiles(self) -> list[dict]:
        """Get all worker profiles as dicts, sorted by risk (highest first)."""
        result = []
        for p in sorted(self.profiles.values(), key=lambda x: x.ema_risk, reverse=True):
            result.append({
                "worker_id": p.worker_id,
                "ema_risk": round(p.ema_risk, 4),
                "peak_risk": round(p.peak_risk, 4),
                "trust_score": round(p.trust_score, 4),
                "claim_count": p.claim_count,
                "clean_streak": p.clean_streak,
                "flag_count": p.flag_count,
                "total_payout": round(p.total_payout, 2),
                "avg_payout": round(p.avg_payout, 2),
                "velocity": round(p.velocity, 3),
                "momentum": round(p.momentum, 4),
                "category": p.category,
                "last_fraud_score": round(p.last_fraud_score, 4),
                "last_claim_time": p.last_claim_time.isoformat() if p.last_claim_time else None,
                "history_count": len(p.history),
            })
        return result

    def get_flagged_workers(self, min_risk: float = 0.5) -> list[dict]:
        """Get workers above a risk threshold."""
        return [p for p in self.get_all_profiles() if p["ema_risk"] >= min_risk]

    def get_trusted_workers(self, max_risk: float = 0.15) -> list[dict]:
        """Get workers with consistently clean behavior."""
        return [p for p in self.get_all_profiles() if p["ema_risk"] <= max_risk and p["claim_count"] >= 3]

    def get_risk_distribution(self) -> dict:
        """Get distribution of workers across risk categories."""
        dist = {"trusted": 0, "normal": 0, "watch": 0, "flagged": 0, "blocked": 0}
        for p in self.profiles.values():
            dist[p.category] += 1
        return {
            "distribution": dist,
            "total_workers": len(self.profiles),
            "avg_risk": round(
                sum(p.ema_risk for p in self.profiles.values()) / max(len(self.profiles), 1),
                4,
            ),
            "avg_trust": round(
                sum(p.trust_score for p in self.profiles.values()) / max(len(self.profiles), 1),
                4,
            ),
        }


# Global singleton
_profiler: WorkerRiskProfiler | None = None


def get_profiler() -> WorkerRiskProfiler:
    global _profiler
    if _profiler is None:
        _profiler = WorkerRiskProfiler()
    return _profiler
