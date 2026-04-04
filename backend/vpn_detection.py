"""
VPN / Proxy / Datacenter IP Detection
======================================
Detects whether a client IP is coming from a VPN, proxy, Tor exit node,
or cloud datacenter — all of which are red flags for a gig worker claiming
location-based insurance.

Why this matters for FairRoute:
    A fraudster can spoof GPS coordinates, but they also need to hide their
    real network location. VPN/proxy usage during a claim is a strong
    corroborating signal alongside GPS mismatch.

Detection strategy (layered):
    1. Known datacenter/VPN ASN ranges (AWS, GCP, Azure, DigitalOcean, NordVPN, etc.)
    2. Known Tor exit node detection (via DNS-based lookup)
    3. IP geolocation mismatch vs claimed GPS (IP says Mumbai, GPS says Bengaluru)
    4. Port scanning heuristics (VPN protocols use characteristic ports)

For MVP/demo: We use a combination of:
    - Known datacenter CIDR ranges (hardcoded for speed)
    - Free ipinfo.io / ip-api.com lookup for AS info
    - Simulated mode for demo (toggle VPN detection without real IP check)
"""

from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore


# ── Known datacenter / VPN provider ASN keywords ───────────────────────
# If the AS description contains any of these, flag it
VPN_ASN_KEYWORDS = [
    "amazon", "aws", "google cloud", "microsoft azure", "digitalocean",
    "linode", "vultr", "ovh", "hetzner", "choopa", "nordvpn", "expressvpn",
    "surfshark", "mullvad", "protonvpn", "cyberghost", "privateinternetaccess",
    "tor-exit", "cloudflare warp", "oracle cloud", "alibaba cloud",
    "data center", "datacenter", "hosting", "colocation", "server",
]

# ── Known datacenter CIDR ranges (subset for fast local check) ─────────
# These are well-known cloud provider ranges — a real production system
# would use a full MaxMind or ip2proxy database
DATACENTER_CIDRS = [
    # AWS (partial)
    "3.0.0.0/8", "13.32.0.0/12", "18.0.0.0/8", "52.0.0.0/8", "54.0.0.0/8",
    # GCP (partial)
    "34.0.0.0/8", "35.184.0.0/13",
    # Azure (partial)
    "13.64.0.0/11", "20.0.0.0/8", "40.64.0.0/10",
    # DigitalOcean (partial)
    "104.131.0.0/16", "159.65.0.0/16", "167.71.0.0/16",
    # Common VPN exit nodes
    "185.65.134.0/24", "103.86.96.0/21",
]

_PARSED_CIDRS = [ipaddress.ip_network(cidr, strict=False) for cidr in DATACENTER_CIDRS]


@dataclass
class VPNCheckResult:
    is_vpn: bool
    confidence: float          # 0.0 to 1.0
    reason: str
    ip_address: str
    ip_location: str | None    # City/region from IP geolocation
    asn_org: str | None        # AS organization name
    detection_method: str      # "cidr_match" | "asn_lookup" | "ip_geolocation_mismatch" | "simulated"

    def to_dict(self) -> dict:
        return {
            "is_vpn": self.is_vpn,
            "confidence": round(self.confidence, 2),
            "reason": self.reason,
            "ip_address": self.ip_address,
            "ip_location": self.ip_location,
            "asn_org": self.asn_org,
            "detection_method": self.detection_method,
        }


def _check_cidr(ip_str: str) -> bool:
    """Check if IP falls within known datacenter CIDR ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in network for network in _PARSED_CIDRS)
    except ValueError:
        return False


def _is_private_or_localhost(ip_str: str) -> bool:
    """Check if IP is private/localhost (common in dev/demo)."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback
    except ValueError:
        return False


async def _lookup_ip_info(ip_str: str) -> dict | None:
    """Query ip-api.com for ASN and geolocation info (free, no key needed)."""
    if httpx is None:
        return None
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"http://ip-api.com/json/{ip_str}",
                params={"fields": "status,city,regionName,country,isp,org,as,hosting,proxy"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    return data
    except Exception:
        pass
    return None


async def check_vpn(
    ip_address: str,
    claimed_city: str | None = None,
    *,
    simulated_vpn: bool = False,
) -> VPNCheckResult:
    """
    Check if the given IP is likely a VPN/proxy/datacenter.

    Args:
        ip_address: Client IP to check
        claimed_city: City the worker claims to be in (for geolocation mismatch)
        simulated_vpn: If True, simulate VPN detection (for demo mode)
    """
    # Demo simulation mode
    if simulated_vpn:
        return VPNCheckResult(
            is_vpn=True,
            confidence=0.95,
            reason="VPN/proxy detected — IP routes through datacenter, not a residential ISP. "
                   "Gig workers on mobile data use residential IPs from Jio/Airtel/Vi, not cloud providers.",
            ip_address=ip_address or "10.8.0.1",
            ip_location="Frankfurt, Germany (VPN exit node)",
            asn_org="NordVPN / Datacenter AS",
            detection_method="simulated",
        )

    # Localhost / private IP — skip (dev environment)
    if not ip_address or _is_private_or_localhost(ip_address):
        return VPNCheckResult(
            is_vpn=False,
            confidence=0.0,
            reason="Private/localhost IP — skipping VPN check (development environment).",
            ip_address=ip_address or "127.0.0.1",
            ip_location=None,
            asn_org=None,
            detection_method="skip_private",
        )

    # Layer 1: Fast CIDR check against known datacenter ranges
    if _check_cidr(ip_address):
        return VPNCheckResult(
            is_vpn=True,
            confidence=0.90,
            reason=f"IP {ip_address} falls within a known cloud/datacenter CIDR range. "
                   "Residential mobile connections (Jio/Airtel/Vi) never use these ranges.",
            ip_address=ip_address,
            ip_location=None,
            asn_org="Known datacenter range",
            detection_method="cidr_match",
        )

    # Layer 2: ASN lookup via ip-api.com
    info = await _lookup_ip_info(ip_address)
    if info:
        # Check hosting flag (ip-api detects datacenter IPs)
        if info.get("hosting") is True or info.get("proxy") is True:
            return VPNCheckResult(
                is_vpn=True,
                confidence=0.85,
                reason=f"IP flagged as {'proxy' if info.get('proxy') else 'hosting/datacenter'} "
                       f"by network intelligence. ISP: {info.get('isp', 'unknown')}.",
                ip_address=ip_address,
                ip_location=f"{info.get('city', '?')}, {info.get('country', '?')}",
                asn_org=info.get("org") or info.get("isp"),
                detection_method="asn_lookup",
            )

        # Check ASN org name against known VPN/datacenter keywords
        org = (info.get("org") or info.get("isp") or "").lower()
        as_info = (info.get("as") or "").lower()
        for keyword in VPN_ASN_KEYWORDS:
            if keyword in org or keyword in as_info:
                return VPNCheckResult(
                    is_vpn=True,
                    confidence=0.80,
                    reason=f"ASN organization matches known VPN/datacenter provider: "
                           f"{info.get('org', 'unknown')}.",
                    ip_address=ip_address,
                    ip_location=f"{info.get('city', '?')}, {info.get('country', '?')}",
                    asn_org=info.get("org") or info.get("isp"),
                    detection_method="asn_keyword_match",
                )

        # Layer 3: IP geolocation vs claimed city mismatch
        if claimed_city:
            ip_city = (info.get("city") or "").lower().strip()
            claimed = claimed_city.lower().strip()
            # Allow some leeway (same state/region)
            ip_region = (info.get("regionName") or "").lower().strip()
            if ip_city and claimed not in ip_city and claimed not in ip_region:
                return VPNCheckResult(
                    is_vpn=False,  # Not necessarily VPN, but suspicious
                    confidence=0.60,
                    reason=f"IP geolocation ({info.get('city', '?')}, {info.get('regionName', '?')}) "
                           f"doesn't match claimed city ({claimed_city}). Could indicate VPN or travel.",
                    ip_address=ip_address,
                    ip_location=f"{info.get('city', '?')}, {info.get('regionName', '?')}",
                    asn_org=info.get("org") or info.get("isp"),
                    detection_method="ip_geolocation_mismatch",
                )

        # Clean — residential IP matching claimed location
        return VPNCheckResult(
            is_vpn=False,
            confidence=0.0,
            reason=f"Residential IP from {info.get('isp', 'unknown')}. "
                   f"Location: {info.get('city', '?')}, {info.get('country', '?')}.",
            ip_address=ip_address,
            ip_location=f"{info.get('city', '?')}, {info.get('country', '?')}",
            asn_org=info.get("org") or info.get("isp"),
            detection_method="residential_confirmed",
        )

    # Fallback — couldn't determine
    return VPNCheckResult(
        is_vpn=False,
        confidence=0.0,
        reason="Could not determine VPN status — IP lookup unavailable.",
        ip_address=ip_address,
        ip_location=None,
        asn_org=None,
        detection_method="lookup_failed",
    )
