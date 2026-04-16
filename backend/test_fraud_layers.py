"""Quick test of the 5-layer fraud engine scoring."""
import sys
sys.path.insert(0, ".")
from main import _trigger_fraud_breakdown, _format_fraud_decision

scenarios = {
    "Clean claim":        dict(gps_in_zone=True,  app_active=True,  zone_worker_ratio=0.5, duplicate_claim=False, claim_frequency_ratio=0.0, vpn_detected=False),
    "VPN only":           dict(gps_in_zone=True,  app_active=True,  zone_worker_ratio=0.5, duplicate_claim=False, claim_frequency_ratio=0.0, vpn_detected=True),
    "GPS spoof only":     dict(gps_in_zone=False, app_active=True,  zone_worker_ratio=0.5, duplicate_claim=False, claim_frequency_ratio=0.0, vpn_detected=False),
    "App inactive only":  dict(gps_in_zone=True,  app_active=False, zone_worker_ratio=0.5, duplicate_claim=False, claim_frequency_ratio=0.0, vpn_detected=False),
    "Duplicate only":     dict(gps_in_zone=True,  app_active=True,  zone_worker_ratio=0.5, duplicate_claim=True,  claim_frequency_ratio=0.0, vpn_detected=False),
    "GPS + VPN":          dict(gps_in_zone=False, app_active=True,  zone_worker_ratio=0.5, duplicate_claim=False, claim_frequency_ratio=0.0, vpn_detected=True),
    "All fraud signals":  dict(gps_in_zone=False, app_active=False, zone_worker_ratio=0.1, duplicate_claim=True,  claim_frequency_ratio=1.0, vpn_detected=True),
}

print(f"{'Scenario':<22} {'Score':>6}  {'Decision':<22} Flagged layers")
print("-" * 90)
for name, args in scenarios.items():
    score, bd = _trigger_fraud_breakdown(**args)
    decision = _format_fraud_decision(score)
    flagged = [f"{b['label'][:15]}={b['value']}" for b in bd if b["value"] > 0]
    print(f"{name:<22} {score*100:5.1f}%  {decision:<22} {', '.join(flagged) or 'all clear'}")
