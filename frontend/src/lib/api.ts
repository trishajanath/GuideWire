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
