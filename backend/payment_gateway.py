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
import os
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from enum import Enum

try:
    from pymongo import MongoClient, DESCENDING
except ImportError:
    MongoClient = None
    DESCENDING = -1

try:
    import certifi
except ImportError:
    certifi = None


logger = logging.getLogger("guidewire.payment_gateway")

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "guidewire")
MONGODB_PAYOUT_COLLECTION = os.getenv("MONGODB_PAYOUT_COLLECTION", "payout_transactions")
MONGODB_TLS_ALLOW_INVALID_CERTIFICATES = (
    os.getenv("MONGODB_TLS_ALLOW_INVALID_CERTIFICATES", "false").strip().lower() == "true"
)
MONGODB_TLS_ALLOW_INVALID_HOSTNAMES = (
    os.getenv("MONGODB_TLS_ALLOW_INVALID_HOSTNAMES", "false").strip().lower() == "true"
)


def _build_mongo_client_kwargs(**overrides: object) -> dict:
    kwargs = {
        "serverSelectionTimeoutMS": 5000,
    }

    # Use certifi CA bundle so Atlas TLS works consistently on macOS Python.
    if certifi is not None:
        kwargs["tlsCAFile"] = certifi.where()

    if MONGODB_TLS_ALLOW_INVALID_CERTIFICATES:
        kwargs["tlsAllowInvalidCertificates"] = True

    if MONGODB_TLS_ALLOW_INVALID_HOSTNAMES:
        kwargs["tlsAllowInvalidHostnames"] = True

    kwargs.update(overrides)
    return kwargs


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

    @classmethod
    def from_dict(cls, payload: dict) -> "PayoutTransaction":
        initiated_at_raw = payload.get("initiated_at")
        completed_at_raw = payload.get("completed_at")

        initiated_at = (
            datetime.fromisoformat(initiated_at_raw)
            if isinstance(initiated_at_raw, str)
            else datetime.now(timezone.utc)
        )
        completed_at = (
            datetime.fromisoformat(completed_at_raw)
            if isinstance(completed_at_raw, str)
            else None
        )

        gateway_raw = payload.get("gateway", PaymentGateway.RAZORPAY.value)
        status_raw = payload.get("status", PayoutStatus.INITIATED.value)

        gateway = PaymentGateway(gateway_raw)
        status = PayoutStatus(status_raw)

        return cls(
            txn_id=str(payload.get("txn_id", "")),
            gateway=gateway,
            worker_id=int(payload.get("worker_id", 0)),
            claim_id=str(payload.get("claim_id", "")),
            amount=float(payload.get("amount", 0.0)),
            currency=str(payload.get("currency", "INR")),
            status=status,
            upi_id=payload.get("upi_id"),
            upi_ref=payload.get("upi_ref"),
            razorpay_payment_id=payload.get("razorpay_payment_id"),
            razorpay_order_id=payload.get("razorpay_order_id"),
            stripe_transfer_id=payload.get("stripe_transfer_id"),
            initiated_at=initiated_at,
            completed_at=completed_at,
            failure_reason=payload.get("failure_reason"),
            metadata=dict(payload.get("metadata") or {}),
        )


class TransactionRepository:
    def save(self, txn: PayoutTransaction) -> None:
        raise NotImplementedError

    def get(self, txn_id: str) -> PayoutTransaction | None:
        raise NotImplementedError

    def list_by_worker(self, worker_id: int) -> list[PayoutTransaction]:
        raise NotImplementedError

    def list_all(self) -> list[PayoutTransaction]:
        raise NotImplementedError


class InMemoryTransactionRepository(TransactionRepository):
    def __init__(self) -> None:
        self._transactions: dict[str, PayoutTransaction] = {}

    def save(self, txn: PayoutTransaction) -> None:
        self._transactions[txn.txn_id] = txn

    def get(self, txn_id: str) -> PayoutTransaction | None:
        return self._transactions.get(txn_id)

    def list_by_worker(self, worker_id: int) -> list[PayoutTransaction]:
        return [t for t in self._transactions.values() if t.worker_id == worker_id]

    def list_all(self) -> list[PayoutTransaction]:
        return list(self._transactions.values())


class MongoTransactionRepository(TransactionRepository):
    def __init__(self, mongo_uri: str) -> None:
        if MongoClient is None:
            raise RuntimeError("pymongo is not installed")

        # This backend runs as a long-lived API service; keep a moderate pool.
        self._client = MongoClient(
            mongo_uri,
            **_build_mongo_client_kwargs(
                connectTimeoutMS=10000,
                socketTimeoutMS=30000,
                maxPoolSize=50,
                minPoolSize=5,
                maxIdleTimeMS=300000,
            ),
        )
        self._db = self._client[MONGODB_DB_NAME]
        self._collection = self._db[MONGODB_PAYOUT_COLLECTION]
        self._client.admin.command("ping")
        self._collection.create_index("txn_id", unique=True, name="txn_id_uq")
        self._collection.create_index(
            [("worker_id", DESCENDING), ("initiated_at", DESCENDING)],
            name="worker_time_idx",
        )

    def save(self, txn: PayoutTransaction) -> None:
        payload = txn.to_dict()
        self._collection.replace_one({"txn_id": txn.txn_id}, payload, upsert=True)

    def get(self, txn_id: str) -> PayoutTransaction | None:
        payload = self._collection.find_one({"txn_id": txn_id}, {"_id": 0})
        if payload is None:
            return None
        return PayoutTransaction.from_dict(payload)

    def list_by_worker(self, worker_id: int) -> list[PayoutTransaction]:
        cursor = self._collection.find(
            {"worker_id": worker_id},
            {"_id": 0},
            sort=[("initiated_at", DESCENDING), ("txn_id", DESCENDING)],
        )
        return [PayoutTransaction.from_dict(payload) for payload in cursor]

    def list_all(self) -> list[PayoutTransaction]:
        cursor = self._collection.find(
            {},
            {"_id": 0},
            sort=[("initiated_at", DESCENDING), ("txn_id", DESCENDING)],
        )
        return [PayoutTransaction.from_dict(payload) for payload in cursor]


def create_transaction_repository() -> TransactionRepository:
    if not MONGODB_URI:
        logger.warning("MONGODB_URI missing; using in-memory payout transaction store")
        return InMemoryTransactionRepository()

    if MongoClient is None:
        logger.warning("pymongo unavailable; using in-memory payout transaction store")
        return InMemoryTransactionRepository()

    try:
        repository = MongoTransactionRepository(MONGODB_URI)
        logger.info("MongoDB payout transaction repository enabled")
        return repository
    except Exception as exc:
        logger.warning("MongoDB payout repository unavailable; using in-memory store: %s", exc)
        return InMemoryTransactionRepository()


transaction_repository: TransactionRepository = create_transaction_repository()


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

    transaction_repository.save(txn)
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

    transaction_repository.save(txn)
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

    transaction_repository.save(txn)
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
    return transaction_repository.get(txn_id)


def get_worker_transactions(worker_id: int) -> list[PayoutTransaction]:
    return transaction_repository.list_by_worker(worker_id)


def get_all_transactions() -> list[PayoutTransaction]:
    return transaction_repository.list_all()


def get_transaction_stats() -> dict:
    """Aggregate payout statistics across all gateways."""
    all_txns = transaction_repository.list_all()
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
