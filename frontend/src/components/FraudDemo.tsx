import { useState, useMemo } from "react";
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
  ZONES,
  type ClaimEvaluateResult,
  type FraudAssessment,
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
      reason: `${item.label}: ${item.value === 0 ? "✓ Clear" : `⚠ Flagged ${(item.value * 100).toFixed(0)}%`}`,
      details: { weight: item.weight, contribution: item.contribution },
    })),
    explanation:
      claimStatus === "auto-approve"
        ? "All checks passed — claim auto-approved."
        : claimStatus === "approve-with-flag"
          ? "Minor flags detected — approved with review flag."
          : claimStatus === "hold-for-review"
            ? "Fraud signals detected — claim held for manual review."
            : "No parametric trigger fired.",
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
}

export default function FraudDemo({ workerId, zoneId, city }: FraudDemoProps) {
  // Editable claim fields
  const [selectedZone, setSelectedZone] = useState(zoneId);
  const [spoofTarget, setSpoofTarget] = useState("bengaluru");

  const selectedZoneObj = ZONES.find((z) => z.id === selectedZone);
  const effectiveCity = selectedZoneObj?.city ?? city;

  // Scenario toggles
  const [activeScenarios, setActiveScenarios] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ClaimEvaluateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [runCount, setRunCount] = useState(0);

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
  const demoScenario = hasNoDisruption ? ("none" as const) : ("heavy_rain" as const);

  const activeCount = activeScenarios.size;

  // Zone options (memoized)
  const zoneOptions = useMemo(
    () => ZONES.map((z) => ({ value: z.id, label: `${z.area}, ${z.city}` })),
    [],
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

    try {
      if (hasDuplicate && runCount === 0) {
        await evaluateClaimEngine({
          worker_id: workerId,
          zone_id: selectedZone,
          city: effectiveCity,
          gps_lat: gps.lat,
          gps_lon: gps.lon,
          hours_lost: 3,
          app_active: appActive,
          demo_mode: true,
          demo_scenario: "heavy_rain",
          simulate_vpn: false,
        });
      }

      const res = await evaluateClaimEngine({
        worker_id: workerId,
        zone_id: selectedZone,
        city: effectiveCity,
        gps_lat: gps.lat,
        gps_lon: gps.lon,
        hours_lost: 3,
        app_active: appActive,
        demo_mode: true,
        demo_scenario: demoScenario,
        simulate_vpn: hasVpn,
      });
      setResult(res);
      setRunCount((c) => c + 1);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  const fraudAssessment = result ? buildFraudAssessment(result) : null;

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
          <MiniSelect
            label="Worker zone"
            value={selectedZone}
            options={zoneOptions}
            onChange={(v) => { setSelectedZone(v); setResult(null); }}
          />
          {hasGpsSpoof && (
            <MiniSelect
              label="Spoof GPS to"
              value={spoofTarget}
              options={spoofOptions}
              onChange={(v) => { setSpoofTarget(v); setResult(null); }}
            />
          )}
        </div>

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
            {hasNoDisruption ? "No event" : "Heavy rain"}
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
                    : "Blocked — ₹0"}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span>
                Risk: <span className="font-mono font-bold text-foreground">{(result.fraud_score * 100).toFixed(0)}%</span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{result.explanation}</p>
          </div>

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

          {/* Clean claim confirmation */}
          {!anyActive && result.claim_status === "auto-approve" && (
            <div className="rounded-xl border border-accent-green/20 bg-accent-green/[0.05] p-3">
              <p className="text-[11px] text-accent-green font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                All 6 checks passed — legitimate claim auto-approved
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
