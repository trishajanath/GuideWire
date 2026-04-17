import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CloudRain,
  Gauge,
  Loader2,
  PauseCircle,
  PlayCircle,
  ServerCrash,
  Thermometer,
  TrendingDown,
  TriangleAlert,
  Wallet,
  Zap,
} from "lucide-react";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import {
  assessFraud,
  calculatePremium,
  getCityWeather,
  getCityZoneSafety,
  getPolicy,
  getPremiumModelInfo,
  getPremiumZones,
  getUserClaims,
  pausePolicy,
  resumePolicyApi,
  selectPlan,
  upgradePolicyApi,
  type ClaimRecord,
  type PremiumAdjustment,
  type PremiumCalculationResult,
  type PremiumModelInfo,
  type PremiumZoneInfo,
} from "@/lib/api";
import {
  ensurePolicyForCurrentUser,
  pausePolicyForWeek,
  resumePolicy,
  saveLocalPolicy,
  upgradePolicyTier,
  type PolicyTier,
  type WorkerPolicy,
} from "@/lib/policy";
import { formatIndianPhone, getCurrentUser, updateCurrentUser } from "@/lib/session";

type TabKey = "policy" | "payouts" | "profile";

const tierFeatures: Record<
  PolicyTier,
  {
    weeklyPremium: number;
    dailyCap: number;
    weeklyCap: number;
    triggers: Array<"weather" | "zone_shutdown" | "demand_collapse" | "heat_alerts" | "platform_outages">;
    featureList: string[];
  }
> = {
  Basic: {
    weeklyPremium: 49,
    dailyCap: 500,
    weeklyCap: 1200,
    triggers: ["weather", "heat_alerts"],
    featureList: ["Weather payout", "Heat disruption", "Daily cap ₹500"],
  },
  Standard: {
    weeklyPremium: 69,
    dailyCap: 800,
    weeklyCap: 2200,
    triggers: ["weather", "zone_shutdown", "heat_alerts", "demand_collapse"],
    featureList: ["Weather payout", "Zone shutdown", "Demand collapse", "Daily cap ₹800"],
  },
  Premium: {
    weeklyPremium: 99,
    dailyCap: 1200,
    weeklyCap: 3500,
    triggers: ["weather", "zone_shutdown", "demand_collapse", "heat_alerts", "platform_outages"],
    featureList: ["All trigger classes", "Priority auto-claim", "Platform outage protection", "Daily cap ₹1200"],
  },
};

const triggerCatalog: Array<{
  key: "weather" | "zone_shutdown" | "demand_collapse" | "heat_alerts" | "platform_outages";
  label: string;
}> = [
  { key: "weather", label: "Weather" },
  { key: "zone_shutdown", label: "Zone Shutdown" },
  { key: "demand_collapse", label: "Demand Collapse" },
  { key: "heat_alerts", label: "Heat Alerts" },
  { key: "platform_outages", label: "Platform Outages" },
];

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const PremiumBreakdown = ({
  base,
  adjustments,
  finalAmount,
}: {
  base: number;
  adjustments: PremiumAdjustment[];
  finalAmount: number;
}) => {
  return (
    <div className="rounded-xl bg-secondary/40 p-4 mt-4">
      <p className="text-xs font-semibold text-foreground mb-2">Dynamic Premium Breakdown</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Base premium</span>
          <span className="font-semibold text-foreground">₹{base}</span>
        </div>
        {adjustments.map((item) => {
          const positive = item.direction === "up";
          const color = positive ? "text-warning" : "text-accent-green";
          return (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={`font-semibold ${color}`}>
                {positive ? "+" : "-"}₹{item.amount}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-px bg-border/50 my-2.5" />
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">Final weekly premium</span>
        <span className="font-extrabold text-foreground">₹{finalAmount}</span>
      </div>
    </div>
  );
};

const Policy = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const workerId = user?.backendUserId ?? null;
  const city = user?.city ?? "Bengaluru";
  const zoneArea = user?.zoneArea ?? city;
  const userZoneId = user?.zoneId ?? "";

  const [activeTab, setActiveTab] = useState<TabKey>("policy");
  const [policy, setPolicy] = useState<WorkerPolicy | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [zoneRiskScore, setZoneRiskScore] = useState<number>(0);
  const [premiumResult, setPremiumResult] = useState<PremiumCalculationResult | null>(null);
  const [premiumModelInfo, setPremiumModelInfo] = useState<PremiumModelInfo | null>(null);
  const [premiumZones, setPremiumZones] = useState<PremiumZoneInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeChoice, setUpgradeChoice] = useState<PolicyTier | null>(null);

  useEffect(() => {
    if (!workerId) {
      navigate("/login");
      return;
    }

    let active = true;

    const bootstrap = async () => {
      const base = ensurePolicyForCurrentUser();
      if (active) setPolicy(base);
      const tasks = [
        getPolicy(workerId)
          .then((remote) => {
            if (!active) return;
            const mapped: WorkerPolicy = remote;
            saveLocalPolicy(mapped);
            setPolicy(mapped);
          })
          .catch(() => null),
        getUserClaims(workerId)
          .then((res) => {
            if (!active) return;
            setClaims(res.claims ?? []);
          })
          .catch(() => null),
        assessFraud(workerId, userZoneId)
          .then((fraud) => {
            if (!active) return;
            const next = Math.max(0, Math.min(100, 100 - Math.round(fraud.overall_score)));
            setTrustScore(next);
          })
          .catch(() => {
            if (!active) return;
            setTrustScore(78);
          }),
        getCityZoneSafety(city, [zoneArea])
          .then((res) => {
            if (!active) return;
            const score = res.zones[0]?.weather_risk_score;
            if (typeof score === "number") setZoneRiskScore(score);
          })
          .catch(async () => {
            try {
              const w = await getCityWeather(city);
              if (!active) return;
              setZoneRiskScore(w.weather_risk_score);
            } catch {
              if (!active) return;
              setZoneRiskScore(25);
            }
          }),
        getPremiumModelInfo()
          .then((info) => {
            if (!active) return;
            setPremiumModelInfo(info);
          })
          .catch(() => null),
        getPremiumZones()
          .then((res) => {
            if (!active) return;
            setPremiumZones(res.zones ?? []);
          })
          .catch(() => null),
      ];

      await Promise.allSettled(tasks);
      if (active) setLoading(false);
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [navigate, workerId, city, zoneArea, userZoneId]);

  useEffect(() => {
    if (!policy) return;

    let active = true;
    const computePremium = async () => {
      const policyStart = policy.start_date ? new Date(policy.start_date) : new Date();
      const baseWeeklyPremium = tierFeatures[policy.tier].weeklyPremium;
      const paidClaimsTotal = claims.reduce(
        (sum, claim) => sum + (["paid", "approved", "auto-approve"].includes(claim.status.toLowerCase()) ? (claim.payout_amount ?? 0) : 0),
        0,
      );
      const weeksOnPolicy = Math.max(1, Math.floor((Date.now() - policyStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
      const premiumPaid = Math.max(1, baseWeeklyPremium * weeksOnPolicy);
      const avgDailyHours = policy.tier === "Basic" ? 5.5 : policy.tier === "Standard" ? 7.0 : 8.5;

      try {
        const quote = await calculatePremium({
          zone: zoneArea,
          plan: policy.tier,
          month: new Date().getMonth() + 1,
          tenure_months: Math.max(0, (Date.now() - policyStart.getTime()) / (30 * 24 * 60 * 60 * 1000)),
          claims_paid: paidClaimsTotal,
          premium_paid: premiumPaid,
          avg_daily_hours: avgDailyHours,
        });

        if (active) setPremiumResult(quote);
      } catch {
        if (active) setPremiumResult(null);
      }
    };

    computePremium();
    return () => {
      active = false;
    };
  }, [policy, claims, zoneArea]);

  const policyTier = (policy?.tier ?? "Standard") as PolicyTier;
  const tierDetails = tierFeatures[policyTier];
  const planActionLabel = policyTier === "Premium" ? "Change Plan" : "Upgrade Plan";
  const planModalTitle = policyTier === "Premium" ? "Change Policy" : "Upgrade Policy";
  const planConfirmLabel = policyTier === "Premium" ? "Confirm Change" : "Confirm Upgrade";
  const planOptions = useMemo(
    () => (policyTier === "Premium" ? (["Basic", "Standard"] as PolicyTier[]) : (["Basic", "Standard", "Premium"] as PolicyTier[])),
    [policyTier],
  );

  const weeksSinceStart = useMemo(() => {
    if (!policy?.start_date) return 1;
    const start = new Date(policy.start_date).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - start);
    return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
  }, [policy?.start_date]);

  const premiumBreakdown = useMemo(() => {
    if (premiumResult) {
      return {
        base: premiumResult.base,
        adjustments: premiumResult.itemised_adjustments,
        finalAmount: premiumResult.final_premium,
      };
    }

    const zoneAmount = Math.abs(Math.round((zoneRiskScore - 35) / 7));
    const seasonalAmount = 3;
    const loyaltyAmount = weeksSinceStart >= 6 ? 5 : 0;

    return {
      base: tierDetails.weeklyPremium,
      adjustments: [
        { label: "Zone flood risk adjustment", amount: zoneAmount, direction: zoneRiskScore >= 35 ? "up" : "down" },
        { label: "Seasonal adjustment", amount: seasonalAmount, direction: "down" },
        { label: "Loyalty discount", amount: loyaltyAmount, direction: "down" },
      ] as PremiumAdjustment[],
      finalAmount: Math.max(0, tierDetails.weeklyPremium + (zoneRiskScore >= 35 ? zoneAmount : -zoneAmount) - seasonalAmount - loyaltyAmount),
    };
  }, [premiumResult, tierDetails.weeklyPremium, zoneRiskScore, weeksSinceStart]);

  const payoutsStats = useMemo(() => {
    const isPaid = (s: string) => { const l = s.toLowerCase(); return l === "paid" || l === "approved" || l === "auto-approve"; };
    const totalPaid = claims
      .filter((c) => isPaid(c.status))
      .reduce((sum, c) => sum + (c.payout_amount ?? 0), 0);
    const autoClaims = claims.length;
    const totalPremiumPaid = weeksSinceStart * premiumBreakdown.finalAmount;
    const returnRatio = totalPremiumPaid > 0 ? Math.round((totalPaid / totalPremiumPaid) * 100) : 0;
    return { totalPaid, autoClaims, returnRatio };
  }, [claims, premiumBreakdown.finalAmount, weeksSinceStart]);

  const trustTier = useMemo(() => {
    const score = trustScore ?? 0;
    if (score >= 85) return "Gold";
    if (score >= 70) return "Silver";
    if (score >= 50) return "Standard";
    return "Review";
  }, [trustScore]);

  const coefficientRows = useMemo(() => {
    const entries = Object.entries(premiumModelInfo?.coefficients ?? {});
    return entries
      .map(([feature, value]) => ({ feature, value }))
      .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
  }, [premiumModelInfo]);

  const doPause = async () => {
    if (!policy || !workerId || policy.status === "paused") return;
    setIsBusy(true);
    setError(null);
    try {
      const remote = await pausePolicy(workerId);
      const mapped: WorkerPolicy = remote;
      saveLocalPolicy(mapped);
      setPolicy(mapped);
    } catch {
      const fallback = pausePolicyForWeek(workerId);
      if (!fallback) setError("Could not pause policy right now.");
      setPolicy(fallback);
    } finally {
      setIsBusy(false);
    }
  };

  const doResume = async () => {
    if (!policy || !workerId || policy.status !== "paused") return;
    setIsBusy(true);
    setError(null);
    try {
      const remote = await resumePolicyApi(workerId);
      const mapped: WorkerPolicy = remote;
      saveLocalPolicy(mapped);
      setPolicy(mapped);
    } catch {
      const fallback = resumePolicy(workerId);
      if (!fallback) setError("Could not resume policy right now.");
      setPolicy(fallback);
    } finally {
      setIsBusy(false);
    }
  };

  const confirmUpgrade = async () => {
    if (!policy || !workerId || !upgradeChoice || policy.tier === upgradeChoice) return;

    setIsBusy(true);
    setError(null);
    const selectedPlan = `${upgradeChoice} Shield`;

    try {
      await selectPlan(workerId, selectedPlan);
      updateCurrentUser({ selectedPlan });
    } catch {
      // Continue with local flow if backend plan sync fails.
    }

    try {
      const remote = await upgradePolicyApi(workerId, upgradeChoice);
      const mapped: WorkerPolicy = remote;
      saveLocalPolicy(mapped);
      setPolicy(mapped);
    } catch {
      const fallback = upgradePolicyTier(workerId, upgradeChoice);
      if (!fallback) setError("Could not upgrade policy right now.");
      setPolicy(fallback);
    } finally {
      setUpgradeOpen(false);
      setUpgradeChoice(null);
      setIsBusy(false);
    }
  };

  const triggerIcon = (triggerType: string | null) => {
    const value = (triggerType ?? "none").toLowerCase();
    if (value.includes("rain") || value.includes("weather")) return CloudRain;
    if (value.includes("heat")) return Thermometer;
    if (value.includes("zone") || value.includes("flood")) return TriangleAlert;
    if (value.includes("order") || value.includes("demand")) return TrendingDown;
    if (value.includes("platform")) return ServerCrash;
    return Zap;
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="md:flex-1 md:overflow-y-auto px-4 pt-10 pb-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
        <BottomNav active="Profile" />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="md:flex-1 md:overflow-y-auto px-4 pt-10 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Policy Management</h1>
        </div>

        <div className="grid grid-cols-3 rounded-xl bg-secondary/50 p-1 mb-5">
          {([
            ["policy", "My Policy"],
            ["payouts", "Payouts"],
            ["profile", "Profile"],
          ] as Array<[TabKey, string]>).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                activeTab === key ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-destructive mb-3">{error}</p>}

        {activeTab === "policy" && policy && (
          <>
            <div className="card-premium rounded-2xl p-5 mb-5 shadow-elevated">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] px-2 py-1 rounded-full bg-secondary text-foreground font-semibold">
                  {policy.tier} Tier
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${policy.status === "active" ? "bg-accent-green/20 text-accent-green" : "bg-warning/20 text-warning"}`}>
                  {policy.status === "active" ? "Active" : "Paused"}
                </span>
              </div>

              <p className="text-2xl font-extrabold text-foreground">₹{premiumBreakdown.finalAmount}</p>
              <p className="text-xs text-muted-foreground mt-1">Weekly premium (dynamic)</p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] text-muted-foreground">Daily cap</p>
                  <p className="text-sm font-bold text-foreground mt-1">₹{tierDetails.dailyCap}</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-[11px] text-muted-foreground">Weekly cap</p>
                  <p className="text-sm font-bold text-foreground mt-1">₹{tierDetails.weeklyCap}</p>
                </div>
              </div>

              <PremiumBreakdown
                base={premiumBreakdown.base}
                adjustments={premiumBreakdown.adjustments}
                finalAmount={premiumBreakdown.finalAmount}
              />

              <div className="mt-4 rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Zone risk score</span>
                  <span className="font-semibold text-foreground">{zoneRiskScore}/100</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${zoneRiskScore > 60 ? "bg-destructive" : zoneRiskScore > 30 ? "bg-warning" : "bg-accent-green"}`}
                    style={{ width: `${Math.max(2, zoneRiskScore)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 p-4 mb-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm font-bold text-foreground">Pause / Resume Coverage</p>
                <button
                  onClick={policy.status === "active" ? doPause : doResume}
                  disabled={isBusy}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${policy.status === "active" ? "bg-secondary text-foreground" : "bg-accent-green/20 text-accent-green"} disabled:opacity-60`}
                >
                  {policy.status === "active" ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                  {policy.status === "active" ? "Pause" : "Resume"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                No penalty applied. Pausing skips this week&apos;s premium deduction.
              </p>
              {policy.status === "paused" && policy.paused_until && (
                <p className="text-xs text-warning mt-2">Paused until {formatDate(policy.paused_until)}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 p-4 mb-5">
              <p className="text-sm font-bold text-foreground mb-3">Covered Triggers</p>
              <div className="grid grid-cols-2 gap-2">
                {triggerCatalog.map((item) => {
                  const enabled = tierDetails.triggers.includes(item.key);
                  return (
                    <div
                      key={item.key}
                      className={`rounded-xl px-3 py-2.5 text-xs font-medium ${
                        enabled ? "bg-secondary text-foreground" : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setUpgradeOpen(true)}
              className="w-full rounded-xl px-4 py-3 bg-secondary text-foreground text-sm font-semibold"
            >
              {planActionLabel}
            </button>
          </>
        )}

        {activeTab === "payouts" && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Total paid</p>
                <p className="text-sm font-extrabold text-accent-green mt-1">₹{payoutsStats.totalPaid}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Auto-claims</p>
                <p className="text-sm font-extrabold text-foreground mt-1">{payoutsStats.autoClaims}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Return ratio</p>
                <p className="text-sm font-extrabold text-foreground mt-1">{payoutsStats.returnRatio}%</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 p-4">
              <p className="text-sm font-bold text-foreground mb-3">Payout History</p>
              <div className="space-y-2.5">
                {claims.length === 0 && (
                  <p className="text-xs text-muted-foreground">No claims yet.</p>
                )}
                {claims.map((claim) => {
                  const Icon = triggerIcon(claim.trigger_type);
                  const adjustedHours = claim.adjusted_hours ?? claim.hours_lost;
                  const formula = `${adjustedHours}h x ₹${claim.hourly_rate} x ${claim.multiplier} = ₹${Math.round(
                    adjustedHours * claim.hourly_rate * claim.multiplier,
                  )}`;
                  const paid = ["paid", "approved", "auto-approve"].includes(claim.status.toLowerCase());
                  return (
                    <div key={claim.id} className="rounded-xl bg-secondary/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon size={15} className="text-muted-foreground flex-shrink-0" />
                          <p className="text-sm font-semibold text-foreground truncate capitalize">
                            {(claim.trigger_type ?? "system trigger").replace(/_/g, " ")}
                          </p>
                        </div>
                        <span className={`text-[11px] px-2 py-1 rounded-full ${paid ? "bg-accent-green/20 text-accent-green" : "bg-warning/20 text-warning"}`}>
                          {paid ? "Paid" : "Pending"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDate(claim.timestamp)}</p>
                      {Math.abs((claim.coverage_hour_adjustment ?? 0)) > 0.01 && (
                        <p className="text-[11px] text-warning mt-1">
                          Coverage hours auto-adjusted: {claim.hours_lost}h {"->"} {adjustedHours}h ({(claim.coverage_hour_adjustment ?? 0) > 0 ? "+" : ""}
                          {claim.coverage_hour_adjustment}h)
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">{formula}</p>
                      <p className="text-sm font-bold text-foreground mt-1">₹{claim.payout_amount}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === "profile" && (
          <>
            <div className="rounded-2xl border border-border/60 p-4 mb-5">
              <p className="text-sm font-bold text-foreground mb-3">Worker Details</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-semibold text-foreground">{user?.name ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-semibold text-foreground">{formatIndianPhone(user?.phone ?? "")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-semibold text-foreground">{user?.platform ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">City / Zone</span>
                  <span className="font-semibold text-foreground">{city} / {zoneArea}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Policy start</span>
                  <span className="font-semibold text-foreground">{formatDate(policy?.start_date)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-foreground">Trust Score</p>
                <span className="text-xs font-semibold text-foreground">{trustTier}</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Score</span>
                <span className="font-semibold text-foreground">{trustScore ?? 0}/100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${(trustScore ?? 0) >= 85 ? "bg-accent-green" : (trustScore ?? 0) >= 70 ? "bg-emerald-400" : (trustScore ?? 0) >= 50 ? "bg-warning" : "bg-destructive"}`}
                  style={{ width: `${Math.max(3, trustScore ?? 0)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Updated from fraud engine behavioral checks and payout consistency.</p>
            </div>
          </>
        )}
      </div>

      {upgradeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full max-w-md mx-auto rounded-t-2xl bg-background border border-border/60 p-4 pb-6">
            <div className="w-12 h-1 rounded-full bg-muted mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">{planModalTitle}</h3>
              <button onClick={() => setUpgradeOpen(false)} className="text-xs text-muted-foreground">Close</button>
            </div>

            <div className="space-y-2 mb-4">
              {planOptions.map((tier) => {
                const isCurrent = policy?.tier === tier;
                const isSelected = upgradeChoice === tier;
                return (
                  <button
                    key={tier}
                    disabled={isCurrent}
                    onClick={() => setUpgradeChoice(tier)}
                    className={`w-full rounded-xl p-3 text-left border transition-colors ${
                      isCurrent
                        ? "border-border/50 bg-muted/40 text-muted-foreground"
                        : isSelected
                          ? "border-foreground/40 bg-secondary"
                          : "border-border/60 bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{tier} Shield</span>
                      <span className="text-xs">₹{tierFeatures[tier].weeklyPremium}/wk</span>
                    </div>
                    <div className="space-y-1">
                      {tierFeatures[tier].featureList.map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 size={12} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    {isCurrent && <p className="text-[11px] mt-1">Current plan</p>}
                  </button>
                );
              })}
            </div>

            <button
              onClick={confirmUpgrade}
              disabled={!upgradeChoice || isBusy || upgradeChoice === policy?.tier}
              className="w-full rounded-xl py-3 bg-foreground text-background text-sm font-semibold disabled:opacity-50"
            >
              {isBusy ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Confirming...</span>
              ) : (
                <span className="inline-flex items-center gap-2"><Wallet size={14} /> {planConfirmLabel}</span>
              )}
            </button>
          </div>
        </div>
      )}

      <BottomNav active="Profile" />
    </MobileShell>
  );
};

export default Policy;
