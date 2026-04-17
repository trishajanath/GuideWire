import { useEffect, useMemo, useState } from "react";
import {
  CloudRain,
  Clock3,
  Flame,
  Loader2,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TrendingDown,
  Wifi,
  Wind,
  CreditCard,
  CheckCircle2,
  Zap,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  evaluateClaimEngine,
  processPayout,
  type ClaimEvaluateResult,
  type PayoutTransaction,
  ZONES,
} from "@/lib/api";

interface TriggerLabProps {
  workerId: number;
  zoneId: string;
  city: string;
}

const TRIGGER_SCENARIOS_STORAGE_KEY = "guidewire.triggerlab.selectedScenarios";

type SimulationCategory = "weather" | "platform" | "external";

type SimulationScenario = {
  id:
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
  category: SimulationCategory;
  label: string;
  subtitle: string;
  icon: typeof CloudRain;
  badge: string;
};

const SIMULATION_GROUPS: Array<{ key: SimulationCategory; title: string; description: string; icon: typeof CloudRain }> = [
  { key: "weather", title: "Weather-Based Triggers", description: "IMD + OpenWeather conditions", icon: CloudRain },
  { key: "platform", title: "Platform-Based Triggers", description: "Demand and service disruption", icon: RadioTower },
  { key: "external", title: "External Event Triggers", description: "Government or civic restrictions", icon: Siren },
];

const SCENARIOS: SimulationScenario[] = [
  { id: "heavy_rain", category: "weather", label: "Heavy Rainfall", subtitle: ">30mm in 3 hours", icon: CloudRain, badge: "Automatic" },
  { id: "extreme_heat", category: "weather", label: "Extreme Heat", subtitle: ">42°C sustained", icon: Flame, badge: "Automatic" },
  { id: "cyclone_alert", category: "weather", label: "Cyclone Alert", subtitle: "IMD orange/red alert", icon: ShieldAlert, badge: "Automatic" },
  { id: "urban_flooding", category: "weather", label: "Urban Flooding", subtitle: "Road obstruction / route blockage", icon: Wind, badge: "Automatic" },
  { id: "poor_visibility", category: "weather", label: "Poor Visibility", subtitle: "<100m visibility", icon: Wind, badge: "Automatic" },
  { id: "demand_collapse", category: "platform", label: "Demand Drop", subtitle: ">40% below zone average", icon: TrendingDown, badge: "Automatic" },
  { id: "order_pause", category: "platform", label: "Order Allocation Pause", subtitle: "<2 orders in 3 hours", icon: Clock3, badge: "Automatic" },
  { id: "zone_shutdown", category: "platform", label: "Zone Restriction", subtitle: "Geographic delivery restriction", icon: ShieldAlert, badge: "Automatic" },
  { id: "platform_outage", category: "platform", label: "Platform Outage", subtitle: "System-wide service disruption", icon: Wifi, badge: "Automatic" },
  { id: "curfew", category: "external", label: "Government Curfew", subtitle: "Official curfew announcement", icon: ShieldAlert, badge: "Manual" },
  { id: "public_health_emergency", category: "external", label: "Public Health Emergency", subtitle: "Health-related restrictions", icon: ShieldAlert, badge: "Manual" },
  { id: "civil_disturbance", category: "external", label: "Civil Disturbance", subtitle: "Police / municipal advisory", icon: Siren, badge: "Manual" },
  { id: "infrastructure_failure", category: "external", label: "Infrastructure Failure", subtitle: "Road closures / utility outage", icon: RadioTower, badge: "Manual" },
];

const cityKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ").replace("bangalore", "bengaluru");

const cityGps: Record<string, { lat: number; lon: number }> = {
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  delhi: { lat: 28.6139, lon: 77.209 },
};

const getTriggerLabel = (name: string) => name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function TriggerLab({ workerId, zoneId, city }: TriggerLabProps) {
  const [selectedZone, setSelectedZone] = useState(zoneId);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<SimulationScenario["id"]>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.sessionStorage.getItem(TRIGGER_SCENARIOS_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      const valid = parsed.filter((item): item is SimulationScenario["id"] => typeof item === "string" && item !== "none");
      return new Set(valid);
    } catch {
      return new Set();
    }
  });
  const [hoursLost, setHoursLost] = useState(3);
  const [result, setResult] = useState<ClaimEvaluateResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [payoutTxn, setPayoutTxn] = useState<PayoutTransaction | null>(null);
  const [processingPayout, setProcessingPayout] = useState(false);
  const GATEWAYS = ["razorpay", "upi_direct", "stripe"] as const;

  const normalizedCity = cityKey(city);
  const cityZones = useMemo(() => ZONES.filter((zone) => cityKey(zone.city) === normalizedCity), [normalizedCity]);
  const gps = useMemo(() => cityGps[normalizedCity] ?? cityGps.bengaluru, [normalizedCity]);

  useEffect(() => {
    if (!selectedZone && cityZones.length > 0) {
      setSelectedZone(cityZones[0].id);
    }
  }, [cityZones, selectedZone]);

  useEffect(() => {
    setSelectedScenarios((current) => {
      const next = new Set([...current].filter((scenarioId) => SCENARIOS.some((item) => item.id === scenarioId)));
      return next;
    });
  }, [city]);

  const scenariosByCategory = useMemo(() => {
    return SIMULATION_GROUPS.map((group) => ({
      ...group,
      scenarios: SCENARIOS.filter((item) => item.category === group.key),
    }));
  }, []);

  const selectedScenarioList = useMemo(() => [...selectedScenarios], [selectedScenarios]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(TRIGGER_SCENARIOS_STORAGE_KEY, JSON.stringify(selectedScenarioList));
  }, [selectedScenarioList]);

  const toggleScenario = (scenarioId: SimulationScenario["id"]) => {
    setSelectedScenarios((current) => {
      const next = new Set(current);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else {
        next.add(scenarioId);
      }
      return next;
    });
    setResult(null);
  };

  const clearScenarios = () => {
    setSelectedScenarios(new Set());
    setResult(null);
  };

  const selectGroup = (category: SimulationCategory) => {
    setSelectedScenarios((current) => {
      const next = new Set(current);
      SCENARIOS.filter((item) => item.category === category).forEach((item) => next.add(item.id));
      return next;
    });
    setResult(null);
  };

  const selectedScenarioCount = selectedScenarioList.length;

  const runSimulation = async () => {
    setRunning(true);
    setError("");
    setPayoutTxn(null);
    try {
      const claim = await evaluateClaimEngine({
        worker_id: workerId,
        zone_id: selectedZone,
        city,
        gps_lat: gps.lat,
        gps_lon: gps.lon,
        hours_lost: Math.max(1, hoursLost),
        app_active: true,
        demo_mode: selectedScenarioCount > 0,
        demo_scenario: selectedScenarioList[0] ?? "none",
        demo_scenarios: selectedScenarioList,
        simulate_vpn: false,
      });
      setResult(claim);

      // Auto-process instant payout when claim is approved
      if (
        (claim.claim_status === "auto-approve" || claim.claim_status === "approve-with-flag") &&
        claim.payout_amount > 0
      ) {
        setProcessingPayout(true);
        try {
          const gateway = GATEWAYS[Math.floor(Math.random() * GATEWAYS.length)];
          const txn = await processPayout({
            worker_id: workerId,
            claim_id: `CLM-${Date.now()}`,
            amount: claim.payout_amount,
            gateway,
            upi_id: "worker@upi",
          });
          setPayoutTxn(txn);
        } catch {
          // payout processing failed silently — claim still valid
        } finally {
          setProcessingPayout(false);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not evaluate claim");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Claim Simulator</h3>
          <p className="text-[11px] text-muted-foreground">Desktop-side category simulator, separate from the phone</p>
        </div>
      </div>

      <div className="card-premium rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Simulation setup</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Worker zone</span>
            <input
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              list="worker-zone-suggestions"
              placeholder="Type zone id or area"
              className="w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
            </input>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Lost hours</span>
            <input
              type="number"
              min={1}
              max={12}
              value={hoursLost}
              onChange={(e) => setHoursLost(Number(e.target.value || 0))}
              className="w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>
        </div>
        <datalist id="worker-zone-suggestions">
          {cityZones.map((zone) => (
            <option key={zone.id} value={zone.id} />
          ))}
        </datalist>
      </div>

      <div className="space-y-3">
        {scenariosByCategory.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon className="w-3 h-3" />
                    {group.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{group.description}</p>
                </div>
                <button
                  onClick={() => selectGroup(group.key)}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  Select all
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {group.scenarios.map((item) => {
                  const ItemIcon = item.icon;
                  const active = selectedScenarios.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleScenario(item.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-primary/40 bg-primary/[0.08]"
                          : "border-border/60 bg-secondary/50 hover:bg-secondary/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-primary/15" : "bg-background/40"}`}>
                            <ItemIcon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${active ? "bg-primary/15 text-primary" : "bg-foreground/5 text-muted-foreground"}`}>
                          {item.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={clearScenarios}
        className="w-full rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-semibold text-foreground"
      >
        Clear Simulation
      </button>

      <button
        onClick={runSimulation}
        disabled={running}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all ${
          selectedScenarioCount === 0
            ? "bg-primary/15 border border-primary/30 text-primary hover:bg-primary/20"
            : "bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/20"
        } disabled:opacity-50`}
      >
        {running ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Evaluating simulation…
          </>
        ) : selectedScenarioCount === 0 ? (
          <>
            <ShieldCheck className="w-4 h-4" />
            Run Clean Claim
          </>
        ) : (
          <>
            <ShieldAlert className="w-4 h-4" />
            Run {selectedScenarioCount} Selected Trigger{selectedScenarioCount > 1 ? "s" : ""}
          </>
        )}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result && (
        <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className={`rounded-2xl p-4 text-center space-y-2 border ${
            result.claim_status === "auto-approve"
              ? "border-accent-green/20 bg-accent-green/[0.05]"
              : result.claim_status === "approve-with-flag"
                ? "border-warning/20 bg-warning/[0.05]"
                : "border-destructive/20 bg-destructive/[0.05]"
          }`}>
            <p className="text-lg font-bold text-foreground">
              {result.claim_status === "auto-approve"
                ? `Approved — ₹${result.payout_amount}`
                : result.claim_status === "approve-with-flag"
                  ? `Flagged — ₹${result.payout_amount}`
                  : "Blocked — ₹0"}
            </p>
            <p className="text-[11px] text-muted-foreground">Risk: {(result.fraud_score * 100).toFixed(0)}%</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{result.explanation}</p>
          </div>

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
                        <p className="text-sm font-semibold text-foreground">{getTriggerLabel(item.name)}</p>
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

          {/* Instant Payout Gateway Processing */}
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
        </div>
      )}
    </div>
  );
}
