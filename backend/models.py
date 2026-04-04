from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


TriggerCategory = Literal["weather", "platform", "external"]


class Trigger(BaseModel):
    name: str = Field(..., min_length=1)
    category: TriggerCategory
    threshold: float | str
    data_sources: list[str] = Field(default_factory=list)
    is_active: bool = True


class TriggerEvent(BaseModel):
    trigger_name: str = Field(..., min_length=1)
    value_observed: float | str
    threshold_breached: bool
    timestamp: datetime


class WorkerActivity(BaseModel):
    worker_id: str = Field(..., min_length=1)
    is_logged_in: bool
    active_hours: float = Field(..., ge=0)
    location: str = Field(..., min_length=1)


class TriggerDecisionResponse(BaseModel):
    trigger_status: str
    validation: str
    fraud_risk: str
    payout: float = Field(0, ge=0)
    message: str
    trigger_type: str | None = None


class WeatherRiskResponse(BaseModel):
    zone: str
    weather_risk_score: int = Field(..., ge=0, le=100)
    trigger_probability: float = Field(..., ge=0, le=1)
    trigger_type: str


class ZoneActivityResponse(BaseModel):
    zone: str
    anomaly_score: float
    status: str


class TriggerCheckResponse(BaseModel):
    trigger: bool
    type: str
    severity: float


class ValidateClaimRequest(BaseModel):
    zone_id: str = Field(..., min_length=1)
    worker_id: str = Field(..., min_length=1)
    weather_risk_score: int = Field(..., ge=0, le=100)
    anomaly_score: float
    weather_timestamp: datetime | None = None
    gps_timestamp: datetime | None = None


class ValidateClaimResponse(BaseModel):
    approved: bool
    fraud_score: float = Field(..., ge=0, le=1)
    payout: float = Field(0, ge=0)


class PayoutCalculationRequest(BaseModel):
    lost_hours: float = Field(..., ge=0)
    hourly_rate: float = Field(..., ge=0)
    multiplier: float = Field(..., ge=0)
    daily_cap: float = Field(..., ge=0)


class PayoutCalculationResponse(BaseModel):
    payout: float = Field(..., ge=0)
    status: str


class RecommendPlanRequest(BaseModel):
    avg_daily_hours: float = Field(..., ge=0)
    zone_risk: float = Field(..., ge=0, le=100)


class RecommendPlanResponse(BaseModel):
    recommended_plan: str
    confidence: float = Field(..., ge=0, le=1)
    reasoning: list[str]


class AssistantChatRequest(BaseModel):
    user_query: str = Field(..., min_length=1)
    language: str = Field(..., min_length=2)


class AssistantChatResponse(BaseModel):
    reply: str