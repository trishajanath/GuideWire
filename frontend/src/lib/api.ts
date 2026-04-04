const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ---- OTP ---- */

export interface OTPSendResponse {
  success: boolean;
  message: string;
  otp: string;
}

export const sendOTP = (phone: string) =>
  request<OTPSendResponse>("/otp/send", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const verifyOTP = (phone: string, otp: string) =>
  request<{ success: boolean; message: string }>("/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

/* ---- Auth / Registration ---- */

export interface RegisterPayload {
  name: string;
  phone: string;
  city: string;
  platform: "Swiggy" | "Zomato";
  zone_area?: string;
}

export const registerUser = (data: RegisterPayload) =>
  request<{ user_id: number }>("/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface CityZone {
  id: string;
  city: string;
  area: string;
}

export const getCityZones = (city: string) =>
  request<{ city: string; zones: CityZone[] }>(`/api/city-zones?city=${encodeURIComponent(city)}`);

export interface CityWeather {
  city: string;
  condition: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  rainfall: number;
  weather_risk_score: number;
  trigger_probability: number;
  trigger_type: string;
}

export const getCityWeather = (city: string) =>
  request<CityWeather>(`/api/city/weather?city=${encodeURIComponent(city)}`);

export interface CityZoneSafety {
  id: string;
  city: string;
  area: string;
  weather_risk_score: number;
  trigger_probability: number;
  trigger_type: string;
  safety_level: "Low" | "Medium" | "High";
}

export const getCityZoneSafety = (city: string, areas: string[]) => {
  const areaParam = encodeURIComponent(areas.join(","));
  return request<{ city: string; zones: CityZoneSafety[] }>(
    `/api/city/zone-safety?city=${encodeURIComponent(city)}&areas=${areaParam}`,
  );
};

export interface IMDAlert {
  zone: string;
  alert_level: "green" | "yellow" | "orange" | "red";
  event: "cyclone" | "rain" | "heatwave";
  source: "admin" | "rss";
  timestamp: string;
}

export const createAdminIMDAlert = (data: {
  zone: string;
  alert_level: "green" | "yellow" | "orange" | "red";
  event_type: "cyclone" | "rain" | "heatwave";
}) =>
  request<IMDAlert>("/api/admin/imd-alert", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getIMDAlert = (zone: string) =>
  request<IMDAlert>(`/api/imd-alert/${encodeURIComponent(zone)}`);

export const getRecentIMDAlerts = (limit: number = 30) =>
  request<{ alerts: IMDAlert[] }>(`/api/admin/imd-alerts?limit=${encodeURIComponent(String(limit))}`);

/* ---- Dynamic premium engine ---- */

export interface PremiumAdjustment {
  label: string;
  amount: number;
  direction: "up" | "down";
}

export interface PremiumCalculationRequest {
  zone: string;
  plan: "Basic" | "Standard" | "Premium";
  month?: number;
  tenure_months: number;
  claims_paid: number;
  premium_paid: number;
  avg_daily_hours: number;
}

export interface PremiumCalculationResult {
  plan: "Basic" | "Standard" | "Premium";
  zone: string;
  base: number;
  final_premium: number;
  premium_adjustment: number;
  itemised_adjustments: PremiumAdjustment[];
  risk_score: number;
  explanation: string;
}

export interface PremiumZoneInfo {
  zone: string;
  city: string;
  flood_score: number;
  annual_rainfall_mm: number;
  heat_days_gt_40c: number;
}

export interface PremiumModelInfo {
  trained_rows: number;
  r2: number;
  intercept: number;
  coefficients: Record<string, number>;
  features: string[];
  trained_at?: string | null;
}

export const calculatePremium = (data: PremiumCalculationRequest) =>
  request<PremiumCalculationResult>("/api/premium/calculate", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getPremiumZones = () =>
  request<{ zones: PremiumZoneInfo[] }>("/api/premium/zones");

export const getPremiumModelInfo = () =>
  request<PremiumModelInfo>("/api/premium/model-info");

/* ---- Plan selection ---- */

export interface PlanDetails {
  weekly_premium: number;
  base_weekly_premium: number;
  city_adjustment: number;
  daily_cap: number;
  max_payout: number;
  hourly_rate: number;
}

export const selectPlan = (userId: number, selectedPlan: string) =>
  request<{ user_id: number; selected_plan: string; plan_details: PlanDetails }>(
    "/select-plan",
    { method: "POST", body: JSON.stringify({ user_id: userId, selected_plan: selectedPlan }) },
  );

/* ---- Weather risk per zone ---- */

export interface WeatherRisk {
  zone: string;
  weather_risk_score: number;
  trigger_probability: number;
  trigger_type: string;
}

export const getWeatherRisk = (zoneId: string) =>
  request<WeatherRisk>(`/api/risk/${zoneId}`);

/* ---- Zone activity ---- */

export interface ZoneActivity {
  zone: string;
  anomaly_score: number;
  status: string;
}

export const getZoneActivity = (zoneId: string) =>
  request<ZoneActivity>(`/api/activity/${zoneId}`);

/* ---- Trigger check ---- */

export interface TriggerCheck {
  trigger: boolean;
  type: string;
  severity: number;
}

export const getTriggerCheck = (zoneId: string) =>
  request<TriggerCheck>(`/api/trigger/check/${zoneId}`);

/* ---- Latest weather event ---- */

export interface RawWeatherEvent {
  id: number;
  zone_id: string;
  temperature: number;
  rainfall: number;
  humidity: number;
  wind_speed: number;
  timestamp: string;
}

export const getLatestWeatherEvent = (zoneId: string) =>
  request<RawWeatherEvent>(`/api/raw-events/${zoneId}`);

/* ---- Plan recommendation ---- */

export interface PlanRecommendation {
  recommended_plan: string;
  confidence: number;
  reasoning: string[];
}

export const getRecommendedPlan = (avgDailyHours: number, zoneRisk: number) =>
  request<PlanRecommendation>("/api/recommend-plan", {
    method: "POST",
    body: JSON.stringify({ avg_daily_hours: avgDailyHours, zone_risk: zoneRisk }),
  });

/* ---- Payout calculation ---- */

export interface PayoutResult {
  payout: number;
  status: string;
}

export const calculatePayout = (
  lostHours: number,
  hourlyRate: number,
  multiplier: number,
  dailyCap: number,
) =>
  request<PayoutResult>("/api/payout/calculate", {
    method: "POST",
    body: JSON.stringify({
      lost_hours: lostHours,
      hourly_rate: hourlyRate,
      multiplier: multiplier,
      daily_cap: dailyCap,
    }),
  });

/* ---- Trigger pipeline evaluate ---- */

export interface TriggerEvaluatePayload {
  worker_id: string;
  weather: {
    rainfall: number;
    temperature: number;
    visibility_meters?: number;
    urban_flooding?: boolean;
    imd_alert_level?: "none" | "yellow" | "orange" | "red";
  };
  platform: { current_orders: number; average_orders: number; orders_last_3_hours: number };
  worker_activity: { is_logged_in: boolean; active_hours: number };
  fraud_signals?: {
    sudden_location_change?: boolean;
    worker_inactive_but_claiming_active?: boolean;
    repeated_triggers_within_short_time?: boolean;
  };
}

export interface TriggerDecision {
  trigger_status: string;
  validation: string;
  fraud_risk: string;
  payout: number;
  message: string;
  trigger_type?: string;
}

export const evaluateTrigger = (data: TriggerEvaluatePayload) =>
  request<TriggerDecision>("/api/v1/trigger/evaluate", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ---- Assistant chat ---- */

export interface AssistantReply {
  reply: string;
}

export const chatWithAssistant = (userQuery: string, language: string) =>
  request<AssistantReply>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ user_query: userQuery, language }),
  });

/* ---- Dashboard ---- */

export interface DashboardData {
  user_id: number;
  selected_plan: string | null;
  premium: number | null;
  total_payouts: number;
  recent_claims: { status: string; fraud_score: number; trigger_type?: string; payout_amount?: number; timestamp: string }[];
  last_trigger_status: boolean;
}

export const getDashboard = (userId: number) =>
  request<DashboardData>(`/dashboard/${userId}`);

/* ---- Policy lifecycle ---- */

export interface PolicyRecord {
  worker_id: number;
  tier: "Basic" | "Standard" | "Premium";
  status: "active" | "paused" | "cancelled";
  start_date: string;
  next_renewal_date: string;
  paused_until?: string;
  updated_at: string;
}

export interface PolicyHistoryRecord {
  id: string;
  worker_id: number;
  action: "created" | "pause" | "resume" | "upgrade" | "cancel";
  detail: string;
  timestamp: string;
}

export const getPolicy = (workerId: number) =>
  request<PolicyRecord>(`/policy/${workerId}`);

export const pausePolicy = (workerId: number) =>
  request<PolicyRecord>(`/policy/${workerId}/pause`, {
    method: "POST",
    body: JSON.stringify({ days: 7 }),
  });

export const resumePolicyApi = (workerId: number) =>
  request<PolicyRecord>(`/policy/${workerId}/resume`, {
    method: "POST",
  });

export const upgradePolicyApi = (workerId: number, tier: "Basic" | "Standard" | "Premium") =>
  request<PolicyRecord>(`/policy/${workerId}/upgrade`, {
    method: "POST",
    body: JSON.stringify({ tier }),
  });

export const getPolicyHistoryApi = (workerId: number) =>
  request<{ history: PolicyHistoryRecord[] }>(`/policy/${workerId}/history`);

/* ---- Auto claim ---- */

export interface AutoClaimResult {
  status: string;
  trigger_type: string | null;
  payout_amount: number;
  fraud_score: number;
  fraud_details?: FraudAssessment;
  message: string;
  timestamp: string;
}

export const autoClaim = (userId: number, hoursLost: number) =>
  request<AutoClaimResult>("/claim/auto", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, hours_lost: hoursLost }),
  });

export interface ClaimEvaluateTrigger {
  name: string;
  source: "openweather" | "mock";
  fired: boolean;
  status: "fired" | "not-fired";
  value?: number;
  threshold?: number;
  severity_multiplier: number;
  eligibility: {
    policy_active: boolean;
    premium_paid: boolean;
    gps_in_zone: boolean;
  };
  fraud?: {
    score: number;
    decision: "auto-approve" | "approve-with-flag" | "hold-for-review";
    breakdown: Array<{
      label: string;
      weight: number;
      value: number;
      contribution: number;
    }>;
  };
  payout?: {
    hours_lost: number;
    hourly_rate: number;
    severity_multiplier: number;
    daily_cap: number;
    raw_amount: number;
    final_amount: number;
    formula: string;
  };
}

export interface ClaimEvaluateResult {
  worker_id: number;
  zone_id: string;
  city: string;
  claim_status: "no-trigger" | "auto-approve" | "approve-with-flag" | "hold-for-review";
  fraud_score: number;
  payout_amount: number;
  trigger_list: ClaimEvaluateTrigger[];
  demo_scenario_applied?: string | null;
  explanation: string;
}

export const evaluateClaimEngine = (data: {
  worker_id: number;
  zone_id: string;
  city: string;
  gps_lat: number;
  gps_lon: number;
  hours_lost: number;
  app_active?: boolean;
  demo_mode?: boolean;
  demo_scenario?: "none" | "heavy_rain" | "extreme_heat" | "demand_collapse" | "zone_shutdown" | "platform_outage";
}) =>
  request<ClaimEvaluateResult>("/api/claims/evaluate", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ---- Validate claim ---- */

export interface ClaimValidation {
  approved: boolean;
  fraud_score: number;
  payout: number;
}

export const validateClaim = (data: {
  zone_id: string;
  worker_id: string;
  weather_risk_score: number;
  anomaly_score: number;
}) =>
  request<ClaimValidation>("/api/validate-claim", {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ---- Utility: all zones ---- */

export const ZONES = [
  { id: "koramangala_blr", city: "Bengaluru", area: "Koramangala" },
  { id: "indiranagar_blr", city: "Bengaluru", area: "Indiranagar" },
  { id: "whitefield_blr", city: "Bengaluru", area: "Whitefield" },
  { id: "hsr_layout_blr", city: "Bengaluru", area: "HSR Layout" },
  { id: "electronic_city_blr", city: "Bengaluru", area: "Electronic City" },
] as const;

export type ZoneId = (typeof ZONES)[number]["id"];

/* ---- Premium quote (dynamic pricing) ---- */

export interface PremiumQuote {
  plan: string;
  base_weekly_premium: number;
  city_adjustment: number;
  weekly_premium: number;
  daily_cap: number;
  max_payout: number;
  hourly_rate: number;
}

export const getPremiumQuote = (plan: string, city: string) =>
  request<PremiumQuote>(`/api/premium-quote?plan=${encodeURIComponent(plan)}&city=${encodeURIComponent(city)}`);

/* ---- Claims history ---- */

export interface ClaimRecord {
  id: number;
  status: string;
  fraud_score: number;
  fraud_details?: FraudAssessment;
  trigger_type: string | null;
  payout_amount: number;
  zone_id: string | null;
  hours_lost: number;
  hourly_rate: number;
  multiplier: number;
  timestamp: string;
}

export const getUserClaims = (userId: number) =>
  request<{ user_id: number; claims: ClaimRecord[] }>(`/api/claims/${userId}`);

/* ---- Fraud Assessment ---- */

export interface FraudSignal {
  layer: string;
  score: number;
  confidence: number;
  reason: string;
  details: Record<string, unknown>;
}

export interface FraudAssessment {
  overall_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  allow_payout: boolean;
  signals: FraudSignal[];
  explanation: string;
}

export const assessFraud = (userId: number, zoneId: string = "") =>
  request<FraudAssessment>("/api/fraud/assess", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, zone_id: zoneId }),
  });
