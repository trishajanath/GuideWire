import { useEffect, useState, useRef } from "react";
import { AlertTriangle, IndianRupee, CloudRain, ArrowLeft, Loader2, CheckCircle2, Zap, Shield, Sparkles, Clock, ChevronDown, ChevronUp, CreditCard, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import FraudBreakdown from "@/components/FraudBreakdown";
import FraudDemo from "@/components/FraudDemo";
import TriggerLab from "@/components/TriggerLab";
import { getCurrentUser } from "@/lib/session";
import {
  getTriggerCheck,
  getWeatherRisk,
  getIMDAlert,
  evaluateClaimEngine,
  assessFraud,
  processPayout,
  ZONES,
  type TriggerCheck as TriggerCheckT,
  type WeatherRisk,
  type ClaimEvaluateResult,
  type FraudAssessment,
  type IMDAlert,
  type PayoutTransaction,
} from "@/lib/api";

const CLAIM_ZONE_CENTERS: Record<string, { lat: number; lon: number }> = {
  koramangala_blr: { lat: 12.9352, lon: 77.6245 },
  indiranagar_blr: { lat: 12.9784, lon: 77.6408 },
  whitefield_blr: { lat: 12.9698, lon: 77.75 },
  hsr_layout_blr: { lat: 12.9116, lon: 77.6472 },
  electronic_city_blr: { lat: 12.8456, lon: 77.6603 },
  coimbatore_gandhipuram: { lat: 11.0168, lon: 76.9558 },
  coimbatore_rs_puram: { lat: 11.012, lon: 76.949 },
  coimbatore_peelamedu: { lat: 11.025, lon: 77.002 },
  coimbatore_saibaba_colony: { lat: 11.021, lon: 76.965 },
  coimbatore_race_course: { lat: 11.0008, lon: 76.962 },
};

const CITY_CENTER: Record<string, { lat: number; lon: number }> = {
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  delhi: { lat: 28.6139, lon: 77.209 },
};

const getClaimGps = (zoneId: string, city: string) => {
  const zone = CLAIM_ZONE_CENTERS[zoneId];
  if (zone) return zone;
  return CITY_CENTER[city.trim().toLowerCase()] ?? CITY_CENTER.bengaluru;
};

type MockScenario =
  | "heavy_rain"
  | "extreme_heat"
  | "cyclone_alert"
  | "urban_flooding"
  | "poor_visibility"
  | "demand_collapse"
  | "order_pause"
  | "zone_shutdown"
  | "platform_outage"
  | "curfew"
  | "public_health_emergency"
  | "civil_disturbance"
  | "infrastructure_failure";

const MOCK_WEATHER_SCENARIOS: MockScenario[] = [
  "heavy_rain",
  "extreme_heat",
  "cyclone_alert",
  "urban_flooding",
  "poor_visibility",
];

const MOCK_PLATFORM_SCENARIOS: MockScenario[] = [
  "demand_collapse",
  "order_pause",
  "zone_shutdown",
  "platform_outage",
];

const MOCK_EXTERNAL_SCENARIOS: MockScenario[] = [
  "curfew",
  "public_health_emergency",
  "civil_disturbance",
  "infrastructure_failure",
];

const mockScenarioMeta: Record<MockScenario, { category: "weather" | "platform" | "external"; source: "openweather" | "mock"; severity: number; threshold: number }> = {
  heavy_rain: { category: "weather", source: "openweather", severity: 1.25, threshold: 30 },
  extreme_heat: { category: "weather", source: "openweather", severity: 1.15, threshold: 42 },
  cyclone_alert: { category: "weather", source: "mock", severity: 1.45, threshold: 1 },
  urban_flooding: { category: "weather", source: "mock", severity: 1.35, threshold: 1 },
  poor_visibility: { category: "weather", source: "mock", severity: 1.1, threshold: 100 },
  demand_collapse: { category: "platform", source: "mock", severity: 1.2, threshold: 40 },
  order_pause: { category: "platform", source: "mock", severity: 1.1, threshold: 2 },
  zone_shutdown: { category: "platform", source: "mock", severity: 1.3, threshold: 1 },
  platform_outage: { category: "platform", source: "mock", severity: 1.25, threshold: 1 },
  curfew: { category: "external", source: "mock", severity: 1.35, threshold: 1 },
  public_health_emergency: { category: "external", source: "mock", severity: 1.35, threshold: 1 },
  civil_disturbance: { category: "external", source: "mock", severity: 1.35, threshold: 1 },
  infrastructure_failure: { category: "external", source: "mock", severity: 1.35, threshold: 1 },
};

const makeRandomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

const pickOne = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const pickManyUnique = <T,>(items: T[], count: number) => {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
};

const severityLabel = (multiplier: number): { label: string; color: string } => {
  if (multiplier >= 1.35) return { label: "High", color: "text-destructive" };
  if (multiplier >= 1.2) return { label: "Medium", color: "text-warning" };
  return { label: "Low", color: "text-accent-green" };
};

const severityBg = (multiplier: number): string => {
  if (multiplier >= 1.35) return "bg-destructive/15";
  if (multiplier >= 1.2) return "bg-warning/15";
  return "bg-accent-green/15";
};

type GeneratedAlert = {
  id: number;
  seed: number;
  trigger: { trigger: boolean; type: string; severity: number };
  risk: { zone: string; weather_risk_score: number; trigger_probability: number; trigger_type: string };
  imdAlert: IMDAlert | null;
  claimResult: ClaimEvaluateResult;
  timeline: { detected: Date; processed: Date; credited: Date };
};

const formatTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const getFraudReasons = (claimResult: ClaimEvaluateResult): string[] => {
  const reasons: string[] = [];
  const fired = claimResult.trigger_list?.find((t) => t.fired);
  if (!fired?.fraud) return reasons;
  for (const b of fired.fraud.breakdown) {
    if (b.contribution > 0.05) reasons.push(b.label);
  }
  if (reasons.length === 0 && claimResult.fraud_score > 0.25) {
    reasons.push("Multiple signals flagged");
  }
  return reasons;
};

const buildMockClaimResult = (params: {
  workerId: number;
  zoneId: string;
  city: string;
  scenarios: MockScenario[];
  hoursLost: number;
}): ClaimEvaluateResult => {
  const activeScenarios = params.scenarios.length > 0 ? params.scenarios : [pickOne([...MOCK_WEATHER_SCENARIOS, ...MOCK_PLATFORM_SCENARIOS, ...MOCK_EXTERNAL_SCENARIOS])];
  const highestSeverity = Math.max(...activeScenarios.map((scenario) => mockScenarioMeta[scenario].severity));
  const firedScenario = activeScenarios[0];
  const basePayout = Math.round(params.hoursLost * 100 * highestSeverity);
  const payoutAmount = Math.min(basePayout, 800);

  return {
    worker_id: params.workerId,
    zone_id: params.zoneId,
    city: params.city,
    claim_status: highestSeverity < 1.3 ? "auto-approve" : highestSeverity < 1.5 ? "approve-with-flag" : "hold-for-review",
    fraud_score: Number(Math.min(0.92, 0.18 + (activeScenarios.length - 1) * 0.14 + (highestSeverity - 1) * 0.22).toFixed(3)),
    payout_amount: payoutAmount,
    trigger_list: activeScenarios.map((scenario) => {
      const meta = mockScenarioMeta[scenario];
      const fired = scenario === firedScenario;
      const value =
        scenario === "heavy_rain"
          ? Number((28 + Math.random() * 34).toFixed(1))
          : scenario === "extreme_heat"
            ? Number((42 + Math.random() * 7).toFixed(1))
            : scenario === "poor_visibility"
              ? Number((60 + Math.random() * 70).toFixed(0))
              : scenario === "demand_collapse"
                ? Number((42 + Math.random() * 35).toFixed(1))
                : scenario === "order_pause"
                  ? Number((1 + Math.random() * 2).toFixed(0))
                  : 1;

      return {
        name: scenario,
        category: meta.category,
        source: meta.source,
        fired,
        status: fired ? "fired" : "not-fired",
        value,
        threshold: meta.threshold,
        severity_multiplier: meta.severity,
        eligibility: { policy_active: true, premium_paid: true, gps_in_zone: true },
        fraud: fired
          ? {
              score: Number(Math.min(0.9, 0.12 + Math.random() * 0.45).toFixed(3)),
              decision: highestSeverity < 1.3 ? "auto-approve" : highestSeverity < 1.5 ? "approve-with-flag" : "hold-for-review",
              breakdown: [
                { label: "GPS in registered zone", weight: 0.22, value: 0, contribution: 0 },
                { label: "App active during event", weight: 0.18, value: 0, contribution: 0 },
                { label: "Zone worker ratio", weight: 0.2, value: 0.5, contribution: 0.1 },
                { label: "No duplicate claim", weight: 0.12, value: 0, contribution: 0 },
                { label: "Claim frequency vs zone average", weight: 0.12, value: 0.1, contribution: 0.012 },
                { label: "VPN / Proxy detection", weight: 0.16, value: 0, contribution: 0 },
              ],
            }
          : undefined,
        payout: fired
          ? {
              hours_lost: params.hoursLost,
              adjusted_hours: params.hoursLost,
              coverage_hour_adjustment: 0,
              adjustment_reason: "none",
              hourly_rate: 100,
              severity_multiplier: meta.severity,
              daily_cap: 800,
              raw_amount: Number((params.hoursLost * 100 * meta.severity).toFixed(2)),
              final_amount: payoutAmount,
              formula: `${params.hoursLost}h × ₹100 × ${meta.severity} = ₹${payoutAmount}`,
            }
          : undefined,
      };
    }),
    demo_scenario_applied: firedScenario,
    explanation: `Random mock scenario generated for ${activeScenarios.map((scenario) => scenario.replace(/_/g, " ")).join(", ")}.`,
    ai_verdict: null,
  };
};

const buildMockAlertState = (params: { zoneId: string; city: string; zoneName: string; hoursLost: number; workerId?: number }) => {
  const seed = makeRandomSeed();
  const modeRoll = Math.random();
  const bucket = modeRoll < 0.45 ? "weather" : modeRoll < 0.8 ? "platform" : "external";
  const sourceList = bucket === "weather" ? MOCK_WEATHER_SCENARIOS : bucket === "platform" ? MOCK_PLATFORM_SCENARIOS : MOCK_EXTERNAL_SCENARIOS;
  const scenarios = pickManyUnique(sourceList, Math.floor(Math.random() * 3) + 1);
  const claimResult = buildMockClaimResult({
    workerId: params.workerId ?? 1,
    zoneId: params.zoneId,
    city: params.city,
    scenarios,
    hoursLost: params.hoursLost,
  });
  const firstFired = claimResult.trigger_list.find((item) => item.fired) ?? claimResult.trigger_list[0];
  const weatherScenario = claimResult.trigger_list.find((item) => item.category === "weather" && item.fired);

  const trigger = {
    trigger: true,
    type: firstFired.name,
    severity: firstFired.severity_multiplier,
  };

  const risk = {
    zone: params.zoneId,
    weather_risk_score: Math.min(100, Math.round(35 + Math.random() * 55 + (bucket === "weather" ? 10 : 0))),
    trigger_probability: Number((0.35 + Math.random() * 0.55).toFixed(2)),
    trigger_type: weatherScenario?.name ?? firstFired.name,
  };

  const imdAlert: IMDAlert | null = bucket === "external"
    ? {
        zone: params.zoneId,
        alert_level: Math.random() < 0.5 ? "orange" : "red",
        event: pickOne(["cyclone", "rain", "heatwave"]),
        source: "admin",
        timestamp: new Date().toISOString(),
      }
    : bucket === "weather" && Math.random() < 0.7
      ? {
          zone: params.zoneId,
          alert_level: pickOne(["yellow", "orange", "red"]),
          event: pickOne(["cyclone", "rain", "heatwave"]),
          source: "rss",
          timestamp: new Date().toISOString(),
        }
      : null;

  return { seed, trigger, risk, imdAlert, claimResult };
};

const TriggerAlert = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const zoneId = user?.zoneId ?? ZONES[0].id;
  const city = user?.city ?? "bengaluru";
  const zoneName = user?.zoneArea ?? ZONES.find((z) => z.id === zoneId)?.area ?? zoneId;

  const [trigger, setTrigger] = useState<TriggerCheckT | null>(null);
  const [risk, setRisk] = useState<WeatherRisk | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimEvaluateResult | null>(null);
  const [fraudData, setFraudData] = useState<FraudAssessment | null>(null);
  const [imdAlert, setImdAlert] = useState<IMDAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [autoClaimed, setAutoClaimed] = useState(false);
  const [showFraudDetails, setShowFraudDetails] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedSeed, setGeneratedSeed] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [generatedAlerts, setGeneratedAlerts] = useState<GeneratedAlert[]>([]);
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null);
  const [payoutTxn, setPayoutTxn] = useState<PayoutTransaction | null>(null);

  const GATEWAYS = ["razorpay", "upi_direct", "stripe"] as const;
  const selectedPlan = user?.selectedPlan;
  const userId = user?.backendUserId;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [t, r] = await Promise.all([
          getTriggerCheck(zoneId),
          getWeatherRisk(zoneId),
        ]);
        if (cancelled) return;
        setTrigger(t);
        setRisk(r);

        try {
          const imd = await getIMDAlert(city);
          if (!cancelled) setImdAlert(imd);
        } catch {
          if (!cancelled) setImdAlert(null);
        }

        // Fetch real-time fraud assessment
        if (userId) {
          try {
            const fraud = await assessFraud(userId, zoneId);
            if (!cancelled) setFraudData(fraud);
          } catch { /* non-blocking */ }
        }

        // Zero-touch auto-claim: if trigger is active, automatically file claim
        if (t.trigger && userId) {
          setAutoClaimed(true);
          setClaiming(true);
          try {
            const gps = getClaimGps(zoneId, city);
            const claim = await evaluateClaimEngine({
              worker_id: userId,
              zone_id: zoneId,
              city,
              gps_lat: gps.lat,
              gps_lon: gps.lon,
              hours_lost: 2 + t.severity * 2,
              app_active: true,
            });
            if (!cancelled) {
              setClaimResult(claim);
              // Auto-process instant payout through payment gateway
              if (
                (claim.claim_status === "auto-approve" || claim.claim_status === "approve-with-flag") &&
                claim.payout_amount > 0
              ) {
                try {
                  const gateway = GATEWAYS[Math.floor(Math.random() * GATEWAYS.length)];
                  const txn = await processPayout({
                    worker_id: userId,
                    claim_id: `CLM-${Date.now()}`,
                    amount: claim.payout_amount,
                    gateway,
                    upi_id: "worker@upi",
                  });
                  if (!cancelled) setPayoutTxn(txn);
                } catch { /* payout processing failed silently */ }
              }
            }
          } catch {
            // Claim failed silently — user can retry
          } finally {
            if (!cancelled) setClaiming(false);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, userId]);

  const handleGenerateSituations = async () => {
    if (!userId) return;
    setGenerating(true);
    setAutoClaimed(true);
    setError("");
    try {
      const alertCount = 2 + Math.floor(Math.random() * 3); // 2-4 alerts
      const alerts: GeneratedAlert[] = [];
      const now = new Date();

      for (let i = 0; i < alertCount; i++) {
        const simulation = buildMockAlertState({
          zoneId,
          city,
          zoneName,
          hoursLost: 1 + Math.floor(Math.random() * 3),
          workerId: userId,
        });
        const offsetMs = i * (90_000 + Math.floor(Math.random() * 120_000)); // stagger 1.5-3.5min apart
        const detected = new Date(now.getTime() - (alertCount - i) * 300_000 + offsetMs);
        const processed = new Date(detected.getTime() + 60_000 + Math.floor(Math.random() * 90_000));
        const credited = new Date(processed.getTime() + 30_000 + Math.floor(Math.random() * 60_000));

        alerts.push({
          id: i,
          seed: simulation.seed,
          trigger: simulation.trigger,
          risk: simulation.risk,
          imdAlert: simulation.imdAlert,
          claimResult: simulation.claimResult,
          timeline: { detected, processed, credited },
        });
      }

      setGeneratedAlerts(alerts);
      // Set the first alert as the "active" one for backward compat
      const first = alerts[0];
      setGeneratedSeed(first.seed);
      setClaimResult(first.claimResult);
      setTrigger(first.trigger);
      setRisk(first.risk);
      setImdAlert(first.imdAlert);
      setExpandedAlert(0);
      setClaiming(false);
    } catch (err: any) {
      setError(err?.message ?? "Could not generate situations");
    } finally {
      setGenerating(false);
    }
  };

  const handleManualClaim = async () => {
    if (!userId) return;
    setClaiming(true);
    try {
      const gps = getClaimGps(zoneId, city);
      const claim = await evaluateClaimEngine({
        worker_id: userId,
        zone_id: zoneId,
        city,
        gps_lat: gps.lat,
        gps_lon: gps.lon,
        hours_lost: 2,
        app_active: true,
      });
      setClaimResult(claim);
      // Auto-process instant payout
      if (
        (claim.claim_status === "auto-approve" || claim.claim_status === "approve-with-flag") &&
        claim.payout_amount > 0
      ) {
        try {
          const gateway = GATEWAYS[Math.floor(Math.random() * GATEWAYS.length)];
          const txn = await processPayout({
            worker_id: userId,
            claim_id: `CLM-${Date.now()}`,
            amount: claim.payout_amount,
            gateway,
            upi_id: "worker@upi",
          });
          setPayoutTxn(txn);
        } catch { /* payout processing failed silently */ }
      }
    } catch {
      /* ignore */
    } finally {
      setClaiming(false);
    }
  };

  const handleDesktopClaimResult = (res: ClaimEvaluateResult, txn: PayoutTransaction | null) => {
    // Push result from desktop panels (TriggerLab / FraudDemo) to the phone screen
    setClaimResult(res);
    setPayoutTxn(txn ?? null);
    setClaiming(false);
    setAutoClaimed(true);
    setGeneratedAlerts([]);
    setGeneratedSeed(Date.now());

    // Derive trigger state from the claim result
    const fired = res.trigger_list?.find((t) => t.fired);
    if (fired) {
      setTrigger({ trigger: true, type: fired.name, severity: fired.severity_multiplier });
    } else {
      setTrigger({ trigger: true, type: res.demo_scenario_applied ?? "simulation", severity: 1 });
    }
  };

  const imdRed = imdAlert?.alert_level === "red";
  const isActive = imdRed || trigger?.trigger === true;
  const triggerType = imdRed
    ? `imd ${imdAlert?.event ?? "alert"}`
    : trigger?.type?.replace(/_/g, " ") ?? "Unknown";
  const firstFired = claimResult?.trigger_list?.find((item) => item.fired);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-start justify-center gap-6 p-0 md:p-6">
      {/* ─── Phone frame (left) ─── */}
      <div className="relative w-full max-w-md md:max-w-[390px] min-h-screen md:min-h-0 md:h-[844px] md:rounded-[3rem] md:border-[5px] md:border-neutral-800 md:shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.04)] md:overflow-hidden flex-shrink-0">
        {/* Dynamic Island */}
        <div className="hidden md:flex absolute top-[10px] left-1/2 -translate-x-1/2 w-[126px] h-[36px] bg-black rounded-[20px] z-50 items-center justify-center">
          <div className="w-[10px] h-[10px] rounded-full bg-neutral-900 border border-neutral-800" />
        </div>
        {/* Home indicator */}
        <div className="hidden md:block absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-neutral-700 rounded-full z-50" />
        {/* Content */}
        <div className="w-full min-h-screen md:min-h-0 md:h-full bg-background overflow-y-auto relative">
      <div className="md:flex-1 md:overflow-y-auto px-4 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
            </button>
            <h1 className="text-lg font-extrabold text-foreground tracking-tight">Alerts</h1>
          </div>
          <Button
            onClick={handleGenerateSituations}
            disabled={generating || claiming}
            className="h-10 rounded-full px-4 text-xs font-bold bg-foreground text-background hover:bg-foreground/90"
          >
            {generating ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Sparkles size={14} className="mr-2" />}
            Generate Situations
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : !isActive ? (
          <>
            {/* All clear — flat card */}
            <div className="card-premium rounded-2xl p-6 text-center mb-6">
              <CheckCircle2 size={32} className="text-accent-green mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="text-base font-extrabold text-foreground mb-1">All Clear</h3>
              <p className="text-sm text-muted-foreground">No active triggers for {zoneName}</p>
            </div>
          </>
        ) : (
          <>
            {/* Status banner — minimal */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <p className="text-sm font-semibold text-foreground">
                {generatedAlerts.length > 1
                  ? `${generatedAlerts.length} triggers active · income disruption detected`
                  : "Trigger active · income disruption detected"}
              </p>
            </div>

            {/* Multi-alert list OR single alert */}
            {generatedAlerts.length > 1 ? (
              <div className="space-y-3 mb-5">
                {generatedAlerts.map((alert) => {
                  const alertType = alert.trigger?.type?.replace(/_/g, " ") ?? "Unknown";
                  const sev = severityLabel(alert.trigger.severity);
                  const alertFired = alert.claimResult?.trigger_list?.find((t) => t.fired);
                  const isExpanded = expandedAlert === alert.id;
                  const fraudReasons = getFraudReasons(alert.claimResult);
                  const fraudPct = Math.round(alert.claimResult.fraud_score * 100);
                  const fraudLevel = fraudPct < 30 ? "Low" : fraudPct < 60 ? "Medium" : "High";
                  const fraudLevelColor = fraudPct < 30 ? "text-accent-green" : fraudPct < 60 ? "text-warning" : "text-destructive";
                  const fraudLevelBg = fraudPct < 30 ? "bg-accent-green/15" : fraudPct < 60 ? "bg-warning/15" : "bg-destructive/15";

                  return (
                    <div key={alert.id} className="card-premium rounded-2xl overflow-hidden">
                      {/* Collapsed header — always visible */}
                      <button
                        onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CloudRain size={18} className="text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground capitalize truncate">{alertType}</p>
                            <p className="text-[11px] text-muted-foreground">{zoneName} Zone</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-lg font-extrabold text-foreground">₹{alert.claimResult.payout_amount}</span>
                          {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          {/* Simulated event note */}
                          <div className="rounded-xl border border-border/40 bg-secondary/30 px-3 py-2">
                            <p className="text-[11px] text-muted-foreground">Simulated event based on current conditions</p>
                          </div>

                          {/* Stats */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Severity</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBg(alert.trigger.severity)} ${sev.color}`}>{sev.label}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Risk score</span>
                              <span className="text-xs font-bold text-foreground">{alert.risk.weather_risk_score}/100</span>
                            </div>
                          </div>

                          {/* HERO Payout */}
                          <div className="rounded-2xl bg-accent-green/[0.07] border border-accent-green/20 p-5 text-center">
                            <CheckCircle2 size={28} className="text-accent-green mx-auto mb-2" strokeWidth={1.5} />
                            <p className="text-3xl font-black text-foreground tracking-tight">₹{alert.claimResult.payout_amount}</p>
                            <p className="text-sm font-semibold text-accent-green mt-1">Credited instantly</p>
                            {alertFired?.payout?.formula && (
                              <p className="text-[11px] text-muted-foreground/60 mt-2">{alertFired.payout.formula}</p>
                            )}
                            <div className="flex items-center justify-center gap-1.5 mt-3">
                              <Zap size={12} className="text-accent-green" strokeWidth={1.5} />
                              <span className="text-[11px] font-bold text-accent-green">Zero-touch payout</span>
                            </div>
                          </div>

                          {/* Fraud Score — Actionable */}
                          <div className="card-premium rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Shield size={16} className={fraudLevelColor} strokeWidth={1.5} />
                                <span className="text-sm font-semibold text-foreground">Fraud Risk: {fraudLevel}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fraudLevelBg} ${fraudLevelColor}`}>{fraudPct}%</span>
                              </div>
                            </div>
                            {fraudReasons.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {fraudReasons.map((r, i) => (
                                  <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-muted-foreground/60 mt-px">•</span> {r}
                                  </p>
                                ))}
                              </div>
                            )}
                            {fraudReasons.length === 0 && (
                              <p className="text-[11px] text-muted-foreground mt-1">No suspicious signals detected</p>
                            )}
                          </div>

                          {/* Timeline */}
                          <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-3">Processing Timeline</p>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-warning" />
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-xs text-foreground font-medium">Trigger detected</span>
                                  <span className="text-xs text-muted-foreground font-mono">{formatTime(alert.timeline.detected)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-xs text-foreground font-medium">Claim processed</span>
                                  <span className="text-xs text-muted-foreground font-mono">{formatTime(alert.timeline.processed)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-accent-green" />
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-xs text-foreground font-medium">Amount credited</span>
                                  <span className="text-xs text-muted-foreground font-mono">{formatTime(alert.timeline.credited)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Single alert — original flow with improvements */}
                <div className="card-premium rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground capitalize">{triggerType}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{zoneName} Zone</p>
                    </div>
                    <CloudRain size={24} className="text-muted-foreground/40" strokeWidth={1.5} />
                  </div>

                  {generatedSeed !== null && (
                    <div className="mb-4 rounded-xl border border-border/40 bg-secondary/30 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Simulated event based on current conditions</p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Severity</span>
                      {(() => { const sev = severityLabel(trigger?.severity ?? 0); return (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBg(trigger?.severity ?? 0)} ${sev.color}`}>{sev.label}</span>
                      ); })()}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Risk score</span>
                      <span className="text-xs font-bold text-foreground">{risk?.weather_risk_score ?? "--"}/100</span>
                    </div>
                  </div>
                </div>

                {/* HERO Payout */}
                {claiming ? (
                  <div className="card-premium rounded-2xl p-5 mb-5 text-center">
                    <Loader2 size={18} className="animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Processing claim...</p>
                  </div>
                ) : claimResult ? (
                  <div className="rounded-2xl bg-accent-green/[0.07] border border-accent-green/20 p-6 mb-5 text-center">
                    {claimResult.claim_status === "auto-approve" || claimResult.claim_status === "approve-with-flag" ? (
                      <>
                        <CheckCircle2 size={32} className="text-accent-green mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-3xl font-black text-foreground tracking-tight mb-1">₹{claimResult.payout_amount}</p>
                        <p className="text-sm font-semibold text-accent-green mb-2">Credited instantly</p>
                        {firstFired?.payout?.formula && (
                          <p className="text-[11px] text-muted-foreground/60">{firstFired.payout.formula}</p>
                        )}
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                          <Zap size={12} className="text-accent-green" strokeWidth={1.5} />
                          <span className="text-[11px] font-bold text-accent-green">Zero-touch payout</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Shield size={28} className="text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-sm font-bold text-foreground mb-1">
                          {claimResult.claim_status === "hold-for-review" ? "Under Review" : "Processed"}
                        </p>
                        <p className="text-xs text-muted-foreground">{claimResult.explanation}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="card-premium rounded-2xl p-4 mb-5 text-center">
                    <p className="text-xs font-medium text-muted-foreground">Payout will be credited automatically</p>
                  </div>
                )}

                {/* Instant Payout Gateway Receipt */}
                {payoutTxn && (
                  <div className="rounded-2xl border border-accent-green/20 bg-card p-4 mb-5 space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard size={14} className="text-accent-green" strokeWidth={1.5} />
                      <p className="text-xs font-bold text-foreground uppercase tracking-wider">Payment Gateway</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Gateway</span>
                      <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                        {payoutTxn.gateway === "razorpay" ? (
                          <><CreditCard size={10} className="text-blue-400" /> Razorpay</>
                        ) : payoutTxn.gateway === "upi_direct" ? (
                          <><Banknote size={10} className="text-green-400" /> UPI Direct</>
                        ) : (
                          <><CreditCard size={10} className="text-purple-400" /> Stripe</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Txn ID</span>
                      <span className="text-[10px] font-mono text-foreground/70">{payoutTxn.txn_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Status</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${payoutTxn.status === "completed" ? "bg-accent-green/15 text-accent-green" : "bg-warning/15 text-warning"}`}>
                        {payoutTxn.status.toUpperCase()}
                      </span>
                    </div>
                    {payoutTxn.processing_time_ms != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Speed</span>
                        <span className="text-[10px] font-mono text-accent-green">{payoutTxn.processing_time_ms}ms</span>
                      </div>
                    )}
                    {payoutTxn.upi_ref && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">UPI Ref</span>
                        <span className="text-[10px] font-mono text-foreground/70">{payoutTxn.upi_ref}</span>
                      </div>
                    )}
                  </div>
                )}

                {!claimResult && !claiming && userId && (
                  <Button
                    onClick={handleManualClaim}
                    className="w-full h-14 text-base font-bold rounded-2xl bg-foreground border-0 text-background hover:bg-foreground/90 mb-5"
                  >
                    Claim Now
                  </Button>
                )}

                {/* Fraud Score — Actionable */}
                {claimResult && claimResult.fraud_score > 0 && (() => {
                  const fraudPct = Math.round(claimResult.fraud_score * 100);
                  const fraudLevel = fraudPct < 30 ? "Low" : fraudPct < 60 ? "Medium" : "High";
                  const fraudLevelColor = fraudPct < 30 ? "text-accent-green" : fraudPct < 60 ? "text-warning" : "text-destructive";
                  const fraudLevelBg = fraudPct < 30 ? "bg-accent-green/15" : fraudPct < 60 ? "bg-warning/15" : "bg-destructive/15";
                  const fraudReasons = getFraudReasons(claimResult);
                  return (
                    <div className="card-premium rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className={fraudLevelColor} strokeWidth={1.5} />
                          <span className="text-sm font-semibold text-foreground">Fraud Risk: {fraudLevel}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fraudLevelBg} ${fraudLevelColor}`}>{fraudPct}%</span>
                        </div>
                      </div>
                      {fraudReasons.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {fraudReasons.map((r, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                              <span className="text-muted-foreground/60 mt-px">•</span> {r}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-1">No suspicious signals detected</p>
                      )}
                    </div>
                  );
                })()}

                {/* Fraud Analysis (legacy server-side) */}
                {fraudData && (
                  <div className="mb-4">
                    <FraudBreakdown assessment={fraudData} compact={!showFraudDetails} />
                    <button
                      onClick={() => setShowFraudDetails((v) => !v)}
                      className="w-full mt-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showFraudDetails ? "Hide details" : "Show fraud analysis →"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Total payout summary for multi-alerts */}
            {generatedAlerts.length > 1 && (
              <div className="rounded-2xl bg-accent-green/[0.07] border border-accent-green/20 p-5 mb-5 text-center">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Total Payout</p>
                <p className="text-4xl font-black text-foreground tracking-tight">
                  ₹{generatedAlerts.reduce((sum, a) => sum + (a.claimResult.payout_amount ?? 0), 0)}
                </p>
                <p className="text-sm font-semibold text-accent-green mt-1">Credited instantly</p>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Zap size={12} className="text-accent-green" strokeWidth={1.5} />
                  <span className="text-[11px] font-bold text-accent-green">Zero-touch · {generatedAlerts.length} events auto-processed</span>
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate("/payouts")}
              variant="outline"
              className="w-full h-12 text-sm font-semibold rounded-2xl border-border/40"
            >
              View Payout History
            </Button>
          </>
        )}
      </div>
      <BottomNav active="Alerts" />
        </div>
      </div>

      {/* ─── Claim Tester (outside the phone, right side on desktop) ─── */}
      {userId && (
        <div className="hidden md:block w-[420px] max-h-[844px] overflow-y-auto flex-shrink-0 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5">
          <Tabs defaultValue="trigger-lab" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-neutral-800/70">
              <TabsTrigger value="trigger-lab">Trigger Lab</TabsTrigger>
              <TabsTrigger value="spoof-sim">Fraud Spoof</TabsTrigger>
            </TabsList>
            <TabsContent value="trigger-lab" className="mt-4">
              <TriggerLab />
            </TabsContent>
            <TabsContent value="spoof-sim" className="mt-4">
              <FraudDemo workerId={userId} zoneId={zoneId} city={city} onClaimResult={handleDesktopClaimResult} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default TriggerAlert;
