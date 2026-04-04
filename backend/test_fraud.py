from fraud_engine import assess_fraud, GPSPoint, ClaimRecord, ZONE_CENTERS
from datetime import datetime, timezone, timedelta

print("=== CLEAN CLAIM ===")
result = assess_fraud(
    worker_gps=GPSPoint(12.9352, 77.6245, datetime.now(timezone.utc)),
    claimed_zone_id="koramangala_blr",
    claim_history=[],
    weather_risk_score=75,
    zone_anomaly_score=-0.5,
    zone_has_active_trigger=True,
    previous_gps=GPSPoint(12.9352, 77.6245, datetime.now(timezone.utc)),
    active_hours_today=4.0,
    is_logged_in=True,
)
d = result.to_dict()
print("Score:", d["overall_score"], "Risk:", d["risk_level"], "Allow:", d["allow_payout"])
for s in d["signals"]:
    print("  %s: %.3f" % (s["layer"], s["score"]))

print("\n=== FRAUDULENT CLAIM (GPS spoofing + no disruption + many claims) ===")
now = datetime.now(timezone.utc)
fake_history = [
    ClaimRecord(timestamp=now - timedelta(hours=i), zone_id="koramangala_blr", payout_amount=500)
    for i in range(6)
]
result2 = assess_fraud(
    worker_gps=GPSPoint(19.076, 72.877, now),  # Mumbai GPS, claiming Bengaluru zone
    claimed_zone_id="koramangala_blr",
    claim_history=fake_history,
    weather_risk_score=15,  # No weather disruption
    zone_anomaly_score=0.5,  # Normal zone
    zone_has_active_trigger=False,
    previous_gps=GPSPoint(12.9352, 77.6245, now - timedelta(minutes=5)),  # Was in Bengaluru 5min ago
    active_hours_today=0.1,
    is_logged_in=False,
)
d2 = result2.to_dict()
print("Score:", d2["overall_score"], "Risk:", d2["risk_level"], "Allow:", d2["allow_payout"])
for s in d2["signals"]:
    print("  %s: %.3f - %s" % (s["layer"], s["score"], s["reason"]))
