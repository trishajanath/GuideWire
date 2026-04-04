import { useEffect, useMemo, useState } from "react";
import {
  CloudRain,
  Clock3,
  Flame,
  Loader2,
  MapPin,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TrendingDown,
  Wifi,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  evaluateClaimEngine,
  getCityWeather,
  type CityWeather,
  type ClaimEvaluateResult,
  ZONES,
} from "@/lib/api";

interface TriggerLabProps {
  workerId: number;
  zoneId: string;
  city: string;
}

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
  const [selectedScenarios, setSelectedScenarios] = useState<Set<SimulationScenario["id"]>>(new Set());
  const [hoursLost, setHoursLost] = useState(3);
  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [result, setResult] = useState<ClaimEvaluateResult | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const normalizedCity = cityKey(city);
  const cityZones = useMemo(() => ZONES.filter((zone) => cityKey(zone.city) === normalizedCity), [normalizedCity]);
  const gps = useMemo(() => cityGps[normalizedCity] ?? cityGps.bengaluru, [normalizedCity]);

  useEffect(() => {
    if (cityZones.length === 0) return;
    if (!cityZones.some((zone) => zone.id === selectedZone)) {
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
    } catch (err: any) {
      setError(err?.message ?? "Could not evaluate claim");
    } finally {
      setRunning(false);
    }
  };

  const fetchBaseline = async () => {
    setLoadingLive(true);
    setError("");
    try {
      const live = await getCityWeather(city);
      setWeather(live);
    } catch (err: any) {
      setError(err?.message ?? "Could not fetch live weather");
    } finally {
      setLoadingLive(false);
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
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="appearance-none w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              {cityZones.map((zone) => (
                <option key={zone.id} value={zone.id}>{zone.area}, {zone.city}</option>
              ))}
            </select>
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

        <Button onClick={fetchBaseline} variant="outline" className="w-full h-10 rounded-xl border-border/40">
          {loadingLive ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
          Fetch Live Baseline
        </Button>

        {weather && (
          <div className="rounded-xl border border-border/50 bg-secondary/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">Live baseline</span>
              <span>{weather.city}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="rounded-full bg-foreground/5 px-2 py-0.5">{Math.round(weather.temperature)}°C</span>
              <span className="rounded-full bg-foreground/5 px-2 py-0.5">Rain {weather.rainfall} mm</span>
              <span className="rounded-full bg-foreground/5 px-2 py-0.5">Risk {weather.weather_risk_score}/100</span>
            </div>
          </div>
        )}
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
              {result.trigger_list.map((item) => (
                <div key={`${item.category}_${item.name}`} className="rounded-xl bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{getTriggerLabel(item.name)}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.category}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Source: {item.source} · {item.fired ? "Fired" : "Not fired"}
                  </p>
                  {item.payout?.formula && <p className="text-[11px] text-muted-foreground mt-1">{item.payout.formula}</p>}
                </div>
              ))}
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
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Total payout</span>
              <span className="text-base font-extrabold text-foreground">₹{result.payout_amount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
