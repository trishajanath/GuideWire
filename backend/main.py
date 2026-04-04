import os
import logging
import secrets
import re
from pathlib import Path
from typing import Literal
from datetime import datetime, timezone, timedelta

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, HTTPException
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
}

ZONE_ACTIVITY_DATA: dict[str, dict] = {
    "koramangala_blr": {"active_workers": 47, "idle_workers": 12, "avg_distance": 3.1},
    "indiranagar_blr": {"active_workers": 38, "idle_workers": 9, "avg_distance": 2.7},
    "whitefield_blr": {"active_workers": 53, "idle_workers": 21, "avg_distance": 5.4},
    "hsr_layout_blr": {"active_workers": 41, "idle_workers": 14, "avg_distance": 3.6},
    "electronic_city_blr": {"active_workers": 34, "idle_workers": 19, "avg_distance": 4.9},
}

WORKER_ELIGIBILITY_DB: dict[str, bool] = {
    "worker_1": True,
    "worker_2": True,
    "worker_3": False,
}

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

users: dict[int, dict] = {}
claims: list[dict] = []
plans = {
    "Basic": {"weekly_premium": 49, "daily_cap": 500, "max_payout": 2000, "hourly_rate": 75},
    "Standard": {"weekly_premium": 69, "daily_cap": 800, "max_payout": 3500, "hourly_rate": 100},
    "Premium": {"weekly_premium": 99, "daily_cap": 1200, "max_payout": 6000, "hourly_rate": 150},
}
high_rainfall_cities = {"mumbai", "bengaluru", "bangalore", "kochi", "chennai"}
low_risk_cities = {"jaipur", "indore", "nagpur"}
mock_rainfall_by_city = {
    "mumbai": 48,
    "bengaluru": 36,
    "bangalore": 36,
    "kochi": 42,
    "chennai": 31,
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

    return {
        "user_id": payload.user_id,
        "selected_plan": payload.selected_plan,
        "plan_details": plan_details,
    }


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


@app.get("/api/risk/{zone_id}", response_model=WeatherRiskResponse)
def get_zone_weather_risk(zone_id: str):
    latest_event = raw_event_repository.get_latest_by_zone(zone_id)
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
    activity_data = ZONE_ACTIVITY_DATA.get(zone_id)
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
        raise HTTPException(status_code=404, detail="No weather data found for zone")

    activity_data = ZONE_ACTIVITY_DATA.get(zone_id)
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
        raise HTTPException(status_code=404, detail="No IMD alert found for zone")

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
