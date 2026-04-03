import os
import logging
from pathlib import Path
from typing import Literal
from datetime import datetime, timezone

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI, HTTPException
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
    from .assistant import generate_assistant_reply
except ImportError:
    from assistant import generate_assistant_reply

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
    "andheri_mumbai": "Mumbai,IN",
    "banjara_hills_hyd": "Hyderabad,IN",
}

MOCK_ZONE_ACTIVITY_DATA: dict[str, dict] = {
    "koramangala_blr": {"active_workers": 25, "idle_workers": 18, "avg_distance": 4.2},
    "andheri_mumbai": {"active_workers": 20, "idle_workers": 22, "avg_distance": 3.5},
    "banjara_hills_hyd": {"active_workers": 28, "idle_workers": 10, "avg_distance": 4.8},
}

MOCK_WORKER_ELIGIBILITY_DB: dict[str, bool] = {
    "worker_1": True,
    "worker_2": True,
    "worker_3": False,
}

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

users: dict[int, dict] = {}
claims: list[dict] = []
plans = {
    "Basic": {"weekly_premium": 49, "max_payout": 2000, "hourly_rate": 75},
    "Standard": {"weekly_premium": 69, "max_payout": 3500, "hourly_rate": 100},
    "Premium": {"weekly_premium": 99, "max_payout": 6000, "hourly_rate": 150},
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
    scheduler.add_job(
        ingest_weather_events_job,
        trigger=IntervalTrigger(minutes=15),
        id="openweather_ingestion",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    await ingest_weather_events_job()


@app.on_event("shutdown")
async def shutdown_background_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


class RegistrationRequest(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=6)
    city: str = Field(..., min_length=1)
    platform: Literal["Swiggy", "Zomato"]


class PlanSelectionRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    selected_plan: Literal["Basic", "Standard", "Premium"]


class AutoClaimRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    hours_lost: float = Field(..., gt=0)


class TriggerWeatherInput(BaseModel):
    rainfall: float = Field(..., ge=0)
    temperature: float = Field(...)


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


def calculate_fraud_score(user_id: int) -> float:
    today = datetime.now(timezone.utc).date()
    claims_today = [
        claim for claim in claims
        if claim["user_id"] == user_id and claim["timestamp"].date() == today
    ]

    if len(claims_today) <= 3:
        return 0.2 if len(claims_today) else 0.0

    excess_claims = len(claims_today) - 3
    return min(1.0, 0.5 + (excess_claims * 0.2))


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


@app.post("/register")
def register_user(payload: RegistrationRequest):
    user_id = len(users) + 1
    user = {
        "user_id": user_id,
        "name": payload.name,
        "phone": payload.phone,
        "city": payload.city,
        "platform": payload.platform,
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
def auto_claim(payload: AutoClaimRequest):
    user = users.get(payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    plan_details = user.get("plan_details")
    if plan_details is None:
        raise HTTPException(status_code=400, detail="Plan not selected")

    weather_trigger = check_weather_trigger(user["city"])
    user["last_trigger_status"] = weather_trigger["trigger_status"]
    user["last_trigger_type"] = weather_trigger["trigger_type"]
    user["last_trigger_severity"] = weather_trigger["severity_level"]
    fraud_score = calculate_fraud_score(payload.user_id)
    now = datetime.now(timezone.utc)

    if not weather_trigger["trigger_status"]:
        claim_record = {
            "user_id": payload.user_id,
            "timestamp": now,
            "fraud_score": fraud_score,
            "status": "under review" if fraud_score >= 0.7 else "approved",
        }
        claims.append(claim_record)
        return {
            "status": claim_record["status"],
            "trigger_type": None,
            "payout_amount": 0,
            "fraud_score": fraud_score,
            "message": "No active trigger found for payout",
            "timestamp": now.isoformat(),
        }

    multiplier = 1.2
    payout = min(
        payload.hours_lost * plan_details["hourly_rate"] * multiplier,
        plan_details["max_payout"],
    )
    payout_amount = round(payout, 2)
    credited_amount = int(payout_amount) if payout_amount.is_integer() else payout_amount
    claim_status = "approved" if fraud_score < 0.7 else "under review"

    claims.append(
        {
            "user_id": payload.user_id,
            "timestamp": now,
            "fraud_score": fraud_score,
            "status": claim_status,
        }
    )

    if claim_status != "approved":
        return {
            "status": claim_status,
            "trigger_type": weather_trigger["trigger_type"],
            "payout_amount": 0,
            "fraud_score": fraud_score,
            "message": "Claim under review",
            "timestamp": now.isoformat(),
        }

    return {
        "status": claim_status,
        "trigger_type": weather_trigger["trigger_type"],
        "payout_amount": payout_amount,
        "fraud_score": fraud_score,
        "message": f"₹{credited_amount} credited to your account",
        "timestamp": now.isoformat(),
    }


@app.post("/api/v1/trigger/evaluate", response_model=TriggerDecisionResponse)
def evaluate_trigger_endpoint(payload: TriggerEvaluateRequest):
    return evaluate_trigger_pipeline(
        rainfall_mm_last_3_hours=payload.weather.rainfall,
        temperature_celsius=payload.weather.temperature,
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

    return {
        "zone": zone_id,
        "weather_risk_score": risk["weather_risk_score"],
        "trigger_probability": risk["trigger_probability"],
        "trigger_type": risk["trigger_type"],
    }


@app.get("/api/activity/{zone_id}", response_model=ZoneActivityResponse)
def get_zone_activity(zone_id: str):
    activity_data = MOCK_ZONE_ACTIVITY_DATA.get(zone_id)
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

    activity_data = MOCK_ZONE_ACTIVITY_DATA.get(zone_id)
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
        mock_eligibility_db=MOCK_WORKER_ELIGIBILITY_DB,
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


@app.get("/dashboard/{user_id}")
def dashboard(user_id: int):
    user = users.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    plan_name = user.get("selected_plan")
    plan_details = user.get("plan_details")
    recent_claims = [
        {
            "status": claim["status"],
            "fraud_score": claim["fraud_score"],
            "timestamp": claim["timestamp"].isoformat(),
        }
        for claim in claims
        if claim["user_id"] == user_id
    ][-5:]

    return {
        "user_id": user_id,
        "selected_plan": plan_name,
        "premium": plan_details["weekly_premium"] if plan_details else None,
        "recent_claims": recent_claims,
        "last_trigger_status": user.get("last_trigger_status", False),
    }
