import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  AlertTriangle,
  Smartphone,
  Clock,
  Copy,
  Crosshair,
  Zap,
  Wifi,
  CreditCard,
  Banknote,
  ChevronDown,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  Play,
  Sparkles,
  Info,
} from "lucide-react";
import FraudBreakdown from "@/components/FraudBreakdown";
import {
  evaluateClaimEngine,
  processPayout,
  ZONES,
  type ClaimEvaluateResult,
  type FraudAssessment,
  type PayoutTransaction,
} from "@/lib/api";

/* ── Scenario definitions ──────────────────────────────────────────── */

interface Scenario {
  id: string;
  icon: typeof Shield;
  label: string;
  what: string;
  why: string;
  activeTag: string;
  inactiveTag: string;
  color: string; // tailwind color token for the active accent
}

const SCENARIOS: Scenario[] = [
  {
    id: "gps_spoof",
    icon: MapPin,
    label: "Fake Location",
    what: "GPS sent from a different city, 500 km away",
    why: "Tests whether the system catches a mismatched GPS vs registered zone",
    activeTag: "Spoofed GPS",
    inactiveTag: "Real GPS",
    color: "rose",
  },
  {
    id: "app_inactive",
    icon: Smartphone,
    label: "App Was Closed",
    what: "No app session during the disruption event",
    why: "Workers must have the app open — no session = suspicious claim",
    activeTag: "App off",
    inactiveTag: "App active",
    color: "amber",
  },
  {
    id: "no_disruption",
    icon: Crosshair,
    label: "No Weather Event",
    what: "No rain/storm happening — false disruption report",
    why: "Parametric insurance requires a real, measurable weather trigger",
    activeTag: "Clear skies",
    inactiveTag: "Heavy rain",
    color: "sky",
  },
  {
    id: "duplicate",
    icon: Copy,
    label: "Duplicate Claim",
    what: "Same claim submitted twice in a single day",
    why: "Catches repeat-submission abuse on the same trigger event",
    activeTag: "2nd claim",
    inactiveTag: "First today",
    color: "violet",
  },
  {
    id: "vpn",
    icon: Wifi,
    label: "VPN / Proxy",
    what: "Traffic routed through a datacenter instead of mobile ISP",
    why: "Residential IP expected — VPN signals location masking",
    activeTag: "VPN on",
    inactiveTag: "Residential IP",
    color: "orange",
  },
];

/* ── GPS presets ────────────────────────────────────────────────────── */

const GPS_PRESETS: Record<string, { lat: number; lon: number; label: string }> = {
  coimbatore_gandhipuram: { lat: 11.0168, lon: 76.9558, label: "Gandhipuram, Coimbatore" },
  coimbatore_rs_puram: { lat: 11.012, lon: 76.949, label: "RS Puram, Coimbatore" },
  coimbatore_peelamedu: { lat: 11.025, lon: 77.002, label: "Peelamedu, Coimbatore" },
  coimbatore_saibaba_colony: { lat: 11.021, lon: 76.965, label: "Saibaba Colony, Coimbatore" },
  coimbatore_race_course: { lat: 11.0008, lon: 76.962, label: "Race Course, Coimbatore" },
  koramangala_blr: { lat: 12.9352, lon: 77.6245, label: "Koramangala, Bengaluru" },
  indiranagar_blr: { lat: 12.9784, lon: 77.6408, label: "Indiranagar, Bengaluru" },
  whitefield_blr: { lat: 12.9698, lon: 77.75, label: "Whitefield, Bengaluru" },
  hsr_layout_blr: { lat: 12.9116, lon: 77.6472, label: "HSR Layout, Bengaluru" },
  electronic_city_blr: { lat: 12.8456, lon: 77.6603, label: "Electronic City, Bengaluru" },
};

const SPOOF_LOCATIONS: Record<string, { lat: number; lon: number; label: string }> = {
  bengaluru: { lat: 12.9352, lon: 77.6245, label: "Bengaluru (500 km away)" },
  mumbai: { lat: 19.076, lon: 72.8777, label: "Mumbai (1300 km away)" },
  delhi: { lat: 28.6139, lon: 77.209, label: "Delhi (2200 km away)" },
};

/* ── Build FraudAssessment from trigger-level fraud breakdown ───────── */

function buildFraudAssessment(result: ClaimEvaluateResult): FraudAssessment | null {
  const fired = result.trigger_list.find((t) => t.fired && t.fraud);
  if (!fired?.fraud) return null;
  const bd = fired.fraud.breakdown;

  // Use the claim-level status (not the trigger-level fraud decision) for consistency
  const claimStatus = result.claim_status;

  return {
    overall_score: fired.fraud.score,
    risk_level: fired.fraud.score < 0.3 ? "LOW" : fired.fraud.score <= 0.7 ? "MEDIUM" : "HIGH",
    allow_payout:
      claimStatus === "auto-approve" || claimStatus === "approve-with-flag",
    signals: bd.map((item) => ({
      layer: item.label.toLowerCase().replace(/ /g, "_"),
      score: item.value,
      confidence: item.weight,
      reason: `${item.label}: ${item.value < 0.3 ? "✓ Clear" : `⚠ Flagged ${(item.value * 100).toFixed(0)}%`}`,
      details: { weight: item.weight, contribution: item.contribution },
    })),
    explanation:
      claimStatus === "auto-approve"
        ? "All checks passed — claim auto-approved."
        : claimStatus === "approve-with-flag"
          ? "Minor flags detected — approved with review flag."
          : claimStatus === "auto-reject"
            ? "Multiple fraud signals confirmed — claim auto-rejected."
            : claimStatus === "hold-for-review"
              ? "Fraud signals detected — claim held for manual review."
              : "No parametric trigger fired.",
    ml_ensemble: fired.fraud.ml_ensemble,
    worker_risk_profile: fired.fraud.worker_risk_profile,
  } as FraudAssessment;
}

/* ── Scenario toggle card ──────────────────────────────────────────── */

function ScenarioCard({
  scenario,
  active,
  onToggle,
  disabled,
}: {
  scenario: Scenario;
  active: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const Icon = scenario.icon;
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`group w-full text-left rounded-xl border transition-all duration-200 ${
        active
          ? "border-destructive/40 bg-destructive/[0.07] shadow-[0_0_12px_rgba(239,68,68,0.08)]"
          : "border-border/20 bg-secondary/40 hover:bg-secondary/60"
      } ${disabled ? "opacity-50 pointer-events-none" : "active:scale-[0.98]"}`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* icon */}
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          active ? "bg-destructive/15" : "bg-secondary"
        }`}>
          <Icon className={`w-4 h-4 ${active ? "text-destructive" : "text-muted-foreground"}`} strokeWidth={1.5} />
        </div>

        {/* text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground leading-tight">{scenario.label}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
              active ? "bg-destructive/15 text-destructive" : "bg-secondary text-muted-foreground/70"
            }`}>
              {active ? scenario.activeTag : scenario.inactiveTag}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-snug mt-0.5 line-clamp-1">
            {scenario.what}
          </p>
        </div>

        {/* toggle track */}
        <div className={`shrink-0 w-10 h-[22px] rounded-full flex items-center transition-colors duration-200 ${
          active ? "bg-destructive" : "bg-border/50"
        }`}>
          <div className={`w-[16px] h-[16px] rounded-full bg-foreground shadow-sm transition-transform duration-200 ${
            active ? "translate-x-[21px]" : "translate-x-[3px]"
          }`} />
        </div>
      </div>
    </button>
  );
}

/* ── Dropdown select helper ────────────────────────────────────────── */

function MiniSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-1.5 pr-7 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
      </div>
    </label>
  );
}

/* ── Main component ────────────────────────────────────────────────── */

interface FraudDemoProps {
  workerId: number;
  zoneId: string;
  city: string;
  onClaimResult?: (result: ClaimEvaluateResult, payoutTxn: PayoutTransaction | null) => void;
}

const TRIGGER_SCENARIOS_STORAGE_KEY = "guidewire.triggerlab.selectedScenarios";

const normalizeCityKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace("bangalore", "bengaluru");

const readStoredTriggerScenarios = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(TRIGGER_SCENARIOS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item !== "none");
  } catch {
    return [];
  }
};

export default function FraudDemo({ workerId, zoneId, city, onClaimResult }: FraudDemoProps) {
  // Editable claim fields
  const [selectedZone, setSelectedZone] = useState(zoneId);
  const [spoofTarget, setSpoofTarget] = useState("bengaluru");
  const [hoursLost, setHoursLost] = useState(0);

  const selectedZoneObj = ZONES.find((z) => z.id === selectedZone);
  const effectiveCity = selectedZoneObj?.city ?? city;
  const cityKey = normalizeCityKey(city);

  const cityZones = useMemo(() => {
    return ZONES.filter((zone) => normalizeCityKey(zone.city) === cityKey);
  }, [cityKey]);

  useEffect(() => {
    if (!selectedZone && cityZones.length > 0) {
      setSelectedZone(cityZones[0].id);
      setResult(null);
    }
  }, [cityZones, selectedZone]);

  // Scenario toggles
  const [activeScenarios, setActiveScenarios] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ClaimEvaluateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [linkedTriggerScenarios, setLinkedTriggerScenarios] = useState<string[]>([]);
  const [payoutTxn, setPayoutTxn] = useState<PayoutTransaction | null>(null);
  const [processingPayout, setProcessingPayout] = useState(false);

  const GATEWAYS = ["razorpay", "upi_direct", "stripe"] as const;

  useEffect(() => {
    const syncLinkedScenarios = () => {
      setLinkedTriggerScenarios(readStoredTriggerScenarios());
    };

    syncLinkedScenarios();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", syncLinkedScenarios);
      return () => window.removeEventListener("focus", syncLinkedScenarios);
    }
    return undefined;
  }, []);

  const toggleScenario = (id: string) => {
    setActiveScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setResult(null);
  };

  const selectAll = () => {
    setActiveScenarios(new Set(SCENARIOS.map((s) => s.id)));
    setResult(null);
  };
  const clearAll = () => {
    setActiveScenarios(new Set());
    setResult(null);
  };
  const allOn = SCENARIOS.every((s) => activeScenarios.has(s.id));

  // Derived claim parameters
  const hasGpsSpoof = activeScenarios.has("gps_spoof");
  const hasAppInactive = activeScenarios.has("app_inactive");
  const hasNoDisruption = activeScenarios.has("no_disruption");
  const hasDuplicate = activeScenarios.has("duplicate");
  const hasVpn = activeScenarios.has("vpn");
  const anyActive = activeScenarios.size > 0;

  const realGps = GPS_PRESETS[selectedZone] ?? GPS_PRESETS.coimbatore_gandhipuram;
  const spoofGps = SPOOF_LOCATIONS[spoofTarget] ?? SPOOF_LOCATIONS.bengaluru;
  const gps = hasGpsSpoof ? spoofGps : realGps;
  const appActive = !hasAppInactive;
  const demoScenario = !anyActive || hasNoDisruption ? ("none" as const) : ("heavy_rain" as const);

  const activeCount = activeScenarios.size;
  const linkedTriggerLabel =
    linkedTriggerScenarios.length === 0
      ? "No linked trigger"
      : linkedTriggerScenarios.length === 1
        ? linkedTriggerScenarios[0].replace(/_/g, " ")
        : `${linkedTriggerScenarios.length} linked triggers`;

  // Zone options (memoized)
  const zoneOptions = useMemo(
    () => cityZones.map((z) => ({ value: z.id, label: `${z.area}, ${z.city}` })),
    [cityZones],
  );
  const spoofOptions = useMemo(
    () =>
      Object.entries(SPOOF_LOCATIONS).map(([key, loc]) => ({
        value: key,
        label: loc.label,
      })),
    [],
  );

  const runClaim = async () => {
    setLoading(true);
    setResult(null);
    setPayoutTxn(null);

    const selectedTriggerScenarios = readStoredTriggerScenarios();
    setLinkedTriggerScenarios(selectedTriggerScenarios);

    const scenarioSet = new Set<string>(selectedTriggerScenarios);
    if (hasNoDisruption) {
      scenarioSet.clear();
    }
    const combinedScenarios = Array.from(scenarioSet) as Array<
      Exclude<Parameters<typeof evaluateClaimEngine>[0]["demo_scenario"], "none" | undefined>
    >;

    // Only send overrides when fraud toggles are active.
    const hasFraudOverrides = hasGpsSpoof || hasAppInactive || hasDuplicate || hasVpn;
    const fraudOverrides = hasFraudOverrides
      ? {
          force_duplicate: hasDuplicate,
          force_frequency: hasDuplicate,
          force_gps_fail: hasGpsSpoof,
          force_app_inactive: hasAppInactive,
          force_vpn: hasVpn,
        }
      : undefined;

    try {
      const res = await evaluateClaimEngine({
        worker_id: workerId,
        zone_id: selectedZone,
        city: effectiveCity,
        gps_lat: gps.lat,
        gps_lon: gps.lon,
        hours_lost: Math.max(0, hoursLost),
        app_active: appActive,
        demo_mode: combinedScenarios.length > 0,
        demo_scenario: combinedScenarios[0] ?? demoScenario,
        demo_scenarios: combinedScenarios,
        simulate_vpn: hasVpn,
        fraud_test_overrides: fraudOverrides,
      });
      setResult(res);

      let finalTxn: PayoutTransaction | null = null;
      if (
        (res.claim_status === "auto-approve" || res.claim_status === "approve-with-flag") &&
        res.payout_amount > 0
      ) {
        setProcessingPayout(true);
        try {
          const gateway = GATEWAYS[Math.floor(Math.random() * GATEWAYS.length)];
          const txn = await processPayout({
            worker_id: workerId,
            claim_id: `CLM-${Date.now()}`,
            amount: res.payout_amount,
            gateway,
            upi_id: "worker@upi",
          });
          setPayoutTxn(txn);
          finalTxn = txn;
        } catch {
          // payout processing failed silently — claim result remains visible
        } finally {
          setProcessingPayout(false);
        }
      }

      onClaimResult?.(res, finalTxn);
      setRunCount((c) => c + 1);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  const fraudAssessment = result ? buildFraudAssessment(result) : null;
  const firstFired = result?.trigger_list?.find((item) => item.fired);

  return (
    <div className="space-y-4">
      {/* ─── Header ──────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <FlaskConical className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Claim Tester</h3>
          <p className="text-[11px] text-muted-foreground">
            Simulate scenarios and watch fraud detection respond in real-time
          </p>
        </div>
      </div>

      {/* ─── Claim Setup (editable) ──────── */}
      <div className="card-premium rounded-xl p-3 space-y-2.5">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
          Claim setup
        </p>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Worker zone</span>
            <input
              value={selectedZone}
              onChange={(e) => { setSelectedZone(e.target.value); setResult(null); }}
              list="fraud-demo-zone-suggestions"
              placeholder="Type zone id or area"
              className="w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Lost hours</span>
            <input
              type="number"
              min={0}
              max={12}
              value={hoursLost}
              onChange={(e) => {
                setHoursLost(Number(e.target.value || 0));
                setResult(null);
              }}
              className="w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>
          {hasGpsSpoof && (
            <MiniSelect
              label="Spoof GPS to"
              value={spoofTarget}
              options={spoofOptions}
              onChange={(v) => { setSpoofTarget(v); setResult(null); }}
            />
          )}
        </div>
        <datalist id="fraud-demo-zone-suggestions">
          {cityZones.map((zone) => (
            <option key={zone.id} value={zone.id} />
          ))}
        </datalist>

        {/* Live config badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${
            hasGpsSpoof ? "bg-destructive/10 text-destructive" : "bg-accent-green/10 text-accent-green"
          }`}>
            <MapPin className="w-3 h-3" />
            {gps.label}
          </span>
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${
            hasAppInactive ? "bg-destructive/10 text-destructive" : "bg-accent-green/10 text-accent-green"
          }`}>
            <Smartphone className="w-3 h-3" />
            {appActive ? "App active" : "App off"}
          </span>
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${
            hasNoDisruption ? "bg-destructive/10 text-destructive" : "bg-accent-green/10 text-accent-green"
          }`}>
            <Crosshair className="w-3 h-3" />
            {hasNoDisruption ? "No event" : linkedTriggerLabel}
          </span>
          {hasDuplicate && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-destructive/10 text-destructive">
              <Copy className="w-3 h-3" />
              Duplicate
            </span>
          )}
          {hasVpn && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-destructive/10 text-destructive">
              <Wifi className="w-3 h-3" />
              VPN on
            </span>
          )}
        </div>

        <div className="pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">Linked trigger scenarios</p>
          {linkedTriggerScenarios.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No TriggerLab scenarios saved. Default heavy rain will be used.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {linkedTriggerScenarios.map((scenario) => (
                <span key={scenario} className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                  {scenario.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Scenario toggles ────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
            Fraud scenarios {activeCount > 0 && <span className="text-destructive">· {activeCount} active</span>}
          </p>
          <button
            onClick={allOn ? clearAll : selectAll}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            {allOn ? "Clear all" : "Select all"}
          </button>
        </div>

        <div className="space-y-1.5">
          {SCENARIOS.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              active={activeScenarios.has(scenario.id)}
              onToggle={() => toggleScenario(scenario.id)}
              disabled={loading}
            />
          ))}
        </div>
      </div>

      {/* ─── Submit button ───────────────── */}
      <button
        onClick={runClaim}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all ${
          anyActive
            ? "bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/20 active:bg-destructive/25"
            : "bg-primary/15 border border-primary/30 text-primary hover:bg-primary/20 active:bg-primary/25"
        } disabled:opacity-50`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing claim…
          </>
        ) : anyActive ? (
          <>
            <ShieldAlert className="w-4 h-4" />
            Test Fraudulent Claim{activeCount > 1 ? ` (${activeCount} scenarios)` : ""}
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Submit Clean Claim
          </>
        )}
      </button>

      {/* ─── Results ─────────────────────── */}
      {result && (
        <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {/* Verdict card */}
          <div className={`rounded-2xl p-4 text-center space-y-2 border ${
            result.claim_status === "auto-approve"
              ? "border-accent-green/20 bg-accent-green/[0.05]"
              : result.claim_status === "approve-with-flag"
                ? "border-warning/20 bg-warning/[0.05]"
                : "border-destructive/20 bg-destructive/[0.05]"
          }`}>
            <div className="flex items-center justify-center gap-2">
              {result.claim_status === "auto-approve" ? (
                <ShieldCheck className="w-5 h-5 text-accent-green" strokeWidth={1.5} />
              ) : result.claim_status === "approve-with-flag" ? (
                <AlertTriangle className="w-5 h-5 text-warning" strokeWidth={1.5} />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" strokeWidth={1.5} />
              )}
              <p className="text-lg font-bold text-foreground">
                {result.claim_status === "auto-approve"
                  ? `Approved — ₹${result.payout_amount}`
                  : result.claim_status === "approve-with-flag"
                    ? `Flagged — ₹${result.payout_amount}`
                    : result.claim_status === "auto-reject"
                      ? "Rejected — ₹0"
                      : "Blocked — ₹0"}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span>
                Risk: <span className="font-mono font-bold text-foreground">{(result.fraud_score * 100).toFixed(0)}%</span>
              </span>
              {fraudAssessment?.ml_ensemble && (
                <span>
                  ML: <span className="font-mono font-bold text-primary">{(fraudAssessment.ml_ensemble.fraud_probability * 100).toFixed(0)}%</span>
                </span>
              )}
              {fraudAssessment?.worker_risk_profile && (
                <span>
                  Trust: <span className={`font-mono font-bold ${fraudAssessment.worker_risk_profile.trust_score > 0.6 ? "text-accent-green" : "text-warning"}`}>
                    {(fraudAssessment.worker_risk_profile.trust_score * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{result.explanation}</p>
          </div>

          {/* ── ML Ensemble Insight ── */}
          {fraudAssessment?.ml_ensemble && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2">
              <p className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ML Ensemble Second Opinion
              </p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>Probability: <span className="font-mono font-bold text-foreground">{(fraudAssessment.ml_ensemble.fraud_probability * 100).toFixed(1)}%</span></span>
                <span>Risk: <span className="font-medium text-foreground uppercase">{fraudAssessment.ml_ensemble.risk_level}</span></span>
                <span>{fraudAssessment.ml_ensemble.allow_payout ? "✅ Allow" : "❌ Block"}</span>
              </div>
              {fraudAssessment.ml_ensemble.top_drivers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Top Drivers</p>
                  {fraudAssessment.ml_ensemble.top_drivers.slice(0, 4).map((d: any, i: number) => {
                    const fname = Array.isArray(d) ? d[0] : d.feature ?? "";
                    const contrib = Array.isArray(d) ? d[1] : d.contribution ?? 0;
                    return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${contrib > 0 ? "bg-destructive/60" : "bg-accent-green/60"}`}
                          style={{ width: `${Math.min(Math.abs(contrib) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 w-28 truncate">{String(fname).replace(/_/g, " ")}</span>
                      <span className={`text-[10px] font-mono ${contrib > 0 ? "text-destructive" : "text-accent-green"}`}>
                        {contrib > 0 ? "+" : ""}{(contrib * 100).toFixed(1)}%
                      </span>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Worker Risk Profile ── */}
          {fraudAssessment?.worker_risk_profile && (
            <div className={`rounded-xl border p-3 space-y-1 ${
              fraudAssessment.worker_risk_profile.category === "trusted" ? "bg-accent-green/5 border-accent-green/20" :
              fraudAssessment.worker_risk_profile.category === "flagged" || fraudAssessment.worker_risk_profile.category === "blocked" ? "bg-destructive/5 border-destructive/20" :
              "bg-foreground/[0.02] border-border/30"
            }`}>
              <p className="text-[11px] font-bold text-foreground/70 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Worker Risk Profile
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                  fraudAssessment.worker_risk_profile.category === "trusted" ? "bg-accent-green/10 text-accent-green" :
                  fraudAssessment.worker_risk_profile.category === "flagged" ? "bg-orange-400/10 text-orange-400" :
                  fraudAssessment.worker_risk_profile.category === "blocked" ? "bg-destructive/10 text-destructive" :
                  "bg-foreground/5 text-foreground/60"
                }`}>{fraudAssessment.worker_risk_profile.category}</span>
              </p>
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span>EMA Risk: <span className="font-mono text-foreground">{(fraudAssessment.worker_risk_profile.ema_risk * 100).toFixed(0)}%</span></span>
                <span>Trust: <span className="font-mono text-foreground">{(fraudAssessment.worker_risk_profile.trust_score * 100).toFixed(0)}%</span></span>
                <span>Claims: <span className="font-mono text-foreground">{fraudAssessment.worker_risk_profile.claim_count}</span></span>
                <span>Streak: <span className="font-mono text-accent-green">{fraudAssessment.worker_risk_profile.clean_streak}</span></span>
              </div>
            </div>
          )}

          {/* What was caught */}
          {anyActive && (
            <div className="card-premium rounded-xl p-3 space-y-1.5">
              <p className="text-[11px] font-bold text-destructive flex items-center gap-1">
                <Shield className="w-3 h-3" />
                What the engine caught
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1.5">
                {hasGpsSpoof && (
                  <li className="flex gap-2">
                    <MapPin className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span>
                      <span className="text-foreground font-medium">Fake Location</span> — {spoofGps.label} coordinates
                      don't match the {selectedZoneObj?.area ?? "registered"} zone
                    </span>
                  </li>
                )}
                {hasAppInactive && (
                  <li className="flex gap-2">
                    <Smartphone className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span>
                      <span className="text-foreground font-medium">App Was Closed</span> — No active session during the
                      disruption window
                    </span>
                  </li>
                )}
                {hasNoDisruption && (
                  <li className="flex gap-2">
                    <Crosshair className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span>
                      <span className="text-foreground font-medium">No Weather Event</span> — No parametric trigger fired;
                      claim has no basis
                    </span>
                  </li>
                )}
                {hasDuplicate && (
                  <li className="flex gap-2">
                    <Copy className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span>
                      <span className="text-foreground font-medium">Duplicate Claim</span> — Same trigger already claimed
                      today
                    </span>
                  </li>
                )}
                {hasVpn && (
                  <li className="flex gap-2">
                    <Wifi className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span>
                      <span className="text-foreground font-medium">VPN / Proxy</span> — Traffic from datacenter IP, not a
                      residential ISP
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
            <p className="text-sm font-bold text-foreground mb-3">Triggered categories</p>
            <div className="space-y-2">
              {result.trigger_list.filter((item) => item.fired).length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No trigger fired.</p>
              ) : (
                result.trigger_list
                  .filter((item) => item.fired)
                  .map((item) => (
                    <div key={`${item.category}_${item.name}`} className="rounded-xl bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.category}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Source: {item.source} · Fired
                      </p>
                      {item.payout?.formula && <p className="text-[11px] text-muted-foreground mt-1">{item.payout.formula}</p>}
                      {item.payout?.ml_future_loss_summary && (
                        <p className="text-[11px] text-primary/90 mt-1">{item.payout.ml_future_loss_summary}</p>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
            <p className="text-sm font-bold text-foreground mb-2">Total payout formula</p>
            <p className="text-xs text-muted-foreground">
              {result.trigger_list
                .filter((item) => item.fired && item.payout)
                .map((item) => item.payout?.formula)
                .filter((formula): formula is string => Boolean(formula))
                .join(" + ") || "No trigger fired"}
            </p>
            {(() => {
              const firedWithPayout = result.trigger_list.filter((item) => item.fired && item.payout);
              const probabilities = firedWithPayout
                .map((item) => item.payout?.ml_future_loss_probability)
                .filter((value): value is number => typeof value === "number");
              if (probabilities.length === 0) return null;
              const maxProbability = Math.max(...probabilities);
              return (
                <p className="text-[11px] text-primary/90 mt-2">
                  ML outlook: {Math.round(maxProbability * 100)}% probability of future lost hours in the next disruption window.
                </p>
              );
            })()}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Total payout</span>
              <span className="text-base font-extrabold text-foreground">₹{result.payout_amount}</span>
            </div>
          </div>

          {processingPayout && (
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4 text-center animate-in fade-in-0 duration-300">
              <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Processing instant payout…</p>
              <p className="text-[11px] text-muted-foreground mt-1">Routing through payment gateway</p>
            </div>
          )}

          {payoutTxn && (
            <div className="rounded-2xl border border-accent-green/30 bg-accent-green/[0.05] p-4 space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-accent-green" strokeWidth={1.5} />
                <p className="text-sm font-bold text-foreground">Instant Payout Processed</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Gateway</span>
                  <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    {payoutTxn.gateway === "razorpay" ? (
                      <><CreditCard size={12} className="text-blue-400" /> Razorpay (Test Mode)</>
                    ) : payoutTxn.gateway === "upi_direct" ? (
                      <><Banknote size={12} className="text-green-400" /> UPI Direct (NPCI)</>
                    ) : (
                      <><CreditCard size={12} className="text-purple-400" /> Stripe (Sandbox)</>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Transaction ID</span>
                  <span className="text-[11px] font-mono text-foreground/70">{payoutTxn.txn_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold text-accent-green">₹{payoutTxn.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Status</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${payoutTxn.status === "completed" ? "bg-accent-green/15 text-accent-green" : "bg-warning/15 text-warning"}`}>
                    {payoutTxn.status.toUpperCase()}
                  </span>
                </div>
                {payoutTxn.processing_time_ms != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Processing time</span>
                    <span className="text-[11px] font-mono text-foreground/70">{payoutTxn.processing_time_ms}ms</span>
                  </div>
                )}
                {payoutTxn.upi_ref && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">UPI Reference</span>
                    <span className="text-[11px] font-mono text-foreground/70">{payoutTxn.upi_ref}</span>
                  </div>
                )}
                {payoutTxn.razorpay_payment_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Razorpay ID</span>
                    <span className="text-[11px] font-mono text-foreground/70">{payoutTxn.razorpay_payment_id}</span>
                  </div>
                )}
                {payoutTxn.stripe_transfer_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Stripe Transfer</span>
                    <span className="text-[11px] font-mono text-foreground/70">{payoutTxn.stripe_transfer_id}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-accent-green/15">
                <Zap size={12} className="text-accent-green" strokeWidth={1.5} />
                <span className="text-[11px] font-bold text-accent-green">Worker receives lost wages instantly</span>
              </div>
            </div>
          )}

          {/* Clean claim confirmation */}
          {!anyActive && result.claim_status === "auto-approve" && (
            <div className="rounded-xl border border-accent-green/20 bg-accent-green/[0.05] p-3">
              <p className="text-[11px] text-accent-green font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                All 5 checks passed — legitimate claim auto-approved
              </p>
            </div>
          )}

          {/* AI Verdict (Gemini) */}
          {result.ai_verdict && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  AI Verdict · Gemini
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {result.ai_verdict}
              </p>
            </div>
          )}

          {/* Full breakdown */}
          {fraudAssessment && <FraudBreakdown assessment={fraudAssessment} />}

          {/* Footer */}
          <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40">
            <Clock className="w-3 h-3" />
            Processed in real-time against live backend
          </p>
        </div>
      )}

      {/* Payout tip — show when no result yet */}
      {!result && !loading && (
        <div className="flex items-start gap-2 rounded-lg bg-secondary/40 border border-border/20 px-3 py-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">To test a payout:</span> Submit a clean claim
            with no scenarios active — the engine will auto-approve and calculate ₹ amount.
            Toggle scenarios to see the fraud engine block or flag the claim.
          </p>
        </div>
      )}
    </div>
  );
}
