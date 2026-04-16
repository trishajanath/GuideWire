"""
FairRoute Simulated Payment Gateway
====================================
Mock integrations for Razorpay, Stripe sandbox, and UPI simulators.
Demonstrates instant payout flow: claim approved → payment initiated → completed.

Design Decision:
    We simulate three payment rails to show the platform is gateway-agnostic:
    1. Razorpay (test mode) — primary for Indian UPI payouts
    2. UPI direct — NPCI-style instant transfer simulation
    3. Stripe (sandbox) — international/card-based fallback

    Each gateway returns realistic response shapes matching their real APIs.
    Transaction lifecycle: INITIATED → PROCESSING → COMPLETED (or FAILED)
    Simulated latency: 0.5-2s processing time (instant in demo mode).
"""

from __future__ import annotations

import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from enum import Enum


class PaymentGateway(str, Enum):
    RAZORPAY = "razorpay"
    UPI = "upi_direct"
    STRIPE = "stripe"


class PayoutStatus(str, Enum):
    INITIATED = "initiated"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class PayoutTransaction:
    txn_id: str
    gateway: PaymentGateway
    worker_id: int
    claim_id: str
    amount: float
    currency: str = "INR"
    status: PayoutStatus = PayoutStatus.INITIATED
    upi_id: str | None = None
    upi_ref: str | None = None
    razorpay_payment_id: str | None = None
    razorpay_order_id: str | None = None
    stripe_transfer_id: str | None = None
    initiated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    failure_reason: str | None = None
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "txn_id": self.txn_id,
            "gateway": self.gateway.value,
            "worker_id": self.worker_id,
            "claim_id": self.claim_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status.value,
            "upi_id": self.upi_id,
            "upi_ref": self.upi_ref,
            "razorpay_payment_id": self.razorpay_payment_id,
            "razorpay_order_id": self.razorpay_order_id,
            "stripe_transfer_id": self.stripe_transfer_id,
            "initiated_at": self.initiated_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "processing_time_ms": int((self.completed_at - self.initiated_at).total_seconds() * 1000) if self.completed_at else None,
            "failure_reason": self.failure_reason,
            "metadata": self.metadata,
        }


# ── In-memory transaction store ───────────────────────────────────────────
_transactions: dict[str, PayoutTransaction] = {}


def _generate_txn_id() -> str:
    return f"FR-TXN-{secrets.token_hex(6).upper()}"


def _generate_upi_ref() -> str:
    return f"UPI{secrets.randbelow(10**12):012d}"


def _generate_razorpay_id() -> str:
    return f"pay_{secrets.token_hex(10)}"


def _generate_razorpay_order() -> str:
    return f"order_{secrets.token_hex(10)}"


def _generate_stripe_transfer() -> str:
    return f"tr_{secrets.token_hex(12)}"


# ═══════════════════════════════════════════════════════════════════════════
# Razorpay Test Mode Simulator
# ═══════════════════════════════════════════════════════════════════════════
def process_razorpay_payout(
    worker_id: int,
    claim_id: str,
    amount: float,
    upi_id: str = "worker@upi",
    worker_name: str = "Worker",
) -> PayoutTransaction:
    """
    Simulate Razorpay Payouts API (test mode).
    In production: POST https://api.razorpay.com/v1/payouts
    """
    txn = PayoutTransaction(
        txn_id=_generate_txn_id(),
        gateway=PaymentGateway.RAZORPAY,
        worker_id=worker_id,
        claim_id=claim_id,
        amount=amount,
        upi_id=upi_id,
        razorpay_payment_id=_generate_razorpay_id(),
        razorpay_order_id=_generate_razorpay_order(),
        status=PayoutStatus.PROCESSING,
        metadata={
            "razorpay_fund_account": f"fa_{secrets.token_hex(8)}",
            "razorpay_contact_id": f"cont_{secrets.token_hex(8)}",
            "mode": "UPI",
            "purpose": "payout",
            "beneficiary_name": worker_name,
            "narration": f"FairRoute claim payout #{claim_id}",
        },
    )

    # Simulate instant completion (test mode)
    txn.status = PayoutStatus.COMPLETED
    txn.completed_at = datetime.now(timezone.utc) + timedelta(milliseconds=850)
    txn.upi_ref = _generate_upi_ref()

    _transactions[txn.txn_id] = txn
    return txn


# ═══════════════════════════════════════════════════════════════════════════
# UPI Direct Simulator (NPCI-style)
# ═══════════════════════════════════════════════════════════════════════════
def process_upi_payout(
    worker_id: int,
    claim_id: str,
    amount: float,
    upi_id: str = "worker@upi",
    worker_name: str = "Worker",
) -> PayoutTransaction:
    """
    Simulate NPCI UPI instant transfer.
    In production: UPI PSP API → NPCI → beneficiary bank.
    """
    txn = PayoutTransaction(
        txn_id=_generate_txn_id(),
        gateway=PaymentGateway.UPI,
        worker_id=worker_id,
        claim_id=claim_id,
        amount=amount,
        upi_id=upi_id,
        upi_ref=_generate_upi_ref(),
        status=PayoutStatus.PROCESSING,
        metadata={
            "payer_vpa": "fairroute.claims@icici",
            "payee_vpa": upi_id,
            "txn_type": "CREDIT",
            "npci_txn_id": f"NPCI{secrets.randbelow(10**16):016d}",
            "purpose": "07",  # NPCI purpose code for insurance claim
            "beneficiary_name": worker_name,
            "remark": f"FairRoute payout - Claim {claim_id}",
        },
    )

    # UPI completes in ~500ms
    txn.status = PayoutStatus.COMPLETED
    txn.completed_at = datetime.now(timezone.utc) + timedelta(milliseconds=520)

    _transactions[txn.txn_id] = txn
    return txn


# ═══════════════════════════════════════════════════════════════════════════
# Stripe Sandbox Simulator
# ═══════════════════════════════════════════════════════════════════════════
def process_stripe_payout(
    worker_id: int,
    claim_id: str,
    amount: float,
    worker_name: str = "Worker",
) -> PayoutTransaction:
    """
    Simulate Stripe Connect Transfer (sandbox mode).
    In production: POST https://api.stripe.com/v1/transfers
    """
    amount_usd = round(amount / 83.5, 2)  # INR to USD conversion
    txn = PayoutTransaction(
        txn_id=_generate_txn_id(),
        gateway=PaymentGateway.STRIPE,
        worker_id=worker_id,
        claim_id=claim_id,
        amount=amount,
        currency="INR",
        stripe_transfer_id=_generate_stripe_transfer(),
        status=PayoutStatus.PROCESSING,
        metadata={
            "stripe_account": f"acct_{secrets.token_hex(8)}",
            "stripe_balance_txn": f"txn_{secrets.token_hex(12)}",
            "amount_usd": amount_usd,
            "exchange_rate": 83.5,
            "transfer_group": f"claim_{claim_id}",
            "description": f"FairRoute insurance payout for worker {worker_id}",
        },
    )

    # Stripe processes in ~1.2s
    txn.status = PayoutStatus.COMPLETED
    txn.completed_at = datetime.now(timezone.utc) + timedelta(milliseconds=1200)

    _transactions[txn.txn_id] = txn
    return txn


# ═══════════════════════════════════════════════════════════════════════════
# Unified Payout Processor
# ═══════════════════════════════════════════════════════════════════════════
def process_payout(
    *,
    worker_id: int,
    claim_id: str,
    amount: float,
    gateway: str = "razorpay",
    upi_id: str = "worker@upi",
    worker_name: str = "Worker",
) -> PayoutTransaction:
    """Route payout to the appropriate gateway."""
    if gateway == "upi_direct":
        return process_upi_payout(worker_id, claim_id, amount, upi_id, worker_name)
    elif gateway == "stripe":
        return process_stripe_payout(worker_id, claim_id, amount, worker_name)
    else:
        return process_razorpay_payout(worker_id, claim_id, amount, upi_id, worker_name)


def get_transaction(txn_id: str) -> PayoutTransaction | None:
    return _transactions.get(txn_id)


def get_worker_transactions(worker_id: int) -> list[PayoutTransaction]:
    return [t for t in _transactions.values() if t.worker_id == worker_id]


def get_all_transactions() -> list[PayoutTransaction]:
    return list(_transactions.values())


def get_transaction_stats() -> dict:
    """Aggregate payout statistics across all gateways."""
    all_txns = list(_transactions.values())
    completed = [t for t in all_txns if t.status == PayoutStatus.COMPLETED]
    processing_times = [
        (t.completed_at - t.initiated_at).total_seconds() * 1000
        for t in completed if t.completed_at
    ]

    by_gateway: dict[str, dict] = {}
    for t in all_txns:
        gw = t.gateway.value
        if gw not in by_gateway:
            by_gateway[gw] = {"count": 0, "total_amount": 0.0, "completed": 0, "failed": 0}
        by_gateway[gw]["count"] += 1
        by_gateway[gw]["total_amount"] += t.amount
        if t.status == PayoutStatus.COMPLETED:
            by_gateway[gw]["completed"] += 1
        elif t.status == PayoutStatus.FAILED:
            by_gateway[gw]["failed"] += 1

    return {
        "total_transactions": len(all_txns),
        "total_completed": len(completed),
        "total_amount_disbursed": round(sum(t.amount for t in completed), 2),
        "avg_processing_time_ms": round(sum(processing_times) / len(processing_times), 0) if processing_times else 0,
        "by_gateway": by_gateway,
    }
