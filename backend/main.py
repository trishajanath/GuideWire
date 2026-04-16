import os
import logging
import secrets
import random
import re
import hashlib
import math
from pathlib import Path
from typing import Literal
from datetime import datetime, timezone, timedelta

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def load_local_env_file() -> None:
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_local_env_file()

try:
    from pymongo import MongoClient, DESCENDING
    from pymongo.errors import PyMongoError
    from pymongo import ReturnDocument
except ImportError:
    MongoClient = None
    DESCENDING = -1
    ReturnDocument = None

    class PyMongoError(Exception):
        pass

try:
    from .triggers import (
        evaluate_trigger_pipeline,
    )
except ImportError:
    from triggers import (
        evaluate_trigger_pipeline,
    )

try:
    from .weather_risk import calculate_weather_risk
except ImportError:
    from weather_risk import calculate_weather_risk

try:
    from .zone_activity import calculate_zone_activity_score
except ImportError:
    from zone_activity import calculate_zone_activity_score

try:
    from .trigger_detection import detect_trigger
except ImportError:
    from trigger_detection import detect_trigger

try:
    from .trigger_validation import validate_claim
except ImportError:
    from trigger_validation import validate_claim

try:
    from .payout import calculate_payout_amount
except ImportError:
    from payout import calculate_payout_amount

try:
    from .plan_recommendation import recommend_plan
except ImportError:
    from plan_recommendation import recommend_plan

try:
    from .premium_engine import (
        PremiumRequestInput,
        calculate_premium as calculate_dynamic_premium,
        get_premium_model_info,
        get_premium_zones,
        train_premium_model,
    )
except ImportError:
    from premium_engine import (  # type: ignore
        PremiumRequestInput,
        calculate_premium as calculate_dynamic_premium,
        get_premium_model_info,
        get_premium_zones,
        train_premium_model,
    )

try:
    from .assistant import generate_assistant_reply, generate_city_zone_suggestions
except ImportError:
    from assistant import generate_assistant_reply, generate_city_zone_suggestions

try:
    from .imd_alerts import (
        create_imd_alert,
        fetch_imd_alerts,
        get_latest_imd_alert,
        init_imd_alerts_table,
        list_recent_imd_alerts,
    )
except ImportError:
    from imd_alerts import (
        create_imd_alert,
        fetch_imd_alerts,
        get_latest_imd_alert,
        init_imd_alerts_table,
        list_recent_imd_alerts,
    )

try:
    from .fraud_engine import assess_fraud, GPSPoint, ClaimRecord as FraudClaimRecord, ZONE_CENTERS
except ImportError:
    from fraud_engine import assess_fraud, GPSPoint, ClaimRecord as FraudClaimRecord, ZONE_CENTERS

try:
    from .vpn_detection import check_vpn, VPNCheckResult
except ImportError:
    from vpn_detection import check_vpn, VPNCheckResult

try:
    from .payment_gateway import (
        process_payout,
        get_transaction,
        get_worker_transactions,
        get_all_transactions,
        get_transaction_stats,
    )
except ImportError:
    from payment_gateway import (
        process_payout,
        get_transaction,
        get_worker_transactions,
        get_all_transactions,
        get_transaction_stats,
    )

try:
    from .models import (
        TriggerDecisionResponse,
        WeatherRiskResponse,
        ZoneActivityResponse,
        TriggerCheckResponse,
        ValidateClaimRequest,
        ValidateClaimResponse,
        PayoutCalculationRequest,
        PayoutCalculationResponse,
        RecommendPlanRequest,
        RecommendPlanResponse,
        AssistantChatRequest,
        AssistantChatResponse,
    )
except ImportError:
    from models import (
        TriggerDecisionResponse,
        WeatherRiskResponse,
        ZoneActivityResponse,
        TriggerCheckResponse,
        ValidateClaimRequest,
        ValidateClaimResponse,
        PayoutCalculationRequest,
        PayoutCalculationResponse,
        RecommendPlanRequest,
        RecommendPlanResponse,
        AssistantChatRequest,
        AssistantChatResponse,
    )

app = FastAPI(title="GuideWire Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger = logging.getLogger("guidewire.weather_ingestion")

OPENWEATHER_API_KEY = os.getenv(
    "OPENWEATHER_API_KEY",
    "b24296a2f364be079c64491cd5ed5ce0",
)
OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "guidewire")
MONGODB_RAW_EVENTS_COLLECTION = os.getenv("MONGODB_RAW_EVENTS_COLLECTION", "raw_events")
MONGODB_COUNTERS_COLLECTION = os.getenv("MONGODB_COUNTERS_COLLECTION", "counters")

# Maps internal zone IDs to the city query used by OpenWeather.
ZONE_CONFIG: dict[str, str] = {
    "koramangala_blr": "Bengaluru,IN",
    "indiranagar_blr": "Bengaluru,IN",
    "whitefield_blr": "Bengaluru,IN",
    "hsr_layout_blr": "Bengaluru,IN",
    "electronic_city_blr": "Bengaluru,IN",
    "coimbatore_gandhipuram": "Coimbatore,IN",
    "coimbatore_rs_puram": "Coimbatore,IN",
    "coimbatore_peelamedu": "Coimbatore,IN",
    "coimbatore_saibaba_colony": "Coimbatore,IN",
    "coimbatore_race_course": "Coimbatore,IN",
}

ZONE_ACTIVITY_DATA: dict[str, dict] = {
    "koramangala_blr": {"active_workers": 47, "idle_workers": 12, "avg_distance": 3.1},
    "indiranagar_blr": {"active_workers": 38, "idle_workers": 9, "avg_distance": 2.7},
    "whitefield_blr": {"active_workers": 53, "idle_workers": 21, "avg_distance": 5.4},
    "hsr_layout_blr": {"active_workers": 41, "idle_workers": 14, "avg_distance": 3.6},
    "electronic_city_blr": {"active_workers": 34, "idle_workers": 19, "avg_distance": 4.9},
    "coimbatore_gandhipuram": {"active_workers": 42, "idle_workers": 11, "avg_distance": 2.9},
    "coimbatore_rs_puram": {"active_workers": 36, "idle_workers": 8, "avg_distance": 2.4},
    "coimbatore_peelamedu": {"active_workers": 45, "idle_workers": 16, "avg_distance": 4.2},
    "coimbatore_saibaba_colony": {"active_workers": 33, "idle_workers": 10, "avg_distance": 3.0},
    "coimbatore_race_course": {"active_workers": 29, "idle_workers": 7, "avg_distance": 2.6},
}

WORKER_ELIGIBILITY_DB: dict[str, bool] = {
    "worker_1": True,
    "worker_2": True,
    "worker_3": False,
}

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

users: dict[int, dict] = {}
claims: list[dict] = []
policies: dict[int, dict] = {}
policy_history: dict[int, list[dict]] = {}
plans = {
    "Basic": {"weekly_premium": 49, "daily_cap": 500, "max_payout": 2000, "hourly_rate": 75},
    "Standard": {"weekly_premium": 69, "daily_cap": 800, "max_payout": 3500, "hourly_rate": 100},
    "Premium": {"weekly_premium": 99, "daily_cap": 1200, "max_payout": 6000, "hourly_rate": 150},
}
high_rainfall_cities = {"mumbai", "bengaluru", "bangalore", "kochi", "chennai", "coimbatore"}
low_risk_cities = {"jaipur", "indore", "nagpur"}
mock_rainfall_by_city = {
    "mumbai": 48,
    "bengaluru": 36,
    "bangalore": 36,
    "kochi": 42,
    "chennai": 31,
    "coimbatore": 32,
    "jaipur": 8,
    "indore": 10,
    "nagpur": 12,
}
rainfall_threshold_mm = 30


class RawWeatherEvent(BaseModel):
    id: int = Field(..., ge=1)
    zone_id: str = Field(..., min_length=1)
    temperature: float
    rainfall: float = Field(..., ge=0)
    humidity: float = Field(..., ge=0)
    wind_speed: float = Field(..., ge=0)
    timestamp: datetime


class RawWeatherEventRepository:
    def insert(self, event: RawWeatherEvent) -> RawWeatherEvent:
        raise NotImplementedError

    def get_latest_by_zone(self, zone_id: str) -> RawWeatherEvent | None:
        raise NotImplementedError


class MongoRawWeatherEventRepositoryPlaceholder(RawWeatherEventRepository):
    """In-memory placeholder until MongoDB persistence is wired in."""

    def __init__(self) -> None:
        self._events: list[RawWeatherEvent] = []
        self._next_id: int = 1

    def insert(self, event: RawWeatherEvent) -> RawWeatherEvent:
        stored_event = event.model_copy(update={"id": self._next_id})
        self._events.append(stored_event)
        self._next_id += 1
        return stored_event

    def get_latest_by_zone(self, zone_id: str) -> RawWeatherEvent | None:
        for event in reversed(self._events):
            if event.zone_id == zone_id:
                return event
        return None


class MongoRawWeatherEventRepository(RawWeatherEventRepository):
    """MongoDB-backed repository with integer auto-increment ids."""

    def __init__(self, mongo_uri: str) -> None:
        if MongoClient is None:
            raise RuntimeError("pymongo is not installed")

        self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        self._db = self._client[MONGODB_DB_NAME]
        self._raw_events = self._db[MONGODB_RAW_EVENTS_COLLECTION]
        self._counters = self._db[MONGODB_COUNTERS_COLLECTION]

        # Quick connectivity check and index creation at startup.
        self._client.admin.command("ping")
        self._raw_events.create_index(
            [("zone_id", DESCENDING), ("timestamp", DESCENDING)],
            name="zone_timestamp_desc_idx",
        )

    def _next_id(self) -> int:
        result = self._counters.find_one_and_update(
            {"_id": "raw_events_id"},
            {"$inc": {"value": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        # On first insert, guard against missing field from newly upserted doc.
        return int(result.get("value", 1))

    def insert(self, event: RawWeatherEvent) -> RawWeatherEvent:
        event_id = self._next_id()
        stored_event = event.model_copy(update={"id": event_id})
        self._raw_events.insert_one(stored_event.model_dump())
        return stored_event

    def get_latest_by_zone(self, zone_id: str) -> RawWeatherEvent | None:
        document = self._raw_events.find_one(
            {"zone_id": zone_id},
            sort=[("timestamp", DESCENDING), ("id", DESCENDING)],
        )
        if document is None:
            return None

        return RawWeatherEvent(**document)


def create_raw_event_repository() -> RawWeatherEventRepository:
    if not MONGODB_URI:
        logger.info("MONGODB_URI is not set; using in-memory raw-events repository")
        return MongoRawWeatherEventRepositoryPlaceholder()

    if MongoClient is None:
        logger.warning("pymongo is unavailable; using in-memory raw-events repository")
        return MongoRawWeatherEventRepositoryPlaceholder()

    try:
        repository = MongoRawWeatherEventRepository(MONGODB_URI)
        logger.info("MongoDB raw-events repository enabled")
        return repository
    except (PyMongoError, RuntimeError) as exc:
        logger.warning("MongoDB unavailable, falling back to in-memory repository: %s", exc)
        return MongoRawWeatherEventRepositoryPlaceholder()


raw_event_repository: RawWeatherEventRepository = create_raw_event_repository()


def _build_weather_event(zone_id: str, payload: dict) -> RawWeatherEvent:
    weather = payload.get("weather") or []
    weather_main = weather[0].get("main", "") if weather else ""
    main = payload.get("main", {})
    wind = payload.get("wind", {})
    rain = payload.get("rain", {})

    rainfall_mm = rain.get("1h")
    if rainfall_mm is None:
        rainfall_mm = rain.get("3h", 0.0)

    # Fallback for light drizzle where OpenWeather may omit rain object.
    if weather_main.lower() in {"rain", "drizzle", "thunderstorm"} and rainfall_mm == 0.0:
        rainfall_mm = 0.1

    return RawWeatherEvent(
        id=1,
        zone_id=zone_id,
        temperature=float(main.get("temp", 0.0)),
        rainfall=float(rainfall_mm),
        humidity=float(main.get("humidity", 0.0)),
        wind_speed=float(wind.get("speed", 0.0)) * 3.6,
        timestamp=datetime.now(timezone.utc),
    )


async def fetch_openweather_payload(city_query: str) -> dict | None:
    params = {
        "q": city_query,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(OPENWEATHER_URL, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError:
        return None


def build_city_weather_response(city_query: str, payload: dict) -> dict:
    event = _build_weather_event(city_query, payload)
    risk = calculate_weather_risk(
        {
            "rainfall": event.rainfall,
            "temperature": event.temperature,
            "humidity": event.humidity,
            "wind_speed": event.wind_speed,
        }
    )
    weather = payload.get("weather") or []
    condition = weather[0].get("main", "Unknown") if weather else "Unknown"

    return {
        "city": city_query,
        "condition": condition,
        "temperature": event.temperature,
        "humidity": event.humidity,
        "wind_speed": event.wind_speed,
        "rainfall": event.rainfall,
        "weather_risk_score": risk["weather_risk_score"],
        "trigger_probability": risk["trigger_probability"],
        "trigger_type": risk["trigger_type"],
    }


async def fetch_weather_for_zone(zone_id: str, city_query: str) -> RawWeatherEvent | None:
    params = {
        "q": city_query,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(OPENWEATHER_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError:
        return None

    event = _build_weather_event(zone_id, payload)
    return raw_event_repository.insert(event)


async def ingest_weather_events_job() -> None:
    for zone_id, city_query in ZONE_CONFIG.items():
        await fetch_weather_for_zone(zone_id=zone_id, city_query=city_query)


@app.on_event("startup")
async def start_background_scheduler() -> None:
    init_imd_alerts_table()
    try:
        train_premium_model(n_samples=500)
    except Exception as exc:
        logger.exception("Premium model training failed at startup: %s", exc)

    scheduler.add_job(
        ingest_weather_events_job,
        trigger=IntervalTrigger(minutes=15),
        id="openweather_ingestion",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        fetch_imd_alerts,
        trigger=IntervalTrigger(minutes=15),
        id="imd_rss_ingestion",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    await ingest_weather_events_job()
    fetch_imd_alerts()


@app.on_event("shutdown")
async def shutdown_background_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


class RegistrationRequest(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=6)
    city: str = Field(..., min_length=1)
    platform: Literal["Swiggy", "Zomato"]
    zone_area: str | None = None


class OTPSendRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=10)


class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=10)
    otp: str = Field(..., min_length=6, max_length=6)


# ── OTP store: phone → {otp, expires_at, verified} ────────────────────────
otp_store: dict[str, dict] = {}

OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6


class PlanSelectionRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    selected_plan: Literal["Basic", "Standard", "Premium"]


class PremiumCalculateRequest(BaseModel):
    zone: str = Field(..., min_length=1)
    plan: Literal["Basic", "Standard", "Premium"]
    month: int | None = Field(default=None, ge=1, le=12)
    tenure_months: float = Field(..., ge=0)
    claims_paid: float = Field(..., ge=0)
    premium_paid: float = Field(..., gt=0)
    avg_daily_hours: float = Field(..., ge=0)


class PremiumAdjustmentItem(BaseModel):
    label: str
    amount: float
    direction: Literal["up", "down"]


class PremiumCalculateResponse(BaseModel):
    plan: Literal["Basic", "Standard", "Premium"]
    zone: str
    base: float
    final_premium: float
    premium_adjustment: float
    itemised_adjustments: list[PremiumAdjustmentItem]
    risk_score: int
    explanation: str


class PremiumZoneItem(BaseModel):
    zone: str
    city: str
    flood_score: float
    annual_rainfall_mm: float
    heat_days_gt_40c: float


class PremiumZonesResponse(BaseModel):
    zones: list[PremiumZoneItem]


class PremiumModelInfoResponse(BaseModel):
    trained_rows: int
    r2: float
    intercept: float
    coefficients: dict[str, float]
    features: list[str]
    trained_at: str | None = None


class ClaimEvaluateRequest(BaseModel):
    worker_id: int = Field(..., ge=1)
    zone_id: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    gps_lat: float
    gps_lon: float
    hours_lost: float = Field(..., gt=0)
    app_active: bool = True
    event_timestamp: datetime | None = None
    demo_mode: bool = False
    demo_scenario: Literal[
        "none",
        "heavy_rain",
        "extreme_heat",
        "cyclone_alert",
        "urban_flooding",
        "poor_visibility",
        "demand_collapse",
        "order_pause",
        "zone_shutdown",
        "zone_restriction",
        "platform_outage",
        "curfew",
        "public_health_emergency",
        "civil_disturbance",
        "infrastructure_failure",
    ] = "none"
    demo_scenarios: list[
        Literal[
            "heavy_rain",
            "extreme_heat",
            "cyclone_alert",
            "urban_flooding",
            "poor_visibility",
            "demand_collapse",
            "order_pause",
            "zone_shutdown",
            "zone_restriction",
            "platform_outage",
            "curfew",
            "public_health_emergency",
            "civil_disturbance",
            "infrastructure_failure",
        ]
    ] = Field(default_factory=list)
    simulate_vpn: bool = False
    fraud_test_overrides: dict | None = Field(default=None, description="Override fraud signals for fraud demo testing. Keys: force_duplicate, force_frequency, force_gps_fail, force_app_inactive")


class AutoTriggerSimulationRequest(BaseModel):
    worker_id: int = Field(..., ge=1)
    city: str = Field(..., min_length=1)
    zone_id: str | None = None
    hours_lost: float = Field(default=3.0, gt=0)
    app_active: bool = True
    seed: int | None = None


class TriggerEligibilityResponse(BaseModel):
    policy_active: bool
    premium_paid: bool
    gps_in_zone: bool


class TriggerFraudBreakdownItem(BaseModel):
    label: str
    weight: float
    value: float
    contribution: float


class TriggerFraudResponse(BaseModel):
    score: float
    breakdown: list[TriggerFraudBreakdownItem]
    decision: Literal["auto-approve", "approve-with-flag", "hold-for-review"]


class TriggerPayoutResponse(BaseModel):
    hours_lost: float
    hourly_rate: float
    severity_multiplier: float
    daily_cap: float
    raw_amount: float
    final_amount: float
    formula: str


class ClaimTriggerResponse(BaseModel):
    name: str
    category: Literal["weather", "platform", "external"]
    source: Literal["openweather", "mock"]
    fired: bool
    status: Literal["fired", "not-fired"]
    value: float | None = None
    threshold: float | None = None
    severity_multiplier: float
    eligibility: TriggerEligibilityResponse
    fraud: TriggerFraudResponse | None = None
    payout: TriggerPayoutResponse | None = None


class ClaimEvaluateResponse(BaseModel):
    worker_id: int
    zone_id: str
    city: str
    claim_status: Literal["no-trigger", "auto-approve", "approve-with-flag", "hold-for-review"]
    fraud_score: float
    payout_amount: float
    trigger_list: list[ClaimTriggerResponse]
    demo_scenario_applied: str | None = None
    demo_scenarios_applied: list[str] = Field(default_factory=list)
    explanation: str
    ai_verdict: str | None = None


CLAIM_GPS_MAX_DISTANCE_KM = 15.0

CLAIM_ZONE_CENTERS: dict[str, tuple[float, float]] = {
    "koramangala_blr": (12.9352, 77.6245),
    "indiranagar_blr": (12.9784, 77.6408),
    "whitefield_blr": (12.9698, 77.7500),
    "hsr_layout_blr": (12.9116, 77.6472),
    "electronic_city_blr": (12.8456, 77.6603),
    "coimbatore_gandhipuram": (11.0168, 76.9558),
    "coimbatore_rs_puram": (11.0120, 76.9490),
    "coimbatore_peelamedu": (11.0250, 77.0020),
    "coimbatore_saibaba_colony": (11.0210, 76.9650),
    "coimbatore_race_course": (11.0008, 76.9620),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "coimbatore": (11.0168, 76.9558),
    "mumbai": (19.0760, 72.8777),
    "chennai": (13.0827, 80.2707),
    "kochi": (9.9312, 76.2673),
    "kolkata": (22.5726, 88.3639),
    "hyderabad": (17.3850, 78.4867),
    "delhi": (28.6139, 77.2090),
}

CLAIM_ZONE_SHUTDOWN_ZONES = {"mumbai", "chennai", "kolkata", "kochi"}
CLAIM_PLATFORM_DEGRADED_ZONES = {"mumbai", "kolkata", "delhi"}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(delta_lon / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(a))


def _infer_claim_zone_center(zone_id: str, city: str) -> tuple[float, float] | None:
    normalized_zone = zone_id.strip().lower()
    normalized_city = city.strip().lower()
    return CLAIM_ZONE_CENTERS.get(normalized_zone) or CLAIM_ZONE_CENTERS.get(normalized_city)


async def _get_openweather_metrics(city: str) -> dict[str, float | bool]:
    payload = await fetch_openweather_payload(city)

    if payload is None:
        normalized = city.strip().lower()
        fallback_rain = float(mock_rainfall_by_city.get(normalized, 0.0))
        fallback_temp = 44.0 if normalized in {"mumbai", "chennai", "delhi"} else 34.0
        return {"rainfall_mm_per_hr": fallback_rain, "temperature_c": fallback_temp, "visibility_meters": 2000.0, "urban_flooding": False}

    rain = payload.get("rain", {}) if isinstance(payload, dict) else {}
    rainfall_mm = float(rain.get("1h") or 0.0)
    if rainfall_mm <= 0:
                rainfall_mm = float(rain.get("3h") or 0.0) / 3.0
    main = payload.get("main", {}) if isinstance(payload, dict) else {}
    return {
        "rainfall_mm_per_hr": rainfall_mm,
        "temperature_c": float(main.get("temp", 0.0)),
        "visibility_meters": float(payload.get("visibility", 2000.0)) if isinstance(payload, dict) else 2000.0,
        "urban_flooding": False,
    }


def _mock_demand_metrics(zone_id: str) -> dict[str, float]:
    digest = hashlib.sha256(zone_id.lower().encode("utf-8")).digest()
    historical_avg = 100.0 + (digest[0] % 25)
    current_factor = 0.28 + (digest[1] / 255.0) * 0.7
    current_index = historical_avg * current_factor
    drop_pct = max(0.0, ((historical_avg - current_index) / historical_avg) * 100.0)
    return {
        "current_index": round(current_index, 2),
        "historical_avg": round(historical_avg, 2),
        "drop_pct": round(drop_pct, 2),
    }


def _mock_zone_shutdown_active(zone_id: str) -> bool:
    normalized = zone_id.strip().lower()
    return normalized in CLAIM_ZONE_SHUTDOWN_ZONES


def _mock_platform_outage_degraded(zone_id: str) -> bool:
    normalized = zone_id.strip().lower()
    return normalized in CLAIM_PLATFORM_DEGRADED_ZONES


def _apply_demo_scenario(
    *,
    scenario: str,
    weather: dict[str, float | bool],
    demand: dict[str, float],
    zone_shutdown: bool,
    platform_degraded: bool,
) -> tuple[dict[str, float | bool], dict[str, float], bool, bool, bool, str | None, bool, str | None]:
    next_weather = dict(weather)
    next_demand = dict(demand)
    next_zone_shutdown = zone_shutdown
    next_platform_degraded = platform_degraded
    next_order_pause = False
    next_imd_alert_level: str | None = None
    next_external_event_active = False
    next_external_event_name: str | None = None

    if scenario == "heavy_rain":
        next_weather["rainfall_mm_per_hr"] = 62.0
    elif scenario == "extreme_heat":
        next_weather["temperature_c"] = 46.0
    elif scenario == "cyclone_alert":
        next_imd_alert_level = "red"
    elif scenario == "urban_flooding":
        next_weather["urban_flooding"] = True
        next_weather["rainfall_mm_per_hr"] = max(float(next_weather.get("rainfall_mm_per_hr", 0.0)), 48.0)
    elif scenario == "poor_visibility":
        next_weather["visibility_meters"] = 80.0
    elif scenario == "demand_collapse":
        next_demand["drop_pct"] = 82.0
        next_demand["current_index"] = round(next_demand["historical_avg"] * 0.18, 2)
    elif scenario == "order_pause":
        next_order_pause = True
    elif scenario == "zone_shutdown":
        next_zone_shutdown = True
    elif scenario == "zone_restriction":
        next_zone_shutdown = True
    elif scenario == "platform_outage":
        next_platform_degraded = True
    elif scenario in {"curfew", "public_health_emergency", "civil_disturbance", "infrastructure_failure"}:
        next_external_event_active = True
        next_external_event_name = scenario

    return (
        next_weather,
        next_demand,
        next_zone_shutdown,
        next_platform_degraded,
        next_order_pause,
        next_imd_alert_level,
        next_external_event_active,
        next_external_event_name,
    )


def _apply_demo_scenarios(
    *,
    scenarios: list[str],
    weather: dict[str, float | bool],
    demand: dict[str, float],
    zone_shutdown: bool,
    platform_degraded: bool,
) -> tuple[dict[str, float | bool], dict[str, float], bool, bool, bool, str | None, bool, str | None, set[str]]:
    next_weather = dict(weather)
    next_demand = dict(demand)
    next_zone_shutdown = zone_shutdown
    next_platform_degraded = platform_degraded
    next_order_pause = False
    next_imd_alert_level: str | None = None
    next_external_event_active = False
    next_external_event_name: str | None = None
    active_external_events: set[str] = set()

    for scenario in scenarios:
        (
            next_weather,
            next_demand,
            next_zone_shutdown,
            next_platform_degraded,
            order_pause_active,
            imd_alert_level,
            external_event_active,
            external_event_name,
        ) = _apply_demo_scenario(
            scenario=scenario,
            weather=next_weather,
            demand=next_demand,
            zone_shutdown=next_zone_shutdown,
            platform_degraded=next_platform_degraded,
        )
        next_order_pause = next_order_pause or order_pause_active
        if imd_alert_level is not None:
                        next_imd_alert_level = imd_alert_level
        next_external_event_active = next_external_event_active or external_event_active
        if external_event_name is not None:
            next_external_event_name = external_event_name
            active_external_events.add(external_event_name)

    return (
        next_weather,
        next_demand,
        next_zone_shutdown,
        next_platform_degraded,
        next_order_pause,
        next_imd_alert_level,
        next_external_event_active,
        next_external_event_name,
        active_external_events,
    )


def _zone_worker_ratio(zone_id: str) -> float:
    data = ZONE_ACTIVITY_DATA.get(zone_id, {})
    active = float(data.get("active_workers", 0.0))
    idle = float(data.get("idle_workers", 0.0))
    total = max(active + idle, 1.0)
    return round(active / total, 3)


def _recent_claim_counts(worker_id: int, zone_id: str) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    worker_count = 0
    zone_count = 0
    for claim in claims:
        timestamp = claim.get("timestamp")
        if not isinstance(timestamp, datetime):
            continue
        if timestamp < week_ago:
            continue
        if claim.get("user_id") == worker_id:
            worker_count += 1
        if str(claim.get("zone_id", "")).strip().lower() == zone_id.strip().lower():
            zone_count += 1
    return worker_count, zone_count


def _has_duplicate_event(worker_id: int, zone_id: str, trigger_name: str, event_date: str) -> bool:
    for claim in claims:
        if claim.get("user_id") != worker_id:
            continue
        if str(claim.get("zone_id", "")).strip().lower() != zone_id.strip().lower():
            continue
        timestamp = claim.get("timestamp")
        if not isinstance(timestamp, datetime):
            continue
        if timestamp.astimezone(timezone.utc).date().isoformat() != event_date:
            continue
        claim_triggers = [part.strip() for part in str(claim.get("trigger_type") or "").split(",") if part.strip()]
        if trigger_name in claim_triggers:
            return True
    return False


def _claim_plan_details(user: dict, policy: dict | None) -> dict:
    selected_plan = str(user.get("selected_plan") or (policy or {}).get("tier") or "Standard")
    selected_plan = selected_plan.replace(" Shield", "").strip().capitalize()
    return plans.get(selected_plan, plans["Standard"])


def _claim_severity_multiplier(trigger_name: str, *, demand_drop_pct: float | None = None) -> float:
    return _severity_for_trigger(trigger_name, demand_drop_pct=demand_drop_pct)


@app.post("/api/claims/evaluate", response_model=ClaimEvaluateResponse)
async def evaluate_claim(payload: ClaimEvaluateRequest, request: Request = None):
    user = users.get(payload.worker_id)
    if user is None:
        # Auto-create a stub user so the Claim Tester / demo works without registration
        user = {
            "name": "Demo Worker",
            "phone": "0000000000",
            "city": payload.city or "Coimbatore",
            "platform": "swiggy",
            "selected_plan": "Standard",
            "plan_details": plans.get("Standard", {}),
            "zone_id": payload.zone_id,
        }
        users[payload.worker_id] = user
        # Also create a stub active policy so eligibility checks pass
        if payload.worker_id not in policies:
            policies[payload.worker_id] = {
                "tier": "Standard",
                "status": "active",
                "started": datetime.now(timezone.utc).isoformat(),
            }

    policy = policies.get(payload.worker_id)
    plan_details = _claim_plan_details(user, policy)
    plan_tier = str(user.get("selected_plan") or (policy or {}).get("tier") or "Standard").replace(" Shield", "").strip().capitalize()
    hourly_rate = float(plan_details["hourly_rate"])
    daily_cap = float(plan_details["daily_cap"])

    weather = await _get_openweather_metrics(payload.city)
    demand = _mock_demand_metrics(payload.zone_id)
    zone_shutdown = _mock_zone_shutdown_active(payload.zone_id)
    platform_degraded = _mock_platform_outage_degraded(payload.zone_id)
    order_pause_active = False
    external_event_active = False
    external_event_name: str | None = None
    simulated_imd_alert_level: str | None = None

    applied_scenario: str | None = None
    applied_scenarios: list[str] = []
    active_external_events: set[str] = set()
    scenario_bundle = [scenario for scenario in payload.demo_scenarios if scenario != "none"]
    if payload.demo_mode and payload.demo_scenario != "none":
        scenario_bundle = [*scenario_bundle, payload.demo_scenario]
    if payload.demo_mode and scenario_bundle:
        (
            weather,
            demand,
            zone_shutdown,
            platform_degraded,
            order_pause_active,
            simulated_imd_alert_level,
            external_event_active,
            external_event_name,
            active_external_events,
        ) = _apply_demo_scenarios(
            scenarios=list(dict.fromkeys(scenario_bundle)),
            weather=weather,
            demand=demand,
            zone_shutdown=zone_shutdown,
            platform_degraded=platform_degraded,
        )
        applied_scenarios = list(dict.fromkeys(scenario_bundle))
        applied_scenario = applied_scenarios[0] if applied_scenarios else None

    # ── VPN / Proxy detection ──────────────────────────────────────────
    client_ip = ""
    if request:
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "")
    vpn_result = await check_vpn(
        ip_address=client_ip,
        claimed_city=payload.city,
        simulated_vpn=payload.simulate_vpn,
    )
    vpn_detected = vpn_result.is_vpn

    zone_center = _infer_claim_zone_center(payload.zone_id, payload.city)
    gps_in_zone = False
    if zone_center is not None:
        gps_distance = _haversine_km(payload.gps_lat, payload.gps_lon, zone_center[0], zone_center[1])
        gps_in_zone = gps_distance <= CLAIM_GPS_MAX_DISTANCE_KM
    else:
        gps_distance = None

    policy_active = bool(policy and policy.get("status") == "active")
    premium_paid = bool(user.get("selected_plan") and user.get("plan_details"))
    app_active = bool(payload.app_active)

    zone_ratio = _zone_worker_ratio(payload.zone_id)
    worker_count, zone_count = _recent_claim_counts(payload.worker_id, payload.zone_id)
    zone_average_claims = zone_count / max(float(ZONE_ACTIVITY_DATA.get(payload.zone_id, {}).get("active_workers", 1)), 1.0)
    claim_frequency_ratio = 0.0
    if zone_average_claims > 0:
        claim_frequency_ratio = max(0.0, (worker_count - zone_average_claims) / zone_average_claims)

    event_timestamp = payload.event_timestamp or datetime.now(timezone.utc)
    if event_timestamp.tzinfo is None:
        event_timestamp = event_timestamp.replace(tzinfo=timezone.utc)
    else:
        event_timestamp = event_timestamp.astimezone(timezone.utc)
    event_date = event_timestamp.astimezone(timezone.utc).date().isoformat()

    imd_alert = _get_latest_alert_for_context(payload.city)
    imd_alert_level = str(imd_alert.get("alert_level") if imd_alert else "none")
    if simulated_imd_alert_level is not None:
        imd_alert_level = simulated_imd_alert_level

    trigger_specs = [
        {
            "name": "heavy_rain",
            "category": "weather",
            "source": "openweather",
            "fired": weather["rainfall_mm_per_hr"] > 25.0,
            "value": weather["rainfall_mm_per_hr"],
            "threshold": 25.0,
            "severity_multiplier": 1.2,
        },
        {
            "name": "extreme_heat",
            "category": "weather",
            "source": "openweather",
            "fired": weather["temperature_c"] > 42.0,
            "value": weather["temperature_c"],
            "threshold": 42.0,
            "severity_multiplier": 1.1,
        },
        {
            "name": "cyclone_alert",
            "category": "weather",
            "source": "mock",
            "fired": imd_alert_level in {"orange", "red"},
            "value": 1.0 if imd_alert_level in {"orange", "red"} else 0.0,
            "threshold": 1.0,
            "severity_multiplier": 1.3,
        },
        {
            "name": "urban_flooding",
            "category": "weather",
            "source": "mock",
            "fired": bool(weather.get("urban_flooding", False)),
            "value": 1.0 if bool(weather.get("urban_flooding", False)) else 0.0,
            "threshold": 1.0,
            "severity_multiplier": 1.4,
        },
        {
            "name": "poor_visibility",
            "category": "weather",
            "source": "mock",
            "fired": float(weather.get("visibility_meters", 2000.0)) < 100.0,
            "value": float(weather.get("visibility_meters", 2000.0)),
            "threshold": 100.0,
            "severity_multiplier": 1.15,
        },
        {
            "name": "demand_collapse",
            "category": "platform",
            "source": "mock",
            "fired": demand["drop_pct"] > 50.0,
            "value": demand["drop_pct"],
            "threshold": 50.0,
            "severity_multiplier": _claim_severity_multiplier("demand_collapse", demand_drop_pct=demand["drop_pct"]),
        },
        {
            "name": "order_pause",
            "category": "platform",
            "source": "mock",
            "fired": order_pause_active,
            "value": 1.0 if order_pause_active else 0.0,
            "threshold": 1.0,
            "severity_multiplier": 1.25,
        },
        {
            "name": "zone_shutdown",
            "category": "platform",
            "source": "mock",
            "fired": zone_shutdown,
            "value": 1.0 if zone_shutdown else 0.0,
            "threshold": 1.0,
            "severity_multiplier": _claim_severity_multiplier("zone_shutdown"),
        },
        {
            "name": "platform_outage",
            "category": "platform",
            "source": "mock",
            "fired": platform_degraded,
            "value": 1.0 if platform_degraded else 0.0,
            "threshold": 1.0,
            "severity_multiplier": _claim_severity_multiplier("platform_outage"),
        },
        {
            "name": "curfew",
            "category": "external",
            "source": "mock",
            "fired": "curfew" in active_external_events,
            "value": 1.0 if "curfew" in active_external_events else 0.0,
            "threshold": 1.0,
            "severity_multiplier": 1.35,
        },
        {
            "name": "public_health_emergency",
            "category": "external",
            "source": "mock",
            "fired": "public_health_emergency" in active_external_events,
            "value": 1.0 if "public_health_emergency" in active_external_events else 0.0,
            "threshold": 1.0,
            "severity_multiplier": 1.35,
        },
        {
            "name": "civil_disturbance",
            "category": "external",
            "source": "mock",
            "fired": "civil_disturbance" in active_external_events,
            "value": 1.0 if "civil_disturbance" in active_external_events else 0.0,
            "threshold": 1.0,
            "severity_multiplier": 1.35,
        },
        {
            "name": "infrastructure_failure",
            "category": "external",
            "source": "mock",
            "fired": "infrastructure_failure" in active_external_events,
            "value": 1.0 if "infrastructure_failure" in active_external_events else 0.0,
            "threshold": 1.0,
            "severity_multiplier": 1.35,
        },
    ]

    claim_trigger_responses: list[ClaimTriggerResponse] = []
    highest_fraud = 0.0

    for spec in trigger_specs:
        fired = bool(spec["fired"])
        eligibility = TriggerEligibilityResponse(
            policy_active=policy_active,
            premium_paid=premium_paid,
            gps_in_zone=gps_in_zone,
        )

        duplicate_event = _has_duplicate_event(payload.worker_id, payload.zone_id, str(spec["name"]), event_date)
        fraud_score = 0.0
        fraud_response: TriggerFraudResponse | None = None
        payout_response: TriggerPayoutResponse | None = None

        # When fraud_test_overrides is set, use explicit overrides instead of
        # accumulated in-memory state so the fraud demo is deterministic.
        fto = payload.fraud_test_overrides
        eff_duplicate = fto.get("force_duplicate", False) if fto else duplicate_event
        eff_frequency = fto.get("force_frequency", 0.0) if fto else claim_frequency_ratio
        eff_gps = (not fto.get("force_gps_fail", False)) if fto else gps_in_zone
        eff_app = (not fto.get("force_app_inactive", False)) if fto else app_active
        eff_vpn = fto.get("force_vpn", False) if fto else vpn_detected

        if fired:
            fraud_score, breakdown = _trigger_fraud_breakdown(
                gps_in_zone=eff_gps,
                app_active=eff_app,
                zone_worker_ratio=zone_ratio,
                duplicate_claim=eff_duplicate,
                claim_frequency_ratio=eff_frequency if isinstance(eff_frequency, float) else (1.0 if eff_frequency else 0.0),
                vpn_detected=eff_vpn,
            )
            fraud_decision = _format_fraud_decision(fraud_score)
            fraud_response = TriggerFraudResponse(
                score=fraud_score,
                breakdown=[TriggerFraudBreakdownItem(**item) for item in breakdown],
                decision=fraud_decision,
            )

            if spec["name"] == "demand_collapse":
                severity_multiplier = _claim_severity_multiplier("demand_collapse", demand_drop_pct=float(spec["value"]))
            else:
                severity_multiplier = float(spec["severity_multiplier"])

            raw_amount = payload.hours_lost * hourly_rate * severity_multiplier
            final_amount = min(raw_amount, daily_cap)
            _hrs = int(payload.hours_lost) if payload.hours_lost == int(payload.hours_lost) else payload.hours_lost
            _fa = int(final_amount) if final_amount == int(final_amount) else round(final_amount, 2)
            payout_response = TriggerPayoutResponse(
                hours_lost=payload.hours_lost,
                hourly_rate=hourly_rate,
                severity_multiplier=severity_multiplier,
                daily_cap=daily_cap,
                raw_amount=round(raw_amount, 2),
                final_amount=round(final_amount, 2),
                formula=f"{_hrs}h × ₹{int(hourly_rate)} × {severity_multiplier} = ₹{_fa}",
            )

            highest_fraud = max(highest_fraud, fraud_score)
        claim_trigger_responses.append(
            ClaimTriggerResponse(
                name=str(spec["name"]),
                category=str(spec["category"]),
                source=spec["source"],
                fired=fired,
                status="fired" if fired else "not-fired",
                value=float(spec["value"]) if spec["value"] is not None else None,
                threshold=float(spec["threshold"]) if spec["threshold"] is not None else None,
                severity_multiplier=float(spec["severity_multiplier"]),
                eligibility=eligibility,
                fraud=fraud_response,
                payout=payout_response,
            )
        )

    fired_triggers = [item for item in claim_trigger_responses if item.fired]
    if not fired_triggers:
        claim_status = "no-trigger"
        payout_amount = 0.0
        explanation = "No parametric trigger fired for this claim."
    else:
        if any(not item.eligibility.policy_active or not item.eligibility.premium_paid or not item.eligibility.gps_in_zone for item in fired_triggers):
            claim_status = "hold-for-review"
        elif highest_fraud > 0.9:
            claim_status = "auto-reject"
        elif highest_fraud > 0.7:
            claim_status = "hold-for-review"
        elif highest_fraud >= 0.3:
            claim_status = "approve-with-flag"
        else:
            claim_status = "auto-approve"

        summed_payout = round(sum(item.payout.final_amount for item in fired_triggers if item.payout), 2)
        payout_amount = 0.0 if claim_status in ("hold-for-review", "auto-reject") else round(min(summed_payout, daily_cap), 2)
        explanation = (
            f"{len(fired_triggers)} trigger(s) fired. Fraud score maxed at {round(highest_fraud, 3)} and claim was {claim_status}."
        )

    claims.append(
        {
            "user_id": payload.worker_id,
            "timestamp": event_timestamp,
            "status": claim_status,
            "fraud_score": round(highest_fraud, 3),
            "fraud_details": {
                "overall_score": round(highest_fraud, 3),
                "decision": claim_status,
            },
            "trigger_type": ",".join(item.name for item in fired_triggers) if fired_triggers else None,
            "payout_amount": payout_amount,
            "zone_id": payload.zone_id,
            "hours_lost": payload.hours_lost,
            "hourly_rate": hourly_rate,
            "multiplier": 1.0,
        }
    )

    return ClaimEvaluateResponse(
        worker_id=payload.worker_id,
        zone_id=payload.zone_id,
        city=payload.city,
        claim_status=claim_status,
        fraud_score=round(highest_fraud, 3),
        payout_amount=payout_amount,
        trigger_list=claim_trigger_responses,
        demo_scenario_applied=applied_scenario,
        demo_scenarios_applied=applied_scenarios,
        explanation=explanation,
        ai_verdict=_gemini_claim_verdict(
            claim_status=claim_status,
            fraud_score=round(highest_fraud, 3),
            payout_amount=payout_amount,
            city=payload.city,
            zone_id=payload.zone_id,
            triggers_fired=[t.name for t in claim_trigger_responses if t.fired],
            breakdown=[
                {"label": b.label, "value": b.value, "weight": b.weight}
                for t in claim_trigger_responses
                if t.fired and t.fraud
                for b in t.fraud.breakdown
            ],
            gps_in_zone=gps_in_zone,
            app_active=app_active,
            vpn_detected=vpn_detected,
        ),
    )


@app.post("/api/claims/simulate-automatic")
async def simulate_automatic_claim(payload: AutoTriggerSimulationRequest):
    city = _normalize_city_display(payload.city)
    zone_id = (payload.zone_id or _default_zone_id_for_city(city)).strip().lower()
    seed = int(payload.seed) if payload.seed is not None else secrets.randbelow(1_000_000_000)
    rng = random.Random(seed)

    weather = await _get_openweather_metrics(city)
    demand = _mock_demand_metrics(zone_id)
    imd_alert = _get_latest_alert_for_context(zone_id) or _get_latest_alert_for_context(city)
    imd_alert_level = str(imd_alert.get("alert_level", "none")) if imd_alert else "none"

    selected_scenarios = _choose_automatic_scenarios(
        zone_id=zone_id,
        weather=weather,
        demand=demand,
        imd_alert_level=imd_alert_level,
        rng=rng,
    )

    zone_center = _infer_claim_zone_center(zone_id, city) or CLAIM_ZONE_CENTERS.get("bengaluru")
    if zone_center is None:
        zone_center = (12.9716, 77.5946)

    evaluate_payload = ClaimEvaluateRequest(
        worker_id=payload.worker_id,
        zone_id=zone_id,
        city=city,
        gps_lat=zone_center[0],
        gps_lon=zone_center[1],
        hours_lost=payload.hours_lost,
        app_active=payload.app_active,
        demo_mode=bool(selected_scenarios),
        demo_scenario=selected_scenarios[0] if selected_scenarios else "none",
        demo_scenarios=selected_scenarios,
        simulate_vpn=False,
    )

    result = await evaluate_claim(evaluate_payload)

    return {
        "mode": "automatic",
        "seed": seed,
        "selected_scenarios": selected_scenarios,
        "city_weather_baseline": weather,
        "platform_baseline": demand,
        "imd_alert_level": imd_alert_level,
        "claim_result": result.model_dump(),
    }


def _gemini_claim_verdict(
    *,
    claim_status: str,
    fraud_score: float,
    payout_amount: float,
    city: str,
    zone_id: str,
    triggers_fired: list[str],
    breakdown: list[dict],
    gps_in_zone: bool,
    app_active: bool,
    vpn_detected: bool,
) -> str | None:
    """Use Gemini to generate a human-readable AI verdict for the claim."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    flagged = [b["label"] for b in breakdown if b.get("value", 0) > 0]
    clear = [b["label"] for b in breakdown if b.get("value", 0) == 0]

    system_prompt = (
        "You are FairRoute's AI claim auditor for parametric gig-worker insurance in India. "
        "Given structured claim data, write a concise 2-3 sentence verdict. "
        "Mention which specific fraud signals were flagged or cleared. "
        "Use confident, professional insurance language. No markdown. No bullet points."
    )

    user_prompt = (
        f"Claim result:\n"
        f"- Status: {claim_status}\n"
        f"- Fraud score: {fraud_score * 100:.0f}%\n"
        f"- Payout: ₹{payout_amount}\n"
        f"- City: {city}, Zone: {zone_id}\n"
        f"- Triggers fired: {', '.join(triggers_fired) if triggers_fired else 'None'}\n"
        f"- GPS in zone: {gps_in_zone}\n"
        f"- App active: {app_active}\n"
        f"- VPN detected: {vpn_detected}\n"
        f"- Flagged layers: {', '.join(flagged) if flagged else 'None'}\n"
        f"- Clear layers: {', '.join(clear) if clear else 'None'}\n"
        "Write the verdict (2-3 sentences, under 60 words)."
    )

    try:
        result = _call_gemini(system_prompt=system_prompt, user_prompt=user_prompt, api_key=api_key)
        if result and len(result) > 10:
            return result[:300]
    except Exception:
        pass
    return None


def _trigger_fraud_breakdown(
    *,
    gps_in_zone: bool,
    app_active: bool,
    zone_worker_ratio: float,
    duplicate_claim: bool,
    claim_frequency_ratio: float,
    vpn_detected: bool = False,
) -> tuple[float, list[dict[str, float]]]:
    """5-layer weighted-signal fraud engine per README §6.

    Layers and weights (sum to 1.0):
      1. GPS Validation        (0.25) — physical GPS + IP geolocation consistency
      2. Activity Verification  (0.20) — app session during trigger window
      3. Cross-Worker Zone Check(0.25) — zone disruption ratio
      4. Duplicate & Frequency  (0.15) — repeat claims + frequency anomaly
      5. Behavioral Analysis    (0.15) — cross-signal behavioral flags
    """

    # ── Layer 1: GPS Validation (0.25) ──────────────────────────────
    # Sub-checks: GPS in registered zone + IP geolocation vs GPS consistency
    gps_score = 0.0
    if not gps_in_zone:
        gps_score = 1.0                    # GPS outside registered zone
    if vpn_detected:
        gps_score = max(gps_score, 0.8)    # IP mismatch — VPN/proxy detected

    # ── Layer 2: Activity Verification (0.20) ───────────────────────
    activity_score = 0.0 if app_active else 1.0

    # ── Layer 3: Cross-Worker Zone Check (0.25) ─────────────────────
    # ratio >= 0.4 → zone-wide event (legitimate)  → 0.0
    # ratio <= 0.2 → isolated individual (suspicious) → 1.0
    # between     → linear gradient
    if zone_worker_ratio >= 0.4:
        zone_score = 0.0
    elif zone_worker_ratio <= 0.2:
        zone_score = 1.0
    else:
        zone_score = round(1.0 - (zone_worker_ratio - 0.2) / 0.2, 3)

    # ── Layer 4: Duplicate & Frequency Check (0.15) ─────────────────
    if duplicate_claim:
        dup_freq_score = 1.0
    else:
        dup_freq_score = max(0.0, min(1.0, claim_frequency_ratio))

    # ── Layer 5: Behavioral Pattern Analysis (0.15) ─────────────────
    # Aggregates cross-signal behavioural anomalies — each fraud vector
    # leaves a secondary behavioural footprint.
    behavioral_sub: list[float] = []
    if vpn_detected:
        behavioral_sub.append(1.0)        # datacenter IP is definitively abnormal
    if duplicate_claim:
        behavioral_sub.append(1.0)        # repeat-claim gaming pattern
    if not gps_in_zone:
        behavioral_sub.append(0.7)        # location mismatch
    if not app_active:
        behavioral_sub.append(0.7)        # no session during event
    if claim_frequency_ratio > 0.5:
        behavioral_sub.append(min(1.0, claim_frequency_ratio))
    behavioral_score = max(behavioral_sub) if behavioral_sub else 0.0

    # ── Weighted scoring ────────────────────────────────────────────
    layers = [
        ("GPS Verification",        0.25, gps_score),
        ("Activity Verification",   0.20, activity_score),
        ("Cross-Worker Zone Check",  0.25, zone_score),
        ("Duplicate & Frequency",   0.15, dup_freq_score),
        ("Behavioral Analysis",     0.15, behavioral_score),
    ]

    score = 0.0
    breakdown: list[dict[str, float]] = []
    for label, weight, value in layers:
        contribution = round(weight * value, 3)
        score += contribution
        breakdown.append(
            {
                "label": label,
                "weight": weight,
                "value": round(value, 3),
                "contribution": contribution,
            }
        )

    return round(min(1.0, score), 3), breakdown


def _severity_for_trigger(trigger_name: str, *, demand_drop_pct: float | None = None) -> float:
    if trigger_name == "demand_collapse" and demand_drop_pct is not None:
        if demand_drop_pct > 60:
            return 1.5
        if demand_drop_pct >= 40:
            return 1.2
        if demand_drop_pct >= 20:
            return 1.0
    if trigger_name == "zone_shutdown":
        return 1.3
    if trigger_name == "platform_outage":
        return 1.2
    if trigger_name == "extreme_heat":
        return 1.1
    return 1.0


def _format_fraud_decision(score: float) -> str:
    if score > 0.9:
        return "auto-reject"
    if score > 0.7:
        return "hold-for-review"
    if score >= 0.3:
        return "approve-with-flag"
    return "auto-approve"


def _default_zone_id_for_city(city: str) -> str:
    normalized = city.strip().lower().replace(",", " ")
    parts = [part for part in normalized.split() if part]
    if not parts:
        return "bengaluru"
    return "_".join(parts)


def _choose_automatic_scenarios(
    *,
    zone_id: str,
    weather: dict[str, float | bool],
    demand: dict[str, float],
    imd_alert_level: str,
    rng: random.Random,
) -> list[str]:
    scenarios: list[str] = []

    rainfall = float(weather.get("rainfall_mm_per_hr", 0.0))
    temperature = float(weather.get("temperature_c", 0.0))
    visibility = float(weather.get("visibility_meters", 2000.0))
    demand_drop = float(demand.get("drop_pct", 0.0))

    if rainfall >= 20.0 and rng.random() < min(0.9, rainfall / 70.0):
        scenarios.append("heavy_rain")

    if temperature >= 39.0 and rng.random() < min(0.85, max(0.05, (temperature - 35.0) / 12.0)):
        scenarios.append("extreme_heat")

    if visibility < 180.0 and rng.random() < 0.7:
        scenarios.append("poor_visibility")

    if rainfall >= 28.0 and rng.random() < 0.45:
        scenarios.append("urban_flooding")

    if imd_alert_level in {"orange", "red"} and rng.random() < 0.85:
        scenarios.append("cyclone_alert")

    if demand_drop >= 45.0:
        if rng.random() < 0.85:
            scenarios.append("demand_collapse")
    elif rng.random() < 0.12:
        scenarios.append("demand_collapse")

    if rng.random() < 0.16:
        scenarios.append("order_pause")

    if rng.random() < 0.18:
        scenarios.append(rng.choice(["curfew", "public_health_emergency", "civil_disturbance", "infrastructure_failure"]))

    zone_shutdown_baseline = _mock_zone_shutdown_active(zone_id)
    if zone_shutdown_baseline:
        if rng.random() < 0.7:
            scenarios.append("zone_shutdown")
    elif rng.random() < 0.08:
        scenarios.append("zone_shutdown")

    platform_outage_baseline = _mock_platform_outage_degraded(zone_id)
    if platform_outage_baseline:
        if rng.random() < 0.65:
            scenarios.append("platform_outage")
    elif rng.random() < 0.1:
        scenarios.append("platform_outage")

    if not scenarios:
        scenarios.append(
            rng.choice(
                [
                    "heavy_rain",
                    "extreme_heat",
                    "cyclone_alert",
                    "urban_flooding",
                    "poor_visibility",
                    "demand_collapse",
                    "order_pause",
                    "zone_shutdown",
                    "platform_outage",
                    "curfew",
                    "public_health_emergency",
                    "civil_disturbance",
                    "infrastructure_failure",
                ]
            )
        )

    return list(dict.fromkeys(scenarios))


class PolicyUpgradeRequest(BaseModel):
    tier: Literal["Basic", "Standard", "Premium"]


class PolicyPauseRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30)


class AutoClaimRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    hours_lost: float = Field(..., gt=0)


class TriggerWeatherInput(BaseModel):
    rainfall: float = Field(..., ge=0)
    temperature: float = Field(...)
    visibility_meters: float | None = Field(default=None, ge=0)
    urban_flooding: bool = False
    imd_alert_level: Literal["none", "yellow", "orange", "red"] = "none"


class TriggerPlatformInput(BaseModel):
    current_orders: int = Field(..., ge=0)
    average_orders: float = Field(..., ge=0)
    orders_last_3_hours: int = Field(..., ge=0)


class TriggerWorkerActivityInput(BaseModel):
    is_logged_in: bool
    active_hours: float = Field(..., ge=0)


class TriggerFraudSignalsInput(BaseModel):
    sudden_location_change: bool = False
    worker_inactive_but_claiming_active: bool = False
    repeated_triggers_within_short_time: bool = False


class TriggerEvaluateRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)
    weather: TriggerWeatherInput
    platform: TriggerPlatformInput
    worker_activity: TriggerWorkerActivityInput
    fraud_signals: TriggerFraudSignalsInput = Field(default_factory=TriggerFraudSignalsInput)


class CityZonesResponse(BaseModel):
    city: str
    zones: list[dict[str, str]]


class CityWeatherResponse(BaseModel):
    city: str
    condition: str
    temperature: float
    humidity: float
    wind_speed: float
    rainfall: float
    weather_risk_score: int
    trigger_probability: float
    trigger_type: str


class ZoneSafetyItem(BaseModel):
    id: str
    city: str
    area: str
    weather_risk_score: int
    trigger_probability: float
    trigger_type: str
    safety_level: Literal["Low", "Medium", "High"]


class ZoneSafetyResponse(BaseModel):
    city: str
    zones: list[ZoneSafetyItem]


class IMDAlertRequest(BaseModel):
    zone: str = Field(..., min_length=1)
    alert_level: Literal["green", "yellow", "orange", "red"]
    event_type: Literal["cyclone", "rain", "heatwave"]


class IMDAlertResponse(BaseModel):
    zone: str
    alert_level: Literal["green", "yellow", "orange", "red"]
    event: Literal["cyclone", "rain", "heatwave"]
    source: Literal["admin", "rss"]
    timestamp: str


class IMDAlertHistoryResponse(BaseModel):
    alerts: list[IMDAlertResponse]


class PolicyResponse(BaseModel):
    worker_id: int
    tier: Literal["Basic", "Standard", "Premium"]
    status: Literal["active", "paused", "cancelled"]
    start_date: str
    next_renewal_date: str
    paused_until: str | None = None
    updated_at: str


class PolicyHistoryItem(BaseModel):
    id: str
    worker_id: int
    action: Literal["created", "pause", "resume", "upgrade", "cancel"]
    detail: str
    timestamp: str


class PolicyHistoryResponse(BaseModel):
    history: list[PolicyHistoryItem]


def _zone_candidates(zone: str) -> list[str]:
    lowered = zone.strip().lower()
    if not lowered:
        return []
    candidates = [lowered]
    if "_" in lowered:
        city_token = lowered.split("_")[0]
        if city_token and city_token not in candidates:
            candidates.append(city_token)
    if "," in lowered:
        simple = lowered.split(",")[0].strip()
        if simple and simple not in candidates:
            candidates.append(simple)
    return candidates


def _get_latest_alert_for_context(zone: str) -> dict | None:
    for candidate in _zone_candidates(zone):
        alert = get_latest_imd_alert(candidate)
        if alert is not None:
            return alert
    return None


def _apply_imd_adjustment_to_risk(risk: dict, alert: dict | None) -> dict:
    if alert is None:
        return risk

    adjusted = dict(risk)
    level = alert.get("alert_level", "green")
    event = alert.get("event_type", "rain")

    if level == "orange":
        adjusted["weather_risk_score"] = min(100, int(adjusted.get("weather_risk_score", 0)) + 15)
        adjusted["trigger_probability"] = min(1.0, float(adjusted.get("trigger_probability", 0)) + 0.2)
        if adjusted.get("trigger_type") == "none":
            adjusted["trigger_type"] = f"imd_{event}"
    elif level == "red":
        adjusted["weather_risk_score"] = max(85, int(adjusted.get("weather_risk_score", 0)))
        adjusted["trigger_probability"] = max(0.95, float(adjusted.get("trigger_probability", 0)))
        adjusted["trigger_type"] = f"imd_{event}"

    return adjusted


def update_last_trigger(user: dict) -> dict:
    trigger = check_weather_trigger(user["city"])
    user["last_trigger_status"] = trigger["trigger_status"]
    user["last_trigger_type"] = trigger["trigger_type"]
    user["last_trigger_severity"] = trigger["severity_level"]
    return trigger


def calculate_premium(user: dict) -> dict:
    plan_name = user.get("selected_plan")
    if plan_name is None:
        raise HTTPException(status_code=400, detail="Plan not selected")

    plan_details = plans[plan_name]
    city = str(user.get("city", "")).strip().lower()

    city_adjustment = 0
    if city == "high rainfall zone" or city in high_rainfall_cities:
        city_adjustment = 10
    elif city == "low risk" or city in low_risk_cities:
        city_adjustment = -5

    adjusted_weekly_premium = max(plan_details["weekly_premium"] + city_adjustment, 0)

    return {
        "weekly_premium": adjusted_weekly_premium,
        "base_weekly_premium": plan_details["weekly_premium"],
        "city_adjustment": city_adjustment,
        "daily_cap": plan_details["daily_cap"],
        "max_payout": plan_details["max_payout"],
        "hourly_rate": plan_details["hourly_rate"],
    }


def check_weather_trigger(city: str) -> dict:
    normalized_city = city.strip().lower()
    rainfall = mock_rainfall_by_city.get(normalized_city, 0)
    trigger_status = rainfall > rainfall_threshold_mm

    return {
        "trigger_status": trigger_status,
        "trigger_type": "heavy_rain" if trigger_status else None,
        "severity_level": 1 if trigger_status else 0,
        "rainfall_mm": rainfall,
    }


def _normalize_city_display(city: str) -> str:
    normalized = city.strip()
    if not normalized:
        return "Bengaluru"
    return " ".join(word.capitalize() for word in normalized.split())


def _zone_slug(city: str, area: str) -> str:
    return (
        f"{city.lower().replace(' ', '_')}_{area.lower().replace(' ', '_').replace('.', '').replace(',', '')}"
    )


def _zone_microclimate_adjustment(city: str, area: str) -> dict[str, float]:
    """Create deterministic zone-level weather variation from city baseline."""
    digest = hashlib.sha256(f"{city.lower()}::{area.lower()}".encode("utf-8")).digest()

    def spread(byte_val: int, low: float, high: float) -> float:
        ratio = byte_val / 255.0
        return low + (high - low) * ratio

    return {
        "rainfall_mult": spread(digest[0], 0.75, 1.35),
        "temp_delta": spread(digest[1], -1.8, 1.8),
        "humidity_delta": spread(digest[2], -8.0, 8.0),
        "wind_delta": spread(digest[3], -3.0, 3.0),
    }


def _zone_weather_risk_from_city_response(city_weather: dict, city: str, area: str) -> dict:
    adjustment = _zone_microclimate_adjustment(city=city, area=area)
    risk = calculate_weather_risk(
        {
            "rainfall": max(0.0, float(city_weather["rainfall"]) * adjustment["rainfall_mult"]),
            "temperature": float(city_weather["temperature"]) + adjustment["temp_delta"],
            "humidity": max(0.0, float(city_weather["humidity"]) + adjustment["humidity_delta"]),
            "wind_speed": max(0.0, float(city_weather["wind_speed"]) + adjustment["wind_delta"]),
        }
    )

    area_alert = _get_latest_alert_for_context(area)
    city_alert = _get_latest_alert_for_context(city)
    risk = _apply_imd_adjustment_to_risk(risk, area_alert or city_alert)

    score = int(risk["weather_risk_score"])
    level: Literal["Low", "Medium", "High"]
    if score > 60:
        level = "High"
    elif score > 30:
        level = "Medium"
    else:
        level = "Low"

    return {
        "weather_risk_score": score,
        "trigger_probability": float(risk["trigger_probability"]),
        "trigger_type": str(risk["trigger_type"]),
        "safety_level": level,
    }


def _append_policy_history(worker_id: int, action: str, detail: str) -> None:
    history = policy_history.setdefault(worker_id, [])
    history.insert(
        0,
        {
            "id": f"{action}_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "worker_id": worker_id,
            "action": action,
            "detail": detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    if len(history) > 100:
        del history[100:]


def _get_user_policy_tier(user: dict) -> Literal["Basic", "Standard", "Premium"]:
    selected_plan = str(user.get("selected_plan") or "Standard")
    normalized = selected_plan.replace(" Shield", "").strip().capitalize()
    if normalized not in {"Basic", "Standard", "Premium"}:
        return "Standard"
    return normalized


def _ensure_policy(worker_id: int) -> dict:
    existing = policies.get(worker_id)
    if existing is not None:
        return existing

    user = users.get(worker_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    tier = _get_user_policy_tier(user)
    created = {
        "worker_id": worker_id,
        "tier": tier,
        "status": "active",
        "start_date": now.isoformat(),
        "next_renewal_date": (now + timedelta(days=7)).isoformat(),
        "paused_until": None,
        "updated_at": now.isoformat(),
    }
    policies[worker_id] = created
    _append_policy_history(worker_id, "created", f"Policy created in {tier} tier")
    return created


def _sync_policy_from_user(worker_id: int) -> None:
    user = users.get(worker_id)
    if user is None:
        return
    policy = _ensure_policy(worker_id)
    tier = _get_user_policy_tier(user)
    if policy.get("tier") != tier:
        policy["tier"] = tier
        policy["updated_at"] = datetime.now(timezone.utc).isoformat()
        _append_policy_history(worker_id, "upgrade", f"Upgraded policy to {tier}")


def calculate_fraud_score(user_id: int, zone_id: str = "", weather_risk: int = 0, anomaly_score: float = 0.0, trigger_active: bool = False) -> dict:
    """Real 5-layer fraud assessment using fraud_engine.assess_fraud."""
    today = datetime.now(timezone.utc).date()
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Build claim history from in-memory claims
    history = []
    for c in claims:
        if c["user_id"] == user_id:
            history.append(FraudClaimRecord(
                timestamp=c["timestamp"],
                zone_id=c.get("zone_id", ""),
                payout_amount=c.get("payout_amount", 0),
            ))

    # Simulate GPS from zone center (in production: real device GPS)
    gps = None
    zone_center = ZONE_CENTERS.get(zone_id)
    if zone_center:
        gps = GPSPoint(lat=zone_center.lat, lon=zone_center.lon, timestamp=datetime.now(timezone.utc))

    assessment = assess_fraud(
        worker_gps=gps,
        claimed_zone_id=zone_id,
        claim_history=history,
        weather_risk_score=weather_risk,
        zone_anomaly_score=anomaly_score,
        zone_has_active_trigger=trigger_active,
        previous_gps=gps,  # Same as current in demo (no spoofing)
        login_timestamp=datetime.now(timezone.utc) - timedelta(hours=2),  # Simulated login 2h ago
        claim_timestamp=datetime.now(timezone.utc),
        active_hours_today=4.0,
        is_logged_in=True,
    )

    return assessment.to_dict()


def assess_basic_fraud_risk(fraud_signals: TriggerFraudSignalsInput) -> dict:
    risk_points = 0

    if fraud_signals.sudden_location_change:
        risk_points += 1

    if fraud_signals.worker_inactive_but_claiming_active:
        risk_points += 1

    if fraud_signals.repeated_triggers_within_short_time:
        risk_points += 1

    if risk_points == 0:
        return {"fraud_risk": "LOW", "allow_payout": True}

    if risk_points == 1:
        return {"fraud_risk": "MEDIUM", "allow_payout": True}

    return {"fraud_risk": "HIGH", "allow_payout": False}


# ── OTP endpoints ──────────────────────────────────────────────────────────

def _normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    return digits[-10:]


@app.post("/otp/send")
def send_otp(payload: OTPSendRequest):
    phone = _normalize_phone(payload.phone)
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    code = "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))
    otp_store[phone] = {
        "otp": code,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES),
        "verified": False,
    }

    logger.info("OTP for +91 %s: %s  (valid %d min)", phone, code, OTP_EXPIRY_MINUTES)

    return {
        "success": True,
        "message": f"OTP sent to +91 {phone}",
        "otp": code,
    }


@app.post("/otp/verify")
def verify_otp(payload: OTPVerifyRequest):
    phone = _normalize_phone(payload.phone)
    entry = otp_store.get(phone)

    if not entry:
        raise HTTPException(status_code=400, detail="No OTP requested for this number")

    if datetime.now(timezone.utc) > entry["expires_at"]:
        del otp_store[phone]
        raise HTTPException(status_code=400, detail="OTP expired — please request a new one")

    if entry["otp"] != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    entry["verified"] = True
    return {"success": True, "message": "Phone verified"}


@app.post("/register")
def register_user(payload: RegistrationRequest):
    phone = _normalize_phone(payload.phone)
    entry = otp_store.get(phone)
    if not entry or not entry.get("verified"):
        raise HTTPException(status_code=400, detail="Phone not verified — complete OTP first")

    user_id = len(users) + 1
    user = {
        "user_id": user_id,
        "name": payload.name,
        "phone": payload.phone,
        "city": payload.city,
        "platform": payload.platform,
        "zone_area": payload.zone_area,
    }
    users[user_id] = user
    return {"user_id": user_id}


@app.post("/select-plan")
def select_plan(payload: PlanSelectionRequest):
    user = users.get(payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user["selected_plan"] = payload.selected_plan
    plan_details = calculate_premium(user)
    user["plan_details"] = plan_details
    _sync_policy_from_user(payload.user_id)

    return {
        "user_id": payload.user_id,
        "selected_plan": payload.selected_plan,
        "plan_details": plan_details,
    }


@app.get("/policy/{worker_id}", response_model=PolicyResponse)
def get_policy(worker_id: int):
    policy = _ensure_policy(worker_id)

    if policy.get("status") == "paused" and policy.get("paused_until"):
        paused_until = datetime.fromisoformat(policy["paused_until"])
        now = datetime.now(timezone.utc)
        if paused_until <= now:
            policy["status"] = "active"
            policy["paused_until"] = None
            policy["updated_at"] = now.isoformat()
            _append_policy_history(worker_id, "resume", "Auto-resumed after pause window ended")

    return policy


@app.post("/policy/{worker_id}/pause", response_model=PolicyResponse)
def pause_worker_policy(worker_id: int, payload: PolicyPauseRequest):
    policy = _ensure_policy(worker_id)
    now = datetime.now(timezone.utc)
    policy["status"] = "paused"
    policy["paused_until"] = (now + timedelta(days=payload.days)).isoformat()
    policy["updated_at"] = now.isoformat()
    _append_policy_history(worker_id, "pause", f"Coverage paused for {payload.days} days")
    return policy


@app.post("/policy/{worker_id}/resume", response_model=PolicyResponse)
def resume_worker_policy(worker_id: int):
    policy = _ensure_policy(worker_id)
    now = datetime.now(timezone.utc)
    policy["status"] = "active"
    policy["paused_until"] = None
    policy["updated_at"] = now.isoformat()
    _append_policy_history(worker_id, "resume", "Coverage resumed")
    return policy


@app.post("/policy/{worker_id}/upgrade", response_model=PolicyResponse)
def upgrade_worker_policy(worker_id: int, payload: PolicyUpgradeRequest):
    policy = _ensure_policy(worker_id)
    now = datetime.now(timezone.utc)
    policy["tier"] = payload.tier
    policy["status"] = "active"
    policy["paused_until"] = None
    policy["updated_at"] = now.isoformat()

    user = users.get(worker_id)
    if user is not None:
        user["selected_plan"] = payload.tier
        user["plan_details"] = calculate_premium(user)

    _append_policy_history(worker_id, "upgrade", f"Upgraded policy to {payload.tier}")
    return policy


@app.get("/policy/{worker_id}/history", response_model=PolicyHistoryResponse)
def get_policy_history(worker_id: int):
    _ensure_policy(worker_id)
    return {"history": policy_history.get(worker_id, [])}


@app.get("/trigger/weather/{user_id}")
def trigger_weather(user_id: int):
    user = users.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    trigger = update_last_trigger(user)
    return trigger


@app.post("/claim/auto")
async def auto_claim(payload: AutoClaimRequest):
    user = users.get(payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    plan_details = user.get("plan_details")
    if plan_details is None:
        raise HTTPException(status_code=400, detail="Plan not selected")

    # ── Priority 2: Wire real weather data ────────────────────────────
    # Try to get LIVE weather for user's city from OpenWeather
    city = user.get("city", "Bengaluru")
    zone_id = user.get("zone_area", "")
    live_weather_payload = await fetch_openweather_payload(city)

    if live_weather_payload is not None:
        event = _build_weather_event(zone_id or city, live_weather_payload)
        risk = calculate_weather_risk({
            "rainfall": event.rainfall,
            "temperature": event.temperature,
            "humidity": event.humidity,
            "wind_speed": event.wind_speed,
        })
        imd_alert = _get_latest_alert_for_context(zone_id or city)
        adjusted_risk = _apply_imd_adjustment_to_risk(risk, imd_alert)

        weather_risk_score = adjusted_risk["weather_risk_score"]
        trigger_type = adjusted_risk["trigger_type"]
        trigger_active = weather_risk_score > 60

        # Also get zone anomaly
        activity_data = ZONE_ACTIVITY_DATA.get(zone_id, {
            "active_workers": 40, "idle_workers": 10, "avg_distance": 3.5,
        })
        activity = calculate_zone_activity_score(activity_data)
        anomaly_score = activity["anomaly_score"]

        # Determine trigger from real data
        if imd_alert and imd_alert.get("alert_level") == "red":
            weather_trigger = {
                "trigger_status": True,
                "trigger_type": f"imd_{imd_alert.get('event_type', 'rain')}",
                "severity_level": 1.5,
                "rainfall_mm": event.rainfall,
            }
        else:
            trigger_result = detect_trigger(weather_risk_score, anomaly_score, trigger_type)
            weather_trigger = {
                "trigger_status": trigger_result.get("trigger", False),
                "trigger_type": trigger_type if trigger_result.get("trigger") else None,
                "severity_level": trigger_result.get("severity", 0),
                "rainfall_mm": event.rainfall,
            }
    else:
        # Fallback to mock
        weather_trigger = check_weather_trigger(city)
        weather_risk_score = 50 if weather_trigger["trigger_status"] else 20
        anomaly_score = -0.5 if weather_trigger["trigger_status"] else 0.3
        trigger_active = weather_trigger["trigger_status"]

    user["last_trigger_status"] = weather_trigger["trigger_status"]
    user["last_trigger_type"] = weather_trigger["trigger_type"]
    user["last_trigger_severity"] = weather_trigger["severity_level"]

    # ── Priority 1: Real 5-layer fraud assessment ─────────────────────
    fraud_result = calculate_fraud_score(
        user_id=payload.user_id,
        zone_id=zone_id,
        weather_risk=weather_risk_score,
        anomaly_score=anomaly_score,
        trigger_active=trigger_active,
    )
    fraud_score = fraud_result["overall_score"]
    now = datetime.now(timezone.utc)

    if not weather_trigger["trigger_status"]:
        claim_record = {
            "user_id": payload.user_id,
            "timestamp": now,
            "fraud_score": fraud_score,
            "fraud_details": fraud_result,
            "status": "under_review" if fraud_score >= 0.7 else "no_trigger",
            "trigger_type": None,
            "payout_amount": 0,
            "zone_id": zone_id or city,
            "hours_lost": payload.hours_lost,
            "hourly_rate": plan_details["hourly_rate"],
            "multiplier": 1.0,
        }
        claims.append(claim_record)
        return {
            "status": claim_record["status"],
            "trigger_type": None,
            "payout_amount": 0,
            "fraud_score": fraud_score,
            "fraud_details": fraud_result,
            "message": "No active trigger found for payout",
            "timestamp": now.isoformat(),
        }

    multiplier = 1.2
    payout = min(
        payload.hours_lost * plan_details["hourly_rate"] * multiplier,
        plan_details["daily_cap"],
    )
    payout_amount = round(payout, 2)
    credited_amount = int(payout_amount) if payout_amount.is_integer() else payout_amount

    # Use fraud engine result for approval decision
    claim_status = "approved" if fraud_result["allow_payout"] else "under_review"

    claims.append(
        {
            "user_id": payload.user_id,
            "timestamp": now,
            "fraud_score": fraud_score,
            "fraud_details": fraud_result,
            "status": claim_status,
            "trigger_type": weather_trigger["trigger_type"],
            "payout_amount": payout_amount if claim_status == "approved" else 0,
            "zone_id": zone_id or city,
            "hours_lost": payload.hours_lost,
            "hourly_rate": plan_details["hourly_rate"],
            "multiplier": multiplier,
        }
    )

    if claim_status != "approved":
        return {
            "status": claim_status,
            "trigger_type": weather_trigger["trigger_type"],
            "payout_amount": 0,
            "fraud_score": fraud_score,
            "fraud_details": fraud_result,
            "message": f"Claim under review — {fraud_result['explanation']}",
            "timestamp": now.isoformat(),
        }

    return {
        "status": claim_status,
        "trigger_type": weather_trigger["trigger_type"],
        "payout_amount": payout_amount,
        "fraud_score": fraud_score,
        "fraud_details": fraud_result,
        "message": f"₹{credited_amount} credited to your account",
        "timestamp": now.isoformat(),
    }


@app.post("/api/v1/trigger/evaluate", response_model=TriggerDecisionResponse)
def evaluate_trigger_endpoint(payload: TriggerEvaluateRequest):
    return evaluate_trigger_pipeline(
        rainfall_mm_last_3_hours=payload.weather.rainfall,
        temperature_celsius=payload.weather.temperature,
        visibility_meters=payload.weather.visibility_meters,
        urban_flooding=payload.weather.urban_flooding,
        imd_alert_level=payload.weather.imd_alert_level,
        current_orders=payload.platform.current_orders,
        average_orders=payload.platform.average_orders,
        orders_in_3_hours=payload.platform.orders_last_3_hours,
        worker_logged_in=payload.worker_activity.is_logged_in,
        active_hours=payload.worker_activity.active_hours,
        sudden_location_change=payload.fraud_signals.sudden_location_change,
        worker_inactive_but_claiming_active=payload.fraud_signals.worker_inactive_but_claiming_active,
        repeated_triggers_within_short_time=payload.fraud_signals.repeated_triggers_within_short_time,
        hourly_rate=100,
        daily_cap=800,
        severity_multiplier=1.2,
    )


@app.get("/api/raw-events/{zone_id}", response_model=RawWeatherEvent)
def get_latest_raw_event(zone_id: str):
    latest_event = raw_event_repository.get_latest_by_zone(zone_id)
    if latest_event is None:
        raise HTTPException(status_code=404, detail="No weather data found for zone")
    return latest_event


class FraudCheckRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    zone_id: str = Field(default="")


@app.post("/api/fraud/assess")
def fraud_assess_endpoint(payload: FraudCheckRequest):
    """Run real-time 5-layer fraud assessment for a user. Returns per-layer breakdown."""
    user = users.get(payload.user_id)
    zone_id = payload.zone_id or (user.get("zone_area", "") if user else "")

    # Get latest weather risk for context
    weather_risk = 0
    anomaly = 0.0
    trigger_active = False
    latest_event = raw_event_repository.get_latest_by_zone(zone_id) if zone_id else None
    if latest_event:
        risk = calculate_weather_risk({
            "rainfall": latest_event.rainfall,
            "temperature": latest_event.temperature,
            "humidity": latest_event.humidity,
            "wind_speed": latest_event.wind_speed,
        })
        weather_risk = risk["weather_risk_score"]
        activity_data = ZONE_ACTIVITY_DATA.get(zone_id, {
            "active_workers": 40, "idle_workers": 10, "avg_distance": 3.5,
        })
        activity = calculate_zone_activity_score(activity_data)
        anomaly = activity["anomaly_score"]
        trigger_result = detect_trigger(weather_risk, anomaly, risk["trigger_type"])
        trigger_active = trigger_result.get("trigger", False)

    result = calculate_fraud_score(
        user_id=payload.user_id,
        zone_id=zone_id,
        weather_risk=weather_risk,
        anomaly_score=anomaly,
        trigger_active=trigger_active,
    )
    return result


class VPNCheckRequest(BaseModel):
    simulate_vpn: bool = False
    claimed_city: str = ""


@app.post("/api/vpn/check")
async def vpn_check_endpoint(payload: VPNCheckRequest, request: Request):
    """Check if the client IP is coming from a VPN/proxy/datacenter."""
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "")
    result = await check_vpn(
        ip_address=client_ip,
        claimed_city=payload.claimed_city or None,
        simulated_vpn=payload.simulate_vpn,
    )
    return result.to_dict()


def _fallback_zone_weather(zone_id: str):
    """If the exact zone_id has no weather data, try another zone sharing the same city prefix."""
    parts = zone_id.rsplit("_", 1)
    if len(parts) < 2:
        return None
    # Try progressively shorter prefixes (e.g. coimbatore_saibaba_colony → coimbatore)
    prefix = zone_id
    while "_" in prefix:
        prefix = prefix.rsplit("_", 1)[0]
        for config_zone in ZONE_CONFIG:
            if config_zone.startswith(prefix + "_") and config_zone != zone_id:
                event = raw_event_repository.get_latest_by_zone(config_zone)
                if event is not None:
                    return event
    return None


def _fallback_zone_activity(zone_id: str):
    """If the exact zone_id has no activity data, try another zone sharing the same city prefix."""
    prefix = zone_id
    while "_" in prefix:
        prefix = prefix.rsplit("_", 1)[0]
        for config_zone, data in ZONE_ACTIVITY_DATA.items():
            if config_zone.startswith(prefix + "_") and config_zone != zone_id:
                return data
    return None


@app.get("/api/risk/{zone_id}", response_model=WeatherRiskResponse)
def get_zone_weather_risk(zone_id: str):
    latest_event = raw_event_repository.get_latest_by_zone(zone_id)
    if latest_event is None:
        # Fallback: try another zone in the same city (same weather data)
        latest_event = _fallback_zone_weather(zone_id)
    if latest_event is None:
        raise HTTPException(status_code=404, detail="No weather data found for zone")

    risk = calculate_weather_risk(
        {
            "rainfall": latest_event.rainfall,
            "temperature": latest_event.temperature,
            "humidity": latest_event.humidity,
            "wind_speed": latest_event.wind_speed,
        }
    )
    imd_alert = _get_latest_alert_for_context(zone_id)
    risk = _apply_imd_adjustment_to_risk(risk, imd_alert)

    return {
        "zone": zone_id,
        "weather_risk_score": risk["weather_risk_score"],
        "trigger_probability": risk["trigger_probability"],
        "trigger_type": risk["trigger_type"],
    }


@app.get("/api/activity/{zone_id}", response_model=ZoneActivityResponse)
def get_zone_activity(zone_id: str):
    activity_data = ZONE_ACTIVITY_DATA.get(zone_id) or _fallback_zone_activity(zone_id)
    if activity_data is None:
        raise HTTPException(status_code=404, detail="No activity data found for zone")

    result = calculate_zone_activity_score(activity_data)
    return {
        "zone": zone_id,
        "anomaly_score": result["anomaly_score"],
        "status": result["status"],
    }


@app.get("/api/trigger/check/{zone_id}", response_model=TriggerCheckResponse)
def get_trigger_check(zone_id: str):
    latest_event = raw_event_repository.get_latest_by_zone(zone_id)
    if latest_event is None:
        latest_event = _fallback_zone_weather(zone_id)
    if latest_event is None:
        raise HTTPException(status_code=404, detail="No weather data found for zone")

    activity_data = ZONE_ACTIVITY_DATA.get(zone_id) or _fallback_zone_activity(zone_id)
    if activity_data is None:
        raise HTTPException(status_code=404, detail="No activity data found for zone")

    weather_risk = calculate_weather_risk(
        {
            "rainfall": latest_event.rainfall,
            "temperature": latest_event.temperature,
            "humidity": latest_event.humidity,
            "wind_speed": latest_event.wind_speed,
        }
    )
    imd_alert = _get_latest_alert_for_context(zone_id)
    weather_risk = _apply_imd_adjustment_to_risk(weather_risk, imd_alert)

    if imd_alert and imd_alert.get("alert_level") == "red":
        return {
            "trigger": True,
            "type": f"imd_{imd_alert.get('event_type', 'rain')}",
            "severity": 1.5,
        }

    activity = calculate_zone_activity_score(activity_data)

    return detect_trigger(
        weather_risk_score=weather_risk["weather_risk_score"],
        anomaly_score=activity["anomaly_score"],
        trigger_type=weather_risk["trigger_type"],
    )


@app.post("/api/validate-claim", response_model=ValidateClaimResponse)
def validate_claim_endpoint(payload: ValidateClaimRequest):
    return validate_claim(
        worker_id=payload.worker_id,
        weather_risk_score=payload.weather_risk_score,
        anomaly_score=payload.anomaly_score,
        weather_timestamp=payload.weather_timestamp,
        gps_timestamp=payload.gps_timestamp,
        mock_eligibility_db=WORKER_ELIGIBILITY_DB,
    )


@app.post("/api/payout/calculate", response_model=PayoutCalculationResponse)
def calculate_payout_endpoint(payload: PayoutCalculationRequest):
    payout = calculate_payout_amount(
        lost_hours=payload.lost_hours,
        hourly_rate=payload.hourly_rate,
        multiplier=payload.multiplier,
        daily_cap=payload.daily_cap,
    )
    return {"payout": payout, "status": "processed"}


@app.post("/api/recommend-plan", response_model=RecommendPlanResponse)
def recommend_plan_endpoint(payload: RecommendPlanRequest):
    recommendation = recommend_plan(
        avg_daily_hours=payload.avg_daily_hours,
        zone_risk=payload.zone_risk,
    )
    return recommendation


@app.post("/api/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat_endpoint(payload: AssistantChatRequest):
    reply = generate_assistant_reply(
        user_query=payload.user_query,
        language=payload.language,
    )
    return {"reply": reply}


@app.post("/api/admin/imd-alert", response_model=IMDAlertResponse)
def create_admin_imd_alert(payload: IMDAlertRequest):
    created = create_imd_alert(
        zone=payload.zone,
        alert_level=payload.alert_level,
        event_type=payload.event_type,
        source="admin",
    )
    return {
        "zone": created["zone"],
        "alert_level": created["alert_level"],
        "event": created["event_type"],
        "source": created["source"],
        "timestamp": created["timestamp"],
    }


@app.get("/api/imd-alert/{zone}", response_model=IMDAlertResponse)
def get_imd_alert_by_zone(zone: str):
    latest = _get_latest_alert_for_context(zone)
    if latest is None:
        return {
            "zone": zone.strip().lower(),
            "alert_level": "green",
            "event": "rain",
            "source": "rss",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return {
        "zone": latest["zone"],
        "alert_level": latest["alert_level"],
        "event": latest["event_type"],
        "source": latest["source"],
        "timestamp": latest["timestamp"],
    }


@app.get("/api/admin/imd-alerts", response_model=IMDAlertHistoryResponse)
def get_recent_imd_alerts(limit: int = 30):
    rows = list_recent_imd_alerts(limit=limit)
    alerts = [
        {
            "zone": row["zone"],
            "alert_level": row["alert_level"],
            "event": row["event_type"],
            "source": row["source"],
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]
    return {"alerts": alerts}


@app.get("/api/city-zones", response_model=CityZonesResponse)
def city_zones(city: str):
    normalized_city = _normalize_city_display(city)
    max_zones = len(ZONE_CONFIG)
    zone_areas = generate_city_zone_suggestions(city=normalized_city, limit=max_zones)

    zones = [
        {
            "id": f"{normalized_city.lower().replace(' ', '_')}_{area.lower().replace(' ', '_').replace('.', '').replace(',', '')}",
            "city": normalized_city,
            "area": area,
        }
        for index, area in enumerate(zone_areas)
    ]

    return {
        "city": normalized_city,
        "zones": zones,
    }


@app.get("/api/city/weather", response_model=CityWeatherResponse)
async def city_weather(city: str):
    normalized_city = _normalize_city_display(city)
    payload = await fetch_openweather_payload(normalized_city)
    if payload is None:
        raise HTTPException(status_code=404, detail="No weather data found for city")

    response = build_city_weather_response(normalized_city, payload)
    imd_alert = _get_latest_alert_for_context(normalized_city)
    adjusted_risk = _apply_imd_adjustment_to_risk(
        {
            "weather_risk_score": response["weather_risk_score"],
            "trigger_probability": response["trigger_probability"],
            "trigger_type": response["trigger_type"],
        },
        imd_alert,
    )
    response["weather_risk_score"] = int(adjusted_risk["weather_risk_score"])
    response["trigger_probability"] = float(adjusted_risk["trigger_probability"])
    response["trigger_type"] = str(adjusted_risk["trigger_type"])
    return response


@app.get("/api/city/zone-safety", response_model=ZoneSafetyResponse)
async def city_zone_safety(city: str, areas: str = ""):
    normalized_city = _normalize_city_display(city)
    payload = await fetch_openweather_payload(normalized_city)
    if payload is None:
        raise HTTPException(status_code=404, detail="No weather data found for city")

    city_weather = build_city_weather_response(normalized_city, payload)

    area_list = [a.strip() for a in areas.split(",") if a.strip()]
    if not area_list:
        area_list = generate_city_zone_suggestions(city=normalized_city, limit=len(ZONE_CONFIG))

    zones: list[ZoneSafetyItem] = []
    for area in area_list:
        risk = _zone_weather_risk_from_city_response(city_weather, normalized_city, area)
        zones.append(
            ZoneSafetyItem(
                id=_zone_slug(normalized_city, area),
                city=normalized_city,
                area=area,
                weather_risk_score=risk["weather_risk_score"],
                trigger_probability=risk["trigger_probability"],
                trigger_type=risk["trigger_type"],
                safety_level=risk["safety_level"],
            )
        )

    return {
        "city": normalized_city,
        "zones": zones,
    }


@app.get("/api/premium-quote")
def premium_quote(plan: str, city: str = ""):
    """Return dynamic premium for a plan factoring in city risk."""
    plan_name = plan.replace(" Shield", "").strip()
    if plan_name not in plans:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {plan}")

    base = plans[plan_name]
    normalized_city = city.strip().lower()
    city_adj = 0
    if normalized_city in high_rainfall_cities:
        city_adj = 10
    elif normalized_city in low_risk_cities:
        city_adj = -5

    return {
        "plan": plan_name,
        "base_weekly_premium": base["weekly_premium"],
        "city_adjustment": city_adj,
        "weekly_premium": max(base["weekly_premium"] + city_adj, 0),
        "daily_cap": base["daily_cap"],
        "max_payout": base["max_payout"],
        "hourly_rate": base["hourly_rate"],
    }


@app.post("/api/premium/calculate", response_model=PremiumCalculateResponse)
def calculate_dynamic_premium_endpoint(payload: PremiumCalculateRequest):
    request_input = PremiumRequestInput(
        zone=payload.zone,
        plan=payload.plan,
        month=payload.month or datetime.now(timezone.utc).month,
        tenure_months=payload.tenure_months,
        claims_paid=payload.claims_paid,
        premium_paid=payload.premium_paid,
        avg_daily_hours=payload.avg_daily_hours,
    )
    return calculate_dynamic_premium(request_input)


@app.get("/api/premium/zones", response_model=PremiumZonesResponse)
def get_premium_zones_endpoint():
    return {"zones": get_premium_zones()}


@app.get("/api/premium/model-info", response_model=PremiumModelInfoResponse)
def get_premium_model_info_endpoint():
    return get_premium_model_info()



@app.get("/api/claims/{user_id}")
def get_user_claims(user_id: int):
    """Return full claim history for a user."""
    user_claims = [
        {
            "id": idx + 1,
            "status": c["status"],
            "fraud_score": c["fraud_score"],
            "fraud_details": c.get("fraud_details"),
            "trigger_type": c.get("trigger_type"),
            "payout_amount": c.get("payout_amount", 0),
            "zone_id": c.get("zone_id"),
            "hours_lost": c.get("hours_lost", 0),
            "hourly_rate": c.get("hourly_rate", 0),
            "multiplier": c.get("multiplier", 1.0),
            "timestamp": c["timestamp"].isoformat(),
        }
        for idx, c in enumerate(claims)
        if c["user_id"] == user_id
    ]

    return {"user_id": user_id, "claims": user_claims}


@app.get("/dashboard/{user_id}")
def dashboard(user_id: int):
    user = users.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    plan_name = user.get("selected_plan")
    plan_details = user.get("plan_details")
    user_claims = [c for c in claims if c["user_id"] == user_id]
    total_payouts = sum(c.get("payout_amount", 0) for c in user_claims)
    recent_claims = [
        {
            "status": c["status"],
            "fraud_score": c["fraud_score"],
            "trigger_type": c.get("trigger_type"),
            "payout_amount": c.get("payout_amount", 0),
            "timestamp": c["timestamp"].isoformat(),
        }
        for c in user_claims
    ][-5:]

    return {
        "user_id": user_id,
        "selected_plan": plan_name,
        "premium": plan_details["weekly_premium"] if plan_details else None,
        "total_payouts": total_payouts,
        "recent_claims": recent_claims,
        "last_trigger_status": user.get("last_trigger_status", False),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: Instant Payout System (Simulated)
# ═══════════════════════════════════════════════════════════════════════════

class PayoutProcessRequest(BaseModel):
    worker_id: int = Field(..., ge=1)
    claim_id: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    gateway: Literal["razorpay", "upi_direct", "stripe"] = "razorpay"
    upi_id: str = Field(default="worker@upi")


@app.post("/api/payout/process")
def process_payout_endpoint(payload: PayoutProcessRequest):
    """Process instant payout through simulated payment gateway."""
    user = users.get(payload.worker_id)
    worker_name = user.get("name", "Worker") if user else "Worker"

    txn = process_payout(
        worker_id=payload.worker_id,
        claim_id=payload.claim_id,
        amount=payload.amount,
        gateway=payload.gateway,
        upi_id=payload.upi_id,
        worker_name=worker_name,
    )
    return txn.to_dict()


@app.get("/api/payout/status/{txn_id}")
def get_payout_status(txn_id: str):
    """Get payout transaction status."""
    txn = get_transaction(txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn.to_dict()


@app.get("/api/payout/transactions/{worker_id}")
def get_worker_payouts(worker_id: int):
    """Get all payout transactions for a worker."""
    txns = get_worker_transactions(worker_id)
    return {
        "worker_id": worker_id,
        "transactions": [t.to_dict() for t in txns],
        "total_disbursed": round(sum(t.amount for t in txns if t.status.value == "completed"), 2),
    }


@app.get("/api/payout/stats")
def get_payout_stats():
    """Aggregate payout statistics across all gateways."""
    return get_transaction_stats()


# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: Worker Earnings Summary (Intelligent Dashboard)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/worker/earnings-summary/{user_id}")
def worker_earnings_summary(user_id: int):
    """Worker intelligent dashboard data: earnings protected, coverage stats."""
    user = users.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    user_claims_all = [c for c in claims if c["user_id"] == user_id]
    claims_this_week = [c for c in user_claims_all if c["timestamp"] >= week_ago]
    claims_this_month = [c for c in user_claims_all if c["timestamp"] >= month_ago]

    total_earned = sum(c.get("payout_amount", 0) for c in user_claims_all)
    earned_this_week = sum(c.get("payout_amount", 0) for c in claims_this_week)
    earned_this_month = sum(c.get("payout_amount", 0) for c in claims_this_month)

    approved_claims = [c for c in user_claims_all if c.get("status") in {"approved", "auto-approve", "approve-with-flag"}]
    rejected_claims = [c for c in user_claims_all if c.get("status") in {"hold-for-review", "under_review"}]

    policy = policies.get(user_id)
    plan_name = user.get("selected_plan", "Standard")
    plan_details = plans.get(plan_name.replace(" Shield", "").strip().capitalize(), plans["Standard"])
    weekly_premium = plan_details.get("weekly_premium", 69)

    # Coverage utilization
    total_premium_paid = weekly_premium * max(1, len(claims_this_month) // 7 + 1)
    return_ratio = round(total_earned / total_premium_paid, 2) if total_premium_paid > 0 else 0.0

    # Build coverage timeline (last 4 weeks)
    coverage_weeks = []
    for w in range(4):
        start = now - timedelta(days=7 * (w + 1))
        end = now - timedelta(days=7 * w)
        week_claims = [c for c in user_claims_all if start <= c["timestamp"] < end]
        week_payout = sum(c.get("payout_amount", 0) for c in week_claims)
        coverage_weeks.append({
            "week": f"W{4 - w}",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "claims": len(week_claims),
            "payout": round(week_payout, 2),
            "premium": weekly_premium,
        })
    coverage_weeks.reverse()

    # Trust score based on fraud history
    avg_fraud = sum(c.get("fraud_score", 0) for c in user_claims_all) / max(len(user_claims_all), 1)
    trust_score = round(max(0, min(100, (1.0 - avg_fraud) * 100)), 0)

    # Payout transactions
    worker_txns = get_worker_transactions(user_id)

    return {
        "user_id": user_id,
        "plan": plan_name,
        "weekly_premium": weekly_premium,
        "coverage_status": policy.get("status", "active") if policy else "active",
        "earnings": {
            "total": round(total_earned, 2),
            "this_week": round(earned_this_week, 2),
            "this_month": round(earned_this_month, 2),
        },
        "claims_summary": {
            "total": len(user_claims_all),
            "approved": len(approved_claims),
            "rejected": len(rejected_claims),
            "this_week": len(claims_this_week),
            "this_month": len(claims_this_month),
        },
        "return_ratio": return_ratio,
        "trust_score": trust_score,
        "coverage_weeks": coverage_weeks,
        "recent_payouts": [t.to_dict() for t in worker_txns[-5:]],
    }


# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: Admin Analytics (Intelligent Dashboard)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/analytics")
async def admin_analytics():
    """Admin intelligent dashboard: loss ratios, predictive analytics."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    all_claims = list(claims)
    claims_this_week = [c for c in all_claims if c["timestamp"] >= week_ago]
    claims_this_month = [c for c in all_claims if c["timestamp"] >= month_ago]

    total_payouts = sum(c.get("payout_amount", 0) for c in all_claims)
    weekly_payouts = sum(c.get("payout_amount", 0) for c in claims_this_week)
    monthly_payouts = sum(c.get("payout_amount", 0) for c in claims_this_month)

    # Premium revenue estimation
    active_workers = len(users)
    avg_premium = 69  # Standard tier average
    weekly_premium_revenue = active_workers * avg_premium
    monthly_premium_revenue = weekly_premium_revenue * 4

    # Loss ratio = payouts / premium revenue
    weekly_loss_ratio = round(weekly_payouts / max(weekly_premium_revenue, 1), 3)
    monthly_loss_ratio = round(monthly_payouts / max(monthly_premium_revenue, 1), 3)

    # Fraud stats
    fraud_scores = [c.get("fraud_score", 0) for c in all_claims]
    high_fraud = len([s for s in fraud_scores if s > 0.6])
    medium_fraud = len([s for s in fraud_scores if 0.3 <= s <= 0.6])
    low_fraud = len([s for s in fraud_scores if s < 0.3])
    avg_fraud = round(sum(fraud_scores) / max(len(fraud_scores), 1), 3)

    # Claims by trigger type
    trigger_breakdown: dict[str, dict] = {}
    for c in all_claims:
        trigger = c.get("trigger_type") or "no_trigger"
        triggers = [t.strip() for t in trigger.split(",") if t.strip()]
        for t in triggers:
            if t not in trigger_breakdown:
                trigger_breakdown[t] = {"count": 0, "total_payout": 0.0}
            trigger_breakdown[t]["count"] += 1
            trigger_breakdown[t]["total_payout"] += c.get("payout_amount", 0) / max(len(triggers), 1)

    # Claims by status
    status_breakdown: dict[str, int] = {}
    for c in all_claims:
        status = c.get("status", "unknown")
        status_breakdown[status] = status_breakdown.get(status, 0) + 1

    # Payout gateway stats
    payout_stats = get_transaction_stats()

    # Worker segments
    worker_segments = {"gold": 0, "silver": 0, "standard": 0, "review": 0}
    for uid, u in users.items():
        user_c = [c for c in all_claims if c["user_id"] == uid]
        if not user_c:
            worker_segments["standard"] += 1
            continue
        avg_f = sum(c.get("fraud_score", 0) for c in user_c) / len(user_c)
        trust = (1.0 - avg_f) * 100
        if trust >= 80:
            worker_segments["gold"] += 1
        elif trust >= 60:
            worker_segments["silver"] += 1
        elif trust >= 40:
            worker_segments["standard"] += 1
        else:
            worker_segments["review"] += 1

    # Recent claims timeline (last 7 days, by day)
    daily_claims: dict[str, dict] = {}
    for d in range(7):
        day = (now - timedelta(days=d)).date().isoformat()
        day_claims = [c for c in all_claims if c["timestamp"].date().isoformat() == day]
        daily_claims[day] = {
            "claims": len(day_claims),
            "payouts": round(sum(c.get("payout_amount", 0) for c in day_claims), 2),
            "avg_fraud": round(sum(c.get("fraud_score", 0) for c in day_claims) / max(len(day_claims), 1), 3),
        }

    return {
        "summary": {
            "total_workers": active_workers,
            "total_claims": len(all_claims),
            "total_payouts": round(total_payouts, 2),
            "weekly_premium_revenue": weekly_premium_revenue,
            "monthly_premium_revenue": monthly_premium_revenue,
        },
        "loss_ratios": {
            "weekly": weekly_loss_ratio,
            "monthly": monthly_loss_ratio,
            "overall": round(total_payouts / max(monthly_premium_revenue, 1), 3),
        },
        "fraud_stats": {
            "avg_score": avg_fraud,
            "high_risk": high_fraud,
            "medium_risk": medium_fraud,
            "low_risk": low_fraud,
        },
        "trigger_breakdown": trigger_breakdown,
        "status_breakdown": status_breakdown,
        "worker_segments": worker_segments,
        "daily_timeline": daily_claims,
        "payout_gateway_stats": payout_stats,
    }


@app.get("/api/admin/predictive")
async def admin_predictive_analytics():
    """Predictive analytics: next week's likely weather/disruption claims."""
    now = datetime.now(timezone.utc)
    month = now.month  # 1-12

    # Seasonal multiplier: monsoon Jun-Sep peaks, winter Dec-Feb low
    seasonal_mult = {1: 0.6, 2: 0.5, 3: 0.7, 4: 0.8, 5: 0.9, 6: 1.4,
                     7: 1.6, 8: 1.5, 9: 1.3, 10: 1.1, 11: 0.9, 12: 0.7}
    season_factor = seasonal_mult.get(month, 1.0)

    # City-specific base claim rates (weekly) reflecting historical patterns
    city_base_claims = {
        "Mumbai": 18, "Chennai": 14, "Kolkata": 12, "Bengaluru": 10,
        "Kochi": 11, "Hyderabad": 8, "Delhi": 9, "Coimbatore": 6,
        "Pune": 7, "Jaipur": 5,
    }
    city_avg_payout = {
        "Mumbai": 620, "Chennai": 540, "Kolkata": 480, "Bengaluru": 520,
        "Kochi": 490, "Hyderabad": 460, "Delhi": 510, "Coimbatore": 420,
        "Pune": 450, "Jaipur": 380,
    }

    cities = ["Mumbai", "Chennai", "Bengaluru", "Delhi", "Kolkata", "Hyderabad", "Kochi", "Coimbatore"]
    city_forecasts = []

    for city_name in cities:
        payload = await fetch_openweather_payload(city_name)
        if payload is None:
            continue

        response = build_city_weather_response(city_name, payload)
        risk_score = response["weather_risk_score"]
        trigger_prob = response["trigger_probability"]
        trigger_type = response["trigger_type"]

        # Base claims from historical city pattern + seasonal adjustment
        base = city_base_claims.get(city_name, 8)
        base_weekly = max(2, int(base * season_factor * random.uniform(0.85, 1.15)))

        # Weather-amplified claims: boost if active triggers detected
        weather_boost = 0
        if trigger_prob > 0.3:
            weather_boost = int(trigger_prob * base * 0.6 * random.uniform(0.8, 1.3))

        predicted_claims = base_weekly + weather_boost

        # Predicted risk: blend historical base + current weather
        base_risk = min(100, int(base * 2.5 * season_factor))
        predicted_risk = min(100, int(risk_score * 0.4 + base_risk * 0.6 + random.randint(-3, 8)))

        # Estimated payout
        avg_payout = city_avg_payout.get(city_name, 450)
        # Use real claims data if available
        city_claims_data = [c for c in claims if str(c.get("zone_id", "")).lower().startswith(city_name.lower()[:4])]
        if city_claims_data:
            real_avg = sum(c.get("payout_amount", 0) for c in city_claims_data) / len(city_claims_data)
            if real_avg > 100:
                avg_payout = real_avg
        estimated_weekly_payout = round(predicted_claims * avg_payout * random.uniform(0.9, 1.1), 2)

        # Confidence: higher for stable weather, lower for volatile
        base_conf = 0.82 if trigger_prob < 0.2 else 0.68
        confidence = round(min(0.95, max(0.55, base_conf + random.uniform(-0.08, 0.08))), 2)

        risk_factors = []
        rainfall = response.get("rainfall", 0)
        temp = response.get("temperature", 0)
        wind = response.get("wind_speed", 0)
        humidity = response.get("humidity", 0)

        if rainfall > 20:
            risk_factors.append("Elevated rainfall pattern")
        if temp > 38:
            risk_factors.append("Heat stress trend")
        elif temp > 33:
            risk_factors.append("Above-average temperature")
        if wind > 30:
            risk_factors.append("High wind advisory")
        elif wind > 20:
            risk_factors.append("Moderate wind activity")
        if humidity > 85:
            risk_factors.append("Monsoon humidity")
        elif humidity > 70:
            risk_factors.append("Elevated humidity")
        # Seasonal risk factors
        if month in (6, 7, 8, 9):
            risk_factors.append("Monsoon season")
        elif month in (4, 5) and city_name in ("Delhi", "Hyderabad", "Jaipur"):
            risk_factors.append("Pre-monsoon heat belt")
        if city_name in ("Mumbai", "Chennai", "Kolkata") and season_factor > 1.0:
            risk_factors.append("Coastal flood zone")

        city_forecasts.append({
            "city": city_name,
            "current_risk": risk_score,
            "predicted_risk": predicted_risk,
            "current_trigger_type": trigger_type,
            "predicted_claims": predicted_claims,
            "estimated_payout": estimated_weekly_payout,
            "confidence": confidence,
            "risk_factors": risk_factors,
        })

    # Sort by predicted_risk desc for frontend
    city_forecasts.sort(key=lambda x: x["predicted_risk"], reverse=True)

    total_predicted_claims = sum(f["predicted_claims"] for f in city_forecasts)
    total_estimated_payout = sum(f["estimated_payout"] for f in city_forecasts)
    high_risk_cities = [f["city"] for f in city_forecasts if f["predicted_risk"] > 45]

    return {
        "prediction_period": {
            "start": (now + timedelta(days=1)).isoformat(),
            "end": (now + timedelta(days=8)).isoformat(),
        },
        "overall": {
            "predicted_total_claims": total_predicted_claims,
            "estimated_total_payout": round(total_estimated_payout, 2),
            "high_risk_cities": high_risk_cities,
            "recommended_reserve": round(total_estimated_payout * 1.15, 2),
        },
        "city_forecasts": city_forecasts,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: Demo Simulation — Full End-to-End Flow
# ═══════════════════════════════════════════════════════════════════════════

class DemoSimulationRequest(BaseModel):
    city: str = Field(default="Bengaluru")
    scenario: Literal[
        "rainstorm", "heatwave", "cyclone", "flooding", "demand_crash"
    ] = "rainstorm"
    worker_name: str = Field(default="Ramesh Kumar")
    worker_plan: Literal["Basic", "Standard", "Premium"] = "Standard"
    hours_lost: float = Field(default=4.0, gt=0)


@app.post("/api/demo/simulate-disruption")
async def demo_simulate_disruption(payload: DemoSimulationRequest):
    """
    Full end-to-end demo simulation:
    1. Creates/uses demo worker
    2. Triggers simulated weather event
    3. AI evaluates claim with fraud detection
    4. Processes instant payout through mock gateway
    5. Returns complete timeline for video demo
    """
    demo_start = datetime.now(timezone.utc)

    # Step 1: Create demo worker
    demo_worker_id = 9999
    if demo_worker_id not in users:
        users[demo_worker_id] = {
            "name": payload.worker_name,
            "phone": "9876543210",
            "city": payload.city,
            "platform": "Swiggy",
            "selected_plan": payload.worker_plan,
            "plan_details": plans.get(payload.worker_plan, plans["Standard"]),
            "zone_area": f"{payload.city.lower()}_central",
            "upi_id": f"{payload.worker_name.lower().replace(' ', '.')}@upi",
        }
        policies[demo_worker_id] = {
            "tier": payload.worker_plan,
            "status": "active",
            "started": demo_start.isoformat(),
        }

    user = users[demo_worker_id]
    plan_detail = plans.get(payload.worker_plan, plans["Standard"])

    # Step 2: Map scenario to demo triggers
    scenario_map = {
        "rainstorm": ["heavy_rain", "urban_flooding"],
        "heatwave": ["extreme_heat"],
        "cyclone": ["cyclone_alert", "heavy_rain"],
        "flooding": ["urban_flooding", "heavy_rain", "zone_shutdown"],
        "demand_crash": ["demand_collapse", "order_pause"],
    }
    demo_scenarios = scenario_map.get(payload.scenario, ["heavy_rain"])

    # Step 3: Get zone center for GPS
    zone_id = f"{payload.city.lower()}_central"
    zone_center = CLAIM_ZONE_CENTERS.get(zone_id) or CLAIM_ZONE_CENTERS.get(payload.city.lower()) or (12.9716, 77.5946)

    # Step 4: Evaluate claim with AI fraud detection
    eval_payload = ClaimEvaluateRequest(
        worker_id=demo_worker_id,
        zone_id=zone_id,
        city=payload.city,
        gps_lat=zone_center[0],
        gps_lon=zone_center[1],
        hours_lost=payload.hours_lost,
        app_active=True,
        demo_mode=True,
        demo_scenario=demo_scenarios[0],
        demo_scenarios=demo_scenarios,
        simulate_vpn=False,
    )
    claim_result = await evaluate_claim(eval_payload)
    claim_data = claim_result.model_dump() if hasattr(claim_result, "model_dump") else claim_result

    # Step 5: Process payout if approved
    payout_txn = None
    if claim_data.get("claim_status") in ("auto-approve", "approve-with-flag") and claim_data.get("payout_amount", 0) > 0:
        payout_amount = claim_data["payout_amount"]
        upi_id = user.get("upi_id", "worker@upi")
        txn = process_payout(
            worker_id=demo_worker_id,
            claim_id=f"DEMO-{secrets.token_hex(4).upper()}",
            amount=payout_amount,
            gateway="razorpay",
            upi_id=upi_id,
            worker_name=user.get("name", "Worker"),
        )
        payout_txn = txn.to_dict()

    demo_end = datetime.now(timezone.utc)

    # Step 6: Build demo timeline
    timeline = [
        {
            "step": 1,
            "event": "disruption_detected",
            "title": f"{payload.scenario.replace('_', ' ').title()} Detected",
            "detail": f"External disruption in {payload.city} — {', '.join(demo_scenarios)} triggered",
            "timestamp": demo_start.isoformat(),
            "duration_ms": 0,
        },
        {
            "step": 2,
            "event": "trigger_evaluation",
            "title": "AI Trigger Evaluation",
            "detail": f"{len([t for t in claim_data.get('trigger_list', []) if t.get('fired')])} trigger(s) fired, fraud score: {claim_data.get('fraud_score', 0):.1%}",
            "timestamp": (demo_start + timedelta(milliseconds=30)).isoformat(),
            "duration_ms": 30,
        },
        {
            "step": 3,
            "event": "fraud_check",
            "title": "5-Layer Fraud Detection",
            "detail": f"Score: {claim_data.get('fraud_score', 0):.1%} — {claim_data.get('claim_status', 'unknown')}",
            "timestamp": (demo_start + timedelta(milliseconds=60)).isoformat(),
            "duration_ms": 30,
        },
        {
            "step": 4,
            "event": "claim_decision",
            "title": "Claim Decision",
            "detail": claim_data.get("explanation", ""),
            "timestamp": (demo_start + timedelta(milliseconds=90)).isoformat(),
            "duration_ms": 30,
        },
    ]

    if payout_txn:
        timeline.append({
            "step": 5,
            "event": "payout_initiated",
            "title": "Instant Payout via Razorpay UPI",
            "detail": f"₹{payout_txn['amount']} → {payout_txn.get('upi_id', 'worker@upi')}",
            "timestamp": (demo_start + timedelta(milliseconds=120)).isoformat(),
            "duration_ms": 30,
        })
        timeline.append({
            "step": 6,
            "event": "payout_completed",
            "title": "Payment Completed",
            "detail": f"TXN: {payout_txn['txn_id']} | UPI Ref: {payout_txn.get('upi_ref', 'N/A')} | Gateway: Razorpay",
            "timestamp": (demo_start + timedelta(milliseconds=970)).isoformat(),
            "duration_ms": 850,
        })

    return {
        "demo_id": f"DEMO-{secrets.token_hex(4).upper()}",
        "scenario": payload.scenario,
        "city": payload.city,
        "worker": {
            "id": demo_worker_id,
            "name": user.get("name"),
            "plan": payload.worker_plan,
            "upi_id": user.get("upi_id"),
        },
        "claim_result": claim_data,
        "payout": payout_txn,
        "timeline": timeline,
        "total_duration_ms": int((demo_end - demo_start).total_seconds() * 1000),
    }
