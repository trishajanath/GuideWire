const API_BASE =
  import.meta.env.VITE_API_URL ??
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "/_/backend"
    : "http://localhost:8000");

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

export interface PhoneLoginUser {
  user_id: number;
  name: string;
  phone: string;
  city: string;
  platform: "Swiggy" | "Zomato";
  zone_area?: string;
  zone_id?: string;
  selected_plan?: "Basic" | "Standard" | "Premium";
  upi_id?: string;
}

export const loginByPhone = (phone: string) =>
  request<PhoneLoginUser>(`/login/phone?phone=${encodeURIComponent(phone)}`);

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
  submitted_hours: number;
  adjusted_hours: number;
  coverage_hour_adjustment: number;
  adjustment_reason: string;
}

export const calculatePayout = (
  lostHours: number,
  hourlyRate: number,
  multiplier: number,
  dailyCap: number,
  weatherRiskScore?: number,
  triggerProbability?: number,
) =>
  request<PayoutResult>("/api/payout/calculate", {
    method: "POST",
    body: JSON.stringify({
      lost_hours: lostHours,
      hourly_rate: hourlyRate,
      multiplier: multiplier,
      daily_cap: dailyCap,
      weather_risk_score: weatherRiskScore,
      trigger_probability: triggerProbability,
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
  category: "weather" | "platform" | "external";
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
    adjusted_hours: number;
    coverage_hour_adjustment: number;
    adjustment_reason: string;
    ml_future_loss_probability?: number;
    ml_future_loss_summary?: string;
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
  claim_status: "no-trigger" | "auto-approve" | "approve-with-flag" | "hold-for-review" | "auto-reject";
  fraud_score: number;
  payout_amount: number;
  trigger_list: ClaimEvaluateTrigger[];
  demo_scenario_applied?: string | null;
  explanation: string;
  ai_verdict?: string | null;
}

export interface AutomaticSimulationResult {
  mode: "automatic";
  seed: number;
  selected_scenarios: Array<
    | "heavy_rain"
    | "extreme_heat"
    | "cyclone_alert"
    | "urban_flooding"
    | "poor_visibility"
    | "demand_collapse"
    | "order_pause"
    | "zone_shutdown"
    | "zone_restriction"
    | "platform_outage"
    | "curfew"
    | "public_health_emergency"
    | "civil_disturbance"
    | "infrastructure_failure"
  >;
  city_weather_baseline: {
    rainfall_mm_per_hr: number;
    temperature_c: number;
    visibility_meters: number;
    urban_flooding: boolean;
  };
  platform_baseline: {
    current_index: number;
    historical_avg: number;
    drop_pct: number;
  };
  imd_alert_level: "none" | "yellow" | "orange" | "red";
  claim_result: ClaimEvaluateResult;
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
  demo_scenario?:
    | "none"
    | "heavy_rain"
    | "extreme_heat"
    | "cyclone_alert"
    | "urban_flooding"
    | "poor_visibility"
    | "demand_collapse"
    | "order_pause"
    | "zone_shutdown"
    | "zone_restriction"
    | "platform_outage"
    | "curfew"
    | "public_health_emergency"
    | "civil_disturbance"
    | "infrastructure_failure";
  demo_scenarios?: Array<
    | "heavy_rain"
    | "extreme_heat"
    | "cyclone_alert"
    | "urban_flooding"
    | "poor_visibility"
    | "demand_collapse"
    | "order_pause"
    | "zone_shutdown"
    | "zone_restriction"
    | "platform_outage"
    | "curfew"
    | "public_health_emergency"
    | "civil_disturbance"
    | "infrastructure_failure"
  >;
  simulate_vpn?: boolean;
  fraud_test_overrides?: {
    force_duplicate?: boolean;
    force_frequency?: boolean | number;
    force_gps_fail?: boolean;
    force_app_inactive?: boolean;
    force_vpn?: boolean;
  };
}) =>
  request<ClaimEvaluateResult>("/api/claims/evaluate", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const simulateAutomaticClaims = (data: {
  worker_id: number;
  city: string;
  zone_id?: string | null;
  hours_lost?: number;
  app_active?: boolean;
  seed?: number | null;
}) =>
  request<AutomaticSimulationResult>("/api/claims/simulate-automatic", {
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
  { id: "coimbatore_gandhipuram", city: "Coimbatore", area: "Gandhipuram" },
  { id: "coimbatore_rs_puram", city: "Coimbatore", area: "RS Puram" },
  { id: "coimbatore_peelamedu", city: "Coimbatore", area: "Peelamedu" },
  { id: "coimbatore_saibaba_colony", city: "Coimbatore", area: "Saibaba Colony" },
  { id: "coimbatore_race_course", city: "Coimbatore", area: "Race Course" },
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
  adjusted_hours?: number;
  coverage_hour_adjustment?: number;
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

/* ---- Instant Payout (Simulated Payment Gateway) ---- */

export interface PayoutTransaction {
  txn_id: string;
  gateway: "razorpay" | "upi_direct" | "stripe";
  worker_id: number;
  claim_id: string;
  amount: number;
  currency: string;
  status: "initiated" | "processing" | "completed" | "failed";
  upi_id?: string;
  upi_ref?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  stripe_transfer_id?: string;
  initiated_at: string;
  completed_at?: string;
  processing_time_ms?: number;
  failure_reason?: string;
  metadata: Record<string, unknown>;
}

export const processPayout = (data: {
  worker_id: number;
  claim_id: string;
  amount: number;
  gateway?: "razorpay" | "upi_direct" | "stripe";
  upi_id?: string;
}) =>
  request<PayoutTransaction>("/api/payout/process", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getPayoutStatus = (txnId: string) =>
  request<PayoutTransaction>(`/api/payout/status/${encodeURIComponent(txnId)}`);

export const getWorkerPayouts = (workerId: number) =>
  request<{ worker_id: number; transactions: PayoutTransaction[]; total_disbursed: number }>(
    `/api/payout/transactions/${workerId}`,
  );

export const getPayoutGatewayStats = () =>
  request<{
    total_transactions: number;
    total_completed: number;
    total_amount_disbursed: number;
    avg_processing_time_ms: number;
    by_gateway: Record<string, { count: number; total_amount: number; completed: number; failed: number }>;
  }>("/api/payout/stats");

/* ---- Worker Earnings Summary (Intelligent Dashboard) ---- */

export interface EarningsSummary {
  user_id: number;
  plan: string;
  weekly_premium: number;
  coverage_status: string;
  earnings: {
    total: number;
    this_week: number;
    this_month: number;
  };
  claims_summary: {
    total: number;
    approved: number;
    rejected: number;
    this_week: number;
    this_month: number;
  };
  return_ratio: number;
  trust_score: number;
  coverage_weeks: Array<{
    week: string;
    start: string;
    end: string;
    claims: number;
    payout: number;
    premium: number;
  }>;
  recent_payouts: PayoutTransaction[];
}

export const getEarningsSummary = (userId: number) =>
  request<EarningsSummary>(`/api/worker/earnings-summary/${userId}`);

/* ---- Admin Analytics (Intelligent Dashboard) ---- */

export interface AdminAnalytics {
  summary: {
    total_workers: number;
    total_claims: number;
    total_payouts: number;
    weekly_premium_revenue: number;
    monthly_premium_revenue: number;
  };
  loss_ratios: {
    weekly: number;
    monthly: number;
    overall: number;
  };
  fraud_stats: {
    avg_score: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  trigger_breakdown: Record<string, { count: number; total_payout: number }>;
  status_breakdown: Record<string, number>;
  worker_segments: { gold: number; silver: number; standard: number; review: number };
  daily_timeline: Record<string, { claims: number; payouts: number; avg_fraud: number }>;
  payout_gateway_stats: {
    total_transactions: number;
    total_completed: number;
    total_amount_disbursed: number;
    avg_processing_time_ms: number;
    by_gateway: Record<string, { count: number; total_amount: number; completed: number; failed: number }>;
  };
}

export const getAdminAnalytics = () =>
  request<AdminAnalytics>("/api/admin/analytics");

export interface CityForecast {
  city: string;
  current_risk: number;
  predicted_risk: number;
  current_trigger_type: string;
  predicted_claims: number;
  estimated_payout: number;
  confidence: number;
  risk_factors: string[];
}

export interface PredictiveAnalytics {
  prediction_period: { start: string; end: string };
  overall: {
    predicted_total_claims: number;
    estimated_total_payout: number;
    high_risk_cities: string[];
    recommended_reserve: number;
    predicted_weekly_premium_revenue?: number;
    predicted_loss_ratio?: number;
  };
  disruption_breakdown?: Record<string, { predicted_claims: number; estimated_payout: number }>;
  city_forecasts: CityForecast[];
}

export const getPredictiveAnalytics = () =>
  request<PredictiveAnalytics>("/api/admin/predictive");

export interface AdminUserRow {
  user_id: number;
  name: string;
  phone: string;
  city: string;
  zone_area?: string;
  platform: "Swiggy" | "Zomato";
  selected_plan?: string;
  registered_at?: string;
  claims_count: number;
  total_payout: number;
}

export const getAdminUsers = () =>
  request<{ total: number; users: AdminUserRow[] }>("/api/admin/users");

/* ---- Demo Simulation ---- */

export interface DemoTimeline {
  step: number;
  event: string;
  title: string;
  detail: string;
  timestamp: string;
  duration_ms: number;
}

export interface DemoSimulationResult {
  demo_id: string;
  scenario: string;
  city: string;
  worker: {
    id: number;
    name: string;
    plan: string;
    upi_id: string;
  };
  claim_result: ClaimEvaluateResult;
  payout: PayoutTransaction | null;
  timeline: DemoTimeline[];
  total_duration_ms: number;
}

export const simulateDisruption = (data: {
  city?: string;
  scenario?: "rainstorm" | "heatwave" | "cyclone" | "flooding" | "demand_crash";
  worker_name?: string;
  worker_plan?: "Basic" | "Standard" | "Premium";
  hours_lost?: number;
}) =>
  request<DemoSimulationResult>("/api/demo/simulate-disruption", {
    method: "POST",
    body: JSON.stringify(data),
  });
